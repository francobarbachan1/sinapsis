# Imágenes — sprites opcionales

El juego se entrega con **todos los gráficos generados por código** (procedural).
Esta carpeta queda lista para sumar sprites externos si querés más detalle
visual, manteniendo la licencia libre.

## Recomendado: Kenney.nl

[Kenney.nl](https://kenney.nl) ofrece sprite packs **CC0** (dominio público).
Sirven especialmente bien para Sinapsis estos tres:

- **[Particle Pack](https://kenney.nl/assets/particle-pack)** — partículas para
  reemplazar `particula`, `pulsoEstres`, `neuronaGlow` (las texturas
  procedurales que `BootScene._generarTexturas()` crea). Sumá las PNG que te
  interesen en `assets/img/` y reescribí `BootScene.preload()` para hacer
  `this.load.image('particula', 'assets/img/particle_xxxx.png')` antes de la
  generación procedural — el `load.image` pisa la textura procedural si tienen
  la misma key.
- **[UI Pack (RPG Expansion)](https://kenney.nl/assets/ui-pack-rpg-expansion)**
  — frames y botones para reemplazar los rectángulos con bordes de las cards
  de `IntroScene`, los modales de consigna y los botones de cada estación.
- **[Generic Items / Top-Down](https://kenney.nl/assets/generic-items)** —
  formas orgánicas/blobs que pueden funcionar como "tejido cerebral" en las
  paredes de las salas.

## Cómo cambiar de procedural a sprite

1. Descargar el pack desde Kenney.nl (ZIP).
2. Extraer las PNG individuales que quieras usar y copiarlas a esta carpeta.
3. En `src/scenes/BootScene.js`, dentro de `preload()`, agregar
   `this.load.image('keyDelSprite', 'assets/img/archivo.png');` ANTES de que
   `create()` ejecute la generación procedural — al cargar con la misma key,
   Phaser usa la imagen externa.
4. Citá el pack y la licencia en el README principal del proyecto.

## Licencia

Kenney libera todo bajo **[CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/)**:
podés usar sus assets sin atribución requerida — aunque citarlos en el README
es buena práctica y refuerza el marco de "licencia libre" del proyecto.
