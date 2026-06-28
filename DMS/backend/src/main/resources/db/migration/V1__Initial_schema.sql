-- V1__Initial_schema.sql
-- Full DMS schema matching ERD and class diagram

-- ─── USERS (auth table — used by Spring Security for all roles) ───────────────
CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    first_name  VARCHAR(100) NOT NULL,
    last_name   VARCHAR(100) NOT NULL,
    phone_number VARCHAR(50),
    avatar_url  VARCHAR(500),
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_roles (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role    VARCHAR(50) NOT NULL,
    PRIMARY KEY (user_id, role)
);

-- ─── ADMIN ────────────────────────────────────────────────────────────────────
CREATE TABLE admins (
    admin_id    BIGSERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    phone       VARCHAR(50),
    role        VARCHAR(50)  NOT NULL DEFAULT 'ADMIN',
    status      VARCHAR(50)  NOT NULL DEFAULT 'ACTIVE',
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── CITIZEN ──────────────────────────────────────────────────────────────────
CREATE TABLE citizens (
    citizen_id       BIGSERIAL PRIMARY KEY,
    name             VARCHAR(150) NOT NULL,
    email            VARCHAR(255) NOT NULL UNIQUE,
    password         VARCHAR(255) NOT NULL,
    address          VARCHAR(500),
    date_of_birth    DATE,
    gender           VARCHAR(20),
    blood_type       VARCHAR(10),
    current_location VARCHAR(500),
    status           VARCHAR(50)  NOT NULL DEFAULT 'ACTIVE',
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE citizen_phones (
    phone      VARCHAR(50)  NOT NULL,
    citizen_id BIGINT       NOT NULL REFERENCES citizens(citizen_id) ON DELETE CASCADE,
    PRIMARY KEY (phone, citizen_id)
);

-- ─── SHELTER ──────────────────────────────────────────────────────────────────
CREATE TABLE shelters (
    shelter_id         BIGSERIAL PRIMARY KEY,
    name               VARCHAR(255) NOT NULL,
    address            VARCHAR(500),
    gps_location       VARCHAR(255),
    latitude           DOUBLE PRECISION,
    longitude          DOUBLE PRECISION,
    capacity           INTEGER NOT NULL DEFAULT 0,
    available_capacity INTEGER NOT NULL DEFAULT 0,
    is_active          BOOLEAN NOT NULL DEFAULT TRUE,
    contact_number     VARCHAR(50),
    amenities          TEXT,
    status             VARCHAR(50)  NOT NULL DEFAULT 'OPEN',
    offline_cache      JSONB,
    created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── RESCUE_TEAM ──────────────────────────────────────────────────────────────
CREATE TABLE rescue_teams (
    team_id        BIGSERIAL PRIMARY KEY,
    name           VARCHAR(255) NOT NULL,
    type           VARCHAR(100),
    contact_number VARCHAR(50),
    email          VARCHAR(255),
    capacity       INTEGER NOT NULL DEFAULT 0,
    latitude       DOUBLE PRECISION,
    longitude      DOUBLE PRECISION,
    location       VARCHAR(255),
    is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
    available      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── INCIDENT ─────────────────────────────────────────────────────────────────
CREATE TABLE incidents (
    incident_id          BIGSERIAL PRIMARY KEY,
    incident_type        VARCHAR(100) NOT NULL,
    title                VARCHAR(255),
    description          TEXT         NOT NULL,
    gps_location         VARCHAR(255),
    latitude             DOUBLE PRECISION,
    longitude            DOUBLE PRECISION,
    location             VARCHAR(255),
    severity             VARCHAR(50)  NOT NULL DEFAULT 'MEDIUM',
    status               VARCHAR(50)  NOT NULL DEFAULT 'REPORTED',
    reported_by          BIGINT REFERENCES citizens(citizen_id) ON DELETE SET NULL,
    reported_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_team_id     BIGINT REFERENCES rescue_teams(team_id) ON DELETE SET NULL,
    shelter_id           BIGINT REFERENCES shelters(shelter_id) ON DELETE SET NULL,
    resolved_local_date_time TIMESTAMP,
    updated_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── MEDIA (incident attachments) ─────────────────────────────────────────────
CREATE TABLE incident_media (
    media_id    BIGSERIAL PRIMARY KEY,
    incident_id BIGINT       NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
    file_name   VARCHAR(255) NOT NULL,
    file_type   VARCHAR(50)  NOT NULL,
    file_size   BIGINT       NOT NULL,
    url         VARCHAR(500) NOT NULL,
    images      TEXT,
    uploaded_by BIGINT REFERENCES citizens(citizen_id) ON DELETE SET NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── ALERT ────────────────────────────────────────────────────────────────────
CREATE TABLE alerts (
    alert_id   BIGSERIAL PRIMARY KEY,
    title      VARCHAR(255) NOT NULL,
    message    TEXT         NOT NULL,
    channel    VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
    alert_type VARCHAR(100) NOT NULL DEFAULT 'INFO',
    severity   VARCHAR(50)  NOT NULL DEFAULT 'LOW',
    latitude   DOUBLE PRECISION,
    longitude  DOUBLE PRECISION,
    location   VARCHAR(255),
    status     VARCHAR(50)  NOT NULL DEFAULT 'ACTIVE',
    expires_at TIMESTAMP,
    citizen_id BIGINT REFERENCES citizens(citizen_id) ON DELETE SET NULL,
    admin_id   BIGINT REFERENCES admins(admin_id) ON DELETE SET NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── RESOURCE_ASSIGNMENT ──────────────────────────────────────────────────────
CREATE TABLE resource_assignments (
    resource_id   BIGSERIAL PRIMARY KEY,
    resource_type VARCHAR(100) NOT NULL,
    name          VARCHAR(255) NOT NULL,
    quantity      INTEGER      NOT NULL DEFAULT 1,
    unit          VARCHAR(50),
    location_name VARCHAR(255),
    latitude      DOUBLE PRECISION,
    longitude     DOUBLE PRECISION,
    assigned_at   TIMESTAMP,
    status        VARCHAR(50)  NOT NULL DEFAULT 'AVAILABLE',
    notes         TEXT,
    incident_id   BIGINT REFERENCES incidents(incident_id) ON DELETE SET NULL,
    team_id       BIGINT REFERENCES rescue_teams(team_id) ON DELETE SET NULL,
    admin_id      BIGINT REFERENCES admins(admin_id) ON DELETE SET NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── LOCATION_SHARE ───────────────────────────────────────────────────────────
CREATE TABLE location_shares (
    location_share_id BIGSERIAL PRIMARY KEY,
    citizen_id        BIGINT NOT NULL REFERENCES citizens(citizen_id) ON DELETE CASCADE,
    team_id           BIGINT REFERENCES rescue_teams(team_id) ON DELETE SET NULL,
    gps_location      VARCHAR(255),
    latitude          DOUBLE PRECISION,
    longitude         DOUBLE PRECISION,
    accuracy          DOUBLE PRECISION,
    shared_with       VARCHAR(255),
    is_active         BOOLEAN   NOT NULL DEFAULT TRUE,
    shared_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at        TIMESTAMP
);

-- ─── EMERGENCY_MODE ───────────────────────────────────────────────────────────
CREATE TABLE emergency_modes (
    emergency_mode_id BIGSERIAL PRIMARY KEY,
    mode_type         VARCHAR(100) NOT NULL,
    reason            TEXT,
    is_active         BOOLEAN   NOT NULL DEFAULT FALSE,
    activated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deactivated_at    TIMESTAMP,
    notify_contacts   BOOLEAN   NOT NULL DEFAULT TRUE,
    offline_cache     JSONB,
    user_id           BIGINT REFERENCES citizens(citizen_id) ON DELETE SET NULL
);

-- ─── HISTORICAL_REPORT ────────────────────────────────────────────────────────
CREATE TABLE historical_reports (
    report_id       BIGSERIAL PRIMARY KEY,
    summary         TEXT         NOT NULL,
    start_date      DATE         NOT NULL,
    end_date        DATE         NOT NULL,
    generated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    file_link       VARCHAR(500),
    total_incidents INTEGER      NOT NULL DEFAULT 0,
    admin_id        BIGINT REFERENCES admins(admin_id) ON DELETE SET NULL
);

-- ─── AUDIT_LOG ────────────────────────────────────────────────────────────────
CREATE TABLE audit_logs (
    log_id      BIGSERIAL PRIMARY KEY,
    user_id     BIGINT,
    action      VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    entity_id   BIGINT,
    description TEXT,
    ip_address  VARCHAR(50),
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── NOTIFICATION ─────────────────────────────────────────────────────────────
CREATE TABLE notifications (
    notification_id BIGSERIAL PRIMARY KEY,
    user_id         BIGINT       NOT NULL,
    title           VARCHAR(255) NOT NULL,
    message         TEXT         NOT NULL,
    type            VARCHAR(100) NOT NULL DEFAULT 'INFO',
    is_read         BOOLEAN      NOT NULL DEFAULT FALSE,
    read_at         TIMESTAMP,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── MESSAGE ──────────────────────────────────────────────────────────────────
CREATE TABLE messages (
    message_id   BIGSERIAL PRIMARY KEY,
    incident_id  BIGINT       NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
    sender_id    BIGINT,
    message      TEXT         NOT NULL,
    message_type VARCHAR(100) NOT NULL DEFAULT 'TEXT',
    attachment   VARCHAR(500),
    is_read      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_incidents_status        ON incidents(status);
CREATE INDEX idx_incidents_type          ON incidents(incident_type);
CREATE INDEX idx_incidents_severity      ON incidents(severity);
CREATE INDEX idx_incidents_reported_by   ON incidents(reported_by);
CREATE INDEX idx_incidents_location      ON incidents(latitude, longitude);
CREATE INDEX idx_incidents_reported_at   ON incidents(reported_at);

CREATE INDEX idx_alerts_citizen          ON alerts(citizen_id);
CREATE INDEX idx_alerts_admin            ON alerts(admin_id);
CREATE INDEX idx_alerts_status           ON alerts(status);

CREATE INDEX idx_resource_incident       ON resource_assignments(incident_id);
CREATE INDEX idx_resource_team           ON resource_assignments(team_id);
CREATE INDEX idx_resource_status         ON resource_assignments(status);

CREATE INDEX idx_location_citizen        ON location_shares(citizen_id);
CREATE INDEX idx_location_active         ON location_shares(is_active);

CREATE INDEX idx_audit_user              ON audit_logs(user_id);
CREATE INDEX idx_audit_entity            ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created           ON audit_logs(created_at);

CREATE INDEX idx_notifications_user      ON notifications(user_id);
CREATE INDEX idx_notifications_read      ON notifications(is_read);
