package com.dms.auth;

import com.dms.security.JwtTokenProvider;
import com.dms.security.UserDetailsImpl;
import com.dms.user.User;
import com.dms.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class OAuthService {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;

    @Value("${oauth.google.client-id:}")
    private String googleClientId;

    @Value("${oauth.google.client-secret:}")
    private String googleClientSecret;

    @Value("${oauth.facebook.app-id:}")
    private String facebookAppId;

    @Value("${oauth.facebook.app-secret:}")
    private String facebookAppSecret;

    /**
     * Verifies a Google ID token via Google's tokeninfo endpoint and
     * returns or creates the matching DMS user.
     */
    public AuthResponse loginWithGoogle(String idToken) {
        RestTemplate rest = new RestTemplate();
        String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken;

        Map<String, Object> payload;
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> resp = rest.getForObject(url, Map.class);
            payload = resp;
        } catch (HttpClientErrorException e) {
            throw new RuntimeException("Invalid Google ID token: " + e.getStatusCode());
        } catch (RestClientException e) {
            throw new RuntimeException("Google token verification failed: " + e.getMessage());
        }

        if (payload == null || payload.containsKey("error")) {
            throw new RuntimeException("Invalid Google ID token");
        }

        String aud = (String) payload.get("aud");
        if (googleClientId != null && !googleClientId.isBlank() && !googleClientId.equals(aud)) {
            throw new RuntimeException("Google token audience mismatch");
        }

        String email     = (String) payload.get("email");
        String firstName = (String) payload.getOrDefault("given_name", "");
        String lastName  = (String) payload.getOrDefault("family_name", "");
        String picture   = (String) payload.get("picture");

        return findOrCreateUser(email, firstName, lastName, picture, "google");
    }

    /**
     * Verifies a Facebook user access token via Facebook Graph API and
     * returns or creates the matching DMS user.
     */
    public AuthResponse loginWithFacebook(String accessToken) {
        RestTemplate rest = new RestTemplate();

        if (facebookAppId == null || facebookAppId.isBlank()) {
            throw new RuntimeException("Facebook login is not configured on this server");
        }

        // Verify token with app token
        String appToken = facebookAppId + "|" + facebookAppSecret;
        String debugUrl = "https://graph.facebook.com/debug_token?input_token="
                + accessToken + "&access_token=" + appToken;

        Map<String, Object> debugResp;
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> resp = rest.getForObject(debugUrl, Map.class);
            debugResp = resp;
        } catch (RestClientException e) {
            throw new RuntimeException("Facebook token verification failed: " + e.getMessage());
        }

        if (debugResp == null) throw new RuntimeException("Facebook token verification failed");
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) debugResp.get("data");
        Boolean isValid = data != null ? (Boolean) data.get("is_valid") : false;
        if (!Boolean.TRUE.equals(isValid)) throw new RuntimeException("Invalid Facebook access token");

        // Fetch user profile
        String profileUrl = "https://graph.facebook.com/me?fields=id,first_name,last_name,email,picture&access_token=" + accessToken;
        @SuppressWarnings("unchecked")
        Map<String, Object> profile = rest.getForObject(profileUrl, Map.class);

        if (profile == null) throw new RuntimeException("Failed to fetch Facebook profile");

        String email = (String) profile.get("email");
        if (email == null || email.isBlank()) {
            // Facebook may not return email if not granted — use fb-id@facebook.com as fallback
            email = profile.get("id") + "@facebook.com";
        }
        String firstName = (String) profile.getOrDefault("first_name", "");
        String lastName  = (String) profile.getOrDefault("last_name", "");

        @SuppressWarnings("unchecked")
        Map<String, Object> picture = (Map<String, Object>) profile.get("picture");
        @SuppressWarnings("unchecked")
        Map<String, Object> picData = picture != null ? (Map<String, Object>) picture.get("data") : null;
        String pictureUrl = picData != null ? (String) picData.get("url") : null;

        return findOrCreateUser(email, firstName, lastName, pictureUrl, "facebook");
    }

    private AuthResponse findOrCreateUser(String email, String firstName, String lastName,
                                           String avatarUrl, String provider) {
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            log.info("Creating new {} OAuth user: {}", provider, email);
            User newUser = User.builder()
                    .email(email)
                    .firstName(firstName.isBlank() ? email.split("@")[0] : firstName)
                    .lastName(lastName.isBlank() ? "" : lastName)
                    .password("OAUTH_" + UUID.randomUUID()) // non-usable password
                    .avatarUrl(avatarUrl)
                    .roles(Collections.singleton("CITIZEN"))
                    .active(true)
                    .build();
            return userRepository.save(newUser);
        });

        if (!user.getActive()) {
            throw new RuntimeException("Account is disabled. Please contact support.");
        }

        // Build a synthetic Authentication for JWT generation
        UserDetailsImpl userDetails = UserDetailsImpl.build(user);
        Authentication auth = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());

        String token = jwtTokenProvider.generateToken(auth);

        return AuthResponse.builder()
                .token(token)
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .roles(user.getRoles())
                .build();
    }
}
