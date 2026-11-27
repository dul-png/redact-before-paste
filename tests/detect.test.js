import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyNumber, detect } from "../web/detect.js";
import { SAMPLE } from "../web/sample.js";

const found = (text, options) => detect(text, options).map((f) => [f.type, f.value]);

test("finds every detail in the sample email", () => {
  const types = new Set(detect(SAMPLE).map((f) => f.type));
  for (const t of ["person", "email", "tfn", "dob", "medicare", "address", "phone", "abn", "bsb", "account"]) {
    assert.ok(types.has(t), `expected a ${t}`);
  }
});

test("phone numbers in common Australian formats", () => {
  for (const phone of ["0491 570 156", "0491570156", "+61 491 570 156", "(03) 7010 1234", "03 7010 1234", "1300 975 707"]) {
    assert.deepEqual(found(`Call ${phone} today`), [["phone", phone]], phone);
  }
});

test("an 8-digit number is only a phone number when the text says so", () => {
  assert.deepEqual(found("Ph: 9555 1234"), [["phone", "9555 1234"]]);
  assert.deepEqual(found("Invoice 9555 1234 is attached"), []);
});

test("numbers that fail their checksum are left alone", () => {
  assert.deepEqual(found("Order 123 456 781 shipped"), []);
  assert.deepEqual(found("Job ref 51 824 753 557"), []);
});

test("ordinary numbers are not redacted", () => {
  const text = "The bonus was $4,200 in 2026. Meeting at 10:30 on 14/03/2026. Version 1.2.3. Level 3. Pay 1,250,000.";
  assert.deepEqual(found(text), []);
});

test("an ACN is recognised when labelled", () => {
  assert.deepEqual(found("Example Pty Ltd, ACN 004 085 616"), [["acn", "004 085 616"]]);
});

test("names after titles, greetings, labels and sign-offs", () => {
  assert.deepEqual(found("Please call Dr Anika Rao."), [["person", "Anika Rao"]]);
  assert.deepEqual(found("Dear Tom,"), [["person", "Tom"]]);
  assert.deepEqual(found("Client: Wei Zhang"), [["person", "Wei Zhang"]]);
  assert.deepEqual(found("Kind regards,\nLiam O'Brien"), [["person", "Liam O'Brien"]]);
});

test("greetings to a group are not names", () => {
  assert.deepEqual(found("Hi team, hi all. Dear Sir or Madam, hello there."), []);
  assert.deepEqual(found("Due to: Friday"), []);
});

test("once a name is known, its parts are found elsewhere", () => {
  const values = found("Client: Jane Citizen\nJane called. Citizen's file is late.").map(([, v]) => v);
  assert.deepEqual(values, ["Jane Citizen", "Jane", "Citizen"]);
});

test("a name without any of those clues is missed (known limit)", () => {
  assert.deepEqual(found("Jane Citizen called about her refund."), []);
});

test("custom terms are matched as whole words, any case", () => {
  const result = found("Citizen Consulting and CITIZEN CONSULTING, not Citizen Consultingly", {
    customTerms: ["Citizen Consulting"],
  });
  assert.deepEqual(result, [["custom", "Citizen Consulting"], ["custom", "CITIZEN CONSULTING"]]);
});

test("street addresses, with and without suburb", () => {
  assert.deepEqual(found("Send it to 12 Example Street, Fitzroy VIC 3065 please"),
    [["address", "12 Example Street, Fitzroy VIC 3065"]]);
  assert.deepEqual(found("Unit 4, 88 High St. Please knock."), [["address", "Unit 4, 88 High St."]]);
});

test("dates of birth need a label, other dates stay", () => {
  assert.deepEqual(found("DOB: 14/03/1981, lodged 02/10/2026"), [["dob", "14/03/1981"]]);
  assert.deepEqual(found("Born on 14 March 1981"), [["dob", "14 March 1981"]]);
});

test("types can be switched off", () => {
  assert.deepEqual(found("Email jane@example.com or call 0491 570 156", { types: ["phone"] }),
    [["phone", "0491 570 156"]]);
});

test("number classifier", () => {
  assert.equal(classifyNumber("51 824 753 556"), "abn");
  assert.equal(classifyNumber("123 456 782"), "tfn");
  assert.equal(classifyNumber("004 085 616", "ACN "), "acn");
  assert.equal(classifyNumber("4111 1111 1111 1111"), "card");
  assert.equal(classifyNumber("1234 5678"), null);
});
