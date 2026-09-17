/**
 * RateLimitFilter.java
 *
 * Servlet filter for the Disaster Management System (DMS) that enforces
 * per-IP request rate limits across different endpoint categories.
 *
 * This filter protects the DMS backend from abuse and brute-force attacks by
 * applying tiered token-bucket rate limits:
 *   - Authentication endpoints (login/register): tightly capped to prevent
 *     credential stuffing or brute-force attacks on DMS user accounts.
 *   - Public read-only endpoints (active alerts, health check): higher limits
 *     to allow citizens and external systems to poll disaster alerts freely.
 *   - General authenticated API (incidents, resources, reports, etc.): a
 *     moderate cap that prevents runaway clients from overloading the system.
 *
 * Uses the Bucket4j library (token-bucket algorithm) for thread-safe,
 * in-memory rate tracking keyed by client IP address.
 */
package com.dms.security;

// Bucket4j imports — token-bucket rate-limiting library
import io.github.bucket4j.Bandwidth; // Defines the capacity and refill rate of a token bucket
import io.github.bucket4j.Bucket;   // Represents a single rate-limit bucket that tokens are consumed from

// Jakarta Servlet imports — standard HTTP filter contracts
import jakarta.servlet.FilterChain;        // Passes the request down the filter chain to the next filter or servlet
import jakarta.servlet.ServletException;   // Checked exception thrown by servlet operations
import jakarta.servlet.http.HttpServletRequest;  // Provides access to HTTP request data (URI, headers, remote IP)
import jakarta.servlet.http.HttpServletResponse; // Allows writing HTTP response data (status codes, headers, body)

// Spring Framework imports
import org.springframework.http.HttpStatus;             // Enum of standard HTTP status codes, used here for 429 Too Many Requests
import org.springframework.lang.NonNull;                // Documents that a parameter must not be null; aids IDE null-safety analysis
import org.springframework.stereotype.Component;        // Marks this class as a Spring-managed bean, auto-detected by component scan
import org.springframework.web.filter.OncePerRequestFilter; // Base class guaranteeing the filter executes exactly once per HTTP request

// Java standard-library imports
import java.io.IOException;          // Checked exception thrown when writing to the response output stream
import java.time.Duration;           // Expresses the token-refill window (e.g., 1 minute)
import java.util.Map;                // Generic map interface for the IP-to-bucket registry
import java.util.concurrent.ConcurrentHashMap; // Thread-safe hash map — required because multiple threads handle concurrent DMS requests

/**
 * Spring-managed servlet filter that intercepts every HTTP request to the DMS API
 * and enforces per-IP rate limits before the request reaches any controller.
 *
 * Extending {@link OncePerRequestFilter} ensures the filter logic runs exactly once
 * per request, even in environments that dispatch requests internally (e.g., async).
 */
@Component // Registers this filter as a Spring bean so Spring Boot auto-registers it in the filter chain
public class RateLimitFilter extends OncePerRequestFilter {

    /**
     * Thread-safe registry mapping a composite key ("category:ip") to its token bucket.
     * Using ConcurrentHashMap ensures safe concurrent reads/writes from multiple
     * request-handling threads without explicit synchronization.
     * Example keys: "auth:192.168.1.10", "api:10.0.0.5", "public:203.0.113.4"
     */
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    /**
     * Creates a token bucket for general authenticated DMS API endpoints
     * (e.g., incident CRUD, resource management, user admin operations).
     * Allows 200 requests per minute per IP — enough for normal officer/admin use
     * while blocking runaway scripts or misconfigured clients.
     *
     * @return a new Bucket configured with a greedy 200-token/minute limit
     */
    private Bucket apiBucket() {
        return Bucket.builder()
            // Greedy refill: tokens are restored continuously throughout the minute window
            .addLimit(Bandwidth.builder().capacity(200).refillGreedy(200, Duration.ofMinutes(1)).build())
            .build();
    }

    /**
     * Creates a token bucket for authentication endpoints (/auth/login, /auth/register).
     * The tight 20 req/min cap is a brute-force guard — legitimate users rarely need
     * more than a handful of login attempts per minute, so a low limit stops
     * automated credential-stuffing attacks against DMS user accounts.
     *
     * @return a new Bucket configured with a greedy 20-token/minute limit
     */
    private Bucket authBucket() {
        return Bucket.builder()
            // Much lower capacity than the API bucket — prioritises security over convenience
            .addLimit(Bandwidth.builder().capacity(20).refillGreedy(20, Duration.ofMinutes(1)).build())
            .build();
    }

    /**
     * Creates a token bucket for public, read-only DMS endpoints
     * (active disaster alerts, actuator health check).
     * A higher limit (300/min) accommodates citizen-facing apps, dashboards,
     * and external monitoring systems that poll for live alerts frequently.
     *
     * @return a new Bucket configured with a greedy 300-token/minute limit
     */
    private Bucket publicBucket() {
        return Bucket.builder()
            // Higher capacity reflects the expected high-read, low-write nature of public alert feeds
            .addLimit(Bandwidth.builder().capacity(300).refillGreedy(300, Duration.ofMinutes(1)).build())
            .build();
    }

    /**
     * Determines whether the requested URI maps to a public, unauthenticated endpoint.
     * Public endpoints include the active-alerts feed (consumed by citizen portals)
     * and the Spring Boot Actuator health probe (consumed by load balancers / uptime monitors).
     *
     * @param uri the request URI path (e.g., "/api/alerts/active")
     * @return true if the URI should be served under the more permissive public bucket
     */
    private static boolean isPublicEndpoint(String uri) {
        // /alerts/active — real-time disaster alert feed open to unauthenticated citizens
        // /actuator/health — infrastructure health check used by deployment platforms
        return uri.contains("/alerts/active") || uri.contains("/actuator/health");
    }

    /**
     * Core filter method executed once per HTTP request.
     * Determines the appropriate rate-limit bucket for the client IP and endpoint
     * category, then either allows the request to proceed or rejects it with HTTP 429.
     *
     * @param request  the incoming HTTP request (provides URI and client IP)
     * @param response the outgoing HTTP response (written to on rate-limit rejection)
     * @param chain    the remaining filter chain to invoke if the request is allowed
     * @throws ServletException if a downstream filter or servlet throws a servlet error
     * @throws IOException      if writing the 429 response body fails
     */
    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain)
            throws ServletException, IOException {

        // Resolve the true client IP, accounting for reverse-proxy forwarding headers
        String ip  = getClientIp(request);
        // Capture the request URI to classify which rate-limit tier applies
        String uri = request.getRequestURI();

        // Build the composite bucket key: "category:ip" ensures each IP has
        // independent limits per endpoint category (auth, public, api)
        String bucketKey;
        if (uri.contains("/auth/"))       bucketKey = "auth:"   + ip; // Login/register — strictest limit
        else if (isPublicEndpoint(uri))   bucketKey = "public:" + ip; // Alert feed / health — most permissive
        else                              bucketKey = "api:"    + ip; // All other authenticated DMS API calls

        // Lazily create and cache the appropriate bucket the first time this key is seen.
        // computeIfAbsent is atomic on ConcurrentHashMap, preventing duplicate bucket creation
        // under concurrent requests from the same IP.
        Bucket bucket = buckets.computeIfAbsent(bucketKey, k -> {
            if (k.startsWith("auth:"))   return authBucket();   // Tight limit for credential endpoints
            if (k.startsWith("public:")) return publicBucket(); // Relaxed limit for public alert reads
            return apiBucket();                                  // Default limit for authenticated API calls
        });

        // Attempt to consume one token from the bucket for this request
        if (bucket.tryConsume(1)) {
            // Request is within the rate limit — expose remaining token count for client awareness
            response.addHeader("X-RateLimit-Remaining", String.valueOf(bucket.getAvailableTokens()));
            // Pass the request through to the next filter or the DMS controller
            chain.doFilter(request, response);
        } else {
            // Rate limit exceeded — reject the request immediately with HTTP 429
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value()); // Sets HTTP status 429
            response.setContentType("application/json"); // Return machine-readable error for DMS API clients
            // Write a structured JSON error body consistent with the DMS API error format
            response.getWriter().write(
                "{\"status\":429,\"error\":\"Too Many Requests\",\"message\":\"Rate limit exceeded. Try again later.\"}");
        }
    }

    /**
     * Resolves the real client IP address from the HTTP request.
     * In the DMS production deployment, requests pass through a reverse proxy (nginx),
     * which appends the original client IP to the X-Forwarded-For header.
     * Without this resolution, all requests would appear to come from the proxy's IP,
     * making per-IP rate limiting ineffective.
     *
     * @param request the HTTP request potentially carrying proxy-forwarded headers
     * @return the originating client IP address, or the direct remote address as fallback
     */
    private String getClientIp(HttpServletRequest request) {
        // X-Forwarded-For may contain a comma-separated chain of proxies: "client, proxy1, proxy2"
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            // The first entry in the chain is the original client IP — take it and strip whitespace
            return forwarded.split(",")[0].trim();
        }
        // No proxy header present — use the TCP-level remote address (direct connections or local dev)
        return request.getRemoteAddr();
    }
}