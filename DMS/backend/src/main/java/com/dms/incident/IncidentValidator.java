package com.dms.incident;

import com.dms.exception.BadRequestException;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.regex.Pattern;

@Component
public class IncidentValidator {

    private static final Set<String> VALID_SEVERITIES = Set.of("LOW", "MEDIUM", "HIGH", "CRITICAL");
    private static final Set<String> VALID_TYPES = Set.of(
        "FIRE", "FLOOD", "EARTHQUAKE", "STORM", "ACCIDENT",
        "MEDICAL", "HAZMAT", "OTHER"
    );
    private static final Set<String> VALID_STATUSES = Set.of(
        "REPORTED", "IN_PROGRESS", "RESOLVED", "CLOSED"
    );

    // Detect obvious test/junk inputs
    private static final Pattern TEST_PATTERN = Pattern.compile(
        "^(test|testing|abc|hello|hi|sample|dummy|asdf|qwerty|xxx|yyy|zzz|1234|lol|foo|bar|baz)\\b.*",
        Pattern.CASE_INSENSITIVE
    );

    // Basic phone validation (international format)
    private static final Pattern PHONE_PATTERN = Pattern.compile("^\\+?[\\d\\s\\-()]{7,20}$");

    // SQL injection basic pattern
    private static final Pattern SQL_INJECTION_PATTERN = Pattern.compile(
        "(?i)(\\bSELECT\\b|\\bDROP\\b|\\bINSERT\\b|\\bDELETE\\b|\\bUPDATE\\b|\\bUNION\\b|--|;\\s*--|/\\*|\\*/|\\bEXEC\\b|\\bXP_\\b|\\bSCRIPT\\b)"
    );

    // XSS basic pattern
    private static final Pattern XSS_PATTERN = Pattern.compile(
        "(?i)(<script|javascript:|on\\w+\\s*=|<iframe|<object|<embed|<link|<meta|data:text/html)",
        Pattern.CASE_INSENSITIVE
    );

    public void validateCreate(IncidentDTO req) {
        // Title
        String title = req.getTitle();
        if (title == null || title.isBlank()) {
            throw new BadRequestException("Incident title is required");
        }
        title = title.trim();
        if (title.length() < 5) {
            throw new BadRequestException("Incident title must be at least 5 characters");
        }
        if (title.length() > 200) {
            throw new BadRequestException("Incident title must not exceed 200 characters");
        }
        if (TEST_PATTERN.matcher(title).matches()) {
            throw new BadRequestException("Title appears to be a test submission. Please provide a real incident title.");
        }
        checkInjection(title, "title");

        // Description
        String description = req.getDescription();
        if (description == null || description.isBlank()) {
            throw new BadRequestException("Incident description is required");
        }
        description = description.trim();
        if (description.length() < 10) {
            throw new BadRequestException("Description must be at least 10 characters. Please provide details about the incident.");
        }
        if (description.length() > 5000) {
            throw new BadRequestException("Description must not exceed 5000 characters");
        }
        checkInjection(description, "description");

        // Severity
        String severity = req.getSeverity();
        if (severity != null && !severity.isBlank() && !VALID_SEVERITIES.contains(severity.toUpperCase())) {
            throw new BadRequestException("Invalid severity value. Must be one of: LOW, MEDIUM, HIGH, CRITICAL");
        }

        // Type
        String type = req.getType() != null ? req.getType() : req.getCategory();
        if (type != null && !type.isBlank() && !VALID_TYPES.contains(type.toUpperCase())) {
            throw new BadRequestException("Invalid incident type. Must be one of: FIRE, FLOOD, EARTHQUAKE, STORM, ACCIDENT, MEDICAL, HAZMAT, OTHER");
        }

        // Coordinates
        if (req.getLatitude() != null) {
            if (req.getLatitude() < -90 || req.getLatitude() > 90) {
                throw new BadRequestException("Latitude must be between -90 and 90");
            }
        }
        if (req.getLongitude() != null) {
            if (req.getLongitude() < -180 || req.getLongitude() > 180) {
                throw new BadRequestException("Longitude must be between -180 and 180");
            }
        }

        // Contact phone (optional, but validated if provided)
        String phone = req.getContactPhone();
        if (phone != null && !phone.isBlank() && !PHONE_PATTERN.matcher(phone.trim()).matches()) {
            throw new BadRequestException("Contact phone number format is invalid");
        }

        // Address fields
        if (req.getAddress() != null && req.getAddress().length() > 500) {
            throw new BadRequestException("Address must not exceed 500 characters");
        }
        if (req.getCity() != null && req.getCity().length() > 100) {
            throw new BadRequestException("City must not exceed 100 characters");
        }

        // Contact name
        if (req.getContactName() != null && req.getContactName().length() > 100) {
            throw new BadRequestException("Contact name must not exceed 100 characters");
        }
    }

    public void validateStatusUpdate(String status) {
        if (status == null || status.isBlank()) {
            throw new BadRequestException("Status value is required");
        }
        if (!VALID_STATUSES.contains(status.toUpperCase())) {
            throw new BadRequestException("Invalid status. Must be one of: REPORTED, IN_PROGRESS, RESOLVED, CLOSED");
        }
    }

    private void checkInjection(String value, String fieldName) {
        if (SQL_INJECTION_PATTERN.matcher(value).find()) {
            throw new BadRequestException("Field '" + fieldName + "' contains invalid characters or patterns");
        }
        if (XSS_PATTERN.matcher(value).find()) {
            throw new BadRequestException("Field '" + fieldName + "' contains potentially dangerous HTML or script content");
        }
    }
}
