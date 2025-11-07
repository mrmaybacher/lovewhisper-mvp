import React, { useEffect, useMemo, useState } from "react";

/**
 * LoveWhisper MVP – single‑file React app
 * - TailwindCSS styling
 * - 3 curated proposals per set (mix of formats)
 * - Tone + Occasion filters
 * - Shuffle w/ 30‑day no‑repeat (per user, via localStorage)
 * - Copy / Share / Favorite
 * - "Another set" refresh with subtle paywall mock
 * - Streaks + Care Score (light gamification)
 * - Favorites drawer
 * - Simple "subscription" toggle for testing
 */

// ---- Seed Assets (texts/poems/images). In production, load from DB. ----
// Keep language natural, anti‑AI clichés avoided.
const seedAssets = [
  {
    id: "t1",
    type: "text",
    tone: ["warm"],
    occasion: ["everyday"],
    content:
      "Hey. I saw something that made me think of you, and I smiled like an idiot on the tram.",
  },
  {
    id: "t2",
    type: "text",
    tone: ["playful"],
    occasion: ["morning"],
    content:
      "Morning troublemaker. Coffee or tea? I’m bringing whichever answer gets me a kiss later.",
  },
  {
    id: "t3",
    type: "poem",
    tone: ["tender"],
    occasion: ["night"],
    content:
      "Lights out. City softens.\nSomewhere between tired and calm,\nI land on you.",
  },
  {
    id: "t4",
    type: "text",
    tone: ["inside"],
    occasion: ["everyday"],
    content:
      "Your scarf color is now my default favorite. Didn’t vote on it. It just happened.",
  },
  {
    id: "t5",
    type: "text",
    tone: ["playful"],
    occasion: ["everyday"],
    content:
      "Breaking news: I miss you. Developing story: I’m doing something about it tonight.",
  },
  {
    id: "t6",
    type: "poem",
    tone: ["warm"],
    occasion: ["everyday"],
    content:
      "Small note, big meaning—\nif you need me, say the word.\nI’ll reroute my day.",
  },
  {
    id: "i1",
    type: "image",
    tone: ["tender"],
    occasion: ["night"],
    content: {
      caption: "Goodnight. Leave one lamp on—I like finding you.",
      // Simple SVG card (no AI tells)
      svg:
        `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 630'>
          <defs>
            <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
              <stop offset='0%' stop-color='#0b1020'/>
              <stop offset='100%' stop-color='#1e2a44'/>
            </linearGradient>
          </defs>
          <rect width='1200' height='630' fill='url(#g)'/>
          <circle cx='980' cy='110' r='60' fill='#f3e9b6'/>
          <text x='80' y='500' font-size='56' fill='white' font-family='ui-sans-serif, system-ui'>
            goodnight—leave one lamp on
          </text>
        </svg>`,
    },
  },
  {
    id: "t7",
    type: "text",
    tone: ["warm"],
    occasion: ["morning"],
    content:
      "Good morning. If your day needs backup, I’m on call. Payment accepted: hugs.",
  },
  {
    id: "t8",
    type: "text",
    tone: ["playful"],
    occasion: ["everyday"],
    content:
      "Tonight: you, me, that place with the quiet corner. Dress code: your smile.",
  },
  {
    id: "t9",
    type: "poem",
    tone: ["tender"],
    occasion: ["rainy"],
    content:
      "Rain writes on windows—\nI read it as your name\nagain and again.",
  },
  {
    id: "i2",
    type: "image",
    tone: ["warm"],
    occasion: ["everyday"],
    content: {
      caption: "Thinking of you (accidentally on purpose).",
      svg:
        `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 630'>
          <rect width='1200' height='630' fill='#f5efe6'/>
          <rect x='120' y='120' width='960' height='390' fill='#ffffff' stroke='#222' stroke-width='4' rx='22'/>
          <text x='180' y='360' font-size='54' fill='#222' font-family='ui-serif, Georgia'>
            thinking of you—
          </text>
          <text x='180' y='420' font-size='40' fill='#444' font-family='ui-sans-serif, system-ui'>
            accidentally on purpose
          </text>
        </svg>`,
    },
  },
  {
    id: "t10",
    type: "text",
    tone: ["inside", "tender"],
    occasion: ["milestone"],
    content:
      "Tiny celebration tonight for a tiny reason: you exist in my day. That’s enough for me.",
  },
];

// ---- Utilities ----
const STORAGE_KEYS = {
  HISTORY: "lw_history_v1",
  FAVORITES: "lw_favorites_v1",
  PREFS: "lw_prefs_v1",
  STREAK: "lw_streak_v1",
  SUB: "lw_subscribed_v1",
  REFRESH: "lw_refresh_count_v1",
};

function loadLS(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function saveLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function daysBetween(dateA, dateB) {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

function dataUrlFromSvg(svg) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Simple weighted sample ensuring different types if possible
function pickSet(assets, historyIds, target = 3, mustMixTypes = true) {
  const now = Date.now();
  const pool = assets.filter((a) => !historyIds.has(a.id));
  if (pool.length <= target) return pool.slice(0, target);

  if (!mustMixTypes) {
    // random unique pick
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, target);
  }

  // try to include 1 text, 1 poem, 1 image if available
  const byType = (t) => pool.filter((a) => a.type === t);
  const sel = [];
  const types = ["text", "poem", "image"];
  types.forEach((t) => {
    const list = byType(t);
    if (list.length) sel.push(list[Math.floor(Math.random() * list.length)]);
  });
  // fill remaining
  while (sel.length < target) {
    const remaining = pool.filter((a) => !sel.find((s) => s.id === a.id));
    if (!remaining.length) break;
    sel.push(remaining[Math.floor(Math.random() * remaining.length)]);
  }
  return sel.slice(0, target);
}

function within30Days(ts) {
  const THIRTY = 30 * 24 * 60 * 60 * 1000;
  return Date.now() - ts < THIRTY;
}

// ---- Main Component ----
export default function App() {
  const [prefs, setPrefs] = useState(() =>
    loadLS(STORAGE_KEYS.PREFS, { tones: [], occasions: [], crumbs: {} })
  );
  const [favorites, setFavorites] = useState(() =>
    loadLS(STORAGE_KEYS.FAVORITES, [])
  );
  const [history, setHistory] = useState(() =>
    loadLS(STORAGE_KEYS.HISTORY, []) // [{id, servedAt}]
  );
  const [refreshCount, setRefreshCount] = useState(() =>
    loadLS(STORAGE_KEYS.REFRESH, 0)
  );
  const [subscribed, setSubscribed] = useState(() =>
    loadLS(STORAGE_KEYS.SUB, false)
  );
  const [setItems, setSetItems] = useState([]);
  const [toneFilter, setToneFilter] = useState("any");
  const [occFilter, setOccFilter] = useState("any");

  // Streaks
  const [streak, setStreak] = useState(() => loadLS(STORAGE_KEYS.STREAK, {
    lastDate: null, // yyyy-mm-dd
    count: 0,
    careScore: 0, // simple sum of interactions
  }));

  // Derived: filtered assets
  const filteredAssets = useMemo(() => {
    let arr = seedAssets;
    if (toneFilter !== "any") arr = arr.filter(a => a.tone?.includes(toneFilter));
    if (occFilter !== "any") arr = arr.filter(a => a.occasion?.includes(occFilter));
    return arr;
  }, [toneFilter, occFilter]);

  // Build history set for 30‑day no‑repeat
  const recentHistoryIds = useMemo(() => {
    const ids = new Set();
    history.forEach((h) => {
      if (within30Days(h.servedAt)) ids.add(h.id);
    });
    return ids;
  }, [history]);

  // initial set
  useEffect(() => {
    generateSet(true);
    // eslint-disable-next-line
  }, []);

  function generateSet(initial = false) {
    // Paywall mock: free has 1 initial + 1 extra daily refresh; subscribers unlimited
    if (!initial && !subscribed) {
      const today = new Date().toISOString().slice(0, 10);
      const key = `refresh_${today}`;
      const used = Number(sessionStorage.getItem(key) || 0);
      if (used >= 1) {
        // limit hit
        setPaywallOpen(true);
        return;
      }
      sessionStorage.setItem(key, String(used + 1));
    }

    const items = pickSet(filteredAssets, recentHistoryIds, 3, true);
    setSetItems(items);

    // update history
    const newHistory = [
      ...history,
      ...items.map((i) => ({ id: i.id, servedAt: Date.now() })),
    ];
    setHistory(newHistory);
    saveLS(STORAGE_KEYS.HISTORY, newHistory);

    // streak logic
    const today = new Date().toISOString().slice(0, 10);
    const last = streak.lastDate;
    let count = streak.count;
    if (!last) count = 1;
    else if (today === last) count = streak.count; // same day
    else if (daysBetween(last, today) === 1) count = streak.count + 1;
    else count = 1; // reset
    const updated = { ...streak, lastDate: today, count };
    setStreak(updated);
    saveLS(STORAGE_KEYS.STREAK, updated);
  }

  async function handleCopy(item) {
    const text = extractSendableText(item);
    try {
      await navigator.clipboard.writeText(text);
      toast(`Copied to clipboard`);
      bumpCareScore();
    } catch {
      toast("Copy failed. Select & copy manually.");
    }
  }

  async function handleShare(item) {
    const text = extractSendableText(item);
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        toast("No native share—copied instead.");
      }
      bumpCareScore();
    } catch {
      // user cancelled or unsupported
    }
  }

  function extractSendableText(item) {
    if (item.type === "image") {
      return item.content.caption || "";
    }
    return item.content;
  }

  function toggleFavorite(id) {
    const next = favorites.includes(id)
      ? favorites.filter((x) => x !== id)
      : [...favorites, id];
    setFavorites(next);
    saveLS(STORAGE_KEYS.FAVORITES, next);
    bumpCareScore(2);
  }

  function bumpCareScore(delta = 1) {
    const upd = { ...streak, careScore: (streak.careScore || 0) + delta };
    setStreak(upd);
    saveLS(STORAGE_KEYS.STREAK, upd);
  }

  const [toasts, setToasts] = useState([]);
  function toast(msg) {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2200);
  }

  const [paywallOpen, setPaywallOpen] = useState(false);

  // UI helpers
  const toneOptions = [
    { key: "any", label: "All tones" },
    { key: "warm", label: "Warm & light" },
    { key: "playful", label: "Playful flirty" },
    { key: "tender", label: "Tender deeper" },
    { key: "inside", label: "Inside‑joke" },
  ];
  const occOptions = [
    { key: "any", label: "Any occasion" },
    { key: "everyday", label: "Everyday" },
    { key: "morning", label: "Good morning" },
    { key: "night", label: "Good night" },
    { key: "rainy", label: "Rainy day" },
    { key: "milestone", label: "Milestone" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-black text-white grid place-items-center font-semibold">LW</div>
            <div className="leading-tight">
              <div className="font-semibold">LoveWhisper</div>
              <div className="text-xs text-neutral-500">Say it simply. Mean it fully.</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StreakPill count={streak.count} care={streak.careScore} />
            <button
              onClick={() => setSubscribed((s) => { saveLS(STORAGE_KEYS.SUB, !s); return !s; })}
              className={`px-3 py-1.5 rounded-xl text-sm border ${
                subscribed ? "bg-black text-white border-black" : "bg-white text-neutral-700"
              }`}
              title="Toggle subscription (demo)"
            >
              {subscribed ? "Subscribed" : "Free"}
            </button>
            <FavoritesDrawer favorites={favorites} toggleFavorite={toggleFavorite} />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <Selector label="Tone" value={toneFilter} options={toneOptions} onChange={setToneFilter} />
          <Selector label="Occasion" value={occFilter} options={occOptions} onChange={setOccFilter} />
          <button
            onClick={() => generateSet(false)}
            className="h-11 rounded-2xl border border-neutral-300 bg-white hover:shadow-sm"
          >
            Another set
          </button>
        </div>

        {/* Proposals */}
        <div className="grid md:grid-cols-3 gap-4">
          {setItems.map((item) => (
            <Card key={item.id} item={item} onCopy={handleCopy} onShare={handleShare} onFav={toggleFavorite} isFav={favorites.includes(item.id)} />
          ))}
        </div>

        {/* Paywall Modal */}
        {paywallOpen && (
          <Modal onClose={() => setPaywallOpen(false)}>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-2">Refresh limit reached</h3>
              <p className="text-neutral-600 mb-4">
                You’ve used today’s extra refresh. Subscribe to unlock unlimited sets and themed packs.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setSubscribed(true); saveLS(STORAGE_KEYS.SUB, true); setPaywallOpen(false); }}
                  className="px-4 py-2 rounded-xl bg-black text-white"
                >
                  Start trial
                </button>
                <button
                  onClick={() => setPaywallOpen(false)}
                  className="px-4 py-2 rounded-xl border"
                >
                  Not now
                </button>
              </div>
            </div>
          </Modal>
        )}
      </main>

      {/* Toasts */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className="px-3 py-2 rounded-xl bg-black text-white text-sm shadow-lg">
            {t.msg}
          </div>
        ))}
      </div>

      <footer className="py-10 text-center text-xs text-neutral-500">
        Built for MVP testing. Content feels human, not AI—please report anything off.
      </footer>
    </div>
  );
}

// ---- UI Components ----
function Selector({ label, value, options, onChange }) {
  return (
    <label className="block">
      <div className="mb-1 text-sm text-neutral-600">{label}</div>
      <select
        className="w-full h-11 rounded-2xl border border-neutral-300 bg-white px-3"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function Card({ item, onCopy, onShare, onFav, isFav }) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
      {item.type === "image" ? (
        <div className="aspect-[1200/630] w-full">
          {/* eslint-disable-next-line */}
          <img src={dataUrlFromSvg(item.content.svg)} alt={item.content.caption || "Card"} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="p-5 min-h-[180px] grid">
          <p className="whitespace-pre-line leading-relaxed text-[15px] md:text-base">{item.content}</p>
        </div>
      )}
      <div className="px-5 pb-5 flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <button onClick={() => onCopy(item)} className="px-3 py-1.5 rounded-xl border text-sm">
            Copy
          </button>
          <button onClick={() => onShare(item)} className="px-3 py-1.5 rounded-xl border text-sm">
            Share
          </button>
        </div>
        <button
          onClick={() => onFav(item.id)}
          className={`px-3 py-1.5 rounded-xl text-sm border ${isFav ? "bg-black text-white border-black" : "bg-white"}`}
        >
          {isFav ? "♥ Saved" : "♡ Save"}
        </button>
      </div>
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function FavoritesDrawer({ favorites, toggleFavorite }) {
  const [open, setOpen] = useState(false);
  const favAssets = seedAssets.filter((a) => favorites.includes(a.id));

  return (
    <div>
      <button
        className="px-3 py-1.5 rounded-xl border text-sm"
        onClick={() => setOpen(true)}
      >
        Favorites ({favorites.length})
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Your favorites</h3>
              <button className="text-sm text-neutral-500" onClick={() => setOpen(false)}>Close</button>
            </div>
            {favAssets.length === 0 ? (
              <p className="text-sm text-neutral-600">No favorites yet.</p>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-auto pr-1">
                {favAssets.map((a) => (
                  <div key={a.id} className="p-3 rounded-2xl border">
                    <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1">{a.type}</div>
                    {a.type === "image" ? (
                      <div className="aspect-[1200/630] w-full mb-2">
                        {/* eslint-disable-next-line */}
                        <img src={dataUrlFromSvg(a.content.svg)} alt={a.content.caption || "Card"} className="w-full h-full object-cover rounded-xl" />
                      </div>
                    ) : (
                      <p className="whitespace-pre-line text-sm leading-relaxed">{a.content}</p>
                    )}
                    <div className="mt-2 flex justify-end">
                      <button onClick={() => toggleFavorite(a.id)} className="text-sm underline">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function StreakPill({ count, care }) {
  return (
    <div className="px-3 py-1 rounded-full text-xs border bg-white flex items-center gap-2">
      <span title="Daily streak" className="inline-flex items-center gap-1">
        <span aria-hidden>🔥</span><span>{count}d</span>
      </span>
      <span className="text-neutral-400">·</span>
      <span title="Care Score" className="inline-flex items-center gap-1">
        <span aria-hidden>💌</span><span>{care}</span>
      </span>
    </div>
  );
}
