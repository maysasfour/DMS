/**
 * UserDetailsImpl.java
 *
 * Purpose: Adapts the DMS domain User entity into Spring Security's UserDetails contract.
 * This class bridges the application-level user model (officers, admins, team members)
 * with the security framework so that authentication, role-based access control (RBAC),
 * and JWT token generation can operate on a unified principal object.
 *
 * In the DMS context, every authenticated principal — whether a field officer reporting
 * an incident, an admin managing resources, or a team member responding to alerts —
 * is represented at runtime by an instance of this class.
 */
package com.dms.security;

// DMS domain entity representing a registered system user (officer, admin, team member, etc.)
import com.dms.user.User;
// Prevents the password hash from being serialised into JSON responses (e.g. REST API payloads)
import com.fasterxml.jackson.annotation.JsonIgnore;
// Spring Security contract for a granted permission / role
import org.springframework.security.core.GrantedAuthority;
// Concrete implementation of GrantedAuthority used to wrap role strings (e.g. "ROLE_ADMIN")
import org.springframework.security.core.authority.SimpleGrantedAuthority;
// Core Spring Security interface that the authentication manager and JWT filter expect
import org.springframework.security.core.userdetails.UserDetails;

// Standard Java collection types used for the authorities list
import java.util.Collection;
import java.util.List;
// Stream collector used to transform role strings into GrantedAuthority objects
import java.util.stream.Collectors;

/**
 * Concrete implementation of {@link UserDetails} for the DMS authentication layer.
 * Wraps a {@link User} entity and exposes only the fields Spring Security needs:
 * identifier, credentials, and role-based authorities.
 */
public class UserDetailsImpl implements UserDetails {

    // Required by Serializable; keeps serialisation compatible if this class changes
    private static final long serialVersionUID = 1L;

    // Internal DMS database identifier for the user — used in JWT claims and audit logs
    private Long id;

    // Email address used as the unique login credential across all DMS user types
    private String email;

    /**
     * Bcrypt-hashed password stored in the database.
     * @JsonIgnore ensures the hash is never leaked in API responses or serialised DTOs.
     */
    @JsonIgnore // Instructs Jackson to skip this field during JSON serialisation for security
    private String password;

    // Set of roles granted to this principal (e.g. ROLE_ADMIN, ROLE_OFFICER, ROLE_TEAM)
    // Used by Spring Security to enforce method-level and URL-level access rules
    private Collection<? extends GrantedAuthority> authorities;

    /**
     * All-args constructor called by {@link #build(User)} to assemble a fully populated principal.
     *
     * @param id          the user's database primary key
     * @param email       the login email address
     * @param password    the bcrypt-hashed password
     * @param authorities the set of DMS roles translated to Spring Security authorities
     */
    public UserDetailsImpl(Long id, String email, String password, Collection<? extends GrantedAuthority> authorities) {
        this.id = id;           // Store the unique user ID for downstream lookups (e.g. incident ownership)
        this.email = email;     // Store email as the principal's human-readable identity
        this.password = password; // Store hashed password for the authentication manager to verify
        this.authorities = authorities; // Store pre-built role authorities for access-control checks
    }

    /**
     * Factory method that converts a DMS {@link User} entity into a Spring Security principal.
     * Called by {@link UserDetailsServiceImpl} after loading the user from the database.
     *
     * Role strings stored on the User entity (e.g. "ADMIN", "OFFICER") are prefixed with
     * "ROLE_" to match Spring Security's convention, enabling annotations like
     * {@code @PreAuthorize("hasRole('ADMIN')")} to work correctly.
     *
     * @param user the fully loaded DMS User entity from the database
     * @return a populated UserDetailsImpl ready for the authentication context
     */
    public static UserDetailsImpl build(User user) {
        // Convert each raw role string on the User into a Spring Security GrantedAuthority
        // e.g. "ADMIN" → SimpleGrantedAuthority("ROLE_ADMIN")
        List<GrantedAuthority> authorities = user.getRoles().stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role)) // Prefix ensures compatibility with Spring Security role checks
                .collect(Collectors.toList()); // Collect all mapped authorities into a list

        // Construct and return the UserDetailsImpl using data from the DMS User entity
        return new UserDetailsImpl(
                user.getId(),       // DMS-assigned unique user ID
                user.getEmail(),    // Email used as the login username
                user.getPassword(), // Hashed password for credential verification
                authorities);       // Role-based authority list for access control
    }

    /** Returns the DMS-internal numeric user ID (useful for linking actions to users in incident logs). */
    public Long getId() { return id; }

    /** Returns the email address, which serves as the human-readable login identifier in the DMS. */
    public String getEmail() { return email; }

    /**
     * Returns the collection of roles assigned to this principal.
     * Spring Security evaluates these when enforcing route guards and method-level security.
     */
    @Override // Fulfils the UserDetails contract; called by the security framework during authorisation
    public Collection<? extends GrantedAuthority> getAuthorities() { return authorities; }

    /**
     * Returns the bcrypt-hashed password for credential verification by the AuthenticationManager.
     * Never returned in JSON responses due to the @JsonIgnore annotation on the field.
     */
    @Override // Fulfils the UserDetails contract; used by DaoAuthenticationProvider to validate credentials
    public String getPassword() { return password; }

    /**
     * Returns the email as the username since the DMS uses email-based login, not a separate username field.
     */
    @Override // Fulfils the UserDetails contract; Spring Security uses this as the principal's unique name
    public String getUsername() { return email; }

    /**
     * Indicates whether the account has expired.
     * Returns true unconditionally — the DMS does not implement account expiry at the security layer.
     */
    @Override // Fulfils the UserDetails contract; returning true means no expiry logic is applied
    public boolean isAccountNonExpired() { return true; }

    /**
     * Indicates whether the account is locked.
     * Returns true unconditionally — account locking is not enforced at the security layer in the current DMS implementation.
     */
    @Override // Fulfils the UserDetails contract; returning true permits all non-disabled accounts to authenticate
    public boolean isAccountNonLocked() { return true; }

    /**
     * Indicates whether credentials (password) have expired.
     * Returns true unconditionally — password rotation policies are not enforced in the current DMS version.
     */
    @Override // Fulfils the UserDetails contract; returning true means the stored credentials are always considered valid
    public boolean isCredentialsNonExpired() { return true; }

    /**
     * Indicates whether the user account is active and allowed to authenticate.
     * Returns true unconditionally — soft-delete or disable logic would override this if introduced later.
     */
    @Override // Fulfils the UserDetails contract; returning true allows the account to log in
    public boolean isEnabled() { return true; }
}