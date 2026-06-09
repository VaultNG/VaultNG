package com.nigersec.intelligence_backend.institution.dto;

import com.nigersec.intelligence_backend.citizen.entity.SeverityLevel;
import com.nigersec.intelligence_backend.institution.entity.AttackType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.Instant;

@Data
public class ThreatReportRequest {

    @NotNull(message = "Attack type is required")
    private AttackType attackType;

    @NotBlank(message = "Description is required")
    private String description;

    private String indicators;

    private String affectedSystems;

    @NotNull(message = "Severity is required")
    private SeverityLevel severity;

    private String mitigationSteps;

    private Instant attackDetectedAt;
}
