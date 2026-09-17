/**
 * SecurityHeadersFilter.java
 *
 * HTTP security headers filter for the Disaster Management System (DMS) backend.
 *
 * This filter intercepts every incoming HTTP request exactly once and injects
 * a comprehensive set of security response headers before the request reaches
 * any controller or resource endpoint. It defends DMS against common web
 * vulnerabilities including XSS, clickjacking, MIME sniffing, path traversal,
 * and mixed-content attacks — critical protections given that the system handles
 * sensitive incident reports, responder locations, and citizen user data.
 *
 * It also enforces a strict Content Security Policy (CSP) that whitelists only
 * the external services DMS legitimately uses: OpenStreetMap tiles for incident
 * mapping, NASA/USGS feeds for natural disaster data, and Facebook/Google OAuth
 * for user authentication.
 */
package com.dms.security;

// Servlet API imports — required to intercept the HTTP request/response lifecycle
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

// Spring framework imports — for null-safety annotation and component registration
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

// Standard Java I/O — needed for IOException declared by the filter contract
import java.io.IOException;

/**
 * Registers this class as a Spring-managed bean so it is automatically
 * discovered and wired into the servlet filter chain without explicit
 * configuration in SecurityConfig.
 */
@Component
/**
 * Extends OncePerRequestFilter to guarantee the security headers are applied
 * exactly once per request, even in filter chains that might forward or include
 * sub-requests internally (e.g., Spring MVC error handling).
 */
public class SecurityHeadersFilter extends OncePerRequestFilter {

    /**
     * Core filter method called by Spring for every HTTP request reaching the DMS backend.
     * Applies all security headers to the response, validates the request URI for
     * path traversal attacks, then passes control to the next filter or servlet
     * in the chain.
     *
     * @param request  the incoming HTTP request (never null) — may carry incident data, auth tokens, etc.
     * @param response the outgoing HTTP response (never null) — headers are added here before body is written
     * @param chain    the remaining filter/servlet chain — must be invoked to complete normal request processing
     * @throws ServletException if a servlet-level error occurs downstream
     * @throws IOException      if an I/O error occurs while writing the error response
     */
    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain)
            throws ServletException, IOException {

        // Prevents browsers from MIME-type sniffing responses away from the declared Content-Type,
        // which could cause browsers to misinterpret a DMS JSON incident payload as executable script.
        response.setHeader("X-Content-Type-Options", "nosniff");

        // Blocks the DMS portal from being embedded in an <iframe> on a third-party site,
        // preventing clickjacking attacks that could trick responders into unintended actions.
        response.setHeader("X-Frame-Options", "DENY");

        // Instructs legacy browsers to activate their built-in XSS filter and block the page
        // if a reflected XSS attack is detected — a secondary defence for older browser clients.
        response.setHeader("X-XSS-Protection", "1; mode=block");

        // Controls how much referrer information is sent when a DMS user navigates away;
        // "strict-origin-when-cross-origin" sends the full URL for same-origin but only the
        // origin for cross-origin requests, preventing leakage of sensitive URL parameters
        // (e.g., incident IDs or token fragments) to third-party services.
        response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

        // Grants DMS itself permission to use geolocation (needed for incident location reporting
        // and resource tracking) while explicitly disabling camera, microphone, payment, USB,
        // and Bluetooth access — minimising the attack surface of the web application.
        response.setHeader("Permissions-Policy",
            "geolocation=(self), camera=(), microphone=(), payment=(), usb=(), bluetooth=()");

        // HSTS — enforces HTTPS for 1 year including subdomains
        // Tells browsers to always connect to DMS over HTTPS for the next year (31 536 000 seconds),
        // even if a user or link specifies http://, and extends the policy to all subdomains.
        // "preload" allows the domain to be included in browser HSTS preload lists.
        response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

        // Cache-Control for API responses — never cache sensitive data
        // Extract the request path so we can apply path-specific policies below.
        String uri = request.getRequestURI();

        // Block path traversal attempts
        // Reject any URI that contains directory traversal sequences (both raw and URL-encoded forms).
        // This prevents attackers from escaping the web root to access server files that contain
        // DMS configuration, credentials, or incident database backups.
        if (uri.contains("../") || uri.contains("..\\") || uri.contains("%2e%2e") || uri.contains("%2E%2E")) {
            // Return HTTP 400 Bad Request immediately and abort the filter chain —
            // no further processing of the malicious request occurs.
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid request path");
            return;
        }

        // Apply aggressive cache-prevention headers to all DMS REST API endpoints
        // so that proxies, CDNs, and browser caches never store sensitive incident,
        // user, or resource data between requests.
        if (uri.startsWith("/api/")) {
            // "no-store" prevents any cache from saving a copy of the response;
            // "private" additionally restricts shared (proxy) caches from caching it.
            response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
            // Legacy HTTP/1.0 cache-busting header for older proxy servers.
            response.setHeader("Pragma", "no-cache");
        }

        // Content Security Policy — defines a precise allowlist of sources from which
        // the DMS browser client may load scripts, styles, images, fonts, and make
        // network connections. Any resource not matching these rules is blocked by the browser,
        // dramatically reducing the risk of XSS and data-exfiltration attacks.
        response.setHeader("Content-Security-Policy",
            // Default fallback: only load resources from the DMS origin itself.
            "default-src 'self'; " +

            // Scripts: allow DMS own scripts, inline scripts (required by some map libraries),
            // unpkg CDN (Leaflet), Facebook Connect (OAuth login), and Google Accounts (OAuth login).
            "script-src 'self' 'unsafe-inline' https://unpkg.com https://connect.facebook.net https://accounts.google.com; " +

            // Styles: allow DMS own styles, inline styles (required by dynamic map rendering),
            // unpkg CDN, Google Fonts (Rajdhani/Inter used in the DMS design system), and jsDelivr CDN.
            "style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com https://cdn.jsdelivr.net; " +

            // Images: allow DMS own images, data URIs (inline map icons), blob URLs (user uploads),
            // OpenStreetMap tile servers (incident map base layer), CartoCDN (alternative tile layer),
            // ArcGIS (satellite tile layer), Google user content (profile photos), and Facebook CDN (profile photos).
            "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com " +
                "https://server.arcgisonline.com https://*.googleusercontent.com https://*.fbcdn.net; " +

            // Fonts: allow DMS own fonts, data URIs (embedded fonts), Google Fonts CDN, and jsDelivr CDN.
            "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net; " +

            // XHR/fetch/WebSocket connections: allow DMS itself plus the external disaster data feeds
            // (NASA EONET for natural events, USGS for earthquakes, NASA FIRMS for wildfires),
            // Google and Facebook OAuth token endpoints, and Nominatim for reverse-geocoding incident locations.
            "connect-src 'self' https://eonet.gsfc.nasa.gov https://earthquake.usgs.gov " +
                "https://firms.modaps.eosdis.nasa.gov https://oauth2.googleapis.com " +
                "https://graph.facebook.com https://nominatim.openstreetmap.org; " +

            // Frames: only Google Accounts may be framed (required for the Google OAuth popup flow).
            "frame-src https://accounts.google.com; " +

            // Disallow all plugin content (<object>, <embed>, <applet>) — no Flash or similar in DMS.
            "object-src 'none'; " +

            // Restrict <base> tag to the DMS origin to prevent base-tag hijacking attacks.
            "base-uri 'self'; " +

            // Only allow HTML forms to POST to the DMS origin, blocking cross-origin form submissions.
            "form-action 'self';" +

            // Instruct browsers to automatically upgrade any remaining http:// sub-resource
            // requests to https:// before fetching, eliminating mixed-content warnings.
            "upgrade-insecure-requests;");

        // Hand off to the next filter or the target servlet/controller in the chain.
        // All security headers are already set on the response at this point.
        chain.doFilter(request, response);
    }
}