# Private configuration

Keep credentials in the ignored `DMS/.env` (or `.env.production` for deployment). Only empty `.env.example` templates belong in Git. Never put secrets in `VITE_*` variables: these become public browser code. Gemini uses `GEMINI_API_KEY` on the AI server only.

Docker Compose loads `.env` automatically. Production uses:

```sh
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

For a locally installed backend, run from `DMS/backend`:

```sh
python ../scripts/run-with-env.py mvn spring-boot:run
```

On Windows, `mvnw.cmd` can replace `mvn`. For the AI server, run from `DMS/ai-agent`:

```sh
npm ci
python ../scripts/run-with-env.py npm start
```

Use `npm.cmd` on Windows. The launcher parses values literally, including single-quoted BCrypt hashes, and does not execute environment-file contents. Explicit process variables take precedence.

## Database accounts

Fresh-database seed hashes come from the private `SEED_*_HASH` settings. Missing hashes disable password login for seeded accounts. Generate new random passwords and BCrypt hashes; never reuse passwords from historical documentation. Quote hashes with single quotes in `.env` to preserve `$` characters. Do not change seed values after initial migration without reviewing Flyway checksum effects.

Versioned password-reset migrations V8 and V9 are now no-ops. They will not reset existing accounts or grant administrator privileges during deployment. Existing databases retain their current passwords; rotate those separately through the authenticated account-management flow. Back up existing databases and review migration history before upgrading; do not blindly repair checksums. This change does not connect to or alter a live database.

Database, JWT and pgAdmin credentials are required; there are no password fallbacks. Database/admin development ports bind to localhost. `.dockerignore` files prevent private configuration entering container build contexts.

The AI service validates the application's bearer token with the backend before processing requests. Configure `BACKEND_URL` for standalone operation and `FRONTEND_ORIGIN` for allowed browser origins. Compose configures the internal backend address. Health checks expose only a minimal status.

Moving a previously exposed secret into `.env` does not revoke it. Rotate any keys or passwords previously shared, committed elsewhere, or used with the old demo credentials. The changes here address credential handling and upload safety; they are not a complete penetration test or a guarantee of application security.

SQL seed values use [Flyway placeholders](https://documentation.red-gate.com/fd/migration-placeholders-275218550.html), supplied through Spring Boot's environment configuration.
