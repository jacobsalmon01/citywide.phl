# citywide.philly

A minimalist interactive map of Philadelphia bars that serve City Wides — the classic Philly shot + beer combo.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL in `supabase-seed.sql` in the Supabase SQL Editor — this creates the `bars` table and seeds it with 5 bars

### 3. Configure Google Maps

1. Get an API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the **Maps JavaScript API**
3. Create a Map ID in the Google Cloud Console under "Map Management" with the ID `citywide-philly-map` (or update `Map.jsx` with your own)

### 4. Set environment variables

Copy `.env` and fill in your keys:

```
VITE_GOOGLE_MAPS_API_KEY=your_key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 5. Run

```bash
npm run dev
```

## Adding new bars

Go to your Supabase dashboard → Table Editor → `bars` table → Insert Row.

Fields:
- **name**: Bar name
- **address**: Full street address
- **lat/lng**: Coordinates (use Google Maps to find these)
- **citywide_price**: e.g. "$5", "$6"
- **citywide_description**: What you get, the vibe
- **avg_rating**: 0–5 (manually maintained for now)
