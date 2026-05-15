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

async function executeAICommand(userMessage, products) {
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

  const response = await fetch('/api/groq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

async function processAICommand(userMessage) {
  const products = await getProducts();
  const result = await executeAICommand(userMessage, products);

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

async function analyzeImageForProduct(imageFile, userDescription) {
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

  const response = await fetch('/api/groq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

// ═══════════════════════════════════════════════════════
//  ENQUIRY SYSTEM — Supabase data layer
// ═══════════════════════════════════════════════════════

async function sb(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': opts.prefer || 'return=representation',
      ...opts.headers
    },
    ...opts
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `Supabase error ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── Enquiries ──────────────────────────────────────────

async function submitEnquiry(data) {
  return sb('enquiries', {
    method: 'POST',
    body: JSON.stringify(data),
    prefer: 'return=representation'
  });
}

async function getEnquiries({ status, type, limit = 200 } = {}) {
  let q = `enquiries?order=created_at.desc&limit=${limit}`;
  if (status && status !== 'all') q += `&status=eq.${status}`;
  if (type && type !== 'all') q += `&enquiry_type=eq.${encodeURIComponent(type)}`;
  return sb(q, { method: 'GET', prefer: 'return=representation' });
}

async function updateEnquiry(id, data) {
  return sb(`enquiries?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    prefer: 'return=representation'
  });
}

async function deleteEnquiry(id) {
  return sb(`enquiries?id=eq.${id}`, {
    method: 'DELETE',
    prefer: 'return=representation'
  });
}

async function deleteEnquiries(ids) {
  return sb(`enquiries?id=in.(${ids.join(',')})`, {
    method: 'DELETE',
    prefer: 'return=representation'
  });
}

async function getEnquiryStats() {
  const all = await getEnquiries();
  if (!all) return { total: 0, unread: 0, replied: 0, archived: 0 };
  return {
    total: all.length,
    unread: all.filter(e => e.status === 'unread').length,
    replied: all.filter(e => e.status === 'replied').length,
    archived: all.filter(e => e.status === 'archived').length,
  };
}

// ── Form Config ────────────────────────────────────────

const DEFAULT_FORM_CONFIG = {
  heading: 'Send an enquiry',
  subheading: 'All fields marked with * are required.',
  fields: [
    { id: 'first_name', label: 'First name', type: 'text', placeholder: 'Amara', required: true, width: 'half' },
    { id: 'last_name', label: 'Last name', type: 'text', placeholder: 'Johnson', required: true, width: 'half' },
    { id: 'email', label: 'Email address', type: 'email', placeholder: 'you@example.com', required: true, width: 'full' },
    { id: 'enquiry_type', label: 'Enquiry type', type: 'select', required: true, width: 'full',
      options: ['Product order', 'Bespoke / custom fragrance', 'Wholesale enquiry', 'Gift consultation', 'Press & media', 'General question'] },
    { id: 'fragrance_interest', label: 'Fragrance of interest', type: 'text', placeholder: 'e.g. Velvet Noir, or not sure yet', required: false, width: 'full' },
    { id: 'message', label: 'Your message', type: 'textarea', placeholder: 'Tell us what you\'re looking for...', required: true, width: 'full' }
  ],
  submitLabel: 'Send enquiry',
  successTitle: 'Message received',
  successText: 'Thank you for reaching out. We read every enquiry personally and will be in touch within 24 hours.'
};

async function getFormConfig() {
  try {
    const rows = await sb('form_config?id=eq.contact_form', { method: 'GET', prefer: 'return=representation' });
    if (rows && rows.length > 0) return rows[0].config;
  } catch(e) {}
  return DEFAULT_FORM_CONFIG;
}

async function saveFormConfig(config) {
  const existing = await sb('form_config?id=eq.contact_form', { method: 'GET', prefer: 'return=representation' }).catch(() => []);
  if (existing && existing.length > 0) {
    return sb('form_config?id=eq.contact_form', {
      method: 'PATCH',
      body: JSON.stringify({ config, updated_at: new Date().toISOString() }),
      prefer: 'return=representation'
    });
  } else {
    return sb('form_config', {
      method: 'POST',
      body: JSON.stringify({ id: 'contact_form', config, updated_at: new Date().toISOString() }),
      prefer: 'return=representation'
    });
  }
}

// ── AI Form Designer ───────────────────────────────────

async function processFormDesignCommand(userMessage) {
  const currentConfig = await getFormConfig();

  const systemPrompt = `You are an AI form designer for H.E.R LUXURY, a luxury perfume store.
You manage the contact form design. The user gives you natural language instructions to modify the form.

Current form config:
${JSON.stringify(currentConfig, null, 2)}

Return ONLY valid JSON with this structure:
{
  "action": "update_form" | "info" | "unknown",
  "message": "friendly 1-2 sentence confirmation of what you changed",
  "config": { ...the COMPLETE updated form config object }
}

Rules:
- "config" must ALWAYS be the full config, not just the changed parts
- Field types: "text", "email", "textarea", "select", "tel", "number"
- Field widths: "full" or "half"
- To add a field: add to fields array with id (snake_case), label, type, placeholder, required, width, and options (for select only)
- To remove a field: exclude it from the fields array
- To reorder fields: reorder the fields array
- For select fields always provide an options array of strings
- Keep the store's luxury brand tone in all copy
- For "info" or "unknown" actions, still return the unchanged config`;

  const response = await fetch('/api/groq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.2,
      max_tokens: 1200
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  const raw = data.choices[0].message.content.trim();
  const result = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());

  if (result.action === 'update_form' && result.config) {
    await saveFormConfig(result.config);
    return { success: true, message: result.message, config: result.config };
  }
  return { success: false, message: result.message || "I didn't understand that form design command." };
}

// ── Extended AI command to handle enquiries + form ─────

async function processFullAICommand(userMessage) {
  const products = await getProducts();
  let enquiries = [];
  try { enquiries = await getEnquiries() || []; } catch(e) {}

  const systemPrompt = `You are the AI manager for H.E.R LUXURY. You manage products AND customer enquiries.

Products: ${JSON.stringify(products.map(p => ({ id: p.id, name: p.name, price: p.price, in_stock: p.in_stock })))}

Recent enquiries (last 10): ${JSON.stringify(enquiries.slice(0, 10).map(e => ({
  id: e.id, name: e.first_name + ' ' + e.last_name, email: e.email,
  type: e.enquiry_type, status: e.status, date: e.created_at?.split('T')[0], message: e.message?.substring(0, 80)
})))}

Respond with ONLY valid JSON:
{
  "action": "add"|"update"|"delete"|"info"|"update_enquiry"|"delete_enquiry"|"unknown",
  "message": "friendly 1-2 sentence response",
  "id": "product or enquiry id if needed",
  "changes": { fields to change },
  "product": { for add action }
}

For enquiry actions:
- "update_enquiry": use id + changes (status: "unread"|"replied"|"archived", notes)
- "delete_enquiry": use id
- "info": answer questions about enquiries or products
Match enquiries by name or email, case-insensitively.`;

  const response = await fetch('/api/groq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
      temperature: 0.2,
      max_tokens: 600
    })
  });

  if (!response.ok) throw new Error(`API error ${response.status}`);
  const data = await response.json();
  const raw = data.choices[0].message.content.trim();
  const result = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());

  switch (result.action) {
    case 'add':
      if (result.product) { const p = await addProduct(result.product); return { success: true, message: result.message, action: 'add' }; }
      break;
    case 'update':
      if (result.id && result.changes) { await updateProduct(result.id, result.changes); return { success: true, message: result.message, action: 'update' }; }
      break;
    case 'delete':
      if (result.id) { await deleteProduct(result.id); return { success: true, message: result.message, action: 'delete' }; }
      break;
    case 'update_enquiry':
      if (result.id && result.changes) { await updateEnquiry(result.id, result.changes); return { success: true, message: result.message, action: 'update_enquiry' }; }
      break;
    case 'delete_enquiry':
      if (result.id) { await deleteEnquiry(result.id); return { success: true, message: result.message, action: 'delete_enquiry' }; }
      break;
    case 'info':
      return { success: true, message: result.message, action: 'info' };
    default:
      return { success: false, message: result.message || "I didn't understand that.", action: 'unknown' };
  }
  return { success: false, message: 'Something went wrong.', action: 'error' };
}
