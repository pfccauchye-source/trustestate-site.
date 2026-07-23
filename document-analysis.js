// netlify/functions/document-analysis.js
// Reçoit le TEXTE déjà extrait de documents fournis par le vendeur (DPE officiel, diagnostics,
// compromis, PV de copropriété...) ainsi que l'analyse en données ouvertes déjà calculée (TrustScore),
// et demande à Claude de produire une lecture croisée : cohérences, incohérences, informations nouvelles,
// alertes. Rien n'est stocké côté serveur : le texte transite, est envoyé à l'API, puis la fonction répond.
//
// Nécessite ANTHROPIC_API_KEY (même variable que la fonction "report").

const MODEL = "claude-sonnet-4-6";

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return resp(204, "");
  if (event.httpMethod !== "POST") return resp(405, { error: "Méthode non autorisée" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return resp(500, { error: "Clé API absente : définissez ANTHROPIC_API_KEY dans Netlify." });

  let d;
  try { d = JSON.parse(event.body || "{}"); }
  catch { return resp(400, { error: "Corps de requête invalide" }); }

  const documents = Array.isArray(d.documents) ? d.documents : [];
  if (!documents.length) return resp(400, { error: "Aucun document fourni" });

  // Garde-fou simple : limiter le volume de texte envoyé (coût + fiabilité)
  const MAX_CHARS_PER_DOC = 12000;
  const docsForPrompt = documents.slice(0, 6).map((doc, i) => {
    const label = (doc.label || `Document ${i + 1}`).slice(0, 120);
    const text = String(doc.text || "").slice(0, MAX_CHARS_PER_DOC);
    return `--- ${label} ---\n${text}`;
  }).join("\n\n");

  const contexteAnalyse = d.contexteAnalyse ? JSON.stringify(d.contexteAnalyse, null, 2) : "Non fourni.";

  const system =
    "Tu es l'analyste due diligence de TrustEstate. Ta mission : croiser le contenu des documents fournis " +
    "par le vendeur (extraits en texte brut, potentiellement imparfaits car issus d'une extraction PDF) avec " +
    "l'analyse déjà réalisée à partir de données publiques ouvertes (DVF, Géorisques, DPE, quartier), fournie en JSON. " +
    "Règles strictes : n'invente rien qui ne figure pas dans les documents ou le JSON fourni. Si un document est illisible, " +
    "incomplet, ou ne correspond pas à un type de document immobilier reconnaissable, dis-le explicitement plutôt que " +
    "de deviner. Distingue clairement trois catégories dans ta réponse : " +
    "1) COHÉRENCES — ce que les documents confirment par rapport à l'analyse en données ouvertes ; " +
    "2) INCOHÉRENCES OU ÉCARTS — ce que les documents contredisent ou nuancent (ex. DPE officiel différent de l'estimation, " +
    "surface différente, travaux mentionnés non visibles dans les données publiques) ; " +
    "3) INFORMATIONS NOUVELLES — ce que les documents apportent que les données ouvertes ne pouvaient pas savoir " +
    "(procédures de copropriété, litiges, servitudes, historique de travaux, clauses particulières). " +
    "Termine par une liste de POINTS DE VIGILANCE À VÉRIFIER AVANT ACHAT (questions concrètes à poser au vendeur ou au notaire). " +
    "Reste factuel, neutre, en français, sans mise en forme Markdown complexe. Rappelle en une phrase que ce rapport " +
    "est une aide à la décision et ne remplace pas un avis notarial ou une expertise professionnelle.";

  const userMsg =
    "ANALYSE EN DONNÉES OUVERTES DÉJÀ CALCULÉE (JSON) :\n" + contexteAnalyse +
    "\n\nDOCUMENTS FOURNIS PAR LE VENDEUR (texte extrait) :\n" + docsForPrompt +
    "\n\nProduis l'analyse croisée selon les règles définies.";

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
        max_tokens: 1400,
        system,
        messages: [{ role: "user", content: userMsg }]
      })
    });
    if (!r.ok) {
      const detail = await r.text();
      return resp(502, { error: "Erreur API Claude", status: r.status, detail: detail.slice(0, 300) });
    }
    const j = await r.json();
    const text = (j.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    return resp(200, { analysis: text || "Aucun contenu généré." });
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
