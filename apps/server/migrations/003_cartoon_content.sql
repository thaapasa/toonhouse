-- The scenes of a cartoon, in the format of `CartoonContent` in packages/model.
-- The version of the format is in the `version` field of the JSON.
ALTER TABLE cartoons
  ADD COLUMN content jsonb NOT NULL DEFAULT '{"version": 1, "scenes": []}';
