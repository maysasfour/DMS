/**
 * AuthEntryPointJwt.java
 *
 * JWT Authentication Entry Point for the Disaster Management System (DMS).
 *
 * This component intercepts requests that reach a secured endpoint without a valid
 * JWT token or with an expired/malformed token. Instead of redirecting to a login
 * page (the default Spring Security behavior for web apps), it returns a structured
 * JSON error response with HTTP 401 Unauthorized — suitable for the DMS REST API
 * consumed by the React frontend and mobile clients.
 *
 * Triggered automatically by Spring Security whenever an unauthenticated user
 * attempts to access a protected DMS resource such as incident reports, user
 * management endpoints, or resource allocation APIs.
 */
package com.dms.security;

// Jackson library used to serialize the error response body into JSON
import com.fasterxml.jackson.databind.ObjectMapper;

// Servlet API types for handling HTTP request/response lifecycle
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

// Spring's media type constants — used to set Content-Type to application/json
import org.springframework.http.MediaType;

// Spring Security exception type thrown when authentication fails or is missing
import org.springframework.security.core.AuthenticationException;

// Contract that this class implements — called by Spring Security on auth failure
import org.springframework.security.web.AuthenticationEntryPoint;

// Marks this class as a Spring-managed bean so it can be injected into SecurityConfig
import org.springframework.stereotype.Component;

// Standard Java I/O exception used by the servlet write operation
import java.io.IOException;

// Used to build the structured JSON error body as key-value pairs
import java.util.HashMap;
import java.util.Map;

/**
 * Registers this class as a Spring component so it is detected during
 * component scanning and can be injected into the DMS security configuration.
 */
@Component
public class AuthEntryPointJwt implements AuthenticationEntryPoint {

    /**
     * Called by Spring Security whenever an unauthenticated request hits a
     * protected DMS endpoint (e.g., POST /api/incidents, GET /api/resources).
     *
     * Overrides the default behavior (redirect to login page) to instead write
     * a JSON error payload directly into the HTTP response — appropriate for
     * the DMS REST API where clients parse JSON, not HTML.
     *
     * @param request       the incoming HTTP request that failed authentication
     * @param response      the HTTP response to populate with the 401 error details
     * @param authException the Spring Security exception describing why authentication failed
     * @throws IOException      if writing to the response output stream fails
     * @throws ServletException if a servlet-level error occurs during processing
     */
    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException, ServletException {

        // Tell the client the response body is JSON, not HTML or plain text
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        // Set HTTP status 401 Unauthorized — signals the client must provide a valid JWT
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);

        // Build the structured error body that the DMS frontend can parse and display
        final Map<String, Object> body = new HashMap<>();

        // Numeric HTTP status code — allows clients to confirm the 401 programmatically
        body.put("status", HttpServletResponse.SC_UNAUTHORIZED);

        // Short human-readable error label consistent with HTTP standard terminology
        body.put("error", "Unauthorized");

        // Detailed message from Spring Security explaining the auth failure reason
        // (e.g., "JWT token is expired", "Full authentication is required")
        body.put("message", authException.getMessage());

        // The DMS API path that was attempted — helps frontend log or display context
        body.put("path", request.getServletPath());

        // Jackson ObjectMapper converts the Map into a JSON string written to the response
        final ObjectMapper mapper = new ObjectMapper();

        // Write the JSON error body directly to the servlet output stream and flush
        mapper.writeValue(response.getOutputStream(), body);
    }
}