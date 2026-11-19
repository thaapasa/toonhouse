-- The preview image of a cartoon, which the web app makes from a frame in the
-- editor. A table of its own keeps the images out of the queries for the
-- cartoon list.
CREATE TABLE cartoon_previews (
  cartoon_id uuid PRIMARY KEY REFERENCES cartoons (id) ON DELETE CASCADE,
  image bytea NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('image/webp', 'image/png')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
