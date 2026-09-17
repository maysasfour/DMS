/**
 * AdminRepository.java
 *
 * Data access layer for Admin entities in the Disaster Management System (DMS).
 * This repository provides database operations for administrator accounts, including
 * lookup by email address and existence checks used during authentication and
 * registration flows. It extends Spring Data JPA's JpaRepository to inherit
 * standard CRUD operations (save, findById, findAll, delete, etc.) without
 * requiring manual SQL or boilerplate DAO code.
 */
package com.dms.admin;

// Spring Data JPA base repository interface — provides out-of-the-box CRUD and pagination
// operations for the Admin entity, bound to a Long primary key type.
import org.springframework.data.jpa.repository.JpaRepository;

// Used as the return type for queries that may yield no result (e.g., admin not found),
// avoiding null returns and NullPointerExceptions in the service layer.
import java.util.Optional;

/**
 * Repository interface for Admin entity persistence operations.
 *
 * Extends JpaRepository<Admin, Long>, where Admin is the managed entity and Long
 * is the type of its primary key (@Id field). Spring Data JPA automatically generates
 * the implementation at runtime — no @Repository annotation or manual SQL is needed.
 *
 * Used by AdminService (and authentication components) to query administrator
 * records during login, registration, and permission checks across the DMS.
 */
public interface AdminRepository extends JpaRepository<Admin, Long> {

    /**
     * Retrieves an Admin record whose email column matches the given address.
     *
     * Returns an Optional so callers (e.g., login flow) can cleanly handle the
     * case where no administrator with that email exists, without throwing an exception.
     * Spring Data JPA derives the query automatically from the method name convention
     * "findBy<FieldName>".
     *
     * @param email the email address to search for (case-sensitivity depends on DB collation)
     * @return Optional containing the matching Admin, or Optional.empty() if not found
     */
    Optional<Admin> findByEmail(String email);

    /**
     * Checks whether an Admin account already exists for the given email address.
     *
     * Used during administrator registration to prevent duplicate accounts in the DMS.
     * More efficient than findByEmail() for existence checks because it issues a
     * COUNT query rather than fetching the full entity. Derived automatically by
     * Spring Data JPA from the "existsBy<FieldName>" naming convention.
     *
     * @param email the email address to check for existence
     * @return true if at least one Admin with this email exists, false otherwise
     */
    boolean existsByEmail(String email);
}