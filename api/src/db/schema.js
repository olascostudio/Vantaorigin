// Plain PostgreSQL: tables, foreign keys and indexes only. Nothing here is
// tied to a hosting provider, so the same schema runs on a laptop, on managed
// Postgres and on a VPS.
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    // argon2id hash; never a plaintext password
    passwordHash: text("password_hash").notNull(),
    username: text("username").notNull(),
    firstName: text("first_name").default("").notNull(),
    lastName: text("last_name").default("").notNull(),
    bio: text("bio").default("").notNull(),
    dateOfBirth: text("date_of_birth").default("").notNull(),
    avatarUrl: text("avatar_url"),
    bannerUrl: text("banner_url"),
    // Whether this creator's published characters may be shown inside
    // somebody else's page. Not about secrecy: they are already public.
    allowEmbeds: boolean("allow_embeds").default(true).notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_key").on(table.email),
    usernameIdx: uniqueIndex("users_username_key").on(table.username),
  })
);

// Opaque session tokens, hashed at rest. Swapping to JWTs later would not
// change any other table.
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("sessions_token_hash_key").on(table.tokenHash),
    userIdx: index("sessions_user_id_idx").on(table.userId),
  })
);

// Email verification and password resets.
export const tokens = pgTable(
  "tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // "verify_email" | "reset_password"
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    attempts: integer("attempts").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("tokens_token_hash_key").on(table.tokenHash),
    userKindIdx: index("tokens_user_kind_idx").on(table.userId, table.kind),
  })
);

// A creator's project: "Iron Inferno Comic", "My Characters", and so on.
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // The backdrop every character made in this project starts with. It is
    // set by choosing one on any character here, since that is where the
    // choice is really made.
    bannerUrl: text("banner_url"),
    position: integer("position").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("categories_user_id_idx").on(table.userId),
  })
);

export const characters = pgTable(
  "characters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    // The name in the address bar: settled when the character is made, then
    // left alone so a shared link never stops working.
    slug: text("slug"),
    universe: text("universe").default("").notNull(),
    tagline: text("tagline").default("").notNull(),
    backstory: text("backstory").default("").notNull(),
    power: text("power").default("0").notNull(),
    coverUrl: text("cover_url"),
    bannerUrl: text("banner_url"),
    // Taken from the cover when it is uploaded: the colour this card's edge
    // is drawn in, so each one is trimmed in its own artwork.
    accent: text("accent"),
    isPublic: boolean("is_public").default(false).notNull(),
    // Abilities and stats travel together with the character and are only ever
    // read as a whole, so jsonb keeps them in one row. Still standard Postgres.
    details: jsonb("details")
      .$type()
      .default({ core: {}, signature: {}, weakness: {}, alignment: {}, stats: [] })
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("characters_user_id_idx").on(table.userId),
    categoryIdx: index("characters_category_id_idx").on(table.categoryId),
    publicIdx: index("characters_public_idx").on(table.isPublic),
  })
);

// Creator highlight posts, shown on the Creator hub feed.
export const highlights = pgTable(
  "highlights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").default("").notNull(),
    content: text("content").default("").notNull(),
    // just the addresses; the files themselves live in storage
    images: jsonb("images").$type().default([]).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("highlights_user_id_idx").on(table.userId),
  })
);

// Artwork attached to a character; the file itself lives in S3-compatible storage.
export const characterAssets = pgTable(
  "character_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    position: integer("position").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    characterIdx: index("character_assets_character_id_idx").on(table.characterId),
  })
);

// A like on a character. One row per person per character: the unique index
// makes a second tap a no-op rather than a second like.
export const characterLikes = pgTable(
  "character_likes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    oneEach: uniqueIndex("character_likes_character_user_key").on(table.characterId, table.userId),
    characterIdx: index("character_likes_character_id_idx").on(table.characterId),
  })
);

// A report raised against a creator, from a character page or a creator page. The
// reason is one of a short list the screen offers; the message is optional.
export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterId: uuid("reporter_id").references(() => users.id, { onDelete: "set null" }),
    subjectUserId: uuid("subject_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    characterId: uuid("character_id").references(() => characters.id, { onDelete: "set null" }),
    reason: text("reason").notNull(),
    message: text("message").default("").notNull(),
    status: text("status").default("open").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    subjectIdx: index("reports_subject_idx").on(table.subjectUserId),
    reporterIdx: index("reports_reporter_idx").on(table.reporterId),
  })
);

// Who hears from VantaOrigin. Separate from accounts: somebody can follow
// the newsletter without an account, and leave it without losing one.
export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    status: text("status").default("subscribed").notNull(),
    source: text("source").default("footer").notNull(),
    // Carried in the unsubscribe link, which has to work with nobody signed
    // in and must not be guessable from the address.
    token: text("token").notNull(),
    // The last letter this address was sent. It is what makes a send safe to
    // repeat: a restart halfway through resumes rather than sends twice.
    lastIssueId: uuid("last_issue_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    // A quieter option than leaving, for somebody with no account. The one
    // on email_preferences cannot serve them: that table is keyed by user.
    pausedUntil: timestamp("paused_until", { withTimezone: true }),
  },
  (table) => ({
    tokenIdx: uniqueIndex("newsletter_subscribers_token_key").on(table.token),
    statusIdx: index("newsletter_subscribers_status_idx").on(table.status),
  })
);

// A letter, from first draft to sent. The writing is kept as blocks so the
// email is built at sending time and always lands in the current shell.
export const newsletterIssues = pgTable(
  "newsletter_issues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subject: text("subject").default("").notNull(),
    preheader: text("preheader").default("").notNull(),
    blocks: jsonb("blocks").$type().default([]).notNull(),
    status: text("status").default("draft").notNull(), // draft | sending | sent
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    sentCount: integer("sent_count").default(0).notNull(),
    failedCount: integer("failed_count").default(0).notNull(),
    // Not sent on purpose: unsubscribed, pending, paused or suppressed.
    // Neither a success nor a failure, and lumping it with either lies.
    skippedCount: integer("skipped_count").default(0).notNull(),
    // Who did not get it and what was said, because a count of failures
    // cannot be acted on.
    failures: jsonb("failures").$type().default([]).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index("newsletter_issues_status_idx").on(table.status),
    createdIdx: index("newsletter_issues_created_idx").on(table.createdAt),
  })
);

// A letter's shape, kept to start the next one from.
export const newsletterTemplates = pgTable(
  "newsletter_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    subject: text("subject").default("").notNull(),
    preheader: text("preheader").default("").notNull(),
    blocks: jsonb("blocks").$type().default([]).notNull(),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    createdIdx: index("newsletter_templates_created_idx").on(table.createdAt),
  })
);

// Blog posts. The body is HTML, which is what the editor hands back and what
// both a web page and a crawler can read. The SEO columns are allowed to be
// empty: empty means "use the real thing" rather than "show nothing".
export const blogPosts = pgTable(
  "blog_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    excerpt: text("excerpt").default("").notNull(),
    body: text("body").default("").notNull(),
    heroUrl: text("hero_url"),
    heroAccent: text("hero_accent"),
    // Where the wide frame sits on a tall picture, as a percentage from the
    // top. The same number CSS object-position wants.
    heroFocus: integer("hero_focus").default(50).notNull(),
    category: text("category").default("").notNull(),
    tags: jsonb("tags").$type().default([]).notNull(),

    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    status: text("status").default("draft").notNull(),
    featured: boolean("featured").default(false).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    readingMinutes: integer("reading_minutes").default(0).notNull(),

    metaTitle: text("meta_title").default("").notNull(),
    metaDescription: text("meta_description").default("").notNull(),
    metaKeywords: jsonb("meta_keywords").$type().default([]).notNull(),
    canonicalUrl: text("canonical_url").default("").notNull(),
    ogImageUrl: text("og_image_url"),
    // Drawn from the hero and the title when the post goes out. Separate from
    // ogImageUrl, which is the one somebody uploaded themselves.
    shareImageUrl: text("share_image_url"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex("blog_posts_slug_key").on(table.slug),
    publishedIdx: index("blog_posts_published_idx").on(table.status, table.publishedAt),
  })
);

// Addresses a post used to have, kept so old links still arrive somewhere.
export const blogPostSlugs = pgTable(
  "blog_post_slugs",
  {
    slug: text("slug").primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    postIdx: index("blog_post_slugs_post_idx").on(table.postId),
  })
);

// Every email that left the building, and what became of it.
//
// The address is kept beside the id because plenty of mail goes to people
// with no account, and because a user who changes their address later should
// not rewrite what we sent to the old one.
export const emailLog = pgTable(
  "email_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    // One of the four kinds. The database checks this too.
    class: text("class").notNull(),
    template: text("template").default("").notNull(),
    // What Resend called it, which is how a webhook finds this row later.
    providerMessageId: text("provider_message_id"),
    status: text("status").default("queued").notNull(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("email_log_user_idx").on(table.userId, table.createdAt),
    providerIdx: index("email_log_provider_idx").on(table.providerMessageId),
    statusIdx: index("email_log_status_idx").on(table.status, table.createdAt),
  })
);

// Addresses we have been told to stop writing to. Keyed by address rather
// than by user: a bounce is a fact about a mailbox, and the mailbox may
// belong to nobody here.
export const suppressionList = pgTable("suppression_list", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  reason: text("reason").notNull(),
  note: text("note").default("").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Something said to everybody at once.
//
// The newsletter is the one kind of mass email people may refuse. A change
// to the terms is not: it governs the account they hold. So this carries a
// reason category, which is not a label but the thing that decides who it
// reaches, and a record of who sent it.
export const broadcasts = pgTable(
  "broadcasts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    class: text("class").default("service_announcement").notNull(),
    reasonCategory: text("reason_category"),
    subject: text("subject").default("").notNull(),
    blocks: jsonb("blocks").$type().default([]).notNull(),
    termsVersion: text("terms_version"),
    status: text("status").default("draft").notNull(),

    // The audit. Who pressed send, when, and how many people were named at
    // the moment they were shown the number and agreed to it.
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdByEmail: text("created_by_email").default("").notNull(),
    sentByEmail: text("sent_by_email"),
    audienceCount: integer("audience_count"),

    sentCount: integer("sent_count").default(0).notNull(),
    failedCount: integer("failed_count").default(0).notNull(),
    skippedCount: integer("skipped_count").default(0).notNull(),
    failures: jsonb("failures").$type().default([]).notNull(),

    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index("broadcasts_status_idx").on(table.status, table.createdAt),
  })
);

// Who a broadcast has already reached.
//
// The send loop owns this rather than reading rows another module writes:
// its termination must not depend on a side effect that is allowed to fail.
// One row per person per broadcast, written after each attempt whatever the
// outcome, with the unique index making a second attempt impossible.
export const broadcastRecipients = pgTable(
  "broadcast_recipients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    broadcastId: uuid("broadcast_id")
      .notNull()
      .references(() => broadcasts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    outcome: text("outcome").notNull(),
    reason: text("reason"),
    at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pairIdx: uniqueIndex("broadcast_recipients_pair_key").on(table.broadcastId, table.userId),
  })
);

// Subscribing to a creator.
//
// Separate from newsletterSubscribers on purpose. That is the platform's own
// list, and everything around it exists so we can answer for what we send.
// This is a different promise: the subscriber agrees that their address goes
// to one named creator, who writes to them with their own tools.
//
// The address is not copied here. It lives on the user row, so there is one
// answer to "what address did they give us" rather than two that can drift.
export const creatorSubscriptions = pgTable(
  "creator_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subscriberId: uuid("subscriber_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").default("subscribed").notNull(),
    // The evidence, recorded per creator: agreeing to one is not agreeing
    // to another.
    consentAt: timestamp("consent_at", { withTimezone: true }).defaultNow().notNull(),
    consentIp: text("consent_ip"),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    token: text("token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pairIdx: uniqueIndex("creator_subscriptions_pair_key").on(table.creatorId, table.subscriberId),
    tokenIdx: uniqueIndex("creator_subscriptions_token_key").on(table.token),
    creatorIdx: index("creator_subscriptions_creator_idx").on(
      table.creatorId,
      table.status,
      table.createdAt
    ),
    subscriberIdx: index("creator_subscriptions_subscriber_idx").on(
      table.subscriberId,
      table.status
    ),
  })
);

// Somebody asking to be told when a locked feature opens. Not a
// subscription and not consent to anything.
export const featureInterest = pgTable(
  "feature_interest",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    feature: text("feature").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pairIdx: uniqueIndex("feature_interest_pair_key").on(table.userId, table.feature),
  })
);

// Who decided to write to a suppressed address again, and why.
//
// Lifting removes the suppression row, which would otherwise destroy the
// only evidence it ever happened. Being on that list means not even a
// password reset arrives, so coming off it is a decision about somebody's
// access to their own account.
export const suppressionLifts = pgTable(
  "suppression_lifts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    wasReason: text("was_reason").notNull(),
    wasNote: text("was_note").default("").notNull(),
    wasSuppressedAt: timestamp("was_suppressed_at", { withTimezone: true }),
    liftedBy: text("lifted_by").notNull(),
    note: text("note").notNull(),
    liftedAt: timestamp("lifted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index("suppression_lifts_email_idx").on(table.email, table.liftedAt),
  })
);

// Every webhook the sender delivered, kept so a replay can be recognised.
//
// Webhooks arrive at least once, never exactly once: a provider that does
// not hear a prompt 200 retries, and the same event lands again. The unique
// index on provider_event_id is what makes the second one a no-op.
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerEventId: text("provider_event_id").notNull(),
    eventType: text("event_type").notNull(),
    providerMessageId: text("provider_message_id"),
    email: text("email"),
    // Kept whole: when something here is wrong later, the question is
    // always what they actually sent, and a summary cannot answer it.
    payload: jsonb("payload").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    eventIdx: uniqueIndex("webhook_events_provider_event_id_key").on(table.providerEventId),
    messageIdx: index("webhook_events_message_idx").on(table.providerMessageId),
  })
);

// The terms, as versions somebody can be shown to have accepted. The page
// records what the terms say; this records who agreed to which wording.
export const termsVersions = pgTable("terms_versions", {
  version: text("version").primaryKey(),
  // "terms" for the ones everybody accepts, "creator_terms" for the rules a
  // creator agrees to before being shown anybody else's address. One table,
  // because accepting either is the same act and is recorded the same way.
  kind: text("kind").default("terms").notNull(),
  effectiveDate: timestamp("effective_date", { withTimezone: true }).notNull(),
  summary: text("summary").default("").notNull(),
  url: text("url").default("/terms").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// One row per person per version, so a later version does not erase that
// they accepted the earlier one.
export const userTermsAcceptance = pgTable(
  "user_terms_acceptance",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    version: text("version")
      .notNull()
      .references(() => termsVersions.version, { onDelete: "cascade" }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }).defaultNow().notNull(),
    acceptedIp: text("accepted_ip"),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.version] }),
    userIdx: index("user_terms_acceptance_user_idx").on(table.userId, table.acceptedAt),
  })
);

// What each person has agreed to hear about. Keyed by user; addresses with
// no account stay in newsletterSubscribers, because consent from somebody
// who only typed an address into a footer form is a different record with
// different evidence behind it.
export const emailPreferences = pgTable(
  "email_preferences",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    // pending, subscribed, unsubscribed, bounced, complained. Only
    // "subscribed" may receive marketing.
    marketingStatus: text("marketing_status").default("pending").notNull(),

    // On by default, off one at a time.
    notifyBattleChallenges: boolean("notify_battle_challenges").default(true).notNull(),
    notifyAffiliateEarnings: boolean("notify_affiliate_earnings").default(true).notNull(),
    notifyComments: boolean("notify_comments").default(true).notNull(),
    notifyCharacterActivity: boolean("notify_character_activity").default(true).notNull(),

    // How the consent was given, which is the part that matters when
    // somebody asks us to prove it.
    consentAt: timestamp("consent_at", { withTimezone: true }),
    consentSource: text("consent_source"),
    consentIp: text("consent_ip"),

    // A quieter option than leaving.
    pausedUntil: timestamp("paused_until", { withTimezone: true }),

    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    unsubscribeReason: text("unsubscribe_reason"),

    // Consent we inherited and cannot evidence.
    needsConsentReview: boolean("needs_consent_review").default(false).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    marketingIdx: index("email_preferences_marketing_idx").on(table.marketingStatus),
  })
);

// ---- VantaOrigin Distribution ----
//
// The tables migration 0032 creates. Money is always bigint in minor units,
// named _minor so a wrong unit is visible where it is used. The reasoning
// behind each shape lives in the migration, which is the file somebody
// reads when they want to know why.

// Money, every time: integer minor units, read back as a number.
const money = (name) => bigint(name, { mode: "number" });

export const countries = pgTable("countries", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  currency: text("currency").notNull(),
  paymentProvider: text("payment_provider").notNull(),
  enabled: boolean("enabled").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const bookFormats = pgTable("book_formats", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  trimWidthMil: integer("trim_width_mil").notNull(),
  trimHeightMil: integer("trim_height_mil").notNull(),
  colour: text("colour").notNull(),
  binding: text("binding").notNull(),
  minPages: integer("min_pages").notNull(),
  maxPages: integer("max_pages").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  position: integer("position").default(0).notNull(),
});

export const printers = pgTable(
  "printers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    countryCode: text("country_code").notNull(),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    notes: text("notes"),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({ countryIdx: index("printers_country_idx").on(table.countryCode) })
);

export const printerCosts = pgTable(
  "printer_costs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    printerId: uuid("printer_id").notNull(),
    formatSlug: text("format_slug").notNull(),
    // A band applies from here upwards until the next one starts.
    minQuantity: integer("min_quantity").default(1).notNull(),
    unitCostMinor: money("unit_cost_minor").notNull(),
    packagingMinor: money("packaging_minor").default(0).notNull(),
    perPageMinor: money("per_page_minor").default(0).notNull(),
    // True until a printer actually quotes. The engine will not let a price
    // be published on top of one of these.
    isPlaceholder: boolean("is_placeholder").default(true).notNull(),
    quotedAt: timestamp("quoted_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    lookupIdx: index("printer_costs_lookup_idx").on(table.formatSlug, table.minQuantity),
  })
);

export const deliveryRates = pgTable("delivery_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  countryCode: text("country_code").notNull(),
  region: text("region"),
  parcelCostMinor: money("parcel_cost_minor").notNull(),
  extraCopyMinor: money("extra_copy_minor").default(0).notNull(),
  estDaysMin: integer("est_days_min").notNull(),
  estDaysMax: integer("est_days_max").notNull(),
  courier: text("courier"),
  isPlaceholder: boolean("is_placeholder").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const books = pgTable(
  "books",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull(),
    creatorId: uuid("creator_id").notNull(),
    title: text("title").notNull(),
    description: text("description").default("").notNull(),
    formatSlug: text("format_slug").notNull(),
    pageCount: integer("page_count").notNull(),
    coverImageUrl: text("cover_image_url"),
    status: text("status").default("draft").notNull(),
    rightsWarrantyAcceptedAt: timestamp("rights_warranty_accepted_at", { withTimezone: true }),
    rightsWarrantyVersion: text("rights_warranty_version"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    publicIdx: uniqueIndex("books_public_id_key").on(table.publicId),
    creatorIdx: index("books_creator_idx").on(table.creatorId),
  })
);

export const bookFiles = pgTable("book_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookId: uuid("book_id").notNull(),
  kind: text("kind").notNull(),
  storageKey: text("storage_key").notNull(),
  byteSize: bigint("byte_size", { mode: "number" }),
  checksum: text("checksum"),
  pageCount: integer("page_count"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
});

export const bookPrices = pgTable("book_prices", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookId: uuid("book_id").notNull(),
  countryCode: text("country_code").notNull(),
  retailMinor: money("retail_minor").notNull(),
  currency: text("currency").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const creatorDomains = pgTable(
  "creator_domains",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creatorId: uuid("creator_id").notNull(),
    domain: text("domain").notNull(),
    status: text("status").default("pending_review").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedNote: text("reviewed_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({ creatorIdx: index("creator_domains_creator_idx").on(table.creatorId) })
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull(),
    statusToken: text("status_token").notNull(),
    countryCode: text("country_code").notNull(),
    currency: text("currency").notNull(),
    buyerName: text("buyer_name").notNull(),
    buyerEmail: text("buyer_email").notNull(),
    buyerPhone: text("buyer_phone"),
    address: jsonb("address").$type().default({}).notNull(),
    region: text("region"),
    status: text("status").default("pending_payment").notNull(),
    // Frozen when the order is made. A cost table edited later must never
    // change what somebody already paid.
    retailMinor: money("retail_minor").default(0).notNull(),
    deliveryMinor: money("delivery_minor").default(0).notNull(),
    gatewayFeeMinor: money("gateway_fee_minor").default(0).notNull(),
    platformFeeMinor: money("platform_fee_minor").default(0).notNull(),
    printerCostMinor: money("printer_cost_minor").default(0).notNull(),
    totalMinor: money("total_minor").default(0).notNull(),
    paymentProvider: text("payment_provider"),
    providerReference: text("provider_reference"),
    printerId: uuid("printer_id"),
    courier: text("courier"),
    trackingNumber: text("tracking_number"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    inspectionEndsAt: timestamp("inspection_ends_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    publicIdx: uniqueIndex("orders_public_id_key").on(table.publicId),
    tokenIdx: uniqueIndex("orders_status_token_key").on(table.statusToken),
    statusIdx: index("orders_status_idx").on(table.status),
    emailIdx: index("orders_buyer_email_idx").on(table.buyerEmail),
  })
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull(),
    bookId: uuid("book_id").notNull(),
    quantity: integer("quantity").notNull(),
    unitRetailMinor: money("unit_retail_minor").notNull(),
    unitPrinterCostMinor: money("unit_printer_cost_minor").default(0).notNull(),
    title: text("title").notNull(),
    formatSlug: text("format_slug").notNull(),
    pageCount: integer("page_count").notNull(),
    creatorId: uuid("creator_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orderIdx: index("order_items_order_idx").on(table.orderId),
    creatorIdx: index("order_items_creator_idx").on(table.creatorId),
  })
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull(),
    status: text("status").notNull(),
    note: text("note"),
    actor: text("actor").default("system").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({ orderIdx: index("order_events_order_idx").on(table.orderId, table.createdAt) })
);

export const defectClaims = pgTable(
  "defect_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull(),
    description: text("description").notNull(),
    photoKeys: jsonb("photo_keys").$type().default([]).notNull(),
    status: text("status").default("open").notNull(),
    resolutionNote: text("resolution_note"),
    refundMinor: money("refund_minor"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: uuid("resolved_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({ orderIdx: index("defect_claims_order_idx").on(table.orderId) })
);

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull(),
    party: text("party").notNull(),
    partyUserId: uuid("party_user_id"),
    partyPrinterId: uuid("party_printer_id"),
    kind: text("kind").default("earning").notNull(),
    // May be negative: a chargeback is an entry against the order, not an
    // edit to the one it reverses.
    amountMinor: money("amount_minor").notNull(),
    currency: text("currency").notNull(),
    status: text("status").default("held").notNull(),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    settlementNote: text("settlement_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orderIdx: index("ledger_order_idx").on(table.orderId),
    owedIdx: index("ledger_owed_idx").on(table.party, table.status),
    creatorIdx: index("ledger_creator_idx").on(table.partyUserId, table.status),
  })
);

export const payoutAccounts = pgTable("payout_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  countryCode: text("country_code").notNull(),
  accountName: text("account_name").notNull(),
  accountNumber: text("account_number").notNull(),
  bankName: text("bank_name").notNull(),
  bankCode: text("bank_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const distributionWaitlist = pgTable(
  "distribution_waitlist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    countryCode: text("country_code").notNull(),
    bookId: uuid("book_id"),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({ countryIdx: index("distribution_waitlist_country_idx").on(table.countryCode) })
);

export const distributionSettings = pgTable("distribution_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Letting a print partner in, and only by invitation. See 0035.
export const printerInvites = pgTable(
  "printer_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    printerId: uuid("printer_id").notNull(),
    email: text("email").notNull(),
    // sha256, the way a session token is kept, so this table cannot be read
    // as a set of working invitations.
    tokenHash: text("token_hash").notNull(),
    agreementVersion: text("agreement_version").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedBy: uuid("accepted_by"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("printer_invites_token_key").on(table.tokenHash),
    printerIdx: index("printer_invites_printer_idx").on(table.printerId),
  })
);

// Who may act for a printer. A shop is a place with staff.
export const printerUsers = pgTable(
  "printer_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    printerId: uuid("printer_id").notNull(),
    userId: uuid("user_id").notNull(),
    agreementVersion: text("agreement_version").notNull(),
    agreedAt: timestamp("agreed_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pairIdx: uniqueIndex("printer_users_pair_key").on(table.printerId, table.userId),
    userIdx: index("printer_users_user_idx").on(table.userId),
  })
);

// Letting a creator into Creator Studio, by invitation. See 0036.
export const studioInvites = pgTable(
  "studio_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    note: text("note"),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedBy: uuid("accepted_by"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("studio_invites_token_key").on(table.tokenHash),
  })
);

export const studioMembers = pgTable(
  "studio_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    invitedEmail: text("invited_email"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: uniqueIndex("studio_members_user_key").on(table.userId),
  })
);
