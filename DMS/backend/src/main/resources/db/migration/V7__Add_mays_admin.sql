-- V7__Add_mays_admin.sql
-- Adds Mays personal admin account.

INSERT INTO users (email, password, first_name, last_name, phone_number, active)
VALUES (
  'mays@dms.com',
  '$2b$10$qz24VXcB/O8cEGoCDTXqJutKuroYZ6RAgn2.9RXntEasqkNWjD5Zy',
  'Mays',
  'Admin',
  '+966500000000',
  TRUE
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role)
SELECT id, 'ADMIN' FROM users WHERE email = 'mays@dms.com'
ON CONFLICT DO NOTHING;
