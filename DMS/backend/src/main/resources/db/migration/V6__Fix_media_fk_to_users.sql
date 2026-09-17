-- Fix incident_media.uploaded_by FK: was pointing to citizens, should point to users
ALTER TABLE incident_media DROP CONSTRAINT IF EXISTS incident_media_uploaded_by_fkey;
ALTER TABLE incident_media
    ADD CONSTRAINT incident_media_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL;
