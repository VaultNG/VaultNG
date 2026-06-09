package com.nigersec.intelligence_backend.institution.controller;

import com.nigersec.intelligence_backend.citizen.entity.SeverityLevel;
import com.nigersec.intelligence_backend.common.response.ApiResponse;
import com.nigersec.intelligence_backend.institution.dto.ComplianceReportResponse;
import com.nigersec.intelligence_backend.institution.dto.ThreatFeedResponse;
import com.nigersec.intelligence_backend.institution.dto.ThreatReportRequest;
import com.nigersec.intelligence_backend.institution.entity.AttackType;
import com.nigersec.intelligence_backend.institution.entity.ThreatReport;
import com.nigersec.intelligence_backend.institution.service.ThreatIntelService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/institution")
@RequiredArgsConstructor
public class InstitutionController {

    private final ThreatIntelService threatIntelService;

    /**
     * POST /api/v1/institution/threat-reports
     * Submit a new threat intelligence report (anonymized before broadcast).
     */
    @PostMapping("/threat-reports")
    @PreAuthorize("hasAnyRole('INSTITUTION', 'ADMIN')")
    public ResponseEntity<ApiResponse<ThreatReport>> submitThreatReport(
            @RequestHeader("X-Institution-Id") UUID institutionId,
            @Valid @RequestBody ThreatReportRequest request) {
        ThreatReport report = threatIntelService.submitThreatReport(institutionId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(report, "Threat report submitted and broadcast to network"));
    }

    /**
     * GET /api/v1/institution/threat-feed
     * Real-time anonymized threat intelligence feed.
     * Optional filters: attackType, severity, page, size.
     */
    @GetMapping("/threat-feed")
    @PreAuthorize("hasAnyRole('INSTITUTION', 'ADMIN')")
    public ResponseEntity<ApiResponse<Page<ThreatFeedResponse>>> getThreatFeed(
            @RequestParam(required = false) AttackType attackType,
            @RequestParam(required = false) SeverityLevel severity,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<ThreatFeedResponse> feed = threatIntelService.getThreatFeed(
                attackType, severity, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(feed));
    }

    /**
     * GET /api/v1/institution/threat-feed/critical
     * Top 5 latest critical severity alerts for dashboard header.
     */
    @GetMapping("/threat-feed/critical")
    @PreAuthorize("hasAnyRole('INSTITUTION', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<ThreatFeedResponse>>> getCriticalAlerts() {
        return ResponseEntity.ok(ApiResponse.ok(threatIntelService.getCriticalAlerts()));
    }

    /**
     * GET /api/v1/institution/compliance-report/{institutionId}?year=2025&month=4
     * Generate an NDPA 2023 compliance report for a given month.
     */
    @GetMapping("/compliance-report/{institutionId}")
    @PreAuthorize("hasAnyRole('INSTITUTION', 'ADMIN')")
    public ResponseEntity<ApiResponse<ComplianceReportResponse>> getComplianceReport(
            @PathVariable UUID institutionId,
            @RequestParam int year,
            @RequestParam int month) {
        ComplianceReportResponse report = threatIntelService
                .generateComplianceReport(institutionId, YearMonth.of(year, month));
        return ResponseEntity.ok(ApiResponse.ok(report));
    }
}
