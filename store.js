// ═══════════════════════════════════════════════════════
//  H.E.R LUXURY — Store Data Layer (Supabase Edition)
//  Shared between storefront and admin panel
// ═══════════════════════════════════════════════════════

const SETTINGS_KEY = 'her_luxury_settings';

const DEFAULT_SETTINGS = {
  storeName: 'H.E.R LUXURY',
  tagline: 'Artisan Fragrances',
  currency: '€',
  groqApiKey: ''
};

// ── SUPABASE HELPERS ──────────────────────────────────

function getSupabaseHeaders(token) {
  return {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
}

async function supabaseQuery(path, options = {}, token) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: getSupabaseHeaders(token),
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.hint || `Supabase error ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── AUTH ──────────────────────────────────────────────

async function signIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || 'Login failed. Check your email and password.');
  sessionStorage.setItem('her_session', JSON.stringify(data));
  return data;
}

async function signOut() {
  const s = getSession();
  if (s?.access_token) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${s.access_token}` }
    }).catch(() => {});
  }
  sessionStorage.removeItem('her_session');
}

function getSession() {
  try { return JSON.parse(sessionStorage.getItem('her_session')); }
  catch { return null; }
}

function isLoggedIn() {
  return !!(getSession()?.access_token);
}

// ── PRODUCTS ──────────────────────────────────────────

async function getProducts() {
  return supabaseQuery('products?order=created_at.desc');
}

async function addProduct(data) {
  const s = getSession();
  const product = {
    name: data.name || 'Unnamed Perfume',
    collection: data.collection || 'Essence',
    price: parseFloat(data.price) || 0,
    notes: data.notes || '',
    description: data.description || '',
    in_stock: data.inStock !== false && data.in_stock !== false,
    revolut: data.revolut || '',
    featured: data.featured || false,
    image_url: data.image_url || data.image || ''
  };
  const result = await supabaseQuery('products', {
    method: 'POST', body: JSON.stringify(product)
  }, s?.access_token);
  return Array.isArray(result) ? result[0] : result;
}

async function updateProduct(id, data) {
  const s = getSession();
  const changes = {};
  if (data.name !== undefined) changes.name = data.name;
  if (data.collection !== undefined) changes.collection = data.collection;
  if (data.price !== undefined) changes.price = parseFloat(data.price);
  if (data.notes !== undefined) changes.notes = data.notes;
  if (data.description !== undefined) changes.description = data.description;
  if (data.inStock !== undefined) changes.in_stock = data.inStock;
  if (data.in_stock !== undefined) changes.in_stock = data.in_stock;
  if (data.revolut !== undefined) changes.revolut = data.revolut;
  if (data.featured !== undefined) changes.featured = data.featured;
  if (data.image_url !== undefined) changes.image_url = data.image_url;
  if (data.image !== undefined) changes.image_url = data.image;

  const result = await supabaseQuery(`products?id=eq.${id}`, {
    method: 'PATCH', body: JSON.stringify(changes)
  }, s?.access_token);
  return Array.isArray(result) ? result[0] : result;
}

async function deleteProduct(id) {
  const s = getSession();
  await supabaseQuery(`products?id=eq.${id}`, { method: 'DELETE' }, s?.access_token);
}

// ── IMAGE UPLOAD ──────────────────────────────────────

async function uploadProductImage(file) {
  const s = getSession();
  const ext = file.name.split('.').pop().toLowerCase();
  const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 8)}.${ext}`;

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${fileName}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${s?.access_token || SUPABASE_ANON_KEY}`,
      'Content-Type': file.type,
      'Cache-Control': '3600'
    },
    body: file
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Image upload failed');
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${fileName}`;
}

// ── SETTINGS ──────────────────────────────────────────

function getSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  } catch { return DEFAULT_SETTINGS; }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ── AI COMMAND PARSER (Groq) ──────────────────────────

async function executeAICommand(userMessage, apiKey, products) {
  const systemPrompt = `You are the store manager AI for "H.E.R LUXURY", a luxury perfume store.
Interpret natural language commands and return a JSON action object.

Current products:
${JSON.stringify(products.map(p => ({ id: p.id, name: p.name, collection: p.collection, price: p.price, in_stock: p.in_stock, revolut: p.revolut, featured: p.featured })), null, 2)}

Respond with ONLY valid JSON, no markdown. Structure:
- "action": "add" | "update" | "delete" | "info" | "unknown"
- "message": friendly 1-2 sentence confirmation
- add → "product": { name, collection, price, notes, description, in_stock, revolut, featured }
- update → "id" + "changes": { use in_stock (boolean), not inStock }
- delete → "id"
- info/unknown → message only

Rules: extract price numbers, "sold out" → in_stock:false, "back in stock" → in_stock:true, match names case-insensitively. Collections: Nocturne, Lumière, Essence.`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
      temperature: 0.2,
      max_tokens: 600
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Groq API error ${response.status}`);
  }

  const data = await response.json();
  const raw = data.choices[0].message.content.trim();
  return JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());
}

async function processAICommand(userMessage, apiKey) {
  const products = await getProducts();
  const result = await executeAICommand(userMessage, apiKey, products);

  switch (result.action) {
    case 'add':
      if (result.product) {
        const p = await addProduct(result.product);
        return { success: true, message: result.message, product: p, action: 'add' };
      }
      break;
    case 'update':
      if (result.id && result.changes) {
        const p = await updateProduct(result.id, result.changes);
        return { success: !!p, message: result.message, product: p, action: 'update' };
      }
      break;
    case 'delete':
      if (result.id) {
        await deleteProduct(result.id);
        return { success: true, message: result.message, action: 'delete' };
      }
      break;
    case 'info':
      return { success: true, message: result.message, action: 'info' };
    default:
      return { success: false, message: result.message || "I didn't understand that command.", action: 'unknown' };
  }
  return { success: false, message: 'Something went wrong.', action: 'error' };
}

// ── VISION AI: Image → Product ────────────────────────

async function analyzeImageForProduct(imageFile, userDescription, apiKey) {
  const base64 = await fileToBase64(imageFile);

  const prompt = `You are a luxury perfume product creator for H.E.R LUXURY.
Analyze this perfume bottle image${userDescription ? ` and description: "${userDescription}"` : ''}.

Return ONLY valid JSON:
{
  "name": "Evocative 2-3 word luxury name",
  "collection": "Nocturne or Lumière or Essence",
  "price": 58,
  "notes": "Top note, heart note, base note",
  "description": "2-3 sentence poetic luxury description",
  "in_stock": true,
  "featured": false,
  "revolut": ""
}

Price 45-95 based on bottle luxury. Dark/heavy bottles → Nocturne (oud, amber, patchouli). Light/floral → Lumière or Essence. Be poetic and luxury-brand in tone.`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${imageFile.type};base64,${base64}` } },
          { type: 'text', text: prompt }
        ]
      }],
      temperature: 0.4,
      max_tokens: 600
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Vision API error ${response.status}`);
  }

  const data = await response.json();
  const raw = data.choices[0].message.content.trim();
  return JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
