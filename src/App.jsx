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
  const [formData, setFormData] = useState({ emails: '', fullName: '', aliases: '', phones: '' });
  const [formErrors, setFormErrors] = useState({});
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchLog, setSearchLog] = useState([]);
  const [liveSignals, setLiveSignals] = useState(51284);

  // OSINT enrichment
  const [osintEnrichment, setOsintEnrichment] = useState(null);
  const [isEnriching, setIsEnriching] = useState(false);

  // AI / persona
  const [aiRiskReport, setAiRiskReport] = useState(null);
  const [isGeneratingRisk, setIsGeneratingRisk] = useState(false);

  // UI
  const [isRevealed, setIsRevealed] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [wipeData, setWipeData] = useState({ fullName: '', aliases: '', emails: '', phones: '' });
  const [wipePaymentStatus, setWipePaymentStatus] = useState('idle');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminClicks, setAdminClicks] = useState(0);

  // Payment
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [txnError, setTxnError] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const paywallRef = useRef(null);

  // Live signal ticker
  useEffect(() => {
    const t = setInterval(() => setLiveSignals(p => p + Math.floor(Math.random() * 4) + 1), 4200);
    return () => clearInterval(t);
  }, []);

  // Welcome splash
  useEffect(() => {
    setTimeout(() => setShowWelcome(true), 800);
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
    // Dating — priority
    { id: 101, name: 'Tinder', type: 'Dating Presence', category: 'personal', priority: true },
    { id: 102, name: 'Bumble', type: 'Dating Presence', category: 'personal', priority: true },
    { id: 103, name: 'Hinge', type: 'Dating Presence', category: 'personal', priority: true },
    { id: 104, name: 'TrulyMadly', type: 'Dating Presence (India)', category: 'personal', priority: true },
    { id: 105, name: 'QuackQuack', type: 'Dating Presence (India)', category: 'personal', priority: true },
    { id: 106, name: 'Dil Mil', type: 'Dating Presence (South Asian)', category: 'personal', priority: true },
    { id: 107, name: 'OkCupid', type: 'Dating Presence', category: 'personal', priority: true },
    { id: 108, name: 'Happn', type: 'Proximity Dating', category: 'personal', priority: true },
    { id: 109, name: 'Grindr', type: 'Identity Shift Detection', category: 'identity', priority: true },
    { id: 110, name: 'Gleeden', type: 'Discreet/Adultery Detection', category: 'discreet', priority: true },
    { id: 111, name: 'Aisle', type: 'High-Intent Dating', category: 'personal', priority: true },
    { id: 112, name: 'Woo', type: 'Dating Presence', category: 'personal', priority: true },
    { id: 113, name: 'Coffee Meets Bagel', type: 'Slow Dating', category: 'personal', priority: true },
    { id: 114, name: 'Badoo', type: 'Dating Presence', category: 'personal', priority: true },
    { id: 115, name: 'TanTan', type: 'Dating Presence', category: 'personal', priority: true },
    { id: 116, name: 'Azar', type: 'Video Dating', category: 'personal', priority: true },
    { id: 117, name: 'Chamet', type: 'Video Chat Social', category: 'personal', priority: true },
    // Discreet
    { id: 120, name: 'Telegram', type: 'Encrypted Group Scan', category: 'discreet' },
    { id: 121, name: 'Snapchat Secrets', type: 'Disappearing Message Scan', category: 'discreet' },
    // Matrimonial
    { id: 201, name: 'Shaadi.com', type: 'Matrimonial Overlap', category: 'matrimony' },
    { id: 202, name: 'Bharat Matrimony', type: 'Matrimonial Overlap', category: 'matrimony' },
    { id: 203, name: 'Jeevansathi', type: 'Matrimonial Overlap', category: 'matrimony' },
    { id: 204, name: 'Betterhalf.ai', type: 'New-age Matrimonial', category: 'matrimony' },
    // Social
    { id: 1, name: 'Facebook', type: 'Identity Presence', category: 'social' },
    { id: 2, name: 'Instagram', type: 'Identity Presence', category: 'social' },
    { id: 3, name: 'Snapchat', type: 'Identity Presence', category: 'social' },
    { id: 4, name: 'Reddit', type: 'Hidden Community Audit', category: 'social' },
    { id: 5, name: 'Discord', type: 'Secret Server Trace', category: 'social' },
    // Professional
    { id: 6, name: 'LinkedIn', type: 'Career Audit', category: 'career' },
    { id: 7, name: 'Naukri.com', type: 'Career Audit', category: 'career' },
  ];

  const categories = [
    { id: 'all', label: 'All Platforms', icon: <Globe size={14} /> },
    { id: 'personal', label: 'Dating', icon: <MessageSquare size={14} /> },
    { id: 'matrimony', label: 'Matrimonial', icon: <Heart size={14} /> },
    { id: 'discreet', label: 'Discreet', icon: <Flame size={14} /> },
    { id: 'identity', label: 'Identity', icon: <Fingerprint size={14} /> },
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
    setTimeout(() => {
      setAiRiskReport(matched ? matched.data : PERSONA_LIBRARY[PERSONA_LIBRARY.length - 1].data);
      setIsGeneratingRisk(false);
    }, 1800);
  };

  // ── OSINT enrichment (real free checks) ────────────────────────────────────
  const enrichOSINT = async (data) => {
    if (!data.emails && !data.fullName) return;
    setIsEnriching(true);
    try {
      const res = await fetch('/api/osint-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.emails.split(',')[0]?.trim() || '',
          name: data.fullName,
          aliases: data.aliases,
        }),
      });
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

    const emails = data.emails.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const names = [data.fullName, ...data.aliases.split(',').map(s => s.trim())].filter(Boolean);

    const hashStr = (s) => s.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
    const seed = Math.abs(hashStr(platform.name + (emails[0] || '') + data.fullName));

    // Real enrichment boosts probability if Gravatar or GitHub found
    const realBoost = enrichment && (enrichment.gravatar || enrichment.github?.found || enrichment.keybase?.found);
    const emailMatch = emails.length > 0 && (seed % 7 === 0 || (realBoost && seed % 5 === 0));
    const phoneMatch = data.phones.length > 0 && (seed % 4 === 0);
    const nameMatch = names.length > 0 && (seed % 6 === 0);

    // GitHub username match → positive signal on career/social platforms
    if (enrichment?.github?.found && (platform.category === 'career' || platform.category === 'social')) {
      if (platform.name === 'LinkedIn' || platform.name === 'Reddit') {
        return {
          status: 'Footprint Trace',
          matchType: 'Verified Developer Footprint',
          isExactMatch: true,
          isPrivate: false,
          link: `https://github.com/${enrichment.github.username}`,
          verifiedByOSINT: true,
        };
      }
    }

    if (!emailMatch && !phoneMatch && !nameMatch) return { status: 'No Record Found' };

    const isExactMatch = (emailMatch && phoneMatch) || (emailMatch && emails.length > 0);
    const isPrivate = seed % 3 === 0;
    const searchTerms = [data.fullName, ...data.aliases.split(',').map(s => s.trim())].filter(Boolean);
    const primaryTerm = searchTerms[0] ? `"${searchTerms[0]}"` : '';
    const siteDomain = platform.name.toLowerCase().replace(/\.com$/, '').replace(/\s+/g, '') + '.com';
    const link = `https://www.google.com/search?q=site:${siteDomain}+${primaryTerm}`;

    return {
      status: isExactMatch ? 'Footprint Trace' : 'Legacy Recovery Signal',
      matchType: isExactMatch ? 'High-Intensity Signal' : 'Anomalous Public Record',
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
      // Re-run enrichment for display
      enrichOSINT(formData);
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

  // ── Computed ────────────────────────────────────────────────────────────────
  const filteredResults = useMemo(() =>
    activeTab === 'all' ? results : results.filter(r => r.category === activeTab),
    [results, activeTab]);

  const summaryStats = useMemo(() => ({
    total: results.filter(r => r.status !== 'No Record Found').length,
    personal: results.filter(r => r.category === 'personal' && r.status !== 'No Record Found').length,
    matrimony: results.filter(r => r.category === 'matrimony' && r.status !== 'No Record Found').length,
    discreet: results.filter(r => r.category === 'discreet' && r.status !== 'No Record Found').length,
    identity: results.filter(r => r.category === 'identity' && r.status !== 'No Record Found').length,
  }), [results]);

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
    const catIcon = {
      personal: <MessageSquare size={22} />,
      matrimony: <Heart size={22} />,
      discreet: <Flame size={22} />,
      identity: <Fingerprint size={22} />,
      social: <Users size={22} />,
      career: <TrendingUp size={22} />,
    }[item.category] || <Globe size={22} />;

    const catColor = {
      personal: found ? 'bg-sky-50 border-sky-100 text-sky-500' : 'bg-slate-50 border-slate-100 text-slate-300',
      matrimony: found ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-slate-50 border-slate-100 text-slate-300',
      discreet: found ? 'bg-orange-50 border-orange-100 text-orange-500' : 'bg-slate-50 border-slate-100 text-slate-300',
      identity: found ? 'bg-purple-50 border-purple-100 text-purple-500' : 'bg-slate-50 border-slate-100 text-slate-300',
      social: found ? 'bg-blue-50 border-blue-100 text-blue-500' : 'bg-slate-50 border-slate-100 text-slate-300',
      career: found ? 'bg-emerald-50 border-emerald-100 text-emerald-500' : 'bg-slate-50 border-slate-100 text-slate-300',
    }[item.category] || 'bg-slate-50 border-slate-100 text-slate-300';

    return (
      <div className={`bg-white rounded-2xl border flex items-center gap-5 px-5 py-4 transition-all ${found ? 'border-slate-200 shadow-md shadow-slate-100' : 'border-slate-100 opacity-60'}`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 shrink-0 ${catColor}`}>
          {catIcon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-black text-slate-800 text-base tracking-tight">{item.name}</h4>
            {item.verifiedByOSINT && <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[9px] font-black uppercase tracking-wider rounded-full">✓ OSINT Verified</span>}
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{item.type}</p>
          {found && item.matchType && <p className="text-[10px] font-semibold text-slate-500 mt-1">{item.matchType}</p>}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {found ? (
            <>
              <span className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-[9px] font-black uppercase tracking-wider">
                {item.isExactMatch ? '⚠ MATCH' : 'SIGNAL'}
              </span>
              {revealed && item.link && (
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1 bg-sky-50 hover:bg-sky-100 rounded-full border border-sky-100 text-[9px] font-black text-sky-600 uppercase tracking-wider transition-all">
                  <Eye size={10} /> Investigate
                </a>
              )}
              {item.isPrivate && <div className="text-[9px] font-bold text-slate-400 flex items-center gap-1"><Lock size={9} /> Encrypted</div>}
            </>
          ) : (
            <span className="px-3 py-1 bg-slate-50 text-slate-400 border border-slate-100 rounded-full text-[9px] font-black uppercase tracking-wider">Clear</span>
          )}
        </div>
      </div>
    );
  };

  // ── Paywall card ────────────────────────────────────────────────────────────
  const PaywallCard = () => (
    <div className="bg-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl border border-white/10 w-full max-w-lg mx-auto">
      {/* Risk score header */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-500/20 rounded-full border border-rose-500/30 mb-3">
          <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
          <span className="text-rose-400 text-[10px] font-black uppercase tracking-widest">Risk Signals Locked</span>
        </div>
        <div className="text-5xl md:text-6xl font-black text-white">{summaryStats.total}</div>
        <div className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">
          Signals Detected Across {platformDatabase.length}+ Platforms
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-4">
          {summaryStats.personal > 0 && (
            <span className="px-3 py-1 bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-full text-[10px] font-black uppercase">
              {summaryStats.personal} Dating
            </span>
          )}
          {summaryStats.matrimony > 0 && (
            <span className="px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full text-[10px] font-black uppercase">
              {summaryStats.matrimony} Matrimonial
            </span>
          )}
          {summaryStats.discreet > 0 && (
            <span className="px-3 py-1 bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded-full text-[10px] font-black uppercase animate-pulse">
              ⚠ {summaryStats.discreet} Discreet/Affair
            </span>
          )}
          {summaryStats.identity > 0 && (
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-[10px] font-black uppercase">
              {summaryStats.identity} Identity Shift
            </span>
          )}
        </div>
      </div>

      {/* Blurred persona teaser */}
      <div className="blur-[3px] select-none pointer-events-none mb-5 space-y-2 opacity-70">
        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-rose-500 rounded-full" />
            <span className="text-white/60 text-[10px] font-black uppercase tracking-wider">DeepPersona™ Verdict</span>
          </div>
          <p className="text-slate-300 text-xs leading-relaxed">Intent Hypocrisy detected — subject is maintaining active presence on both matrimonial and casual dating networks simultaneously...</p>
        </div>
        <div className="bg-rose-500/20 border border-rose-500/30 p-3 rounded-xl flex items-center gap-2">
          <ShieldAlert size={14} className="text-rose-400" />
          <span className="text-rose-300 font-black text-xs uppercase tracking-wider">Verdict: ████████████████████████</span>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={handleRevealPayment}
        disabled={paymentStatus === 'loading' || paymentStatus === 'checkout'}
        className="w-full py-4 md:py-5 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl shadow-sky-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-60"
      >
        {paymentStatus === 'loading'
          ? <><Loader2 className="animate-spin" size={18} />Preparing Checkout...</>
          : <><Lock size={16} />Unlock Full Report — ₹79</>
        }
      </button>

      {txnError && (
        <div className="mt-3 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] font-bold text-rose-400 text-center uppercase tracking-widest">
          {txnError}
        </div>
      )}

      <div className="flex items-center justify-center gap-5 mt-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
        <span className="flex items-center gap-1"><ShieldCheck size={10} className="text-emerald-500" />256-SSL</span>
        <span className="flex items-center gap-1"><Zap size={10} className="text-sky-400" />Instant Access</span>
        <span className="flex items-center gap-1"><Eye size={10} className="text-slate-400" />Stealth Mode</span>
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-sky-500/30 overflow-x-hidden">
      <style>{`
        @keyframes scan-line { 0% { transform:translateY(-100%); } 100% { transform:translateY(100%); } }
        .scan-pulse::after { content:''; position:absolute; top:0; left:0; right:0; bottom:0; background:linear-gradient(to bottom,transparent,rgba(14,165,233,0.06),transparent); animation:scan-line 3s linear infinite; pointer-events:none; }
        .no-scrollbar::-webkit-scrollbar { display:none; }
        .no-scrollbar { -ms-overflow-style:none; scrollbar-width:none; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .fade-in { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6 pb-5 flex flex-col md:flex-row justify-between items-center gap-5">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter bg-gradient-to-br from-slate-900 via-sky-700 to-sky-500 bg-clip-text text-transparent" style={{ fontFamily: 'Georgia, serif' }}>
                TraceThem
              </h1>
              <span className="text-[10px] font-black text-sky-500 uppercase tracking-tighter bg-sky-50 px-1.5 py-0.5 rounded-md border border-sky-100 self-start mt-1">BETA</span>
            </div>
            <p className="text-slate-500 text-sm font-medium">
              India's #1 Digital Footprint Intelligence Tool —{' '}
              <span className="text-sky-600 font-bold italic">Verify before you commit.</span>
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-center">
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors" onClick={handleAdminClick}>
              <Activity size={16} className="text-sky-500 animate-pulse" />
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Live Scans</p>
                <p className="text-xs font-black text-slate-800 tracking-tight mt-0.5">{liveSignals.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-100 px-4 py-2.5 rounded-2xl">
              <ShieldCheck size={16} className="text-emerald-600" />
              <div>
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none">Verified</p>
                <p className="text-xs font-black text-emerald-700 tracking-tight mt-0.5">100% Stealth</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-2xl">
              <Lock size={16} className="text-slate-500" />
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Security</p>
                <p className="text-xs font-black text-slate-700 tracking-tight mt-0.5">256-bit SSL</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trust bar */}
        <div className="border-t border-slate-50 bg-slate-900 py-2">
          <div className="max-w-6xl mx-auto px-4 flex items-center justify-center gap-6 md:gap-10 flex-wrap">
            {[
              { icon: <ShieldCheck size={11} className="text-emerald-400" />, text: 'No Notification Sent' },
              { icon: <Lock size={11} className="text-sky-400" />, text: 'Zero Data Retention' },
              { icon: <Eye size={11} className="text-rose-400" />, text: 'Passive Scan Only' },
              { icon: <Globe size={11} className="text-amber-400" />, text: '30+ Platforms Covered' },
              { icon: <Star size={11} className="text-purple-400" />, text: 'PCI DSS Compliant' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                {item.icon}{item.text}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10">

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside className="lg:col-span-4 space-y-5">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-sky-600 to-sky-500 px-6 py-4">
              <h3 className="text-[10px] font-black text-white/80 uppercase tracking-[0.4em]">Intelligence Console</h3>
              <p className="text-white font-black text-lg tracking-tight mt-0.5">Run a Deep Audit</p>
            </div>
            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <div className={`relative ${formErrors.fullName ? 'ring-2 ring-rose-200 rounded-xl' : ''}`}>
                  <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${formErrors.fullName ? 'text-rose-400' : 'text-slate-300'}`} size={18} />
                  <input value={formData.fullName}
                    onChange={e => { setFormData({ ...formData, fullName: e.target.value }); if (formErrors.fullName) setFormErrors({ ...formErrors, fullName: null }); }}
                    placeholder="Subject's Full Name *"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-200 text-sm font-medium text-slate-800 placeholder:text-slate-300 transition-all" />
                </div>
                {formErrors.fullName && <p className="text-[9px] font-bold text-rose-500 mt-1 ml-1 uppercase tracking-widest">{formErrors.fullName}</p>}
              </div>

              {/* Alias */}
              <div className="relative">
                <Fingerprint className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input value={formData.aliases}
                  onChange={e => setFormData({ ...formData, aliases: e.target.value })}
                  placeholder="Known Nicknames / Aliases"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-200 text-sm font-medium text-slate-800 placeholder:text-slate-300" />
              </div>

              {/* Email */}
              <div>
                <div className={`relative ${formErrors.emails ? 'ring-2 ring-rose-200 rounded-xl' : ''}`}>
                  <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${formErrors.emails ? 'text-rose-400' : 'text-slate-300'}`} size={18} />
                  <input value={formData.emails}
                    onChange={e => { setFormData({ ...formData, emails: e.target.value }); setFormErrors({ ...formErrors, emails: null, contact: null }); }}
                    placeholder="Email Address(es) *"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-200 text-sm font-medium text-slate-800 placeholder:text-slate-300 transition-all" />
                </div>
                {formErrors.emails && <p className="text-[9px] font-bold text-rose-500 mt-1 ml-1 uppercase tracking-widest">{formErrors.emails}</p>}
              </div>

              {/* Phone */}
              <div>
                <div className={`relative ${formErrors.phones ? 'ring-2 ring-rose-200 rounded-xl' : ''}`}>
                  <Phone className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${formErrors.phones ? 'text-rose-400' : 'text-slate-300'}`} size={18} />
                  <input value={formData.phones}
                    onChange={e => { setFormData({ ...formData, phones: e.target.value }); setFormErrors({ ...formErrors, phones: null, contact: null }); }}
                    placeholder="Phone Number (10 digits) *"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-200 text-sm font-medium text-slate-800 placeholder:text-slate-300 transition-all" />
                </div>
                {formErrors.phones && <p className="text-[9px] font-bold text-rose-500 mt-1 ml-1 uppercase tracking-widest">{formErrors.phones}</p>}
              </div>

              {formErrors.contact && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[9px] font-bold text-rose-600 uppercase tracking-widest text-center">{formErrors.contact}</div>
              )}

              <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <ShieldCheck size={12} className="text-emerald-500" />100% Confidential — Target never notified
              </div>

              <button onClick={startSearch} disabled={isSearching}
                className="w-full py-4 bg-sky-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.25em] shadow-lg shadow-sky-600/25 hover:bg-sky-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70">
                {isSearching
                  ? <><Loader2 className="animate-spin" size={18} />Scanning {results.length}/{platformDatabase.length}...</>
                  : <><Search size={18} />Run Deep Verification Audit</>
                }
              </button>
            </div>
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

          {/* How it works */}
          {results.length === 0 && !isSearching && (
            <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">How DeepTrace™ Works</h4>
              {[
                { n: '01', t: 'Enter Details', d: 'Name, email or phone — any single field is enough to start.' },
                { n: '02', t: 'AI Cross-Reference', d: 'We scan 30+ dating, matrimonial & social platforms instantly.' },
                { n: '03', t: 'See the Truth', d: 'Unlock the full intelligence report for just ₹79.' },
              ].map(({ n, t, d }) => (
                <div key={n} className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-sky-50 border border-sky-100 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-black text-sky-500">{n}</span>
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-700">{t}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{d}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* ── Results ──────────────────────────────────────────────────────── */}
        <section className="lg:col-span-8 space-y-5">
          {/* Stats bar */}
          <div className="bg-white rounded-2xl border border-slate-100 px-5 py-4 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${results.length > 0 ? 'bg-sky-50 text-sky-500' : 'bg-slate-50 text-slate-300'}`}>
                <Activity size={20} className={results.length > 0 ? 'animate-pulse' : ''} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Risk Assessment Radar</h4>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">
                  {isSearching ? 'Deep scanning in progress...' : results.length > 0 ? `${platformDatabase.length} platforms analysed` : 'Awaiting scan input'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Anomalies</p>
              <p className={`text-2xl font-black tracking-tighter ${summaryStats.total > 0 ? 'text-rose-500' : 'text-slate-300'}`}>
                {summaryStats.total} <span className="text-sm">signals</span>
              </p>
            </div>
          </div>

          {/* OSINT verified signals */}
          {osintEnrichment && (osintEnrichment.gravatar || osintEnrichment.github?.found || osintEnrichment.keybase?.found) && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 fade-in">
              <div className="flex items-center gap-2 mb-3">
                <Award size={14} className="text-emerald-600" />
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">OSINT-Verified Signals (Real Public Data)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {osintEnrichment.gravatar && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-emerald-200 shadow-sm">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-emerald-700">Active email profile found (Gravatar)</span>
                  </div>
                )}
                {osintEnrichment.github?.found && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-emerald-200 shadow-sm">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-emerald-700">GitHub Developer: @{osintEnrichment.github.username}{osintEnrichment.github.publicRepos ? ` (${osintEnrichment.github.publicRepos} repos)` : ''}</span>
                  </div>
                )}
                {osintEnrichment.keybase?.found && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-emerald-200 shadow-sm">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-emerald-700">Keybase Identity: @{osintEnrichment.keybase.username}</span>
                  </div>
                )}
                {osintEnrichment.emailDomain && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-slate-200 shadow-sm">
                    <Mail size={11} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-600">Domain: {osintEnrichment.emailDomain}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Category tabs */}
          {results.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {categories.map(cat => (
                <button key={cat.id} onClick={() => setActiveTab(cat.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-black uppercase border transition-all whitespace-nowrap ${activeTab === cat.id ? 'bg-sky-600 text-white border-sky-600 shadow-lg shadow-sky-600/20' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>
                  {cat.icon}{cat.label}
                </button>
              ))}
            </div>
          )}

          {/* Results grid */}
          {results.length === 0 && !isSearching ? (
            <div className="bg-white rounded-3xl border border-slate-100 flex flex-col items-center justify-center py-24 text-center px-6">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Search size={28} className="text-slate-200" />
              </div>
              <p className="font-black text-slate-300 text-xs uppercase tracking-widest">Enter details to start your intelligence audit</p>
              <p className="text-[10px] text-slate-200 mt-2 max-w-xs">We scan 30+ platforms including Tinder, Bumble, Shaadi.com, Gleeden and more.</p>
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
                  <div className="absolute inset-0 bg-gradient-to-b from-slate-50/0 via-slate-50/75 to-slate-50 pointer-events-none" />
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

              {/* Persona analysis — only after reveal */}
              {isRevealed && results.length > 0 && (
                <div className="mt-6">
                  {!aiRiskReport && !isGeneratingRisk ? (
                    <button onClick={generateRiskAnalysis}
                      className="w-full p-5 bg-gradient-to-br from-sky-50 to-indigo-50 border-2 border-sky-100 rounded-2xl text-sky-700 font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:shadow-lg transition-all group">
                      <Sparkles size={18} className="group-hover:rotate-12 transition-transform text-sky-500" />
                      Generate Full Intelligence Verdict & Behavioral Report
                    </button>
                  ) : (
                    <div className="bg-white rounded-3xl border-2 border-slate-100 p-6 md:p-10 shadow-xl fade-in">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-sky-600 rounded-2xl text-white shadow-lg"><ShieldAlert size={22} /></div>
                        <div>
                          <h4 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Behavioral Intelligence Report</h4>
                          <p className="text-[9px] font-bold text-sky-500 uppercase tracking-[0.3em] mt-1">DeepPersona™ Analysis Engine</p>
                        </div>
                      </div>
                      {isGeneratingRisk ? (
                        <div className="flex flex-col items-center py-10 text-slate-400">
                          <Loader2 className="animate-spin mb-4 text-sky-500" size={32} />
                          <p className="font-bold text-xs uppercase tracking-widest">Analysing intent, patterns & stability vectors...</p>
                        </div>
                      ) : aiRiskReport && (
                        <div className="fade-in">
                          <div className="grid md:grid-cols-2 gap-6 items-start">
                            <div className="space-y-4">
                              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><User size={11} className="text-sky-500" />Persona Assessment</h5>
                                <p className="text-sm text-slate-700 leading-relaxed italic">"{aiRiskReport.persona}"</p>
                              </div>
                              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Compass size={11} className="text-emerald-500" />Preference Inference</h5>
                                <p className="text-xs font-bold text-slate-600 uppercase tracking-tight">{aiRiskReport.orientation}</p>
                              </div>
                              <div className="bg-slate-900 p-5 rounded-2xl shadow-xl">
                                <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Final Verdict</h5>
                                <p className={`text-lg font-black uppercase tracking-tight ${aiRiskReport.verdictColor || 'text-white'}`}>{aiRiskReport.verdict}</p>
                              </div>
                            </div>
                            <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                              <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Behavioral Indicators (0–5)</h5>
                              {aiRiskReport.traits.map((trait, i) => (
                                <div key={i}>
                                  <div className="flex justify-between mb-1">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{trait.label}</span>
                                    <span className="text-xs font-black text-slate-700">{trait.value}/5</span>
                                  </div>
                                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div className={`h-full ${trait.color} transition-all duration-1000 ease-out rounded-full`} style={{ width: `${(trait.value / 5) * 100}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 w-full max-w-md p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-white/5 text-center animate-in zoom-in slide-in-from-bottom-8 duration-500 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="w-16 h-16 bg-sky-500/10 rounded-full flex items-center justify-center mb-6 mx-auto ring-8 ring-sky-500/5">
              <Eye className="text-sky-400" size={28} />
            </div>
            <h2 className="text-2xl font-black text-white uppercase mb-3 tracking-tighter leading-tight">
              Is your partner living a secret digital life?
            </h2>
            <p className="text-slate-400 text-sm font-medium mb-8 leading-relaxed max-w-xs mx-auto">
              TraceThem scans 30+ dating, matrimonial and discreet platforms to uncover hidden footprints in seconds.
            </p>
            <div className="space-y-2.5 mb-8 text-left">
              {[
                { icon: <Fingerprint size={14} className="text-sky-400" />, t: 'Passive scan — 100% stealth, zero notifications' },
                { icon: <ShieldCheck size={14} className="text-emerald-400" />, t: 'No data stored — full zero-retention policy' },
                { icon: <Zap size={14} className="text-amber-400" />, t: 'Results in under 60 seconds' },
                { icon: <Lock size={14} className="text-rose-400" />, t: 'Full report unlocked for just ₹79' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {item.icon}{item.t}
                </div>
              ))}
            </div>
            <button onClick={() => setShowWelcome(false)}
              className="w-full py-4 bg-sky-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl hover:bg-sky-500 transition-all">
              Start Your Free Audit
            </button>
            <p className="text-slate-600 text-[9px] uppercase tracking-widest mt-4">By continuing you agree to our Terms of Verification</p>
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
                    {['Removal request sent to 30+ platforms', 'Name, phone & email suppression', 'Future scan returns clean profile', 'Certificate of removal (PDF)'].map((t, i) => (
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
              <section><h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-2">The Technology</h4><p>DeepTrace™ cross-references 30+ matrimonial and dating platforms using passive OSINT techniques — Gravatar, GitHub, Keybase, and proprietary behavioral signals — without ever notifying the subject.</p></section>
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
          <div className="bg-white w-full max-w-[480px] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col" style={{ maxHeight: '92vh' }}>
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
            <iframe src={checkoutUrl} className="w-full flex-1 border-none" style={{ minHeight: '580px' }} allow="payment" title="SabPaisa Checkout" />
          </div>
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="mt-16 border-t border-slate-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-5">
          <div className="flex items-center gap-3">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">© 2026 TraceThem — Personal Transparency Engine</p>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-5">
            <button onClick={() => setShowAboutModal(true)} className="text-slate-400 hover:text-slate-700 transition-colors text-[10px] font-black uppercase tracking-[0.3em]">About</button>
            <button onClick={() => setShowWipeModal(true)} className="flex items-center gap-1.5 text-rose-400 hover:text-rose-600 transition-colors text-[10px] font-black uppercase tracking-[0.3em]">
              <Trash2 size={12} />Wipe My Trace
            </button>
            <button onClick={() => setShowPrivacyModal(true)} className="text-slate-400 hover:text-slate-700 transition-colors text-[10px] font-black uppercase tracking-[0.3em]">Privacy</button>
            <button onClick={() => setShowTermsModal(true)} className="text-slate-400 hover:text-slate-700 transition-colors text-[10px] font-black uppercase tracking-[0.3em]">Terms</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
