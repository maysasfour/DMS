/**
 * OAuthRequest.java
 *
 * Data Transfer Object (DTO) used to receive OAuth authentication requests
 * from disaster management portal users (officers, team leads, admins) who
 * choose to sign in via a third-party identity provider (Google or Facebook)
 * instead of local credentials.
 *
 * This payload is submitted by the frontend login pages (OfficerLogin, AdminLogin,
 * TeamLogin) when a social login button is clicked. The backend OAuthService then
 * verifies the token with the respective provider and issues a DMS session token.
 */
package com.dms.auth;

// Jakarta Validation: enforces that required fields are not null or empty strings
import jakarta.validation.constraints.NotBlank;

// Lombok @Data: auto-generates getters, setters, equals, hashCode, and toString
// so this DTO stays concise without boilerplate
import lombok.Data;

/**
 * Represents an incoming social OAuth login request payload.
 * Deserialized from the JSON body of POST /api/auth/oauth requests.
 *
 * Lombok @Data eliminates the need for manually writing accessor methods,
 * keeping the class focused purely on its data contract.
 */
@Data
public class OAuthRequest {

    /**
     * The short-lived token issued by the OAuth provider after the user
     * successfully authenticates in the browser popup/redirect.
     * - For Google: this is an OpenID Connect ID token (JWT) containing
     *   the user's email, name, and picture, which OAuthService verifies
     *   against Google's public keys.
     * - For Facebook: this is a user access token that OAuthService
     *   exchanges with the Graph API to retrieve user profile data.
     *
     * @NotBlank ensures the request is rejected (400 Bad Request) before
     * reaching any service logic if this field is missing or whitespace-only.
     */
    @NotBlank // Validation: token must be present; prevents empty OAuth attempts
    private String idToken;   // Google ID token or Facebook access token

    /**
     * Identifies which OAuth provider issued the token so OAuthService
     * can route verification to the correct third-party API.
     * Expected values: "google" or "facebook" (case-sensitive, matched in OAuthService).
     *
     * @NotBlank ensures an explicit provider is always supplied, preventing
     * ambiguous verification attempts that could bypass security checks.
     */
    @NotBlank // Validation: provider name is mandatory; avoids null-routing in OAuthService
    private String provider;  // "google" or "facebook"
}