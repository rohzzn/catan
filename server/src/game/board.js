// Hex board generation for Catan
// Uses flat-top hexagons in axial (q, r) coordinates
// Server coordinate system uses HEX_SIZE=100

const HEX_SIZE = 100;
const SQRT3 = Math.sqrt(3);

// All 19 tile positions: max(|q|, |r|, |q+r|) <= 2
export const TILE_COORDS = [];
for (let q = -2; q <= 2; q++) {
  for (let r = -2; r <= 2; r++) {
    if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) <= 2) {
      TILE_COORDS.push({ q, r });
    }
  }
}

// Resource distribution
const RESOURCES = [
  'forest', 'forest', 'forest', 'forest',
  'pasture', 'pasture', 'pasture', 'pasture',
  'fields', 'fields', 'fields', 'fields',
  'hills', 'hills', 'hills',
  'mountains', 'mountains', 'mountains',
  'desert',
];

// Number tokens (18 tokens, 1 per non-desert tile)
const NUMBERS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

// Neighbor direction vectors (flat-top axial):
// 0=E, 1=SE, 2=SW, 3=W, 4=NW, 5=NE
const DIR_VECTORS = [
  [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1],
];

// For each neighbor direction d, the edge of hex (q,r) facing that direction
// connects hex vertices (EDGE_VERTS[d][0]) and (EDGE_VERTS[d][1])
// Flat-top vertex 0=right, going clockwise
const EDGE_VERTS = [
  [0, 1], // E
  [1, 2], // SE
  [2, 3], // SW
  [3, 4], // W
  [4, 5], // NW
  [5, 0], // NE
];

// Port specs: [hexQ, hexR, edgeDir, portType]
const PORT_SPECS = [
  [0, -2, 4, '3:1'],
  [2, -2, 5, 'grain'],
  [2, -1, 0, '3:1'],
  [2, 0, 1, 'ore'],
  [0, 2, 1, '3:1'],
  [-1, 2, 2, 'brick'],
  [-2, 2, 3, '3:1'],
  [-2, 0, 3, 'wool'],
  [-1, -1, 4, 'lumber'],
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hexCenter(q, r) {
  return {
    x: HEX_SIZE * 1.5 * q,
    y: HEX_SIZE * (SQRT3 / 2 * q + SQRT3 * r),
  };
}

function vertexPos(cx, cy, idx) {
  const angle = (idx * Math.PI) / 3;
  return {
    x: cx + HEX_SIZE * Math.cos(angle),
    y: cy + HEX_SIZE * Math.sin(angle),
  };
}

function vkey(x, y) {
  return `${Math.round(x)},${Math.round(y)}`;
}

export function generateBoard() {
  const resources = shuffle([...RESOURCES]);
  const numbers = shuffle([...NUMBERS]);

  const tiles = [];
  const vertexMap = new Map();
  const edgeMap = new Map();
  let numberIdx = 0;

  TILE_COORDS.forEach((coords, tileIdx) => {
    const { q, r } = coords;
    const resource = resources[tileIdx];
    const isDesert = resource === 'desert';
    const number = isDesert ? null : numbers[numberIdx++];

    const { x: cx, y: cy } = hexCenter(q, r);

    const tileVertexIds = [];
    const tileEdgeIds = [];
    const vertKeys = [];

    // Compute 6 vertices
    for (let i = 0; i < 6; i++) {
      const { x, y } = vertexPos(cx, cy, i);
      const key = vkey(x, y);
      vertKeys.push(key);
      tileVertexIds.push(key);

      if (!vertexMap.has(key)) {
        vertexMap.set(key, {
          id: key,
          x: Math.round(x),
          y: Math.round(y),
          tileIds: [],
          edgeIds: [],
          adjacentVertexIds: [],
          building: null,
          owner: null,
          port: null,
        });
      }
      vertexMap.get(key).tileIds.push(tileIdx);
    }

    // Compute 6 edges
    for (let i = 0; i < 6; i++) {
      const v1 = vertKeys[i];
      const v2 = vertKeys[(i + 1) % 6];
      const edgeKey = [v1, v2].sort().join('|');
      tileEdgeIds.push(edgeKey);

      if (!edgeMap.has(edgeKey)) {
        edgeMap.set(edgeKey, {
          id: edgeKey,
          vertexIds: [v1, v2],
          tileIds: [],
          road: null,
        });
        vertexMap.get(v1).edgeIds.push(edgeKey);
        vertexMap.get(v2).edgeIds.push(edgeKey);
      }
      edgeMap.get(edgeKey).tileIds.push(tileIdx);
    }

    tiles.push({
      id: tileIdx,
      q, r,
      x: Math.round(cx),
      y: Math.round(cy),
      resource,
      number,
      hasRobber: isDesert,
      vertexIds: tileVertexIds,
      edgeIds: tileEdgeIds,
    });
  });

  // Build adjacency between vertices
  for (const vertex of vertexMap.values()) {
    const seen = new Set();
    for (const edgeId of vertex.edgeIds) {
      const edge = edgeMap.get(edgeId);
      for (const vId of edge.vertexIds) {
        if (vId !== vertex.id && !seen.has(vId)) {
          seen.add(vId);
          vertex.adjacentVertexIds.push(vId);
        }
      }
    }
  }

  // Place ports on coastal vertices
  const tileByCoord = new Map();
  tiles.forEach(t => tileByCoord.set(`${t.q},${t.r}`, t));

  for (const [hexQ, hexR, dir, portType] of PORT_SPECS) {
    const tile = tileByCoord.get(`${hexQ},${hexR}`);
    if (!tile) continue;
    const [vi1, vi2] = EDGE_VERTS[dir];
    const vKey1 = tile.vertexIds[vi1];
    const vKey2 = tile.vertexIds[vi2];
    if (vertexMap.has(vKey1)) vertexMap.get(vKey1).port = portType;
    if (vertexMap.has(vKey2)) vertexMap.get(vKey2).port = portType;
  }

  const desertTile = tiles.find(t => t.resource === 'desert');

  return {
    tiles,
    vertices: Object.fromEntries(vertexMap),
    edges: Object.fromEntries(edgeMap),
    robberTile: desertTile ? desertTile.id : 0,
  };
}
