// netlify/functions/submission-created.js
// Fonction SPÉCIALE : Netlify l'exécute automatiquement à CHAQUE soumission d'un formulaire.
// Elle envoie un email de confirmation au prospect via Resend (https://resend.com).
// Variables d'environnement à définir dans Netlify :
//   RESEND_API_KEY  -> ta clé API Resend
//   FROM_EMAIL      -> ex. "TrustEstate <contact@trustestate.fr>" (domaine vérifié chez Resend)

exports.handler = async (event) => {
  let payload;
  try { payload = JSON.parse(event.body).payload; }
  catch { return { statusCode: 400, body: "Payload invalide" }; }

  const data = payload && payload.data ? payload.data : {};
  const email = data.email;
  const nom = data.nom || "";

  // Pas d'email du prospect ou clé absente -> on ne fait rien (sans bloquer Netlify)
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL || "TrustEstate <onboarding@resend.dev>";
  if (!email || !apiKey) {
    console.log("Confirmation non envoyée (email manquant ou RESEND_API_KEY absente).");
    return { statusCode: 200, body: "skip" };
  }

  const html = `
    <div style="font-family:Arial,sans-serif;color:#10161F;max-width:520px;margin:auto">
      <h2 style="color:#0FB37E">Merci ${escapeHtml(nom)} 👋</h2>
      <p>Nous avons bien reçu votre demande auprès de <strong>TrustEstate</strong>.</p>
      <p>Notre équipe revient vers vous très rapidement pour convenir d'un créneau de présentation.</p>
      <p>Vous pouvez aussi réserver directement un créneau ici :
        <a href="${process.env.BOOKING_URL || "#"}" style="color:#0FB37E">Réserver une démo</a>.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="font-size:12px;color:#8A93A2">TrustEstate — L'immobilier, enfin digne de confiance.</p>
    </div>`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "TrustEstate — nous avons bien reçu votre demande",
        html
      })
    });
    if (!r.ok) {
      const t = await r.text();
      console.error("Resend a renvoyé une erreur :", r.status, t.slice(0, 300));
    }
  } catch (e) {
    console.error("Échec d'envoi de l'email de confirmation :", String(e));
  }
  return { statusCode: 200, body: "ok" };
};

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}
