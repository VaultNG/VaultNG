package com.nigersec.intelligence_backend.fraud.repository;

import com.nigersec.intelligence_backend.fraud.entity.FraudDecision;
import com.nigersec.intelligence_backend.fraud.entity.FraudSignal;
import com.nigersec.intelligence_backend.fraud.entity.RiskLevel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.UUID;

public interface FraudSignalRepository extends JpaRepository<FraudSignal, UUID> {

    boolean existsByIdentifierHashAndRiskLevelIn(String hash, java.util.List<RiskLevel> levels);

    long countByIdentifierHashAndCreatedAtAfter(String hash, Instant since);

    Page<FraudSignal> findByReportedByInstitutionOrderByCreatedAtDesc(UUID institutionId, Pageable pageable);

    @Query("SELECT COUNT(f) FROM FraudSignal f WHERE f.reportedByInstitution = :id AND f.decision = :decision AND f.createdAt >= :since")
    long countByInstitutionAndDecisionSince(UUID id, FraudDecision decision, Instant since);
}
