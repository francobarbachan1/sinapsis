# Sinapsis — Especificación técnica del videojuego

> Documento de construcción para un agente de desarrollo (Claude Code).
> Objetivo: implementar el juego web descrito en la planificación pedagógica del proyecto "Sinapsis".
> Todo lo que está en este documento es vinculante. Lo que no esté definido aquí, resolverlo con el criterio más simple y robusto, y dejarlo señalado en el README.

---

## 1. Contexto del proyecto

Sinapsis es un videojuego 2D educativo desarrollado como propuesta de gamificación para un trabajo de la asignatura Psicología de la Educación. Es un *serious game*: su finalidad es que estudiantes de Educación Secundaria comprendan, jugando, cómo funciona el cerebro adolescente cuando aprende.

**Premisa de diseño:** el mapa del juego es un cerebro adolescente visto en planta. El jugador recorre sus regiones y resuelve, en cada una, una prueba cuya mecánica corresponde a la función real de esa región del cerebro. El recorrido completo enciende el cerebro.

**Modalidad de uso en el aula:** un equipo de 3 a 5 estudiantes comparte una sola computadora y se turna el teclado. A nivel de código, esto es un **juego de un solo jugador**: una partida, un avatar, control por teclado. La dinámica grupal la maneja el equipo; el juego no necesita lógica multijugador.

---

## 2. Stack tecnológico

- **Motor recomendado:** Phaser 3 (última versión estable). Si se considera que otra opción es claramente superior para estos requisitos, puede proponerse, pero Phaser 3 es la base esperada.
- **Lenguaje:** JavaScript (ES modules). Sin TypeScript.
- **Sin paso de build.** Cargar Phaser desde CDN e importar módulos nativamente. El objetivo es que el proyecto sea un conjunto de archivos estáticos que se puedan abrir y desplegar sin compilar.
- **Despliegue objetivo:** GitHub Pages (sitio estático). Ver sección 13.
- **Compatibilidad:** navegadores de escritorio modernos (Chrome, Firefox, Edge). No es necesario optimizar para móvil.

---

## 3. Estructura del proyecto

Estructura sugerida (adaptable, pero mantener la separación entre escenas, configuración y assets):

```
sinapsis/
├── index.html
├── README.md
├── .nojekyll
├── src/
│   ├── main.js                 # inicialización de Phaser
│   ├── config.js               # CONTENIDO EDITABLE (ver sección 12)
│   └── scenes/
│       ├── BootScene.js        # carga de assets
│       ├── IntroScene.js       # pantalla de apertura + consigna
│       ├── MapScene.js         # el cerebro: hub de navegación
│       ├── EndScene.js         # pantalla de cierre metacognitivo
│       └── stations/
│           ├── AmigdalaStation.js
│           ├── OccipitalStation.js
│           ├── HipocampoStation.js
│           ├── ParietalStation.js
│           ├── BrocaStation.js
│           └── PrefrontalStation.js
└── assets/
    ├── audio/                  # TODO placeholder — ver sección 11
    └── img/                    # sprites e imágenes
```

---

## 4. Flujo general del juego

1. **IntroScene** — pantalla de apertura. Muestra el título "Sinapsis", la consigna inicial (texto en sección 7) y un botón para comenzar. Tutorial brevísimo de controles.
2. **MapScene** — el jugador aparece en el mapa-cerebro (estructura de salas, sección 5). Arranca el cronómetro (15:00). La guía entrega la primera pista. El jugador recorre las salas hasta la región indicada y entra en su estación.
3. **Estaciones** — al entrar en una región, se abre la escena de su estación. Al resolverla, la región se ilumina, suena un *sting* de logro, y la guía entrega la pista siguiente. Se vuelve al mapa.
4. Se repite para las 6 estaciones, en el orden fijo: **Amígdala → Occipital → Hipocampo → Parietal → Broca → Prefrontal**.
5. **EndScene** — al completar las 6 estaciones (o al agotarse el tiempo) se llega a la pantalla de cierre.

**Regla de progresión:** las estaciones se resuelven en orden. La guía solo habilita la siguiente cuando la actual está resuelta. El jugador puede caminar libremente por el mapa, pero solo la región indicada por la pista activa responde al entrar.

---

## 5. El mapa (MapScene) — estructura tipo dungeon

> **Cambio respecto de la versión anterior de este documento.** El mapa ya no es una sola pantalla con seis zonas. Pasa a ser un conjunto de **salas conectadas que el jugador recorre de verdad**, en la línea de *The Binding of Isaac* (versión simplificada, sin combate). El cerebro deja de ser un menú y pasa a ser un lugar para explorar.

### 5.1 Estructura

- El cerebro adolescente se representa como un **mapa de salas conectadas por puertas/pasajes**. Vista cenital 2D.
- Hay **6 salas-región** —una por estación— más **2 o 3 salas de conexión** vacías que dan amplitud y obligan a recorrer. Total: 8-9 salas.
- Cada sala es una pantalla. Al cruzar una puerta, **se cambia de sala** (transición de pantalla, no scroll continuo). El avatar aparece del lado correspondiente de la sala nueva.
- La disposición debe respetar de forma aproximada la anatomía: la sala occipital hacia atrás, Broca y prefrontal hacia el frente, parietal arriba, hipocampo y amígdala en la zona media. Las salas de conexión se ubican entre medio.
- Las salas-región muestran, en su centro o en una zona marcada, el **acceso a la estación**: cuando el avatar lo pisa y esa región es la indicada por la pista activa, se abre la escena de la estación.
- Una sala-región ya resuelta queda **iluminada de forma permanente** (su color pleno, con realce). Las no resueltas se ven apagadas/atenuadas.
- Debe existir un **minimapa** discreto en pantalla que muestre las salas, cuál está ocupando el jugador y cuáles regiones ya encendió. Ayuda a orientarse sin romper la exploración.

### 5.2 Controles y movimiento

- **El avatar es una neurona.** El personaje que el jugador controla representa una neurona que recorre el cerebro y lo conecta. Visualmente: un cuerpo central con dendritas/axón estilizados, simple pero reconocible. Es coherente con el tema del juego —una neurona que enciende y conecta las regiones— y con el nombre "Sinapsis".
- Avatar controlado con **WASD y/o flechas**. El movimiento debe **sentirse como un juego**: aceleración y desaceleración suave, colisión real con las paredes, velocidad bien calibrada (ni lento ni incontrolable). Nada de movimiento rígido tipo casilla.
- Cámara fija por sala (cada sala entra completa en pantalla).

### 5.3 Obstáculos en el recorrido — pulsos de estrés

- Las salas de conexión —y opcionalmente alguna sala-región antes de resolverla— contienen **obstáculos móviles que el jugador debe esquivar**.
- Estos obstáculos son **temáticos: representan pulsos de estrés / cortisol**, no enemigos genéricos. Visualmente, formas o partículas que recorren la sala con trayectorias simples (líneas rectas, rebotes, patrullas).
- Si un pulso toca al avatar, **no hay daño ni "vida"**: el efecto es frenar o aturdir al jugador unos segundos (lo ralentiza o lo empuja). Coherente con la regla de que el error no se castiga.
- Este obstáculo tiene lectura pedagógica: el estrés que entorpece el camino del aprendizaje. Puede mencionarse en el cierre.
- La densidad y velocidad de los pulsos son **configurables** (sección 12) y forman parte de la dificultad (sección 6.0).

### 5.4 HUD

En pantalla, durante el mapa y las estaciones: el **cronómetro** (sección 9), el panel con la **pista activa** (sección 7) y el **minimapa**.

---

## 6. Las seis estaciones

Cada estación es una escena propia. Comparten estas reglas generales:

- **El error no se penaliza.** No hay vidas, no hay "game over" por fallar. Fallar permite reintentar. Esto es una decisión pedagógica deliberada (el error como parte del aprendizaje); respetarla.
- Al resolver una estación: animación de la región iluminándose, *sting* de logro, la capa de audio de resolución (sección 8), y regreso al mapa con la pista siguiente.
- Cada estación muestra un botón discreto para volver a leer la consigna.
- Identidad de color: cada estación usa el color de su región (sección 10).

### 6.0 — Nivel de dificultad

> **Cambio respecto de la versión anterior.** La actividad está dirigida a **estudiantes de educación terciaria** (formación docente), no a adolescentes. El público tiene mayor habilidad, así que la dificultad sube en consecuencia: la "zona de flujo" se calibra hacia arriba.

- Las estaciones deben representar un **desafío real**: que un grupo tenga que pensar, discutir y esforzarse, no resolver por inercia. La versión inicial quedó demasiado fácil; hay que subir el techo de cada prueba de forma notoria.
- Pautas concretas por estación: secuencia de colores más larga y/o menos tiempo de exhibición (Occipital); patrones rítmicos más largos e irregulares (Hipocampo); grilla con más obstáculos y ruta menos obvia (Parietal); más distractores, y distractores que *casi* encajan en la frase (Broca); fragmentos emocionales más ambiguos (Amígdala); preguntas de síntesis que exijan recordar con precisión (Prefrontal).
- **Límite:** sigue valiendo que el error no se castiga y que el grupo debe poder terminar el recorrido en los ~15 minutos. La dificultad sube hacia "alta pero superable cooperando", no hacia "frustrante". Si la prueba se vuelve un muro, contradice el marco de la zona de flujo.
- Todos los parámetros de dificultad (longitudes, tiempos, tolerancias, cantidad de obstáculos) van en `config.js` para poder calibrarlos jugando.

### 6.1 — Estación 1: Amígdala (Emoción)

- **Color:** rosa/magenta (`#993556`).
- **Función representada:** la amígdala dispara las emociones; hiperreactiva en la adolescencia; cuando se altera, bloquea el acceso a la corteza.
- **Mecánica:** suenan **4 fragmentos musicales breves**, cada uno con un carácter emocional distinto. En pantalla hay 4 etiquetas de emoción: **Calma, Tensión, Alegría, Tristeza**. El jugador hace clic en un fragmento para escucharlo (puede repetirlo), y lo asocia (arrastrar o clic-clic) con la etiqueta que le corresponde.
- **Condición de éxito:** los 4 fragmentos correctamente asociados.
- **Manejo del error:** una asociación incorrecta devuelve el fragmento a su lugar, sin penalización; se puede reintentar libremente.
- **Cierre de la estación:** al acertar los 4, animación de "la amígdala se calma" y la región se ilumina.
- **Audio:** 4 clips placeholder de ~4 segundos, con estados de ánimo claramente diferenciados (ver sección 11).
- **Dificultad:** media. Es la apertura: conceptualmente accesible.

### 6.2 — Estación 2: Lóbulo occipital (Percepción visual)

- **Color:** azul (`#185FA5`).
- **Función representada:** procesa lo que vemos (formas, colores); es la puerta de entrada de la información.
- **Mecánica:** en pantalla hay una **clave visible** que asocia cada color con una letra. Se muestra una **secuencia de fichas de colores** durante ~3-4 segundos y luego se oculta. El jugador reconstruye la secuencia haciendo clic en las fichas de colores en el orden correcto, de memoria. Al reconstruirla, las letras correspondientes se revelan y forman una palabra del curso.
- **Palabra objetivo:** `NEURONA` (configurable — ver sección 12). La clave de colores tendrá tantos colores como letras únicas tenga la palabra (NEURONA → 6 colores: N, E, U, R, O, A).
- **Condición de éxito:** secuencia reproducida correctamente → palabra revelada.
- **Manejo del error:** si se equivoca, puede volver a ver la secuencia (mostrar la secuencia de nuevo, sin límite duro; el cronómetro general sigue corriendo).
- **Dificultad:** fácil. Mantiene al jugador dentro de la zona de flujo al inicio.

### 6.3 — Estación 3: Hipocampo (Memoria)

- **Color:** verde (`#0F6E56`).
- **Función representada:** decide qué información se guarda; es el archivo del cerebro.
- **Mecánica:** suena un **patrón rítmico**. El jugador lo escucha y, tras una pausa, lo **reproduce** pulsando la barra espaciadora (o haciendo clic) en el ritmo. El juego valida el timing de cada pulsación dentro de una ventana de tolerancia.
  - Ronda 1: 4 golpes. Ronda 2: 5 golpes. Ronda 3: 6 golpes.
- **Condición de éxito:** completar las 3 rondas.
- **Manejo del error:** si una ronda falla, se repite esa ronda (no se reinicia la estación).
- **Audio:** patrones placeholder con notas de piano neutras y agradables. **Importante:** no etiquetar estos sonidos como "ondas alfa", "frecuencias del aprendizaje" ni similares. Son simplemente patrones rítmicos. La estación trabaja *memoria*, no requiere esa justificación.
- **Dificultad:** media. Carga de memoria de trabajo creciente.

### 6.4 — Estación 4: Lóbulo parietal (Orientación espacial)

- **Color:** violeta (`#534AB7`).
- **Función representada:** orientación espacial, cálculo, planificación.
- **Mecánica:** una **grilla de 6×6** con una celda de inicio, una celda meta y **4 obstáculos**. El jugador **no mueve en vivo**: primero **planifica toda la secuencia de movimientos** (arriba/abajo/izquierda/derecha) agregándolos a una cola visible; cuando termina, presiona "Ejecutar" y el avatar recorre la secuencia paso a paso. Si choca un obstáculo o un borde, la ejecución falla y el jugador **replanifica**.
- **Condición de éxito:** el avatar llega a la meta.
- **Manejo del error:** al fallar, la cola de movimientos se puede limpiar/editar y volver a intentar, sin penalización.
- **Configurable:** el layout de la grilla (posiciones de inicio, meta y obstáculos).
- **Dificultad:** media. Exige planificación anticipada (pensamiento computacional).

### 6.5 — Estación 5: Área de Broca (Lenguaje)

- **Color:** coral (`#993C1D`).
- **Función representada:** producción del lenguaje; el lenguaje organiza y estructura el pensamiento.
- **Mecánica:** una frase clave del curso aparece **desordenada**, como fichas de palabras, mezcladas con **fichas distractoras** que no pertenecen a la frase. El jugador arrastra las fichas a una línea de construcción en el orden correcto, dejando afuera las distractoras.
  - **Frase objetivo:** `No se puede aprender lo que no se siente` (9 palabras).
  - **Distractores sugeridos (3):** `siempre`, `todo`, `fácilmente`.
- **Condición de éxito:** la frase correcta queda armada y las distractoras quedan sin usar.
- **Manejo del error:** se puede reordenar libremente hasta acertar.
- **Configurable:** la frase y los distractores.
- **Dificultad:** media-alta. Requiere análisis sintáctico.

### 6.6 — Estación 6: Corteza prefrontal (Integración)

- **Color:** ámbar (`#854F0B`).
- **Función representada:** la región que integra, decide y conecta; última en madurar.
- **Mecánica:** las 5 regiones anteriores ya están iluminadas. Aparece un **reto de síntesis**: por cada una de las 5 regiones, una pregunta breve de **opción múltiple** que recupera un dato vivido en esa estación. Al responder bien, esa región queda "consolidada" (un check visible). Cuando las 5 están consolidadas, la **corteza prefrontal se enciende** y todo el cerebro se conecta con una animación de líneas uniendo las regiones.
- **Preguntas sugeridas (una por región, editables):**
  - Amígdala: *¿Qué hay que hacer con la amígdala para que el cerebro pueda aprender?* → calmarla.
  - Occipital: *¿Qué palabra revelaste en la zona de la percepción?* → NEURONA.
  - Hipocampo: *¿Qué función cumple el hipocampo?* → guardar la memoria.
  - Parietal: *¿Qué tipo de pensamiento usaste para planificar la ruta?* → la planificación.
  - Broca: *¿Qué tuviste que reconstruir en la zona del lenguaje?* → una frase con sentido.
- **Condición de éxito:** las 5 regiones consolidadas → cerebro completo iluminado → pasa a EndScene.
- **Dificultad:** cierre rápido. Es síntesis de lo ya recorrido.

---

## 7. Sistema de guía por pistas

Una **guía** (narrador en pantalla; puede representarse como un panel de texto o un personaje simple) entrega **una pista por vez**. Cada pista describe la *función* de la región de destino **sin nombrarla**; el equipo deduce a dónde ir. Al llegar a la región correcta y resolver su estación, una **confirmación** aparece y refuerza el dato anatómico.

Si el avatar entra en una región que no es la indicada por la pista activa, esa región **no responde** (no se penaliza, no pasa nada negativo).

**Texto de apertura (IntroScene):**

> Están a punto de recorrer un cerebro adolescente. Ustedes son un aprendizaje que intenta consolidarse, y para lograrlo deben encender sus seis regiones. No les diremos a dónde ir: deberán deducirlo. Cada región se reconoce por aquello que hace. Atiendan la primera indicación.

**Las 6 pistas y sus confirmaciones** (texto exacto, editable en `config.js`):

| # | Destino | Pista | Confirmación al llegar |
|---|---------|-------|------------------------|
| 1 | Amígdala | Antes de aprender, este cerebro necesita estar en calma. Existe una estructura pequeña y profunda que reacciona primero ante todo, que dispara las emociones antes de que llegue el razonamiento; cuando se altera, bloquea al resto del cerebro. Diríjanse a la región responsable de las emociones y cálmenla. | Correcto: esta es la amígdala. Mientras esté alterada, ningún aprendizaje pasará a la corteza. |
| 2 | Lóbulo occipital | El cerebro ya está receptivo; ahora la información debe entrar. Hacia la parte posterior del cerebro hay una región encargada de recibir lo que vemos: las formas, los colores, los estímulos del mundo exterior. Diríjanse a la zona de la percepción visual. | Correcto: este es el lóbulo occipital, la puerta de entrada de todo lo que se percibe. |
| 3 | Hipocampo | Percibir no alcanza: lo percibido debe conservarse. En lo profundo del lóbulo temporal hay una estructura con forma de caballito de mar que decide qué se guarda y qué se olvida. Diríjanse a la región de la memoria. | Correcto: este es el hipocampo, el archivo del cerebro. |
| 4 | Lóbulo parietal | Lo aprendido necesita ordenarse en el espacio y en la lógica. En la parte superior del cerebro hay una región que gobierna la orientación, el cálculo y la ubicación de las cosas. Diríjanse a la zona encargada del espacio y el orden. | Correcto: este es el lóbulo parietal, donde el cerebro organiza el espacio. |
| 5 | Área de Broca | Ningún pensamiento se organiza del todo sin palabras. Hacia el frente del cerebro existe una región asociada a la producción del lenguaje y a la planificación. Diríjanse a la zona del lenguaje y reconstruyan el sentido. | Correcto: esta es el área de Broca, donde el lenguaje le da forma al pensamiento. |
| 6 | Corteza prefrontal | Solo queda un paso. La región más nueva, la última en madurar, ubicada justo detrás de la frente, es la que integra todo: la que decide, planifica y conecta. Diríjanse a ella con todo lo que reunieron en el camino. | Correcto: esta es la corteza prefrontal. Es hora de encender el cerebro completo. |

---

## 8. Sistema de audio dinámico

El audio responde al estado del juego. Todas las pistas de audio son **placeholder** (sección 11).

- **Capa base (ambiente):** suena en bucle durante todo el desarrollo (mapa y estaciones). Tono calmo.
- **Capa de tensión:** se mezcla por encima de la base cuando el jugador lleva un tiempo prolongado trabado en una estación sin progreso (umbral sugerido: ~30 segundos sin resolver). Representa el estado de alta amígdala. Se desvanece al haber progreso.
- **Capa de resolución:** fragmento breve que suena al resolver una estación.
- **Sting de logro:** sonido corto que acompaña la iluminación de cada región.

El sistema debe estar construido de modo que reemplazar los archivos de audio (sección 11) no requiera tocar la lógica.

---

## 9. Cronómetro y bloqueo por tiempo

- Cuenta regresiva de **15:00 minutos**, visible en pantalla durante el desarrollo (no corre durante IntroScene ni EndScene). Duración configurable.
- Al llegar a **0:00**: el juego se **bloquea** — se desactiva el control del avatar y de las estaciones — y aparece un mensaje de fin de tiempo, **pedagógicamente cuidado** (no debe sonar a "perdiste"). Texto sugerido, editable:

> El tiempo de esta sesión terminó. Cada región que lograron encender es una conexión real que su cerebro construyó al resolver, equivocarse y volver a intentar. El recorrido continúa ahora en la conversación con su grupo.

- Tras ese mensaje se pasa a EndScene, mostrando las regiones que sí se lograron iluminar.

---

## 10. Identidad visual

Estilo **plano y limpio**, tipografía sans-serif, sin gradientes ni efectos recargados. La interfaz va en registro **formal-neutro** (ni coloquial ni rígido).

> Nota: la paleta de abajo es del juego. Las "normas APA" aplican únicamente al documento académico escrito, no al videojuego — el juego puede usar libremente estos colores.

Paleta por región:

| Región | Color principal | Fondo suave |
|--------|-----------------|-------------|
| Amígdala | `#993556` | `#FBEAF0` |
| Lóbulo occipital | `#185FA5` | `#E6F1FB` |
| Hipocampo | `#0F6E56` | `#E1F5EE` |
| Lóbulo parietal | `#534AB7` | `#EEEDFE` |
| Área de Broca | `#993C1D` | `#FAECE7` |
| Corteza prefrontal | `#854F0B` | `#FAEEDA` |

Colores generales de interfaz: azul oscuro `#1F3864` (títulos), azul `#2E5FA3` (acentos), gris `#5F5E5A` (texto secundario), fondo claro `#FBFAF7`.

Una región **apagada** se muestra atenuada (baja saturación / opacidad). Una región **iluminada** muestra su color pleno con un realce visible.

### 10.1 Pulido visual (objetivo de calidad)

> **Cambio respecto de la versión anterior.** La primera versión quedó visualmente plana. El objetivo ahora es que el juego *se sienta como un juego*, no como un prototipo. Mantener el estilo 2D y limpio, pero con vida.

Pautas de pulido (Claude Code decide la implementación concreta, priorizando lo que se logra por código sin assets externos pesados):

- **Transiciones:** fundidos (fade) entre escenas y entre salas; nada de cortes secos.
- **Feedback / "juice":** cada acierto, cada ficha que se coloca, cada puerta que se cruza debe tener una microanimación (tween, destello, pequeño rebote). Es lo que más diferencia un juego pulido de uno plano.
- **El cerebro:** silueta más orgánica; las regiones con bordes definidos; un efecto de "encendido" real cuando se ilumina una región (glow que crece, pulso).
- **El momento sinapsis (clímax):** al completar las 6 regiones, las conexiones entre ellas se dibujan/encienden una tras otra con una animación destacada. Es el punto donde más conviene invertir esfuerzo visual: es además el clímax pedagógico.
- **Ambiente:** fondo no plano (partículas lentas tipo impulsos nerviosos); el avatar con una animación mínima de desplazamiento.
- **HUD:** el cronómetro cambia de color cuando queda poco tiempo.
- Si los gráficos generados por código no alcanzan para el nivel buscado, se pueden sumar sprites 2D de un banco de assets libres (p. ej. Kenney.nl), siempre de licencia libre y citados en el README. Primero exprimir lo procedural.

---

## 11. Assets placeholder — lista de lo que hay que reemplazar

El juego debe entregarse **funcionando de punta a punta** con assets placeholder. Los archivos de audio los reemplazará después el integrante de Música. Marcar claramente cada placeholder (en el nombre de archivo, en `config.js` y en el README).

Audio a generar como placeholder:

- `ambient` — bucle de ambiente calmo (capa base).
- `tension` — capa de tensión.
- `resolution` — fragmento breve de resolución.
- `sting-logro` — sonido corto de logro.
- `rhythm-1`, `rhythm-2`, `rhythm-3` — patrones rítmicos de la Estación 3 (notas de piano neutras; 4, 5 y 6 golpes respectivamente).
- `emotion-calma`, `emotion-tension`, `emotion-alegria`, `emotion-tristeza` — 4 fragmentos de ~4 s para la Estación 1, con estados de ánimo claramente distintos.

Para los gráficos (avatar, mapa-cerebro, fichas, grilla), se pueden usar formas geométricas simples generadas por código o sprites básicos. No es necesario arte elaborado; sí debe ser claro y legible.

---

## 12. Configuración editable (`config.js`)

Centralizar en un único archivo todo el contenido que el equipo podría querer ajustar sin tocar la lógica:

- `tiempoTotalSegundos` — duración del cronómetro (default: 900).
- `palabraOccipital` — palabra de la Estación 2 (default: `"NEURONA"`); idealmente admite una lista de alternativas.
- `fraseBroca` — la frase de la Estación 5 y su lista de `distractores`.
- `pistas` — las 6 pistas y sus 6 confirmaciones (texto de la sección 7).
- `textoApertura` y `textoFinDeTiempo` — textos de la sección 7 y 9.
- `grillaParietal` — layout de la Estación 4 (inicio, meta, obstáculos).
- `rondasHipocampo` — cantidad de golpes por ronda y la tolerancia de timing.
- `preguntasPrefrontal` — las 5 preguntas de opción múltiple de la Estación 6.
- `rutasAudio` — rutas a los archivos de audio placeholder.
- `mapa` — disposición de las salas: qué salas existen, qué región contiene cada una, cómo se conectan (qué puertas llevan a qué sala).
- `dificultad` — todos los parámetros que calibran el desafío (sección 6.0): longitud de la secuencia de colores y su tiempo de exhibición, golpes por ronda del ritmo y tolerancia, cantidad de obstáculos de la grilla, cantidad de distractores de Broca, etc.
- `pulsosEstres` — densidad y velocidad de los obstáculos de las salas de conexión (sección 5.3).
- `velocidadAvatar` — para calibrar el movimiento.

---

## 13. Despliegue en GitHub Pages

- El proyecto es estático: no requiere servidor ni paso de compilación.
- Incluir un archivo vacío `.nojekyll` en la raíz para que GitHub Pages sirva todas las carpetas sin procesarlas.
- Cargar Phaser desde CDN en `index.html`.
- Todas las rutas a assets deben ser **relativas** (no absolutas desde `/`), para que el juego funcione bajo el subdirectorio que asigna GitHub Pages.
- En el README, incluir instrucciones para: (a) probarlo localmente con un servidor estático simple, y (b) publicarlo activando GitHub Pages sobre la rama principal.

---

## 14. Fuera de alcance

No implementar (mantener el proyecto acotado):

- Sistema de combate, inventario, niveles múltiples.
- Guardado de progreso, cuentas de usuario, tablas de puntaje.
- Modo multijugador o lógica de red.
- Gráficos 3D.
- Cualquier funcionalidad de IA.

---

## 15. Criterios de "terminado"

El juego está completo cuando:

- [ ] Se puede jugar de principio a fin: apertura → 6 estaciones en orden → cierre.
- [ ] El avatar se mueve libremente por el mapa-cerebro con WASD/flechas.
- [ ] Las 6 estaciones funcionan con sus mecánicas descritas y son resolubles.
- [ ] El sistema de pistas entrega las 6 pistas y sus confirmaciones; las regiones equivocadas no responden.
- [ ] Las regiones se iluminan al resolverse y permanecen iluminadas.
- [ ] El audio dinámico funciona con las 3 capas + sting (placeholder).
- [ ] El cronómetro corre, es visible, y al llegar a cero bloquea el juego con el mensaje cuidado.
- [ ] La pantalla de cierre muestra el cerebro con las regiones logradas, etiquetadas con su nombre anatómico, y el texto metacognitivo.
- [ ] Todo el contenido editable está en `config.js`.
- [ ] El error no se penaliza en ninguna estación.
- [ ] Los assets de audio están claramente marcados como placeholder.
- [ ] El proyecto se despliega en GitHub Pages sin pasos de build.
- [ ] El README explica cómo probarlo, cómo desplegarlo y qué placeholders reemplazar.

---

## 16. Recordatorios pedagógicos (no romper estas reglas)

Estas reglas vienen del marco académico del proyecto. Romperlas debilita el trabajo:

1. **El error nunca se castiga.** Equivocarse y reintentar es parte del diseño. Nada de "vidas", "game over" punitivo ni mensajes que humillen.
2. **Los ritmos de la Estación 3 no se presentan como "ondas alfa"** ni como frecuencias que "mejoran el aprendizaje". Son patrones rítmicos, nada más.
3. **El mensaje de fin de tiempo y el de cierre son cuidados y no punitivos.** El foco está en lo que se construyó, no en lo que faltó.
4. **El cierre es metacognitivo:** la pantalla final revela que el cerebro recorrido representa el del propio jugador cuando aprende.
