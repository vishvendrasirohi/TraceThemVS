#!/usr/bin/env node
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');

// ─── Config ───────────────────────────────────────────────────────────────────
const SSH_USER = 'u693315873';
const SSH_HOST = '89.117.188.213';
const SSH_PORT = '65002';
const REMOTE_BLOG_DIR = '/home/u693315873/domains/tracethem.online/public_html/blog';
const SITE_URL = 'https://tracethem.online';

// SSH key: either a file path (local) or a raw private key (GitHub Actions secret)
let SSH_KEY_FILE = null;
function getSshKeyFile() {
  if (SSH_KEY_FILE) return SSH_KEY_FILE;
  if (process.env.SSH_PRIVATE_KEY) {
    // Write raw key from env to a temp file (GitHub Actions)
    const tmp = path.join(os.tmpdir(), 'ht_key');
    fs.writeFileSync(tmp, process.env.SSH_PRIVATE_KEY.replace(/\\n/g, '\n'), { mode: 0o600 });
    SSH_KEY_FILE = tmp;
  } else {
    SSH_KEY_FILE = process.env.SSH_KEY_PATH || 'C:/Users/ADMIN/.ssh/tracethem_hostinger';
  }
  return SSH_KEY_FILE;
}

// ─── Topic Pool ───────────────────────────────────────────────────────────────
const TOPICS = [
  // ── Shameless / Direct (English) ──────────────────────────────────────────
  {
    slug: 'husband-tinder-india-caught',
    title: 'My Husband Was on Tinder While I Was Pregnant — The Truth I Found in 60 Seconds',
    angle: 'wife 7 months pregnant discovers husband actively using Tinder. Raw, emotional first-person story. No filter. Ends with how she verified silently using TraceThem. The ugly truth of modern Indian marriages.',
    keywords: ['husband on tinder india', 'check if husband is on tinder', 'cheating husband india'],
    lang: 'en',
  },
  {
    slug: 'boyfriend-gleeden-affair-india',
    title: 'He Was Calling Me "Jaan" While Messaging Other Women on Gleeden',
    angle: 'girlfriend discovers long-term boyfriend of 3 years has premium Gleeden membership for affairs. Story-driven, raw dialogue, red flags she missed. How she ran a silent check.',
    keywords: ['boyfriend on gleeden india', 'affair app india boyfriend', 'gleeden india check partner'],
    lang: 'en',
  },
  {
    slug: 'shaadi-match-fake-job-income',
    title: 'He Said He Earned ₹2 Lakh/Month — His LinkedIn Told a Different Story',
    angle: 'arranged marriage proposal lies about income and job title on Shaadi.com. Family finds out after running a digital check. Income fraud in matrimonial sites is rampant. Real story.',
    keywords: ['fake income shaadi.com', 'matrimonial profile lies income india', 'verify groom income india'],
    lang: 'en',
  },
  {
    slug: 'wife-dating-apps-india-discovery',
    title: 'I Found My Wife on 3 Dating Apps — After 6 Years of Marriage',
    angle: 'husband discovers wife is active on Tinder, Bumble and Aisle using a slightly different name. Mid-life affair. How Indian men are quietly checking. No judgement, just the truth.',
    keywords: ['wife on dating apps india', 'check wife dating profile india', 'married woman on tinder india'],
    lang: 'en',
  },
  {
    slug: 'nri-groom-double-life-india',
    title: 'The NRI Groom Had a Girlfriend in Canada — Our Family Found Out 3 Days Before the Wedding',
    angle: 'NRI groom had an active relationship abroad while getting engaged in India. Family discovers via digital footprint check. Common NRI marriage fraud in India. What to verify before saying yes.',
    keywords: ['nri groom fraud india', 'nri groom background check', 'verify nri groom before marriage'],
    lang: 'en',
  },
  {
    slug: 'fiance-on-tinder-week-before-wedding',
    title: 'His Tinder Bio Said "Single and Ready" — Our Wedding Was in 7 Days',
    angle: 'bride discovers fiance is still active on Tinder a week before the wedding. Devastation, confrontation, what happened next. Practical guide on pre-wedding digital check.',
    keywords: ['fiance on tinder before wedding', 'partner on dating app before marriage india', 'pre wedding check india'],
    lang: 'en',
  },
  {
    slug: 'employee-fake-degree-india',
    title: 'He Showed a Degree From Delhi University — The University Had No Record of Him',
    angle: 'startup hires employee with fake credentials. How a simple digital check could have saved them. Fake degree fraud in Indian hiring is growing. How to verify before you hire.',
    keywords: ['employee fake degree india', 'verify employee credentials india', 'fake certificate fraud india hiring'],
    lang: 'en',
  },
  {
    slug: 'catfishing-matrimonial-india-real-cases',
    title: 'She Was "Riya, 26, Doctor from Mumbai" — He Was a 45-Year-Old Man in Lucknow',
    angle: 'catfishing on Indian matrimonial sites. Real case narrative. Fake photos, fake profession, fake city. How victims lost money and dignity. How to verify before meeting or trusting anyone.',
    keywords: ['catfishing india matrimonial', 'fake profile matrimonial site india', 'shaadi bharat matrimony fake profiles'],
    lang: 'en',
  },
  {
    slug: 'jamai-hidden-dating-profile-india',
    title: 'Our Jamai Was on Tinder 2 Months After the Wedding — Sasuraal Found Out',
    angle: 'in-laws discover son-in-law has active dating profiles 2 months into marriage. Modern Indian family navigating digital betrayal. What to check before and after marriage.',
    keywords: ['jamai on tinder india', 'check son in law dating app', 'jamai background check india'],
    lang: 'en',
  },
  {
    slug: 'bahu-secret-past-dating-history',
    title: 'The Bahu Everyone Loved Had a Secret — Her Dating History Was All Over the Internet',
    angle: 'family discovers daughter-in-law had extensive online dating past that was misrepresented during rishta talks. No shame in past, but lies are a red flag. How families can quietly verify.',
    keywords: ['bahu background check india', 'verify bahu before marriage', 'daughter in law dating history india'],
    lang: 'en',
  },
  {
    slug: 'love-marriage-partner-secret-tinder',
    title: 'We Were in a "Serious" Relationship for 2 Years — He Never Deleted Tinder',
    angle: 'love relationship where partner maintains active dating profiles throughout. Modern disloyalty patterns. The normalization of keeping "options open." How to verify without asking them.',
    keywords: ['partner still on tinder india', 'boyfriend not deleting dating apps', 'verify serious relationship india'],
    lang: 'en',
  },
  {
    slug: 'self-search-digital-footprint-india',
    title: 'I Searched My Own Name and Found My Old Dating Profiles From 2019 — Still Active',
    angle: 'person discovers their old dating and adult profiles are still indexed and visible. Wipe My Trace pitch. Privacy risks. How stalkers, exes, or future in-laws can find this. Take control.',
    keywords: ['search myself online india', 'old dating profile still active india', 'remove digital footprint india'],
    lang: 'en',
  },
  {
    slug: 'reddit-india-cheating-discovery-stories',
    title: 'Real Reddit Stories From r/india: "I Checked His Phone and Found 4 Active Dating Profiles"',
    angle: 'compilation format of real r/india and r/IndianRelationships posts about digital discovery of cheating. Anonymized but realistic. Add TraceThem as the smarter, non-invasive alternative to phone snooping.',
    keywords: ['reddit india cheating partner', 'r/india infidelity story', 'indian relationship cheating discovered'],
    lang: 'en',
  },
  {
    slug: 'affair-murder-india-news-angle',
    title: 'When the Affair Nobody Knew About Turned Into a Crime — Why India Needs Digital Verification',
    angle: 'news angle — high-profile Indian cases where hidden affairs led to violence or tragedy. Names anonymized. The pattern: nobody knew. The fix: check before you commit emotionally or legally.',
    keywords: ['affair crime india news', 'hidden affair india tragedy', 'verify partner india safety'],
    lang: 'en',
  },
  {
    slug: 'online-dating-india-7-checks',
    title: '7 Things You Must Secretly Check Before Meeting Your Tinder/Bumble Match in India',
    angle: 'practical listicle — safety checks before meeting an online match. Each point ends with how TraceThem makes it easy. Targeted at young urban Indians who date online.',
    keywords: ['tinder date safety check india', 'verify dating match india', 'online dating safety india tips'],
    lang: 'en',
  },

  // ── Pure Hindi ─────────────────────────────────────────────────────────────
  {
    slug: 'pati-tinder-pe-tha-hindi',
    title: 'पति Tinder पर था — और मुझे 7 महीने बाद पता चला',
    angle: 'पत्नी की नजरिए से पहले व्यक्ति में कहानी। पति का Tinder profile मिला। भावनात्मक, raw, सच्ची-लगने वाली कहानी। Hindi में पूरा article। TraceThem से चुपके से verify करने का तरीका।',
    keywords: ['पति tinder पर है कैसे पता करें', 'husband tinder check hindi', 'pati ka tinder profile kaise check karein'],
    lang: 'hi',
  },
  {
    slug: 'shaadi-se-pehle-ladke-ki-jaanch-hindi',
    title: 'शादी से पहले लड़के की Digital Life Check क्यों करनी चाहिए — एक जरूरी गाइड',
    angle: 'Hindi guide for families doing rishta checks. Why physical background checks are not enough. What digital platforms reveal. Step by step TraceThem usage. Formal Hindi tone, family-friendly but direct.',
    keywords: ['shaadi se pehle background check hindi', 'ladke ki jaanch kaise karein', 'rishta check karne ka tarika'],
    lang: 'hi',
  },
  {
    slug: 'boyfriend-dating-app-par-tha-hindi',
    title: 'मेरा Boyfriend 3 साल से Relationship में था और Gleeden पर भी Active था',
    angle: 'Hindi first-person story. Girlfriend discovers long-term boyfriend on affair platform. Emotional, raw Hindi narrative with real dialogues. How she found out using TraceThem.',
    keywords: ['boyfriend gleeden par hai', 'partner dating app par hai kaise pata karein', 'cheating boyfriend hindi'],
    lang: 'hi',
  },
  {
    slug: 'nri-dulha-fraud-hindi',
    title: 'NRI दूल्हा निकला धोखेबाज — शादी से 10 दिन पहले सच सामने आया',
    angle: 'NRI groom fraud in Hindi. Family discovers groom had active dating profiles and possibly another relationship abroad. How they found out. What you should check before agreeing to any rishta.',
    keywords: ['nri dulha fraud hindi', 'nri se shaadi se pehle check karo', 'nri groom verify kaise karein'],
    lang: 'hi',
  },
  {
    slug: 'biwi-dating-app-par-thi-hindi',
    title: 'पत्नी Tinder और Bumble दोनों पर थी — 4 साल की शादी के बाद सच का सामना',
    angle: 'husband discovers wife on multiple dating apps after 4 years of marriage. Hindi emotional narrative. How it destroyed and rebuilt the family. How Indian men can silently verify without confrontation.',
    keywords: ['biwi tinder par hai', 'patni dating app check hindi', 'wife cheating kaise pata karein hindi'],
    lang: 'hi',
  },
  {
    slug: 'jamai-ki-secret-life-hindi',
    title: 'जमाई की Secret Digital Life — ससुराल को शादी के बाद पता चला',
    angle: 'in-laws discover son-in-law had active dating profiles after marriage. Hindi family drama. What signals they missed. How Indian families can verify jamai ke baare mein before or after marriage.',
    keywords: ['jamai ki jaanch kaise karein', 'son in law tinder hindi', 'shaadi ke baad jamai check'],
    lang: 'hi',
  },
  {
    slug: 'catfishing-matrimonial-hindi',
    title: 'BharatMatrimony पर वो "Doctor" निकला Fraud — असली कहानी',
    angle: 'Hindi catfishing story on BharatMatrimony. Fake doctor profile. Family loses money, gets emotionally devastated. How to verify any matrimonial match in 60 seconds before it is too late.',
    keywords: ['bharatmatrimony fake profile hindi', 'matrimonial site catfishing hindi', 'rishta fraud kaise pata karein'],
    lang: 'hi',
  },
  {
    slug: 'khud-ko-search-karo-hindi',
    title: 'खुद को Google पर Search करो — आपको जो मिलेगा वो डरा देगा',
    angle: 'Hindi self-trace article. Person discovers their own old profiles, photos, dating accounts still visible. Privacy horror. Wipe My Trace pitch in Hindi. Who can see your digital past.',
    keywords: ['khud ko online search karo', 'apna digital footprint kaise hatayein', 'purana dating profile delete kaise karein'],
    lang: 'hi',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todaySlot() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const hour = now.getUTCHours(); // UTC for GitHub Actions consistency
  const slot = hour < 12 ? 'am' : 'pm';
  return { dateStr, slot };
}

function pickTopic(dateStr, slot) {
  const seed = dateStr.replace(/-/g, '') + (slot === 'am' ? 0 : 1);
  const idx = parseInt(seed) % TOPICS.length;
  return TOPICS[idx];
}

function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 2500, temperature: 1.0 },
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (j.error) return reject(new Error(j.error.message));
          resolve(j.candidates[0].content.parts[0].text);
        } catch (e) {
          reject(new Error(`Gemini error: ${data.slice(0, 300)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function buildPrompt(topic, dateStr) {
  const isHindi = topic.lang === 'hi';
  if (isHindi) {
    return `आप TraceThem (tracethem.online) के लिए एक content writer हैं। TraceThem एक Indian OSINT tool है जो Tinder, Gleeden, Shaadi.com, BharatMatrimony, LinkedIn, Instagram समेत 50+ platforms को silently scan करता है। कीमत: ₹79 प्रति report। कोई notification नहीं जाती।

नीचे दिए topic पर एक पूरा SEO blog post HTML में लिखें (सिर्फ body content, कोई <html>/<head> नहीं):

TITLE: ${topic.title}
ANGLE: ${topic.angle}
TARGET KEYWORDS: ${topic.keywords.join(', ')}
DATE: ${dateStr}

REQUIREMENTS:
- 700-900 शब्द, Hindi में
- Real लगने वाली story से शुरू करें — first person या third person, emotionally strong
- 1-2 Reddit r/india या r/IndianRelationships के real-feeling quotes शामिल करें — जैसे "Priya, 29, Jaipur ने r/IndianRelationships पर लिखा: ..."
- TraceThem को 1-2 बार naturally mention करें — spammy नहीं
- CTA section: "tracethem.online पर silent scan करें — ₹79, उन्हें कोई notification नहीं मिलेगी।"
- End में FAQ section (3-4 questions) schema-ready structure के साथ
- <h2>, <h3>, <p>, <ul>, <li> tags use करें — clean HTML
- <section class="faq"> at the end with <div class="faq-item"> containing <h3> and <p>
- कोई markdown नहीं, कोई \`\`\`html नहीं

सिर्फ HTML content output करें, <article> tag से शुरू करें।`;
  }

  return `You are a no-bullshit content writer for TraceThem (tracethem.online) — an Indian OSINT people-search tool that silently scans 50+ platforms including Tinder, Gleeden, Shaadi.com, BharatMatrimony, LinkedIn, Instagram and more. Price: ₹79 per report. Zero notifications sent to the target.

The tone is raw, real, like a close friend who has seen the worst of relationships and is telling the ugly truth. No corporate speak. No sanitizing. This is the content that people share at 2am when they can't sleep.

Write a full SEO blog post in HTML (body content only, no <html>/<head> tags) for:

TITLE: ${topic.title}
ANGLE: ${topic.angle}
TARGET KEYWORDS: ${topic.keywords.join(', ')}
DATE: ${dateStr}

REQUIREMENTS:
- 750–950 words
- Open with a visceral story hook — real names (Rahul, Priya, Meera, Arjun, etc.), specific details, real emotions. No "once upon a time" softness.
- Include 1-2 Reddit-style quotes: "Meera, 31, Pune shared on r/IndianRelationships: [realistic quote]"
- Reference current Indian social reality — arranged marriage pressure, NRI fraud, matrimonial app scams, affairs going mainstream
- Mention TraceThem naturally 1-2 times as the solution — not like an ad
- CTA near end: "Run a silent scan at tracethem.online — ₹79. They'll never know you checked."
- End with FAQ section (3-4 Qs) using <section class="faq"> with <div class="faq-item"> → <h3> + <p>
- Use <h2>, <h3>, <p>, <ul>, <li> — clean HTML
- Sprinkle Hindi words naturally: yaar, bhai, rishta, shaadi, sasuraal, jamai, bahu — not forced
- Do NOT include markdown or \`\`\`html wrappers

Output ONLY the HTML content starting from <article> tag.`;
}

function wrapInPage(title, slug, content, topic, dateStr) {
  const isHindi = topic.lang === 'hi';
  const desc = isHindi
    ? `${title} — भारत की असली कहानी। TraceThem से silently verify करें। ₹79, कोई notification नहीं।`
    : `${title} — Real story from India. Silently verify a partner, match, or employee using TraceThem. ₹79, no notification sent.`;
  const htmlLang = isHindi ? 'hi' : 'en';
  const ctaText = isHindi
    ? `Silent scan करें — Tinder, Gleeden, Shaadi & 50+ platforms। <strong>₹79। उन्हें कोई notification नहीं मिलेगी।</strong>`
    : `Run a silent scan — Tinder, Gleeden, Shaadi & 50+ platforms. <strong>₹79. No notification sent to them.</strong>`;
  const ctaBtn = isHindi ? 'अभी Check करें →' : 'Check Now →';

  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} | TraceThem Blog</title>
<meta name="description" content="${desc}">
<meta name="keywords" content="${topic.keywords.join(', ')}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${SITE_URL}/og-preview.png">
<meta property="og:url" content="${SITE_URL}/blog/${slug}.html">
<meta property="og:type" content="article">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${SITE_URL}/blog/${slug}.html">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"BlogPosting","headline":${JSON.stringify(title)},"datePublished":"${dateStr}","author":{"@type":"Organization","name":"TraceThem"},"publisher":{"@type":"Organization","name":"TraceThem","url":"${SITE_URL}"},"description":${JSON.stringify(desc)},"url":"${SITE_URL}/blog/${slug}.html","inLanguage":"${htmlLang}"}
</script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f172a;color:#cbd5e1;line-height:1.8;font-size:16px}
header{background:#0f172a;border-bottom:1px solid rgba(255,255,255,0.07);padding:14px 24px;display:flex;align-items:center;justify-content:space-between}
header a.logo{color:#fff;text-decoration:none;font-weight:700;font-size:15px}
header nav a{color:#94a3b8;font-size:13px;margin-left:20px;text-decoration:none}
header nav a:hover{color:#fff}
main{max-width:720px;margin:0 auto;padding:40px 20px 80px}
h1{color:#f1f5f9;font-size:1.9rem;font-weight:700;line-height:1.3;margin-bottom:14px}
.meta{color:#64748b;font-size:13px;margin-bottom:36px;padding-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.05)}
article h2{color:#e2e8f0;font-size:1.25rem;font-weight:600;margin:36px 0 10px}
article h3{color:#cbd5e1;font-size:1.05rem;font-weight:600;margin:22px 0 8px}
article p{margin-bottom:18px;color:#94a3b8}
article ul,article ol{margin:10px 0 20px 24px;color:#94a3b8}
article li{margin-bottom:8px}
article blockquote{border-left:3px solid #4f46e5;padding:12px 18px;margin:20px 0;background:#1e293b;border-radius:0 8px 8px 0;font-style:italic;color:#a5b4fc}
.cta-box{background:#1e1b4b;border:1px solid #4338ca;border-radius:14px;padding:28px 32px;margin:40px 0;text-align:center}
.cta-box p{color:#a5b4fc;margin-bottom:18px;font-size:1rem}
.cta-box a{background:#4f46e5;color:#fff;padding:13px 32px;border-radius:9px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;letter-spacing:.01em}
.cta-box a:hover{background:#4338ca}
.faq{margin-top:44px;border-top:1px solid rgba(255,255,255,0.07);padding-top:32px}
.faq>h2{color:#e2e8f0;font-size:1.15rem;margin-bottom:20px}
.faq-item{margin-bottom:16px;padding:16px 20px;background:#1e293b;border-radius:10px;border:1px solid rgba(255,255,255,0.05)}
.faq-item h3{color:#c7d2fe;font-size:.95rem;margin-bottom:8px}
.faq-item p{color:#94a3b8;font-size:14px;margin:0}
footer{text-align:center;padding:24px;color:#475569;font-size:13px;border-top:1px solid rgba(255,255,255,0.05);margin-top:40px}
footer a{color:#6366f1;text-decoration:none}
@media(max-width:600px){h1{font-size:1.5rem}main{padding:24px 16px 60px}.cta-box{padding:20px 20px}}
</style>
</head>
<body>
<header>
  <a class="logo" href="${SITE_URL}">🔍 TraceThem</a>
  <nav>
    <a href="${SITE_URL}">Run a Scan</a>
    <a href="${SITE_URL}/blog/">Blog</a>
  </nav>
</header>
<main>
  <h1>${title}</h1>
  <p class="meta">Published ${dateStr} · TraceThem · Public records only · Legal</p>
  ${content}
  <div class="cta-box">
    <p>${ctaText}</p>
    <a href="${SITE_URL}">${ctaBtn}</a>
  </div>
</main>
<footer>
  &copy; ${new Date().getFullYear()} <a href="${SITE_URL}">TraceThem</a> · <a href="${SITE_URL}/blog/">All Articles</a>
</footer>
</body>
</html>`;
}

function ssh(cmd) {
  return execSync(
    `ssh -i "${getSshKeyFile()}" -p ${SSH_PORT} -o StrictHostKeyChecking=no -o BatchMode=yes ${SSH_USER}@${SSH_HOST} "${cmd}"`,
    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
  );
}

function scpUpload(localPath, remotePath) {
  execSync(
    `scp -i "${getSshKeyFile()}" -P ${SSH_PORT} -o StrictHostKeyChecking=no -o BatchMode=yes "${localPath}" ${SSH_USER}@${SSH_HOST}:"${remotePath}"`,
    { stdio: 'inherit' }
  );
}

function updateBlogIndex() {
  const list = ssh(`ls ${REMOTE_BLOG_DIR}/*.html 2>/dev/null | grep -v index.html | sort -r | head -100`).trim();
  if (!list) return;
  const files = list.split('\n').map(f => path.basename(f, '.html'));
  const items = files.map(s => {
    const parts = s.split('-');
    const date = parts.slice(0, 3).join('-');
    const rawTitle = parts.slice(3).join('-');
    // Try to get readable title — keep hyphens as spaces
    const displayTitle = rawTitle.replace(/-/g, ' ');
    return `<li><a href="${s}.html">${displayTitle} <span class="date">${date}</span></a></li>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Blog — TraceThem | Digital Verification Stories & Guides India</title>
<meta name="description" content="Real stories and guides on digital verification in India — partners, matrimonial matches, employees. Hindi and English.">
<link rel="canonical" href="${SITE_URL}/blog/">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f172a;color:#cbd5e1;line-height:1.75}
header{background:#0f172a;border-bottom:1px solid rgba(255,255,255,0.07);padding:14px 24px;display:flex;align-items:center;justify-content:space-between}
header a.logo{color:#fff;text-decoration:none;font-weight:700;font-size:15px}
header nav a{color:#94a3b8;font-size:13px;margin-left:20px;text-decoration:none}
main{max-width:720px;margin:0 auto;padding:48px 20px 80px}
h1{color:#f1f5f9;font-size:1.8rem;font-weight:700;margin-bottom:8px}
.sub{color:#64748b;font-size:14px;margin-bottom:36px}
ul{list-style:none}
li{margin-bottom:0;padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.05)}
li a{color:#a5b4fc;text-decoration:none;font-size:.95rem;font-weight:500;display:block}
li a:hover{color:#fff}
.date{color:#475569;font-size:11px;margin-left:8px;font-weight:400}
footer{text-align:center;padding:24px;color:#475569;font-size:13px;border-top:1px solid rgba(255,255,255,0.05)}
footer a{color:#6366f1;text-decoration:none}
</style>
</head>
<body>
<header>
  <a class="logo" href="${SITE_URL}">🔍 TraceThem</a>
  <nav><a href="${SITE_URL}">Run a Scan</a></nav>
</header>
<main>
  <h1>Blog</h1>
  <p class="sub">Real stories and guides — Hindi &amp; English. Digital verification in India.</p>
  <ul>${items}</ul>
</main>
<footer>&copy; ${new Date().getFullYear()} <a href="${SITE_URL}">TraceThem</a></footer>
</body>
</html>`;

  const tmp = path.join(os.tmpdir(), 'blog-index.html');
  fs.writeFileSync(tmp, html);
  scpUpload(tmp, `${REMOTE_BLOG_DIR}/index.html`);
  fs.unlinkSync(tmp);
  console.log('Blog index updated.');
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const { dateStr, slot } = todaySlot();
  const topic = pickTopic(dateStr, slot);
  const slug = `${dateStr}-${topic.slug}`;
  const remoteFile = `${REMOTE_BLOG_DIR}/${slug}.html`;

  // Skip if already published
  try {
    ssh(`test -f ${remoteFile}`);
    console.log(`Already published: ${slug} — skipping.`);
    return;
  } catch {}

  console.log(`[${dateStr} ${slot}] Topic: ${topic.title}`);
  const html = await callGemini(buildPrompt(topic, dateStr));
  const page = wrapInPage(topic.title, slug, html, topic, dateStr);

  const tmp = path.join(os.tmpdir(), `${slug}.html`);
  fs.writeFileSync(tmp, page);
  scpUpload(tmp, remoteFile);
  fs.unlinkSync(tmp);

  updateBlogIndex();
  console.log(`Published: ${SITE_URL}/blog/${slug}.html`);
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
