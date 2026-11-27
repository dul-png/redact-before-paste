import { detect, TYPES } from "./detect.js";

const PLACEHOLDER = /\[([A-Za-z]+) (\d+)\]/g;

export function redact(text, { types, customTerms, keep = new Set() } = {}) {
  const findings = detect(text, { types, customTerms });

  const counters = {};
  const groups = new Map();
  for (const f of findings) {
    const id = `${f.type}:${f.key}`;
    if (!groups.has(id)) {
      counters[f.type] = (counters[f.type] || 0) + 1;
      groups.set(id, {
        id,
        type: f.type,
        placeholder: `[${TYPES[f.type].tag} ${counters[f.type]}]`,
        values: [],
        count: 0,
      });
    }
    const group = groups.get(id);
    f.placeholder = group.placeholder;
    f.group = id;
    group.count++;
    if (!group.values.includes(f.value)) group.values.push(f.value);
  }

  let output = "";
  let last = 0;
  const parts = [];
  for (const f of findings) {
    if (keep.has(f.group)) continue;
    if (f.start > last) parts.push({ text: text.slice(last, f.start) });
    parts.push({ text: f.placeholder, type: f.type });
    output += text.slice(last, f.start) + f.placeholder;
    last = f.end;
  }
  output += text.slice(last);
  if (last < text.length) parts.push({ text: text.slice(last) });

  const restoreMap = new Map();
  for (const group of groups.values()) {
    if (keep.has(group.id)) continue;
    const fullest = group.values.reduce((a, b) => (b.length > a.length ? b : a));
    restoreMap.set(group.placeholder, fullest);
  }

  return { text: output, parts, findings, groups: [...groups.values()], restoreMap };
}

export function restore(text, restoreMap) {
  let replaced = 0;
  const result = text.replace(PLACEHOLDER, (match, tag, n) => {
    const original = restoreMap.get(`[${tag.toUpperCase()} ${n}]`);
    if (original === undefined) return match;
    replaced++;
    return original;
  });
  return { text: result, replaced };
}
