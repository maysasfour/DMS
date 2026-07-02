/**
 * satelliteService.js
 * Fetches real-world disaster events from NASA EONET and USGS Earthquake APIs.
 * These are publicly available feeds — no API key required.
 */

const EONET_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=100';
const USGS_URL  = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=4.0&limit=50&orderby=time';

// Map NASA EONET category IDs → our incident type labels
const EONET_CATEGORY_MAP = {
  wildfires:      { label: 'FIRE',       icon: '🔥', color: '#dc2626' },
  volcanoes:      { label: 'EARTHQUAKE', icon: '🌋', color: '#7f1d1d' },
  severeStorms:   { label: 'STORM',      icon: '⛈️',  color: '#7c3aed' },
  floods:         { label: 'FLOOD',      icon: '🌊', color: '#2563eb' },
  earthquakes:    { label: 'EARTHQUAKE', icon: '🌍', color: '#92400e' },
  drought:        { label: 'OTHER',      icon: '🏜️', color: '#d97706' },
  dustHaze:       { label: 'OTHER',      icon: '🌫️', color: '#9ca3af' },
  manmade:        { label: 'HAZMAT',     icon: '⚠️', color: '#ea580c' },
  seaLakeIce:     { label: 'OTHER',      icon: '🧊', color: '#93c5fd' },
  snowIce:        { label: 'STORM',      icon: '❄️', color: '#bfdbfe' },
  tempExtremes:   { label: 'OTHER',      icon: '🌡️', color: '#fbbf24' },
  landslides:     { label: 'OTHER',      icon: '⛰️', color: '#78350f' },
};

function parseSeverity(category) {
  if (['wildfires', 'volcanoes', 'earthquakes'].includes(category)) return 'HIGH';
  if (['severeStorms', 'floods', 'manmade'].includes(category))     return 'MEDIUM';
  return 'LOW';
}

export async function fetchNasaEonetEvents() {
  try {
    const res = await fetch(EONET_URL);
    if (!res.ok) throw new Error('EONET fetch failed');
    const data = await res.json();

    return (data.events || []).flatMap(event => {
      const categoryId = event.categories?.[0]?.id;
      const meta = EONET_CATEGORY_MAP[categoryId] || { label: 'OTHER', icon: '⚠️', color: '#6b7280' };

      // Each event can have multiple geometry points (track)
      return (event.geometry || [])
        .filter(g => g.coordinates && g.coordinates.length >= 2)
        .slice(0, 1) // use only latest coordinate per event
        .map(g => ({
          id: `eonet-${event.id}`,
          title: event.title,
          incidentType: meta.label,
          category: categoryId,
          icon: meta.icon,
          color: meta.color,
          severity: parseSeverity(categoryId),
          status: 'REPORTED',
          latitude: g.coordinates[1],
          longitude: g.coordinates[0],
          locationName: event.title,
          reportedAt: g.date || event.geometry?.[0]?.date,
          source: 'NASA EONET',
          sourceUrl: event.sources?.[0]?.url,
          isRealWorldEvent: true,
        }));
    });
  } catch (err) {
    console.warn('NASA EONET unavailable:', err.message);
    return [];
  }
}

export async function fetchUsgsEarthquakes() {
  try {
    const res = await fetch(USGS_URL);
    if (!res.ok) throw new Error('USGS fetch failed');
    const data = await res.json();

    return (data.features || []).map(f => {
      const mag = f.properties.mag || 0;
      return {
        id: `usgs-${f.id}`,
        title: f.properties.title,
        incidentType: 'EARTHQUAKE',
        category: 'earthquakes',
        icon: '🌍',
        color: mag >= 6 ? '#7f1d1d' : mag >= 5 ? '#dc2626' : '#f59e0b',
        severity: mag >= 6 ? 'CRITICAL' : mag >= 5 ? 'HIGH' : 'MEDIUM',
        magnitude: mag,
        status: 'REPORTED',
        latitude: f.geometry.coordinates[1],
        longitude: f.geometry.coordinates[0],
        depth: f.geometry.coordinates[2],
        locationName: f.properties.place,
        reportedAt: new Date(f.properties.time).toISOString(),
        source: 'USGS',
        sourceUrl: f.properties.url,
        isRealWorldEvent: true,
      };
    });
  } catch (err) {
    console.warn('USGS unavailable:', err.message);
    return [];
  }
}

export async function fetchAllSatelliteEvents() {
  const [eonet, usgs] = await Promise.all([
    fetchNasaEonetEvents(),
    fetchUsgsEarthquakes(),
  ]);
  return [...eonet, ...usgs];
}
