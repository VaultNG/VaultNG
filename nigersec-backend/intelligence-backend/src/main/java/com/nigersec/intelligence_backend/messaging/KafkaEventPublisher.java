package com.nigersec.intelligence_backend.messaging;

import com.nigersec.intelligence_backend.config.KafkaTopicsConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class KafkaEventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishBreachDetected(Map<String, Object> payload) {
        send(KafkaTopicsConfig.TOPIC_BREACH_DETECTED, payload);
    }

    public void publishThreatIntel(Map<String, Object> payload) {
        send(KafkaTopicsConfig.TOPIC_THREAT_INTEL, payload);
    }

    public void publishFraudFlagged(Map<String, Object> payload) {
        send(KafkaTopicsConfig.TOPIC_FRAUD_FLAGGED, payload);
    }

    public void publishCitizenAlert(Map<String, Object> payload) {
        send(KafkaTopicsConfig.TOPIC_ALERT_CITIZEN, payload);
    }

    public void publishComplianceReport(Map<String, Object> payload) {
        send(KafkaTopicsConfig.TOPIC_COMPLIANCE_REPORT, payload);
    }

    private void send(String topic, Object payload) {
        kafkaTemplate.send(topic, payload)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.error("Failed to publish to topic {}: {}", topic, ex.getMessage());
                    } else {
                        log.debug("Published to topic {} offset {}", topic,
                                result.getRecordMetadata().offset());
                    }
                });
    }
}
