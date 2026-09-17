/**
 * AuthController.java
 *
 * REST controller responsible for handling all authentication-related HTTP requests
 * in the Disaster Management System (DMS). This includes standard credential-based
 * login, new citizen user registration, session logout, and OAuth2 social login
 * via Google or Facebook. All endpoints are prefixed under /api/v1/auth and return
 * standardized ApiResponse wrappers for consistent client handling.
 *
 * DMS context: Only authenticated users (citizens, officers, admins, teams) may
 * access protected resources such as incident reporting, resource management,
 * and alert systems. This controller is the entry point for obtaining JWT tokens.
 */
package com.dms.auth;

// DMS shared response wrapper — wraps all API responses with status and message
import com.dms.common.ApiResponse;
// Utility for generating and validating JWT tokens for stateless authentication
import com.dms.security.JwtTokenProvider;
// Spring Security UserDetails implementation wrapping the DMS User entity
import com.dms.security.UserDetailsImpl;
// DMS User entity representing citizens, officers, admins, and team members
import com.dms.user.User;
// JPA repository for querying and persisting DMS user accounts
import com.dms.user.UserRepository;

// Swagger/OpenAPI annotations for generating interactive API documentation
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

// Enables Bean Validation on request body fields (e.g., @NotBlank, @Email)
import jakarta.validation.Valid;

// Lombok annotation: generates a constructor injecting all final fields (dependency injection)
import lombok.RequiredArgsConstructor;
// Lombok annotation: injects a SLF4J logger named after this class
import lombok.extern.slf4j.Slf4j;

// Spring HTTP response builder for setting status codes and response bodies
import org.springframework.http.ResponseEntity;
// Spring Security component that delegates authentication to configured providers
import org.springframework.security.authentication.AuthenticationManager;
// Token carrying the user's email/password credentials for authentication
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
// Represents the result of a successful authentication, including the principal and authorities
import org.springframework.security.core.Authentication;
// Thread-local holder for the currently authenticated user's security context
import org.springframework.security.core.context.SecurityContextHolder;
// Bcrypt-based encoder for hashing passwords before storage
import org.springframework.security.crypto.password.PasswordEncoder;
// Spring MVC annotations for REST controller, routing, and request body binding
import org.springframework.web.bind.annotation.*;

// Used to wrap the default "CITIZEN" role assignment as a single-element set
import java.util.Collections;

// Enables SLF4J logging via the injected `log` field for error and debug output
@Slf4j
// Marks this class as a REST controller; combines @Controller and @ResponseBody so all methods return JSON
@RestController
// All endpoints in this controller are prefixed with /api/v1/auth for versioned routing
@RequestMapping("/api/v1/auth")
// Lombok: generates a constructor for all final fields, enabling Spring to inject dependencies automatically
@RequiredArgsConstructor
// Swagger: groups these endpoints under the "Authentication" tag in the OpenAPI UI
@Tag(name = "Authentication", description = "Authentication and registration endpoints")
public class AuthController {

    // Delegates authentication to Spring Security's configured provider chain (e.g., DB lookup + password check)
    private final AuthenticationManager authenticationManager;

    // Provides database access for looking up and saving DMS user accounts
    private final UserRepository userRepository;

    // Bcrypt encoder used to hash plaintext passwords before persisting new users
    private final PasswordEncoder passwordEncoder;

    // Issues and validates JWT tokens used to authenticate subsequent DMS API requests
    private final JwtTokenProvider jwtTokenProvider;

    // Service handling Google and Facebook OAuth2 token verification and user provisioning
    private final OAuthService oAuthService;

    // Swagger: documents this endpoint in the OpenAPI spec for API consumers
    @Operation(summary = "Authenticate user", description = "Logs in a user and returns a JWT token")
    // Maps HTTP POST /api/v1/auth/login — the primary credential-based login entry point
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> authenticateUser(
            // @Valid triggers Bean Validation on the request body; @RequestBody deserializes JSON to LoginRequest
            @Valid @RequestBody LoginRequest loginRequest) {

        // Delegate email/password verification to Spring Security; throws AuthenticationException on failure
        Authentication authentication = authenticationManager.authenticate(
                // Wraps the submitted credentials into a token Spring Security can process
                new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword()));

        // Store the authenticated principal in the thread-local security context for this request
        SecurityContextHolder.getContext().setAuthentication(authentication);

        // Generate a signed JWT token encoding the user's identity and roles for stateless session management
        String jwt = jwtTokenProvider.generateToken(authentication);

        // Retrieve the DMS-specific UserDetails object containing the authenticated user's email and authorities
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        // Load the full DMS User entity from the database to populate the response (id, name, roles, etc.)
        User user = userRepository.findByEmail(userDetails.getEmail())
                // Should not occur after successful authentication; guards against data inconsistency
                .orElseThrow(() -> new RuntimeException("Error: User is not found."));

        // Build the structured login response containing the JWT and user profile data for the client
        AuthResponse authResponse = AuthResponse.builder()
                .token(jwt)                    // JWT token the client will include in Authorization headers
                .id(user.getId())              // Unique DMS user ID for client-side reference
                .email(user.getEmail())        // User's email address
                .firstName(user.getFirstName()) // User's first name for UI display
                .lastName(user.getLastName())   // User's last name for UI display
                .roles(user.getRoles())         // Set of roles (e.g., CITIZEN, OFFICER, ADMIN) for frontend route guarding
                .build();

        // Return HTTP 200 with a success wrapper containing the auth response payload
        return ResponseEntity.ok(ApiResponse.success("Login successful", authResponse));
    }

    // Swagger: documents the registration endpoint in the OpenAPI spec
    @Operation(summary = "Register user", description = "Registers a new citizen user")
    // Maps HTTP POST /api/v1/auth/register — public endpoint for new citizen self-registration
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<String>> registerUser(
            // @Valid enforces constraints (e.g., email format, password length) on the registration payload
            @Valid @RequestBody RegisterRequest registerRequest) {

        // Prevent duplicate accounts — each DMS user must have a unique email address
        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            // Return 400 Bad Request with a descriptive error so the client can prompt the user to log in instead
            return ResponseEntity.badRequest().body(ApiResponse.error("Error: Email is already in use!"));
        }

        // Construct a new DMS User entity with the submitted registration details
        User user = User.builder()
                .firstName(registerRequest.getFirstName())               // Citizen's first name
                .lastName(registerRequest.getLastName())                 // Citizen's last name
                .email(registerRequest.getEmail())                       // Unique login identifier
                .password(passwordEncoder.encode(registerRequest.getPassword())) // Hash password before storage for security
                .phoneNumber(registerRequest.getPhoneNumber())           // Contact number for alert and verification purposes
                .roles(Collections.singleton("CITIZEN"))                 // All self-registered users are Citizens by default
                .build();

        // Persist the new citizen account to the database
        userRepository.save(user);

        // Return HTTP 200 confirming successful registration; client should redirect to login
        return ResponseEntity.ok(ApiResponse.success("User registered successfully!", null));
    }

    // Swagger: documents the logout endpoint for API consumers
    @Operation(summary = "Logout", description = "Invalidates the current session (client should discard the token)")
    // Maps HTTP POST /api/v1/auth/logout — server-side session cleanup (JWT is stateless; client must discard token)
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout() {
        // Clear the authenticated principal from the current thread's security context
        SecurityContextHolder.clearContext();
        // Return HTTP 200; since JWT is stateless, the real invalidation happens on the client side
        return ResponseEntity.ok(ApiResponse.success("Logged out successfully", null));
    }

    // Swagger: documents the OAuth2 login endpoint for API consumers
    @Operation(summary = "OAuth2 login", description = "Login or register via Google or Facebook ID token")
    // Maps HTTP POST /api/v1/auth/oauth — allows citizens to authenticate using social identity providers
    @PostMapping("/oauth")
    public ResponseEntity<ApiResponse<AuthResponse>> oauthLogin(
            // @Valid enforces that provider and idToken fields are present and non-blank
            @Valid @RequestBody OAuthRequest request) {
        try {
            // Route to the correct OAuth provider handler based on the provider name in the request
            AuthResponse response = switch (request.getProvider().toLowerCase()) {
                // Verify the Google ID token against Google's public keys and provision/fetch the DMS user
                case "google"   -> oAuthService.loginWithGoogle(request.getIdToken());
                // Verify the Facebook access token via the Graph API and provision/fetch the DMS user
                case "facebook" -> oAuthService.loginWithFacebook(request.getIdToken());
                // Reject any unrecognised provider string with a clear error message
                default -> throw new IllegalArgumentException("Unsupported provider: " + request.getProvider());
            };
            // Return the same AuthResponse (JWT + profile) as standard login for a seamless client experience
            return ResponseEntity.ok(ApiResponse.success("OAuth login successful", response));
        } catch (Exception e) {
            // Log the failure with the exception message for server-side diagnostics and audit
            log.error("OAuth login failed: {}", e.getMessage());
            // Return 400 Bad Request with the exception message so the client can display a meaningful error
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}