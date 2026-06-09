package com.nigersec.intelligence_backend.fraud.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "api_keys")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ApiKey {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String keyHash;             // SHA-256 of the raw API key

    @Column(nullable = false)
    private UUID institutionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ApiKeyTier tier;            // DEVELOPER | BUSINESS | ENTERPRISE

    private long monthlyCallLimit;

    private long callsThisMonth = 0;

    private boolean active = true;

    private Instant expiresAt;

    @CreationTimestamp
    private Instant createdAt;
}
