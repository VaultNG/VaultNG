package com.nigersec.intelligence_backend.institution.service;

import com.nigersec.intelligence_backend.citizen.entity.SeverityLevel;
import com.nigersec.intelligence_backend.common.exception.NigerSecException;
import com.nigersec.intelligence_backend.institution.dto.ComplianceReportResponse;
import com.nigersec.intelligence_backend.institution.dto.ThreatFeedResponse;
import com.nigersec.intelligence_backend.institution.dto.ThreatReportRequest;
import com.nigersec.intelligence_backend.institution.entity.AttackType;
import com.nigersec.intelligence_backend.institution.entity.Institution;
import com.nigersec.intelligence_backend.institution.entity.ThreatReport;
import com.nigersec.intelligence_backend.institution.repository.InstitutionRepository;
import com.nigersec.intelligence_backend.institution.repository.ThreatReportRepository;
import com.nigersec.intelligence_backend.messaging.KafkaEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ThreatIntelService {

    private final ThreatReportRepository threatReportRepository;
    private final InstitutionRepository institutionRepository;
    private final KafkaEventPublisher kafkaEventPublisher;

    /**
     * Submit a new threat report. The reporting institution ID is stored
     * internally but stripped out of all public/peer-facing responses.
     */
    @Transactional
    public ThreatReport submitThreatReport(UUID institutionId, ThreatReportRequest request) {
        institutionRepository.findById(institutionId)
                .orElseThrow(() -> NigerSecException.notFound("Institution not found"));

        ThreatReport report = ThreatReport.builder()
                .reportingInstitutionId(institutionId)
                .attackType(request.getAttackType())
                .description(request.getDescription())
                .indicators(request.getIndicators())
                .affectedSystems(request.getAffectedSystems())
                .severity(request.getSeverity())
                .mitigationSteps(request.getMitigationSteps())
                .attackDetectedAt(request.getAttackDetectedAt())
                .broadcastedToNetwork(true)
                .build();

        report = threatReportRepository.save(report);

        // Publish anonymized threat to the network via Kafka
        kafkaEventPublisher.publishThreatIntel(Map.of(
                "reportId",    report.getId().toString(),
                "attackType",  report.getAttackType().name(),
                "severity",    report.getSeverity().name(),
                "indicators",  report.getIndicators() != null ? report.getIndicators() : ""
        ));

        log.info("Threat report submitted by institution {} - type: {}", institutionId, request.getAttackType());
        return report;
    }

    /**
     * Return the anonymized threat feed for institutional subscribers.
     * Reporter identity is never included in this response.
     */
    public Page<ThreatFeedResponse> getThreatFeed(AttackType filterType,
                                                   SeverityLevel filterSeverity,
                                                   Pageable pageable) {
        Page<ThreatReport> reports;

        if (filterType != null) {
            reports = threatReportRepository
                    .findByAttackTypeAndBroadcastedToNetworkTrueOrderByCreatedAtDesc(filterType, pageable);
        } else if (filterSeverity != null) {
            reports = threatReportRepository
                    .findBySeverityAndBroadcastedToNetworkTrueOrderByCreatedAtDesc(filterSeverity, pageable);
        } else {
            reports = threatReportRepository
                    .findByBroadcastedToNetworkTrueOrderByCreatedAtDesc(pageable);
        }

        return reports.map(this::toAnonymizedFeedResponse);
    }

    /**
     * Get the latest critical alerts for the dashboard header.
     */
    public List<ThreatFeedResponse> getCriticalAlerts() {
        return threatReportRepository.findTop5BySeverityOrderByCreatedAtDesc(SeverityLevel.CRITICAL)
                .stream().map(this::toAnonymizedFeedResponse).toList();
    }

    /**
     * Generate an NDPA 2023 compliance report for a given month.
     */
    public ComplianceReportResponse generateComplianceReport(UUID institutionId, YearMonth period) {
        Institution institution = institutionRepository.findById(institutionId)
                .orElseThrow(() -> NigerSecException.notFound("Institution not found"));

        Instant from = period.atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant to   = period.atEndOfMonth().atTime(23, 59, 59).toInstant(ZoneOffset.UTC);

        List<ThreatReport> monthReports = threatReportRepository
                .findByReportingInstitutionIdAndCreatedAtBetween(institutionId, from, to);

        long critical = monthReports.stream()
                .filter(r -> r.getSeverity() == SeverityLevel.CRITICAL).count();

        return ComplianceReportResponse.builder()
                .institutionName(institution.getName())
                .period(period)
                .totalBreachesReported(monthReports.size())
                .criticalBreaches((int) critical)
                .ndpaCompliant(monthReports.size() > 0 || institution.isNdpaCompliant())
                .outstandingActions(critical > 0
                        ? List.of("Escalate " + critical + " critical incident(s) to NDPC within 72 hours")
                        : List.of())
                .reportGeneratedAt(Instant.now().toString())
                .build();
    }

    private ThreatFeedResponse toAnonymizedFeedResponse(ThreatReport r) {
        return ThreatFeedResponse.builder()
                .id(r.getId())
                .attackType(r.getAttackType())
                .description(r.getDescription())
                .indicators(r.getIndicators())
                .severity(r.getSeverity())
                .mitigationSteps(r.getMitigationSteps())
                .reportedAt(r.getCreatedAt())
                .build();
    }
}
