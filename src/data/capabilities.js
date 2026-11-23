// What VantaOrigin can do, and what is coming.
//
// One list, read by the page people see at /docs and mirrored by the API so
// a crawler that does not run scripts gets the same words. A test fails if
// the two drift, the same arrangement the marketplace copy already uses.
//
// Written for two readers at once: somebody deciding whether this is for
// them, and a model answering a question about it. That means plain
// sentences, no marketing, and saying plainly what is not built yet. A list
// that overstates what exists is worse than no list, because the thing it
// misleads is the thing quoting you to somebody else.

export const UPDATED = "2026-11-23";

export const SUMMARY =
  "VantaOrigin is one address for the characters a creator makes. Each character gets a card " +
  "with their artwork, name, universe, origin and abilities. Characters are grouped by project " +
  "and shared from a single page. Making and sharing characters is free.";

export const AUDIENCE =
  "Comic artists, illustrators, VTubers, writers, and people running long tabletop campaigns: " +
  "anyone who makes characters and has nowhere good to put them.";

export const AREAS = [
  {
    id: "characters",
    name: "Characters",
    summary: "Making a character, and what a character holds.",
    features: [
      {
        name: "Make a character",
        detail:
          "A name is enough to begin. The origin, the abilities, the universe, a tagline and the artwork can all be added later, in any order.",
      },
      {
        name: "Private until published",
        detail:
          "A new character is visible only to the person who made it, including on their own public page. It appears to anyone else only when it is published.",
      },
      {
        name: "More than one picture",
        detail:
          "A character holds a cover image and further artwork alongside it, so process shots or alternate designs sit with the character they belong to.",
      },
      {
        name: "Categories",
        detail:
          "Characters are grouped into categories the creator names, usually one per comic, book or project, so the cast of one story stays together.",
      },
      {
        name: "Edit or delete at any time",
        detail: "Every field on a character can be changed, and a character can be removed outright.",
      },
    ],
  },
  {
    id: "page",
    name: "Your page",
    summary: "The public address a creator shares.",
    features: [
      {
        name: "One link",
        detail:
          "Every creator has a public page at vantaorigin.com/creator/their-handle, showing their published characters grouped by category.",
      },
      {
        name: "Profile",
        detail: "A banner, an avatar, a display name, a handle and a line about the work.",
      },
      {
        name: "Copy the link",
        detail: "A share control that copies the page address, ready to paste anywhere.",
      },
      {
        name: "Embeddable character cards",
        detail:
          "A published character can be embedded in another site, so a card can sit inside a blog post or a storefront rather than only on VantaOrigin.",
      },
    ],
  },
  {
    id: "discovery",
    name: "Finding things",
    summary: "How work gets found, by readers and by search engines.",
    features: [
      {
        name: "Discover",
        detail: "Every published character across the site, newest first, open to anyone without an account.",
      },
      {
        name: "Creators",
        detail: "A browsable list of the people publishing here, each linking to their page.",
      },
      {
        name: "Likes",
        detail: "A signed-in reader can like a character, and a creator can see the count.",
      },
      {
        name: "Server-rendered pages for crawlers",
        detail:
          "Characters, creator pages, the blog, and the main site pages are served as plain HTML to crawlers and link previews, so they are readable without running scripts. There is a sitemap and an llms.txt.",
      },
      {
        name: "Reporting",
        detail: "Anyone can report a character or a creator page, and reports reach an admin queue.",
      },
    ],
  },
  {
    id: "audience",
    name: "Audience",
    summary: "Readers who want to hear when a creator makes something.",
    features: [
      {
        name: "Subscribe to a creator",
        detail:
          "A reader gives an email address on a creator's page and confirms it from their inbox. Nothing is added to a list without that confirmation.",
      },
      {
        name: "Subscriber list",
        detail:
          "A creator sees who subscribed, how many arrived this week, and how many left, and can export the list.",
      },
      {
        name: "Writing to subscribers",
        detail:
          "A creator can send one message to everyone who subscribed. Every message carries a way to unsubscribe, and unsubscribes are acted on immediately.",
      },
      {
        name: "Unsubscribing",
        detail:
          "Works from a link in the email and from a mail client's own unsubscribe button, without signing in.",
      },
      {
        name: "Email preferences",
        detail: "A reader chooses which kinds of email they get, separately from leaving a list entirely.",
      },
    ],
  },
  {
    id: "marketplace",
    name: "Studio marketplace",
    summary: "Commissioning work from VantaOrigin Studio.",
    features: [
      {
        name: "Portfolio by category",
        detail:
          "Finished work grouped into 2D characters, 3D characters, prop design, book and cover design, cards and TCG assets, comics art, worldbuilding and brand design.",
      },
      {
        name: "Create a brief",
        detail:
          "A form describing a project, which the studio answers by email to agree scope, timing and price before any work starts.",
      },
      {
        name: "Studio managed",
        detail:
          "Briefs are matched to a vetted artist by the studio, which manages the project and checks the work before it is delivered.",
      },
    ],
  },
  {
    id: "accounts",
    name: "Accounts",
    summary: "Signing in, and what an account controls.",
    features: [
      {
        name: "Email and password, or Google",
        detail: "Passwords are hashed with argon2id. Email addresses are verified by a code.",
      },
      { name: "Password reset", detail: "By a code sent to the address on the account." },
      {
        name: "Settings",
        detail:
          "Profile and banner, personal details, how characters are embedded elsewhere, and password changes.",
      },
      {
        name: "Delete your account",
        detail:
          "An account can be deleted outright. What was sold stays on the order it belongs to, with the person detached from it.",
      },
    ],
  },
  {
    id: "writing",
    name: "Blog",
    summary: "Writing published by VantaOrigin.",
    features: [
      { name: "Posts", detail: "Published articles with categories, excerpts and related reading." },
      {
        name: "Newsletter",
        detail: "A site newsletter, separate from any individual creator's subscribers, with double opt-in.",
      },
    ],
  },
];

// Said in the order somebody would ask: what works, what is half built, what
// is only decided. A roadmap is worth reading only if the three are not
// blurred together.
export const ROADMAP = [
  {
    stage: "Live now",
    detail: "Working on the site today.",
    items: [
      "Characters, categories, publishing and the public creator page",
      "Discover, the creator directory, likes and reporting",
      "Subscribers with double opt-in, broadcasts, unsubscribes and email preferences",
      "The studio marketplace portfolio and the brief form",
      "The blog and the site newsletter",
      "Embeddable character cards",
    ],
  },
  {
    stage: "Being built",
    detail: "Written and working, but not yet open to creators.",
    items: [
      "Distribution: selling printed copies of a creator's book, with the price floor worked out from real printing and delivery costs so a book cannot be sold below what it costs to make",
      "An admin screen for entering printer quotes and delivery rates, which everything else is priced from",
      "A ledger recording what each order owes the printer, the courier, the creator and the platform",
    ],
  },
  {
    stage: "Next",
    detail: "Designed, and waiting on the things listed under blockers.",
    items: [
      "A reader's checkout for ordering a printed book",
      "A printer's portal, reached by invitation, where a print partner sees orders and accepts them",
      "Admin fulfilment screens for tracking an order from payment to delivery",
      "Creator payouts",
    ],
  },
  {
    stage: "Blocked on the real world",
    detail: "Not engineering problems. These are what the next stage is waiting for.",
    items: [
      "Printing quotes from a real printer, for one copy and for five, in each format",
      "Delivery rates from a courier",
      "The licensing position for printing and selling books in Nigeria",
      "Payment provider accounts for live transactions",
    ],
  },
];
