import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { useStore } from '../store';

export default function HistoryScreen({ navigation }) {
  const { history, clearHistory } = useStore();

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        navigation.navigate('AnalysisResult', { record: item });
      }}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.dateText}>{item.date}</Text>
        <View style={[styles.badge, { backgroundColor: item.riskLevel === 'Crítico' ? '#EF4444' : item.riskLevel === 'Medio' ? '#F59E0B' : '#10B981' }]}>
          <Text style={styles.badgeText}>{item.riskLevel}</Text>
        </View>
      </View>
      <Text numberOfLines={2} style={styles.messagePreview}>
        {item.message || (item.image ? 'Análisis de imagen' : 'Sin contenido')}
      </Text>
      <Text style={styles.scoreText}>Puntaje: {item.score}/100</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Historial de Análisis</Text>
        <TouchableOpacity style={styles.clearButton} onPress={clearHistory}>
          <Text style={styles.clearButtonText}>Limpiar</Text>
        </TouchableOpacity>
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay análisis guardados.</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Montserrat-Bold',
    color: '#F8FAFC',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  clearButtonText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  listContent: {
    padding: 24,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: 'Montserrat-Bold',
    fontWeight: 'bold',
  },
  messagePreview: {
    color: '#CBD5E1',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  scoreText: {
    color: '#38BDF8',
    fontSize: 12,
    fontFamily: 'Montserrat-Bold',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
});
