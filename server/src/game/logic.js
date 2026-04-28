// Full Catan game logic

const RESOURCE_MAP = {
  forest: 'wood',
  pasture: 'sheep',
  fields: 'wheat',
  hills: 'brick',
  mountains: 'ore',
};

// Maps player resource name → port type string
const PORT_MAP = {
  wood:  'lumber',
  sheep: 'wool',
  wheat: 'grain',
  brick: 'brick',
  ore:   'ore',
};

const BUILD_COSTS = {
  road: { wood: 1, brick: 1 },
  settlement: { wood: 1, brick: 1, wheat: 1, sheep: 1 },
  city: { ore: 3, wheat: 2 },
  devCard: { ore: 1, wheat: 1, sheep: 1 },
};

const DEV_CARD_DECK = [
  ...Array(14).fill('knight'),
  ...Array(5).fill('vp'),
  ...Array(2).fill('road_building'),
  ...Array(2).fill('year_of_plenty'),
  ...Array(2).fill('monopoly'),
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function hasResources(player, cost) {
  for (const [res, amount] of Object.entries(cost)) {
    if ((player.resources[res] || 0) < amount) return false;
  }
  return true;
}

function deductResources(player, cost) {
  for (const [res, amount] of Object.entries(cost)) {
    player.resources[res] -= amount;
  }
}

function canPassThrough(state, vertexId, playerIndex) {
  const v = state.board.vertices[vertexId];
  return v.owner === null || v.owner === playerIndex;
}

function dfsRoad(state, vertexId, playerIndex, visited) {
  const v = state.board.vertices[vertexId];
  let result = 0;

  for (const edgeId of v.edgeIds) {
    const edge = state.board.edges[edgeId];
    if (edge.road !== playerIndex) continue;
    if (visited.has(edgeId)) continue;

    const otherVertexId = edge.vertexIds.find(id => id !== vertexId);

    visited.add(edgeId);

    if (canPassThrough(state, otherVertexId, playerIndex)) {
      result = Math.max(result, 1 + dfsRoad(state, otherVertexId, playerIndex, visited));
    } else {
      result = Math.max(result, 1);
    }

    visited.delete(edgeId);
  }

  return result;
}

function longestRoadForPlayer(state, playerIndex) {
  const playerEdges = Object.values(state.board.edges).filter(e => e.road === playerIndex);
  let maxLen = 0;

  for (const edge of playerEdges) {
    for (const startVertex of edge.vertexIds) {
      if (!canPassThrough(state, startVertex, playerIndex)) continue;

      const visited = new Set([edge.id]);
      const otherVertex = edge.vertexIds.find(v => v !== startVertex);

      let len;
      if (canPassThrough(state, otherVertex, playerIndex)) {
        len = 1 + dfsRoad(state, otherVertex, playerIndex, visited);
      } else {
        len = 1;
      }
      maxLen = Math.max(maxLen, len);
    }
  }

  return maxLen;
}

function updateLongestRoad(state) {
  const lengths = state.players.map((_, i) => longestRoadForPlayer(state, i));
  const maxLen = Math.max(...lengths);

  if (maxLen < 5) {
    // No one qualifies
    if (state.longestRoadOwner !== null) {
      state.players[state.longestRoadOwner].hasLongestRoad = false;
      state.longestRoadOwner = null;
    }
    return;
  }

  const candidates = lengths.map((l, i) => ({ l, i })).filter(x => x.l === maxLen);

  if (state.longestRoadOwner !== null) {
    const ownerLen = lengths[state.longestRoadOwner];
    const challenger = candidates.find(c => c.i !== state.longestRoadOwner && c.l > ownerLen);
    if (challenger) {
      const prev = state.longestRoadOwner;
      state.players[prev].hasLongestRoad = false;
      state.longestRoadOwner = challenger.i;
      state.players[challenger.i].hasLongestRoad = true;
      state.players[prev].vp = calculateVP(state, prev);
      state.players[prev].vpPublic = calculatePublicVP(state, prev);
      state.players[challenger.i].vp = calculateVP(state, challenger.i);
      state.players[challenger.i].vpPublic = calculatePublicVP(state, challenger.i);
      state.log.push(`${state.players[challenger.i].name} takes Longest Road!`);
    }
  } else {
    if (candidates.length > 0) {
      const winner = candidates[0];
      state.longestRoadOwner = winner.i;
      state.players[winner.i].hasLongestRoad = true;
      state.players[winner.i].vp = calculateVP(state, winner.i);
      state.players[winner.i].vpPublic = calculatePublicVP(state, winner.i);
      state.log.push(`${state.players[winner.i].name} claims Longest Road!`);
    }
  }
}

function updateLargestArmy(state) {
  const maxKnights = Math.max(...state.players.map(p => p.knightsPlayed));
  if (maxKnights < 3) return;

  const candidates = state.players
    .map((p, i) => ({ knights: p.knightsPlayed, i }))
    .filter(x => x.knights === maxKnights);

  if (state.largestArmyOwner !== null) {
    const ownerKnights = state.players[state.largestArmyOwner].knightsPlayed;
    const challenger = candidates.find(c => c.i !== state.largestArmyOwner && c.knights > ownerKnights);
    if (challenger) {
      const prev = state.largestArmyOwner;
      state.players[prev].hasLargestArmy = false;
      state.largestArmyOwner = challenger.i;
      state.players[challenger.i].hasLargestArmy = true;
      state.players[prev].vp = calculateVP(state, prev);
      state.players[prev].vpPublic = calculatePublicVP(state, prev);
      state.players[challenger.i].vp = calculateVP(state, challenger.i);
      state.players[challenger.i].vpPublic = calculatePublicVP(state, challenger.i);
      state.log.push(`${state.players[challenger.i].name} takes Largest Army!`);
    }
  } else {
    if (candidates.length > 0) {
      const winner = candidates[0];
      state.largestArmyOwner = winner.i;
      state.players[winner.i].hasLargestArmy = true;
      state.players[winner.i].vp = calculateVP(state, winner.i);
      state.players[winner.i].vpPublic = calculatePublicVP(state, winner.i);
      state.log.push(`${state.players[winner.i].name} claims Largest Army!`);
    }
  }
}

function calculateVP(state, playerIndex) {
  const p = state.players[playerIndex];
  let vp = p.settlements.length;
  vp += p.cities.length * 2;
  if (p.hasLongestRoad) vp += 2;
  if (p.hasLargestArmy) vp += 2;
  vp += p.devCards.filter(c => c === 'vp').length;
  return vp;
}

function calculatePublicVP(state, playerIndex) {
  const p = state.players[playerIndex];
  let vp = p.settlements.length;
  vp += p.cities.length * 2;
  if (p.hasLongestRoad) vp += 2;
  if (p.hasLargestArmy) vp += 2;
  return vp;
}

function checkWin(state) {
  for (let i = 0; i < state.players.length; i++) {
    if (calculateVP(state, i) >= 10) return i;
  }
  return null;
}

function advanceSetup(state) {
  const n = state.players.length;
  if (state.phase === 'setup1') {
    if (state.currentPlayer < n - 1) {
      state.currentPlayer++;
    } else {
      state.phase = 'setup2';
      // currentPlayer stays at n-1
    }
  } else if (state.phase === 'setup2') {
    if (state.currentPlayer > 0) {
      state.currentPlayer--;
    } else {
      state.phase = 'playing';
      state.currentPlayer = 0;
      state.diceRolled = false;
      state.log.push('Game begins! Roll the dice to start your turn.');
    }
  }
  state.setupAction = 'settlement';
  if (state.phase !== 'playing') {
    const phaseName = state.phase === 'setup1' ? 'first' : 'second';
    state.log.push(`${state.players[state.currentPlayer].name}: place your ${phaseName} settlement.`);
  }
}

// --- Action handlers ---

function handlePlaceSettlement(state, { vertexId }, playerIndex) {
  if (state.phase !== 'setup1' && state.phase !== 'setup2') {
    return { error: 'Not in setup phase' };
  }
  if (state.currentPlayer !== playerIndex) return { error: 'Not your turn' };
  if (state.setupAction !== 'settlement') return { error: 'Place your road next' };

  const vertex = state.board.vertices[vertexId];
  if (!vertex) return { error: 'Invalid vertex' };
  if (vertex.building !== null) return { error: 'Vertex occupied' };

  for (const adjId of vertex.adjacentVertexIds) {
    if (state.board.vertices[adjId].building !== null) {
      return { error: 'Too close to another settlement' };
    }
  }

  const s = deepClone(state);
  s.board.vertices[vertexId].building = 'settlement';
  s.board.vertices[vertexId].owner = playerIndex;
  s.players[playerIndex].settlements.push(vertexId);
  s.players[playerIndex].vp = calculateVP(s, playerIndex);
  s.players[playerIndex].vpPublic = calculatePublicVP(s, playerIndex);

  if (state.phase === 'setup2') {
    for (const tileId of vertex.tileIds) {
      const tile = s.board.tiles[tileId];
      if (tile.resource && tile.resource !== 'desert') {
        const res = RESOURCE_MAP[tile.resource];
        s.players[playerIndex].resources[res] = (s.players[playerIndex].resources[res] || 0) + 1;
        s.log.push(`${s.players[playerIndex].name} receives 1 ${res}`);
      }
    }
  }

  s.setupAction = 'road';
  s.log.push(`${s.players[playerIndex].name} placed a settlement`);

  return { state: s };
}

function handlePlaceRoad(state, { edgeId }, playerIndex) {
  if (state.phase !== 'setup1' && state.phase !== 'setup2') {
    return { error: 'Not in setup phase' };
  }
  if (state.currentPlayer !== playerIndex) return { error: 'Not your turn' };
  if (state.setupAction !== 'road') return { error: 'Place your settlement first' };

  const edge = state.board.edges[edgeId];
  if (!edge) return { error: 'Invalid edge' };
  if (edge.road !== null) return { error: 'Road already exists' };

  const player = state.players[playerIndex];
  const lastSettlement = player.settlements[player.settlements.length - 1];
  if (!edge.vertexIds.includes(lastSettlement)) {
    return { error: 'Road must connect to your settlement' };
  }

  const s = deepClone(state);
  s.board.edges[edgeId].road = playerIndex;
  s.players[playerIndex].roads.push(edgeId);
  updateLongestRoad(s);
  s.log.push(`${s.players[playerIndex].name} placed a road`);
  advanceSetup(s);

  const winner = checkWin(s);
  if (winner !== null) s.winner = winner;

  return { state: s };
}

function handleRollDice(state, playerIndex) {
  if (state.phase !== 'playing') return { error: 'Game not in progress' };
  if (state.currentPlayer !== playerIndex) return { error: 'Not your turn' };
  if (state.diceRolled) return { error: 'Already rolled' };

  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  const total = d1 + d2;

  const s = deepClone(state);
  s.diceRolled = true;
  s.diceValues = [d1, d2];
  s.log.push(`${s.players[playerIndex].name} rolled ${d1}+${d2}=${total}`);

  if (total === 7) {
    s.mustMoveRobber = true;
    // Force discard: players with >7 cards lose half
    for (let i = 0; i < s.players.length; i++) {
      const p = s.players[i];
      const total_res = Object.values(p.resources).reduce((a, b) => a + b, 0);
      if (total_res > 7) {
        const toDiscard = Math.floor(total_res / 2);
        // Auto-discard randomly
        let remaining = toDiscard;
        const resKeys = Object.keys(p.resources).filter(k => p.resources[k] > 0);
        while (remaining > 0 && resKeys.length > 0) {
          const pick = resKeys[Math.floor(Math.random() * resKeys.length)];
          if (p.resources[pick] > 0) {
            p.resources[pick]--;
            remaining--;
          }
          if (p.resources[pick] === 0) resKeys.splice(resKeys.indexOf(pick), 1);
        }
        s.log.push(`${p.name} discards ${toDiscard} cards (robber)`);
      }
    }
    s.log.push('Robber! Move the robber to a new tile.');
  } else {
    // Distribute resources
    for (const tile of s.board.tiles) {
      if (tile.number !== total || tile.hasRobber) continue;
      const res = RESOURCE_MAP[tile.resource];
      if (!res) continue;

      for (const vertId of tile.vertexIds) {
        const vert = s.board.vertices[vertId];
        if (vert.owner !== null) {
          const amount = vert.building === 'city' ? 2 : 1;
          s.players[vert.owner].resources[res] = (s.players[vert.owner].resources[res] || 0) + amount;
        }
      }
    }
    s.log.push(`Resources distributed for roll ${total}`);
  }

  return { state: s };
}

function handleMoveRobber(state, { tileId, stealFrom }, playerIndex) {
  if (!state.mustMoveRobber) return { error: 'No need to move robber' };
  if (state.currentPlayer !== playerIndex) return { error: 'Not your turn' };

  const tile = state.board.tiles[tileId];
  if (!tile) return { error: 'Invalid tile' };
  if (tile.id === state.board.robberTile) return { error: 'Must move robber to a different tile' };

  const s = deepClone(state);
  s.board.tiles[s.board.robberTile].hasRobber = false;
  s.board.tiles[tileId].hasRobber = true;
  s.board.robberTile = tileId;
  s.mustMoveRobber = false;

  // Steal from target player
  if (stealFrom !== null && stealFrom !== undefined && stealFrom !== playerIndex) {
    const target = s.players[stealFrom];
    const availRes = Object.keys(target.resources).filter(k => target.resources[k] > 0);
    if (availRes.length > 0) {
      const stolen = availRes[Math.floor(Math.random() * availRes.length)];
      target.resources[stolen]--;
      s.players[playerIndex].resources[stolen] = (s.players[playerIndex].resources[stolen] || 0) + 1;
      s.log.push(`${s.players[playerIndex].name} stole 1 ${stolen} from ${target.name}`);
    }
  }

  s.log.push(`${s.players[playerIndex].name} moved the robber to ${tile.resource}`);
  return { state: s };
}

function handleBuildSettlement(state, { vertexId }, playerIndex) {
  if (state.phase !== 'playing') return { error: 'Game not in progress' };
  if (state.currentPlayer !== playerIndex) return { error: 'Not your turn' };
  if (!state.diceRolled) return { error: 'Must roll dice first' };

  const player = state.players[playerIndex];
  if (!hasResources(player, BUILD_COSTS.settlement)) {
    return { error: 'Not enough resources' };
  }

  const vertex = state.board.vertices[vertexId];
  if (!vertex) return { error: 'Invalid vertex' };
  if (vertex.building !== null) return { error: 'Vertex occupied' };

  for (const adjId of vertex.adjacentVertexIds) {
    if (state.board.vertices[adjId].building !== null) {
      return { error: 'Too close to another settlement' };
    }
  }

  // Must be adjacent to player's road
  const hasAdjacentRoad = vertex.edgeIds.some(eid => {
    return state.board.edges[eid].road === playerIndex;
  });
  if (!hasAdjacentRoad) return { error: 'Must be adjacent to your road' };

  const s = deepClone(state);
  deductResources(s.players[playerIndex], BUILD_COSTS.settlement);
  s.board.vertices[vertexId].building = 'settlement';
  s.board.vertices[vertexId].owner = playerIndex;
  s.players[playerIndex].settlements.push(vertexId);
  s.players[playerIndex].vp = calculateVP(s, playerIndex);
  s.players[playerIndex].vpPublic = calculatePublicVP(s, playerIndex);
  updateLongestRoad(s);
  s.log.push(`${s.players[playerIndex].name} built a settlement`);

  const winner = checkWin(s);
  if (winner !== null) s.winner = winner;

  return { state: s };
}

function handleBuildCity(state, { vertexId }, playerIndex) {
  if (state.phase !== 'playing') return { error: 'Game not in progress' };
  if (state.currentPlayer !== playerIndex) return { error: 'Not your turn' };
  if (!state.diceRolled) return { error: 'Must roll dice first' };

  const player = state.players[playerIndex];
  if (!hasResources(player, BUILD_COSTS.city)) {
    return { error: 'Not enough resources' };
  }

  const vertex = state.board.vertices[vertexId];
  if (!vertex) return { error: 'Invalid vertex' };
  if (vertex.building !== 'settlement' || vertex.owner !== playerIndex) {
    return { error: 'Must upgrade your own settlement' };
  }

  const s = deepClone(state);
  deductResources(s.players[playerIndex], BUILD_COSTS.city);
  s.board.vertices[vertexId].building = 'city';
  s.players[playerIndex].settlements = s.players[playerIndex].settlements.filter(v => v !== vertexId);
  s.players[playerIndex].cities.push(vertexId);
  s.players[playerIndex].vp = calculateVP(s, playerIndex);
  s.players[playerIndex].vpPublic = calculatePublicVP(s, playerIndex);
  s.log.push(`${s.players[playerIndex].name} built a city`);

  const winner = checkWin(s);
  if (winner !== null) s.winner = winner;

  return { state: s };
}

function handleBuildRoad(state, { edgeId }, playerIndex) {
  if (state.phase !== 'playing') return { error: 'Game not in progress' };
  if (state.currentPlayer !== playerIndex) return { error: 'Not your turn' };
  if (!state.diceRolled && !state.freeRoads) return { error: 'Must roll dice first' };

  const player = state.players[playerIndex];
  if (!state.freeRoads && !hasResources(player, BUILD_COSTS.road)) {
    return { error: 'Not enough resources' };
  }

  const edge = state.board.edges[edgeId];
  if (!edge) return { error: 'Invalid edge' };
  if (edge.road !== null) return { error: 'Road already exists' };

  // Must connect to existing road or settlement
  const hasConnection = edge.vertexIds.some(vid => {
    const v = state.board.vertices[vid];
    if (v.owner === playerIndex) return true;
    return v.edgeIds.some(eid => state.board.edges[eid].road === playerIndex);
  });
  if (!hasConnection) return { error: 'Road must connect to your network' };

  // Cannot build through opponent's settlement
  const blocked = edge.vertexIds.some(vid => {
    const v = state.board.vertices[vid];
    return v.owner !== null && v.owner !== playerIndex;
  });
  if (blocked) return { error: 'Blocked by opponent\'s settlement' };

  const s = deepClone(state);
  if (!s.freeRoads) {
    deductResources(s.players[playerIndex], BUILD_COSTS.road);
  } else {
    s.freeRoads--;
    if (s.freeRoads <= 0) delete s.freeRoads;
  }
  s.board.edges[edgeId].road = playerIndex;
  s.players[playerIndex].roads.push(edgeId);
  updateLongestRoad(s);
  s.log.push(`${s.players[playerIndex].name} built a road`);

  return { state: s };
}

function handleBuyDevCard(state, playerIndex) {
  if (state.phase !== 'playing') return { error: 'Game not in progress' };
  if (state.currentPlayer !== playerIndex) return { error: 'Not your turn' };
  if (!state.diceRolled) return { error: 'Must roll dice first' };

  const player = state.players[playerIndex];
  if (!hasResources(player, BUILD_COSTS.devCard)) return { error: 'Not enough resources' };
  if (state.devCardDeck.length === 0) return { error: 'No dev cards left' };

  const s = deepClone(state);
  deductResources(s.players[playerIndex], BUILD_COSTS.devCard);
  const card = s.devCardDeck.pop();
  s.players[playerIndex].devCards.push(card);
  if (card === 'vp') {
    s.players[playerIndex].vp = calculateVP(s, playerIndex);
  }
  s.log.push(`${s.players[playerIndex].name} bought a development card`);

  const winner = checkWin(s);
  if (winner !== null) s.winner = winner;

  return { state: s };
}

function handlePlayDevCard(state, { cardType, params }, playerIndex) {
  if (state.phase !== 'playing') return { error: 'Game not in progress' };
  if (state.currentPlayer !== playerIndex) return { error: 'Not your turn' };
  if (state.devCardPlayed) return { error: 'Already played a dev card this turn' };

  const player = state.players[playerIndex];
  const cardIdx = player.devCards.indexOf(cardType);
  if (cardIdx === -1) return { error: 'You don\'t have that card' };

  // VP cards can't be played (they count automatically)
  if (cardType === 'vp') return { error: 'VP cards count automatically' };

  const s = deepClone(state);
  s.players[playerIndex].devCards.splice(cardIdx, 1);
  s.players[playerIndex].playedDevCards.push(cardType);
  s.devCardPlayed = true;

  switch (cardType) {
    case 'knight': {
      s.players[playerIndex].knightsPlayed++;
      s.mustMoveRobber = true;
      updateLargestArmy(s);
      s.players[playerIndex].vp = calculateVP(s, playerIndex);
      s.players[playerIndex].vpPublic = calculatePublicVP(s, playerIndex);
      s.log.push(`${s.players[playerIndex].name} plays Knight!`);
      break;
    }
    case 'road_building': {
      s.freeRoads = 2;
      s.log.push(`${s.players[playerIndex].name} plays Road Building! Place 2 roads.`);
      break;
    }
    case 'year_of_plenty': {
      const { res1, res2 } = params || {};
      if (res1) s.players[playerIndex].resources[res1] = (s.players[playerIndex].resources[res1] || 0) + 1;
      if (res2) s.players[playerIndex].resources[res2] = (s.players[playerIndex].resources[res2] || 0) + 1;
      s.log.push(`${s.players[playerIndex].name} plays Year of Plenty! Gains ${res1} and ${res2}.`);
      break;
    }
    case 'monopoly': {
      const { resource } = params || {};
      if (!resource) return { error: 'Must specify a resource' };
      let total = 0;
      for (let i = 0; i < s.players.length; i++) {
        if (i === playerIndex) continue;
        const amt = s.players[i].resources[resource] || 0;
        s.players[i].resources[resource] = 0;
        s.players[playerIndex].resources[resource] = (s.players[playerIndex].resources[resource] || 0) + amt;
        total += amt;
      }
      s.log.push(`${s.players[playerIndex].name} plays Monopoly on ${resource}! Gains ${total}.`);
      break;
    }
  }

  const winner = checkWin(s);
  if (winner !== null) s.winner = winner;

  return { state: s };
}

function handleBankTrade(state, { give, giveAmount, receive }, playerIndex) {
  if (state.phase !== 'playing') return { error: 'Game not in progress' };
  if (state.currentPlayer !== playerIndex) return { error: 'Not your turn' };
  if (!state.diceRolled) return { error: 'Must roll dice first' };

  const player = state.players[playerIndex];

  // Determine trade rate
  let rate = 4;
  // Check for 3:1 port
  const allVertices = [...player.settlements, ...player.cities];
  for (const vid of allVertices) {
    const v = state.board.vertices[vid];
    if (!v) continue;
    if (v.port === '3:1') { rate = Math.min(rate, 3); }
    if (v.port === PORT_MAP[give]) { rate = 2; }
  }

  if ((player.resources[give] || 0) < rate) {
    return { error: `Need ${rate} ${give} for this trade` };
  }

  const s = deepClone(state);
  s.players[playerIndex].resources[give] -= rate;
  s.players[playerIndex].resources[receive] = (s.players[playerIndex].resources[receive] || 0) + 1;
  s.log.push(`${s.players[playerIndex].name} traded ${rate} ${give} for 1 ${receive}`);

  return { state: s };
}

function handleOfferTrade(state, { offer, request, targetPlayer }, playerIndex) {
  if (state.phase !== 'playing') return { error: 'Game not in progress' };
  if (state.currentPlayer !== playerIndex) return { error: 'Not your turn' };
  if (!state.diceRolled) return { error: 'Must roll dice first' };

  const s = deepClone(state);
  s.tradeOffer = { from: playerIndex, offer, request, targetPlayer: targetPlayer ?? null };
  s.log.push(`${s.players[playerIndex].name} offers a trade`);

  return { state: s };
}

function handleRespondTrade(state, { accept }, playerIndex) {
  if (!state.tradeOffer) return { error: 'No active trade offer' };
  if (state.tradeOffer.from === playerIndex) return { error: 'Cannot respond to own offer' };
  if (state.tradeOffer.targetPlayer !== null && state.tradeOffer.targetPlayer !== playerIndex) {
    return { error: 'This trade is not directed at you' };
  }

  const s = deepClone(state);

  if (!accept) {
    s.tradeOffer = null;
    s.log.push(`${s.players[playerIndex].name} declined the trade`);
    return { state: s };
  }

  const { from, offer, request } = state.tradeOffer;
  const fromPlayer = s.players[from];
  const toPlayer = s.players[playerIndex];

  // Validate resources
  for (const [res, amt] of Object.entries(offer)) {
    if ((fromPlayer.resources[res] || 0) < amt) return { error: 'Offerer no longer has those resources' };
  }
  for (const [res, amt] of Object.entries(request)) {
    if ((toPlayer.resources[res] || 0) < amt) return { error: 'You don\'t have those resources' };
  }

  // Execute trade
  for (const [res, amt] of Object.entries(offer)) {
    fromPlayer.resources[res] -= amt;
    toPlayer.resources[res] = (toPlayer.resources[res] || 0) + amt;
  }
  for (const [res, amt] of Object.entries(request)) {
    toPlayer.resources[res] -= amt;
    fromPlayer.resources[res] = (fromPlayer.resources[res] || 0) + amt;
  }

  s.tradeOffer = null;
  s.log.push(`${s.players[from].name} and ${s.players[playerIndex].name} traded`);

  return { state: s };
}

function handleEndTurn(state, playerIndex) {
  if (state.phase !== 'playing') return { error: 'Game not in progress' };
  if (state.currentPlayer !== playerIndex) return { error: 'Not your turn' };
  if (!state.diceRolled) return { error: 'Must roll dice first' };
  if (state.mustMoveRobber) return { error: 'Must move the robber first' };

  const s = deepClone(state);
  s.currentPlayer = (playerIndex + 1) % s.players.length;
  s.diceRolled = false;
  s.diceValues = null;
  s.tradeOffer = null;
  s.devCardPlayed = false;
  if (s.freeRoads) delete s.freeRoads;
  s.log.push(`${s.players[s.currentPlayer].name}'s turn. Roll the dice!`);

  return { state: s };
}

export function createDevDeck() {
  return shuffle([...DEV_CARD_DECK]);
}

export function processAction(state, action, payload, playerIndex) {
  switch (action) {
    case 'place_settlement': return handlePlaceSettlement(state, payload, playerIndex);
    case 'place_road': return handlePlaceRoad(state, payload, playerIndex);
    case 'roll_dice': return handleRollDice(state, playerIndex);
    case 'move_robber': return handleMoveRobber(state, payload, playerIndex);
    case 'build_settlement': return handleBuildSettlement(state, payload, playerIndex);
    case 'build_city': return handleBuildCity(state, payload, playerIndex);
    case 'build_road': return handleBuildRoad(state, payload, playerIndex);
    case 'buy_dev_card': return handleBuyDevCard(state, playerIndex);
    case 'play_dev_card': return handlePlayDevCard(state, payload, playerIndex);
    case 'bank_trade': return handleBankTrade(state, payload, playerIndex);
    case 'offer_trade': return handleOfferTrade(state, payload, playerIndex);
    case 'respond_trade': return handleRespondTrade(state, payload, playerIndex);
    case 'end_turn': return handleEndTurn(state, playerIndex);
    default: return { error: 'Unknown action' };
  }
}
