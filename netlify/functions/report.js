// netlify/functions/report.js
// Rédige un rapport en langage naturel à partir des données déjà calculées.
// Appelle l'API Claude côté serveur : la clé n'est JAMAIS exposée au navigateur.

const MODEL = "claude-sonnet-4-6";

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return resp(204, "");
  if (event.httpMethod !== "POST") return resp(405, { error: "Méthode non autorisée" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return resp(500, { error: "Clé API absente : définissez ANTHROPIC_API_KEY dans Netlify." });

  let d;
  try { d = JSON.parse(event.body || "{}"); }
  catch { return resp(400, { error: "Corps de requête invalide" }); }

  const data = JSON.stringify(d, null, 2);
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

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        system,
        messages: [{ role: "user", content: "Données du bien :\n" + data }]
      })
    });
    if (!r.ok) {
      const detail = await r.text();
      return resp(502, { error: "Erreur API Claude", status: r.status, detail: detail.slice(0, 300) });
    }
    const j = await r.json();
    const text = (j.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    return resp(200, { report: text || "Aucun contenu généré." });
  } catch (e) {
    return resp(502, { error: "Appel au modèle impossible", detail: String(e) });
  }
};

function resp(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    },
    body: typeof body === "string" ? body : JSON.stringify(body)
  };
}
