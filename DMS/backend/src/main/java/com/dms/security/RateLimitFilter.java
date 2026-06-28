package com.dms.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    /** General authenticated API: 200 req/min */
    private Bucket apiBucket() {
        return Bucket.builder()
            .addLimit(Bandwidth.builder().capacity(200).refillGreedy(200, Duration.ofMinutes(1)).build())
            .build();
    }

    /** Auth endpoints (login/register): 20 req/min — brute-force guard */
    private Bucket authBucket() {
        return Bucket.builder()
            .addLimit(Bandwidth.builder().capacity(20).refillGreedy(20, Duration.ofMinutes(1)).build())
            .build();
    }

    /** Public read-only endpoints (alerts/active, shelters): 300 req/min */
    private Bucket publicBucket() {
        return Bucket.builder()
            .addLimit(Bandwidth.builder().capacity(300).refillGreedy(300, Duration.ofMinutes(1)).build())
            .build();
    }

    private static boolean isPublicEndpoint(String uri) {
        return uri.contains("/alerts/active") || uri.contains("/actuator/health");
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain)
            throws ServletException, IOException {

        String ip  = getClientIp(request);
        String uri = request.getRequestURI();

        String bucketKey;
        if (uri.contains("/auth/"))       bucketKey = "auth:"   + ip;
        else if (isPublicEndpoint(uri))   bucketKey = "public:" + ip;
        else                              bucketKey = "api:"    + ip;

        Bucket bucket = buckets.computeIfAbsent(bucketKey, k -> {
            if (k.startsWith("auth:"))   return authBucket();
            if (k.startsWith("public:")) return publicBucket();
            return apiBucket();
        });

        if (bucket.tryConsume(1)) {
            response.addHeader("X-RateLimit-Remaining", String.valueOf(bucket.getAvailableTokens()));
            chain.doFilter(request, response);
        } else {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write(
                "{\"status\":429,\"error\":\"Too Many Requests\",\"message\":\"Rate limit exceeded. Try again later.\"}");
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
