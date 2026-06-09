package com.nigersec.intelligence_backend.citizen.repository;

import com.nigersec.intelligence_backend.citizen.entity.BreachRecord;
import com.nigersec.intelligence_backend.citizen.entity.DataType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface BreachRecordRepository extends JpaRepository<BreachRecord, UUID> {

    List<BreachRecord> findByDataHashAndDataType(String dataHash, DataType dataType);

    boolean existsByDataHashAndDataType(String dataHash, DataType dataType);

    @Query("SELECT COUNT(b) FROM BreachRecord b WHERE b.dataHash = :hash")
    long countByDataHash(String hash);

    List<BreachRecord> findTop10ByOrderByAddedAtDesc();
}
