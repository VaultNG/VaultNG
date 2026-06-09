package com.nigersec.intelligence_backend.citizen.controller;

import com.nigersec.intelligence_backend.citizen.dto.BreachCheckRequest;
import com.nigersec.intelligence_backend.citizen.dto.BreachCheckResponse;
import com.nigersec.intelligence_backend.citizen.dto.MonitoringRequest;
import com.nigersec.intelligence_backend.citizen.entity.MonitoringSubscription;
import com.nigersec.intelligence_backend.citizen.service.BreachCheckService;
import com.nigersec.intelligence_backend.common.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/citizen")
@RequiredArgsConstructor
public class CitizenController {

    private final BreachCheckService breachCheckService;

    /**
     * POST /api/v1/citizen/breach/check
     * Zero-knowledge breach check. Public endpoint - no auth required.
     * Rate limited at gateway/filter level.
     */
    @PostMapping("/breach/check")
    public ResponseEntity<ApiResponse<BreachCheckResponse>> checkBreach(
            @Valid @RequestBody BreachCheckRequest request) {
        BreachCheckResponse result = breachCheckService.checkBreach(request);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    /**
     * POST /api/v1/citizen/monitoring/subscribe
     * Subscribe to ongoing breach monitoring for an identifier.
     * Requires CITIZEN role + active paid subscription.
     */
    @PostMapping("/monitoring/subscribe")
    public ResponseEntity<ApiResponse<MonitoringSubscription>> subscribe(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody MonitoringRequest request) {
        // TODO: validate paid subscription status
        UUID userId = resolveUserId(email);
        MonitoringSubscription sub = breachCheckService.subscribe(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(sub, "Monitoring started"));
    }

    /**
     * GET /api/v1/citizen/monitoring
     * List all active monitoring subscriptions for the authenticated citizen.
     */
    @GetMapping("/monitoring")
    public ResponseEntity<ApiResponse<List<MonitoringSubscription>>> getSubscriptions(
            @AuthenticationPrincipal String email) {
        UUID userId = resolveUserId(email);
        return ResponseEntity.ok(ApiResponse.ok(breachCheckService.getSubscriptions(userId)));
    }

    /**
     * DELETE /api/v1/citizen/monitoring/{subscriptionId}
     * Cancel a specific monitoring subscription.
     */
    @DeleteMapping("/monitoring/{subscriptionId}")
    public ResponseEntity<ApiResponse<Void>> cancelSubscription(
            @AuthenticationPrincipal String email,
            @PathVariable UUID subscriptionId) {
        UUID userId = resolveUserId(email);
        breachCheckService.cancelSubscription(userId, subscriptionId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Monitoring cancelled"));
    }

    // Placeholder - resolve UUID from email via user service in full impl
    private UUID resolveUserId(String email) {
        return UUID.nameUUIDFromBytes(email.getBytes());
    }
}
