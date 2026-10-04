CREATE TABLE users (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL
);

-- Only a SHA-256 hash of each bearer token is stored (id = token hash).
CREATE TABLE auth_tokens (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

CREATE INDEX idx_auth_tokens_user ON auth_tokens (user_id);

CREATE TABLE cities (
    id      TEXT PRIMARY KEY,
    name    TEXT NOT NULL,
    country TEXT NOT NULL,
    lat     REAL NOT NULL,
    lon     REAL NOT NULL,
    on_map  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE saved_cities (
    id       TEXT PRIMARY KEY,
    user_id  TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    city_id  TEXT NOT NULL REFERENCES cities (id),
    position INTEGER NOT NULL,
    UNIQUE (user_id, city_id)
);

CREATE TABLE views (
    id            TEXT PRIMARY KEY,
    owner_id      TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    visibility    TEXT NOT NULL,
    city_ids      TEXT NOT NULL,
    period        TEXT NOT NULL,
    metrics       TEXT NOT NULL,
    chart_type    TEXT NOT NULL,
    show_table    BOOLEAN NOT NULL,
    show_insights BOOLEAN NOT NULL,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE INDEX idx_views_owner_updated ON views (owner_id, updated_at);

-- Immutable snapshots. Deliberately NO foreign key to views: editing or deleting a view
-- must never touch (or cascade into) previously stored runs.
CREATE TABLE analysis_runs (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at   TEXT NOT NULL,
    config_json  TEXT NOT NULL,
    cities_json  TEXT NOT NULL,
    data_version TEXT NOT NULL,
    result_json  TEXT NOT NULL
);

CREATE INDEX idx_runs_user_created ON analysis_runs (user_id, created_at);

CREATE TABLE current_weather (
    id                   TEXT PRIMARY KEY REFERENCES cities (id),
    observed_at          TEXT NOT NULL,
    fetched_at           TEXT NOT NULL,
    temperature          REAL NOT NULL,
    apparent_temperature REAL NOT NULL,
    precipitation        REAL NOT NULL,
    wind_speed           REAL NOT NULL,
    humidity             REAL NOT NULL,
    pressure             REAL NOT NULL,
    snowfall             REAL NOT NULL,
    weather_code         INTEGER NOT NULL
);

CREATE TABLE daily_weather (
    id                   TEXT PRIMARY KEY,
    category             TEXT NOT NULL,
    city_id              TEXT NOT NULL REFERENCES cities (id),
    day                  TEXT NOT NULL,
    fetched_at           TEXT NOT NULL,
    temperature          REAL NOT NULL,
    apparent_temperature REAL NOT NULL,
    precipitation        REAL NOT NULL,
    wind_speed           REAL NOT NULL,
    humidity             REAL NOT NULL,
    pressure             REAL NOT NULL,
    snowfall             REAL NOT NULL,
    weather_code         INTEGER NOT NULL,
    UNIQUE (category, city_id, day)
);

-- id = data category (current | forecast | historical); version increments on every upstream store.
CREATE TABLE data_freshness (
    id           TEXT PRIMARY KEY,
    last_updated TEXT NOT NULL,
    version      INTEGER NOT NULL
);
