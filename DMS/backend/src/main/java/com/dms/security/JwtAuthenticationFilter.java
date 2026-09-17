/**
 * JwtAuthenticationFilter.java
 *
 * Security filter for the Disaster Management System (DMS) that intercepts every
 * incoming HTTP request and validates the JWT (JSON Web Token) attached to it.
 *
 * This filter is a critical gatekeeping layer: before any DMS endpoint (incident
 * reporting, resource management, user administration, alert dispatch, etc.) is
 * reached, it ensures the caller holds a valid, unexpired token issued by the DMS
 * backend. If the token is valid, the authenticated user's identity and roles
 * (e.g., ADMIN, OFFICER, TEAM_MEMBER) are loaded into Spring's SecurityContext
 * so that downstream authorization checks can proceed correctly.
 *
 * Extends OncePerRequestFilter to guarantee the filter runs exactly once per
 * request, even in dispatcher-forward scenarios.
 */
package com.dms.security;

// --- Servlet API imports: provide the filter chain, request/response types, and exception types ---
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

// Lombok: auto-generates a constructor that injects all final fields (jwtTokenProvider, customUserDetailsService)
import lombok.RequiredArgsConstructor;
// Lombok: auto-generates a SLF4J logger field named `log` for structured logging
import lombok.extern.slf4j.Slf4j;

// Spring Security: token type used to represent an authenticated DMS user in the security context
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
// Spring Security: thread-local holder that stores the current user's authentication for the duration of the request
import org.springframework.security.core.context.SecurityContextHolder;
// Spring Security: contract describing the authenticated principal (username, password hash, granted authorities/roles)
import org.springframework.security.core.userdetails.UserDetails;
// Spring Security: builds supplemental request metadata (IP address, session ID) attached to the authentication token
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
// Spring utility for null-safe text presence checks (avoids NPE on missing headers)
import org.springframework.util.StringUtils;
// Spring base class ensuring this filter executes only once per HTTP request
import org.springframework.web.filter.OncePerRequestFilter;

// Standard Java I/O exception used in the filter signature
import java.io.IOException;

/**
 * Activates SLF4J logging via Lombok — the generated `log` field is used to
 * record authentication failures without exposing token details to callers.
 * Lombok also generates the required-args constructor so Spring can inject
 * the two collaborator beans declared below.
 */
@Slf4j
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    // DMS-specific JWT utility: signs, validates, and parses tokens issued at login
    private final JwtTokenProvider jwtTokenProvider;

    // DMS-specific UserDetails loader: fetches the DMS user (including role/permissions) from the database by username
    private final CustomUserDetailsService customUserDetailsService;

    /**
     * Core filter method invoked once per HTTP request to the DMS API.
     * Extracts the JWT from the Authorization header, validates it, loads the
     * corresponding DMS user (responder, admin, etc.), and populates the
     * SecurityContext so Spring Security can enforce role-based access control
     * on endpoints such as /api/incidents, /api/resources, /api/users, etc.
     *
     * @param request     the incoming HTTP request (may carry an Authorization header)
     * @param response    the HTTP response (not modified here; passed down the chain)
     * @param filterChain the remaining filter chain — must be invoked to continue processing
     * @throws ServletException if a servlet-level error occurs while chaining
     * @throws IOException      if an I/O error occurs while chaining
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            // Attempt to extract the raw JWT string from the "Authorization: Bearer <token>" header
            String jwt = getJwtFromRequest(request);

            // Only proceed if a token is present and passes signature/expiry validation
            if (StringUtils.hasText(jwt) && jwtTokenProvider.validateToken(jwt)) {

                // Decode the token to obtain the DMS username (email or login ID) embedded in its claims
                String username = jwtTokenProvider.getUsernameFromToken(jwt);

                // Load the full DMS user record (roles: ADMIN, OFFICER, TEAM_MEMBER, etc.) from the database
                UserDetails userDetails = customUserDetailsService.loadUserByUsername(username);

                // Build a Spring Security authentication token using the loaded user's identity and granted authorities
                // Credentials (password) are set to null here — JWT presence already proves identity
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

                // Attach extra request metadata (remote IP, session ID) to the token for audit/logging purposes
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                // Publish the authenticated user into the thread-local SecurityContext so downstream
                // Spring Security annotations (@PreAuthorize, etc.) can evaluate the user's roles
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
            // If jwt is null or invalid, no authentication is set — Spring Security will enforce access rules
            // on the unauthenticated request (e.g., 401 Unauthorized for protected DMS endpoints)

        } catch (Exception ex) {
            // Log the failure without rethrowing — the filter chain must continue so Spring Security
            // can return a proper 401/403 response rather than a 500 error
            log.error("Could not set user authentication in security context", ex);
        }

        // Always pass the request down the filter chain, whether authenticated or not
        filterChain.doFilter(request, response);
    }

    /**
     * Extracts the JWT string from the HTTP "Authorization" header.
     * DMS clients send tokens in the standard Bearer scheme:
     *   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     *
     * @param request the incoming HTTP request whose headers are inspected
     * @return the raw JWT string (without the "Bearer " prefix), or null if absent or malformed
     */
    private String getJwtFromRequest(HttpServletRequest request) {
        // Read the Authorization header sent by the DMS frontend or mobile client
        String bearerToken = request.getHeader("Authorization");

        // Validate that the header is non-empty and follows the "Bearer <token>" format
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            // Strip the 7-character "Bearer " prefix to isolate the raw JWT for validation
            return bearerToken.substring(7);
        }

        // Return null if the header is missing or does not carry a Bearer token
        return null;
    }
}