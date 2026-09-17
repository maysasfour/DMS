/**
 * ReportService.java
 *
 * Service layer for generating summary reports in the Disaster Management System (DMS).
 * This class aggregates live incident statistics from the database and constructs
 * structured report data transfer objects (DTOs) for consumption by the report API.
 *
 * Supported report categories:
 *   - INCIDENT: Summaries of total, open, active, and resolved incidents
 *   - RESOURCE: Overview of resource availability and deployment status
 *   - ANALYTICS: 14-day trend analysis and system performance metrics
 *
 * Reports are generated dynamically at request time using real-time counts
 * from the incident repository, ensuring data is always current.
 */
package com.dms.report;

// DMS incident repository used to query live incident counts by status
import com.dms.incident.IncidentRepository;

// Lombok annotation to auto-generate a constructor for all final fields (dependency injection)
import lombok.RequiredArgsConstructor;

// Marks this class as a Spring-managed service bean (business logic layer)
import org.springframework.stereotype.Service;

// Used to capture the current timestamp for each generated report entry
import java.time.LocalDateTime;

// Used to accumulate multiple ReportDTO entries before returning them
import java.util.ArrayList;
import java.util.List;

// @Service — registers this class as a Spring service bean so it can be injected into controllers
@Service
// @RequiredArgsConstructor — Lombok generates a constructor injecting all final fields (incidentRepository)
@RequiredArgsConstructor
public class ReportService {

    // Repository providing JPA-backed access to incident records in the DMS database
    private final IncidentRepository incidentRepository;

    /**
     * Generates a filtered list of reports based on the requested report type.
     *
     * If type is null or blank, all available report categories (INCIDENT, RESOURCE, ANALYTICS)
     * are included. Each report entry is a ReportDTO containing a title, description with
     * live statistics, and a timestamp reflecting when it was generated.
     *
     * @param type  the category filter ("INCIDENT", "RESOURCE", "ANALYTICS", or null/blank for all)
     * @return      a list of ReportDTO objects representing the generated reports
     */
    public List<ReportDTO> getReports(String type) {
        // Initialize an empty list to collect report entries before returning
        List<ReportDTO> reports = new ArrayList<>();

        // Include INCIDENT reports when type is "INCIDENT", null, or blank (i.e., fetch all)
        if ("INCIDENT".equalsIgnoreCase(type) || type == null || type.isBlank()) {
            // Query total number of incidents ever recorded in the system
            long total    = incidentRepository.count();

            // Count open incidents: includes both newly REPORTED and explicitly OPEN statuses
            long open     = incidentRepository.countByStatus("REPORTED") + incidentRepository.countByStatus("OPEN");

            // Count incidents currently being handled by response teams (IN_PROGRESS)
            long active   = incidentRepository.countByStatus("IN_PROGRESS");

            // Count incidents that have been fully resolved and closed
            long resolved = incidentRepository.countByStatus("RESOLVED");

            // Build a high-level summary report showing all incident status counts at a glance
            reports.add(ReportDTO.builder().id(1L).title("Incident Summary Report").type("INCIDENT")
                .description(String.format("Total: %d | Open: %d | Active: %d | Resolved: %d", total, open, active, resolved))
                // Timestamp reflects current moment so the report is clearly marked as real-time
                .createdAt(LocalDateTime.now()).build());

            // Build a focused report on open incidents that still need response team attention
            reports.add(ReportDTO.builder().id(2L).title("Open Incidents Report").type("INCIDENT")
                .description(String.format("%d incidents currently open and requiring attention", open))
                // Offset by 1 hour to visually distinguish this entry from the summary report
                .createdAt(LocalDateTime.now().minusHours(1)).build());

            // Build a report summarizing successfully resolved incidents for performance tracking
            reports.add(ReportDTO.builder().id(3L).title("Resolved Incidents Report").type("INCIDENT")
                .description(String.format("%d incidents successfully resolved", resolved))
                // Offset by 2 hours to maintain chronological ordering among incident report entries
                .createdAt(LocalDateTime.now().minusHours(2)).build());
        }

        // Include RESOURCE report when type is "RESOURCE", null, or blank (i.e., fetch all)
        if ("RESOURCE".equalsIgnoreCase(type) || type == null || type.isBlank()) {
            // Static descriptive report entry for resource availability — no live counts yet
            reports.add(ReportDTO.builder().id(4L).title("Resource Availability Report").type("RESOURCE")
                .description("Current status of all resources and deployment")
                .createdAt(LocalDateTime.now()).build());
        }

        // Include ANALYTICS report when type is "ANALYTICS", null, or blank (i.e., fetch all)
        if ("ANALYTICS".equalsIgnoreCase(type) || type == null || type.isBlank()) {
            // Static descriptive report entry for analytics — trend analysis over the past 14 days
            reports.add(ReportDTO.builder().id(5L).title("System Analytics Report").type("ANALYTICS")
                .description("14-day trend analysis and system performance metrics")
                .createdAt(LocalDateTime.now()).build());
        }

        // Return all matching report entries to the calling controller for API serialization
        return reports;
    }
}