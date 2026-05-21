// ============================================================
// maze.js – dane labiryntu i budowanie sceny 3D
// ============================================================

import * as THREE from 'three';
import {
    CELL, COLS, ROWS, WALL_HEIGHT,
    CELL_WALL, CELL_DOT, CELL_PELLET, CELL_GHOST_HOUSE,
    COLOR_FLOOR, COLOR_DOT, COLOR_PELLET
} from './config.js';

export const MAZE_LAYOUT = [
//   0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 0
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 1
    [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1], // 2
    [1, 2, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 2, 1], // 3
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 4
    [1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1], // 5
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1], // 6
    [1, 1, 1, 1, 0, 1, 1, 1, 3, 1, 3, 1, 1, 1, 0, 1, 1, 1, 1], // 7
    [3, 3, 3, 1, 0, 1, 3, 3, 3, 3, 3, 3, 3, 1, 0, 1, 3, 3, 3], // 8  tunel
    [1, 1, 1, 1, 0, 1, 3, 1, 4, 4, 4, 1, 3, 1, 0, 1, 1, 1, 1], // 9
    [3, 3, 3, 3, 0, 3, 3, 1, 4, 4, 4, 1, 3, 3, 0, 3, 3, 3, 3], // 10 tunel + baza
    [1, 1, 1, 1, 0, 1, 3, 1, 1, 1, 1, 1, 3, 1, 0, 1, 1, 1, 1], // 11
    [3, 3, 3, 1, 0, 1, 3, 3, 3, 3, 3, 3, 3, 1, 0, 1, 3, 3, 3], // 12 tunel
    [1, 1, 1, 1, 0, 1, 1, 1, 3, 1, 3, 1, 1, 1, 0, 1, 1, 1, 1], // 13
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 14
    [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1], // 15
    [1, 2, 0, 1, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 1, 0, 2, 1], // 16
    [1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1], // 17
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1], // 18
    [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1], // 19
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 20
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 21
];

export const PACMAN_START = { col: 9, row: 16 };
export const GHOST_STARTS = [
    { col: 8,  row: 9  },
    { col: 9,  row: 9  },
    { col: 10, row: 9  },
    { col: 9,  row: 10 },
];

/** Zamienia indeks kolumny siatki na współrzędną X w przestrzeni Three.js (środek komórki). */
export function colToX(col) { return (col - COLS / 2 + 0.5) * CELL; }

/** Zamienia indeks wiersza siatki na współrzędną Z w przestrzeni Three.js (środek komórki). */
export function rowToZ(row) { return (row - ROWS / 2 + 0.5) * CELL; }

/**
 * Sprawdza, czy Pacman może wejść na podaną komórkę.
 * Zwraca false dla CELL_WALL i CELL_GHOST_HOUSE (Pacman nie wchodzi do bazy).
 * Obsługuje tunel: kolumna spoza [0, COLS) oznacza wraparound – sprawdzany jest
 * skrajny wiersz z drugiej strony mapy (jeśli nie jest ścianą).
 * @param {number} col – kolumna w MAZE_LAYOUT
 * @param {number} row – wiersz w MAZE_LAYOUT
 * @returns {boolean}
 */
export function isWalkable(col, row) {
    if (row < 0 || row >= ROWS) return false;
    if (col < 0 || col >= COLS) {
        return MAZE_LAYOUT[row][0] !== CELL_WALL && MAZE_LAYOUT[row][COLS - 1] !== CELL_WALL;
    }
    const c = MAZE_LAYOUT[row][col];
    return c !== CELL_WALL;
}

/** Zwraca true jeśli komórka należy do wnętrza bazy duchów */
export function isGhostHouseCell(col, row) {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
    return MAZE_LAYOUT[row][col] === CELL_GHOST_HOUSE;
}

/**
 * Wersja isWalkable dla duchów – duchy mogą wchodzić do CELL_GHOST_HOUSE
 * (własna baza), podczas gdy Pacman nie ma do niej dostępu.
 * @param {number} col – kolumna w MAZE_LAYOUT
 * @param {number} row – wiersz w MAZE_LAYOUT
 * @returns {boolean}
 */
export function isWalkableGhost(col, row) {
    if (row < 0 || row >= ROWS) return false;
    if (col < 0 || col >= COLS) {
        return MAZE_LAYOUT[row][0] !== CELL_WALL && MAZE_LAYOUT[row][COLS - 1] !== CELL_WALL;
    }
    return MAZE_LAYOUT[row][col] !== CELL_WALL;
}

// ------------------------------------------------------------
// Tekstura podłogi – szachownica z ciemnych kwadratów
// ------------------------------------------------------------
function createFloorTexture() {
    const s = 64;
    const cv = document.createElement('canvas');
    cv.width = cv.height = s;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, s/2, s/2);
    ctx.fillRect(s/2, s/2, s/2, s/2);
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(COLS, ROWS);
    return t;
}

// ------------------------------------------------------------
// Tekstura ścian – wzór obwodu drukowanego (circuit board).
// Ciemne tło + neonowa niebieska siatka + świecące węzły na przecięciach.
// repeat.set(1, WALL_HEIGHT/CELL) dopasowuje proporcje do bryły BoxGeometry.
// ------------------------------------------------------------
function createWallTexture() {
    const s   = 128;
    const cv  = document.createElement('canvas');
    cv.width = cv.height = s;
    const ctx = cv.getContext('2d');

    // Ciemny granatowy podkład
    ctx.fillStyle = '#010a22';
    ctx.fillRect(0, 0, s, s);

    // Siatka linii – imitacja ścieżek PCB
    const step = 32;
    ctx.lineWidth = 1;
    for (let i = 0; i <= s; i += step) {
        ctx.strokeStyle = 'rgba(20, 70, 210, 0.6)';
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(s, i); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, s); ctx.stroke();
    }

    // Glowing węzły na przecięciach linii (gradient radial → efekt poświaty)
    for (let y = 0; y <= s; y += step) {
        for (let x = 0; x <= s; x += step) {
            const grd = ctx.createRadialGradient(x, y, 0, x, y, 6);
            grd.addColorStop(0, 'rgba(60, 140, 255, 1.0)');
            grd.addColorStop(0.4, 'rgba(20, 80, 220, 0.6)');
            grd.addColorStop(1,   'rgba(0, 20, 120, 0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Krótkie losowe "ścieżki" PCB między węzłami (dekoracja)
    ctx.strokeStyle = 'rgba(30, 90, 220, 0.35)';
    ctx.lineWidth = 2;
    [[0,0,step,0],[step,0,step,step],[0,step,step,step],[0,0,0,step],
     [step,step,s,step],[s,0,s,step]].forEach(([x1,y1,x2,y2]) => {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    });

    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    // Ściana ma proporcje CELL × WALL_HEIGHT = 2 × 1.6 → repeat Y = 0.8
    t.repeat.set(1, WALL_HEIGHT / CELL);
    return t;
}

// ------------------------------------------------------------
// Tekstura bazy duchów – różowo-fioletowy wzór diamentowy.
// Kafelki z ukośnymi liniami sygnalizują strefę "niebezpieczną".
// ------------------------------------------------------------
function createGhostHouseTexture() {
    const s  = 64;
    const cv = document.createElement('canvas');
    cv.width = cv.height = s;
    const ctx = cv.getContext('2d');

    // Ciemne fioletowe tło
    ctx.fillStyle = '#0e0018';
    ctx.fillRect(0, 0, s, s);

    // Ukośna siatka – diamentowy wzór
    ctx.strokeStyle = 'rgba(180, 0, 140, 0.45)';
    ctx.lineWidth = 1;
    for (let i = -s; i <= s * 2; i += 16) {
        ctx.beginPath(); ctx.moveTo(i, 0);       ctx.lineTo(i + s, s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(i, 0);       ctx.lineTo(i - s, s); ctx.stroke();
    }

    // Subtelna poświata w centrum kafelka
    const grd = ctx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
    grd.addColorStop(0,   'rgba(200, 0, 160, 0.18)');
    grd.addColorStop(1,   'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, s, s);

    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 1);
    return t;
}

// ------------------------------------------------------------
// Krawędzie ścian – styl oryginału: neonowe niebieskie linie
// TYLKO na granicy ściana / korytarz (jeden batched LineSegments).
// Krawędzie między sąsiednimi ścianami są pomijane.
// ------------------------------------------------------------
function buildWallEdges() {
    const verts = [];   // pary punktów: każde dwa to jeden odcinek
    const hw = CELL / 2;
    const hh = WALL_HEIGHT / 2;

    function isWall(c, r) {
        if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return false;
        return MAZE_LAYOUT[r][c] === CELL_WALL;
    }

    // Dodaje prostokąt (4 krawędzie) jako 8 punktów (4 odcinki)
    function addFaceRect(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) {
        // odcinki A-B, B-C, C-D, D-A
        verts.push(ax,ay,az, bx,by,bz);
        verts.push(bx,by,bz, cx,cy,cz);
        verts.push(cx,cy,cz, dx,dy,dz);
        verts.push(dx,dy,dz, ax,ay,az);
    }

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (!isWall(col, row)) continue;
            const x = colToX(col), z = rowToZ(row);
            const yb = 0, yt = WALL_HEIGHT;

            // Ściana -Z (ku górze mapy) – pokaż jeśli sąsiad nie jest ścianą
            if (!isWall(col, row - 1))
                addFaceRect(x-hw,yb,z-hw, x+hw,yb,z-hw, x+hw,yt,z-hw, x-hw,yt,z-hw);
            // Ściana +Z
            if (!isWall(col, row + 1))
                addFaceRect(x-hw,yb,z+hw, x+hw,yb,z+hw, x+hw,yt,z+hw, x-hw,yt,z+hw);
            // Ściana -X
            if (!isWall(col - 1, row))
                addFaceRect(x-hw,yb,z-hw, x-hw,yb,z+hw, x-hw,yt,z+hw, x-hw,yt,z-hw);
            // Ściana +X
            if (!isWall(col + 1, row))
                addFaceRect(x+hw,yb,z-hw, x+hw,yb,z+hw, x+hw,yt,z+hw, x+hw,yt,z-hw);
            // (brak krawędzi na górze – eliminuje siatkę między sąsiednimi ścianami)
        }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
    // Linia niebieska jak w oryginale, delikatnie świecąca
    // Jasnoniebieskie krawędzie – neonowy efekt jak w oryginalnym Pacmanie
    const mat = new THREE.LineBasicMaterial({ color: 0x4488ff, linewidth: 2 });
    return new THREE.LineSegments(geo, mat);
}

// ------------------------------------------------------------
// Budowanie labiryntu
// ------------------------------------------------------------
/**
 * Buduje całą scenę 3D labiryntu i zwraca obiekty potrzebne do zarządzania kulkami.
 * Tworzy i dodaje do sceny: ściany z teksturą PCB, neonowe krawędzie,
 * podłogę (szachownica), kafelki bazy duchów, grupę kulek/pelletów.
 * @param {THREE.Scene} scene – scena Three.js, do której dodawane są wszystkie elementy
 * @returns {{ dotGroup: THREE.Group, dotMap: Map<string, THREE.Mesh>,
 *             totalDots: number, resetDots: function(): number }}
 */
export function buildMaze(scene) {
    const dotGroup = new THREE.Group();
    const dotMap   = new Map();
    const allDots  = [];   // zachowujemy referencje – do resetu przy nowej grze

    // --- Ściany: ciemne bryły z teksturą PCB + neonowe krawędzie ---
    const wallGeo = new THREE.BoxGeometry(CELL, WALL_HEIGHT, CELL);
    // Ciemnoniebieska bryła z teksturą obwodu drukowanego i neonową emisją
    const wallMat = new THREE.MeshPhongMaterial({
        map:               createWallTexture(),   // tekstura circuit board
        color:             0x001155,
        emissive:          0x0033aa,
        emissiveIntensity: 0.8,
        shininess:         20,
        transparent:       true,
        opacity:           0.78,
    });

    const wallGroup = new THREE.Group();
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (MAZE_LAYOUT[row][col] !== CELL_WALL) continue;
            const mesh = new THREE.Mesh(wallGeo, wallMat);
            mesh.position.set(colToX(col), WALL_HEIGHT / 2, rowToZ(row));
            mesh.castShadow    = true;
            mesh.receiveShadow = true;
            wallGroup.add(mesh);
        }
    }

    // Jeden batched LineSegments ze wszystkimi neonowymi krawędziami
    const wallEdges = buildWallEdges();

    // --- Kulki i power pellety ---
    // y=0.48 – nad środkiem ściany (WALL_HEIGHT/2=0.8), widoczne z każdego kąta
    const dotGeo    = new THREE.SphereGeometry(0.18, 10, 10);
    const dotMat    = new THREE.MeshPhongMaterial({
        color: COLOR_DOT, emissive: COLOR_DOT, emissiveIntensity: 1.0
    });
    const pelletGeo = new THREE.SphereGeometry(0.34, 14, 14);
    const pelletMat = new THREE.MeshPhongMaterial({
        color: COLOR_PELLET, emissive: COLOR_PELLET, emissiveIntensity: 1.0
    });

    let totalDots = 0;

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const type = MAZE_LAYOUT[row][col];
            const x = colToX(col), z = rowToZ(row);

            if (type === CELL_DOT) {
                const dot = new THREE.Mesh(dotGeo, dotMat);
                dot.position.set(x, 0.48, z);
                dotGroup.add(dot);
                dotMap.set(`${col},${row}`, dot);
                allDots.push({ key: `${col},${row}`, mesh: dot });
                totalDots++;
            } else if (type === CELL_PELLET) {
                const pellet = new THREE.Mesh(pelletGeo, pelletMat);
                pellet.position.set(x, 0.55, z);
                pellet.userData.isPellet = true;
                dotGroup.add(pellet);
                dotMap.set(`${col},${row}`, pellet);
                allDots.push({ key: `${col},${row}`, mesh: pellet });
                totalDots++;
            }
        }
    }

    // --- Podłoga główna ---
    const floorGeo = new THREE.PlaneGeometry(COLS * CELL, ROWS * CELL);
    const floorMat = new THREE.MeshPhongMaterial({
        map: createFloorTexture(), color: COLOR_FLOOR
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;

    // --- Kafelki bazy duchów – osobna tekstura na podłodze ghost house ---
    // Lekko uniesione (y=0.01) żeby były widoczne nad główną podłogą.
    const ghFloorGeo = new THREE.PlaneGeometry(CELL, CELL);
    const ghFloorMat = new THREE.MeshPhongMaterial({
        map:      createGhostHouseTexture(),
        color:    0x220033,
        emissive: 0x110022,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.85,
    });
    const ghGroup = new THREE.Group();
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (MAZE_LAYOUT[row][col] !== CELL_GHOST_HOUSE) continue;
            const tile = new THREE.Mesh(ghFloorGeo, ghFloorMat);
            tile.rotation.x = -Math.PI / 2;
            tile.position.set(colToX(col), 0.01, rowToZ(row));
            tile.receiveShadow = true;
            ghGroup.add(tile);
        }
    }

    scene.add(wallGroup);
    scene.add(wallEdges);
    scene.add(dotGroup);
    scene.add(floor);
    scene.add(ghGroup);

    /** Przywraca wszystkie kulki do sceny (używane przy starcie nowej gry) */
    function resetDots() {
        dotMap.clear();
        // Usuń tylko dotGroup children (nie usuwamy meshów – reużywamy je)
        while (dotGroup.children.length > 0) dotGroup.remove(dotGroup.children[0]);
        allDots.forEach(({ key, mesh }) => {
            mesh.scale.setScalar(1);   // resetuj skalę (pulsujące pellety)
            dotGroup.add(mesh);
            dotMap.set(key, mesh);
        });
        return totalDots;
    }

    return { dotGroup, dotMap, totalDots, resetDots };
}
