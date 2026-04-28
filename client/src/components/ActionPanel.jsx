import React, { useState, useEffect, useRef } from 'react';
import TradeModal from './TradeModal.jsx';
import DevCardModal from './DevCardModal.jsx';

const BUILD_COSTS = {
  road:       { wood: 1, brick: 1 },
  settlement: { wood: 1, brick: 1, wheat: 1, sheep: 1 },
  city:       { ore: 3, wheat: 2 },
  devCard:    { ore: 1, wheat: 1, sheep: 1 },
};

function canAfford(resources, cost) {
  return Object.entries(cost).every(([r, n]) => (resources[r] || 0) >= n);
}

const COST_DISPLAY = {
  road:       '🪵1 🧱1',
  settlement: '🪵1 🧱1 🌾1 🐑1',
  city:       '⛏3 🌾2',
  devCard:    '⛏1 🌾1 🐑1',
};

export default function ActionPanel({ gameState, myIndex, onAction, buildMode, setBuildMode }) {
  const [tradeOpen, setTradeOpen] = useState(false);
  const [devOpen,   setDevOpen]   = useState(false);

  // ── Trade banner slide animation ──────────────────────────────────────────
  const [tradeVisible, setTradeVisible] = useState(false);
  const [tradeHiding,  setTradeHiding]  = useState(false);
  const hideTimerRef  = useRef(null);
  const lastOfferRef  = useRef(null);

  // Compute incomingTrade before early return (with null guards)
  const tradeOffer    = gameState?.tradeOffer ?? null;
  const incomingTrade = !!(
    tradeOffer && myIndex !== null && myIndex !== -1 &&
    tradeOffer.from !== myIndex &&
    (tradeOffer.targetPlayer === null || tradeOffer.targetPlayer === myIndex)
  );
  if (incomingTrade) lastOfferRef.current = tradeOffer; // cache for hide animation

  useEffect(() => {
    if (incomingTrade) {
      clearTimeout(hideTimerRef.current);
      setTradeHiding(false);
      setTradeVisible(true);
    } else if (tradeVisible) {
      setTradeHiding(true);
      hideTimerRef.current = setTimeout(() => {
        setTradeVisible(false);
        setTradeHiding(false);
      }, 280);
    }
    return () => clearTimeout(hideTimerRef.current);
  }, [incomingTrade]);

  if (!gameState || myIndex === null) return null;

  const player = gameState.players[myIndex];
  if (!player) return null;

  const isMyTurn = gameState.currentPlayer === myIndex;
  const isPlaying = gameState.phase === 'playing';
  const diceRolled = gameState.diceRolled;
  const mustMove = gameState.mustMoveRobber;
  const isSetup = gameState.phase === 'setup1' || gameState.phase === 'setup2';
  const freeRoads = gameState.freeRoads || 0;

  const res = player.resources;
  const can = {
    roll: isMyTurn && isPlaying && !diceRolled && !mustMove,
    road: isMyTurn && diceRolled && isPlaying && (canAfford(res, BUILD_COSTS.road) || freeRoads > 0),
    settlement: isMyTurn && diceRolled && isPlaying && canAfford(res, BUILD_COSTS.settlement),
    city: isMyTurn && diceRolled && isPlaying && canAfford(res, BUILD_COSTS.city) && player.settlements.length > 0,
    devCard: isMyTurn && diceRolled && isPlaying && canAfford(res, BUILD_COSTS.devCard) && gameState.devCardDeck?.length > 0,
    trade: isMyTurn && diceRolled && isPlaying,
    endTurn: isMyTurn && diceRolled && isPlaying && !mustMove,
    playDev: isMyTurn && isPlaying && !gameState.devCardPlayed && player.devCards.length > 0,
  };

  const toggleBuild = (mode) => {
    setBuildMode(prev => prev === mode ? null : mode);
  };

  const handleRoll = () => {
    onAction('roll_dice', {});
  };

  const handleEndTurn = () => {
    setBuildMode(null);
    onAction('end_turn', {});
  };

  // Setup phase UI
  if (isSetup) {
    const setupAction = gameState.setupAction;
    return (
      <div className="action-panel setup-panel">
        <div className="ap-title">
          {isMyTurn
            ? `Place your ${setupAction === 'settlement' ? 'Settlement' : 'Road'}`
            : `Waiting for ${gameState.players[gameState.currentPlayer]?.name}...`}
        </div>
        {isMyTurn && (
          <p className="ap-hint">
            {setupAction === 'settlement'
              ? 'Click a valid vertex on the board to place your settlement.'
              : 'Click an adjacent edge to place your road.'}
          </p>
        )}
      </div>
    );
  }

  if (!isPlaying) return null;

  return (
    <div className="action-panel">
      {/* Incoming trade offer banner — animated slide in/out */}
      {tradeVisible && lastOfferRef.current && (
        <div className={`trade-offer-banner${tradeHiding ? ' hiding' : ''}`}>
          <div className="trade-offer-text">
            <strong>{gameState.players[lastOfferRef.current.from]?.name}</strong> offers a trade!
          </div>
          <div className="trade-offer-details">
            <span className="trade-gives">
              Gives: {Object.entries(lastOfferRef.current.offer).filter(([,n])=>n>0).map(([r,n])=>`${n}×${r}`).join(', ')}
            </span>
            <span className="trade-wants">
              Wants: {Object.entries(lastOfferRef.current.request).filter(([,n])=>n>0).map(([r,n])=>`${n}×${r}`).join(', ')}
            </span>
          </div>
          <div className="trade-offer-btns">
            <button className="btn-accept" onClick={() => onAction('respond_trade', { accept: true })}>Accept</button>
            <button className="btn-decline" onClick={() => onAction('respond_trade', { accept: false })}>Decline</button>
          </div>
        </div>
      )}

      {/* Robber notice */}
      {mustMove && isMyTurn && (
        <div className="robber-notice">
          ☠️ Click a tile to move the Robber!
        </div>
      )}

      {/* Main action row */}
      {!mustMove && (
        <>
          {/* Roll */}
          {!diceRolled && (
            <button
              className={`ap-btn roll-btn ${can.roll ? '' : 'disabled'}`}
              onClick={can.roll ? handleRoll : undefined}
              disabled={!can.roll}
            >
              🎲 Roll Dice
            </button>
          )}

          {/* Dice result */}
          {diceRolled && gameState.diceValues && (
            <div className="dice-display">
              <div className="die">{gameState.diceValues[0]}</div>
              <div className="die">{gameState.diceValues[1]}</div>
              <div className="dice-total">= {gameState.diceValues[0] + gameState.diceValues[1]}</div>
            </div>
          )}

          {/* Build actions */}
          {diceRolled && (
            <div className="build-actions">
              <button
                className={`ap-btn build-btn ${buildMode === 'road' ? 'active' : ''} ${!can.road ? 'disabled' : ''}`}
                onClick={() => can.road && toggleBuild('road')}
                title={`Road: ${COST_DISPLAY.road}`}
                disabled={!can.road}
              >
                🛤 Road {freeRoads > 0 && <span className="free-tag">FREE×{freeRoads}</span>}
              </button>
              <button
                className={`ap-btn build-btn ${buildMode === 'settlement' ? 'active' : ''} ${!can.settlement ? 'disabled' : ''}`}
                onClick={() => can.settlement && toggleBuild('settlement')}
                title={`Settlement: ${COST_DISPLAY.settlement}`}
                disabled={!can.settlement}
              >
                🏠 Settlement
              </button>
              <button
                className={`ap-btn build-btn ${buildMode === 'city' ? 'active' : ''} ${!can.city ? 'disabled' : ''}`}
                onClick={() => can.city && toggleBuild('city')}
                title={`City: ${COST_DISPLAY.city}`}
                disabled={!can.city}
              >
                🏰 City
              </button>
              <button
                className={`ap-btn build-btn ${!can.devCard ? 'disabled' : ''}`}
                onClick={() => can.devCard && onAction('buy_dev_card', {})}
                title={`Dev Card: ${COST_DISPLAY.devCard}`}
                disabled={!can.devCard}
              >
                🃏 Dev Card
              </button>
            </div>
          )}

          {/* Trade & Dev Card row */}
          {diceRolled && (
            <div className="secondary-actions">
              <button
                className={`ap-btn secondary ${!can.trade ? 'disabled' : ''}`}
                onClick={() => can.trade && setTradeOpen(true)}
                disabled={!can.trade}
              >
                🤝 Trade
              </button>
              <button
                className={`ap-btn secondary ${!can.playDev ? 'disabled' : ''}`}
                onClick={() => can.playDev && setDevOpen(true)}
                disabled={!can.playDev}
              >
                ✨ Play Dev Card
              </button>
              <button
                className={`ap-btn end-btn ${!can.endTurn ? 'disabled' : ''}`}
                onClick={can.endTurn ? handleEndTurn : undefined}
                disabled={!can.endTurn}
              >
                ✓ End Turn
              </button>
            </div>
          )}
        </>
      )}

      {/* Build mode indicator */}
      {buildMode && (
        <div className="build-mode-indicator">
          Placing {buildMode} — click the board
          <button className="cancel-build" onClick={() => setBuildMode(null)}>✕ Cancel</button>
        </div>
      )}

      {/* Modals */}
      {tradeOpen && (
        <TradeModal
          gameState={gameState}
          myIndex={myIndex}
          onAction={onAction}
          onClose={() => setTradeOpen(false)}
        />
      )}
      {devOpen && (
        <DevCardModal
          cards={player.devCards}
          onAction={onAction}
          onClose={() => setDevOpen(false)}
        />
      )}
    </div>
  );
}
