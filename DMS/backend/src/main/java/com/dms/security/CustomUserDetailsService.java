/**
 * CustomUserDetailsService.java
 *
 * Service implementation for Spring Security's user authentication mechanism in the DMS system.
 * This class bridges the DMS user database with Spring Security by loading user details
 * (such as email, password, and roles) during the authentication process.
 *
 * When a DMS user (citizen, officer, admin, or team member) attempts to log in,
 * Spring Security calls this service to retrieve and validate their credentials.
 * Authentication failures (e.g., unregistered email) are reported as UsernameNotFoundException.
 */
package com.dms.security;

// DMS domain entity representing a system user (citizen, officer, admin, or team member)
import com.dms.user.User;

// Repository providing database access methods for DMS user accounts
import com.dms.user.UserRepository;

// Lombok annotation that auto-generates a constructor for all final fields (used for dependency injection)
import lombok.RequiredArgsConstructor;

// Spring Security interface returned by loadUserByUsername, used internally during auth token validation
import org.springframework.security.core.userdetails.UserDetails;

// Spring Security contract that this service fulfills to plug into the authentication pipeline
import org.springframework.security.core.userdetails.UserDetailsService;

// Exception thrown when no DMS user exists for the provided email during login
import org.springframework.security.core.userdetails.UsernameNotFoundException;

// Marks this class as a Spring-managed service bean, eligible for auto-detection and injection
import org.springframework.stereotype.Service;

// @Service — registers this class as a Spring service component so it can be injected into the security config
@Service
// @RequiredArgsConstructor — Lombok generates a constructor injecting all final fields, replacing explicit @Autowired
@RequiredArgsConstructor
// Implements UserDetailsService to integrate with Spring Security's authentication manager
public class CustomUserDetailsService implements UserDetailsService {

    // Repository used to query the DMS users table by email during login
    private final UserRepository userRepository;

    /**
     * Loads a DMS user's security details by their email address.
     * Called automatically by Spring Security during login to authenticate users
     * such as citizens reporting incidents, officers managing responses, or admins.
     *
     * @param email the email address submitted in the login request
     * @return UserDetails object containing the user's credentials and granted authorities (roles)
     * @throws UsernameNotFoundException if no DMS account is associated with the given email
     */
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        // Query the database for a DMS user matching the provided email; throw if not found
        User user = userRepository.findByEmail(email)
                // If no user exists with this email, reject authentication with a descriptive error
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        // Convert the DMS User entity into a Spring Security-compatible UserDetails object (with roles, password, etc.)
        return UserDetailsImpl.build(user);
    }
}