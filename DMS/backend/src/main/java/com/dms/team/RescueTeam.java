package com.dms.team;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "rescue_teams")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class RescueTeam {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "team_id")
    private Long teamId;

    @Column(nullable = false)
    private String name;

    private String type;

    @Column(name = "contact_number")
    private String contactNumber;

    private String email;

    @Builder.Default
    private Integer capacity = 0;

    private Double latitude;
    private Double longitude;
    private String location;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Builder.Default
    private Boolean available = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
