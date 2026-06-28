package com.dms.incident;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface IncidentRepository extends JpaRepository<Incident, Long> {

    Page<Incident> findByStatus(String status, Pageable pageable);
    Page<Incident> findByIncidentType(String type, Pageable pageable);
    Page<Incident> findBySeverity(String severity, Pageable pageable);

    @Query("SELECT i FROM Incident i WHERE " +
           "(:status IS NULL OR i.status = :status) AND " +
           "(:type IS NULL OR i.incidentType = :type) AND " +
           "(:severity IS NULL OR i.severity = :severity)")
    Page<Incident> findWithFilters(
        @Param("status") String status,
        @Param("type") String type,
        @Param("severity") String severity,
        Pageable pageable
    );

    @Query("SELECT i FROM Incident i WHERE i.latitude BETWEEN :minLat AND :maxLat AND i.longitude BETWEEN :minLon AND :maxLon")
    List<Incident> findInBoundingBox(
        @Param("minLat") double minLat, @Param("maxLat") double maxLat,
        @Param("minLon") double minLon, @Param("maxLon") double maxLon
    );

    @Query("SELECT i.incidentType, COUNT(i) FROM Incident i WHERE i.reportedAt >= :since GROUP BY i.incidentType")
    List<Object[]> countByTypeAfter(@Param("since") LocalDateTime since);

    @Query("SELECT i.status, COUNT(i) FROM Incident i GROUP BY i.status")
    List<Object[]> countByStatus();

    long countByStatus(String status);
    long countBySeverity(String severity);

    Page<Incident> findByReportedBy_Email(String email, Pageable pageable);
}
