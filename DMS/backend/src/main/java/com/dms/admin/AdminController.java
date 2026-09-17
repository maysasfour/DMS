/**
 * AdminController.java
 *
 * REST controller for administrative operations in the Disaster Management System (DMS).
 * Provides privileged endpoints accessible only to system administrators for managing
 * user accounts — including listing all registered users (civilians, officers, team members),
 * retrieving individual user profiles, updating user roles (e.g. promoting a user to OFFICER
 * or ADMIN), and toggling a user's active/inactive status to control system access.
 *
 * All endpoints are scoped under /api/v1/admin and are protected by role-based security
 * configured elsewhere in the Spring Security filter chain.
 */
package com.dms.admin;

// --- Internal DMS imports ---
import com.dms.common.ApiResponse;   // Standardised API response wrapper used across all DMS endpoints
import com.dms.user.UserDTO;         // Data Transfer Object representing a user without sensitive fields
import com.dms.user.UserService;     // Service layer containing business logic for user management

// --- OpenAPI/Swagger documentation annotations ---
import io.swagger.v3.oas.annotations.Operation; // Documents a single API operation in the Swagger UI
import io.swagger.v3.oas.annotations.tags.Tag;  // Groups related endpoints under the "Admin" tag in Swagger UI

// --- Lombok annotation for constructor injection ---
import lombok.RequiredArgsConstructor; // Generates a constructor for all final fields, enabling Spring DI without @Autowired

// --- Spring HTTP and web layer imports ---
import org.springframework.http.ResponseEntity;      // Wraps the HTTP response including status code and body
import org.springframework.web.bind.annotation.*;    // Imports @RestController, @RequestMapping, @GetMapping, @PatchMapping, etc.

// --- Java standard library ---
import java.util.List; // Used to return collections of users from listing endpoints
import java.util.Map;  // Used to accept a flexible JSON body map for role update requests

// @RestController marks this class as a Spring MVC controller where every method returns
// a response body directly (combines @Controller + @ResponseBody), so no view is resolved.
@RestController

// @RequestMapping sets the base URL path for all endpoints in this controller;
// all admin endpoints are versioned under /api/v1/admin.
@RequestMapping("/api/v1/admin")

// @RequiredArgsConstructor (Lombok) generates a constructor injecting all final fields,
// satisfying Spring's dependency injection for UserService without explicit @Autowired.
@RequiredArgsConstructor

// @Tag groups this controller's endpoints under the "Admin" label in the Swagger/OpenAPI UI,
// making it easy for developers to locate administrative operations during API exploration.
@Tag(name = "Admin", description = "Admin management endpoints")
public class AdminController {

    // Injected via constructor (Lombok @RequiredArgsConstructor); provides all user-related
    // business logic including retrieval, role management, and account activation for DMS users.
    private final UserService userService;

    // @Operation documents this endpoint in the Swagger UI with a human-readable summary,
    // clarifying that only admin-authenticated callers may invoke it.
    @Operation(summary = "Get all users (Admin only)")

    // @GetMapping maps HTTP GET requests to /api/v1/admin/users for listing all DMS users.
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserDTO>>> getAllUsers(
            // @RequestParam binds the "page" query parameter; defaults to 0 for the first page
            // to support future pagination of potentially large user lists.
            @RequestParam(defaultValue = "0") int page,
            // @RequestParam binds the "size" query parameter; defaults to 20 results per page
            // to limit response payload size when many users exist in the system.
            @RequestParam(defaultValue = "20") int size) {
        // Delegate to UserService to fetch all registered users (civilians, officers, admins)
        // and wrap the result in a standardised ApiResponse with a success message.
        return ResponseEntity.ok(ApiResponse.success("Users retrieved", userService.getAllUsers()));
    }

    // Documents the lookup-by-ID operation in Swagger, flagging admin-only access.
    @Operation(summary = "Get user by ID (Admin only)")

    // @GetMapping with path variable maps GET /api/v1/admin/users/{id} to this method,
    // allowing an admin to fetch any specific user's profile by their database ID.
    @GetMapping("/users/{id}")
    public ResponseEntity<ApiResponse<UserDTO>> getUserById(
            // @PathVariable extracts the {id} segment from the URL and binds it to the Long id parameter.
            @PathVariable Long id) {
        // Look up the user by their unique ID via UserService and return their DTO;
        // UserService is expected to throw an appropriate exception if the user is not found.
        return ResponseEntity.ok(ApiResponse.success("User retrieved", userService.getUserById(id)));
    }

    // Documents the role-update PATCH operation in Swagger; role changes affect what
    // areas of the DMS a user can access (e.g. incident management, resource allocation).
    @Operation(summary = "Update user role (Admin only)")

    // @PatchMapping maps HTTP PATCH requests to /api/v1/admin/users/{id}/role,
    // allowing partial updates — specifically changing just the role field of a user.
    @PatchMapping("/users/{id}/role")
    public ResponseEntity<ApiResponse<UserDTO>> updateUserRole(
            // @PathVariable extracts the target user's ID from the URL path.
            @PathVariable Long id,
            // @RequestParam allows the new role to be supplied as a query string parameter
            // (e.g. ?role=OFFICER); marked optional so callers may use the request body instead.
            @RequestParam(required = false) String role,
            // @RequestBody allows the new role to be supplied in a JSON body (e.g. {"role":"ADMIN"});
            // marked optional to support both query-param and body-based clients.
            @RequestBody(required = false) Map<String, String> body) {
        // Resolve the role from whichever source the caller provided:
        // prefer the query param if it is non-null and non-blank, otherwise fall back to the
        // "role" key in the JSON body, supporting flexible client integrations.
        String resolvedRole = (role != null && !role.isBlank()) ? role
                : (body != null ? body.get("role") : null);
        // Delegate role assignment to UserService, which validates the role value and
        // persists the change, then return the updated user DTO to confirm the new role.
        return ResponseEntity.ok(ApiResponse.success("Role updated", userService.updateUserRole(id, resolvedRole)));
    }

    // Documents the PUT variant of role update in Swagger; PUT is idempotent and provided
    // for clients that prefer full-replacement semantics over PATCH for role assignment.
    @Operation(summary = "Update user role via PUT (Admin only)")

    // @PutMapping maps HTTP PUT requests to /api/v1/admin/users/{id}/role;
    // functionally identical to the PATCH variant above but accommodates clients that
    // send PUT instead of PATCH for role updates (e.g. some frontend HTTP libraries).
    @PutMapping("/users/{id}/role")
    public ResponseEntity<ApiResponse<UserDTO>> updateUserRolePut(
            // @PathVariable extracts the target user's ID from the URL path.
            @PathVariable Long id,
            // Optional query parameter carrying the new role string (e.g. OFFICER, ADMIN, CIVILIAN).
            @RequestParam(required = false) String role,
            // Optional JSON body carrying the new role; allows {"role": "TEAM_MEMBER"} style payloads.
            @RequestBody(required = false) Map<String, String> body) {
        // Apply the same dual-source resolution as the PATCH endpoint: query param wins,
        // then fall back to the body map, ensuring broad client compatibility.
        String resolvedRole = (role != null && !role.isBlank()) ? role
                : (body != null ? body.get("role") : null);
        // Delegate to UserService to apply the role change and return the updated user DTO.
        return ResponseEntity.ok(ApiResponse.success("Role updated", userService.updateUserRole(id, resolvedRole)));
    }

    // Documents the active-status toggle operation in Swagger; deactivating a user
    // prevents them from logging in or submitting incident reports in the DMS.
    @Operation(summary = "Toggle user active status (Admin only)")

    // @PatchMapping maps HTTP PATCH requests to /api/v1/admin/users/{id}/toggle-active;
    // a toggle pattern avoids needing to send the desired state — each call flips active/inactive.
    @PatchMapping("/users/{id}/toggle-active")
    public ResponseEntity<ApiResponse<UserDTO>> toggleUserActive(
            // @PathVariable extracts the target user's ID from the URL so the admin can
            // activate or deactivate any specific user account in the system.
            @PathVariable Long id) {
        // Delegate to UserService to flip the user's isActive flag and persist the change;
        // returns the updated UserDTO so the caller can confirm the new active state.
        return ResponseEntity.ok(ApiResponse.success("Status updated", userService.toggleUserActive(id)));
    }
}