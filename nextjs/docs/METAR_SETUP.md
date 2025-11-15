# METAR Service Setup Guide

This document explains how to set up the METAR weather data service for the SaLKo website.

## Overview

The METAR service fetches weather data from the NOAA Aviation Weather Center API and stores it in PostgreSQL. The data is then served to the frontend via Next.js server actions.

## Architecture

```
Aviation Weather API → Background Service → PostgreSQL → Server Action → Client Component
```

### Components

1. **Database Schema** (`db/schema/metar.sql`)
   - Stores raw and parsed METAR data
   - Includes indexes for performance
   - View for latest METAR

2. **METAR Parser** (`utilities/metarParser.ts`)
   - Parses raw METAR strings
   - Extracts temperature, wind, visibility, clouds, QNH
   - Handles edge cases (calm wind, variable wind, etc.)

3. **METAR Service** (`services/metarService.ts`)
   - Fetches data from Aviation Weather API
   - Stores data in PostgreSQL
   - Retrieves latest data from database

4. **Server Actions** (`utilities/metarActions.ts`)
   - Provides `getLatestMETAR()` for client components
   - Handles errors gracefully

5. **Update Scripts**
   - `scripts/updateMETAR.ts` - CLI script for cron
   - `app/api/cron/metar/route.ts` - API route for external cron services

## Setup Instructions

### 1. Database Setup

Run the migration to create the METAR table:

```bash
npm run db:migrate-metar
```

Or manually:

```bash
psql $DATABASE_CONNECTION_STRING -f db/schema/metar.sql
```

### 2. Initial Data Population

Fetch the first METAR data:

```bash
npm run update-metar
```

### 3. Set Up Automated Updates

Choose one of the following methods:

#### Option A: System Cron (Linux/Mac)

Edit your crontab:

```bash
crontab -e
```

Add this line to update every 15 minutes:

```cron
*/15 * * * * cd /path/to/SaLKo_website/nextjs && npm run update-metar >> /var/log/metar-update.log 2>&1
```

#### Option B: Vercel Cron (Recommended for Vercel deployment)

Create `vercel.json` in the project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/metar",
      "schedule": "0,15,30,45 * * * *"
    }
  ]
}
```

Set the `CRON_SECRET` environment variable in Vercel:

```bash
vercel env add CRON_SECRET
```

#### Option C: External Cron Service (e.g., cron-job.org)

1. Go to https://cron-job.org or similar service
2. Create a new cron job pointing to: `https://your-domain.com/api/cron/metar`
3. Set schedule to every 15 minutes
4. Add Authorization header: `Bearer YOUR_CRON_SECRET`

### 4. Environment Variables

Add to your `.env` file:

```env
DATABASE_CONNECTION_STRING=postgresql://user:password@host:port/database
CRON_SECRET=your-secret-key-here  # Optional, for API route security
```

## Usage

### Frontend Component

The WeatherWidget component automatically fetches data from the database:

```tsx
import WeatherWidget from "@/components/weatherWidget";

export default function Page() {
  return <WeatherWidget />;
}
```

### Manual Trigger

To manually update METAR data:

```bash
npm run update-metar
```

Or via API:

```bash
curl -X POST https://your-domain.com/api/cron/metar \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Database Schema

```sql
CREATE TABLE metar_data (
    id SERIAL PRIMARY KEY,
    station_code VARCHAR(4) NOT NULL DEFAULT 'EFSA',
    raw_metar TEXT NOT NULL,
    temperature VARCHAR(10),
    wind_speed VARCHAR(20),
    wind_direction VARCHAR(10),
    visibility VARCHAR(20),
    clouds VARCHAR(50),
    qnh VARCHAR(20),
    observation_time TIMESTAMP,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_observation UNIQUE (station_code, observation_time)
);
```

## Data Retention

- Old METAR data (>7 days) is automatically cleaned up
- Cleanup runs once daily at midnight
- Configurable in `updateMETAR.ts`

## Monitoring

Check logs to monitor METAR updates:

```bash
# System cron
tail -f /var/log/metar-update.log

# Vercel
vercel logs --follow

# Database
psql $DATABASE_CONNECTION_STRING -c "SELECT * FROM metar_data ORDER BY fetched_at DESC LIMIT 5;"
```

## Troubleshooting

### No data showing

1. Check database connection:
   ```bash
   psql $DATABASE_CONNECTION_STRING -c "SELECT COUNT(*) FROM metar_data;"
   ```

2. Manually fetch data:
   ```bash
   npm run update-metar
   ```

3. Check API logs for errors

### Stale data

- Verify cron job is running
- Check last update time in database:
  ```sql
  SELECT fetched_at FROM metar_data ORDER BY fetched_at DESC LIMIT 1;
  ```

### API errors

- Aviation Weather Center API might be down
- Check network connectivity
- Verify station code (EFSA) is correct

## API Reference

### Server Action

```typescript
import { getLatestMETAR } from "@/utilities/metarActions";

const response = await getLatestMETAR();
// Returns: { success: boolean, data?: {...}, error?: string }
```

### Service Functions

```typescript
import { updateMETARData, getLatestMETARFromDB } from "@/services/metarService";

// Fetch and store new data
await updateMETARData("EFSA");

// Get latest from database
const metar = await getLatestMETARFromDB("EFSA");
```

## Performance

- Database query time: <10ms
- API fetch time: ~500ms
- Frontend data refresh: Every 5 minutes
- Backend update: Every 15 minutes

## Security

- Server actions are server-side only
- API route can be secured with CRON_SECRET
- No API keys required for Aviation Weather Center
- Database credentials stored in environment variables
