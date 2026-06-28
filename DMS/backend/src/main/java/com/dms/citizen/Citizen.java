package com.dms.citizen;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "citizens")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Citizen {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "citizen_id")
    private Long citizenId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    private String address;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    private String gender;

    @Column(name = "blood_type")
    private String bloodType;

    @Column(name = "current_location")
    private String currentLocation;

    @Column(nullable = false)
    @Builder.Default
    private String status = "ACTIVE";

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "citizen_phones", joinColumns = @JoinColumn(name = "citizen_id"))
    @Column(name = "phone")
    @Builder.Default
    private Set<String> phones = new HashSet<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
