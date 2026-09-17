/**
 * EmergencyMode.java
 *
 * Represents a citizen-activated emergency mode record in the Disaster Management System (DMS).
 * When a citizen feels endangered or witnesses a disaster, they can activate an emergency mode
 * which triggers notifications to their emergency contacts, caches critical offline data,
 * and flags their account for priority monitoring by response teams.
 *
 * This entity is persisted in the "emergency_modes" table and is linked to a Citizen user.
 * Emergency modes can be toggled on/off, and a full audit trail (activation/deactivation
 * timestamps) is maintained for incident review and reporting purposes.
 */
package com.dms.emergency;

// Imports the Citizen entity to associate each emergency mode with a specific DMS user
import com.dms.citizen.Citizen;
// Jakarta Persistence API annotations for ORM mapping to the PostgreSQL database
import jakarta.persistence.*;
// Lombok annotations to auto-generate boilerplate: getters, setters, builder, constructors
import lombok.*;

// Used to record precise timestamps for when emergency mode is activated or deactivated
import java.time.LocalDateTime;

// Marks this class as a JPA entity, meaning it maps directly to a database table
@Entity
// Specifies the exact table name in the database that stores emergency mode records
@Table(name = "emergency_modes")
// @Data generates getters, setters, equals, hashCode, and toString via Lombok
// @Builder enables the builder pattern for constructing EmergencyMode instances cleanly
// @NoArgsConstructor and @AllArgsConstructor generate the required JPA no-arg and full-arg constructors
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class EmergencyMode {

    // Primary key for the emergency_modes table, auto-incremented by the database
    @Id
    // Delegates ID generation to the database identity column (auto-increment)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    // Maps this field to the "emergency_mode_id" column in the database
    @Column(name = "emergency_mode_id")
    private Long emergencyModeId;

    // Describes the type of emergency mode (e.g., "EARTHQUAKE", "FLOOD", "PERSONAL_DANGER")
    // so response teams can quickly classify the nature of the citizen's emergency
    @Column(name = "mode_type", nullable = false)
    private String modeType;

    // Free-text explanation provided by the citizen describing why emergency mode was triggered;
    // stored as TEXT to accommodate detailed situational descriptions
    @Column(columnDefinition = "TEXT")
    private String reason;

    // Indicates whether this emergency mode is currently active; false by default
    // to prevent accidental activation on record creation
    @Column(name = "is_active", nullable = false)
    // Ensures the builder sets isActive to false when not explicitly specified
    @Builder.Default
    private Boolean isActive = false;

    // Records the exact moment emergency mode was activated for audit and response time tracking
    @Column(name = "activated_at", nullable = false)
    // Defaults to the current timestamp so the activation time is captured immediately on creation
    @Builder.Default
    private LocalDateTime activatedAt = LocalDateTime.now();

    // Records when the emergency mode was deactivated; null means it is still active
    @Column(name = "deactivated_at")
    private LocalDateTime deactivatedAt;

    // Controls whether the system should automatically alert the citizen's registered emergency contacts
    // when this emergency mode is activated; defaults to true for maximum safety
    @Column(name = "notify_contacts", nullable = false)
    // Ensures contacts are notified by default unless the citizen explicitly opts out
    @Builder.Default
    private Boolean notifyContacts = true;

    // Stores a JSON blob of offline-cached data (e.g., shelter locations, evacuation routes)
    // so the citizen can access critical DMS information even without network connectivity during a disaster
    @Column(name = "offline_cache", columnDefinition = "jsonb")
    private String offlineCache;

    // Many emergency mode records can belong to one citizen (a citizen may activate/deactivate multiple times)
    // LAZY fetch avoids loading the full Citizen object unless explicitly needed, improving performance
    @ManyToOne(fetch = FetchType.LAZY)
    // Foreign key column linking this emergency mode to its owning citizen in the users table
    @JoinColumn(name = "user_id")
    private Citizen user;

    /**
     * Activates this emergency mode for the citizen.
     * Sets the mode to active, records the citizen's stated reason for the emergency,
     * captures the exact activation timestamp, and clears any previous deactivation time
     * to reflect that the emergency is currently ongoing.
     *
     * @param reason A description of why the citizen is activating emergency mode
     *               (e.g., "Flooding on my street", "Trapped in building")
     */
    public void activate(String reason) {
        // Mark the emergency mode as currently active so response teams and the system treat it as live
        this.isActive = true;
        // Store the citizen's provided reason to give responders situational context
        this.reason = reason;
        // Capture the precise activation time for response time metrics and audit logs
        this.activatedAt = LocalDateTime.now();
        // Clear any prior deactivation timestamp to accurately reflect the current active state
        this.deactivatedAt = null;
    }

    /**
     * Deactivates this emergency mode for the citizen.
     * Marks the mode as inactive and records the deactivation timestamp,
     * indicating the emergency has been resolved or the citizen is now safe.
     * This allows the DMS to close the emergency record and update dashboards accordingly.
     */
    public void deactivate() {
        // Mark the emergency mode as no longer active so it no longer triggers alerts or monitoring
        this.isActive = false;
        // Record when the emergency ended for reporting, SLA tracking, and incident history
        this.deactivatedAt = LocalDateTime.now();
    }
}