/**
 * ResourceService.java
 *
 * Service layer for managing disaster response resources within the DMS system.
 * Handles business logic for creating, retrieving, updating, assigning, and deleting
 * resources such as vehicles, personnel, equipment, and medical supplies.
 *
 * Resources can be assigned to active incidents to track deployment and availability.
 * Status lifecycle: AVAILABLE -> ASSIGNED -> (back to AVAILABLE upon release or deletion).
 */
package com.dms.resource;

// Domain exception thrown when a resource or incident lookup fails
import com.dms.exception.ResourceNotFoundException;
// Incident entity used for linking resources to active disaster incidents
import com.dms.incident.Incident;
// JPA repository for querying incident records
import com.dms.incident.IncidentRepository;
// Lombok annotation that generates a constructor injecting all final fields (avoids @Autowired boilerplate)
import lombok.RequiredArgsConstructor;
// Spring Data pagination and sorting utilities
import org.springframework.data.domain.*;
// Marks this class as a Spring-managed service bean (business logic layer)
import org.springframework.stereotype.Service;
// Ensures database operations within annotated methods are wrapped in a transaction
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

// @Service registers this class in the Spring application context as a service component
@Service
// @RequiredArgsConstructor generates a constructor for all final fields, enabling constructor-based dependency injection
@RequiredArgsConstructor
public class ResourceService {

    // JPA repository for CRUD and filtered queries on Resource entities
    private final ResourceRepository resourceRepository;
    // JPA repository used to validate and retrieve Incident records during resource assignment
    private final IncidentRepository incidentRepository;

    /**
     * Retrieves all resources in the system without pagination.
     * Useful for populating dropdowns or full resource overviews in the admin dashboard.
     *
     * @return list of all resources as DTOs
     */
    public List<ResourceDTO> getAllResources() {
        // Fetch all Resource entities, convert each to a DTO to avoid exposing JPA internals
        return resourceRepository.findAll().stream()
            .map(ResourceDTO::fromEntity)
            .collect(Collectors.toList());
    }

    /**
     * Retrieves a paginated, optionally filtered list of resources.
     * Supports filtering by resource type (e.g., VEHICLE, MEDICAL) and/or status (e.g., AVAILABLE, ASSIGNED).
     * Used by the admin resource management table with server-side pagination.
     *
     * @param page   zero-based page index
     * @param size   number of records per page
     * @param type   optional resource type filter (case-insensitive)
     * @param status optional resource status filter (case-insensitive)
     * @return paginated page of ResourceDTOs
     */
    public Page<ResourceDTO> getResourcesPage(int page, int size, String type, String status) {
        // Build a pageable descriptor sorted alphabetically by resource name
        Pageable pageable = PageRequest.of(page, size, Sort.by("name"));
        Page<Resource> result;
        // Apply the most specific filter combination available to minimise result set
        if (type != null && status != null) {
            // Both filters provided — use combined query for precise results
            result = resourceRepository.findByTypeAndStatus(type.toUpperCase(), status.toUpperCase(), pageable);
        } else if (type != null) {
            // Only type filter provided — retrieve all resources of that category
            result = resourceRepository.findByType(type.toUpperCase(), pageable);
        } else if (status != null) {
            // Only status filter provided — e.g., fetch all AVAILABLE resources for dispatch
            result = resourceRepository.findByStatus(status.toUpperCase(), pageable);
        } else {
            // No filters — return full paginated list of all resources
            result = resourceRepository.findAll(pageable);
        }
        // Convert each Resource entity to a DTO before returning to the controller
        return result.map(ResourceDTO::fromEntity);
    }

    /**
     * Creates a new disaster response resource and persists it to the database.
     * New resources are always initialised with AVAILABLE status, ready for assignment.
     *
     * @param request DTO containing name, type, location, and coordinates for the new resource
     * @return the saved resource as a DTO with its generated ID
     */
    @Transactional // Ensures the save operation is atomic; rolls back if an error occurs
    public ResourceDTO createResource(ResourceDTO request) {
        // Build a new Resource entity using the builder pattern; default type to OTHER if not specified
        Resource resource = Resource.builder()
            .name(request.getName())
            // Normalise type to uppercase for consistent enum-style storage; default to OTHER if absent
            .type(request.getType() != null ? request.getType().toUpperCase() : "OTHER")
            // All newly created resources start as AVAILABLE until assigned to an incident
            .status("AVAILABLE")
            .locationName(request.getLocationName())
            .latitude(request.getLatitude())
            .longitude(request.getLongitude())
            .build();
        // Persist the entity and immediately return it as a DTO (includes generated ID)
        return ResourceDTO.fromEntity(resourceRepository.save(resource));
    }

    /**
     * Updates mutable fields of an existing resource by its ID.
     * Only non-null fields in the request DTO are applied (partial update / PATCH semantics).
     * Does not allow changing status via this method — use updateStatus() instead.
     *
     * @param id      ID of the resource to update
     * @param request DTO containing fields to update; null fields are ignored
     * @return updated resource as a DTO
     * @throws ResourceNotFoundException if no resource with the given ID exists
     */
    @Transactional // Wraps the load-modify-save cycle in a single database transaction
    public ResourceDTO updateResource(Long id, ResourceDTO request) {
        // Load the existing resource or throw a descriptive error if it doesn't exist
        Resource resource = resourceRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Resource not found: " + id));
        // Apply partial updates — only overwrite fields that were explicitly provided
        if (request.getName() != null) resource.setName(request.getName());
        // Normalise type to uppercase so queries and comparisons remain consistent
        if (request.getType() != null) resource.setType(request.getType().toUpperCase());
        if (request.getLocationName() != null) resource.setLocationName(request.getLocationName());
        // Update geospatial coordinates if a new deployment location is provided
        if (request.getLatitude() != null) resource.setLatitude(request.getLatitude());
        if (request.getLongitude() != null) resource.setLongitude(request.getLongitude());
        // Persist changes and return the updated state as a DTO
        return ResourceDTO.fromEntity(resourceRepository.save(resource));
    }

    /**
     * Updates the operational status of a resource (e.g., AVAILABLE, ASSIGNED, MAINTENANCE).
     * Separated from updateResource() to allow status-only changes without requiring a full DTO.
     *
     * @param id     ID of the resource whose status is being changed
     * @param status new status string (normalised to uppercase)
     * @return updated resource as a DTO reflecting the new status
     * @throws ResourceNotFoundException if no resource with the given ID exists
     */
    @Transactional // Ensures status change is committed atomically
    public ResourceDTO updateStatus(Long id, String status) {
        // Load the resource to ensure it exists before attempting a status change
        Resource resource = resourceRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Resource not found: " + id));
        // Normalise status to uppercase to match stored enum-style values (e.g., AVAILABLE, ASSIGNED)
        resource.setStatus(status.toUpperCase());
        // Save the updated entity and return the result as a DTO
        return ResourceDTO.fromEntity(resourceRepository.save(resource));
    }

    /**
     * Assigns a specific resource to an active incident, marking it as ASSIGNED.
     * This links the resource to the incident in the database and updates availability status,
     * allowing dispatchers to track which resources are deployed to which disasters.
     *
     * @param resourceId ID of the resource to assign (e.g., ambulance, rescue team)
     * @param incidentId ID of the target incident (e.g., flood, fire event)
     * @return updated resource as a DTO showing ASSIGNED status and linked incident
     * @throws ResourceNotFoundException if either the resource or the incident cannot be found
     */
    @Transactional // Both lookups and the save must succeed together or be rolled back
    public ResourceDTO assignResourceToIncident(Long resourceId, Long incidentId) {
        // Load the resource to be deployed; fail fast if it doesn't exist
        Resource resource = resourceRepository.findById(resourceId)
            .orElseThrow(() -> new ResourceNotFoundException("Resource not found: " + resourceId));
        // Validate that the target incident exists before making the assignment
        Incident incident = incidentRepository.findById(incidentId)
            .orElseThrow(() -> new ResourceNotFoundException("Incident not found: " + incidentId));
        // Link the resource to the incident for tracking and reporting purposes
        resource.setAssignedIncident(incident);
        // Mark the resource as ASSIGNED so it is no longer shown as available for dispatch
        resource.setStatus("ASSIGNED");
        // Persist the assignment and return the updated resource DTO
        return ResourceDTO.fromEntity(resourceRepository.save(resource));
    }

    /**
     * Permanently removes a resource from the DMS by its ID.
     * Should only be used for resources that are decommissioned or erroneously created.
     * Active incident assignments should be reviewed before deletion.
     *
     * @param id ID of the resource to delete
     * @throws ResourceNotFoundException if no resource with the given ID exists
     */
    @Transactional // Ensures the existence check and deletion occur within the same transaction
    public void deleteResource(Long id) {
        // Verify the resource exists before attempting deletion to provide a meaningful error message
        if (!resourceRepository.existsById(id))
            throw new ResourceNotFoundException("Resource not found: " + id);
        // Permanently remove the resource record from the database
        resourceRepository.deleteById(id);
    }
}