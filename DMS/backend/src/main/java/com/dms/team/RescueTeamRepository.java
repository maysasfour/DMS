/**
 * RescueTeamRepository.java
 *
 * Data access layer for RescueTeam entities in the Disaster Management System (DMS).
 * This repository provides database query methods for retrieving rescue teams
 * based on their availability, activation status, and specialization type.
 *
 * It extends Spring Data JPA's JpaRepository, which automatically provides
 * standard CRUD operations (save, findById, findAll, delete, etc.) without
 * requiring manual SQL or implementation code.
 *
 * Used by service classes to locate suitable rescue teams during incident
 * response, team assignment, and resource coordination workflows.
 */
package com.dms.team;

// Spring Data JPA base repository interface — provides built-in CRUD and pagination support
import org.springframework.data.jpa.repository.JpaRepository;

// Used as the return type for query methods that return multiple rescue team records
import java.util.List;

/**
 * Repository interface for performing database operations on RescueTeam entities.
 *
 * Extends JpaRepository<RescueTeam, Long>, where:
 *   - RescueTeam is the managed entity class
 *   - Long is the type of the entity's primary key (team ID)
 *
 * Spring Data JPA automatically generates the implementation at runtime,
 * including query derivation from method names defined below.
 */
public interface RescueTeamRepository extends JpaRepository<RescueTeam, Long> {

    /**
     * Retrieves all rescue teams that are both active and currently available for deployment.
     *
     * This query is used during incident dispatch to find teams that can be
     * immediately assigned to an emergency without conflicts or downtime.
     *
     * Derived query equivalent: WHERE is_active = true AND available = true
     *
     * @return list of RescueTeam entities that are active and available
     */
    List<RescueTeam> findByIsActiveTrueAndAvailableTrue();

    /**
     * Retrieves all rescue teams of a specific type or specialization.
     *
     * Used to filter teams by their area of expertise (e.g., "FIRE", "MEDICAL",
     * "SEARCH_AND_RESCUE", "HAZMAT") when matching incident requirements to
     * team capabilities during response planning.
     *
     * Derived query equivalent: WHERE type = :type
     *
     * @param type the specialization/category of the rescue team to filter by
     * @return list of RescueTeam entities matching the given type
     */
    List<RescueTeam> findByType(String type);

    /**
     * Retrieves all rescue teams that are currently marked as active in the system.
     *
     * Active teams are registered and operational; this excludes disbanded,
     * suspended, or decommissioned teams. Used for administrative views and
     * reporting on available human resources in the DMS.
     *
     * Derived query equivalent: WHERE is_active = true
     *
     * @return list of all currently active RescueTeam entities
     */
    List<RescueTeam> findByIsActiveTrue();
}