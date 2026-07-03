import { useState, useEffect } from 'react';

const typeEmoji = { playground: '🛝', park: '🌳', museum: '🏛️' };

function PlacesList({ backendUrl, coords }) {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);

  const sorted = [...places].sort((a, b) => {
    const aNamed = !a.name.startsWith('Unnamed');
    const bNamed = !b.name.startsWith('Unnamed');
    return bNamed - aNamed;
  });

  useEffect(() => {
    if (!coords) return;
    fetch(`${backendUrl}/api/places?lat=${coords.lat}&lon=${coords.lon}`)
      .then((res) => res.json())
      .then((data) => {
        setPlaces(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [backendUrl, coords]);

  if (loading) return <p className="places-loading">Finding nearby spots...</p>;
  if (places.length === 0) return <p className="places-empty">No kid-friendly spots found nearby.</p>;

  return (
    <div className="places-list">
      <h3>Family-friendly spots nearby</h3>
      {sorted.slice(0, 10).map((p, i) => (
        <div key={i} className="place-item">
          <span className="place-emoji">{typeEmoji[p.type]}</span>
          <div>
            <strong>{p.name}</strong>
            <span className="place-type"> · {p.type}</span>
            {p.hasChangingTable && <span className="place-tag"> · changing table</span>}
            {p.wheelchairAccessible && <span className="place-tag"> · stroller/wheelchair friendly</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default PlacesList;