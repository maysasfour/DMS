/**
 * AccessDeniedHandlerImpl.java
 *
 * Custom Spring Security handler for authorization failures in the DMS system.
 * This handler is invoked when an authenticated user (e.g., a field officer, team member,
 * or citizen) attempts to access a resource or endpoint they do not have permission to use —
 * for example, a regular officer trying to access admin-only incident management endpoints.
 *
 * Instead of returning an HTML error page (Spring's default behavior), this handler
 * returns a structured JSON response, ensuring API clients (the React frontend, mobile app,
 * or third-party integrations) receive a machine-readable 403 Forbidden payload.
 *
 * Role hierarchy in DMS: ADMIN > OFFICER > TEAM_MEMBER > CITIZEN
 * This handler fires whenever role-based access control (RBAC) rejects a request.
 */
package com.dms.security;

// Jackson library used to serialize the error response body into JSON format
import com.fasterxml.jackson.databind.ObjectMapper;

// Servlet API types representing the incoming HTTP request and outgoing HTTP response
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

// Spring constant for setting the response Content-Type to "application/json"
import org.springframework.http.MediaType;

// Spring Security exception thrown when an authenticated user lacks required permissions
import org.springframework.security.access.AccessDeniedException;

// Spring Security interface that this class implements to handle 403 Forbidden scenarios
import org.springframework.security.web.access.AccessDeniedHandler;

// Marks this class as a Spring-managed bean so it can be injected into SecurityConfig
import org.springframework.stereotype.Component;

// Standard Java I/O exception used when writing the JSON response to the output stream
import java.io.IOException;

// Used to build the structured JSON response body as a key-value map
import java.util.HashMap;
import java.util.Map;

// @Component registers this handler as a Spring bean, allowing SecurityConfig to autowire it
// as the custom access-denied handler for the DMS security filter chain
@Component
public class AccessDeniedHandlerImpl implements AccessDeniedHandler {

    /**
     * Invoked by Spring Security whenever an authenticated DMS user attempts an action
     * beyond their role's privileges — e.g., a CITIZEN trying to close an incident,
     * or a TEAM_MEMBER trying to access the admin user-management endpoints.
     *
     * Writes a 403 Forbidden JSON response instead of redirecting to an error page,
     * keeping the API consistent and parseable by the React frontend.
     *
     * @param request  the incoming HTTP request that was rejected (used to extract the path)
     * @param response the HTTP response to populate with the 403 error payload
     * @param ex       the Spring Security exception describing why access was denied
     * @throws IOException if writing the JSON body to the response output stream fails
     */
    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       AccessDeniedException ex) throws IOException {

        // Set Content-Type to application/json so the DMS frontend can parse the error body
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        // Set HTTP status 403 Forbidden — distinguishes authorization failure from
        // 401 Unauthorized (unauthenticated) so the frontend can respond appropriately
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);

        // Build the structured error response body that will be returned to the caller
        final Map<String, Object> body = new HashMap<>();

        // Numeric HTTP status code — included in body for clients that parse response body directly
        body.put("status", HttpServletResponse.SC_FORBIDDEN);

        // Short machine-readable error label matching standard HTTP error conventions
        body.put("error", "Forbidden");

        // Human-readable message indicating the user is authenticated but lacks sufficient
        // DMS role permissions (e.g., not ADMIN or OFFICER) for the requested operation
        body.put("message", "Access denied: insufficient permissions");

        // The endpoint path that was denied, e.g. "/api/admin/users" or "/api/incidents/{id}/close"
        // Helps frontend developers and logs identify which resource triggered the 403
        body.put("path", request.getServletPath());

        // Serialize the error map to JSON and write it directly to the HTTP response output stream
        // ObjectMapper is instantiated inline since this handler is rarely triggered and is stateless
        new ObjectMapper().writeValue(response.getOutputStream(), body);
    }
}