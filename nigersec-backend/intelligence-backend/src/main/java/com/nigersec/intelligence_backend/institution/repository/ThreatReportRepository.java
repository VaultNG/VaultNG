package com.nigersec.intelligence_backend.institution.repository;

import com.nigersec.intelligence_backend.citizen.entity.SeverityLevel;
import com.nigersec.intelligence_backend.institution.entity.AttackType;
import com.nigersec.intelligence_backend.institution.entity.ThreatReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface ThreatReportRepository extends JpaRepository<ThreatReport, UUID> {

    Page<ThreatReport> findByBroadcastedToNetworkTrueOrderByCreatedAtDesc(Pageable pageable);

    Page<ThreatReport> findByAttackTypeAndBroadcastedToNetworkTrueOrderByCreatedAtDesc(
            AttackType attackType, Pageable pageable);

    Page<ThreatReport> findBySeverityAndBroadcastedToNetworkTrueOrderByCreatedAtDesc(
            SeverityLevel severity, Pageable pageable);

    List<ThreatReport> findByReportingInstitutionIdAndCreatedAtBetween(
            UUID institutionId, Instant from, Instant to);

    @Query("SELECT COUNT(t) FROM ThreatReport t WHERE t.reportingInstitutionId = :id AND t.severity = 'CRITICAL'")
    long countCriticalByInstitution(UUID id);

    List<ThreatReport> findTop5BySeverityOrderByCreatedAtDesc(SeverityLevel severity);
}
