package com.dms.auth;

import com.dms.common.ApiResponse;
import com.dms.security.JwtTokenProvider;
import com.dms.security.UserDetailsImpl;
import com.dms.user.User;
import com.dms.user.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;

@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Authentication and registration endpoints")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final OAuthService oAuthService;

    @Operation(summary = "Authenticate user", description = "Logs in a user and returns a JWT token")
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtTokenProvider.generateToken(authentication);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        User user = userRepository.findByEmail(userDetails.getEmail())
                .orElseThrow(() -> new RuntimeException("Error: User is not found."));

        AuthResponse authResponse = AuthResponse.builder()
                .token(jwt)
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .roles(user.getRoles())
                .build();

        return ResponseEntity.ok(ApiResponse.success("Login successful", authResponse));
    }

    @Operation(summary = "Register user", description = "Registers a new citizen user")
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<String>> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Error: Email is already in use!"));
        }

        User user = User.builder()
                .firstName(registerRequest.getFirstName())
                .lastName(registerRequest.getLastName())
                .email(registerRequest.getEmail())
                .password(passwordEncoder.encode(registerRequest.getPassword()))
                .phoneNumber(registerRequest.getPhoneNumber())
                .roles(Collections.singleton("CITIZEN"))
                .build();

        userRepository.save(user);

        return ResponseEntity.ok(ApiResponse.success("User registered successfully!", null));
    }

    @Operation(summary = "Logout", description = "Invalidates the current session (client should discard the token)")
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout() {
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(ApiResponse.success("Logged out successfully", null));
    }

    @Operation(summary = "OAuth2 login", description = "Login or register via Google or Facebook ID token")
    @PostMapping("/oauth")
    public ResponseEntity<ApiResponse<AuthResponse>> oauthLogin(@Valid @RequestBody OAuthRequest request) {
        try {
            AuthResponse response = switch (request.getProvider().toLowerCase()) {
                case "google"   -> oAuthService.loginWithGoogle(request.getIdToken());
                case "facebook" -> oAuthService.loginWithFacebook(request.getIdToken());
                default -> throw new IllegalArgumentException("Unsupported provider: " + request.getProvider());
            };
            return ResponseEntity.ok(ApiResponse.success("OAuth login successful", response));
        } catch (Exception e) {
            log.error("OAuth login failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
