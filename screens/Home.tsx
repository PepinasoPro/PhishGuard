import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useStore } from '../store';

export default function HomeScreen({ navigation }) {
  const { message, setMessage, image, setImage } = useStore();

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Se requiere permiso para acceder a la galería');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>PhishGuard</Text>
          <Text style={styles.subtitle}>Protección Inteligente contra Phishing</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            🛡️ <Text style={{fontWeight: 'bold', fontFamily: 'Montserrat-Bold'}}>Cómo funciona:</Text> Analizamos el contenido de mensajes, correos o SMS en busca de patrones de engaño, urgencia artificial y enlaces maliciosos.
          </Text>
        </View>

        <Text style={styles.label}>Analizador de Mensajes</Text>
        <TextInput
          style={styles.input}
          multiline
          numberOfLines={8}
          value={message}
          onChangeText={setMessage}
          placeholder="Pegue aquí el mensaje sospechoso... (Ej: 'Tu cuenta ha sido suspendida, haz clic aquí para reactivarla')"
          placeholderTextColor="#999"
        />

        <View style={styles.imageSection}>
          <Text style={styles.label}>Analizador de Capturas (Transferencias)</Text>
          <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
            {image ? (
              <Image source={{ uri: image }} style={styles.previewImage} />
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={styles.placeholderText}>📸 Subir Captura de Pantalla</Text>
              </View>
            )}
          </TouchableOpacity>
          {image && (
            <TouchableOpacity style={styles.removeImageButton} onPress={() => setImage(null)}>
              <Text style={styles.removeImageText}>Eliminar Imagen</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.button, (!message && !image) && styles.buttonDisabled]}
          onPress={() => navigation.navigate('AnalysisResult')}
          disabled={!message && !image}
        >
          <Text style={styles.buttonText}>Analizar Ahora</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => navigation.navigate('History')}
        >
          <Text style={styles.historyButtonText}>Ver Historial de Análisis</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    padding: 24,
    flexGrow: 1,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 36,
    fontFamily: 'Montserrat-Bold',
    color: '#F8FAFC',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 32,
    borderLeftWidth: 4,
    borderLeftColor: '#38BDF8',
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#CBD5E1',
    lineHeight: 20,
  },
  label: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#1E293B',
    color: '#F8FAFC',
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    marginBottom: 32,
    textAlignVertical: 'top',
    minHeight: 150,
  },
  imageSection: {
    marginBottom: 32,
  },
  imagePickerButton: {
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
    borderRadius: 16,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  placeholderImage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#94A3B8',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    marginTop: 8,
    alignItems: 'center',
  },
  removeImageText: {
    color: '#EF4444',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  button: {
    backgroundColor: '#38BDF8',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#475569',
    shadowOpacity: 0,
  },
  buttonText: {
    color: '#0F172A',
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    fontWeight: 'bold',
  },
  historyButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 16,
  },
  historyButtonText: {
    color: '#94A3B8',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
});
