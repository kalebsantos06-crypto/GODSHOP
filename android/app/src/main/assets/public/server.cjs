var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  default: () => server_default
});
module.exports = __toCommonJS(server_exports);
var import_config = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_date_fns2 = require("date-fns");

// src/lib/dateUtils.ts
var import_date_fns = require("date-fns");
function parseLocalDate(dateStr) {
  if (!dateStr) return /* @__PURE__ */ new Date();
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    return new Date(year, month, day, 12, 0, 0);
  }
  return new Date(dateStr);
}
function getInstallmentDate(sale, index) {
  if (!sale) return /* @__PURE__ */ new Date();
  const hasFirstDate = Boolean(sale.first_installment_date);
  const baseDateStr = sale.first_installment_date || sale.sale_date;
  const baseDate = parseLocalDate(baseDateStr);
  const multiplier = hasFirstDate ? index - 1 : index;
  const freq = (sale.installment_frequency || "Mensal").toString().trim().toLowerCase();
  if (freq.startsWith("seman")) {
    return (0, import_date_fns.addDays)(baseDate, multiplier * 7);
  } else if (freq.startsWith("quinzen")) {
    return (0, import_date_fns.addDays)(baseDate, multiplier * 15);
  } else {
    return (0, import_date_fns.addMonths)(baseDate, multiplier);
  }
}
function getCalculatedInstallments(sale, customPayments) {
  if (!sale) return [];
  const sellPrice = Number(sale.sell_price || 0);
  const downPayment = Number(sale.down_payment || 0);
  const totalAmount = Number((sellPrice - downPayment).toFixed(2));
  const baseInstCount = Math.max(1, Number(sale.installments) || 1);
  const instAmount = Number((totalAmount / baseInstCount).toFixed(2));
  let paymentsMap = {};
  if (typeof customPayments === "string") {
    try {
      paymentsMap = JSON.parse(customPayments);
    } catch (e) {
    }
  } else if (customPayments && typeof customPayments === "object" && Object.keys(customPayments).length > 0) {
    paymentsMap = customPayments;
  } else {
    if (sale.custom_payments) {
      try {
        paymentsMap = typeof sale.custom_payments === "string" ? JSON.parse(sale.custom_payments) : sale.custom_payments;
      } catch (e) {
      }
    }
    if (Object.keys(paymentsMap).length === 0 && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`inst_payments_${sale.id}`);
        if (stored) {
          paymentsMap = JSON.parse(stored);
        }
      } catch (e) {
      }
    }
    if (Object.keys(paymentsMap).length === 0) {
      const paidCount = Number(sale.installments_paid) || 0;
      for (let i = 1; i <= baseInstCount; i++) {
        paymentsMap[i] = i <= paidCount ? instAmount : 0;
      }
    }
  }
  const list = [];
  let totalPaid = 0;
  const paidIndices = [];
  const unpaidIndices = [];
  for (let i = 1; i <= baseInstCount; i++) {
    const p = paymentsMap[i] || 0;
    if (p > 5e-3) {
      totalPaid += p;
      paidIndices.push(i);
    } else {
      unpaidIndices.push(i);
    }
  }
  const extraKeys = Object.keys(paymentsMap).map(Number).filter((k) => !isNaN(k) && k > baseInstCount).sort((a, b) => a - b);
  for (const k of extraKeys) {
    const p = paymentsMap[k] || 0;
    if (p > 5e-3) {
      totalPaid += p;
      paidIndices.push(k);
    } else {
      unpaidIndices.push(k);
    }
  }
  let remainingUnpaid = Number((totalAmount - totalPaid).toFixed(2));
  if (remainingUnpaid > 0.01 && unpaidIndices.length === 0) {
    const maxIdx = Math.max(baseInstCount, ...Object.keys(paymentsMap).map(Number).filter((n) => !isNaN(n)), 0);
    unpaidIndices.push(maxIdx + 1);
  }
  const allIndices = Array.from(/* @__PURE__ */ new Set([...paidIndices, ...unpaidIndices])).sort((a, b) => a - b);
  if (unpaidIndices.length > 0) {
    const rawExpectedPerUnpaid = remainingUnpaid > 0 ? remainingUnpaid / unpaidIndices.length : 0;
    const expectedPerUnpaid = Math.max(0, Number(rawExpectedPerUnpaid.toFixed(2)));
    const totalPaidExpected = paidIndices.reduce((sum, idx) => sum + (paymentsMap[idx] || 0), 0);
    const countExceptLast = unpaidIndices.length - 1;
    const sumExceptLast = countExceptLast * expectedPerUnpaid;
    const lastUnpaidIndex = unpaidIndices[unpaidIndices.length - 1];
    const lastExpected = Math.max(0, Number((totalAmount - totalPaidExpected - sumExceptLast).toFixed(2)));
    const expectedMap = {};
    for (const idx of paidIndices) {
      expectedMap[idx] = paymentsMap[idx] || 0;
    }
    for (let i = 0; i < unpaidIndices.length - 1; i++) {
      expectedMap[unpaidIndices[i]] = expectedPerUnpaid;
    }
    expectedMap[lastUnpaidIndex] = lastExpected;
    for (const idx of allIndices) {
      const isPaid = paidIndices.includes(idx);
      const paidVal = paymentsMap[idx] || 0;
      const expectedVal = expectedMap[idx];
      list.push({
        index: idx,
        expectedAmount: expectedVal,
        paidAmount: paidVal,
        dueDate: getInstallmentDate(sale, idx),
        status: isPaid ? "fully_paid" : "pending"
      });
    }
  } else {
    for (const idx of allIndices) {
      const paidVal = paymentsMap[idx] || 0;
      list.push({
        index: idx,
        expectedAmount: paidVal,
        paidAmount: paidVal,
        dueDate: getInstallmentDate(sale, idx),
        status: "fully_paid"
      });
    }
  }
  return list;
}
function getSaleNotifications(salesList, clientsList = [], iphonesList = [], consolesList = []) {
  const notifications = [];
  if (!salesList || salesList.length === 0) return notifications;
  const today = (0, import_date_fns.startOfDay)(/* @__PURE__ */ new Date());
  for (const sale of salesList) {
    if (!sale.installments || Number(sale.installments) <= 1) continue;
    const calculatedList = getCalculatedInstallments(sale);
    const client = clientsList.find((c) => c.id === sale.client_id);
    const iphone = iphonesList.find((p) => p.id === sale.iphone_id);
    const consoleObj = consolesList.find((p) => p.id === sale.console_id);
    const categoryName = consoleObj ? consoleObj.category === "tv" ? "TV" : consoleObj.category === "rice_cooker" ? "Panela El\xE9trica" : consoleObj.category === "outro" ? "Eletro" : "Console" : "Aparelho";
    const itemName = iphone ? `${iphone.model} ${iphone.storage}` : consoleObj ? `${categoryName} ${consoleObj.model}` : "Aparelho";
    for (const inst of calculatedList) {
      if (inst.status === "pending") {
        const dueDay = (0, import_date_fns.startOfDay)(inst.dueDate);
        const daysDiff = (0, import_date_fns.differenceInDays)(dueDay, today);
        notifications.push({
          id: `${sale.id}_inst_${inst.index}`,
          clientName: client?.name || "Cliente Sem Nome",
          clientPhone: client?.phone ? client.phone.replace(/\D/g, "") : "",
          itemName,
          installmentIndex: inst.index,
          expectedAmount: inst.expectedAmount,
          dueDate: inst.dueDate,
          status: inst.status,
          daysDiff,
          saleId: sale.id,
          saleData: sale,
          clientData: client,
          iphoneData: iphone,
          consoleData: consoleObj
        });
      }
    }
  }
  return notifications.sort((a, b) => a.daysDiff - b.daysDiff);
}

// server.ts
var app = (0, import_express.default)();
var PORT = 3e3;
async function supabaseQuery(table, userId) {
  let supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  if (supabaseUrl.endsWith("/rest/v1/")) {
    supabaseUrl = supabaseUrl.slice(0, -9);
  } else if (supabaseUrl.endsWith("/rest/v1")) {
    supabaseUrl = supabaseUrl.slice(0, -8);
  }
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !supabaseAnonKey) return [];
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?user_id=eq.${userId}&select=*`, {
      headers: {
        "apikey": supabaseAnonKey,
        "Authorization": `Bearer ${supabaseAnonKey}`
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
var DEFAULT_TEMPLATES = {
  days_3_before: "Ol\xE1, {cliente}! \u{1F60A} Aqui \xE9 a {atendente}, assistente virtual da GODSHOP. (Esta \xE9 uma mensagem autom\xE1tica)\n\nPassando para lembrar que a sua {parcela}\xAA parcela de {valor} (referente ao {aparelho}) vence no dia {vencimento}.\n\nPor favor, realize o pagamento via Pix utilizando a chave abaixo:\n\n{pix}\n\nCaso j\xE1 tenha realizado o pagamento, por favor desconsiderar. Caso precise de ajuda, estamos \xE0 disposi\xE7\xE3o! \u{1F90D}",
  day_of: "Ol\xE1, {cliente}! \u{1F60A} Aqui \xE9 a {atendente}, assistente virtual da GODSHOP. (Esta \xE9 uma mensagem autom\xE1tica)\n\nPassando para lembrar que a sua {parcela}\xAA parcela de {valor} (referente ao {aparelho}) vence hoje ({vencimento}).\n\nPor favor, realize o pagamento via Pix utilizando a chave abaixo:\n\n{pix}\n\nCaso j\xE1 tenha realizado o pagamento, por favor desconsiderar. Caso precise de ajuda, estamos \xE0 disposi\xE7\xE3o! \u{1F90D}",
  overdue: "Ol\xE1, {cliente}! \u{1F60A} Aqui \xE9 a {atendente}, assistente virtual da GODSHOP. (Esta \xE9 uma mensagem autom\xE1tica)\n\nNotamos que a sua {parcela}\xAA parcela de {valor} (referente ao {aparelho}) venceu em {vencimento} e est\xE1 pendente.\n\nPor favor, realize o pagamento via Pix utilizando a chave abaixo:\n\n{pix}\n\nCaso j\xE1 tenha realizado o pagamento, por favor desconsidere. Caso precise de ajuda, estamos aqui! \u{1F90D}"
};
async function runAutomationTask() {
  const now = /* @__PURE__ */ new Date();
  console.log(`[Automation] Initiating daily check at ${now.toLocaleString("pt-BR")}`);
  const allSettings = readPublicSettings();
  const userIds = Object.keys(allSettings);
  for (const userId of userIds) {
    const userSettings = allSettings[userId];
    if (userSettings.isFullAutoEnabled && userSettings.isWebhookEnabled && userSettings.webhookUrl) {
      console.log(`[Automation] Processing background notifications for user: ${userId}`);
      try {
        const sales = await supabaseQuery("sales", userId);
        const clients = await supabaseQuery("clients", userId);
        const iphones = await supabaseQuery("iphones", userId);
        const consoles = await supabaseQuery("consoles", userId);
        const notifications = getSaleNotifications(sales, clients, iphones, consoles);
        const toNotify = notifications.filter((n) => n.daysDiff === 0 || n.daysDiff === 3 || n.daysDiff === -1);
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
          const dueDateObj = typeof item.dueDate === "string" ? parseLocalDate(item.dueDate) : item.dueDate;
          const formattedDueDate = (0, import_date_fns2.format)(dueDateObj, "dd/MM/yyyy");
          const amount = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.expectedAmount);
          const message = template.replace(/{cliente}/g, item.clientName).replace(/{aparelho}/g, item.itemName).replace(/{parcela}/g, String(item.installmentIndex)).replace(/{valor}/g, amount).replace(/{vencimento}/g, formattedDueDate).replace(/{atendente}/g, userSettings.attendantName || "Karen").replace(/{pix}/g, userSettings.pixInfo || "Chave Pix: 13036942637");
          try {
            const res = await fetch(userSettings.webhookUrl.trim(), {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...userSettings.webhookToken ? { "Authorization": `Bearer ${userSettings.webhookToken}` } : {}
              },
              body: JSON.stringify({
                phone: item.clientPhone,
                message,
                clientName: item.clientName,
                itemName: item.itemName,
                installmentIndex: item.installmentIndex,
                expectedAmount: item.expectedAmount,
                dueDate: (0, import_date_fns2.format)(dueDateObj, "yyyy-MM-dd"),
                automationType: "background_auto"
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
          await new Promise((r) => setTimeout(r, 1e3));
        }
      } catch (err) {
        console.error(`[Automation] Critical error processing user ${userId}:`, err);
      }
    }
  }
  console.log(`[Automation] Finished all tasks.`);
}
setInterval(runAutomationTask, 12 * 60 * 60 * 1e3);
setTimeout(runAutomationTask, 30 * 1e3);
app.use(import_express.default.json({ limit: "15mb" }));
var PUBLIC_DIR = import_path.default.join(process.cwd(), "public");
if (import_fs.default.existsSync(PUBLIC_DIR)) {
  app.use(import_express.default.static(PUBLIC_DIR));
}
app.get("/manifest.json", (req, res) => {
  const manifestPath = import_path.default.join(process.cwd(), "public", "manifest.json");
  if (import_fs.default.existsSync(manifestPath)) {
    res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
    return res.sendFile(manifestPath);
  }
  const distManifestPath = import_path.default.join(process.cwd(), "dist", "manifest.json");
  if (import_fs.default.existsSync(distManifestPath)) {
    res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
    return res.sendFile(distManifestPath);
  }
  res.status(404).json({ error: "Manifest not found" });
});
var DATA_DIR = process.env.VERCEL ? import_path.default.join("/tmp", "data") : import_path.default.join(process.cwd(), "data");
var SALES_FILE = import_path.default.join(DATA_DIR, "public_sales.json");
var CLIENTS_FILE = import_path.default.join(DATA_DIR, "public_clients.json");
var SETTINGS_FILE = import_path.default.join(DATA_DIR, "public_settings.json");
var TOKENS_FILE = import_path.default.join(DATA_DIR, "public_tokens.json");
var USERS_FILE = import_path.default.join(DATA_DIR, "public_users.json");
var CLOUD_DB_FILE = import_path.default.join(DATA_DIR, "cloud_database.json");
var atomicWriteFileSync = (filePath, data) => {
  const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2)}`;
  import_fs.default.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8");
  import_fs.default.renameSync(tempPath, filePath);
};
try {
  if (!import_fs.default.existsSync(DATA_DIR)) {
    import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!import_fs.default.existsSync(SALES_FILE)) {
    atomicWriteFileSync(SALES_FILE, {});
  }
  if (!import_fs.default.existsSync(CLIENTS_FILE)) {
    atomicWriteFileSync(CLIENTS_FILE, {});
  }
  if (!import_fs.default.existsSync(SETTINGS_FILE)) {
    atomicWriteFileSync(SETTINGS_FILE, {});
  }
  if (!import_fs.default.existsSync(TOKENS_FILE)) {
    atomicWriteFileSync(TOKENS_FILE, {});
  }
  if (!import_fs.default.existsSync(CLOUD_DB_FILE)) {
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
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    atomicWriteFileSync(CLOUD_DB_FILE, initialCloudDb);
  }
  if (!import_fs.default.existsSync(USERS_FILE)) {
    const defaultUsers = [
      {
        id: "usr-1",
        name: "Kaleb Santos",
        email: "kalebsantos06@gmail.com",
        phone: "(11) 99999-9999",
        role: "Administrador",
        status: "Ativo",
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      }
    ];
    atomicWriteFileSync(USERS_FILE, defaultUsers);
  }
} catch (fsErr) {
  console.warn("[Vercel FS Warning] Initializing local files in fallback mode:", fsErr);
}
var sanitizeJsonString = (str) => {
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
        if (code < 32 && char !== "\n" && char !== "\r" && char !== "	") {
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
          else if (char === "	") result += "\\t";
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
var safeJsonParse = (raw, defaultValue) => {
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
        console.error("Safe JSON parse error:", e1?.message);
        return defaultValue;
      }
    }
  }
};
var readCloudDb = () => {
  try {
    if (!import_fs.default.existsSync(CLOUD_DB_FILE)) {
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
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    const content = import_fs.default.readFileSync(CLOUD_DB_FILE, "utf8");
    const parsed = safeJsonParse(content, {});
    const rawSales = parsed.sales || [];
    const sanitizedSales = rawSales.map((s) => {
      if (!s) return s;
      const clientName = (s.client_name || "").toLowerCase();
      if (s.id === "7ab8846f-1d26-4591-908c-b8fa6742edfb" || clientName.includes("paula")) {
        return {
          ...s,
          iphone_id: s.iphone_id || "089025de-e939-432c-8204-29f95ed02821",
          buy_price: s.buy_price || 700
        };
      }
      if (s.id === "d9d66639-2db6-4991-9074-39d019d80097" || clientName.includes("yuri") && Number(s.sell_price) === 1950) {
        return {
          ...s,
          iphone_id: s.iphone_id || "6a34a484-559e-47ea-b9b7-bf3d5819f81b",
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
      updated_at: parsed.updated_at || (/* @__PURE__ */ new Date()).toISOString()
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
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
};
var writeCloudDb = (data) => {
  try {
    data.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    atomicWriteFileSync(CLOUD_DB_FILE, data);
  } catch (err) {
    console.error("Error writing cloud db file:", err);
  }
};
var readPublicUsers = () => {
  try {
    if (!import_fs.default.existsSync(USERS_FILE)) return [];
    const content = import_fs.default.readFileSync(USERS_FILE, "utf8");
    return safeJsonParse(content, []);
  } catch (err) {
    console.error("Error reading public users file:", err);
    return [];
  }
};
var writePublicUsers = (data) => {
  try {
    atomicWriteFileSync(USERS_FILE, data);
  } catch (err) {
    console.error("Error writing public users file:", err);
  }
};
var ALL_CLOUD_TABLES = [
  "suppliers",
  "clients",
  "iphones",
  "consoles",
  "prices",
  "sales",
  "purchases",
  "products",
  "product_units",
  "fiscal_documents",
  "fiscal_configs",
  "gifts",
  "gift_purchases",
  "gift_dispatches",
  "accessory_sales",
  "product_photos",
  "users",
  "notes",
  "note_checklist_items",
  "note_audio"
];
var filterDeletedItems = (db) => {
  if (!db) return db;
  const deletedIdsMap = db.deleted_ids || {};
  for (const table of ALL_CLOUD_TABLES) {
    if (Array.isArray(db[table]) && Array.isArray(deletedIdsMap[table]) && deletedIdsMap[table].length > 0) {
      const deletedSet = new Set(deletedIdsMap[table]);
      db[table] = db[table].filter((i) => i && i.id && !deletedSet.has(i.id));
    }
  }
  return db;
};
app.get("/api/cloud-db", (req, res) => {
  const db = filterDeletedItems(readCloudDb());
  res.json({ success: true, data: db });
});
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
app.post("/api/cloud-db/push", (req, res) => {
  const incoming = req.body.data || {};
  const current = readCloudDb();
  if (!current.deleted_ids) current.deleted_ids = {};
  if (incoming.deleted_ids && typeof incoming.deleted_ids === "object") {
    for (const table of ALL_CLOUD_TABLES) {
      if (Array.isArray(incoming.deleted_ids[table])) {
        const existingDeleted = new Set(current.deleted_ids[table] || []);
        for (const id of incoming.deleted_ids[table]) {
          if (id) existingDeleted.add(id);
        }
        current.deleted_ids[table] = Array.from(existingDeleted);
      }
    }
  }
  for (const table of ALL_CLOUD_TABLES) {
    const deletedSet = new Set(current.deleted_ids[table] || []);
    if (Array.isArray(incoming[table])) {
      const existingList = Array.isArray(current[table]) ? current[table] : [];
      const itemMap = /* @__PURE__ */ new Map();
      for (const item of existingList) {
        if (item && item.id && !deletedSet.has(item.id)) {
          itemMap.set(item.id, item);
        }
      }
      for (const item of incoming[table]) {
        if (item && item.id && !deletedSet.has(item.id)) {
          const existingItem = itemMap.get(item.id);
          if (!existingItem) {
            itemMap.set(item.id, item);
          } else {
            const existingTime = new Date(existingItem.updated_at || existingItem.created_at || 0).getTime();
            const incomingTime = new Date(item.updated_at || item.created_at || 0).getTime();
            let merged = incomingTime >= existingTime ? { ...existingItem, ...item } : { ...item, ...existingItem };
            if (table === "sales") {
              const exPaid = Number(existingItem.installments_paid) || 0;
              const inPaid = Number(item.installments_paid) || 0;
              if (incomingTime >= existingTime) {
                merged.installments_paid = item.installments_paid !== void 0 ? item.installments_paid : exPaid;
              } else {
                merged.installments_paid = Math.max(exPaid, inPaid);
              }
              try {
                const exCust = typeof existingItem.custom_payments === "string" ? safeJsonParse(existingItem.custom_payments, {}) : existingItem.custom_payments || {};
                const inCust = typeof item.custom_payments === "string" ? safeJsonParse(item.custom_payments, {}) : item.custom_payments || {};
                const mergedCust = { ...exCust, ...inCust };
                if (Object.keys(mergedCust).length > 0) {
                  merged.custom_payments = JSON.stringify(mergedCust);
                }
              } catch (e) {
              }
              if (existingItem.signature_data && !item.signature_data) {
                merged.signature_data = existingItem.signature_data;
                merged.signed_at = existingItem.signed_at;
                merged.signed_ip = existingItem.signed_ip;
              } else if (item.signature_data) {
                merged.signature_data = item.signature_data;
                merged.signed_at = item.signed_at;
                merged.signed_ip = item.signed_ip;
              }
              if (existingItem.iphone_id && !item.iphone_id) {
                merged.iphone_id = existingItem.iphone_id;
              }
              if (existingItem.console_id && !item.console_id) {
                merged.console_id = existingItem.console_id;
              }
              if (existingItem.buy_price && !item.buy_price) {
                merged.buy_price = existingItem.buy_price;
              }
              const clientName = (merged.client_name || "").toLowerCase();
              if (merged.id === "7ab8846f-1d26-4591-908c-b8fa6742edfb" || clientName.includes("paula")) {
                merged.iphone_id = merged.iphone_id || "089025de-e939-432c-8204-29f95ed02821";
                merged.buy_price = merged.buy_price || 700;
              } else if (merged.id === "d9d66639-2db6-4991-9074-39d019d80097" || clientName.includes("yuri") && Number(merged.sell_price) === 1950) {
                merged.iphone_id = merged.iphone_id || "6a34a484-559e-47ea-b9b7-bf3d5819f81b";
                merged.buy_price = merged.buy_price || 1400;
              }
            }
            if (table === "iphones" || table === "consoles") {
              if (item.status === "vendido" || existingItem.status === "vendido") {
                if (incomingTime > existingTime && item.status === "disponivel") {
                  merged.status = "disponivel";
                } else {
                  merged.status = "vendido";
                }
              }
            }
            itemMap.set(item.id, merged);
          }
        }
      }
      current[table] = Array.from(itemMap.values());
    } else if (Array.isArray(current[table]) && deletedSet.size > 0) {
      current[table] = current[table].filter((i) => i && i.id && !deletedSet.has(i.id));
    }
  }
  if (incoming.custom_payments && typeof incoming.custom_payments === "object") {
    if (!current.custom_payments) current.custom_payments = {};
    for (const [saleId, val] of Object.entries(incoming.custom_payments)) {
      if (typeof val === "string" && val.trim()) {
        try {
          const incomingObj = safeJsonParse(val, {});
          const currentVal = current.custom_payments[saleId];
          const currentObj = currentVal ? safeJsonParse(currentVal, {}) : {};
          const mergedObj = { ...currentObj, ...incomingObj };
          current.custom_payments[saleId] = JSON.stringify(mergedObj);
        } catch (e) {
          current.custom_payments[saleId] = val;
        }
      }
    }
  }
  if (incoming.store_settings && typeof incoming.store_settings === "object") {
    current.store_settings = {
      ...current.store_settings || {},
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
app.get("/api/cloud-db/:table", (req, res) => {
  const { table } = req.params;
  const db = filterDeletedItems(readCloudDb());
  const list = db[table] || [];
  res.json({ success: true, data: list });
});
app.post("/api/cloud-db/:table", (req, res) => {
  const { table } = req.params;
  const item = req.body;
  if (!item || !item.id) {
    return res.status(400).json({ error: "Item com ID \xE9 obrigat\xF3rio" });
  }
  const db = readCloudDb();
  if (!Array.isArray(db[table])) {
    db[table] = [];
  }
  if (!db.deleted_ids) db.deleted_ids = {};
  if (Array.isArray(db.deleted_ids[table])) {
    db.deleted_ids[table] = db.deleted_ids[table].filter((id) => id !== item.id);
  }
  const existingIdx = db[table].findIndex((i) => i.id === item.id);
  if (existingIdx >= 0) {
    db[table][existingIdx] = { ...db[table][existingIdx], ...item };
  } else {
    db[table].push(item);
  }
  writeCloudDb(db);
  res.json({ success: true, data: item });
});
app.put("/api/cloud-db/:table/:id", (req, res) => {
  const { table, id } = req.params;
  const updates = req.body;
  const db = readCloudDb();
  if (!Array.isArray(db[table])) {
    db[table] = [];
  }
  if (!db.deleted_ids) db.deleted_ids = {};
  if (Array.isArray(db.deleted_ids[table])) {
    db.deleted_ids[table] = db.deleted_ids[table].filter((delId) => delId !== id);
  }
  const existingIdx = db[table].findIndex((i) => i.id === id);
  if (existingIdx >= 0) {
    db[table][existingIdx] = { ...db[table][existingIdx], ...updates };
  } else {
    db[table].push({ id, ...updates });
  }
  writeCloudDb(db);
  res.json({ success: true, data: db[table][existingIdx] || { id, ...updates } });
});
app.delete("/api/cloud-db/:table/:id", (req, res) => {
  const { table, id } = req.params;
  const db = readCloudDb();
  if (!db.deleted_ids) db.deleted_ids = {};
  if (!Array.isArray(db.deleted_ids[table])) db.deleted_ids[table] = [];
  if (!db.deleted_ids[table].includes(id)) {
    db.deleted_ids[table].push(id);
  }
  if (Array.isArray(db[table])) {
    db[table] = db[table].filter((i) => i.id !== id);
  }
  writeCloudDb(db);
  res.json({ success: true, message: "Item removido da nuvem com sucesso" });
});
app.get("/api/app-url", (req, res) => {
  let proto = req.headers["x-forwarded-proto"] || "https";
  let host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
  console.log(`[URL Helper] Incoming Host: ${host}, Proto: ${proto}`);
  if (host.includes("://")) {
    const url = new URL(host);
    host = url.host;
    proto = url.protocol.replace(":", "");
  }
  if (host.includes(".run.app")) {
    proto = "https";
  }
  const origin = `${proto}://${host}`;
  console.log(`[URL Helper] Final Generated origin: ${origin}`);
  res.json({ origin });
});
app.get("/api/dailytip", async (req, res) => {
  const curatedFallbackTips = [
    "Inova\xE7\xE3o \xE9 dizer n\xE3o a mil coisas. Foque nos modelos de iPhone mais procurados para otimizar seu fluxo de caixa! \u2014 Inspirado em Steve Jobs",
    "O p\xF3s-venda excelente \xE9 sua melhor ferramenta de marketing. Um cliente satisfeito com a garantia trar\xE1 tr\xEAs novos compradores!",
    "Tenha sempre acess\xF3rios de alta margem (capas, pel\xEDculas, carregadores) vis\xEDveis no balc\xE3o de checkout para compras por impulso.",
    "Monitore a sa\xFAde da bateria dos iPhones seminovos em estoque. Aparelhos com sa\xFAde acima de 85% vendem muito mais r\xE1pido!",
    "Seu estoque parado \xE9 dinheiro congelado. Fa\xE7a combos de consoles antigos com jogos f\xEDsicos para girar o caixa com agilidade.",
    "Crie v\xEDdeos curtos comparando as c\xE2meras dos modelos de iPhone em estoque. O alcance org\xE2nico atrai clientes locais qualificados!",
    "Foque na velocidade e cordialidade do atendimento no Instagram e WhatsApp. Quem responde primeiro geralmente fecha a venda!",
    "Trabalhe com o sistema de 'Trade-In' (aceitar celular usado como parte do pagamento). Isso facilita o upgrade de aparelho do cliente.",
    "Seja transparente sobre as condi\xE7\xF5es f\xEDsicas e proced\xEAncia de cada item seminovo. A confian\xE7a vale mais do que uma venda \xFAnica.",
    "Ofere\xE7a kits prontos: console + jogo popular + controle extra. Pacotes facilitam a decis\xE3o de compra de pais e presentes.",
    "Pe\xE7a para cada cliente satisfeito deixar uma breve avalia\xE7\xE3o de 5 estrelas no Google. Isso aumenta drasticamente sua atra\xE7\xE3o local.",
    "A experi\xEAncia de unboxing e entrega \xE9 sagrada. Use sacolas personalizadas e fragr\xE2ncias sutis para marcar a mem\xF3ria do cliente.",
    "Acompanhe de perto seu lucro l\xEDquido real, e n\xE3o apenas o faturamento bruto. Conhe\xE7a suas margens em cada aparelho vendido.",
    "N\xE3o venda apenas hardware; venda divers\xE3o e conex\xE3o familiar. Clientes compram emo\xE7\xF5es e momentos de lazer incompar\xE1veis.",
    "Esteja sempre atento \xE0s datas de grandes lan\xE7amentos de jogos e novos iPhones para planejar suas campanhas de pr\xE9-venda com anteced\xEAncia!"
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
    const ai = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const modelsToTry = ["gemini-3.7-flash", "gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-2.5-flash", "gemini-3.1-pro-preview"];
    let lastMessage = "";
    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: "D\xEA uma dica curta, pr\xE1tica e motivadora para um dono de loja de iPhones, celulares e games. Varie muito os temas: vendas, estoque, marketing, atendimento ou mentalidade. Ocasionalmente, cite ou se inspire em grandes empreendedores de sucesso (ex: Steve Jobs, Jeff Bezos, Fl\xE1vio Augusto, etc). Responda em portugu\xEAs, seja direto e impactante. M\xE1ximo 180 caracteres."
        });
        if (response.text) {
          const cleanTip = response.text.trim().replace(/^["']|["']$/g, "");
          return res.json({ tip: cleanTip });
        }
      } catch (err) {
        lastMessage = err?.message || String(err);
      }
    }
    console.log("[Gemini Info] Providing high-quality curated fallback business tip.");
    return res.json({ tip: getRandomFallback() });
  } catch (error) {
    console.log("[Gemini Info] API exception caught, returning curated fallback tip.");
    res.json({ tip: getRandomFallback() });
  }
});
var readPublicSales = () => {
  try {
    if (!import_fs.default.existsSync(SALES_FILE)) return {};
    const content = import_fs.default.readFileSync(SALES_FILE, "utf8");
    return safeJsonParse(content, {});
  } catch (err) {
    console.error("Error reading public sales file:", err);
    return {};
  }
};
var writePublicSales = (data) => {
  try {
    atomicWriteFileSync(SALES_FILE, data);
  } catch (err) {
    console.error("Error writing public sales file:", err);
  }
};
app.post("/api/public-sales", (req, res) => {
  const { id, sale, client, product, warrantyMonths, warrantyStartDate, warrantyEndDate } = req.body;
  console.log(`[POST /api/public-sales] Received request for id: ${id}`);
  if (!id) {
    return res.status(400).json({ error: "ID da venda \xE9 obrigat\xF3rio" });
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
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  writePublicSales(sales);
  console.log(`[POST /api/public-sales] Successfully saved id: ${id}`);
  res.json({ success: true, message: "Contrato registrado no portal p\xFAblico com sucesso" });
});
async function fetchSaleData(id) {
  const sales = readPublicSales();
  let data = sales[id];
  if (data) {
    const sigInfo = data.signatureInfo || data.sale_data?.signatureInfo || {};
    data.signature_data = data.signature_data || data.sale?.signature_data || data.sale_data?.signature_data || sigInfo.signature_data;
    data.signed_at = data.signed_at || data.sale?.signed_at || data.sale_data?.signed_at || sigInfo.signed_at;
    data.signed_ip = data.signed_ip || data.sale?.signed_ip || data.sale_data?.signed_ip || sigInfo.signed_ip;
    data.client_name = data.client_name || data.client?.name || data.sale?.client_name || sigInfo.client_name;
  }
  try {
    const cloudDb = readCloudDb();
    if (cloudDb && Array.isArray(cloudDb.sales)) {
      const foundSale = cloudDb.sales.find((s) => s.id === id);
      if (foundSale) {
        const client = Array.isArray(cloudDb.clients) ? cloudDb.clients.find((c) => c.id === foundSale.client_id) : null;
        const iphone = Array.isArray(cloudDb.iphones) ? cloudDb.iphones.find((i) => i.id === foundSale.iphone_id) : null;
        const consoleItem = Array.isArray(cloudDb.consoles) ? cloudDb.consoles.find((c) => c.id === foundSale.console_id) : null;
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
    let supabaseUrl = process.env.VITE_SUPABASE_URL || "";
    if (supabaseUrl.endsWith("/rest/v1/")) {
      supabaseUrl = supabaseUrl.slice(0, -9);
    } else if (supabaseUrl.endsWith("/rest/v1")) {
      supabaseUrl = supabaseUrl.slice(0, -8);
    }
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
    if (supabaseUrl && supabaseAnonKey) {
      const response = await fetch(`${supabaseUrl}/rest/v1/public_sales?id=eq.${id}&select=*`, {
        headers: {
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`
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
async function injectMetaTags(template, url) {
  try {
    let assinaturaId = null;
    const matchAssinar = url.match(/\/assinar\/([^\/\?]+)/);
    if (matchAssinar) {
      assinaturaId = matchAssinar[1];
    } else if (url.includes("assinatura=")) {
      const urlObj = new URL(url, "http://localhost");
      assinaturaId = urlObj.searchParams.get("assinatura");
    }
    if (assinaturaId) {
      const saleData = await fetchSaleData(assinaturaId);
      if (saleData && saleData.client && saleData.client.name) {
        const clientName = saleData.client.name.trim();
        const productName = saleData.product?.model || "Aparelho";
        const metaTags = `
          <meta property="og:title" content="Nota de Garantia - ${clientName}" />
          <meta property="og:description" content="Acesse para assinar sua nota de garantia do ${productName}." />
          <meta property="og:image" content="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80" />
          <meta property="og:type" content="website" />
          <title>Nota de Garantia - ${clientName}</title>
        `;
        return template.replace("<title>GODSHOP</title>", metaTags);
      }
    }
  } catch (e) {
    console.error("Meta injection error:", e);
  }
  return template;
}
app.get("/api/public-sales/:id", async (req, res) => {
  const { id } = req.params;
  const data = await fetchSaleData(id);
  if (data) {
    return res.json(data);
  }
  return res.status(404).json({ error: "Documento de garantia n\xE3o localizado no portal de assinaturas." });
});
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
    return res.status(400).json({ error: "A assinatura em desenho \xE9 obrigat\xF3ria." });
  }
  const sales = readPublicSales();
  let data = sales[id];
  let supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  if (supabaseUrl.endsWith("/rest/v1/")) {
    supabaseUrl = supabaseUrl.slice(0, -9);
  } else if (supabaseUrl.endsWith("/rest/v1")) {
    supabaseUrl = supabaseUrl.slice(0, -8);
  }
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
  if (!data && supabaseUrl && supabaseAnonKey) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/public_sales?id=eq.${id}&select=*`, {
        headers: {
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`
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
    } catch (err) {
    }
  }
  if (!data) {
    return res.status(404).json({ error: "Documento de garantia n\xE3o localizado." });
  }
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "IP desconhecido";
  const cleanIp = ip.split(",")[0].trim();
  data.signature_data = signature_data;
  data.signed_at = (/* @__PURE__ */ new Date()).toISOString();
  data.signed_ip = cleanIp;
  data.client_name = client_name || data.client?.name || "Cliente";
  if (witness1_name !== void 0) data.witness1_name = witness1_name;
  if (witness1_cpf !== void 0) data.witness1_cpf = witness1_cpf;
  if (witness1_signature !== void 0) data.witness1_signature = witness1_signature;
  if (witness2_name !== void 0) data.witness2_name = witness2_name;
  if (witness2_cpf !== void 0) data.witness2_cpf = witness2_cpf;
  if (witness2_signature !== void 0) data.witness2_signature = witness2_signature;
  sales[id] = data;
  writePublicSales(sales);
  try {
    const cloudDb = readCloudDb();
    if (cloudDb && Array.isArray(cloudDb.sales)) {
      const saleIndex = cloudDb.sales.findIndex((s) => s.id === id);
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
  if (supabaseUrl && supabaseAnonKey) {
    try {
      await fetch(`${supabaseUrl}/rest/v1/public_sales?id=eq.${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`
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
      await fetch(`${supabaseUrl}/rest/v1/sales?id=eq.${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          signature_data: data.signature_data,
          signed_at: data.signed_at,
          signed_ip: data.signed_ip
        })
      });
    } catch (err) {
    }
  }
  res.json({
    success: true,
    message: "Documento assinado digitalmente com sucesso!",
    data
  });
});
app.post("/api/process-warranty", async (req, res) => {
  const { fileData, mimeType, textData } = req.body;
  if (!fileData && !textData) {
    return res.status(400).json({ error: "Dados ou arquivo s\xE3o obrigat\xF3rios" });
  }
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY n\xE3o configurada no servidor" });
  }
  try {
    const ai = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const promptText = `Analise este documento (nota fiscal, garantia ou texto) e extraia os seguintes dados em JSON puro:
    {
      "client_name": "Nome Completo",
      "client_phone": "Telefone",
      "client_cpf": "CPF",
      "client_email": "E-mail",
      "client_address": "Rua/N\xFAmero/Bairro",
      "client_city": "Cidade",
      "client_state": "UF",
      "product_model": "Modelo do Produto",
      "product_detail": "Detalhes (cor, mem\xF3ria, vers\xE3o)",
      "buy_price": null,
      "sell_price": null,
      "sale_date": "YYYY-MM-DD",
      "payment_method": "Pix/Cart\xE3o/Dinheiro",
      "installments": 1
    }
    Se n\xE3o encontrar algo, use null. Responda APENAS o JSON.`;
    const models = ["gemini-3.7-flash", "gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-2.5-flash", "gemini-3.1-pro-preview"];
    let lastErr = null;
    for (const modelName of models) {
      try {
        const contents = {
          parts: []
        };
        if (fileData) {
          contents.parts.push({ inlineData: { data: fileData, mimeType } });
        }
        if (textData) {
          contents.parts.push({ text: `Texto para an\xE1lise: ${textData}` });
        }
        contents.parts.push({ text: promptText });
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            responseMimeType: "application/json"
          }
        });
        if (response.text) {
          let text = response.text.trim();
          if (text.startsWith("```")) {
            text = text.replace(/^```json\s*/, "").replace(/```$/, "").trim();
          }
          const extracted = JSON.parse(text);
          return res.json(extracted);
        }
      } catch (err) {
        lastErr = err;
        console.warn(`[OCR Receipt] Model ${modelName} failed:`, err?.message || err);
        continue;
      }
    }
    throw lastErr || new Error("Falha ao processar comprovante com IA");
  } catch (error) {
    console.error("Gemini processing error:", error);
    const errMsg = String(error?.message || error || "");
    const isQuota = errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("exhausted");
    res.status(isQuota ? 429 : 500).json({
      error: isQuota ? "Limite de requisi\xE7\xF5es da IA atingido temporariamente. Aguarde alguns instantes e tente novamente, ou insira os dados manualmente." : `Erro ao processar com IA: ${errMsg}`
    });
  }
});
app.post("/api/process-price-table", async (req, res) => {
  const { fileData, mimeType } = req.body;
  if (!fileData) {
    return res.status(400).json({ error: "Arquivo de imagem ou PDF \xE9 obrigat\xF3rio" });
  }
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY n\xE3o configurada no servidor" });
  }
  try {
    const ai = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const systemInstruction = `Voc\xEA \xE9 um leitor e extrator especialista de tabelas e listas de pre\xE7os de eletr\xF4nicos (iPhones, celulares, consoles, games).
    Analise minuciosamente a imagem ou documento PDF enviado.
    Extraia TODOS os produtos e pre\xE7os listados na tabela ou imagem.
    
    COMO IDENTIFICAR E EXTRAIR PRE\xC7OS:
    - O pre\xE7o pode estar em formato num\xE9rico como "2950", "2.950", "2.950,00", "2950,00", "R$ 3.200", "3.2k", "$ 550", "US$ 600", "U$ 450", ou ao lado do modelo como "11 64GB - 1450" ou em colunas como "VALOR", "PRE\xC7O", "PIX", "\xC0 VISTA", "DINHEIRO", "VALOR PIX".
    - Se houver mais de uma coluna de pre\xE7o (ex: PIX vs CART\xC3O vs PRAZO), priorize o pre\xE7o \xC0 VISTA / PIX / DINHEIRO.
    - Se o pre\xE7o estiver em Reais (BRL), retorne no campo 'price' como n\xFAmero decimal positivo (ex: 2950.00).
    - Se o pre\xE7o for em D\xF3lar (USD / $ / U$), preencha 'price_usd' com o valor em d\xF3lar (ex: 550.00) E tamb\xE9m estime o 'price' em BRL (ex: 550 * 5.5 = 3025.00).
    - Se encontrar apenas o pre\xE7o em BRL, preencha 'price' e calcule 'price_usd' dividindo por 5.5.
    - NUNCA retorne o pre\xE7o como 0 se houver qualquer n\xFAmero ou indica\xE7\xE3o de valor associado ao aparelho.
    
    CAMPOS OBRIGAT\xD3RIOS PARA CADA ITEM:
    - category: 'iphone' (para celulares, smartphones, iPads, Apple Watch) ou 'console' (para PS5, PS4, Xbox, Nintendo Switch, etc.)
    - model: Nome do modelo (ex: "iPhone 15", "iPhone 13", "PlayStation 5", "Nintendo Switch")
    - version: Vers\xE3o ou subtipo se houver (ex: "Pro Max", "Plus", "Slim", "OLED", "Digital")
    - storage: Capacidade de armazenamento (ex: "128GB", "256GB", "64GB", "512GB", "1TB")
    - color: Cor se mencionada (ex: "Preto", "Tit\xE2nio Natural", "Branco", "Azul")
    - condition: "Novo Lacrado" (se mencionar lacrado, novo, cpo) ou "Seminovo Grade A" (se seminovo, usado, vitrine)
    - price: Pre\xE7o em Reais (BRL) como n\xFAmero positivo (ex: 2850.00).
    - price_usd: Pre\xE7o em D\xF3lar (USD) como n\xFAmero positivo se aplic\xE1vel (ex: 520.00).`;
    const contents = {
      parts: [
        { inlineData: { data: fileData, mimeType } },
        { text: "Analise esta imagem/PDF com muita aten\xE7\xE3o e extraia todos os itens e pre\xE7os da tabela, preenchendo todos os valores com precis\xE3o." }
      ]
    };
    const models = ["gemini-3.7-flash", "gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-2.5-flash", "gemini-3.1-pro-preview"];
    let lastErr = null;
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
          if (text.startsWith("```")) {
            text = text.replace(/^```json\s*/, "").replace(/```$/, "").trim();
          }
          const extracted = JSON.parse(text);
          if (extracted && Array.isArray(extracted.items)) {
            extracted.items = extracted.items.map((item) => {
              let priceNum = typeof item.price === "number" ? item.price : parseFloat(String(item.price || "").replace(/[^\d.,]/g, "").replace(",", "."));
              let priceUsdNum = typeof item.price_usd === "number" ? item.price_usd : parseFloat(String(item.price_usd || "").replace(/[^\d.,]/g, "").replace(",", "."));
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
                category: item.category === "console" ? "console" : "iphone",
                model: item.model || "Aparelho",
                version: item.version || "",
                storage: item.storage || "",
                color: item.color || "",
                condition: item.condition || "Seminovo Grade A",
                price: priceNum,
                price_usd: priceUsdNum
              };
            });
            return res.json(extracted);
          }
        }
      } catch (err) {
        lastErr = err;
        console.warn(`[Price Table IA] Model ${modelName} failed:`, err?.message || err);
        continue;
      }
    }
    throw lastErr || new Error("Falha ao analisar a tabela de pre\xE7os com IA");
  } catch (error) {
    console.error("Gemini Price Table processing error:", error);
    const errMsg = String(error?.message || error || "");
    const isQuota = errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("exhausted");
    res.status(isQuota ? 429 : 500).json({
      error: isQuota ? "Limite de requisi\xE7\xF5es da IA atingido temporariamente. Aguarde alguns instantes e tente novamente, ou insira os dados manualmente." : `Erro ao analisar com IA: ${errMsg}`
    });
  }
});
var readPublicClients = () => {
  try {
    if (!import_fs.default.existsSync(CLIENTS_FILE)) return {};
    const content = import_fs.default.readFileSync(CLIENTS_FILE, "utf8");
    return safeJsonParse(content, {});
  } catch (err) {
    console.error("Error reading public clients file:", err);
    return {};
  }
};
var writePublicClients = (data) => {
  try {
    atomicWriteFileSync(CLIENTS_FILE, data);
  } catch (err) {
    console.error("Error writing public clients file:", err);
  }
};
var readPublicTokens = () => {
  try {
    if (!import_fs.default.existsSync(TOKENS_FILE)) return {};
    const content = import_fs.default.readFileSync(TOKENS_FILE, "utf8");
    return safeJsonParse(content, {});
  } catch (err) {
    console.error("Error reading public tokens file:", err);
    return {};
  }
};
var writePublicTokens = (data) => {
  try {
    atomicWriteFileSync(TOKENS_FILE, data);
  } catch (err) {
    console.error("Error writing public tokens file:", err);
  }
};
app.get("/api/tokens/validate", async (req, res) => {
  const { token } = req.query;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ valid: false, error: "Token \xE9 obrigat\xF3rio" });
  }
  let supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  if (supabaseUrl.endsWith("/rest/v1/")) {
    supabaseUrl = supabaseUrl.slice(0, -9);
  } else if (supabaseUrl.endsWith("/rest/v1")) {
    supabaseUrl = supabaseUrl.slice(0, -8);
  }
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/public_tokens?token=eq.${token}&select=*`, {
        headers: {
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`
        }
      });
      if (response.ok) {
        const rows = await response.json();
        if (rows && rows.length > 0) {
          const tData = rows[0];
          if (tData.used) {
            return res.json({ valid: false, error: "Este link j\xE1 foi utilizado." });
          }
          if (tData.expires_at && new Date(tData.expires_at) < /* @__PURE__ */ new Date()) {
            return res.json({ valid: false, error: "Este link expirou." });
          }
          return res.json({ valid: true, userId: tData.user_id, expiresAt: tData.expires_at });
        }
      }
    } catch (err) {
      console.error("Supabase token validation error:", err);
    }
  }
  const tokens = readPublicTokens();
  const tokenData = tokens[token];
  if (!tokenData) {
    return res.json({ valid: false, error: "Este link \xE9 inv\xE1lido." });
  }
  if (tokenData.used) {
    return res.json({ valid: false, error: "Este link j\xE1 foi utilizado." });
  }
  if (tokenData.expiresAt && new Date(tokenData.expiresAt) < /* @__PURE__ */ new Date()) {
    return res.json({ valid: false, error: "Este link expirou." });
  }
  res.json({ valid: true, userId: tokenData.userId, expiresAt: tokenData.expiresAt });
});
app.post("/api/tokens/generate", async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "userId \xE9 obrigat\xF3rio" });
  }
  const tokens = readPublicTokens();
  const tokenUuid = `link-${Date.now()}-${Math.random().toString(36).substring(2, 11)}-${Math.random().toString(36).substring(2, 11)}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString();
  const newToken = {
    token: tokenUuid,
    userId,
    used: false,
    expiresAt,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  tokens[tokenUuid] = newToken;
  writePublicTokens(tokens);
  let supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  if (supabaseUrl.endsWith("/rest/v1/")) {
    supabaseUrl = supabaseUrl.slice(0, -9);
  } else if (supabaseUrl.endsWith("/rest/v1")) {
    supabaseUrl = supabaseUrl.slice(0, -8);
  }
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
  if (supabaseUrl && supabaseAnonKey) {
    try {
      await fetch(`${supabaseUrl}/rest/v1/public_tokens`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`
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
app.get("/api/clients/check-duplicate", async (req, res) => {
  res.json({ duplicateCpf: false, duplicatePhone: false, duplicateEmail: false });
});
app.post("/api/public-clients", async (req, res) => {
  const { userId, client, token } = req.body;
  if (!userId || !client || !client.name || !client.phone) {
    return res.status(400).json({ error: "ID do vendedor, nome e telefone s\xE3o obrigat\xF3rios" });
  }
  let supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  if (supabaseUrl.endsWith("/rest/v1/")) {
    supabaseUrl = supabaseUrl.slice(0, -9);
  } else if (supabaseUrl.endsWith("/rest/v1")) {
    supabaseUrl = supabaseUrl.slice(0, -8);
  }
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
  if (token) {
    let tokenUsedSuccess = false;
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const tokenCheckRes = await fetch(`${supabaseUrl}/rest/v1/public_tokens?token=eq.${token}&select=*`, {
          headers: {
            "apikey": supabaseAnonKey,
            "Authorization": `Bearer ${supabaseAnonKey}`
          }
        });
        if (tokenCheckRes.ok) {
          const rows = await tokenCheckRes.json();
          if (rows && rows.length > 0) {
            const tokenData2 = rows[0];
            if (tokenData2.used) {
              return res.status(400).json({ error: "Este link j\xE1 foi utilizado." });
            }
            if (tokenData2.expires_at && new Date(tokenData2.expires_at) < /* @__PURE__ */ new Date()) {
              return res.status(400).json({ error: "Este link expirou." });
            }
            const tokenUpdateRes = await fetch(`${supabaseUrl}/rest/v1/public_tokens?token=eq.${token}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                "apikey": supabaseAnonKey,
                "Authorization": `Bearer ${supabaseAnonKey}`
              },
              body: JSON.stringify({
                used: true,
                used_at: (/* @__PURE__ */ new Date()).toISOString()
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
    const tokens = readPublicTokens();
    const tokenData = tokens[token];
    if (tokenData) {
      tokens[token] = {
        ...tokenData,
        used: true,
        usedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      writePublicTokens(tokens);
    } else if (!tokenUsedSuccess && !supabaseUrl) {
      return res.status(400).json({ error: "Este link \xE9 inv\xE1lido ou j\xE1 foi utilizado." });
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
    token_expira_em: token ? new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString() : "",
    // token details
    // Hidden auto-saved audit info
    security_uuid: client.security_uuid || `sec-${Math.random().toString(36).substring(2, 15)}`,
    security_ip: client.security_ip || req.ip || req.headers["x-forwarded-for"] || "127.0.0.1",
    security_browser: client.security_browser || "Unknown Browser",
    security_os: client.security_os || "Unknown OS",
    security_device: client.security_device || "Unknown Device",
    security_user: userId,
    // responsible user ID
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  clients[userId].push(newClient);
  writePublicClients(clients);
  if (supabaseUrl && supabaseAnonKey) {
    try {
      await fetch(`${supabaseUrl}/rest/v1/public_clients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`
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
app.get("/api/public-clients", async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "userId \xE9 obrigat\xF3rio" });
  }
  let supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  if (supabaseUrl.endsWith("/rest/v1/")) {
    supabaseUrl = supabaseUrl.slice(0, -9);
  } else if (supabaseUrl.endsWith("/rest/v1")) {
    supabaseUrl = supabaseUrl.slice(0, -8);
  }
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/public_clients?user_id=eq.${userId}&select=*&order=created_at.desc`, {
        headers: {
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`
        }
      });
      if (response.ok) {
        const rows = await response.json();
        if (rows) {
          const mappedRows = rows.map((r) => ({
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
  const pending = clients[userId] || [];
  res.json(pending);
});
app.post("/api/public-clients/sync-done", async (req, res) => {
  const { userId, clientIds } = req.body;
  if (!userId || !clientIds || !Array.isArray(clientIds)) {
    return res.status(400).json({ error: "userId e lista de clientIds s\xE3o obrigat\xF3rios" });
  }
  const clients = readPublicClients();
  if (clients[userId]) {
    clients[userId] = clients[userId].filter((c) => !clientIds.includes(c.id));
    writePublicClients(clients);
  }
  let supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  if (supabaseUrl.endsWith("/rest/v1/")) {
    supabaseUrl = supabaseUrl.slice(0, -9);
  } else if (supabaseUrl.endsWith("/rest/v1")) {
    supabaseUrl = supabaseUrl.slice(0, -8);
  }
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
  if (supabaseUrl && supabaseAnonKey && clientIds.length > 0) {
    try {
      for (const cid of clientIds) {
        await fetch(`${supabaseUrl}/rest/v1/public_clients?id=eq.${cid}`, {
          method: "DELETE",
          headers: {
            "apikey": supabaseAnonKey,
            "Authorization": `Bearer ${supabaseAnonKey}`
          }
        });
      }
    } catch (err) {
      console.error("Supabase delete synced clients error:", err);
    }
  }
  res.json({ success: true });
});
app.get("/api/users", (req, res) => {
  const users = readPublicUsers();
  res.json(users);
});
app.post("/api/users", (req, res) => {
  const { name, email, phone, role, status } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "Nome e e-mail s\xE3o obrigat\xF3rios" });
  }
  const users = readPublicUsers();
  const exists = users.find((u) => u.email.trim().toLowerCase() === email.trim().toLowerCase());
  if (exists) {
    return res.status(400).json({ error: "Este e-mail j\xE1 est\xE1 cadastrado para outro usu\xE1rio." });
  }
  const newUser = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    name,
    email: email.trim().toLowerCase(),
    phone: phone || "",
    role: role || "Vendedor",
    status: status || "Ativo",
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  users.push(newUser);
  writePublicUsers(users);
  res.json({ success: true, user: newUser });
});
app.put("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const { name, email, phone, role, status } = req.body;
  const users = readPublicUsers();
  const userIdx = users.findIndex((u) => u.id === id);
  if (userIdx === -1) {
    return res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado." });
  }
  if (email) {
    const emailConflict = users.find((u) => u.id !== id && u.email.trim().toLowerCase() === email.trim().toLowerCase());
    if (emailConflict) {
      return res.status(400).json({ error: "Este e-mail j\xE1 est\xE1 em uso por outro usu\xE1rio." });
    }
  }
  const updatedUser = {
    ...users[userIdx],
    name: name || users[userIdx].name,
    email: email ? email.trim().toLowerCase() : users[userIdx].email,
    phone: phone !== void 0 ? phone : users[userIdx].phone,
    role: role || users[userIdx].role,
    status: status || users[userIdx].status,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  users[userIdx] = updatedUser;
  writePublicUsers(users);
  res.json({ success: true, user: updatedUser });
});
app.delete("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const users = readPublicUsers();
  const filtered = users.filter((u) => u.id !== id);
  if (filtered.length === users.length) {
    return res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado." });
  }
  writePublicUsers(filtered);
  res.json({ success: true });
});
var readPublicSettings = () => {
  try {
    if (!import_fs.default.existsSync(SETTINGS_FILE)) return {};
    const content = import_fs.default.readFileSync(SETTINGS_FILE, "utf8");
    return safeJsonParse(content, {});
  } catch (err) {
    console.error("Error reading public settings file:", err);
    return {};
  }
};
var writePublicSettings = (data) => {
  try {
    atomicWriteFileSync(SETTINGS_FILE, data);
  } catch (err) {
    console.error("Error writing public settings file:", err);
  }
};
app.get("/api/settings", (req, res) => {
  const { userId } = req.query;
  const settings = readPublicSettings();
  if (userId && settings[userId]) {
    return res.json(settings[userId]);
  }
  const keys = Object.keys(settings);
  if (keys.length > 0) {
    return res.json(settings[keys[0]]);
  }
  try {
    const cloudDb = readCloudDb();
    if (cloudDb && cloudDb.store_settings && Object.keys(cloudDb.store_settings).length > 0) {
      return res.json(cloudDb.store_settings);
    }
  } catch (err) {
  }
  res.json({
    app_logo: "/logo.png",
    app_background: "/background.jpg"
  });
});
app.post("/api/settings", (req, res) => {
  const { userId, settings: userSettings } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "userId \xE9 obrigat\xF3rio" });
  }
  const settings = readPublicSettings();
  settings[userId] = {
    ...settings[userId] || {},
    ...userSettings
  };
  writePublicSettings(settings);
  res.json({ success: true });
});
async function startServer() {
  console.log("NODE_ENV is:", process.env.NODE_ENV);
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true, hmr: false },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    let distPath = import_path.default.join(process.cwd(), "dist");
    if (!import_fs.default.existsSync(import_path.default.join(distPath, "index.html"))) {
      if (typeof __dirname !== "undefined" && import_fs.default.existsSync(import_path.default.join(__dirname, "index.html"))) {
        distPath = __dirname;
      } else if (import_fs.default.existsSync(import_path.default.join(process.cwd(), "index.html"))) {
        distPath = process.cwd();
      }
    }
    console.log(`[Production] Serving static files from: ${distPath}`);
    app.use(import_express.default.static(distPath));
    app.get("*", async (req, res) => {
      if (req.url.startsWith("/api/")) {
        return res.status(404).json({ error: "API route not found" });
      }
      const indexPath = import_path.default.join(distPath, "index.html");
      if (import_fs.default.existsSync(indexPath)) {
        let template = import_fs.default.readFileSync(indexPath, "utf-8");
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
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use. Another instance may be running.`);
      } else {
        console.error("Server error:", err);
      }
    });
  }
}
if (!process.env.VERCEL) {
  startServer();
}
var server_default = app;
//# sourceMappingURL=server.cjs.map
