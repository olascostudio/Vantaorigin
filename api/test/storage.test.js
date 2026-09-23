// The storage endpoint is typed into a hosting dashboard by hand, so it
// arrives in every shape imaginable. All of these must work.
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL ||= "pglite://.pglite-storage-test";
process.env.NODE_ENV = "test";

const { normaliseEndpoint } = await import("../src/adapters/storage.js");

const GOOD = "https://82949f03862bf455745a1b2b2b1e5738.r2.cloudflarestorage.com";

test("takes a clean address as it is", () => {
  assert.equal(normaliseEndpoint(GOOD), GOOD);
});

test("adds the missing scheme", () => {
  assert.equal(normaliseEndpoint("82949f03862bf455745a1b2b2b1e5738.r2.cloudflarestorage.com"), GOOD);
});

test("drops a bucket left on the end", () => {
  assert.equal(normaliseEndpoint(`${GOOD}/vantaorigin`), GOOD);
});

test("ignores placeholder text pasted in front", () => {
  assert.equal(normaliseEndpoint(`https://<account-${GOOD}`), GOOD);
});

test("survives invisible characters and stray spaces", () => {
  assert.equal(normaliseEndpoint(`  ​${GOOD}﻿ `), GOOD);
});

test("unwraps a markdown link", () => {
  assert.equal(normaliseEndpoint(`[${GOOD}](${GOOD})`), GOOD);
});

test("complains clearly when it is empty", () => {
  assert.throws(() => normaliseEndpoint(""), /not set/);
});

test("complains clearly when there is no address in it", () => {
  assert.throws(() => normaliseEndpoint("paste-your-endpoint-here"), /not a valid address/);
});
