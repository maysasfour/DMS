/**
 * UserRepository.java
 *
 * Data access layer for DMS User entities.
 * Provides database query methods for managing system users including
 * citizens, field officers, team members, and administrators.
 *
 * Extends JpaRepository to inherit standard CRUD operations, and defines
 * additional queries for email-based lookup and role-based filtering —
 * both critical for DMS authentication and role-based access control.
 */
package com.dms.user;

// Spring Data JPA base repository — provides built-in CRUD and pagination for User entities
import org.springframework.data.jpa.repository.JpaRepository;
// Allows defining custom JPQL queries directly on repository methods
import org.springframework.data.jpa.repository.Query;
// Binds named parameters in @Query expressions to method arguments safely
import org.springframework.data.repository.query.Param;
// Marks this interface as a Spring-managed repository bean for dependency injection
import org.springframework.stereotype.Repository;
// Used for returning multiple users when filtering by role
import java.util.List;
// Used to safely return a single user that may or may not exist (avoids null returns)
import java.util.Optional;

/**
 * Marks this interface as a Spring Data repository component.
 * Spring will create a proxy implementation at runtime and register it
 * as a bean available for injection into services (e.g., AuthService, UserService).
 */
@Repository
/**
 * Repository interface for User entity persistence in the DMS.
 * Extends JpaRepository<User, Long> to gain standard operations:
 * save(), findById(), findAll(), delete(), count(), etc.
 * The generic parameters specify the entity type (User) and its primary key type (Long).
 */
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Looks up a DMS user by their email address.
     * Used during login and OAuth flow to identify returning users.
     * Returns Optional to allow callers to handle the "user not found" case gracefully.
     *
     * @param email the email address to search for (case sensitivity depends on DB collation)
     * @return an Optional containing the matching User, or empty if no user has that email
     */
    Optional<User> findByEmail(String email);

    /**
     * Checks whether a user with the given email already exists in the system.
     * Used during registration to prevent duplicate accounts for the same email address.
     *
     * @param email the email address to check for uniqueness
     * @return true if a user with this email exists, false otherwise
     */
    boolean existsByEmail(String email);

    /**
     * Custom JPQL query that retrieves all users assigned a specific role.
     * DMS roles (e.g., ADMIN, OFFICER, TEAM, CITIZEN) determine system access and
     * permissions for incident management, resource allocation, and alert handling.
     *
     * The JOIN on u.roles allows searching within the user's role collection,
     * which may contain multiple roles per user.
     *
     * @param role the role string to filter by (e.g., "ROLE_ADMIN", "ROLE_OFFICER")
     * @return a list of all users holding the specified role; empty list if none found
     */
    @Query("SELECT u FROM User u JOIN u.roles r WHERE r = :role")
    // @Param binds the method argument 'role' to the :role placeholder in the JPQL query
    List<User> findByRole(@Param("role") String role);
}