# AGENTS.md

## Project Goal
- Build the backend for the Weather Analytics Dashboard.
- Use Java with Spring Boot.
- Use SQLite with Spring Data JPA and Hibernate for persistence.
- The backend owns the application API, persistence, analytics, and Open-Meteo integration.

## Architecture
- Keep controllers thin; business logic belongs in services.
- Keep database access in Spring Data repositories.
- Keep Open-Meteo calls in a dedicated integration/client layer.
- Use DTOs for API input/output; do not expose external API models directly.
- Validate requests at the API boundary.
- Centralize API error handling and keep error responses consistent.
- Keep domain, persistence, API, and external-integration responsibilities separated.

## Java Style
- Prefer clear, idiomatic modern Java.
- Prefer lambda expressions and method references for concise collection transformations, callbacks, and functional operations when they improve readability.
- Use streams where they make the code clearer; avoid forcing streams or lambdas into logic that is easier to read imperatively.
- Prefer immutable values and small, focused methods where practical.
- Keep names explicit and consistent with the domain model.
- Avoid unnecessary abstractions and unrelated refactors.

## Persistence
- Use JPA entities for persisted domain data.
- Use Spring Data repositories for database access.
- Keep persistence entities separate from API DTOs.
- Preserve Analysis Snapshot/Run immutability: existing analysis results must not change when a View is edited.
- Use controlled schema migrations for database changes.

## Build and Run
- Prefer the Maven Wrapper when available.
- Compile: `./mvnw clean compile`
- Run tests: `./mvnw test`
- Run application: `./mvnw spring-boot:run`
- Package: `./mvnw clean package`
- If the Maven Wrapper is unavailable, use the equivalent Maven command.

## Testing
- Add tests for new business rules and endpoint behavior.
- Prefer unit tests for service/business logic.
- Add integration tests for persistence and important API flows.
- Keep tests deterministic and isolated.
- Run the full test suite with `./mvnw test`.

## API and Project Rules
- Implement behavior defined by the project specification and API contract.
- Keep the backend independent from Open-Meteo's public API contract.
- Do not move frontend concerns into the backend domain layer.
- Externalize environment-specific configuration.
- Make minimal, focused changes and avoid unrelated refactors.
- Do not modify existing tests unless the intended behavior has changed.
- Commit working changes to Git regularly with focused commit messages.
