// netlify/functions/quartier.js
// Compte les commodités autour d'un point (transports, écoles, commerces, santé)
// via l'API Overpass d'OpenStreetMap. Sert de base à l'axe "Qualité / emplacement".
exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const { lat, lon, r = "800" } = q;
  if (!lat || !lon) return resp(400, { error: "Paramètres lat & lon requis" });

  const query = `[out:json][timeout:25];
(
  node[amenity=school](around:${r},${lat},${lon});
  node[public_transport=stop_position](around:${r},${lat},${lon});
  node[highway=bus_stop](around:${r},${lat},${lon});
  node[railway=station](around:${r},${lat},${lon});
  node[shop](around:${r},${lat},${lon});
  node[amenity~"pharmacy|doctors|hospital"](around:${r},${lat},${lon});
);
out body;`;

  try {
    const r2 = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(query)
    });
    if (!r2.ok) return resp(502, { error: "Overpass indisponible", status: r2.status });
    const data = await r2.json();
    const els = data.elements || [];
    let transports = 0, ecoles = 0, commerces = 0, sante = 0;
    const points = { transports: [], ecoles: [], commerces: [], sante: [] };
    const cap = 12;
    els.forEach(e => {
      const t = e.tags || {};
      const pt = (typeof e.lat === "number" && typeof e.lon === "number") ? { lat: e.lat, lon: e.lon, name: t.name || null } : null;
      if (t.amenity === "school") { ecoles++; if (pt && points.ecoles.length < cap) points.ecoles.push(pt); }
      else if (t.public_transport === "stop_position" || t.highway === "bus_stop" || t.railway === "station") { transports++; if (pt && points.transports.length < cap) points.transports.push(pt); }
      else if (t.shop) { commerces++; if (pt && points.commerces.length < cap) points.commerces.push(pt); }
      else if (["pharmacy", "doctors", "hospital"].includes(t.amenity)) { sante++; if (pt && points.sante.length < cap) points.sante.push(pt); }
    });
    return resp(200, { transports, ecoles, commerces, sante, total: els.length, points });
  } catch (e) {
    return resp(502, { error: "Erreur Overpass", detail: String(e) });
  }
};

function resp(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400"
    },
    body: JSON.stringify(body)
  };
}
