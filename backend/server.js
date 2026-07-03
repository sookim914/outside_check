import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { DuckDBInstance } from '@duckdb/node-api';

function toJSONSafe(obj) {
  return JSON.parse(JSON.stringify(obj, (_, value) =>
    typeof value === 'bigint' ? Number(value) : value
  ));
}

const app = express();
app.use(cors());

let dbInstance;
async function getConnection() {
  if (!dbInstance) {
    dbInstance = await DuckDBInstance.create('md:outside_app', {
      motherduck_token: process.env.MOTHERDUCK_TOKEN,
    });
  }
  return await dbInstance.connect();
}

// --- Kid-friendly scoring ---
function scoreConditions({ tempF, precip, windMph, aqi }) {
  let score = 100;
  let reasons = [];

  if (aqi > 100) { score -= 50; reasons.push('air quality is unhealthy'); }
  else if (aqi > 50) { score -= 20; reasons.push('air quality is a bit high'); }

  if (tempF > 90 || tempF < 40) { score -= 40; reasons.push('temperature is extreme'); }
  else if (tempF > 80 || tempF < 60) { score -= 15; reasons.push('temperature is a little off'); }

  if (precip > 0.5) { score -= 40; reasons.push('active rain'); }
  else if (precip > 0.1) { score -= 15; reasons.push('light drizzle'); }

  if (windMph > 25) { score -= 20; reasons.push('windy'); }

  let verdict = 'green';
  if (score < 50) verdict = 'red';
  else if (score < 80) verdict = 'yellow';

  return { score: Math.max(score, 0), verdict, reason: reasons[0] || 'conditions look good' };
}

// --- Fetch live weather + AQI from Open-Meteo ---
async function fetchConditions(lat, lon) {
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`;
  const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`;

  const [weatherRes, aqiRes] = await Promise.all([fetch(weatherUrl), fetch(aqiUrl)]);
  const weather = await weatherRes.json();
  const aqiData = await aqiRes.json();

  return {
    tempF: weather.current.temperature_2m,
    precip: weather.current.precipitation,
    windMph: weather.current.wind_speed_10m,
    aqi: aqiData.current.us_aqi,
  };
}

// --- Route: current verdict ---
app.get('/api/current', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    if (isNaN(lat) || isNaN(lon)) return res.status(400).json({ error: 'lat and lon required' });

    const conditions = await fetchConditions(lat, lon);
    const result = scoreConditions(conditions);

    const connection = await getConnection();
    await connection.run(
      `INSERT INTO readings (lat, lon, temp_f, precip, wind_mph, aqi, score, verdict, reason)
       VALUES (${lat}, ${lon}, ${conditions.tempF}, ${conditions.precip}, ${conditions.windMph}, ${conditions.aqi}, ${result.score}, '${result.verdict}', '${result.reason}')`
    );

    res.json({ ...conditions, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --- Route: history for trend chart ---
app.get('/api/history', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 14;
    const connection = await getConnection();
    const result = await connection.runAndReadAll(
      `SELECT ts, temp_f, aqi, score, verdict FROM readings
       WHERE ts > current_timestamp - INTERVAL '${days} days'
       ORDER BY ts ASC`
    );
    res.json(toJSONSafe(result.getRowObjects()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --- Route: nearby kid-friendly places ---
app.get('/api/places', async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat);
      const lon = parseFloat(req.query.lon);
      const radius = parseInt(req.query.radius) || 2000;
      if (isNaN(lat) || isNaN(lon)) return res.status(400).json({ error: 'lat and lon required' });
  
      const cacheKey = `${lat.toFixed(2)}_${lon.toFixed(2)}_${radius}`;
      const connection = await getConnection();
  
      // Check cache first (valid for 7 days)
      const cached = await connection.runAndReadAll(
        `SELECT data FROM places_cache WHERE cache_key = '${cacheKey}' AND cached_at > current_timestamp - INTERVAL '7 days'`
      );
      const cachedRows = cached.getRowObjects();
      if (cachedRows.length > 0) {
        console.log('Serving places from cache');
        return res.json(JSON.parse(cachedRows[0].data));
      }
  
      // Not cached — hit Overpass
      const query = `
        [out:json][timeout:25];
        (
          node["leisure"="playground"](around:${radius},${lat},${lon});
          way["leisure"="playground"](around:${radius},${lat},${lon});
          node["leisure"="park"](around:${radius},${lat},${lon});
          way["leisure"="park"](around:${radius},${lat},${lon});
          node["tourism"="museum"](around:${radius},${lat},${lon});
          way["tourism"="museum"](around:${radius},${lat},${lon});
        );
        out center tags;
      `;
  
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
  
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
        headers: {
          'Content-Type': 'text/plain',
          'Accept': '*/*',
          'User-Agent': 'outside-app/1.0 (family weather app)',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);
  
      if (!response.ok) {
        const text = await response.text();
        console.error('Overpass returned non-OK status:', response.status, text.slice(0, 300));
        return res.status(502).json({ error: `Overpass API error: ${response.status}` });
      }
  
      const data = await response.json();
  
      const places = data.elements
        .map((el) => {
          const type = el.tags?.leisure === 'playground'
            ? 'playground'
            : el.tags?.leisure === 'park'
            ? 'park'
            : 'museum';
          return {
            name: el.tags?.name || `Unnamed ${type}`,
            type,
            lat: el.lat || el.center?.lat,
            lon: el.lon || el.center?.lon,
            hasChangingTable: el.tags?.changing_table === 'yes',
            wheelchairAccessible: el.tags?.wheelchair === 'yes',
          };
        })
        .filter((p) => p.lat && p.lon);
  
      // Save to cache
      const escapedData = JSON.stringify(places).replace(/'/g, "''");
      await connection.run(
        `INSERT OR REPLACE INTO places_cache (cache_key, lat, lon, data) VALUES ('${cacheKey}', ${lat}, ${lon}, '${escapedData}')`
      );
  
      res.json(places);
    } catch (err) {
      console.error(err);
      if (err.name === 'AbortError' || err.message.includes('aborted')) {
        return res.status(504).json({ error: 'Places search timed out — try again or use a smaller radius' });
      }
      res.status(500).json({ error: err.message });
    }
  });
  
  const DIVE_ID = '19aea101-1806-4e7f-ba5b-75f51d625c78'; 

  app.get('/api/dive-session', async (req, res) => {
    try {
      const response = await fetch(
        `https://api.motherduck.com/v1/dives/${DIVE_ID}/embed-session`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.MOTHERDUCK_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username: process.env.MOTHERDUCK_USERNAME }),
        }
      );
      const data = await response.json();
      console.log('MotherDuck embed session response:', data);

      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));