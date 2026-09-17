/*
 * IncidentValidator.java
 *
 * Purpose: Provides input validation logic for incident creation and status updates
 * within the Disaster Management System (DMS). This component enforces business rules
 * and security constraints on incoming incident data before it is persisted, including:
 *  - Mandatory field presence and length boundaries for title, description, and contact info
 *  - Whitelist-based validation for severity levels, incident types, and lifecycle statuses
 *  - Geographic coordinate range checks to ensure valid latitude/longitude values
 *  - Protection against SQL injection and XSS attacks in free-text fields
 *
 * Used by: IncidentService (or IncidentController) prior to creating or updating incidents.
 */
package com.dms.incident;

// Custom exception thrown when the client submits invalid or malformed incident data
import com.dms.exception.BadRequestException;
// Marks this class as a Spring-managed bean so it can be injected wherever validation is needed
import org.springframework.stereotype.Component;

// Immutable set used for O(1) whitelist membership checks on enumerated values
import java.util.Set;
// Compiled regex pattern for efficient repeated matching of phone numbers and injection patterns
import java.util.regex.Pattern;

/**
 * Spring component responsible for validating incident-related input in the DMS.
 * Ensures that all submitted incident data meets structural, domain, and security requirements
 * before any persistence or business logic is executed.
 */
// @Component registers this class as a Spring bean, enabling dependency injection across the application
@Component
public class IncidentValidator {

    // Allowed severity levels representing the urgency of a disaster incident (case-insensitive comparison applied at use site)
    private static final Set<String> VALID_SEVERITIES = Set.of("LOW", "MEDIUM", "HIGH", "CRITICAL");

    // Allowed incident type categories covering the main disaster and emergency scenarios handled by the DMS
    private static final Set<String> VALID_TYPES = Set.of(
        "FIRE", "FLOOD", "EARTHQUAKE", "STORM", "ACCIDENT",
        "MEDICAL", "HAZMAT", "OTHER"
    );

    // Allowed lifecycle statuses reflecting the operational workflow of an incident from report to closure
    private static final Set<String> VALID_STATUSES = Set.of(
        "REPORTED", "IN_PROGRESS", "RESOLVED", "CLOSED"
    );

    // Basic phone validation (international format)
    // Compiled once at class-load time; accepts optional leading '+', digits, spaces, dashes, and parentheses (7–20 chars)
    private static final Pattern PHONE_PATTERN = Pattern.compile("^\\+?[\\d\\s\\-()]{7,20}$");

    // SQL injection basic pattern
    // Case-insensitive regex that detects common SQL keywords and comment sequences used in injection attacks
    private static final Pattern SQL_INJECTION_PATTERN = Pattern.compile(
        "(?i)(\\bSELECT\\b|\\bDROP\\b|\\bINSERT\\b|\\bDELETE\\b|\\bUPDATE\\b|\\bUNION\\b|--|;\\s*--|/\\*|\\*/|\\bEXEC\\b|\\bXP_\\b|\\bSCRIPT\\b)"
    );

    // XSS basic pattern
    // Detects HTML tags and JavaScript event-handler patterns that could execute malicious scripts if stored and rendered
    private static final Pattern XSS_PATTERN = Pattern.compile(
        "(?i)(<script|javascript:|on\\w+\\s*=|<iframe|<object|<embed|<link|<meta|data:text/html)",
        Pattern.CASE_INSENSITIVE
    );

    /**
     * Validates all fields of an incoming incident creation request.
     * Throws {@link BadRequestException} for the first validation failure encountered,
     * providing a descriptive error message suitable for API responses.
     *
     * @param req the IncidentDTO carrying the user-submitted incident data
     */
    public void validateCreate(IncidentDTO req) {
        // --- Title validation ---
        // Retrieve the incident title as submitted by the reporter
        String title = req.getTitle();
        // Reject null or blank titles — a meaningful title is mandatory for dispatchers to triage the incident
        if (title == null || title.isBlank()) {
            throw new BadRequestException("Incident title is required");
        }
        // Strip surrounding whitespace before applying length checks to avoid false failures
        title = title.trim();
        // Enforce a minimum length to ensure the title carries useful information (e.g., "Fire" alone is too vague)
        if (title.length() < 5) {
            throw new BadRequestException("Incident title must be at least 5 characters");
        }
        // Cap length to prevent oversized payloads from straining storage or display components
        if (title.length() > 200) {
            throw new BadRequestException("Incident title must not exceed 200 characters");
        }
        // Scan for SQL injection and XSS patterns that could compromise the database or frontend rendering
        checkInjection(title, "title");

        // --- Description validation ---
        // Retrieve the detailed narrative of the incident provided by the reporter
        String description = req.getDescription();
        // A description is mandatory — without it, responders lack context to assess the situation
        if (description == null || description.isBlank()) {
            throw new BadRequestException("Incident description is required");
        }
        // Normalize whitespace before length evaluation
        description = description.trim();
        // Require at least 10 characters so the description contains substantive information about the incident
        if (description.length() < 10) {
            throw new BadRequestException("Description must be at least 10 characters. Please provide details about the incident.");
        }
        // Limit to 5000 characters to guard against excessively large text bodies in the database
        if (description.length() > 5000) {
            throw new BadRequestException("Description must not exceed 5000 characters");
        }
        // Protect against malicious content injected through the free-text description field
        checkInjection(description, "description");

        // --- Severity validation ---
        // Severity is optional on creation (may be assigned later by an operator), but if provided it must be a known value
        String severity = req.getSeverity();
        // Only validate non-blank severity values; null or empty means the reporter did not specify urgency
        if (severity != null && !severity.isBlank() && !VALID_SEVERITIES.contains(severity.toUpperCase())) {
            throw new BadRequestException("Invalid severity value. Must be one of: LOW, MEDIUM, HIGH, CRITICAL");
        }

        // --- Type / Category validation ---
        // Support both 'type' and legacy 'category' field names for backward compatibility with older API clients
        String type = req.getType() != null ? req.getType() : req.getCategory();
        // Validate against the DMS-defined disaster type whitelist only when a value is actually supplied
        if (type != null && !type.isBlank() && !VALID_TYPES.contains(type.toUpperCase())) {
            throw new BadRequestException("Invalid incident type. Must be one of: FIRE, FLOOD, EARTHQUAKE, STORM, ACCIDENT, MEDICAL, HAZMAT, OTHER");
        }

        // --- Geographic coordinate validation ---
        // Latitude is optional, but if provided it must fall within the valid WGS-84 range (-90 to +90 degrees)
        if (req.getLatitude() != null) {
            // Out-of-range latitude would place the incident at an impossible geographic location
            if (req.getLatitude() < -90 || req.getLatitude() > 90) {
                throw new BadRequestException("Latitude must be between -90 and 90");
            }
        }
        // Longitude is optional, but if provided it must fall within the valid WGS-84 range (-180 to +180 degrees)
        if (req.getLongitude() != null) {
            // Out-of-range longitude would break map rendering and geospatial queries in the DMS
            if (req.getLongitude() < -180 || req.getLongitude() > 180) {
                throw new BadRequestException("Longitude must be between -180 and 180");
            }
        }

        // Contact phone (optional, but validated if provided)
        // Retrieve the reporter's or on-site contact's phone number for emergency follow-up
        String phone = req.getContactPhone();
        // Apply the international phone pattern only when a non-blank value is present
        if (phone != null && !phone.isBlank() && !PHONE_PATTERN.matcher(phone.trim()).matches()) {
            throw new BadRequestException("Contact phone number format is invalid");
        }

        // --- Address field length caps ---
        // Free-text address of the incident site; capped to prevent database column overflow
        if (req.getAddress() != null && req.getAddress().length() > 500) {
            throw new BadRequestException("Address must not exceed 500 characters");
        }
        // City name where the incident occurred; short cap consistent with typical city name lengths
        if (req.getCity() != null && req.getCity().length() > 100) {
            throw new BadRequestException("City must not exceed 100 characters");
        }

        // Contact name (optional); capped to a reasonable person-name length for storage consistency
        if (req.getContactName() != null && req.getContactName().length() > 100) {
            throw new BadRequestException("Contact name must not exceed 100 characters");
        }
    }

    /**
     * Validates a proposed status transition value for an existing incident.
     * Used when officers or admins advance an incident through its operational lifecycle
     * (e.g., from REPORTED to IN_PROGRESS after response teams are dispatched).
     *
     * @param status the raw status string submitted by the client
     */
    public void validateStatusUpdate(String status) {
        // A status value must be explicitly provided — null or blank implies no transition intent
        if (status == null || status.isBlank()) {
            throw new BadRequestException("Status value is required");
        }
        // Reject any status string that does not match the DMS incident lifecycle whitelist
        if (!VALID_STATUSES.contains(status.toUpperCase())) {
            throw new BadRequestException("Invalid status. Must be one of: REPORTED, IN_PROGRESS, RESOLVED, CLOSED");
        }
    }

    /**
     * Checks a given text value for SQL injection and XSS attack patterns.
     * Called on every free-text field (title, description) before persisting incident data,
     * acting as a last line of defense against malicious input reaching the database or browser.
     *
     * @param value     the string to inspect
     * @param fieldName the human-readable field name included in the error message for clarity
     */
    private void checkInjection(String value, String fieldName) {
        // Detect SQL keywords that suggest an attempt to manipulate the underlying incident database
        if (SQL_INJECTION_PATTERN.matcher(value).find()) {
            throw new BadRequestException("Field '" + fieldName + "' contains invalid characters or patterns");
        }
        // Detect HTML/script tags that could execute in a browser if the stored value is rendered without escaping
        if (XSS_PATTERN.matcher(value).find()) {
            throw new BadRequestException("Field '" + fieldName + "' contains potentially dangerous HTML or script content");
        }
    }
}