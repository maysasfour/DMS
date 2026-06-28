package com.dms.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class SecurityHeadersFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain)
            throws ServletException, IOException {

        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("X-XSS-Protection", "1; mode=block");
        response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        response.setHeader("Permissions-Policy",
            "geolocation=(self), camera=(), microphone=(), payment=(), usb=(), bluetooth=()");
        // HSTS — enforces HTTPS for 1 year including subdomains
        response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
        // Cache-Control for API responses — never cache sensitive data
        String uri = request.getRequestURI();

        // Block path traversal attempts
        if (uri.contains("../") || uri.contains("..\\") || uri.contains("%2e%2e") || uri.contains("%2E%2E")) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid request path");
            return;
        }

        if (uri.startsWith("/api/")) {
            response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
            response.setHeader("Pragma", "no-cache");
        }
        response.setHeader("Content-Security-Policy",
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' https://unpkg.com https://connect.facebook.net https://accounts.google.com; " +
            "style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com https://cdn.jsdelivr.net; " +
            "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com " +
                "https://server.arcgisonline.com https://*.googleusercontent.com https://*.fbcdn.net; " +
            "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net; " +
            "connect-src 'self' https://eonet.gsfc.nasa.gov https://earthquake.usgs.gov " +
                "https://firms.modaps.eosdis.nasa.gov https://oauth2.googleapis.com " +
                "https://graph.facebook.com https://nominatim.openstreetmap.org; " +
            "frame-src https://accounts.google.com; " +
            "object-src 'none'; " +
            "base-uri 'self'; " +
            "form-action 'self';" +
            "upgrade-insecure-requests;");

        chain.doFilter(request, response);
    }
}
