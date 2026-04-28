import React, { useState } from 'react';

export default function Lobby({ onAction }) {
  const [name,     setName]     = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [mode,     setMode]     = useState(null); // null | 'create' | 'join'

  const handle = (action, extra = {}) => {
    if (!name.trim()) return;
    onAction(action, { playerName: name.trim(), ...extra });
  };

  return (
    <div className="lobby">
      <div className="lobby-inner">

        {/* ── Logo + Title ──────────────────────────────────────── */}
        <div className="lobby-logo">
          <h1 className="lobby-title">Catan</h1>
          <p className="lobby-sub">Online Multiplayer</p>
        </div>

        {/* ── Name input (always visible) ───────────────────────── */}
        <input
          className="lobby-input"
          type="text"
          placeholder="Your name"
          value={name}
          maxLength={20}
          autoFocus
          onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && name.trim()) {
              if (mode === 'create') handle('create_game');
              if (mode === 'join' && joinCode.trim()) handle('join_game', { roomCode: joinCode });
            }
          }}
        />

        {/* ── Action area ───────────────────────────────────────── */}
        {!mode && (
          <div className="lobby-actions">
            <button className="lobby-btn primary"
              onClick={() => setMode('create')}
              disabled={!name.trim()}>
              Create Game
            </button>
            <button className="lobby-btn secondary"
              onClick={() => setMode('join')}
              disabled={!name.trim()}>
              Join Game
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="lobby-actions">
            <button className="lobby-btn primary"
              onClick={() => handle('create_game')}
              disabled={!name.trim()}>
              Create Room
            </button>
            <button className="lobby-btn ghost" onClick={() => setMode(null)}>
              Back
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div className="lobby-actions">
            <input
              className="lobby-input code-input"
              type="text"
              placeholder="Room code"
              value={joinCode}
              maxLength={4}
              autoFocus
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => {
                if (e.key === 'Enter' && name.trim() && joinCode.trim())
                  handle('join_game', { roomCode: joinCode });
              }}
            />
            <button className="lobby-btn primary"
              onClick={() => handle('join_game', { roomCode: joinCode })}
              disabled={!name.trim() || !joinCode.trim()}>
              Join Room
            </button>
            <button className="lobby-btn ghost" onClick={() => setMode(null)}>
              Back
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
