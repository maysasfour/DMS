/**
 * Media.java — JPA entity representing a media file (image, video, document, etc.)
 * attached to a disaster incident in the DMS system.
 *
 * Media files are uploaded by users (citizens, officers, or team members) to provide
 * visual or documentary evidence for a reported incident. Each Media record tracks
 * the file metadata, its storage URL, the incident it belongs to, and who uploaded it.
 *
 * Table: incident_media
 */
package com.dms.media;

// DMS domain imports — links media to incidents and the users who upload them
import com.dms.incident.Incident;
import com.dms.user.User;

// Prevents circular JSON serialization when incident references back to its media list
import com.fasterxml.jackson.annotation.JsonIgnore;

// Jakarta Persistence API — used to map this class to a relational database table
import jakarta.persistence.*;

// Lombok annotations — auto-generates boilerplate: getters, setters, builder, constructors
import lombok.*;

// Hibernate extension — automatically sets createdAt to the DB server timestamp on INSERT
import org.hibernate.annotations.CreationTimestamp;

// Java time API for recording when the media file was uploaded
import java.time.LocalDateTime;

// @Entity marks this class as a JPA-managed persistent entity mapped to a DB table
@Entity
// @Table specifies the exact table name in the database that stores incident media records
@Table(name = "incident_media")
// @Data generates getters, setters, equals, hashCode, and toString for all fields
// @Builder enables the builder pattern for creating Media instances fluently
// @NoArgsConstructor generates a no-argument constructor required by JPA
// @AllArgsConstructor generates a constructor with all fields, used by @Builder internally
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Media {

    // @Id designates this field as the primary key of the incident_media table
    @Id
    // Auto-incremented by the database — each new media upload gets a unique numeric ID
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    // Maps to the "media_id" column in the database
    @Column(name = "media_id")
    private Long id;

    // The original filename of the uploaded file (e.g., "flood_photo.jpg")
    // Cannot be null — every media record must reference a file name
    @Column(name = "file_name", nullable = false)
    private String fileName;

    // MIME type or extension of the file (e.g., "image/jpeg", "video/mp4")
    // Used to determine how to render or handle the file on the frontend
    @Column(name = "file_type", nullable = false)
    private String fileType;

    // Size of the file in bytes — used for storage quota tracking and display
    // Cannot be null; enforced at the DB level
    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    // Public or signed URL pointing to where the file is stored (e.g., cloud storage bucket)
    // Length 500 accommodates long CDN or pre-signed URLs; cannot be null
    @Column(nullable = false, length = 500)
    private String url;

    // @JsonIgnore prevents the full incident object from being serialized into the media JSON
    // response, avoiding infinite recursion (Incident -> Media -> Incident -> ...)
    @JsonIgnore
    // Many media files can belong to one incident (a single flood incident may have multiple photos)
    // LAZY loading avoids fetching the full incident when only media data is needed
    @ManyToOne(fetch = FetchType.LAZY)
    // Foreign key column linking this media record to its parent incident
    @JoinColumn(name = "incident_id")
    private Incident incident;

    // Tracks which DMS user (citizen reporter, officer, or team member) uploaded this file
    // LAZY loading defers user data retrieval until explicitly accessed
    @ManyToOne(fetch = FetchType.LAZY)
    // Foreign key column referencing the user who performed the upload
    @JoinColumn(name = "uploaded_by")
    private User uploadedBy;

    // @CreationTimestamp instructs Hibernate to automatically populate this field
    // with the current timestamp when the media record is first inserted into the DB
    @CreationTimestamp
    // updatable = false ensures the upload timestamp is never modified after initial creation
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}