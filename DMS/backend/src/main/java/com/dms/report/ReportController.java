package com.dms.report;

import com.dms.common.ApiResponse;
import com.dms.incident.IncidentRepository;
import com.dms.incident.IncidentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@Tag(name = "Reports", description = "Historical reports and analytics")
public class ReportController {

    private final ReportService reportService;

    @Operation(summary = "Get available reports")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ReportDTO>>> getReports(
            @RequestParam(required = false, defaultValue = "INCIDENT") String type) {
        return ResponseEntity.ok(ApiResponse.success("Reports retrieved", reportService.getReports(type)));
    }
}
