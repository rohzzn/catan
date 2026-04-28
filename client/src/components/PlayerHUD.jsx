import React from 'react';

const RES_ICONS = {
  wood:  { icon: '🪵', color: '#3d8c3d', label: 'Wood' },
  brick: { icon: '🧱', color: '#c84b30', label: 'Brick' },
  ore:   { icon: '⛏️', color: '#6b5d7a', label: 'Ore' },
  wheat: { icon: '🌾', color: '#d4a017', label: 'Wheat' },
  sheep: { icon: '🐑', color: '#6ab04c', label: 'Sheep' },
};

const PLAYER_COLORS = {
  red:    '#b83030',
  blue:   '#2a58b0',
  white:  '#c8c0b0',
  orange: '#c06010',
};

const BUILD_COSTS = {
  road:       { wood: 1, brick: 1 },
  settlement: { wood: 1, brick: 1, wheat: 1, sheep: 1 },
  city:       { ore: 3, wheat: 2 },
  devCard:    { ore: 1, wheat: 1, sheep: 1 },
};

function canAfford(resources, cost) {
  return Object.entries(cost).every(([r, n]) => (resources[r] || 0) >= n);
}

export default function PlayerHUD({ player, isMe, isCurrentTurn }) {
  if (!player) return null;

  const res = player.resources;
  const totalCards = Object.values(res).reduce((a, b) => a + b, 0);
  const totalDevCards = player.devCards?.length || 0;
  const color = PLAYER_COLORS[player.color] || '#888';

  const canBuild = {
    road: canAfford(res, BUILD_COSTS.road),
    settlement: canAfford(res, BUILD_COSTS.settlement),
    city: canAfford(res, BUILD_COSTS.city),
    devCard: canAfford(res, BUILD_COSTS.devCard),
  };

  return (
    <div className={`player-hud ${isCurrentTurn ? 'active' : ''} ${isMe ? 'me' : ''}`}>
      {/* Player header */}
      <div className="hud-header" style={{ borderColor: color }}>
        <div className="hud-color-dot" style={{ background: color }} />
        <span className="hud-name">{player.name}</span>
        {isCurrentTurn && <span className="turn-badge">TURN</span>}
        {isMe && !isCurrentTurn && <span className="you-badge">YOU</span>}
        <span className="hud-vp">
          <span className="vp-star">⚑</span>
          {isMe ? player.vp : player.vpPublic}
          {isMe && player.vp !== player.vpPublic && <span className="hidden-vp">*</span>}
        </span>
      </div>

      {/* Resources (shown fully to self, card count to others) */}
      {isMe ? (
        <div className="hud-resources">
          {Object.entries(RES_ICONS).map(([res_name, { icon, color: rc, label }]) => (
            <div
              key={res_name}
              className={`resource-chip ${(player.resources[res_name] || 0) === 0 ? 'empty' : ''}`}
              title={label}
            >
              <span className="res-icon">{icon}</span>
              <span className="res-count">{player.resources[res_name] || 0}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="hud-resources-hidden">
          <span className="card-back">🃏</span>
          <span className="card-count">{totalCards} cards</span>
          {totalDevCards > 0 && (
            <span className="dev-count">+{totalDevCards} dev</span>
          )}
        </div>
      )}

      {/* Build indicators for self */}
      {isMe && (
        <div className="hud-build-status">
          {Object.entries(canBuild).map(([type, can]) => (
            <span key={type} className={`build-indicator ${can ? 'can-build' : ''}`} title={`Build ${type}`}>
              {type === 'road' ? '🛤' : type === 'settlement' ? '🏠' : type === 'city' ? '🏰' : '🃏'}
            </span>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="hud-stats">
        <span title="Settlements">🏠 {player.settlements?.length || 0}</span>
        <span title="Cities">🏰 {player.cities?.length || 0}</span>
        <span title="Roads">🛤 {player.roads?.length || 0}</span>
        {player.hasLongestRoad && <span className="special-badge" title="Longest Road">⛓ LR</span>}
        {player.hasLargestArmy && <span className="special-badge" title="Largest Army">⚔ LA</span>}
        {player.knightsPlayed > 0 && <span title="Knights played">⚔ ×{player.knightsPlayed}</span>}
      </div>
    </div>
  );
}
