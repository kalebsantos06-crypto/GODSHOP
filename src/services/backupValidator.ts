import { BackupData } from './backupService';

export interface BackupValidationSummary {
  version: number;
  timestamp?: string;
  clients: number;
  sales: number;
  iphones: number;
  consoles: number;
  suppliers: number;
  prices: number;
  notes: number;
  totalRecords: number;
  hasStoreSettings: boolean;
  hasCustomPayments: boolean;
  tableCounts: Record<string, number>;
}

export interface BackupValidationResult {
  isValid: boolean;
  error?: string;
  errorDetails?: string;
  warnings: string[];
  summary?: BackupValidationSummary;
  normalizedData?: BackupData;
}

const KNOWN_TABLES = [
  'suppliers', 'clients', 'iphones', 'consoles', 'prices', 'sales',
  'purchases', 'products', 'product_units', 'fiscal_documents', 'fiscal_configs',
  'gifts', 'gift_purchases', 'gift_dispatches', 'accessory_sales', 'product_photos',
  'notes', 'note_checklist_items', 'note_audio'
];

/**
 * Pre-cleans raw backup input text before parsing:
 * - Strips UTF-8 BOM
 * - Extracts JSON between first '{' and last '}'
 * - Normalizes curly/smart quotes
 * - Handles code fence blocks
 */
export function sanitizeRawJsonText(rawText: string): { cleaned: string; wasModified: boolean; extractionNote?: string } {
  let text = rawText.trim();
  let wasModified = false;
  let extractionNote: string | undefined;

  // 1. Remove UTF-8 BOM
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1).trim();
    wasModified = true;
  }

  // 2. Remove markdown code fences like ```json ... ```
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    wasModified = true;
  }

  // 3. Detect conversational or descriptive prefixes (e.g. "Código de Backup GODSHOP: { ... }")
  const firstBrace = text.indexOf('{');
  
  if (firstBrace !== -1) {
    if (firstBrace > 0) {
      const prefix = text.substring(0, firstBrace).trim();
      if (prefix.length > 0) {
        extractionNote = `Texto introdutório ("${prefix.slice(0, 40)}...") ignorado com sucesso.`;
      }
      text = text.substring(firstBrace);
      wasModified = true;
    }
    const lastBrace = text.lastIndexOf('}');
    if (lastBrace !== -1 && lastBrace < text.length - 1) {
      text = text.substring(0, lastBrace + 1);
      wasModified = true;
    }
  }

  return { cleaned: text, wasModified, extractionNote };
}

/**
 * Attempts multiple heuristic repairs on damaged or truncated JSON:
 * - Replaces smart curly quotes with standard double quotes
 * - Strips trailing commas before } or ]
 * - Removes illegal control characters
 * - Attempts closing truncated braces/brackets
 */
export function tryRepairDamagedJson(rawText: string): { data: any; warnings: string[] } {
  const warnings: string[] = [];
  let current = rawText;

  // Step 1: Replace smart curly quotes
  const withQuotes = current
    .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'");

  if (withQuotes !== current) {
    warnings.push('Aspas curvas ("smart quotes") foram convertidas para aspas padrão.');
    current = withQuotes;
  }

  // Step 2: Clean unescaped control chars (keep \t, \n, \r)
  const withoutCtrl = current.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
  if (withoutCtrl !== current) {
    warnings.push('Caracteres de controle inválidos foram removidos.');
    current = withoutCtrl;
  }

  // Try direct parse after quote/control cleanup
  try {
    const parsed = JSON.parse(current);
    return { data: parsed, warnings };
  } catch (err1) {
    // Continue to trailing comma removal
  }

  // Step 3: Remove trailing commas before } and ]
  const withoutTrailingCommas = current
    .replace(/,\s*([\]}])/g, '$1')
    .replace(/,\s*$/g, '');

  try {
    const parsed = JSON.parse(withoutTrailingCommas);
    warnings.push('Vírgulas sobressalentes no final de listas foram corrigidas.');
    return { data: parsed, warnings };
  } catch (err2) {
    // Continue to truncation auto-recovery
  }

  // Step 4: Detect and attempt repair of truncated JSON (common in WhatsApp or clipboard limits)
  let truncatedAttempt = withoutTrailingCommas.trim();
  
  // If ends with unclosed string (odd number of unescaped quotes), close it
  let inString = false;
  let isEscaped = false;
  for (let i = 0; i < truncatedAttempt.length; i++) {
    const char = truncatedAttempt[i];
    if (char === '\\' && !isEscaped) {
      isEscaped = true;
    } else {
      if (char === '"' && !isEscaped) {
        inString = !inString;
      }
      isEscaped = false;
    }
  }

  if (inString) {
    truncatedAttempt += '"';
    warnings.push('Cadeia de texto cortada no final foi fechada automaticamente.');
  }

  // Count braces and brackets
  let openBraces = 0;
  let closeBraces = 0;
  let openBrackets = 0;
  let closeBrackets = 0;
  inString = false;
  isEscaped = false;

  for (let i = 0; i < truncatedAttempt.length; i++) {
    const char = truncatedAttempt[i];
    if (char === '\\' && !isEscaped) {
      isEscaped = true;
    } else {
      if (char === '"' && !isEscaped) {
        inString = !inString;
      } else if (!inString) {
        if (char === '{') openBraces++;
        else if (char === '}') closeBraces++;
        else if (char === '[') openBrackets++;
        else if (char === ']') closeBrackets++;
      }
      isEscaped = false;
    }
  }

  if (openBrackets > closeBrackets || openBraces > closeBraces) {
    // Clean any trailing comma before closing
    truncatedAttempt = truncatedAttempt.replace(/,\s*$/, '');
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      truncatedAttempt += ']';
    }
    for (let i = 0; i < openBraces - closeBraces; i++) {
      truncatedAttempt += '}';
    }
    try {
      const parsed = JSON.parse(truncatedAttempt);
      warnings.push('O código estava truncado/cortado no final e a estrutura foi recuperada automaticamente.');
      return { data: parsed, warnings };
    } catch (err3) {
      // Continue to next fallback
    }
  }

  // Step 5: Fallback to JS object expression evaluation if safe
  try {
    const evalFn = new Function('return ' + withoutTrailingCommas);
    const parsed = evalFn();
    if (parsed && typeof parsed === 'object') {
      warnings.push('Código interpretado com sucesso através do analisador tolerante de objetos.');
      return { data: parsed, warnings };
    }
  } catch (e) {
    // Final failure
  }

  throw new Error('Não foi possível reparar a sintaxe do JSON danificado.');
}

/**
 * Validates the parsed backup object against GODSHOP current and legacy structures.
 * Normalizes it into standard BackupData format.
 */
export function validateBackupIntegrity(rawParsed: any, extraWarnings: string[] = []): BackupValidationResult {
  const warnings = [...extraWarnings];

  if (!rawParsed || typeof rawParsed !== 'object') {
    return {
      isValid: false,
      error: 'Formato inválido: O conteúdo não é um objeto JSON válido.',
      errorDetails: 'O arquivo precisa conter um objeto com os dados das tabelas.',
      warnings
    };
  }

  // Identify container structure
  let rootData: any = null;
  let version = 2;
  let timestamp = new Date().toISOString();

  if (rawParsed.data && typeof rawParsed.data === 'object' && !Array.isArray(rawParsed.data)) {
    // Current standard GODSHOP export format: { version, timestamp, data: { ... } }
    rootData = rawParsed.data;
    version = typeof rawParsed.version === 'number' ? rawParsed.version : 2;
    if (typeof rawParsed.timestamp === 'string') {
      timestamp = rawParsed.timestamp;
    }
  } else {
    // Direct or legacy format: tables are directly on the root object
    const hasKnownTable = KNOWN_TABLES.some(table => Array.isArray(rawParsed[table]));
    if (hasKnownTable) {
      rootData = rawParsed;
      warnings.push('Backup em formato direto identificado. Estrutura convertida para o padrão GODSHOP v2.');
    }
  }

  if (!rootData) {
    return {
      isValid: false,
      error: 'Estrutura não reconhecida do GODSHOP.',
      errorDetails: 'O arquivo não contém a propriedade "data" nem nenhuma tabela conhecida do sistema (como clientes, vendas, iphones ou fornecedores).',
      warnings
    };
  }

  // Verify and count table entities
  const tableCounts: Record<string, number> = {};
  let totalRecords = 0;
  const normalizedTablesData: Record<string, any[]> = {};

  for (const table of KNOWN_TABLES) {
    const list = rootData[table];
    if (Array.isArray(list)) {
      // Validate that items are objects
      const validItems = list.filter(item => item && typeof item === 'object');
      if (validItems.length < list.length) {
        warnings.push(`Tabela "${table}": ${list.length - validItems.length} registros corrompidos foram ignorados.`);
      }
      normalizedTablesData[table] = validItems;
      tableCounts[table] = validItems.length;
      totalRecords += validItems.length;
    } else if (list !== undefined && list !== null) {
      warnings.push(`Campo "${table}" não era uma lista válida e foi redefinido como lista vazia.`);
      normalizedTablesData[table] = [];
      tableCounts[table] = 0;
    } else {
      normalizedTablesData[table] = [];
      tableCounts[table] = 0;
    }
  }

  // Check store settings & custom payments
  const custom_payments = (rootData.custom_payments && typeof rootData.custom_payments === 'object')
    ? rootData.custom_payments
    : {};
  const store_settings = (rootData.store_settings && typeof rootData.store_settings === 'object')
    ? rootData.store_settings
    : {};

  if (totalRecords === 0 && Object.keys(store_settings).length === 0) {
    return {
      isValid: false,
      error: 'Backup vazio ou sem registros.',
      errorDetails: 'O arquivo tem a estrutura correta, mas todas as tabelas (clientes, vendas, estoque, fornecedores) estão vazias.',
      warnings
    };
  }

  const normalizedBackup: BackupData = {
    version,
    timestamp,
    data: {
      ...normalizedTablesData,
      custom_payments,
      store_settings
    }
  };

  const summary: BackupValidationSummary = {
    version,
    timestamp,
    clients: tableCounts['clients'] || 0,
    sales: tableCounts['sales'] || 0,
    iphones: tableCounts['iphones'] || 0,
    consoles: tableCounts['consoles'] || 0,
    suppliers: tableCounts['suppliers'] || 0,
    prices: tableCounts['prices'] || 0,
    notes: tableCounts['notes'] || 0,
    totalRecords,
    hasStoreSettings: Object.keys(store_settings).length > 0,
    hasCustomPayments: Object.keys(custom_payments).length > 0,
    tableCounts
  };

  return {
    isValid: true,
    warnings,
    summary,
    normalizedData: normalizedBackup
  };
}

/**
 * High-level function that takes any string (file content or pasted text) or object,
 * parses it safely with sanitization and heuristics, validates integrity,
 * and provides human-readable alerts if corrupted.
 */
export function validateAndParseBackup(input: string | object): BackupValidationResult {
  if (typeof input === 'object' && input !== null) {
    return validateBackupIntegrity(input);
  }

  if (typeof input !== 'string' || !input.trim()) {
    return {
      isValid: false,
      error: 'Nenhum dado fornecido.',
      errorDetails: 'O texto do código de backup ou arquivo está completamente vazio.',
      warnings: []
    };
  }

  // 1. Sanitize text
  const { cleaned, extractionNote } = sanitizeRawJsonText(input);
  const initialWarnings: string[] = [];
  if (extractionNote) {
    initialWarnings.push(extractionNote);
  }

  // 2. Try clean JSON.parse
  let parsedObject: any = null;
  try {
    parsedObject = JSON.parse(cleaned);
  } catch (firstErr: any) {
    // 3. Attempt repair
    try {
      const repaired = tryRepairDamagedJson(cleaned);
      parsedObject = repaired.data;
      initialWarnings.push(...repaired.warnings);
    } catch (repairErr: any) {
      // Pinpoint syntax error location and explain clearly
      const errMsg = firstErr?.message || 'Erro de sintaxe JSON';
      let friendlyDiagnosis = 'O arquivo contém erros de formatação no código JSON.';

      if (errMsg.includes('Unexpected token')) {
        friendlyDiagnosis = `Caractere inesperado encontrado. Se você copiou o backup junto com texto introdutório (ex: "Código de Backup..."), certifique-se de colar apenas o código a partir da chave inicial "{" até a final "}."`;
      } else if (errMsg.includes('Unterminated string') || errMsg.includes('Expected double-quoted property name') || errMsg.includes('Unexpected end of JSON input')) {
        friendlyDiagnosis = 'O código de backup está incompleto ou foi truncado (cortado antes do final). Mensagens longas copiadas via WhatsApp ou certas áreas de transferência de celular costumam cortar o final do texto. Experimente exportar e transferir o arquivo .JSON diretamente.';
      }

      return {
        isValid: false,
        error: 'Código de backup inválido ou corrompido.',
        errorDetails: `${friendlyDiagnosis}\nDetalhe técnico: ${errMsg}`,
        warnings: initialWarnings
      };
    }
  }

  // 4. Validate integrity of parsed object
  return validateBackupIntegrity(parsedObject, initialWarnings);
}
