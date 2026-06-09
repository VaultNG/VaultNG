package com.nigersec.intelligence_backend.institution.entity;

import com.nigersec.intelligence_backend.citizen.entity.SeverityLevel;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "threat_reports", indexes = {
    @Index(name = "idx_threat_type", columnList = "attackType"),
    @Index(name = "idx_threat_severity", columnList = "severity"),
    @Index(name = "idx_threat_created", columnList = "createdAt")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ThreatReport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /**
     * Reporting institution - stripped before broadcasting to peers.
     * Stored here only for internal audit/compliance purposes.
     */
    @Column(nullable = false)
    private UUID reportingInstitutionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AttackType attackType;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    private String indicators;          // IOCs: IPs, hashes, BVN prefixes, etc.

    private String affectedSystems;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SeverityLevel severity;

    private String mitigationSteps;

    @Column(nullable = false)
    private boolean broadcastedToNetwork = false;

    @CreationTimestamp
    private Instant createdAt;

    private Instant attackDetectedAt;
}
