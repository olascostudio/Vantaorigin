import { describe, it, expect, beforeEach } from "vitest";
import { countVisits } from "./analytics";

// Counting visitors is the one piece of the site that runs on every page for
// everybody, so what it refuses to do matters as much as what it does.

const fakeDoc = () => {
  const head = { children: [], appendChild(node) { this.children.push(node); } };
  return {
    head,
    createElement: () => ({ setAttribute(k, v) { this[k] = v; } }),
    querySelector: (sel) =>
      head.children.find((c) => sel.includes(c.src)) || null,
  };
};

describe("Counting a visit", () => {
  let doc;
  beforeEach(() => { doc = fakeDoc(); });

  it("loads the beacon on the real site", () => {
    const script = countVisits({ token: "abc", host: "www.vantaorigin.com", doc });
    expect(script).toBeTruthy();
    expect(script.src).toContain("cloudflareinsights.com");
    expect(script.defer).toBe(true);
    expect(JSON.parse(script["data-cf-beacon"]).token).toBe("abc");
    expect(doc.head.children).toHaveLength(1);
  });

  it("stays out of the way when no token is set", () => {
    // A laptop and a preview build must not be counted as visitors.
    expect(countVisits({ token: undefined, host: "www.vantaorigin.com", doc })).toBeNull();
    expect(doc.head.children).toHaveLength(0);
  });

  it("refuses anywhere that is not the real site", () => {
    for (const host of ["localhost", "vantaorigin-git-main.vercel.app", "evil-vantaorigin.com"]) {
      expect(countVisits({ token: "abc", host, doc })).toBeNull();
    }
    expect(doc.head.children).toHaveLength(0);
  });

  it("is added once, however many times it is asked for", () => {
    countVisits({ token: "abc", host: "vantaorigin.com", doc });
    countVisits({ token: "abc", host: "vantaorigin.com", doc });
    expect(doc.head.children).toHaveLength(1);
  });
});
