// ============================================================
// main.js – punkt startowy gry
// ============================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { CELL, COLS, ROWS, DIFFICULTIES } from './config.js';
import { GHOST_COLORS }                   from './config.js';
import { buildMaze, PACMAN_START, GHOST_STARTS, colToX, rowToZ } from './maze.js';
import { Pacman } from './characters.js';
import { Ghost  } from './characters.js';
import { initAudio, startMusic, stopMusic, pauseMusic, resumeMusic,
         soundDot, soundPellet, soundEatGhost, soundDeath, soundWin } from './audio.js';

// ============================================================
// 1. RENDERER
// ============================================================

const canvas          = document.querySelector('canvas');
const screenContainer = document.getElementById('screen-container');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;

function getScreenSize() {
    return { w: screenContainer.clientWidth, h: screenContainer.clientHeight };
}

const initialSize = getScreenSize();   // rozmiar ekranu przy starcie (przed pierwszym resize)
renderer.setSize(initialSize.w, initialSize.h, false);

// ============================================================
// 2. SCENA
// ============================================================

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000008);
scene.fog = new THREE.FogExp2(0x000008, 0.010);

// ============================================================
// 3. KAMERA
// ============================================================

const camera = new THREE.PerspectiveCamera(58, initialSize.w / initialSize.h, 0.1, 220);
camera.position.set(0, 44, 20);
camera.lookAt(0, 0, 1);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 1);
controls.enableDamping  = true;
controls.dampingFactor  = 0.06;
controls.minDistance    = 14;
controls.maxDistance    = 75;
controls.maxPolarAngle  = Math.PI / 2;

// ============================================================
// 4. OŚWIETLENIE (4 źródła – wymaganie projektu)
// ============================================================

// 1. AmbientLight – tło bez kierunku, wypełnia cienie
const ambientLight = new THREE.AmbientLight(0x111155, 2.2);
scene.add(ambientLight);

// 2. DirectionalLight – główne równoległe światło (jak słońce/reflektor)
const dirLight = new THREE.DirectionalLight(0x6666ff, 1.4);
dirLight.position.set(10, 24, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.near   =  0.5;
dirLight.shadow.camera.far    = 90;
dirLight.shadow.camera.left   = -36;
dirLight.shadow.camera.right  =  36;
dirLight.shadow.camera.top    =  36;
dirLight.shadow.camera.bottom = -36;
scene.add(dirLight);

// 3. PointLight śledząca Pacmana – dynamiczne żółte neonowe światło
const pacmanLight = new THREE.PointLight(0xffee00, 5, 10);
scene.add(pacmanLight);

// 4. SpotLight nad bazą duchów – różowo-fioletowy akcent
const ghostSpot = new THREE.SpotLight(0xff00cc, 4, 24, Math.PI / 10, 0.5, 1.2);
ghostSpot.position.set(colToX(9), 10, rowToZ(9));
ghostSpot.target.position.set(colToX(9), 0, rowToZ(10));
scene.add(ghostSpot);
scene.add(ghostSpot.target);

// ============================================================
// 5. LABIRYNT I POSTACIE
// ============================================================

const { dotGroup, dotMap, totalDots, resetDots } = buildMaze(scene);

const pacman = new Pacman(PACMAN_START.col, PACMAN_START.row);
scene.add(pacman.group);

// Wszystkie 4 duchy tworzone raz – aktywujemy tylko tyle ile trzeba
const ghosts = GHOST_STARTS.map((pos, i) =>
    new Ghost(pos.col, pos.row, GHOST_COLORS[i], i)
);
ghosts.forEach(g => scene.add(g.group));

// ============================================================
// 6. STAN GRY
// ============================================================

const State = { WAITING: 0, PLAYING: 1, PAUSED: 2, GAMEOVER: 3, WIN: 4 };
let gameState        = State.WAITING;
let score            = 0;
let lives            = 3;
let dotsLeft         = totalDots;
let activeGhostCount = 4;
let elapsedTime      = 0;   // czas gry w sekundach (nie liczy pauzy)

/** Formatuje sekundy na M:SS */
function formatTime(t) {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

/** Bonus za czas: 5000 pkt bazowo, -10 pkt za każdą sekundę */
function calcTimeBonus(t) {
    return Math.max(0, 5000 - Math.floor(t) * 10);
}

// Elementy HTML
const overlay        = document.getElementById('overlay');
const hud            = document.getElementById('hud');
const ghostTimers    = document.getElementById('ghost-timers');
const scoreEl        = document.getElementById('score');
const livesEl        = document.getElementById('lives');
const overlayTitle   = document.getElementById('overlayTitle');
const overlayMsg     = document.getElementById('overlayMsg');
const diffSelect     = document.getElementById('diff-select');
const resumeBtn      = document.getElementById('resumeBtn');
const hintControls   = document.getElementById('hintControls');
const hintPellet     = document.getElementById('hintPellet');
const coinSlotEl    = document.getElementById('coinSlot');
const playAgainBtn  = document.getElementById('playAgainBtn');

const ghostTimerRows   = [0, 1, 2, 3].map(i => document.getElementById(`gt-${i}`));
const ghostTimerCounts = [0, 1, 2, 3].map(i => document.getElementById(`gc-${i}`));
const timerEl          = document.getElementById('timer');

const nameEntry   = document.getElementById('name-entry');
const nameInput   = document.getElementById('name-input');
const nameConfirm = document.getElementById('name-confirm');
const hsTable     = document.getElementById('highscore-table');
const hsList      = document.getElementById('hs-list');

// ============================================================
// HIGH SCORES (localStorage)
// ============================================================

const HS_KEY    = 'pacman3d_hs';
const HS_MAX    = 5;   // maksymalna liczba wpisów w tabeli

/** Wczytuje tablicę wyników z localStorage. Zwraca [] przy błędzie lub braku danych. */
function loadHS() {
    try { return JSON.parse(localStorage.getItem(HS_KEY)) || []; }
    catch { return []; }
}

/** Zapisuje tablicę wyników do localStorage jako JSON. */
function saveHS(list) {
    localStorage.setItem(HS_KEY, JSON.stringify(list));
}

/**
 * Sprawdza, czy podany wynik kwalifikuje się do tablicy top-5.
 * @param {number} sc – wynik do sprawdzenia
 * @returns {boolean}
 */
function qualifiesHS(sc) {
    const list = loadHS();
    return list.length < HS_MAX || sc > list[list.length - 1].score;
}

/**
 * Dodaje nowy wpis do tablicy wyników, sortuje malejąco i przycina do HS_MAX.
 * @param {string} name – nick gracza (max 3 znaki, domyślnie 'AAA')
 * @param {number} sc   – wynik punktowy
 * @param {string} time – czas gry sformatowany jako M:SS
 * @returns {number} indeks nowego wpisu po posortowaniu (-1 jeśli nie znaleziono)
 */
function insertHS(name, sc, time) {
    const list = loadHS();
    list.push({ name: name.toUpperCase().trim() || 'AAA', score: sc, time });
    list.sort((a, b) => b.score - a.score);
    if (list.length > HS_MAX) list.length = HS_MAX;
    saveHS(list);
    return list.findIndex(e => e.name === name.toUpperCase().trim() && e.score === sc && e.time === time);
}

/**
 * Renderuje tablicę wyników do #hs-list.
 * @param {number} newIdx – indeks nowo dodanego wpisu (podświetlony klasą 'hs-new'), -1 = brak
 */
function renderHS(newIdx = -1) {
    const list = loadHS();
    if (list.length === 0) { hsList.innerHTML = ''; return; }
    hsList.innerHTML = list.map((e, i) => `
        <div class="hs-row${i === newIdx ? ' hs-new' : ''}">
            <span class="hs-rank">${i + 1}.</span>
            <span class="hs-name">${e.name}</span>
            <span class="hs-score">${e.score}</span>
            <span class="hs-time">${e.time}</span>
        </div>`).join('');
}

// Tymczasowe przechowanie wyniku i czasu gdy gracz wpisuje nick do tablicy HS
let pendingScore = 0;
let pendingTime  = '';

/**
 * Pokazuje formularz wpisywania nicku do tablicy wyników.
 * Chowa tabelę HS (pojawi się po zatwierdzeniu). Ustawia focus na pole tekstowe.
 * @param {number} sc      – wynik do zapisania (przechowany w pendingScore)
 * @param {string} timeStr – czas gry M:SS (przechowany w pendingTime)
 */
function showNameEntry(sc, timeStr) {
    pendingScore = sc;
    pendingTime  = timeStr;
    nameInput.value = '';
    nameEntry.classList.remove('hidden');
    hsTable.classList.add('hidden');
    setTimeout(() => nameInput.focus(), 50);
}

/** Zatwierdza wpisany nick, zapisuje wynik do HS i pokazuje zaktualizowaną tabelę. */
function submitName() {
    const idx = insertHS(nameInput.value, pendingScore, pendingTime);
    nameEntry.classList.add('hidden');
    renderHS(idx);
    hsTable.classList.remove('hidden');
    playAgainBtn.classList.remove('hidden');
}

nameConfirm.addEventListener('click', submitName);
nameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') submitName();
    e.stopPropagation();   // nie przekazuj do obsługi gry
});

// ============================================================
// 7. ZARZĄDZANIE EKRANAMI
// ============================================================

/**
 * Odtwarza animację monety wpadającej do szczeliny, po czym uruchamia grę.
 * Przez czas animacji blokuje przyciski trudności, by uniknąć podwójnego kliknięcia.
 * @param {string} diffKey – klucz trudności ('easy' | 'normal' | 'hard')
 */
function playCoinThenStart(diffKey) {
    document.querySelectorAll('.diff-btn').forEach(b => b.style.pointerEvents = 'none');

    const slotRect = coinSlotEl.getBoundingClientRect();

    // viewport-relative — fixed, więc overflow:hidden nie ma znaczenia
    const cx = slotRect.left + slotRect.width  / 2;
    const sy = slotRect.top  - 72;
    const ey = slotRect.top  + slotRect.height / 2;

    const coin = document.createElement('div');
    coin.className        = 'coin-anim';
    coin.textContent      = '¢';
    coin.style.position   = 'fixed';
    coin.style.left       = cx + 'px';
    coin.style.top        = sy + 'px';
    coin.style.setProperty('--fall', (ey - sy) + 'px');
    document.body.appendChild(coin);

    setTimeout(() => {
        coin.remove();
        coinSlotEl.classList.add('absorb');
        setTimeout(() => coinSlotEl.classList.remove('absorb'), 420);
        document.querySelectorAll('.diff-btn').forEach(b => b.style.pointerEvents = '');
        startGame(diffKey);
    }, 720);
}

/** Ekran wyboru trudności (start / po kliknięciu "zagraj ponownie") */
function showDiffSelect(title, msg, blink = true) {
    stopMusic();
    gameState = State.WAITING;
    overlayTitle.textContent = title;
    overlayTitle.className   = blink ? '' : 'no-blink';
    overlayMsg.textContent   = msg;
    diffSelect.classList.remove('hidden');
    hintControls.classList.remove('hidden');
    hintPellet.classList.remove('hidden');
    resumeBtn.classList.add('hidden');
    playAgainBtn.classList.add('hidden');
    nameEntry.classList.add('hidden');
    hud.classList.add('hidden');
    ghostTimers.classList.add('hidden');
    overlay.classList.remove('hidden');
    renderHS();
    hsTable.classList.remove('hidden');
}

/** Ekran końca gry (win / game over) – pokazuje wyniki i przycisk "zagraj ponownie" */
function showEndScreen(title, msg, blink = true) {
    stopMusic();
    gameState = State.WAITING;
    overlayTitle.textContent = title;
    overlayTitle.className   = blink ? '' : 'no-blink';
    overlayMsg.textContent   = msg;
    diffSelect.classList.add('hidden');
    hintControls.classList.add('hidden');
    hintPellet.classList.add('hidden');
    resumeBtn.classList.add('hidden');
    nameEntry.classList.add('hidden');
    hud.classList.add('hidden');
    ghostTimers.classList.add('hidden');
    overlay.classList.remove('hidden');
    renderHS();
    hsTable.classList.remove('hidden');
    playAgainBtn.classList.remove('hidden');
}


/**
 * Przełącza stan pauzy: PLAYING → PAUSED (zatrzymuje muzykę, pokazuje overlay)
 * lub PAUSED → PLAYING (wznawia muzykę, ukrywa overlay).
 */
function togglePause() {
    if (gameState === State.PLAYING) {
        gameState = State.PAUSED;
        pauseMusic();
        overlayTitle.textContent = 'PAUZA';
        overlayTitle.className   = 'no-blink';
        overlayMsg.textContent   = '';
        diffSelect.classList.add('hidden');
        resumeBtn.classList.remove('hidden');
        hintControls.classList.add('hidden');
        hintPellet.classList.add('hidden');
        overlay.classList.remove('hidden');
    } else if (gameState === State.PAUSED) {
        gameState = State.PLAYING;
        resumeMusic();
        overlay.classList.add('hidden');
    }
}

/** Uruchomienie gry z wybranym poziomem trudności */
function startGame(diffKey) {
    initAudio();
    const cfg = DIFFICULTIES[diffKey];
    activeGhostCount = cfg.activeGhosts;

    gameState     = State.PLAYING;
    score         = 0;
    lives         = 3;
    deathCooldown = 0;
    dotsLeft      = resetDots();
    scoreEl.textContent = score;
    livesEl.textContent = lives;

    // Skonfiguruj duchy: ustaw parametry trudności, ukryj nieaktywne
    ghosts.forEach((g, i) => {
        g.configure(cfg);
        g.reset(GHOST_STARTS[i].col, GHOST_STARTS[i].row);
        // Duchy powyżej limitu są niewidoczne i nie wpływają na grę
        g.group.visible = (i < activeGhostCount);
    });

    // Ukryj timery nieaktywnych duchów w panelu bocznym
    ghostTimerRows.forEach((row, i) => {
        row.style.display = i < activeGhostCount ? '' : 'none';
    });

    elapsedTime = 0;
    timerEl.textContent = '0:00';
    overlay.classList.add('hidden');
    hud.classList.remove('hidden');
    ghostTimers.classList.remove('hidden');
    startMusic();
    pacman.reset(PACMAN_START.col, PACMAN_START.row);
}

// Obsługa kliknięcia przycisków trudności
document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => playCoinThenStart(btn.dataset.diff));
});

// Przycisk wznowienia (pauza)
resumeBtn.addEventListener('click', () => togglePause());

// Przycisk "zagraj ponownie" (po game over / wygranej)
playAgainBtn.addEventListener('click', () =>
    showDiffSelect('PAC-MAN 3D', 'ZJEDZ WSZYSTKIE KULKI', true)
);

// ============================================================
// 8. STEROWANIE KLAWIATURĄ
// ============================================================

window.addEventListener('keydown', e => {
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (gameState === State.PLAYING || gameState === State.PAUSED) togglePause();
        return;
    }
    if (gameState !== State.PLAYING) return;
    switch (e.key) {
        case 'ArrowRight': case 'd': case 'D': pacman.setNextDirection( 1,  0); break;
        case 'ArrowLeft':  case 'a': case 'A': pacman.setNextDirection(-1,  0); break;
        case 'ArrowDown':  case 's': case 'S': pacman.setNextDirection( 0,  1); break;
        case 'ArrowUp':    case 'w': case 'W': pacman.setNextDirection( 0, -1); break;
    }
    e.preventDefault();
});

// ============================================================
// 9. KOLIZJE
// ============================================================

/**
 * Sprawdza, czy Pacman stoi na kulce lub power pellecie i ją zbiera.
 * Pellet aktywuje tryb strachu u duchów na SCARED_DURATION sekund.
 * Zebranie ostatniej kulki kończy grę (wygrana).
 */
function checkDotPickup() {
    const { col, row } = pacman.getGridPos();
    const dot = dotMap.get(`${col},${row}`);
    if (!dot) return;

    dotMap.delete(`${col},${row}`);
    dotGroup.remove(dot);
    dotsLeft--;

    if (dot.userData.isPellet) {
        score += 50;
        scoreEl.textContent = score;
        // Przestrasza tylko aktywne duchy
        ghosts.slice(0, activeGhostCount).forEach(g => g.scare());
        soundPellet();
    } else {
        score += 10;
        scoreEl.textContent = score;
        soundDot();
    }

    if (dotsLeft <= 0) {
        const bonus   = calcTimeBonus(elapsedTime);
        score        += bonus;
        scoreEl.textContent = score;
        soundWin();
        const timeStr = formatTime(elapsedTime);
        const msg     = `WYNIK: ${score}  |  CZAS: ${timeStr}  |  BONUS: +${bonus}`;

        if (qualifiesHS(score)) {
            // Wynik kwalifikuje się do tablicy – pokaż ekran końca i formularz nicku.
            // playAgainBtn pojawi się automatycznie po zatwierdzeniu nicku w submitName().
            showEndScreen('WYGRAŁEŚ!', msg, false);
            playAgainBtn.classList.add('hidden');   // ukryj do czasu zapisu nicku
            hsTable.classList.add('hidden');         // ukryj – pojawi się po wpisaniu nicku
            showNameEntry(score, timeStr);
        } else {
            showEndScreen('WYGRAŁEŚ!', msg, false);
        }
    }
}

/**
 * Sprawdza kolizje Pacmana z duchami każdą klatkę.
 * - Jeśli duch jest przestraszony → zjedzenie (+200 pkt, duch trafia na respawn).
 * - Jeśli duch normalny → utrata życia; jeśli brak żyć → koniec gry.
 * deathCooldown zapobiega wielokrotnym zgondom w tej samej chwili.
 * @param {number} dt – czas klatki w sekundach
 */

let deathCooldown = 0;   // sekundy blokady po zgonie (zapobiega podwójnemu trafieniu)

function checkGhostCollision(dt) {
    if (deathCooldown > 0) { deathCooldown -= dt; return; }

    const px = pacman.group.position.x;
    const pz = pacman.group.position.z;

    for (let i = 0; i < activeGhostCount; i++) {
        const g = ghosts[i];
        if (g.dead) continue;

        const dx = g.group.position.x - px;
        const dz = g.group.position.z - pz;

        if (Math.sqrt(dx * dx + dz * dz) < CELL * 0.6) {
            if (g.scared) {
                score += 200;
                scoreEl.textContent = score;
                g.kill();
                soundEatGhost();
            } else {
                lives--;
                livesEl.textContent = lives;
                soundDeath();
                deathCooldown = 1.0;

                if (lives <= 0) {
                    showEndScreen('GAME OVER', `WYNIK: ${score}`, true);
                } else {
                    pacman.reset(PACMAN_START.col, PACMAN_START.row);
                    ghosts.forEach((gh, j) => {
                        gh.reset(GHOST_STARTS[j].col, GHOST_STARTS[j].row);
                        gh.group.visible = j < activeGhostCount;
                    });
                }
                return;
            }
        }
    }
}

/**
 * Aktualizuje panel timerów respawnu po lewej stronie ekranu.
 * Podświetla wiersz ducha i pokazuje pozostały czas (w sekundach) gdy duch jest martwy.
 */
function updateGhostTimerUI() {
    for (let i = 0; i < activeGhostCount; i++) {
        const g = ghosts[i];
        if (g.dead) {
            ghostTimerRows[i].classList.add('active');
            ghostTimerCounts[i].textContent = Math.ceil(g.respawnTimer);
        } else {
            ghostTimerRows[i].classList.remove('active');
        }
    }
}

// ============================================================
// 10. PĘTLA ANIMACJI
// ============================================================

const clock    = new THREE.Clock();
let pulseTimer = 0;   // globalny licznik czasu do animacji pulsowania pelletów

/** Główna pętla renderowania – wywoływana przez requestAnimationFrame co klatkę. */
function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    if (gameState === State.PLAYING) {
        elapsedTime += dt;
        timerEl.textContent = formatTime(elapsedTime);

        const { col: pc, row: pr } = pacman.getGridPos();
        pacman.update(dt);
        ghosts.slice(0, activeGhostCount).forEach(g => g.update(dt, pc, pr));

        checkDotPickup();
        checkGhostCollision(dt);
        updateGhostTimerUI();

        pacmanLight.position.set(pacman.group.position.x, 2.5, pacman.group.position.z);

        pulseTimer += dt;
        dotMap.forEach(dot => {
            if (dot.userData.isPellet) dot.scale.setScalar(1 + 0.35 * Math.sin(pulseTimer * 5));
        });
    }

    controls.update();
    renderer.render(scene, camera);
}

animate();

// ============================================================
// 11. RESPONSYWNOŚĆ
// ============================================================

new ResizeObserver(() => {
    const { w, h } = getScreenSize();
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
}).observe(screenContainer);
