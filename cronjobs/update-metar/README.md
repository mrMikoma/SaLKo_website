# METAR Update Cronjob

Fetches and stores METAR weather data for Savonlinna Airport (EFSA).

## Configuration

- **Schedule**: Twice per hour at :21 and :51 (`21,51 * * * *`)
- **Scheduler**: Ofelia (Docker-based cron scheduler)
- **Data Source**: NOAA Aviation Weather Center API
- **Station**: EFSA (Savonlinna Airport)
- **Retention**: 7 days (cleanup runs daily at midnight)

## Local Testing

```bash
# From project root
npm run cronjob:update-metar

# Direct execution
tsx cronjobs/update-metar/index.ts
```

## Environment Variables

Required:

- `DATABASE_CONNECTION_STRING` - PostgreSQL connection string

## Database

Creates/updates records in the `metar_data` table:

- Stores raw METAR and parsed weather data
- Handles duplicate observations (upsert)
- Automatic cleanup of old records

## Monitoring

Check logs for:

```
[timestamp] Starting update-metar v1.0.0
Fetching and storing METAR data...
[timestamp] update-metar completed successfully in XXXms
```

Errors will exit with code 1 and log details..

## Related Files

- Service: `nextjs/services/metarService.ts`
- Parser: `nextjs/utilities/metarParser.ts`
- Schema: `postgres/init/06-metar-schema.sql`
