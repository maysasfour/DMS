/**
 * SecurityConfig.java
 *
 * Central Spring Security configuration for the Disaster Management System (DMS).
 *
 * This class wires together all security concerns of the backend:
 * - JWT-based stateless authentication for citizens, rescue teams, officers, and admins
 * - Role-based access control (RBAC) governing who can report, update, or delete
 *   incidents, resources, shelters, teams, and alerts
 * - CORS policy allowing the React frontend (port 3000/5173) and Flutter web client
 *   to communicate with the backend API
 * - Rate limiting to prevent abuse of public-facing endpoints
 * - Security response headers to harden the API against common web attacks
 * - Custom 401/403 error responses for unauthenticated or unauthorized requests
 *
 * Role hierarchy used across the DMS:
 *   CITIZEN   — can report incidents and view public data
 *   RESCUE_TEAM — can update/patch incidents and manage resources
 *   ADMIN     — full control over all entities including shelters, teams, and audit logs
 */
package com.dms.config;

// Import all custom DMS security components (JWT filter, user details, entry points, etc.)
import com.dms.security.*;
// Generates constructor injecting all final fields — avoids boilerplate @Autowired
import lombok.RequiredArgsConstructor;
// Reads allowed CORS origins from application.properties at startup
import org.springframework.beans.factory.annotation.Value;
// Marks a method's return value as a Spring-managed bean
import org.springframework.context.annotation.Bean;
// Marks this class as a source of Spring bean definitions
import org.springframework.context.annotation.Configuration;
// Used to restrict rules by HTTP verb (GET, POST, PUT, DELETE, PATCH)
import org.springframework.http.HttpMethod;
// Enables @Async support — used by notification and alert dispatch services
import org.springframework.scheduling.annotation.EnableAsync;
// Core interface for programmatic authentication (e.g., login endpoint)
import org.springframework.security.authentication.AuthenticationManager;
// Connects Spring Security's auth pipeline to our UserDetailsService + PasswordEncoder
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
// Extracts AuthenticationManager from Spring's auto-configured AuthenticationConfiguration
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
// Enables @PreAuthorize / @PostAuthorize annotations on service/controller methods
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
// Activates Spring Security's web security support
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
// Controls whether sessions are created — we use STATELESS (JWT replaces sessions)
import org.springframework.security.config.http.SessionCreationPolicy;
// Strong adaptive hashing algorithm used to store DMS user passwords
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
// The main security filter chain bean that enforces all rules
import org.springframework.security.web.SecurityFilterChain;
// The standard Spring filter we insert our custom JWT filter before
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
// CORS support — configures which external origins may call the DMS API
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

// Used to build the list of allowed HTTP methods and origin patterns
import java.util.Arrays;

// Declares this class as a Spring configuration — processed at application startup
@Configuration
// Activates Spring Security's web-layer protection (replaces XML security config)
@EnableWebSecurity
// Allows @PreAuthorize("hasRole('ADMIN')") etc. on individual service methods
@EnableMethodSecurity
// Enables asynchronous method execution for non-blocking alert/notification dispatching
@EnableAsync
// Lombok: generates an all-args constructor for all final fields, used by Spring DI
@RequiredArgsConstructor
public class SecurityConfig {

    // Loads DMS user accounts from the database for authentication
    private final CustomUserDetailsService userDetailsService;

    // Signs and validates JWT tokens issued to authenticated DMS users
    private final JwtTokenProvider jwtTokenProvider;

    // Returns a structured JSON 401 response when a request lacks a valid JWT
    private final AuthEntryPointJwt unauthorizedHandler;

    // Returns a structured JSON 403 response when a user lacks the required role
    private final AccessDeniedHandlerImpl accessDeniedHandler;

    // Per-IP request throttle to prevent brute-force attacks on auth and reporting endpoints
    private final RateLimitFilter rateLimitFilter;

    // Adds security response headers (e.g., X-Content-Type-Options, X-Frame-Options)
    private final SecurityHeadersFilter securityHeadersFilter;

    // Reads the comma-separated list of allowed CORS origins from application.properties;
    // defaults cover local development ports for React (3000, 5173) and AI agent (3002)
    @Value("#{'${spring.security.cors.allowed-origins:http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:5173,http://localhost:5174}'.split(',')}")
    private String[] allowedOrigins;

    /**
     * Registers the JWT authentication filter as a Spring bean.
     * This filter intercepts every HTTP request, extracts the Bearer token from the
     * Authorization header, validates it, and populates the SecurityContext with the
     * authenticated DMS user's details and roles.
     */
    @Bean
    public JwtAuthenticationFilter authenticationJwtTokenFilter() {
        return new JwtAuthenticationFilter(jwtTokenProvider, userDetailsService);
    }

    /**
     * Configures the DAO-based authentication provider that Spring Security uses
     * when processing login requests. It fetches the user record from the DMS
     * database via CustomUserDetailsService and verifies the submitted password
     * against the stored BCrypt hash.
     */
    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        // Create provider that reads users from the DMS user repository
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        // Supply the service that loads DMS user details by email/username
        authProvider.setUserDetailsService(userDetailsService);
        // Use BCrypt to compare the submitted password with the stored hash
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    /**
     * Exposes Spring Security's AuthenticationManager as a bean so the
     * authentication controller can call it directly during the login flow.
     *
     * @param authConfig auto-configured by Spring Security
     * @return the configured AuthenticationManager
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    /**
     * Declares BCrypt as the password hashing algorithm for the DMS.
     * BCrypt automatically salts each password and is resistant to rainbow-table
     * and brute-force attacks — critical for protecting citizen and officer accounts.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Defines the master HTTP security filter chain for the DMS API.
     * All incoming requests pass through this chain before reaching any controller.
     * Rules are evaluated top-to-bottom; the first matching rule wins.
     *
     * @param http Spring's HttpSecurity builder
     * @return the fully configured SecurityFilterChain
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // Apply our custom CORS policy (see corsConfigurationSource below)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            // Disable CSRF — not needed because we use stateless JWT, not cookies
            .csrf(csrf -> csrf.disable())
            // Wire in our custom handlers for 401 (no token) and 403 (wrong role)
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(unauthorizedHandler)    // 401 — unauthenticated
                .accessDeniedHandler(accessDeniedHandler))        // 403 — authenticated but forbidden
            // Do not create or use HTTP sessions — JWT tokens carry all auth state
            .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth

                // --- Public endpoints (no JWT required) ---
                // Login, registration, password reset — must be open to all users
                .requestMatchers("/api/v1/auth/**").permitAll()
                // Uploaded incident evidence images are served publicly so responders can view them
                .requestMatchers("/uploads/**").permitAll()
                // Swagger/OpenAPI docs — accessible without login for API exploration
                .requestMatchers("/v1/api-docs/**", "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html", "/swagger-resources/**", "/webjars/**").permitAll()
                // Health and info actuator endpoints exposed for load balancer / uptime monitoring
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                // Active public alerts (e.g., flood warnings) visible to unauthenticated visitors
                .requestMatchers(HttpMethod.GET, "/api/v1/alerts/active").permitAll()

                // --- Incident endpoints ---
                // Any authenticated user (citizen, officer, rescue team) can view incident details
                .requestMatchers(HttpMethod.GET,  "/api/v1/incidents/**").authenticated()
                // Any authenticated user can submit a new incident report
                .requestMatchers(HttpMethod.POST, "/api/v1/incidents").authenticated()
                // Only rescue teams and admins can update incident status / details
                .requestMatchers(HttpMethod.PUT,  "/api/v1/incidents/**").hasAnyRole("RESCUE_TEAM", "ADMIN")
                // Partial updates (e.g., status change, priority escalation) restricted to responders
                .requestMatchers(HttpMethod.PATCH,"/api/v1/incidents/**").hasAnyRole("RESCUE_TEAM", "ADMIN")
                // Only admins can permanently delete incident records
                .requestMatchers(HttpMethod.DELETE,"/api/v1/incidents/**").hasRole("ADMIN")

                // --- Resource endpoints (vehicles, equipment, medical supplies) ---
                // All authenticated users can check available resources
                .requestMatchers(HttpMethod.GET,  "/api/v1/resources/**").authenticated()
                // Rescue teams and admins can add new resources to inventory
                .requestMatchers(HttpMethod.POST, "/api/v1/resources/**").hasAnyRole("RESCUE_TEAM", "ADMIN")
                // Rescue teams can update resource availability/status during a response
                .requestMatchers(HttpMethod.PUT,  "/api/v1/resources/**").hasAnyRole("RESCUE_TEAM", "ADMIN")
                // Patch operations (e.g., marking a resource as depleted) limited to responders
                .requestMatchers(HttpMethod.PATCH,"/api/v1/resources/**").hasAnyRole("RESCUE_TEAM", "ADMIN")
                // Only admins can remove resources from the system
                .requestMatchers(HttpMethod.DELETE,"/api/v1/resources/**").hasRole("ADMIN")

                // --- Shelter endpoints (evacuation centers, temporary housing) ---
                // All authenticated users can look up shelters and their capacity
                .requestMatchers(HttpMethod.GET,  "/api/v1/shelters/**").authenticated()
                // Only admins can register or modify shelter locations
                .requestMatchers(HttpMethod.POST, "/api/v1/shelters/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT,  "/api/v1/shelters/**").hasRole("ADMIN")
                // Only admins can decommission a shelter
                .requestMatchers(HttpMethod.DELETE,"/api/v1/shelters/**").hasRole("ADMIN")

                // --- Team endpoints (rescue teams, field units) ---
                // All authenticated users can view team listings and assignments
                .requestMatchers(HttpMethod.GET,  "/api/v1/teams/**").authenticated()
                // Only admins can create or modify rescue team records
                .requestMatchers(HttpMethod.POST, "/api/v1/teams/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT,  "/api/v1/teams/**").hasRole("ADMIN")

                // --- Alert endpoints (broadcast warnings to affected population) ---
                // Authenticated users can retrieve active and historical alerts
                .requestMatchers(HttpMethod.GET,  "/api/v1/alerts/**").authenticated()
                // Only admins can create and broadcast system-wide alerts
                .requestMatchers(HttpMethod.POST, "/api/v1/alerts/**").hasRole("ADMIN")

                // --- Admin-only routes ---
                // All /admin/** routes (user management, system config) require ADMIN role
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                // Audit trail access is restricted to administrators for accountability
                .requestMatchers("/api/v1/audit/**").hasRole("ADMIN")
                // Report generation (PDF/CSV exports) is admin-only to protect sensitive data
                .requestMatchers("/api/v1/reports/**").hasAnyRole("ADMIN")

                // --- Profile, notifications, location, and emergency endpoints ---
                // Users can access and update their own profile information
                .requestMatchers("/api/v1/users/profile").authenticated()
                // Incident-related push notifications are available to all authenticated users
                .requestMatchers("/api/v1/notifications/**").authenticated()
                // Location tracking endpoints used by mobile DMS clients require authentication
                .requestMatchers("/api/v1/location/**").authenticated()
                // SOS / emergency signal endpoints require the user to be authenticated
                .requestMatchers("/api/v1/emergency/**").authenticated()

                // All other endpoints not explicitly listed require authentication as a fallback
                .anyRequest().authenticated()
            );

        // Register the DAO authentication provider built above
        http.authenticationProvider(authenticationProvider());

        // Filter execution order — innermost (JWT) runs last, but is registered first:
        // Request → SecurityHeadersFilter → RateLimitFilter → JwtAuthenticationFilter → Controller
        // Order: security headers → rate limit → JWT auth
        http.addFilterBefore(securityHeadersFilter, UsernamePasswordAuthenticationFilter.class);
        http.addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class);
        http.addFilterBefore(authenticationJwtTokenFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Defines the CORS policy for the DMS API, controlling which origins (frontends)
     * are permitted to make cross-origin requests.
     *
     * Allowed origins include:
     * - Any localhost port — covers the React dev server, Flutter web, and AI agent (3002)
     * - Local network ranges (192.168.x.x, 10.0.2.x) — covers Android emulators and LAN testing
     * - Google OAuth domains — required for the "Sign in with Google" flow
     * - Any additional origins injected via application.properties (e.g., production DuckDNS domain)
     *
     * @return the CORS configuration source applied to all /** API routes
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Use patterns so any localhost port is allowed (covers Flutter web dev server)
        // Build the base list of allowed origin patterns for local development and emulators
        java.util.List<String> origins = new java.util.ArrayList<>(Arrays.asList(
            "http://localhost:*",           // Any localhost port (React, Flutter, AI agent)
            "http://127.0.0.1:*",          // IPv4 loopback — some tools use this instead of localhost
            "http://192.168.1.*",          // Local network access (e.g., physical device on same LAN)
            "http://192.168.1.*:*",        // Local network with explicit port
            "http://10.0.2.*",             // Android emulator default network range
            "http://10.0.2.*:*",           // Android emulator with explicit port
            "https://*.googleusercontent.com", // Google OAuth redirect domain
            "https://accounts.google.com"  // Google sign-in page
        ));

        // Append any additional origins from application.properties (e.g., production URL)
        for (String o : allowedOrigins) {
            // Skip null or blank entries that may result from misconfigured properties
            if (o != null && !o.isBlank()) origins.add(o.trim());
        }

        // Apply the full list of allowed origin patterns to the CORS configuration
        configuration.setAllowedOriginPatterns(origins);

        // Allow all standard REST verbs used by the DMS API; OPTIONS is required for preflight
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));

        // Allow any request header — needed because clients send custom headers (e.g., Authorization, X-Lang)
        configuration.setAllowedHeaders(Arrays.asList("*"));

        // Expose the Authorization header to clients so they can read the JWT from responses
        configuration.setExposedHeaders(Arrays.asList("Authorization"));

        // Allow cookies and credentials to be included in cross-origin requests (required for OAuth flows)
        configuration.setAllowCredentials(true);

        // Cache preflight responses for 1 hour to reduce OPTIONS round-trips from the frontend
        configuration.setMaxAge(3600L);

        // Apply this CORS configuration to every API route
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}