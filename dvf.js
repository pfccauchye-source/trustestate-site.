// netlify/functions/report.js
// Rédige un rapport en langage naturel à partir des données déjà calculées.
// Appelle l'API Claude côté serveur : la clé n'est JAMAIS exposée au navigateur.
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return resp(405, { error: "POST requis" });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return resp(500, { error: "Clé API absente : définissez la variable d'environnement ANTHROPIC_API_KEY dans Netlify." });

  let data;
  try { data = JSON.parse(event.body || "{}"); }
  catch { return resp(400, { error: "Corps JSON invalide" }); }

  const system =
    "Tu es l'analyste immobilier de TrustEstate. À partir UNIQUEMENT des données chiffrées fournies " +
    "(issues de sources publiques : Base Adresse Nationale, DVF Etalab, Géorisques, DPE ADEME, OpenStreetMap), " +
    "rédige un rapport clair, honnête et concis en français. Règles strictes : n'invente aucune donnée ni chiffre absent ; " +
    "si une information manque ou est marquée comme estimation/heuristique, dis-le explicitement et ne la présente jamais " +
    "comme un fait certain ; reste factuel et neutre ; précise que l'analyse est indicative et ne remplace pas une expertise " +
    "immobilière, notariale ou financière. Structure le rapport en sections courtes : Synthèse et recommandation, " +
    "Prix et négociation, Rentabilité locative (rappelle que c'est une estimation grossière si isHeuristic est vrai), " +
    "Risques et points de vigilance, Conclusion. Si donneesSimulees est vrai, indique clairement en tête que les chiffres " +
    "sont un exemple non réel.";

  const user = "Données du bien à analyser :\n" + JSON.stringify(data, null, 2) + "\n\nRédige le rapport.";

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system,
        messages: [{ role: "user", content: user }]
      })
    });
    const j = await r.json();
    if (!r.ok) return resp(502, { error: "Erreur de l'API du modèle", detail: j });
    const text = (j.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    return resp(200, { report: text });
  } catch (e) {
    return resp(502, { error: "Échec de l'appel au modèle", detail: String(e) });
  }
};

function resp(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(body)
  };
}
