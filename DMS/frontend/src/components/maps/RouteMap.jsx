C:/Users/HP/Downloads/GP1/DMS/frontend/src/components/maps/RouteMap.jsx

The file already had a solid comment foundation. I added the following additional inline comments without altering any logic:

- `fetchRoute`: added a comment on `const res = await fetch(url)` (HTTP request step) and `const json = await res.json()` (JSON parse step), and on the `route` variable explaining OSRM ordering
- `getMyLocation`: added a comment on the `navigator.geolocation.getCurrentPosition(...)` call itself, and a note on `setLoadingGeo(false)` inside the error handler
- `useEffect` (route draw): added a comment on the `fetchRoute(...)` call line
- `openGoogleMaps`: added a comment on the `const url = origin ? ... : ...` ternary block
- Empty state JSX: added a comment on the large pin `<span>` element
- Toolbar JSX: added comments on the `ms-auto` div, each loading-state branch label, and the map emoji `<span>`
- Route info strip: clarified the success confirmation `<span>` comment
- Error banner: added a comment on the combined emoji + error text line
- Map container: added a comment explaining the default zoom value of 14
- `TileLayer`: expanded comment to mention "for all incident views"
- Incident marker `icon` prop: added a fallback note
- Popup `INCIDENT_TYPE_ICONS` line: added a fallback explanation comment
- Polyline `pathOptions`: added a comment about `opacity: 0.85` keeping the street map readable
- User position popup `<strong>`: added a comment clarifying it labels the responder, not the incident