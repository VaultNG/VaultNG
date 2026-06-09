package com.nigersec.intelligence_backend.institution.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "institutions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Institution {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InstitutionType type;   // BANK | FINTECH | TELECOM | HOSPITAL | UNIVERSITY

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SubscriptionTier tier;  // TIER_ONE | TIER_TWO | TIER_THREE

    @Column(nullable = false)
    private String contactEmail;

    private String rcNumber;        // Corporate registration number

    private boolean ndpaCompliant = false;

    @CreationTimestamp
    private Instant onboardedAt;
}
