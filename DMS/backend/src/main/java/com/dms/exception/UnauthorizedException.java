/**
 * UnauthorizedException.java
 *
 * Custom runtime exception for the Disaster Management System (DMS).
 * Thrown when an authenticated user attempts to access a resource or perform
 * an action they are not permitted to — for example, a regular citizen trying
 * to access admin-only incident management endpoints, or an officer attempting
 * to modify resources outside their jurisdiction.
 *
 * This exception is typically caught by a global exception handler
 * (e.g., @ControllerAdvice) and translated into an HTTP 403 Forbidden response.
 */
package com.dms.exception;

// Base RuntimeException is extended so callers are not forced to declare or catch
// this exception explicitly — it propagates up the call stack until handled globally.
public class UnauthorizedException extends RuntimeException {

    /**
     * Constructs a new UnauthorizedException with a descriptive message.
     *
     * @param message A human-readable explanation of why access was denied,
     *                e.g., "You do not have permission to close this incident."
     */
    public UnauthorizedException(String message) {
        // Delegate the message to RuntimeException so it is available via getMessage()
        // and included in logs and API error responses.
        super(message);
    }
}