/**
 * AuthResponse.java
 *
 * Data Transfer Object (DTO) representing the authentication response returned to clients
 * after a successful login or registration in the Disaster Management System (DMS).
 *
 * This payload is sent back to the frontend (React portal) upon successful authentication
 * of DMS users (administrators, field officers, response teams). It carries the JWT token
 * needed for subsequent secured API calls (incident reporting, resource management, alerts)
 * as well as essential user profile details used to personalise the UI and enforce
 * role-based access control on the client side.
 */
package com.dms.auth;

// Lombok: generates getters, setters, equals, hashCode, and toString automatically
import lombok.AllArgsConstructor;
// Lombok: enables the fluent Builder pattern for constructing AuthResponse instances
import lombok.Builder;
// Lombok: shorthand for @Getter + @Setter + @EqualsAndHashCode + @ToString
import lombok.Data;
// Lombok: generates a public no-argument constructor required by frameworks (e.g., Jackson deserialization)
import lombok.NoArgsConstructor;
// Used to carry the set of role names (e.g., "ROLE_ADMIN", "ROLE_OFFICER") assigned to the authenticated user
import java.util.Set;

// @Data generates all boilerplate getter/setter/equals/hashCode/toString methods for this DTO
@Data
// @Builder allows callers to construct an AuthResponse using the fluent builder pattern (e.g., AuthResponse.builder().token(...).build())
@Builder
// Generates a constructor accepting all fields — useful for manual instantiation or testing
@AllArgsConstructor
// Generates a no-args constructor required by JSON serializers (Jackson) when deserializing or by Spring internals
@NoArgsConstructor
public class AuthResponse {

    // The signed JWT token the client must include in the Authorization header for all secured DMS API requests
    private String token;

    // @Builder.Default ensures the token type defaults to "Bearer" even when using the builder pattern without explicitly setting this field
    @Builder.Default
    // The token scheme type; always "Bearer" in compliance with the OAuth2 / HTTP Authorization header standard used by DMS
    private String type = "Bearer";

    // The unique database identifier of the authenticated DMS user (maps to the users table primary key)
    private Long id;

    // The email address of the authenticated user, used as the login credential and displayed in the DMS user profile
    private String email;

    // The user's given (first) name, used for personalising dashboard greetings and audit log entries in the DMS
    private String firstName;

    // The user's family (last) name, displayed in incident assignment records and team management views
    private String lastName;

    // The set of role names granted to this user (e.g., "ROLE_ADMIN", "ROLE_OFFICER", "ROLE_TEAM"),
    // used by the frontend to conditionally render role-specific DMS features such as incident approval or resource allocation
    private Set<String> roles;
}