# DestinationPacker - Travel Packing App Plan

## Context

Build a cross-platform mobile app that generates smart packing lists based on trip details (destination, weather, duration, activities, etc.), suggests things to do and see, and dynamically updates packing recommendations as users select activities. Monetized via ads (free tier) and a premium subscription.

---

## 1. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Mobile App** | React Native + Expo | Cross-platform iOS/Android, fast iteration, OTA updates |
| **Language** | TypeScript | Type safety across frontend and shared types |
| **Navigation** | React Navigation v7 | Industry standard for RN |
| **State** | Zustand + React Query | Lightweight state + server cache |
| **UI Kit** | React Native Paper (Material) | Polished components, theming, dark mode |
| **Backend** | Python FastAPI | Fast async API, great AI/ML integration |
| **Database** | PostgreSQL (via SQLAlchemy) | Relational data with JSON support for flexible packing rules |
| **Cache** | Redis | Session cache, rate limiting, weather data cache |
| **Auth** | Firebase Auth (client) + JWT verification (server) | Google/Apple sign-in out of the box, minimal backend auth code |
| **AI** | Claude API (Anthropic) | Premium smart suggestions; rule engine for free tier |
| **Ads** | Google AdMob (react-native-google-mobile-ads) | Industry standard mobile ads |
| **Payments** | RevenueCat | Abstracts Apple/Google subscription APIs |
| **Hosting** | Railway or Render (API) + Vercel (admin panel if needed) | Simple deployment, auto-scaling |

---

## 2. Architecture

```
React Native App (Expo)
  |
  |-- Firebase Auth (Google/Apple sign-in)
  |-- RevenueCat SDK (subscriptions)
  |-- AdMob SDK (ads for free tier)
  |
  v
FastAPI Backend (Python)
  |
  |-- /api/trips          (CRUD trips)
  |-- /api/packing-list   (generate/update packing lists)
  |-- /api/activities      (destination activities & suggestions)
  |-- /api/weather         (weather proxy + caching)
  |-- /api/collaborate     (sharing & collaboration)
  |-- /api/user            (profile, preferences, subscription status)
  |
  |-- Rule Engine (free tier packing logic)
  |-- Claude API client (premium AI suggestions)
  |-- Weather API client (OpenWeatherMap / WeatherAPI)
  |-- Places API client (Google Places API)
  |
  v
PostgreSQL + Redis
```

---

## 3. Data Model

### Users
```
users
  id              UUID PK
  firebase_uid    TEXT UNIQUE
  email           TEXT
  display_name    TEXT
  subscription    ENUM('free', 'premium') DEFAULT 'free'
  preferences     JSONB  -- default clothing sizes, always-pack items, etc.
  created_at      TIMESTAMP
```

### Trips
```
trips
  id              UUID PK
  user_id         UUID FK -> users
  destination     TEXT           -- "Tokyo, Japan"
  latitude        FLOAT
  longitude       FLOAT
  start_date      DATE
  end_date        DATE
  accommodation   ENUM('hotel', 'hostel', 'airbnb', 'camping', 'resort', 'cruise', 'friends_family')
  travel_method   ENUM('flight', 'road_trip', 'train', 'cruise', 'backpacking')
  travelers       INT DEFAULT 1
  notes           TEXT
  created_at      TIMESTAMP
```

### Activities (selected for a trip)
```
trip_activities
  id              UUID PK
  trip_id         UUID FK -> trips
  activity_name   TEXT           -- "Hiking Mount Fuji"
  activity_type   ENUM('outdoor', 'water', 'cultural', 'nightlife', 'dining', 'sports', 'beach', 'snow', 'business')
  source          TEXT           -- 'google_places' | 'ai_suggested' | 'user_added'
  external_id     TEXT           -- Google Places ID if applicable
  selected        BOOLEAN DEFAULT false
```

### Packing Lists
```
packing_items
  id              UUID PK
  trip_id         UUID FK -> trips
  category        TEXT           -- "Clothing", "Toiletries", "Electronics", "Documents", etc.
  item_name       TEXT
  quantity        INT DEFAULT 1
  packed          BOOLEAN DEFAULT false
  source          TEXT           -- 'rule_engine' | 'ai' | 'activity' | 'user_added'
  activity_id     UUID FK -> trip_activities (nullable, links item to an activity)
  essential       BOOLEAN DEFAULT false
```

### Packing Rule Templates (rule engine)
```
packing_rules
  id              UUID PK
  trigger_type    TEXT           -- 'weather', 'activity', 'accommodation', 'travel_method', 'destination_type', 'duration'
  trigger_value   TEXT           -- 'rain', 'hiking', 'camping', 'flight', 'beach', '7+'
  category        TEXT
  item_name       TEXT
  quantity_expr   TEXT           -- '1' or 'days/2' or 'days' (formula based on trip length)
  essential       BOOLEAN
```

### Shared Trips (collaboration - premium)
```
trip_shares
  id              UUID PK
  trip_id         UUID FK -> trips
  shared_with     UUID FK -> users
  permission      ENUM('view', 'edit')
  accepted        BOOLEAN DEFAULT false
```

---

## 4. Feature Breakdown

### Free Tier
- Create up to **3 saved trips**
- Rule-based packing list generation (destination weather + trip type + duration)
- Weather forecast for destination (via cached API)
- Browse suggested activities (up to 10 per trip)
- Check off packed items
- Basic categories: Clothing, Toiletries, Documents, Electronics, Misc
- **Banner ads** on list screens, **interstitial ads** when generating a new trip

### Premium Tier ($3.99/month or $29.99/year)
- **Ad-free** experience
- **Unlimited trips** (saved and historical)
- **AI-powered packing lists** via Claude API -- smarter, personalized suggestions considering cultural norms, local customs, specific venue dress codes
- **AI activity recommendations** -- personalized itinerary suggestions based on interests
- **Collaboration** -- share trips with travel companions, each person gets their own packing list linked to the same trip
- **Packing insights** -- "You always forget sunscreen" based on history
- **Export** packing list as PDF or share via messaging
- **Custom templates** -- save a packing list as a reusable template (e.g., "Beach Vacation", "Business Trip")

---

## 5. Screen Flow

```
1. Onboarding (3 screens)
   -> Sign up / Sign in (Google, Apple, Email)

2. Home (Trip Dashboard)
   -> List of upcoming/past trips
   -> "+ New Trip" FAB button
   -> [Ad banner at bottom - free tier]

3. New Trip Wizard (multi-step form)
   Step 1: Destination (autocomplete search)
   Step 2: Dates (calendar date range picker)
   Step 3: Travel Method (icon selector)
   Step 4: Accommodation (icon selector)
   Step 5: Travelers (counter)
   -> "Generate Packing List" CTA
   -> [Interstitial ad - free tier]

4. Trip Detail (tab view)
   Tab A: Packing List
     -> Grouped by category (expandable sections)
     -> Checkboxes for each item
     -> Add custom item button
     -> Item count badge per category
     -> [Ad banner - free tier]

   Tab B: Activities & Things to Do
     -> Suggested activities with photos
     -> Toggle to select/deselect
     -> When selected: "3 items added to your packing list" toast
     -> Filter by type (outdoor, cultural, dining, etc.)
     -> [Premium badge on AI-powered suggestions]

   Tab C: Weather
     -> 7-14 day forecast for destination
     -> Daily high/low, precipitation, conditions
     -> Weather-based packing tips

   Tab D: Trip Info
     -> Edit trip details
     -> Share trip (premium)
     -> Export packing list (premium)
     -> Delete trip

5. Profile / Settings
   -> Account info
   -> Subscription management (upgrade CTA for free users)
   -> Default preferences (clothing sizes, always-bring items)
   -> Notification settings
   -> Dark mode toggle

6. Premium Upsell Screen
   -> Feature comparison
   -> Subscription options
   -> Free trial CTA (7-day trial)
```

---

## 6. API Integrations

| API | Purpose | Free Tier? | Notes |
|-----|---------|------------|-------|
| **OpenWeatherMap** (One Call 3.0) | Weather forecasts | Yes (cached) | 1,000 calls/day free; cache aggressively |
| **Google Places API** | Destination autocomplete + activity suggestions | Yes (limited) | Places Autocomplete + Nearby Search |
| **Claude API** (Anthropic) | AI packing suggestions + activity recommendations | Premium only | Use Haiku for cost efficiency, Sonnet for premium quality |
| **Firebase Auth** | Authentication | Yes | Google/Apple sign-in |
| **RevenueCat** | Subscription management | N/A | Handles App Store + Play Store |
| **Google AdMob** | Ads | Free tier | Banner + interstitial |

### Claude API Usage (Premium)
- **Packing list generation**: Send trip context (destination, dates, weather, activities, accommodation) and get a tailored list with quantities and reasoning
- **Activity suggestions**: "What are the best things to do in [destination] in [month] for someone who likes [interests]?"
- **Packing updates**: When an activity is selected, ask Claude what additional items are needed
- Use `claude-haiku-4-5-20251001` for quick suggestions, `claude-sonnet-4-6` for detailed itinerary planning

---

## 7. Monetization Implementation

### Ads (Free Tier)
- **Banner ads**: Bottom of packing list screen and home screen (320x50 adaptive banners)
- **Interstitial ads**: Shown after generating a new packing list (frequency capped: max 1 per 5 minutes)
- **No ads** on the trip wizard itself (don't interrupt the input flow)
- Implement via `react-native-google-mobile-ads`

### Subscriptions (Premium)
- Use **RevenueCat** SDK for cross-platform subscription management
- Offerings: Monthly ($3.99) and Annual ($29.99 -- ~37% savings)
- **7-day free trial** for annual plan
- Premium status synced to backend via RevenueCat webhooks -> update `users.subscription`
- Backend validates subscription status on premium API endpoints

### Upsell Triggers
- When free user hits 3-trip limit -> show upsell
- When free user taps a premium activity suggestion -> show upsell
- When free user taps "Share Trip" -> show upsell
- Soft upsell banner on packing list: "Get smarter suggestions with Premium"

---

## 8. Additional Feature Suggestions

1. **"Don't Forget" Notifications** -- Push notification 24-48 hours before departure: "Your trip to Tokyo starts in 2 days! You have 5 unpacked items."
2. **Packing History & Insights** (Premium) -- Track what users actually pack across trips. "You've packed hiking boots on 4 trips but never used them on city trips."
3. **Destination Quick Facts** -- Currency, language, tipping customs, outlet type, visa requirements. Sourced from a static dataset + AI enhancement.
4. **Photo Packing Verification** -- Users can snap a photo of their suitcase; AI confirms items are visible (future feature).
5. **Community Templates** -- Users share their packing lists publicly; others can import them. Adds a social/discovery element.
6. **Offline Mode** -- Full offline access to saved trips and packing lists (critical for travelers without data).
7. **Multi-language Support** -- Start with English, Spanish, French, German, Japanese.
8. **Apple Watch / Wear OS Companion** -- Quick glance at packing checklist from wrist while packing.
9. **Luggage Weight Estimator** -- Assign estimated weights to items, get a total to stay under airline limits.

---

## 9. Implementation Phases

### Phase 1: MVP (Weeks 1-4)
**Goal**: Core packing list generation with rule engine, deployable to TestFlight/internal testing.

- **Week 1**: Project setup
  - Expo + React Native project scaffolding
  - FastAPI backend with PostgreSQL
  - Firebase Auth integration
  - Basic navigation structure
  - CI/CD pipeline (GitHub Actions)

- **Week 2**: Trip creation + rule engine
  - Trip wizard (destination, dates, travel method, accommodation)
  - Google Places autocomplete for destination
  - Weather API integration with caching
  - Rule engine: build packing rules database (100+ rules covering common scenarios)
  - Packing list generation endpoint

- **Week 3**: Packing list UI + activities
  - Packing list display with categories, checkboxes, quantities
  - Add/remove custom items
  - Activity suggestions from Google Places
  - Activity selection -> packing list updates (rule-based)

- **Week 4**: Polish + testing
  - Home screen with trip list
  - Basic profile/settings screen
  - End-to-end testing
  - Bug fixes and UX polish

### Phase 2: Monetization (Weeks 5-6)
- AdMob integration (banner + interstitial)
- RevenueCat subscription setup
- Premium gating logic (trip limits, AI features)
- Upsell screens and triggers
- App Store / Play Store submission prep

### Phase 3: AI & Premium Features (Weeks 7-9)
- Claude API integration for smart packing lists
- Claude-powered activity recommendations
- Trip sharing / collaboration
- Export packing list as PDF
- Custom packing templates
- Push notifications (departure reminders)

### Phase 4: Polish & Launch (Weeks 10-12)
- Offline mode (local SQLite cache)
- Onboarding flow
- App Store assets (screenshots, description, keywords)
- Performance optimization
- Analytics integration (Mixpanel or PostHog)
- Beta testing with real users
- **Public launch on App Store + Google Play**

### Post-Launch
- Packing insights and history analysis
- Community templates
- Luggage weight estimator
- Multi-language support
- Apple Watch companion

---

## 10. Project Structure

```
DestinationPacker/
├── mobile/                          # React Native (Expo) app
│   ├── app/                         # Expo Router screens
│   │   ├── (auth)/                  # Auth screens
│   │   ├── (tabs)/                  # Main tab navigator
│   │   │   ├── index.tsx            # Home / Trip Dashboard
│   │   │   ├── profile.tsx          # Profile & Settings
│   │   ├── trip/
│   │   │   ├── new.tsx              # Trip wizard
│   │   │   ├── [id]/
│   │   │   │   ├── index.tsx        # Trip detail (tab view)
│   │   │   │   ├── packing.tsx      # Packing list tab
│   │   │   │   ├── activities.tsx   # Activities tab
│   │   │   │   ├── weather.tsx      # Weather tab
│   │   ├── premium.tsx              # Upsell screen
│   ├── components/                  # Shared UI components
│   ├── hooks/                       # Custom hooks
│   ├── services/                    # API client, auth, ads, purchases
│   ├── stores/                      # Zustand stores
│   ├── types/                       # TypeScript types
│   ├── constants/                   # Theme, config
│   ├── app.json                     # Expo config
│   └── package.json
│
├── backend/                         # FastAPI backend
│   ├── app/
│   │   ├── main.py                  # FastAPI app entry
│   │   ├── config.py                # Settings / env vars
│   │   ├── models/                  # SQLAlchemy models
│   │   │   ├── user.py
│   │   │   ├── trip.py
│   │   │   ├── packing_item.py
│   │   │   ├── activity.py
│   │   │   └── packing_rule.py
│   │   ├── schemas/                 # Pydantic request/response schemas
│   │   ├── routers/                 # API route handlers
│   │   │   ├── trips.py
│   │   │   ├── packing.py
│   │   │   ├── activities.py
│   │   │   ├── weather.py
│   │   │   ├── users.py
│   │   │   └── collaborate.py
│   │   ├── services/                # Business logic
│   │   │   ├── rule_engine.py       # Packing rule evaluation
│   │   │   ├── ai_service.py        # Claude API integration
│   │   │   ├── weather_service.py   # Weather API client + cache
│   │   │   └── places_service.py    # Google Places client
│   │   ├── middleware/              # Auth, rate limiting, subscription check
│   │   └── db/                      # Database connection, migrations
│   ├── alembic/                     # DB migrations
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
│
├── shared/                          # Shared constants (packing categories, etc.)
├── .github/workflows/               # CI/CD
├── docker-compose.yml               # Local dev (API + Postgres + Redis)
└── README.md
```

---

## 11. Testing Strategy

| Layer | Tool | What to Test |
|-------|------|-------------|
| **Backend unit** | pytest | Rule engine logic, packing list generation, API schemas |
| **Backend integration** | pytest + httpx | API endpoints with test DB, auth flows |
| **Backend AI** | pytest + mocks | Claude API integration with mocked responses |
| **Mobile unit** | Jest | Zustand stores, utility functions, hooks |
| **Mobile component** | React Native Testing Library | Screen rendering, user interactions |
| **Mobile E2E** | Detox or Maestro | Full user flows: create trip -> generate list -> check items |
| **API contract** | OpenAPI schema validation | Ensure frontend/backend stay in sync |

---

## 12. Verification / How to Test

1. **Local dev**: `docker-compose up` starts Postgres + Redis + FastAPI backend. Expo dev server for mobile.
2. **Create a trip** through the wizard -> verify packing list is generated with appropriate items for the destination/weather/activity combo.
3. **Select an activity** (e.g., "snorkeling") -> verify related items (snorkel, reef-safe sunscreen, water shoes) appear in packing list.
4. **Check/uncheck items** -> verify state persists after app restart.
5. **Hit trip limit (3)** on free tier -> verify upsell screen appears.
6. **Subscribe** via RevenueCat sandbox -> verify ads disappear and AI features unlock.
7. **Run pytest** for backend: `cd backend && pytest -v`
8. **Run Jest** for mobile: `cd mobile && npm test`
