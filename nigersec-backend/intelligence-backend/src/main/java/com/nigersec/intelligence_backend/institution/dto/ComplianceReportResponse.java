package com.nigersec.intelligence_backend.institution.dto;

import lombok.Builder;
import lombok.Data;

import java.time.YearMonth;
import java.util.List;

@Data @Builder
public class ComplianceReportResponse {
    private String institutionName;
    private YearMonth period;
    private int totalBreachesReported;
    private int criticalBreaches;
    private boolean ndpaCompliant;
    private List<String> outstandingActions;
    private String reportGeneratedAt;
}
