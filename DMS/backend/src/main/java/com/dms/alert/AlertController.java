package com.dms.alert;

import com.dms.common.ApiResponse;
import com.dms.exception.ResourceNotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/alerts")
@RequiredArgsConstructor
@Tag(name = "Alerts", description = "Emergency alert management")
public class AlertController {

    private final AlertRepository alertRepository;

    @GetMapping
    @Operation(summary = "List alerts with pagination and filtering")
    public ResponseEntity<ApiResponse<Page<Alert>>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String dir,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String severity) {

        Sort sort = dir.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Alert> result;
        if (status != null) {
            result = alertRepository.findByStatus(status, pageable);
        } else if (severity != null) {
            result = alertRepository.findBySeverity(severity, pageable);
        } else {
            result = alertRepository.findAll(pageable);
        }
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/active")
    @Operation(summary = "Get all active alerts (public)")
    public ResponseEntity<ApiResponse<List<Alert>>> active() {
        return ResponseEntity.ok(ApiResponse.ok(alertRepository.findByStatusOrderByCreatedAtDesc("ACTIVE")));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Alert>> getById(@PathVariable Long id) {
        Alert alert = alertRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Alert not found: " + id));
        return ResponseEntity.ok(ApiResponse.ok(alert));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Alert>> create(@RequestBody Alert alert) {
        Alert saved = alertRepository.save(alert);
        return ResponseEntity.status(201).body(ApiResponse.created(saved, "Alert created"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Alert>> update(@PathVariable Long id, @RequestBody Alert updated) {
        alertRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Alert not found: " + id));
        updated.setAlertId(id);
        return ResponseEntity.ok(ApiResponse.ok(alertRepository.save(updated), "Alert updated"));
    }

    @PatchMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Alert>> deactivate(@PathVariable Long id) {
        Alert alert = alertRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Alert not found: " + id));
        alert.setStatus("INACTIVE");
        return ResponseEntity.ok(ApiResponse.ok(alertRepository.save(alert), "Alert deactivated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        if (!alertRepository.existsById(id)) throw new ResourceNotFoundException("Alert not found: " + id);
        alertRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Alert deleted"));
    }
}
