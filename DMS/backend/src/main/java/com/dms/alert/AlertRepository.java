/**
 * AlertRepository.java
 *
 * Repository interface for the Alert entity in the Disaster Management System (DMS).
 * Provides data access methods for querying, filtering, and paginating emergency alerts
 * raised in response to incidents. Spring Data JPA automatically implements this interface
 * at runtime — no manual SQL or boilerplate DAO code is required.
 *
 * Used by alert services to fetch active/resolved alerts, filter by severity level
 * (e.g. LOW, MEDIUM, HIGH, CRITICAL), and support paginated dashboard views.
 */
package com.dms.alert;

// Spring Data pagination support — Page wraps a slice of results with total-count metadata
import org.springframework.data.domain.Page;
// Pageable carries page number, page size, and sort direction from the caller
import org.springframework.data.domain.Pageable;
// JpaRepository gives full CRUD + flush/batch operations backed by JPA/Hibernate
import org.springframework.data.jpa.repository.JpaRepository;
// Standard Java List — used for unpaginated queries that return all matching alerts
import java.util.List;

/**
 * Spring Data JPA repository for Alert entities.
 *
 * Extending JpaRepository<Alert, Long> automatically provides:
 *   - save(), findById(), findAll(), delete(), count(), existsById(), etc.
 *   - Pagination and sorting via findAll(Pageable)
 *
 * Method names follow Spring Data's query-derivation convention — the framework
 * parses the method name and generates the corresponding JPQL/SQL at startup.
 *
 * Generic parameters:
 *   Alert — the managed JPA entity representing a DMS emergency alert
 *   Long  — the type of the Alert primary key (auto-generated database ID)
 */
public interface AlertRepository extends JpaRepository<Alert, Long> {

    /**
     * Returns a paginated list of alerts filtered by their lifecycle status
     * (e.g. "ACTIVE", "RESOLVED", "ACKNOWLEDGED").
     * Used by dashboard controllers to display only relevant alerts to operators.
     *
     * @param status   the alert status string to filter on
     * @param pageable pagination parameters (page index, size, sort order)
     * @return a Page of Alert objects matching the given status
     */
    Page<Alert> findByStatus(String status, Pageable pageable);

    /**
     * Returns all alerts with the given status, sorted newest-first by creation timestamp.
     * Useful for feeds or notification lists where recency matters most —
     * e.g. showing the latest ACTIVE alerts to emergency responders without pagination.
     *
     * @param status the alert status to filter on (e.g. "ACTIVE")
     * @return an ordered List of Alert objects, most recently created first
     */
    List<Alert> findByStatusOrderByCreatedAtDesc(String status);

    /**
     * Returns a paginated list of alerts filtered by severity level
     * (e.g. "LOW", "MEDIUM", "HIGH", "CRITICAL").
     * Allows administrators and responders to triage and prioritize
     * high-severity disaster alerts on paginated views.
     *
     * @param severity the severity level string to filter on
     * @param pageable pagination parameters (page index, size, sort order)
     * @return a Page of Alert objects matching the given severity
     */
    Page<Alert> findBySeverity(String severity, Pageable pageable);
}