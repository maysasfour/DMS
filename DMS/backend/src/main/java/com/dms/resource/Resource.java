package com.dms.resource;

import com.dms.incident.Incident;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Legacy Resource entity — now maps to resource_assignments table.
 * Use ResourceAssignment for new code.
 */
@Entity
@Table(name = "resource_assignments")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Resource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "resource_id")
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "resource_type", nullable = false)
    private String type;

    @Column(nullable = false)
    @Builder.Default
    private String status = "AVAILABLE";

    @Column(name = "location_name")
    private String locationName;

    private Double latitude;
    private Double longitude;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id")
    private Incident assignedIncident;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
