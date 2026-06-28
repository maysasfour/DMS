package com.dms.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OAuthRequest {
    @NotBlank
    private String idToken;   // Google ID token or Facebook access token

    @NotBlank
    private String provider;  // "google" or "facebook"
}
