package com.dms.dashboard;

import com.dms.common.ApiResponse;
import com.dms.incident.IncidentRepository;
import com.dms.resource.ResourceRepository;
import com.dms.user.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Dashboard analytics")
public class DashboardController {

    private final IncidentRepository incidentRepository;
    private final ResourceRepository resourceRepository;
    private final UserRepository userRepository;

    @Operation(summary = "Get system statistics")
    @GetMapping("/stats")
    @Cacheable("dashboardStats")
    public ResponseEntity<ApiResponse<DashboardDTO>> getStats() {
        DashboardDTO stats = DashboardDTO.builder()
            .totalIncidents(incidentRepository.count())
            .activeIncidents(incidentRepository.countByStatus("IN_PROGRESS"))
            .resolvedIncidents(incidentRepository.countByStatus("RESOLVED"))
            .openIncidents(incidentRepository.countByStatus("REPORTED") + incidentRepository.countByStatus("OPEN"))
            .criticalIncidents(incidentRepository.countBySeverity("CRITICAL"))
            .availableResources(resourceRepository.countByStatus("AVAILABLE"))
            .assignedResources(resourceRepository.countByStatus("ASSIGNED"))
            .totalUsers(userRepository.count())
            .build();
        return ResponseEntity.ok(ApiResponse.success("Stats retrieved", stats));
    }

    @Operation(summary = "Get incident trends")
    @GetMapping("/trends")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getTrends(
            @RequestParam(defaultValue = "14") int days) {

        LocalDateTime since = LocalDateTime.now().minusDays(days);
        var recent = incidentRepository.countByTypeAfter(since);

        // Build per-day counts from all incidents
        var allRecent = incidentRepository.findWithFilters(null, null, null,
            org.springframework.data.domain.PageRequest.of(0, 500)).getContent();

        Map<LocalDate, Long> byDate = allRecent.stream()
            .filter(i -> i.getReportedAt() != null && i.getReportedAt().isAfter(since))
            .collect(Collectors.groupingBy(
                i -> i.getReportedAt().toLocalDate(),
                Collectors.counting()
            ));

        List<Map<String, Object>> trends = new ArrayList<>();
        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            Map<String, Object> point = new LinkedHashMap<>();
            point.put("date", date.toString());
            point.put("count", byDate.getOrDefault(date, 0L));
            trends.add(point);
        }

        // Also include type breakdown
        Map<String, Long> byType = new LinkedHashMap<>();
        recent.forEach(row -> byType.put(row[0].toString(), (Long) row[1]));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("daily", trends);
        result.put("byType", byType);

        return ResponseEntity.ok(ApiResponse.success("Trends retrieved", List.of(result)));
    }
}
