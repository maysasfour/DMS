-- V9__Fix_admin_password.sql
-- Sets admin@dms.com password to Admin@1234 (bcrypt)
UPDATE users SET password = '$2a$10$sHPZBqEhupDnJ3d4EzEJvuIxiIEY48og2NJPHDb0r4etzk/RF/wbq' WHERE email = 'admin@dms.com';
UPDATE users SET password = '$2a$10$sHPZBqEhupDnJ3d4EzEJvuIxiIEY48og2NJPHDb0r4etzk/RF/wbq' WHERE email = 'ops@dms.com';
