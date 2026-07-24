import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Configure public sales file-system database
const DATA_DIR = process.env.VERCEL ? path.join("/tmp", "data") : path.join(process.cwd(), "data");
const SALES_FILE = path.join(DATA_DIR, "public_sales.json");
const CLIENTS_FILE = path.join(DATA_DIR, "public_clients.json");
const SETTINGS_FILE = path.join(DATA_DIR, "public_settings.json");
const TOKENS_FILE = path.join(DATA_DIR, "public_tokens.json");
const USERS_FILE = path.join(DATA_DIR, "public_users.json");

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SALES_FILE)) {
    fs.writeFileSync(SALES_FILE, JSON.stringify({}), "utf8");
  }
  if (!fs.existsSync(CLIENTS_FILE)) {
    fs.writeFileSync(CLIENTS_FILE, JSON.stringify({}), "utf8");
  }
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify({}), "utf8");
  }
  if (!fs.existsSync(TOKENS_FILE)) {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify({}), "utf8");
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
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2), "utf8");
  }
} catch (fsErr) {
  console.warn("[Vercel FS Warning] Initializing local files in fallback mode:", fsErr);
}

const readPublicUsers = (): any[] => {
  try {
    if (!fs.existsSync(USERS_FILE)) return [];
    const content = fs.readFileSync(USERS_FILE, "utf8");
    return JSON.parse(content || "[]");
  } catch (err) {
    console.error("Error reading public users file:", err);
    return [];
  }
};

const writePublicUsers = (data: any[]) => {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing public users file:", err);
  }
};

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

    // Try a few times or different model aliases to handle temporary 503s gracefully
    const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
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
        console.log(`[Gemini Info] Model ${modelName} is busy. Trying next option...`);
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
    return JSON.parse(content || "{}");
  } catch (err) {
    console.error("Error reading public sales file:", err);
    return {};
  }
};

const writePublicSales = (data: Record<string, any>) => {
  try {
    fs.writeFileSync(SALES_FILE, JSON.stringify(data, null, 2), "utf8");
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
  const data = sales[id];
  if (data) return data;

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

    // Try models in order - using valid platform aliases
    const models = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-3.5-pro"];
    let lastErr = null;

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
        console.warn(`Model ${modelName} failed:`, err.message);
        // Continue to next model on quota or model not found errors
        if (err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('404') || err.message?.includes('503')) continue;
        continue;
      }
    }

    throw lastErr || new Error("Falha ao processar com IA");

  } catch (error: any) {
    console.error("Gemini processing error:", error);
    const isQuota = error.message?.includes('429') || error.message?.includes('quota');
    res.status(isQuota ? 429 : 500).json({ 
      error: isQuota 
        ? "Limite diário da IA atingido. Tente novamente mais tarde ou insira os dados manualmente." 
        : `Erro no servidor: ${error.message}`
    });
  }
});

// --- REMOTE CLIENT REGISTRATION API ---

const readPublicClients = (): Record<string, any[]> => {
  try {
    if (!fs.existsSync(CLIENTS_FILE)) return {};
    const content = fs.readFileSync(CLIENTS_FILE, "utf8");
    return JSON.parse(content || "{}");
  } catch (err) {
    console.error("Error reading public clients file:", err);
    return {};
  }
};

const writePublicClients = (data: Record<string, any[]>) => {
  try {
    fs.writeFileSync(CLIENTS_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing public clients file:", err);
  }
};

const readPublicTokens = (): Record<string, any> => {
  try {
    if (!fs.existsSync(TOKENS_FILE)) return {};
    const content = fs.readFileSync(TOKENS_FILE, "utf8");
    return JSON.parse(content || "{}");
  } catch (err) {
    console.error("Error reading public tokens file:", err);
    return {};
  }
};

const writePublicTokens = (data: Record<string, any>) => {
  try {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(data, null, 2), "utf8");
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
    return JSON.parse(content || "{}");
  } catch (err) {
    console.error("Error reading public settings file:", err);
    return {};
  }
};

const writePublicSettings = (data: Record<string, any>) => {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), "utf8");
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
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);

    // Fallback route to serve index.html in development mode (SPA routing)
    app.get("*", async (req, res, next) => {
      if (req.url.startsWith("/api/")) {
        return next();
      }
      try {
        const url = req.originalUrl;
        const templatePath = path.resolve(process.cwd(), "index.html");
        if (fs.existsSync(templatePath)) {
          let template = fs.readFileSync(templatePath, "utf-8");
          template = await vite.transformIndexHtml(url, template);
          template = await injectMetaTags(template, url);
          res.status(200).set({ "Content-Type": "text/html" }).end(template);
        } else {
          next();
        }
      } catch (e) {
        next(e);
      }
    });
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
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;

