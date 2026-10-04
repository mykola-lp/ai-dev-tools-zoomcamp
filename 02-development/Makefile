# Ubuntu: the system default may be a newer JDK than Spring Boot 3.3 supports, so prefer JDK 25 when present.
ifneq ($(wildcard /usr/lib/jvm/java-25-openjdk-amd64),)
export JAVA_HOME := /usr/lib/jvm/java-25-openjdk-amd64
endif

.PHONY: dev backend frontend install build test docker-build docker-run docker-stop clean

dev:            ## backend + frontend together (Ctrl+C stops both)
	$(MAKE) -j2 backend frontend

backend:        ## Spring Boot on :8080
	cd backend && ./mvnw spring-boot:run

frontend:       ## Vite on :5173 (proxies /api to :8080)
	cd frontend && npm run dev

install:
	cd frontend && npm ci

build:
	cd backend && ./mvnw -B clean package -DskipTests
	cd frontend && npm run build

test:
	cd backend && ./mvnw -B test
	cd frontend && npm test

docker-build:
	docker compose build

docker-run:
	docker compose up

docker-stop:
	docker compose down

clean:
	cd backend && ./mvnw -B clean
	rm -rf frontend/.output frontend/dist