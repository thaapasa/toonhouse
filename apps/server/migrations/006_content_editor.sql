-- The editor that made the latest save of the content. A web app that lost
-- the answer to its save sees from it that the newer revision is its own.
ALTER TABLE cartoons ADD COLUMN content_editor uuid;
