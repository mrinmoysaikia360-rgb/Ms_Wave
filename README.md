# Ms Wave

**Created by Mrinmoy Saikia.**

Ms Wave is a high-performance **multi-source AI & metasearch engine**. It queries multiple legitimate search, knowledge, scholarly, media, news, and geographical data providers in parallel, normalizes the data, removes duplicates, performs transparent relevance ranking, and synthesizes structured AI answers.

---

## Key Features

- **Multi-Source Parallel Metasearch**: Concurrently queries verified search endpoints including Wikipedia, OpenAlex, arXiv, Crossref, DuckDuckGo Open Answers, Wikimedia Commons, OpenStreetMap / Nominatim, Global News RSS Feeds, iTunes Music, Internet Archive, and SearXNG.
- **Intelligent Deduplication**: Normalizes canonical URLs (strips tracking tokens `utm_*`, `fbclid`, `gclid`, etc.), detects high title similarity across domains, and merges corroborating findings.
- **Transparent Relevance Ranking**: Multi-factor scoring engine considering exact query matches, term occurrences in titles & descriptions, corroborating sources agreement, freshness, and metadata quality.
- **Categorized Search**:
  - **All**: General web, AI Overview, instant knowledge facts, and top hits.
  - **Images**: High-resolution image search with lightbox view, licenses, and dimensions via Wikimedia Commons & Open Media.
  - **Videos**: Public domain and educational videos with embed playback via Internet Archive, Wikimedia, and YouTube Data API.
  - **News**: Live global news feed with real-time timestamps and source badges.
  - **Science**: Scholarly publications, peer-reviewed articles, citations count, DOIs, and direct Open Access PDF links from OpenAlex, arXiv, and Crossref.
  - **Music**: Track metadata, artist profiles, high-res album covers, and interactive 30-second audio previews.
  - **Maps**: OpenStreetMap geocoded locations, coordinates, address breakdowns, and interactive map embeds.
- **AI Overview & Synthesis**: Synthesizes verified multi-source facts into a concise summary with key takeaways and cited sources.
- **Secure Authentication**: Server-side credential verification, HTTP-only session cookies, HMAC session signing, and protected search routes.
- **Provider Status & Diagnostics**: Real-time telemetry reporting sources queried, successful hits, failed providers, latency, and duplicates removed.
- **Responsive & Installable PWA**: Adapts across mobile devices (375px+), tablets, and desktop displays with PWA manifest support.

---

## Architecture

```text
User Query
     ↓
Authentication Check (HTTP-Only Session Cookie)
     ↓
Ms Wave Search Pipeline
     ↓
Parallel Provider Dispatch (with Timeout & Auto-Recovery)
  ├── Wikipedia API
  ├── Wikimedia Commons API
  ├── OpenAlex Scholarly API
  ├── arXiv XML API
  ├── Crossref Academic API
  ├── DuckDuckGo Open Endpoint
  ├── Global News RSS Aggregator
  ├── OpenStreetMap / Nominatim
  ├── iTunes Music API
  ├── Internet Archive API
  └── SearXNG Metasearch (if configured)
     ↓
Collect Raw Results & Metrics
     ↓
URL Normalization & Multi-Source Deduplication
     ↓
Transparent Relevance Ranking
     ↓
AI Overview Fact Synthesis
     ↓
Normalized Response Payload to Ms Wave UI
```

---

## Environment Variables

Copy `.env.example` to `.env` to configure your environment:

```env
# Authentication
MS_WAVE_USER=Mrinmoy Saikia
MS_WAVE_PASSWORD=2229
MS_WAVE_PASSWORD_HASH=
SESSION_SECRET=your_secure_session_secret_key

# Optional Metasearch & External APIs
SEARXNG_URL=
BRAVE_API_KEY=
YOUTUBE_API_KEY=
OPENALEX_EMAIL=contact@mswave.search
GEMINI_API_KEY=
```

---

## Running Locally

### Prerequisites
- Node.js 20+
- npm

### Installation & Development
```bash
# Install dependencies
npm install

# Run full-stack dev server (Express + Vite)
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build & Execution
```bash
# Build frontend and compile backend bundle
npm run build

# Start production server
npm start
```

---

## Docker Setup

Run Ms Wave and an optional SearXNG instance using Docker Compose:

```bash
docker-compose up -d --build
```

Access the application at `http://localhost:3000`.

---

## Authentication Credentials

- **User ID**: `Mrinmoy Saikia`
- **Default Password**: `2229` (stored and verified securely server-side)

---

## License & Credits

Developed and designed by **Mrinmoy Saikia**.
All data retrieved from official public APIs and open data sources.
