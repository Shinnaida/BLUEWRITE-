// BLUEWRITE — Philippine language support for the AI assistant.
//
// Officers often write narratives in Tagalog/Filipino, Bisaya/Cebuano, or a
// mixture (Taglish/Bisalog). This module gives the language model a fixed
// dictionary of common police-relevant terms and gives the deterministic
// safety validators a bridge so that a correct translation is never blocked
// as an "invented" fact.
//
// This file contains no model calls — it is static data plus pure functions.

// ── Prompt-facing glossary ─────────────────────────────────────────────────────

const CRIME_TERMS = [
  ['nanakawan / ninakaw / nakawan', 'cellphone/property was stolen; theft'],
  ['kawat / nangawat / nakawat / gikawat / gikawat-an (Bisaya)', 'stolen; theft'],
  ['hablot / holdap / tulisan', 'robbery; hold-up'],
  ['saksak / sinaksak / gisaksak', 'stabbed'],
  ['bugbog / binugbog / gisumbag / gibunalan', 'beaten; mauled; assaulted'],
  ['suntok / sinuntok', 'punched'],
  ['sipang / sinipa', 'kicked'],
  ['nasaktan / nasamdan / sugatan', 'injured'],
  ['aksidente / nabangga / banggaan / nabanggaan', 'accident; collision; crashed into'],
  ['sinira / sira / nagiba', 'damaged; destroyed'],
  ['estafa / niloko / dinaya / panlimbong / limbong', 'swindle; fraud; scammed'],
  ['gulo / kaguluhan / gubot / kagubot / nag-away / nagsagupa', 'commotion; disturbance; altercation'],
  ['pumatay / gipatay / namatay', 'killed / died (report only as stated)'],
  ['baril / pistola / kutsilyo / armas', 'gun; pistol; knife; weapon'],
  ['dukot / dinukot', 'snatched; grabbed'],
  ['tumakas / nanlabas / nikalagas / tulibugas', 'fled; escaped'],
  ['(na|gi|ni)pusil / gipusil / napusilan', 'shot (with a gun)'],
  ['tigbas / gitigbas / tigbason', 'hacked; slashed (with a bolo or bladed weapon)'],
  ['itak / sundang / sumpak', 'bolo; machete; homemade shotgun'],
  ['bata (slang, e.g., "may bata siya")', 'carrying a gun (slang) — do not translate as child'],
  ['shabu', 'methamphetamine (illegal drug) — keep the word shabu'],
  ['tulak / drug pusher / nalulong / adik', 'drug pusher; drug dependent; addict'],
  ['nagbaligya ug shabu / nagtitinda ng shabu', 'selling shabu (illegal drug trade)'],
  ['marijuana', 'marijuana (illegal drug) — keep the word as-is'],
];

// Philippine police operations and jargon commonly used in officer narratives.
const POLICE_OPERATION_TERMS = [
  ['huli / hinuli / arestado / dakop / nadakop / gidakop', 'arrested'],
  ['sumuko / nagsuko / nagsurrender / misurrender', 'surrendered'],
  ['nanlaban / nakigbisog', 'resisted arrest; fought back'],
  ['hulihan', 'arrest operation; place where a suspect was caught'],
  ['buy-bust / buy-bust operation', 'buy-bust (anti-drug) operation — keep the phrase as-is'],
  ['entrapment', 'entrapment operation — keep the phrase as-is'],
  ['ronda / rumonda / pagpangronda', 'patrol; on patrol'],
  ['sita / nasita', 'apprehended; cited (minor enforcement stop)'],
  ['blotter / sinulat sa blotter / naka-blotter', 'recorded in the police blotter'],
  ['carnap / carnapper / nakaw na sasakyan / gikawat nga sakyanan', 'carnapping; stolen motor vehicle'],
  ['istambay / tambay', 'loiterer; idle person'],
  ['bugaw', 'pimp; procurer'],
  ['mandurukot', 'pickpocket'],
  ['robero', 'robber'],
  ['jueteng / ilegal na sugal / ilegal nga dula', 'illegal numbers game; illegal gambling'],
  ['riding in tandem', 'riding in tandem (two persons on one motorcycle) — keep the phrase as-is'],
  ['barangay / tanod', 'keep as-is (proper Philippine terms)'],
];

const TIME_TERMS = [
  ['ngayon / karong adlawa', 'today'],
  ['kahapon / gahapon / niaging adlaw', 'yesterday'],
  ['kagabi / kagabi-i / niaging gabii', 'last night'],
  ['kanina / ganina / kaniha', 'earlier (today)'],
  ['ngayong umaga / karong buntaga', 'this morning'],
  ['mamayang gabi / karong gabii', 'tonight'],
  ['umaga / buntag', 'morning'],
  ['hapon', 'afternoon'],
  ['gabi / gabii', 'night; evening'],
  ['tanghali / udto', 'noon'],
  ['madaling araw / ka-aga-ahan', 'dawn; early morning'],
  ['hatinggabi', 'midnight'],
  ['mga (as in "mga alas-3")', 'approximately; around'],
  ['alas-uno … alas-dose (e.g., alas-onse ng umaga)', 'clock time (e.g., 11:00 am)'],
];

const ROLE_TERMS = [
  ['biktima / nasaktan (role)', 'victim'],
  ['saksi / testigo', 'witness'],
  ['suspek / suspetsado', 'suspect'],
  ['nagreklamo / nagsumbong / nagreklamador', 'complainant'],
  ['pulis / kapulisan / pulisya', 'police'],
  ['tanod', 'barangay tanod (village watchman)'],
  ['nakakita / nakakita sa', 'saw; observed'],
];

const PLACE_TERMS = [
  ['palengke / merkado', 'public market'],
  ['kanto', 'street corner'],
  ['kalsada / dalan', 'road; street'],
  ['bahay / balay / tahanan', 'house; home'],
  ['tindahan / tiyangge', 'store; stall'],
  ['eskwelahan / paaralan / eskuylahan', 'school'],
  ['simbahan', 'church'],
  ['bintana / pultahan', 'window; door'],
  ['eskinita', 'narrow alley'],
  ['talipapa', 'small wet market'],
  ['iskwater / squatting area', 'informal settlement'],
];

const UNCERTAINTY_TERMS = [
  ['siguro / baka / marahil / tingali', 'possibly; maybe; might'],
  ['tila / yata / ata / mukhang', 'appears; seems; reportedly'],
  ['hindi sigurado / hindi tiyak / wala masabti', 'not sure; uncertain'],
  ['mga (before a number or time)', 'approximately; around'],
];

const GLOSSARY_SECTION = [
  'LANGUAGE_GLOSSARY (Philippine languages — Tagalog/Filipino and Bisaya/Cebuano):',
  'Crime and incident vocabulary:',
  ...CRIME_TERMS.map(([term, english]) => `  ${term} = ${english}`),
  'Police operations and jargon:',
  ...POLICE_OPERATION_TERMS.map(([term, english]) => `  ${term} = ${english}`),
  'Time vocabulary:',
  ...TIME_TERMS.map(([term, english]) => `  ${term} = ${english}`),
  'People and roles:',
  ...ROLE_TERMS.map(([term, english]) => `  ${term} = ${english}`),
  'Places and objects:',
  ...PLACE_TERMS.map(([term, english]) => `  ${term} = ${english}`),
  'Uncertainty vocabulary (must be preserved as uncertainty in English):',
  ...UNCERTAINTY_TERMS.map(([term, english]) => `  ${term} = ${english}`),
].join('\n');

// ── Prompt language rules ──────────────────────────────────────────────────────

const LANGUAGE_RULES = [
  'LANGUAGE HANDLING: The Officer\'s MESSAGE, narrative, or summary may be written in English, Tagalog/Filipino, Bisaya/Cebuano, or a mixture (Taglish/Bisalog). Understand all of them and write every output value in formal professional English, using the LANGUAGE_GLOSSARY below for Philippine-language terms.',
  'Translation must never add, remove, weaken, or shift a fact: preserve names, place names as written, quoted statements, numbers, dates, and stated times exactly.',
  'Carry uncertainty across languages: siguro/baka/marahil/tingali become possibly/might; hindi sigurado becomes not sure; mga (before a number or time) becomes approximately/around; tila/mukhang/yata become appears/seems/reportedly.',
  'Keep the Officer\'s original place or object word when it is a proper name or a place word you are not certain of (e.g., "palengke"), optionally glossed once in English ("public market").',
  'If a word is ambiguous and not in the glossary, translate conservatively using only what is explicit; never resolve an ambiguity by inventing a detail.',
].join('\n');

const LANGUAGE_PROMPT_BLOCK = `${LANGUAGE_RULES}\n\n${GLOSSARY_SECTION}`;

// ── Validator bridge: uncertainty terms ────────────────────────────────────────
// Filipino/Bisaya uncertainty wording found in a source narrative, mapped to
// English equivalents that may legitimately replace it in translated output.
// Used by the safety validators so a correct translation is not flagged as
// "uncertainty removed" (and so genuine removal is still caught).

const UNCERTAINTY_EQUIVALENTS = Object.freeze({
  'siguro': ['possibly', 'perhaps', 'might', 'may', 'maybe'],
  'baka': ['possibly', 'might', 'may', 'could', 'perhaps'],
  'marahil': ['possibly', 'perhaps', 'probably'],
  'tingali': ['possibly', 'perhaps', 'might', 'may'],
  'tila': ['appears', 'appeared', 'seems', 'reportedly'],
  'yata': ['appears', 'appeared', 'possibly', 'seems'],
  'ata': ['appears', 'appeared', 'possibly'],
  'mukhang': ['appears', 'appeared', 'seems'],
  'hindi sigurado': ['not sure', 'uncertain', 'unsure', 'not certain'],
  'hindi tiyak': ['not sure', 'uncertain', 'unclear', 'not certain'],
  'malamang': ['probably', 'likely'],
  'mga': ['approximately', 'around', 'about', 'estimated'],
  // English equivalences too — a draft may legitimately reword "around 9pm"
  // as "approximately 9pm" without losing the hedge.
  'around': ['approximately', 'about', 'estimated', 'roughly'],
  'about': ['approximately', 'around', 'estimated', 'roughly'],
  'approximate': ['approximately', 'around', 'about', 'roughly'],
  'approximately': ['around', 'about', 'roughly', 'estimated'],
  'possibly': ['possible', 'might', 'may', 'could', 'perhaps'],
  'possible': ['possibly', 'might', 'may', 'could', 'perhaps'],
  'may': ['might', 'could', 'possibly'],
  'might': ['may', 'could', 'possibly'],
  'could': ['might', 'may', 'possibly'],
  'not sure': ['not certain', 'uncertain', 'unsure', 'unknown'],
  'estimated': ['approximately', 'around', 'about', 'roughly'],
  'reportedly': ['allegedly', 'according to'],
  'allegedly': ['reportedly', 'alleged'],
});

// English terms kept in sync with aiService/aiFactService — used when a
// Filipino source term must be accepted via its English equivalent.
const UNCERTAINTY_TERMS_FLAT = Object.freeze([...Object.keys(UNCERTAINTY_EQUIVALENTS)]);

// Returns true when a source uncertainty term is represented in the output,
// either verbatim or through any of its accepted English equivalents.
function uncertaintySurvived(output, term) {
  const lowered = String(output || '').toLowerCase();
  const needle = String(term || '').toLowerCase();
  if (needle && lowered.includes(needle)) return true;
  return (UNCERTAINTY_EQUIVALENTS[needle] || []).some((equivalent) => new RegExp(`\\b${equivalent}\\b`, 'i').test(String(output || '')));
}

// ── Validator bridge: Filipino time expressions ────────────────────────────────
// Deterministic conversion of Spanish-derived Filipino clock wording into the
// 12-hour English form, so "alas-onse ng umaga" in the source can be matched
// against "11:00 am" in a translated draft (protected-value checks).

const CLOCK_NUMBERS = Object.freeze({
  'uno': 1, '1': 1,
  'dos': 2, '2': 2,
  'tres': 3, '3': 3,
  'kwatro': 4, '4': 4,
  'singko': 5, '5': 5,
  'sais': 6, '6': 6,
  'syete': 7, '7': 7,
  'otso': 8, '8': 8,
  'nuwebe': 9, '9': 9,
  'diyes': 10, '10': 10,
  'onse': 11, '11': 11,
  'dose': 12, '12': 12,
});

const CLOCK_WORDS_PATTERN = Object.keys(CLOCK_NUMBERS).sort((a, b) => b.length - a.length).join('|');

// "alas-onse ng umaga" → "11:00 am"; "alas-3 ng hapon" → "3:00 pm";
// "ala una ng gabi" → "1:00 pm". Accepts hyphens, spaces, or nothing between
// "alas/ala" and the number, optional "y media" (half past), and Filipino
// day-part words.
const ALAS_PATTERN = new RegExp(
  `\\b(?:alas|ala)[- ]?(?:${CLOCK_WORDS_PATTERN})(?:[- ]?y[- ]?media)?(?:\\s*(?:ng|sa)\\s*(?:madaling[\\s-]araw|umaga|buntag|tanghali|udto|hapon|hapunon|gabi|gabii|hatinggabi))?`,
  'gi'
);

const DAY_PART_PATTERN = /\b(?:hatinggabi|tanghali|udto)\b/gi;

function convertAlasExpression(match) {
  const lowered = match.toLowerCase();
  const numberMatch = lowered.match(new RegExp(`(${CLOCK_WORDS_PATTERN})`));
  if (!numberMatch) return match;
  const hour = CLOCK_NUMBERS[numberMatch[1]];
  const halfPast = /y[\s-]?media/.test(lowered);
  const dayPart = (lowered.match(/(madaling[\s-]araw|umaga|buntag|tanghali|udto|hapon|hapunon|gabi|gabii|hatinggabi)/) || [])[1] || '';
  let meridiem = 'am';
  let value = hour;
  if (/hapon|hapunon/.test(dayPart)) { meridiem = 'pm'; value = hour + 12; }
  else if (/gabi|gabii/.test(dayPart)) { meridiem = 'pm'; value = hour === 12 ? 12 : hour + 12; }
  else if (/tanghali|udto/.test(dayPart)) { meridiem = 'pm'; value = 12; }
  else if (/hatinggabi|madaling/.test(dayPart)) { meridiem = 'am'; value = hour === 12 ? 0 : hour; }
  const displayHour = (value % 12) || 12;
  const minute = halfPast ? '30' : '00';
  return `${String(displayHour).padStart(2, '0')}:${minute} ${meridiem}`;
}

// Normalizes standalone Filipino day words that are themselves clock values.
function convertDayPartWords(value) {
  return String(value || '')
    .replace(/\bhating[\s-]?gabi\b/gi, '12:00 am')
    .replace(/\b(?:tanghali|udto)\b/gi, '12:00 pm');
}

// Public helper: replace Filipino clock expressions with their English form.
// Non-time text is returned untouched, so this is safe to run on full sources.
function translateTimeExpressions(value) {
  const source = String(value || '');
  return convertDayPartWords(source.replace(ALAS_PATTERN, convertAlasExpression));
}

module.exports = {
  LANGUAGE_PROMPT_BLOCK,
  LANGUAGE_RULES,
  GLOSSARY_SECTION,
  UNCERTAINTY_EQUIVALENTS,
  UNCERTAINTY_TERMS_FLAT,
  uncertaintySurvived,
  translateTimeExpressions,
};
