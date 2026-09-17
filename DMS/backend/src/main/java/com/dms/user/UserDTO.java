/**
 * UserDTO.java — Data Transfer Object for DMS user accounts.
 *
 * This class is used to safely transfer user data between layers of the
 * Disaster Management System without exposing sensitive fields such as
 * hashed passwords or internal audit columns. It is returned by REST
 * endpoints that deal with user profiles, admin user management, and
 * role-based access control within the DMS.
 */
package com.dms.user;

// --- Lombok imports: reduce boilerplate for getters, setters, and the builder pattern ---
import lombok.Builder;  // Enables the builder pattern for constructing UserDTO instances
import lombok.Data;     // Generates getters, setters, equals, hashCode, and toString automatically

// --- Java standard library imports ---
import java.time.LocalDateTime; // Used to represent when the user account was created
import java.util.Set;           // Used to hold a set of role strings (e.g. "ADMIN", "RESPONDER")

// @Data generates all standard bean methods (getters/setters/equals/hashCode/toString) at compile time
@Data
// @Builder generates a fluent builder API so UserDTO can be assembled field-by-field without multiple constructors
@Builder
public class UserDTO {

    /** Unique database identifier for the user; used to reference this user in incidents and assignments. */
    private Long id;

    /** The user's email address; serves as the primary login credential in the DMS auth system. */
    private String email;

    /** The user's given (first) name; displayed in the UI for responder and admin profiles. */
    private String firstName;

    /** The user's family (last) name; displayed alongside firstName in incident reports and team rosters. */
    private String lastName;

    /** Contact phone number for the user; used for emergency alerts and coordination notifications. */
    private String phoneNumber;

    /** URL pointing to the user's profile avatar image; rendered in the DMS portal header and user lists. */
    private String avatarUrl;

    /**
     * The set of role names assigned to this user (e.g. "ROLE_ADMIN", "ROLE_RESPONDER").
     * Roles control which DMS features and API endpoints the user can access.
     */
    private Set<String> roles;

    /**
     * Whether the user account is currently active.
     * Inactive accounts cannot log in or perform actions in the DMS, even if credentials are valid.
     */
    private Boolean active;

    /** Timestamp recording when the user account was first created in the DMS system. */
    private LocalDateTime createdAt;

    /**
     * Static factory method that converts a persistent {@link User} entity into a UserDTO.
     *
     * This mapping is the single authorised place where User entities are projected into
     * the transfer layer, ensuring sensitive fields (e.g. password hashes, OAuth tokens)
     * are never accidentally included in API responses.
     *
     * @param user the fully-loaded User JPA entity from the database
     * @return a UserDTO populated with the safe, public-facing subset of user data
     */
    public static UserDTO fromEntity(User user) {
        // Use the Lombok-generated builder to map each safe field from the entity to the DTO
        return UserDTO.builder()
                .id(user.getId())                     // Preserve the DB primary key for client-side reference
                .email(user.getEmail())               // Include email for display and identification purposes
                .firstName(user.getFirstName())       // Include given name for UI display
                .lastName(user.getLastName())         // Include family name for UI display
                .phoneNumber(user.getPhoneNumber())   // Include phone for contact info panels
                .avatarUrl(user.getAvatarUrl())       // Include avatar URL so the UI can render the profile image
                .roles(user.getRoles())               // Include roles so the frontend can show/hide role-gated UI elements
                .active(user.getActive())             // Include active flag so admins can see account status
                .createdAt(user.getCreatedAt())       // Include creation timestamp for audit and display in admin panels
                .build(); // Finalise and return the immutable DTO instance
    }
}