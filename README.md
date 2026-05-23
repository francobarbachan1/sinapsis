# Sinapsis

Videojuego web 2D educativo: el jugador es una **neurona** que recorre un cerebro adolescente, esquiva pulsos de estrés en los pasajes y resuelve, en cada región, una prueba cuya mecánica refleja la función real de esa zona.

Implementación de la especificación **v2** (`Sinapsis_Especificacion_Tecnica_v2.md`). Cambios destacados de v2:

- **Mapa-dungeon multi-sala** (Sección 5): el cerebro deja de ser una pantalla con seis círculos y pasa a 9 salas conectadas por puertas, con cámara fija por sala y transición al cruzar.
- **Movimiento con física** (Sección 5.2): aceleración/drag suaves, colisión real con paredes, calibrable en `velocidadAvatar`.
- **Pulsos de estrés / cortisol** (Sección 5.3) en las salas conectoras: si tocan a la neurona, la frenan ~1.4 s; sin daño, sin vidas.
- **Dificultad subida para terciario** (Sección 6.0): palabra más larga + menos tiempo en Occipital; patrones 5/7/9 irregulares en Hipocampo; grilla con 6 obstáculos en Parietal; 6 distractores con 3 sintácticamente plausibles en Broca; 5 etiquetas (1 distractora) en Amígdala; preguntas más precisas en Prefrontal. Todo en `config.dificultad`.
- **Pulido visual** (Sección 10.1): fades entre escenas y salas, microanimaciones, glow real en regiones encendidas, partículas de fondo, cronómetro que cambia de color, y una **animación clímax** cuando se conectan las 6 regiones.

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
python -m http.server 8000   # Python 3
npx http-server -p 8000      # Node
# o VS Code Live Server
```

Abrir `http://localhost:<puerto>/`.

---

## Cómo desplegar en GitHub Pages

1. Push del proyecto a un repo de GitHub (rama `main`).
2. **Settings → Pages**.
3. **Source**: Deploy from a branch.
4. **Branch**: `main`, carpeta `/ (root)`.
5. Guardar y esperar el deploy. URL: `https://<usuario>.github.io/<repo>/`.

El archivo `.nojekyll` ya está incluido. Todas las rutas a assets son relativas, por lo que el juego funciona bajo el subdirectorio que asigna GitHub Pages. No hace falta `npm install` ni paso de build.

---

## Controles

- **Mover la neurona:** WASD o flechas. Hay aceleración suave; la neurona "tiende" a la velocidad pedida.
- **Cruzar a otra sala:** caminar hasta el marco de la puerta. La transición es automática con fade.
- **Entrar a una estación:** pisar el pad central de la sala-región **cuando esa región sea la indicada por la pista activa**.
- **Resolver cada estación:** mouse (estaciones 1, 2, 4, 5, 6). En Hipocampo también barra espaciadora.
- **Pulsos de estrés:** si te tocan, te frenan unos segundos. No hay vidas: sólo te ralentizan.

---

## Estructura

```
sinapsis/
├── index.html
├── .nojekyll
├── README.md
├── Sinapsis_Especificacion_Tecnica_v2.md     # spec vinculante
├── src/
│   ├── main.js                   # init de Phaser + arcade physics
│   ├── config.js                 # TODO el contenido editable
│   ├── state.js                  # estado global de la partida
│   ├── soundManager.js           # capas de audio dinámico
│   └── scenes/
│       ├── BootScene.js          # carga audio + genera texturas
│       ├── IntroScene.js         # apertura + consigna
│       ├── MapScene.js           # dungeon: salas, paredes, puertas, pulsos
│       ├── HudScene.js           # cronómetro + pista + minimapa
│       ├── EndScene.js           # cierre metacognitivo
│       └── stations/
│           ├── StationBase.js    # esqueleto común (consigna, fades, resolución)
│           ├── AmigdalaStation.js
│           ├── OccipitalStation.js
│           ├── HipocampoStation.js
│           ├── ParietalStation.js
│           ├── BrocaStation.js
│           └── PrefrontalStation.js
├── assets/
│   ├── audio/                    # WAV placeholder (ver abajo)
│   └── img/                      # vacío — todo el arte es procedural
└── tools/
    ├── generate-audio.ps1        # regenera los WAV placeholder
    └── serve.ps1                 # servidor HTTP estático local
```

---

## Configuración editable

Todo lo que un equipo puede querer ajustar sin tocar código vive en `src/config.js`:

- **`tiempoTotalSegundos`** — cronómetro (default 900 = 15:00).
- **`mapa`** — salas + puertas + posición en el minimapa. Cambiar la conectividad del cerebro no requiere tocar `MapScene`.
- **`pulsosEstres`** — radio, velocidad, duración del stun, cooldown.
- **`velocidadAvatar`** — `maxSpeed`, `acceleration`, `drag`, `radio` de colisión.
- **`dificultad`** — bloque con todos los parámetros calibrables por estación:
  - `amigdala.emocionDistractora` — nombre de la etiqueta que sobra.
  - `occipital.palabra`, `.alternativas`, `.tiempoMostrarSecuenciaMs`.
  - `hipocampo.patrones` (array de arrays de timings ms) y `.toleranciaMs`.
  - `parietal.cols/rows/inicio/meta/obstaculos`.
  - `broca.distractores`.
- **`fraseBroca`** — la frase objetivo (independiente de los distractores).
- **`preguntasPrefrontal`** — 5 preguntas de opción múltiple.
- **`pistas`** — las 6 pistas y sus 6 confirmaciones (Sección 7 del spec).
- **`textoApertura`, `textoFinDeTiempo`, `textoCierreCompleto`**.
- **`regiones`** — color, nombre, posición/radio para la vista compacta del cerebro (EndScene y clímax). No define el mapa jugable: eso es `mapa`.
- **`rutasAudio`** — rutas a los 11 archivos de audio.

---

## Audio — qué hay en `assets/audio/`

Algunos archivos ya son **audio real** del integrante de Música; otros siguen como placeholders sintéticos generados por `tools/generate-audio.ps1`. Reemplazar cualquier archivo no requiere tocar `.js` siempre y cuando se mantenga el nombre y la extensión (o se actualice `config.rutasAudio`).

### Reales (MP3)

| Archivo | Uso | Estado |
|---|---|---|
| `ambient.mp3` | Música de fondo, bucle continuo | ✅ real |
| `emotion-calma.mp3` | Estación 1 (Amígdala) — fragmento "calma" | ✅ real |
| `emotion-tension.mp3` | Estación 1 — "tensión" | ✅ real |
| `emotion-alegria.mp3` | Estación 1 — "alegría" | ✅ real |
| `emotion-tristeza.mp3` | Estación 1 — "tristeza" | ✅ real |

### Placeholders sintéticos (WAV — reemplazar cuando esté la música)

| Archivo | Uso | Detalle |
|---|---|---|
| `tension.wav` | Capa de tensión, bucle | Se sube cuando el jugador lleva ~30 s sin progreso. |
| `resolution.wav` | Al resolver una estación | Fragmento breve. |
| `sting-logro.wav` | Al iluminar una región | Sonido corto. |
| `note-1.wav` ... `note-7.wav` | Estación 3 (Hipocampo) | Escala C mayor (Do, Re, Mi, Fa, Sol, La, Si) — 7 notas. |
| `rhythm-1.wav` | (legacy, no se usa en gameplay actual) | 5 golpes en `[0, 350, 700, 1250, 1600]` ms (irregular). |
| `rhythm-2.wav` | (legacy) | 7 golpes en `[0, 300, 750, 1200, 1500, 1900, 2400]` ms. |
| `rhythm-3.wav` | (legacy) | 9 golpes en `[0, 350, 650, 1100, 1450, 1800, 2300, 2700, 3200]` ms. |

**Sobre la Estación 3 (Sección 16 del spec):** las notas musicales son simples notas, no se presentan como "ondas alfa", "frecuencias del aprendizaje" ni nada similar. Si el integrante de Música quiere reemplazar las 7 notas, basta con sustituir los archivos `note-1.wav` ... `note-7.wav` (o cambiar la extensión a `.mp3` y actualizar `config.rutasAudio`).

Para regenerar todos los WAV placeholder desde cero:

```powershell
powershell -ExecutionPolicy Bypass -File tools\generate-audio.ps1
```

---

## Decisiones tomadas (cosas que no estaban explícitas en el spec)

- **Formato de audio:** WAV. El spec no fija formato; en v1 se intentó MP3/OGG pero el entorno no tenía encoder. Todos los navegadores modernos reproducen WAV; Phaser los soporta nativamente. El integrante de Música puede usar el formato que prefiera; si cambia las extensiones, actualizar `rutasAudio` en `config.js`.
- **Gráfica:** todo procedural (formas geométricas + texto + texturas generadas en runtime). No hay sprites externos en `assets/img/`. La neurona-avatar, los pulsos de estrés, sus halos y los efectos del clímax se construyen con `Graphics.generateTexture` en `BootScene`. Si la cosa quedara corta, se pueden agregar sprites libres de Kenney.nl (Sección 10.1 lo permite) — actualmente no hizo falta.
- **Layout del cerebro:** 9 salas (6 regiones + 3 conectores) en una grilla 3×5 anatómicamente aproximada (prefrontal arriba, occipital abajo, broca al frente-izquierda, parietal arriba-derecha, amígdala e hipocampo en el medio profundo). Definición completa en `config.mapa`.
- **Spawn y vuelta:** después de resolver una estación, la neurona vuelve a la misma sala-región (no a un lugar central). Si la región está resuelta, la neurona aparece desplazada hacia una puerta para no re-disparar el acceso.
- **Estación 1 (Amígdala) — distractor:** se pone una etiqueta extra que no asocia a ningún fragmento (default "Sorpresa"). El equipo debe inferir cuál sobra. Editable en `config.dificultad.amigdala.emocionDistractora`.
- **Estación 2 (Occipital) — palabra default:** `APRENDIZAJE` (11 letras, 9 únicas). Eleva la longitud de la secuencia y el tamaño de la paleta. Editable.
- **Estación 3 (Hipocampo) — patrones irregulares:** los golpes ya no son equidistantes; tienen pequeñas variaciones de tempo que exigen más memoria de trabajo. Si cambian los patrones, **regenerar el audio** porque los WAV de placeholder fueron sintetizados para calzar con los timings actuales.
- **Estación 4 (Parietal) — layout más exigente:** 6 obstáculos (en lugar de 4) ubicados de forma que el camino directo no exista; obliga a planificar con más pasos.
- **Estación 5 (Broca) — distractores plausibles:** `siente`, `puede`, `aprenda` son flexiones que encajan sintácticamente y exigen análisis fino. Configurables.
- **Estación 6 (Prefrontal) — preguntas reescritas:** más precisas, con opciones incorrectas plausibles. Para responder bien no basta haber pasado: hay que haber atendido la consigna.
- **Pulsos de estrés:** sólo en salas conectoras (no en salas-región). El número, velocidad y duración del stun se calibran en `config.pulsosEstres`. La regla del spec —no daño, no vidas— se respeta: el efecto es exclusivamente ralentizar al avatar unos segundos.
- **Clímax sinapsis:** al consolidar las 5 preguntas de Prefrontal, se oscurece la pantalla, aparece la silueta del cerebro, se encienden las 6 regiones una por una con sting, y se dibujan las 15 conexiones entre regiones con un "impulso" recorriéndolas. Termina con flash blanco, shake breve, y fade a EndScene.
- **Listener cleanup:** scene start vuelve a llamar `create()` sobre la misma instancia, por lo que los handlers en `game.events` y `scene.events` se limpian con `off()` antes de re-suscribirse para evitar acumulación entre partidas. Los colliders de física se destruyen explícitamente al recargar una sala.
- **Sin paso de build:** Phaser se carga por CDN (`phaser@3.80.1`) y todo el código se importa como ES module nativo. Cero `node_modules`, cero `package.json`.

---

## Reglas pedagógicas no negociables (Sección 16 del spec)

Estas reglas son del marco académico del proyecto. **No romperlas.**

1. **El error nunca se castiga.** No hay vidas, no hay "game over" punitivo. Fallar permite reintentar libremente. Los pulsos de estrés respetan esta regla: sólo ralentizan, no quitan nada.
2. **Los ritmos de la Estación 3 NO son "ondas alfa"** ni "frecuencias del aprendizaje". Son patrones rítmicos para trabajar memoria de trabajo. Si se editan textos o sonidos, mantener ese registro.
3. **El mensaje de fin de tiempo es cuidado, no punitivo.** Texto exacto en `CONFIG.textoFinDeTiempo`. El foco está en lo que se construyó, no en lo que faltó.
4. **El cierre es metacognitivo.** Texto exacto en `CONFIG.textoCierreCompleto` + la línea de revelación: "Ese cerebro que recorrieron es el suyo".

---

## Criterios de "terminado" (Sección 15 del spec)

- [x] Se puede jugar de principio a fin: apertura → 6 estaciones en orden → cierre.
- [x] La neurona-avatar se mueve libremente por el mapa-dungeon con WASD/flechas, con aceleración y colisión.
- [x] Las 6 estaciones funcionan con sus mecánicas y son resolubles (con dificultad subida para terciario).
- [x] El sistema de pistas entrega las 6 pistas y sus confirmaciones; las regiones equivocadas no responden.
- [x] Las regiones se iluminan al resolverse y permanecen iluminadas (con glow + halo pulsante).
- [x] Audio dinámico con 3 capas + sting (placeholder).
- [x] Cronómetro corre, es visible, cambia de color cuando queda poco, y al llegar a 0 bloquea el juego con el mensaje cuidado.
- [x] Pantalla de cierre muestra el cerebro con las regiones logradas y etiquetas anatómicas, con latido sutil.
- [x] Todo el contenido editable está en `config.js`.
- [x] El error no se penaliza en ninguna estación (ni los pulsos de estrés).
- [x] Assets de audio marcados como placeholder.
- [x] El proyecto se despliega en GitHub Pages sin pasos de build.
- [x] README explica cómo probarlo, desplegarlo y qué placeholders reemplazar.

## Licencia y uso

Este es un recurso educativo abierto, libre para uso de cualquier docente 
o institución.

- **Código fuente:** MIT License (ver LICENSE)
- **Contenidos pedagógicos:** Creative Commons BY-SA 4.0 (ver LICENSE-content.md)

Autoría: grupo Sinapsis — Franco Barbachan, Pablo Barrios, Pablo Fuentes, 
Vicente Debrun, Silvia Locaputo. CERP del Sur, Formación Docente, 2026.

Si lo usás en tu clase, nos encantaría saberlo: francobarbachan1@gmail.com
