let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function osc(
  ac: AudioContext,
  type: OscillatorType,
  freq: number,
  start: number,
  dur: number,
  gain: number,
  dest: AudioNode,
  freqEnd?: number,
) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (freqEnd !== undefined) o.frequency.exponentialRampToValueAtTime(freqEnd, start + dur);
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  o.connect(g).connect(dest);
  o.start(start);
  o.stop(start + dur);
}

/** Soft pop — opening the panel. */
export function playOpen() {
  try {
    const ac = getCtx();
    const t = ac.currentTime;
    osc(ac, 'sine', 520, t, 0.08, 0.13, ac.destination, 780);
    osc(ac, 'sine', 880, t + 0.06, 0.12, 0.09, ac.destination, 1100);
  } catch {}
}

/** Reverse pop — closing the panel. */
export function playClose() {
  try {
    const ac = getCtx();
    const t = ac.currentTime;
    osc(ac, 'sine', 680, t, 0.1, 0.1, ac.destination, 400);
  } catch {}
}

/** Light tap — selecting a category card. */
export function playTap() {
  try {
    const ac = getCtx();
    const t = ac.currentTime;
    osc(ac, 'sine', 600, t, 0.06, 0.08, ac.destination, 700);
  } catch {}
}

/** Subtle tick — "More topics", "Change", navigation clicks. */
export function playTick() {
  try {
    const ac = getCtx();
    const t = ac.currentTime;
    osc(ac, 'triangle', 800, t, 0.04, 0.06, ac.destination, 900);
  } catch {}
}

/** Whoosh — message sent. */
export function playSend() {
  try {
    const ac = getCtx();
    const t = ac.currentTime;
    osc(ac, 'sine', 440, t, 0.06, 0.1, ac.destination, 880);
    osc(ac, 'sine', 660, t + 0.04, 0.08, 0.08, ac.destination, 1320);
    osc(ac, 'triangle', 990, t + 0.08, 0.1, 0.05, ac.destination, 1400);
  } catch {}
}

/** Pleasant two-tone chime — success confirmation. */
export function playSuccess() {
  try {
    const ac = getCtx();
    const t = ac.currentTime;
    osc(ac, 'sine', 523, t, 0.15, 0.1, ac.destination);
    osc(ac, 'sine', 659, t + 0.1, 0.15, 0.1, ac.destination);
    osc(ac, 'sine', 784, t + 0.2, 0.22, 0.08, ac.destination);
  } catch {}
}

/** Soft ding — new message received / conversation loaded. */
export function playReceive() {
  try {
    const ac = getCtx();
    const t = ac.currentTime;
    osc(ac, 'sine', 880, t, 0.12, 0.07, ac.destination);
    osc(ac, 'sine', 1100, t + 0.08, 0.14, 0.05, ac.destination);
  } catch {}
}

/** Gentle pop — file attached. */
export function playAttach() {
  try {
    const ac = getCtx();
    const t = ac.currentTime;
    osc(ac, 'sine', 500, t, 0.06, 0.07, ac.destination, 700);
    osc(ac, 'triangle', 900, t + 0.03, 0.06, 0.04, ac.destination, 1000);
  } catch {}
}

/** Soft click — file removed. */
export function playRemove() {
  try {
    const ac = getCtx();
    const t = ac.currentTime;
    osc(ac, 'triangle', 600, t, 0.05, 0.06, ac.destination, 400);
  } catch {}
}

/** Muted click — navigating back. */
export function playBack() {
  try {
    const ac = getCtx();
    const t = ac.currentTime;
    osc(ac, 'sine', 700, t, 0.07, 0.07, ac.destination, 480);
  } catch {}
}
