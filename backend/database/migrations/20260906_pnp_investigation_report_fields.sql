-- BLUEWRITE migration — PNP memorandum-style investigation report fields
-- Adds the structured sections of a standard PNP Investigation Report:
-- authority, matters investigated, facts-of-the-case support, discussion,
-- conclusion, and recommendation, plus the station header and signatory
-- blocks used by the printable memorandum layout.
USE bluewrite_db;

ALTER TABLE reports
  ADD COLUMN authority TEXT NULL COMMENT 'PNP Investigation Report Sec. I — authority basis (blotter entries, inherent police functions, SOP)' AFTER narrative,
  ADD COLUMN matters_investigated TEXT NULL COMMENT 'PNP Investigation Report Sec. II — matters to be investigated (numbered objectives)' AFTER authority,
  ADD COLUMN discussion TEXT NULL COMMENT 'PNP Investigation Report Sec. IV — discussion / evaluation connecting facts to offense elements' AFTER matters_investigated,
  ADD COLUMN conclusion TEXT NULL COMMENT 'PNP Investigation Report Sec. V — conclusion establishing who, what, when, where, how' AFTER discussion,
  ADD COLUMN recommendation TEXT NULL COMMENT 'PNP Investigation Report Sec. VI — recommended next action (filing of charges, referral, further investigation)' AFTER conclusion,
  ADD COLUMN station_name VARCHAR(255) NULL COMMENT 'Header block — PNP station name' AFTER recommendation,
  ADD COLUMN station_region VARCHAR(255) NULL COMMENT 'Header block — regional office' AFTER station_name,
  ADD COLUMN station_address VARCHAR(255) NULL COMMENT 'Header block — city/municipality, province, ZIP code' AFTER station_region,
  ADD COLUMN station_email VARCHAR(255) NULL COMMENT 'Header block — station email address' AFTER station_address,
  ADD COLUMN station_contact VARCHAR(100) NULL COMMENT 'Header block — station telephone number' AFTER station_email,
  ADD COLUMN approving_authority_name VARCHAR(255) NULL COMMENT 'Signatory block — approving officer (Chief of Police / OIC) name' AFTER station_contact,
  ADD COLUMN approving_authority_rank VARCHAR(100) NULL COMMENT 'Signatory block — approving officer rank' AFTER approving_authority_name,
  ADD COLUMN recipient_office VARCHAR(255) NULL COMMENT 'Memorandum block — FOR line (recipient office/officer)' AFTER approving_authority_rank;
