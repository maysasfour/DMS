/**
 * ResourceNotFoundException.java
 *
 * Custom unchecked exception used throughout the DMS (Disaster Management System)
 * to signal that a requested resource — such as an incident, user, alert, or
 * emergency resource — could not be found in the database or data store.
 *
 * Throwing this exception allows the global exception handler (e.g., a
 * @ControllerAdvice class) to intercept it and return a meaningful HTTP 404
 * response to API clients, rather than exposing raw JPA/Hibernate errors.
 *
 * Typical usage: throw new ResourceNotFoundException("Incident not found with id: " + id);
 */
package com.dms.exception;

// Extends RuntimeException so callers are not forced to declare or catch it (unchecked),
// keeping DMS service and controller code clean while still propagating lookup failures.
public class ResourceNotFoundException extends RuntimeException {

    /**
     * Constructs a new ResourceNotFoundException with a descriptive message.
     *
     * @param message Human-readable explanation of which DMS resource was missing,
     *                e.g. "User not found with email: admin@dms.org" or
     *                "Incident not found with id: 42". This message is forwarded
     *                to the RuntimeException base class and is typically included
     *                in the HTTP 404 error response body returned to clients.
     */
    public ResourceNotFoundException(String message) {
        // Delegate the message to RuntimeException so it is accessible via getMessage()
        // and appears in stack traces and API error responses.
        super(message);
    }
}