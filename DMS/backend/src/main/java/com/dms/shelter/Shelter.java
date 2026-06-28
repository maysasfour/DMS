package com.dms.shelter;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "shelters")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Shelter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "shelter_id")
    private Long shelterId;

    @Column(nullable = false)
    private String name;

    private String address;

    @Column(name = "gps_location")
    private String gpsLocation;

    private Double latitude;
    private Double longitude;

    @Column(nullable = false)
    @Builder.Default
    private Integer capacity = 0;

    @Column(name = "available_capacity", nullable = false)
    @Builder.Default
    private Integer availableCapacity = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "contact_number")
    private String contactNumber;

    private String amenities;

    @Column(nullable = false)
    @Builder.Default
    private String status = "OPEN";

    @Column(name = "offline_cache", columnDefinition = "jsonb")
    private String offlineCache;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Integer getAvailableCapacity() {
        return availableCapacity != null ? availableCapacity : capacity;
    }

    public void updateCapacity(int delta) {
        this.availableCapacity = Math.max(0, this.availableCapacity + delta);
    }
}
