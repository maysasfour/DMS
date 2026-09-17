/**
 * UserController.java
 *
 * REST controller for managing user accounts within the Disaster Management System (DMS).
 * Exposes API endpoints for both regular users (profile management, password changes)
 * and administrators (listing all users, assigning roles, toggling account status).
 *
 * Base path: /api/v1/users
 *
 * Security note: Authentication is injected by Spring Security from the JWT token;
 * admin-only endpoints should be protected by role-based access control configured
 * in the SecurityConfig. Never expose raw user credentials through these endpoints.
 */
package com.dms.user;

// DMS shared response wrapper — ensures consistent JSON envelope across all endpoints
import com.dms.common.ApiResponse;
// Swagger/OpenAPI annotations for generating interactive API documentation
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
// JSR-380 bean validation — triggers @NotBlank, @Email, @Size etc. on request bodies
import jakarta.validation.Valid;
// Lombok: generates constructor that injects all final fields, replacing manual @Autowired
import lombok.RequiredArgsConstructor;
// Spring Data pagination support — used by the admin list endpoint
import org.springframework.data.domain.Page;
// Wraps HTTP responses so we can control status codes and headers explicitly
import org.springframework.http.ResponseEntity;
// Holds the authenticated principal (username/email) extracted from the JWT token
import org.springframework.security.core.Authentication;
// Spring MVC annotations for mapping HTTP methods and extracting request data
import org.springframework.web.bind.annotation.*;

// Standard Java collections — used for the admin full-user-list return type
import java.util.List;

/**
 * Marks this class as a Spring MVC controller whose methods return data directly
 * as JSON (via Jackson), rather than resolving view templates. Combined with
 * @RequestMapping, every method here handles HTTP requests under /api/v1/users.
 */
@RestController
// All endpoints in this controller are relative to /api/v1/users
@RequestMapping("/api/v1/users")
// Lombok: auto-generates a constructor for the final userService field (constructor injection)
@RequiredArgsConstructor
// Swagger: groups all endpoints in this controller under the "Users" section of the API docs
@Tag(name = "Users", description = "User management endpoints")
public class UserController {

    // Service layer that encapsulates all business logic for user operations (CRUD, role management, etc.)
    private final UserService userService;

    // ---------------------------------------------------------------------------
    // Self-service endpoints — available to any authenticated DMS user
    // ---------------------------------------------------------------------------

    // Swagger: describes this endpoint in the generated OpenAPI documentation
    @Operation(summary = "Get current user profile")
    // Maps HTTP GET /api/v1/users/profile to this method
    @GetMapping("/profile")
    /**
     * Retrieves the profile of the currently authenticated user.
     * The username (email) is extracted from the JWT via the Authentication object,
     * ensuring a user can only read their own profile without exposing an ID in the URL.
     *
     * @param authentication Spring Security principal injected from the validated JWT token
     * @return 200 OK with the user's profile data wrapped in ApiResponse
     */
    public ResponseEntity<ApiResponse<UserDTO>> getProfile(Authentication authentication) {
        // authentication.getName() returns the email/username stored in the JWT subject claim
        return ResponseEntity.ok(ApiResponse.success("Profile retrieved", userService.getUserProfile(authentication.getName())));
    }

    // Swagger: describes the profile update operation in API docs
    @Operation(summary = "Update current user profile")
    // Maps HTTP PUT /api/v1/users/profile — full replacement of editable profile fields
    @PutMapping("/profile")
    /**
     * Updates profile fields (e.g., display name, phone number) for the authenticated user.
     * Only fields present in UpdateProfileRequest are modifiable; sensitive fields like
     * role and password are handled by dedicated endpoints.
     *
     * @param request   Validated request body containing the new profile values
     * @param authentication Spring Security principal used to identify the acting user
     * @return 200 OK with the updated UserDTO
     */
    public ResponseEntity<ApiResponse<UserDTO>> updateProfile(
            // @Valid triggers bean validation constraints declared on UpdateProfileRequest fields
            @RequestBody @Valid UpdateProfileRequest request,
            // Injected automatically by Spring Security from the current request's JWT
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("Profile updated", userService.updateProfile(authentication.getName(), request)));
    }

    // Swagger: documents the change-password operation
    @Operation(summary = "Change password")
    // Maps HTTP PUT /api/v1/users/change-password
    @PutMapping("/change-password")
    /**
     * Allows an authenticated DMS user to change their own password.
     * The service layer is expected to verify the current password before applying the change,
     * preventing unauthorized password resets if a session token is somehow leaked.
     *
     * @param request        Contains currentPassword and newPassword fields
     * @param authentication Identifies the user whose password is being changed
     * @return 200 OK with a null data payload (operation has no meaningful return value)
     */
    public ResponseEntity<ApiResponse<Void>> changePassword(
            // Request body carries old and new password; no @Valid here — service handles validation
            @RequestBody ChangePasswordRequest request,
            Authentication authentication) {
        // Delegate to service; throws an exception (e.g., BadCredentialsException) if current password is wrong
        userService.changePassword(authentication.getName(), request);
        // Return Void payload — the success message alone is sufficient confirmation
        return ResponseEntity.ok(ApiResponse.success("Password changed", null));
    }

    // ---------------------------------------------------------------------------
    // Admin endpoints — should be restricted to ROLE_ADMIN in SecurityConfig
    // ---------------------------------------------------------------------------

    // Swagger: documents the admin user listing operation
    @Operation(summary = "Get all users (Admin)")
    // Maps HTTP GET /api/v1/users — returns all registered DMS users for admin oversight
    @GetMapping
    /**
     * Returns a flat list of all users registered in the DMS.
     * Intended for the Admin dashboard to monitor responders, citizens, and officers.
     * Pagination parameters are accepted but currently forwarded without use by the service;
     * future iterations should wire page/size into a Pageable query for large deployments.
     *
     * @param page Zero-based page index (default 0)
     * @param size Number of records per page (default 10)
     * @return 200 OK with the full list of UserDTOs
     */
    public ResponseEntity<ApiResponse<List<UserDTO>>> getAllUsers(
            // @RequestParam binds the ?page= query parameter; defaults to 0 if omitted
            @RequestParam(defaultValue = "0") int page,
            // @RequestParam binds the ?size= query parameter; defaults to 10 if omitted
            @RequestParam(defaultValue = "10") int size) {
        // Note: page/size are received but userService.getAllUsers() does not yet paginate
        return ResponseEntity.ok(ApiResponse.success("Users retrieved", userService.getAllUsers()));
    }

    // Swagger: documents the single-user lookup by ID
    @Operation(summary = "Get user by ID (Admin)")
    // Maps HTTP GET /api/v1/users/{id} — path variable captures the user's database primary key
    @GetMapping("/{id}")
    /**
     * Fetches the profile of a specific DMS user by their database ID.
     * Used by admins to inspect or audit individual user accounts (e.g., verifying
     * a responder's credentials before assigning them to an incident).
     *
     * @param id Primary key of the target user record
     * @return 200 OK with the requested UserDTO, or a 404 error if not found
     */
    public ResponseEntity<ApiResponse<UserDTO>> getUserById(
            // @PathVariable extracts the {id} segment from the URL and converts it to Long
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("User retrieved", userService.getUserById(id)));
    }

    // Swagger: documents the role assignment operation
    @Operation(summary = "Update user role (Admin)")
    // Maps HTTP PATCH /api/v1/users/{id}/role — partial update affecting only the role field
    @PatchMapping("/{id}/role")
    /**
     * Assigns or changes the role of a DMS user (e.g., CITIZEN -> RESPONDER -> ADMIN).
     * Role controls what features and incidents the user can access in both the
     * web portal and the mobile app, so this action should be audited.
     *
     * @param id   Primary key of the user whose role is being changed
     * @param role New role string (e.g., "ADMIN", "RESPONDER", "CITIZEN")
     * @return 200 OK with the updated UserDTO reflecting the new role
     */
    public ResponseEntity<ApiResponse<UserDTO>> updateUserRole(
            // Extracts the user ID from the URL path segment
            @PathVariable Long id,
            // Extracts the ?role= query parameter containing the new role value
            @RequestParam String role) {
        return ResponseEntity.ok(ApiResponse.success("Role updated", userService.updateUserRole(id, role)));
    }

    // Swagger: documents the account activation/deactivation toggle
    @Operation(summary = "Toggle user active status (Admin)")
    // Maps HTTP PATCH /api/v1/users/{id}/toggle-active — flips the isActive flag
    @PatchMapping("/{id}/toggle-active")
    /**
     * Enables or disables a user account in the DMS without deleting it.
     * Deactivating a responder prevents them from logging in or receiving incident
     * assignments while preserving their history for audit and reporting purposes.
     *
     * @param id Primary key of the user account to toggle
     * @return 200 OK with the updated UserDTO showing the new active status
     */
    public ResponseEntity<ApiResponse<UserDTO>> toggleUserActive(
            // Extracts the target user's ID from the URL path
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Status updated", userService.toggleUserActive(id)));
    }
}