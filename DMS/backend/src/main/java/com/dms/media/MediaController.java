package com.dms.media;

import com.dms.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/v1/media")
@RequiredArgsConstructor
@Tag(name = "Media", description = "Incident media and attachments management")
public class MediaController {

    private final MediaService mediaService;

    @Operation(summary = "Upload media for an incident")
    @PostMapping("/upload/{incidentId}")
    public ResponseEntity<ApiResponse<MediaDTO>> uploadMedia(
            @PathVariable Long incidentId,
            @RequestParam("file") MultipartFile file,
            Authentication auth) throws IOException {
        
        MediaDTO mediaDTO = mediaService.uploadMedia(incidentId, file, auth.getName());
        return ResponseEntity.ok(ApiResponse.success("Media uploaded successfully", mediaDTO));
    }

    @Operation(summary = "Get media for an incident")
    @GetMapping("/incident/{incidentId}")
    public ResponseEntity<ApiResponse<List<MediaDTO>>> getIncidentMedia(@PathVariable Long incidentId) {
        return ResponseEntity.ok(ApiResponse.success("Media retrieved", mediaService.getMediaForIncident(incidentId)));
    }
}
