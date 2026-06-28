package com.dms.dashboard;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DashboardDTO {
    private long totalIncidents;
    private long activeIncidents;     // IN_PROGRESS
    private long resolvedIncidents;   // RESOLVED
    private long openIncidents;       // OPEN
    private long criticalIncidents;
    private long availableResources;
    private long assignedResources;
    private long totalUsers;
}
