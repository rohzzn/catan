// Procedural sound generation via Web Audio API

let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

function master(gain = 0.3) {
  const ac = getCtx();
  const g = ac.createGain();
  g.gain.value = gain;
  g.connect(ac.destination);
  return { ac, g };
}

function tone(freq, type, duration, startGain, endGain, delay = 0) {
  const { ac, g } = master(startGain);
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + delay);
  g.gain.setValueAtTime(startGain, ac.currentTime + delay);
  g.gain.exponentialRampToValueAtTime(endGain || 0.001, ac.currentTime + delay + duration);
  osc.connect(g);
  osc.start(ac.currentTime + delay);
  osc.stop(ac.currentTime + delay + duration);
}

function noise(duration, startGain = 0.2, endGain = 0.001) {
  const ac = getCtx();
  const bufSize = ac.sampleRate * duration;
  const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

  const src = ac.createBufferSource();
  src.buffer = buf;

  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 300;
  filter.Q.value = 0.5;

  const g = ac.createGain();
  g.gain.setValueAtTime(startGain, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(endGain, ac.currentTime + duration);

  src.connect(filter);
  filter.connect(g);
  g.connect(ac.destination);
  src.start();
  src.stop(ac.currentTime + duration);
}

export const sounds = {
  click() {
    tone(800, 'sine', 0.05, 0.15, 0.001);
  },

  diceRoll() {
    noise(0.4, 0.3, 0.001);
    tone(220, 'square', 0.1, 0.1, 0.001, 0.1);
    tone(180, 'square', 0.1, 0.1, 0.001, 0.25);
  },

  placeSettlement() {
    tone(523, 'sine', 0.15, 0.3, 0.001);
    tone(659, 'sine', 0.2, 0.2, 0.001, 0.1);
    tone(784, 'sine', 0.25, 0.25, 0.001, 0.2);
  },

  placeCity() {
    tone(523, 'sine', 0.15, 0.3, 0.001);
    tone(659, 'sine', 0.15, 0.3, 0.001, 0.1);
    tone(784, 'sine', 0.15, 0.3, 0.001, 0.2);
    tone(1047, 'sine', 0.35, 0.3, 0.001, 0.3);
  },

  placeRoad() {
    noise(0.15, 0.2, 0.001);
    tone(330, 'square', 0.1, 0.15, 0.001);
  },

  collectResource() {
    tone(660, 'sine', 0.12, 0.2, 0.001);
    tone(880, 'sine', 0.12, 0.15, 0.001, 0.08);
  },

  robber() {
    tone(110, 'sawtooth', 0.5, 0.3, 0.001);
    tone(90, 'sawtooth', 0.5, 0.25, 0.001, 0.2);
  },

  devCard() {
    tone(440, 'sine', 0.08, 0.2, 0.001);
    tone(550, 'sine', 0.08, 0.2, 0.001, 0.06);
    tone(660, 'sine', 0.12, 0.2, 0.001, 0.12);
  },

  trade() {
    tone(440, 'sine', 0.1, 0.2, 0.001);
    tone(550, 'sine', 0.1, 0.2, 0.001, 0.1);
    tone(440, 'sine', 0.1, 0.2, 0.001, 0.2);
  },

  win() {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((f, i) => tone(f, 'sine', 0.3, 0.3, 0.001, i * 0.15));
  },

  error() {
    tone(200, 'sawtooth', 0.15, 0.2, 0.001);
    tone(150, 'sawtooth', 0.15, 0.2, 0.001, 0.1);
  },

  yourTurn() {
    tone(880, 'sine', 0.15, 0.25, 0.001);
    tone(1100, 'sine', 0.2, 0.2, 0.001, 0.12);
  },
};

export function initAudio() {
  // Unlock audio context on user gesture
  try { getCtx(); } catch (_) {}
}
