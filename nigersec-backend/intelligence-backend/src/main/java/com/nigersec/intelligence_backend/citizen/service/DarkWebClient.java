package com.nigersec.intelligence_backend.citizen.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.nigersec.intelligence_backend.citizen.dto.BreachCheckResponse;
import com.nigersec.intelligence_backend.citizen.entity.DataType;
import com.nigersec.intelligence_backend.citizen.entity.SeverityLevel;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.Collections;
import java.util.HexFormat;
import java.util.List;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Client for the BreachDirectory API (https://breachdirectory.org).
 * Used as a fallback when the local breach_records table has no results.
 *
 * API docs: https://breachdirectory.org/api_documentation
 * - GET /v1/?func=auto&term=<sha1-prefix>   (email — k-anonymity)
 * - GET /v1/?func=auto&term=<raw-value>      (phone / BVN / NIN)
 *
 * Set DARK_WEB_API_KEY in application.yaml / environment to enable.
 * If the key is blank the client returns an empty result (no-op).
 */
@Slf4j
@Service
public class DarkWebClient {

    @Value("${nigersec.dark-web.api-key:}")
    private String apiKey;

    @Value("${nigersec.dark-web.base-url:https://api.breachdirectory.org}")
    private String baseUrl;

    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /**
     * Query BreachDirectory for the given identifier.
     * Returns an empty list when: API key is not configured, rate-limited,
     * network error, or no results found — so the caller degrades gracefully.
     */
    public List<BreachCheckResponse.BreachSummary> search(String rawIdentifier, DataType dataType) {
        if (apiKey == null || apiKey.isBlank()) {
            log.debug("DarkWebClient: no API key configured — skipping external breach lookup");
            return Collections.emptyList();
        }

        try {
            // For email use SHA-1 prefix (k-anonymity). For others send raw value.
            String term = dataType == DataType.EMAIL
                    ? sha1Prefix(rawIdentifier.trim().toLowerCase())
                    : rawIdentifier.trim();

            String url = baseUrl + "/v1/?func=auto&term=" + term;

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(8))
                    .GET()
                    .build();

            HttpResponse<String> resp = HTTP.send(req, HttpResponse.BodyHandlers.ofString());

            if (resp.statusCode() == 401 || resp.statusCode() == 403) {
                log.warn("DarkWebClient: invalid or expired API key (HTTP {})", resp.statusCode());
                return Collections.emptyList();
            }
            if (resp.statusCode() == 429) {
                log.warn("DarkWebClient: rate limited by BreachDirectory");
                return Collections.emptyList();
            }
            if (resp.statusCode() != 200) {
                log.warn("DarkWebClient: unexpected HTTP {} from BreachDirectory", resp.statusCode());
                return Collections.emptyList();
            }

            return parseResponse(resp.body(), dataType);

        } catch (Exception e) {
            log.warn("DarkWebClient: external lookup failed — {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    // ── Response parsing ────────────────────────────────────────────────────

    private List<BreachCheckResponse.BreachSummary> parseResponse(String body, DataType dataType) {
        try {
            BDResponse response = MAPPER.readValue(body, BDResponse.class);
            if (response.result == null || response.result.isEmpty()) return Collections.emptyList();

            return response.result.stream()
                    .map(r -> BreachCheckResponse.BreachSummary.builder()
                            .source(r.sources != null && !r.sources.isEmpty()
                                    ? String.join(", ", r.sources)
                                    : "BreachDirectory")
                            .exposedFields(buildExposedFields(r))
                            .severity(mapSeverity(r))
                            .breachDate(Instant.now())
                            .action(recommendedAction(dataType))
                            .build())
                    .toList();

        } catch (Exception e) {
            log.warn("DarkWebClient: failed to parse response — {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private String buildExposedFields(BDEntry e) {
        StringBuilder sb = new StringBuilder();
        if (Boolean.TRUE.equals(e.hasEmail))    sb.append("email,");
        if (Boolean.TRUE.equals(e.hasPassword)) sb.append("password,");
        if (Boolean.TRUE.equals(e.hasName))     sb.append("name,");
        if (Boolean.TRUE.equals(e.hasPhone))    sb.append("phone,");
        if (Boolean.TRUE.equals(e.hasAddress))  sb.append("address,");
        String result = sb.toString();
        return result.endsWith(",") ? result.substring(0, result.length() - 1)
                : result.isEmpty() ? "credentials" : result;
    }

    private SeverityLevel mapSeverity(BDEntry e) {
        if (Boolean.TRUE.equals(e.hasPassword)) return SeverityLevel.CRITICAL;
        if (Boolean.TRUE.equals(e.hasPhone) || Boolean.TRUE.equals(e.hasAddress)) return SeverityLevel.HIGH;
        return SeverityLevel.MEDIUM;
    }

    private String recommendedAction(DataType type) {
        return switch (type) {
            case EMAIL -> "Change your password immediately and enable 2FA on all accounts.";
            case PHONE -> "Enable SIM swap protection with your carrier. Contact your bank.";
            case BVN   -> "Call your bank immediately to freeze your account and request BVN re-validation.";
            case NIN   -> "Report to NIMC and place a fraud alert with your bank.";
        };
    }

    // ── SHA-1 prefix for k-anonymity ────────────────────────────────────────

    private static String sha1Prefix(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-1");
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash).substring(0, 5).toUpperCase();
        } catch (Exception e) {
            throw new RuntimeException("SHA-1 unavailable", e);
        }
    }

    // ── BreachDirectory JSON model ───────────────────────────────────────────

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    static class BDResponse {
        @JsonProperty("result")
        List<BDEntry> result;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    static class BDEntry {
        @JsonProperty("sources")
        List<String> sources;

        @JsonProperty("has_email")
        Boolean hasEmail;

        @JsonProperty("has_password")
        Boolean hasPassword;

        @JsonProperty("has_name")
        Boolean hasName;

        @JsonProperty("has_phone")
        Boolean hasPhone;

        @JsonProperty("has_address")
        Boolean hasAddress;
    }
}
