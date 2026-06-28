package com.dms.location;

import com.dms.citizen.Citizen;
import com.dms.team.RescueTeam;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "location_shares")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class LocationShare {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "location_share_id")
    private Long locationShareId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "citizen_id", nullable = false)
    private Citizen citizen;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private RescueTeam team;

    @Column(name = "gps_location")
    private String gpsLocation;

    private Double latitude;
    private Double longitude;
    private Double accuracy;

    @Column(name = "shared_with")
    private String sharedWith;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "shared_at", nullable = false)
    @Builder.Default
    private LocalDateTime sharedAt = LocalDateTime.now();

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    public void startSharing() { this.isActive = true; this.sharedAt = LocalDateTime.now(); }
    public void stopSharing() { this.isActive = false; }
    public void updateLocation(Double lat, Double lng) { this.latitude = lat; this.longitude = lng; this.gpsLocation = lat + "," + lng; }
}
