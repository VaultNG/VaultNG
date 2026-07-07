package com.nigersec.intelligence_backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;

@Slf4j
@Component
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private final RedisTemplate<String, Object> redisTemplate;

    @Value("${nigersec.rate-limit.citizen-queries-per-hour:10}")
    private int citizenQueriesPerHour;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        // Apply rate limit only to public breach check endpoint
        if ("/api/v1/citizen/breach/check".equals(request.getRequestURI())
                && "POST".equalsIgnoreCase(request.getMethod())) {

            try {
                String clientIp = getClientIp(request);
                String key = "rate:breach:" + clientIp;

                Long count = redisTemplate.opsForValue().increment(key);
                // Always refresh the TTL so the window resets correctly even after a Redis restart
                redisTemplate.expire(key, Duration.ofHours(1));

                if (count != null && count > citizenQueriesPerHour) {
                    response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                    response.setContentType("application/json");
                    response.getWriter().write(
                            "{\"success\":false,\"error\":\"Rate limit exceeded. Maximum " +
                            citizenQueriesPerHour + " breach checks per hour per IP.\"}");
                    return;
                }
            } catch (Exception e) {
                // Redis unavailable — allow the request through rather than blocking all traffic
                log.warn("Rate limit check skipped: Redis unavailable ({})", e.getMessage());
            }
        }

        chain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        return (forwarded != null) ? forwarded.split(",")[0].trim() : request.getRemoteAddr();
    }
}
