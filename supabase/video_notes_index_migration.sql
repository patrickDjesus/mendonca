DROP INDEX IF EXISTS idx_video_notes_video;

CREATE INDEX idx_video_notes_video_user ON video_notes(video_id, user_id);
