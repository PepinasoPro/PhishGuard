import OpenAI from 'openai';
import { ENV } from '../config/environment.js';
import { ScamDetectionResponse } from '../types/scamDetection.js';
import * as demoModeService from './demoModeService.js';

// Inicializar el cliente OpenAI compatible con la API de xAI (Grok)
let openai: OpenAI | null = null;

if (ENV.GROK_API_KEY && ENV.GROK_API_KEY !== 'xai-your-api-key-here') {
  openai = new OpenAI({
    apiKey: ENV.GROK_API_KEY,
    baseURL: ENV.GROK_API_URL,
  });
  console.log('✅ Grok API client initialized successfully.');
} else {
  console.warn('⚠️  Grok API key not provided or placeholder used. Running in local Demo Mode only.');
}

const SYSTEM_INSTRUCTION = `
  ACTÚA COMO UN INVESTIGADOR FORENSE DE CIBERCRIMEN DE ÉLITE.
  Tu especialidad es el análisis de ingeniería social, phishing y fraudes financieros digitales.
  Tu enfoque es de "ZERO TRUST" (CONFIANZA CERO). No asumas que un contenido es legítimo solo porque parece oficial.

  METODOLOGÍA DE ANÁLISIS:
  1. CAPA VISUAL (Si hay imagen): Busca logos ligeramente distorsionados, fuentes inconsistentes, calidad de imagen baja en áreas clave o elementos que parezcan "pegados" (montajes en comprobantes de pago).
  2. CAPA SEMÁNTICA: Analiza la psicología del mensaje. Busca "Gatillos de Urgencia" (ej. "Inmediatamente", "Cuenta suspendida"), amenazas veladas o promesas irreales de dinero.
  3. CAPA TÉCNICA: Examina URLs, correos electrónicos o números de teléfono. Detecta dominios sospechosos (ej. .net en lugar de .com, caracteres extraños, URLs acortadas).
  4. CAPA DE COHERENCIA: Evalúa si el canal de comunicación es adecuado para la acción solicitada (ej. un banco pidiendo claves por WhatsApp es un fraude automático).
`;

const JSON_FORMAT_PROMPT = `
  Devuelve el resultado estrictamente en este formato JSON:
  {
    "isScam": boolean,
    "confidenceScore": float (0.0 a 1.0, donde 1.0 es certeza absoluta de fraude),
    "detectedPatterns": ["Categoría: Detalle detectado", "Ej: [URGENCY] Uso de palabras como 'ahora mismo'"],
    "justification": "Análisis técnico detallado explicando el POR QUÉ de la decisión, citando elementos específicos."
  }
`;

/**
 * Analiza un texto utilizando la API de Grok con fallback a Modo Demo.
 */
export const analyzeTextScam = async (text: string): Promise<ScamDetectionResponse> => {
  if (!openai) {
    console.warn('[Grok Service] API client not active. Falling back to local Demo Mode for text analysis.');
    return demoModeService.analyzeTextScam(text);
  }

  try {
    const response = await openai.chat.completions.create({
      model: ENV.GROK_MODEL,
      messages: [
        { role: 'system', content: `${SYSTEM_INSTRUCTION}\n\n${JSON_FORMAT_PROMPT}` },
        {
          role: 'user',
          content: `Analiza el siguiente texto aplicando la metodología forense de cibercrimen:\n\nTEXTO:\n"${text}"`
        }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Received empty content from Grok API response');
    }

    return JSON.parse(content) as ScamDetectionResponse;
  } catch (error: any) {
    console.error('[Grok Service] Error calling Grok Text API:', error.message || error);
    console.warn('[Grok Service] Falling back to local Demo Mode for text analysis...');
    return demoModeService.analyzeTextScam(text);
  }
};

/**
 * Analiza una imagen utilizando la API de Grok con fallback a Modo Demo.
 */
export const analyzeImageScam = async (imageBuffer: Buffer, mimeType: string): Promise<ScamDetectionResponse> => {
  if (!openai) {
    console.warn('[Grok Service] API client not active. Falling back to local Demo Mode for image analysis.');
    return demoModeService.analyzeImageScam(imageBuffer, mimeType);
  }

  try {
    const base64Image = imageBuffer.toString('base64');
    const response = await openai.chat.completions.create({
      model: ENV.GROK_VISION_MODEL,
      messages: [
        { role: 'system', content: `${SYSTEM_INSTRUCTION}\n\n${JSON_FORMAT_PROMPT}` },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analiza la imagen adjunta aplicando la metodología forense.' },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ] as any
        }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Received empty content from Grok Vision API response');
    }

    return JSON.parse(content) as ScamDetectionResponse;
  } catch (error: any) {
    console.error('[Grok Service] Error calling Grok Vision API:', error.message || error);
    console.warn('[Grok Service] Falling back to local Demo Mode for image analysis...');
    return demoModeService.analyzeImageScam(imageBuffer, mimeType);
  }
};

/**
 * Analiza un caso combinado de texto e imagen utilizando la API de Grok con fallback a Modo Demo.
 */
export const analyzeCombinedScam = async (text: string, imageBuffer: Buffer | null, mimeType?: string): Promise<ScamDetectionResponse> => {
  if (!openai) {
    console.warn('[Grok Service] API client not active. Falling back to local Demo Mode for combined analysis.');
    return demoModeService.analyzeCombinedScam(text, imageBuffer, mimeType);
  }

  try {
    const messagesContent: any[] = [
      {
        type: 'text',
        text: `Analiza este caso de seguridad combinando texto e imagen aplicando la metodología forense.\n\nTEXTO PROPORCIONADO:\n"${text}"`
      }
    ];

    if (imageBuffer && mimeType) {
      const base64Image = imageBuffer.toString('base64');
      messagesContent.push({
        type: 'image_url',
        image_url: {
          url: `data:${mimeType};base64,${base64Image}`
        }
      });
    }

    const response = await openai.chat.completions.create({
      model: imageBuffer ? ENV.GROK_VISION_MODEL : ENV.GROK_MODEL,
      messages: [
        { role: 'system', content: `${SYSTEM_INSTRUCTION}\n\n${JSON_FORMAT_PROMPT}` },
        {
          role: 'user',
          content: messagesContent
        }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Received empty content from Grok Combined API response');
    }

    return JSON.parse(content) as ScamDetectionResponse;
  } catch (error: any) {
    console.error('[Grok Service] Error calling Grok Combined API:', error.message || error);
    console.warn('[Grok Service] Falling back to local Demo Mode for combined analysis...');
    return demoModeService.analyzeCombinedScam(text, imageBuffer, mimeType);
  }
};
