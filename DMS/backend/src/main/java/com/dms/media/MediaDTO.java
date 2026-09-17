/**
 * MediaDTO.java — Data Transfer Object for media files attached to DMS incidents.
 *
 * This class is used to transfer media metadata (images, videos, documents)
 * between the backend service layer and REST API responses. It decouples the
 * internal Media JPA entity from the JSON payload exposed to the frontend,
 * providing both canonical field names (url) and frontend-friendly aliases
 * (originalName, filePath) for backward compatibility with the React client.
 *
 * Typical use: returned in incident detail responses to list evidence or
 * attachments uploaded by citizens or officers during incident reporting.
 */
package com.dms.media;

// Lombok import: provides @Data, @Builder, @NoArgsConstructor, @AllArgsConstructor annotations
import lombok.*;
// Standard Java time: used for recording when the media file was uploaded
import java.time.LocalDateTime;

// @Data: Lombok — auto-generates getters, setters, equals, hashCode, and toString for all fields
@Data
// @Builder: Lombok — enables the fluent builder pattern (e.g., MediaDTO.builder().id(...).build())
@Builder
// @NoArgsConstructor: Lombok — generates a no-argument constructor required by serialization frameworks
@NoArgsConstructor
// @AllArgsConstructor: Lombok — generates a constructor accepting all fields, used by the builder internally
@AllArgsConstructor
public class MediaDTO {

    // Unique database identifier for this media record
    private Long id;

    // Server-side stored filename (may differ from the original upload name)
    private String fileName;

    // Alias for fileName — provided for frontend compatibility; represents the human-readable file name shown in the UI
    private String originalName;

    // Alias for url — provided for frontend compatibility; represents the accessible path to retrieve the media file
    private String filePath;

    // MIME type or file category (e.g., "image/jpeg", "video/mp4") used to render media correctly in the incident detail view
    private String fileType;

    // Size of the uploaded file in bytes — used for display and upload validation in the frontend
    private Long fileSize;

    // Canonical public URL to access the stored media file (e.g., from object storage or static file server)
    private String url;

    // Foreign key reference: ID of the incident this media is attached to — links evidence to the correct DMS incident record
    private Long incidentId;

    // Foreign key reference: ID of the user (citizen, officer, or admin) who uploaded this media file
    private Long uploadedById;

    // Timestamp of when the media file was uploaded to the system — used for audit trails and chronological display
    private LocalDateTime createdAt;

    /**
     * Static factory method that converts a Media JPA entity into a MediaDTO
     * suitable for API responses.
     *
     * This method handles null-safe extraction of nested entity references
     * (incident and uploadedBy user) to avoid NullPointerExceptions when
     * media is partially populated or orphaned.
     *
     * @param media the Media entity loaded from the database
     * @return a fully populated MediaDTO ready for JSON serialization
     */
    public static MediaDTO fromEntity(Media media) {
        return MediaDTO.builder()
            // Map the internal entity ID to the DTO id field
            .id(media.getId())
            // Copy the stored filename as-is
            .fileName(media.getFileName())
            // Mirror fileName into originalName for frontend display consistency
            .originalName(media.getFileName())
            // Map the canonical URL into the filePath alias expected by the React client
            .filePath(media.getUrl())
            // Preserve the MIME type for media rendering decisions on the frontend
            .fileType(media.getFileType())
            // Include file size for display in the incident media gallery
            .fileSize(media.getFileSize())
            // Set the canonical URL for direct media access
            .url(media.getUrl())
            // Safely extract the incident ID — null if media is not linked to an incident
            .incidentId(media.getIncident() != null ? media.getIncident().getIncidentId() : null)
            // Safely extract the uploader's user ID — null if the uploader record is missing
            .uploadedById(media.getUploadedBy() != null ? media.getUploadedBy().getId() : null)
            // Preserve the original upload timestamp for audit and sorting purposes
            .createdAt(media.getCreatedAt())
            // Finalize and construct the DTO instance
            .build();
    }
}