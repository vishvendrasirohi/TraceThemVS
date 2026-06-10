import crypto from "crypto";

const ALLOWED_ORIGINS = [
  "https://tracethem.online",
  "https://www.tracethem.online",
  "http://localhost:5173",
];

function corsHeaders(req) {
  const origin = req.headers?.origin || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default async function handler(req, res) {
  const headers = corsHeaders(req);
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { email, name, aliases } = req.body || {};
    const enrichment = { gravatar: false, github: null, keybase: null, emailDomain: null };

    if (email) {
      const emailClean = email.trim().toLowerCase();
      const emailMd5 = crypto.createHash("md5").update(emailClean).digest("hex");
      enrichment.emailDomain = emailClean.split("@")[1] || null;
      try {
        const gRes = await fetch(`https://www.gravatar.com/avatar/${emailMd5}?d=404`, {
          method: "HEAD",
          signal: AbortSignal.timeout(4000),
        });
        enrichment.gravatar = gRes.ok;
      } catch {}
    }

    const rawNames = [name, ...(aliases || "").split(",").map((s) => s.trim())].filter(Boolean);
    const usernames = rawNames
      .map((n) => n.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9-]/g, "").slice(0, 39))
      .filter((u) => u.length >= 3);

    for (const username of usernames.slice(0, 4)) {
      if (!enrichment.github) {
        try {
          const ghRes = await fetch(`https://api.github.com/users/${username}`, {
            headers: { "User-Agent": "TraceThem-OSINT/1.0" },
            signal: AbortSignal.timeout(4000),
          });
          if (ghRes.ok) {
            const d = await ghRes.json();
            enrichment.github = { found: true, username, displayName: d.name, bio: d.bio, publicRepos: d.public_repos };
          }
        } catch {}
      }
      if (!enrichment.keybase) {
        try {
          const kbRes = await fetch(`https://keybase.io/${username}/pic`, {
            method: "HEAD",
            signal: AbortSignal.timeout(4000),
          });
          if (kbRes.ok) enrichment.keybase = { found: true, username };
        } catch {}
      }
      if (enrichment.github && enrichment.keybase) break;
    }

    res.json(enrichment);
  } catch (err) {
    res.status(500).json({ error: "Enrichment failed" });
  }
}
