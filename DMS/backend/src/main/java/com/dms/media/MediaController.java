/**
 * MediaController.java
 *
 * REST controller responsible for handling media file operations within the DMS.
 * Provides endpoints for uploading and retrieving media attachments (e.g., photos,
 * videos, documents) associated with disaster incidents. These attachments help
 * responders and administrators assess incident severity and verify reports.
 *
 * Base URL: /api/v1/media
 */
package com.dms.media;

// DMS-specific unified API response wrapper for consistent JSON envelopes
import com.dms.common.ApiResponse;
// Swagger/OpenAPI annotations for auto-generating REST API documentation
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
// Lombok annotation to auto-generate a constructor injecting all final fields
import lombok.RequiredArgsConstructor;
// Spring HTTP response abstraction allowing status code and body control
import org.springframework.http.ResponseEntity;
// Provides the currently authenticated user's principal for audit/ownership tracking
import org.springframework.security.core.Authentication;
// Spring MVC annotations for defining REST endpoints and mapping HTTP methods
import org.springframework.web.bind.annotation.*;
// Represents an uploaded file received via multipart/form-data HTTP request
import org.springframework.web.multipart.MultipartFile;

// Standard Java I/O exception, required for file read/write operations
import java.io.IOException;
// Used to return a collection of media records for a given incident
import java.util.List;

// Marks this class as a REST controller — combines @Controller and @ResponseBody,
// so all methods return JSON/data directly rather than rendering view templates
@RestController
// All endpoints in this controller are prefixed with /api/v1/media for versioned routing
@RequestMapping("/api/v1/media")
// Lombok: generates a constructor with one parameter per final field (mediaService),
// enabling Spring to inject the dependency without explicit @Autowired
@RequiredArgsConstructor
// Swagger UI grouping tag — labels this controller as "Media" in the API documentation
// with a description clarifying it handles incident attachments
@Tag(name = "Media", description = "Incident media and attachments management")
public class MediaController {

    // Service layer handling business logic for media storage, retrieval, and validation
    private final MediaService mediaService;

    // Swagger documentation: describes this endpoint in the generated API spec
    @Operation(summary = "Upload media for an incident")
    // Maps HTTP POST requests to /api/v1/media/upload/{incidentId}
    // incidentId in the path identifies which incident the file belongs to
    @PostMapping("/upload/{incidentId}")
    public ResponseEntity<ApiResponse<MediaDTO>> uploadMedia(
            // Extracts the incident ID from the URL path to link the media to a specific incident
            @PathVariable Long incidentId,
            // Extracts the uploaded file from the multipart form field named "file"
            @RequestParam("file") MultipartFile file,
            // Spring injects the current authenticated user's context for ownership tracking
            Authentication auth) throws IOException {

        // Delegate to the service to persist the file and associate it with the incident;
        // auth.getName() provides the uploader's username for audit trail purposes
        MediaDTO mediaDTO = mediaService.uploadMedia(incidentId, file, auth.getName());
        // Wrap the resulting MediaDTO in a standard success API response and return HTTP 200
        return ResponseEntity.ok(ApiResponse.success("Media uploaded successfully", mediaDTO));
    }

    // Swagger documentation: describes this read endpoint in the generated API spec
    @Operation(summary = "Get media for an incident")
    // Maps HTTP GET requests to /api/v1/media/incident/{incidentId}
    // Returns all media attachments linked to the specified incident
    @GetMapping("/incident/{incidentId}")
    public ResponseEntity<ApiResponse<List<MediaDTO>>> getIncidentMedia(
            // Extracts the incident ID from the URL path to query its associated media files
            @PathVariable Long incidentId) {
        // Fetch all media records for the incident from the service and wrap in a success response
        return ResponseEntity.ok(ApiResponse.success("Media retrieved", mediaService.getMediaForIncident(incidentId)));
    }
}