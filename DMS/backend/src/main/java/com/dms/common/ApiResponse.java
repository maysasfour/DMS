/**
 * ApiResponse.java — Universal HTTP response envelope for the Disaster Management System (DMS).
 *
 * Every REST endpoint in the DMS (incidents, users, resources, alerts, teams, etc.) wraps
 * its payload in this generic class so the frontend always receives a consistent JSON shape:
 * { success, status, message, data, errors, timestamp }.
 *
 * Using a single response contract makes client-side error handling and logging uniform
 * across multilingual portals (citizen, officer, admin) and the mobile app.
 */
package com.dms.common;

// Jackson annotation used to suppress null fields in the serialized JSON response,
// keeping the payload lean (e.g. no "errors: null" when a request succeeds).
import com.fasterxml.jackson.annotation.JsonInclude;

// Lombok annotations: auto-generates getters/setters, builder pattern, and constructors,
// reducing boilerplate and keeping the class focused on its contract.
import lombok.*;

// Used to record exactly when the API response was produced, useful for audit trails
// and debugging time-sensitive operations like alert broadcasts or incident state changes.
import java.time.LocalDateTime;

// @Data — Lombok: generates getters, setters, equals, hashCode, and toString for all fields.
@Data
// @Builder — Lombok: enables a fluent builder API used by every static factory method below.
@Builder
// @NoArgsConstructor — Lombok: generates a no-arg constructor required by Jackson deserialization.
@NoArgsConstructor
// @AllArgsConstructor — Lombok: generates a constructor accepting every field, used by @Builder internally.
@AllArgsConstructor
// Instructs Jackson to omit any field whose value is null from the JSON output,
// so callers only see fields that carry meaningful data (e.g. "data" is absent on errors).
@JsonInclude(JsonInclude.Include.NON_NULL)
// Generic class: T represents the domain payload — could be an Incident, User, Resource, Alert, etc.
public class ApiResponse<T> {

    // Indicates whether the operation succeeded; drives frontend branching (show data vs. show error).
    private boolean success;

    // HTTP status code mirrored inside the body so API consumers can read it without inspecting headers.
    private int status;

    // Human-readable message for the client — e.g. "Incident created successfully" or "Access denied".
    private String message;

    // The actual domain payload (incident details, user profile, resource list, etc.); null on errors.
    private T data;

    // Structured validation or field-level error details; typically a Map or List of constraint violations.
    private Object errors;

    // @Builder.Default ensures the timestamp is initialised to now() when using the builder,
    // recording the exact moment this response was constructed on the server.
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();

    /**
     * Factory method for successful read/query operations (HTTP 200 OK).
     * Use when returning existing DMS resources — e.g. fetching an incident list or a user profile.
     *
     * @param data the domain payload to return to the client
     * @return a 200 OK ApiResponse wrapping the given data
     */
    public static <T> ApiResponse<T> ok(T data) {
        // Build a success response with status 200; no message needed when the data speaks for itself.
        return ApiResponse.<T>builder().success(true).status(200).data(data).build();
    }

    /**
     * Factory method for successful read/query operations with an additional descriptive message (HTTP 200 OK).
     * Useful when a user action completes but context is helpful — e.g. "Location updated successfully".
     *
     * @param data    the domain payload to return
     * @param message a human-readable confirmation message
     * @return a 200 OK ApiResponse with data and message
     */
    public static <T> ApiResponse<T> ok(T data, String message) {
        // Include an optional message alongside the payload for richer client feedback.
        return ApiResponse.<T>builder().success(true).status(200).message(message).data(data).build();
    }

    /**
     * Factory method for successful resource-creation operations (HTTP 201 Created).
     * Use when a new DMS entity is persisted — e.g. a new incident report or a new team is registered.
     *
     * @param data the newly created domain entity
     * @return a 201 Created ApiResponse wrapping the entity
     */
    public static <T> ApiResponse<T> created(T data) {
        // Status 201 signals to the client that a new resource was created, not just read.
        return ApiResponse.<T>builder().success(true).status(201).data(data).build();
    }

    /**
     * Factory method for successful creation with an additional confirmation message (HTTP 201 Created).
     * Example: "Incident #42 has been reported and is pending verification."
     *
     * @param data    the newly created domain entity
     * @param message a human-readable confirmation message
     * @return a 201 Created ApiResponse with data and message
     */
    public static <T> ApiResponse<T> created(T data, String message) {
        return ApiResponse.<T>builder().success(true).status(201).message(message).data(data).build();
    }

    /**
     * Factory method for error responses without structured field-level details (e.g. 404, 403, 500).
     * Use for high-level failures such as "Incident not found" or "Unauthorized access to admin panel".
     *
     * @param status  the HTTP error status code
     * @param message a human-readable error description
     * @return a failure ApiResponse with no data payload
     */
    public static <T> ApiResponse<T> error(int status, String message) {
        // success=false clearly signals the client should not attempt to read the data field.
        return ApiResponse.<T>builder().success(false).status(status).message(message).build();
    }

    /**
     * Factory method for error responses that include structured error details (HTTP 400, 422, etc.).
     * Typically used by validation handlers to surface per-field constraint violations,
     * e.g. missing required fields when creating an incident report.
     *
     * @param status  the HTTP error status code
     * @param message a summary error message
     * @param errors  structured error details (e.g. a Map of field name to error message)
     * @return a failure ApiResponse carrying both a message and structured errors
     */
    public static <T> ApiResponse<T> error(int status, String message, Object errors) {
        // Include structured errors so the frontend can highlight the specific invalid fields.
        return ApiResponse.<T>builder().success(false).status(status).message(message).errors(errors).build();
    }

    /** Legacy helpers kept for backward compatibility */

    /**
     * Legacy success factory — kept so older DMS service calls continue to compile without refactoring.
     * Prefer {@link #ok(Object, String)} for new code.
     *
     * @param message descriptive success message
     * @param data    the domain payload
     * @return a 200 OK ApiResponse
     */
    public static <T> ApiResponse<T> success(String message, T data) {
        // Note: parameter order differs from ok(data, message) — a known inconsistency in the legacy API.
        return ApiResponse.<T>builder().success(true).status(200).message(message).data(data).build();
    }

    /**
     * Legacy error factory that defaults to HTTP 400 Bad Request.
     * Kept for backward compatibility; prefer {@link #error(int, String)} for new code
     * so the status code is explicit.
     *
     * @param message a human-readable error description
     * @return a 400 Bad Request failure ApiResponse
     */
    public static <T> ApiResponse<T> error(String message) {
        // Defaults to 400; callers should migrate to the explicit-status overload for clarity.
        return ApiResponse.<T>builder().success(false).status(400).message(message).build();
    }
}