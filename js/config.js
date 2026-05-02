// ============================================================
// config.js – wszystkie stałe konfiguracyjne gry
// Trzymamy "magiczne liczby" w jednym miejscu – łatwa zmiana
// ============================================================

// Rozmiar jednej komórki labiryntu w jednostkach Three.js
export const CELL = 2;

// Liczba kolumn i wierszy mapy (muszą zgadzać się z MAZE_LAYOUT w maze.js)
export const COLS = 19;
export const ROWS = 22;

// Wysokość ściany (oś Y w Three.js)
export const WALL_HEIGHT = 1.6;

// Prędkości ruchu: komórki na sekundę
export const PACMAN_SPEED       = 5;
export const GHOST_SPEED        = 3;
export const GHOST_SCARED_SPEED = 2;   // duchy zwolnione gdy przestraszone

// Czas trwania efektu power pelletu (sekundy)
export const SCARED_DURATION = 8;

// ---- Typy komórek w tablicy MAZE_LAYOUT ----
export const CELL_WALL        = 1;   // ściana – nieprzejezdna
export const CELL_DOT         = 0;   // mała kulka do zebrania
export const CELL_PELLET      = 2;   // power pellet – duża biała kulka
export const CELL_EMPTY       = 3;   // puste pole (można chodzić, brak kulki)
export const CELL_GHOST_HOUSE = 4;   // wnętrze bazy duchów

// ---- Kolory (hex, format Three.js) ----
export const COLOR_WALL   = 0x0000cc;   // ciemny niebieski – klasyczny Pacman
export const COLOR_FLOOR  = 0x0a0a0a;
export const COLOR_DOT    = 0xffff99;
export const COLOR_PELLET = 0xffffff;
export const COLOR_PACMAN = 0xffee00;   // żółty

// Kolory 4 duchów: Blinky (czerwony), Pinky (różowy), Inky (cyan), Clyde (pomarańczowy)
export const GHOST_COLORS       = [0xff0000, 0xffb8ff, 0x00ffff, 0xffb852];
export const GHOST_SCARED_COLOR = 0x0000ee;   // niebieski gdy przestraszony

// ---- Poziomy trudności ----
// activeGhosts – ile z 4 duchów jest aktywnych
// chaseEnabled – czy duchy wchodzą w tryb pogoni po zobaczeniu gracza
export const DIFFICULTIES = {
    easy: {
        label:        'ŁATWY',
        activeGhosts: 2,
        ghostSpeed:   2.2,
        scaredSpeed:  1.5,
        respawnTime:  5,
        chaseEnabled: false,
    },
    normal: {
        label:        'NORMALNY',
        activeGhosts: 3,
        ghostSpeed:   3.0,
        scaredSpeed:  2.0,
        respawnTime:  3,
        chaseEnabled: false,
    },
    hard: {
        label:        'TRUDNY',
        activeGhosts: 4,
        ghostSpeed:   4.2,
        scaredSpeed:  2.8,
        respawnTime:  2,
        chaseEnabled: true,   // duchy gonią gracza po zobaczeniu go
    },
};
