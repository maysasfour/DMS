/**
 * LoginRequest.java
 *
 * Data Transfer Object (DTO) representing the credentials submitted by a DMS user
 * during the authentication process. This class captures and validates the email
 * and password fields sent in the login request body before they are processed
 * by the authentication service.
 *
 * Used by all DMS actor types: administrators, officers, and team members.
 */
package com.dms.auth;

// Jakarta Bean Validation constraints for enforcing input rules on request fields
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

// Lombok annotation that auto-generates getters, setters, equals, hashCode, and toString
import lombok.Data;

/**
 * Encapsulates the login credentials provided by a DMS user attempting to authenticate.
 * Spring MVC will bind and validate this object from the incoming JSON request body.
 */
@Data // Lombok: eliminates boilerplate by generating all accessor and utility methods at compile time
public class LoginRequest {

    // The registered email address of the DMS user — serves as the unique login identifier
    @NotBlank(message = "Email is required") // Rejects null, empty, or whitespace-only values before processing
    @Email(message = "Invalid email format") // Enforces proper email structure (e.g., user@domain.com)
    private String email;

    // The plaintext password submitted by the user — will be matched against the stored encoded hash
    @NotBlank(message = "Password is required") // Ensures a password value is always present in the request
    private String password;
}