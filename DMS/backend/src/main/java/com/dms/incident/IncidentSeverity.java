/**
 * IncidentSeverity.java
 *
 * Defines the severity classification levels for disaster incidents in the DMS system.
 * This enum is used throughout the system to prioritize incident response, trigger alerts,
 * and determine resource allocation — e.g., CRITICAL incidents may auto-escalate to all
 * available response teams, while LOW severity incidents may be queued for routine handling.
 */

// Declares this file as part of the incident management module
package com.dms.incident;

/**
 * Enumeration of possible severity levels for a reported disaster incident.
 * Severity is assigned at report time and may be updated by officers as the situation evolves.
 * Higher severity levels (HIGH, CRITICAL) typically trigger immediate notifications and
 * resource dispatch workflows in the DMS.
 */
public enum IncidentSeverity {

    /** Low-priority incident; minimal threat to life or property. Routine monitoring is sufficient. */
    LOW,

    /** Moderate severity; situation requires active monitoring and may need limited resource deployment. */
    MEDIUM,

    /** High-severity incident; significant threat requiring prompt multi-team response and resource allocation. */
    HIGH,

    /** Critical emergency; immediate full-scale response required. Triggers top-level alerts to all officers and administrators. */
    CRITICAL
}