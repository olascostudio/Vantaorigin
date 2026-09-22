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
    realm: text("realm").default("").notNull(),
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
