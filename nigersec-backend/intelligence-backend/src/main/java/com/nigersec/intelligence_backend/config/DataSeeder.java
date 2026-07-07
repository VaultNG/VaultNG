package com.nigersec.intelligence_backend.config;

import com.nigersec.intelligence_backend.citizen.entity.BreachRecord;
import com.nigersec.intelligence_backend.citizen.entity.DataType;
import com.nigersec.intelligence_backend.citizen.entity.SeverityLevel;
import com.nigersec.intelligence_backend.citizen.repository.BreachRecordRepository;
import com.nigersec.intelligence_backend.citizen.service.BreachCheckService;
import com.nigersec.intelligence_backend.institution.entity.Institution;
import com.nigersec.intelligence_backend.institution.entity.InstitutionType;
import com.nigersec.intelligence_backend.institution.entity.SubscriptionTier;
import com.nigersec.intelligence_backend.institution.repository.InstitutionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

/**
 * Seeds the database with sample data for development/demo purposes.
 * Only runs when the "dev" or "default" profile is active.
 * Skips seeding if data already exists (idempotent).
 */
@Slf4j
@Component
@Profile("!prod")
@RequiredArgsConstructor
public class DataSeeder implements ApplicationRunner {

    private final BreachRecordRepository breachRecordRepository;
    private final InstitutionRepository institutionRepository;

    // Sample test identifiers — these will be flagged as breached
    // Use these in the UI to see breach results:
    //   Email:  test@example.com
    //   Phone:  2348012345678
    //   BVN:    12345678901
    //   NIN:    98765432101
    private static final List<SeedRecord> SEED_BREACHES = List.of(
        new SeedRecord("test@example.com", DataType.EMAIL,
            "Flutterwave Data Breach — Apr 2024",
            "email,name,phone,bank_account",
            SeverityLevel.HIGH,
            "Change your password immediately and enable 2FA on all financial accounts.",
            Instant.parse("2024-04-15T00:00:00Z")),

        new SeedRecord("test@example.com", DataType.EMAIL,
            "Jumia Nigeria Database Leak — Aug 2022",
            "email,name,delivery_address,order_history",
            SeverityLevel.MEDIUM,
            "Monitor for phishing emails using your personal details.",
            Instant.parse("2022-08-20T00:00:00Z")),

        new SeedRecord("2348012345678", DataType.PHONE,
            "MTN Nigeria Subscriber Dump — Jan 2023",
            "phone,name,address,NIN_fragment",
            SeverityLevel.CRITICAL,
            "Contact your bank to flag your account. Request a new SIM from your carrier.",
            Instant.parse("2023-01-10T00:00:00Z")),

        new SeedRecord("12345678901", DataType.BVN,
            "Dark Web Financial Credentials Dump — Mar 2024",
            "BVN,bank_name,account_number_fragment",
            SeverityLevel.CRITICAL,
            "Call your bank immediately to freeze your account and request a BVN re-validation.",
            Instant.parse("2024-03-05T00:00:00Z")),

        new SeedRecord("98765432101", DataType.NIN,
            "NIMC Contractor Breach — Dec 2023",
            "NIN,full_name,date_of_birth,state_of_origin",
            SeverityLevel.HIGH,
            "Report to NIMC and monitor for identity theft. Place a fraud alert with your bank.",
            Instant.parse("2023-12-01T00:00:00Z"))
    );

    @Override
    public void run(ApplicationArguments args) {
        seedBreachRecords();
        seedInstitution();
    }

    private void seedBreachRecords() {
        if (breachRecordRepository.count() > 0) {
            log.debug("Breach records already seeded — skipping.");
            return;
        }

        List<BreachRecord> records = SEED_BREACHES.stream().map(s -> BreachRecord.builder()
                .dataHash(BreachCheckService.sha256(s.identifier()))
                .dataType(s.dataType())
                .sourceDescription(s.source())
                .exposedFields(s.fields())
                .severity(s.severity())
                .recommendedAction(s.action())
                .breachDate(s.breachDate())
                .build()
        ).toList();

        breachRecordRepository.saveAll(records);
        log.info("Seeded {} breach records for development. " +
                 "Test with: email=test@example.com, phone=2348012345678, BVN=12345678901, NIN=98765432101",
                 records.size());
    }

    private void seedInstitution() {
        if (institutionRepository.count() > 0) {
            log.debug("Institution already seeded — skipping.");
            return;
        }

        Institution inst = Institution.builder()
                .name("First Bank of Nigeria (Demo)")
                .type(InstitutionType.BANK)
                .tier(SubscriptionTier.TIER_ONE)
                .contactEmail("security@firstbank.demo")
                .rcNumber("RC000001")
                .ndpaCompliant(true)
                .build();

        Institution saved = institutionRepository.save(inst);
        log.info("Seeded demo institution '{}' with ID: {}. " +
                 "Use this ID as X-Institution-Id header for /institution and /fraud endpoints.",
                 saved.getName(), saved.getId());
    }

    private record SeedRecord(
        String identifier,
        DataType dataType,
        String source,
        String fields,
        SeverityLevel severity,
        String action,
        Instant breachDate
    ) {}
}
