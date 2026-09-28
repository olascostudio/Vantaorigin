// The service knocking on its own door, because GitHub's scheduler could not
// be relied on to do it.
import { test } from "node:test";
import assert from "node:assert/strict";

const { startKeepAwake } = await import("../src/keep-awake.js");

// Stands in for setInterval: keeps the callback so a test can run it.
function fakeClock() {
  const calls = [];
  const setIntervalImpl = (fn, ms) => {
    calls.push({ fn, ms });
    return { unref() {} };
  };
  return { calls, setIntervalImpl };
}

test("it knocks on its own health check, every ten minutes", async () => {
  const asked = [];
  const clock = fakeClock();

  const timer = startKeepAwake({
    url: "https://api.vantaorigin.com",
    enabled: true,
    fetchImpl: async (target) => {
      asked.push(target);
      return { ok: true };
    },
    setIntervalImpl: clock.setIntervalImpl,
  });

  assert.ok(timer);
  assert.equal(clock.calls.length, 1);
  assert.equal(clock.calls[0].ms, 10 * 60_000);

  clock.calls[0].fn();
  assert.deepEqual(asked, ["https://api.vantaorigin.com/health"]);
});

test("a trailing slash does not become a double one", () => {
  const asked = [];
  const clock = fakeClock();

  startKeepAwake({
    url: "https://api.vantaorigin.com/",
    enabled: true,
    fetchImpl: async (target) => asked.push(target),
    setIntervalImpl: clock.setIntervalImpl,
  });

  clock.calls[0].fn();
  assert.deepEqual(asked, ["https://api.vantaorigin.com/health"]);
});

test("a knock that goes unanswered is shrugged off", async () => {
  const clock = fakeClock();

  startKeepAwake({
    url: "https://api.vantaorigin.com",
    enabled: true,
    fetchImpl: async () => {
      throw new Error("network down");
    },
    setIntervalImpl: clock.setIntervalImpl,
  });

  // Would be an unhandled rejection if it were not caught.
  clock.calls[0].fn();
  await new Promise((resolve) => setTimeout(resolve, 10));
});

test("nothing is scheduled where there is nothing to keep awake", () => {
  const clock = fakeClock();

  assert.equal(
    startKeepAwake({ url: "https://api.vantaorigin.com", enabled: false, setIntervalImpl: clock.setIntervalImpl }),
    null
  );
  assert.equal(
    startKeepAwake({ url: "", enabled: true, setIntervalImpl: clock.setIntervalImpl }),
    null
  );
  assert.equal(startKeepAwake(), null);
  assert.equal(clock.calls.length, 0);
});
