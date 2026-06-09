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

    /**
     * Zero-knowledge breach check.
     * The raw identifier is hashed before any DB query.
     * The raw value never persists.
     */
    @Cacheable(value = "breach-checks", key = "#request.dataType + ':' + T(com.nigersec.intelligence_backend.citizen.service.BreachCheckService).sha256(#request.identifier)")
    public BreachCheckResponse checkBreach(BreachCheckRequest request) {
        String hash = sha256(request.getIdentifier());
        List<BreachRecord> records = breachRecordRepository.findByDataHashAndDataType(hash, request.getDataType());

        if (records.isEmpty()) {
            return BreachCheckResponse.builder()
                    .breached(false)
                    .breachCount(0)
                    .recommendation("No known breaches found. Continue practicing safe digital hygiene.")
                    .build();
        }

        List<BreachCheckResponse.BreachSummary> summaries = records.stream()
                .map(r -> BreachCheckResponse.BreachSummary.builder()
                        .source(r.getSourceDescription())
                        .exposedFields(r.getExposedFields())
                        .severity(r.getSeverity())
                        .breachDate(r.getBreachDate())
                        .action(r.getRecommendedAction())
                        .build())
                .toList();

        // Publish to Kafka so institution portal can be alerted
        eventPublisher.publishBreachDetected(Map.of(
                "dataType", request.getDataType().name(),
                "breachCount", records.size(),
                "maxSeverity", records.stream()
                        .map(r -> r.getSeverity().name()).max(String::compareTo).orElse("LOW")
        ));

        return BreachCheckResponse.builder()
                .breached(true)
                .breachCount(records.size())
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
