import React, { useState } from 'react';

const RESOURCES = ['wood', 'brick', 'ore', 'wheat', 'sheep'];
const RES_ICONS = { wood: '🪵', brick: '🧱', ore: '⛏️', wheat: '🌾', sheep: '🐑' };
const PORT_MAP = { wood: 'lumber', brick: 'brick', ore: 'ore', wheat: 'grain', sheep: 'wool' };

export default function TradeModal({ gameState, myIndex, onAction, onClose }) {
  const [mode, setMode] = useState('bank'); // bank | player
  const [give, setGive] = useState('wood');
  const [receive, setReceive] = useState('brick');
  const [offer, setOffer] = useState({ wood: 0, brick: 0, ore: 0, wheat: 0, sheep: 0 });
  const [request, setRequest] = useState({ wood: 0, brick: 0, ore: 0, wheat: 0, sheep: 0 });
  const [targetPlayer, setTargetPlayer] = useState(null);

  const player = gameState.players[myIndex];
  const res = player?.resources || {};

  const getTradeRate = (resource) => {
    let rate = 4;
    const allVertices = [...(player?.settlements || []), ...(player?.cities || [])];
    if (!gameState.board) return rate;
    for (const vid of allVertices) {
      const v = gameState.board.vertices?.[vid];
      if (!v) continue;
      if (v.port === '3:1') rate = Math.min(rate, 3);
      if (v.port === PORT_MAP[resource]) rate = 2;
    }
    return rate;
  };

  const handleBankTrade = () => {
    if (give === receive) return;
    onAction('bank_trade', { give, receive });
    onClose();
  };

  const handleOfferTrade = () => {
    const hasOffer = RESOURCES.some(r => offer[r] > 0);
    const hasRequest = RESOURCES.some(r => request[r] > 0);
    if (!hasOffer || !hasRequest) return;
    onAction('offer_trade', { offer, request, targetPlayer });
    onClose();
  };

  const rate = getTradeRate(give);
  const canBankTrade = (res[give] || 0) >= rate && give !== receive;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box trade-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Trade</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="trade-tabs">
          <button className={`trade-tab ${mode === 'bank' ? 'active' : ''}`} onClick={() => setMode('bank')}>
            🏦 Bank / Port
          </button>
          <button className={`trade-tab ${mode === 'player' ? 'active' : ''}`} onClick={() => setMode('player')}>
            🤝 Player Trade
          </button>
        </div>

        {mode === 'bank' && (
          <div className="bank-trade">
            <div className="trade-row">
              <div className="trade-side">
                <label>You Give ({rate}:1)</label>
                <div className="res-select">
                  {RESOURCES.map(r => (
                    <button
                      key={r}
                      className={`res-btn ${give === r ? 'selected' : ''} ${(res[r] || 0) < rate ? 'insufficient' : ''}`}
                      onClick={() => setGive(r)}
                    >
                      <span className="res-ico">{RES_ICONS[r]}</span>
                      <span className="res-name">{r}</span>
                      <span className="res-have">×{res[r] || 0}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="trade-arrow">⇄</div>
              <div className="trade-side">
                <label>You Receive (1)</label>
                <div className="res-select">
                  {RESOURCES.map(r => (
                    <button
                      key={r}
                      className={`res-btn ${receive === r ? 'selected' : ''}`}
                      onClick={() => setReceive(r)}
                    >
                      <span className="res-ico">{RES_ICONS[r]}</span>
                      <span className="res-name">{r}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="trade-summary">
              Give {rate}× {RES_ICONS[give]} {give} → Get 1× {RES_ICONS[receive]} {receive}
            </div>

            <div className="port-rates">
              {RESOURCES.map(r => {
                const pr = getTradeRate(r);
                return pr < 4 ? (
                  <span key={r} className="port-rate-tag">
                    {RES_ICONS[r]} {pr}:1
                  </span>
                ) : null;
              })}
            </div>

            <button
              className={`modal-btn primary ${!canBankTrade ? 'disabled' : ''}`}
              onClick={canBankTrade ? handleBankTrade : undefined}
              disabled={!canBankTrade}
            >
              Trade with Bank
            </button>
          </div>
        )}

        {mode === 'player' && (
          <div className="player-trade">
            <div className="pt-target">
              <label>Trade with:</label>
              <div className="player-select">
                <button
                  className={`player-btn ${targetPlayer === null ? 'selected' : ''}`}
                  onClick={() => setTargetPlayer(null)}
                >
                  Anyone
                </button>
                {gameState.players.filter((_, i) => i !== myIndex).map((p, i) => (
                  <button
                    key={p.id}
                    className={`player-btn ${targetPlayer === gameState.players.indexOf(p) ? 'selected' : ''}`}
                    onClick={() => setTargetPlayer(gameState.players.indexOf(p))}
                    style={{ borderColor: { red: '#b83030', blue: '#2a58b0', white: '#c8c0b0', orange: '#c06010' }[p.color] }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="trade-row">
              <div className="trade-side">
                <label>You Offer</label>
                <div className="res-spinner-list">
                  {RESOURCES.map(r => (
                    <div key={r} className="res-spinner">
                      <span>{RES_ICONS[r]}</span>
                      <button className="spin-btn" onClick={() => setOffer(o => ({ ...o, [r]: Math.max(0, o[r] - 1) }))}>−</button>
                      <span className="spin-val">{offer[r]}</span>
                      <button className="spin-btn" onClick={() => setOffer(o => ({ ...o, [r]: Math.min(res[r] || 0, o[r] + 1) }))}>+</button>
                      <span className="spin-max">/{res[r] || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="trade-arrow">⇄</div>
              <div className="trade-side">
                <label>You Request</label>
                <div className="res-spinner-list">
                  {RESOURCES.map(r => (
                    <div key={r} className="res-spinner">
                      <span>{RES_ICONS[r]}</span>
                      <button className="spin-btn" onClick={() => setRequest(q => ({ ...q, [r]: Math.max(0, q[r] - 1) }))}>−</button>
                      <span className="spin-val">{request[r]}</span>
                      <button className="spin-btn" onClick={() => setRequest(q => ({ ...q, [r]: q[r] + 1 }))}>+</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              className="modal-btn primary"
              onClick={handleOfferTrade}
            >
              Send Trade Offer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
