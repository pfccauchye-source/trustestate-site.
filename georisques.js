// netlify/functions/georisques.js
// Proxy serveur vers l'API Géorisques (risques d'un lieu). Évite le blocage CORS du navigateur.
exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const { lat, lon } = q;
  if (!lat || !lon) return resp(400, { error: "Paramètres lat & lon requis" });
  try {
    const url = `https://www.georisques.gouv.fr/api/v1/resultats_rapport_risque?latlon=${encodeURIComponent(lon)},${encodeURIComponent(lat)}`;
    const r = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!r.ok) return resp(502, { error: "Source Géorisques indisponible", status: r.status });
    const data = await r.json();
    return resp(200, data);
  } catch (e) {
    return resp(502, { error: "Erreur Géorisques", detail: String(e) });
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
