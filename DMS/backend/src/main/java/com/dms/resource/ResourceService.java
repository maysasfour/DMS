package com.dms.resource;

import com.dms.exception.ResourceNotFoundException;
import com.dms.incident.Incident;
import com.dms.incident.IncidentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ResourceService {

    private final ResourceRepository resourceRepository;
    private final IncidentRepository incidentRepository;

    public List<ResourceDTO> getAllResources() {
        return resourceRepository.findAll().stream()
            .map(ResourceDTO::fromEntity)
            .collect(Collectors.toList());
    }

    public Page<ResourceDTO> getResourcesPage(int page, int size, String type, String status) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("name"));
        Page<Resource> result;
        if (type != null && status != null) {
            result = resourceRepository.findByTypeAndStatus(type.toUpperCase(), status.toUpperCase(), pageable);
        } else if (type != null) {
            result = resourceRepository.findByType(type.toUpperCase(), pageable);
        } else if (status != null) {
            result = resourceRepository.findByStatus(status.toUpperCase(), pageable);
        } else {
            result = resourceRepository.findAll(pageable);
        }
        return result.map(ResourceDTO::fromEntity);
    }

    @Transactional
    public ResourceDTO createResource(ResourceDTO request) {
        Resource resource = Resource.builder()
            .name(request.getName())
            .type(request.getType() != null ? request.getType().toUpperCase() : "OTHER")
            .status("AVAILABLE")
            .locationName(request.getLocationName())
            .latitude(request.getLatitude())
            .longitude(request.getLongitude())
            .build();
        return ResourceDTO.fromEntity(resourceRepository.save(resource));
    }

    @Transactional
    public ResourceDTO updateResource(Long id, ResourceDTO request) {
        Resource resource = resourceRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Resource not found: " + id));
        if (request.getName() != null) resource.setName(request.getName());
        if (request.getType() != null) resource.setType(request.getType().toUpperCase());
        if (request.getLocationName() != null) resource.setLocationName(request.getLocationName());
        if (request.getLatitude() != null) resource.setLatitude(request.getLatitude());
        if (request.getLongitude() != null) resource.setLongitude(request.getLongitude());
        return ResourceDTO.fromEntity(resourceRepository.save(resource));
    }

    @Transactional
    public ResourceDTO updateStatus(Long id, String status) {
        Resource resource = resourceRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Resource not found: " + id));
        resource.setStatus(status.toUpperCase());
        return ResourceDTO.fromEntity(resourceRepository.save(resource));
    }

    @Transactional
    public ResourceDTO assignResourceToIncident(Long resourceId, Long incidentId) {
        Resource resource = resourceRepository.findById(resourceId)
            .orElseThrow(() -> new ResourceNotFoundException("Resource not found: " + resourceId));
        Incident incident = incidentRepository.findById(incidentId)
            .orElseThrow(() -> new ResourceNotFoundException("Incident not found: " + incidentId));
        resource.setAssignedIncident(incident);
        resource.setStatus("ASSIGNED");
        return ResourceDTO.fromEntity(resourceRepository.save(resource));
    }

    @Transactional
    public void deleteResource(Long id) {
        if (!resourceRepository.existsById(id))
            throw new ResourceNotFoundException("Resource not found: " + id);
        resourceRepository.deleteById(id);
    }
}
