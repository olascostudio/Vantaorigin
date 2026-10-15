import { describe, it, expect, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { usePageMeta } from "./pageMeta";

// Which address a page says it is.
//
// index.html is served for every address the app draws in the browser, so a
// canonical written into it says that every page without a crawler route of
// its own is the front page under a different address. Google read it that
// way and filed six pages under "alternate page with proper canonical tag",
// which is its way of saying it believed us: it indexed the front page
// instead and dropped the rest.

const canonical = () => document.querySelector('link[rel="canonical"]')?.getAttribute("href");

function Page({ path }) {
  usePageMeta({ title: "A page", description: "About the page", canonicalPath: path });
  return null;
}

beforeEach(() => {
  document.querySelector('link[rel="canonical"]')?.remove();
});

describe("The shell everyone is served", () => {
  it("does not claim to be the front page", () => {
    const html = readFileSync("index.html", "utf8");

    // A static one here is wrong for every address but one.
    expect(html).not.toMatch(/<link[^>]+rel="canonical"/);
  });
});

describe("A page that knows its address", () => {
  it("says that address and no other", () => {
    render(<Page path="/terms" />);
    expect(canonical()).toBe("http://localhost:3000/terms");
  });

  it("stops saying it once you leave, rather than naming the front page", () => {
    render(<Page path="/terms" />);
    expect(canonical()).toBe("http://localhost:3000/terms");

    cleanup();
    // Pointing it at "/" on the way out is the same untruth, briefly: a
    // crawler reading the head at that moment is told the terms page is the
    // front page.
    expect(canonical()).toBeUndefined();
  });

  it("follows you from one page to the next", () => {
    const { unmount } = render(<Page path="/terms" />);
    expect(canonical()).toBe("http://localhost:3000/terms");
    unmount();

    render(<Page path="/privacy" />);
    expect(canonical()).toBe("http://localhost:3000/privacy");
  });
});

describe("Every page the public can reach", () => {
  // The six Google reported were exactly the ones with no crawler route and
  // nothing of their own to say.
  const PAGES = {
    "Landing.jsx": "/",
    "Terms.jsx": "/terms",
    "Privacy.jsx": "/privacy",
    "Contact.jsx": "/contact",
    "MarketplaceHowItWorks.jsx": "/marketplace/how-it-works",
    "ProjectRequest.jsx": "/marketplace/project-request",
    "About.jsx": "/about",
    "Help.jsx": "/help",
    "Discover.jsx": "/discover",
    "Marketplace.jsx": "/marketplace",
    "Community.jsx": "/community",
    "Blog.jsx": "/blog",
  };

  for (const [file, path] of Object.entries(PAGES)) {
    it(`${file} says it is ${path}`, () => {
      const source = readFileSync(`src/pages/${file}`, "utf8");
      expect(source).toMatch(/usePageMeta\(/);
      expect(source).toContain(`canonicalPath: "${path}"`);
    });
  }
});
