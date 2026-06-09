package com.nigersec.intelligence_backend.citizen.repository;

import com.nigersec.intelligence_backend.citizen.entity.MonitoringSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MonitoringSubscriptionRepository extends JpaRepository<MonitoringSubscription, UUID> {

    List<MonitoringSubscription> findByUserIdAndActiveTrue(UUID userId);

    Optional<MonitoringSubscription> findByUserIdAndDataHashAndActiveTrue(UUID userId, String dataHash);

    List<MonitoringSubscription> findByDataHashAndActiveTrue(String dataHash);
}
