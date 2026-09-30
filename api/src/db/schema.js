// Plain PostgreSQL: tables, foreign keys and indexes only. Nothing here is
// tied to a hosting provider, so the same schema runs on a laptop, on managed
// Postgres and on a VPS.
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
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
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index("newsletter_issues_status_idx").on(table.status),
    createdIdx: index("newsletter_issues_created_idx").on(table.createdAt),
  })
);
