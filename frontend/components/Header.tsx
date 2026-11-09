// frontend/components/Header.tsx - Exact Header component matching v1 markup & CSS

'use client';

import React from 'react';
import { useAppStore } from '../lib/store';

interface HeaderProps {
  onRecord: () => void;
  onImport: () => void;
}

export function Header({ onRecord, onImport }: HeaderProps) {
  const { workspaces, activeWorkspaceId } = useAppStore();
  const currentWs =
    workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  const eyebrowText =
    currentWs.id === 'default'
      ? 'Your workspace'
      : `Workspace · ${currentWs.name}`;

  return (
    <header>
      <div>
        <div className="eyebrow">{eyebrowText}</div>
        <h1>
          {currentWs.name}
          <span>.</span>
        </h1>
      </div>

      <div className="header-actions">
        <div id="meeting-prompt" className="meeting-prompt" hidden />
        <button className="primary" id="record-button" type="button" onClick={onRecord}>
          Record a meeting
        </button>
        <button
          className="secondary"
          id="import-button"
          type="button"
          onClick={onImport}
        >
          Import meeting
        </button>
        <details className="test-menu" id="test-menu">
          <summary aria-label="Workspace options" title="Workspace options">
            ⋮
          </summary>
          <div className="test-menu-content">
            <label className="sound-toggle-row" htmlFor="sound-alerts">
              <span className="sound-toggle-label">Sound alerts</span>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  id="sound-alerts"
                  className="toggle-checkbox"
                  defaultChecked
                />
                <span className="toggle-slider" />
              </div>
            </label>
          </div>
        </details>
      </div>
    </header>
  );
}
