/**
 * CitizenRepository.java
 *
 * Data access layer for the Citizen entity in the Disaster Management System (DMS).
 * This repository provides CRUD operations and custom query methods for citizen records,
 * enabling the system to look up, verify, and manage registered citizens who report
 * incidents, receive alerts, and interact with emergency response resources.
 *
 * Extends Spring Data JPA's JpaRepository to inherit standard persistence operations
 * (save, find, delete, etc.) without requiring boilerplate SQL or DAO implementations.
 */
package com.dms.citizen;

// Spring Data JPA base interface — provides standard CRUD and pagination operations
// for the Citizen entity without writing manual query implementations
import org.springframework.data.jpa.repository.JpaRepository;

// Used for query methods that may return zero or one result, avoiding null returns
// and preventing NullPointerExceptions when a citizen is not found in the database
import java.util.Optional;

/**
 * Repository interface for managing Citizen persistence in the DMS.
 *
 * Extends JpaRepository<Citizen, Long> where:
 *   - Citizen is the managed entity class representing a registered system user (citizen role)
 *   - Long is the type of the primary key (citizen ID) used for database lookups
 *
 * Spring Data JPA automatically provides implementations for all declared methods at runtime,
 * so no @Repository annotation or manual implementation class is needed.
 */
public interface CitizenRepository extends JpaRepository<Citizen, Long> {

    /**
     * Looks up a citizen by their email address.
     *
     * Used during authentication and registration flows to retrieve a citizen's
     * account details (e.g., password hash, role, profile) for login or profile access.
     * Returns an Optional to safely handle the case where no citizen with the given
     * email exists, avoiding null checks in service layer code.
     *
     * Spring Data JPA derives the SQL query automatically from the method name:
     * SELECT * FROM citizen WHERE email = ?
     *
     * @param email the email address to search for (case-sensitive by default)
     * @return an Optional containing the Citizen if found, or empty if no match exists
     */
    Optional<Citizen> findByEmail(String email);

    /**
     * Checks whether a citizen account already exists with the given email address.
     *
     * Used during citizen registration to enforce email uniqueness — prevents duplicate
     * accounts and ensures each citizen in the DMS has a distinct identity for alert
     * delivery, incident tracking, and communication.
     *
     * Spring Data JPA derives the SQL query automatically from the method name:
     * SELECT COUNT(*) > 0 FROM citizen WHERE email = ?
     *
     * @param email the email address to check for existence
     * @return true if a citizen with this email already exists, false otherwise
     */
    boolean existsByEmail(String email);
}