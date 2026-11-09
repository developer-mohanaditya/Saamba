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
  
  // Audio state
  currentTime: number;
  isPlaying: boolean;
  duration: number;

  // AI Ask state
  chatMessages: ChatMessage[];
  isAsking: boolean;
  askScope: 'current' | 'all';
  askPanelOpen: boolean;

  // Actions
  setWorkspaces: (ws: Workspace[]) => void;
  setActiveWorkspaceId: (id: string) => void;
  setWorkspaceMeetings: (map: Record<string, string[]>) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  toggleLibrary: () => void;
  
  setMeetings: (meetings: Meeting[]) => void;
  setSelectedMeetingId: (id: string | null) => void;
  setCurrentMeeting: (m: Meeting | null) => void;
  setIsLoadingMeeting: (v: boolean) => void;
  
  setActiveTab: (tab: string) => void;
  setSearchQuery: (query: string) => void;
  
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setDuration: (duration: number) => void;

  setChatMessages: (msgs: ChatMessage[]) => void;
  addChatMessage: (msg: ChatMessage) => void;
  setIsAsking: (asking: boolean) => void;
  setAskScope: (scope: 'current' | 'all') => void;
  toggleAskPanel: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  workspaces: [
    { id: 'default', name: 'My meetings', icon: 'users', isDefault: true }
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

  currentTime: 0,
  isPlaying: false,
  duration: 0,

  chatMessages: [],
  isAsking: false,
  askScope: 'current',
  askPanelOpen: false,

  setWorkspaces: (workspaces) => set({ workspaces }),
  setActiveWorkspaceId: (activeWorkspaceId) => set({ activeWorkspaceId }),
  setWorkspaceMeetings: (workspaceMeetings) => set({ workspaceMeetings }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  toggleLibrary: () => set((s) => ({ libraryExpanded: !s.libraryExpanded })),

  setMeetings: (meetings) => set({ meetings }),
  setSelectedMeetingId: (selectedMeetingId) => set({ selectedMeetingId }),
  setCurrentMeeting: (currentMeeting) => set({ currentMeeting }),
  setIsLoadingMeeting: (isLoadingMeeting) => set({ isLoadingMeeting }),

  setActiveTab: (activeTab) => set({ activeTab }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setCurrentTime: (currentTime) => set({ currentTime }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setDuration: (duration) => set({ duration }),

  setChatMessages: (chatMessages) => set({ chatMessages }),
  addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  setIsAsking: (isAsking) => set({ isAsking }),
  setAskScope: (askScope) => set({ askScope }),
  toggleAskPanel: () => set((s) => ({ askPanelOpen: !s.askPanelOpen })),
}));
