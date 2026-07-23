// netlify/functions/ask.js
// Assistant IA conversationnel : répond à une question sur le bien à partir UNIQUEMENT
// des données déjà calculées côté client (TrustScore, valorisation, risques, etc.),
// jamais à partir de connaissances générales sur le marché. Pas de mémoire côté serveur :
// l'historique de la conversation est renvoyé par le client à chaque appel.

const MODEL = "claude-sonnet-4-6";

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return resp(204, "");
  if (event.httpMethod !== "POST") return resp(405, { error: "Méthode non autorisée" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return resp(500, { error: "Clé API absente : définissez ANTHROPIC_API_KEY dans Netlify." });

  let d;
  try { d = JSON.parse(event.body || "{}"); }
  catch { return resp(400, { error: "Corps de requête invalide" }); }

  const question = String(d.question || "").slice(0, 1000);
  if (!question.trim()) return resp(400, { error: "Question vide" });

  const contexteAnalyse = d.contexteAnalyse ? JSON.stringify(d.contexteAnalyse, null, 2) : "Non fourni.";
  const history = Array.isArray(d.history) ? d.history.slice(-8) : []; // 4 derniers échanges max

  const system =
    "Tu es l'assistant TrustEstate. Tu réponds à des questions sur UN bien précis, en te basant UNIQUEMENT " +
    "sur les données chiffrées de l'analyse fournie en JSON (TrustScore, axes, prix, risques, DPE, quartier, " +
    "valorisation, négociation, rentabilité). Ne réponds jamais à partir de connaissances générales sur le marché " +
    "immobilier français ou une autre ville : si l'information n'est pas dans le JSON, dis-le clairement et propose " +
    "à l'utilisateur de préciser sa question ou d'ajouter des données (prix, surface, documents). Sois concret et chiffré " +
    "quand les données le permettent (ex. « le prix est supérieur de X % à la médiane locale, soit environ Y € »). " +
    "Réponds en français, en 2 à 5 phrases maximum, ton factuel et direct, sans formules de politesse superflues. " +
    "Rappelle occasionnellement, sans lourdeur, que ceci est une aide à la décision et non un avis d'expert.\n\n" +
    "DONNÉES DE L'ANALYSE (JSON) :\n" + contexteAnalyse;

  const messages = [...history, { role: "user", content: question }];

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
        max_tokens: 500,
        system,
        messages
      })
    });
    if (!r.ok) {
      const detail = await r.text();
      return resp(502, { error: "Erreur API Claude", status: r.status, detail: detail.slice(0, 300) });
    }
    const j = await r.json();
    const text = (j.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    return resp(200, { answer: text || "Aucune réponse générée." });
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
