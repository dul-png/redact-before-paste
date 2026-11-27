import { digitsOf, isABN, isACN, isCardNumber, isMedicare, isTFN } from "./checksums.js";

export const TYPES = {
  tfn: { tag: "TFN", label: "Tax file number" },
  abn: { tag: "ABN", label: "ABN" },
  acn: { tag: "ACN", label: "ACN" },
  medicare: { tag: "MEDICARE", label: "Medicare number" },
  card: { tag: "CARD", label: "Card number" },
  email: { tag: "EMAIL", label: "Email" },
  phone: { tag: "PHONE", label: "Phone" },
  bsb: { tag: "BSB", label: "BSB" },
  account: { tag: "ACCOUNT", label: "Account number" },
  dob: { tag: "DOB", label: "Date of birth" },
  address: { tag: "ADDRESS", label: "Street address" },
  custom: { tag: "PRIVATE", label: "From your list" },
  person: { tag: "PERSON", label: "Name" },
};

export const ALL_TYPES = Object.keys(TYPES);

const NAME = String.raw`(?:[A-Z]['’])?[A-Z][a-z]+(?:[A-Z][a-z]+)?(?:-[A-Z][a-z]+)?`;
const FULL_NAME = String.raw`${NAME}(?:[ \t]+${NAME}){0,2}`;

const eitherCase = (word) => `[${word[0].toUpperCase()}${word[0]}]${word.slice(1)}`;
const LABELS = ["name", "client", "customer", "patient", "employee", "contact", "attention",
  "attn", "to", "from", "cc", "signed", "witness", "director", "applicant", "tenant", "landlord",
  "spouse", "partner", "beneficiary", "taxpayer"].map(eitherCase).join("|");

const SIGN_OFFS = "Regards|Thanks|Thank you|Cheers|Sincerely|Best|Best wishes|Warm regards|" +
  "Kind regards|Yours sincerely|Yours faithfully|Many thanks";

const PERSON_PATTERNS = [
  new RegExp(String.raw`\b(?:Mr|Mrs|Ms|Miss|Mx|Dr|Prof|Professor)\.?[ \t]+(${FULL_NAME})`, "g"),
  new RegExp(String.raw`\b(?:Dear|Hi|Hello|Hey)[ \t]+(${FULL_NAME})`, "g"),
  new RegExp(String.raw`\b(?:${LABELS})[ \t]*:[ \t]*(${FULL_NAME})`, "g"),
  new RegExp(String.raw`(?:${SIGN_OFFS}),?[ \t]*\r?\n[ \t]*(${FULL_NAME})`, "g"),
];

const NOT_NAMES = new Set(["team", "all", "everyone", "there", "sir", "madam", "folks", "both",
  "guys", "friends", "colleagues", "the", "client", "customer", "partner", "director", "again",
  "january", "february", "march", "april", "may", "june", "july", "august", "september",
  "october", "november", "december", "monday", "tuesday", "wednesday", "thursday", "friday",
  "saturday", "sunday", "today", "tomorrow", "office", "accounts", "admin", "support"]);

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const NUMBER_RUN = /(?<![\w@.+/])\+?\(?\d[\d \t().-]{5,25}\d(?![\w@/]|\.\d)/g;
const BSB = /\bBSB\b[ \t:#.-]*(\d{3}[- ]?\d{3})\b/gi;
const ACCOUNT = /\b(?:account|acct|acc|a\/c)\.?(?:[ \t]*(?:no\.?|number|num|#))?[ \t:#.-]*(\d[\d -]{4,14}\d)\b/gi;

const MONTHS = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec";
const DOB = new RegExp(String.raw`\b(?:DOB|D\.O\.B\.?|date of birth|born(?: on)?)[ \t:]*` +
  String.raw`(\d{1,2}[/.-]\d{1,2}[/.-](?:\d{4}|\d{2})|\d{1,2}(?:st|nd|rd|th)?[ \t]+(?:${MONTHS})[a-z]*\.?,?[ \t]+\d{4})`, "gi");

const STREET_TYPES = "Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Court|Ct|Place|Pl|Lane|Ln|Crescent|" +
  "Cres|Parade|Pde|Highway|Hwy|Terrace|Tce|Boulevard|Blvd|Way|Close|Grove|Gr|Square|Sq|Circuit|Cct|Esplanade|Esp";
const STATES = "VIC|NSW|QLD|SA|WA|TAS|NT|ACT|Victoria|New South Wales|Queensland|South Australia|Western Australia|Tasmania";
const ADDRESS = new RegExp(
  String.raw`\b(?:(?:Unit|Apt|Apartment|Suite|Level|Shop)[ \t]+\d+[A-Za-z]?,?[ \t]+|\d+[A-Za-z]?/)?` +
  String.raw`\d{1,5}[A-Za-z]?(?:-\d{1,5})?[ \t]+(?:[A-Z][a-z]+[ \t]+){1,3}(?:${STREET_TYPES})\b\.?` +
  String.raw`(?:,?[ \t]+(?:[A-Z][a-z]+[ \t]){0,2}[A-Z][a-z]+,?[ \t]+(?:(?:${STATES})\b(?:,?[ \t]+\d{4})?|\d{4}\b))?`,
  "g");

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function* matches(pattern, text, group = 0) {
  const flags = pattern.flags.includes("d") ? pattern.flags : pattern.flags + "d";
  for (const m of text.matchAll(new RegExp(pattern.source, flags))) {
    if (m[group] !== undefined) yield { start: m.indices[group][0], value: m[group] };
  }
}

const finding = (type, start, value, key) => ({ type, start, end: start + value.length, value, key });

export function classifyNumber(raw, before = "") {
  const d = digitsOf(raw).join("");
  const n = d.length;

  if (raw.startsWith("+") && n >= 8 && n <= 15) return "phone";
  if (n === 10 && /^0[23478]/.test(d)) return "phone";
  if (n === 10 && /^1[38]00/.test(d)) return "phone";
  if (n === 11 && isABN(d)) return "abn";
  if (n === 11 && /^61[23478]/.test(d)) return "phone";
  if (n === 9) {
    if (/\bACN\b/i.test(before) && isACN(d)) return "acn";
    if (isTFN(d)) return "tfn";
    if (isACN(d)) return "acn";
  }
  if ((n === 10 || n === 11) && isMedicare(d)) return "medicare";
  if (n >= 13 && n <= 19 && isCardNumber(d)) return "card";
  if (n === 8 && /\b(?:phone|ph|mob|mobile|tel|call|fax)\b/i.test(before)) return "phone";
  return null;
}

function findPeople(text) {
  const hits = [];
  for (const pattern of PERSON_PATTERNS) {
    for (const { start, value } of matches(pattern, text, 1)) {
      const words = value.split(/[ \t]+/);
      while (words.length && NOT_NAMES.has(words.at(-1).toLowerCase())) words.pop();
      if (!words.length || NOT_NAMES.has(words[0].toLowerCase())) continue;
      hits.push({ start, name: words.join(" ") });
    }
  }

  const fullNames = [...new Set(hits.map((h) => h.name.toLowerCase()))].sort((a, b) => b.length - a.length);
  const keyOf = new Map();
  for (const full of fullNames) {
    if (!keyOf.has(full)) keyOf.set(full, full);
    for (const part of full.split(" ")) {
      if (part.length >= 3 && !NOT_NAMES.has(part) && !keyOf.has(part)) keyOf.set(part, keyOf.get(full));
    }
  }

  const found = hits.map((h) => finding("person", h.start, h.name, keyOf.get(h.name.toLowerCase())));
  for (const [term, key] of keyOf) {
    const words = term.split(" ").map((w) => escapeRegExp(w[0].toUpperCase() + w.slice(1)));
    const pattern = new RegExp(String.raw`(?<![\p{L}\p{N}])${words.join(String.raw`[ \t]+`)}(?![\p{L}\p{N}])`, "gu");
    for (const { start, value } of matches(pattern, text)) found.push(finding("person", start, value, key));
  }
  return found;
}

export function detect(text, { types = ALL_TYPES, customTerms = [] } = {}) {
  const on = new Set(types);
  const found = [];
  const add = (type, pattern, key, group = 0) => {
    if (!on.has(type)) return;
    for (const { start, value } of matches(pattern, text, group)) found.push(finding(type, start, value, key(value)));
  };
  const lower = (v) => v.toLowerCase();
  const digits = (v) => digitsOf(v).join("");

  if (on.has("person")) found.push(...findPeople(text));
  add("email", EMAIL, lower);
  add("bsb", BSB, digits, 1);
  add("account", ACCOUNT, digits, 1);
  add("dob", DOB, lower, 1);
  add("address", ADDRESS, lower);

  for (const { start, value } of matches(NUMBER_RUN, text)) {
    const type = classifyNumber(value, text.slice(Math.max(0, start - 30), start));
    if (type && on.has(type)) found.push(finding(type, start, value, digits(value)));
  }

  for (const term of customTerms.map((t) => t.trim()).filter(Boolean)) {
    const pattern = new RegExp(String.raw`(?<![\p{L}\p{N}])${escapeRegExp(term)}(?![\p{L}\p{N}])`, "giu");
    add("custom", pattern, () => term.toLowerCase());
  }

  return resolveOverlaps(found);
}

function resolveOverlaps(found) {
  const rank = (type) => ALL_TYPES.indexOf(type);
  const byPreference = [...found].sort((a, b) =>
    (b.end - b.start) - (a.end - a.start) || rank(a.type) - rank(b.type) || a.start - b.start);
  const kept = [];
  for (const f of byPreference) {
    if (!kept.some((k) => f.start < k.end && k.start < f.end)) kept.push(f);
  }
  return kept.sort((a, b) => a.start - b.start);
}
