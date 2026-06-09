package com.nigersec.intelligence_backend.messaging;

import com.nigersec.intelligence_backend.config.KafkaTopicsConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Slf4j
@Component
public class NigerSecKafkaConsumer {

    /**
     * Data flywheel: when a breach is confirmed via citizen portal,
     * feed the signal back into the threat intelligence layer.
     */
    @KafkaListener(topics = KafkaTopicsConfig.TOPIC_BREACH_DETECTED, groupId = "nigersec-breach")
    public void onBreachDetected(Map<String, Object> event) {
        log.info("Breach event received - type: {}, severity: {}",
                event.get("dataType"), event.get("maxSeverity"));
        // TODO: trigger real-time alert to subscribed institutions via WebSocket/SSE
    }

    /**
     * When a high-risk fraud signal is flagged, propagate to relevant institutions.
     */
    @KafkaListener(topics = KafkaTopicsConfig.TOPIC_FRAUD_FLAGGED, groupId = "nigersec-fraud")
    public void onFraudFlagged(Map<String, Object> event) {
        log.info("Fraud flagged - transactionId: {}, riskScore: {}, decision: {}",
                event.get("transactionId"), event.get("riskScore"), event.get("decision"));
        // TODO: send real-time push/SMS alert to institution compliance team
    }

    /**
     * Broadcast threat intelligence to all active institutional subscribers.
     */
    @KafkaListener(topics = KafkaTopicsConfig.TOPIC_THREAT_INTEL, groupId = "nigersec-intel")
    public void onThreatIntel(Map<String, Object> event) {
        log.info("Threat intel broadcast - attackType: {}, severity: {}",
                event.get("attackType"), event.get("severity"));
        // TODO: push to institution dashboard WebSocket streams
    }

    @KafkaListener(topics = KafkaTopicsConfig.TOPIC_ALERT_CITIZEN, groupId = "nigersec-citizen-alert")
    public void onCitizenAlert(Map<String, Object> event) {
        log.info("Citizen alert queued for userId: {}", event.get("userId"));
        // TODO: dispatch SMS + email + push notification
    }
}
