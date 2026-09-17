/**
 * ResourceStatus.java
 *
 * Defines the lifecycle states of a disaster management resource (e.g., vehicles,
 * equipment, personnel units) within the DMS system. This enum is used throughout
 * the resource allocation and incident response workflows to track and enforce
 * valid state transitions for each resource.
 */

// Declares this file as part of the resource management module
package com.dms.resource;

/**
 * Enum representing all possible operational statuses a DMS resource can hold.
 * Used by resource assignment logic to determine eligibility for deployment
 * to active incidents, as well as by dashboards to surface resource availability.
 */
public enum ResourceStatus {

    /** Resource is idle and ready to be assigned to an incident or team. */
    AVAILABLE,

    /** Resource has been dispatched or linked to an active incident or team. */
    ASSIGNED,

    /** Resource is undergoing repair or scheduled maintenance and cannot be deployed. */
    MAINTENANCE,

    /** Resource is offline or otherwise ineligible for assignment (e.g., retired, broken). */
    UNAVAILABLE
}