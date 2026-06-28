package com.dms.media;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MediaDTO {
    private Long id;
    private String fileName;
    private String originalName;  // alias for fileName — used by frontend
    private String filePath;      // alias for url — used by frontend
    private String fileType;
    private Long fileSize;
    private String url;
    private Long incidentId;
    private Long uploadedById;
    private LocalDateTime createdAt;

    public static MediaDTO fromEntity(Media media) {
        return MediaDTO.builder()
            .id(media.getId())
            .fileName(media.getFileName())
            .originalName(media.getFileName())
            .filePath(media.getUrl())
            .fileType(media.getFileType())
            .fileSize(media.getFileSize())
            .url(media.getUrl())
            .incidentId(media.getIncident() != null ? media.getIncident().getIncidentId() : null)
            .uploadedById(media.getUploadedBy() != null ? media.getUploadedBy().getId() : null)
            .createdAt(media.getCreatedAt())
            .build();
    }
}
