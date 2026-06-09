package com.nigersec.intelligence_backend.fraud.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "fraud_signals", indexes = {
    @Index(name = "idx_fs_identifier", columnList = "identifierHash"),
    @Index(name = "idx_fs_score", columnList = "riskScore"),
    @Index(name = "idx_fs_created", columnList = "createdAt")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FraudSignal {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** SHA-256 of the transaction identifier / account number */
    @Column(nullable = false, length = 64)
    private String identifierHash;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal riskScore;       // 0.00 - 100.00

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RiskLevel riskLevel;        // LOW | MEDIUM | HIGH

    @Column(columnDefinition = "TEXT")
    private String flagReasons;         // JSON array of flag descriptions

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FraudDecision decision;     // APPROVE | REVIEW | BLOCK

    private UUID reportedByInstitution;

    @CreationTimestamp
    private Instant createdAt;
}
