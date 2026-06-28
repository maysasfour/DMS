-- V8__Reset_mays_password.sql
-- Reset mays.suhail@gmail.com password to Admin@1234
-- Hash: $2a$10$sHPZBqEhupDnJ3d4EzEJvuIxiIEY48og2NJPHDb0r4etzk/RF/wbq
UPDATE users
SET password = '$2a$10$sHPZBqEhupDnJ3d4EzEJvuIxiIEY48og2NJPHDb0r4etzk/RF/wbq'
WHERE email = 'mays.suhail@gmail.com';

-- Ensure ADMIN role
INSERT INTO user_roles (user_id, role)
SELECT id, 'ADMIN' FROM users WHERE email = 'mays.suhail@gmail.com'
ON CONFLICT DO NOTHING;

UPDATE user_roles SET role = 'ADMIN'
WHERE user_id = (SELECT id FROM users WHERE email = 'mays.suhail@gmail.com');
