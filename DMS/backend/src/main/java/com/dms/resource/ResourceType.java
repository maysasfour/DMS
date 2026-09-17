/*
 * ResourceType.java
 *
 * Defines the enumeration of all recognized resource categories within the
 * Disaster Management System (DMS). Each constant represents a distinct type
 * of deployable asset that can be dispatched, tracked, and managed during
 * disaster incidents. This enum is used across resource allocation, incident
 * response workflows, and reporting to classify and filter available resources.
 */

// Declares this file as part of the DMS resource management package
package com.dms.resource;

/**
 * Enumeration of deployable resource types available in the DMS.
 *
 * <p>Each constant identifies a category of physical or human resource that
 * can be assigned to an incident. The type drives UI filtering, dispatch
 * logic, and capacity reporting throughout the system.</p>
 */
public enum ResourceType {

    /** Emergency medical transport vehicle; dispatched to injury or mass-casualty incidents. */
    AMBULANCE,

    /** Fire-suppression apparatus; assigned to fire-related or hazmat incidents. */
    FIRE_TRUCK,

    /** Mobile medical personnel unit; provides on-site triage and treatment at disaster scenes. */
    MEDICAL_TEAM,

    /** Search-and-rescue crew; deployed for victim extraction in structural collapses, floods, etc. */
    RESCUE_TEAM,

    /** Temporary refuge facility; activated to house displaced civilians during or after a disaster. */
    SHELTER,

    /** General relief materials (food, water, equipment); tracked and distributed to affected areas. */
    SUPPLIES
}