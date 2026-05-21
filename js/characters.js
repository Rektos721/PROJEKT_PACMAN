// ============================================================
// characters.js – klasy Pacman i Ghost
// ============================================================

import * as THREE from 'three';
import {
    CELL, COLS, ROWS,
    PACMAN_SPEED, GHOST_SPEED, GHOST_SCARED_SPEED, SCARED_DURATION,
    COLOR_PACMAN, GHOST_COLORS, GHOST_SCARED_COLOR
} from './config.js';
import { colToX, rowToZ, isWalkable, isWalkableGhost, isGhostHouseCell } from './maze.js';

// Cztery możliwe kierunki ruchu (delta kolumna, delta wiersz)
const DIRS = [
    { dc:  1, dr:  0 },   // prawo
    { dc: -1, dr:  0 },   // lewo
    { dc:  0, dr:  1 },   // dół
    { dc:  0, dr: -1 },   // góra
];

// Kąty obrotu Y dla każdego kierunku ruchu.
// Model Pacmana i duchów "patrzy" wzdłuż lokalnej osi +X (rotation.y = 0).
// Pozostałe kąty to obroty od tej pozycji bazowej:
//   prawo  →   0        (brak obrotu, patrzy w +X)
//   lewo   →   π        (obrót o 180°)
//   góra   →   π/2      (obrót o 90° w lewo)
//   dół    →  -π/2      (obrót o 90° w prawo)
const DIR_ANGLE = {
    '1,0':    0,
    '-1,0':   Math.PI,
    '0,-1':   Math.PI / 2,
    '0,1':   -Math.PI / 2,
};

// ============================================================
// KLASA PACMAN
// ============================================================
export class Pacman {
    constructor(startCol, startRow) {
        this.col = startCol; this.row = startRow;
        this.targetCol = startCol; this.targetRow = startRow;
        this.progress  = 1.0;
        this.direction     = { dc: 0, dr: 0 };
        this.nextDirection = { dc: 0, dr: 0 };
        this.group = new THREE.Group();
        this._buildMesh();
    }

    // ----------------------------------------------------------
    // Pacman = dwie półkule (SphereGeometry, górna + dolna).
    // phiStart/phiLength tworzą szczelinę ust przy phi=0 (+X) – kierunek ruchu.
    // Animacja: górna szczęka obraca się +Z (do góry), dolna -Z (w dół).
    // Oko umieszczone na górze, lekko z przodu.
    // ----------------------------------------------------------
    _buildMesh() {
        const R = 0.50;   // promień kuli

        const mat = new THREE.MeshPhongMaterial({
            color:             COLOR_PACMAN,
            emissive:          COLOR_PACMAN,
            emissiveIntensity: 0.50,
            shininess:         100,
        });

        // Górna półkula – PEŁNA (phiStart=0, phiLength=2π).
        // Usta widoczne TYLKO przez obrót rotation.z – brak geometrycznej przerwy,
        // która powodowała rozpadanie się modelu.
        const topGeo = new THREE.SphereGeometry(R, 36, 14, 0, Math.PI * 2, 0, Math.PI / 2);
        this.upperJaw = new THREE.Mesh(topGeo, mat);
        this.upperJaw.castShadow = true;

        // Dolna półkula – PEŁNA
        const botGeo = new THREE.SphereGeometry(R, 36, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
        this.lowerJaw = new THREE.Mesh(botGeo, mat);
        this.lowerJaw.castShadow = true;

        // Dwa oczy – czarne kulki w górno-przedniej części
        const eyeMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
        const eyeGeo = new THREE.SphereGeometry(0.08, 8, 8);
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(0.30, 0.32,  0.18);  // lewe
        eyeR.position.set(0.30, 0.32, -0.18);  // prawe

        // Poświata
        const glowMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.72, 16, 16),
            new THREE.MeshBasicMaterial({ color: COLOR_PACMAN, transparent: true, opacity: 0.10, side: THREE.BackSide })
        );

        this.group.add(this.upperJaw, this.lowerJaw, eyeL, eyeR, glowMesh);
        // y=0.50 → dolny brzeg kuli tuż na podłodze
        this.group.position.set(colToX(this.col), 0.50, rowToZ(this.row));
    }

    /**
     * Ustawia żądany kierunek ruchu (buforowany – zastosowany przy najbliższym skrzyżowaniu).
     * @param {number} dc – delta kolumny:  -1 lewo, +1 prawo, 0 bez zmiany
     * @param {number} dr – delta wiersza: -1 góra, +1 dół,   0 bez zmiany
     */
    setNextDirection(dc, dr) { this.nextDirection = { dc, dr }; }

    /**
     * Aktualizuje pozycję i animację Pacmana.
     * Ruch odbywa się komórka-po-komórce z interpolacją (progress 0→1).
     * Przy dotarciu do celu sprawdza buforowany kierunek i przesuwa się dalej.
     * @param {number} dt – czas klatki w sekundach
     */
    update(dt) {
        if (this.progress >= 1.0) {
            this.col = this.targetCol; this.row = this.targetRow;
            this.progress = 0;
            if (this.col < 0)     this.col = COLS - 1;
            if (this.col >= COLS) this.col = 0;

            const nc = this.col + this.nextDirection.dc;
            const nr = this.row + this.nextDirection.dr;
            if (isWalkable(nc, nr)) this.direction = { ...this.nextDirection };

            const tc = this.col + this.direction.dc;
            const tr = this.row + this.direction.dr;
            if (this.direction.dc !== 0 || this.direction.dr !== 0) {
                if (isWalkable(tc, tr)) {
                    this.targetCol = tc; this.targetRow = tr;
                } else {
                    this.progress = 1.0; return;
                }
            } else {
                this.progress = 1.0; return;
            }
        }

        this.progress = Math.min(this.progress + dt * PACMAN_SPEED, 1.0);

        this.group.position.x = colToX(this.col)  + (colToX(this.targetCol)  - colToX(this.col))  * this.progress;
        this.group.position.z = rowToZ(this.row)   + (rowToZ(this.targetRow)  - rowToZ(this.row))  * this.progress;

        const key = `${this.direction.dc},${this.direction.dr}`;
        if (DIR_ANGLE[key] !== undefined) this.group.rotation.y = DIR_ANGLE[key];

        const chomp = Math.abs(Math.sin(Date.now() * 0.010)) * 0.38;
        this.upperJaw.rotation.z =  chomp;
        this.lowerJaw.rotation.z = -chomp;
    }

    /** Zwraca pozycję docelowej komórki (używana do wykrywania kolizji i zbierania kulek). */
    getGridPos() { return { col: this.targetCol, row: this.targetRow }; }

    /**
     * Resetuje Pacmana do pozycji startowej (używane przy nowej grze i po utracie życia).
     * @param {number} startCol – kolumna startowa
     * @param {number} startRow – wiersz startowy
     */
    reset(startCol, startRow) {
        this.col = startCol; this.row = startRow;
        this.targetCol = startCol; this.targetRow = startRow;
        this.progress = 1.0;
        this.direction = { dc: 0, dr: 0 };
        this.nextDirection = { dc: 0, dr: 0 };
        this.group.position.set(colToX(startCol), 0.50, rowToZ(startRow));
        this.group.rotation.y = 0;
        this.upperJaw.rotation.z = 0;
        this.lowerJaw.rotation.z = 0;
    }
}

// ============================================================
// KLASA GHOST
// ============================================================
export class Ghost {
    constructor(startCol, startRow, colorHex, index) {
        this.startCol = startCol; this.startRow = startRow;
        this.col = startCol; this.row = startRow;
        this.targetCol = startCol; this.targetRow = startRow;
        this.progress  = 1.0;
        this.index     = index;
        this.normalColor = colorHex;
        // Kierunek startowy: w górę (ku wyjściu z domu duchów, wiersz 7)
        this.direction   = { dc: 0, dr: -1 };
        this.scared      = false;
        this.scaredTimer = 0;

        // Stan "martwy" – duch czeka na respawn
        this.dead         = false;
        this.respawnTimer = 0;

        // Parametry zależne od trudności – domyślne jak NORMALNY
        this.speed        = GHOST_SPEED;
        this.scaredSpeed  = GHOST_SCARED_SPEED;
        this.respawnTime  = 5;
        this.chaseEnabled = false;   // tylko na TRUDNY

        // Aktywny tryb pogoni – kiedy duch zobaczył gracza i ściga go przez chwilę
        this.chaseTimer = 0;

        this.group = new THREE.Group();
        this._buildMesh(colorHex);
    }

    /**
     * Ustawia parametry prędkości i AI zależne od wybranego poziomu trudności.
     * Wywoływana przez main.js tuż przed startGame().
     * @param {Object} cfg – obiekt z DIFFICULTIES[key]
     */
    configure(cfg) {
        this.speed        = cfg.ghostSpeed;
        this.scaredSpeed  = cfg.scaredSpeed;
        this.respawnTime  = cfg.respawnTime;
        this.chaseEnabled = cfg.chaseEnabled;
    }

    // ----------------------------------------------------------
    // Model ducha:
    //   - sferyczna głowa (górna półkula)
    //   - walcowe ciało
    //   - 5 półkul na dole (postrzępiona spódnica jak w oryginale)
    //   - oczy: biała sfera + ciemna źrenica
    //   - poświata BackSide sphere
    // ----------------------------------------------------------
    _buildMesh(colorHex) {
        this.bodyMat = new THREE.MeshPhongMaterial({
            color:    colorHex,
            emissive: new THREE.Color(colorHex).multiplyScalar(0.5),
            shininess: 80,
        });

        // Głowa – górna półkula
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.42, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2),
            this.bodyMat
        );
        head.position.y = 0.42;
        head.castShadow = true;

        // Ciało – walec
        const body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.42, 0.42, 0.42, 24),
            this.bodyMat
        );
        body.position.y = 0.21;
        body.castShadow = true;

        // Spódnica – 5 dolnych półkul (postrzępiony dół jak w oryginale)
        const skirtGeo = new THREE.SphereGeometry(0.14, 10, 7, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const s = new THREE.Mesh(skirtGeo, this.bodyMat);
            s.position.set(Math.cos(angle) * 0.28, 0, Math.sin(angle) * 0.28);
            s.castShadow = true;
            this.group.add(s);
        }

        // Oczy
        const eyeWhiteMat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x888888 });
        const eyePupilMat = new THREE.MeshPhongMaterial({ color: 0x000066, emissive: 0x000033 });

        const makeEye = (side) => {
            const w = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 10), eyeWhiteMat);
            const p = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8),   eyePupilMat);
            w.position.set(side * 0.17, 0.60, 0.33);
            p.position.set(side * 0.17, 0.60, 0.39);
            return [w, p];
        };

        // Poświata
        this.glowMat = new THREE.MeshBasicMaterial({
            color: colorHex, transparent: true, opacity: 0.18, side: THREE.BackSide,
        });
        const glowMesh = new THREE.Mesh(new THREE.SphereGeometry(0.68, 14, 14), this.glowMat);
        glowMesh.position.y = 0.35;

        this.group.add(head, body, glowMesh, ...makeEye(-1), ...makeEye(1));
        this.group.position.set(colToX(this.col), 0, rowToZ(this.row));
    }

    /**
     * Aktywuje tryb strachu: zmienia kolor na niebieski i ustawia odliczanie.
     * Ignorowany gdy duch jest już martwy (respawn). Anuluje chaseTimer.
     */
    scare() {
        if (this.dead) return;
        this.scared = true; this.scaredTimer = SCARED_DURATION;
        this.chaseTimer = 0;   // przestraszony duch nie goni
        this.bodyMat.color.setHex(GHOST_SCARED_COLOR);
        this.bodyMat.emissive.set(0x000066);
        this.glowMat.color.setHex(GHOST_SCARED_COLOR);
    }

    /** Przywraca normalny kolor ducha po wygaśnięciu power pelletu. */
    unscare() {
        this.scared = false;
        this.bodyMat.color.setHex(this.normalColor);
        this.bodyMat.emissive.copy(new THREE.Color(this.normalColor).multiplyScalar(0.5));
        this.glowMat.color.setHex(this.normalColor);
    }

    /**
     * Oznacza ducha jako martwego – ukrywa go i uruchamia odliczanie respawnu.
     * Po upłynięciu respawnTime (sekundy, zależne od trudności) duch
     * wraca do startCol/startRow i rusza w górę ku wyjściu z bazy.
     */
    kill() {
        this.dead         = true;
        this.scared       = false;
        this.scaredTimer  = 0;
        this.chaseTimer   = 0;
        this.respawnTimer = this.respawnTime;
        this.group.visible = false;
    }

    /**
     * Aktualizuje pozycję i stan ducha każdą klatkę.
     * Obsługuje: odliczanie respawnu, wygasanie efektu strachu,
     * tryb pogoni (chaseTimer), ruch z interpolacją oraz animację bujania.
     * @param {number} dt         – czas klatki w sekundach
     * @param {number} pacmanCol  – aktualna kolumna Pacmana (do AI)
     * @param {number} pacmanRow  – aktualny wiersz Pacmana (do AI)
     */
    update(dt, pacmanCol, pacmanRow) {
        // --- Stan martwy: odliczaj i respawnuj ---
        if (this.dead) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) {
                this.dead = false;
                this.group.visible = true;
                this.unscare();
                this.col = this.startCol; this.row = this.startRow;
                this.targetCol = this.startCol; this.targetRow = this.startRow;
                this.progress  = 1.0;
                this.direction = { dc: 0, dr: -1 };   // w górę – ku wyjściu z bazy
                this.group.position.set(colToX(this.startCol), 0, rowToZ(this.startRow));
            }
            return;
        }

        if (this.scared) {
            this.scaredTimer -= dt;
            if (this.scaredTimer <= 0) this.unscare();
        }

        // Tryb pogoni (tylko TRUDNY): jeśli gracz jest blisko, śledź go przez 4 sekundy
        if (this.chaseEnabled && !this.scared) {
            const dist = Math.abs(this.col - pacmanCol) + Math.abs(this.row - pacmanRow);
            if (dist <= 9) this.chaseTimer = 4.0;
        }
        if (this.chaseTimer > 0) this.chaseTimer -= dt;

        const speed = this.scared ? this.scaredSpeed : this.speed;

        if (this.progress >= 1.0) {
            this.col = this.targetCol; this.row = this.targetRow;
            this.progress = 0;
            if (this.col < 0)     this.col = COLS - 1;
            if (this.col >= COLS) this.col = 0;
            this.direction = this._chooseDirection(pacmanCol, pacmanRow);
            this.targetCol = this.col + this.direction.dc;
            this.targetRow = this.row + this.direction.dr;
        }

        this.progress = Math.min(this.progress + dt * speed, 1.0);
        this.group.position.x = colToX(this.col) + (colToX(this.targetCol) - colToX(this.col)) * this.progress;
        this.group.position.z = rowToZ(this.row)  + (rowToZ(this.targetRow)  - rowToZ(this.row))  * this.progress;

        // Animacja bujania – duch lekko unosi się i opada
        this.group.position.y = 0.10 * Math.sin(Date.now() * 0.003 + this.index * 1.2);

        const key = `${this.direction.dc},${this.direction.dr}`;
        if (DIR_ANGLE[key] !== undefined) this.group.rotation.y = DIR_ANGLE[key];
    }

    /**
     * Wybiera kierunek ruchu ducha na podstawie jego AI.
     * Priorytety (od najwyższego):
     *  1. Ghost house → zawsze idź ku wyjściu (wiersz 8).
     *  2. chaseTimer > 0 → Manhattan distance ku Pacmanowi (zezwala na zawrócenie).
     *  3. Przestraszony → losowy kierunek spośród dostępnych.
     *  4. Normalny → Manhattan distance ku Pacmanowi, bez zawracania;
     *     Pinky (1) i Clyde (3) losowo zbaczają w 20% przypadków.
     * @param {number} pacmanCol – kolumna Pacmana
     * @param {number} pacmanRow – wiersz Pacmana
     * @returns {{ dc: number, dr: number }} wybrany kierunek
     */
    _chooseDirection(pacmanCol, pacmanRow) {
        // W ghost house: zawsze idź prosto w górę ku wyjściu (wiersz 8).
        // Zwykłe AI (Manhattan distance) preferuje kierunek KU Pacmanowi, który jest
        // poniżej bazy – bez tego duchy zapętlają się wewnątrz.
        if (isGhostHouseCell(this.col, this.row)) {
            if (isWalkableGhost(this.col, this.row - 1)) return { dc: 0, dr: -1 };
            if (isWalkableGhost(this.col + 1, this.row)) return { dc: 1,  dr:  0 };
            if (isWalkableGhost(this.col - 1, this.row)) return { dc: -1, dr:  0 };
        }

        // Tryb pogoni: zezwól na zawrócenie, zawsze wybierz kierunek ku graczowi
        if (this.chaseTimer > 0) {
            const all = DIRS.filter(d => isWalkableGhost(this.col + d.dc, this.row + d.dr));
            if (all.length === 0) return this.direction;
            return all.reduce((best, d) => {
                const nc = this.col + d.dc, nr = this.row + d.dr;
                const bc = this.col + best.dc, br = this.row + best.dr;
                return (Math.abs(nc - pacmanCol) + Math.abs(nr - pacmanRow)) <
                       (Math.abs(bc - pacmanCol) + Math.abs(br - pacmanRow)) ? d : best;
            });
        }

        // Normalny ruch: bez zawracania, Manhattan distance do gracza
        const rev        = { dc: -this.direction.dc, dr: -this.direction.dr };
        const candidates = DIRS.filter(d => {
            if (d.dc === rev.dc && d.dr === rev.dr) return false;
            return isWalkableGhost(this.col + d.dc, this.row + d.dr);
        });
        if (candidates.length === 0) return rev;
        if (candidates.length === 1) return candidates[0];
        if (this.scared) return candidates[Math.floor(Math.random() * candidates.length)];
        if ((this.index === 1 || this.index === 3) && Math.random() < 0.20)
            return candidates[Math.floor(Math.random() * candidates.length)];

        return candidates.reduce((best, d) => {
            const nc = this.col + d.dc, nr = this.row + d.dr;
            const bc = this.col + best.dc, br = this.row + best.dr;
            return (Math.abs(nc - pacmanCol) + Math.abs(nr - pacmanRow)) <
                   (Math.abs(bc - pacmanCol) + Math.abs(br - pacmanRow)) ? d : best;
        });
    }

    /**
     * Resetuje ducha do pozycji startowej (nowa gra / utrata życia przez Pacmana).
     * @param {number} startCol – kolumna startowa
     * @param {number} startRow – wiersz startowy
     */
    reset(startCol, startRow) {
        this.dead = false; this.respawnTimer = 0; this.chaseTimer = 0;
        this.col = startCol; this.row = startRow;
        this.startCol = startCol; this.startRow = startRow;
        this.targetCol = startCol; this.targetRow = startRow;
        this.progress = 1.0;
        this.direction = { dc: 0, dr: -1 };   // w górę – ku wyjściu z bazy
        this.scared = false; this.scaredTimer = 0;
        this.unscare();
        this.group.visible = true;
        this.group.position.set(colToX(startCol), 0, rowToZ(startRow));
    }
}
