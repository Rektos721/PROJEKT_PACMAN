# PAC-MAN 3D — Projekt zaliczeniowy
### Grafika Komputerowa | Three.js / JavaScript / HTML5 / CSS

Trójwymiarowa wersja klasycznej gry Pac-Man zrealizowana w silniku Three.js.
Gracz porusza Pac-Manem po labiryncie 3D, zbierając kulki i unikając duchów.

---

## Uruchomienie

Projekt wymaga lokalnego serwera HTTP (przeglądarka blokuje moduły ES ładowane z `file://`).

### Metoda 1 — Python (zalecana)
```bash
cd PROJEKT_PACMAN
python -m http.server 8765
```
Następnie otwórz w przeglądarce: **http://localhost:8765**

### Metoda 2 — Node.js (npx)
```bash
cd PROJEKT_PACMAN
npx serve .
```

### Wymagania
- Nowoczesna przeglądarka z obsługą WebGL i ES Modules (Chrome 90+, Firefox 88+, Edge 90+)
- Python 3.x **lub** Node.js (tylko do lokalnego serwera)
- Połączenie z internetem przy pierwszym uruchomieniu (pobiera Three.js z CDN)

---

## Sterowanie

| Klawisz / Akcja | Funkcja |
|---|---|
| `↑ ↓ ← →` lub `W A S D` | Ruch Pac-Mana |
| `P` lub `Escape` | Pauza / wznowienie |
| **Mysz** (przeciągnij) | Obrót kamery 3D |
| **Scroll myszy** | Zoom kamery (min. 14, max. 75 j.) |
| Kliknięcie `ŁATWY / NORMALNY / TRUDNY` | Wybór poziomu i start gry |
| Kliknięcie `WZNÓW` | Powrót z pauzy |
| Kliknięcie `ZAGRAJ PONOWNIE` | Nowa gra po zakończeniu |

---

## Zasady gry

- Zbierz **wszystkie kulki** na planszy, żeby wygrać
- **Mała kulka** → +10 punktów
- **Duża biała kulka (power pellet)** → +50 punktów + duchy stają się niebieskie i można je zjeść przez **8 sekund**
- **Zjedzony duch** → +200 punktów
- Masz **3 życia** — kontakt z normalnym duchem kosztuje życie
- Bonus czasowy: **5000 pkt − 10 pkt za każdą sekundę** gry

---

## Poziomy trudności

| Poziom | Aktywne duchy | Prędkość duchów | Respawn | Tryb pogoni |
|---|---|---|---|---|
| ŁATWY | 2 | 2.2 | 5 sek | Nie |
| NORMALNY | 3 | 3.0 | 3 sek | Nie |
| TRUDNY | 4 | 4.2 | 2 sek | Tak (gdy Pac-Man blisko) |

---

## Struktura projektu

```
PROJEKT_PACMAN/
├── index.html          # Strona główna: automat arcade (HTML + CSS)
├── js/
│   ├── main.js         # Punkt wejścia: renderer, scena, pętla animacji, logika gry
│   ├── config.js       # Stałe konfiguracyjne (prędkości, kolory, poziomy trudności)
│   ├── maze.js         # Dane labiryntu, budowanie sceny 3D, konwersja siatka↔3D
│   ├── characters.js   # Klasy Pacman i Ghost (ruch, AI, animacja, kolizje)
│   └── audio.js        # Synteza dźwięku przez Web Audio API (bez plików MP3)
└── README.md           # Ten plik
```

---

## Technologie

| Technologia | Zastosowanie |
|---|---|
| **Three.js r160** | Silnik 3D — scena, kamera, oświetlenie, geometrie, materiały |
| **WebGL** | Renderowanie 3D przez Three.js (`WebGLRenderer`) |
| **JavaScript ES Modules** | Modułowa architektura kodu (`import`/`export`) |
| **HTML5 Canvas** | Cel renderowania Three.js + generowanie tekstury podłogi |
| **Web Audio API** | Synteza dźwięku w czasie rzeczywistym (muzyka, efekty) |
| **CSS3** | Interfejs automatu arcade, animacje, efekt CRT, perspektywa |
| **localStorage** | Przechowywanie tablicy wyników (top 5) |

---

## Elementy graficzne

- **4 źródła światła**: AmbientLight, DirectionalLight (z cieniami PCF), PointLight (dynamiczna, śledzi Pac-Mana), SpotLight (nad bazą duchów)
- **Materiały**: `MeshPhongMaterial` (Phong shading), `MeshBasicMaterial`, `LineBasicMaterial`
- **Tekstura**: proceduralnie generowana szachownica (`CanvasTexture`) na podłodze
- **Mgła**: `FogExp2` dla atmosfery głębi
- **Cienie**: `PCFSoftShadowMap` (miękkie krawędzie)
- **Modele**: Pac-Man z dwóch półkul z animacją ust; duchy ze sfery, walca i spódnicy z półkul
