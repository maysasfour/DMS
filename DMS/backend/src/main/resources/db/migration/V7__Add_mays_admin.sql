-- V7__Add_mays_admin.sql
-- Optional private administrator seed, configured through the environment.

INSERT INTO users (email, password, first_name, last_name, phone_number, active)
VALUES (
  '${SEED_PERSONAL_ADMIN_EMAIL}',
  '${SEED_PERSONAL_ADMIN_HASH}',
  'Mays',
  'Admin',
  '+966500000000',
  TRUE
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role)
SELECT id, 'ADMIN' FROM users WHERE email = '${SEED_PERSONAL_ADMIN_EMAIL}'
ON CONFLICT DO NOTHING;
