package com.dms.incident;

import com.dms.citizen.Citizen;
import com.dms.shelter.Shelter;
import com.dms.team.RescueTeam;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "incidents")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Incident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "incident_id")
    private Long incidentId;

    @Column(name = "incident_type", nullable = false)
    private String incidentType;

    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "gps_location")
    private String gpsLocation;

    private Double latitude;
    private Double longitude;
    private String location;

    @Column(nullable = false)
    @Builder.Default
    private String severity = "MEDIUM";

    @Column(nullable = false)
    @Builder.Default
    private String status = "REPORTED";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_by")
    private Citizen reportedBy;

    @Column(name = "reported_at", nullable = false)
    private LocalDateTime reportedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_team_id")
    private RescueTeam assignedTeam;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shelter_id")
    private Shelter shelter;

    @Column(name = "resolved_local_date_time")
    private LocalDateTime resolvedAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (reportedAt == null) reportedAt = LocalDateTime.now();
    }

    public void assignTeam(Long teamId) { /* handled via service */ }
    public void updateStatus(String status) { this.status = status; }
    public void closeIncident() { this.status = "CLOSED"; this.resolvedAt = LocalDateTime.now(); }
}
