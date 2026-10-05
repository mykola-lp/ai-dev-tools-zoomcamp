# Ubuntu: the system default may be a newer JDK than Spring Boot 3.3 supports, so prefer JDK 25 when present.
ifneq ($(wildcard /usr/lib/jvm/java-25-openjdk-amd64),)
export JAVA_HOME := /usr/lib/jvm/java-25-openjdk-amd64
endif

.PHONY: dev backend frontend install build test \
        test-be test-fe \
		e2e e2e-install \
		integration integration-install \
        docker-build docker-run docker-stop \
		docker-ci-build docker-ci-run docker-ci-stop \
        docker-dev-build docker-dev-run docker-dev-stop \
        clean

dev: ## backend + frontend together (Ctrl+C stops both)
	$(MAKE) -j2 backend frontend

backend: ## Spring Boot on :8080
	cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

frontend: ## Vite on :5173 (proxies /api to :8080)
	cd frontend && npm run dev

install:
	cd frontend && npm ci

build:
	cd backend && ./mvnw -B clean package -DskipTests
	cd frontend && npm run build

test:
	cd backend && ./mvnw -B test
	cd frontend && npm test
	
test-be:
	cd backend && ./mvnw -B test

test-fe:
	cd frontend && npm test

e2e: ## full-stack browser tests (starts its own backend + frontend)
	cd e2e && npx playwright test

e2e-install: ## one-time: Playwright + Chromium
	cd e2e && npm install && npx playwright install chromium

integration: ## backend API integration tests (starts its own backend on :19080)
	cd integration-tests && npx vitest run

integration-install: ## one-time: install the integration test dependencies
	cd integration-tests && npm install

docker-dev-build:
	docker compose -f docker-compose.dev.yml build

docker-dev-run:
	docker compose -f docker-compose.dev.yml up

docker-dev-stop:
	docker compose -f docker-compose.dev.yml down

docker-ci-build:
	docker compose -f docker-compose.yml -f docker-compose.ci.yml build

docker-ci-run:
	docker compose -f docker-compose.yml -f docker-compose.ci.yml up -d

docker-ci-stop:
	docker compose -f docker-compose.yml -f docker-compose.ci.yml down -v

docker-build:
	docker compose build

docker-run:
	docker compose up

docker-stop:
	docker compose down

clean:
	cd backend && ./mvnw -B clean
	rm -rf frontend/.output frontend/dist