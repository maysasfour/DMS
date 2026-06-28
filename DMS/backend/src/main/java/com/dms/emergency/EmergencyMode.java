package com.dms.emergency;

import com.dms.citizen.Citizen;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "emergency_modes")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class EmergencyMode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "emergency_mode_id")
    private Long emergencyModeId;

    @Column(name = "mode_type", nullable = false)
    private String modeType;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = false;

    @Column(name = "activated_at", nullable = false)
    @Builder.Default
    private LocalDateTime activatedAt = LocalDateTime.now();

    @Column(name = "deactivated_at")
    private LocalDateTime deactivatedAt;

    @Column(name = "notify_contacts", nullable = false)
    @Builder.Default
    private Boolean notifyContacts = true;

    @Column(name = "offline_cache", columnDefinition = "jsonb")
    private String offlineCache;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private Citizen user;

    public void activate(String reason) {
        this.isActive = true;
        this.reason = reason;
        this.activatedAt = LocalDateTime.now();
        this.deactivatedAt = null;
    }

    public void deactivate() {
        this.isActive = false;
        this.deactivatedAt = LocalDateTime.now();
    }
}
