package com.dms.incident;

/**
 * IncidentStatus.java
 *
 * Defines the lifecycle states of a disaster incident within the DMS.
 * Each incident progresses through these statuses from initial report
 * to final closure, allowing dispatchers, officers, and teams to track
 * the current handling stage of any active or resolved disaster event.
 */

// Enum grouping all valid status values an incident record can hold
public enum IncidentStatus {

    // Incident has been reported but no response action has been taken yet
    OPEN,

    // Incident is actively being handled by assigned officers or response teams
    IN_PROGRESS,

    // The disaster situation has been contained and the immediate threat is addressed
    RESOLVED,

    // Incident record has been fully processed, reviewed, and archived — no further action required
    CLOSED
}