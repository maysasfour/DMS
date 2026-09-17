/**
 * ChangePasswordRequest.java
 *
 * Data Transfer Object (DTO) used in the Disaster Management System (DMS) to carry
 * a user's password change request from the HTTP layer to the service layer.
 *
 * This class is submitted by authenticated DMS users (responders, admins, team members)
 * when they wish to update their account password via the profile or security settings page.
 * It enforces validation constraints server-side to ensure strong password policies
 * are upheld before any credential update is persisted.
 *
 * Package: com.dms.user — groups all user-account-related classes in the DMS backend.
 */
package com.dms.user;

// Jakarta Bean Validation — ensures fields are non-empty and match required patterns before processing
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

// Lombok @Data — auto-generates getters, setters, equals, hashCode, and toString at compile time
import lombok.Data;

/**
 * Request body for the "change password" endpoint.
 *
 * Received as JSON in the request body when a logged-in DMS user submits a
 * password change form. Spring's @Valid annotation on the controller method
 * triggers all field-level constraint checks defined below before the service
 * layer is invoked.
 */
@Data // Lombok: eliminates boilerplate — generates getters/setters for currentPassword and newPassword
public class ChangePasswordRequest {

    /**
     * The user's existing (current) password, supplied to verify identity before
     * the change is allowed. Prevents unauthorized password changes if a session
     * is hijacked but the attacker does not know the real password.
     */
    @NotBlank(message = "Current password is required") // Rejects null, empty, or whitespace-only strings
    private String currentPassword;

    /**
     * The desired new password the DMS user wants to switch to.
     * Must satisfy all three constraint annotations below to be accepted.
     */
    @NotBlank(message = "New password is required") // Ensures the new password field is not left empty
    @Size(min = 8, max = 128, message = "New password must be between 8 and 128 characters") // Enforces minimum length for brute-force resistance and max length to guard against DoS via hashing
    @Pattern(
        // Regex enforces DMS password policy: at least one lowercase letter, one uppercase letter,
        // one digit, and one special character — reducing risk of weak credentials for privileged accounts
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#^()_+\\-=]).{8,}$",
        message = "New password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character"
    )
    private String newPassword;
}