// ============================================================
// audio.js – dźwięki syntezowane przez Web Audio API
//
// Nie używamy zewnętrznych plików .mp3/.wav – dźwięki generowane są
// programowo przez oscylatory. AudioContext musi być zainicjowany
// po interakcji użytkownika (wymóg przeglądarek).
// ============================================================

let ctx = null;
let musicTimeout = null;
let musicPlaying = false;

/** Inicjalizuje AudioContext – wywołać po pierwszym kliknięciu */
export function initAudio() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
}

// ------------------------------------------------------------
// Muzyka w tle – prosta chiptune'owa melodia w kółko
// Sekwencja: częstotliwość (Hz) + czas trwania w ms
// ------------------------------------------------------------
const MUSIC_SEQ = [
    [392,120],[330,120],[392,120],[523,120],[659,240],
    [587,120],[523,120],[494,120],[440,120],[392,240],
    [330,120],[294,120],[330,120],[440,120],[523,240],
    [494,120],[440,120],[415,120],[370,120],[330,240],
    [392,120],[330,120],[294,120],[262,120],[294,240],
    [330,120],[392,120],[440,120],[494,120],[523,240],
];

let musicNoteIdx = 0;

function playNextNote() {
    if (!musicPlaying || !ctx) return;
    const [freq, dur] = MUSIC_SEQ[musicNoteIdx % MUSIC_SEQ.length];
    musicNoteIdx++;

    // Cicha nuta – square wave z niską głośnością
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur / 1000);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur / 1000);

    musicTimeout = setTimeout(playNextNote, dur * 0.85);
}

export function startMusic() {
    if (musicPlaying) return;
    musicPlaying = true;
    musicNoteIdx = 0;
    playNextNote();
}

export function stopMusic() {
    musicPlaying = false;
    if (musicTimeout) { clearTimeout(musicTimeout); musicTimeout = null; }
}

export function pauseMusic() { stopMusic(); }
export function resumeMusic() { startMusic(); }

/**
 * Odgrywa pojedynczy ton.
 * @param {number} freq      – częstotliwość w Hz
 * @param {number} duration  – czas trwania w sekundach
 * @param {string} type      – kształt fali: 'square' | 'sine' | 'sawtooth'
 * @param {number} volume    – głośność 0–1
 * @param {number} delay     – opóźnienie startu w sekundach
 */
function tone(freq, duration, type = 'square', volume = 0.25, delay = 0) {
    if (!ctx) return;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

    gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.01);
}

// Alternatywny dźwięk "waka" – zmienia się co zebraną kulkę
let wakaPhase = false;

/** Dźwięk zbierania małej kulki – klasyczne waka-waka */
export function soundDot() {
    tone(wakaPhase ? 220 : 160, 0.055, 'square', 0.15);
    wakaPhase = !wakaPhase;
}

/** Dźwięk zbierania power pelletu – wznoszące arpegio */
export function soundPellet() {
    [280, 380, 500, 660].forEach((f, i) => tone(f, 0.1, 'square', 0.22, i * 0.07));
}

/** Dźwięk zjadania ducha – krótki dwutonowy efekt */
export function soundEatGhost() {
    tone(700, 0.06, 'square', 0.3, 0);
    tone(500, 0.08, 'square', 0.3, 0.07);
    tone(300, 0.12, 'square', 0.25, 0.16);
}

/** Dźwięk śmierci Pacmana – opadająca melodia */
export function soundDeath() {
    const notes = [480, 430, 380, 330, 280, 230, 180, 140, 100];
    notes.forEach((f, i) => tone(f, 0.13, 'square', 0.28, i * 0.09));
}

/** Dźwięk wygranej – wesołe arpegio w górę */
export function soundWin() {
    const notes = [262, 330, 392, 523, 659, 784, 1047];
    notes.forEach((f, i) => tone(f, 0.18, 'sine', 0.28, i * 0.1));
}
