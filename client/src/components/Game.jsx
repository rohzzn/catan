import React, { useState, useCallback, useEffect } from 'react';
import Board from './Board.jsx';
import PlayerHUD from './PlayerHUD.jsx';
import ActionPanel from './ActionPanel.jsx';

const PLAYER_COLORS = {
  red:    '#b83030',
  blue:   '#2a58b0',
  white:  '#c8c0b0',
  orange: '#c06010',
};

export default function Game({ gameState, playerId, roomCode, onAction, onStart, emit, chatLog = [] }) {
  const [buildMode, setBuildMode] = useState(null);
  const [gameLog, setGameLog] = useState([]);
  const [chatMsg, setChatMsg] = useState('');
  const [logExpanded, setLogExpanded] = useState(false);

  const myIndex = gameState?.players.findIndex(p => p.id === playerId) ?? -1;

  // Sync log
  useEffect(() => {
    if (gameState?.log) {
      setGameLog(gameState.log.slice(-80));
    }
  }, [gameState?.log]);

  // Reset build mode on turn change
  useEffect(() => {
    if (gameState?.currentPlayer !== myIndex) setBuildMode(null);
  }, [gameState?.currentPlayer, myIndex]);

  const handleVertexClick = useCallback((vertexId) => {
    const phase = gameState?.phase;
    if (phase === 'setup1' || phase === 'setup2') {
      onAction('place_settlement', { vertexId });
    } else if (phase === 'playing') {
      if (buildMode === 'settlement') {
        onAction('build_settlement', { vertexId });
        setBuildMode(null);
      } else if (buildMode === 'city') {
        onAction('build_city', { vertexId });
        setBuildMode(null);
      }
    }
  }, [gameState?.phase, buildMode, onAction]);

  const handleEdgeClick = useCallback((edgeId) => {
    const phase = gameState?.phase;
    if (phase === 'setup1' || phase === 'setup2') {
      onAction('place_road', { edgeId });
    } else if (phase === 'playing' && (buildMode === 'road' || (gameState?.freeRoads || 0) > 0)) {
      onAction('build_road', { edgeId });
      if ((gameState?.freeRoads || 0) <= 1) setBuildMode(null);
    }
  }, [gameState?.phase, buildMode, gameState?.freeRoads, onAction]);

  const handleTileClick = useCallback((tileId) => {
    if (gameState?.mustMoveRobber && gameState?.currentPlayer === myIndex) {
      // Prompt target selection
      const tile = gameState.board.tiles.find(t => t.id === tileId);
      const verticesOnTile = tile?.vertexIds || [];
      const playersOnTile = [];
      for (const vid of verticesOnTile) {
        const v = gameState.board.vertices[vid];
        if (v?.owner !== null && v?.owner !== myIndex && !playersOnTile.includes(v.owner)) {
          playersOnTile.push(v.owner);
        }
      }
      if (playersOnTile.length === 0) {
        onAction('move_robber', { tileId, stealFrom: null });
      } else if (playersOnTile.length === 1) {
        onAction('move_robber', { tileId, stealFrom: playersOnTile[0] });
      } else {
        // Multiple targets — pick first for simplicity (could add a modal)
        const choice = window.prompt(
          `Steal from: ${playersOnTile.map(i => gameState.players[i]?.name).join(' or ')} (enter name):`
        );
        const targetName = choice?.trim();
        const target = playersOnTile.find(i => gameState.players[i]?.name === targetName);
        onAction('move_robber', { tileId, stealFrom: target ?? playersOnTile[0] });
      }
    }
  }, [gameState, myIndex, onAction]);

  const sendChat = (e) => {
    e.preventDefault();
    if (!chatMsg.trim()) return;
    emit('send_chat', { message: chatMsg });
    setChatMsg('');
  };

  if (!gameState) return <div className="loading">Connecting…</div>;

  const { phase, players, currentPlayer, board, winner, diceValues } = gameState;

  // Lobby / waiting screen
  if (phase === 'lobby') {
    const isHost = players[0]?.id === playerId;
    return (
      <div className="lobby-waiting">
        <div className="waiting-card">
          <h2 className="waiting-title">Waiting Room</h2>
          <div className="room-code-display">
            <span className="room-code-label">Room Code</span>
            <span className="room-code-value">{roomCode}</span>
            <button className="copy-btn" onClick={() => navigator.clipboard.writeText(roomCode)}>
              📋 Copy
            </button>
          </div>

          <div className="player-list">
            {players.map((p, i) => (
              <div key={p.id} className="waiting-player" style={{ borderColor: PLAYER_COLORS[p.color] }}>
                <div className="wp-dot" style={{ background: PLAYER_COLORS[p.color] }} />
                <span>{p.name}</span>
                {i === 0 && <span className="host-tag">HOST</span>}
                {p.id === playerId && <span className="you-tag">YOU</span>}
              </div>
            ))}
            {Array.from({ length: Math.max(0, 4 - players.length) }, (_, i) => (
              <div key={`empty-${i}`} className="waiting-player empty">
                <div className="wp-dot" style={{ background: '#333' }} />
                <span style={{ opacity: 0.4 }}>Waiting…</span>
              </div>
            ))}
          </div>

          {isHost ? (
            <button
              className="lobby-btn primary start-btn"
              onClick={onStart}
              disabled={players.length < 2}
            >
              {players.length < 2 ? `Need ${2 - players.length} more player(s)` : '🎮 Start Game'}
            </button>
          ) : (
            <p className="waiting-hint">Waiting for the host to start…</p>
          )}
        </div>
      </div>
    );
  }

  // Win screen
  if (winner !== null && winner !== undefined) {
    const winPlayer = players[winner];
    return (
      <div className="win-screen">
        <div className="win-card">
          <div className="win-hex">
            <svg viewBox="0 0 100 90" width="110" height="98">
              <polygon points="50,5 95,28 95,72 50,95 5,72 5,28"
                fill={PLAYER_COLORS[winPlayer?.color] || '#9a6a18'}
                stroke="#8a5a18" strokeWidth="2.5" />
              <text x="50" y="57" textAnchor="middle"
                fill="white" fontSize="28"
                fontFamily="Poppins, system-ui, sans-serif" fontWeight="700">
                {winPlayer?.name?.[0] || '?'}
              </text>
            </svg>
          </div>
          <h1 className="win-title">{winPlayer?.name} Wins!</h1>
          <p className="win-vp">{winPlayer?.vp} Victory Points</p>
          <div className="final-scores">
            {players.map((p, i) => (
              <div key={p.id} className="score-row" style={{ color: PLAYER_COLORS[p.color] }}>
                <span>{p.name}</span>
                <span>{p.vpPublic} VP{p.id === playerId ? ' (you)' : ''}</span>
              </div>
            ))}
          </div>
          <button className="lobby-btn primary" onClick={() => window.location.reload()}>
            Play Again
          </button>
        </div>
      </div>
    );
  }

  const isMyTurn = currentPlayer === myIndex;
  const setupAction = gameState.setupAction;
  const freeRoads = gameState.freeRoads || 0;

  // Board interaction requires build mode OR robber movement OR setup
  const boardInteractive = isMyTurn && (
    phase === 'setup1' || phase === 'setup2' ||
    buildMode !== null || freeRoads > 0 || gameState.mustMoveRobber
  );

  return (
    <div className="game-layout">
      {/* Left sidebar — other players on top, my panel pinned to bottom */}
      <div className="sidebar-left">
        <div className="game-header-mini">
          <span className="room-tag">#{roomCode}</span>
          <span className={`phase-tag phase-${phase}`}>
            {phase === 'setup1' ? 'Setup I' : phase === 'setup2' ? 'Setup II' : 'Playing'}
          </span>
        </div>

        {/* Other players (compact) */}
        <div className="players-list">
          {players.map((p, i) => {
            if (p.id === playerId) return null;
            return (
              <PlayerHUD
                key={p.id}
                player={p}
                isMe={false}
                isCurrentTurn={i === currentPlayer}
              />
            );
          })}
        </div>

        {/* Dev card deck + special cards */}
        <div className="deck-info">
          <span>Dev Deck: {gameState.devCardDeck?.length ?? 0} cards</span>
          {gameState.longestRoadOwner !== null && (
            <div className="special-card">
              ⛓ Longest Road: {players[gameState.longestRoadOwner]?.name}
            </div>
          )}
          {gameState.largestArmyOwner !== null && (
            <div className="special-card">
              ⚔️ Largest Army: {players[gameState.largestArmyOwner]?.name}
            </div>
          )}
        </div>

        {/* My player panel — pinned to bottom */}
        {myIndex !== -1 && players[myIndex] && (
          <div className="my-player-section">
            <PlayerHUD
              player={players[myIndex]}
              isMe={true}
              isCurrentTurn={currentPlayer === myIndex}
            />
          </div>
        )}
      </div>

      {/* Center — board */}
      <div className={`board-area ${boardInteractive ? 'interactive' : ''}`}>
        <Board
          board={board}
          players={players}
          currentPlayerIndex={currentPlayer}
          myIndex={myIndex}
          phase={phase}
          setupAction={setupAction}
          mustMoveRobber={gameState.mustMoveRobber && isMyTurn}
          onVertexClick={handleVertexClick}
          onEdgeClick={handleEdgeClick}
          onTileClick={handleTileClick}
          buildMode={buildMode}
          freeRoads={freeRoads}
          diceValues={diceValues}
        />

        {/* Turn indicator */}
        <div className={`turn-banner ${isMyTurn ? 'my-turn' : ''}`}>
          {isMyTurn
            ? freeRoads > 0
              ? `Place ${freeRoads} free road${freeRoads > 1 ? 's' : ''}!`
              : gameState.mustMoveRobber
              ? '☠️ Move the Robber!'
              : !gameState.diceRolled
              ? '🎲 Your turn — Roll the dice!'
              : buildMode
              ? `Placing ${buildMode} — click the board`
              : `Your turn`
            : `${players[currentPlayer]?.name}'s turn`}
        </div>
      </div>

      {/* Right sidebar — actions + log */}
      <div className="sidebar-right">
        <ActionPanel
          gameState={gameState}
          myIndex={myIndex}
          onAction={onAction}
          buildMode={buildMode}
          setBuildMode={setBuildMode}
        />

        {/* Game log */}
        <div className="game-log">
          <div className="log-header" onClick={() => setLogExpanded(e => !e)}>
            <span>Game Log</span>
            <span className="log-toggle">{logExpanded ? '▲' : '▼'}</span>
          </div>
          <div className={`log-entries ${logExpanded ? 'expanded' : ''}`}>
            {gameLog.slice().reverse().map((entry, i) => (
              <div key={i} className="log-entry">{entry}</div>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="chat-box">
          <div className="chat-header">Chat</div>
          <div className="chat-messages">
            {chatLog.map((m, i) => (
              <div key={i} className="chat-msg">
                <strong style={{ color: PLAYER_COLORS[m.color] }}>{m.player}:</strong> {m.message}
              </div>
            ))}
          </div>
          <form onSubmit={sendChat} className="chat-input-row">
            <input
              className="chat-input"
              value={chatMsg}
              onChange={e => setChatMsg(e.target.value)}
              placeholder="Say something…"
              maxLength={100}
            />
            <button type="submit" className="chat-send">→</button>
          </form>
        </div>
      </div>
    </div>
  );
}
