package com.dms.shelter;

import com.dms.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/shelters")
@RequiredArgsConstructor
@Tag(name = "Shelters", description = "Emergency shelter management")
public class ShelterController {

    private final ShelterRepository shelterRepository;

    @GetMapping
    @Operation(summary = "List shelters with pagination and filtering")
    public ResponseEntity<ApiResponse<Page<Shelter>>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "name") String sortBy,
            @RequestParam(required = false) Boolean active) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(sortBy));
        Page<Shelter> result = (active != null)
            ? shelterRepository.findByIsActive(active, pageable)
            : shelterRepository.findAll(pageable);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/available")
    @Operation(summary = "Get shelters with available capacity")
    public ResponseEntity<ApiResponse<List<Shelter>>> available() {
        return ResponseEntity.ok(ApiResponse.ok(shelterRepository.findAvailableShelters()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Shelter>> getById(@PathVariable Long id) {
        Shelter shelter = shelterRepository.findById(id)
            .orElseThrow(() -> new com.dms.exception.ResourceNotFoundException("Shelter not found: " + id));
        return ResponseEntity.ok(ApiResponse.ok(shelter));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Shelter>> create(@Valid @RequestBody Shelter shelter) {
        Shelter saved = shelterRepository.save(shelter);
        return ResponseEntity.status(201).body(ApiResponse.created(saved, "Shelter created"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Shelter>> update(@PathVariable Long id, @Valid @RequestBody Shelter updated) {
        Shelter shelter = shelterRepository.findById(id)
            .orElseThrow(() -> new com.dms.exception.ResourceNotFoundException("Shelter not found: " + id));
        updated.setShelterId(id);
        updated.setCreatedAt(shelter.getCreatedAt());
        return ResponseEntity.ok(ApiResponse.ok(shelterRepository.save(updated), "Shelter updated"));
    }

    @PatchMapping("/{id}/capacity")
    @PreAuthorize("hasAnyRole('ADMIN','RESCUE_TEAM')")
    public ResponseEntity<ApiResponse<Shelter>> updateCapacity(@PathVariable Long id, @RequestParam int delta) {
        Shelter shelter = shelterRepository.findById(id)
            .orElseThrow(() -> new com.dms.exception.ResourceNotFoundException("Shelter not found: " + id));
        shelter.updateCapacity(delta);
        return ResponseEntity.ok(ApiResponse.ok(shelterRepository.save(shelter), "Capacity updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        if (!shelterRepository.existsById(id)) throw new com.dms.exception.ResourceNotFoundException("Shelter not found: " + id);
        shelterRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Shelter deleted"));
    }
}
