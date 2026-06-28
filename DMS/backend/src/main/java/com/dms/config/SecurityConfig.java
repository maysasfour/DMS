package com.dms.config;

import com.dms.security.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@EnableAsync
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthEntryPointJwt unauthorizedHandler;
    private final AccessDeniedHandlerImpl accessDeniedHandler;
    private final RateLimitFilter rateLimitFilter;
    private final SecurityHeadersFilter securityHeadersFilter;

    @Value("#{'${spring.security.cors.allowed-origins:http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:5173,http://localhost:5174}'.split(',')}")
    private String[] allowedOrigins;

    @Bean
    public JwtAuthenticationFilter authenticationJwtTokenFilter() {
        return new JwtAuthenticationFilter(jwtTokenProvider, userDetailsService);
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(unauthorizedHandler)
                .accessDeniedHandler(accessDeniedHandler))
            .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/uploads/**").permitAll()
                .requestMatchers("/v1/api-docs/**", "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html", "/swagger-resources/**", "/webjars/**").permitAll()
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/alerts/active").permitAll()
                // Incidents
                .requestMatchers(HttpMethod.GET,  "/api/v1/incidents/**").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/v1/incidents").authenticated()
                .requestMatchers(HttpMethod.PUT,  "/api/v1/incidents/**").hasAnyRole("RESCUE_TEAM", "ADMIN")
                .requestMatchers(HttpMethod.PATCH,"/api/v1/incidents/**").hasAnyRole("RESCUE_TEAM", "ADMIN")
                .requestMatchers(HttpMethod.DELETE,"/api/v1/incidents/**").hasRole("ADMIN")
                // Resources
                .requestMatchers(HttpMethod.GET,  "/api/v1/resources/**").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/v1/resources/**").hasAnyRole("RESCUE_TEAM", "ADMIN")
                .requestMatchers(HttpMethod.PUT,  "/api/v1/resources/**").hasAnyRole("RESCUE_TEAM", "ADMIN")
                .requestMatchers(HttpMethod.PATCH,"/api/v1/resources/**").hasAnyRole("RESCUE_TEAM", "ADMIN")
                .requestMatchers(HttpMethod.DELETE,"/api/v1/resources/**").hasRole("ADMIN")
                // Shelters
                .requestMatchers(HttpMethod.GET,  "/api/v1/shelters/**").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/v1/shelters/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT,  "/api/v1/shelters/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE,"/api/v1/shelters/**").hasRole("ADMIN")
                // Teams
                .requestMatchers(HttpMethod.GET,  "/api/v1/teams/**").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/v1/teams/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT,  "/api/v1/teams/**").hasRole("ADMIN")
                // Alerts
                .requestMatchers(HttpMethod.GET,  "/api/v1/alerts/**").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/v1/alerts/**").hasRole("ADMIN")
                // Admin routes
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/v1/audit/**").hasRole("ADMIN")
                .requestMatchers("/api/v1/reports/**").hasAnyRole("ADMIN")
                // Profile & notifications
                .requestMatchers("/api/v1/users/profile").authenticated()
                .requestMatchers("/api/v1/notifications/**").authenticated()
                .requestMatchers("/api/v1/location/**").authenticated()
                .requestMatchers("/api/v1/emergency/**").authenticated()
                .anyRequest().authenticated()
            );

        http.authenticationProvider(authenticationProvider());
        // Order: security headers → rate limit → JWT auth
        http.addFilterBefore(securityHeadersFilter, UsernamePasswordAuthenticationFilter.class);
        http.addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class);
        http.addFilterBefore(authenticationJwtTokenFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Use patterns so any localhost port is allowed (covers Flutter web dev server)
        java.util.List<String> origins = new java.util.ArrayList<>(Arrays.asList(
            "http://localhost:*",
            "http://127.0.0.1:*",
            "http://192.168.1.*",
            "http://192.168.1.*:*",
            "http://10.0.2.*",
            "http://10.0.2.*:*",
            "https://*.googleusercontent.com",
            "https://accounts.google.com"
        ));
        for (String o : allowedOrigins) {
            if (o != null && !o.isBlank()) origins.add(o.trim());
        }
        configuration.setAllowedOriginPatterns(origins);
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setExposedHeaders(Arrays.asList("Authorization"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
