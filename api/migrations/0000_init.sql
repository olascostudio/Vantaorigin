-- VantaOrigin initial schema. Standard PostgreSQL only, so this file restores
-- on any Postgres: a laptop, managed hosting or a VPS.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  username text NOT NULL,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  date_of_birth text NOT NULL DEFAULT '',
  avatar_url text,
  banner_url text,
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (email);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users (username);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_hash_key ON sessions (token_hash);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);

CREATE TABLE IF NOT EXISTS tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind text NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tokens_token_hash_key ON tokens (token_hash);
CREATE INDEX IF NOT EXISTS tokens_user_kind_idx ON tokens (user_id, kind);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS categories_user_id_idx ON categories (user_id);

CREATE TABLE IF NOT EXISTS characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories (id) ON DELETE SET NULL,
  name text NOT NULL,
  realm text NOT NULL DEFAULT '',
  tagline text NOT NULL DEFAULT '',
  backstory text NOT NULL DEFAULT '',
  power text NOT NULL DEFAULT '0',
  cover_url text,
  banner_url text,
  is_public boolean NOT NULL DEFAULT false,
  details jsonb NOT NULL DEFAULT '{"core":{},"signature":{},"weakness":{},"alignment":{},"stats":[]}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS characters_user_id_idx ON characters (user_id);
CREATE INDEX IF NOT EXISTS characters_category_id_idx ON characters (category_id);
CREATE INDEX IF NOT EXISTS characters_public_idx ON characters (is_public);

CREATE TABLE IF NOT EXISTS character_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
  url text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS character_assets_character_id_idx ON character_assets (character_id);
