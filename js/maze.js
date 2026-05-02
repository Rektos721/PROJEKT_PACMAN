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

export function colToX(col) { return (col - COLS / 2 + 0.5) * CELL; }
export function rowToZ(row) { return (row - ROWS / 2 + 0.5) * CELL; }

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

export function isWalkableGhost(col, row) {
    if (row < 0 || row >= ROWS) return false;
    if (col < 0 || col >= COLS) {
        return MAZE_LAYOUT[row][0] !== CELL_WALL && MAZE_LAYOUT[row][COLS - 1] !== CELL_WALL;
    }
    return MAZE_LAYOUT[row][col] !== CELL_WALL;
}

// ------------------------------------------------------------
// Generowanie podłogowej tekstury (szachownica)
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
export function buildMaze(scene) {
    const dotGroup = new THREE.Group();
    const dotMap   = new Map();

    // --- Ściany: ciemne bryły + neonowe krawędzie ---
    const wallGeo = new THREE.BoxGeometry(CELL, WALL_HEIGHT, CELL);
    // Ciemnoniebieska bryła z wyraźną niebieską emisją – klasyczny Pacman arcade look
    const wallMat = new THREE.MeshPhongMaterial({
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
                totalDots++;
            } else if (type === CELL_PELLET) {
                const pellet = new THREE.Mesh(pelletGeo, pelletMat);
                pellet.position.set(x, 0.55, z);
                pellet.userData.isPellet = true;
                dotGroup.add(pellet);
                dotMap.set(`${col},${row}`, pellet);
                totalDots++;
            }
        }
    }

    // --- Podłoga ---
    const floorGeo = new THREE.PlaneGeometry(COLS * CELL, ROWS * CELL);
    const floorMat = new THREE.MeshPhongMaterial({
        map: createFloorTexture(), color: COLOR_FLOOR
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;

    scene.add(wallGroup);
    scene.add(wallEdges);
    scene.add(dotGroup);
    scene.add(floor);

    return { dotGroup, dotMap, totalDots };
}
