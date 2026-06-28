package com.dms.team;

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
@RequestMapping("/api/v1/teams")
@RequiredArgsConstructor
@Tag(name = "Rescue Teams", description = "Rescue team management")
public class RescueTeamController {

    private final RescueTeamRepository teamRepository;

    @GetMapping
    @Operation(summary = "List rescue teams with pagination")
    public ResponseEntity<ApiResponse<Page<RescueTeam>>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Boolean available) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("name"));
        Page<RescueTeam> result;
        if (type != null) {
            List<RescueTeam> byType = teamRepository.findByType(type);
            result = new PageImpl<>(byType, pageable, byType.size());
        } else if (Boolean.TRUE.equals(available)) {
            List<RescueTeam> avail = teamRepository.findByIsActiveTrueAndAvailableTrue();
            result = new PageImpl<>(avail, pageable, avail.size());
        } else {
            result = teamRepository.findAll(pageable);
        }
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/available")
    @Operation(summary = "Get available rescue teams")
    public ResponseEntity<ApiResponse<List<RescueTeam>>> available() {
        return ResponseEntity.ok(ApiResponse.ok(teamRepository.findByIsActiveTrueAndAvailableTrue()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RescueTeam>> getById(@PathVariable Long id) {
        RescueTeam team = teamRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + id));
        return ResponseEntity.ok(ApiResponse.ok(team));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<RescueTeam>> create(@RequestBody RescueTeam team) {
        return ResponseEntity.status(201).body(ApiResponse.created(teamRepository.save(team), "Team created"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<RescueTeam>> update(@PathVariable Long id, @RequestBody RescueTeam updated) {
        teamRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Team not found: " + id));
        updated.setTeamId(id);
        return ResponseEntity.ok(ApiResponse.ok(teamRepository.save(updated), "Team updated"));
    }

    @PatchMapping("/{id}/availability")
    @PreAuthorize("hasAnyRole('ADMIN','RESCUE_TEAM')")
    public ResponseEntity<ApiResponse<RescueTeam>> setAvailability(@PathVariable Long id, @RequestParam boolean available) {
        RescueTeam team = teamRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + id));
        team.setAvailable(available);
        return ResponseEntity.ok(ApiResponse.ok(teamRepository.save(team), "Availability updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        if (!teamRepository.existsById(id)) throw new ResourceNotFoundException("Team not found: " + id);
        teamRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Team deleted"));
    }
}
