/**
 * GlobalExceptionHandler.java
 *
 * Centralized exception handling for the Disaster Management System (DMS) backend API.
 * This class intercepts exceptions thrown by any controller across the application
 * (incident reporting, user management, resource allocation, alerts, etc.) and converts
 * them into consistent, structured ApiResponse error payloads with appropriate HTTP status codes.
 *
 * By centralizing error handling here, individual DMS controllers remain clean and focused
 * on business logic without repetitive try-catch blocks.
 */
package com.dms.exception;

// Imports the standard DMS API response wrapper used for uniform JSON error responses
import com.dms.common.ApiResponse;

// Lombok annotation that injects a SLF4J logger (used for server-side error logging)
import lombok.extern.slf4j.Slf4j;

// Spring HTTP status codes (404, 400, 401, 403, 500, etc.) for setting response status
import org.springframework.http.HttpStatus;

// Wraps the response body and HTTP status into a single return value
import org.springframework.http.ResponseEntity;

// Spring Security exception thrown when a user tries to access a resource they lack permission for
import org.springframework.security.access.AccessDeniedException;

// Thrown during authentication when the provided email/password credentials are invalid
import org.springframework.security.authentication.BadCredentialsException;

// Thrown when a DMS user account has been disabled by an administrator
import org.springframework.security.authentication.DisabledException;

// Base Spring Security exception for all authentication failures
import org.springframework.security.core.AuthenticationException;

// Represents a single field-level validation failure (e.g., missing incident title, invalid phone)
import org.springframework.validation.FieldError;

// Thrown when a @Valid-annotated request body fails Bean Validation constraints
import org.springframework.web.bind.MethodArgumentNotValidException;

// Marks this class as a global exception handler visible to all controllers in the application
import org.springframework.web.bind.annotation.ControllerAdvice;

// Maps a specific exception type to a handler method in this advice class
import org.springframework.web.bind.annotation.ExceptionHandler;

// Thrown when a path/query parameter cannot be converted to the expected type (e.g., non-numeric incident ID)
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

// Used to collect multiple validation error messages keyed by field name
import java.util.HashMap;
import java.util.Map;

// Activates SLF4J logging via Lombok; injects a `log` field for recording unhandled exceptions
@Slf4j
// Marks this class as a global controller advice — Spring applies it to all @RestController classes in DMS
@ControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Handles cases where a DMS resource (incident, user, team, resource) could not be found.
     * Returns HTTP 404 with the exception's descriptive message (e.g., "Incident #42 not found").
     */
    @ExceptionHandler(ResourceNotFoundException.class) // Intercepts DMS-specific not-found errors
    public ResponseEntity<ApiResponse<Void>> handleResourceNotFound(ResourceNotFoundException ex) {
        // Wrap the not-found message into a 404 API error response and return it
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(ApiResponse.error(404, ex.getMessage()));
    }

    /**
     * Handles malformed or logically invalid requests from clients (e.g., duplicate incident report,
     * invalid status transition for an alert). Returns HTTP 400 with the exception's message.
     */
    @ExceptionHandler(BadRequestException.class) // Intercepts DMS-specific bad-request errors
    public ResponseEntity<ApiResponse<Void>> handleBadRequest(BadRequestException ex) {
        // Return a 400 Bad Request response with the domain-specific error description
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiResponse.error(400, ex.getMessage()));
    }

    /**
     * Handles DMS-specific unauthorized access attempts (e.g., accessing incident details
     * without a valid JWT token). Returns HTTP 401.
     */
    @ExceptionHandler(UnauthorizedException.class) // Intercepts DMS-specific unauthorized errors
    public ResponseEntity<ApiResponse<Void>> handleUnauthorized(UnauthorizedException ex) {
        // Return a 401 Unauthorized response with the relevant error message
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(ApiResponse.error(401, ex.getMessage()));
    }

    /**
     * Handles failed login attempts where the submitted email or password does not match
     * any DMS user account. Returns a generic message to avoid leaking account existence.
     */
    @ExceptionHandler(BadCredentialsException.class) // Intercepts Spring Security credential failures
    public ResponseEntity<ApiResponse<Void>> handleBadCredentials(BadCredentialsException ex) {
        // Use a fixed, non-revealing error message to prevent user enumeration attacks
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(ApiResponse.error(401, "Invalid email or password"));
    }

    /**
     * Handles login attempts by DMS users whose accounts have been deactivated by an admin.
     * A disabled account may indicate a suspended officer, team member, or citizen reporter.
     */
    @ExceptionHandler(DisabledException.class) // Intercepts Spring Security disabled-account errors
    public ResponseEntity<ApiResponse<Void>> handleDisabled(DisabledException ex) {
        // Inform the client that the account exists but has been disabled
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(ApiResponse.error(401, "Account is disabled"));
    }

    /**
     * Catches any remaining Spring Security authentication exceptions not handled above
     * (e.g., expired tokens, locked accounts). Returns HTTP 401 with the exception message.
     */
    @ExceptionHandler(AuthenticationException.class) // Catches all other Spring Security auth failures
    public ResponseEntity<ApiResponse<Void>> handleAuthentication(AuthenticationException ex) {
        // Propagate the authentication failure message back to the client
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(ApiResponse.error(401, ex.getMessage()));
    }

    /**
     * Handles authorization failures where an authenticated DMS user tries to perform
     * an action they are not permitted to do (e.g., a citizen trying to close an incident,
     * or a team member accessing the admin panel). Returns HTTP 403.
     */
    @ExceptionHandler(AccessDeniedException.class) // Intercepts Spring Security authorization failures
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
        // Return a 403 Forbidden with a clear message indicating insufficient role/permission
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(ApiResponse.error(403, "Access denied: insufficient permissions"));
    }

    /**
     * Handles Bean Validation failures on incoming request bodies (e.g., a missing incident
     * description, invalid GPS coordinates, or a phone number that fails format validation).
     * Collects all field-level errors and returns them as a map for the client to display.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class) // Intercepts @Valid constraint violations
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidation(MethodArgumentNotValidException ex) {
        // Accumulate field name -> error message pairs for all constraint violations
        Map<String, String> errors = new HashMap<>();
        // Iterate over every validation error in the binding result
        for (var err : ex.getBindingResult().getAllErrors()) {
            // Cast to FieldError to retrieve the specific field that failed validation
            String field = ((FieldError) err).getField();
            // Map the field name to its human-readable validation message
            errors.put(field, err.getDefaultMessage());
        }
        // Return 400 with all field validation errors so the client can highlight them in the UI
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiResponse.error(400, "Validation failed", errors));
    }

    /**
     * Handles type conversion failures for path or query parameters
     * (e.g., passing "abc" where a numeric incident ID is expected in /incidents/{id}).
     * Returns HTTP 400 identifying the offending parameter name.
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class) // Intercepts parameter type conversion errors
    public ResponseEntity<ApiResponse<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        // Include the parameter name in the error to help clients diagnose the malformed request
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiResponse.error(400, "Invalid parameter: " + ex.getName()));
    }

    /**
     * Catch-all handler for any unexpected exception not covered by the more specific handlers above.
     * Logs the full stack trace server-side for debugging, but returns a generic 500 message to the
     * client to avoid leaking internal implementation details of the DMS backend.
     */
    @ExceptionHandler(Exception.class) // Last-resort handler for any unhandled runtime exception
    public ResponseEntity<ApiResponse<Void>> handleGeneral(Exception ex) {
        // Log the full exception with stack trace for server-side investigation (never expose to client)
        log.error("Unhandled exception: {}", ex.getMessage(), ex);
        // Return a generic 500 Internal Server Error without revealing internal details
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ApiResponse.error(500, "Internal server error"));
    }
}