package com.nigersec.intelligence_backend.citizen.dto;

import com.nigersec.intelligence_backend.citizen.entity.DataType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BreachCheckRequest {

    @NotBlank(message = "Identifier is required")
    private String identifier;   // raw BVN/NIN/email/phone - hashed server-side

    @NotNull(message = "Data type is required")
    private DataType dataType;
}
