/**
 * Citizen.java
 *
 * Represents a registered civilian user in the Disaster Management System (DMS).
 * Citizens are the primary public-facing actors who can report incidents, request
 * assistance, and receive alerts during disaster events. This entity maps directly
 * to the "citizens" table in the database and holds personal, contact, and health
 * metadata that emergency responders may need during a crisis.
 */
package com.dms.citizen;

// Jakarta Persistence API imports for ORM mapping to the relational database
import jakarta.persistence.*;
// Lombok annotations to auto-generate boilerplate: getters, setters, builder, constructors
import lombok.*;
// Hibernate-specific annotation to auto-set the creation timestamp on insert
import org.hibernate.annotations.CreationTimestamp;
// Hibernate-specific annotation to auto-set the updated timestamp on every update
import org.hibernate.annotations.UpdateTimestamp;

// Used for date-only fields such as date of birth
import java.time.LocalDate;
// Used for full timestamp fields such as record creation and last update times
import java.time.LocalDateTime;
// Used for storing an unordered collection of unique phone numbers
import java.util.HashSet;
import java.util.Set;

// @Entity marks this class as a JPA-managed entity, meaning it is persisted to the database
@Entity
// @Table maps this entity to the "citizens" table; keeps naming explicit and avoids default guessing
@Table(name = "citizens")
// @Data generates getters, setters, equals, hashCode, and toString via Lombok
// @Builder enables the fluent builder pattern for constructing Citizen objects
// @NoArgsConstructor and @AllArgsConstructor generate the default and full-argument constructors
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Citizen {

    // @Id declares this field as the primary key for the citizens table
    @Id
    // @GeneratedValue with IDENTITY strategy lets the database auto-increment the citizen ID
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    // Explicitly names the column to match the DB schema convention
    @Column(name = "citizen_id")
    private Long citizenId;

    // Full legal name of the citizen; required for identification during disaster response
    @Column(nullable = false)
    private String name;

    // Email serves as the unique login credential for citizens in the DMS portal
    @Column(nullable = false, unique = true)
    private String email;

    // Hashed password for securing citizen account access (must never be stored in plain text)
    @Column(nullable = false)
    private String password;

    // Optional home or mailing address; helps responders locate a citizen during an incident
    private String address;

    // Date of birth used for age-based vulnerability assessments during disaster triage
    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    // Gender information may be relevant for medical response and demographic reporting
    private String gender;

    // Blood type is critical health metadata for emergency medical teams during a disaster
    @Column(name = "blood_type")
    private String bloodType;

    // Current reported GPS or textual location; updated dynamically so responders can track citizens
    @Column(name = "current_location")
    private String currentLocation;

    // Account status flag; defaults to "ACTIVE" — can be set to "INACTIVE" or "SUSPENDED"
    // to restrict access without deleting the record
    @Column(nullable = false)
    @Builder.Default // Ensures the Lombok builder uses this default value instead of null
    private String status = "ACTIVE";

    // A citizen may have multiple phone numbers (e.g., mobile + home); stored in a separate
    // join table "citizen_phones" to maintain normalization while keeping retrieval eager
    @ElementCollection(fetch = FetchType.EAGER) // Load all phones alongside the citizen in one query
    @CollectionTable(name = "citizen_phones", joinColumns = @JoinColumn(name = "citizen_id")) // Join table definition
    @Column(name = "phone") // Each phone number maps to this column in the join table
    @Builder.Default // Ensures builder initializes to an empty set rather than null
    private Set<String> phones = new HashSet<>();

    // Automatically populated by Hibernate when the citizen record is first inserted;
    // useful for audit trails and onboarding analytics
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false) // updatable=false prevents accidental overwrite
    private LocalDateTime createdAt;

    // Automatically updated by Hibernate on every save; tracks the most recent profile change
    // which is important for data freshness during an active disaster scenario
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}