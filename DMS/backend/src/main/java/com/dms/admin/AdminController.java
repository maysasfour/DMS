package com.dms.admin;

import com.dms.common.ApiResponse;
import com.dms.user.UserDTO;
import com.dms.user.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Admin", description = "Admin management endpoints")
public class AdminController {

    private final UserService userService;

    @Operation(summary = "Get all users (Admin only)")
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserDTO>>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success("Users retrieved", userService.getAllUsers()));
    }

    @Operation(summary = "Get user by ID (Admin only)")
    @GetMapping("/users/{id}")
    public ResponseEntity<ApiResponse<UserDTO>> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("User retrieved", userService.getUserById(id)));
    }

    @Operation(summary = "Update user role (Admin only)")
    @PatchMapping("/users/{id}/role")
    public ResponseEntity<ApiResponse<UserDTO>> updateUserRole(
            @PathVariable Long id,
            @RequestParam(required = false) String role,
            @RequestBody(required = false) Map<String, String> body) {
        String resolvedRole = (role != null && !role.isBlank()) ? role
                : (body != null ? body.get("role") : null);
        return ResponseEntity.ok(ApiResponse.success("Role updated", userService.updateUserRole(id, resolvedRole)));
    }

    @Operation(summary = "Update user role via PUT (Admin only)")
    @PutMapping("/users/{id}/role")
    public ResponseEntity<ApiResponse<UserDTO>> updateUserRolePut(
            @PathVariable Long id,
            @RequestParam(required = false) String role,
            @RequestBody(required = false) Map<String, String> body) {
        String resolvedRole = (role != null && !role.isBlank()) ? role
                : (body != null ? body.get("role") : null);
        return ResponseEntity.ok(ApiResponse.success("Role updated", userService.updateUserRole(id, resolvedRole)));
    }

    @Operation(summary = "Toggle user active status (Admin only)")
    @PatchMapping("/users/{id}/toggle-active")
    public ResponseEntity<ApiResponse<UserDTO>> toggleUserActive(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Status updated", userService.toggleUserActive(id)));
    }
}
