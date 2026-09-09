-- BLUEWRITE migration — dynamic incident-type-specific fields
-- Adds a JSON column holding the type-specific field values for the selected
-- incident type(s) (theft, robbery, traffic accident, fire incident, etc.).
-- Which fields belong to which type is defined by the field registry in
-- backend/src/services/incidentTypeFields.js; the column itself is schema-
-- agnostic so future incident types need no further migrations.
USE bluewrite_db;

ALTER TABLE reports
  ADD COLUMN type_specific_data JSON NULL COMMENT 'Sec: dynamic incident-type fields — key/value pairs for the selected incident type(s), validated against the field registry' AFTER report_time;
