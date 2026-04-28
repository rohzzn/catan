import React from 'react';

const RES_DATA = {
  wood:  { icon: '🪵', label: 'Wood',  color: '#3d8c3d' },
  brick: { icon: '🧱', label: 'Brick', color: '#c84b30' },
  ore:   { icon: '⛏️', label: 'Ore',   color: '#6b5d7a' },
  wheat: { icon: '🌾', label: 'Wheat', color: '#d4a017' },
  sheep: { icon: '🐑', label: 'Sheep', color: '#6ab04c' },
};

const DEV_CARD_DATA = {
  knight:         { icon: '⚔️', label: 'Knight' },
  road_building:  { icon: '🛤️', label: 'Road Building' },
  year_of_plenty: { icon: '🎁', label: 'Year of Plenty' },
  monopoly:       { icon: '💰', label: 'Monopoly' },
  vp:             { icon: '⭐', label: 'Victory Point' },
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

  // Group dev cards by type
  const devCardGroups = {};
  for (const c of (player.devCards || [])) {
    devCardGroups[c] = (devCardGroups[c] || 0) + 1;
  }

  if (isMe) {
    return (
      <div className={`player-hud me ${isCurrentTurn ? 'active' : ''}`}>
        {/* Header */}
        <div className="hud-header" style={{ borderColor: color }}>
          <div className="hud-color-dot" style={{ background: color }} />
          <span className="hud-name">{player.name}</span>
          {isCurrentTurn && <span className="turn-badge">TURN</span>}
          {!isCurrentTurn && <span className="you-badge">YOU</span>}
          <span className="hud-vp">
            <span className="vp-star">⚑</span>
            {player.vp}
            {player.vp !== player.vpPublic && <span className="hidden-vp">*</span>}
          </span>
        </div>

        {/* Resource cards with images */}
        <div className="hud-resources-label">Resources</div>
        <div className="hud-resources">
          {Object.entries(RES_DATA).map(([res_name, { icon, label, color: rc }]) => {
            const count = player.resources[res_name] || 0;
            return (
              <div
                key={res_name}
                className={`resource-card ${count === 0 ? 'empty' : ''}`}
                title={`${label}: ${count}`}
              >
                <div className="res-card-icon" style={{ background: rc }}>{icon}</div>
                <span className="res-card-count">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Dev cards with images */}
        {totalDevCards > 0 && (
          <>
            <div className="hud-resources-label">Dev Cards</div>
            <div className="hud-dev-cards">
              {Object.entries(devCardGroups).map(([type, count]) => {
                const info = DEV_CARD_DATA[type];
                if (!info) return null;
                return (
                  <div key={type} className="dev-card-thumb" title={info.label}>
                    <div className="dev-thumb-icon">{info.icon}</div>
                    {count > 1 && <span className="dev-thumb-count">×{count}</span>}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Build affordability indicators */}
        <div className="hud-build-status">
          <span className={`build-indicator ${canBuild.road ? 'can-build' : ''}`} title="Road (Wood + Brick)">
            🛤
          </span>
          <span className={`build-indicator ${canBuild.settlement ? 'can-build' : ''}`} title="Settlement (Wood+Brick+Wheat+Sheep)">
            🏠
          </span>
          <span className={`build-indicator ${canBuild.city ? 'can-build' : ''}`} title="City (3 Ore + 2 Wheat)">
            🏰
          </span>
          <span className={`build-indicator ${canBuild.devCard ? 'can-build' : ''}`} title="Dev Card (Ore+Wheat+Sheep)">
            🃏
          </span>
        </div>

        {/* Stats */}
        <div className="hud-stats">
          <span title="Settlements">🏠 {player.settlements?.length || 0}</span>
          <span title="Cities">🏰 {player.cities?.length || 0}</span>
          <span title="Roads">🛤 {player.roads?.length || 0}</span>
          {player.hasLongestRoad && (
            <span className="special-badge" title="Longest Road">⛓ LR</span>
          )}
          {player.hasLargestArmy && (
            <span className="special-badge" title="Largest Army">⚔ LA</span>
          )}
          {player.knightsPlayed > 0 && (
            <span title="Knights played">⚔ ×{player.knightsPlayed}</span>
          )}
        </div>
      </div>
    );
  }

  // ── Other players: compact view ───────────────────────────────────────────
  return (
    <div className={`player-hud ${isCurrentTurn ? 'active' : ''}`}>
      <div className="hud-header" style={{ borderColor: color }}>
        <div className="hud-color-dot" style={{ background: color }} />
        <span className="hud-name">{player.name}</span>
        {isCurrentTurn && <span className="turn-badge">TURN</span>}
        <span className="hud-vp">
          <span className="vp-star">⚑</span>
          {player.vpPublic}
        </span>
      </div>

      <div className="hud-resources-hidden">
        <span className="card-back">🃏</span>
        <span className="card-count">{totalCards} cards</span>
        {totalDevCards > 0 && (
          <span className="dev-count">+{totalDevCards} dev</span>
        )}
      </div>

      <div className="hud-stats">
        <span title="Settlements">🏠 {player.settlements?.length || 0}</span>
        <span title="Cities">🏰 {player.cities?.length || 0}</span>
        <span title="Roads">🛤 {player.roads?.length || 0}</span>
        {player.hasLongestRoad && <span className="special-badge">⛓ LR</span>}
        {player.hasLargestArmy && <span className="special-badge">⚔ LA</span>}
      </div>
    </div>
  );
}
