/**
 * UpdateProfileRequest.java
 *
 * Data Transfer Object (DTO) representing the payload sent by a DMS user
 * when updating their own profile information. This class is used in the
 * profile update endpoint to safely carry only the fields a user is permitted
 * to modify (name, phone, bio, avatar). Sensitive fields such as email, role,
 * and password are intentionally excluded to prevent unauthorized changes.
 *
 * Validation constraints are enforced via Jakarta Bean Validation annotations
 * before the data reaches the service layer.
 */
package com.dms.user;

// Jakarta validation constraints used to enforce input rules on incoming profile data
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

// Lombok @Data auto-generates getters, setters, equals, hashCode, and toString at compile time
import lombok.Data;

// @Data eliminates boilerplate; all fields become accessible via generated getters/setters
@Data
public class UpdateProfileRequest {

    // User's first name — must be non-empty and not exceed 50 characters
    @Size(min = 1, max = 50, message = "First name must be between 1 and 50 characters")
    private String firstName;

    // User's last name — must be non-empty and not exceed 50 characters
    @Size(min = 1, max = 50, message = "Last name must be between 1 and 50 characters")
    private String lastName;

    // Contact phone number for the DMS user; validated against a permissive international format
    // allowing optional leading '+', digits, spaces, dashes, and parentheses up to 20 characters
    @Pattern(
        regexp = "^\\+?[\\d\\s\\-()]{0,20}$",  // Regex permits international phone formats, e.g. +1 (555) 123-4567
        message = "Phone number format is invalid"
    )
    private String phoneNumber;

    // Short biography or description the user provides about themselves (e.g. role in disaster response)
    // Capped at 500 characters to prevent abuse and keep profile data compact
    @Size(max = 500, message = "Bio must not exceed 500 characters")
    private String bio;

    // Avatar URL is set server-side after upload; not accepted from client directly
    // The actual URL is assigned by the backend after processing the uploaded image,
    // preventing clients from injecting arbitrary external URLs into user profiles
    private String avatarUrl;
}