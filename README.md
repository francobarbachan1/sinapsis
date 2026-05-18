# Sinapsis

Videojuego web 2D educativo: el jugador recorre un cerebro adolescente y resuelve, en cada región, una prueba cuya mecánica refleja la función real de esa zona del cerebro.

Implementación de la especificación `Sinapsis_Especificacion_Tecnica.md` (referencia: secciones citadas en el código).

---

## Cómo probarlo localmente

El proyecto es un sitio estático: HTML + JS (ES modules) + WAV + Phaser cargado por CDN. Necesita servirse por HTTP (los `import` ES module no funcionan con `file://`).

### Opción 1 — servidor incluido (Windows, sin instalar nada)

```powershell
powershell -ExecutionPolicy Bypass -File tools\serve.ps1
```

Abre `http://localhost:8000/`.

Cambiar puerto: `-Port 8080`.

### Opción 2 — cualquier servidor estático

```bash
# Python 3
python -m http.server 8000

# Node
npx http-server -p 8000

# VS Code: extensión "Live Server"
```

Abrir `http://localhost:<puerto>/`.

---

## Cómo desplegar en GitHub Pages

1. Push del proyecto a un repo de GitHub (rama `main`).
2. En el repo → **Settings → Pages**.
3. **Source**: Deploy from a branch.
4. **Branch**: `main`, carpeta `/ (root)`.
5. Guardar y esperar el deploy. La URL queda como `https://<usuario>.github.io/<repo>/`.

El archivo `.nojekyll` ya está incluido para que GitHub Pages sirva todas las carpetas sin procesarlas. Todas las rutas a assets son relativas (no empiezan con `/`), por lo que funcionan bajo el subdirectorio que asigna GitHub Pages.

No hace falta `npm install` ni paso de build.

---

## Controles

- **Movimiento del avatar:** WASD o flechas.
- **Entrar a una región:** caminá hasta ella (sólo responde la región indicada por la pista activa).
- **Resolver una estación:** mouse.
- **Hipocampo (Estación 3):** barra espaciadora o clic para marcar el ritmo.

---

## Estructura

```
sinapsis/
├── index.html
├── .nojekyll
├── README.md
├── src/
│   ├── main.js                   # init de Phaser
│   ├── config.js                 # TODO el contenido editable
│   ├── state.js                  # estado global de la partida
│   ├── soundManager.js           # capas de audio dinámico
│   └── scenes/
│       ├── BootScene.js          # carga de audio
│       ├── IntroScene.js         # apertura + consigna
│       ├── MapScene.js           # cerebro + avatar + zonas
│       ├── HudScene.js           # cronómetro + pista activa + confirmaciones
│       ├── EndScene.js           # cierre metacognitivo
│       └── stations/
│           ├── StationBase.js    # esqueleto común
│           ├── AmigdalaStation.js
│           ├── OccipitalStation.js
│           ├── HipocampoStation.js
│           ├── ParietalStation.js
│           ├── BrocaStation.js
│           └── PrefrontalStation.js
├── assets/
│   ├── audio/                    # WAV placeholder (ver abajo)
│   └── img/                      # vacío — toda la gráfica se dibuja por código
└── tools/
    ├── generate-audio.ps1        # regenera los WAV placeholder
    └── serve.ps1                 # servidor estático para desarrollo
```

---

## Configuración editable

Todo lo que un equipo puede querer ajustar sin tocar código vive en `src/config.js`:

- `tiempoTotalSegundos` — cronómetro (default 900 = 15:00).
- `palabraOccipital` — palabra que se revela en la Estación 2 (default `"NEURONA"`).
- `fraseBroca` y `distractoresBroca` — Estación 5.
- `grillaParietal` — layout 6×6 (inicio, meta, obstáculos) de la Estación 4.
- `rondasHipocampo` y `toleranciaTimingMs` — Estación 3.
- `preguntasPrefrontal` — 5 preguntas de opción múltiple de la Estación 6.
- `pistas` — las 6 pistas y sus confirmaciones (Sección 7 del spec).
- `textoApertura`, `textoFinDeTiempo`, `textoCierreCompleto`.
- `regiones` — posición, radio y color de cada una de las 6 regiones del mapa.
- `rutasAudio` — rutas a los 11 archivos de audio (ver abajo).

---

## Audio placeholder — archivos a reemplazar

Los 11 archivos en `assets/audio/` son **placeholders** (tonos sintéticos simples generados por código). Reemplazarlos no requiere tocar ningún `.js`: alcanza con poner archivos del mismo nombre en el mismo directorio.

| Archivo | Uso | Detalle |
|---|---|---|
| `ambient.wav` | Capa base, bucle continuo | Tono calmo. |
| `tension.wav` | Capa de tensión, bucle | Se sube cuando el jugador lleva ~30 s sin progreso. |
| `resolution.wav` | Al resolver una estación | Fragmento breve. |
| `sting-logro.wav` | Al iluminar una región | Sonido corto. |
| `rhythm-1.wav` | Estación 3 (Hipocampo) ronda 1 | 4 golpes en `[0, 500, 1000, 1500]` ms. |
| `rhythm-2.wav` | Estación 3 ronda 2 | 5 golpes en `[0, 450, 900, 1450, 1900]` ms. |
| `rhythm-3.wav` | Estación 3 ronda 3 | 6 golpes en `[0, 400, 800, 1300, 1700, 2100]` ms. |
| `emotion-calma.wav` | Estación 1 (Amígdala) | ~4 s, carácter calmo. |
| `emotion-tension.wav` | Estación 1 | ~4 s, carácter tenso. |
| `emotion-alegria.wav` | Estación 1 | ~4 s, carácter alegre. |
| `emotion-tristeza.wav` | Estación 1 | ~4 s, carácter triste. |

**Sobre los ritmos de la Estación 3 (Sección 16 del spec):** son simples patrones rítmicos. No los etiqueten como "ondas alfa", "frecuencias del aprendizaje" ni nada similar. Si el integrante de Música quiere alterar los tiempos de los golpes, además del archivo, debe actualizar `PATRONES_MS` en `src/scenes/stations/HipocampoStation.js` para que la validación de timing siga calzando.

Si querés regenerar los WAV placeholder desde cero:

```powershell
powershell -ExecutionPolicy Bypass -File tools\generate-audio.ps1
```

---

## Decisiones tomadas (cosas que no estaban en el spec)

- **Formato de audio:** WAV. El spec no especifica formato, pero por contexto se esperaba MP3/OGG. Se generaron WAV porque el entorno no tenía encoder disponible (ni ffmpeg, ni Python, ni Node). Todos los navegadores modernos reproducen WAV; Phaser los soporta nativamente. El integrante de Música puede usar el formato que prefiera siempre que mantenga los nombres y actualice `rutasAudio` en `config.js` si cambia las extensiones.
- **Gráfica:** todo el arte se dibuja por código (formas geométricas + texto). No hay sprites en `assets/img/`. El estilo es plano según Sección 10. La silueta del cerebro es un polígono con leve jitter para que se vea orgánico pero estable entre cargas.
- **Layout del mapa:** brain area a la izquierda (720×720) + panel HUD a la derecha (304×720), dentro de un canvas de 1024×720.
- **Resolución de estaciones (UX):** click-click o drag, según la mecánica de cada una. En Broca, click en una palabra del pool la agrega a la línea; click en una palabra de la línea la devuelve al pool. En Amígdala se usa drag de etiquetas sobre fragmentos.
- **Audio de los ritmos (Estación 3):** los patrones están definidos en código (`PATRONES_MS`) y los archivos `rhythm-N.wav` reproducen exactamente esos tiempos. Si se reemplazan los WAV, los nuevos audios deben respetar los mismos timings para que la validación rítmica siga teniendo sentido (o actualizar `PATRONES_MS`).
- **EndScene metacognitiva:** se muestra el cerebro con las regiones logradas y un texto que dice explícitamente "ese cerebro que recorrieron es el suyo" (Sección 16, recordatorio 4).
- **Listener cleanup:** scene start vuelve a llamar `create()` sobre la misma instancia, por lo que los handlers en `game.events` y `scene.events` se limpian con `off()` antes de re-suscribirse para evitar acumulación entre partidas.
- **Sin paso de build:** Phaser se carga por CDN (`phaser@3.80.1`) y todo el código se importa como ES module nativo. Cero `node_modules`, cero `package.json`.

---

## Reglas pedagógicas no negociables (Sección 16 del spec)

Estas reglas son del marco académico del proyecto. **No romperlas.**

1. **El error nunca se castiga.** No hay vidas, no hay "game over" punitivo. Fallar permite reintentar libremente. En el código: ninguna estación reduce un contador ni cierra ante un fallo.
2. **Los ritmos de la Estación 3 NO son "ondas alfa"** ni "frecuencias del aprendizaje". Son patrones rítmicos para trabajar memoria de trabajo. Si se editan textos o sonidos, mantener ese registro.
3. **El mensaje de fin de tiempo es cuidado, no punitivo.** Texto exacto en `CONFIG.textoFinDeTiempo`. El foco está en lo que se construyó, no en lo que faltó.
4. **El cierre es metacognitivo.** Texto exacto en `CONFIG.textoCierreCompleto` + la línea de revelación: "Ese cerebro que recorrieron es el suyo".

---

## Criterios de "terminado" (Sección 15 del spec)

- [x] Se puede jugar de principio a fin: apertura → 6 estaciones en orden → cierre.
- [x] Avatar se mueve libremente por el mapa-cerebro con WASD/flechas.
- [x] Las 6 estaciones funcionan con sus mecánicas y son resolubles.
- [x] El sistema de pistas entrega las 6 pistas y sus confirmaciones; las regiones equivocadas no responden.
- [x] Las regiones se iluminan al resolverse y permanecen iluminadas.
- [x] Audio dinámico con 3 capas + sting (placeholder).
- [x] Cronómetro corre, es visible, y al llegar a 0 bloquea el juego con el mensaje cuidado.
- [x] Pantalla de cierre muestra el cerebro con las regiones logradas y etiquetas anatómicas.
- [x] Todo el contenido editable está en `config.js`.
- [x] El error no se penaliza en ninguna estación.
- [x] Assets de audio marcados como placeholder.
- [x] El proyecto se despliega en GitHub Pages sin pasos de build (probado: rutas relativas + `.nojekyll`).
- [x] README explica cómo probarlo, desplegarlo y qué placeholders reemplazar.
