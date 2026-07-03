import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function TrendChart({ backendUrl }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetch(`${backendUrl}/api/history?days=14`)
      .then((res) => res.json())
      .then((data) => {
        const formatted = data.map((d) => ({
          date: new Date(Number(d.ts.micros) / 1000).toLocaleDateString(),
          temp: d.temp_f,
          aqi: d.aqi,
        }));
        setHistory(formatted);
      });
  }, [backendUrl]);

  if (history.length === 0) return <p className="trend-empty">No history yet — check back after a few days.</p>;

  return (
    <div className="trend-chart">
      <h3>Last 14 days</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={history}>
          <XAxis dataKey="date" fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip />
          <Line type="monotone" dataKey="temp" stroke="#e53935" name="Temp °F" />
          <Line type="monotone" dataKey="aqi" stroke="#4caf50" name="AQI" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default TrendChart;