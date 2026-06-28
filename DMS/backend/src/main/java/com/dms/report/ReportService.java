package com.dms.report;

import com.dms.incident.IncidentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final IncidentRepository incidentRepository;

    public List<ReportDTO> getReports(String type) {
        List<ReportDTO> reports = new ArrayList<>();

        if ("INCIDENT".equalsIgnoreCase(type) || type == null || type.isBlank()) {
            long total    = incidentRepository.count();
            long open     = incidentRepository.countByStatus("REPORTED") + incidentRepository.countByStatus("OPEN");
            long active   = incidentRepository.countByStatus("IN_PROGRESS");
            long resolved = incidentRepository.countByStatus("RESOLVED");

            reports.add(ReportDTO.builder().id(1L).title("Incident Summary Report").type("INCIDENT")
                .description(String.format("Total: %d | Open: %d | Active: %d | Resolved: %d", total, open, active, resolved))
                .createdAt(LocalDateTime.now()).build());

            reports.add(ReportDTO.builder().id(2L).title("Open Incidents Report").type("INCIDENT")
                .description(String.format("%d incidents currently open and requiring attention", open))
                .createdAt(LocalDateTime.now().minusHours(1)).build());

            reports.add(ReportDTO.builder().id(3L).title("Resolved Incidents Report").type("INCIDENT")
                .description(String.format("%d incidents successfully resolved", resolved))
                .createdAt(LocalDateTime.now().minusHours(2)).build());
        }

        if ("RESOURCE".equalsIgnoreCase(type) || type == null || type.isBlank()) {
            reports.add(ReportDTO.builder().id(4L).title("Resource Availability Report").type("RESOURCE")
                .description("Current status of all resources and deployment")
                .createdAt(LocalDateTime.now()).build());
        }

        if ("ANALYTICS".equalsIgnoreCase(type) || type == null || type.isBlank()) {
            reports.add(ReportDTO.builder().id(5L).title("System Analytics Report").type("ANALYTICS")
                .description("14-day trend analysis and system performance metrics")
                .createdAt(LocalDateTime.now()).build());
        }

        return reports;
    }
}
