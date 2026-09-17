/**
 * DashboardDTO.java
 *
 * Data Transfer Object used by the DMS dashboard API to aggregate and expose
 * key system-wide statistics to the frontend. This object is constructed
 * server-side and sent as a JSON response to authorized dashboard viewers
 * (admins, coordinators) to provide a real-time operational overview of
 * incidents, resources, and registered users in the disaster management system.
 */
package com.dms.dashboard;

// Lombok imports: reduce boilerplate by auto-generating getters, setters, equals, hashCode, toString, and builder pattern
import lombok.Builder;
import lombok.Data;

// @Data: Lombok annotation that auto-generates getters, setters, equals(), hashCode(), and toString() for all fields
@Data
// @Builder: Lombok annotation that generates a static builder pattern, allowing clean construction of DashboardDTO instances
@Builder
public class DashboardDTO {

    // Total number of incidents ever reported in the system (all statuses combined)
    private long totalIncidents;

    // Number of incidents currently being actively handled by response teams — status: IN_PROGRESS
    private long activeIncidents;     // IN_PROGRESS

    // Number of incidents that have been closed and resolved — status: RESOLVED
    private long resolvedIncidents;   // RESOLVED

    // Number of newly reported incidents awaiting assignment or action — status: OPEN
    private long openIncidents;       // OPEN

    // Number of incidents flagged as critical severity, requiring immediate prioritization
    private long criticalIncidents;

    // Number of disaster-response resources (vehicles, equipment, personnel units) currently not deployed
    private long availableResources;

    // Number of resources currently assigned to active incidents and therefore unavailable
    private long assignedResources;

    // Total number of registered users in the DMS platform (citizens, officers, admins, team members)
    private long totalUsers;
}