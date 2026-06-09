package com.nigersec.intelligence_backend.citizen.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "monitoring_subscriptions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MonitoringSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID userId;

    /** Hashed identifier being monitored */
    @Column(nullable = false)
    private String dataHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DataType dataType;

    @Column(nullable = false)
    private boolean active = true;

    private Instant expiresAt;  // null = never expires

    @CreationTimestamp
    private Instant createdAt;
}
