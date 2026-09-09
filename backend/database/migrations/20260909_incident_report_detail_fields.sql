-- BLUEWRITE migration — structured incident report detail fields
-- Adds the flat columns for the 10-section incident report input spec:
-- incident information, complainant, victim, suspect, incident details,
-- property/damage, witness, evidence, police action, and reporting officer.
-- All columns are nullable/optional — they never block submission.
USE bluewrite_db;

ALTER TABLE reports
  -- 1. Incident information
  ADD COLUMN date_reported DATE NULL COMMENT 'Sec.1 — date the incident was reported' AFTER incident_time,
  ADD COLUMN time_reported TIME NULL COMMENT 'Sec.1 — time the incident was reported' AFTER date_reported,
  ADD COLUMN barangay VARCHAR(100) NULL COMMENT 'Sec.1 — barangay of the incident location' AFTER location,
  ADD COLUMN city VARCHAR(100) NULL COMMENT 'Sec.1 — city/municipality of the incident location' AFTER barangay,
  ADD COLUMN province VARCHAR(100) NULL COMMENT 'Sec.1 — province of the incident location' AFTER city,
  ADD COLUMN specific_place VARCHAR(255) NULL COMMENT 'Sec.1 — specific place within the location' AFTER province,
  -- 2. Complainant information
  ADD COLUMN complainant_full_name VARCHAR(255) NULL COMMENT 'Sec.2 — complainant full name' AFTER specific_place,
  ADD COLUMN complainant_age VARCHAR(10) NULL COMMENT 'Sec.2 — complainant age' AFTER complainant_full_name,
  ADD COLUMN complainant_sex VARCHAR(20) NULL COMMENT 'Sec.2 — complainant sex' AFTER complainant_age,
  ADD COLUMN complainant_address VARCHAR(500) NULL COMMENT 'Sec.2 — complainant address' AFTER complainant_sex,
  ADD COLUMN complainant_contact_number VARCHAR(50) NULL COMMENT 'Sec.2 — complainant contact number' AFTER complainant_address,
  ADD COLUMN complainant_role VARCHAR(100) NULL COMMENT 'Sec.2 — complainant role in the incident' AFTER complainant_contact_number,
  -- 3. Victim information
  ADD COLUMN victim_full_name VARCHAR(255) NULL COMMENT 'Sec.3 — victim full name' AFTER complainant_role,
  ADD COLUMN victim_age VARCHAR(10) NULL COMMENT 'Sec.3 — victim age' AFTER victim_full_name,
  ADD COLUMN victim_sex VARCHAR(20) NULL COMMENT 'Sec.3 — victim sex' AFTER victim_age,
  ADD COLUMN victim_address VARCHAR(500) NULL COMMENT 'Sec.3 — victim address' AFTER victim_sex,
  ADD COLUMN victim_contact_number VARCHAR(50) NULL COMMENT 'Sec.3 — victim contact number' AFTER victim_address,
  ADD COLUMN victim_injuries TEXT NULL COMMENT 'Sec.3 — injuries sustained by the victim' AFTER victim_contact_number,
  ADD COLUMN victim_damage_or_loss TEXT NULL COMMENT 'Sec.3 — damage or loss suffered by the victim' AFTER victim_injuries,
  -- 4. Suspect information
  ADD COLUMN suspect_name VARCHAR(255) NULL COMMENT 'Sec.4 — suspect name' AFTER victim_damage_or_loss,
  ADD COLUMN suspect_alias VARCHAR(255) NULL COMMENT 'Sec.4 — suspect alias/nickname' AFTER suspect_name,
  ADD COLUMN suspect_age VARCHAR(10) NULL COMMENT 'Sec.4 — suspect age' AFTER suspect_alias,
  ADD COLUMN suspect_sex VARCHAR(20) NULL COMMENT 'Sec.4 — suspect sex' AFTER suspect_age,
  ADD COLUMN suspect_address VARCHAR(500) NULL COMMENT 'Sec.4 — suspect address' AFTER suspect_sex,
  ADD COLUMN suspect_physical_description TEXT NULL COMMENT 'Sec.4 — suspect physical description' AFTER suspect_address,
  ADD COLUMN suspect_status VARCHAR(100) NULL COMMENT 'Sec.4 — suspect status (at large, arrested, identified, unknown)' AFTER suspect_physical_description,
  -- 5. Incident details
  ADD COLUMN what_happened TEXT NULL COMMENT 'Sec.5 — what happened' AFTER suspect_status,
  ADD COLUMN people_involved TEXT NULL COMMENT 'Sec.5 — people involved in the incident' AFTER what_happened,
  ADD COLUMN sequence_of_events TEXT NULL COMMENT 'Sec.5 — chronological sequence of events' AFTER people_involved,
  ADD COLUMN actions_of_suspect TEXT NULL COMMENT 'Sec.5 — actions of the suspect' AFTER sequence_of_events,
  ADD COLUMN actions_of_victim TEXT NULL COMMENT 'Sec.5 — actions of the victim' AFTER actions_of_suspect,
  ADD COLUMN circumstances_before_incident TEXT NULL COMMENT 'Sec.5 — circumstances before the incident' AFTER actions_of_victim,
  ADD COLUMN circumstances_after_incident TEXT NULL COMMENT 'Sec.5 — circumstances after the incident' AFTER circumstances_before_incident,
  -- 6. Property / damage
  ADD COLUMN property_involved VARCHAR(255) NULL COMMENT 'Sec.6 — property involved' AFTER circumstances_after_incident,
  ADD COLUMN property_description TEXT NULL COMMENT 'Sec.6 — description of the property' AFTER property_involved,
  ADD COLUMN quantity VARCHAR(100) NULL COMMENT 'Sec.6 — quantity of property involved' AFTER property_description,
  ADD COLUMN estimated_value VARCHAR(50) NULL COMMENT 'Sec.6 — estimated value of the property' AFTER quantity,
  ADD COLUMN type_of_damage VARCHAR(255) NULL COMMENT 'Sec.6 — type of damage' AFTER estimated_value,
  ADD COLUMN estimated_damage_cost VARCHAR(50) NULL COMMENT 'Sec.6 — estimated cost of damage' AFTER type_of_damage,
  -- 7. Witness information
  ADD COLUMN witness_name VARCHAR(255) NULL COMMENT 'Sec.7 — witness name' AFTER estimated_damage_cost,
  ADD COLUMN witness_age VARCHAR(10) NULL COMMENT 'Sec.7 — witness age' AFTER witness_name,
  ADD COLUMN witness_address VARCHAR(500) NULL COMMENT 'Sec.7 — witness address' AFTER witness_age,
  ADD COLUMN witness_contact_number VARCHAR(50) NULL COMMENT 'Sec.7 — witness contact number' AFTER witness_address,
  ADD COLUMN witness_statement TEXT NULL COMMENT 'Sec.7 — witness statement' AFTER witness_contact_number,
  -- 8. Evidence
  ADD COLUMN evidence_available VARCHAR(20) NULL COMMENT 'Sec.8 — whether evidence is available (Yes/No)' AFTER witness_statement,
  ADD COLUMN evidence_type VARCHAR(255) NULL COMMENT 'Sec.8 — type of evidence' AFTER evidence_available,
  ADD COLUMN evidence_description TEXT NULL COMMENT 'Sec.8 — description of the evidence' AFTER evidence_type,
  ADD COLUMN evidence_location VARCHAR(500) NULL COMMENT 'Sec.8 — where the evidence is located/held' AFTER evidence_description,
  ADD COLUMN cctv_available VARCHAR(20) NULL COMMENT 'Sec.8 — whether CCTV footage is available (Yes/No)' AFTER evidence_location,
  ADD COLUMN cctv_description TEXT NULL COMMENT 'Sec.8 — description of CCTV coverage/footage' AFTER cctv_available,
  ADD COLUMN attached_documents TEXT NULL COMMENT 'Sec.8 — attached supporting documents' AFTER cctv_description,
  -- 9. Police action
  ADD COLUMN responding_officers VARCHAR(500) NULL COMMENT 'Sec.9 — responding officers' AFTER attached_documents,
  ADD COLUMN initial_response TEXT NULL COMMENT 'Sec.9 — initial police response' AFTER responding_officers,
  ADD COLUMN actions_taken TEXT NULL COMMENT 'Sec.9 — actions taken by police' AFTER initial_response,
  ADD COLUMN evidence_collected TEXT NULL COMMENT 'Sec.9 — evidence collected at the scene' AFTER actions_taken,
  ADD COLUMN persons_interviewed TEXT NULL COMMENT 'Sec.9 — persons interviewed' AFTER evidence_collected,
  ADD COLUMN medical_assistance VARCHAR(255) NULL COMMENT 'Sec.9 — medical assistance provided' AFTER persons_interviewed,
  ADD COLUMN arrest_made VARCHAR(20) NULL COMMENT 'Sec.9 — whether an arrest was made (Yes/No)' AFTER medical_assistance,
  ADD COLUMN referral_or_endorsement TEXT NULL COMMENT 'Sec.9 — referral or endorsement made' AFTER arrest_made,
  ADD COLUMN current_case_status VARCHAR(100) NULL COMMENT 'Sec.9 — current case status' AFTER referral_or_endorsement,
  -- 10. Reporting officer (name/rank/badge/unit come from the officers table)
  ADD COLUMN report_date DATE NULL COMMENT 'Sec.10 — date the report was prepared' AFTER current_case_status,
  ADD COLUMN report_time TIME NULL COMMENT 'Sec.10 — time the report was prepared' AFTER report_date;
