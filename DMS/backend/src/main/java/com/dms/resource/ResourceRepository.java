/**
 * ResourceRepository.java
 *
 * Data access layer for disaster management resources in the DMS system.
 * Resources represent physical or human assets (vehicles, personnel, equipment, etc.)
 * that can be deployed during disaster incidents. This repository provides
 * querying capabilities to filter, paginate, and count resources by type and
 * availability status, enabling dispatchers and admins to quickly locate
 * resources suitable for assignment to active incidents.
 *
 * Extends Spring Data JPA's JpaRepository to inherit standard CRUD operations
 * (save, findById, delete, etc.) without requiring any implementation code.
 */
package com.dms.resource;

// Spring Data pagination support — used to return sliced result sets for large resource inventories
import org.springframework.data.domain.Page;
// Pageable encapsulates page number, page size, and sort order for paginated queries
import org.springframework.data.domain.Pageable;
// JpaRepository provides full CRUD + JPA operations for the Resource entity keyed by Long ID
import org.springframework.data.jpa.repository.JpaRepository;
// @Repository marks this interface as a Spring-managed DAO component for exception translation
import org.springframework.stereotype.Repository;

// Used for unpaginated list queries where full result sets are acceptable (e.g. small filtered subsets)
import java.util.List;

/**
 * Marks this interface as a Spring Data repository bean, enabling automatic
 * exception translation from JPA-specific exceptions to Spring's DataAccessException hierarchy.
 */
@Repository
// Spring Data JPA auto-generates the implementation at runtime; generic params are the entity type and its PK type
public interface ResourceRepository extends JpaRepository<Resource, Long> {

    /**
     * Retrieves a paginated list of resources filtered by their category type
     * (e.g. "VEHICLE", "PERSONNEL", "EQUIPMENT") to help dispatchers browse
     * available assets by kind during an incident response operation.
     *
     * @param type     the resource category to filter by (must match stored type values)
     * @param pageable pagination and sorting parameters supplied by the caller
     * @return a Page of Resource entities matching the given type
     */
    Page<Resource> findByType(String type, Pageable pageable);

    /**
     * Retrieves a paginated list of resources filtered by their current operational
     * status (e.g. "AVAILABLE", "DEPLOYED", "MAINTENANCE") so coordinators can
     * identify which assets are free for deployment to a new incident.
     *
     * @param status   the operational status string to filter by
     * @param pageable pagination and sorting parameters supplied by the caller
     * @return a Page of Resource entities matching the given status
     */
    Page<Resource> findByStatus(String status, Pageable pageable);

    /**
     * Retrieves a paginated list of resources matching both a specific type and
     * status simultaneously, enabling precise filtering (e.g. all AVAILABLE VEHICLES)
     * to support efficient resource allocation during multi-incident scenarios.
     *
     * @param type     the resource category to filter by
     * @param status   the operational status to filter by
     * @param pageable pagination and sorting parameters supplied by the caller
     * @return a Page of Resource entities matching both type and status
     */
    Page<Resource> findByTypeAndStatus(String type, String status, Pageable pageable);

    /**
     * Returns an unpaginated list of all resources with the given status.
     * Used internally when the full set of matching resources is needed at once,
     * such as when building assignment dropdowns or computing resource availability
     * reports for incident command dashboards.
     *
     * @param status the operational status to filter by (e.g. "AVAILABLE")
     * @return a List of all Resource entities currently holding the given status
     */
    List<Resource> findByStatus(String status);

    /**
     * Counts the total number of resources in a given operational status.
     * Used to populate summary statistics on admin dashboards (e.g. total available
     * units, total deployed units) without loading full entity data into memory.
     *
     * @param status the operational status to count (e.g. "DEPLOYED")
     * @return the number of Resource records matching the given status
     */
    long countByStatus(String status);
}