// frontend/lib/store.ts - Global Zustand store for Saamba v2

import { create } from 'zustand';
import { Workspace, Meeting, ChatMessage } from './types';

interface AppState {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  workspaceMeetings: Record<string, string[]>;
  sidebarCollapsed: boolean;
  libraryExpanded: boolean;
  
  meetings: Meeting[];
  selectedMeetingId: string | null;
  currentMeeting: Meeting | null;
  isLoadingMeeting: boolean;
  
  activeTab: 'summary' | 'actions' | 'transcript' | string;
  searchQuery: string;
  
  // Translation state
  activeTranslation: {
    code: string;
    name: string;
    status: 'loading' | 'ready' | 'error';
    error?: string | null;
    data?: any;
  } | null;
  setActiveTranslation: (trans: {
    code: string;
    name: string;
    status: 'loading' | 'ready' | 'error';
    error?: string | null;
    data?: any;
  } | null) => void;

  // Media pane state
  mediaCollapsed: boolean;
  currentTime: number;
  isPlaying: boolean;
  duration: number;

  // AI Ask state
  chatMessages: ChatMessage[];
  isAsking: boolean;
  askScope: 'current' | 'all';
  askPanelOpen: boolean;

  // Auth state
  user: any | null;
  authModalOpen: boolean;
  setUser: (user: any | null) => void;
  setAuthModalOpen: (open: boolean) => void;

  // Settings & Sound alert state
  settingsModalOpen: boolean;
  settingsTab: 'general' | 'storage' | 'ai' | 'workspaces' | 'shortcuts';
  setSettingsModalOpen: (open: boolean, tab?: 'general' | 'storage' | 'ai' | 'workspaces' | 'shortcuts') => void;
  soundAlerts: boolean;
  setSoundAlerts: (enabled: boolean) => void;

  // Toast notification state
  toastMessage: string | null;
  setToastMessage: (msg: string | null) => void;

  // Actions
  setWorkspaces: (ws: Workspace[]) => void;
  setActiveWorkspaceId: (id: string) => void;
  setWorkspaceMeetings: (map: Record<string, string[]>) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  toggleLibrary: () => void;
  setLibraryExpanded: (v: boolean) => void;
  
  setMeetings: (meetings: Meeting[]) => void;
  setSelectedMeetingId: (id: string | null) => void;
  setCurrentMeeting: (m: Meeting | null) => void;
  setIsLoadingMeeting: (v: boolean) => void;
  
  setActiveTab: (tab: string) => void;
  setSearchQuery: (query: string) => void;
  
  toggleMediaCollapsed: () => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setDuration: (duration: number) => void;

  setChatMessages: (msgs: ChatMessage[]) => void;
  addChatMessage: (msg: ChatMessage) => void;
  setIsAsking: (asking: boolean) => void;
  setAskScope: (scope: 'current' | 'all') => void;
  toggleAskPanel: () => void;
  setAskPanelOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  workspaces: [
    { id: 'default', name: 'My meetings', icon: 'users', isDefault: true },
  ],
  activeWorkspaceId: 'default',
  workspaceMeetings: {},
  sidebarCollapsed: false,
  libraryExpanded: true,

  meetings: [],
  selectedMeetingId: null,
  currentMeeting: null,
  isLoadingMeeting: false,

  activeTab: 'summary',
  searchQuery: '',
  activeTranslation: null,
  setActiveTranslation: (activeTranslation) => set({ activeTranslation }),

  mediaCollapsed: false,
  currentTime: 0,
  isPlaying: false,
  duration: 0,

  chatMessages: [],
  isAsking: false,
  askScope: 'current',
  askPanelOpen: true,

  user: null,
  authModalOpen: false,
  setUser: (user) => set({ user }),
  setAuthModalOpen: (authModalOpen) => set({ authModalOpen }),

  settingsModalOpen: false,
  settingsTab: 'general',
  setSettingsModalOpen: (open, tab) =>
    set((state) => ({
      settingsModalOpen: open,
      settingsTab: tab || (open ? state.settingsTab : 'general'),
    })),
  soundAlerts: typeof window !== 'undefined' ? (localStorage.getItem('saamba-sound-alerts') !== 'false') : true,
  setSoundAlerts: (soundAlerts) => {
    try { localStorage.setItem('saamba-sound-alerts', String(soundAlerts)); } catch (_) {}
    set({ soundAlerts });
  },

  toastMessage: null,
  setToastMessage: (toastMessage) => set({ toastMessage }),

  setWorkspaces: (workspaces) => set({ workspaces }),
  setActiveWorkspaceId: (activeWorkspaceId) =>
    set({ activeWorkspaceId, libraryExpanded: true }),
  setWorkspaceMeetings: (workspaceMeetings) => set({ workspaceMeetings }),
  toggleSidebar: () =>
    set((state) => {
      const next = !state.sidebarCollapsed;
      try { localStorage.setItem('saamba-sidebar-collapsed', String(next)); } catch (_) {}
      return { sidebarCollapsed: next };
    }),
  setSidebarCollapsed: (sidebarCollapsed) => {
    try { localStorage.setItem('saamba-sidebar-collapsed', String(sidebarCollapsed)); } catch (_) {}
    set({ sidebarCollapsed });
  },
  toggleLibrary: () =>
    set((state) => {
      const next = !state.libraryExpanded;
      try { localStorage.setItem('saamba-library-expanded', String(next)); } catch (_) {}
      return { libraryExpanded: next };
    }),
  setLibraryExpanded: (libraryExpanded) => {
    try { localStorage.setItem('saamba-library-expanded', String(libraryExpanded)); } catch (_) {}
    set({ libraryExpanded });
  },

  setMeetings: (meetings) => set({ meetings }),
  setSelectedMeetingId: (selectedMeetingId) => set({ selectedMeetingId }),
  setCurrentMeeting: (currentMeeting) => set({ currentMeeting }),
  setIsLoadingMeeting: (isLoadingMeeting) => set({ isLoadingMeeting }),

  setActiveTab: (activeTab) => set({ activeTab }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  toggleMediaCollapsed: () =>
    set((state) => {
      const next = !state.mediaCollapsed;
      try { localStorage.setItem('saamba-media-collapsed', String(next)); } catch (_) {}
      return { mediaCollapsed: next };
    }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setDuration: (duration) => set({ duration }),

  setChatMessages: (chatMessages) => set({ chatMessages }),
  addChatMessage: (msg) =>
    set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
  setIsAsking: (isAsking) => set({ isAsking }),
  setAskScope: (askScope) => set({ askScope }),
  toggleAskPanel: () => set((state) => ({ askPanelOpen: !state.askPanelOpen })),
  setAskPanelOpen: (askPanelOpen) => set({ askPanelOpen }),
}));
