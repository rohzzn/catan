import React, { useMemo, useState } from 'react';

// Board tile images
import woodForestImg from '../images/board/wood_forest.svg';
import sheepPastureImg from '../images/board/sheep_pasture.svg';
import wheatFieldsImg from '../images/board/wheat_fields.svg';
import brickHillsImg from '../images/board/brick_hills.svg';
import oreMountainsImg from '../images/board/ore_mountains.svg';
import desertImg from '../images/board/desert.svg';

const SQRT3 = Math.sqrt(3);

// Coordinate system
// Server uses HEX_SIZE=100. CLIENT_SIZE is our render size.
const CLIENT_SIZE = 60;
const SCALE = CLIENT_SIZE / 100;
const SVG_W = 920;
const SVG_H = 800;
const CX = SVG_W / 2;
const CY = SVG_H / 2 + 10;

// ─── Tile images map ──────────────────────────────────────────────────────────
const TILE_IMAGE = {
  forest:    woodForestImg,
  pasture:   sheepPastureImg,
  fields:    wheatFieldsImg,
  hills:     brickHillsImg,
  mountains: oreMountainsImg,
  desert:    desertImg,
};

// ─── Fallback flat colours (used as background while image loads) ─────────────
const TILE_FILL = {
  forest:    '#3d6e33',
  pasture:   '#93c76e',
  fields:    '#d4a83c',
  hills:     '#b85040',
  mountains: '#9898b4',
  desert:    '#d2be80',
};
const TILE_STROKE = {
  forest:    '#2c5224',
  pasture:   '#6a9c50',
  fields:    '#a07e1e',
  hills:     '#8a3428',
  mountains: '#727092',
  desert:    '#a89048',
};

const OCEAN_FILL   = '#7ea8c8';
const OCEAN_STROKE = '#6890b0';
const PAGE_BG      = '#cbbfa8';

// ─── Player colours ───────────────────────────────────────────────────────────
const PLAYER_FILL = {
  red:    '#b83030', blue: '#2a58b0', white: '#e8e0d0', orange: '#c06010',
};
const PLAYER_STROKE = {
  red:    '#7a1818', blue: '#183880', white: '#807060', orange: '#804010',
};

// ─── Ocean ring: exactly the 18 hexes at distance 3 from centre ───────────────
const OCEAN_RING = [];
for (let q = -3; q <= 3; q++) {
  for (let r = -3; r <= 3; r++) {
    if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) === 3) {
      OCEAN_RING.push({ q, r });
    }
  }
}
const OCEAN_CENTERS = OCEAN_RING.map(({ q, r }) => ({
  x: CX + CLIENT_SIZE * 1.5 * q,
  y: CY + CLIENT_SIZE * (SQRT3 / 2 * q + SQRT3 * r),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
function hexPoints(cx, cy, size) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI) / 3;
    return `${cx + size * Math.cos(a)},${cy + size * Math.sin(a)}`;
  }).join(' ');
}

function toScreen(sx, sy) {
  return { x: CX + sx * SCALE, y: CY + sy * SCALE };
}

// ─── Number token ─────────────────────────────────────────────────────────────
function NumberToken({ x, y, number }) {
  const isHot  = number === 6 || number === 8;
  const dots   = [2,12].includes(number)?1:[3,11].includes(number)?2:[4,10].includes(number)?3:[5,9].includes(number)?4:5;

  return (
    <g>
      <circle cx={x} cy={y} r={16.5} fill="#ffffff" stroke="#c8b490" strokeWidth="1.5" />
      <text
        x={x} y={y - 1}
        textAnchor="middle" dominantBaseline="middle"
        fill={isHot ? '#b83030' : '#2e1e0e'}
        fontSize={number >= 10 ? 12 : 14}
        fontWeight="600"
        fontFamily="Poppins, sans-serif"
      >
        {number}
      </text>
      {Array.from({ length: dots }, (_, i) => (
        <circle key={i}
          cx={x - (dots - 1) * 3.5 + i * 7}
          cy={y + 9} r={2}
          fill={isHot ? '#b83030' : '#8a7060'}
        />
      ))}
    </g>
  );
}

// ─── Robber ───────────────────────────────────────────────────────────────────
function Robber({ x, y }) {
  return (
    <g>
      <circle cx={x} cy={y} r={13} fill="#aaaaaa" stroke="#888888" strokeWidth="1.5" />
      <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle"
        fill="#444" fontSize="11" fontWeight="700" fontFamily="Poppins, sans-serif">R</text>
    </g>
  );
}

// ─── Port sign ────────────────────────────────────────────────────────────────
const PORT_DOT = {
  lumber: '#3d6e33', wool: '#93c76e', grain: '#d4a83c',
  brick:  '#b85040', ore:  '#9898b4',
};

function PortSign({ p1, p2, mx, my, nx, ny, portType }) {
  const isGeneric = portType === '3:1';
  const dotColor  = isGeneric ? '#aaaaaa' : (PORT_DOT[portType] || '#999');
  const ratio     = isGeneric ? '3:1' : '2:1';

  const sx = mx + nx * 46;
  const sy = my + ny * 46;
  const anchorX = mx + nx * 25;
  const anchorY = my + ny * 25;
  const coastP1 = { x: p1.x + nx * 2, y: p1.y + ny * 2 };
  const coastP2 = { x: p2.x + nx * 2, y: p2.y + ny * 2 };

  return (
    <g>
      <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
        stroke="#5f3f1c" strokeWidth="5" strokeLinecap="round" opacity="0.34" />
      <path
        d={`M ${coastP1.x} ${coastP1.y} L ${anchorX} ${anchorY} L ${coastP2.x} ${coastP2.y}`}
        fill="none"
        stroke="#7a5020"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={anchorX} cy={anchorY} r="3.2" fill="#7a5020" />
      <rect x={sx - 20} y={sy - 13} width="40" height="26" rx="4"
        fill="#f8f4ec" stroke="#c0a870" strokeWidth="1.5" />
      <circle cx={sx - 10} cy={sy} r="5" fill={dotColor} />
      {isGeneric && (
        <text x={sx - 10} y={sy + 1} textAnchor="middle" dominantBaseline="middle"
          fill="white" fontSize="5" fontWeight="700" fontFamily="Poppins, sans-serif">?</text>
      )}
      <text x={sx + 2} y={sy + 1} textAnchor="start" dominantBaseline="middle"
        fill="#4a3018" fontSize="8.5" fontWeight="600" fontFamily="Poppins, sans-serif">
        {ratio}
      </text>
    </g>
  );
}

// ─── Building shapes ─────────────────────────────────────────────────────────
function Settlement({ x, y, color }) {
  const f = PLAYER_FILL[color]   || '#888';
  const s = PLAYER_STROKE[color] || '#444';
  return (
    <g transform={`translate(${x},${y})`}>
      <polygon points="0,-24 -13,-6 13,-6" fill={f} stroke={s} strokeWidth="2" />
      <polygon points="-13,-6 13,-6 13,11 -13,11" fill={f} stroke={s} strokeWidth="2" />
      <rect x="-4" y="1" width="8" height="10" fill={s} opacity="0.5" rx="1" />
    </g>
  );
}

function City({ x, y, color }) {
  const f = PLAYER_FILL[color]   || '#888';
  const s = PLAYER_STROKE[color] || '#444';
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x="-16" y="-2" width="32" height="14" fill={f} stroke={s} strokeWidth="2" rx="1" />
      <rect x="-16" y="-12" width="15" height="10" fill={f} stroke={s} strokeWidth="2" rx="1" />
      <polygon points="-16,-12 -8,-22 0,-12" fill={f} stroke={s} strokeWidth="2" />
      <polygon points="6,-2 16,-12 26,-2" fill={f} stroke={s} strokeWidth="2" />
      <rect x="-5" y="3" width="10" height="9" fill={s} opacity="0.5" rx="1" />
    </g>
  );
}

// ─── Main Board component ─────────────────────────────────────────────────────
export default function Board({
  board, players, currentPlayerIndex, myIndex,
  phase, setupAction, mustMoveRobber,
  onVertexClick, onEdgeClick, onTileClick,
  buildMode, freeRoads,
}) {
  const [hoveredVertex, setHoveredVertex] = useState(null);
  const [hoveredEdge,   setHoveredEdge]   = useState(null);
  const [hoveredTile,   setHoveredTile]   = useState(null);

  const validVertices = useMemo(() => {
    if (!board || myIndex === null) return new Set();
    const set = new Set();

    if ((phase === 'setup1' || phase === 'setup2') && setupAction === 'settlement') {
      if (currentPlayerIndex !== myIndex) return set;
      for (const [id, v] of Object.entries(board.vertices)) {
        if (v.building !== null) continue;
        if (v.adjacentVertexIds.some(aid => board.vertices[aid]?.building !== null)) continue;
        set.add(id);
      }
      return set;
    }
    if (phase === 'playing' && buildMode === 'settlement') {
      for (const [id, v] of Object.entries(board.vertices)) {
        if (v.building !== null) continue;
        if (v.adjacentVertexIds.some(aid => board.vertices[aid]?.building !== null)) continue;
        if (v.edgeIds.some(eid => board.edges[eid]?.road === myIndex)) set.add(id);
      }
    }
    if (phase === 'playing' && buildMode === 'city') {
      for (const [id, v] of Object.entries(board.vertices)) {
        if (v.building === 'settlement' && v.owner === myIndex) set.add(id);
      }
    }
    return set;
  }, [board, myIndex, phase, setupAction, currentPlayerIndex, buildMode]);

  const validEdges = useMemo(() => {
    if (!board || myIndex === null) return new Set();
    const set = new Set();
    const isSetup = (phase === 'setup1' || phase === 'setup2') && setupAction === 'road' && currentPlayerIndex === myIndex;
    const isGame  = phase === 'playing' && (buildMode === 'road' || (freeRoads || 0) > 0);
    if (!isSetup && !isGame) return set;

    if (isSetup) {
      const last = players[myIndex]?.settlements.at(-1);
      if (!last) return set;
      for (const [id, e] of Object.entries(board.edges)) {
        if (e.road === null && e.vertexIds.includes(last)) set.add(id);
      }
      return set;
    }
    for (const [id, e] of Object.entries(board.edges)) {
      if (e.road !== null) continue;
      const connected = e.vertexIds.some(vid => {
        const v = board.vertices[vid];
        return v.owner === myIndex || v.edgeIds.some(eid => board.edges[eid]?.road === myIndex);
      });
      if (!connected) continue;
      if (e.vertexIds.some(vid => { const v = board.vertices[vid]; return v.owner !== null && v.owner !== myIndex; })) continue;
      set.add(id);
    }
    return set;
  }, [board, myIndex, phase, setupAction, currentPlayerIndex, players, buildMode, freeRoads]);

  const validTiles = useMemo(() => {
    if (!board || !mustMoveRobber) return new Set();
    return new Set(board.tiles.filter(t => t.id !== board.robberTile).map(t => t.id));
  }, [board, mustMoveRobber]);

  const portMarkers = useMemo(() => {
    if (!board) return [];
    const markers = [];
    const seenEdges = new Set();
    for (const vertex of Object.values(board.vertices)) {
      if (!vertex.port) continue;
      for (const edgeId of vertex.edgeIds) {
        if (seenEdges.has(edgeId)) continue;
        const edge = board.edges[edgeId];
        if (!edge) continue;
        const otherId = edge.vertexIds.find(id => id !== vertex.id);
        const other   = board.vertices[otherId];
        if (!other || other.port !== vertex.port) continue;
        seenEdges.add(edgeId);

        const p1 = toScreen(vertex.x, vertex.y);
        const p2 = toScreen(other.x, other.y);
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        const edgeDx = p2.x - p1.x;
        const edgeDy = p2.y - p1.y;
        const edgeLength = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy) || 1;
        let nx = -edgeDy / edgeLength;
        let ny = edgeDx / edgeLength;
        if (nx * (mx - CX) + ny * (my - CY) < 0) {
          nx *= -1;
          ny *= -1;
        }
        markers.push({ p1, p2, mx, my, nx, ny, portType: vertex.port });
      }
    }
    return markers;
  }, [board]);

  if (!board) return null;
  const { tiles, vertices, edges, robberTile } = board;

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      width="100%" height="100%"
      style={{ display: 'block', maxHeight: '100%' }}
    >
      {/* ── Clip paths for all land tiles ───────────────────────────────── */}
      <defs>
        {tiles.map(tile => {
          const { x: sx, y: sy } = toScreen(tile.x, tile.y);
          return (
            <clipPath key={`cp-${tile.id}`} id={`hex-clip-${tile.id}`}>
              <polygon points={hexPoints(sx, sy, CLIENT_SIZE)} />
            </clipPath>
          );
        })}
      </defs>

      {/* Page background */}
      <rect width={SVG_W} height={SVG_H} fill={PAGE_BG} />

      {/* ── Ocean ring ──────────────────────────────────────────────────── */}
      {OCEAN_CENTERS.map(({ x, y }, i) => (
        <polygon key={`o${i}`}
          points={hexPoints(x, y, CLIENT_SIZE + 0.5)}
          fill={OCEAN_FILL}
          stroke={OCEAN_STROKE}
          strokeWidth="1.5"
        />
      ))}

      {/* ── Land tiles with image textures ──────────────────────────────── */}
      {tiles.map(tile => {
        const { x: sx, y: sy } = toScreen(tile.x, tile.y);
        const isValid   = validTiles.has(tile.id);
        const isHovered = hoveredTile === tile.id;
        const hasRobber = tile.id === robberTile;
        const imgSrc    = TILE_IMAGE[tile.resource];

        return (
          <g key={tile.id}
            onClick={() => isValid && onTileClick?.(tile.id)}
            onMouseEnter={() => isValid && setHoveredTile(tile.id)}
            onMouseLeave={() => setHoveredTile(null)}
            style={{ cursor: isValid ? 'pointer' : 'default' }}
          >
            {/* Fallback colour fill */}
            <polygon
              points={hexPoints(sx, sy, CLIENT_SIZE)}
              fill={TILE_FILL[tile.resource]}
              stroke="none"
            />

            {/* SVG image texture clipped to hex shape */}
            {imgSrc && (
              <image
                href={imgSrc}
                x={sx - CLIENT_SIZE}
                y={sy - CLIENT_SIZE}
                width={CLIENT_SIZE * 2}
                height={CLIENT_SIZE * 2}
                clipPath={`url(#hex-clip-${tile.id})`}
                preserveAspectRatio="xMidYMid slice"
              />
            )}

            {/* Hex border */}
            <polygon
              points={hexPoints(sx, sy, CLIENT_SIZE)}
              fill="none"
              stroke={TILE_STROKE[tile.resource]}
              strokeWidth="2.5"
            />

            {/* Robber overlay */}
            {hasRobber && (
              <polygon points={hexPoints(sx, sy, CLIENT_SIZE)}
                fill="rgba(0,0,0,0.30)" />
            )}

            {/* Robber-target highlight */}
            {isValid && (
              <polygon
                points={hexPoints(sx, sy, CLIENT_SIZE - 1)}
                fill={isHovered ? 'rgba(184,48,48,0.20)' : 'rgba(184,48,48,0.07)'}
                stroke={isHovered ? '#b83030' : 'rgba(184,48,48,0.50)'}
                strokeWidth="2.5"
                strokeDasharray={isHovered ? 'none' : '6,3'}
              />
            )}

            {/* Number token */}
            {!hasRobber && tile.number && (
              <NumberToken x={sx} y={sy + 3} number={tile.number} />
            )}

            {/* Robber piece */}
            {hasRobber && <Robber x={sx} y={sy} />}
          </g>
        );
      })}

      {/* ── Port signs ───────────────────────────────────────────────────── */}
      {portMarkers.map((m, i) => <PortSign key={i} {...m} />)}

      {/* ── Roads ────────────────────────────────────────────────────────── */}
      {Object.values(edges).map(edge => {
        if (edge.road === null) return null;
        const [p1, p2] = edge.vertexIds.map(vid => toScreen(vertices[vid].x, vertices[vid].y));
        const f = PLAYER_FILL[players[edge.road]?.color]   || '#888';
        const s = PLAYER_STROKE[players[edge.road]?.color] || '#444';
        return (
          <g key={edge.id}>
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={s} strokeWidth="10" strokeLinecap="round" />
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={f} strokeWidth="7"  strokeLinecap="round" />
          </g>
        );
      })}

      {/* ── Valid edge highlights ─────────────────────────────────────────── */}
      {[...validEdges].map(edgeId => {
        const edge = edges[edgeId];
        if (!edge) return null;
        const [p1, p2] = edge.vertexIds.map(vid => toScreen(vertices[vid].x, vertices[vid].y));
        const isHov = hoveredEdge === edgeId;
        const myColor = players[myIndex]?.color;
        return (
          <g key={`ve-${edgeId}`}
            onClick={() => onEdgeClick?.(edgeId)}
            onMouseEnter={() => setHoveredEdge(edgeId)}
            onMouseLeave={() => setHoveredEdge(null)}
            style={{ cursor: 'pointer' }}
          >
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke={isHov ? (PLAYER_FILL[myColor] || '#9a6a18') : 'rgba(154,106,24,0.5)'}
              strokeWidth={isHov ? 10 : 8}
              strokeLinecap="round"
              strokeDasharray={isHov ? 'none' : '7,4'}
            />
          </g>
        );
      })}

      {/* ── Buildings ────────────────────────────────────────────────────── */}
      {Object.values(vertices).map(v => {
        if (!v.building) return null;
        const { x, y } = toScreen(v.x, v.y);
        const player = players[v.owner];
        if (!player) return null;
        return v.building === 'settlement'
          ? <Settlement key={v.id} x={x} y={y} color={player.color} />
          : <City       key={v.id} x={x} y={y} color={player.color} />;
      })}

      {/* ── Valid vertex dots ─────────────────────────────────────────────── */}
      {[...validVertices].map(vid => {
        const v = vertices[vid];
        if (!v) return null;
        const { x, y } = toScreen(v.x, v.y);
        const isHov = hoveredVertex === vid;
        const myColor = players[myIndex]?.color;
        return (
          <g key={`vv-${vid}`}
            onClick={() => onVertexClick?.(vid)}
            onMouseEnter={() => setHoveredVertex(vid)}
            onMouseLeave={() => setHoveredVertex(null)}
            style={{ cursor: 'pointer' }}
          >
            <circle cx={x} cy={y} r={isHov ? 12 : 9}
              fill={isHov ? (PLAYER_FILL[myColor] || '#9a6a18') : 'rgba(154,106,24,0.55)'}
              stroke="white"
              strokeWidth={isHov ? 2.5 : 2}
            />
            {isHov && (
              <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle"
                fill="white" fontSize="11" fontWeight="700">+</text>
            )}
          </g>
        );
      })}

      {/* ── Subtle vertex guide dots ──────────────────────────────────────── */}
      {Object.values(vertices)
        .filter(v => !v.building && !validVertices.has(v.id))
        .map(v => {
          const { x, y } = toScreen(v.x, v.y);
          return <circle key={`d-${v.id}`} cx={x} cy={y} r={2.5}
            fill="rgba(255,255,255,0.35)" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />;
        })}
    </svg>
  );
}
