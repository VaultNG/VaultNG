package com.nigersec.intelligence_backend.citizen.service;

import com.nigersec.intelligence_backend.citizen.dto.BreachCheckRequest;
import com.nigersec.intelligence_backend.citizen.dto.BreachCheckResponse;
import com.nigersec.intelligence_backend.citizen.dto.MonitoringRequest;
import com.nigersec.intelligence_backend.citizen.entity.BreachRecord;
import com.nigersec.intelligence_backend.citizen.entity.MonitoringSubscription;
import com.nigersec.intelligence_backend.citizen.repository.BreachRecordRepository;
import com.nigersec.intelligence_backend.citizen.repository.MonitoringSubscriptionRepository;
import com.nigersec.intelligence_backend.common.exception.NigerSecException;
import com.nigersec.intelligence_backend.messaging.KafkaEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class BreachCheckService {

    private final BreachRecordRepository breachRecordRepository;
    private final MonitoringSubscriptionRepository monitoringSubscriptionRepository;
    private final KafkaEventPublisher eventPublisher;
    private final DarkWebClient darkWebClient;

    /**
     * Zero-knowledge breach check.
     * 1. Check local breach_records DB (seeded / imported data).
     * 2. If empty, fall back to BreachDirectory external API.
     * The raw identifier is hashed before any DB query and never persists.
     */
    @Cacheable(value = "breach-checks", key = "#request.dataType + ':' + #root.target.sha256(#request.identifier)")
    public BreachCheckResponse checkBreach(BreachCheckRequest request) {
        String hash = sha256(request.getIdentifier());
        List<BreachRecord> records = breachRecordRepository.findByDataHashAndDataType(hash, request.getDataType());

        List<BreachCheckResponse.BreachSummary> summaries = new ArrayList<>();

        // Local DB results
        records.stream()
                .map(r -> BreachCheckResponse.BreachSummary.builder()
                        .source(r.getSourceDescription())
                        .exposedFields(r.getExposedFields())
                        .severity(r.getSeverity())
                        .breachDate(r.getBreachDate())
                        .action(r.getRecommendedAction())
                        .build())
                .forEach(summaries::add);

        // External BreachDirectory fallback when local DB is empty
        if (summaries.isEmpty()) {
            log.debug("Local DB empty for {} — querying BreachDirectory", request.getDataType());
            darkWebClient.search(request.getIdentifier(), request.getDataType())
                    .forEach(summaries::add);
        }

        if (summaries.isEmpty()) {
            return BreachCheckResponse.builder()
                    .breached(false)
                    .breachCount(0)
                    .recommendation("No known breaches found. Continue practicing safe digital hygiene.")
                    .build();
        }

        // Publish to Kafka so institution portal can be alerted
        eventPublisher.publishBreachDetected(Map.of(
                "dataType", request.getDataType().name(),
                "breachCount", summaries.size(),
                "maxSeverity", summaries.stream()
                        .map(s -> s.getSeverity().name()).max(String::compareTo).orElse("LOW")
        ));

        return BreachCheckResponse.builder()
                .breached(true)
                .breachCount(summaries.size())
                .breaches(summaries)
                .recommendation("Your data has been exposed. Immediately change passwords and enable 2FA on all financial accounts.")
                .build();
    }

    /**
     * Subscribe a user to ongoing monitoring for a specific identifier.
     * Requires a paid subscription (validation handled externally).
     */
    public MonitoringSubscription subscribe(UUID userId, MonitoringRequest request) {
        String hash = sha256(request.getIdentifier());

        monitoringSubscriptionRepository
                .findByUserIdAndDataHashAndActiveTrue(userId, hash)
                .ifPresent(s -> { throw NigerSecException.conflict("Already monitoring this identifier"); });

        return monitoringSubscriptionRepository.save(MonitoringSubscription.builder()
                .userId(userId)
                .dataHash(hash)
                .dataType(request.getDataType())
                .active(true)
                .build());
    }

    public List<MonitoringSubscription> getSubscriptions(UUID userId) {
        return monitoringSubscriptionRepository.findByUserIdAndActiveTrue(userId);
    }

    public void cancelSubscription(UUID userId, UUID subscriptionId) {
        MonitoringSubscription sub = monitoringSubscriptionRepository.findById(subscriptionId)
                .orElseThrow(() -> NigerSecException.notFound("Subscription not found"));

        if (!sub.getUserId().equals(userId)) {
            throw NigerSecException.forbidden("You do not own this subscription");
        }

        sub.setActive(false);
        monitoringSubscriptionRepository.save(sub);
    }

    public static String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.trim().toLowerCase().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }
}
