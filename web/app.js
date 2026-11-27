import { ALL_TYPES, TYPES } from "./detect.js";
import { redact, restore } from "./redact.js";
import { SAMPLE } from "./sample.js";

const $ = (id) => document.getElementById(id);
const state = { types: new Set(ALL_TYPES), keep: new Set(), result: null };

const GROUP = { person: "g-who", custom: "g-custom", email: "g-contact", phone: "g-contact", address: "g-contact" };
const groupClass = (type) => GROUP[type] || "g-number";

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  for (const child of children) node.append(child);
  return node;
}

function emptyNote(text) {
  return el("p", { className: "empty", textContent: text });
}

function render() {
  const text = $("input").value;
  state.result = redact(text, {
    types: [...state.types],
    customTerms: $("custom").value.split("\n"),
    keep: state.keep,
  });
  renderOutput(text);
  renderFindings();
  renderRestored();
}

function renderOutput(text) {
  const out = $("output");
  out.replaceChildren();
  if (!text.trim()) {
    out.append(emptyNote("Redacted text appears here."));
    $("copy").disabled = true;
    return;
  }
  for (const part of state.result.parts) {
    out.append(part.type ? el("mark", { className: `ph ${groupClass(part.type)}`, textContent: part.text }) : part.text);
  }
  $("copy").disabled = false;
}

function renderFindings() {
  const body = $("findings");
  body.replaceChildren();
  const { groups } = state.result;
  const redacted = groups.filter((g) => !state.keep.has(g.id)).length;

  $("count").textContent = groups.length
    ? `${redacted} of ${groups.length} redacted`
    : "";

  if (!groups.length) {
    body.append(el("tr", {}, el("td", { colSpan: 4, className: "empty-row", textContent: "Nothing detected." })));
    return;
  }

  for (const group of groups) {
    const kept = state.keep.has(group.id);
    const box = el("input", { type: "checkbox", checked: !kept });
    box.setAttribute("aria-label", `Redact ${group.values[0]}`);
    box.addEventListener("change", () => {
      if (box.checked) state.keep.delete(group.id);
      else state.keep.add(group.id);
      render();
    });
    const times = group.count > 1 ? el("span", { className: "times", textContent: ` ×${group.count}` }) : "";
    body.append(el("tr", { className: kept ? "kept" : "" },
      el("td", {}, box),
      el("td", {}, el("span", { className: `ph ${groupClass(group.type)}`, textContent: group.placeholder })),
      el("td", { textContent: TYPES[group.type].label }),
      el("td", { className: "original" }, group.values.join(", "), times),
    ));
  }
}

const PLACEHOLDER = /\[([A-Za-z]+) (\d+)\]/g;

function renderRestored() {
  const reply = $("reply").value;
  const out = $("restored");
  out.replaceChildren();
  if (!reply.trim()) {
    out.append(emptyNote("The reply appears here with the original details."));
    $("copy-restored").disabled = true;
    return;
  }
  const map = state.result.restoreMap;
  let last = 0;
  for (const m of reply.matchAll(PLACEHOLDER)) {
    const original = map.get(`[${m[1].toUpperCase()} ${m[2]}]`);
    if (original === undefined) continue;
    out.append(reply.slice(last, m.index), el("mark", { className: "restored", textContent: original }));
    last = m.index + m[0].length;
  }
  out.append(reply.slice(last));
  $("copy-restored").disabled = false;
}

async function copy(button, text) {
  const label = button.textContent;
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "Copied";
  } catch {
    button.textContent = "Copy failed";
  }
  setTimeout(() => { button.textContent = label; }, 1600);
}

function buildTypeSwitches() {
  const holder = $("types");
  for (const type of ALL_TYPES.filter((t) => t !== "custom")) {
    const box = el("input", { type: "checkbox", checked: true, id: `type-${type}` });
    box.addEventListener("change", () => {
      if (box.checked) state.types.add(type);
      else state.types.delete(type);
      render();
    });
    holder.append(el("label", { className: "type", htmlFor: `type-${type}` }, box, TYPES[type].label));
  }
}

let timer;
const soon = () => {
  clearTimeout(timer);
  timer = setTimeout(render, 120);
};

buildTypeSwitches();
$("input").addEventListener("input", soon);
$("custom").addEventListener("input", soon);
$("reply").addEventListener("input", renderRestored);
$("example").addEventListener("click", () => {
  $("input").value = SAMPLE;
  state.keep.clear();
  render();
});
$("clear").addEventListener("click", () => {
  $("input").value = "";
  $("reply").value = "";
  state.keep.clear();
  render();
  $("input").focus();
});
$("copy").addEventListener("click", () => copy($("copy"), state.result.text));
$("copy-restored").addEventListener("click", () => copy($("copy-restored"), restore($("reply").value, state.result.restoreMap).text));
render();
