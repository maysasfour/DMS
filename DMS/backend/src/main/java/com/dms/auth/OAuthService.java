/**
 * OAuthService.java
 *
 * Handles third-party OAuth 2.0 authentication for the Disaster Management System (DMS).
 * Supports Google (via ID token verification) and Facebook (via Graph API debug_token).
 *
 * When a citizen or officer signs in through Google or Facebook, this service:
 *   1. Validates the provider-issued token against the respective OAuth endpoint.
 *   2. Extracts the user's profile (email, name, avatar).
 *   3. Looks up the user in the DMS database or auto-provisions a new CITIZEN account.
 *   4. Issues a DMS JWT so the caller can access protected DMS resources (incidents, alerts, etc.).
 *
 * Security note: The Facebook App Secret (facebookAppSecret) must remain server-side only
 * and must never be exposed in API responses or logs.
 */
package com.dms.auth;

// --- DMS internal imports ---
import com.dms.security.JwtTokenProvider;       // Generates signed JWTs for authenticated DMS sessions
import com.dms.security.UserDetailsImpl;        // Spring Security wrapper around the DMS User entity
import com.dms.user.User;                       // JPA entity representing a DMS user (citizen, officer, admin)
import com.dms.user.UserRepository;             // Spring Data repository for querying/persisting DMS users

// --- Lombok imports: reduce boilerplate for constructor injection and logging ---
import lombok.RequiredArgsConstructor;          // Generates a constructor for all final fields (used by Spring DI)
import lombok.extern.slf4j.Slf4j;              // Injects a static SLF4J logger named `log`

// --- Spring framework imports ---
import org.springframework.beans.factory.annotation.Value;                               // Injects values from application.properties / environment variables
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken; // Represents an authenticated principal inside Spring Security
import org.springframework.security.core.Authentication;                                 // Spring Security abstraction for the current authenticated entity
import org.springframework.security.core.authority.SimpleGrantedAuthority;               // Wraps a role string (e.g. "CITIZEN") as a Spring Security authority

import org.springframework.stereotype.Service;  // Marks this class as a Spring-managed service bean
import org.springframework.web.client.HttpClientErrorException; // Thrown when a 4xx HTTP error is returned by the OAuth provider
import org.springframework.web.client.RestClientException;      // Base exception for any REST call failure (network, timeout, etc.)
import org.springframework.web.client.RestTemplate;             // Synchronous HTTP client used to call Google/Facebook verification endpoints

// --- Standard Java imports ---
import java.util.*;  // UUID (for placeholder passwords), Collections (for roles set), Map, etc.

/**
 * Spring service bean for OAuth-based login flows in the DMS.
 *
 * Both Google and Facebook login paths converge on {@link #findOrCreateUser} which
 * ensures a consistent CITIZEN account exists in the DMS database for every
 * OAuth identity.
 */
@Slf4j               // Injects `log` field — used for audit-trail warnings (e.g. audience mismatch)
@Service             // Registers this class in the Spring application context as a service component
@RequiredArgsConstructor  // Lombok: generates a constructor injecting userRepository and jwtTokenProvider
public class OAuthService {

    // --- Injected DMS dependencies (constructor-injected by Lombok @RequiredArgsConstructor) ---

    /** Repository for looking up and persisting DMS user records by email. */
    private final UserRepository userRepository;

    /** Issues and validates JWTs that protect DMS API endpoints (incidents, resources, alerts). */
    private final JwtTokenProvider jwtTokenProvider;

    // --- Google OAuth client configuration (loaded from application.properties or environment) ---

    /** Primary Google OAuth client ID configured for this DMS deployment (web client). */
    @Value("${oauth.google.client-id:}")   // Defaults to empty string if not set — disables audience enforcement
    private String googleClientId;

    /** Hardcoded Android OAuth client ID for the DMS Flutter mobile app on Google Play. */
    // Android OAuth client ID — must match the credential created in Google Cloud Console for the Android app
    private static final String GOOGLE_ANDROID_CLIENT_ID =
            "170971948937-9b5kv99q3klq087hs4am19ugj43dvqnc.apps.googleusercontent.com";

    /**
     * Web/server OAuth client ID used as the serverClientId in the Flutter google_sign_in plugin.
     * Google returns an ID token whose `aud` claim equals this value when sign-in is initiated from Flutter.
     */
    // Web OAuth client ID — the Flutter app requests this as the server audience so the backend can validate it
    private static final String GOOGLE_WEB_CLIENT_ID =
            "170971948937-eh0jj3f3a8catr0ln94qbphq853c70ao.apps.googleusercontent.com";

    /** Google OAuth client secret (unused for ID token validation but kept for potential token-exchange flows). */
    @Value("${oauth.google.client-secret:}")  // Defaults to empty string; not currently required for tokeninfo verification
    private String googleClientSecret;

    // --- Facebook OAuth app configuration ---

    /** Facebook App ID — used to construct the app-token for debug_token verification. */
    @Value("${oauth.facebook.app-id:}")       // Injected from environment; empty means Facebook login is disabled
    private String facebookAppId;

    /**
     * Facebook App Secret — combined with App ID to form the server-to-server app token.
     * SECURITY: This value must never appear in logs, API responses, or client-visible errors.
     */
    @Value("${oauth.facebook.app-secret:}")   // Must be kept server-side only; never expose to the DMS frontend
    private String facebookAppSecret;

    /**
     * Verifies a Google ID token via Google's tokeninfo endpoint and
     * returns or creates the matching DMS user.
     *
     * Flow:
     *   1. POST the token to Google's tokeninfo endpoint to obtain the decoded payload.
     *   2. Validate the `aud` claim against known DMS client IDs to prevent token substitution attacks.
     *   3. Extract the citizen's email, name, and avatar from the payload.
     *   4. Delegate to {@link #findOrCreateUser} to resolve or provision a DMS account.
     *
     * @param idToken  The Google ID token string sent by the DMS mobile or web client.
     * @return         {@link AuthResponse} containing a DMS JWT and the user's profile data.
     * @throws RuntimeException if the token is invalid, expired, or fails audience validation.
     */
    public AuthResponse loginWithGoogle(String idToken) {
        // Synchronous HTTP client — each call is stateless, so a local instance is safe here
        RestTemplate rest = new RestTemplate();

        // Google's public tokeninfo endpoint decodes and validates the ID token server-side
        String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken;

        Map<String, Object> payload;  // Will hold the decoded JWT claims returned by Google
        try {
            @SuppressWarnings("unchecked")
            // Call Google tokeninfo; the response is a flat JSON map of standard JWT claims
            Map<String, Object> resp = rest.getForObject(url, Map.class);
            payload = resp;  // Assign to the outer variable for post-try validation
        } catch (HttpClientErrorException e) {
            // 4xx from Google indicates an expired, malformed, or revoked token
            throw new RuntimeException("Invalid Google ID token: " + e.getStatusCode());
        } catch (RestClientException e) {
            // Network failures, DNS errors, or unexpected server errors from Google
            throw new RuntimeException("Google token verification failed: " + e.getMessage());
        }

        // Null payload or an "error" key in the response means token rejection from Google
        if (payload == null || payload.containsKey("error")) {
            throw new RuntimeException("Invalid Google ID token");
        }

        // --- Audience validation: ensure token was issued for a DMS client, not a foreign app ---
        String aud = (String) payload.get("aud");  // `aud` claim identifies the intended OAuth client
        // Accept tokens from any of the three registered DMS Google client IDs (web, Android, Flutter server)
        boolean audValid = aud != null && (
                aud.equals(googleClientId) ||           // Web/configured client ID
                aud.equals(GOOGLE_ANDROID_CLIENT_ID) || // DMS Android app client ID
                aud.equals(GOOGLE_WEB_CLIENT_ID));       // DMS Flutter server client ID

        // Enforce audience check only when a client ID is explicitly configured in properties
        if (googleClientId != null && !googleClientId.isBlank() && !audValid) {
            // Log the mismatch for security audit purposes without echoing the full token
            log.warn("Google token audience mismatch: aud={}", aud);
            throw new RuntimeException("Google token audience mismatch");
        }

        // --- Extract user identity claims from the verified token payload ---
        String email     = (String) payload.get("email");                         // Primary identifier for DMS account lookup
        String firstName = (String) payload.getOrDefault("given_name", "");      // May be absent for some Google accounts
        String lastName  = (String) payload.getOrDefault("family_name", "");     // May be absent for single-name accounts
        String picture   = (String) payload.get("picture");                       // Avatar URL to display in the DMS citizen profile

        // Resolve or auto-provision the DMS user and return a signed JWT response
        return findOrCreateUser(email, firstName, lastName, picture, "google");
    }

    /**
     * Verifies a Facebook user access token via Facebook Graph API and
     * returns or creates the matching DMS user.
     *
     * Flow:
     *   1. Construct a server-to-server app token (App ID | App Secret).
     *   2. Call Facebook's debug_token endpoint to verify the user access token.
     *   3. Fetch the user's profile fields (id, name, email, picture) from Graph API.
     *   4. Fall back to a synthetic email (fb-id@facebook.com) if email permission is not granted.
     *   5. Delegate to {@link #findOrCreateUser} to resolve or provision a DMS account.
     *
     * @param accessToken  The Facebook user access token sent by the DMS client.
     * @return             {@link AuthResponse} containing a DMS JWT and the user's profile data.
     * @throws RuntimeException if Facebook login is unconfigured, the token is invalid, or profile fetch fails.
     */
    public AuthResponse loginWithFacebook(String accessToken) {
        // Synchronous HTTP client for Graph API calls
        RestTemplate rest = new RestTemplate();

        // Guard: if Facebook credentials are absent in configuration, the feature is disabled
        if (facebookAppId == null || facebookAppId.isBlank()) {
            throw new RuntimeException("Facebook login is not configured on this server");
        }

        // --- Step 1: Verify the user token using a server-to-server app token ---
        // The pipe-separated app token allows the backend to call debug_token without a user context
        // Verify token with app token
        String appToken = facebookAppId + "|" + facebookAppSecret;
        // debug_token returns metadata about the user token including validity and granted permissions
        String debugUrl = "https://graph.facebook.com/debug_token?input_token="
                + accessToken + "&access_token=" + appToken;

        Map<String, Object> debugResp;  // Raw response from the debug_token endpoint
        try {
            @SuppressWarnings("unchecked")
            // Sends GET to Facebook Graph API; response contains a `data` object with `is_valid` flag
            Map<String, Object> resp = rest.getForObject(debugUrl, Map.class);
            debugResp = resp;
        } catch (RestClientException e) {
            // Covers network errors, Facebook service unavailability, and unexpected HTTP errors
            throw new RuntimeException("Facebook token verification failed: " + e.getMessage());
        }

        // Null response means something went wrong at the network or serialization level
        if (debugResp == null) throw new RuntimeException("Facebook token verification failed");

        @SuppressWarnings("unchecked")
        // Extract the nested `data` object which contains token metadata fields
        Map<String, Object> data = (Map<String, Object>) debugResp.get("data");

        // `is_valid` is the authoritative field indicating whether the token is active and untampered
        Boolean isValid = data != null ? (Boolean) data.get("is_valid") : false;
        if (!Boolean.TRUE.equals(isValid)) throw new RuntimeException("Invalid Facebook access token");

        // --- Step 2: Fetch the user's profile from the Graph API ---
        // Request specific fields needed for the DMS citizen profile; picture is nested under data.url
        // Fetch user profile
        String profileUrl = "https://graph.facebook.com/me?fields=id,first_name,last_name,email,picture&access_token=" + accessToken;
        @SuppressWarnings("unchecked")
        // Returns the user's public profile fields as a flat/nested JSON map
        Map<String, Object> profile = rest.getForObject(profileUrl, Map.class);

        // Null profile means the access token was valid but Graph API returned no data
        if (profile == null) throw new RuntimeException("Failed to fetch Facebook profile");

        // --- Step 3: Extract identity fields for DMS account provisioning ---
        String email = (String) profile.get("email");  // May be null if user denied email permission in Facebook consent
        if (email == null || email.isBlank()) {
            // Facebook may not return email if not granted — use fb-id@facebook.com as fallback
            // Use a deterministic synthetic email so the same Facebook account always maps to the same DMS user
            email = profile.get("id") + "@facebook.com";
        }
        String firstName = (String) profile.getOrDefault("first_name", "");  // Given name from Facebook profile
        String lastName  = (String) profile.getOrDefault("last_name", "");   // Family name from Facebook profile

        // --- Step 4: Extract the profile picture URL from the nested picture.data structure ---
        @SuppressWarnings("unchecked")
        Map<String, Object> picture = (Map<String, Object>) profile.get("picture");  // Outer picture wrapper
        @SuppressWarnings("unchecked")
        // Facebook wraps the actual image data inside a nested `data` object
        Map<String, Object> picData = picture != null ? (Map<String, Object>) picture.get("data") : null;
        // The `url` field is the CDN-hosted avatar URL to store on the DMS citizen profile
        String pictureUrl = picData != null ? (String) picData.get("url") : null;

        // Resolve or auto-provision the DMS user and return a signed JWT response
        return findOrCreateUser(email, firstName, lastName, pictureUrl, "facebook");
    }

    /**
     * Looks up an existing DMS user by email, or creates a new CITIZEN account if none exists.
     *
     * This is the single convergence point for all OAuth providers in the DMS.
     * New accounts are automatically assigned the CITIZEN role, which allows them to
     * report incidents and view public alerts but not access officer or admin features.
     *
     * A random non-usable password is assigned so the account cannot be used with
     * standard username/password login — OAuth is the only valid authentication path
     * for accounts created here.
     *
     * @param email      Verified email address from the OAuth provider (primary DMS account key).
     * @param firstName  User's given name (may be empty; falls back to email prefix).
     * @param lastName   User's family name (may be empty).
     * @param avatarUrl  CDN URL for the user's profile picture from the OAuth provider.
     * @param provider   Human-readable provider name ("google" or "facebook") for audit logging.
     * @return           {@link AuthResponse} with a signed DMS JWT and user profile fields.
     * @throws RuntimeException if the found account is disabled by a DMS administrator.
     */
    private AuthResponse findOrCreateUser(String email, String firstName, String lastName,
                                           String avatarUrl, String provider) {
        // Attempt to find an existing DMS account by email; auto-create if absent (first OAuth login)
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            // Log new OAuth citizen registrations for audit and analytics purposes
            log.info("Creating new {} OAuth user: {}", provider, email);
            User newUser = User.builder()
                    .email(email)                                               // Primary identifier used for all future logins
                    .firstName(firstName.isBlank() ? email.split("@")[0] : firstName)  // Fallback to email prefix if name is absent
                    .lastName(lastName.isBlank() ? "" : lastName)               // Empty string is acceptable for single-name accounts
                    .password("OAUTH_" + UUID.randomUUID())                    // Non-usable random password — prevents standard login bypass
                    .avatarUrl(avatarUrl)                                       // Profile picture URL shown in the DMS citizen dashboard
                    .roles(Collections.singleton("CITIZEN"))                    // Default role: can report incidents and view public alerts
                    .active(true)                                               // Account is enabled immediately on first OAuth login
                    .build();
            return userRepository.save(newUser);  // Persist the new DMS citizen account to the database
        });

        // A DMS administrator may disable an account; prevent disabled users from obtaining a JWT
        if (!user.getActive()) {
            throw new RuntimeException("Account is disabled. Please contact support.");
        }

        // --- Build a Spring Security Authentication object to drive JWT generation ---
        // Build a synthetic Authentication for JWT generation
        // Wraps the DMS user in Spring Security's UserDetails contract (grants authorities from roles)
        UserDetailsImpl userDetails = UserDetailsImpl.build(user);
        // UsernamePasswordAuthenticationToken with null credentials signals a pre-authenticated session
        Authentication auth = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());  // Authorities derived from the user's DMS roles (e.g. CITIZEN)

        // Generate a signed JWT that the DMS client will include in all subsequent API requests
        String token = jwtTokenProvider.generateToken(auth);

        // Assemble and return the standardized DMS auth response consumed by the mobile/web client
        return AuthResponse.builder()
                .token(token)               // Signed JWT for accessing protected DMS endpoints
                .id(user.getId())           // DMS internal user ID (used for profile and incident ownership)
                .email(user.getEmail())     // Confirmed email address from the OAuth provider
                .firstName(user.getFirstName())  // Display name for the DMS citizen portal header
                .lastName(user.getLastName())    // Last name for full-name display in reports and assignments
                .roles(user.getRoles())          // Role set (e.g. CITIZEN) returned so the client can conditionally show UI features
                .build();
    }
}