package com.dms.resource;

import com.dms.admin.Admin;
import com.dms.incident.Incident;
import com.dms.team.RescueTeam;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "resource_assignments")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ResourceAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "resource_id")
    private Long resourceId;

    @Column(name = "resource_type", nullable = false)
    private String resourceType;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    @Builder.Default
    private Integer quantity = 1;

    private String unit;

    @Column(name = "location_name")
    private String locationName;

    private Double latitude;
    private Double longitude;

    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    @Column(nullable = false)
    @Builder.Default
    private String status = "AVAILABLE";

    @Column(columnDefinition = "TEXT")
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id")
    private Incident incident;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private RescueTeam team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id")
    private Admin admin;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public void assignToTeam(Long teamId) { this.status = "ASSIGNED"; this.assignedAt = LocalDateTime.now(); }
    public void updateResource() { /* handled via service */ }
}
