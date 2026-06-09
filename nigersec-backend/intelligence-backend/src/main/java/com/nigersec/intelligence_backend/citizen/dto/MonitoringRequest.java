package com.nigersec.intelligence_backend.citizen.dto;

import com.nigersec.intelligence_backend.citizen.entity.DataType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MonitoringRequest {
    @NotBlank private String identifier;
    @NotNull  private DataType dataType;
}
