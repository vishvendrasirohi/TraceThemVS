import express from "express";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(cors());

const {
  SP_MERCHANT_ID = "YOUR_MERCHANT_ID",
  SP_API_KEY = "YOUR_API_KEY",
  SP_SECRET_KEY = "YOUR_SECRET_KEY",
  SP_ENV = "production",
  SP_RETURN_URL = "https://tracethem.online/payment/result",
  PORT = "3001",
} = process.env;

const SABPAISA_API =
  SP_ENV === "production"
    ? "https://merchant-api.sabpaisa.in/api/v2/payments"
    : "https://staging-sb-merchant-api.sabpaisa.in/api/v2/payments";

function generateChecksum(merchantId, merchantTxnId, amount, currency, timestamp) {
  const base = `${merchantId}|${merchantTxnId}|${amount}|${currency}|${timestamp}`;
  return crypto.createHmac("sha256", SP_SECRET_KEY).update(base, "utf8").digest("hex").toLowerCase();
}

// ── Payment Session ───────────────────────────────────────────────────────────
app.post("/api/create-payment", async (req, res) => {
  try {
    const { amount, type, customerName, customerEmail, customerPhone } = req.body;
    if (!amount || !type) return res.status(400).json({ error: "amount and type are required" });

    const prefix = type === "reveal" ? "TRC" : "WIPE";
    const merchantTxnId = `${prefix}_${Date.now()}`;
    const amountPaise = Math.round(Number(amount) * 100);
    const currency = "INR";
    const timestamp = Math.floor(Date.now() / 1000);
    const checksum = generateChecksum(SP_MERCHANT_ID, merchantTxnId, amountPaise, currency, timestamp);

    // In dev (localhost), derive return URL from request origin
    const requestOrigin = req.headers.origin || "";
    const isLocalDev = requestOrigin.includes("localhost") || requestOrigin.includes("127.0.0.1");
    const baseReturnUrl = isLocalDev ? `${requestOrigin}/payment/result` : SP_RETURN_URL;
    const returnUrl = `${baseReturnUrl}?type=${type}&merchantTxnId=${merchantTxnId}`;

    const payload = {
      merchantId: SP_MERCHANT_ID,
      merchantTxnId,
      amount: amountPaise,
      currency,
      customerName: customerName || "User",
      customerEmail: customerEmail || "user@tracethem.online",
      customerPhone: customerPhone || "9999999999",
      returnUrl,
      checksum,
      timestamp,
    };

    const sabRes = await fetch(SABPAISA_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": SP_API_KEY },
      body: JSON.stringify(payload),
    });
    const sabData = await sabRes.json();

    if (!sabRes.ok || !sabData.checkoutUrl) {
      console.error("SabPaisa API error:", sabRes.status, sabData);
      return res.status(502).json({ error: "Failed to create payment session", details: sabData });
    }

    const checkoutUrl = sabData.clientSecret
      ? `${sabData.checkoutUrl}?clientSecret=${sabData.clientSecret}`
      : sabData.checkoutUrl;

    res.json({ checkoutUrl, paymentId: sabData.paymentId, merchantTxnId });
  } catch (err) {
    console.error("Payment session creation failed:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── OSINT Enrichment (free public checks, no API keys required) ──────────────
app.post("/api/osint-enrich", async (req, res) => {
  try {
    const { email, name, aliases } = req.body;
    const enrichment = { gravatar: false, github: null, keybase: null, emailDomain: null };

    // 1. Gravatar — MD5 email hash, d=404 returns 404 if no avatar
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
      } catch { /* timeout / network */ }
    }

    // 2. GitHub & 3. Keybase — try name and aliases as usernames
    const rawNames = [name, ...(aliases || "").split(",").map((s) => s.trim())].filter(Boolean);
    const usernames = rawNames.map((n) =>
      n.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9-]/g, "").slice(0, 39)
    ).filter((u) => u.length >= 3);

    for (const username of usernames.slice(0, 4)) {
      if (!enrichment.github) {
        try {
          const ghRes = await fetch(`https://api.github.com/users/${username}`, {
            headers: { "User-Agent": "TraceThem-OSINT/1.0" },
            signal: AbortSignal.timeout(4000),
          });
          if (ghRes.ok) {
            const ghData = await ghRes.json();
            enrichment.github = {
              found: true,
              username,
              displayName: ghData.name,
              bio: ghData.bio,
              publicRepos: ghData.public_repos,
              avatarUrl: ghData.avatar_url,
            };
          }
        } catch { /* timeout */ }
      }

      if (!enrichment.keybase) {
        try {
          const kbRes = await fetch(`https://keybase.io/${username}/pic`, {
            method: "HEAD",
            signal: AbortSignal.timeout(4000),
          });
          if (kbRes.ok) enrichment.keybase = { found: true, username };
        } catch { /* timeout */ }
      }

      if (enrichment.github && enrichment.keybase) break;
    }

    res.json(enrichment);
  } catch (err) {
    console.error("OSINT enrichment failed:", err);
    res.status(500).json({ error: "Enrichment failed" });
  }
});

// ── Static frontend ───────────────────────────────────────────────────────────
const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));
app.get("/{*splat}", (req, res) => res.sendFile(path.join(distPath, "index.html")));

app.listen(Number(PORT), () => console.log(`Server running on http://localhost:${PORT}`));
