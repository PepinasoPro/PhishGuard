import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AnalysisRecord {
  id: string;
  date: string;
  message: string;
  image: string | null;
  riskLevel: string;
  score: number;
}

interface MessageState {
  message: string;
  setMessage: (message: string) => void;
  image: string | null;
  setImage: (image: string | null) => void;
  history: AnalysisRecord[];
  addAnalysisToHistory: (record: AnalysisRecord) => void;
  clearHistory: () => void;
}

export const useStore = create<MessageState>()(
  persist(
    (set) => ({
      message: '',
      setMessage: (message) => set({ message }),
      image: null,
      setImage: (image) => set({ image }),
      history: [],
      addAnalysisToHistory: (record) =>
        set((state) => ({ history: [record, ...state.history] })),
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'phishguard-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);