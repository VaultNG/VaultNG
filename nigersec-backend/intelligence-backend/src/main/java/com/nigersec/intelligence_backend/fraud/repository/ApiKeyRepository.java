package com.nigersec.intelligence_backend.fraud.repository;

import com.nigersec.intelligence_backend.fraud.entity.ApiKey;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ApiKeyRepository extends JpaRepository<ApiKey, UUID> {
    Optional<ApiKey> findByKeyHashAndActiveTrue(String keyHash);
    List<ApiKey> findByInstitutionIdAndActiveTrue(UUID institutionId);
}
