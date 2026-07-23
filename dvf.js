// netlify/functions/dvf.js
// Proxy serveur vers l'API DVF (prix de vente réels).
// Dégradation propre : en cas d'indisponibilité de la source, renvoie 200 + liste vide
// (avec un drapeau dataUnavailable) pour ne pas bloquer le reste de l'analyse.
exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const { lat, lon, dist = "600" } = q;
  if (!lat || !lon) return resp(400, { error: "Paramètres lat & lon requis" });

  const url = `https://api.cquest.org/dvf?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&dist=${encodeURIComponent(dist)}`;
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    clearTimeout(to);
    if (!r.ok) return resp(200, { resultats: [], features: [], dataUnavailable: true, upstreamStatus: r.status });
    const data = await r.json();
    return resp(200, data);
  } catch (e) {
    return resp(200, { resultats: [], features: [], dataUnavailable: true, detail: String(e) });
  }
};

function resp(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600"
    },
    body: JSON.stringify(body)
  };
}
