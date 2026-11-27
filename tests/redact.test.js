import { test } from "node:test";
import assert from "node:assert/strict";
import { redact, restore } from "../web/redact.js";
import { SAMPLE } from "../web/sample.js";

test("the same detail gets the same placeholder every time", () => {
  const { text } = redact("Client: Jane Citizen\nEmail jane@example.com. Jane's email is jane@example.com.");
  assert.equal(text, "Client: [PERSON 1]\nEmail [EMAIL 1]. [PERSON 1]'s email is [EMAIL 1].");
});

test("different details of one type are numbered in order", () => {
  const { text } = redact("Call 0491 570 156 or (03) 7010 1234.");
  assert.equal(text, "Call [PHONE 1] or [PHONE 2].");
});

test("nothing personal is left in the redacted sample", () => {
  const { text } = redact(SAMPLE);
  for (const secret of ["Jane", "Citizen", "Priya", "Sam Lee", "123 456 782", "0491 570 156",
    "2123 45670 1", "Example Street", "example.com", "51 824 753 556", "012-345", "1234 5678", "14/03/1981"]) {
    assert.ok(!text.includes(secret), `still contains ${secret}`);
  }
  assert.ok(text.includes("$4,200"), "keeps ordinary amounts");
});

test("a kept group is left as it was", () => {
  const first = redact("Call 0491 570 156 or email jane@example.com");
  const phone = first.groups.find((g) => g.type === "phone");
  const { text } = redact("Call 0491 570 156 or email jane@example.com", { keep: new Set([phone.id]) });
  assert.equal(text, "Call 0491 570 156 or email [EMAIL 1]");
});

test("restore puts the details back into the AI's reply", () => {
  const { restoreMap } = redact(SAMPLE);
  const reply = "I've drafted a note to [PERSON 3] at [EMAIL 2] about the refund to [BSB 1] / [ACCOUNT 1].";
  const { text, replaced } = restore(reply, restoreMap);
  assert.equal(text, "I've drafted a note to Jane Citizen at jane.citizen@example.com about the refund to 012-345 / 1234 5678.");
  assert.equal(replaced, 4);
});

test("restore copes with the AI changing the case of a placeholder", () => {
  const { restoreMap } = redact("Dear Tom,");
  assert.equal(restore("Thanks, [Person 1].", restoreMap).text, "Thanks, Tom.");
});

test("restore leaves unknown placeholders alone", () => {
  const { restoreMap } = redact("Dear Tom,");
  assert.equal(restore("See [PERSON 9] and [NOTE 1].", restoreMap).text, "See [PERSON 9] and [NOTE 1].");
});

test("round trip: redact then restore gives back the original wording", () => {
  const original = "Client: Wei Zhang, mobile 0491 570 156, email wei@example.com.";
  const { text, restoreMap } = redact(original);
  assert.equal(restore(text, restoreMap).text, original);
});
