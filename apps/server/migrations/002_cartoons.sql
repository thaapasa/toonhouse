-- The content of a cartoon (its shots, scenes and cast) comes later.
CREATE TABLE cartoons (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title text NOT NULL,
  visibility text NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('public', 'users', 'group', 'private')),
  -- A group can't be deleted while a cartoon is shared with it.
  group_id uuid REFERENCES groups (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((visibility = 'group') = (group_id IS NOT NULL))
);

CREATE INDEX cartoons_owner_id ON cartoons (owner_id);
CREATE INDEX cartoons_group_id ON cartoons (group_id) WHERE group_id IS NOT NULL;
