// netlify/functions/dpe.js
// Proxy serveur vers l'API DPE de l'ADEME (classe énergie des logements). Évite le blocage CORS.
exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const { lat, lon, dist = "200" } = q;
  if (!lat || !lon) return resp(400, { error: "Paramètres lat & lon requis" });
  try {
    const base = "https://data.ademe.fr/data-fair/api/v1/datasets/dpe-v2-logements-existants/lines";
    const params = new URLSearchParams({
      size: "40",
      geo_distance: `${lon},${lat},${dist}`,
      select: "etiquette_dpe,etiquette_ges,date_etablissement_dpe,surface_habitable_logement,type_batiment,_geopoint,adresse_ban"
    });
    const r = await fetch(`${base}?${params.toString()}`, { headers: { Accept: "application/json" } });
    if (!r.ok) return resp(502, { error: "Source DPE indisponible", status: r.status });
    const data = await r.json();
    return resp(200, data);
  } catch (e) {
    return resp(502, { error: "Erreur DPE", detail: String(e) });
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
