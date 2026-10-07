-- The blog.
--
-- A post is written as HTML, because that is what a rich text editor hands
-- back and what both a web page and an email can render. Everything a search
-- engine needs is kept beside it rather than worked out at request time, so
-- the person writing the post decides how it appears in search.
--
-- Two tables. The post itself, and every address it has ever had: changing a
-- slug after publishing would otherwise break links already out in the world,
-- so the old one is kept and redirects to the new.

CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- what it says
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  hero_url text,
  -- Taken from the hero picture on upload, so a card is trimmed in the
  -- colours of its own artwork. The same idea the character cards use.
  hero_accent text,
  category text NOT NULL DEFAULT '',
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- how it is published
  author_id uuid REFERENCES users (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  featured boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  reading_minutes integer NOT NULL DEFAULT 0,

  -- how it appears in search. Empty means "fall back to the real thing":
  -- the title, the excerpt, the hero picture.
  meta_title text NOT NULL DEFAULT '',
  meta_description text NOT NULL DEFAULT '',
  meta_keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  canonical_url text NOT NULL DEFAULT '',
  og_image_url text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT blog_posts_status_check CHECK (status IN ('draft', 'published'))
);

-- The listing reads published posts newest first, and nothing else.
CREATE INDEX IF NOT EXISTS blog_posts_published_idx
  ON blog_posts (status, published_at DESC);

CREATE INDEX IF NOT EXISTS blog_posts_featured_idx
  ON blog_posts (featured) WHERE featured;

CREATE INDEX IF NOT EXISTS blog_posts_category_idx
  ON blog_posts (category);

-- Every address a post has ever answered to. A renamed post keeps its old
-- links working instead of handing out a 404 to everyone who already shared
-- it.
CREATE TABLE IF NOT EXISTS blog_post_slugs (
  slug text PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES blog_posts (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blog_post_slugs_post_idx
  ON blog_post_slugs (post_id);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_slugs ENABLE ROW LEVEL SECURITY;
