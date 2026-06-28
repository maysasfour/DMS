package com.dms.user;

import com.dms.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "User management endpoints")
public class UserController {

    private final UserService userService;

    @Operation(summary = "Get current user profile")
    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<UserDTO>> getProfile(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("Profile retrieved", userService.getUserProfile(authentication.getName())));
    }

    @Operation(summary = "Update current user profile")
    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<UserDTO>> updateProfile(
            @RequestBody @Valid UpdateProfileRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("Profile updated", userService.updateProfile(authentication.getName(), request)));
    }

    @Operation(summary = "Change password")
    @PutMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @RequestBody ChangePasswordRequest request,
            Authentication authentication) {
        userService.changePassword(authentication.getName(), request);
        return ResponseEntity.ok(ApiResponse.success("Password changed", null));
    }

    @Operation(summary = "Get all users (Admin)")
    @GetMapping
    public ResponseEntity<ApiResponse<List<UserDTO>>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success("Users retrieved", userService.getAllUsers()));
    }

    @Operation(summary = "Get user by ID (Admin)")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDTO>> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("User retrieved", userService.getUserById(id)));
    }

    @Operation(summary = "Update user role (Admin)")
    @PatchMapping("/{id}/role")
    public ResponseEntity<ApiResponse<UserDTO>> updateUserRole(
            @PathVariable Long id,
            @RequestParam String role) {
        return ResponseEntity.ok(ApiResponse.success("Role updated", userService.updateUserRole(id, role)));
    }

    @Operation(summary = "Toggle user active status (Admin)")
    @PatchMapping("/{id}/toggle-active")
    public ResponseEntity<ApiResponse<UserDTO>> toggleUserActive(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Status updated", userService.toggleUserActive(id)));
    }
}
