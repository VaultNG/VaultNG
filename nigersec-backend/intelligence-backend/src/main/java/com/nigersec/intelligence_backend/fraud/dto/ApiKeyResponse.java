package com.nigersec.intelligence_backend.fraud.dto;

import com.nigersec.intelligence_backend.fraud.entity.ApiKeyTier;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data @Builder
public class ApiKeyResponse {
    private UUID keyId;
    private String rawApiKey;       // returned ONCE on creation - never stored
    private ApiKeyTier tier;
    private long monthlyCallLimit;
}
