import Tesseract from 'tesseract.js';
import { ScamDetectionResponse } from '../types/scamDetection.js';

interface TextAnalysisResult {
  score: number;
  patterns: string[];
  justification: string;
}

/**
 * Filtra y extrae cadenas legibles en ASCII desde un búfer binario.
 * Actúa como método forense secundario (estilo comando strings) si el OCR no está disponible.
 */
function extractAsciiStrings(buffer: Buffer): string {
  let result = '';
  let currentString = '';
  for (let i = 0; i < buffer.length; i++) {
    const char = buffer[i];
    // Rango de caracteres ASCII legibles (espacio a tilde)
    if (char >= 32 && char <= 126) {
      currentString += String.fromCharCode(char);
    } else {
      if (currentString.length >= 5) {
        // Filtrar ruido aleatorio: debe contener al menos una letra o número
        if (/[a-zA-Z0-9]/.test(currentString)) {
          result += currentString + ' ';
        }
      }
      currentString = '';
    }
  }
  if (currentString.length >= 5 && /[a-zA-Z0-9]/.test(currentString)) {
    result += currentString;
  }
  return result;
}

/**
 * Analiza el texto aplicando heurísticas y expresiones regulares locales.
 */
function analyzeTextScamInternal(text: string): TextAnalysisResult {
  const patterns: string[] = [];
  let score = 0.0;

  if (!text || text.trim().length === 0) {
    return {
      score: 0.0,
      patterns: [],
      justification: 'El texto analizado está vacío.'
    };
  }

  const lowercaseText = text.toLowerCase();

  // 1. GATILLOS DE URGENCIA (Ingeniería Social)
  const urgencyKeywords = [
    'urgente', 'inmediatamente', 'inmediato', 'cuenta suspendida', 'accion requerida', 'acción requerida',
    'bloqueo', 'bloqueada', 'suspension', 'suspensión', 'evitar el bloqueo', 'iniciar sesion', 'iniciar sesión',
    'verificar', 'actualizar', 'actualiza', 'actualice', 'soporte tecnico', 'soporte técnico', 'soporte',
    'seguridad bancaria', 'verificacion obligatoria', 'verificación obligatoria', 'acceso suspendido',
    'tarjeta bloqueada', 'pago rechazado', 'alerta de seguridad', 'multa', 'recargo', 'embargo', 'deuda',
    'ultimo aviso', 'último aviso', 'plazo de 24 horas', '24 horas', 'evitar cargos', 'ahora mismo',
    'actualiza ya', 'urgencia', 'suspendida', 'suspendido', 'rechazada', 'rechazado', 'pago', 'bloqueado'
  ];

  const matchedUrgency = urgencyKeywords.filter(keyword => lowercaseText.includes(keyword));
  if (matchedUrgency.length > 0) {
    // Cada coincidencia suma, máximo 0.50
    score += Math.min(0.50, matchedUrgency.length * 0.20);
    patterns.push(`[URGENCY] Se detectaron términos de urgencia o coacción: ${Array.from(new Set(matchedUrgency)).slice(0, 3).map(k => `"${k}"`).join(', ')}`);
  }

  // 2. SOLICITUD DE CREDENCIALES / DATOS SENSIBLES
  const sensitiveKeywords = [
    'contraseña', 'password', 'clave', 'cbu', 'tarjeta', 'cvv', 'codigo', 'código', 'pin', 'token',
    'identificacion', 'identificación', 'dni', 'cedula', 'cédula', 'numero de cuenta', 'número de cuenta',
    'coordenadas', 'firma digital', 'usuario', 'datos de pago'
  ];

  const matchedSensitive = sensitiveKeywords.filter(keyword => lowercaseText.includes(keyword));
  if (matchedSensitive.length > 0) {
    score += Math.min(0.40, matchedSensitive.length * 0.15);
    patterns.push(`[CREDENTIALS] Solicitud de información financiera o credenciales: ${Array.from(new Set(matchedSensitive)).slice(0, 3).map(k => `"${k}"`).join(', ')}`);
  }

  // 3. SUPLANTACIÓN DE MARCAS POPULARES (Impersonation)
  const brands = [
    'paypal', 'netflix', 'amazon', 'visa', 'mastercard', 'santander', 'bbva', 'banamex', 'correos',
    'dhl', 'fedex', 'bancolombia', 'apple', 'microsoft', 'google', 'facebook', 'instagram', 'whatsapp',
    'mercado libre', 'mercadolibre'
  ];

  const matchedBrands = brands.filter(brand => lowercaseText.includes(brand));
  if (matchedBrands.length > 0) {
    if (matchedUrgency.length > 0 || matchedSensitive.length > 0) {
      score += 0.35;
      patterns.push(`[IMPERSONATION] Uso de marca conocida (${matchedBrands.join(', ')}) en un contexto de urgencia o solicitud de datos.`);
    } else {
      score += 0.10;
      patterns.push(`[IMPERSONATION] Mención de marca conocida: ${matchedBrands.join(', ')}`);
    }
  }

  // 4. ANÁLISIS DE ENLACES (URLs)
  // Coincide con URLs con o sin protocolo (ej: https://site.com o site.com/login o netflix-update-portal.cc)
  const urlRegex = /(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?/gi;
  const rawUrls = text.match(urlRegex) || [];

  // Filtrar falsos positivos comunes de palabras separadas por puntos (como "e.g.", "ej.", etc.) y TLDs inválidos
  const commonExclusions = ['e.g.', 'ej.', 'a.m.', 'p.m.', 'c.c.', 'd.n.i.'];
  const urls = rawUrls.filter(u => {
    const lowerU = u.toLowerCase();
    // Debe tener una longitud razonable y no estar en exclusiones
    if (commonExclusions.some(exc => lowerU === exc || lowerU.startsWith(exc))) return false;
    // Excluir si termina en un punto final que era parte de la oración y no del TLD
    return u.length > 3 && u.includes('.');
  });

  // Escaneo de IPs
  const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/gi;
  const ips = text.match(ipRegex) || [];

  if (urls.length > 0 || ips.length > 0) {
    patterns.push(`[URL] Se detectaron enlaces web o direcciones IP en el contenido.`);
    score += 0.15; // Tener un enlace suma sospecha

    // Procesar direcciones IP directas
    for (const ip of ips) {
      score += 0.50;
      patterns.push(`[URL] Dirección IP directa detectada en el enlace: "${ip}"`);
    }

    // Procesar URLs
    for (let url of urls) {
      // Limpiar puntos finales del match de oraciones (ej: "portal.cc." -> "portal.cc")
      if (url.endsWith('.')) {
        url = url.slice(0, -1);
      }
      const lowercaseUrl = url.toLowerCase();

      // Enlace acortado
      const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'cutt.ly', 'is.gd', 'buff.ly', 'ow.ly', 'short.io', 'rebrand.ly'];
      const hasShortener = shorteners.some(s => lowercaseUrl.includes(s));
      if (hasShortener) {
        score += 0.25;
        patterns.push(`[URL] Enlace acortado detectado: "${url}"`);
      }

      // Dominios con TLDs de bajo costo/sospechosos
      const suspiciousTlds = ['.xyz', '.ru', '.cc', '.zip', '.tk', '.ml', '.ga', '.cf', '.gq', '.club', '.info', '.top', '.work', '.date', '.support', '.secure'];
      const domainMatch = lowercaseUrl.match(/^(?:https?:\/\/)?([^/?#:\s]+)/);
      if (domainMatch) {
        const domain = domainMatch[1];
        const hasSuspiciousTld = suspiciousTlds.some(tld => domain.endsWith(tld) || domain.includes(tld + '.'));
        if (hasSuspiciousTld) {
          score += 0.35;
          patterns.push(`[URL] Enlace con dominio TLD de alto riesgo o bajo costo: "${domain}"`);
        }

        // Typosquatting o secuestro de marca (ej: netflix-update-portal.cc)
        const matchedBrandInUrl = brands.find(brand => domain.includes(brand));
        if (matchedBrandInUrl) {
          const suspiciousSubstrings = ['update', 'login', 'security', 'secure', 'verificar', 'soporte', 'cuenta', 'banco', 'signin', 'srv', 'portal', '-'];
          const isSuspiciousDomain = suspiciousSubstrings.some(sub => domain.includes(sub));
          if (isSuspiciousDomain) {
            score += 0.40;
            patterns.push(`[URL] Posible suplantación de marca en enlace: "${domain}" parece imitar a "${matchedBrandInUrl}"`);
          }
        }
      }
    }
  }

  // Generar justificación
  let justification = '';
  if (score >= 0.75) {
    justification = `CRÍTICO: Análisis forense local detectó múltiples indicadores de phishing de alta confianza (${Math.round(score * 100)}%). `;
    justification += `Se identificaron patrones de ingeniería social (urgencia y solicitudes de credenciales), además de enlaces sospechosos que intentan suplantar marcas o usar dominios no seguros.`;
  } else if (score >= 0.40) {
    justification = `SOSPECHOSO: Se encontraron patrones sospechosos consistentes con phishing de nivel medio (${Math.round(score * 100)}%). `;
    justification += `El mensaje contiene palabras de urgencia y enlaces web que requieren verificación manual. Se aconseja no ingresar credenciales ni datos bancarios.`;
  } else {
    justification = `SEGURO: No se encontraron patrones claros de fraude en el análisis de texto local (${Math.round(score * 100)}%). `;
    justification += `Aunque no se identificaron palabras clave de estafa o URLs sospechosas, manténgase alerta ante cualquier mensaje no solicitado.`;
  }

  return {
    score: Math.min(1.0, score),
    patterns,
    justification
  };
}

/**
 * Analiza texto sospechoso de scam en Modo Demo.
 */
export const analyzeTextScam = async (text: string): Promise<ScamDetectionResponse> => {
  console.log('[Demo Mode] Analizando texto localmente...');
  const result = analyzeTextScamInternal(text);
  return {
    isScam: result.score >= 0.40,
    confidenceScore: result.score,
    detectedPatterns: result.patterns,
    justification: `[Modo Demo] ${result.justification}`
  };
};

/**
 * Analiza imágenes sospechosas en Modo Demo usando OCR local (tesseract.js) y heurísticas de respaldo.
 */
export const analyzeImageScam = async (imageBuffer: Buffer, mimeType: string): Promise<ScamDetectionResponse> => {
  console.log('[Demo Mode] Analizando imagen localmente...');
  let text = '';
  const detectedPatterns: string[] = [];
  let justification = '[Modo Demo] Análisis local de imagen.\n';
  let isOcrSuccessful = false;

  try {
    // Intentar realizar OCR local utilizando Tesseract
    const ocrResult = await Tesseract.recognize(imageBuffer, 'spa+eng');
    text = ocrResult.data.text;
    isOcrSuccessful = true;
    console.log(`[Demo Mode OCR] Texto extraído (${text.length} caracteres).`);
  } catch (error: any) {
    console.warn(`[Demo Mode OCR] Falló el OCR local (${error.message}). Usando fallback secundario de buffer...`);
    text = extractAsciiStrings(imageBuffer);
    console.log(`[Demo Mode Fallback] Cadenas de caracteres extraídas (${text.length} caracteres).`);
  }

  // Evaluar el texto extraído
  const textAnalysis = analyzeTextScamInternal(text);

  // Registrar estado de OCR en los patrones visuales
  if (isOcrSuccessful) {
    detectedPatterns.push(`[VISUAL] Texto extraído de la imagen mediante OCR local.`);
  } else {
    detectedPatterns.push(`[VISUAL] OCR local no disponible. Se aplicó escaneo de cadenas ASCII binarias como contingencia.`);
  }

  // Incorporar los hallazgos de texto sobre el OCR
  if (text.trim().length > 0) {
    textAnalysis.patterns.forEach(p => {
      // Ajustar la etiqueta para que se clasifique como visual para el frontend
      if (p.startsWith('[URGENCY]')) {
        detectedPatterns.push(`[URGENCY] Se detectó urgencia escrita en la imagen: ${p.replace('[URGENCY]', '').trim()}`);
      } else if (p.startsWith('[URL]')) {
        detectedPatterns.push(`[URL] Enlace sospechoso detectado dentro de la imagen: ${p.replace('[URL]', '').trim()}`);
      } else if (p.startsWith('[CREDENTIALS]')) {
        detectedPatterns.push(`[CREDENTIALS] Solicitud de datos escrita en la imagen: ${p.replace('[CREDENTIALS]', '').trim()}`);
      } else if (p.startsWith('[IMPERSONATION]')) {
        detectedPatterns.push(`[IMPERSONATION] Marca o remitente falso detectado en la imagen: ${p.replace('[IMPERSONATION]', '').trim()}`);
      } else {
        detectedPatterns.push(`[VISUAL] Patrón sospechoso en la imagen: ${p}`);
      }
    });
  }

  let finalScore = textAnalysis.score;

  // Modificador por marcas famosas sospechosas en la imagen (común en capturas de pantalla de soporte de bancos)
  if (detectedPatterns.some(p => p.includes('[IMPERSONATION]') || p.toLowerCase().includes('logo'))) {
    finalScore = Math.max(finalScore, 0.65);
    detectedPatterns.push('[VISUAL] Se identificó posible uso no autorizado de logotipo corporativo oficial.');
  }

  if (text.trim().length === 0) {
    justification += 'No se detectó texto legible ni URLs dentro de la imagen mediante los análisis locales (OCR o binario).';
  } else {
    justification += `Texto legible detectado en la imagen:\n"${text.substring(0, 150).replace(/\n/g, ' ')}${text.length > 150 ? '...' : ''}"\n\n`;
    justification += textAnalysis.justification;
  }

  return {
    isScam: finalScore >= 0.40,
    confidenceScore: finalScore,
    detectedPatterns,
    justification
  };
};

/**
 * Analiza un caso combinado de texto e imagen en Modo Demo.
 */
export const analyzeCombinedScam = async (text: string, imageBuffer: Buffer | null, mimeType?: string): Promise<ScamDetectionResponse> => {
  console.log('[Demo Mode] Analizando caso combinado localmente...');
  const textAnalysis = analyzeTextScamInternal(text);
  
  let imageAnalysis: ScamDetectionResponse | null = null;
  if (imageBuffer && mimeType) {
    imageAnalysis = await analyzeImageScam(imageBuffer, mimeType);
  }

  const detectedPatterns: string[] = [...textAnalysis.patterns];
  let finalScore = textAnalysis.score;
  let justification = `[Modo Demo] Análisis Combinado Local.\n\nTEXTO: ${textAnalysis.justification}\n\n`;

  if (imageAnalysis) {
    // Combinar patrones de imagen
    imageAnalysis.detectedPatterns.forEach(p => {
      if (!detectedPatterns.includes(p)) {
        detectedPatterns.push(p);
      }
    });

    // Subir el nivel de riesgo si ambas partes contienen factores sospechosos
    if (textAnalysis.score >= 0.40 && imageAnalysis.confidenceScore >= 0.40) {
      finalScore = Math.max(finalScore, Math.min(1.0, textAnalysis.score + 0.20));
      detectedPatterns.push('[VISUAL] Coincidencia cruzada de sospechas tanto en el texto como en el análisis visual.');
    } else {
      finalScore = Math.max(finalScore, imageAnalysis.confidenceScore);
    }

    justification += `IMAGEN: ${imageAnalysis.justification}`;
  } else {
    justification += 'No se proporcionó ninguna imagen para el análisis complementario.';
  }

  return {
    isScam: finalScore >= 0.40,
    confidenceScore: finalScore,
    detectedPatterns,
    justification
  };
};
