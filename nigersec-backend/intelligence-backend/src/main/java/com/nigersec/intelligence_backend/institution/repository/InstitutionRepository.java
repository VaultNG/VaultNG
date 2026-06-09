package com.nigersec.intelligence_backend.institution.repository;

import com.nigersec.intelligence_backend.institution.entity.Institution;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface InstitutionRepository extends JpaRepository<Institution, UUID> {
    Optional<Institution> findByName(String name);
    boolean existsByRcNumber(String rcNumber);
}
