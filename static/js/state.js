// static/js/state.js - Shared application state

export const state = {
  selected: null,
  current: null,
  lastVersion: null,
  editing: false,
  chats: {},
  downloads: new Set(),
  downloadProgress: {}, // mid -> string
  activeTranslationByMeeting: {}, // mid -> { code, name, status: 'loading'|'ready'|'error', error: null, data: null }
  dismissedTranslationByMeeting: {}, // mid -> boolean
  translationsCache: {}, // `${mid}:${code}` -> data
  mediaCollapsed: false,
  sidebarCollapsed: false,
  libraryExpanded: true,
  workspaces: [
    { id: 'default', name: 'My meetings', icon: 'briefcase', isDefault: true }
  ],
  activeWorkspaceId: 'default',
  workspaceMeetings: {},
  allMeetingsCache: [],
  pendingRewriteAction: null,
  pendingStopAction: null,
  activeEventSource: null,
  titleManuallyEdited: false
};
