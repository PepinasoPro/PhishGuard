import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useStore } from '../store';
import { analyzeMessage } from '../utils/analyzer';
import { generateId, formatCurrentDate } from '../utils/helpers';

export default function AnalysisResultScreen({ navigation, route }) {
  const { message, image, addAnalysisToHistory } = useStore();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    async function runAnalysis() {
      // Check if we are viewing a record from history
      const historyRecord = route.params?.record;

      if (historyRecord) {
        setResult({
          score: historyRecord.score,
          riskLevel: historyRecord.riskLevel,
          urgency: 'N/A', // Simplified for history view
          url: 'N/A',
          credentials: 'N/A',
          findings: [],
          justification: 'Consulta de historial',
          imageAnalysis: { isFake: false, findings: [] }
        });
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await analyzeMessage(message, image);
        setResult(res);

        // Save to history
        addAnalysisToHistory({
          id: generateId(),
          date: formatCurrentDate(),
          message: message,
          image: image,
          riskLevel: res.riskLevel,
          score: res.score,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    runAnalysis();
  }, [message, image, route.params]);

  const getRiskColor = (level) => {
    switch (level) {
      case 'Crítico': return '#EF4444'; // Red
      case 'Medio': return '#F59E0B';   // Amber
      default: return '#10B981';        // Green
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Analizando con IA...</Text>
      </View>
    );
  }

  if (!result) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error al analizar los datos.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Diagnóstico</Text>
        <View style={[styles.riskBadge, { backgroundColor: getRiskColor(result.riskLevel) }]}>
          <Text style={styles.riskText}>{result.riskLevel.toUpperCase()}</Text>
        </View>
      </View>

      {image && (
        <View style={styles.imagePreviewBox}>
          <Text style={styles.messageLabel}>Imagen Analizada:</Text>
          <Image source={{ uri: image }} style={styles.previewImage} />
        </View>
      )}

      <View style={styles.messageBox}>
        <Text style={styles.messageLabel}>Mensaje Analizado:</Text>
        <Text style={styles.messageText}>"{message || 'Sin texto para analizar'}"</Text>
      </View>

      <View style={styles.resultsGrid}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Urgencia Artificial</Text>
          <Text style={[styles.cardValue, { color: result.urgency === 'Baja' ? '#10B981' : '#EF4444' }]}>
            {result.urgency}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>URL Sospechosa</Text>
          <Text style={[styles.cardValue, { color: result.url === 'No detectada' ? '#10B981' : '#EF4444' }]}>
            {result.url}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Credenciales</Text>
          <Text style={[styles.cardValue, { color: result.credentials === 'No' ? '#10B981' : '#EF4444' }]}>
            {result.credentials}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Puntaje de Riesgo</Text>
          <Text style={[styles.cardValue, { color: '#F8FAFC' }]}>
            {result.score}/100
          </Text>
        </View>
      </View>

      {result.findings && result.findings.length > 0 && (
        <View style={styles.analysisDetailsBox}>
          <Text style={styles.adviceTitle}>🔍 Evidencias Detectadas</Text>
          {result.findings.map((finding, i) => (
            <View key={i} style={styles.findingRow}>
              <Text style={styles.findingCategory}>{finding.category}:</Text>
              <Text style={styles.findingEvidence}>"{finding.evidence}"</Text>
            </View>
          ))}
        </View>
      )}

      {result.imageAnalysis && (
        <View style={styles.imageAnalysisBox}>
          <Text style={styles.adviceTitle}>🔍 Análisis de Imagen (Transferencia)</Text>
          {result.imageAnalysis.findings.map((finding, i) => (
            <Text key={i} style={styles.findingText}>• {finding}</Text>
          ))}
          <Text style={[styles.imageVerdict, { color: result.imageAnalysis.isFake ? '#EF4444' : '#10B981' }]}>
            Veredicto: {result.imageAnalysis.isFake ? 'Probablemente Falsa' : 'Parece Legítima'}
          </Text>
        </View>
      )}

      {result.justification && (
        <View style={styles.justificationBox}>
          <Text style={styles.adviceTitle}>📑 Justificación Forense</Text>
          <Text style={styles.justificationText}>{result.justification}</Text>
        </View>
      )}

      <View style={styles.adviceBox}>
        <Text style={styles.adviceTitle}>💡 Recomendación de Seguridad</Text>
        <Text style={styles.adviceText}>
          {result.riskLevel === 'Crítico'
            ? '⚠️ ALERTA: Este contenido tiene fuertes indicadores de fraude. NO interactúes, no hagas transferencias ni proporciones datos personales.'
            : result.riskLevel === 'Medio'
            ? '🧐 PRECAUCIÓN: Hay algunos elementos sospechosos. Verifica el remitente y la autenticidad antes de interactuar.'
            : '✅ SEGURO: No se detectaron patrones comunes de phishing, pero siempre mantente alerta.'}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>Volver al Inicio</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  centered: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#CBD5E1',
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  header: {
    padding: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Montserrat-Bold',
    color: '#F8FAFC',
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  riskText: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: 'Montserrat-Bold',
    fontWeight: '800',
  },
  imagePreviewBox: {
    backgroundColor: '#1E293B',
    margin: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginTop: 12,
    resizeMode: 'contain',
  },
  messageBox: {
    backgroundColor: '#1E293B',
    margin: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  messageLabel: {
    color: '#94A3B8',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
  },
  messageText: {
    color: '#CBD5E1',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    fontStyle: 'italic',
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#1E293B',
    width: '48%',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardLabel: {
    color: '#94A3B8',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardValue: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    fontWeight: 'bold',
  },
  imageAnalysisBox: {
    backgroundColor: '#1E293B',
    margin: 24,
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  adviceBox: {
    backgroundColor: '#1E293B',
    margin: 24,
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#38BDF8',
  },
  justificationBox: {
    backgroundColor: '#1E293B',
    margin: 24,
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  justificationText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
    textAlign: 'justify',
  },
  analysisDetailsBox: {
    backgroundColor: '#1E293B',
    margin: 24,
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  findingRow: {
    flexDirection: 'row',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  findingCategory: {
    color: '#94A3B8',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    fontWeight: '600',
    marginRight: 4,
  },
  findingEvidence: {
    color: '#CBD5E1',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    fontStyle: 'italic',
  },
  adviceTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  findingText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
    lineHeight: 20,
  },
  imageVerdict: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
    fontWeight: 'bold',
  },
  adviceText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: '#334155',
    margin: 24,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
    fontWeight: '600',
  },
});
