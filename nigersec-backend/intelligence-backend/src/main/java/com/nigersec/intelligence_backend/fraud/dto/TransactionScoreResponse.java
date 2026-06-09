package com.nigersec.intelligence_backend.fraud.dto;

import com.nigersec.intelligence_backend.fraud.entity.FraudDecision;
import com.nigersec.intelligence_backend.fraud.entity.RiskLevel;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data @Builder
public class TransactionScoreResponse {
    private UUID scoreId;
    private String transactionId;
    private BigDecimal riskScore;       // 0 - 100
    private RiskLevel riskLevel;
    private FraudDecision decision;
    private List<String> flags;
    private String recommendation;
    private long processingTimeMs;
    private Instant scoredAt;
}
