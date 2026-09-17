/**
 * UserService.java
 *
 * Service layer for user management in the Disaster Management System (DMS).
 * Handles business logic for retrieving, updating, and administering user accounts,
 * including profile updates, password changes, role assignment, and account activation.
 *
 * Users in the DMS can be CITIZENS reporting incidents, RESCUE_TEAM members
 * responding to emergencies, or ADMINs managing the overall system.
 */
package com.dms.user;

// DMS-specific exceptions: used when a request is invalid or a resource cannot be found
import com.dms.exception.BadRequestException;
import com.dms.exception.ResourceNotFoundException;

// Lombok: auto-generates a constructor that injects all final fields (no boilerplate @Autowired needed)
import lombok.RequiredArgsConstructor;

// Spring Security: used to securely hash and verify user passwords
import org.springframework.security.crypto.password.PasswordEncoder;

// Marks this class as a Spring-managed service bean (business logic layer)
import org.springframework.stereotype.Service;

// Wraps methods in a database transaction so partial updates are rolled back on failure
import org.springframework.transaction.annotation.Transactional;

// Standard Java collections used for role validation and list mapping
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

// @Service: registers this class as a Spring bean in the application context, making it injectable
// @RequiredArgsConstructor: Lombok generates a constructor for all final fields (userRepository, passwordEncoder)
@Service
@RequiredArgsConstructor
public class UserService {

    // Repository for performing CRUD operations on User entities in the database
    private final UserRepository userRepository;

    // Encoder used to hash passwords before storage and to verify them on login or change
    private final PasswordEncoder passwordEncoder;

    /**
     * Retrieves a DMS user's profile by their email address.
     * Used to populate profile pages for citizens, rescue team members, and admins.
     *
     * @param email the authenticated user's email (from JWT token claims)
     * @return a UserDTO containing safe, serializable profile data (no password)
     * @throws ResourceNotFoundException if no user exists with the given email
     */
    public UserDTO getUserProfile(String email) {
        // Look up the user by email; throw a 404-style exception if not found
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        // Convert JPA entity to DTO to avoid exposing internal fields (e.g., hashed password)
        return UserDTO.fromEntity(user);
    }

    /**
     * Updates editable profile fields for an authenticated DMS user.
     * Only fields that are non-null in the request are updated (partial update pattern).
     *
     * @param email   the authenticated user's email used to locate their account
     * @param request DTO containing optional new values for name, phone, and avatar
     * @return the updated user profile as a DTO
     * @throws ResourceNotFoundException if no user exists with the given email
     */
    @Transactional // Ensures all field updates are committed atomically; rolled back if any step fails
    public UserDTO updateProfile(String email, UpdateProfileRequest request) {
        // Fetch the user entity; fail fast if the account doesn't exist
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Apply only the fields provided in the request (null-safe partial update)
        if (request.getFirstName() != null) user.setFirstName(request.getFirstName());
        if (request.getLastName() != null) user.setLastName(request.getLastName());

        // Phone number is important for emergency contact and alert notifications
        if (request.getPhoneNumber() != null) user.setPhoneNumber(request.getPhoneNumber());

        // Avatar URL points to the user's profile image (e.g., uploaded to cloud storage)
        if (request.getAvatarUrl() != null) user.setAvatarUrl(request.getAvatarUrl());

        // Persist the updated entity and return the DTO representation
        return UserDTO.fromEntity(userRepository.save(user));
    }

    /**
     * Changes the password for an authenticated DMS user after verifying the current password.
     * Prevents unauthorized password resets by requiring the existing password first.
     *
     * @param email   the authenticated user's email
     * @param request DTO containing the current password (for verification) and the new password
     * @throws ResourceNotFoundException if no user exists with the given email
     * @throws BadRequestException       if the supplied current password does not match the stored hash
     */
    @Transactional // Ensures the password update is committed only if the entire method succeeds
    public void changePassword(String email, ChangePasswordRequest request) {
        // Locate the user account; throw an error if the email is not registered
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Verify the supplied current password against the stored BCrypt hash for security
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }

        // Hash the new password before storing it — never store plaintext passwords
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));

        // Persist the updated password hash to the database
        userRepository.save(user);
    }

    /**
     * Returns all registered DMS users.
     * Intended for admin-only endpoints to manage citizens, rescue teams, and other admins.
     *
     * @return a list of UserDTOs representing every user in the system
     */
    public List<UserDTO> getAllUsers() {
        // Fetch all user records and map each JPA entity to a safe DTO for the API response
        return userRepository.findAll().stream()
                .map(UserDTO::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves a single DMS user by their numeric database ID.
     * Used by admins to inspect or manage individual user accounts.
     *
     * @param id the unique database ID of the user
     * @return the matching user's profile as a DTO
     * @throws ResourceNotFoundException if no user exists with the given ID
     */
    public UserDTO getUserById(Long id) {
        // Fetch user by primary key; surface a clear 404 error if the ID is invalid
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return UserDTO.fromEntity(user);
    }

    // Immutable set of allowed roles in the DMS; guards against invalid role assignments
    // ADMIN: full system access; CITIZEN: report incidents; RESCUE_TEAM: respond to emergencies
    private static final Set<String> VALID_ROLES = Set.of("ADMIN", "CITIZEN", "RESCUE_TEAM");

    /**
     * Assigns a new role to a DMS user, replacing their existing roles.
     * Admins use this to promote citizens to rescue team members or to grant admin access.
     *
     * @param id   the unique database ID of the user to update
     * @param role the role string to assign (e.g., "ADMIN", "RESCUE_TEAM", or prefixed "ROLE_ADMIN")
     * @return the updated user profile with the new role reflected
     * @throws BadRequestException       if the role is blank or not in the allowed set
     * @throws ResourceNotFoundException if no user exists with the given ID
     */
    @Transactional // Role change must be fully committed or fully rolled back
    public UserDTO updateUserRole(Long id, String role) {
        // Reject empty or null roles before any database access
        if (role == null || role.isBlank()) {
            throw new BadRequestException("Role is required");
        }

        // Normalize role input: uppercase and strip the "ROLE_" prefix if present
        // This allows callers to send either "RESCUE_TEAM" or "ROLE_RESCUE_TEAM"
        String normalizedRole = role.toUpperCase().replace("ROLE_", "");

        // Validate that the normalized role is one of the DMS-defined roles
        if (!VALID_ROLES.contains(normalizedRole)) {
            throw new BadRequestException("Invalid role. Must be one of: ADMIN, CITIZEN, RESCUE_TEAM");
        }

        // Locate the target user; surface an error if the ID doesn't match any account
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        // Replace all existing roles with the single new role (DMS uses single-role assignment)
        user.setRoles(new HashSet<>(Collections.singleton(normalizedRole)));

        // Persist and return the updated user DTO
        return UserDTO.fromEntity(userRepository.save(user));
    }

    /**
     * Toggles the active/inactive status of a DMS user account.
     * Admins can deactivate accounts to suspend access (e.g., misuse or role removal)
     * or reactivate previously suspended users.
     *
     * @param id the unique database ID of the user to toggle
     * @return the updated user profile with the new active status
     * @throws ResourceNotFoundException if no user exists with the given ID
     */
    @Transactional // Ensures the active flag flip is fully committed atomically
    public UserDTO toggleUserActive(Long id) {
        // Fetch the user; raise an error if the account does not exist
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        // Flip the active flag: true -> false (suspend) or false -> true (reactivate)
        user.setActive(!user.getActive());

        // Save the toggled state and return the updated DTO
        return UserDTO.fromEntity(userRepository.save(user));
    }

    /**
     * Updates the avatar URL for an authenticated DMS user.
     * Called after a successful image upload to link the new avatar to the user's profile.
     *
     * @param email     the authenticated user's email used to locate their account
     * @param avatarUrl the publicly accessible URL of the newly uploaded avatar image
     * @throws ResourceNotFoundException if no user exists with the given email
     */
    @Transactional // Ensures the avatar URL is updated atomically with the save operation
    public void updateAvatar(String email, String avatarUrl) {
        // Locate the user by email; fail with a clear error if the account is missing
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));

        // Set the new avatar URL (e.g., a cloud storage link returned after upload)
        user.setAvatarUrl(avatarUrl);

        // Persist the updated avatar URL to the database
        userRepository.save(user);
    }
}