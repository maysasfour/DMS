# Disaster Management System — Complete Deployment Guide

## Quick-start: get app running for testers TODAY

### Option A — Direct APK download (Android, no store needed)

```powershell
# 1. Build
cd C:\Users\HP\Downloads\GP1\disaster_management_app
flutter build apk --release --dart-define=API_BASE_URL=https://dms-maysas.duckdns.org

# 2. APK is at:
#    build\app\outputs\flutter-apk\app-release.apk

# 3. Upload to Google Drive, share link
# 4. Testers open link on Android → tap to install
#    (they need: Settings → Install unknown apps → allow)
```

### Option B — Firebase App Distribution (best for testers, free)

```bash
# One-time setup:
npm install -g firebase-tools
firebase login
firebase appdistribution:distribute build/app/outputs/flutter-apk/app-release.apk \
  --app YOUR_FIREBASE_APP_ID \
  --groups "testers" \
  --release-notes "DMS v1.0 — graduation project build"
```
Testers get an email with a direct install link — no sideloading needed.

---

## Architecture Overview

```
Internet
    │
    ▼
[Nginx :443]  ← SSL termination, rate limiting, CORS proxy
    │
    ├──► [Flutter Web :80]    (React-style SPA served by Nginx)
    │
    └──► [Spring Boot :9090]  ← REST API
              │
              └──► [PostgreSQL :5432]
```

---

## Part 1 — Local Development

### Start everything with one command

```powershell
cd C:\Users\HP\Downloads\GP1

# Start DB + backend + Flutter web
docker compose up -d

# Watch logs
docker compose logs -f backend
```

Services:
| Service | URL |
|---|---|
| Flutter Web | http://localhost:80 |
| Spring Boot API | http://localhost:9090 |
| PostgreSQL | localhost:5432 |

### Or start backend manually (without Docker)

```powershell
# Backend
cd C:\Users\HP\Downloads\GP1\DMS\backend
.\mvnw.cmd spring-boot:run

# Flutter (separate terminal)
cd C:\Users\HP\Downloads\GP1\disaster_management_app
flutter run -d chrome
```

---

## Part 2 — Android APK Build & Signing

### 2.1 Generate signing keystore (one-time)

```powershell
keytool -genkey -v `
  -keystore dms_release.keystore `
  -alias dms_key `
  -keyalg RSA -keysize 2048 `
  -validity 10000
```

Store the `.keystore` file safely. Add it to `.gitignore`.

### 2.2 Configure signing

Create `android/key.properties`:
```
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=dms_key
storeFile=../../dms_release.keystore
```

Add to `android/app/build.gradle` inside `android {}`:
```groovy
def keystoreProps = new Properties()
def keystoreFile = rootProject.file('key.properties')
if (keystoreFile.exists()) keystoreProps.load(new FileInputStream(keystoreFile))

signingConfigs {
    release {
        keyAlias     keystoreProps['keyAlias']
        keyPassword  keystoreProps['keyPassword']
        storeFile    keystoreProps['storeFile'] ? file(keystoreProps['storeFile']) : null
        storePassword keystoreProps['storePassword']
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        shrinkResources true
    }
}
```

### 2.3 Build release APK

```powershell
flutter build apk --release `
  --obfuscate `
  --split-debug-info=build/debug-info `
  --dart-define=API_BASE_URL=https://dms-maysas.duckdns.org
```

### 2.4 Build Play Store bundle

```powershell
flutter build appbundle --release `
  --dart-define=API_BASE_URL=https://dms-maysas.duckdns.org
```

---

## Part 3 — Docker Deployment (Production)

### 3.1 Backend Dockerfile

Create `DMS/backend/Dockerfile`:
```dockerfile
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app
COPY mvnw.cmd pom.xml ./
COPY .mvn .mvn
RUN ./mvnw.cmd dependency:go-offline -q
COPY src ./src
RUN ./mvnw.cmd package -DskipTests -q

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 9090
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### 3.2 Environment variables (.env file)

Create `C:\Users\HP\Downloads\GP1\.env` (never commit):
```env
DB_PASSWORD=strong_password_here
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
MAIL_USERNAME=your@gmail.com
MAIL_PASSWORD=your_app_password
FRONTEND_ORIGIN=https://dms-maysas.duckdns.org
API_BASE_URL=https://dms-maysas.duckdns.org
```

### 3.3 Start full production stack

```bash
docker compose --profile production up -d
```

---

## Part 4 — CI/CD (GitHub Actions)

The pipeline at `.github/workflows/ci.yml` automatically:

| Trigger | What runs |
|---|---|
| Any push / PR | Analyze + unit tests + security tests |
| Push to `main` | All tests + build APK + build AAB + build web + deploy to Firebase |

### Required GitHub Secrets

Go to: **GitHub repo → Settings → Secrets → Actions**

| Secret | Value |
|---|---|
| `KEYSTORE_BASE64` | `base64 -i dms_release.keystore` output |
| `KEY_ALIAS` | `dms_key` |
| `KEY_PASSWORD` | Your key password |
| `STORE_PASSWORD` | Your store password |
| `API_BASE_URL` | `https://dms-maysas.duckdns.org` |
| `FIREBASE_SERVICE_ACCOUNT` | JSON from Firebase console |
| `FIREBASE_PROJECT_ID` | Your Firebase project ID |

---

## Part 5 — Email Service Setup (Gmail)

1. Enable 2-Step Verification on your Google account
2. Go to: **Google Account → Security → App passwords**
3. Create an app password for "Mail"
4. Add to backend `application.yml` (or `.env`):

```yaml
spring:
  mail:
    host: smtp.gmail.com
    port: 587
    username: ${MAIL_USERNAME}
    password: ${MAIL_PASSWORD}
    properties:
      mail.smtp.auth: true
      mail.smtp.starttls.enable: true
```

For production volume, use **SendGrid** (free tier: 100 emails/day):
1. Sign up at sendgrid.com → create API key
2. Replace SMTP config with SendGrid credentials

---

## Part 6 — Cloud Deployment (AWS / Azure / Google Cloud)

### Cheapest path: Single VM (VPS)

1. Get a VPS: **DigitalOcean** $6/mo, **Hetzner** €4/mo, or **Oracle Cloud** (free tier)
2. Install Docker + Docker Compose on the VM
3. Copy project files via `scp` or `git pull`
4. Run `docker compose --profile production up -d`
5. Point your DuckDNS domain to the VM IP
6. Get SSL certificate: `certbot --nginx -d dms-maysas.duckdns.org`

### AWS (EC2 + RDS)

```
EC2 t3.micro (free tier)  ← Flutter web + Spring Boot
RDS PostgreSQL db.t3.micro (free tier)  ← Database
Route 53  ← DNS
ACM  ← SSL certificate
ALB  ← Load balancer + HTTPS termination
```

### Google Cloud Run (serverless, easiest)

```bash
# Build and push backend image
gcloud builds submit --tag gcr.io/PROJECT_ID/dms-backend ./DMS/backend

# Deploy
gcloud run deploy dms-backend \
  --image gcr.io/PROJECT_ID/dms-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## Part 7 — Security Checklist

- [ ] `JWT_SECRET` is at least 32 random characters — never the default
- [ ] HTTPS only — HTTP redirects to HTTPS (Nginx config handles this)
- [ ] `DB_PASSWORD` is strong and not `postgres`
- [ ] No hardcoded credentials in any source file
- [ ] `android:debuggable="false"` — automatic in release builds
- [ ] ProGuard / R8 enabled (`minifyEnabled true`)
- [ ] `--obfuscate` flag used in APK build
- [ ] Rate limiting configured in Nginx (100 req/min)
- [ ] CORS restricted to your domain only
- [ ] Input sanitization active (`InputSanitizer` in Flutter)
- [ ] JWT shape validated before attaching to requests

---

## Part 8 — Test Before Every Release

```powershell
# Run all tests
flutter test

# Run by category
flutter test test/unit/
flutter test test/security/
flutter test test/integration/

# Analyze code
flutter analyze

# Check for outdated packages
flutter pub outdated
```

### Working demo credentials (local DB)

| Role | Email | Password |
|---|---|---|
| Admin | admin@dms.com | Admin@1234 |
| Admin | ops@dms.com | Admin@1234 |
| Citizen | ahmed@example.com | Citizen@1234 |
| Citizen | sara@example.com | Citizen@1234 |

---

## Quick Command Reference

```powershell
# Local dev — Flutter on Chrome with local backend
flutter run -d chrome

# Local dev — Flutter with remote backend
flutter run -d chrome --dart-define=API_BASE_URL=https://dms-maysas.duckdns.org

# Build debug APK (fast, for testing)
flutter build apk --debug

# Build release APK (for distribution)
flutter build apk --release --dart-define=API_BASE_URL=https://dms-maysas.duckdns.org

# Build web
flutter build web --release --dart-define=API_BASE_URL=https://dms-maysas.duckdns.org

# Start backend
cd C:\Users\HP\Downloads\GP1\DMS\backend && .\mvnw.cmd spring-boot:run

# Docker full stack
cd C:\Users\HP\Downloads\GP1 && docker compose up -d

# Clean everything
flutter clean && flutter pub get
```
