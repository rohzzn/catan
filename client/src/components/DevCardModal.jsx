import React, { useState } from 'react';

import knightImg       from '../images/devcards/knight.png';
import monopolyImg     from '../images/devcards/Monopoly.png';
import roadBuildImg    from '../images/devcards/road_building.png';
import vpImg           from '../images/devcards/VP.png';
import yearPlentyImg   from '../images/devcards/YearofPlenty.png';

const RESOURCES = ['wood', 'brick', 'ore', 'wheat', 'sheep'];
const RES_ICONS = { wood: '🪵', brick: '🧱', ore: '⛏️', wheat: '🌾', sheep: '🐑' };

const CARD_INFO = {
  knight:         { label: 'Knight',         img: knightImg,     desc: 'Move the Robber and steal 1 resource.' },
  road_building:  { label: 'Road Building',  img: roadBuildImg,  desc: 'Place 2 roads for free.' },
  year_of_plenty: { label: 'Year of Plenty', img: yearPlentyImg, desc: 'Take any 2 resources from the bank.' },
  monopoly:       { label: 'Monopoly',       img: monopolyImg,   desc: 'Declare a resource. Take all of it from every player.' },
  vp:             { label: 'Victory Point',  img: vpImg,         desc: 'Hidden +1 VP. Reveal at game end.' },
};

export default function DevCardModal({ cards, onAction, onClose }) {
  const [selected, setSelected] = useState(null);
  const [yopRes1, setYopRes1] = useState('wood');
  const [yopRes2, setYopRes2] = useState('ore');
  const [monoRes, setMonoRes] = useState('wood');

  const grouped = {};
  for (const c of cards) {
    grouped[c] = (grouped[c] || 0) + 1;
  }

  const handlePlay = () => {
    if (!selected || selected === 'vp') return;
    let params = {};
    if (selected === 'year_of_plenty') params = { res1: yopRes1, res2: yopRes2 };
    if (selected === 'monopoly') params = { resource: monoRes };
    onAction('play_dev_card', { cardType: selected, params });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box dev-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Development Cards</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="dev-card-grid">
          {Object.entries(CARD_INFO).map(([type, info]) => {
            const count = grouped[type] || 0;
            if (count === 0) return null;
            return (
              <div
                key={type}
                className={`dev-card ${selected === type ? 'selected' : ''} ${type === 'vp' ? 'vp-card' : ''}`}
                onClick={() => type !== 'vp' && setSelected(type === selected ? null : type)}
              >
                <img src={info.img} alt={info.label} className="dev-card-art" />
                <div className="dev-card-label">{info.label}</div>
                <div className="dev-card-desc">{info.desc}</div>
                {count > 1 && <div className="dev-card-count">×{count}</div>}
              </div>
            );
          })}
        </div>

        {selected === 'year_of_plenty' && (
          <div className="dev-params">
            <label>Choose 2 resources:</label>
            <div className="yop-selects">
              <select value={yopRes1} onChange={e => setYopRes1(e.target.value)} className="res-dropdown">
                {RESOURCES.map(r => <option key={r} value={r}>{RES_ICONS[r]} {r}</option>)}
              </select>
              <select value={yopRes2} onChange={e => setYopRes2(e.target.value)} className="res-dropdown">
                {RESOURCES.map(r => <option key={r} value={r}>{RES_ICONS[r]} {r}</option>)}
              </select>
            </div>
          </div>
        )}

        {selected === 'monopoly' && (
          <div className="dev-params">
            <label>Declare a resource:</label>
            <div className="mono-select">
              {RESOURCES.map(r => (
                <button
                  key={r}
                  className={`res-btn ${monoRes === r ? 'selected' : ''}`}
                  onClick={() => setMonoRes(r)}
                >
                  {RES_ICONS[r]} {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {selected && selected !== 'vp' && (
          <button className="modal-btn primary" onClick={handlePlay}>
            Play {CARD_INFO[selected]?.label}
          </button>
        )}
      </div>
    </div>
  );
}
