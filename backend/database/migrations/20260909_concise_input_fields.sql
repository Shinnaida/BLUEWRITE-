-- BLUEWRITE — Concise input form: blotter entry number + victim role/relationship.
-- Two short structured inputs required by the redesigned 8-section form so the
-- AI can build §I AUTHORITY (blotter entry) and §II/§III (victim relationship)
-- from officer data instead of narrative text.

ALTER TABLE reports
  ADD COLUMN blotter_entry_no VARCHAR(100) NULL AFTER location,
  ADD COLUMN victim_role VARCHAR(255) NULL AFTER victim_contact_number;
