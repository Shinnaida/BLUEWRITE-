// BLUEWRITE — Incident-type field registry (frontend mirror)
// Mirrors backend/src/services/incidentTypeFields.js — keep both in sync.
// Common fields map to existing report columns; the type-specific sets below
// are stored in the report's type_specific_data JSON blob.

const TEXT = 'text';
const TEXTAREA = 'textarea';
const NUMBER = 'number';
const SELECT = 'select';

const f = (name, label, type = TEXT, options = null) => ({ name, label, type, options });

const YES_NO = [
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
];

const SEX_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

export const TYPE_FIELDS = {
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
    f('sex', 'Sex', SELECT, SEX_OPTIONS),
    f('address', 'Address'),
    f('physical_description', 'Physical description', TEXTAREA),
    f('clothing_last_seen', 'Clothing last seen'),
    f('date_last_seen', 'Date last seen'),
    f('time_last_seen', 'Time last seen'),
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
    f('date_last_seen', 'Date last seen'),
    f('time_last_seen', 'Time last seen'),
    f('location_last_seen', 'Location last seen'),
    f('circumstances_of_loss', 'Circumstances of loss', TEXTAREA),
    f('finder_information', 'Finder information', TEXTAREA),
    f('supporting_documents', 'Supporting documents', TEXTAREA),
  ],
  fraud: [
    f('transaction_type', 'Transaction type'),
    f('transaction_date', 'Transaction date'),
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
    f('estimated_time_started', 'Estimated time started'),
    f('estimated_time_reported', 'Estimated time reported'),
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

export const TYPE_LABELS = {
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

// Union of field definitions for the selected incident type(s). Accepts the
// raw incident_type value (single slug, comma-separated slugs, or "other:x").
export function fieldsForIncidentType(incidentType) {
  const slugs = String(incidentType || '').split(',').map((s) => s.trim()).filter(Boolean);
  const seen = new Set();
  const fields = [];
  const sets = slugs.map((slug) => {
    if (slug.startsWith('other:')) return 'other';
    return TYPE_FIELDS[slug] ? slug : null;
  }).filter(Boolean);
  if (!sets.length) return fields;
  // Multi-select: "other" renders last so specific sets come first.
  const ordered = sets.filter((s) => s !== 'other').concat(sets.includes('other') ? ['other'] : []);
  for (const slug of ordered) {
    for (const def of TYPE_FIELDS[slug]) {
      if (seen.has(def.name)) continue;
      seen.add(def.name);
      fields.push({ ...def, setType: slug });
    }
  }
  return fields;
}

// Human label for a type-specific field (used by print view).
export function typeFieldLabel(name, incidentType) {
  for (const set of Object.values(TYPE_FIELDS)) {
    const def = set.find((d) => d.name === name);
    if (def) return def.label;
  }
  return String(name || '').replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
