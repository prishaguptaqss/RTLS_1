-- SQL script to check and setup tags for tracking
-- Run this to verify your tags are properly configured

-- Check current tags
SELECT tag_id, assigned_user_id, status FROM tags;

-- Check current users
SELECT user_id, name FROM users;

-- If tag E2:D5:A0:F5:79:99 doesn't exist, create it and assign to mohit
-- First make sure user 'mohit' exists (replace with actual user_id)
INSERT INTO users (user_id, name, email, role, status, created_at)
VALUES ('mohit', 'Mohit Kumar', 'mohit@example.com', 'Staff', 'active', NOW())
ON CONFLICT (user_id) DO NOTHING;

-- Create/update the tag
INSERT INTO tags (tag_id, assigned_user_id, status, last_seen)
VALUES ('E2:D5:A0:F5:79:99', 'mohit', 'active', NULL)
ON CONFLICT (tag_id) DO UPDATE
SET assigned_user_id = 'mohit', status = 'active';

-- Verify the setup
SELECT
    t.tag_id,
    t.assigned_user_id,
    u.name as user_name,
    t.status,
    ll.room_id,
    ll.updated_at as last_location_update
FROM tags t
LEFT JOIN users u ON t.assigned_user_id = u.user_id
LEFT JOIN live_locations ll ON t.tag_id = ll.tag_id
WHERE t.tag_id = 'E2:D5:A0:F5:79:99';
