/**
 * JwtTokenProvider.java
 *
 * Core JWT (JSON Web Token) utility for the Disaster Management System (DMS).
 *
 * Responsibilities:
 *  - Generating signed JWT tokens upon successful login for DMS users (admins, officers, team members)
 *  - Embedding user identity (username, ID, roles) as claims so downstream filters can
 *    authorize access to incident reports, resources, and alerts without hitting the database
 *  - Validating incoming tokens on every protected API request
 *  - Extracting the authenticated username from a token for use in security contexts
 *
 * Tokens are HMAC-SHA signed using a secret key configured in application properties,
 * and carry a configurable expiration time to limit the window of misuse if a token
 * is intercepted.
 */
package com.dms.security;

// --- JJWT library imports for building, parsing, and validating JWT tokens ---
import io.jsonwebtoken.*;
// Utility for decoding Base64-encoded secrets when applicable
import io.jsonwebtoken.io.Decoders;
// Factory for creating cryptographic signing keys from raw bytes
import io.jsonwebtoken.security.Keys;
// Lombok annotation that injects a SLF4J logger field named `log` into this class
import lombok.extern.slf4j.Slf4j;
// Injects values from application.properties / environment variables into fields
import org.springframework.beans.factory.annotation.Value;
// Spring Security type representing a successfully authenticated user and their granted roles
import org.springframework.security.core.Authentication;
// Represents a single role/permission string (e.g., ROLE_ADMIN, ROLE_OFFICER) held by a user
import org.springframework.security.core.GrantedAuthority;
// Marks this class as a Spring-managed bean, making it injectable across the DMS backend
import org.springframework.stereotype.Component;

// Java standard library for HMAC-SHA symmetric key operations
import javax.crypto.SecretKey;
// Used to represent token issuance and expiration timestamps
import java.util.Date;
// Holds the list of role strings extracted from the authenticated user's authorities
import java.util.List;

/**
 * Lombok: auto-generates a static SLF4J `log` field so we can log JWT errors
 * (e.g., expired session, tampered token) without boilerplate.
 */
@Slf4j
/**
 * Spring: registers this class as a singleton Spring component, allowing it to be
 * @Autowired into JwtAuthenticationFilter and other security beans in the DMS backend.
 */
@Component
public class JwtTokenProvider {

    /**
     * The HMAC-SHA secret key value, injected from the `jwt.secret` property.
     * Must be kept confidential — exposure would allow attackers to forge tokens
     * and impersonate any DMS user including system administrators.
     */
    @Value("${jwt.secret}")
    private String jwtSecret;

    /**
     * Token validity duration in milliseconds, injected from `jwt.expiration`.
     * Controls how long a DMS user's session token remains valid before re-login is required.
     */
    @Value("${jwt.expiration}")
    private int jwtExpirationMs;

    /**
     * Builds a cryptographic HMAC-SHA SecretKey from the raw UTF-8 bytes of the configured secret.
     * Called internally each time a token needs to be signed or verified, ensuring the key is
     * always derived consistently from the same source string.
     *
     * @return a SecretKey suitable for HMAC-SHA JWT signing/verification
     */
    private SecretKey key() {
        // Convert the plain-text secret string to bytes using UTF-8 and wrap it as an HMAC key
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    /**
     * Generates a signed JWT token for a successfully authenticated DMS user.
     * The token embeds the user's username (email), database ID, and assigned roles
     * (e.g., ADMIN, OFFICER, TEAM_MEMBER) so that subsequent requests can be authorized
     * without additional database lookups.
     *
     * @param authentication the Spring Security authentication object produced after
     *                       verifying the user's credentials at login
     * @return a compact, URL-safe JWT string to be returned to the client and sent
     *         in the Authorization header on future API calls
     */
    public String generateToken(Authentication authentication) {
        // Cast the generic principal to our custom UserDetailsImpl to access DMS-specific fields
        UserDetailsImpl userPrincipal = (UserDetailsImpl) authentication.getPrincipal();

        // Extract role names (e.g., "ROLE_ADMIN") from the user's granted authorities
        // These roles gate access to admin endpoints, incident management, and resource operations
        List<String> roles = userPrincipal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority) // Convert each GrantedAuthority to its string representation
                .toList(); // Collect into an immutable list for embedding in the token claim

        // Build and sign the JWT using the JJWT fluent builder API
        return Jwts.builder()
                .subject(userPrincipal.getUsername())              // Set the token subject to the user's email/username
                .claim("id", userPrincipal.getId())                // Embed the DMS user's database ID for fast lookup
                .claim("roles", roles)                             // Embed role list so the filter can check access without a DB call
                .issuedAt(new Date())                              // Record the current timestamp as the token issue time
                .expiration(new Date((new Date()).getTime() + jwtExpirationMs)) // Set expiry = now + configured duration (ms)
                .signWith(key())                                   // Sign with the HMAC-SHA key derived from jwt.secret
                .compact();                                        // Serialize to the final compact JWT string (header.payload.signature)
    }

    /**
     * Parses a JWT token and extracts the subject claim, which is the authenticated
     * user's username (email address in DMS). Used by JwtAuthenticationFilter to
     * identify which DMS user made a request.
     *
     * @param token the raw JWT string from the Authorization header
     * @return the username (email) stored in the token's subject claim
     */
    public String getUsernameFromToken(String token) {
        // Build a parser configured with our signing key, parse the token, and return the subject claim
        return Jwts.parser().verifyWith(key()).build()
                .parseSignedClaims(token).getPayload().getSubject();
    }

    /**
     * Validates a JWT token to confirm it is well-formed, properly signed, and not expired.
     * Called on every incoming request to protected DMS endpoints (incident CRUD, user management,
     * resource allocation, etc.) before granting access.
     *
     * @param authToken the raw JWT string extracted from the request's Authorization header
     * @return true if the token is valid and the request may proceed; false if it should be rejected
     */
    public boolean validateToken(String authToken) {
        try {
            // Attempt to fully parse and verify the token signature; throws on any failure
            Jwts.parser().verifyWith(key()).build().parseSignedClaims(authToken);
            return true; // Token is valid — allow the request to continue to the DMS endpoint
        } catch (MalformedJwtException e) {
            // Token structure is invalid (e.g., tampered, truncated, or not a JWT at all)
            log.error("Invalid JWT token: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            // Token was valid but has passed its expiration time — user must re-authenticate
            log.error("JWT token is expired: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            // Token uses an algorithm or format not supported by this DMS configuration
            log.error("JWT token is unsupported: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            // Token string is null, empty, or otherwise cannot be parsed as a JWT
            log.error("JWT claims string is empty: {}", e.getMessage());
        }
        return false; // Any exception means the token is invalid — deny access
    }
}