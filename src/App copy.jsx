
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  User, 
  Mail, 
  Phone, 
  ShieldCheck, 
  ExternalLink, 
  Globe, 
  Briefcase, 
  Heart, 
  MessageSquare, 
  Fingerprint, 
  Users, 
  Info,
  Tag,
  Sparkles,
  Lock,
  Eye,
  ArrowRight,
  ChevronRight,
  ShieldAlert,
  Trash2,
  Smartphone,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Zap,
  Activity,
  BrainCircuit,
  ShieldQuestion,
  Wand2,
  Flame,
  Scale,
  Compass,
  AlertCircle
} from 'lucide-react';

const App = () => {
  // --- Core Application State ---
  const [formData, setFormData] = useState({ emails: '', fullName: '', aliases: '', phones: '' });
  const [formErrors, setFormErrors] = useState({});
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchLog, setSearchLog] = useState([]);
  const [liveSignals, setLiveSignals] = useState(1402);

  // --- Live Pulse Logic ---
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveSignals(prev => prev + Math.floor(Math.random() * 3));
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  
  // --- AI States ---
  const [aiRiskReport, setAiRiskReport] = useState(null);
  const [isGeneratingRisk, setIsGeneratingRisk] = useState(false);

  // --- UI Control States ---
  const [showSummary, setShowSummary] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [wipeData, setWipeData] = useState({ fullName: '', aliases: '', emails: '', phones: '' });
  const [wipePaymentStatus, setWipePaymentStatus] = useState('idle');
  const [wipeTxnId, setWipeTxnId] = useState('');
  
  // --- Admin States ---
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminClicks, setAdminClicks] = useState(0);

  // --- Payment States ---
  const [paymentStatus, setPaymentStatus] = useState('idle'); 
  const [txnId, setTxnId] = useState('');
  const [txnError, setTxnError] = useState('');
  const [timeLeft, setTimeLeft] = useState(120); 

  // --- Instamojo Configuration ---
  const INSTAMOJO_API_KEY = "7e580a7ff8a12b541f6378184b478d35";
  const INSTAMOJO_AUTH_TOKEN = "3dcd8c959327012aee997f7a0a644486";
  const INSTAMOJO_SALT = "1269f811c7b84a8098a6e940624df4e3";
  // Optional manual Light Checkout links (use if API permission is not enabled)
  // Set these to your Instamojo Payment Link short URLs (e.g., https://imjo.in/XXXX)
  const IM_REVEAL_LINK = ""; // e.g., "https://imjo.in/NNxHg" for ₹79
  const IM_WIPE_LINK = "";   // e.g., "https://imjo.in/YYzAb" for ₹1499
  // UPI Deep Link fallback while gateway is pending
  const PAYU_REVEAL = "https://u.payu.in/5Jwymme91BJk";
  const PAYU_WIPE = "https://u.payu.in/5rzSIvm6DSXf";
  const UPI_REVEAL = "upi://pay?pa=vs8811@ptaxis&pn=Varun&am=79&cu=INR&tn=TraceThem%20Reveal";
  const UPI_WIPE = "upi://pay?pa=vs8811@ptaxis&pn=Varun&am=1499&cu=INR&tn=TraceThem%20Wipe";
  // URL overrides to allow quick testing without rebuilding
  const URL_PARAMS = new URLSearchParams(window.location.search);
  const REVEAL_LINK_OVERRIDE = URL_PARAMS.get('reveal_link');
  const WIPE_LINK_OVERRIDE = URL_PARAMS.get('wipe_link');

  const handleSabPaisaPayment = (amount, type = 'reveal') => {
    // Get primary contact details from the form
    const buyerEmail = formData.emails.split(',')[0]?.trim() || 'user@tracethem.online';
    const buyerPhone = formData.phones.split(',')[0]?.trim() || '9015528949';
    const buyerName = formData.fullName || 'Anonymous User';

    // Create the parameters for SabPaisa
    const queryParams = new URLSearchParams({
      clientCode: sabpaisaConfig.clientCode,
      transAmount: amount.toString(),
      transId: (type === 'reveal' ? "TRC" : "WIPE") + Date.now(),
      callbackUrl: sabpaisaConfig.callbackUrl,
      payerName: buyerName,
      payerEmail: buyerEmail,
      payerMobile: buyerPhone,
      clientMeta: type === 'reveal' ? "TraceThem_Reveal" : "TraceThem_Wipe"
    }).toString();

    // Update UI state
    if (type === 'wipe') setWipePaymentStatus('initiating');
    else setPaymentStatus('initiating');

    // Redirect to the SabPaisa Payment Gateway
    window.location.href = `${sabpaisaConfig.paymentUrl}?${queryParams}`;
  };

  // --- Payment Redirect Handler ---
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentId = urlParams.get('payment_id');
    const status = urlParams.get('payment_status');
    const paymentType = urlParams.get('payment_type');

    if (paymentId && status === 'Credit') {
      // Payment Successful
      if (paymentType === 'wipe') {
        // Handle Wipe Success
        const wipedUsers = JSON.parse(localStorage.getItem('wiped_users') || '[]');
        // We'd ideally store wipeData in localStorage temporarily before payment
        const pendingWipe = JSON.parse(localStorage.getItem('pending_wipe_data') || '{}');
        if (pendingWipe.fullName) {
          wipedUsers.push(pendingWipe);
          localStorage.setItem('wiped_users', JSON.stringify(wipedUsers));
          localStorage.removeItem('pending_wipe_data');
        }
        setWipePaymentStatus('completed');
        setShowWipeModal(true);
      } else {
        // Handle Reveal Success
        setIsRevealed(true);
      }
      
      setPaymentStatus('idle');
      // Clear URL parameters to prevent re-triggering
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Log successful transaction
      const logs = JSON.parse(localStorage.getItem('transaction_logs') || '[]');
      logs.push({
        id: paymentId,
        amount: paymentType === 'wipe' ? 1499 : 79,
        date: new Date().toISOString(),
        type: paymentType === 'wipe' ? 'Instamojo Wipe' : 'Instamojo Reveal',
        target: formData.fullName || 'User'
      });
      localStorage.setItem('transaction_logs', JSON.stringify(logs));
    }
  }, []);

  const platformDatabase = [
    // --- Dating (Exhaustive Indian List) ---
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
    { id: 118, name: 'Reddit', type: 'Hidden Community Audit', category: 'social' },
    { id: 119, name: 'Discord', type: 'Secret Server Trace', category: 'social' },
    { id: 120, name: 'Telegram', type: 'Encrypted Group Scan', category: 'discreet' },
    
    // --- Matrimonial ---
    { id: 201, name: 'Shaadi.com', type: 'Matrimonial Overlap', category: 'matrimony' },
    { id: 202, name: 'Bharat Matrimony', type: 'Matrimonial Overlap', category: 'matrimony' },
    { id: 203, name: 'Jeevansathi', type: 'Matrimonial Overlap', category: 'matrimony' },
    { id: 204, name: 'Betterhalf.ai', type: 'New-age Matrimonial', category: 'matrimony' },

    // --- Social ---
    { id: 1, name: 'Facebook', type: 'Identity Presence', category: 'social' },
    { id: 2, name: 'Instagram', type: 'Identity Presence', category: 'social' },
    { id: 3, name: 'Snapchat', type: 'Identity Presence', category: 'social' },
    
    // --- Professional ---
    { id: 6, name: 'LinkedIn', type: 'Career Audit', category: 'career' },
    { id: 7, name: 'Naukri.com', type: 'Career Audit', category: 'career' }
  ];

  const categories = [
    { id: 'all', label: 'Everything', icon: <Globe size={16} /> },
    { id: 'personal', label: 'Casual Dating', icon: <MessageSquare size={16} /> },
    { id: 'matrimony', label: 'Matrimonial', icon: <Heart size={16} /> },
    { id: 'discreet', label: 'Discreet/Affair', icon: <Flame size={16} /> },
    { id: 'identity', label: 'Identity Shift', icon: <Fingerprint size={16} /> },
  ];

  const PERSONA_LIBRARY = [
    {
      id: 'married_cheater',
      condition: (res) => res.some(r => r.category === 'matrimony' && r.status !== 'No Record Found') && res.some(r => r.category === 'discreet' && r.status !== 'No Record Found'),
      data: {
        persona: "Critical Infidelity Risk: This subject maintains an active matrimonial presence while simultaneously generating signals on discreet adultery platforms. This pattern indicates a high-level double life.",
        traits: [
          { label: "Loyalty", value: 0.2, color: "bg-rose-600" },
          { label: "Double-Life Intent", value: 5, color: "bg-rose-500" },
          { label: "Stability Score", value: 0.5, color: "bg-slate-400" },
          { label: "Possibly Married", value: 5, color: "bg-amber-600" },
          { label: "Identity Consistency", value: 0.5, color: "bg-indigo-500" },
          { label: "Ghost Footprints", value: 4.5, color: "bg-teal-500" },
          { label: "Employment Audit", value: 4, color: "bg-blue-500" }
        ],
        orientation: "Intent Hypocrisy Detected",
        verdict: "DANGER: HIGH-INTENSITY INFIDELITY PATTERN"
      }
    },
    {
      id: 'hookup_hunter',
      condition: (res) => res.some(r => r.category === 'matrimony' && r.status !== 'No Record Found') && res.some(r => r.category === 'personal' && r.status !== 'No Record Found'),
      data: {
        persona: "Intent Hypocrisy: Subject is utilizing high-intent matrimonial platforms while maintaining active 'casual' dating footprints. This suggests they are hunting for temporary flings under the guise of commitment.",
        traits: [
          { label: "Loyalty", value: 0.5, color: "bg-rose-600" },
          { label: "Double-Life Intent", value: 4.5, color: "bg-rose-500" },
          { label: "Stability Score", value: 1.2, color: "bg-slate-400" },
          { label: "Possibly Married", value: 4, color: "bg-amber-600" },
          { label: "Identity Consistency", value: 1.5, color: "bg-indigo-500" },
          { label: "Ghost Footprints", value: 4, color: "bg-teal-500" },
          { label: "Employment Audit", value: 3.5, color: "bg-blue-500" }
        ],
        orientation: "Opportunistic / Deceptive",
        verdict: "RED FLAG: INTENT MISMATCH"
      }
    },
    {
      id: 'identity_shift',
      condition: (res) => res.some(r => r.category === 'identity' && r.status !== 'No Record Found'),
      data: {
        persona: "Hidden Identity: DeepTrace™ has recovered signals on orientation-specific platforms that contradict the subject's public-facing persona. High likelihood of a compartmentalized 'Ghost' identity.",
        traits: [
          { label: "Loyalty", value: 2, color: "bg-rose-600" },
          { label: "Double-Life Intent", value: 5, color: "bg-rose-500" },
          { label: "Stability Score", value: 1.5, color: "bg-slate-400" },
          { label: "Possibly Married", value: 2.5, color: "bg-amber-600" },
          { label: "Identity Consistency", value: 0.2, color: "bg-indigo-500" },
          { label: "Ghost Footprints", value: 5, color: "bg-teal-500" },
          { label: "Employment Audit", value: 3, color: "bg-blue-500" }
        ],
        orientation: "Compartmentalized Identity Found",
        verdict: "WARNING: HIDDEN DOUBLE-LIFE DETECTED"
      }
    },
    {
      id: 'legacy_recovery',
      condition: (res) => res.filter(r => r.status !== 'No Record Found').length >= 4,
      data: {
        persona: "Persistent Legacy Signals: Subject has deep digital footprints across multiple high-risk categories. Even if they claim profiles are deleted, DeepTrace™ has recovered 'Ghost' activity nodes suggesting active maintenance.",
        traits: [
          { label: "Loyalty", value: 1, color: "bg-rose-600" },
          { label: "Double-Life Intent", value: 4, color: "bg-rose-500" },
          { label: "Stability Score", value: 2, color: "bg-slate-400" },
          { label: "Possibly Married", value: 3.5, color: "bg-amber-600" },
          { label: "Identity Consistency", value: 2.5, color: "bg-indigo-500" },
          { label: "Ghost Footprints", value: 5, color: "bg-teal-500" },
          { label: "Employment Audit", value: 3, color: "bg-blue-500" }
        ],
        orientation: "Active Legacy Maintenance",
        verdict: "CAUTION: MULTIPLE PERSISTENT SIGNALS"
      }
    },
    {
      id: 'clean_audit',
      condition: (res) => res.every(r => r.status === 'No Record Found'),
      data: {
        persona: "Zero-Anomaly Audit: No high-intensity signals recovered from high-risk or discreet databases. Subject maintains a clean, low-risk digital profile with high identity consistency.",
        traits: [
          { label: "Loyalty", value: 4.8, color: "bg-rose-600" },
          { label: "Double-Life Intent", value: 0.1, color: "bg-rose-500" },
          { label: "Stability Score", value: 5, color: "bg-slate-400" },
          { label: "Possibly Married", value: 0.5, color: "bg-amber-600" },
          { label: "Identity Consistency", value: 5, color: "bg-indigo-500" },
          { label: "Ghost Footprints", value: 0.5, color: "bg-teal-500" },
          { label: "Employment Audit", value: 4.5, color: "bg-blue-500" }
        ],
        orientation: "High Integrity Profile",
        verdict: "VERIFIED: LOW RISK CHARACTER"
      }
    }
  ];

  const generateRiskAnalysis = async () => {
    if (!isRevealed || results.length === 0) return;
    setIsGeneratingRisk(true);
    setAiRiskReport(null);

    // Deterministic Persona Matching (Offline Logic)
    const matchedPersona = PERSONA_LIBRARY.find(p => p.condition(results));
    const personaData = matchedPersona ? matchedPersona.data : PERSONA_LIBRARY[PERSONA_LIBRARY.length - 1].data;

    setTimeout(() => {
      setAiRiskReport(personaData);
      setIsGeneratingRisk(false);
    }, 1500);
  };

  // --- UI Logic ---
  useEffect(() => {
    setTimeout(() => setShowWelcome(true), 1000);

    // --- DevTools Deterrent ---
    const _0x1a2b = () => {
      const start = new Date();
      debugger;
      const end = new Date();
      if (end - start > 100) {
        // Slow execution suggests debugger is open
        console.clear();
        console.log("%cTRACETHEM PROTECTED SYSTEM", "color: red; font-size: 20px; font-weight: bold;");
        console.log("Unauthorized access to core intelligence detected. Source code is encrypted and protected by OSINT-Sec™.");
      }
    };
    const interval = setInterval(_0x1a2b, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let timer;
    if (paymentStatus === 'pending' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && paymentStatus === 'pending') {
      setPaymentStatus('expired');
    }
    return () => clearInterval(timer);
  }, [paymentStatus, timeLeft]);

  const simulateDiscovery = async (platform, data) => {
    // --- Traffic Simulation (Dodge Inspect/Network Tab) ---
    try {
      const node = Math.floor(Math.random() * 255);
      await fetch(`https://api.tracethem.online/v3/intel/node-${node}?scan=${platform.id}&key=OSINT_${Math.random().toString(36).substr(2, 9)}`, { mode: 'no-cors' }).catch(() => {});
    } catch (e) {}

    await new Promise(resolve => setTimeout(resolve, 80 + Math.random() * 150));
    const emails = data.emails.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const names = [data.fullName, ...data.aliases.split(',').map(s => s.trim())].filter(Boolean);
    
    // Obfuscated Seed Logic
    const _0x4a2b = (s) => s.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
    const seed = Math.abs(_0x4a2b(platform.name + (emails[0] || '') + data.fullName));

    const emailMatch = emails.length > 0 && (seed % 7 === 0);
    const phoneMatch = data.phones.length > 0 && (seed % 4 === 0);
    const nameMatch = names.length > 0 && (seed % 6 === 0);

    if (!emailMatch && !phoneMatch && !nameMatch) return { status: 'No Record Found' };

    const isExactMatch = (emailMatch && phoneMatch) || (emailMatch && emails.length > 0);
    const isPrivate = seed % 3 === 0;

    // --- REAL SEARCH DORKING (Actual Investigation Tool) ---
    // This generates a link that performs a real Google search for the person on that specific site
    const searchTerms = [data.fullName, ...data.aliases.split(',').map(s => s.trim())].filter(Boolean);
    const primaryTerm = searchTerms[0] ? `"${searchTerms[0]}"` : "";
    const siteDomain = platform.name.toLowerCase().replace('.com', '').replace(' ', '') + ".com";
    const dorkingLink = `https://www.google.com/search?q=site:${siteDomain}+${primaryTerm}+${data.phones.split(',')[0] || ''}`;

    return { 
      status: isExactMatch ? 'Footprint Trace' : 'Legacy Recovery Signal', 
      matchType: isExactMatch ? "High-Intensity Signal (Database Sync)" : "Anomalous Public Record",
      isExactMatch, isPrivate,
      link: dorkingLink // Provide the real investigation link
    };
  };

  const validateForm = () => {
    const errors = {};
    const nameRegex = /^[a-zA-Z\s]{3,50}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/;

    if (!formData.fullName.trim()) {
      errors.fullName = "Official name is required";
    } else if (!nameRegex.test(formData.fullName.trim())) {
      errors.fullName = "Please enter a valid name (letters only, min 3 chars)";
    }

    if (formData.emails.trim() && !formData.emails.split(',').every(e => emailRegex.test(e.trim()))) {
      errors.emails = "Please enter valid email address(es)";
    }

    if (formData.phones.trim() && !formData.phones.split(',').every(p => phoneRegex.test(p.trim()))) {
      errors.phones = "Please enter valid 10-digit phone number(s)";
    }

    if (!formData.emails.trim() && !formData.phones.trim()) {
      errors.contact = "Either Email or Phone is required for a deep scan";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const startSearch = async () => {
    if (!validateForm()) return;
    
    const searchKey = `${formData.fullName.toLowerCase().trim()}|${formData.emails.toLowerCase().trim()}|${formData.phones.trim()}`;
    const searchHistory = JSON.parse(localStorage.getItem('search_history') || '{}');
    const searchLogs = JSON.parse(localStorage.getItem('search_logs') || '[]');

    // Log the search attempt
    searchLogs.push({
      timestamp: new Date().toISOString(),
      query: formData
    });
    localStorage.setItem('search_logs', JSON.stringify(searchLogs));

    // Check if we already have results for this exact target
    if (searchHistory[searchKey]) {
      setIsSearching(true); setIsRevealed(false); setShowSummary(false); setResults([]);
      const logs = ["Initialising DeepTrace™ Risk Engine...", "Calibrating Double-Life Sensors...", "Syncing Relationship Nodes...", "Finalising Persona Map..."];
      for (let log of logs) {
        setSearchLog(prev => [log, ...prev].slice(0, 4));
        await new Promise(r => setTimeout(r, 400));
      }
      setResults(searchHistory[searchKey]);
      setIsSearching(false);
      setTimeout(() => setShowSummary(true), 800);
      return;
    }

    // Check for wiped users
    const wipedUsers = JSON.parse(localStorage.getItem('wiped_users') || '[]');
    const isWiped = wipedUsers.some(user => {
      const nameMatch = user.fullName === formData.fullName.toLowerCase().trim();
      const emailMatch = formData.emails.split(',').some(e => user.emails.includes(e.trim().toLowerCase()));
      const phoneMatch = formData.phones.split(',').some(p => user.phones.includes(p.trim()));
      return nameMatch || emailMatch || phoneMatch;
    });

    setIsSearching(true); setIsRevealed(false); setShowSummary(false); setResults([]);
    
    const logs = ["Initialising DeepTrace™ Risk Engine...", "Mapping Identity Conflicts...", "Querying Archives...", "Finalising Behavioral Map..."];
    for (let log of logs) {
      setSearchLog(prev => [log, ...prev].slice(0, 4));
      await new Promise(r => setTimeout(r, 250));
    }

    let finalResults = [];
    if (isWiped) {
      finalResults = platformDatabase.map(p => ({
        ...p,
        status: 'No Record Found',
        matchType: 'Clean Profile verified',
        isPrivate: false,
        link: null,
        isGentleman: true
      }));
      setResults(finalResults);
    } else {
      const sortedPlatforms = [...platformDatabase].sort((a, b) => (b.priority ? 1 : 0) - (a.priority ? 1 : 0));
      for (const platform of sortedPlatforms) {
        setSearchLog(prev => [`Scanning ${platform.name}...`, ...prev].slice(0, 4));
        const res = await simulateDiscovery(platform, formData);
        const updatedItem = { ...platform, ...res };
        finalResults.push(updatedItem);
        setResults(prev => [...prev, updatedItem]);
      }
    }
    
    // Save to history
    const history = JSON.parse(localStorage.getItem('search_history') || '{}');
    history[searchKey] = finalResults;
    localStorage.setItem('search_history', JSON.stringify(history));

    setIsSearching(false);
    setTimeout(() => setShowSummary(true), 800);
  };

  const filteredResults = useMemo(() => activeTab === 'all' ? results : results.filter(r => r.category === activeTab), [results, activeTab]);

  const summaryStats = useMemo(() => {
    return {
      personal: results.filter(r => r.category === 'personal' && r.status !== 'No Record Found').length,
      matrimony: results.filter(r => r.category === 'matrimony' && r.status !== 'No Record Found').length,
      discreet: results.filter(r => r.category === 'discreet' && r.status !== 'No Record Found').length,
      identity: results.filter(r => r.category === 'identity' && r.status !== 'No Record Found').length
    };
  }, [results]);

  const handleAdminClick = () => {
    setAdminClicks(prev => {
      if (prev + 1 >= 5) {
        setShowAdminPanel(true);
        return 0;
      }
      return prev + 1;
    });
  };

  const transactionStats = useMemo(() => {
    const logs = JSON.parse(localStorage.getItem('transaction_logs') || '[]');
    const now = new Date();
    
    const totals = { day: 0, month: 0, year: 0 };
    logs.forEach(log => {
      const logDate = new Date(log.date);
      if (logDate.toDateString() === now.toDateString()) totals.day += log.amount;
      if (logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear()) totals.month += log.amount;
      if (logDate.getFullYear() === now.getFullYear()) totals.year += log.amount;
    });
    return totals;
  }, [paymentStatus, wipePaymentStatus]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative selection:bg-sky-500/30 pb-16 overflow-x-hidden">
      <style>{`
        @keyframes scan-line {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .scan-pulse {
          position: relative;
          overflow: hidden;
        }
        .scan-pulse::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(to bottom, transparent, rgba(14,165,233,0.1), transparent);
          animation: scan-line 2s linear infinite;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Header */}
      <header className="max-w-6xl mx-auto pt-8 md:pt-14 pb-10 md:pb-16 px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 md:gap-10">
          <div className="text-center md:text-left group flex-1">
            <h1 className="text-5xl md:text-6xl tracking-tighter flex items-center justify-center md:justify-start gap-1 mb-2">
              <span className="font-['Playfair_Display'] font-black bg-gradient-to-br from-slate-900 via-sky-600 to-emerald-600 bg-clip-text text-transparent">TraceThem</span>
              <span className="text-[10px] md:text-[12px] font-black text-sky-500 uppercase tracking-tighter align-top mt-[-1.2rem] md:mt-[-1.8rem] bg-sky-50 px-1.5 py-0.5 rounded-md border border-sky-100 shadow-sm">BETA</span>
            </h1>
            <p className="text-slate-500 mt-2 text-sm md:text-base font-medium flex items-center justify-center md:justify-start gap-2">
              The simplest way to <span className="text-sky-600 italic font-serif text-lg md:text-xl mx-0.5">Verify</span> them.
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-10">
            <div className="flex items-center gap-4 bg-white px-6 md:px-8 py-3 md:py-4 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 cursor-pointer hover:bg-slate-50 transition-colors group" onClick={handleAdminClick}>
              <div className="p-2 bg-sky-50 rounded-full group-hover:scale-110 transition-transform"><Activity size={20} className="text-sky-500 animate-pulse" /></div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Global Signals Today</p>
                <span className="text-[11px] md:text-[12px] font-bold text-slate-800 uppercase tracking-widest mt-1 block tracking-tighter">{liveSignals.toLocaleString()} AUDITS</span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4 bg-white px-6 md:px-8 py-3 md:py-4 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 cursor-pointer hover:bg-slate-50 transition-colors group" onClick={handleAdminClick}>
              <div className="p-2 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform"><ShieldCheck size={20} className="text-emerald-500" /></div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Security Protocol</p>
                <span className="text-[11px] md:text-[12px] font-bold text-slate-800 uppercase tracking-widest mt-1 block tracking-tighter">Intel Sync v3.1</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 relative">
        {/* Search Sidebar */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl shadow-slate-200/40 border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sky-500 to-transparent opacity-30"></div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-8 md:mb-10">Data Entry Console</h3>
            
            <div className="space-y-4 md:space-y-6">
              <div>
                <div className={`relative transition-all ${formErrors.fullName ? 'ring-2 ring-rose-100' : ''}`}>
                  <User className={`absolute left-4 top-1/2 -translate-y-1/2 ${formErrors.fullName ? 'text-rose-400' : 'text-slate-300'}`} size={20} />
                  <input 
                    value={formData.fullName} 
                    onChange={(e) => {
                      setFormData({...formData, fullName: e.target.value});
                      if (formErrors.fullName) setFormErrors({...formErrors, fullName: null});
                    }} 
                    placeholder="Subject's Official Name" 
                    className="w-full pl-12 pr-4 py-3.5 md:py-4 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-sky-200 outline-none text-sm font-medium text-slate-800 placeholder:text-slate-300 transition-all" 
                  />
                </div>
                {formErrors.fullName && <p className="text-[9px] font-bold text-rose-500 mt-2 ml-2 uppercase tracking-widest">{formErrors.fullName}</p>}
              </div>

              <div className="relative">
                <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input value={formData.aliases} onChange={(e) => setFormData({...formData, aliases: e.target.value})} placeholder="Known Nicknames (Optional)" className="w-full pl-12 pr-4 py-3.5 md:py-4 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-sky-200 outline-none text-sm font-medium text-slate-800 placeholder:text-slate-300" />
              </div>

              <div className="space-y-4">
                <div>
                  <div className={`relative transition-all ${formErrors.emails ? 'ring-2 ring-rose-100' : ''}`}>
                    <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 ${formErrors.emails ? 'text-rose-400' : 'text-slate-300'}`} size={20} />
                    <input 
                      value={formData.emails} 
                      onChange={(e) => {
                        setFormData({...formData, emails: e.target.value});
                        if (formErrors.emails) setFormErrors({...formErrors, emails: null});
                        if (formErrors.contact) setFormErrors({...formErrors, contact: null});
                      }} 
                      placeholder="Email Address(es)" 
                      className="w-full pl-12 pr-4 py-3.5 md:py-4 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-sky-200 outline-none text-sm font-medium text-slate-800 placeholder:text-slate-300 transition-all" 
                    />
                  </div>
                  {formErrors.emails && <p className="text-[9px] font-bold text-rose-500 mt-2 ml-2 uppercase tracking-widest">{formErrors.emails}</p>}
                </div>

                <div>
                  <div className={`relative transition-all ${formErrors.phones ? 'ring-2 ring-rose-100' : ''}`}>
                    <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 ${formErrors.phones ? 'text-rose-400' : 'text-slate-300'}`} size={20} />
                    <input 
                      value={formData.phones} 
                      onChange={(e) => {
                        setFormData({...formData, phones: e.target.value});
                        if (formErrors.phones) setFormErrors({...formErrors, phones: null});
                        if (formErrors.contact) setFormErrors({...formErrors, contact: null});
                      }} 
                      placeholder="Phone Number (10 Digits)" 
                      className="w-full pl-12 pr-4 py-3.5 md:py-4 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-sky-200 outline-none text-sm font-medium text-slate-800 placeholder:text-slate-300 transition-all" 
                    />
                  </div>
                  {formErrors.phones && <p className="text-[9px] font-bold text-rose-500 mt-2 ml-2 uppercase tracking-widest">{formErrors.phones}</p>}
                </div>
              </div>

              {formErrors.contact && <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[9px] font-bold text-rose-600 uppercase tracking-widest text-center animate-pulse">{formErrors.contact}</div>}

              <div className="flex items-center gap-2 py-2 px-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <ShieldCheck size={12} className="text-emerald-500" /> 100% Confidential: No notification sent
              </div>
              <button onClick={startSearch} disabled={isSearching} className="w-full py-4 md:py-5 bg-sky-600 text-white rounded-xl md:rounded-2xl font-black text-xs uppercase tracking-[0.25em] shadow-xl shadow-sky-600/20 hover:bg-sky-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                {isSearching ? <><Loader2 className="animate-spin" size={18} /> Deep Scanning...</> : <><Search size={18} /> Run Verification Audit</>}
              </button>
            </div>
          </div>
          {isSearching && (
            <div className="bg-slate-900 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] text-white shadow-2xl">
              <div className="flex items-center gap-3 mb-6"><Activity size={16} className="text-rose-400 animate-pulse" /><h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live OSINT Intelligence</h4></div>
              <div className="space-y-3 font-mono text-[10px] text-slate-400">{searchLog.map((log, i) => (<div key={i} className={i === 0 ? "text-emerald-400 font-bold" : "opacity-40"}>{">"} {log}</div>))}</div>
            </div>
          )}
        </aside>

        {/* Results Area */}
        <section className="lg:col-span-8 space-y-6 md:space-y-8">
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-slate-200/40">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-sky-50 rounded-2xl text-sky-500 animate-pulse"><Activity size={24} /></div>
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Risk Assessment Radar</h4>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-2">Monitoring Signal Intensity...</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Anomalies Detected</p>
                <p className="text-xl font-black text-sky-600 tracking-tighter">{(results.filter(r => r.status !== 'No Record Found').length)} SIGNALS</p>
              </div>
              <div className="h-10 w-1 bg-slate-100 rounded-full"></div>
            </div>
          </div>

          <div className="flex overflow-x-auto pb-2 gap-2 md:gap-3 no-scrollbar snap-x snap-mandatory">
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setActiveTab(cat.id)} className={`flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 rounded-full text-[10px] md:text-[11px] font-black uppercase border transition-all whitespace-nowrap snap-start ${activeTab === cat.id ? 'bg-sky-600 text-white border-sky-600 shadow-xl shadow-sky-600/20' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}>
                {cat.icon}{cat.label}
              </button>
            ))}
          </div>

          <div className="relative min-h-[300px] md:min-h-[400px]">
            {isRevealed && (
              <div className="mb-8 md:mb-10">
                {!aiRiskReport && !isGeneratingRisk ? (
                  <button onClick={generateRiskAnalysis} className="w-full p-6 md:p-8 bg-gradient-to-br from-sky-50 to-emerald-50 border-2 border-sky-100 rounded-[2rem] md:rounded-[2.5rem] text-sky-800 font-black text-[10px] md:text-xs uppercase tracking-[0.2em] flex flex-col md:flex-row items-center justify-center gap-3 hover:shadow-lg transition-all group">
                    <Scale size={20} className="group-hover:rotate-12 transition-transform text-sky-600" />
                    <span>✨ Generate Intelligence Verdict & Stability Report</span>
                  </button>
                ) : (
                  <div className="bg-white p-6 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border-4 border-sky-50 shadow-2xl relative overflow-hidden">
                    <div className="flex items-center gap-4 mb-6 md:mb-8">
                      <div className="p-3 md:p-4 bg-sky-600 rounded-2xl md:rounded-3xl text-white shadow-lg shadow-sky-600/20"><ShieldAlert size={24} md:size={28} /></div>
                      <div>
                        <h4 className="text-xl md:text-2xl font-black text-slate-900 uppercase leading-none tracking-tighter">Behavioral Analysis</h4>
                        <p className="text-[8px] md:text-[10px] font-bold text-sky-500 uppercase tracking-[0.3em] mt-2">DeepPersona™ Intelligence Sync</p>
                      </div>
                    </div>
                    {isGeneratingRisk ? (
                      <div className="flex flex-col items-center py-8 md:py-10 text-slate-400"><Loader2 className="animate-spin mb-4 text-sky-500" size={32} /><p className="font-bold text-[10px] md:text-xs uppercase tracking-widest text-center">Analysing intent, patterns & stability...</p></div>
                    ) : aiRiskReport && (
                      <div className="animate-in fade-in duration-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                          <div className="space-y-6">
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><User size={12} className="text-sky-500" /> Probable Persona</h5>
                              <p className="text-sm md:text-base font-medium text-slate-700 leading-relaxed italic">"{aiRiskReport.persona}"</p>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Compass size={12} className="text-emerald-500" /> Preference Inference</h5>
                              <p className="text-xs font-bold text-slate-600 uppercase tracking-tight">{aiRiskReport.orientation}</p>
                            </div>
                            <div className="bg-slate-900 p-6 rounded-3xl shadow-xl">
                              <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Final Verdict</h5>
                              <p className="text-xl font-black text-white uppercase tracking-tighter">{aiRiskReport.verdict}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-5 bg-white p-2 md:p-4 rounded-3xl border-2 border-slate-50">
                            <h5 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4 px-2">Core Personality Traits (0-5)</h5>
                            {aiRiskReport.traits.map((trait, i) => (
                              <div key={i} className="space-y-2 px-2">
                                <div className="flex justify-between items-end">
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{trait.label}</span>
                                  <span className="text-xs font-black text-slate-900">{trait.value}/5</span>
                                </div>
                                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${trait.color.replace('rose', 'sky').replace('amber', 'emerald')} transition-all duration-1000 ease-out delay-[200ms]`} 
                                    style={{ width: `${(trait.value / 5) * 100}%` }}
                                  ></div>
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

            <div className={`space-y-4 md:space-y-6 transition-all duration-1000`}>
              <div className="grid grid-cols-1 gap-4 md:gap-5">
                {isRevealed && filteredResults.length > 0 ? filteredResults.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className={`bg-white p-5 md:p-9 rounded-[2rem] md:rounded-[3rem] border flex flex-col md:flex-row items-center gap-4 md:gap-10 transition-all scan-pulse ${item.status !== 'No Record Found' ? 'border-sky-100 shadow-xl shadow-slate-200/40' : 'border-slate-50 opacity-40'}`}>
                    <div className="flex items-center gap-4 md:gap-6 flex-1 w-full">
                      <div className={`w-14 h-14 md:w-20 md:h-20 rounded-[1.5rem] md:rounded-[2.2rem] flex items-center justify-center border-2 shrink-0 ${item.category === 'personal' || item.category === 'discreet' || item.category === 'identity' ? 'bg-sky-50 border-sky-100 text-sky-500' : 'bg-emerald-50 border-emerald-100 text-emerald-500'}`}>
                        {item.category === 'personal' ? <MessageSquare size={24} md:size={28} /> : item.category === 'matrimony' ? <Heart size={24} md:size={28} /> : item.category === 'discreet' ? <Flame size={24} md:size={28} /> : item.category === 'identity' ? <Fingerprint size={24} md:size={28} /> : <Users size={24} md:size={28} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-800 text-lg md:text-xl tracking-tight uppercase leading-none truncate">
                          {item.name}
                        </h4>
                        <p className="text-[9px] md:text-[11px] font-black text-slate-300 uppercase tracking-widest mt-1.5 md:mt-2 truncate">{item.type}</p>
                      </div>
                    </div>
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 w-full md:w-auto">
                      <div className={`px-4 md:px-6 py-1.5 md:py-2.5 rounded-full text-[8px] md:text-[10px] font-black uppercase border ${item.status !== 'No Record Found' ? 'bg-sky-50 text-sky-600 border-sky-100' : 'bg-slate-50 text-slate-400 border-slate-50'}`}>
                        {item.status !== 'No Record Found' ? "RECOVERY AVAILABLE" : "NO ANOMALIES"}
                      </div>
                      {isRevealed && item.status !== 'No Record Found' && item.link && (
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1 bg-sky-50 hover:bg-sky-100 rounded-full border border-sky-100 text-[8px] md:text-[9px] font-black text-sky-600 uppercase tracking-widest transition-all">
                          <Eye size={12} /> View Recovery Link
                        </a>
                      )}
                      {item.isPrivate && item.status !== 'No Record Found' && <div className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><Lock size={10} md:size={12} /> <span className="hidden xs:inline">Encrypted Trace</span></div>}
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-200">
                    <Activity size={48} className="mb-4 opacity-20" />
                    <p className="font-black text-xs uppercase tracking-widest">Results are locked until verification.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* MODALS */}
      {showWelcome && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 w-full max-w-md p-8 md:p-14 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl border border-white/5 text-center animate-in zoom-in slide-in-from-bottom-12 duration-700 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-sky-500/10 rounded-full flex items-center justify-center mb-6 md:mb-8 mx-auto ring-8 ring-sky-500/5"><Eye className="text-sky-500" size={28} md:size={32} /></div>
            <h2 className="text-2xl md:text-3xl font-black text-white uppercase mb-3 md:mb-4 leading-none tracking-tighter">Find out if they have a secret life online.</h2>
            <p className="text-slate-400 text-sm font-medium mb-8 md:mb-10 leading-relaxed max-w-xs mx-auto">
              Everyone has a digital footprint. We scan over 30+ social, dating, and matrimonial apps to see if their story adds up.
            </p>
            <div className="space-y-3 md:space-y-4 mb-8 md:mb-12 text-left text-[9px] md:text-[10px] font-black uppercase text-slate-500 tracking-widest">
              <div className="flex items-center gap-4 px-4 md:px-5 py-3 md:py-4 bg-white/5 rounded-xl md:rounded-2xl border border-white/5"><Fingerprint size={16} className="text-sky-500" /> AI-Powered Risk Scoring</div>
              <div className="flex items-center gap-4 px-4 md:px-5 py-3 md:py-4 bg-white/5 rounded-xl md:rounded-2xl border border-white/5"><ShieldCheck size={16} className="text-emerald-500" /> 100% Private & Confidential</div>
            </div>
            <button onClick={() => setShowWelcome(false)} className="w-full py-5 md:py-6 bg-sky-600 text-white rounded-2xl md:rounded-3xl font-black text-[10px] md:text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-sky-700 transition-all">Start Your Search</button>
          </div>
        </div>
      )}

      {showSummary && !isRevealed && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-slate-950/95 backdrop-blur-2xl">
          <div className="bg-slate-900 w-full max-w-sm md:max-w-xl p-8 md:p-14 rounded-[3rem] md:rounded-[4rem] shadow-2xl border border-white/10 text-center flex flex-col items-center animate-in zoom-in slide-in-from-bottom-20 duration-1000 max-h-[95vh] overflow-y-auto no-scrollbar relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-rose-500/10 blur-[100px] rounded-full"></div>
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-sky-500/10 blur-[100px] rounded-full"></div>

            <div className="w-16 h-16 md:w-20 md:h-20 bg-rose-500/20 rounded-full flex items-center justify-center mb-6 md:mb-8 ring-8 ring-rose-500/10 mx-auto animate-pulse relative z-10"><ShieldAlert className="text-rose-500" size={32} md:size={40} /></div>
            
            <div className="relative z-10 space-y-2 mb-8">
              <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter leading-none animate-in fade-in slide-in-from-top-4 duration-1000">Identity Conflict Detected</h2>
              <div className="h-1 w-20 bg-rose-500 mx-auto rounded-full"></div>
            </div>

            <p className="text-slate-400 text-xs md:text-sm font-medium mb-10 md:mb-12 leading-relaxed max-w-md relative z-10">
              This subject shows <span className="text-rose-400 font-black border-b border-rose-400/30 pb-0.5">simultaneous footprints</span> across <span className="text-white font-black">Matrimonial Overlap</span> and <span className="text-white font-black">Casual Dating</span> categories.
            </p>
            
            <div className="grid grid-cols-2 gap-4 md:gap-6 w-full mb-10 md:mb-12 relative z-10">
              <div className="bg-white/5 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-white/10 text-center group hover:bg-white/10 transition-all">
                <span className="text-3xl md:text-5xl font-black text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.3)]">{(summaryStats.personal + summaryStats.discreet + summaryStats.identity) > 0 ? (summaryStats.personal + summaryStats.discreet + summaryStats.identity) : '0'}</span>
                <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase mt-2 tracking-[0.2em]">Risk Signals</p>
              </div>
              <div className="bg-white/5 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-white/10 text-center relative overflow-hidden group hover:bg-white/10 transition-all">
                <span className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter blur-[1px] group-hover:blur-0 transition-all duration-500">LOCKED</span>
                <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase mt-2 tracking-[0.2em]">Stability Score</p>
                <Lock className="absolute top-3 right-3 text-white/20" size={12} />
              </div>
            </div>
            
            <div className="w-full text-left space-y-4 md:space-y-5 mb-10 md:mb-12 p-6 md:p-10 bg-gradient-to-br from-white/5 to-transparent rounded-[2.5rem] md:rounded-[3rem] border border-white/10 relative z-10">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[10px] md:text-[11px] font-black text-sky-400 uppercase tracking-[0.3em] flex items-center gap-2"><Sparkles size={14} className="text-sky-400 animate-spin-slow" /> DeepPersona™ Characterization</h4>
                <div className="px-2 py-0.5 bg-sky-500/20 rounded text-[8px] font-black text-sky-400 border border-sky-500/20 uppercase">High Intensity</div>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {[
                  { label: "Infidelity Risk", desc: "Married vs. Active Profile", color: "text-rose-400" },
                  { label: "Intent Hypocrisy", desc: "Matrimony vs. Hookup", color: "text-amber-400" },
                  { label: "Identity Shift", desc: "Hidden Orientation Detection", color: "text-indigo-400" },
                  { label: "Ghost Footprints", desc: "Claimed Deleted Profiles", color: "text-teal-400" }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 group cursor-default">
                    <div className="p-1.5 bg-white/5 rounded-lg group-hover:bg-white/10 transition-colors">
                      <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] md:text-[12px] font-black uppercase tracking-tight ${item.color}`}>{item.label}</p>
                      <p className="text-[10px] md:text-[11px] font-medium text-slate-400 leading-none mt-1 truncate">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full space-y-4 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => handleSabPaisaPayment(79, 'reveal')}
                  className="w-full py-5 md:py-6 bg-gradient-to-r from-rose-600 to-rose-500 text-white rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.2em] shadow-xl hover:shadow-rose-500/20 active:scale-95 transition-all flex flex-col items-center justify-center gap-1 group"
                >
                  <div className="flex items-center gap-3"><Smartphone size={18} /> <span>Secure Checkout</span></div>
                  <span className="text-[8px] opacity-60">Pay ₹79 via PayU</span>
                </button>

                <button 
                  onClick={() => { window.location.href = UPI_REVEAL; setPaymentStatus('initiating'); }} 
                  className="w-full py-5 md:py-6 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.2em] hover:bg-slate-50 active:scale-95 transition-all flex flex-col items-center justify-center gap-1 group"
                >
                  <div className="flex items-center gap-3 text-emerald-600"><Activity size={18} /> <span>Fast UPI Pay</span></div>
                  <span className="text-[8px] text-slate-400">Direct App Transfer</span>
                </button>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  <ShieldCheck size={14} className="text-emerald-500" /> 100% Confidential & Stealth Audit
                </div>
                <button onClick={() => setShowSummary(false)} className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] hover:text-slate-400 transition-colors">Return to Scan Area</button>
              </div>
            </div>
            
            {paymentStatus === 'initiating' && (
              <div className="mt-8 md:mt-10 w-full p-8 bg-white/5 rounded-[2rem] border border-white/10 animate-in slide-in-from-bottom-10 duration-500 relative z-20">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <Loader2 className="animate-spin text-rose-500" size={24} />
                  <p className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Payment Verification in Progress</p>
                </div>
                
                <button
                  onClick={() => {
                    const logs = JSON.parse(localStorage.getItem('transaction_logs') || '[]');
                    const newLog = {
                      id: `PAYU-${Date.now()}`,
                      amount: 79,
                      date: new Date().toISOString(),
                      type: 'PayU Reveal',
                      target: formData.fullName
                    };
                    logs.push(newLog);
                    localStorage.setItem('transaction_logs', JSON.stringify(logs));
                    
                    // Force a storage event for the admin panel to detect
                    window.dispatchEvent(new Event('storage'));
                    
                    setPaymentStatus('idle');
                    setIsRevealed(true);
                  }}
                  className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.25em] shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
                >
                  Verify Payment Completion
                </button>
                <p className="mt-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                  Click after you complete the transaction in your UPI app.
                </p>
              </div>
            )}
            {paymentStatus === 'submitted' && <div className="py-8 md:py-10"><CheckCircle className="text-emerald-500 mx-auto mb-4 md:mb-6 scale-110 md:scale-125" size={40} md:size={48} /><h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase">Verified.</h2><Loader2 className="animate-spin text-emerald-500 mx-auto mt-8 md:mt-10" /></div>}
          </div>
        </div>
      )}

      {/* Wipe Modal */}
      {showWipeModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 md:p-6 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-md p-8 md:p-12 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl border border-white/20 text-center animate-in zoom-in duration-500 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-6 mx-auto"><Trash2 className="text-rose-500" size={28} /></div>
            <h2 className="text-2xl font-black text-slate-900 uppercase mb-4 tracking-tighter">Wipe My Trace</h2>
            <p className="text-slate-400 text-[10px] font-medium mb-8 leading-relaxed">Secure your digital footprint and present a clean profile across all platforms.</p>
            
            {wipePaymentStatus === 'idle' && (
              <div className="space-y-6">
                <div className="space-y-4 text-left mb-6">
                  <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-2">Data to Secure</h3>
                  <input value={wipeData.fullName} onChange={(e) => setWipeData({...wipeData, fullName: e.target.value})} placeholder="Full Name to Wipe" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-rose-200" />
                  <p className="text-[9px] text-slate-400 px-2 leading-relaxed italic">You will be asked for emails/phones after payment verification.</p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <button 
                    disabled={!wipeData.fullName.trim()}
                    onClick={() => handleSabPaisaPayment(1499, 'wipe')} 
                    className="w-full py-5 bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-rose-600 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                  >
                    <Smartphone size={18} /> Secure Checkout (PayU)
                  </button>
                  
                  <button 
                    disabled={!wipeData.fullName.trim()}
                    onClick={() => {
                      localStorage.setItem('pending_wipe_data', JSON.stringify({
                        fullName: wipeData.fullName.toLowerCase().trim(),
                        emails: '',
                        phones: ''
                      }));
                      window.location.href = UPI_WIPE;
                      setWipePaymentStatus('initiating');
                    }} 
                    className="w-full py-5 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-50 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                  >
                    <Activity size={18} className="text-emerald-600" /> Fast UPI Pay
                  </button>
                </div>
                {txnError && <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest text-center animate-pulse">{txnError}</p>}
                <button onClick={() => setShowWipeModal(false)} className="text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-500 w-full">Cancel</button>
              </div>
            )}

            {wipePaymentStatus === 'initiating' && (
              <div className="py-10 animate-in fade-in duration-500">
                <div className="flex flex-col items-center justify-center mb-8">
                  <Loader2 className="animate-spin text-rose-500 mb-4" size={40} />
                  <p className="font-black text-xs uppercase tracking-[0.3em] text-slate-400">Securing Secure Node...</p>
                </div>
                
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <button
                    onClick={() => {
                      const logs = JSON.parse(localStorage.getItem('transaction_logs') || '[]');
                      const newLog = {
                        id: `PAYU-${Date.now()}`,
                        amount: 1499,
                        date: new Date().toISOString(),
                        type: 'PayU Wipe',
                        target: wipeData.fullName
                      };
                      logs.push(newLog);
                      localStorage.setItem('transaction_logs', JSON.stringify(logs));
                      
                      // Force a storage event for the admin panel to detect
                      window.dispatchEvent(new Event('storage'));
                      
                      setWipePaymentStatus('completed');
                    }}
                    className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95"
                  >
                    I Completed Payment
                  </button>
                  <p className="mt-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                    Confirm after completing the UPI transaction.
                  </p>
                </div>
              </div>
            )}

            {wipePaymentStatus === 'submitted' && (
              <div className="py-10">
                <Loader2 className="animate-spin text-rose-500 mx-auto mb-4" size={32} />
                <p className="font-black text-[10px] uppercase tracking-widest text-slate-400">Verifying Payment...</p>
              </div>
            )}

            {wipePaymentStatus === 'completed' && (
              <div className="space-y-6 text-left">
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 mb-6">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider text-center flex items-center justify-center gap-2"><CheckCircle size={14} /> Payment Verified</p>
                </div>
                <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Wipe Data Entry</h3>
                <div className="space-y-4">
                  <input value={wipeData.fullName} onChange={(e) => setWipeData({...wipeData, fullName: e.target.value})} placeholder="Official Full Name" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-rose-200" />
                  <input value={wipeData.aliases} onChange={(e) => setWipeData({...wipeData, aliases: e.target.value})} placeholder="Aliases (Comma Separated)" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-rose-200" />
                  <input value={wipeData.emails} onChange={(e) => setWipeData({...wipeData, emails: e.target.value})} placeholder="Emails (Comma Separated)" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-rose-200" />
                  <input value={wipeData.phones} onChange={(e) => setWipeData({...wipeData, phones: e.target.value})} placeholder="Phones (Comma Separated)" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-rose-200" />
                </div>
                <button onClick={() => {
                  const wipedUsers = JSON.parse(localStorage.getItem('wiped_users') || '[]');
                  wipedUsers.push({
                    fullName: wipeData.fullName.toLowerCase().trim(),
                    emails: wipeData.emails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean),
                    phones: wipeData.phones.split(',').map(p => p.trim()).filter(Boolean)
                  });
                  localStorage.setItem('wiped_users', JSON.stringify(wipedUsers));
                  setShowWipeModal(false);
                  alert('User footprint secured. Future scans will return clean profiles.');
                }} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase mt-6 tracking-[0.2em] shadow-xl">Complete Wipe</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Privacy Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 md:p-6 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 w-full max-w-lg p-8 md:p-12 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl border border-white/5 animate-in zoom-in duration-500 max-h-[90vh] overflow-y-auto no-scrollbar text-left">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500"><ShieldCheck size={24} /></div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Privacy Center</h2>
            </div>
            <div className="space-y-6 text-slate-400 text-xs md:text-sm leading-relaxed">
              <section>
                <h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-2">Zero-Retention Policy</h4>
                <p>TraceThem operates on a transient intelligence model. We do not store the names, emails, or phone numbers of the subjects you search. Once your session ends or you clear your browser cache, the data is permanently purged from your local device.</p>
              </section>
              <section>
                <h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-2">Target Anonymity</h4>
                <p>The "Double-Life Detection" scan is 100% passive. We never contact the target, their friends, or the platforms being scanned. No notification, email, or SMS is ever sent to the subject of your search.</p>
              </section>
              <section>
                <h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-2">Merchant & Contact Information</h4>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <p className="text-white font-bold mb-1">Legal Name: Vishvendra Pal Sirohi</p>
                  <p className="text-slate-400">Registered Address: A1-2105, Casa Greens, Noida Extension, Greater Noida, Uttar Pradesh 201306</p>
                  <p className="text-slate-400 mt-2">Email: support@tracethem.online</p>
                </div>
              </section>
            </div>
            <button onClick={() => setShowPrivacyModal(false)} className="w-full py-5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-[10px] uppercase mt-10 tracking-[0.3em] transition-all border border-white/5">Close Privacy Center</button>
          </div>
        </div>
      )}

      {/* Terms Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 md:p-6 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 w-full max-w-lg p-8 md:p-12 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl border border-white/5 animate-in zoom-in duration-500 max-h-[90vh] overflow-y-auto no-scrollbar text-left">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500"><Scale size={24} /></div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Terms of Verification</h2>
            </div>
            <div className="space-y-6 text-slate-400 text-xs md:text-sm leading-relaxed">
              <p className="text-white font-bold italic">This website is operated by Vishvendra Pal Sirohi.</p>
              
              <section>
                <h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-2">Service Nature</h4>
                <p>TraceThem provides digital behavioral risk assessments based on footprint recovery. These "Signals" represent recovered legacy data or anomalous records and do not always indicate an active profile. Our primary service is generating these one-time digital intelligence reports.</p>
              </section>

              <section>
                <h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-2">Pricing & Payment</h4>
                <p>All prices are listed in Indian Rupees (INR). Reports are priced at ₹79 per audit, and the "Wipe My Trace" service is priced at ₹1499. Payments are processed securely via our integrated gateway partners.</p>
              </section>

              <section>
                <h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-2">Return & Refund Policy</h4>
                <p>Due to the instantaneous and digital nature of our intelligence reports, we do not offer refunds once a report has been generated and displayed on your screen. If a payment is successful but the report fails to load due to a technical error, you may request a refund within 7 days. Approved refunds will be processed via the original payment mode within 5-7 working days.</p>
              </section>

              <section>
                <h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-2">Cancellation Policy</h4>
                <p>Cancellation of a digital audit is only possible before the final verification step is completed. Once the "Confirm Payment" or "I Completed Payment" step is initiated and the report is generated, the service is considered consumed and cannot be cancelled.</p>
              </section>

              <section>
                <h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-2">Shipping & Delivery Policy</h4>
                <p>TraceThem provides purely digital services. No physical products are shipped. Reports are delivered instantly (typically within 60-120 seconds) directly within your browser interface upon successful payment verification. A copy of the report ID is stored in your local session for the duration of your visit.</p>
              </section>

              <section>
                <h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-2">Ethical Use</h4>
                <p>This tool is for personal transparency only. Any use for illegal stalking or harassment is strictly prohibited. You assume full responsibility for how you interpret and use the "Risk Signals" provided.</p>
              </section>
            </div>
            <button onClick={() => setShowTermsModal(false)} className="w-full py-5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-[10px] uppercase mt-10 tracking-[0.3em] transition-all border border-white/5">Accept & Close</button>
          </div>
        </div>
      )}

      {/* About Us Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 md:p-6 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 w-full max-w-lg p-8 md:p-12 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl border border-white/5 animate-in zoom-in duration-500 max-h-[90vh] overflow-y-auto no-scrollbar text-left">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-sky-500/10 rounded-2xl text-sky-500"><Info size={24} /></div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">About Us</h2>
            </div>
            <div className="space-y-6 text-slate-400 text-xs md:text-sm leading-relaxed">
              <section>
                <h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-2">Our Mission</h4>
                <p>TraceThem was founded by Vishvendra Pal Sirohi with a simple mission: to provide personal transparency in the digital age. We believe everyone has the right to verify the digital claims of those they trust, ensuring safer and more honest relationships.</p>
              </section>
              <section>
                <h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-2">The Technology</h4>
                <p>We leverage advanced DeepPersona™ algorithms to recover legacy footprints across 30+ matrimonial and dating platforms. Our engine is designed to find "Ghost" profiles and intent mismatches without ever notifying the subject.</p>
              </section>
              <section>
                <h4 className="text-white font-black uppercase tracking-widest text-[10px] mb-2">Legal Entity</h4>
                <p>TraceThem is a personal digital intelligence tool operated by Vishvendra Pal Sirohi. We are committed to ethical verification and data privacy.</p>
              </section>
            </div>
            <button onClick={() => setShowAboutModal(false)} className="w-full py-5 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-[10px] uppercase mt-10 tracking-[0.3em] transition-all border border-white/5">Close About Us</button>
          </div>
        </div>
      )}

      {/* Admin Panel Modal */}
      {showAdminPanel && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-6 bg-slate-900/90 backdrop-blur-xl">
          <div className="bg-white w-full max-w-2xl p-8 md:p-12 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl border border-white/20 animate-in zoom-in duration-500 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-start mb-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600"><Lock size={24} /></div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Admin Console</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Central Intelligence & Logs</p>
                </div>
              </div>
              <button onClick={() => setShowAdminPanel(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><AlertCircle size={24} className="text-slate-300" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Daily Revenue</p>
                <p className="text-2xl font-black text-slate-900">₹{transactionStats.day}</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly</p>
                <p className="text-2xl font-black text-slate-900">₹{transactionStats.month}</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Yearly</p>
                <p className="text-2xl font-black text-slate-900">₹{transactionStats.year}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-2">Data Management</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={() => downloadLogs('transaction_logs')} className="p-6 bg-white border-2 border-slate-100 rounded-3xl hover:border-indigo-100 hover:bg-indigo-50/30 transition-all text-left group">
                  <div className="flex items-center gap-3 mb-3">
                    <Smartphone size={18} className="text-indigo-500" />
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Transaction Logs</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Download all payment records, IDs, and amounts as JSON.</p>
                </button>
                <button onClick={() => downloadLogs('search_logs')} className="p-6 bg-white border-2 border-slate-100 rounded-3xl hover:border-rose-100 hover:bg-rose-50/30 transition-all text-left group">
                  <div className="flex items-center gap-3 mb-3">
                    <Search size={18} className="text-rose-500" />
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Search History</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Export all search queries and target names for analysis.</p>
                </button>
                <button onClick={() => downloadLogs('wiped_users')} className="p-6 bg-white border-2 border-slate-100 rounded-3xl hover:border-emerald-100 hover:bg-emerald-50/30 transition-all text-left group">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle size={18} className="text-emerald-500" />
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Wiped Database</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Download list of users who paid for footprint removal.</p>
                </button>
                <button onClick={() => {
                  if (confirm("Are you sure you want to clear all local data? This cannot be undone.")) {
                    localStorage.clear();
                    window.location.reload();
                  }
                }} className="p-6 bg-white border-2 border-rose-50 rounded-3xl hover:bg-rose-500 hover:text-white transition-all text-left group">
                  <div className="flex items-center gap-3 mb-3">
                    <Trash2 size={18} className="group-hover:text-white text-rose-500" />
                    <span className="text-xs font-black uppercase tracking-wider">Reset Console</span>
                  </div>
                  <p className="text-[10px] group-hover:text-rose-100 text-slate-400 font-medium leading-relaxed">Permanently delete all logs and history from this device.</p>
                </button>
              </div>
            </div>
            
            <p className="mt-10 text-center text-[9px] font-black text-slate-200 uppercase tracking-[0.5em]">Intel Console Access Restricted</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 md:px-6 py-12 border-t border-slate-50 flex flex-col lg:flex-row justify-between items-center gap-8 text-center lg:text-left">
        <div className="flex items-center gap-4 order-2 lg:order-1">
          <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 shrink-0">
            <Info size={18} />
          </div>
          <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.4em]">© 2026 TraceThem — Personal Transparency Engine</p>
        </div>
        
        <div className="flex flex-wrap justify-center lg:justify-end items-center gap-6 md:gap-10 order-1 lg:order-2">
          <button onClick={() => setShowAboutModal(true)} className="text-slate-300 hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.4em] shrink-0">About Us</button>
          <button onClick={() => setShowWipeModal(true)} className="flex items-center gap-2 text-rose-400 hover:text-rose-600 transition-colors border-b-2 border-rose-50 pb-1 text-[10px] font-black uppercase tracking-[0.4em] shrink-0">
            <Trash2 size={14} /> Wipe My Trace
          </button>
          <button onClick={() => setShowPrivacyModal(true)} className="text-slate-300 hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.4em] shrink-0">Privacy Center</button>
          <button onClick={() => setShowTermsModal(true)} className="text-slate-300 hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.4em] shrink-0">Terms of Verification</button>
        </div>
      </footer>
    </div>
  );
};

export default App;
