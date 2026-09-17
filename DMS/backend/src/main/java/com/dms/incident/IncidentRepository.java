/**
 * IncidentRepository.java
 *
 * Data Access Layer (Repository) for the Incident entity in the Disaster Management System (DMS).
 * Provides database query methods for creating, reading, filtering, and aggregating incident records.
 * Incidents represent disaster events (e.g., fires, floods, accidents) reported by citizens or officers.
 *
 * Extends Spring Data JPA's JpaRepository to inherit standard CRUD operations,
 * and adds custom queries for DMS-specific use cases such as geospatial bounding box
 * searches, status/severity filtering, and dashboard analytics.
 */
package com.dms.incident;

// Spring Data pagination support — used to return incidents in pages rather than all at once
import org.springframework.data.domain.Page;
// Pageable carries page number, size, and sort direction for paginated queries
import org.springframework.data.domain.Pageable;
// JpaRepository provides full CRUD + JPA operations without boilerplate implementation
import org.springframework.data.jpa.repository.JpaRepository;
// @Query allows custom JPQL queries for logic beyond standard derived method names
import org.springframework.data.jpa.repository.Query;
// @Param binds named method parameters to named placeholders in @Query JPQL strings
import org.springframework.data.repository.query.Param;

// Used for timestamp-based filtering — e.g., counting incidents reported since a given date/time
import java.time.LocalDateTime;
// Used for returning multiple results (e.g., lists of incidents or aggregated statistics)
import java.util.List;

/**
 * Repository interface for Incident persistence operations.
 * Spring Data JPA automatically generates the implementation at runtime —
 * no @Repository annotation is needed here; Spring detects it via JpaRepository.
 * Generic parameters: Incident (entity type), Long (primary key type).
 */
public interface IncidentRepository extends JpaRepository<Incident, Long> {

    // Returns a paginated list of incidents matching the given workflow status (e.g., "OPEN", "IN_PROGRESS", "RESOLVED")
    Page<Incident> findByStatus(String status, Pageable pageable);

    // Returns a paginated list of incidents of a specific disaster type (e.g., "FIRE", "FLOOD", "EARTHQUAKE")
    Page<Incident> findByIncidentType(String type, Pageable pageable);

    // Returns a paginated list of incidents at a given severity level (e.g., "LOW", "MEDIUM", "HIGH", "CRITICAL")
    Page<Incident> findBySeverity(String severity, Pageable pageable);

    /**
     * Flexible multi-criteria filter query used by admin dashboards and officer views.
     * Each parameter is optional — passing null causes that filter to be ignored,
     * allowing callers to filter by any combination of status, type, and severity.
     *
     * @param status   incident workflow status, or null to ignore
     * @param type     disaster type category, or null to ignore
     * @param severity urgency/severity level, or null to ignore
     * @param pageable pagination and sorting configuration
     * @return a page of incidents matching all non-null criteria
     */
    @Query("SELECT i FROM Incident i WHERE " +
           // Null check allows the filter to be skipped when not provided by the caller
           "(:status IS NULL OR i.status = :status) AND " +
           // Allows filtering by disaster type independently of other filters
           "(:type IS NULL OR i.incidentType = :type) AND " +
           // Allows filtering by severity level independently of other filters
           "(:severity IS NULL OR i.severity = :severity)")
    Page<Incident> findWithFilters(
        @Param("status") String status,   // binds the "status" named param in the JPQL above
        @Param("type") String type,       // binds the "type" named param in the JPQL above
        @Param("severity") String severity, // binds the "severity" named param in the JPQL above
        Pageable pageable                 // controls result page size and sort order
    );

    /**
     * Geospatial query that retrieves all incidents within a rectangular bounding box.
     * Used by the incident map view (HeatmapView, IncidentMap) to display nearby events.
     * Bounding box is defined by min/max latitude and longitude coordinates.
     *
     * @param minLat southern latitude boundary
     * @param maxLat northern latitude boundary
     * @param minLon western longitude boundary
     * @param maxLon eastern longitude boundary
     * @return all incidents whose GPS coordinates fall within the specified area
     */
    @Query("SELECT i FROM Incident i WHERE i.latitude BETWEEN :minLat AND :maxLat AND i.longitude BETWEEN :minLon AND :maxLon")
    List<Incident> findInBoundingBox(
        @Param("minLat") double minLat, @Param("maxLat") double maxLat, // latitude range (south to north)
        @Param("minLon") double minLon, @Param("maxLon") double maxLon  // longitude range (west to east)
    );

    /**
     * Aggregation query for analytics dashboards — counts incidents grouped by disaster type
     * for a rolling time window (e.g., last 7 or 30 days).
     * Returns raw Object[] rows where index 0 = incidentType (String), index 1 = count (Long).
     *
     * @param since the earliest reportedAt timestamp to include in the count
     * @return list of [incidentType, count] pairs for chart/statistics rendering
     */
    @Query("SELECT i.incidentType, COUNT(i) FROM Incident i WHERE i.reportedAt >= :since GROUP BY i.incidentType")
    List<Object[]> countByTypeAfter(@Param("since") LocalDateTime since);

    /**
     * Aggregation query for the admin dashboard status summary panel.
     * Groups all incidents by their current workflow status and returns the count for each.
     * Returns raw Object[] rows where index 0 = status (String), index 1 = count (Long).
     *
     * @return list of [status, count] pairs (e.g., ["OPEN", 12], ["RESOLVED", 45])
     */
    @Query("SELECT i.status, COUNT(i) FROM Incident i GROUP BY i.status")
    List<Object[]> countByStatus();

    // Quick scalar count of incidents in a specific status — used for dashboard KPI tiles (e.g., open incident count)
    long countByStatus(String status);

    // Quick scalar count of incidents at a specific severity — used for alert thresholds and reporting metrics
    long countBySeverity(String severity);

    /**
     * Derived query method that fetches all incidents reported by a specific user, identified by email.
     * Navigates the Incident -> reportedBy (User) -> email relationship via Spring Data method naming.
     * Used in the citizen/user profile page to list their own submitted incident reports.
     *
     * @param email    the email address of the reporting user
     * @param pageable pagination and sort configuration
     * @return paginated list of incidents submitted by the specified user
     */
    Page<Incident> findByReportedBy_Email(String email, Pageable pageable);
}