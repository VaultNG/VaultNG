package com.nigersec.intelligence_backend.citizen.dto;

import com.nigersec.intelligence_backend.citizen.entity.SeverityLevel;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data @Builder
public class BreachCheckResponse {
    private boolean breached;
    private int breachCount;
    private List<BreachSummary> breaches;
    private String recommendation;

    @Data @Builder
    public static class BreachSummary {
        private String source;
        private String exposedFields;
        private SeverityLevel severity;
        private Instant breachDate;
        private String action;
    }
}
