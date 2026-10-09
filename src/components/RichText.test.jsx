import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// The editor's styling, pinned.
//
// The editor shipped once with no styling at all. There is a skin.js next to
// the skin's CSS, and importing it looks right: it is what the package
// documents. It is not what it appears to be. It calls tinymce.Resource.add,
// which only registers the CSS for TinyMCE to fetch later, and the init
// option `skin: false` tells TinyMCE never to ask for it.
//
// The two cancelled each other out. TinyMCE mounted, reported itself healthy,
// and rendered an unstyled 300x150 iframe inside a full width box: a dead
// rectangle nobody could type in. Nothing threw, and a test that only asked
// whether the editor existed passed.
//
// So this reads the source. It is a blunt test, but the failure it guards
// against is invisible at runtime and only shows up on somebody's screen.
const source = readFileSync(resolve(__dirname, "./RichText.jsx"), "utf8");

describe("The editor's skin", () => {
  it("is imported as CSS, not as the resource registrar", () => {
    expect(source).toMatch(/skin\.min\.css\?inline/);
    // skin.js registers; it does not style. Importing it achieves nothing
    // while `skin: false` is set, which is how this broke.
    expect(source).not.toMatch(/import ["']tinymce\/skins\/ui\/[^"']*\/skin\.js["']/);
  });

  it("is actually put on the page", () => {
    expect(source).toMatch(/document\.createElement\("style"\)/);
    expect(source).toMatch(/textContent = skinCss/);
    expect(source).toMatch(/document\.head\.appendChild/);
  });

  it("styles the inside of the editing frame too", () => {
    // Without these the writing area has none of TinyMCE's base styling.
    expect(source).toMatch(/contentBaseCss/);
    expect(source).toMatch(/contentUiCss/);
    expect(source).toMatch(/content_style: \[contentBaseCss, contentUiCss/);
  });

  it("still tells TinyMCE not to fetch anything at runtime", () => {
    // Self hosted, bundled, offline: nothing here may call out to a CDN.
    expect(source).toMatch(/skin: false/);
    expect(source).toMatch(/content_css: false/);
    expect(source).toMatch(/licenseKey="gpl"/);
  });
});
