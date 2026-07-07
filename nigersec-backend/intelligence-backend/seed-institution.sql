-- =============================================================================
--  NigerSec — Seed a real Institution row (production use)
--
--  Run this ONCE against your PostgreSQL database after the backend has
--  started for the first time (which creates the "institutions" table via
--  Hibernate DDL).
--
--  Usage:
--    psql -h <host> -U <user> -d nigersec -f seed-institution.sql
--
--  After running, copy the printed UUID and give it to anyone who needs to
--  register as an INSTITUTION user on the portal.
-- =============================================================================

-- Adjust the values below before running. ----------------------
DO $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO institutions (
    id,
    name,
    type,
    tier,
    contact_email,
    rc_number,
    ndpa_compliant,
    onboarded_at
  )
  VALUES (
    gen_random_uuid(),
    'Your Institution Name',           -- change this
    'BANK',                            -- BANK | FINTECH | TELECOM | HOSPITAL | UNIVERSITY | OTHER
    'TIER_ONE',                        -- TIER_ONE | TIER_TWO | TIER_THREE
    'security@yourinstitution.ng',     -- change this
    'RC000000',                        -- CAC registration number, change this
    true,
    now()
  )
  RETURNING id INTO new_id;

  RAISE NOTICE '===================================================';
  RAISE NOTICE 'Institution created.';
  RAISE NOTICE 'Institution ID (give this to your users): %', new_id;
  RAISE NOTICE '===================================================';
END $$;
