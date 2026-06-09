package com.nigersec.intelligence_backend.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaTopicsConfig {

    public static final String TOPIC_BREACH_DETECTED    = "nigersec.breach.detected";
    public static final String TOPIC_THREAT_INTEL       = "nigersec.threat.intel";
    public static final String TOPIC_FRAUD_FLAGGED      = "nigersec.fraud.flagged";
    public static final String TOPIC_ALERT_CITIZEN      = "nigersec.alert.citizen";
    public static final String TOPIC_COMPLIANCE_REPORT  = "nigersec.compliance.report";

    @Bean public NewTopic breachDetected()   { return TopicBuilder.name(TOPIC_BREACH_DETECTED).partitions(3).replicas(1).build(); }
    @Bean public NewTopic threatIntel()      { return TopicBuilder.name(TOPIC_THREAT_INTEL).partitions(3).replicas(1).build(); }
    @Bean public NewTopic fraudFlagged()     { return TopicBuilder.name(TOPIC_FRAUD_FLAGGED).partitions(3).replicas(1).build(); }
    @Bean public NewTopic alertCitizen()     { return TopicBuilder.name(TOPIC_ALERT_CITIZEN).partitions(3).replicas(1).build(); }
    @Bean public NewTopic complianceReport() { return TopicBuilder.name(TOPIC_COMPLIANCE_REPORT).partitions(1).replicas(1).build(); }
}
