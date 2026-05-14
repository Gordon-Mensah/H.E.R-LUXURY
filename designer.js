/* ═══════════════════════════════════════════════════════════════
   H.E.R LUXURY — DESIGN STUDIO
   Theme is saved to Supabase so it works across all browsers
   and on Vercel. localStorage is used only as a fast local cache.
═══════════════════════════════════════════════════════════════ */

const DESIGN_CACHE_KEY = 'her_design_cache';
const DESIGN_HISTORY_KEY = 'her_design_history';

/* ── DEFAULT THEME ──────────────────────────────────────────── */
const DEFAULT_THEME = {
  '--ivory':        '#fdfaf5',
  '--cream':        '#f8f2e8',
  '--parchment':    '#f0e6d6',
  '--blush':        '#f5e8e4',
  '--blush-mid':    '#e8cdc6',
  '--blush-deep':   '#d9b8b0',
  '--rose':         '#c97b6e',
  '--rose-dark':    '#a85a50',
  '--rose-light':   '#f2dbd7',
  '--gold':         '#b8954a',
  '--gold-light':   '#d4b978',
  '--gold-pale':    '#f0e2c0',
  '--taupe':        '#8c7b6e',
  '--text':         '#1c1410',
  '--text-mid':     '#4a3d35',
  '--text-dim':     '#7a6e65',
  '--text-muted':   '#b0a49a',
  '--border':       '#e4dbd0',
  '--border-lt':    '#ede7de',
  '--surface':      '#faf6f0',
  '--card':         '#ffffff',
  '--white':        '#ffffff',
  '--deep':         '#f2ede6',
  '--font-heading': "'Cormorant Garamond', serif",
  '--font-body':    "'Jost', sans-serif",
  '--card-radius':  '0px',
  '--show-marquee':      '1',
  '--show-materials':    '1',
  '--show-testimonials': '1',
  '--show-about':        '1',
};

/* ── PRESET THEMES ──────────────────────────────────────────── */
const PRESETS = {
  'Original': { ...DEFAULT_THEME },

  'Midnight': {
    ...DEFAULT_THEME,
    '--ivory':        '#0d0b09',
    '--cream':        '#131009',
    '--parchment':    '#1a1510',
    '--blush':        '#1e1714',
    '--blush-mid':    '#2a1f1a',
    '--blush-deep':   '#3a2820',
    '--rose':         '#d4856e',
    '--rose-dark':    '#b8644d',
    '--rose-light':   '#2a1a16',
    '--gold':         '#c9a96e',
    '--gold-light':   '#e0c48c',
    '--gold-pale':    '#2a2010',
    '--taupe':        '#9a8a7e',
    '--text':         '#f5f0ea',
    '--text-mid':     '#c8b8a8',
    '--text-dim':     '#8a7a6e',
    '--text-muted':   '#5a4e46',
    '--border':       '#2e241e',
    '--border-lt':    '#241c16',
    '--surface':      '#100d09',
    '--card':         '#160f0a',
    '--white':        '#160f0a',
    '--deep':         '#0a0806',
  },

  'Emerald': {
    ...DEFAULT_THEME,
    '--rose':         '#3a8c60',
    '--rose-dark':    '#2a6b48',
    '--rose-light':   '#e8f5ed',
    '--gold':         '#7ab88c',
    '--gold-light':   '#9ecfb0',
    '--gold-pale':    '#d4ede0',
    '--blush':        '#d4ece0',
    '--blush-mid':    '#b8d8c6',
    '--blush-deep':   '#96c4ae',
    '--ivory':        '#f5fbf7',
    '--cream':        '#eaf4ee',
    '--parchment':    '#ddeee3',
    '--taupe':        '#6e8c78',
  },

  'Cobalt': {
    ...DEFAULT_THEME,
    '--rose':         '#3a5cbf',
    '--rose-dark':    '#2a45a0',
    '--rose-light':   '#e8ecf8',
    '--gold':         '#7a96e8',
    '--gold-light':   '#9eb0f0',
    '--gold-pale':    '#d4daf5',
    '--blush':        '#d4daf5',
    '--blush-mid':    '#b8c2e8',
    '--blush-deep':   '#96a6d4',
    '--ivory':        '#f5f7fc',
    '--cream':        '#eaeefc',
    '--parchment':    '#dde3f8',
    '--taupe':        '#6e7e9a',
  },

  'Onyx': {
    ...DEFAULT_THEME,
    '--rose':         '#1a1a1a',
    '--rose-dark':    '#000000',
    '--rose-light':   '#ebebeb',
    '--gold':         '#555555',
    '--gold-light':   '#777777',
    '--gold-pale':    '#e8e8e8',
    '--blush':        '#e0e0e0',
    '--blush-mid':    '#cccccc',
    '--blush-deep':   '#b8b8b8',
    '--ivory':        '#f8f8f8',
    '--cream':        '#f0f0f0',
    '--parchment':    '#e4e4e4',
    '--taupe':        '#888888',
  },

  'Blush Luxe': {
    ...DEFAULT_THEME,
    '--rose':         '#e8908a',
    '--rose-dark':    '#d4706a',
    '--gold':         '#e8b4b8',
    '--gold-light':   '#f0cdd0',
    '--gold-pale':    '#fce8ea',
    '--blush':        '#fce8ea',
    '--blush-mid':    '#f8d4d8',
    '--blush-deep':   '#f0b8be',
    '--ivory':        '#fff8f8',
    '--cream':        '#fef0f0',
    '--parchment':    '#fce8e8',
    '--taupe':        '#c4909a',
    '--text':         '#2a1418',
    '--text-mid':     '#5a3840',
    '--text-dim':     '#8a6068',
  },
};

/* ── LOCAL CACHE ────────────────────────────────────────────── */
function getCachedTheme() {
  try { const s = localStorage.getItem(DESIGN_CACHE_KEY); return s ? JSON.parse(s) : null; }
  catch { return null; }
}
function setCachedTheme(theme) {
  try { localStorage.setItem(DESIGN_CACHE_KEY, JSON.stringify(theme)); } catch {}
}
function clearThemeCache() {
  try { localStorage.removeItem(DESIGN_CACHE_KEY); } catch {}
}

/* ── UNDO HISTORY ────────────────────────────────────────────── */
function pushHistory(theme) {
  try {
    const hist = JSON.parse(localStorage.getItem(DESIGN_HISTORY_KEY) || '[]');
    hist.push(JSON.stringify(theme));
    if (hist.length > 20) hist.shift();
    localStorage.setItem(DESIGN_HISTORY_KEY, JSON.stringify(hist));
  } catch {}
}
function undoHistory() {
  try {
    const hist = JSON.parse(localStorage.getItem(DESIGN_HISTORY_KEY) || '[]');
    if (!hist.length) return null;
    const prev = JSON.parse(hist.pop());
    localStorage.setItem(DESIGN_HISTORY_KEY, JSON.stringify(hist));
    return prev;
  } catch { return null; }
}

/* ── CSS EXPORT ─────────────────────────────────────────────── */
function exportThemeAsCSS(theme) {
  const diff = {};
  Object.entries(theme).forEach(([k, v]) => { if (v !== DEFAULT_THEME[k]) diff[k] = v; });
  if (!Object.keys(diff).length) return '/* No changes from default theme */';
  return `:root {\n${Object.entries(diff).map(([k,v]) => `  ${k}: ${v};`).join('\n')}\n}`;
}

/* ── AI DESIGN COMMAND ───────────────────────────────────────── */
async function processDesignCommand(message, currentTheme, groqApiKey) {
  const systemPrompt = `You are an AI website designer for a luxury perfume brand called H.E.R Luxury.
You control the website's visual design by modifying CSS custom property values.

CURRENT THEME:
${JSON.stringify(currentTheme, null, 2)}

RULES:
- Respond ONLY with valid JSON — no markdown, no explanation, no backticks.
- Return exactly two keys: "message" (string) and "changes" (object with CSS variable key-value pairs).
- Only include variables you are changing in "changes".
- Colors must be valid hex values (e.g. "#c97b6e").
- Fonts must be full CSS font-family strings (e.g. "'Playfair Display', serif").
- If no changes are needed, return "changes": {}.

AVAILABLE CSS VARIABLES:
Colors: --ivory, --cream, --parchment, --blush, --blush-mid, --blush-deep, --rose, --rose-dark, --rose-light, --gold, --gold-light, --gold-pale, --taupe, --text, --text-mid, --text-dim, --text-muted, --border, --border-lt, --surface, --card, --white, --deep
Fonts: --font-heading, --font-body
Layout: --card-radius (e.g. "8px")
Sections: --show-marquee, --show-materials, --show-testimonials, --show-about ("1"=visible, "0"=hidden)

DESIGN RULES:
- --rose is the PRIMARY accent (buttons, highlights, badges)
- --gold is SECONDARY (prices, featured items)
- --text must always contrast strongly with --ivory
- When going dark, update ALL related colors together

Example: {"message": "Changed to emerald.", "changes": {"--rose": "#3a8c60", "--rose-dark": "#2a6b48"}}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '{}';
  let parsed;
  try { parsed = JSON.parse(text.trim()); }
  catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
    else throw new Error('AI returned invalid JSON');
  }
  return { message: parsed.message || 'Done.', changes: parsed.changes || {} };
}
