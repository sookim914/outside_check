import 'dotenv/config';
import { DuckDBInstance } from '@duckdb/node-api';

async function setup() {
  const instance = await DuckDBInstance.create('md:', {
    motherduck_token: process.env.MOTHERDUCK_TOKEN,
  });
  const connection = await instance.connect();
  await connection.run('CREATE DATABASE IF NOT EXISTS outside_app');
  await connection.run('USE outside_app');

  await connection.run(`
    CREATE TABLE IF NOT EXISTS readings (
      ts TIMESTAMP DEFAULT current_timestamp,
      lat DOUBLE,
      lon DOUBLE,
      temp_f DOUBLE,
      precip DOUBLE,
      wind_mph DOUBLE,
      aqi INTEGER,
      score INTEGER,
      verdict VARCHAR,
      reason VARCHAR
    )
  `);

  await connection.run(`
  CREATE TABLE IF NOT EXISTS places_cache (
    cache_key VARCHAR PRIMARY KEY,
    lat DOUBLE,
    lon DOUBLE,
    data VARCHAR,
    cached_at TIMESTAMP DEFAULT current_timestamp
  )
`);

  console.log('Table ready.');
}

setup();