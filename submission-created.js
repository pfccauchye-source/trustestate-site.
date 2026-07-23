// netlify/functions/extract-listing.js
// Reçoit le TEXTE d'une annonce collé par l'utilisateur (pas d'URL récupérée automatiquement :
// SeLoger/Leboncoin/Bien'ici interdisent le scraping dans leurs CGU et le bloquent techniquement).
// Demande à Claude d'en extraire les champs structurés utiles à l'analyse : adresse, prix, surface, etc.
// Répond en JSON strict, sans invention : les champs absents du texte sont renvoyés à null.

const MODEL = "claude-sonnet-4-6";

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return resp(204, "");
  if (event.httpMethod !== "POST") return resp(405, { error: "Méthode non autorisée" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return resp(500, { error: "Clé API absente : définissez ANTHROPIC_API_KEY dans Netlify." });

  let d;
  try { d = JSON.parse(event.body || "{}"); }
  catch { return resp(400, { error: "Corps de requête invalide" }); }

  const text = String(d.text || "").slice(0, 15000);
  if (text.trim().length < 30) return resp(400, { error: "Texte d'annonce trop court ou vide." });

  const system =
    "Tu extrais des champs structurés à partir du texte brut d'une annonce immobilière française, collé par un utilisateur. " +
    "Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans balises markdown, selon exactement ce schéma : " +
    '{"adresseTexte": string|null, "ville": string|null, "codePostal": string|null, "prix": number|null, ' +
    '"surface": number|null, "pieces": number|null, "typeBien": string|null, "dpe": string|null, ' +
    '"descriptionCourte": string|null, "confiance": "haute"|"moyenne"|"basse"}. ' +
    "Règles : n'invente aucune valeur absente du texte, mets null si l'information n'apparaît pas clairement. " +
    "\"adresseTexte\" doit être la meilleure reconstitution possible d'une adresse ou a minima ville + code postal " +
    "(nécessaire pour géocoder le bien), jamais une adresse inventée. \"prix\" et \"surface\" sont des nombres purs " +
    "(sans symbole €, sans espace). \"confiance\" reflète ta certitude sur la localisation extraite.";

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
        messages: [{ role: "user", content: "Texte de l'annonce :\n" + text }]
      })
    });
    if (!r.ok) {
      const detail = await r.text();
      return resp(502, { error: "Erreur API Claude", status: r.status, detail: detail.slice(0, 300) });
    }
    const j = await r.json();
    const raw = (j.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
    let parsed;
    try { parsed = JSON.parse(cleaned); }
    catch { return resp(502, { error: "Réponse IA non exploitable (JSON invalide)", raw: cleaned.slice(0, 300) }); }
    return resp(200, parsed);
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
