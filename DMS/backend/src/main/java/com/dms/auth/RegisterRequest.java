/**
 * RegisterRequest.java
 *
 * Data Transfer Object (DTO) representing the payload sent by a new user
 * during self-registration in the Disaster Management System (DMS).
 *
 * This class captures and validates all required identity fields — name,
 * email, password, and optional phone number — before the AuthController
 * passes them to the registration service for account creation.
 *
 * Validation is enforced via Jakarta Bean Validation annotations so that
 * invalid payloads are rejected at the controller boundary, before any
 * database interaction occurs.
 */
package com.dms.auth;

// Jackson annotation to silently ignore any extra JSON fields sent by the client
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

// Jakarta validation constraints used to enforce field-level rules at the API boundary
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

// Lombok annotation that auto-generates getters, setters, equals, hashCode, and toString
import lombok.Data;

// @Data: Lombok generates all boilerplate accessors and utility methods,
//        keeping this DTO concise while remaining fully functional.
@Data
// @JsonIgnoreProperties: Prevents deserialization failures if the client sends
//                        extra fields not declared in this class (e.g. browser metadata).
@JsonIgnoreProperties(ignoreUnknown = true)
public class RegisterRequest {

    // --- Name Fields ---
    // Used to identify the DMS user in alerts, incident reports, and admin dashboards.

    // @NotBlank: Rejects null, empty, or whitespace-only values for first name.
    // @Size: Caps length to prevent database overflow and unreasonably long values.
    @NotBlank(message = "First name is required")
    @Size(min = 1, max = 50, message = "First name must be between 1 and 50 characters")
    private String firstName;

    // @NotBlank: Ensures last name is always present so full names can be displayed in reports.
    // @Size: Mirrors firstName constraint for consistent name field handling.
    @NotBlank(message = "Last name is required")
    @Size(min = 1, max = 50, message = "Last name must be between 1 and 50 characters")
    private String lastName;

    // --- Authentication Credential: Email ---
    // The email serves as the unique login identifier for all DMS user roles.

    // @NotBlank: Email is mandatory — it is the primary login credential.
    // @Email: Enforces RFC-compliant email format to prevent garbage data.
    // @Size: Limits to 255 chars, aligned with the database column length for the users table.
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Size(max = 255, message = "Email must not exceed 255 characters")
    private String email;

    // --- Authentication Credential: Password ---
    // The raw plaintext password provided during registration;
    // it will be hashed (BCrypt) by the service layer before persistence.

    // @NotBlank: A password is always required — no passwordless registration is allowed.
    // @Size: Enforces a minimum of 8 characters for basic security and caps at 128
    //        to prevent DoS via excessively long BCrypt inputs.
    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 128, message = "Password must be between 8 and 128 characters")
    // @Pattern: Enforces password complexity — requires at least one lowercase letter,
    //           one uppercase letter, one digit, and one special character.
    //           This reduces risk of weak credentials being used by DMS responders.
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#^()_+\\-=]).{8,}$",
        message = "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character"
    )
    private String password;

    // --- Optional Contact Field: Phone Number ---
    // Used for SMS/call alerts during active incidents; optional at registration.

    // @Pattern: Allows international format with optional '+' prefix, digits, spaces,
    //           dashes, and parentheses — capped at 20 characters to match common formats.
    //           An empty/null value is permitted since this field is not @NotBlank.
    @Pattern(regexp = "^\\+?[\\d\\s\\-()]{0,20}$", message = "Phone number format is invalid")
    private String phoneNumber;
}