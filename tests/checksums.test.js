import { test } from "node:test";
import assert from "node:assert/strict";
import { isABN, isACN, isCardNumber, isMedicare, isTFN } from "../web/checksums.js";

test("TFN: valid example passes, one digit off fails", () => {
  assert.equal(isTFN("123 456 782"), true);
  assert.equal(isTFN("123456782"), true);
  assert.equal(isTFN("123 456 781"), false);
  assert.equal(isTFN("12 345 678"), false, "8 digits");
  assert.equal(isTFN("000 000 000"), false, "all the same digit");
});

test("ABN: ATO example passes, typo fails", () => {
  assert.equal(isABN("51 824 753 556"), true);
  assert.equal(isABN("51 824 753 557"), false);
  assert.equal(isABN("01 824 753 556"), false, "can't start with 0");
});

test("ACN: valid examples pass", () => {
  assert.equal(isACN("004 085 616"), true);
  assert.equal(isACN("000 000 019"), true);
  assert.equal(isACN("004 085 617"), false);
});

test("Medicare: test number passes with and without the person's number", () => {
  assert.equal(isMedicare("2123 45670 1"), true);
  assert.equal(isMedicare("2123 45670 1 2"), true);
  assert.equal(isMedicare("2123 45671 1"), false, "wrong check digit");
  assert.equal(isMedicare("7123 45670 1"), false, "must start 2 to 6");
});

test("Card numbers use the Luhn check", () => {
  assert.equal(isCardNumber("4111 1111 1111 1111"), true);
  assert.equal(isCardNumber("4111 1111 1111 1112"), false);
  assert.equal(isCardNumber("4111 1111 111"), false, "too short");
});
