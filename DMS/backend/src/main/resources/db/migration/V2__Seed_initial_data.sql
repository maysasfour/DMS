-- V2__Seed_initial_data.sql
-- Seed auth users, admin, citizens, shelters, teams, resources

-- Auth users  Admin@1234 → $2a$10$sHPZBqEhupDnJ3d4EzEJvuIxiIEY48og2NJPHDb0r4etzk/RF/wbq
--             Citizen@1234 → $2a$10$gOogNm60h5CIVejhWPdONOncZySW1HRWzbK0BU6UM9q4Lj7skg6ri
INSERT INTO users (email, password, first_name, last_name, phone_number, active) VALUES
  ('admin@dms.com',    '$2a$10$sHPZBqEhupDnJ3d4EzEJvuIxiIEY48og2NJPHDb0r4etzk/RF/wbq', 'System',  'Admin',     '+966501234567', TRUE),
  ('ops@dms.com',      '$2a$10$sHPZBqEhupDnJ3d4EzEJvuIxiIEY48og2NJPHDb0r4etzk/RF/wbq', 'Ops',     'Chief',     '+966502345678', TRUE),
  ('ahmed@example.com','$2a$10$gOogNm60h5CIVejhWPdONOncZySW1HRWzbK0BU6UM9q4Lj7skg6ri','Ahmed',   'Al-Rashidi','+966511111111', TRUE),
  ('sara@example.com', '$2a$10$gOogNm60h5CIVejhWPdONOncZySW1HRWzbK0BU6UM9q4Lj7skg6ri','Sara',    'Al-Mutairi','+966522222222', TRUE),
  ('team1@dms.com',    '$2a$10$sHPZBqEhupDnJ3d4EzEJvuIxiIEY48og2NJPHDb0r4etzk/RF/wbq', 'Alpha',   'Team',      '+966511112222', TRUE);

INSERT INTO user_roles (user_id, role) VALUES
  (1, 'ADMIN'), (2, 'ADMIN'),
  (3, 'CITIZEN'), (4, 'CITIZEN'),
  (5, 'RESCUE_TEAM');

-- Admins (password: Admin@1234 → BCrypt)
INSERT INTO admins (name, email, password, phone, role, status) VALUES
  ('System Admin',     'admin@dms.com',    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lHHy', '+966501234567', 'SUPER_ADMIN', 'ACTIVE'),
  ('Operations Chief', 'ops@dms.com',      '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lHHy', '+966502345678', 'ADMIN',       'ACTIVE'),
  ('Alert Manager',    'alerts@dms.com',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lHHy', '+966503456789', 'ALERT_ADMIN', 'ACTIVE');

-- Citizens (password: Citizen@1234 → BCrypt)
INSERT INTO citizens (name, email, password, address, gender, blood_type, status) VALUES
  ('Ahmed Al-Rashidi', 'ahmed@example.com',  '$2a$10$5ICkekOjkIoaZHpvbWFBwOSZMfP6Dp7ERSXJRl9pAiIqmTdO2rxaq', 'Riyadh, KSA',    'MALE',   'O+', 'ACTIVE'),
  ('Sara Al-Mutairi',  'sara@example.com',   '$2a$10$5ICkekOjkIoaZHpvbWFBwOSZMfP6Dp7ERSXJRl9pAiIqmTdO2rxaq', 'Jeddah, KSA',    'FEMALE', 'A+', 'ACTIVE'),
  ('Khalid Hassan',    'khalid@example.com', '$2a$10$5ICkekOjkIoaZHpvbWFBwOSZMfP6Dp7ERSXJRl9pAiIqmTdO2rxaq', 'Dammam, KSA',    'MALE',   'B-', 'ACTIVE');

INSERT INTO citizen_phones (phone, citizen_id) VALUES
  ('+966511111111', 1),
  ('+966522222222', 2),
  ('+966533333333', 3);

-- Shelters
INSERT INTO shelters (name, address, gps_location, latitude, longitude, capacity, available_capacity, is_active, contact_number, amenities, status) VALUES
  ('King Fahd Stadium Shelter',  'Riyadh, King Fahd District',     '24.7136,46.6753', 24.7136, 46.6753, 500, 450, TRUE, '+96611111111', 'Food, Water, Medical', 'OPEN'),
  ('Jeddah Sports City Shelter', 'Jeddah, Al Hamra District',      '21.4858,39.1925', 21.4858, 39.1925, 300, 270, TRUE, '+96622222222', 'Food, Water, Beds',    'OPEN'),
  ('Dammam Expo Center Shelter', 'Dammam, Al-Faisaliyah District', '26.3927,49.9777', 26.3927, 49.9777, 400, 390, TRUE, '+96633333333', 'Food, Water, Wi-Fi',   'OPEN'),
  ('Madinah Community Center',   'Madinah, Al-Anbariyah',          '24.4672,39.6150', 24.4672, 39.6150, 200, 180, TRUE, '+96644444444', 'Food, Prayer Room',    'OPEN');

-- Rescue Teams
INSERT INTO rescue_teams (name, type, contact_number, email, capacity, latitude, longitude, location, is_active, available) VALUES
  ('Alpha Fire Brigade',     'FIRE',    '+96611112222', 'alpha@dms.com',   20, 24.7136, 46.6753, 'Riyadh HQ',    TRUE, TRUE),
  ('Beta Medical Response',  'MEDICAL', '+96611113333', 'beta@dms.com',    15, 21.4858, 39.1925, 'Jeddah HQ',    TRUE, TRUE),
  ('Gamma Search & Rescue',  'RESCUE',  '+96611114444', 'gamma@dms.com',   25, 26.3927, 49.9777, 'Dammam HQ',    TRUE, TRUE),
  ('Delta Hazmat Unit',      'HAZMAT',  '+96611115555', 'delta@dms.com',   10, 24.4672, 39.6150, 'Madinah HQ',   TRUE, TRUE),
  ('Epsilon Flood Response', 'FLOOD',   '+96611116666', 'epsilon@dms.com', 18, 24.6877, 46.7219, 'Riyadh South', TRUE, TRUE);

-- Sample incidents
INSERT INTO incidents (incident_type, title, description, gps_location, latitude, longitude, location, severity, status, reported_by, reported_at, assigned_team_id) VALUES
  ('FIRE',       'Building Fire - Al Olaya',        'Large fire reported in a commercial building',           '24.6877,46.7219', 24.6877, 46.7219, 'Al Olaya, Riyadh',   'HIGH',     'IN_PROGRESS', 1, NOW() - INTERVAL '2 hours',  1),
  ('FLOOD',      'Flash Flood - Jeddah Corniche',   'Heavy rain causing flash flooding along the corniche',  '21.5169,39.2192', 21.5169, 39.2192, 'Corniche, Jeddah',   'CRITICAL', 'REPORTED',    2, NOW() - INTERVAL '30 minutes', 2),
  ('ACCIDENT',   'Road Accident - Highway 40',      'Multi-vehicle collision on Highway 40',                 '24.7500,46.8000', 24.7500, 46.8000, 'Highway 40, Riyadh', 'MEDIUM',   'IN_PROGRESS', 1, NOW() - INTERVAL '1 hour',   2),
  ('EARTHQUAKE', 'Tremor Detected - Dammam Region', 'Magnitude 4.2 earthquake tremor felt in Dammam',       '26.4200,49.9800', 26.4200, 49.9800, 'Dammam',             'HIGH',     'REPORTED',    3, NOW() - INTERVAL '15 minutes', 3),
  ('MEDICAL',    'Mass Casualty - Sports Event',    'Multiple injuries at stadium during football match',    '24.7136,46.6753', 24.7136, 46.6753, 'King Fahd Stadium',  'CRITICAL', 'IN_PROGRESS', 2, NOW() - INTERVAL '45 minutes', 2);

-- Resources
INSERT INTO resource_assignments (resource_type, name, quantity, unit, location_name, latitude, longitude, status, incident_id, team_id, admin_id) VALUES
  ('AMBULANCE',  'Ambulance Unit 01', 3,    'vehicles', 'Riyadh HQ',    24.7136, 46.6753, 'ASSIGNED',  3,    2, 1),
  ('FIRE_TRUCK', 'Fire Engine 01',    2,    'vehicles', 'Riyadh HQ',    24.7136, 46.6753, 'ASSIGNED',  1,    1, 1),
  ('WATER',      'Water Supply',      5000, 'liters',   'Jeddah HQ',    21.4858, 39.1925, 'ASSIGNED',  2,    2, 1),
  ('MEDICAL',    'First Aid Kits',    50,   'kits',     'Dammam HQ',    26.3927, 49.9777, 'AVAILABLE', NULL, 3, 1),
  ('FOOD',       'Emergency Rations', 200,  'units',    'Madinah HQ',   24.4672, 39.6150, 'AVAILABLE', NULL, NULL, 2),
  ('EQUIPMENT',  'Search Equipment',  10,   'sets',     'Riyadh South', 24.6877, 46.7219, 'AVAILABLE', NULL, 5, 1);

-- Alerts
INSERT INTO alerts (title, message, channel, alert_type, severity, latitude, longitude, location, status, admin_id) VALUES
  ('Flash Flood Warning', 'Flash flood risk in Jeddah coastal areas. Avoid low-lying areas.', 'SMS',       'WEATHER',    'HIGH',   21.4858, 39.1925, 'Jeddah',     'ACTIVE', 1),
  ('Earthquake Alert',    'Seismic activity detected near Dammam. Stay alert.',               'PUSH',      'EARTHQUAKE', 'MEDIUM', 26.3927, 49.9777, 'Dammam',     'ACTIVE', 1),
  ('Fire Emergency',      'Active fire in Al Olaya district. Avoid the area.',                'BROADCAST', 'FIRE',       'HIGH',   24.6877, 46.7219, 'Riyadh',     'ACTIVE', 2),
  ('Road Closure Notice', 'Highway 40 closed due to accident. Use alternative routes.',       'SYSTEM',    'TRAFFIC',    'LOW',    24.7500, 46.8000, 'Highway 40', 'ACTIVE', 2);

-- Notifications
INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
  (1, 'New Incident Reported', 'A fire has been reported in Al Olaya district.',          'INCIDENT', FALSE),
  (1, 'Team Dispatched',       'Alpha Fire Brigade has been dispatched to the scene.',    'TEAM',     FALSE),
  (2, 'Flash Flood Warning',   'Flash flood warning issued for your area.',               'ALERT',    FALSE),
  (3, 'Shelter Available',     'King Fahd Stadium shelter is open and accepting people.', 'SHELTER',  TRUE);
