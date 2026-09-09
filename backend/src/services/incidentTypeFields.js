// BLUEWRITE — Incident-type field registry (backend)
// Single source of truth for the dynamic, incident-type-specific fields.
// The COMMON_FIELDS below map to existing report columns (no duplicate data);
// the TYPE_FIELDS sets are stored as JSON in reports.type_specific_data and
// validated on write. Mirrored on the frontend in
// frontend/src/utils/incidentTypeFields.js — keep both in sync.

// Common fields for all incident types — each maps to an existing reports
// column, so nothing here is stored in type_specific_data.
const COMMON_FIELD_MAPPING = {
  incident_type: 'incident_type',
  incident_date: 'incident_date',
  incident_time: 'incident_time',
  date_reported: 'date_reported',
  time_reported: 'time_reported',
  barangay: 'barangay',
  city: 'city',
  province: 'province',
  specific_location: 'specific_place',
  complainant_name: 'complainant_full_name',
  complainant_age: 'complainant_age',
  complainant_sex: 'complainant_sex',
  complainant_address: 'complainant_address',
  complainant_contact: 'complainant_contact_number',
  incident_description: 'narrative',
  police_action_taken: 'actions_taken',
  evidence_available: 'evidence_available',
  witness_information: 'witness_statement',
  responding_officer: 'responding_officers',
  officer_rank: 'officer_rank',
  case_status: 'current_case_status',
};

const TEXT = 'text';
const TEXTAREA = 'textarea';
const NUMBER = 'number';
const SELECT = 'select';

// Field definition helper: [name, label, type, options?]
const f = (name, label, type = TEXT, options = null) => ({ name, label, type, options });

const YES_NO = [
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
];

// 14 type-specific field sets. A field may appear in several sets (e.g.
// witness_information is mapped to the common column and thus excluded here;
// police_action_taken likewise). Only fields stored in type_specific_data
// are listed.
const TYPE_FIELDS = {
  theft: [
    f('item_stolen', 'Item stolen'),
    f('item_description', 'Item description', TEXTAREA),
    f('owner_of_property', 'Owner of property'),
    f('location_of_property', 'Location of property'),
    f('how_property_was_taken', 'How property was taken', TEXTAREA),
    f('suspect_description', 'Suspect description', TEXTAREA),
    f('recovery_status', 'Recovery status'),
  ],
  robbery: [
    f('property_taken', 'Property taken'),
    f('method_used', 'Method used', TEXTAREA),
    f('weapon_involved', 'Weapon involved', SELECT, YES_NO),
    f('weapon_description', 'Weapon description', TEXTAREA),
    f('suspect_count', 'Suspect count', NUMBER),
    f('suspect_description', 'Suspect description', TEXTAREA),
    f('direction_of_escape', 'Direction of escape'),
    f('vehicle_used', 'Vehicle used'),
    f('vehicle_description', 'Vehicle description', TEXTAREA),
  ],
  assault: [
    f('suspect_description', 'Suspect description', TEXTAREA),
    f('relationship_between_parties', 'Relationship between parties'),
    f('type_of_injury', 'Type of injury'),
    f('body_part_injured', 'Body part injured'),
    f('cause_of_injury', 'Cause of injury', TEXTAREA),
    f('weapon_used', 'Weapon used'),
    f('medical_treatment', 'Medical treatment', TEXTAREA),
    f('medical_facility', 'Medical facility'),
    f('medical_certificate_available', 'Medical certificate available', SELECT, YES_NO),
  ],
  traffic: [
    f('accident_type', 'Accident type'),
    f('exact_accident_location', 'Exact accident location'),
    f('weather_condition', 'Weather condition'),
    f('road_condition', 'Road condition'),
    f('number_of_vehicles', 'Number of vehicles', NUMBER),
    f('vehicle_1_type', 'Vehicle 1 type'),
    f('vehicle_1_plate_number', 'Vehicle 1 plate number'),
    f('vehicle_1_driver', 'Vehicle 1 driver'),
    f('vehicle_1_damage', 'Vehicle 1 damage', TEXTAREA),
    f('vehicle_2_type', 'Vehicle 2 type'),
    f('vehicle_2_plate_number', 'Vehicle 2 plate number'),
    f('vehicle_2_driver', 'Vehicle 2 driver'),
    f('vehicle_2_damage', 'Vehicle 2 damage', TEXTAREA),
    f('injured_persons', 'Injured persons', TEXTAREA),
    f('fatalities', 'Fatalities', NUMBER),
    f('suspected_cause', 'Suspected cause', TEXTAREA),
    f('traffic_violation', 'Traffic violation'),
    f('insurance_information', 'Insurance information', TEXTAREA),
  ],
  rape: [
    f('relationship_to_victim', 'Relationship to victim'),
    f('circumstances_of_incident', 'Circumstances of incident', TEXTAREA),
    f('reported_injury', 'Reported injury', TEXTAREA),
    f('medical_examination', 'Medical examination', SELECT, YES_NO),
    f('medical_facility', 'Medical facility'),
    f('supporting_evidence', 'Supporting evidence', TEXTAREA),
  ],
  domestic_violence: [
    f('respondent_name', 'Respondent name'),
    f('relationship_between_parties', 'Relationship between parties'),
    f('type_of_abuse', 'Type of abuse'),
    f('threats_made', 'Threats made', TEXTAREA),
    f('physical_injury', 'Physical injury', TEXTAREA),
    f('property_damage', 'Property damage', TEXTAREA),
    f('children_involved', 'Children involved', SELECT, YES_NO),
    f('medical_treatment', 'Medical treatment', TEXTAREA),
    f('protection_order_information', 'Protection order information', TEXTAREA),
  ],
  missing_person: [
    f('missing_person_name', 'Missing person name'),
    f('age', 'Age', NUMBER),
    f('sex', 'Sex', SELECT, [
      { value: 'Male', label: 'Male' },
      { value: 'Female', label: 'Female' },
      { value: 'Other', label: 'Other' },
    ]),
    f('address', 'Address'),
    f('physical_description', 'Physical description', TEXTAREA),
    f('clothing_last_seen', 'Clothing last seen'),
    f('date_last_seen', 'Date last seen', TEXT),
    f('time_last_seen', 'Time last seen', TEXT),
    f('location_last_seen', 'Location last seen'),
    f('person_last_seen_with', 'Person last seen with'),
    f('destination_if_known', 'Destination if known'),
    f('medical_or_special_condition', 'Medical or special condition', TEXTAREA),
    f('belongings_carried', 'Belongings carried', TEXTAREA),
    f('recent_photo_available', 'Recent photo available', SELECT, YES_NO),
    f('possible_location', 'Possible location'),
    f('search_actions_taken', 'Search actions taken', TEXTAREA),
  ],
  lost_property: [
    f('owner_name', 'Owner name'),
    f('property_type', 'Property type'),
    f('identifying_marks', 'Identifying marks', TEXTAREA),
    f('date_last_seen', 'Date last seen', TEXT),
    f('time_last_seen', 'Time last seen', TEXT),
    f('location_last_seen', 'Location last seen'),
    f('circumstances_of_loss', 'Circumstances of loss', TEXTAREA),
    f('finder_information', 'Finder information', TEXTAREA),
    f('supporting_documents', 'Supporting documents', TEXTAREA),
  ],
  fraud: [
    f('transaction_type', 'Transaction type'),
    f('transaction_date', 'Transaction date', TEXT),
    f('transaction_method', 'Transaction method'),
    f('amount_involved', 'Amount involved'),
    f('promised_service_or_item', 'Promised service or item', TEXTAREA),
    f('payment_method', 'Payment method'),
    f('account_or_reference_number', 'Account or reference number'),
    f('communication_method', 'Communication method'),
    f('communication_evidence', 'Communication evidence', TEXTAREA),
    f('proof_of_payment', 'Proof of payment', SELECT, YES_NO),
    f('suspect_information', 'Suspect information', TEXTAREA),
  ],
  property_damage: [
    f('property_owner', 'Property owner'),
    f('damaged_property', 'Damaged property'),
    f('cause_of_damage', 'Cause of damage', TEXTAREA),
    f('suspect_description', 'Suspect description', TEXTAREA),
    f('weapon_or_tool_used', 'Weapon or tool used'),
    f('photographs_available', 'Photographs available', SELECT, YES_NO),
  ],
  fire_incident: [
    f('property_owner', 'Property owner'),
    f('type_of_property', 'Type of property'),
    f('fire_location', 'Fire location'),
    f('estimated_time_started', 'Estimated time started', TEXT),
    f('estimated_time_reported', 'Estimated time reported', TEXT),
    f('possible_cause', 'Possible cause', TEXTAREA),
    f('extent_of_damage', 'Extent of damage', TEXTAREA),
    f('estimated_property_loss', 'Estimated property loss'),
    f('injuries', 'Injuries', NUMBER),
    f('fatalities', 'Fatalities', NUMBER),
    f('persons_evacuated', 'Persons evacuated', NUMBER),
    f('fire_department_response', 'Fire department response', TEXTAREA),
  ],
  drug_related: [
    f('incident_classification', 'Incident classification'),
    f('suspect_description', 'Suspect description', TEXTAREA),
    f('location_found', 'Location found'),
    f('items_seized', 'Items seized', TEXTAREA),
    f('packaging_description', 'Packaging description', TEXTAREA),
    f('evidence_found', 'Evidence found', TEXTAREA),
    f('operation_type', 'Operation type'),
    f('persons_arrested', 'Persons arrested', TEXTAREA),
    f('vehicle_involved', 'Vehicle involved'),
    f('witnesses', 'Witnesses', TEXTAREA),
    f('evidence_turnover', 'Evidence turnover', TEXTAREA),
  ],
  burglary: [
    f('property_owner', 'Property owner'),
    f('establishment_or_residence', 'Establishment or residence'),
    f('entry_point', 'Entry point'),
    f('signs_of_forced_entry', 'Signs of forced entry', SELECT, YES_NO),
    f('property_stolen', 'Property stolen'),
    f('suspect_description', 'Suspect description', TEXTAREA),
    f('tools_used', 'Tools used'),
    f('recovered_property', 'Recovered property', TEXTAREA),
  ],
  other: [
    f('incident_category', 'Incident category'),
    f('persons_involved', 'Persons involved', TEXTAREA),
    f('property_involved', 'Property involved', TEXTAREA),
    f('injuries_or_damage', 'Injuries or damage', TEXTAREA),
    f('suspect_information', 'Suspect information', TEXTAREA),
    f('additional_information', 'Additional information', TEXTAREA),
  ],
};

// Slugs accepted by the report form that map to a type-specific set. The
// form's incident_type may hold multiple comma-separated slugs; every
// recognized slug's fields are offered (union, first set wins on duplicates).
const TYPE_LABELS = {
  theft: 'Theft',
  robbery: 'Robbery',
  assault: 'Assault / Physical injury',
  traffic: 'Traffic accident',
  rape: 'Rape / Sexual assault',
  domestic_violence: 'Domestic violence',
  missing_person: 'Missing person',
  lost_property: 'Lost property',
  fraud: 'Fraud / Estafa',
  property_damage: 'Property damage / Malicious mischief',
  fire_incident: 'Fire incident',
  drug_related: 'Drug-related incident',
  burglary: 'Burglary / Break-in',
  other: 'Other incident',
};

// Type-specific keys REMOVED as redundant with top-level report columns.
// Each maps to the top-level column that now receives the value instead.
// Applied at write time so data saved under an old key flows into the shared
// column instead of being silently dropped by the sanitizer.
const REMOVED_TO_COMMON = {
  victim_name: 'victim_full_name',
  victim_age: 'victim_age',
  victim_sex: 'victim_sex',
  victim_injury: 'victim_injuries',
  suspect_name: 'suspect_name',
  suspect_age: 'suspect_age',
  suspect_status: 'suspect_status',
  incident_location: 'location',
  property_description: 'property_description',
  quantity: 'quantity',
  estimated_value: 'estimated_value',
  type_of_damage: 'type_of_damage',
  estimated_damage_cost: 'estimated_damage_cost',
  cctv_available: 'cctv_available',
  cctv_description: 'cctv_description',
};

// Expand an incoming data object: any removed-but-now-common key found in
// type_specific_data is moved onto the top-level column (only when the column
// has no value of its own — officer-entered data always wins).
function expandRemovedTypeSpecificKeys(data) {
  if (!data || typeof data !== 'object') return data;
  const spec = data.type_specific_data;
  if (!spec || typeof spec !== 'object') return data;
  const expanded = { ...data };
  for (const [removedKey, column] of Object.entries(REMOVED_TO_COMMON)) {
    const value = spec[removedKey];
    if (value === undefined || value === null || String(value).trim() === '') continue;
    const existing = expanded[column];
    if (existing === undefined || existing === null || String(existing).trim() === '') {
      expanded[column] = String(value).trim();
    }
    delete spec[removedKey];
  }
  return expanded;
}

const MAX_FIELD_LENGTH = 2000;

// Parse the incoming type_specific_data value into a plain object of trimmed
// strings, or null when absent/invalid.
function parseTypeSpecificData(raw) {
  if (raw === undefined || raw === null || raw === '') return undefined;
  let value = raw;
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return null; }
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const clean = {};
  for (const [key, val] of Object.entries(value)) {
    if (!/^[a-z0-9_]{1,64}$/.test(key)) return null;
    if (val === undefined || val === null) continue;
    const str = String(val).trim();
    if (str.length > MAX_FIELD_LENGTH) return null;
    if (str) clean[key] = str;
  }
  return clean;
}

// Sanitize type_specific_data against the registry: keeps only keys that belong
// to one of the selected incident types (or any known set when the type is
// unrecognized, so reclassifying a report does not silently drop data).
// Returns undefined (keep old value / nothing), null (clear), or an object.
function sanitizeTypeSpecificData(raw, incidentType) {
  const clean = parseTypeSpecificData(raw);
  if (clean === undefined) return undefined;
  if (clean === null) return null;
  if (Object.keys(clean).length === 0) return null;
  const allowed = new Set();
  const slugs = String(incidentType || '').split(',').map((s) => s.trim()).filter(Boolean);
  let recognized = false;
  for (const slug of slugs) {
    if (slug.startsWith('other:')) { recognized = true; for (const set of Object.values(TYPE_FIELDS)) for (const def of set) allowed.add(def.name); break; }
    if (TYPE_FIELDS[slug]) {
      recognized = true;
      for (const def of TYPE_FIELDS[slug]) allowed.add(def.name);
    }
  }
  // Unrecognized type: accept any registry-known key rather than dropping data.
  if (!recognized) for (const set of Object.values(TYPE_FIELDS)) for (const def of set) allowed.add(def.name);
  const result = {};
  for (const key of Object.keys(clean)) if (allowed.has(key)) result[key] = clean[key];
  return Object.keys(result).length ? result : null;
}

// JSON.stringify for storage; null stays null; undefined means "not provided".
function storageValue(sanitized) {
  if (sanitized === undefined) return undefined;
  if (sanitized === null) return null;
  return JSON.stringify(sanitized);
}

module.exports = {
  COMMON_FIELD_MAPPING,
  REMOVED_TO_COMMON,
  expandRemovedTypeSpecificKeys,
  TYPE_FIELDS,
  TYPE_LABELS,
  FIELD_TYPES: { TEXT, TEXTAREA, NUMBER, SELECT },
  parseTypeSpecificData,
  sanitizeTypeSpecificData,
  storageValue,
};
