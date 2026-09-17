/**
 * BadRequestException.java
 *
 * Custom unchecked exception for the Disaster Management System (DMS).
 * Thrown when a client submits invalid or malformed input — for example,
 * registering a user with a duplicate email, submitting an incident report
 * with missing required fields, or providing an invalid resource ID.
 * This exception is typically mapped to an HTTP 400 Bad Request response
 * by the global exception handler (GlobalExceptionHandler).
 */
package com.dms.exception;

// Extends RuntimeException so callers are not forced to declare or catch it,
// keeping service and controller code clean while still signaling bad input.
public class BadRequestException extends RuntimeException {

    /**
     * Constructs a BadRequestException with a descriptive message explaining
     * what input was invalid — e.g., "Email already in use" or
     * "Incident type must not be null".
     *
     * @param message human-readable explanation of the bad request, forwarded
     *                to the HTTP error response body for the client to act on.
     */
    public BadRequestException(String message) {
        // Passes the message up to RuntimeException so it is accessible via
        // getMessage() when the global handler serializes the error response.
        super(message);
    }
}