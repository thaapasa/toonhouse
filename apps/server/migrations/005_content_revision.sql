-- Each save of the content raises the revision by one. A save names the
-- revision that it edited, so that it can't overwrite a newer save.
ALTER TABLE cartoons ADD COLUMN content_revision integer NOT NULL DEFAULT 0;

-- The server inserts the content of a new cartoon from `emptyContent` in
-- packages/model, so that the format has one source.
ALTER TABLE cartoons ALTER COLUMN content DROP DEFAULT;
