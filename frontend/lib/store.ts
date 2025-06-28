import { create } from 'zustand';

interface AppState {
  // User state
  userRole: 'user' | 'admin' | 'backend' | null;
  setUserRole: (role: 'user' | 'admin' | 'backend' | null) => void;
  
  // UI state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  
  // Marketplace state
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  
  // Search state
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // User state
  userRole: null,
  setUserRole: (role) => set({ userRole: role }),
  
  // UI state
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  
  // Marketplace state
  selectedCategory: 'all',
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  
  // Search state
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
}));