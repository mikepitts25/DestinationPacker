# DestinationPacker — Setup Guide

Complete step-by-step instructions to get the app running from a fresh machine.

---

## Part 1: Backend Server Setup

### Step 1: System Prerequisites

**Ubuntu / Debian:**
```bash
sudo apt update
sudo apt install -y python3.12 python3.12-venv python3-pip git curl

# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# IMPORTANT: Log out and back in (or run `newgrp docker`) for the group change to take effect

# Ollama (self-hosted AI)
curl -fsSL https://ollama.com/install.sh | sh
```

**macOS:**
```bash
brew install python@3.12 git
brew install --cask docker    # Docker Desktop — open it after install
brew install ollama
```

**Windows (WSL2):**
```bash
# Inside WSL2 Ubuntu, follow the Ubuntu instructions above
# Install Docker Desktop for Windows and enable WSL2 integration
```

### Step 2: Clone the Repository

```bash
git clone https://github.com/mikepitts25/DestinationPacker.git
cd DestinationPacker
git checkout claude/travel-packing-app-plan-hctyv
```

### Step 3: Configure Environment Variables

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` in your editor and change **one thing**:

```bash
# Generate a secure secret key:
python3 -c "import secrets; print(secrets.token_urlsafe(64))"

# Paste the output as your SECRET_KEY value in .env
```

The `.env` file should look like this:
```
DATABASE_URL=postgresql+asyncpg://packer:packer_secret@localhost:5432/destinationpacker
REDIS_URL=redis://localhost:6379
SECRET_KEY=YOUR_GENERATED_SECRET_HERE

OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b

ENVIRONMENT=development
```

**Optional settings:**
- Change `OLLAMA_MODEL` to `mistral:7b` (faster, lighter) or `gemma2:9b`
- Add `ANTHROPIC_API_KEY=sk-ant-...` if you want Claude as an AI fallback

### Step 4: Start the Backend

```bash
cd backend
chmod +x start.sh
./start.sh --dev
```

**What this does automatically:**
1. Creates a Python virtual environment (`backend/.venv/`)
2. Installs all Python packages
3. Starts PostgreSQL and Valkey containers via Docker
4. Waits for the database to be ready
5. Detects Ollama and pulls your model (~4GB download, first time only)
6. Creates all database tables
7. Starts the API with hot-reload

**Wait until you see:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🧳 DestinationPacker API
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  API:      http://localhost:8000
  Docs:     http://localhost:8000/docs
  Health:   http://localhost:8000/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 5: Verify the Backend

Open a **new terminal** (leave the API running) and test:

```bash
# 1. Health check
curl http://localhost:8000/health
# Expected: {"status":"ok","version":"1.0.0"}

# 2. Register a user
curl -X POST http://localhost:8000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"mypassword123"}'
# Expected: JSON with "access_token" and "user" fields

# 3. Open interactive API docs in your browser
#    Visit: http://localhost:8000/docs
```

If all three work, your backend is ready.

---

## Part 2: Mobile App Setup

### Step 6: Install Node.js

```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc    # or restart your terminal
nvm install 20
nvm use 20

# Verify
node --version      # should show v20.x.x
npm --version       # should show 10.x.x
```

### Step 7: Install Mobile Dependencies

```bash
cd mobile
npm install
```

### Step 8: Configure the API URL

If you're running the backend on the **same machine**, the default works.

If the backend is on a **different machine** (remote server, etc.), edit `mobile/constants/config.ts`:

```typescript
const ENV = {
  development: {
    API_URL: 'http://YOUR_SERVER_IP:8000/api',  // <-- change this
  },
  ...
};
```

**If testing on a physical phone via Expo Go:** Use your computer's local network IP (e.g., `http://192.168.1.50:8000/api`), not `localhost`.

Find your local IP:
```bash
# macOS
ipconfig getifaddr en0

# Linux
hostname -I | awk '{print $1}'
```

### Step 9: Start the Mobile App

```bash
cd mobile
npx expo start
```

You'll see a QR code and options:
- Press **i** — iOS Simulator (macOS only, needs Xcode)
- Press **a** — Android Emulator (needs Android Studio)
- **Scan QR code** — with Expo Go app on your phone (easiest)

### Step 10: Install Expo Go on Your Phone

1. Download **Expo Go** from the App Store (iOS) or Play Store (Android)
2. Open Expo Go and scan the QR code from your terminal
3. The app loads on your phone

**Requirements:**
- Phone and computer must be on the **same Wi-Fi network**
- Backend must be running and accessible from your phone's network

---

## Part 3: Test the Full Flow

1. **Open the app** — you'll see the login screen
2. **Create an account** — enter an email and password, tap "Create Account"
3. **Tap the + button** to create a trip
4. **Walk through the wizard:**
   - Destination: e.g., "Tokyo, Japan"
   - Dates: pick a range in the future
   - Travel method: Flight
   - Accommodation: Hotel
   - Travelers: 1
5. **See your auto-generated packing list** — grouped by category with checkboxes
6. **Tap the Activities tab** — browse suggested activities from OpenStreetMap
7. **Select an activity** (e.g., hiking) — new gear items appear in your packing list
8. **Tap the Weather tab** — see the 7-day forecast
9. **Check off items** as you pack — progress bar updates

---

## Part 4: Daily Development Workflow

```bash
# Terminal 1 — Backend
cd DestinationPacker/backend
./start.sh --dev

# Terminal 2 — Mobile
cd DestinationPacker/mobile
npx expo start

# Run backend tests
cd DestinationPacker/backend
source .venv/bin/activate
pytest -v

# Run mobile tests
cd DestinationPacker/mobile
npm test

# Stop everything when done
cd DestinationPacker
docker compose down          # stops Postgres + Valkey + Ollama
# Ctrl+C in the API terminal
# Ctrl+C in the Expo terminal
```

---

## Part 5: Deploying to Production (When Ready)

### Backend Deployment

1. **Set production values in `.env`:**
   ```
   ENVIRONMENT=production
   SECRET_KEY=your-very-long-random-secret
   DATABASE_URL=postgresql+asyncpg://user:pass@your-db-host:5432/destinationpacker
   ```

2. **Set up HTTPS** — put nginx or Caddy in front of the API:
   ```nginx
   # /etc/nginx/sites-available/destinationpacker
   server {
       listen 443 ssl;
       server_name api.yourdomain.com;

       ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

3. **Run without `--dev`:**
   ```bash
   ./start.sh    # no hot-reload, production mode
   ```

   Or use Docker Compose for everything:
   ```bash
   docker compose up -d
   ```

### Mobile App Store Deployment

1. **Create an Expo account:** https://expo.dev/signup
2. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   eas login
   ```
3. **Configure builds:**
   ```bash
   cd mobile
   eas build:configure
   ```
4. **Build for app stores:**
   ```bash
   eas build --platform ios       # requires Apple Developer account ($99/yr)
   eas build --platform android   # requires Google Play Developer account ($25 one-time)
   ```
5. **Submit to stores:**
   ```bash
   eas submit --platform ios
   eas submit --platform android
   ```

### Monetization Setup (When Ready)

1. **AdMob:** Create an account at https://admob.google.com, create ad units, replace test IDs in `mobile/constants/config.ts`
2. **RevenueCat:** Create a project at https://www.revenuecat.com, configure your App Store / Play Store subscription products, add API keys to the mobile app

---

## Troubleshooting

### "Module not found: email_validator"
```bash
cd backend
source .venv/bin/activate
pip install pydantic[email]
```

### Docker permission denied
```bash
sudo usermod -aG docker $USER
newgrp docker    # or log out and back in
```

### Ollama model download is slow
The first `ollama pull` downloads ~4GB. If you want a smaller model:
```bash
# Edit backend/.env and change:
OLLAMA_MODEL=mistral:7b     # ~4GB, fast
# or
OLLAMA_MODEL=phi3:mini      # ~2GB, lightest
```

### Phone can't connect to API (Expo Go)
- Make sure phone and computer are on the same Wi-Fi
- Use your computer's LAN IP, not `localhost`
- Check that port 8000 isn't blocked by a firewall:
  ```bash
  sudo ufw allow 8000    # Ubuntu
  ```

### Database connection refused
```bash
# Make sure Docker containers are running:
docker compose ps

# If not running:
docker compose up -d db valkey
```

### Reset everything and start fresh
```bash
docker compose down -v           # removes all data volumes
rm -rf backend/.venv             # removes Python venv
cd backend && ./start.sh --dev   # rebuilds everything
```
