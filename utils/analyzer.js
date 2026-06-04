const API_URL = 'http://192.168.1.90:3000/detect'; // Asegúrate que la IP sea la correcta

const mapBackendToFrontend = (backendData) => {
  const { isScam, confidenceScore, detectedPatterns, justification } = backendData;

  const score = Math.round(confidenceScore * 100);
  let riskLevel = 'Bajo';
  if (score >= 75) riskLevel = 'Crítico';
  else if (score >= 40) riskLevel = 'Medio';

  const findings = detectedPatterns.map(p => {
    const match = p.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (match) {
      return { category: match[1], evidence: match[2] };
    }
    return { category: 'General', evidence: p };
  });

  const hasUrgency = detectedPatterns.some(p => p.includes('[URGENCY]') || p.toLowerCase().includes('urgente'));
  const hasUrl = detectedPatterns.some(p => p.includes('[URL]') || p.toLowerCase().includes('http'));
  const hasCreds = detectedPatterns.some(p => p.includes('[CREDENTIALS]') || p.toLowerCase().includes('contraseña'));

  return {
    score,
    riskLevel,
    urgency: hasUrgency ? (score > 80 ? 'Muy Alta' : 'Alta') : 'Baja',
    url: hasUrl ? 'Detectada' : 'No detectada',
    credentials: hasCreds ? 'Sí' : 'No',
    findings: findings,
    justification: justification,
    imageAnalysis: {
      isFake: isScam,
      findings: detectedPatterns.filter(p => p.toLowerCase().includes('visual') || p.toLowerCase().includes('logo'))
    }
  };
};

export const analyzeMessage = async (text, imageUri = null) => {
  try {
    const formData = new FormData();

    if (text) {
      formData.append('text', text);
    }

    if (imageUri) {
      // FORMA CORRECTA PARA EXPO/REACT NATIVE:
      // No usamos fetch/blob, enviamos el objeto con uri, name y type.
      formData.append('image', {
        uri: imageUri,
        name: 'photo.jpg',
        type: 'image/jpeg',
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // Aumentamos a 20s por si la IA tarda

    const result = await fetch(API_URL, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!result.ok) {
      throw new Error(`Server responded with ${result.status}`);
    }

    const data = await result.json();
    return mapBackendToFrontend(data);

  } catch (error) {
    console.error('AI Analysis API Error:', error);
    return {
      score: 0,
      riskLevel: 'Error',
      urgency: 'N/A',
      url: 'N/A',
      credentials: 'N/A',
      findings: [{ category: 'Error', evidence: 'El servicio de análisis no está disponible actualmente.' }],
      justification: 'No se pudo conectar con el servidor de IA. Verifique la conexión y el servidor.'
    };
  }
};