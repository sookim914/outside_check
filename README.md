# Outside Check

Check if it's a good day to go outside based on weather and air quality, with nearby family-friendly places.

## Features

- **Weather & Air Quality Check**: Real-time weather and AQI data for any US zip code
- **Smart Recommendations**: Color-coded verdicts (green/yellow/red) based on temperature, precipitation, wind, and air quality
- **Nearby Places**: Discover family-friendly parks, playgrounds, and museums with accessibility features
- **Historical Trends**: View temperature and AQI trends over the last 14 days (via MotherDuck embed or TrendChart fallback)

## Tech Stack

**Frontend:**
- React 19
- Vite
- Recharts (for trend visualization)

**Backend:**
- Node.js + Express
- DuckDB via MotherDuck (cloud data warehouse)
- OpenStreetMap Overpass API (for nearby places)

**APIs:**
- [Open-Meteo](https://open-meteo.com/) - Weather & Air Quality data
- [Zippopotam](https://zippopotam.us/) - Zip code to coordinates
- [Overpass API](https://overpass-api.de/) - OpenStreetMap data

## Setup

### Prerequisites
- Node.js 18+
- MotherDuck account ([sign up](https://motherduck.com/))

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
MOTHERDUCK_TOKEN=your_motherduck_token
MOTHERDUCK_USERNAME=your_motherduck_username
PORT=3001
```

4. Initialize database:
```bash
node setup-db.js
```

5. Start server:
```bash
node server.js
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start dev server:
```bash
npm run dev
```

4. Open http://localhost:5173

## Usage

1. Enter a valid US zip code
2. Get instant weather conditions and air quality verdict
3. View nearby family-friendly places
4. Check historical trends (if available)

## Environment Variables

**Backend:**
- `MOTHERDUCK_TOKEN` - Your MotherDuck API token
- `MOTHERDUCK_USERNAME` - Your MotherDuck username
- `PORT` - Server port (default: 3001)

## Project Structure

```
outside-app/
├── frontend/          # React frontend
│   ├── src/
│   │   ├── App.jsx           # Main app component
│   │   ├── PlacesList.jsx    # Nearby places component
│   │   ├── TrendChart.jsx    # Historical trends chart
│   │   └── App.css           # Styles
│   └── package.json
│
├── backend/           # Express backend
│   ├── server.js             # Main server
│   ├── setup-db.js           # Database initialization
│   └── package.json
│
└── README.md
```

## License

MIT
