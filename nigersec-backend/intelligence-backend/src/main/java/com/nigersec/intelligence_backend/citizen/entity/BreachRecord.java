package com.nigersec.intelligence_backend.citizen.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "breach_records", indexes = {
    @Index(name = "idx_breach_hash", columnList = "dataHash"),
    @Index(name = "idx_breach_type", columnList = "dataType"),
    @Index(name = "idx_breach_date", columnList = "breachDate")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BreachRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /**
     * SHA-256 hash of the sensitive identifier (BVN, NIN, email, phone).
     * Raw values are NEVER stored - zero-knowledge by design.
     */
    @Column(nullable = false, length = 64)
    private String dataHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DataType dataType;   // BVN | NIN | EMAIL | PHONE

    @Column(nullable = false)
    private String sourceDescription;  // e.g. "Dark web dump - April 2024"

    private String exposedFields;      // Comma-separated: "name,phone,address"

    private Instant breachDate;        // When the breach occurred (if known)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SeverityLevel severity;    // LOW | MEDIUM | HIGH | CRITICAL

    @Column(nullable = false)
    private String recommendedAction;

    @CreationTimestamp
    private Instant addedAt;
}
