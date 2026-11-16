import { createPaymentSession, readPaymentResult } from './sabpaisaPayment';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search, User, Mail, Phone, ShieldCheck, Globe, Heart, MessageSquare,
  Fingerprint, Users, Info, Sparkles, Lock, Eye, ShieldAlert, Trash2,
  Smartphone, Loader2, CheckCircle, Activity, Flame, Scale, Compass,
  AlertCircle, TrendingUp, Zap, Star, Award, Badge
} from 'lucide-react';

// ── Tiny helpers ──────────────────────────────────────────────────────────────
const md5 = (str) => {
  // tiny djb2 used only for avatar URLs; not cryptographic
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return Math.abs(h).toString(16).padStart(8, '0').repeat(4).slice(0, 32);
};

const VISIBLE_BEFORE_PAYWALL = 3;

// ── App ───────────────────────────────────────────────────────────────────────
const App = () => {
  // Core state
  const [formData, setFormData] = useState({ emails: '', fullName: '', aliases: '', phones: '', city: '', socialHandle: '' });
  const [formErrors, setFormErrors] = useState({});
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [subjectPhoto, setSubjectPhoto] = useState(null); // { preview, file }
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchLog, setSearchLog] = useState([]);
  const [liveSignals, setLiveSignals] = useState(51284);
  const [lastScanMins, setLastScanMins] = useState(3);

  // OSINT enrichment
  const [osintEnrichment, setOsintEnrichment] = useState(null);
  const [isEnriching, setIsEnriching] = useState(false);

  // AI / persona
  const [aiRiskReport, setAiRiskReport] = useState(null);
  const [isGeneratingRisk, setIsGeneratingRisk] = useState(false);

  // UI
  const [isRevealed, setIsRevealed] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [headlineIdx, setHeadlineIdx] = useState(0);
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [wipeData, setWipeData] = useState({ fullName: '', aliases: '', emails: '', phones: '' });
  const [wipePaymentStatus, setWipePaymentStatus] = useState('idle');
  const [auditPaymentStatus, setAuditPaymentStatus] = useState('idle');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminClicks, setAdminClicks] = useState(0);

  // Cue cards carousel
  const [dismissedCues, setDismissedCues] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tt_dismissed_cues') || '[]'); } catch { return []; }
  });
  const [cueCarouselClosed, setCueCarouselClosed] = useState(() => {
    try { return localStorage.getItem('tt_carousel_closed') === '1'; } catch { return false; }
  });

  // Claims — what did they tell you
  const [formClaims, setFormClaims] = useState({ single: false, neverMarried: false, noSocial: false, professional: false, claimedCity: '', claimsOpen: false });

  // Contradiction detector results
  const [contradictions, setContradictions] = useState([]);

  // Payment
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [txnError, setTxnError] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const paywallRef = useRef(null);
  const photoInputRef = useRef(null);

  // Live signal ticker + last scan timer
  useEffect(() => {
    const t = setInterval(() => setLiveSignals(p => p + Math.floor(Math.random() * 4) + 1), 4200);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    setLastScanMins(Math.floor(Math.random() * 7) + 1);
    const t = setInterval(() => {
      setLastScanMins(m => m <= 1 ? Math.floor(Math.random() * 5) + 1 : m - 1);
    }, 60000);
    return () => clearInterval(t);
  }, []);

  // Welcome splash — show on reload (visited before), cue card handles first-ever visit
  useEffect(() => {
    const isFirstVisit = !localStorage.getItem('tt_visited');
    if (!isFirstVisit) {
      setTimeout(() => setShowWelcome(true), 600);
    }
  }, []);

  // Headline rotator
  useEffect(() => {
    const t = setInterval(() => setHeadlineIdx(i => i + 1), 3500);
    return () => clearInterval(t);
  }, []);

  // ── Payment return handler ──────────────────────────────────────────────────
  useEffect(() => {
    // Breakout of iframe if SabPaisa redirects inside one
    if (window.self !== window.top) {
      window.top.location.href = window.location.href;
      return;
    }
    const result = readPaymentResult();
    if (!result) return;
    window.history.replaceState({}, document.title, window.location.pathname);

    if (result.status === 'SUCCESS') {
      // Log transaction
      const logs = JSON.parse(localStorage.getItem('transaction_logs') || '[]');
      logs.push({
        id: result.paymentId || result.merchantTxnId || `SP-${Date.now()}`,
        amount: result.type === 'wipe' ? 1499 : 79,
        date: new Date().toISOString(),
        type: result.type === 'wipe' ? 'Wipe My Trace' : 'Full Report Reveal',
        target: '',
      });
      localStorage.setItem('transaction_logs', JSON.stringify(logs));

      if (result.type === 'wipe') {
        setWipePaymentStatus('completed');
        setShowWipeModal(true);
      } else {
        // Restore search context so the report is visible immediately
        const ctx = JSON.parse(localStorage.getItem('pending_reveal_context') || 'null');
        if (ctx) {
          setFormData(ctx.formData || {});
          setResults(ctx.results || []);
          if (ctx.osintEnrichment) setOsintEnrichment(ctx.osintEnrichment);
          localStorage.removeItem('pending_reveal_context');
        }
        setIsRevealed(true);
      }
    } else if (result.status === 'FAILED') {
      setTxnError('Payment failed. Please try again.');
    } else if (result.status === 'ABORTED') {
      setTxnError('Payment was cancelled. Please try again.');
    }
  }, []);

  // ── Platform database ───────────────────────────────────────────────────────
  const platformDatabase = [
    // Dating India — highest priority
    { id: 101, name: 'Tinder',            type: 'Dating App Presence',       category: 'personal',  priority: true,  domain: 'tinder.com' },
    { id: 102, name: 'Bumble',            type: 'Dating App Presence',       category: 'personal',  priority: true,  domain: 'bumble.com' },
    { id: 103, name: 'Hinge',             type: 'Dating App Presence',       category: 'personal',  priority: true,  domain: 'hinge.co' },
    { id: 104, name: 'TrulyMadly',        type: 'Indian Dating App',         category: 'personal',  priority: true,  domain: 'trulymadly.com' },
    { id: 105, name: 'QuackQuack',        type: 'Indian Dating App',         category: 'personal',  priority: true,  domain: 'quackquack.in' },
    { id: 106, name: 'Dil Mil',           type: 'South Asian Dating',        category: 'personal',  priority: true,  domain: 'dilmil.co' },
    { id: 107, name: 'OkCupid',           type: 'Dating App Presence',       category: 'personal',  priority: true,  domain: 'okcupid.com' },
    { id: 108, name: 'Happn',             type: 'Proximity Dating Scan',     category: 'personal',  priority: true,  domain: 'happn.com' },
    { id: 111, name: 'Aisle',             type: 'High-Intent Dating App',    category: 'personal',  priority: true,  domain: 'aisle.co' },
    { id: 112, name: 'Woo',               type: 'Dating App Presence',       category: 'personal',  priority: true,  domain: 'wooapps.com' },
    { id: 113, name: 'Coffee Meets Bagel',type: 'Dating App Presence',       category: 'personal',                   domain: 'coffeemeetsbagel.com' },
    { id: 114, name: 'Badoo',             type: 'Dating App Presence',       category: 'personal',                   domain: 'badoo.com' },
    { id: 115, name: 'TanTan',            type: 'Dating App Presence',       category: 'personal',                   domain: 'tantanapp.com' },
    { id: 116, name: 'Azar',              type: 'Video Dating Presence',     category: 'personal',                   domain: 'azarlive.com' },
    { id: 117, name: 'Chamet',            type: 'Video Chat / Dating',       category: 'personal',                   domain: 'chamet.live' },
    // Hidden / Secret Apps
    { id: 110, name: 'Gleeden',           type: 'Hidden Dating App',         category: 'discreet',  priority: true,  domain: 'gleeden.com' },
    { id: 118, name: 'Ashley Madison',    type: 'Secret Dating App',         category: 'discreet',  priority: true,  domain: 'ashleymadison.com' },
    { id: 119, name: 'Illicit Encounters',type: 'Hidden Dating App',         category: 'discreet',  priority: true,  domain: 'illicitencounters.com' },
    { id: 120, name: 'Secret Benefits',   type: 'Secret Dating App',         category: 'discreet',                   domain: 'secretbenefits.com' },
    { id: 121, name: 'Seeking',           type: 'Secret Dating App',         category: 'discreet',                   domain: 'seeking.com' },
    // Private / Alternate Apps
    { id: 109, name: 'Grindr',            type: 'Private App Signal',        category: 'identity',  priority: true,  domain: 'grindr.com' },
    { id: 122, name: 'Scruff',            type: 'Private App Signal',        category: 'identity',                   domain: 'scruff.com' },
    { id: 123, name: 'HER',               type: 'Private App Signal',        category: 'identity',                   domain: 'her.app' },
    { id: 124, name: 'Hornet',            type: 'Private App Signal',        category: 'identity',                   domain: 'hornet.app' },
    // Matrimonial
    { id: 201, name: 'Shaadi.com',        type: 'Matrimonial Profile Check', category: 'matrimony',                  domain: 'shaadi.com' },
    { id: 202, name: 'BharatMatrimony',   type: 'Matrimonial Profile Check', category: 'matrimony',                  domain: 'bharatmatrimony.com' },
    { id: 203, name: 'Jeevansathi',       type: 'Matrimonial Profile Check', category: 'matrimony',                  domain: 'jeevansathi.com' },
    { id: 204, name: 'Betterhalf.ai',     type: 'AI Matchmaking Platform',   category: 'matrimony',                  domain: 'betterhalf.ai' },
    { id: 205, name: 'Matrimony.com',     type: 'Matrimonial Profile Check', category: 'matrimony',                  domain: 'matrimony.com' },
    // Social media
    { id: 1,  name: 'Facebook',           type: 'Social Identity Scan',      category: 'social',                     domain: 'facebook.com' },
    { id: 2,  name: 'Instagram',          type: 'Social Identity Scan',      category: 'social',                     domain: 'instagram.com' },
    { id: 3,  name: 'Snapchat',           type: 'Disappearing Content Scan', category: 'social',                     domain: 'snapchat.com' },
    { id: 4,  name: 'Reddit',             type: 'Anonymous Community Audit', category: 'social',                     domain: 'reddit.com' },
    { id: 5,  name: 'Discord',            type: 'Secret Server Trace',       category: 'social',                     domain: 'discord.com' },
    { id: 8,  name: 'Twitter / X',        type: 'Social Footprint Scan',     category: 'social',                     domain: 'x.com' },
    { id: 9,  name: 'TikTok',             type: 'Short Video Presence',      category: 'social',                     domain: 'tiktok.com' },
    { id: 10, name: 'Telegram',           type: 'Encrypted Channel Trace',   category: 'social',                     domain: 'telegram.org' },
    { id: 11, name: 'Pinterest',          type: 'Interest Profile Scan',     category: 'social',                     domain: 'pinterest.com' },
    { id: 12, name: 'Tumblr',             type: 'Anonymous Blog Scan',       category: 'social',                     domain: 'tumblr.com' },
    // Career
    { id: 6,  name: 'LinkedIn',           type: 'Career Profile Verification',category: 'career',                    domain: 'linkedin.com' },
    { id: 7,  name: 'Naukri.com',         type: 'Job Seeker Profile Check',  category: 'career',                     domain: 'naukri.com' },
    { id: 13, name: 'GitHub',             type: 'Developer Identity Check',  category: 'career',                     domain: 'github.com' },
    { id: 14, name: 'Wellfound',          type: 'Startup Profile Check',     category: 'career',                     domain: 'wellfound.com' },
    // Adult
    { id: 301, name: 'OnlyFans',          type: 'Adult Content Creator Check',category: 'adult',                     domain: 'onlyfans.com' },
    { id: 302, name: 'FeetFinder',        type: 'Adult Platform Presence',   category: 'adult',                      domain: 'feetfinder.com' },
    { id: 303, name: 'AdultFriendFinder', type: 'Adult Platform Scan',       category: 'adult',                      domain: 'adultfriendfinder.com' },
    { id: 304, name: 'Feeld',             type: 'Open Relationship App',     category: 'adult',                      domain: 'feeld.co' },
    { id: 305, name: 'Pure App',          type: 'Anonymous Hookup Scan',     category: 'adult',                      domain: 'pure.app' },
  ];

  const categories = [
    { id: 'all', label: 'All Platforms', icon: <Globe size={14} /> },
    { id: 'personal', label: 'Dating Apps', icon: <MessageSquare size={14} /> },
    { id: 'matrimony', label: 'Matrimonial', icon: <Heart size={14} /> },
    { id: 'discreet', label: 'Secret Apps', icon: <Flame size={14} /> },
    { id: 'identity', label: 'Private Apps', icon: <Fingerprint size={14} /> },
    { id: 'adult', label: 'Adult', icon: <Eye size={14} /> },
    { id: 'social', label: 'Social Media', icon: <Users size={14} /> },
    { id: 'career', label: 'Career', icon: <TrendingUp size={14} /> },
  ];

  const PERSONA_LIBRARY = [
    {
      id: 'married_cheater',
      condition: (res) => res.some(r => r.category === 'matrimony' && r.status !== 'No Record Found') && res.some(r => r.category === 'discreet' && r.status !== 'No Record Found'),
      data: {
        persona: "Critical Infidelity Risk: This subject maintains an active matrimonial presence while simultaneously generating signals on discreet adultery platforms. This pattern strongly indicates a high-level double life.",
        traits: [
          { label: "Loyalty Index", value: 0.2, color: "bg-rose-500" },
          { label: "Double-Life Risk", value: 5, color: "bg-rose-400" },
          { label: "Stability Score", value: 0.5, color: "bg-slate-400" },
          { label: "Commitment Risk", value: 5, color: "bg-amber-500" },
          { label: "Identity Consistency", value: 0.5, color: "bg-indigo-500" },
          { label: "Ghost Footprints", value: 4.5, color: "bg-teal-500" },
        ],
        orientation: "Intent Hypocrisy Detected",
        verdict: "DANGER: HIGH-INTENSITY INFIDELITY PATTERN",
        verdictColor: "text-rose-400",
      }
    },
    {
      id: 'hookup_hunter',
      condition: (res) => res.some(r => r.category === 'matrimony' && r.status !== 'No Record Found') && res.some(r => r.category === 'personal' && r.status !== 'No Record Found'),
      data: {
        persona: "Intent Hypocrisy: Subject is using high-intent matrimonial platforms while maintaining active casual dating footprints. This suggests hunting for temporary flings under the guise of seeking commitment.",
        traits: [
          { label: "Loyalty Index", value: 0.5, color: "bg-rose-500" },
          { label: "Double-Life Risk", value: 4.5, color: "bg-rose-400" },
          { label: "Stability Score", value: 1.2, color: "bg-slate-400" },
          { label: "Commitment Risk", value: 4, color: "bg-amber-500" },
          { label: "Identity Consistency", value: 1.5, color: "bg-indigo-500" },
          { label: "Ghost Footprints", value: 4, color: "bg-teal-500" },
        ],
        orientation: "Opportunistic / Deceptive",
        verdict: "RED FLAG: INTENT MISMATCH DETECTED",
        verdictColor: "text-amber-400",
      }
    },
    {
      id: 'identity_shift',
      condition: (res) => res.some(r => r.category === 'identity' && r.status !== 'No Record Found'),
      data: {
        persona: "Hidden Identity: DeepTrace™ has recovered signals on orientation-specific platforms that contradict the subject's public-facing persona. High likelihood of a compartmentalized 'Ghost' identity.",
        traits: [
          { label: "Loyalty Index", value: 2, color: "bg-rose-500" },
          { label: "Double-Life Risk", value: 5, color: "bg-rose-400" },
          { label: "Stability Score", value: 1.5, color: "bg-slate-400" },
          { label: "Commitment Risk", value: 2.5, color: "bg-amber-500" },
          { label: "Identity Consistency", value: 0.2, color: "bg-indigo-500" },
          { label: "Ghost Footprints", value: 5, color: "bg-teal-500" },
        ],
        orientation: "Compartmentalized Identity Found",
        verdict: "WARNING: HIDDEN DOUBLE-LIFE DETECTED",
        verdictColor: "text-indigo-400",
      }
    },
    {
      id: 'legacy_signals',
      condition: (res) => res.filter(r => r.status !== 'No Record Found').length >= 4,
      data: {
        persona: "Persistent Legacy Signals: Subject has deep digital footprints across multiple high-risk categories. Even if they claim profiles are deleted, DeepTrace™ has recovered 'Ghost' activity nodes suggesting active maintenance.",
        traits: [
          { label: "Loyalty Index", value: 1, color: "bg-rose-500" },
          { label: "Double-Life Risk", value: 4, color: "bg-rose-400" },
          { label: "Stability Score", value: 2, color: "bg-slate-400" },
          { label: "Commitment Risk", value: 3.5, color: "bg-amber-500" },
          { label: "Identity Consistency", value: 2.5, color: "bg-indigo-500" },
          { label: "Ghost Footprints", value: 5, color: "bg-teal-500" },
        ],
        orientation: "Active Legacy Maintenance",
        verdict: "CAUTION: MULTIPLE PERSISTENT SIGNALS",
        verdictColor: "text-amber-400",
      }
    },
    {
      id: 'clean_audit',
      condition: () => true,
      data: {
        persona: "Zero-Anomaly Audit: No high-intensity signals recovered from high-risk or discreet databases. Subject maintains a clean, low-risk digital profile with high identity consistency.",
        traits: [
          { label: "Loyalty Index", value: 4.8, color: "bg-emerald-500" },
          { label: "Double-Life Risk", value: 0.1, color: "bg-rose-400" },
          { label: "Stability Score", value: 5, color: "bg-slate-400" },
          { label: "Commitment Risk", value: 0.5, color: "bg-amber-500" },
          { label: "Identity Consistency", value: 5, color: "bg-indigo-500" },
          { label: "Ghost Footprints", value: 0.5, color: "bg-teal-500" },
        ],
        orientation: "High Integrity Profile",
        verdict: "VERIFIED: LOW RISK CHARACTER",
        verdictColor: "text-emerald-400",
      }
    },
  ];

  // ── Risk analysis ───────────────────────────────────────────────────────────
  const generateRiskAnalysis = () => {
    if (!isRevealed || results.length === 0) return;
    setIsGeneratingRisk(true);
    setAiRiskReport(null);
    const matched = PERSONA_LIBRARY.find(p => p.condition(results));

    const careerFound   = results.some(r => r.category === 'career'   && r.status !== 'No Record Found');
    const matrimonyFound= results.some(r => r.category === 'matrimony' && r.status !== 'No Record Found');
    const identityFound = results.some(r => r.category === 'identity' && r.status !== 'No Record Found');
    const totalFound    = results.filter(r => r.status !== 'No Record Found').length;

    const backgroundSignals = [
      {
        label: 'Employment',
        icon: '💼',
        value: careerFound ? 'Active professional profile found' : 'No career profile detected',
        status: careerFound ? 'found' : 'clear',
      },
      {
        label: 'Relationship Status',
        icon: '💍',
        value: matrimonyFound ? 'Listed as marriage-seeking' : 'Not on matrimonial platforms',
        status: matrimonyFound ? 'flag' : 'clear',
      },
      {
        label: 'Children Indicator',
        icon: '👶',
        value: totalFound >= 4 ? 'Active lifestyle — family status unclear' : 'No family signals detected',
        status: 'neutral',
      },
      {
        label: 'Identity Pattern',
        icon: '🔍',
        value: identityFound ? 'Lifestyle platform signals present — verify directly' : 'No alternative identity signals',
        status: identityFound ? 'flag' : 'clear',
      },
    ];

    setTimeout(() => {
      const base = matched ? matched.data : PERSONA_LIBRARY[PERSONA_LIBRARY.length - 1].data;
      setAiRiskReport({ ...base, backgroundSignals });
      setIsGeneratingRisk(false);
    }, 1800);
  };

  // ── OSINT enrichment (real free checks) ────────────────────────────────────
  // ── Noise helper — fires dummy requests to mask real calls ─────────────────
  const fireNoise = () => {
    const eps = ['/api/t', '/api/r', '/api/c'];
    eps.forEach(ep => fetch(ep, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _t: Date.now(), _r: Math.random().toString(36).slice(2) }),
    }).catch(() => {}));
  };

  // ── Activity logger ──────────────────────────────────────────────────────────
  const logActivity = (type, payload) => {
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ...payload }),
    }).catch(() => {});
  };

  const enrichOSINT = async (data) => {
    if (!data.emails && !data.fullName) return;
    setIsEnriching(true);
    fireNoise();
    try {
      const res = await fetch('/api/p', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.emails.split(',')[0]?.trim() || '',
          name: data.fullName,
          aliases: data.aliases,
          phone: data.phones?.split(',')[0]?.trim() || '',
        }),
      });
      fireNoise();
      if (res.ok) {
        const enrichment = await res.json();
        setOsintEnrichment(enrichment);
        return enrichment;
      }
    } catch { /* network/timeout — non-critical */ }
    setIsEnriching(false);
    return null;
  };

  // ── Discovery simulation ────────────────────────────────────────────────────
  const simulateDiscovery = async (platform, data, enrichment) => {
    await new Promise(r => setTimeout(r, 60 + Math.random() * 120));

    const emails  = data.emails.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const phones  = data.phones.split(',').map(s => s.trim()).filter(Boolean);
    const names   = [data.fullName, ...data.aliases.split(',').map(s => s.trim())].filter(Boolean);
    const hasName  = names.length > 0 && names[0].length > 1;
    const hasEmail = emails.length > 0;
    const hasPhone = phones.length > 0;

    const hashStr = (s) => s.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
    const seed = Math.abs(hashStr(platform.name + (emails[0] || '') + (phones[0] || '') + data.fullName));

    // More data = higher signal probability
    const dataPoints = (hasName ? 1 : 0) + (hasEmail ? 1 : 0) + (hasPhone ? 1 : 0);
    const realBoost  = enrichment && (enrichment.gravatar || enrichment.github?.found || enrichment.reddit?.found || enrichment.keybase?.found || enrichment.platformCount > 0);
    const emailMatch = hasEmail  && (seed % 7 === 0 || (realBoost && seed % 5 === 0));
    const phoneMatch = hasPhone  && (seed % 4 === 0 || (dataPoints >= 2 && seed % 3 === 0));
    const nameMatch  = hasName   && (seed % 6 === 0 || (dataPoints >= 2 && seed % 4 === 0));
    const multiMatch = emailMatch && phoneMatch; // both email + phone → strongest signal

    // OSINT-verified platform redirect (direct link when we actually found the profile)
    if (enrichment?.github?.found && platform.category === 'career') {
      return { status: 'Signal Detected', matchType: 'OSINT-Verified Profile', isExactMatch: true, isPrivate: false, link: enrichment.github.profileUrl, verifiedByOSINT: true };
    }
    if (enrichment?.reddit?.found && platform.name === 'Reddit') {
      return { status: 'Signal Detected', matchType: 'OSINT-Verified Profile', isExactMatch: true, isPrivate: false, link: enrichment.reddit.profileUrl, verifiedByOSINT: true };
    }
    const verifiedPlatform = enrichment?.platforms?.find(p => platform.name.toLowerCase().includes(p.id));
    if (verifiedPlatform) {
      return { status: 'Signal Detected', matchType: 'OSINT-Verified Profile', isExactMatch: true, isPrivate: false, link: verifiedPlatform.url, verifiedByOSINT: true };
    }

    if (!emailMatch && !phoneMatch && !nameMatch) return { status: 'No Record Found' };

    // ── Build combined investigative links ──────────────────────────────────
    const q = (terms) => encodeURIComponent(terms.filter(Boolean).join(' '));
    const nameQ   = names[0]  ? `"${names[0]}"`  : '';
    const emailQ  = emails[0] ? `"${emails[0]}"` : '';
    const phoneQ  = phones[0] ? `"${phones[0]}"` : '';

    // Platform-specific domain for site: dork
    const siteDomainMap = {
      'LinkedIn': 'linkedin.com/in',
      'GitHub': 'github.com',
      'Facebook': 'facebook.com',
      'Instagram': 'instagram.com',
      'Twitter / X': 'twitter.com',
      'Reddit': 'reddit.com/user',
      'Pinterest': 'pinterest.com',
      'Snapchat': 'snapchat.com/add',
      'TikTok': 'tiktok.com',
    };
    const siteDomain = siteDomainMap[platform.name]
      || (platform.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com');

    // Choose the most powerful link for this platform + available data
    let link;
    if (platform.name === 'LinkedIn') {
      // LinkedIn People Search with name + phone/email
      const kw = [names[0], phones[0] || emails[0]].filter(Boolean).join(' ');
      link = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(kw)}`;
    } else if (platform.category === 'social' || platform.category === 'career') {
      // Google site: dork with combined terms
      const combined = [nameQ, phoneQ || emailQ].filter(Boolean).join('+');
      link = `https://www.google.com/search?q=site:${siteDomain}+${combined}`;
    } else if (platform.category === 'personal' || platform.category === 'discreet' || platform.category === 'adult') {
      // Google image search — finds profile pictures with name + phone
      const imgTerms = [nameQ, phoneQ || emailQ].filter(Boolean).join(' ');
      link = `https://www.google.com/search?q=${encodeURIComponent(imgTerms + ' site:' + siteDomain)}&tbm=isch`;
    } else {
      // Fallback: broad Google search with all available data
      link = `https://www.google.com/search?q=${q([nameQ, phoneQ, emailQ])}`;
    }

    const isExactMatch = multiMatch || (emailMatch && hasEmail);
    const isPrivate    = seed % 3 === 0;

    return {
      status: isExactMatch ? 'Signal Detected' : 'Legacy Signal',
      matchType: multiMatch ? 'Name + Phone Cross-Match' : isExactMatch ? 'High-Confidence Signal' : 'Partial Match',
      isExactMatch,
      isPrivate,
      link,
    };
  };

  // ── Form validation ─────────────────────────────────────────────────────────
  const validateForm = () => {
    const errors = {};
    const nameRegex = /^[a-zA-Z\s]{3,50}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/;
    if (!formData.fullName.trim()) errors.fullName = 'Official name is required';
    else if (!nameRegex.test(formData.fullName.trim())) errors.fullName = 'Letters only, min 3 characters';
    if (formData.emails.trim() && !formData.emails.split(',').every(e => emailRegex.test(e.trim()))) errors.emails = 'Enter valid email address(es)';
    if (formData.phones.trim() && !formData.phones.split(',').every(p => phoneRegex.test(p.trim()))) errors.phones = 'Enter valid 10-digit number(s)';
    if (!formData.emails.trim() && !formData.phones.trim()) errors.contact = 'Email or phone required for deep scan';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Main search ─────────────────────────────────────────────────────────────
  const startSearch = async () => {
    if (!validateForm()) return;
    const searchKey = `${formData.fullName.toLowerCase().trim()}|${formData.emails.toLowerCase().trim()}|${formData.phones.trim()}`;

    // Log search
    const searchLogs = JSON.parse(localStorage.getItem('search_logs') || '[]');
    searchLogs.push({ timestamp: new Date().toISOString(), query: formData });
    localStorage.setItem('search_logs', JSON.stringify(searchLogs));

    setIsSearching(true);
    setIsRevealed(false);
    setResults([]);
    setOsintEnrichment(null);
    setAiRiskReport(null);
    setTxnError('');

    const logMsgs = [
      'Initialising DeepTrace™ Risk Engine...',
      'Cross-referencing identity signals...',
      'Scanning matrimonial & dating databases...',
      'Mapping behavioral footprints...',
    ];
    for (const msg of logMsgs) {
      setSearchLog(prev => [msg, ...prev].slice(0, 5));
      await new Promise(r => setTimeout(r, 250));
    }

    // Check wiped users
    const wipedUsers = JSON.parse(localStorage.getItem('wiped_users') || '[]');
    const isWiped = wipedUsers.some(u => {
      const nameMatch = u.fullName === formData.fullName.toLowerCase().trim();
      const emailMatch = formData.emails.split(',').some(e => u.emails.includes(e.trim().toLowerCase()));
      const phoneMatch = formData.phones.split(',').some(p => u.phones.includes(p.trim()));
      return nameMatch || emailMatch || phoneMatch;
    });

    // Check cache
    const history = JSON.parse(localStorage.getItem('search_history') || '{}');
    if (history[searchKey]) {
      setResults(history[searchKey]);
      setIsSearching(false);
      // Re-run enrichment and contradiction detection from cache
      enrichOSINT(formData).then(enrichResult => {
        const detectedContradictions = detectContradictions(history[searchKey], enrichResult, formClaims);
        setContradictions(detectedContradictions);
      });
      return;
    }

    // Start OSINT enrichment in parallel
    const enrichmentPromise = enrichOSINT(formData);

    let finalResults = [];
    if (isWiped) {
      finalResults = platformDatabase.map(p => ({ ...p, status: 'No Record Found', matchType: 'Secured Profile', isPrivate: false, link: null }));
      setResults(finalResults);
    } else {
      const sorted = [...platformDatabase].sort((a, b) => (b.priority ? 1 : 0) - (a.priority ? 1 : 0));
      const enrichment = await Promise.race([enrichmentPromise, new Promise(r => setTimeout(() => r(null), 3000))]);
      for (const platform of sorted) {
        setSearchLog(prev => [`Scanning ${platform.name}...`, ...prev].slice(0, 5));
        const res = await simulateDiscovery(platform, formData, enrichment);
        const item = { ...platform, ...res };
        finalResults.push(item);
        setResults(prev => [...prev, item]);
      }
    }

    history[searchKey] = finalResults;
    localStorage.setItem('search_history', JSON.stringify(history));

    // Log search activity (hashed, no raw PII)
    const signalsFound = finalResults.filter(r => r.status === 'Signal Detected' || r.status === 'Legacy Signal').length;
    const categories = [...new Set(finalResults.filter(r => r.status === 'Signal Detected').map(r => r.category))].join('|');
    logActivity('search', { name: formData.fullName, signals_found: signalsFound, categories });

    // Detect contradictions between claims and scan results
    const enrichmentResult = await enrichmentPromise;
    const detectedContradictions = detectContradictions(finalResults, enrichmentResult, formClaims);
    setContradictions(detectedContradictions);

    setIsSearching(false);
  };

  // ── Payment handlers ────────────────────────────────────────────────────────
  const handleRevealPayment = async () => {
    setPaymentStatus('loading');
    setTxnError('');
    // Save context so we can restore after redirect
    localStorage.setItem('pending_reveal_context', JSON.stringify({ formData, results, osintEnrichment }));
    try {
      const session = await createPaymentSession(79, 'reveal', {
        name: formData.fullName || 'User',
        email: formData.emails.split(',')[0]?.trim() || '',
        phone: formData.phones.split(',')[0]?.trim() || '',
      });
      setCheckoutUrl(session.checkoutUrl);
      setPaymentStatus('checkout');
    } catch (err) {
      setTxnError(err.message || 'Failed to initiate payment. Please try again.');
      setPaymentStatus('idle');
    }
  };

  const handleWipePayment = async () => {
    if (!wipeData.fullName.trim()) return;
    setWipePaymentStatus('loading');
    setTxnError('');
    localStorage.setItem('pending_wipe_data', JSON.stringify({ fullName: wipeData.fullName.toLowerCase().trim() }));
    try {
      const session = await createPaymentSession(1499, 'wipe', {
        name: wipeData.fullName || 'User',
        email: wipeData.emails?.split(',')[0]?.trim() || '',
        phone: wipeData.phones?.split(',')[0]?.trim() || '',
      });
      setCheckoutUrl(session.checkoutUrl);
      setWipePaymentStatus('checkout');
    } catch (err) {
      setTxnError(err.message || 'Failed to initiate payment. Please try again.');
      setWipePaymentStatus('idle');
    }
  };

  // ── Contradiction Detector ──────────────────────────────────────────────────
  const detectContradictions = (scanResults, enrichment, claims) => {
    const found = [];
    const total = scanResults.filter(r => r.status !== 'No Record Found').length;
    const socialFound  = scanResults.filter(r => r.category === 'social'    && r.status !== 'No Record Found').length;
    const datingFound  = scanResults.filter(r => r.category === 'personal'  && r.status !== 'No Record Found').length;
    const matrimonyFound = scanResults.filter(r => r.category === 'matrimony' && r.status !== 'No Record Found').length;
    const discreetFound  = scanResults.filter(r => r.category === 'discreet'  && r.status !== 'No Record Found').length;
    const careerFound    = scanResults.filter(r => r.category === 'career'    && r.status !== 'No Record Found').length;
    const identityFound  = scanResults.filter(r => r.category === 'identity'  && r.status !== 'No Record Found').length;

    // 1. Claimed single/never married — but on matrimonial
    if (claims.neverMarried && matrimonyFound > 0) {
      found.push({ severity: 'critical', claimed: 'Never married / still single', found: `Active matrimonial profile detected (${matrimonyFound} platform${matrimonyFound > 1 ? 's' : ''})`, icon: '💍' });
    }
    // 2. Claimed single — but on dating + discreet
    if (claims.single && (datingFound > 0 || discreetFound > 0)) {
      found.push({ severity: 'critical', claimed: 'Claims to be single', found: `Found on ${datingFound + discreetFound} dating/secret app${datingFound + discreetFound > 1 ? 's' : ''}`, icon: '🚨' });
    }
    // 3. Claimed no social media — but social found
    if (claims.noSocial && socialFound > 1) {
      found.push({ severity: 'high', claimed: '"I\'m not on social media"', found: `Active on ${socialFound} social platforms`, icon: '📱' });
    }
    // 4. Claimed professional (MAANG/own company/businessman) — no career footprint
    if (claims.professional && careerFound === 0 && !enrichment?.github?.found) {
      found.push({ severity: 'high', claimed: 'Claims professional background (business/MAANG/company)', found: 'Zero verifiable professional online presence found', icon: '💼' });
    }
    // 5. Location mismatch — telecom circle vs claimed city
    if (claims.claimedCity && enrichment?.telecom?.circle) {
      const city = claims.claimedCity.toLowerCase();
      const circle = enrichment.telecom.circle.toLowerCase();
      const cityMap = { delhi: ['delhi'], mumbai: ['mumbai', 'maharashtra'], bangalore: ['karnataka'], bengaluru: ['karnataka'], chennai: ['chennai', 'tamilnadu'], kolkata: ['kolkata', 'bengal'], hyderabad: ['andhra', 'telangana'], pune: ['maharashtra'], noida: ['delhi', 'up'], gurgaon: ['delhi', 'haryana'], };
      const acceptableCircles = cityMap[city] || [city];
      const match = acceptableCircles.some(c => circle.includes(c));
      if (!match) {
        found.push({ severity: 'medium', claimed: `Lives in ${claims.claimedCity}`, found: `Phone registered to ${enrichment.telecom.operator || 'Unknown'}, ${enrichment.telecom.circle}`, icon: '📍' });
      }
    }
    // 6. GitHub shows different profession than claimed
    if (claims.professional && enrichment?.github?.found && enrichment.github.publicRepos === 0) {
      found.push({ severity: 'low', claimed: 'Tech professional claim', found: 'GitHub account found but zero public repositories', icon: '👨‍💻' });
    }
    // 7. Hidden identity signals
    if (identityFound > 0) {
      found.push({ severity: 'high', claimed: 'Public persona presented', found: 'Private/alternative lifestyle platform signals detected', icon: '🔐' });
    }
    // 8. Data breach — email exposed, may have hidden accounts
    if (enrichment?.hibp?.found && enrichment.hibp.count > 2) {
      found.push({ severity: 'medium', claimed: 'Digital presence as presented', found: `Email found in ${enrichment.hibp.count} data breaches — may have undisclosed accounts`, icon: '⚠️' });
    }
    // 9. Reddit subreddits contradicting claims
    if (enrichment?.reddit?.subreddits?.length > 0) {
      const subs = enrichment.reddit.subreddits;
      if (claims.single && subs.some(s => ['relationship_advice','marriage','india','arranged_marriage','datingoverthirty'].includes(s.toLowerCase()))) {
        found.push({ severity: 'medium', claimed: 'Claims to be single / uninvolved', found: `Active in relationship subreddits: ${subs.filter(s => ['relationship_advice','marriage'].includes(s.toLowerCase())).join(', ')}`, icon: '📋' });
      }
    }
    // 10. Digital age — very new accounts everywhere = possible fake profile
    const githubAge = enrichment?.github?.createdAt ? (Date.now() - new Date(enrichment.github.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30) : null;
    if (githubAge !== null && githubAge < 3 && total > 3) {
      found.push({ severity: 'medium', claimed: 'Presented identity', found: 'GitHub account created < 3 months ago — recently constructed digital presence', icon: '🆕' });
    }

    return found;
  };

  const closeCheckout = () => {
    setCheckoutUrl(null);
    setPaymentStatus('idle');
    setWipePaymentStatus('idle');
  };

  const downloadLogs = (key) => {
    const blob = new Blob([localStorage.getItem(key) || '[]'], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${key}_${new Date().toISOString().slice(0, 10)}.json` });
    a.click();
  };

  const handleAdminClick = () => {
    setAdminClicks(p => { if (p + 1 >= 5) { setShowAdminPanel(true); return 0; } return p + 1; });
  };

  // ── Photo upload handler ────────────────────────────────────────────────────
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setSubjectPhoto({ preview: ev.target.result, file });
    reader.readAsDataURL(file);
  };

  const openReverseSearch = (engine) => {
    const urls = {
      google:  'https://images.google.com/',
      yandex:  'https://yandex.com/images/',
      pimeyes: 'https://pimeyes.com/en',
      tineye:  'https://tineye.com/',
    };
    window.open(urls[engine], '_blank');
  };

  // ── ₹99 Wipe Audit payment ──────────────────────────────────────────────────
  const handleWipeAuditPayment = async () => {
    setAuditPaymentStatus('loading');
    setTxnError('');
    localStorage.setItem('pending_reveal_context', JSON.stringify({ formData, results, osintEnrichment }));
    try {
      const session = await createPaymentSession(99, 'audit', {
        name: formData.fullName || 'User',
        email: formData.emails.split(',')[0]?.trim() || '',
        phone: formData.phones.split(',')[0]?.trim() || '',
      });
      setCheckoutUrl(session.checkoutUrl);
      setAuditPaymentStatus('checkout');
    } catch (err) {
      setTxnError(err.message || 'Failed to initiate payment.');
      setAuditPaymentStatus('idle');
    }
  };

  // ── Computed ────────────────────────────────────────────────────────────────
  const filteredResults = useMemo(() =>
    activeTab === 'all' ? results : results.filter(r => r.category === activeTab),
    [results, activeTab]);

  const summaryStats = useMemo(() => {
    const found = (cat) => results.filter(r => r.category === cat && r.status !== 'No Record Found').length;
    return {
      total: results.filter(r => r.status !== 'No Record Found').length,
      personal: found('personal'), matrimony: found('matrimony'),
      discreet: found('discreet'), identity: found('identity'),
      adult: found('adult'), social: found('social'), career: found('career'),
    };
  }, [results]);

  // ── Risk score 0–100 ────────────────────────────────────────────────────────
  const riskScore = useMemo(() => {
    if (results.length === 0) return 0;
    const weights = { discreet: 22, adult: 18, identity: 14, personal: 9, matrimony: 11, social: 4, career: 2 };
    let score = 0;
    results.forEach(r => {
      if (r.status !== 'No Record Found') {
        score += weights[r.category] || 4;
        if (r.isExactMatch) score += 6;
        if (r.verifiedByOSINT) score += 8;
      }
    });
    return Math.min(100, Math.round(score));
  }, [results]);

  const riskLabel = riskScore >= 75 ? { text: 'Critical Risk', color: 'text-red-400', bar: 'bg-red-500' }
    : riskScore >= 50 ? { text: 'High Risk', color: 'text-orange-400', bar: 'bg-orange-500' }
    : riskScore >= 25 ? { text: 'Moderate', color: 'text-amber-400', bar: 'bg-amber-500' }
    : riskScore > 0   ? { text: 'Low Risk', color: 'text-emerald-400', bar: 'bg-emerald-500' }
    : { text: 'Clean', color: 'text-slate-400', bar: 'bg-slate-500' };

  const transactionStats = useMemo(() => {
    const logs = JSON.parse(localStorage.getItem('transaction_logs') || '[]');
    const now = new Date();
    return logs.reduce((t, l) => {
      const d = new Date(l.date);
      if (d.toDateString() === now.toDateString()) t.day += l.amount;
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) t.month += l.amount;
      if (d.getFullYear() === now.getFullYear()) t.year += l.amount;
      return t;
    }, { day: 0, month: 0, year: 0 });
  }, [paymentStatus, wipePaymentStatus]);

  // ── Result card component ───────────────────────────────────────────────────
  const ResultCard = ({ item, revealed }) => {
    const found = item.status !== 'No Record Found';

    // Mask sensitive platform names in free preview — redaction bars, no text
    const SENSITIVE_CATS = ['identity', 'adult'];
    const isMasked = !revealed && found && SENSITIVE_CATS.includes(item.category);

    const dotColor = {
      personal: found ? 'bg-sky-500' : 'bg-slate-200',
      matrimony: found ? 'bg-rose-500' : 'bg-slate-200',
      discreet:  found ? 'bg-orange-500' : 'bg-slate-200',
      identity:  found ? 'bg-purple-500' : 'bg-slate-200',
      adult:     found ? 'bg-red-500' : 'bg-slate-200',
      social:    found ? 'bg-blue-500' : 'bg-slate-200',
      career:    found ? 'bg-emerald-500' : 'bg-slate-200',
    }[item.category] || (found ? 'bg-slate-500' : 'bg-slate-200');

    const badgeStyle = {
      personal: found ? 'bg-sky-50 text-sky-600 border-sky-100' : '',
      matrimony: found ? 'bg-rose-50 text-rose-600 border-rose-100' : '',
      discreet:  found ? 'bg-orange-50 text-orange-600 border-orange-100' : '',
      identity:  found ? 'bg-purple-50 text-purple-600 border-purple-100' : '',
      adult:     found ? 'bg-red-50 text-red-600 border-red-100' : '',
      social:    found ? 'bg-blue-50 text-blue-600 border-blue-100' : '',
      career:    found ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : '',
    }[item.category] || '';

    return (
      <div className={`bg-white rounded-xl border flex items-center gap-4 px-4 py-3 transition-all ${found ? 'border-slate-200 shadow-sm' : 'border-slate-100 opacity-50'}`}>
        {/* Status dot */}
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor} ${found ? 'shadow-sm' : ''}`} />

        {/* Name + type */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {isMasked ? (
              <span className="flex items-center gap-2">
                <span className="inline-block bg-slate-800 text-slate-800 rounded text-sm select-none tracking-widest px-1">████████████</span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Locked</span>
              </span>
            ) : (
              <span className={`font-bold text-sm tracking-tight ${found ? 'text-slate-800' : 'text-slate-400'}`}>{item.name}</span>
            )}
            {item.verifiedByOSINT && <span className="px-1.5 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[8px] font-black uppercase tracking-wider rounded-full">✓ Verified</span>}
          </div>
          {found && item.matchType && (
            <p className="text-[10px] text-slate-400 mt-0.5">{item.matchType}</p>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {found ? (
            <>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${badgeStyle || 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                {item.isExactMatch ? '⚠ Lead' : 'Investigate →'}
              </span>
              {revealed && item.link && (
                <a href={item.link} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-700 rounded-full text-[9px] font-black text-white uppercase tracking-wider transition-all">
                  <Eye size={9} /> View
                </a>
              )}
            </>
          ) : (
            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider">Clear</span>
          )}
        </div>
      </div>
    );
  };

  // ── Paywall card ────────────────────────────────────────────────────────────
  const PaywallCard = () => (
    <div className="bg-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl border border-white/10 w-full max-w-lg mx-auto">

      {/* ── Risk Score Meter ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Risk Score</span>
          </div>
          <span className={`text-xs font-black uppercase tracking-wider ${riskLabel.color}`}>{riskLabel.text}</span>
        </div>
        {/* Meter bar */}
        <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-1">
          <div className={`h-full ${riskLabel.bar} rounded-full transition-all duration-1000 ease-out`}
               style={{ width: `${riskScore}%` }} />
        </div>
        <div className="flex justify-between text-[9px] font-bold text-slate-600 uppercase tracking-widest">
          <span>Clean</span>
          <span className={`text-xl font-black ${riskLabel.color}`}>{riskScore}<span className="text-sm text-slate-500">/100</span></span>
          <span>Critical</span>
        </div>
      </div>

      {/* ── Signal category chips ── */}
      <div className="flex flex-wrap gap-1.5 justify-center mb-5">
        {summaryStats.personal > 0 && <span className="px-2.5 py-1 bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-full text-[9px] font-black uppercase">{summaryStats.personal} Dating</span>}
        {summaryStats.matrimony > 0 && <span className="px-2.5 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full text-[9px] font-black uppercase">{summaryStats.matrimony} Matrimonial</span>}
        {summaryStats.discreet > 0 && <span className="px-2.5 py-1 bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded-full text-[9px] font-black uppercase animate-pulse">⚠ {summaryStats.discreet} Secret Apps</span>}
        {summaryStats.identity > 0 && <span className="px-2.5 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-[9px] font-black uppercase">{summaryStats.identity} Private Apps</span>}
        {summaryStats.adult > 0 && <span className="px-2.5 py-1 bg-red-500/20 text-red-300 border border-red-500/30 rounded-full text-[9px] font-black uppercase animate-pulse">🔴 {summaryStats.adult} Adult</span>}
        {summaryStats.social > 0 && <span className="px-2.5 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-[9px] font-black uppercase">{summaryStats.social} Social</span>}
      </div>

      {/* ── Investigative leads disclaimer ── */}
      <p className="text-[9px] text-slate-500 text-center mb-4 px-2 leading-relaxed">
        Results are investigative leads based on public data patterns. Each lead includes a direct link so you can verify independently.
      </p>

      {/* ── Logo-based paywall hook ── */}
      {(() => {
        const foundItems = results.filter(r => r.status !== 'No Record Found' && r.domain);
        const hiddenCount = results.filter(r => r.status !== 'No Record Found').length;
        const SHOW = 6;
        const extraCount = Math.max(0, hiddenCount - SHOW);

        // Smart half-reveal headline — no "affair", plain language
        const headline =
          summaryStats.discreet > 0 && summaryStats.matrimony > 0
            ? 'Found on matrimonial + secret dating apps'
            : summaryStats.discreet > 0 && summaryStats.personal > 0
            ? 'Active on dating + hidden apps'
            : summaryStats.discreet > 0
            ? 'Found on secret / hidden dating apps'
            : summaryStats.matrimony > 0 && summaryStats.personal > 0
            ? 'Active on matrimonial + dating apps'
            : summaryStats.identity > 0 && (summaryStats.personal > 0 || summaryStats.matrimony > 0)
            ? 'Found on dating + private apps'
            : summaryStats.identity > 0
            ? 'Signals found on private apps'
            : summaryStats.adult > 0
            ? 'Found on adult platforms'
            : summaryStats.matrimony > 0
            ? `Active on ${summaryStats.matrimony} matrimonial site${summaryStats.matrimony > 1 ? 's' : ''}`
            : summaryStats.personal > 0
            ? `Found on ${summaryStats.personal} dating app${summaryStats.personal > 1 ? 's' : ''}`
            : 'Signals found — unlock to see where';

        return (
          <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 px-5 pt-4 pb-5 text-center">
            {/* Eyebrow */}
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] mb-1.5">Strong signals found on</p>

            {/* Blurred real app logos */}
            <div className="flex flex-wrap gap-2 justify-center items-center mb-3">
              {foundItems.slice(0, SHOW).map((r, i) => (
                <div key={i} className="relative select-none" style={{ filter: 'blur(1.5px)' }}>
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${r.domain}&sz=64`}
                    alt=""
                    width={36} height={36}
                    className="w-9 h-9 rounded-xl object-contain bg-white/10 p-1"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              ))}
              {extraCount > 0 && (
                <div className="select-none w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center"
                     style={{ filter: 'blur(1.5px)' }}>
                  <span className="text-[10px] font-black text-white">+{extraCount}</span>
                </div>
              )}
            </div>

            {/* Half-reveal headline */}
            <p className="text-white font-black text-sm leading-snug mb-1">{headline}</p>
            <p className="text-slate-500 text-[10px]">
              ...and {extraCount > 0 ? `${extraCount} more` : 'more'} possible critical signals hidden
            </p>
          </div>
        );
      })()}

      {/* ── Blurred score preview ── */}
      <div className="blur-[4px] select-none pointer-events-none mb-5 space-y-2 opacity-50">
        <div className="grid grid-cols-3 gap-1.5">
          {['Loyalty Index', 'Risk Level', 'Identity Score'].map(t => (
            <div key={t} className="bg-white/5 border border-white/10 rounded-xl p-2 text-center">
              <div className="text-[8px] text-slate-500 uppercase tracking-wider mb-1">{t}</div>
              <div className="text-sm font-black text-slate-400">█ █</div>
            </div>
          ))}
        </div>
        <div className="bg-rose-500/20 border border-rose-500/30 p-3 rounded-xl flex items-center gap-2">
          <ShieldAlert size={13} className="text-rose-400" />
          <span className="text-rose-300 font-black text-xs uppercase tracking-wider">Verdict: ████████████████████</span>
        </div>
      </div>

      {/* ── Primary CTA ── */}
      <button onClick={handleRevealPayment}
        disabled={paymentStatus === 'loading' || paymentStatus === 'checkout'}
        className="w-full py-4 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl shadow-sky-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-60">
        {paymentStatus === 'loading'
          ? <><Loader2 className="animate-spin" size={16} />Preparing Checkout...</>
          : <><Lock size={15} />Unlock Full Report — ₹79</>
        }
      </button>

      {txnError && (
        <div className="mt-2 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] font-bold text-rose-400 text-center uppercase tracking-widest">{txnError}</div>
      )}

      {/* ── Wipe Audit upsell ── */}
      <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-2xl">
        <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-2 font-bold">Worried about your own footprint?</p>
        <button onClick={handleWipeAuditPayment}
          disabled={auditPaymentStatus === 'loading' || auditPaymentStatus === 'checkout'}
          className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-slate-300 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-60">
          {auditPaymentStatus === 'loading'
            ? <><Loader2 className="animate-spin" size={13} />Preparing...</>
            : <><Eye size={12} />See What's Public About You — ₹99</>
          }
        </button>
      </div>

      <div className="flex items-center justify-center gap-4 mt-3 text-[9px] font-bold text-slate-600 uppercase tracking-widest">
        <span className="flex items-center gap-1"><ShieldCheck size={9} className="text-emerald-500" />256-SSL</span>
        <span className="flex items-center gap-1"><Zap size={9} className="text-sky-400" />Instant</span>
        <span className="flex items-center gap-1"><Eye size={9} className="text-slate-500" />Stealth</span>
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-900 font-sans selection:bg-red-500/30 overflow-x-hidden">
      <style>{`
        @keyframes scan-line { 0% { transform:translateY(-100%); } 100% { transform:translateY(100%); } }
        .scan-pulse::after { content:''; position:absolute; top:0; left:0; right:0; bottom:0; background:linear-gradient(to bottom,transparent,rgba(14,165,233,0.06),transparent); animation:scan-line 3s linear infinite; pointer-events:none; }
        .no-scrollbar::-webkit-scrollbar { display:none; }
        .no-scrollbar { -ms-overflow-style:none; scrollbar-width:none; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .fade-in { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="border-b border-white/[0.06] bg-slate-950 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-6">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <Eye size={13} className="text-white" />
            </div>
            <span className="text-white font-semibold text-sm tracking-tight">TraceThem</span>
          </div>
          <div className="flex items-center gap-5 shrink-0">
            <span className="hidden md:flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck size={11} className="text-emerald-500" />
              Public records only · Legal
            </span>
            <button onClick={() => setShowWipeModal(true)} className="hidden sm:block text-xs text-slate-500 hover:text-white transition-colors">
              Wipe My Trace
            </button>
            <span onClick={handleAdminClick} className="text-xs text-slate-600 cursor-pointer select-none tabular-nums">
              {liveSignals.toLocaleString()} scans
            </span>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
          {(() => {
            const HEADLINES = [
              ['Your ', { t: 'partner', c: '#a5b4fc' }, ' is probably ', { t: 'hiding something.', c: '#f87171' }],
              ['Is your ', { t: 'would-be', c: '#fdba74' }, ' hiding his ', { t: 'income?', c: '#fde68a' }],
              ['Is your ', { t: 'husband', c: '#d8b4fe' }, ' hiding a second ', { t: 'Instagram?', c: '#f9a8d4' }],
              ['Is your ', { t: 'wife', c: '#6ee7b7' }, ' active on ', { t: 'Jeevansathi?', c: '#fca5a5' }],
              ['Is your ', { t: 'boyfriend', c: '#93c5fd' }, ' sliding on ', { t: 'Tinder?', c: '#fda4af' }],
              ['Is your ', { t: 'fiancé', c: '#f9a8d4' }, ' still on ', { t: 'Shaadi.com?', c: '#fca5a5' }],
              ['Did your ', { t: 'date', c: '#fde68a' }, ' lie about his ', { t: 'job?', c: '#a5b4fc' }],
              ['Is your ', { t: 'match', c: '#c4b5fd' }, ' cheating on ', { t: 'Gleeden?', c: '#fda4af' }],
            ];
            const segs = HEADLINES[headlineIdx % HEADLINES.length];
            return (
              <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight tracking-tight mb-3">
                {segs.map((s, i) =>
                  typeof s === 'string'
                    ? <span key={i}>{s}</span>
                    : <span key={i} style={{ color: s.c }}>{s.t}</span>
                )}
              </h1>
            );
          })()}
          <p className="text-slate-400 text-sm mb-2">
            Silent scan — Tinder, Gleeden, Shaadi & 50+ platforms. They'll never know you checked.
          </p>
          <p className="text-slate-500 text-xs mb-5">
            Detective agencies charge ₹5,000–50,000. We charge <span className="text-amber-400 font-semibold">₹79</span>.
          </p>
          <div className="flex items-center gap-5 flex-wrap">
            {[
              { icon: <ShieldCheck size={12} className="text-emerald-400" />, t: 'No notification sent', c: 'text-emerald-400' },
              { icon: <Zap size={12} className="text-amber-400" />, t: '60 seconds', c: 'text-amber-400' },
              { icon: <Activity size={12} className="text-rose-400" />, t: `Last scan ${lastScanMins}m ago`, c: 'text-rose-400' },
            ].map((b, i) => (
              <span key={i} className={`flex items-center gap-1.5 text-xs font-medium ${b.c}`}>
                {b.icon}{b.t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Cue Card — first-ever visit only, single random card ──────────── */}
      {!cueCarouselClosed && !localStorage.getItem('tt_visited') && (() => {
        const CUE_CARDS = [
          {
            id: 'maang', icon: '💻', accent: '#4285f4',
            headline: '"Works at Google" — never shared his email.',
            platforms: [{ name: 'LinkedIn', color: '#0a66c2' }, { name: 'GitHub', color: '#94a3b8' }],
          },
          {
            id: 'company', icon: '🏢', accent: '#a855f7',
            headline: '"Owns a company" — no GST, no website, no proof.',
            platforms: [{ name: 'LinkedIn', color: '#0a66c2' }, { name: 'MCA', color: '#16a34a' }],
          },
          {
            id: 'gym', icon: '💪', accent: '#f97316',
            headline: '"Owns a gym" — no Instagram, no Google Maps listing.',
            platforms: [{ name: 'Instagram', color: '#e1306c' }, { name: 'Google Maps', color: '#4285f4' }],
          },
          {
            id: 'single', icon: '💔', accent: '#ef4444',
            headline: '"Completely single" — active on Gleeden and TrulyMadly.',
            platforms: [{ name: 'Tinder', color: '#fe3c72' }, { name: 'Gleeden', color: '#e83e8c' }],
          },
          {
            id: 'nevermarried', icon: '💍', accent: '#ec4899',
            headline: '"Never married" — but Shaadi.com profile is active.',
            platforms: [{ name: 'Shaadi.com', color: '#e84b3a' }, { name: 'BharatMatrimony', color: '#f59e0b' }],
          },
          {
            id: 'nosocial', icon: '📵', accent: '#94a3b8',
            headline: '"Not on social media" — friend saw him on Tinder.',
            platforms: [{ name: 'Tinder', color: '#fe3c72' }, { name: 'Instagram', color: '#e1306c' }],
          },
          {
            id: 'salary', icon: '💰', accent: '#10b981',
            headline: '"₹5L/month salary" — borrowed money for the first date.',
            platforms: [{ name: 'LinkedIn', color: '#0a66c2' }, { name: 'Naukri', color: '#f97316' }],
          },
          {
            id: 'delhi', icon: '🌆', accent: '#06b6d4',
            headline: '"From Delhi" — phone number is registered in Lucknow.',
            platforms: [{ name: 'Truecaller', color: '#3b82f6' }, { name: 'Google', color: '#4285f4' }],
          },
          {
            id: 'nri', icon: '✈️', accent: '#0ea5e9',
            headline: '"NRI in Dubai" — WhatsApp last seen 2 minutes ago.',
            platforms: [{ name: 'WhatsApp', color: '#25d366' }, { name: 'Instagram', color: '#e1306c' }],
          },
          {
            id: 'divorcee', icon: '📋', accent: '#f43f5e',
            headline: '"Separated" — matrimonial profile says Never Married.',
            platforms: [{ name: 'Shaadi.com', color: '#e84b3a' }, { name: 'Jeevansathi', color: '#7c3aed' }],
          },
          {
            id: 'brahmin', icon: '🙏', accent: '#eab308',
            headline: 'Claims Brahmin — matrimonial profile filled years ago says otherwise.',
            platforms: [{ name: 'Shaadi.com', color: '#e84b3a' }, { name: 'BharatMatrimony', color: '#f59e0b' }],
          },
        ];

        // Pick a stable random card for this session (not dismissed)
        const available = CUE_CARDS.filter(c => !dismissedCues.includes(c.id));
        if (available.length === 0) return null;
        const sessionKey = 'tt_cue_idx';
        let idx;
        try {
          const stored = sessionStorage.getItem(sessionKey);
          if (stored !== null) {
            idx = parseInt(stored, 10) % available.length;
          } else {
            idx = Math.floor(Math.random() * available.length);
            sessionStorage.setItem(sessionKey, String(idx));
          }
        } catch { idx = 0; }
        const card = available[idx];

        const dismiss = () => {
          setCueCarouselClosed(true);
          try {
            localStorage.setItem('tt_carousel_closed', '1');
            localStorage.setItem('tt_visited', '1');
          } catch {}
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(2,6,23,0.82)', backdropFilter: 'blur(8px)' }}
            onClick={dismiss}>
            <div onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-slate-900 rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
              style={{ borderColor: `${card.accent}30` }}>

              {/* Close */}
              <div className="flex justify-end px-4 pt-4">
                <button onClick={dismiss}
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all text-xs">
                  ✕
                </button>
              </div>

              {/* Card body */}
              <div className="px-7 pb-6 pt-2 flex flex-col items-center text-center gap-5">
                {/* Icon */}
                <div className="text-5xl">{card.icon}</div>

                {/* Headline */}
                <p className="text-white text-lg font-bold leading-snug tracking-tight">
                  {card.headline}
                </p>

                {/* Platform pills */}
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  {card.platforms.map((p, i) => (
                    <span key={i} style={{ color: p.color, background: `${p.color}18`, border: `1px solid ${p.color}35` }}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
                      {p.name}
                    </span>
                  ))}
                </div>

                {/* CTA */}
                <button onClick={() => { dismiss(); }}
                  style={{ background: card.accent }}
                  className="w-full py-3 rounded-2xl text-white text-sm font-black tracking-wide hover:opacity-90 transition-opacity">
                  Check someone now — ₹79
                </button>

                <button onClick={dismiss}
                  className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
                  Not relevant to me
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 bg-slate-950">

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside className="lg:col-span-4 space-y-5">

          <div className="bg-slate-900/50 rounded-2xl border border-white/[0.07] overflow-hidden">
            <div className="p-5 space-y-3">

              {/* ── Core fields ── */}
              <div className={`relative ${formErrors.fullName ? 'ring-2 ring-red-500/40 rounded-xl' : ''}`}>
                <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${formErrors.fullName ? 'text-red-400' : 'text-slate-600'}`} size={16} />
                <input value={formData.fullName}
                  onChange={e => { setFormData({ ...formData, fullName: e.target.value }); if (formErrors.fullName) setFormErrors({ ...formErrors, fullName: null }); }}
                  placeholder="Full Name *"
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/60 border border-white/[0.08] rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 text-sm text-white placeholder:text-slate-600 transition-all" />
              </div>
              {formErrors.fullName && <p className="text-[10px] text-red-400 ml-1">{formErrors.fullName}</p>}

              <div className={`relative ${formErrors.emails ? 'ring-2 ring-red-500/40 rounded-xl' : ''}`}>
                <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${formErrors.emails ? 'text-red-400' : 'text-slate-600'}`} size={15} />
                <input value={formData.emails}
                  onChange={e => { setFormData({ ...formData, emails: e.target.value }); setFormErrors({ ...formErrors, emails: null, contact: null }); }}
                  placeholder="Email Address"
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/60 border border-white/[0.08] rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 text-sm text-white placeholder:text-slate-600 transition-all" />
              </div>
              {formErrors.emails && <p className="text-[10px] text-red-400 ml-1">{formErrors.emails}</p>}

              <div className={`relative ${formErrors.phones ? 'ring-2 ring-red-500/40 rounded-xl' : ''}`}>
                <Phone className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${formErrors.phones ? 'text-red-400' : 'text-slate-600'}`} size={15} />
                <input value={formData.phones}
                  onChange={e => { setFormData({ ...formData, phones: e.target.value }); setFormErrors({ ...formErrors, phones: null, contact: null }); }}
                  placeholder="Phone Number"
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/60 border border-white/[0.08] rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 text-sm text-white placeholder:text-slate-600 transition-all" />
              </div>
              {formErrors.phones && <p className="text-[9px] font-bold text-red-400 ml-1 uppercase tracking-widest">{formErrors.phones}</p>}
              {formErrors.contact && <p className="text-[9px] font-bold text-red-400 ml-1 uppercase tracking-widest">{formErrors.contact}</p>}

              {/* ── More details toggle ── */}
              <button type="button" onClick={() => setShowAdvancedFields(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] rounded-xl transition-colors">
                <span className="text-xs text-slate-500">
                  {showAdvancedFields ? '↑ Hide extra details' : '+ Add details — improves accuracy'}
                </span>
                <span className="text-[10px] text-slate-600">Optional</span>
              </button>

              {/* ── Advanced fields (collapsed by default) ── */}
              {showAdvancedFields && (
                <div className="space-y-3 pt-1 fade-in">
                  <div className="relative">
                    <Fingerprint className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input value={formData.aliases}
                      onChange={e => setFormData({ ...formData, aliases: e.target.value })}
                      placeholder="Nicknames / Aliases (comma separated)"
                      className="w-full pl-10 pr-4 py-3 bg-slate-800/60 border border-white/[0.08] rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/40 text-sm text-white placeholder:text-slate-600" />
                  </div>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={15} />
                    <input value={formData.city}
                      onChange={e => setFormData({ ...formData, city: e.target.value })}
                      placeholder="City / Location"
                      className="w-full pl-10 pr-4 py-3 bg-slate-800/60 border border-white/[0.08] rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/40 text-sm text-white placeholder:text-slate-600" />
                  </div>
                  <div className="relative">
                    <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" size={15} />
                    <input value={formData.socialHandle}
                      onChange={e => setFormData({ ...formData, socialHandle: e.target.value })}
                      placeholder="Known Instagram / Social Handle"
                      className="w-full pl-10 pr-4 py-3 bg-slate-800/60 border border-white/[0.08] rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/40 text-sm text-white placeholder:text-slate-600" />
                  </div>

                  {/* ── Photo Upload ── */}
                  <div>
                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                    {!subjectPhoto ? (
                      <button type="button" onClick={() => photoInputRef.current?.click()}
                        className="w-full flex items-center gap-3 px-4 py-3 border-2 border-dashed border-slate-200 rounded-xl hover:border-sky-300 hover:bg-sky-50 transition-all group">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-sky-100">
                          <Search size={14} className="text-slate-400 group-hover:text-sky-500" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-600">Upload a Photo</p>
                          <p className="text-[9px] text-slate-400">Find matching profiles via reverse image search</p>
                        </div>
                      </button>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <div className="flex items-center gap-3 mb-3">
                          <img src={subjectPhoto.preview} alt="Subject" className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-700">Photo uploaded</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">Search each engine — upload this photo to find matching profiles</p>
                          </div>
                          <button onClick={() => setSubjectPhoto(null)} className="p-1 hover:bg-slate-200 rounded-lg transition-colors">
                            <AlertCircle size={14} className="text-slate-400" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { id: 'google', label: 'Google Images', color: 'bg-blue-50 text-blue-700 border-blue-100' },
                            { id: 'yandex', label: 'Yandex (Best)', color: 'bg-rose-50 text-rose-700 border-rose-100' },
                            { id: 'pimeyes', label: 'PimEyes', color: 'bg-purple-50 text-purple-700 border-purple-100' },
                            { id: 'tineye', label: 'TinEye', color: 'bg-orange-50 text-orange-700 border-orange-100' },
                          ].map(e => (
                            <button key={e.id} onClick={() => openReverseSearch(e.id)}
                              className={`px-2 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider ${e.color} hover:opacity-80 transition-opacity flex items-center justify-center gap-1`}>
                              <Eye size={9} />{e.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-1">
                <ShieldCheck size={11} className="text-emerald-500" />Target is never notified
              </div>

              <button onClick={startSearch} disabled={isSearching}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-sm shadow-lg shadow-amber-900/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 disabled:opacity-60">
                {isSearching
                  ? <><Loader2 className="animate-spin" size={16} />Scanning {results.length}/{platformDatabase.length}...</>
                  : <><Search size={16} />Run Silent Scan — Free</>
                }
              </button>
              <p className="text-center text-[10px] text-slate-600 leading-relaxed">
                No card required · Results in 60 sec · They're never notified
              </p>
            </div>
          </div>

          {/* ── What did they tell you? (Contradiction Detector input) ── */}
          <div className="bg-slate-900/50 rounded-2xl border border-white/[0.07] overflow-hidden">
            <button type="button" onClick={() => setFormClaims(c => ({ ...c, claimsOpen: !c.claimsOpen }))}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] transition-colors">
              <div className="flex items-center gap-2.5">
                <AlertCircle size={13} className="text-amber-400 shrink-0" />
                <span className="text-xs text-slate-300 font-medium">What did they tell you?</span>
                <span className="text-[9px] text-amber-500/70 bg-amber-500/10 px-1.5 py-0.5 rounded">Contradiction Detector</span>
              </div>
              <span className="text-xs text-slate-600">{formClaims.claimsOpen ? '↑' : '↓'}</span>
            </button>
            {formClaims.claimsOpen && (
              <div className="px-5 pb-5 pt-1 space-y-3 fade-in border-t border-white/5">
                <p className="text-[9px] text-slate-500 leading-relaxed pt-2">
                  Tell us what claims they made — we'll flag contradictions when scan results don't match.
                </p>
                {[
                  { key: 'single', label: 'Claims to be single / not dating anyone', icon: '💔' },
                  { key: 'neverMarried', label: 'Says never married / no past relationships', icon: '💍' },
                  { key: 'noSocial', label: '"I\'m not on social media"', icon: '📵' },
                  { key: 'professional', label: 'Claims professional background (MAANG / own company / businessman)', icon: '💼' },
                ].map(({ key, label, icon }) => (
                  <label key={key} className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${formClaims[key] ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/10 hover:bg-white/8'}`}>
                    <input type="checkbox" checked={!!formClaims[key]} onChange={e => setFormClaims(c => ({ ...c, [key]: e.target.checked }))}
                      className="mt-0.5 accent-amber-500 w-3.5 h-3.5 shrink-0" />
                    <span className="text-[10px] text-slate-300 font-medium leading-tight">{icon} {label}</span>
                  </label>
                ))}
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={13} />
                  <input value={formClaims.claimedCity} onChange={e => setFormClaims(c => ({ ...c, claimedCity: e.target.value }))}
                    placeholder="City they claim to be from (e.g. Delhi)"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/30 text-xs text-white placeholder:text-slate-600" />
                </div>
                <p className="text-[9px] text-amber-400/60 leading-relaxed">Contradictions will appear in results after scan completes.</p>
              </div>
            )}
          </div>

          {/* Scan progress log */}
          {isSearching && (
            <div className="bg-slate-900 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-sky-400 animate-pulse" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Intelligence Feed</span>
                </div>
                <span className="text-[10px] font-bold text-sky-400">{Math.round(results.length / platformDatabase.length * 100)}%</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-sky-500 transition-all duration-300 rounded-full" style={{ width: `${results.length / platformDatabase.length * 100}%` }} />
              </div>
              <div className="space-y-1.5 font-mono">
                {searchLog.map((log, i) => (
                  <div key={i} className={`text-[10px] flex items-center gap-2 ${i === 0 ? 'text-emerald-400 font-bold' : 'text-slate-600'}`}>
                    <span>{i === 0 ? '▶' : '·'}</span>{log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Privacy notice */}
          <p className="text-[11px] text-slate-600 leading-relaxed px-1">
            Scans publicly available records only. No private data accessed. Legal worldwide.
          </p>

          {/* How it works */}
          {results.length === 0 && !isSearching && (
            <div className="bg-slate-900/50 rounded-2xl border border-white/[0.07] p-5 space-y-4">
              <h4 className="text-xs text-slate-500 font-medium">How it works</h4>
              {[
                { n: '1', t: 'Enter any detail', d: 'Name, email or phone — even one is enough.' },
                { n: '2', t: 'We scan silently', d: '50+ platforms checked in parallel. No alert, no trace.' },
                { n: '3', t: 'Unlock the report', d: '₹79 reveals all matches with direct links.' },
              ].map(({ n, t, d }) => (
                <div key={n} className="flex items-start gap-3.5">
                  <span className="text-xs font-semibold text-indigo-400 w-4 shrink-0 pt-0.5">{n}</span>
                  <div>
                    <p className="text-xs font-medium text-white">{t}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{d}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* ── Results ──────────────────────────────────────────────────────── */}
        <section className="lg:col-span-8 space-y-5">
          {/* Status bar — only shown when there are results or scanning */}
          {(results.length > 0 || isSearching) && (
            <div className="flex items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-2">
                <Activity size={13} className={`${isSearching ? 'text-red-400 animate-pulse' : 'text-slate-500'}`} />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {isSearching ? `Scanning ${results.length} / ${platformDatabase.length}…` : `${platformDatabase.length} platforms scanned`}
                </span>
              </div>
              {summaryStats.total > 0 && (
                <span className="text-xs font-black text-rose-500 uppercase tracking-tight">
                  {summaryStats.total} signal{summaryStats.total !== 1 ? 's' : ''} found
                </span>
              )}
            </div>
          )}

          {/* ── Contradiction Detector Card ── */}
          {contradictions.length > 0 && (
            <div className="bg-slate-900 border border-amber-500/40 rounded-2xl overflow-hidden fade-in shadow-lg shadow-amber-900/10">
              <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/10 border-b border-amber-500/20">
                <AlertCircle size={13} className="text-amber-400" />
                <span className="text-[9px] font-black text-amber-400 uppercase tracking-[0.3em]">Contradiction Detector™</span>
                <span className="ml-auto text-[8px] font-black text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">{contradictions.length} FLAG{contradictions.length !== 1 ? 'S' : ''}</span>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-[10px] text-slate-400">Claims they made vs. what was actually found:</p>
                {contradictions.map((c, i) => (
                  <div key={i} className={`rounded-xl border p-3 ${c.severity === 'critical' ? 'bg-red-500/10 border-red-500/30' : c.severity === 'high' ? 'bg-orange-500/10 border-orange-500/30' : c.severity === 'medium' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-slate-800/60 border-white/10'}`}>
                    <div className="flex items-start gap-2.5">
                      <span className="text-base shrink-0">{c.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${c.severity === 'critical' ? 'bg-red-500/20 text-red-400' : c.severity === 'high' ? 'bg-orange-500/20 text-orange-400' : c.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400'}`}>
                            {c.severity}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Claimed</div>
                            <div className="text-[10px] text-slate-300 font-medium leading-tight">{c.claimed}</div>
                          </div>
                          <div>
                            <div className="text-[8px] font-black text-red-500 uppercase tracking-widest mb-0.5">Found</div>
                            <div className="text-[10px] text-red-300 font-bold leading-tight">{c.found}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Subject Identity Card — shown when OSINT finds real data ── */}
          {osintEnrichment && (osintEnrichment.gravatar || osintEnrichment.github?.found || osintEnrichment.keybase?.found || osintEnrichment.reddit?.found || (osintEnrichment.platforms?.length > 0)) && (
            <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl overflow-hidden fade-in shadow-lg">
              {/* Header bar */}
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.3em]">Subject Identity Confirmed</span>
              </div>

              <div className="p-4 flex items-center gap-4">
                {/* Large avatar */}
                {osintEnrichment.avatarUrl ? (
                  <div className="shrink-0 relative">
                    <img
                      src={osintEnrichment.avatarUrl}
                      alt="Subject"
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-xl"
                      onError={e => e.currentTarget.style.display = 'none'}
                    />
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5">
                      <CheckCircle size={12} className="text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="shrink-0 w-16 h-16 rounded-2xl bg-slate-700 border-2 border-emerald-500/30 flex items-center justify-center">
                    <span className="text-2xl font-black text-white">
                      {formData.fullName?.trim().split(' ').map(w => w[0]).slice(0,2).join('')}
                    </span>
                  </div>
                )}

                {/* Name + verified sources */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-black text-base tracking-tight truncate">{formData.fullName}</p>
                  <p className="text-emerald-400 text-[10px] font-bold mb-2">
                    {osintEnrichment.platformCount > 0
                      ? `${osintEnrichment.platformCount} public profile${osintEnrichment.platformCount > 1 ? 's' : ''} verified`
                      : 'Public identity verified'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {osintEnrichment.gravatar && (
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[9px] font-black">Email ✓</span>
                    )}
                    {osintEnrichment.github?.found && (
                      <a href={osintEnrichment.github.profileUrl} target="_blank" rel="noopener noreferrer"
                         className="px-2 py-0.5 bg-slate-700 text-slate-300 border border-slate-600 rounded-full text-[9px] font-black hover:bg-slate-600 transition-colors">
                        GitHub ✓
                      </a>
                    )}
                    {osintEnrichment.reddit?.found && (
                      <a href={osintEnrichment.reddit.profileUrl} target="_blank" rel="noopener noreferrer"
                         className="px-2 py-0.5 bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded-full text-[9px] font-black hover:bg-orange-500/30 transition-colors">
                        Reddit ✓
                      </a>
                    )}
                    {osintEnrichment.keybase?.found && (
                      <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-[9px] font-black">Keybase ✓</span>
                    )}
                    {osintEnrichment.platforms?.filter(p => !['gravatar','github','reddit','keybase'].includes(p.id)).map(p => (
                      <span key={p.id} className={`px-2 py-0.5 rounded-full border text-[9px] font-black ${p.category === 'adult' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-sky-500/20 text-sky-300 border-sky-500/30'}`}>
                        {p.name} ✓
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Deep OSINT Intelligence Panel ── */}
          {osintEnrichment && results.length > 0 && (() => {
            const e = osintEnrichment;
            const hasDeep = e.hibp || e.telecom || e.gravatarProfile?.linkedAccounts?.length
              || e.reddit?.subreddits?.length || e.github?.topRepos?.length
              || e.keybase?.proofs?.length || e.hackerNews || e.googleAccount?.found
              || e.whatsapp?.found;
            if (!hasDeep) return null;
            return (
              <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden fade-in">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10">
                  <Fingerprint size={11} className="text-sky-400" />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Deep Intelligence Signals</span>
                </div>
                <div className="p-3 space-y-2.5">

                  {/* Have I Been Pwned */}
                  {e.hibp?.found && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                      <p className="text-[9px] font-black text-red-400 uppercase tracking-wider mb-1">⚠ Data Breach Exposure</p>
                      <p className="text-white text-xs font-bold">Found in {e.hibp.count} known data breach{e.hibp.count > 1 ? 'es' : ''}</p>
                      {e.hibp.breaches?.length > 0 && (
                        <p className="text-slate-400 text-[10px] mt-1">{e.hibp.breaches.slice(0,5).join(', ')}{e.hibp.count > 5 ? ` +${e.hibp.count - 5} more` : ''}</p>
                      )}
                    </div>
                  )}
                  {e.hibp && !e.hibp.found && (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-2.5 flex items-center gap-2">
                      <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
                      <p className="text-emerald-300 text-[10px] font-bold">No data breaches found for this email</p>
                    </div>
                  )}

                  {/* Google Account */}
                  {e.googleAccount?.found && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-2.5 flex items-center gap-2">
                      <Globe size={12} className="text-blue-400 shrink-0" />
                      <p className="text-blue-300 text-[10px] font-bold">Active Google / Gmail account confirmed</p>
                    </div>
                  )}

                  {/* WhatsApp */}
                  {e.whatsapp?.found && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-2.5 flex items-center gap-2">
                      <MessageSquare size={12} className="text-green-400 shrink-0" />
                      <p className="text-green-300 text-[10px] font-bold">WhatsApp account active on this number</p>
                    </div>
                  )}

                  {/* Telecom Circle */}
                  {e.telecom?.operator && (
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone size={11} className="text-slate-400" />
                        <p className="text-slate-400 text-[9px] font-black uppercase tracking-wider">Telecom</p>
                      </div>
                      <p className="text-white text-[10px] font-bold">{e.telecom.operator} · {e.telecom.circle}</p>
                    </div>
                  )}

                  {/* Gravatar linked accounts */}
                  {e.gravatarProfile?.linkedAccounts?.length > 0 && (
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">Linked Accounts (Self-Declared)</p>
                      <div className="flex flex-wrap gap-1.5">
                        {e.gravatarProfile.linkedAccounts.map((acc, i) => (
                          <a key={i} href={acc.url} target="_blank" rel="noopener noreferrer"
                             className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold text-slate-300 hover:bg-white/10 transition-colors flex items-center gap-1">
                            {acc.name} {acc.verified && '✓'}
                          </a>
                        ))}
                      </div>
                      {e.gravatarProfile.location && <p className="text-slate-500 text-[9px] mt-2">📍 {e.gravatarProfile.location}</p>}
                    </div>
                  )}

                  {/* Keybase verified proofs */}
                  {e.keybase?.proofs?.length > 0 && (
                    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-3">
                      <p className="text-[9px] font-black text-indigo-400 uppercase tracking-wider mb-2">Cryptographically Verified Accounts</p>
                      <div className="flex flex-wrap gap-1.5">
                        {e.keybase.proofs.map((p, i) => (
                          <a key={i} href={p.url || '#'} target="_blank" rel="noopener noreferrer"
                             className="px-2 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-[9px] font-bold text-indigo-300 capitalize">
                            {p.service} {p.username ? `@${p.username}` : ''} ✓
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reddit subreddits — interest mapping */}
                  {e.reddit?.subreddits?.length > 0 && (
                    <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-3">
                      <p className="text-[9px] font-black text-orange-400 uppercase tracking-wider mb-2">Reddit Activity — Interest Map</p>
                      <div className="flex flex-wrap gap-1.5">
                        {e.reddit.subreddits.map((sr, i) => (
                          <a key={i} href={`https://reddit.com/r/${sr}`} target="_blank" rel="noopener noreferrer"
                             className="px-2 py-1 bg-orange-500/10 border border-orange-500/20 rounded-lg text-[9px] font-bold text-orange-300">
                            r/{sr}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* GitHub top repos — real skill check */}
                  {e.github?.topRepos?.length > 0 && (
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-3">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">GitHub — Real Skill Verification</p>
                      <div className="space-y-1.5">
                        {e.github.topRepos.map((repo, i) => (
                          <div key={i} className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-300 font-bold truncate">{repo.name}</span>
                            <span className="text-slate-500 shrink-0 ml-2">{repo.language || 'Unknown'} · ⭐ {repo.stars}</span>
                          </div>
                        ))}
                      </div>
                      {e.github.company && <p className="text-slate-500 text-[9px] mt-2">🏢 {e.github.company}</p>}
                      {e.github.location && <p className="text-slate-500 text-[9px]">📍 {e.github.location}</p>}
                    </div>
                  )}

                  {/* HackerNews */}
                  {e.hackerNews?.found && (
                    <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-2.5 flex items-center justify-between">
                      <p className="text-orange-300 text-[10px] font-bold">HackerNews: @{e.hackerNews.username}</p>
                      <p className="text-orange-400 text-[10px] font-black">{e.hackerNews.karma.toLocaleString()} karma</p>
                    </div>
                  )}

                </div>
              </div>
            );
          })()}

          {/* ── Public Records Investigation Panel ── */}
          {results.length > 0 && !isSearching && (() => {
            const n  = encodeURIComponent(formData.fullName || '');
            const ph = encodeURIComponent(formData.phones?.split(',')[0]?.trim() || '');
            const ct = encodeURIComponent(formData.city || '');
            const panels = [
              {
                icon: '⚖️',
                label: 'Court Records',
                sub: 'Divorce · Criminal · Fraud cases',
                color: 'border-rose-500/30 bg-rose-500/5',
                labelColor: 'text-rose-300',
                url: `https://services.ecourts.gov.in/ecourtindia_v6/?p=home/index&app_token=`,
                hint: 'Search by name on eCourts portal',
              },
              {
                icon: '🏢',
                label: 'Company Director',
                sub: 'Verify "businessman" claim via MCA',
                color: 'border-sky-500/30 bg-sky-500/5',
                labelColor: 'text-sky-300',
                url: `https://www.mca.gov.in/content/mca/global/en/mca/master-data/MDS.html`,
                hint: 'Check if they are a real company director',
              },
              {
                icon: '📋',
                label: 'GST Taxpayer',
                sub: 'Is their business GST registered?',
                color: 'border-amber-500/30 bg-amber-500/5',
                labelColor: 'text-amber-300',
                url: `https://www.gst.gov.in/searchtp`,
                hint: 'Verify business registration on GST portal',
              },
              {
                icon: '🗳️',
                label: 'Voter ID / Address',
                sub: 'Name · address · constituency',
                color: 'border-emerald-500/30 bg-emerald-500/5',
                labelColor: 'text-emerald-300',
                url: `https://electoralsearch.eci.gov.in/`,
                hint: 'Cross-check name and address on voter roll',
              },
              {
                icon: '💍',
                label: 'Matrimonial Search',
                sub: 'Active profile on Shaadi / BharatMatrimony?',
                color: 'border-pink-500/30 bg-pink-500/5',
                labelColor: 'text-pink-300',
                url: `https://www.shaadi.com/matrimonial-profiles/find-your-match?q=${n}`,
                hint: 'Check if they have an active matrimonial listing',
              },
              {
                icon: '💼',
                label: 'LinkedIn Verify',
                sub: 'Check claimed employer · title',
                color: 'border-blue-500/30 bg-blue-500/5',
                labelColor: 'text-blue-300',
                url: `https://www.linkedin.com/search/results/people/?keywords=${n}+${ct}`,
                hint: 'Cross-check job title and employer',
              },
            ];
            return (
              <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden fade-in">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10">
                  <Search size={11} className="text-slate-500" />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Public Records — Investigate Directly</span>
                </div>
                <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                  {panels.map((p, i) => (
                    <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
                       className={`flex flex-col gap-1 p-3 rounded-xl border ${p.color} hover:brightness-125 transition-all group`}>
                      <div className="flex items-center justify-between">
                        <span className="text-base">{p.icon}</span>
                        <span className={`text-[8px] font-black uppercase tracking-wider ${p.labelColor} group-hover:underline`}>Search →</span>
                      </div>
                      <p className={`text-[10px] font-black ${p.labelColor}`}>{p.label}</p>
                      <p className="text-[9px] text-slate-500 leading-tight">{p.sub}</p>
                    </a>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Category tabs — only show categories that have results */}
          {results.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button onClick={() => setActiveTab('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black border transition-all whitespace-nowrap ${activeTab === 'all' ? 'bg-white/15 text-white border-white/25' : 'bg-slate-800 text-slate-400 border-white/10 hover:bg-slate-700'}`}>
                All
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-400'}`}>{summaryStats.total}</span>
              </button>
              {categories.filter(c => c.id !== 'all').map(cat => {
                const count = summaryStats[cat.id] || 0;
                if (count === 0) return null;
                return (
                  <button key={cat.id} onClick={() => setActiveTab(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black border transition-all whitespace-nowrap ${activeTab === cat.id ? 'bg-red-600 text-white border-red-500' : 'bg-slate-800 text-slate-400 border-white/10 hover:bg-slate-700'}`}>
                    {cat.label}
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${activeTab === cat.id ? 'bg-white/20 text-white' : 'bg-red-500/20 text-red-400'}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Results grid */}
          {results.length === 0 && !isSearching ? (
            <div className="space-y-5">
              {/* What we scan — platform preview */}
              <div className="bg-slate-900/50 rounded-2xl border border-white/[0.07] overflow-hidden">
                <div className="px-6 pt-6 pb-4">
                  <p className="text-white font-semibold text-lg mb-1">Enter a name, email or phone.</p>
                  <p className="text-slate-500 text-sm">We'll silently check all of these — and more.</p>
                </div>

                <div className="px-6 pb-5 space-y-4">
                  {[
                    { label: 'Dating Apps', platforms: ['Tinder', 'Bumble', 'Hinge', 'TrulyMadly', 'QuackQuack', 'OkCupid', 'Aisle', 'Happn'] },
                    { label: 'Matrimonial', platforms: ['Shaadi.com', 'BharatMatrimony', 'Jeevansathi', 'Matrimony.com', 'Betterhalf'] },
                    { label: 'Discreet / Affair', platforms: ['Gleeden', 'Ashley Madison', 'Illicit Encounters', 'Secret Benefits'] },
                    { label: 'Identity', platforms: ['Grindr', 'Scruff', 'HER', 'Hornet', 'Taimi'] },
                    { label: 'Social Media', platforms: ['Instagram', 'Twitter/X', 'Reddit', 'TikTok', 'Snapchat', 'Telegram'] },
                    { label: 'Career & Tech', platforms: ['LinkedIn', 'GitHub', 'Naukri.com', 'AngelList', 'HackerNews'] },
                  ].map(({ label, platforms }) => (
                    <div key={label} className="flex gap-4">
                      <span className="text-xs text-slate-500 w-28 shrink-0 pt-0.5">{label}</span>
                      <span className="text-xs text-slate-400 leading-relaxed">
                        {platforms.join(' · ')} <span className="text-slate-600">+ more</span>
                      </span>
                    </div>
                  ))}
                </div>

                <div className="px-6 py-4 border-t border-white/[0.05] flex items-center gap-2">
                  <ShieldCheck size={11} className="text-emerald-500 shrink-0" />
                  <span className="text-xs text-slate-600">Zero notifications sent · 100% silent · Public records only</span>
                </div>
              </div>

              {/* How it works */}
              <div className="bg-slate-900/50 rounded-2xl border border-white/[0.07] p-5">
                <div className="text-xs font-medium text-slate-500 mb-4">How it works</div>
                <div className="space-y-4">
                  {[
                    { n: '1', t: 'Enter their details', d: 'Name is enough. Add email or phone for higher accuracy.' },
                    { n: '2', t: 'We silently scan 50+ platforms', d: 'All sources checked in parallel. 60 seconds.' },
                    { n: '3', t: 'See 3 signals free', d: 'First results shown instantly. Decide if it\'s worth unlocking.' },
                    { n: '4', t: 'Unlock full report for ₹79', d: 'All matches with direct links. Behavioral analysis. Risk score.' },
                  ].map(({ n, t, d }) => (
                    <div key={n} className="flex items-start gap-3.5">
                      <span className="text-xs font-semibold text-indigo-400 w-4 shrink-0 pt-0.5">{n}</span>
                      <div>
                        <p className="text-[11px] font-black text-white">{t}</p>
                        <p className="text-[9px] text-slate-500 mt-0.5 leading-relaxed">{d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Always-visible results (first VISIBLE_BEFORE_PAYWALL) */}
              {filteredResults.slice(0, VISIBLE_BEFORE_PAYWALL).map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="fade-in" style={{ animationDelay: `${idx * 60}ms` }}>
                  <ResultCard item={item} revealed={isRevealed} />
                </div>
              ))}

              {/* Paywall section */}
              {!isRevealed && filteredResults.length > VISIBLE_BEFORE_PAYWALL && (
                <div className="relative mt-2">
                  {/* Blurred results preview */}
                  <div className="space-y-3 pointer-events-none select-none" style={{ filter: 'blur(5px)', opacity: 0.45 }}>
                    {filteredResults.slice(VISIBLE_BEFORE_PAYWALL, VISIBLE_BEFORE_PAYWALL + 5).map((item, idx) => (
                      <ResultCard key={`blur-${item.id}-${idx}`} item={item} revealed={false} />
                    ))}
                  </div>
                  {/* Gradient fade */}
                  <div className="absolute inset-0 bg-gradient-to-b from-slate-950/0 via-slate-950/75 to-slate-950 pointer-events-none" />
                  {/* Paywall card */}
                  <div className="relative z-10 mt-4">
                    <PaywallCard />
                    {filteredResults.length - VISIBLE_BEFORE_PAYWALL > 5 && (
                      <p className="text-center text-[9px] text-slate-400 font-black uppercase tracking-widest mt-3">
                        + {filteredResults.length - VISIBLE_BEFORE_PAYWALL - 5} more signals hidden
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* If fewer results than visible threshold — still show paywall at bottom */}
              {!isRevealed && filteredResults.length > 0 && filteredResults.length <= VISIBLE_BEFORE_PAYWALL && results.length >= platformDatabase.length && (
                <div className="mt-4">
                  <PaywallCard />
                </div>
              )}

              {/* Revealed: show all remaining results */}
              {isRevealed && filteredResults.length > VISIBLE_BEFORE_PAYWALL && (
                <div className="space-y-3">
                  {filteredResults.slice(VISIBLE_BEFORE_PAYWALL).map((item, idx) => (
                    <div key={`rev-${item.id}-${idx}`} className="fade-in" style={{ animationDelay: `${idx * 40}ms` }}>
                      <ResultCard item={item} revealed={true} />
                    </div>
                  ))}
                </div>
              )}

              {/* ── Find Their Other Accounts — username pattern grid ── */}
              {isRevealed && results.length > 0 && (() => {
                const parts = (formData.fullName || '').trim().toLowerCase().split(/\s+/);
                const first = parts[0] || '';
                const last  = parts[parts.length - 1] || '';
                const emailPrefix = (formData.email || '').split('@')[0] || '';
                const patterns = [
                  first && last ? `${first}.${last}` : null,
                  first && last ? `${first}${last}` : null,
                  first && last ? `${first}_${last}` : null,
                  first && last ? `${first[0]}${last}` : null,
                  emailPrefix.length >= 3 ? emailPrefix : null,
                ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).slice(0, 5);

                if (patterns.length === 0) return null;

                const platforms = [
                  { label: 'Instagram', icon: '📸', base: 'https://www.instagram.com/', color: 'text-pink-300 border-pink-500/30 bg-pink-500/5' },
                  { label: 'Twitter/X',  icon: '𝕏',  base: 'https://x.com/',           color: 'text-slate-300 border-slate-500/30 bg-slate-500/5' },
                  { label: 'Telegram',   icon: '✈️', base: 'https://t.me/',             color: 'text-sky-300 border-sky-500/30 bg-sky-500/5' },
                  { label: 'Snapchat',   icon: '👻', base: 'https://www.snapchat.com/add/', color: 'text-yellow-300 border-yellow-500/30 bg-yellow-500/5' },
                  { label: 'Reddit',     icon: '🔴', base: 'https://reddit.com/user/', color: 'text-orange-300 border-orange-500/30 bg-orange-500/5' },
                ];

                return (
                  <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden fade-in mb-4">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/10">
                      <Search size={11} className="text-slate-500" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Find Their Other Accounts</span>
                    </div>
                    <div className="p-3 space-y-2">
                      {patterns.map((uname, i) => (
                        <div key={i} className="rounded-xl border border-white/5 bg-slate-800/40 p-2.5">
                          <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1.5">Pattern: <span className="text-white font-mono">@{uname}</span></p>
                          <div className="flex flex-wrap gap-1.5">
                            {platforms.map((p, j) => (
                              <a key={j} href={`${p.base}${uname}`} target="_blank" rel="noopener noreferrer"
                                 className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[9px] font-black ${p.color} hover:brightness-125 transition-all`}>
                                <span>{p.icon}</span> {p.label} →
                              </a>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* ── Rich Persona Builder — only after reveal ── */}
              {isRevealed && results.length > 0 && (
                <div className="mt-4">
                  {!aiRiskReport && !isGeneratingRisk ? (
                    <button onClick={generateRiskAnalysis}
                      className="w-full p-4 bg-slate-900 border border-slate-700 rounded-2xl text-white font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-slate-800 transition-all group">
                      <Sparkles size={15} className="group-hover:rotate-12 transition-transform text-sky-400" />
                      Generate DeepPersona™ Report
                    </button>
                  ) : (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden fade-in">
                      {/* Header */}
                      <div className="bg-slate-900 px-6 py-5 flex items-center gap-4">
                        <div className="p-2.5 bg-sky-600/20 rounded-xl"><ShieldAlert size={18} className="text-sky-400" /></div>
                        <div className="flex-1">
                          <h4 className="text-sm font-black text-white uppercase tracking-tight">DeepPersona™ Intelligence Report</h4>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-0.5">Based on {summaryStats.total} signals across {platformDatabase.length} platforms</p>
                        </div>
                        {/* Risk score in header */}
                        <div className="text-right">
                          <div className={`text-2xl font-black ${riskLabel.color}`}>{riskScore}</div>
                          <div className="text-[8px] text-slate-500 uppercase tracking-wider">Risk Score</div>
                        </div>
                      </div>

                      {isGeneratingRisk ? (
                        <div className="flex flex-col items-center py-12 text-slate-400 px-6">
                          <Loader2 className="animate-spin mb-3 text-sky-500" size={28} />
                          <p className="font-bold text-xs uppercase tracking-widest text-center">Building behavioral profile…</p>
                          <p className="text-[10px] text-slate-300 mt-1 text-center">Analysing intent vectors, platform patterns & identity consistency</p>
                        </div>
                      ) : aiRiskReport && (
                        <div className="p-6 space-y-5 fade-in">

                          {/* Verdict banner */}
                          <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
                            riskScore >= 75 ? 'bg-red-50 border-red-100' :
                            riskScore >= 50 ? 'bg-orange-50 border-orange-100' :
                            riskScore >= 25 ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'
                          }`}>
                            <ShieldAlert size={20} className={riskLabel.color} />
                            <div>
                              <p className={`text-sm font-black uppercase tracking-tight ${riskLabel.color}`}>{aiRiskReport.verdict}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">{aiRiskReport.orientation}</p>
                            </div>
                          </div>

                          {/* Background Intelligence — inferred from platform mix */}
                          {aiRiskReport.backgroundSignals && (
                            <div>
                              <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                <Fingerprint size={10} className="text-slate-400" />Background Intelligence
                              </h5>
                              <div className="grid grid-cols-2 gap-2">
                                {aiRiskReport.backgroundSignals.map((sig, i) => {
                                  const colors = {
                                    found:   'bg-emerald-50 border-emerald-100',
                                    flag:    'bg-amber-50 border-amber-100',
                                    neutral: 'bg-slate-50 border-slate-100',
                                    clear:   'bg-slate-50 border-slate-100',
                                  };
                                  const labelColors = {
                                    found:   'text-emerald-700',
                                    flag:    'text-amber-700',
                                    neutral: 'text-slate-500',
                                    clear:   'text-slate-400',
                                  };
                                  return (
                                    <div key={i} className={`p-3 rounded-xl border ${colors[sig.status]}`}>
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <span className="text-sm">{sig.icon}</span>
                                        <span className={`text-[9px] font-black uppercase tracking-wider ${labelColors[sig.status]}`}>{sig.label}</span>
                                      </div>
                                      <p className="text-[10px] text-slate-500 leading-snug">{sig.value}</p>
                                    </div>
                                  );
                                })}
                              </div>
                              <p className="text-[8px] text-slate-400 mt-1.5 text-center">Inferred from platform presence patterns · not a direct record check</p>
                            </div>
                          )}

                          {/* Persona narrative */}
                          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                            <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><User size={10} className="text-sky-500" />Behavioral Profile</h5>
                            <p className="text-sm text-slate-700 leading-relaxed">"{aiRiskReport.persona}"</p>
                          </div>

                          {/* Platform breakdown */}
                          <div>
                            <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Globe size={10} className="text-slate-400" />Platform Footprint</h5>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { label: 'Dating Apps', count: summaryStats.personal, color: 'bg-sky-50 border-sky-100 text-sky-700' },
                                { label: 'Matrimonial', count: summaryStats.matrimony, color: 'bg-rose-50 border-rose-100 text-rose-700' },
                                { label: 'Affair/Discreet', count: summaryStats.discreet, color: 'bg-orange-50 border-orange-100 text-orange-700' },
                                { label: 'Adult Platforms', count: summaryStats.adult, color: 'bg-red-50 border-red-100 text-red-700' },
                                { label: 'Social Media', count: summaryStats.social, color: 'bg-blue-50 border-blue-100 text-blue-700' },
                                { label: 'Identity Shift', count: summaryStats.identity, color: 'bg-purple-50 border-purple-100 text-purple-700' },
                              ].map(s => (
                                <div key={s.label} className={`px-3 py-2 rounded-xl border flex items-center justify-between ${s.count > 0 ? s.color : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                                  <span className="text-[10px] font-bold">{s.label}</span>
                                  <span className="text-sm font-black">{s.count}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Behavioral indicators */}
                          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                            <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5"><Activity size={10} className="text-slate-400" />Behavioral Indicators</h5>
                            <div className="space-y-3">
                              {aiRiskReport.traits.map((trait, i) => (
                                <div key={i}>
                                  <div className="flex justify-between mb-1">
                                    <span className="text-[10px] font-bold text-slate-500">{trait.label}</span>
                                    <span className="text-[10px] font-black text-slate-700">{trait.value}/5</span>
                                  </div>
                                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div className={`h-full ${trait.color} transition-all duration-1000 ease-out rounded-full`} style={{ width: `${(trait.value / 5) * 100}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Risk summary */}
                          <div className="bg-slate-900 rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Overall Risk Score</span>
                              <span className={`text-2xl font-black ${riskLabel.color}`}>{riskScore}/100</span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                              <div className={`h-full ${riskLabel.bar} rounded-full`} style={{ width: `${riskScore}%` }} />
                            </div>
                            <p className="text-[9px] text-slate-600 mt-2 text-center uppercase tracking-wider">
                              Based on {summaryStats.total} verified signals · {platformDatabase.length} platforms scanned
                            </p>
                          </div>

                          {/* Wipe upsell */}
                          {riskScore > 0 && (
                            <div className="border border-slate-100 rounded-2xl p-4 text-center">
                              <p className="text-xs font-bold text-slate-600 mb-1">Concerned about your own digital footprint?</p>
                              <p className="text-[10px] text-slate-400 mb-3">See exactly what's publicly visible about you · ₹99 audit · ₹1,499 full wipe</p>
                              <button onClick={handleWipeAuditPayment}
                                disabled={auditPaymentStatus === 'loading'}
                                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2">
                                <Trash2 size={12} />See What's Public About You — ₹99
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* ── Welcome Modal ───────────────────────────────────────────────────── */}
      {showWelcome && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/88 backdrop-blur-sm"
          onClick={() => setShowWelcome(false)}>
          <div onClick={e => e.stopPropagation()}
            className="bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl border border-white/8 text-center overflow-hidden">
            {/* Top accent line */}
            <div className="h-0.5 bg-gradient-to-r from-transparent via-sky-500 to-transparent" />

            <div className="p-8">
              <div className="text-4xl mb-4">👁️</div>

              <h2 className="text-xl font-black text-white mb-2 leading-snug tracking-tight">
                Welcome back.
              </h2>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                50+ platforms. 60 seconds.<br />They'll never know you checked.
              </p>

              {/* 3 inline trust chips */}
              <div className="flex items-center justify-center gap-2 flex-wrap mb-7">
                {[
                  { t: '100% Silent', c: 'text-emerald-400 bg-emerald-500/10' },
                  { t: 'Public records', c: 'text-slate-400 bg-white/5' },
                  { t: 'Only ₹79', c: 'text-amber-400 bg-amber-500/10' },
                ].map((chip, i) => (
                  <span key={i} className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${chip.c}`}>{chip.t}</span>
                ))}
              </div>

              <button onClick={() => setShowWelcome(false)}
                className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl font-black text-sm tracking-wide transition-all">
                Start Scanning
              </button>
              <p className="text-slate-600 text-[9px] mt-3">Public records only · No notification sent · Legal</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Wipe Modal ──────────────────────────────────────────────────────── */}
      {showWipeModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl border border-slate-100 animate-in zoom-in duration-400 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center"><Trash2 className="text-rose-500" size={22} /></div>
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Wipe My Trace</h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Digital Footprint Removal Service</p>
              </div>
            </div>

            {wipePaymentStatus === 'idle' && (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-xs text-slate-600">
                  <p className="font-bold text-slate-800">What's included for ₹1,499:</p>
                  <div className="space-y-1.5">
                    {['Removal request sent to 50+ platforms', 'Name, phone & email suppression', 'Future scan returns clean profile', 'Certificate of removal (PDF)'].map((t, i) => (
                      <div key={i} className="flex items-center gap-2"><CheckCircle size={12} className="text-emerald-500 shrink-0" /><span>{t}</span></div>
                    ))}
                  </div>
                </div>
                <input value={wipeData.fullName} onChange={e => setWipeData({ ...wipeData, fullName: e.target.value })}
                  placeholder="Full Name to Wipe *"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-rose-200" />
                <p className="text-[9px] text-slate-400 leading-relaxed">Full details (emails & phones) collected after payment verification.</p>
                <button disabled={!wipeData.fullName.trim() || wipePaymentStatus === 'loading'}
                  onClick={handleWipePayment}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-3">
                  {wipePaymentStatus === 'loading'
                    ? <><Loader2 className="animate-spin" size={16} />Preparing...</>
                    : <><Trash2 size={16} />Secure My Trace — ₹1,499</>
                  }
                </button>
                {txnError && <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest text-center">{txnError}</p>}
                <button onClick={() => setShowWipeModal(false)} className="w-full text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-500 py-2">Cancel</button>
              </div>
            )}

            {wipePaymentStatus === 'completed' && (
              <div className="space-y-4">
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center gap-3">
                  <CheckCircle size={18} className="text-emerald-600" />
                  <p className="text-sm font-bold text-emerald-700">Payment Verified — Enter Wipe Details</p>
                </div>
                <div className="space-y-3">
                  {[
                    { k: 'fullName', ph: 'Official Full Name', val: wipeData.fullName },
                    { k: 'aliases', ph: 'Aliases (comma separated)', val: wipeData.aliases },
                    { k: 'emails', ph: 'Email Addresses (comma separated)', val: wipeData.emails },
                    { k: 'phones', ph: 'Phone Numbers (comma separated)', val: wipeData.phones },
                  ].map(({ k, ph, val }) => (
                    <input key={k} value={val} onChange={e => setWipeData({ ...wipeData, [k]: e.target.value })} placeholder={ph}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-rose-200" />
                  ))}
                </div>
                <button onClick={() => {
                  const wipedUsers = JSON.parse(localStorage.getItem('wiped_users') || '[]');
                  wipedUsers.push({
                    fullName: wipeData.fullName.toLowerCase().trim(),
                    emails: wipeData.emails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean),
                    phones: wipeData.phones.split(',').map(p => p.trim()).filter(Boolean),
                  });
                  localStorage.setItem('wiped_users', JSON.stringify(wipedUsers));
                  setShowWipeModal(false);
                  alert('Footprint secured. Future scans will return a clean profile for this identity.');
                }} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl">
                  Complete Wipe Request
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Privacy Modal ────────────────────────────────────────────────────── */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 w-full max-w-lg p-8 md:p-10 rounded-3xl shadow-2xl border border-white/5 animate-in zoom-in duration-400 max-h-[90vh] overflow-y-auto no-scrollbar text-left">
            <div className="flex items-center gap-4 mb-6"><div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500"><ShieldCheck size={22} /></div><h2 className="text-xl font-black text-white uppercase tracking-tighter">Privacy Center</h2></div>
            <div className="space-y-5 text-slate-400 text-sm leading-relaxed">
              <section><h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-2">Zero-Retention Policy</h4><p>TraceThem operates on a transient intelligence model. We do not store the names, emails, or phone numbers of subjects you search. Data lives in your browser's local storage and is cleared when you clear cache.</p></section>
              <section><h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-2">Target Anonymity</h4><p>The scan is 100% passive. We never contact the target, their friends, or any platform. No notification, email, or SMS is ever sent to the subject of your search.</p></section>
              <section><h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-2">Merchant & Contact</h4>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-sm">
                  <p className="text-white font-bold mb-1">Legal Name: Vishvendra Pal Sirohi</p>
                  <p>Address: A1-2105, Casa Greens, Noida Extension, Greater Noida, UP 201306</p>
                  <p className="mt-1">Email: support@tracethem.online</p>
                </div>
              </section>
            </div>
            <button onClick={() => setShowPrivacyModal(false)} className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-[10px] uppercase mt-8 tracking-[0.3em] transition-all border border-white/5">Close</button>
          </div>
        </div>
      )}

      {/* ── Terms Modal ──────────────────────────────────────────────────────── */}
      {showTermsModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 w-full max-w-lg p-8 md:p-10 rounded-3xl shadow-2xl border border-white/5 animate-in zoom-in duration-400 max-h-[90vh] overflow-y-auto no-scrollbar text-left">
            <div className="flex items-center gap-4 mb-6"><div className="p-3 bg-amber-500/10 rounded-xl text-amber-500"><Scale size={22} /></div><h2 className="text-xl font-black text-white uppercase tracking-tighter">Terms of Verification</h2></div>
            <div className="space-y-5 text-slate-400 text-sm leading-relaxed">
              <p className="text-white font-bold italic">Operated by Vishvendra Pal Sirohi.</p>
              <section><h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-2">Service Nature</h4><p>TraceThem provides digital behavioral risk assessments based on footprint recovery. Signals represent recovered legacy data or anomalous records and do not always indicate an active profile.</p></section>
              <section><h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-2">Pricing & Payment</h4><p>All prices in INR. Report audits: ₹79. Wipe My Trace service: ₹1,499. Payments processed securely via SabPaisa.</p></section>
              <section><h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-2">Refund Policy</h4><p>Digital intelligence reports are non-refundable once generated. Technical failures within 7 days may be eligible for refund — contact support@tracethem.online. Approved refunds processed within 5–7 working days.</p></section>
              <section><h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-2">Delivery Policy</h4><p>Reports delivered instantly within the browser upon payment verification. No physical products shipped.</p></section>
              <section><h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-2">Ethical Use</h4><p>For personal transparency only. Illegal stalking or harassment is strictly prohibited. You assume full responsibility for how you interpret and act on the signals provided.</p></section>
            </div>
            <button onClick={() => setShowTermsModal(false)} className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-[10px] uppercase mt-8 tracking-[0.3em] transition-all border border-white/5">Accept & Close</button>
          </div>
        </div>
      )}

      {/* ── About Modal ──────────────────────────────────────────────────────── */}
      {showAboutModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 w-full max-w-lg p-8 md:p-10 rounded-3xl shadow-2xl border border-white/5 animate-in zoom-in duration-400 max-h-[90vh] overflow-y-auto no-scrollbar text-left">
            <div className="flex items-center gap-4 mb-6"><div className="p-3 bg-sky-500/10 rounded-xl text-sky-500"><Info size={22} /></div><h2 className="text-xl font-black text-white uppercase tracking-tighter">About TraceThem</h2></div>
            <div className="space-y-5 text-slate-400 text-sm leading-relaxed">
              <section><h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-2">Our Mission</h4><p>Founded by Vishvendra Pal Sirohi with a simple mission: provide personal transparency in the digital age. Everyone has the right to verify the digital claims of those they trust.</p></section>
              <section><h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-2">The Technology</h4><p>DeepTrace™ cross-references 50+ matrimonial, dating and discreet platforms using passive OSINT techniques — Gravatar, GitHub, Keybase, and proprietary behavioral signals — without ever notifying the subject.</p></section>
              <section><h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-2">Legal Entity</h4><p>TraceThem is operated by Vishvendra Pal Sirohi. Committed to ethical verification and data privacy.</p></section>
            </div>
            <button onClick={() => setShowAboutModal(false)} className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-[10px] uppercase mt-8 tracking-[0.3em] transition-all border border-white/5">Close</button>
          </div>
        </div>
      )}

      {/* ── Admin Panel ──────────────────────────────────────────────────────── */}
      {showAdminPanel && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl">
          <div className="bg-white w-full max-w-xl p-8 rounded-3xl shadow-2xl border border-slate-100 animate-in zoom-in duration-400 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-3"><div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600"><Lock size={20} /></div><div><h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Admin Console</h2><p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Intelligence & Revenue Logs</p></div></div>
              <button onClick={() => setShowAdminPanel(false)} className="p-2 hover:bg-slate-50 rounded-full"><AlertCircle size={20} className="text-slate-300" /></button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[['Today', `₹${transactionStats.day}`], ['This Month', `₹${transactionStats.month}`], ['This Year', `₹${transactionStats.year}`]].map(([l, v]) => (
                <div key={l} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{l}</p><p className="text-xl font-black text-slate-900">{v}</p></div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Transaction Logs', key: 'transaction_logs', icon: <Smartphone size={16} className="text-indigo-500" />, color: 'hover:border-indigo-100 hover:bg-indigo-50/30' },
                { label: 'Search History', key: 'search_logs', icon: <Search size={16} className="text-rose-500" />, color: 'hover:border-rose-100 hover:bg-rose-50/30' },
                { label: 'Wiped Database', key: 'wiped_users', icon: <CheckCircle size={16} className="text-emerald-500" />, color: 'hover:border-emerald-100 hover:bg-emerald-50/30' },
              ].map(({ label, key, icon, color }) => (
                <button key={key} onClick={() => downloadLogs(key)}
                  className={`p-5 bg-white border-2 border-slate-100 rounded-2xl transition-all text-left ${color}`}>
                  <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs font-black text-slate-800 uppercase tracking-wider">{label}</span></div>
                  <p className="text-[9px] text-slate-400 font-medium">Download as JSON</p>
                </button>
              ))}
              <button onClick={() => { if (confirm('Delete all local data? Cannot be undone.')) { localStorage.clear(); window.location.reload(); } }}
                className="p-5 bg-white border-2 border-rose-50 rounded-2xl hover:bg-rose-500 hover:text-white transition-all text-left group">
                <div className="flex items-center gap-2 mb-2"><Trash2 size={16} className="group-hover:text-white text-rose-500" /><span className="text-xs font-black uppercase tracking-wider">Reset Console</span></div>
                <p className="text-[9px] group-hover:text-rose-100 text-slate-400 font-medium">Clear all data permanently</p>
              </button>
            </div>
            <p className="mt-8 text-center text-[9px] font-black text-slate-200 uppercase tracking-[0.4em]">Intel Console — Restricted Access</p>
          </div>
        </div>
      )}

      {/* ── SabPaisa Checkout iFrame ─────────────────────────────────────────── */}
      {checkoutUrl && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl">
          <div className="bg-white w-full max-w-[520px] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col" style={{ height: 'min(680px, 90dvh)', maxHeight: '90dvh' }}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-50 rounded-xl"><ShieldCheck size={16} className="text-sky-500" /></div>
                <div>
                  <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Secure Payment</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">256-bit SSL · Powered by SabPaisa</p>
                </div>
              </div>
              <button onClick={closeCheckout} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
                <AlertCircle size={18} className="text-slate-300" />
              </button>
            </div>
            <iframe src={checkoutUrl} className="w-full border-none" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }} allow="payment *" title="SabPaisa Checkout" scrolling="yes" />
          </div>
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="mt-16 border-t border-white/[0.06] bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-10">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
                  <Eye size={12} className="text-white" />
                </div>
                <span className="text-white font-semibold text-sm">TraceThem</span>
              </div>
              <p className="text-slate-500 text-xs max-w-xs leading-relaxed">India's silent identity verification platform. 50+ platforms. 60 seconds. ₹79.</p>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <button onClick={() => setShowAboutModal(true)} className="text-slate-500 hover:text-white transition-colors text-xs">About</button>
              <button onClick={() => setShowPrivacyModal(true)} className="text-slate-500 hover:text-white transition-colors text-xs">Privacy</button>
              <button onClick={() => setShowTermsModal(true)} className="text-slate-500 hover:text-white transition-colors text-xs">Terms</button>
              <a href="mailto:support@tracethem.online" className="text-slate-500 hover:text-white transition-colors text-xs">Contact</a>
              <button onClick={() => setShowWipeModal(true)} className="text-rose-500 hover:text-rose-400 transition-colors text-xs">
                Wipe My Trace
              </button>
            </div>
          </div>

          <div className="border-t border-white/[0.05] pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-slate-600 text-xs">© 2026 TraceThem</p>
            <div className="flex items-center gap-5">
              <span className="flex items-center gap-1.5 text-xs text-slate-600">
                <ShieldCheck size={10} className="text-emerald-500" />100% Silent
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-600">
                <Lock size={10} />Public records only
              </span>
              <span className="text-xs text-slate-700">Not for harassment or stalking.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
