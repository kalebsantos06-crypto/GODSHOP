import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { format } from "date-fns";
import { getSaleNotifications, parseLocalDate } from "./src/lib/dateUtils";

const app = express();
const PORT = 3000;

// Helper to query Supabase from server
async function supabaseQuery(table: string, userId: string) {
  let supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  if (supabaseUrl.endsWith('/rest/v1/')) {
    supabaseUrl = supabaseUrl.slice(0, -9);
  } else if (supabaseUrl.endsWith('/rest/v1')) {
    supabaseUrl = supabaseUrl.slice(0, -8);
  }
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  
  if (!supabaseUrl || !supabaseAnonKey) return [];

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?user_id=eq.${userId}&select=*`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    if (response.ok) {
      return await response.json();
    }
    console.error(`[Supabase Query] Error ${response.status} on table ${table}`);
  } catch (err) {
    console.error(`[Supabase Query] Exception querying ${table}:`, err);
  }
  return [];
}

const DEFAULT_TEMPLATES = {
  days_3_before: "Olá, {cliente}! 😊 Aqui é a {atendente}, assistente virtual da GODSHOP. (Esta é uma mensagem automática)\n\nPassando para lembrar que a sua {parcela}ª parcela de {valor} (referente ao {aparelho}) vence no dia {vencimento}.\n\nPor favor, realize o pagamento via Pix utilizando a chave abaixo:\n\n{pix}\n\nCaso já tenha realizado o pagamento, por favor desconsiderar. Caso precise de ajuda, estamos à disposição! 🤍",
  day_of: "Olá, {cliente}! 😊 Aqui é a {atendente}, assistente virtual da GODSHOP. (Esta é uma mensagem automática)\n\nPassando para lembrar que a sua {parcela}ª parcela de {valor} (referente ao {aparelho}) vence hoje ({vencimento}).\n\nPor favor, realize o pagamento via Pix utilizando a chave abaixo:\n\n{pix}\n\nCaso já tenha realizado o pagamento, por favor desconsiderar. Caso precise de ajuda, estamos à disposição! 🤍",
  overdue: "Olá, {cliente}! 😊 Aqui é a {atendente}, assistente virtual da GODSHOP. (Esta é uma mensagem automática)\n\nNotamos que a sua {parcela}ª parcela de {valor} (referente ao {aparelho}) venceu em {vencimento} e está pendente.\n\nPor favor, realize o pagamento via Pix utilizando a chave abaixo:\n\n{pix}\n\nCaso já tenha realizado o pagamento, por favor desconsidere. Caso precise de ajuda, estamos aqui! 🤍"
};

async function runAutomationTask() {
  const now = new Date();
  console.log(`[Automation] Initiating daily check at ${now.toLocaleString('pt-BR')}`);
  
  const allSettings = readPublicSettings();
  const userIds = Object.keys(allSettings);

  for (const userId of userIds) {
    const userSettings = allSettings[userId];
    
    if (userSettings.isFullAutoEnabled && userSettings.isWebhookEnabled && userSettings.webhookUrl) {
      console.log(`[Automation] Processing background notifications for user: ${userId}`);
      
      try {
        const sales = await supabaseQuery('sales', userId);
        const clients = await supabaseQuery('clients', userId);
        const iphones = await supabaseQuery('iphones', userId);
        const consoles = await supabaseQuery('consoles', userId);

        const notifications = getSaleNotifications(sales, clients, iphones, consoles);
        // Only notify for today (0) or slightly overdue (-1) or precisely 3 days before (3)
        const toNotify = notifications.filter(n => n.daysDiff === 0 || n.daysDiff === 3 || n.daysDiff === -1);

        if (toNotify.length === 0) {
          console.log(`[Automation] No pending notifications for user ${userId} today.`);
          continue;
        }

        console.log(`[Automation] Found ${toNotify.length} messages to send for user ${userId}.`);

        for (const item of toNotify) {
          if (!item.clientPhone) continue;

          let template = userSettings.templateDayOf || DEFAULT_TEMPLATES.day_of;
          if (item.daysDiff === 3) template = userSettings.template3Days || DEFAULT_TEMPLATES.days_3_before;
          if (item.daysDiff === -1) template = userSettings.templateOverdue || DEFAULT_TEMPLATES.overdue;

          const dueDateObj = typeof item.dueDate === 'string' ? parseLocalDate(item.dueDate) : item.dueDate;
          const formattedDueDate = format(dueDateObj, 'dd/MM/yyyy');
          const amount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.expectedAmount);

          const message = template
            .replace(/{cliente}/g, item.clientName)
            .replace(/{aparelho}/g, item.itemName)
            .replace(/{parcela}/g, String(item.installmentIndex))
            .replace(/{valor}/g, amount)
            .replace(/{vencimento}/g, formattedDueDate)
            .replace(/{atendente}/g, userSettings.attendantName || 'Karen')
            .replace(/{pix}/g, userSettings.pixInfo || 'Chave Pix: 13036942637');

          try {
            const res = await fetch(userSettings.webhookUrl.trim(), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(userSettings.webhookToken ? { 'Authorization': `Bearer ${userSettings.webhookToken}` } : {})
              },
              body: JSON.stringify({
                phone: item.clientPhone,
                message,
                clientName: item.clientName,
                itemName: item.itemName,
                installmentIndex: item.installmentIndex,
                expectedAmount: item.expectedAmount,
                dueDate: format(dueDateObj, 'yyyy-MM-dd'),
                automationType: 'background_auto'
              })
            });

            if (res.ok) {
              console.log(`[Automation] Message sent successfully to ${item.clientName} for user ${userId}`);
            } else {
              console.error(`[Automation] Webhook failed for ${item.clientName} (User: ${userId}): Status ${res.status}`);
            }
          } catch (sendErr) {
            console.error(`[Automation] Network error sending webhook for ${item.clientName} (User: ${userId})`);
          }
          
          // Small delay between messages to avoid rate limits
          await new Promise(r => setTimeout(r, 1000));
        }
      } catch (err) {
        console.error(`[Automation] Critical error processing user ${userId}:`, err);
      }
    }
  }
  console.log(`[Automation] Finished all tasks.`);
}

// Set interval to run once a day (every 24 hours)
// We use a shorter interval check (e.g., every 6 hours) but logic inside could check last run time
setInterval(runAutomationTask, 12 * 60 * 60 * 1000); // Every 12 hours

// Run once on startup after 30 seconds
setTimeout(runAutomationTask, 30 * 1000);

app.use(express.json({ limit: "15mb" }));

// Serve static assets from public folder
const PUBLIC_DIR = path.join(process.cwd(), "public");
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
}

// Explicit manifest.json endpoint with correct MIME type
app.get("/manifest.json", (req, res) => {
  const manifestPath = path.join(process.cwd(), "public", "manifest.json");
  if (fs.existsSync(manifestPath)) {
    res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
    return res.sendFile(manifestPath);
  }
  const distManifestPath = path.join(process.cwd(), "dist", "manifest.json");
  if (fs.existsSync(distManifestPath)) {
    res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
    return res.sendFile(distManifestPath);
  }
  res.status(404).json({ error: "Manifest not found" });
});

// Configure public sales file-system database
const DATA_DIR = process.env.VERCEL ? path.join("/tmp", "data") : path.join(process.cwd(), "data");
const SALES_FILE = path.join(DATA_DIR, "public_sales.json");
const CLIENTS_FILE = path.join(DATA_DIR, "public_clients.json");
const SETTINGS_FILE = path.join(DATA_DIR, "public_settings.json");
const TOKENS_FILE = path.join(DATA_DIR, "public_tokens.json");
const USERS_FILE = path.join(DATA_DIR, "public_users.json");
const CLOUD_DB_FILE = path.join(DATA_DIR, "cloud_database.json");

const atomicWriteFileSync = (filePath: string, data: any) => {
  const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2)}`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tempPath, filePath);
};

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SALES_FILE)) {
    atomicWriteFileSync(SALES_FILE, {});
  }
  if (!fs.existsSync(CLIENTS_FILE)) {
    atomicWriteFileSync(CLIENTS_FILE, {});
  }
  if (!fs.existsSync(SETTINGS_FILE)) {
    atomicWriteFileSync(SETTINGS_FILE, {});
  }
  if (!fs.existsSync(TOKENS_FILE)) {
    atomicWriteFileSync(TOKENS_FILE, {});
  }
  if (!fs.existsSync(CLOUD_DB_FILE)) {
    const initialCloudDb = {
      suppliers: [],
      clients: [],
      iphones: [],
      consoles: [],
      prices: [],
      sales: [],
      purchases: [],
      products: [],
      product_units: [],
      fiscal_documents: [],
      fiscal_configs: [],
      gifts: [],
      gift_purchases: [],
      gift_dispatches: [],
      accessory_sales: [],
      product_photos: [],
      users: [],
      store_settings: {},
      custom_payments: {},
      deleted_ids: {},
      updated_at: new Date().toISOString()
    };
    atomicWriteFileSync(CLOUD_DB_FILE, initialCloudDb);
  }
  if (!fs.existsSync(USERS_FILE)) {
    const defaultUsers = [
      {
        id: "usr-1",
        name: "Kaleb Santos",
        email: "kalebsantos06@gmail.com",
        phone: "(11) 99999-9999",
        role: "Administrador",
        status: "Ativo",
        created_at: new Date().toISOString()
      }
    ];
    atomicWriteFileSync(USERS_FILE, defaultUsers);
  }
} catch (fsErr) {
  console.warn("[Vercel FS Warning] Initializing local files in fallback mode:", fsErr);
}

const sanitizeJsonString = (str: string): string => {
  if (!str || typeof str !== "string") return str;
  let result = "";
  let inString = false;
  let escape = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const code = str.charCodeAt(i);

    if (!inString) {
      if (char === '"') {
        inString = true;
        result += char;
      } else {
        if (code < 32 && char !== "\n" && char !== "\r" && char !== "\t") {
          // ignore non-printable outside string literals
        } else {
          result += char;
        }
      }
    } else {
      if (escape) {
        escape = false;
        if (char === '"' || char === "\\" || char === "/" || char === "b" || char === "f" || char === "n" || char === "r" || char === "t") {
          result += char;
        } else if (char === "u") {
          const next4 = str.substring(i + 1, i + 5);
          if (/^[0-9a-fA-F]{4}$/.test(next4)) {
            result += char;
          } else {
            result += "\\u";
          }
        } else {
          result += "\\" + char;
        }
      } else {
        if (char === "\\") {
          escape = true;
          result += "\\";
        } else if (char === '"') {
          inString = false;
          result += '"';
        } else if (code < 32) {
          if (char === "\n") result += "\\n";
          else if (char === "\r") result += "\\r";
          else if (char === "\t") result += "\\t";
          else if (char === "\b") result += "\\b";
          else if (char === "\f") result += "\\f";
          else {
            result += "\\u" + code.toString(16).padStart(4, "0");
          }
        } else {
          result += char;
        }
      }
    }
  }

  return result;
};

const safeJsonParse = <T = any>(raw: string | undefined | null, defaultValue: T): T => {
  if (!raw || typeof raw !== "string") return defaultValue;
  try {
    return JSON.parse(raw);
  } catch (e1) {
    try {
      const sanitized = sanitizeJsonString(raw);
      return JSON.parse(sanitized);
    } catch (e2) {
      try {
        let fallback = raw.replace(/\\(?!["\\/bfnrtu]|u[0-9a-fA-F]{4})/g, "\\\\");
        fallback = sanitizeJsonString(fallback);
        return JSON.parse(fallback);
      } catch (e3) {
        console.error("Safe JSON parse error:", (e1 as Error)?.message);
        return defaultValue;
      }
    }
  }
};

const readCloudDb = (): any => {
  try {
    if (!fs.existsSync(CLOUD_DB_FILE)) {
      return {
        suppliers: [],
        clients: [],
        iphones: [],
        consoles: [],
        prices: [],
        sales: [],
        purchases: [],
        products: [],
        product_units: [],
        fiscal_documents: [],
        fiscal_configs: [],
        gifts: [],
        gift_purchases: [],
        gift_dispatches: [],
        accessory_sales: [],
        product_photos: [],
        users: [],
        store_settings: {},
        custom_payments: {},
        deleted_ids: {},
        updated_at: new Date().toISOString()
      };
    }
    const content = fs.readFileSync(CLOUD_DB_FILE, "utf8");
    const parsed = safeJsonParse<any>(content, {});
    const rawSales = parsed.sales || [];
    const sanitizedSales = rawSales.map((s: any) => {
      if (!s) return s;
      const clientName = (s.client_name || '').toLowerCase();
      if (s.id === '7ab8846f-1d26-4591-908c-b8fa6742edfb' || clientName.includes('paula')) {
        return {
          ...s,
          iphone_id: s.iphone_id || '089025de-e939-432c-8204-29f95ed02821',
          buy_price: s.buy_price || 700
        };
      }
      if (s.id === 'd9d66639-2db6-4991-9074-39d019d80097' || (clientName.includes('yuri') && Number(s.sell_price) === 1950)) {
        return {
          ...s,
          iphone_id: s.iphone_id || '6a34a484-559e-47ea-b9b7-bf3d5819f81b',
          buy_price: s.buy_price || 1400
        };
      }
      return s;
    });

    return {
      suppliers: parsed.suppliers || [],
      clients: parsed.clients || [],
      iphones: parsed.iphones || [],
      consoles: parsed.consoles || [],
      prices: parsed.prices || [],
      sales: sanitizedSales,
      purchases: parsed.purchases || [],
      products: parsed.products || [],
      product_units: parsed.product_units || [],
      fiscal_documents: parsed.fiscal_documents || [],
      fiscal_configs: parsed.fiscal_configs || [],
      gifts: parsed.gifts || [],
      gift_purchases: parsed.gift_purchases || [],
      gift_dispatches: parsed.gift_dispatches || [],
      accessory_sales: parsed.accessory_sales || [],
      product_photos: parsed.product_photos || [],
      users: parsed.users || [],
      store_settings: parsed.store_settings || {},
      custom_payments: parsed.custom_payments || {},
      deleted_ids: parsed.deleted_ids || {},
      updated_at: parsed.updated_at || new Date().toISOString()
    };
  } catch (err) {
    console.error("Error reading cloud db file:", err);
    return {
      suppliers: [],
      clients: [],
      iphones: [],
      consoles: [],
      prices: [],
      sales: [],
      purchases: [],
      products: [],
      product_units: [],
      fiscal_documents: [],
      fiscal_configs: [],
      gifts: [],
      gift_purchases: [],
      gift_dispatches: [],
      accessory_sales: [],
      product_photos: [],
      users: [],
      store_settings: {},
      custom_payments: {},
      deleted_ids: {},
      updated_at: new Date().toISOString()
    };
  }
};

const writeCloudDb = (data: any) => {
  try {
    data.updated_at = new Date().toISOString();
    atomicWriteFileSync(CLOUD_DB_FILE, data);
  } catch (err) {
    console.error("Error writing cloud db file:", err);
  }
};

const readPublicUsers = (): any[] => {
  try {
    if (!fs.existsSync(USERS_FILE)) return [];
    const content = fs.readFileSync(USERS_FILE, "utf8");
    return safeJsonParse(content, []);
  } catch (err) {
    console.error("Error reading public users file:", err);
    return [];
  }
};

const writePublicUsers = (data: any[]) => {
  try {
    atomicWriteFileSync(USERS_FILE, data);
  } catch (err) {
    console.error("Error writing public users file:", err);
  }
};

// --- CLOUD DATABASE & MULTI-DEVICE PERSISTENCE API ---

const ALL_CLOUD_TABLES = [
  'suppliers', 'clients', 'iphones', 'consoles', 'prices', 'sales',
  'purchases', 'products', 'product_units', 'fiscal_documents', 'fiscal_configs',
  'gifts', 'gift_purchases', 'gift_dispatches', 'accessory_sales', 'product_photos', 'users',
  'notes', 'note_checklist_items', 'note_audio'
];

// Helper to filter out deleted items
const filterDeletedItems = (db: any) => {
  if (!db) return db;
  const deletedIdsMap = db.deleted_ids || {};

  for (const table of ALL_CLOUD_TABLES) {
    if (Array.isArray(db[table]) && Array.isArray(deletedIdsMap[table]) && deletedIdsMap[table].length > 0) {
      const deletedSet = new Set<string>(deletedIdsMap[table]);
      db[table] = db[table].filter((i: any) => i && i.id && !deletedSet.has(i.id));
    }
  }
  return db;
};

// 1. Fetch entire cloud database (all tables)
app.get("/api/cloud-db", (req, res) => {
  const db = filterDeletedItems(readCloudDb());
  res.json({ success: true, data: db });
});

// 2. Fetch stats on cloud database
app.get("/api/cloud-db/stats", (req, res) => {
  const db = filterDeletedItems(readCloudDb());
  res.json({
    success: true,
    stats: {
      iphones: (db.iphones || []).length,
      consoles: (db.consoles || []).length,
      clients: (db.clients || []).length,
      suppliers: (db.suppliers || []).length,
      sales: (db.sales || []).length,
      prices: (db.prices || []).length,
      purchases: (db.purchases || []).length,
      products: (db.products || []).length,
      product_units: (db.product_units || []).length,
      fiscal_documents: (db.fiscal_documents || []).length,
      gifts: (db.gifts || []).length,
      gift_purchases: (db.gift_purchases || []).length,
      gift_dispatches: (db.gift_dispatches || []).length,
      accessory_sales: (db.accessory_sales || []).length,
      product_photos: (db.product_photos || []).length,
      custom_payments: Object.keys(db.custom_payments || {}).length,
      has_settings: Boolean(db.store_settings && Object.keys(db.store_settings).length > 0),
      updated_at: db.updated_at
    }
  });
});

// 3. Bidirectional batch sync & push from any device to cloud
app.post("/api/cloud-db/push", (req, res) => {
  const incoming = req.body.data || {};
  const current = readCloudDb();
  if (!current.deleted_ids) current.deleted_ids = {};

  // Merge incoming deleted_ids from device
  if (incoming.deleted_ids && typeof incoming.deleted_ids === 'object') {
    for (const table of ALL_CLOUD_TABLES) {
      if (Array.isArray(incoming.deleted_ids[table])) {
        const existingDeleted = new Set<string>(current.deleted_ids[table] || []);
        for (const id of incoming.deleted_ids[table]) {
          if (id) existingDeleted.add(id);
        }
        current.deleted_ids[table] = Array.from(existingDeleted);
      }
    }
  }

  for (const table of ALL_CLOUD_TABLES) {
    const deletedSet = new Set<string>(current.deleted_ids[table] || []);

    if (Array.isArray(incoming[table])) {
      const existingList = Array.isArray(current[table]) ? current[table] : [];
      const itemMap = new Map<string, any>();
      
      // Load current cloud items first (if not deleted)
      for (const item of existingList) {
        if (item && item.id && !deletedSet.has(item.id)) {
          itemMap.set(item.id, item);
        }
      }
      
      // Merge incoming items from this device (if not deleted) with timestamp & sales progress preservation
      for (const item of incoming[table]) {
        if (item && item.id && !deletedSet.has(item.id)) {
          const existingItem = itemMap.get(item.id);
          if (!existingItem) {
            itemMap.set(item.id, item);
          } else {
            const existingTime = new Date(existingItem.updated_at || existingItem.created_at || 0).getTime();
            const incomingTime = new Date(item.updated_at || item.created_at || 0).getTime();

            // Newer timestamp takes priority
            let merged = incomingTime >= existingTime
              ? { ...existingItem, ...item }
              : { ...item, ...existingItem };

            // For sales: protect payment progress and installments paid count
            if (table === 'sales') {
              const exPaid = Number(existingItem.installments_paid) || 0;
              const inPaid = Number(item.installments_paid) || 0;
              if (incomingTime >= existingTime) {
                merged.installments_paid = item.installments_paid !== undefined ? item.installments_paid : exPaid;
              } else {
                merged.installments_paid = Math.max(exPaid, inPaid);
              }

              // Merge custom payments map
              try {
                const exCust = typeof existingItem.custom_payments === 'string' ? safeJsonParse(existingItem.custom_payments, {}) : (existingItem.custom_payments || {});
                const inCust = typeof item.custom_payments === 'string' ? safeJsonParse(item.custom_payments, {}) : (item.custom_payments || {});
                const mergedCust = { ...exCust, ...inCust };
                if (Object.keys(mergedCust).length > 0) {
                  merged.custom_payments = JSON.stringify(mergedCust);
                }
              } catch (e) {}

              // Preserve digital signature if either has it
              if (existingItem.signature_data && !item.signature_data) {
                merged.signature_data = existingItem.signature_data;
                merged.signed_at = existingItem.signed_at;
                merged.signed_ip = existingItem.signed_ip;
              } else if (item.signature_data) {
                merged.signature_data = item.signature_data;
                merged.signed_at = item.signed_at;
                merged.signed_ip = item.signed_ip;
              }

              // Preserve linked device if existing has it and incoming is null
              if (existingItem.iphone_id && !item.iphone_id) {
                merged.iphone_id = existingItem.iphone_id;
              }
              if (existingItem.console_id && !item.console_id) {
                merged.console_id = existingItem.console_id;
              }
              if (existingItem.buy_price && !item.buy_price) {
                merged.buy_price = existingItem.buy_price;
              }

              // Normalize device links for Paula and Yuri
              const clientName = (merged.client_name || '').toLowerCase();
              if (merged.id === '7ab8846f-1d26-4591-908c-b8fa6742edfb' || clientName.includes('paula')) {
                merged.iphone_id = merged.iphone_id || '089025de-e939-432c-8204-29f95ed02821';
                merged.buy_price = merged.buy_price || 700;
              } else if (merged.id === 'd9d66639-2db6-4991-9074-39d019d80097' || (clientName.includes('yuri') && Number(merged.sell_price) === 1950)) {
                merged.iphone_id = merged.iphone_id || '6a34a484-559e-47ea-b9b7-bf3d5819f81b';
                merged.buy_price = merged.buy_price || 1400;
              }
            }

            // For stock items: if marked 'vendido' on either side recently, stay 'vendido'
            if (table === 'iphones' || table === 'consoles') {
              if (item.status === 'vendido' || existingItem.status === 'vendido') {
                if (incomingTime > existingTime && item.status === 'disponivel') {
                  merged.status = 'disponivel';
                } else {
                  merged.status = 'vendido';
                }
              }
            }

            itemMap.set(item.id, merged);
          }
        }
      }
      
      current[table] = Array.from(itemMap.values());
    } else if (Array.isArray(current[table]) && deletedSet.size > 0) {
      current[table] = current[table].filter((i: any) => i && i.id && !deletedSet.has(i.id));
    }
  }

  // Merge custom payments dictionary
  if (incoming.custom_payments && typeof incoming.custom_payments === 'object') {
    if (!current.custom_payments) current.custom_payments = {};
    for (const [saleId, val] of Object.entries(incoming.custom_payments)) {
      if (typeof val === 'string' && val.trim()) {
        try {
          const incomingObj = safeJsonParse(val, {});
          const currentVal = current.custom_payments[saleId];
          const currentObj = currentVal ? safeJsonParse(currentVal, {}) : {};
          const mergedObj = { ...currentObj, ...incomingObj };
          current.custom_payments[saleId] = JSON.stringify(mergedObj);
        } catch (e) {
          current.custom_payments[saleId] = val as string;
        }
      }
    }
  }

  // Merge store settings
  if (incoming.store_settings && typeof incoming.store_settings === 'object') {
    current.store_settings = {
      ...(current.store_settings || {}),
      ...incoming.store_settings
    };
  }

  writeCloudDb(current);
  console.log(`[Cloud DB Sync] Synced from device: ${current.iphones.length} iphones, ${current.clients.length} clients, ${current.sales.length} sales, ${current.prices.length} prices.`);

  res.json({
    success: true,
    message: "Banco de dados sincronizado na nuvem com sucesso!",
    data: filterDeletedItems(current)
  });
});

// 4. Get specific table
app.get("/api/cloud-db/:table", (req, res) => {
  const { table } = req.params;
  const db = filterDeletedItems(readCloudDb());
  const list = db[table] || [];
  res.json({ success: true, data: list });
});

// 5. Upsert item in specific table
app.post("/api/cloud-db/:table", (req, res) => {
  const { table } = req.params;
  const item = req.body;
  if (!item || !item.id) {
    return res.status(400).json({ error: "Item com ID é obrigatório" });
  }

  const db = readCloudDb();
  if (!Array.isArray(db[table])) {
    db[table] = [];
  }
  if (!db.deleted_ids) db.deleted_ids = {};
  if (Array.isArray(db.deleted_ids[table])) {
    db.deleted_ids[table] = db.deleted_ids[table].filter((id: string) => id !== item.id);
  }

  const existingIdx = db[table].findIndex((i: any) => i.id === item.id);
  if (existingIdx >= 0) {
    db[table][existingIdx] = { ...db[table][existingIdx], ...item };
  } else {
    db[table].push(item);
  }

  writeCloudDb(db);
  res.json({ success: true, data: item });
});

// 6. Update item in specific table
app.put("/api/cloud-db/:table/:id", (req, res) => {
  const { table, id } = req.params;
  const updates = req.body;
  const db = readCloudDb();
  if (!Array.isArray(db[table])) {
    db[table] = [];
  }
  if (!db.deleted_ids) db.deleted_ids = {};
  if (Array.isArray(db.deleted_ids[table])) {
    db.deleted_ids[table] = db.deleted_ids[table].filter((delId: string) => delId !== id);
  }

  const existingIdx = db[table].findIndex((i: any) => i.id === id);
  if (existingIdx >= 0) {
    db[table][existingIdx] = { ...db[table][existingIdx], ...updates };
  } else {
    db[table].push({ id, ...updates });
  }

  writeCloudDb(db);
  res.json({ success: true, data: db[table][existingIdx] || { id, ...updates } });
});

// 7. Delete item from specific table
app.delete("/api/cloud-db/:table/:id", (req, res) => {
  const { table, id } = req.params;
  const db = readCloudDb();
  
  if (!db.deleted_ids) db.deleted_ids = {};
  if (!Array.isArray(db.deleted_ids[table])) db.deleted_ids[table] = [];
  if (!db.deleted_ids[table].includes(id)) {
    db.deleted_ids[table].push(id);
  }

  if (Array.isArray(db[table])) {
    db[table] = db[table].filter((i: any) => i.id !== id);
  }

  writeCloudDb(db);
  res.json({ success: true, message: "Item removido da nuvem com sucesso" });
});

// API route to return the public container URL based on request headers
app.get("/api/app-url", (req, res) => {
  let proto = (req.headers["x-forwarded-proto"] as string) || "https";
  let host = (req.headers["x-forwarded-host"] as string) || req.headers.host || "localhost:3000";
  
  console.log(`[URL Helper] Incoming Host: ${host}, Proto: ${proto}`);

  // Handle common proxy issues where host might contain proto or multiple hosts
  if (host.includes("://")) {
    const url = new URL(host);
    host = url.host;
    proto = url.protocol.replace(":", "");
  }

  // Do not rewrite the host automatically, as ais-pre URLs only work if the user has clicked Share.
  // Instead, rely on the host headers as they are.
  /* if (host.includes("ais-dev-")) {
    host = host.replace("ais-dev-", "ais-pre-");
  } */

  // Force HTTPS for cloud run domains to ensure cross-device compatibility
  if (host.includes(".run.app")) {
    proto = "https";
  }

  const origin = `${proto}://${host}`;
  console.log(`[URL Helper] Final Generated origin: ${origin}`);
  res.json({ origin });
});

// API route to proxy Gemini daily tips safely from the server-side
app.get("/api/dailytip", async (req, res) => {
  const curatedFallbackTips = [
    "Inovação é dizer não a mil coisas. Foque nos modelos de iPhone mais procurados para otimizar seu fluxo de caixa! — Inspirado em Steve Jobs",
    "O pós-venda excelente é sua melhor ferramenta de marketing. Um cliente satisfeito com a garantia trará três novos compradores!",
    "Tenha sempre acessórios de alta margem (capas, películas, carregadores) visíveis no balcão de checkout para compras por impulso.",
    "Monitore a saúde da bateria dos iPhones seminovos em estoque. Aparelhos com saúde acima de 85% vendem muito mais rápido!",
    "Seu estoque parado é dinheiro congelado. Faça combos de consoles antigos com jogos físicos para girar o caixa com agilidade.",
    "Crie vídeos curtos comparando as câmeras dos modelos de iPhone em estoque. O alcance orgânico atrai clientes locais qualificados!",
    "Foque na velocidade e cordialidade do atendimento no Instagram e WhatsApp. Quem responde primeiro geralmente fecha a venda!",
    "Trabalhe com o sistema de 'Trade-In' (aceitar celular usado como parte do pagamento). Isso facilita o upgrade de aparelho do cliente.",
    "Seja transparente sobre as condições físicas e procedência de cada item seminovo. A confiança vale mais do que uma venda única.",
    "Ofereça kits prontos: console + jogo popular + controle extra. Pacotes facilitam a decisão de compra de pais e presentes.",
    "Peça para cada cliente satisfeito deixar uma breve avaliação de 5 estrelas no Google. Isso aumenta drasticamente sua atração local.",
    "A experiência de unboxing e entrega é sagrada. Use sacolas personalizadas e fragrâncias sutis para marcar a memória do cliente.",
    "Acompanhe de perto seu lucro líquido real, e não apenas o faturamento bruto. Conheça suas margens em cada aparelho vendido.",
    "Não venda apenas hardware; venda diversão e conexão familiar. Clientes compram emoções e momentos de lazer incomparáveis.",
    "Esteja sempre atento às datas de grandes lançamentos de jogos e novos iPhones para planejar suas campanhas de pré-venda com antecedência!"
  ];

  const getRandomFallback = () => {
    const randomIndex = Math.floor(Math.random() * curatedFallbackTips.length);
    return curatedFallbackTips[randomIndex];
  };

  try {
    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      return res.json({ tip: getRandomFallback() });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Robust list of Gemini models according to Google GenAI standards
    const modelsToTry = ["gemini-3.7-flash", "gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-2.5-flash", "gemini-3.1-pro-preview"];
    let lastMessage = "";

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: "Dê uma dica curta, prática e motivadora para um dono de loja de iPhones, celulares e games. Varie muito os temas: vendas, estoque, marketing, atendimento ou mentalidade. Ocasionalmente, cite ou se inspire em grandes empreendedores de sucesso (ex: Steve Jobs, Jeff Bezos, Flávio Augusto, etc). Responda em português, seja direto e impactante. Máximo 180 caracteres.",
        });

        if (response.text) {
          const cleanTip = response.text.trim().replace(/^["']|["']$/g, '');
          return res.json({ tip: cleanTip });
        }
      } catch (err: any) {
        lastMessage = err?.message || String(err);
        // Fallback to next model
      }
    }

    // If we reach here, all model attempts failed
    console.log("[Gemini Info] Providing high-quality curated fallback business tip.");
    return res.json({ tip: getRandomFallback() });

  } catch (error: any) {
    console.log("[Gemini Info] API exception caught, returning curated fallback tip.");
    res.json({ tip: getRandomFallback() });
  }
});

// --- DIGITAL SIGNATURE REGISTRY API ---

// Helper to read and write public sales registry
const readPublicSales = (): Record<string, any> => {
  try {
    if (!fs.existsSync(SALES_FILE)) return {};
    const content = fs.readFileSync(SALES_FILE, "utf8");
    return safeJsonParse(content, {});
  } catch (err) {
    console.error("Error reading public sales file:", err);
    return {};
  }
};

const writePublicSales = (data: Record<string, any>) => {
  try {
    atomicWriteFileSync(SALES_FILE, data);
  } catch (err) {
    console.error("Error writing public sales file:", err);
  }
};

// Registered sellers can create or update a public signature link
app.post("/api/public-sales", (req, res) => {
  const { id, sale, client, product, warrantyMonths, warrantyStartDate, warrantyEndDate } = req.body;
  console.log(`[POST /api/public-sales] Received request for id: ${id}`);
  if (!id) {
    return res.status(400).json({ error: "ID da venda é obrigatório" });
  }

  const sales = readPublicSales();
  const existing = sales[id] || {};

  sales[id] = {
    ...existing,
    id,
    sale,
    client,
    product,
    warrantyMonths,
    warrantyStartDate,
    warrantyEndDate,
    updated_at: new Date().toISOString()
  };

  writePublicSales(sales);
  console.log(`[POST /api/public-sales] Successfully saved id: ${id}`);
  res.json({ success: true, message: "Contrato registrado no portal público com sucesso" });
});

async function fetchSaleData(id: string) {
  const sales = readPublicSales();
  let data = sales[id];
  if (data) {
    const sigInfo = data.signatureInfo || data.sale_data?.signatureInfo || {};
    data.signature_data = data.signature_data || data.sale?.signature_data || data.sale_data?.signature_data || sigInfo.signature_data;
    data.signed_at = data.signed_at || data.sale?.signed_at || data.sale_data?.signed_at || sigInfo.signed_at;
    data.signed_ip = data.signed_ip || data.sale?.signed_ip || data.sale_data?.signed_ip || sigInfo.signed_ip;
    data.client_name = data.client_name || data.client?.name || data.sale?.client_name || sigInfo.client_name;
  }

  // Check cloud_database.json sales table if data or data.signature_data is missing
  try {
    const cloudDb = readCloudDb();
    if (cloudDb && Array.isArray(cloudDb.sales)) {
      const foundSale = cloudDb.sales.find((s: any) => s.id === id);
      if (foundSale) {
        const client = Array.isArray(cloudDb.clients) ? cloudDb.clients.find((c: any) => c.id === foundSale.client_id) : null;
        const iphone = Array.isArray(cloudDb.iphones) ? cloudDb.iphones.find((i: any) => i.id === foundSale.iphone_id) : null;
        const consoleItem = Array.isArray(cloudDb.consoles) ? cloudDb.consoles.find((c: any) => c.id === foundSale.console_id) : null;

        if (!data) {
          data = {
            id: foundSale.id,
            sale: foundSale,
            client: client || { name: foundSale.client_name },
            product: iphone || consoleItem,
            signature_data: foundSale.signature_data,
            signed_at: foundSale.signed_at,
            signed_ip: foundSale.signed_ip,
            client_name: foundSale.client_name || client?.name,
            witness1_name: foundSale.witness1_name,
            witness1_cpf: foundSale.witness1_cpf,
            witness1_signature: foundSale.witness1_signature,
            witness2_name: foundSale.witness2_name,
            witness2_cpf: foundSale.witness2_cpf,
            witness2_signature: foundSale.witness2_signature
          };
        } else {
          data.sale = data.sale || foundSale;
          data.client = data.client || client || { name: foundSale.client_name };
          data.product = data.product || iphone || consoleItem;
          if (foundSale.signature_data && (!data.signature_data || foundSale.signature_data.length >= (data.signature_data.length || 0))) {
            data.signature_data = foundSale.signature_data;
          }
          if (data.signature_data && data.sale) {
            data.sale.signature_data = data.signature_data;
          }
          if (foundSale.signed_at) {
            data.signed_at = foundSale.signed_at;
            if (data.sale) data.sale.signed_at = foundSale.signed_at;
          }
          if (foundSale.signed_ip) {
            data.signed_ip = foundSale.signed_ip;
            if (data.sale) data.sale.signed_ip = foundSale.signed_ip;
          }
          if (foundSale.client_name || client?.name) {
            data.client_name = foundSale.client_name || client?.name;
            if (data.sale) data.sale.client_name = data.client_name;
          }
        }
        sales[id] = data;
        writePublicSales(sales);
      }
    }
  } catch (cloudErr) {
    console.error(`[fetchSaleData] cloud db error:`, cloudErr);
  }

  if (data && data.signature_data) {
    return data;
  }

  try {
    let supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    if (supabaseUrl.endsWith('/rest/v1/')) {
      supabaseUrl = supabaseUrl.slice(0, -9);
    } else if (supabaseUrl.endsWith('/rest/v1')) {
      supabaseUrl = supabaseUrl.slice(0, -8);
    }
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
    
    if (supabaseUrl && supabaseAnonKey) {
      const response = await fetch(`${supabaseUrl}/rest/v1/public_sales?id=eq.${id}&select=*`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      });
      
      if (response.ok) {
        const rows = await response.json();
        if (rows && rows.length > 0) {
          const row = rows[0];
          const sigInfo = row.sale_data?.signatureInfo || {};
          const mappedData = {
            ...row.sale_data,
            id: row.id,
            signature_data: row.signature_data || sigInfo.signature_data,
            signed_at: row.signed_at || sigInfo.signed_at,
            signed_ip: row.signed_ip || sigInfo.signed_ip,
            client_name: row.client_name || sigInfo.client_name,
            witness1_name: row.witness1_name || sigInfo.witness1_name,
            witness1_cpf: row.witness1_cpf || sigInfo.witness1_cpf,
            witness1_signature: row.witness1_signature || sigInfo.witness1_signature,
            witness2_name: row.witness2_name || sigInfo.witness2_name,
            witness2_cpf: row.witness2_cpf || sigInfo.witness2_cpf,
            witness2_signature: row.witness2_signature || sigInfo.witness2_signature
          };
          
          sales[id] = mappedData;
          writePublicSales(sales);
          return mappedData;
        }
      }
    }
  } catch (err) {
    console.error(`[fetchSaleData] error:`, err);
  }
  return null;
}

async function injectMetaTags(template: string, url: string): Promise<string> {
  try {
    let assinaturaId = null;
    const matchAssinar = url.match(/\/assinar\/([^\/\?]+)/);
    if (matchAssinar) {
      assinaturaId = matchAssinar[1];
    } else if (url.includes('assinatura=')) {
      const urlObj = new URL(url, 'http://localhost');
      assinaturaId = urlObj.searchParams.get('assinatura');
    }

    if (assinaturaId) {
      const saleData = await fetchSaleData(assinaturaId);
      if (saleData && saleData.client && saleData.client.name) {
        const clientName = saleData.client.name.trim();
        const productName = saleData.product?.model || 'Aparelho';
        const metaTags = `
          <meta property="og:title" content="Nota de Garantia - ${clientName}" />
          <meta property="og:description" content="Acesse para assinar sua nota de garantia do ${productName}." />
          <meta property="og:image" content="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80" />
          <meta property="og:type" content="website" />
          <title>Nota de Garantia - ${clientName}</title>
        `;
        return template.replace('<title>GODSHOP</title>', metaTags);
      }
    }
  } catch (e) {
    console.error("Meta injection error:", e);
  }
  return template;
}

// Public clients can get document details to read before signing
app.get("/api/public-sales/:id", async (req, res) => {
  const { id } = req.params;
  const data = await fetchSaleData(id);

  if (data) {
    return res.json(data);
  }

  return res.status(404).json({ error: "Documento de garantia não localizado no portal de assinaturas." });
});

// Public clients submit their electronic signature drawing and optional witness signatures
app.post("/api/public-sales/:id/sign", async (req, res) => {
  const { id } = req.params;
  const { 
    signature_data, 
    client_name,
    witness1_name,
    witness1_cpf,
    witness1_signature,
    witness2_name,
    witness2_cpf,
    witness2_signature
  } = req.body;

  if (!signature_data) {
    return res.status(400).json({ error: "A assinatura em desenho é obrigatória." });
  }

  const sales = readPublicSales();
  let data = sales[id];

  // Try to load from Supabase if missing
  let supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  if (supabaseUrl.endsWith('/rest/v1/')) {
    supabaseUrl = supabaseUrl.slice(0, -9);
  } else if (supabaseUrl.endsWith('/rest/v1')) {
    supabaseUrl = supabaseUrl.slice(0, -8);
  }
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

  if (!data && supabaseUrl && supabaseAnonKey) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/public_sales?id=eq.${id}&select=*`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      });
      if (response.ok) {
        const rows = await response.json();
        if (rows && rows.length > 0) {
          const row = rows[0];
          const sigInfo = row.sale_data?.signatureInfo || {};
          data = {
            ...row.sale_data,
            id: row.id,
            signature_data: row.signature_data || sigInfo.signature_data,
            signed_at: row.signed_at || sigInfo.signed_at,
            signed_ip: row.signed_ip || sigInfo.signed_ip,
            client_name: row.client_name || sigInfo.client_name,
            witness1_name: row.witness1_name || sigInfo.witness1_name,
            witness1_cpf: row.witness1_cpf || sigInfo.witness1_cpf,
            witness1_signature: row.witness1_signature || sigInfo.witness1_signature,
            witness2_name: row.witness2_name || sigInfo.witness2_name,
            witness2_cpf: row.witness2_cpf || sigInfo.witness2_cpf,
            witness2_signature: row.witness2_signature || sigInfo.witness2_signature
          };
        }
      }
    } catch (err) {}
  }

  if (!data) {
    return res.status(404).json({ error: "Documento de garantia não localizado." });
  }

  // Retrieve client's IP from proxy headers or remote address
  const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "IP desconhecido";
  const cleanIp = ip.split(",")[0].trim();

  data.signature_data = signature_data;
  data.signed_at = new Date().toISOString();
  data.signed_ip = cleanIp;
  data.client_name = client_name || data.client?.name || "Cliente";

  // Optional witness signatures
  if (witness1_name !== undefined) data.witness1_name = witness1_name;
  if (witness1_cpf !== undefined) data.witness1_cpf = witness1_cpf;
  if (witness1_signature !== undefined) data.witness1_signature = witness1_signature;

  if (witness2_name !== undefined) data.witness2_name = witness2_name;
  if (witness2_cpf !== undefined) data.witness2_cpf = witness2_cpf;
  if (witness2_signature !== undefined) data.witness2_signature = witness2_signature;

  sales[id] = data;
  writePublicSales(sales);

  // Also update cloud_database.json sales table
  try {
    const cloudDb = readCloudDb();
    if (cloudDb && Array.isArray(cloudDb.sales)) {
      const saleIndex = cloudDb.sales.findIndex((s: any) => s.id === id);
      if (saleIndex !== -1) {
        cloudDb.sales[saleIndex] = {
          ...cloudDb.sales[saleIndex],
          signature_data: data.signature_data,
          signed_at: data.signed_at,
          signed_ip: data.signed_ip,
          client_name: data.client_name,
          witness1_name: data.witness1_name,
          witness1_cpf: data.witness1_cpf,
          witness1_signature: data.witness1_signature,
          witness2_name: data.witness2_name,
          witness2_cpf: data.witness2_cpf,
          witness2_signature: data.witness2_signature
        };
        writeCloudDb(cloudDb);
      }
    }
  } catch (err) {
    console.warn("Could not sync signature to cloud_database.json:", err);
  }

  // Also try to update Supabase directly
  if (supabaseUrl && supabaseAnonKey) {
    try {
      await fetch(`${supabaseUrl}/rest/v1/public_sales?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          signature_data: data.signature_data,
          signed_at: data.signed_at,
          signed_ip: data.signed_ip,
          client_name: data.client_name,
          witness1_name: data.witness1_name,
          witness1_cpf: data.witness1_cpf,
          witness1_signature: data.witness1_signature,
          witness2_name: data.witness2_name,
          witness2_cpf: data.witness2_cpf,
          witness2_signature: data.witness2_signature
        })
      });

      // Update the main sales table as well to reflect the signature status
      await fetch(`${supabaseUrl}/rest/v1/sales?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          signature_data: data.signature_data,
          signed_at: data.signed_at,
          signed_ip: data.signed_ip
        })
      });
    } catch (err) {}
  }

  res.json({ 
    success: true, 
    message: "Documento assinado digitalmente com sucesso!",
    data
  });
});

// --- WARRANTY PROCESSING API ---
app.post("/api/process-warranty", async (req, res) => {
  const { fileData, mimeType, textData } = req.body;

  if (!fileData && !textData) {
    return res.status(400).json({ error: "Dados ou arquivo são obrigatórios" });
  }

  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY não configurada no servidor" });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    
    // System prompt for consistent extraction
    const promptText = `Analise este documento (nota fiscal, garantia ou texto) e extraia os seguintes dados em JSON puro:
    {
      "client_name": "Nome Completo",
      "client_phone": "Telefone",
      "client_cpf": "CPF",
      "client_email": "E-mail",
      "client_address": "Rua/Número/Bairro",
      "client_city": "Cidade",
      "client_state": "UF",
      "product_model": "Modelo do Produto",
      "product_detail": "Detalhes (cor, memória, versão)",
      "buy_price": null,
      "sell_price": null,
      "sale_date": "YYYY-MM-DD",
      "payment_method": "Pix/Cartão/Dinheiro",
      "installments": 1
    }
    Se não encontrar algo, use null. Responda APENAS o JSON.`;

    // Try models in order - using valid official platform aliases
    const models = ["gemini-3.7-flash", "gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-2.5-flash", "gemini-3.1-pro-preview"];
    let lastErr: any = null;

    for (const modelName of models) {
      try {
        const contents = {
          parts: [] as any[]
        };

        if (fileData) {
          contents.parts.push({ inlineData: { data: fileData, mimeType } });
        }
        if (textData) {
          contents.parts.push({ text: `Texto para análise: ${textData}` });
        }
        contents.parts.push({ text: promptText });

        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            responseMimeType: "application/json",
          }
        });

        if (response.text) {
          let text = response.text.trim();
          // Remove markdown code blocks if present
          if (text.startsWith('```')) {
            text = text.replace(/^```json\s*/, '').replace(/```$/, '').trim();
          }
          const extracted = JSON.parse(text);
          return res.json(extracted);
        }
      } catch (err: any) {
        lastErr = err;
        console.warn(`[OCR Receipt] Model ${modelName} failed:`, err?.message || err);
        // Continue to next model on quota, not found, or temporary error
        continue;
      }
    }

    throw lastErr || new Error("Falha ao processar comprovante com IA");

  } catch (error: any) {
    console.error("Gemini processing error:", error);
    const errMsg = String(error?.message || error || "");
    const isQuota = errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('exhausted');
    res.status(isQuota ? 429 : 500).json({ 
      error: isQuota 
        ? "Limite de requisições da IA atingido temporariamente. Aguarde alguns instantes e tente novamente, ou insira os dados manualmente." 
        : `Erro ao processar com IA: ${errMsg}`
    });
  }
});

// --- PRICE TABLE IA PROCESSING API ---
app.post("/api/process-price-table", async (req, res) => {
  const { fileData, mimeType } = req.body;

  if (!fileData) {
    return res.status(400).json({ error: "Arquivo de imagem ou PDF é obrigatório" });
  }

  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY não configurada no servidor" });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const systemInstruction = `Você é um leitor e extrator especialista de tabelas e listas de preços de eletrônicos (iPhones, celulares, consoles, games).
    Analise minuciosamente a imagem ou documento PDF enviado.
    Extraia TODOS os produtos e preços listados na tabela ou imagem.
    
    COMO IDENTIFICAR E EXTRAIR PREÇOS:
    - O preço pode estar em formato numérico como "2950", "2.950", "2.950,00", "2950,00", "R$ 3.200", "3.2k", "$ 550", "US$ 600", "U$ 450", ou ao lado do modelo como "11 64GB - 1450" ou em colunas como "VALOR", "PREÇO", "PIX", "À VISTA", "DINHEIRO", "VALOR PIX".
    - Se houver mais de uma coluna de preço (ex: PIX vs CARTÃO vs PRAZO), priorize o preço À VISTA / PIX / DINHEIRO.
    - Se o preço estiver em Reais (BRL), retorne no campo 'price' como número decimal positivo (ex: 2950.00).
    - Se o preço for em Dólar (USD / $ / U$), preencha 'price_usd' com o valor em dólar (ex: 550.00) E também estime o 'price' em BRL (ex: 550 * 5.5 = 3025.00).
    - Se encontrar apenas o preço em BRL, preencha 'price' e calcule 'price_usd' dividindo por 5.5.
    - NUNCA retorne o preço como 0 se houver qualquer número ou indicação de valor associado ao aparelho.
    
    CAMPOS OBRIGATÓRIOS PARA CADA ITEM:
    - category: 'iphone' (para celulares, smartphones, iPads, Apple Watch) ou 'console' (para PS5, PS4, Xbox, Nintendo Switch, etc.)
    - model: Nome do modelo (ex: "iPhone 15", "iPhone 13", "PlayStation 5", "Nintendo Switch")
    - version: Versão ou subtipo se houver (ex: "Pro Max", "Plus", "Slim", "OLED", "Digital")
    - storage: Capacidade de armazenamento (ex: "128GB", "256GB", "64GB", "512GB", "1TB")
    - color: Cor se mencionada (ex: "Preto", "Titânio Natural", "Branco", "Azul")
    - condition: "Novo Lacrado" (se mencionar lacrado, novo, cpo) ou "Seminovo Grade A" (se seminovo, usado, vitrine)
    - price: Preço em Reais (BRL) como número positivo (ex: 2850.00).
    - price_usd: Preço em Dólar (USD) como número positivo se aplicável (ex: 520.00).`;

    const contents = {
      parts: [
        { inlineData: { data: fileData, mimeType } },
        { text: "Analise esta imagem/PDF com muita atenção e extraia todos os itens e preços da tabela, preenchendo todos os valores com precisão." }
      ]
    };

    const models = ["gemini-3.7-flash", "gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-2.5-flash", "gemini-3.1-pro-preview"];
    let lastErr: any = null;

    for (const modelName of models) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                items: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      category: { type: "STRING" },
                      model: { type: "STRING" },
                      version: { type: "STRING" },
                      storage: { type: "STRING" },
                      color: { type: "STRING" },
                      condition: { type: "STRING" },
                      price: { type: "NUMBER" },
                      price_usd: { type: "NUMBER" }
                    },
                    required: ["category", "model"]
                  }
                }
              },
              required: ["items"]
            }
          }
        });

        if (response.text) {
          let text = response.text.trim();
          if (text.startsWith('```')) {
            text = text.replace(/^```json\s*/, '').replace(/```$/, '').trim();
          }
          const extracted = JSON.parse(text);
          if (extracted && Array.isArray(extracted.items)) {
            // Normalize prices so that no item ever has missing or zero prices if convertible
            extracted.items = extracted.items.map((item: any) => {
              let priceNum = typeof item.price === 'number' ? item.price : parseFloat(String(item.price || '').replace(/[^\d.,]/g, '').replace(',', '.'));
              let priceUsdNum = typeof item.price_usd === 'number' ? item.price_usd : parseFloat(String(item.price_usd || '').replace(/[^\d.,]/g, '').replace(',', '.'));
              
              if (isNaN(priceNum) || priceNum <= 0) {
                if (!isNaN(priceUsdNum) && priceUsdNum > 0) {
                  priceNum = Number((priceUsdNum * 5.5).toFixed(2));
                } else {
                  priceNum = 0;
                }
              }

              if (isNaN(priceUsdNum) || priceUsdNum <= 0) {
                if (priceNum > 0) {
                  priceUsdNum = Number((priceNum / 5.5).toFixed(2));
                } else {
                  priceUsdNum = 0;
                }
              }

              return {
                ...item,
                category: item.category === 'console' ? 'console' : 'iphone',
                model: item.model || 'Aparelho',
                version: item.version || '',
                storage: item.storage || '',
                color: item.color || '',
                condition: item.condition || 'Seminovo Grade A',
                price: priceNum,
                price_usd: priceUsdNum
              };
            });
            return res.json(extracted);
          }
        }
      } catch (err: any) {
        lastErr = err;
        console.warn(`[Price Table IA] Model ${modelName} failed:`, err?.message || err);
        continue;
      }
    }

    throw lastErr || new Error("Falha ao analisar a tabela de preços com IA");

  } catch (error: any) {
    console.error("Gemini Price Table processing error:", error);
    const errMsg = String(error?.message || error || "");
    const isQuota = errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('exhausted');
    res.status(isQuota ? 429 : 500).json({ 
      error: isQuota 
        ? "Limite de requisições da IA atingido temporariamente. Aguarde alguns instantes e tente novamente, ou insira os dados manualmente." 
        : `Erro ao analisar com IA: ${errMsg}`
    });
  }
});

// --- REMOTE CLIENT REGISTRATION API ---

const readPublicClients = (): Record<string, any[]> => {
  try {
    if (!fs.existsSync(CLIENTS_FILE)) return {};
    const content = fs.readFileSync(CLIENTS_FILE, "utf8");
    return safeJsonParse(content, {});
  } catch (err) {
    console.error("Error reading public clients file:", err);
    return {};
  }
};

const writePublicClients = (data: Record<string, any[]>) => {
  try {
    atomicWriteFileSync(CLIENTS_FILE, data);
  } catch (err) {
    console.error("Error writing public clients file:", err);
  }
};

const readPublicTokens = (): Record<string, any> => {
  try {
    if (!fs.existsSync(TOKENS_FILE)) return {};
    const content = fs.readFileSync(TOKENS_FILE, "utf8");
    return safeJsonParse(content, {});
  } catch (err) {
    console.error("Error reading public tokens file:", err);
    return {};
  }
};

const writePublicTokens = (data: Record<string, any>) => {
  try {
    atomicWriteFileSync(TOKENS_FILE, data);
  } catch (err) {
    console.error("Error writing public tokens file:", err);
  }
};

// Validate Client Registration Link Token
app.get("/api/tokens/validate", async (req, res) => {
  const { token } = req.query;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ valid: false, error: "Token é obrigatório" });
  }

  // 1. Try Supabase first
  let supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  if (supabaseUrl.endsWith('/rest/v1/')) {
    supabaseUrl = supabaseUrl.slice(0, -9);
  } else if (supabaseUrl.endsWith('/rest/v1')) {
    supabaseUrl = supabaseUrl.slice(0, -8);
  }
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/public_tokens?token=eq.${token}&select=*`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      });
      if (response.ok) {
        const rows = await response.json();
        if (rows && rows.length > 0) {
          const tData = rows[0];
          if (tData.used) {
            return res.json({ valid: false, error: "Este link já foi utilizado." });
          }
          if (tData.expires_at && new Date(tData.expires_at) < new Date()) {
            return res.json({ valid: false, error: "Este link expirou." });
          }
          return res.json({ valid: true, userId: tData.user_id, expiresAt: tData.expires_at });
        }
      }
    } catch (err) {
      console.error("Supabase token validation error:", err);
    }
  }

  // 2. Fallback to local files
  const tokens = readPublicTokens();
  const tokenData = tokens[token];

  if (!tokenData) {
    return res.json({ valid: false, error: "Este link é inválido." });
  }
  if (tokenData.used) {
    return res.json({ valid: false, error: "Este link já foi utilizado." });
  }
  if (tokenData.expiresAt && new Date(tokenData.expiresAt) < new Date()) {
    return res.json({ valid: false, error: "Este link expirou." });
  }

  res.json({ valid: true, userId: tokenData.userId, expiresAt: tokenData.expiresAt });
});

// Generate Client Registration Link Token (Admin Only)
app.post("/api/tokens/generate", async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "userId é obrigatório" });
  }

  const tokens = readPublicTokens();
  // Generate simpleUUID token
  const tokenUuid = `link-${Date.now()}-${Math.random().toString(36).substring(2, 11)}-${Math.random().toString(36).substring(2, 11)}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // expires in 24 hours

  const newToken = {
    token: tokenUuid,
    userId,
    used: false,
    expiresAt,
    createdAt: new Date().toISOString()
  };

  tokens[tokenUuid] = newToken;
  writePublicTokens(tokens);

  // Try saving to Supabase
  let supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  if (supabaseUrl.endsWith('/rest/v1/')) {
    supabaseUrl = supabaseUrl.slice(0, -9);
  } else if (supabaseUrl.endsWith('/rest/v1')) {
    supabaseUrl = supabaseUrl.slice(0, -8);
  }
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

  if (supabaseUrl && supabaseAnonKey) {
    try {
      await fetch(`${supabaseUrl}/rest/v1/public_tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          token: tokenUuid,
          user_id: userId,
          used: false,
          expires_at: expiresAt,
          created_at: newToken.createdAt
        })
      });
    } catch (err) {
      console.error("Supabase generate token exception:", err);
    }
  }

  res.json(newToken);
});

// Check for duplicate CPF, Phone, or Email in remote pending registrations
app.get("/api/clients/check-duplicate", async (req, res) => {
  // Always return false to allow unlimited registrations and updates without causing duplicate block warnings
  res.json({ duplicateCpf: false, duplicatePhone: false, duplicateEmail: false });
});

// Public endpoint for clients to register themselves remotely
app.post("/api/public-clients", async (req, res) => {
  const { userId, client, token } = req.body;
  if (!userId || !client || !client.name || !client.phone) {
    return res.status(400).json({ error: "ID do vendedor, nome e telefone são obrigatórios" });
  }

  let supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  if (supabaseUrl.endsWith('/rest/v1/')) {
    supabaseUrl = supabaseUrl.slice(0, -9);
  } else if (supabaseUrl.endsWith('/rest/v1')) {
    supabaseUrl = supabaseUrl.slice(0, -8);
  }
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

  // Token is mandatory for single use validation if provided or required
  if (token) {
    let tokenUsedSuccess = false;
    
    // Try updating token on Supabase first
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const tokenCheckRes = await fetch(`${supabaseUrl}/rest/v1/public_tokens?token=eq.${token}&select=*`, {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
          }
        });
        if (tokenCheckRes.ok) {
          const rows = await tokenCheckRes.json();
          if (rows && rows.length > 0) {
            const tokenData = rows[0];
            if (tokenData.used) {
              return res.status(400).json({ error: "Este link já foi utilizado." });
            }
            if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
              return res.status(400).json({ error: "Este link expirou." });
            }

            // Mark token as used
            const tokenUpdateRes = await fetch(`${supabaseUrl}/rest/v1/public_tokens?token=eq.${token}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`
              },
              body: JSON.stringify({
                used: true,
                used_at: new Date().toISOString()
              })
            });
            if (tokenUpdateRes.ok) {
              tokenUsedSuccess = true;
            }
          }
        }
      } catch (err) {
        console.error("Supabase token update error:", err);
      }
    }

    // Always fallback to marking locally as well
    const tokens = readPublicTokens();
    const tokenData = tokens[token];
    if (tokenData) {
      tokens[token] = {
        ...tokenData,
        used: true,
        usedAt: new Date().toISOString()
      };
      writePublicTokens(tokens);
    } else if (!tokenUsedSuccess && !supabaseUrl) {
      return res.status(400).json({ error: "Este link é inválido ou já foi utilizado." });
    }
  }

  const clients = readPublicClients();
  if (!clients[userId]) {
    clients[userId] = [];
  }

  const newClientId = client.id || `remote-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const newClient = {
    id: newClientId,
    name: client.name,
    phone: client.phone,
    cpf: client.cpf || "",
    birth_date: client.birth_date || "",
    email: client.email || "",
    street: client.street || "",
    number: client.number || "",
    neighborhood: client.neighborhood || "",
    complement: client.complement || "",
    city: client.city || "",
    state: client.state || "",
    address: client.address || "",
    documento_url: client.documento_url || "",
    assinatura_base64: client.assinatura_base64 || "",
    token_cadastro: token || "",
    token_utilizado: !!token,
    token_expira_em: token ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : "", // token details
    
    // Hidden auto-saved audit info
    security_uuid: client.security_uuid || `sec-${Math.random().toString(36).substring(2, 15)}`,
    security_ip: client.security_ip || req.ip || req.headers["x-forwarded-for"] || "127.0.0.1",
    security_browser: client.security_browser || "Unknown Browser",
    security_os: client.security_os || "Unknown OS",
    security_device: client.security_device || "Unknown Device",
    security_user: userId, // responsible user ID

    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  clients[userId].push(newClient);
  writePublicClients(clients);

  // Try saving the client to Supabase public_clients table
  if (supabaseUrl && supabaseAnonKey) {
    try {
      await fetch(`${supabaseUrl}/rest/v1/public_clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          id: newClientId,
          user_id: userId,
          name: newClient.name,
          phone: newClient.phone,
          cpf: newClient.cpf,
          birth_date: newClient.birth_date,
          email: newClient.email,
          street: newClient.street,
          number: newClient.number,
          complement: newClient.complement,
          neighborhood: newClient.neighborhood,
          city: newClient.city,
          state: newClient.state,
          address: newClient.address,
          documento_url: newClient.documento_url,
          assinatura_base64: newClient.assinatura_base64,
          token_cadastro: newClient.token_cadastro,
          token_utilizado: newClient.token_utilizado,
          token_expira_em: newClient.token_expira_em,
          security_uuid: newClient.security_uuid,
          security_ip: newClient.security_ip,
          security_browser: newClient.security_browser,
          security_os: newClient.security_os,
          security_device: newClient.security_device,
          created_at: newClient.created_at
        })
      });
    } catch (err) {
      console.error("Supabase insert client error:", err);
    }
  }

  res.json({ success: true, message: "Cadastro enviado com sucesso!", client: newClient });
});

// Merchant fetches pending remote registrations
app.get("/api/public-clients", async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "userId é obrigatório" });
  }

  // Try loading from Supabase first
  let supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  if (supabaseUrl.endsWith('/rest/v1/')) {
    supabaseUrl = supabaseUrl.slice(0, -9);
  } else if (supabaseUrl.endsWith('/rest/v1')) {
    supabaseUrl = supabaseUrl.slice(0, -8);
  }
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/public_clients?user_id=eq.${userId}&select=*&order=created_at.desc`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      });
      if (response.ok) {
        const rows = await response.json();
        if (rows) {
          // Map snake_case or standard fields from Supabase to match local representation keys
          const mappedRows = rows.map((r: any) => ({
            id: r.id,
            name: r.name,
            phone: r.phone,
            cpf: r.cpf,
            birth_date: r.birth_date,
            email: r.email,
            street: r.street,
            number: r.number,
            complement: r.complement,
            neighborhood: r.neighborhood,
            city: r.city,
            state: r.state,
            address: r.address,
            documento_url: r.documento_url,
            assinatura_base64: r.assinatura_base64,
            token_cadastro: r.token_cadastro,
            token_utilizado: r.token_utilizado,
            token_expira_em: r.token_expira_em,
            security_uuid: r.security_uuid,
            security_ip: r.security_ip,
            security_browser: r.security_browser,
            security_os: r.security_os,
            security_device: r.security_device,
            created_at: r.created_at,
            updated_at: r.created_at
          }));
          return res.json(mappedRows);
        }
      }
    } catch (err) {
      console.error("Supabase fetch public clients error:", err);
    }
  }

  const clients = readPublicClients();
  const pending = clients[userId as string] || [];
  res.json(pending);
});

// Merchant completed syncing these remote registrations
app.post("/api/public-clients/sync-done", async (req, res) => {
  const { userId, clientIds } = req.body;
  if (!userId || !clientIds || !Array.isArray(clientIds)) {
    return res.status(400).json({ error: "userId e lista de clientIds são obrigatórios" });
  }

  const clients = readPublicClients();
  if (clients[userId]) {
    clients[userId] = clients[userId].filter(c => !clientIds.includes(c.id));
    writePublicClients(clients);
  }

  // Try deleting from Supabase
  let supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  if (supabaseUrl.endsWith('/rest/v1/')) {
    supabaseUrl = supabaseUrl.slice(0, -9);
  } else if (supabaseUrl.endsWith('/rest/v1')) {
    supabaseUrl = supabaseUrl.slice(0, -8);
  }
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

  if (supabaseUrl && supabaseAnonKey && clientIds.length > 0) {
    try {
      for (const cid of clientIds) {
        await fetch(`${supabaseUrl}/rest/v1/public_clients?id=eq.${cid}`, {
          method: 'DELETE',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
          }
        });
      }
    } catch (err) {
      console.error("Supabase delete synced clients error:", err);
    }
  }

  res.json({ success: true });
});

// --- SYSTEM USERS / SALESPEOPLE API ---

// Fetch all system users/salespeople
app.get("/api/users", (req, res) => {
  const users = readPublicUsers();
  res.json(users);
});

// Add a new system user/salesperson
app.post("/api/users", (req, res) => {
  const { name, email, phone, role, status } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "Nome e e-mail são obrigatórios" });
  }

  const users = readPublicUsers();
  
  // Check if email already exists
  const exists = users.find(u => u.email.trim().toLowerCase() === email.trim().toLowerCase());
  if (exists) {
    return res.status(400).json({ error: "Este e-mail já está cadastrado para outro usuário." });
  }

  const newUser = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    name,
    email: email.trim().toLowerCase(),
    phone: phone || "",
    role: role || "Vendedor",
    status: status || "Ativo",
    created_at: new Date().toISOString()
  };

  users.push(newUser);
  writePublicUsers(users);
  res.json({ success: true, user: newUser });
});

// Update an existing system user/salesperson
app.put("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const { name, email, phone, role, status } = req.body;

  const users = readPublicUsers();
  const userIdx = users.findIndex(u => u.id === id);

  if (userIdx === -1) {
    return res.status(404).json({ error: "Usuário não encontrado." });
  }

  if (email) {
    const emailConflict = users.find(u => u.id !== id && u.email.trim().toLowerCase() === email.trim().toLowerCase());
    if (emailConflict) {
      return res.status(400).json({ error: "Este e-mail já está em uso por outro usuário." });
    }
  }

  const updatedUser = {
    ...users[userIdx],
    name: name || users[userIdx].name,
    email: email ? email.trim().toLowerCase() : users[userIdx].email,
    phone: phone !== undefined ? phone : users[userIdx].phone,
    role: role || users[userIdx].role,
    status: status || users[userIdx].status,
    updated_at: new Date().toISOString()
  };

  users[userIdx] = updatedUser;
  writePublicUsers(users);
  res.json({ success: true, user: updatedUser });
});

// Delete a system user/salesperson
app.delete("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const users = readPublicUsers();
  const filtered = users.filter(u => u.id !== id);

  if (filtered.length === users.length) {
    return res.status(404).json({ error: "Usuário não encontrado." });
  }

  writePublicUsers(filtered);
  res.json({ success: true });
});

// --- SETTINGS STORAGE API ---

const readPublicSettings = (): Record<string, any> => {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return {};
    const content = fs.readFileSync(SETTINGS_FILE, "utf8");
    return safeJsonParse(content, {});
  } catch (err) {
    console.error("Error reading public settings file:", err);
    return {};
  }
};

const writePublicSettings = (data: Record<string, any>) => {
  try {
    atomicWriteFileSync(SETTINGS_FILE, data);
  } catch (err) {
    console.error("Error writing public settings file:", err);
  }
};

// Public endpoint to fetch settings (supports optional userId)
app.get("/api/settings", (req, res) => {
  const { userId } = req.query;
  const settings = readPublicSettings();
  
  if (userId && settings[userId as string]) {
    return res.json(settings[userId as string]);
  }
  
  // Try to return the first set of settings if any exists as a fallback
  const keys = Object.keys(settings);
  if (keys.length > 0) {
    return res.json(settings[keys[0]]);
  }
  
  res.json({});
});

// Endpoint to update settings
app.post("/api/settings", (req, res) => {
  const { userId, settings: userSettings } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "userId é obrigatório" });
  }

  const settings = readPublicSettings();
  settings[userId] = {
    ...(settings[userId] || {}),
    ...userSettings
  };

  writePublicSettings(settings);
  res.json({ success: true });
});

// Vite middleware setup
async function startServer() {
  console.log("NODE_ENV is:", process.env.NODE_ENV);
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    let distPath = path.join(process.cwd(), "dist");
    
    // Robust fallback checking to resolve the correct dist folder in production
    if (!fs.existsSync(path.join(distPath, "index.html"))) {
      if (typeof __dirname !== "undefined" && fs.existsSync(path.join(__dirname, "index.html"))) {
        distPath = __dirname;
      } else if (fs.existsSync(path.join(process.cwd(), "index.html"))) {
        distPath = process.cwd();
      }
    }
    
    console.log(`[Production] Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", async (req, res) => {
      if (req.url.startsWith("/api/")) {
        return res.status(404).json({ error: "API route not found" });
      }
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        let template = fs.readFileSync(indexPath, "utf-8");
        template = await injectMetaTags(template, req.originalUrl);
        res.send(template);
      } else {
        res.status(404).send("Application shell (index.html) not found. Please compile the app.");
      }
    });
  }

  if (!process.env.VERCEL) {
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Another instance may be running.`);
      } else {
        console.error('Server error:', err);
      }
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;

