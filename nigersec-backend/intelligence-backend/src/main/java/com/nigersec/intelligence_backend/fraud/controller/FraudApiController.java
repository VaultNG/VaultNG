package com.nigersec.intelligence_backend.fraud.controller;

import com.nigersec.intelligence_backend.common.response.ApiResponse;
import com.nigersec.intelligence_backend.fraud.dto.ApiKeyResponse;
import com.nigersec.intelligence_backend.fraud.dto.TransactionScoreRequest;
import com.nigersec.intelligence_backend.fraud.dto.TransactionScoreResponse;
import com.nigersec.intelligence_backend.fraud.entity.ApiKey;
import com.nigersec.intelligence_backend.fraud.entity.ApiKeyTier;
import com.nigersec.intelligence_backend.fraud.entity.FraudSignal;
import com.nigersec.intelligence_backend.fraud.service.FraudDetectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/fraud")
@RequiredArgsConstructor
public class FraudApiController {

    private final FraudDetectionService fraudDetectionService;

    /**
     * POST /api/v1/fraud/score
     * Score a transaction in real time. Target latency: <200ms.
     * Authenticated via Bearer JWT or X-Api-Key header.
     */
    @PostMapping("/score")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'INSTITUTION', 'ADMIN')")
    public ResponseEntity<ApiResponse<TransactionScoreResponse>> scoreTransaction(
            @RequestHeader("X-Institution-Id") UUID institutionId,
            @Valid @RequestBody TransactionScoreRequest request) {
        TransactionScoreResponse response = fraudDetectionService.scoreTransaction(institutionId, request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * GET /api/v1/fraud/history/{institutionId}
     * Paginated fraud signal history for an institution's internal dashboard.
     */
    @GetMapping("/history/{institutionId}")
    @PreAuthorize("hasAnyRole('INSTITUTION', 'ADMIN')")
    public ResponseEntity<ApiResponse<Page<FraudSignal>>> getFraudHistory(
            @PathVariable UUID institutionId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "50") int size) {
        Page<FraudSignal> history = fraudDetectionService.getFraudHistory(
                institutionId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(history));
    }

    /**
     * POST /api/v1/fraud/api-keys
     * Issue a new API key for a developer/institution.
     * The raw key is returned ONCE in this response only.
     */
    @PostMapping("/api-keys")
    @PreAuthorize("hasAnyRole('INSTITUTION', 'ADMIN')")
    public ResponseEntity<ApiResponse<ApiKeyResponse>> issueApiKey(
            @RequestHeader("X-Institution-Id") UUID institutionId,
            @RequestParam ApiKeyTier tier) {
        ApiKeyResponse key = fraudDetectionService.issueApiKey(institutionId, tier);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(key, "API key issued. Store it safely — it will not be shown again."));
    }

    /**
     * GET /api/v1/fraud/api-keys/{institutionId}
     * List all active API keys for an institution (hashed IDs only, no raw keys).
     */
    @GetMapping("/api-keys/{institutionId}")
    @PreAuthorize("hasAnyRole('INSTITUTION', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<ApiKey>>> listApiKeys(
            @PathVariable UUID institutionId) {
        return ResponseEntity.ok(ApiResponse.ok(fraudDetectionService.listApiKeys(institutionId)));
    }

    /**
     * DELETE /api/v1/fraud/api-keys/{keyId}
     * Revoke an API key immediately.
     */
    @DeleteMapping("/api-keys/{keyId}")
    @PreAuthorize("hasAnyRole('INSTITUTION', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> revokeApiKey(
            @PathVariable UUID keyId,
            @RequestHeader("X-Institution-Id") UUID institutionId) {
        fraudDetectionService.revokeApiKey(keyId, institutionId);
        return ResponseEntity.ok(ApiResponse.ok(null, "API key revoked"));
    }
}
