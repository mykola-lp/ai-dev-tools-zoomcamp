# Weather Analytics Dashboard – backend

Spring Boot 3.3 / Java 21 backend implementing `openapi.yaml` (mounted under `/api`).
SQLite + Spring Data JPA/Hibernate, Flyway migrations, Open-Meteo as the upstream weather source.

## Run / test

```
./mvnw clean compile
./mvnw test
./mvnw spring-boot:run          # http://localhost:8080/api, DB file ./weather.db
```
`./mvnw` is a minimal wrapper that downloads Maven 3.9.9 on first use (a plain `mvn` works too).

Configuration (env vars): `PORT`, `DB_PATH`, `SEED_ENABLED`, `DEMO_PASSWORD`, `COOKIE_SECURE`, `OPEN_METEO_BASE_URL`;
everything else is in `application.properties` under `app.*`.

Seed data (first start): 41 cities (Flyway `V2`), synthetic cached weather for all of them (replaced by real data by
the scheduled refresh), and a demo account `demo@example.com` / `demo1234` with saved cities, 3 views and 2 runs.
Set `SEED_ENABLED=false` to disable (the demo password is public – do not seed in production).

## Layers (`com.weatheranalytics`)

| package | role |
|---|---|
| `api.controller` / `api.dto` / `api.error` / `api.mapper` | thin controllers, contract DTOs, single `ApiError` shape, entity→DTO mapping |
| `service`, `service.analytics` | business logic; `AnalyticsEngine` is pure (aggregates, anomalies, trends, insights) |
| `repository`, `entity` | Spring Data repositories, JPA entities (+ attribute converters) |
| `security` | BCrypt, opaque bearer tokens (SHA-256 hashed at rest), filter, JSON 401/403 |
| `integration`, `integration.openmeteo` | `WeatherProvider` interface; Open-Meteo client + its own wire models |
| `seed` | demo data |

## Behaviour notes

* **Auth.** `register`/`login` return the contract's `User` plus a `token` field and set an HttpOnly `SESSION` cookie.
  Protected endpoints accept `Authorization: Bearer <token>` **or** the cookie.
  *Deviation:* the contract only describes a cookie session; the bearer token (requested) is an additive extension.
* **Visibility.** `GET /views/{id}`: public → anyone; private → owner only, otherwise 404. `PATCH/DELETE`: owner only;
  non-owner gets 403 for a public view and 404 for a private one. Invalid city ids in view bodies → 400; in
  analytics/weather → 404 (as in the contract).
* **Immutable runs.** `analysis_runs` has no FK to views; the row stores config, cities, data version and result JSON.
  The entity is `@Immutable` with no setters and its repository exposes only insert/read.
* **Weather cache.** Reads are served from SQLite and only fill missing cities from upstream (502 `UPSTREAM` if that
  fails). `POST /weather/refresh/{category}` refreshes all cities unless the category is younger than
  `app.weather.min-age.*` (`fetchedFromSource=false`). A scheduler does the same periodically.
  Historical series end yesterday, forecasts start tomorrow (UTC days).
* `GET /auth/session` returns JSON `null` when anonymous.

## Verification status

The code was written in an environment **without Maven Central access**, so `./mvnw test` has **not been run**;
only javac syntax-level checks were possible. Expect to fix small compile/runtime issues on first build.
Points worth checking first: Open-Meteo daily `*_mean` variable names (`wind_speed_10m_mean`,
`relative_humidity_2m_mean`, `surface_pressure_mean`), Flyway + SQLite on the Boot-managed Flyway version,
and Hibernate's SQLite dialect with the `@Convert`ed list columns.
