# DriveSense — Global Driving Training PWA

A mobile-first Progressive Web App that helps learner drivers practice on real-world routes from any country. Built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, and **Zustand**.

---

## ✨ Features

- 🌍 **Global Route Library** — Nigeria, UK, USA, Ghana, Kenya, South Africa, Australia, Germany
- 🚗 **Live Training Session** — animated road view, speedometer, lane/position indicators, navigation instructions
- 📊 **Progress Tracking** — session history, scores, completion rates, all persisted to localStorage
- 🗺️ **Route Scenarios** — filter by difficulty (Beginner/Intermediate/Advanced) and road type
- 📱 **Mobile-First PWA** — installable on iOS/Android, offline-capable
- ⚡ **Performance-first** — Zustand for state (no React Context overhead), Next.js App Router, font optimization

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Open on mobile
# Navigate to http://localhost:3000
# On iPhone: Share → Add to Home Screen
# On Android: Menu → Add to Home Screen
```

---

## 📁 Project Structure

```
drivesense/
├── app/
│   ├── layout.tsx          # Root layout — fonts, PWA meta, viewport
│   ├── page.tsx            # App shell — tab router, session guard
│   └── globals.css         # Tailwind base + custom animations/utilities
│
├── components/
│   ├── navigation/
│   │   ├── Sidebar.tsx     # Desktop sidebar nav (hidden mobile)
│   │   └── BottomNav.tsx   # Mobile bottom tab bar
│   │
│   ├── dashboard/
│   │   ├── DashboardView.tsx   # Home screen with stats + CTA
│   │   └── ProgressView.tsx    # Session history + completion charts
│   │
│   └── training/
│       ├── TrainView.tsx        # Country → State → Route selection flow
│       ├── ActiveSession.tsx    # Full-screen driving UI (road, speedometer, HUD)
│       ├── Speedometer.tsx      # SVG speedometer component
│       └── ScenariosView.tsx    # Browse + filter all routes
│
├── hooks/
│   └── useTrainingSimulation.ts # Simulates driving dynamics (speed, lane, position)
│
├── lib/
│   ├── world-data.ts   # All countries, states, routes — add more here!
│   ├── store.ts        # Zustand global state + localStorage persistence
│   └── utils.ts        # formatTime, formatSpeed, scoreToGrade, etc.
│
└── public/
    └── manifest.json   # PWA manifest
```

---

## 🌍 Adding New Countries / Routes

Everything lives in `lib/world-data.ts`. The structure is:

```typescript
Country → State[] → Route[]
```

**Add a route:**
```typescript
{
  id: 'ng-la-myroad',       // unique: country-state-routename
  name: 'My New Road',
  description: 'Description here',
  difficulty: 'beginner',   // 'beginner' | 'intermediate' | 'advanced'
  type: 'urban',            // 'urban' | 'highway' | 'rural' | 'roundabout' | 'motorway'
  speedLimit: 60,           // km/h or mph depending on country
  durationMin: 20,
  distanceKm: 15,
  landmarks: ['Landmark A', 'Landmark B'],
  coordinates: { lat: 6.43, lng: 3.42 }, // start point
  mapZoom: 13,
  trafficSide: 'right',     // 'left' | 'right'
}
```

---

## 🗺️ Integrating Real Maps (Production)

The road view and mini-map currently use animated SVG placeholders. To add real maps:

1. **Install MapLibre GL:**
   ```bash
   npm install maplibre-gl react-map-gl
   ```

2. **Use a free tile provider:**
   - OpenStreetMap: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
   - MapTiler (free tier): `https://api.maptiler.com/maps/streets/...`
   - Stadia Maps: free for low volume

3. **Replace `MapPlaceholder` in `TrainView.tsx`:**
   ```tsx
   import Map from 'react-map-gl/maplibre';
   
   <Map
     initialViewState={{ longitude: route.coordinates.lng, latitude: route.coordinates.lat, zoom: route.mapZoom }}
     mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
     style={{ width: '100%', height: '100%' }}
   />
   ```

---

## 📡 Integrating Real GPS (Production)

Replace the simulation hook `hooks/useTrainingSimulation.ts` with real Geolocation:

```typescript
// hooks/useGPSTracking.ts
navigator.geolocation.watchPosition(
  (pos) => {
    store.updateSpeed(pos.coords.speed ? pos.coords.speed * 3.6 : 0); // m/s → km/h
    // Compare pos.coords with route geometry for lane/position
  },
  (err) => console.error(err),
  { enableHighAccuracy: true, maximumAge: 1000 }
);
```

---

## 🔧 Environment Variables

Create `.env.local` for any API keys:
```
NEXT_PUBLIC_MAPTILER_KEY=your_key_here
NEXT_PUBLIC_MAPBOX_TOKEN=your_token_here   # if using Mapbox
```

---

## 📱 PWA Installation

### iOS (Safari)
1. Open `localhost:3000` (or your deployed URL)
2. Tap Share button → "Add to Home Screen"
3. Opens full-screen with no browser chrome

### Android (Chrome)
1. Open the URL in Chrome
2. Tap the ⋮ menu → "Add to Home Screen" or "Install App"

---

## 🚀 Deployment

```bash
# Build for production
npm run build

# Deploy to Vercel (recommended)
npx vercel --prod

# Or any Node.js server
npm start
```

**Vercel** is recommended — zero-config Next.js deployment with automatic HTTPS (required for PWA + Geolocation).

---

## 📈 Scaling for Many Users

Current architecture is fully client-side (localStorage). To scale to thousands of users:

1. **Backend:** Add a Next.js API route (`app/api/progress/route.ts`) + PostgreSQL (Vercel Postgres / Supabase)
2. **Auth:** Add NextAuth.js for user accounts
3. **Sync:** Swap localStorage persistence in Zustand for API calls
4. **CDN:** Static assets (maps, route thumbnails) on Cloudflare R2
5. **Analytics:** Vercel Analytics or PostHog for session tracking

The state management (Zustand) and data layer (`lib/world-data.ts`) are already designed to support this transition with minimal refactoring.
