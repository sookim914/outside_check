import { useState, useEffect } from 'react';
import PlacesList from './PlacesList';
import TrendChart from './TrendChart';
import './App.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

function App() {
  const [zipInput, setZipInput] = useState('');
  const [coords, setCoords] = useState(null);
  const [conditions, setConditions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [diveSession, setDiveSession] = useState(null);

  
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/dive-session`)
      .then(res => res.json())
      .then(data => setDiveSession(data.session))
      .catch(() => setDiveSession(null));
  }, []);

  const handleZipSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{5}$/.test(zipInput)) {
      setError('Enter a valid 5-digit zip code');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`https://api.zippopotam.us/us/${zipInput}`);
      if (!res.ok) throw new Error('Zip code not found');
      const data = await res.json();
      const place = data.places[0];
      setCoords({ lat: parseFloat(place.latitude), lon: parseFloat(place.longitude) });
      setZipInput(zipInput);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!coords) return;
    fetch(`${BACKEND_URL}/api/current?lat=${coords.lat}&lon=${coords.lon}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setConditions(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [coords]);

  const verdictColor = { green: '#4caf50', yellow: '#ffb300', red: '#e53935' };
  const verdictText = {
    green: 'Great day to go outside!',
    yellow: 'Okay, with some care',
    red: 'Better to stay in today',
  };

  return (
    <div className="app">
      <h1>Is it good to go outside?</h1>

      <form onSubmit={handleZipSubmit} className="zip-form">
        <input
          type="text"
          placeholder="Enter zip code"
          value={zipInput}
          onChange={(e) => setZipInput(e.target.value)}
          maxLength={5}
        />
        <button type="submit">Check</button>
      </form>

      {loading && <p>Checking conditions...</p>}
      {error && <p className="error">{error}</p>}

      {conditions && !loading && (
        <>
          <div className="verdict-card" style={{ backgroundColor: verdictColor[conditions.verdict] }}>
            <h2>{verdictText[conditions.verdict]}</h2>
            <p className="reason">{conditions.reason}</p>
            <div className="stats">
              <div><strong>{Math.round(conditions.tempF)}°F</strong><span>Temp</span></div>
              <div><strong>{conditions.aqi}</strong><span>AQI</span></div>
              <div><strong>{Math.round(conditions.windMph)} mph</strong><span>Wind</span></div>
            </div>
          </div>

          {diveSession ? (
            <iframe
              src={`https://embed-motherduck.com/sandbox/#session=${diveSession}`}
              sandbox="allow-scripts allow-same-origin"
              width="100%"
              height="600"
              style={{ border: 'none', borderRadius: 12, marginTop: 20 }}
              title="Temperature & AQI Dive"
            />
          ) : (
            <TrendChart backendUrl={BACKEND_URL} />
          )}
          <PlacesList backendUrl={BACKEND_URL} coords={coords} />
        </>
      )}
    </div>
  );
}

export default App;