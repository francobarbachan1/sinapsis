// ============================================================================
// Sinapsis — Configuración editable (v2)
// ----------------------------------------------------------------------------
// Centraliza todo el contenido que el equipo puede ajustar sin tocar la lógica.
// Si tocás algo acá, no hace falta tocar el resto del código.
//
// Cambios v2 respecto a v1:
//   - El mapa pasa a ser un conjunto de salas conectadas (Sección 5 del spec).
//     Se agregan los bloques `mapa`, `pulsosEstres`, `velocidadAvatar`.
//   - Dificultad subida para público terciario (Sección 6.0): bloque
//     `dificultad` con todos los parámetros calibrables.
// ============================================================================

export const CONFIG = {
  // --------------------------------------------------------------------------
  // Cronómetro
  // --------------------------------------------------------------------------
  tiempoTotalSegundos: 900, // 15:00

  // --------------------------------------------------------------------------
  // DIFICULTAD — Sección 6.0
  // Todos los parámetros que mueven la curva de dificultad. Calibrar acá
  // jugando hasta que un grupo capaz pueda terminar en ~15 min cooperando.
  // --------------------------------------------------------------------------
  dificultad: {
    // Estación 1 — Amígdala
    amigdala: {
      // 5 etiquetas para 4 fragmentos: una sobra (más exigente cognitivamente).
      emocionDistractora: 'Sorpresa',
    },
    // Estación 2 — Occipital
    occipital: {
      // Palabra más larga + menos tiempo de exhibición (v1 era NEURONA / 3500 ms).
      palabra: 'APRENDIZAJE',
      alternativas: ['SINAPSIS', 'CONOCIMIENTO', 'NEURONA'],
      tiempoMostrarSecuenciaMs: 2700,
    },
    // Estación 3 — Hipocampo
    hipocampo: {
      // Patrones más largos e irregulares (v1: 4/5/6 regulares).
      // Cada array son los timings en ms desde el inicio de la ronda.
      patrones: [
        [0, 350, 700, 1250, 1600],                              // 5 golpes irregulares
        [0, 300, 750, 1200, 1500, 1900, 2400],                   // 7 golpes
        [0, 350, 650, 1100, 1450, 1800, 2300, 2700, 3200],       // 9 golpes
      ],
      toleranciaMs: 280, // ventana de tolerancia por golpe (v1: 320)
    },
    // Estación 4 — Parietal
    parietal: {
      // 6 obstáculos + layout donde no hay diagonal obvia.
      cols: 6,
      rows: 6,
      inicio: { x: 0, y: 5 },
      meta: { x: 5, y: 0 },
      obstaculos: [
        { x: 1, y: 4 },
        { x: 2, y: 2 },
        { x: 3, y: 4 },
        { x: 3, y: 1 },
        { x: 4, y: 3 },
        { x: 5, y: 2 },
      ],
    },
    // Estación 5 — Broca
    broca: {
      // 6 distractores. Los últimos 3 son sintácticamente plausibles
      // (forma verbal, sinónimo o variación) — exigen análisis fino.
      distractores: ['siempre', 'todo', 'fácilmente', 'siente', 'puede', 'aprenda'],
    },
  },

  // --------------------------------------------------------------------------
  // Estación 2 — Lóbulo occipital (compatibilidad)
  // --------------------------------------------------------------------------
  get palabraOccipital() { return this.dificultad.occipital.palabra; },
  get palabrasOccipitalAlternativas() { return this.dificultad.occipital.alternativas; },

  // --------------------------------------------------------------------------
  // Estación 5 — Área de Broca (compatibilidad)
  // --------------------------------------------------------------------------
  fraseBroca: 'No se puede aprender lo que no se siente',
  get distractoresBroca() { return this.dificultad.broca.distractores; },

  // --------------------------------------------------------------------------
  // Estación 3 — Hipocampo (compatibilidad)
  // --------------------------------------------------------------------------
  get rondasHipocampo() { return this.dificultad.hipocampo.patrones.map(p => p.length); },
  get toleranciaTimingMs() { return this.dificultad.hipocampo.toleranciaMs; },

  // --------------------------------------------------------------------------
  // Estación 4 — Lóbulo parietal (compatibilidad)
  // --------------------------------------------------------------------------
  get grillaParietal() { return this.dificultad.parietal; },

  // --------------------------------------------------------------------------
  // Estación 6 — Corteza prefrontal
  // (preguntas más precisas: la opción incorrecta plausible está siempre cerca)
  // --------------------------------------------------------------------------
  preguntasPrefrontal: [
    {
      regionId: 'amigdala',
      pregunta: 'En el modelo del recorrido, ¿qué hay que hacer con la amígdala para que la corteza pueda aprender?',
      opciones: ['Activarla al máximo', 'Calmarla', 'Bloquearla por completo', 'Reemplazarla por el hipocampo'],
      correcta: 1,
    },
    {
      regionId: 'occipital',
      pregunta: '¿Qué función representa la prueba del lóbulo occipital?',
      opciones: ['Producir lenguaje', 'Procesar lo que se percibe visualmente', 'Tomar decisiones', 'Almacenar memorias'],
      correcta: 1,
    },
    {
      regionId: 'hipocampo',
      pregunta: '¿Cuál es la función central del hipocampo en este recorrido?',
      opciones: ['Decidir qué se guarda y qué se olvida', 'Regular las emociones', 'Coordinar el movimiento', 'Generar el lenguaje'],
      correcta: 0,
    },
    {
      regionId: 'parietal',
      pregunta: 'La prueba parietal exigió, ante todo:',
      opciones: ['Memorizar una secuencia', 'Reaccionar rápido', 'Planificar la ruta antes de actuar', 'Improvisar paso a paso'],
      correcta: 2,
    },
    {
      regionId: 'broca',
      pregunta: 'En el área de Broca, lo que reconstruyeron fue:',
      opciones: ['Una palabra del curso', 'Un patrón rítmico', 'Una frase con sentido, descartando distractores', 'Una secuencia de colores'],
      correcta: 2,
    },
  ],

  // --------------------------------------------------------------------------
  // Textos largos (apertura, fin de tiempo, cierre)
  // --------------------------------------------------------------------------
  textoApertura:
    'Están a punto de recorrer un cerebro adolescente. Ustedes son una neurona que intenta consolidar un aprendizaje, y para lograrlo deben encender sus seis regiones. No les diremos a dónde ir: deberán deducirlo. Cada región se reconoce por aquello que hace. En el camino encontrarán pulsos de estrés: si los tocan, frenan a la neurona unos segundos. Atiendan la primera indicación.',

  textoFinDeTiempo:
    'El tiempo de esta sesión terminó. Cada región que lograron encender es una conexión real que su cerebro construyó al resolver, equivocarse y volver a intentar. El recorrido continúa ahora en la conversación con su grupo.',

  textoCierreCompleto:
    'Encendieron el cerebro completo. Lo que recorrieron es lo que su propio cerebro hace cada vez que aprende algo nuevo: regula la emoción, percibe, recuerda, organiza, pone en palabras e integra. Cada pulso de estrés que esquivaron y cada error del que volvieron a empezar fortaleció una conexión real. Eso es aprender.',

  // --------------------------------------------------------------------------
  // Sistema de pistas (Sección 7 del spec)
  // --------------------------------------------------------------------------
  pistas: [
    {
      regionId: 'amigdala',
      pista:
        'Antes de aprender, este cerebro necesita estar en calma. Existe una estructura pequeña y profunda que reacciona primero ante todo, que dispara las emociones antes de que llegue el razonamiento; cuando se altera, bloquea al resto del cerebro. Diríjanse a la región responsable de las emociones y cálmenla.',
      confirmacion:
        'Correcto: esta es la amígdala. Mientras esté alterada, ningún aprendizaje pasará a la corteza.',
    },
    {
      regionId: 'occipital',
      pista:
        'El cerebro ya está receptivo; ahora la información debe entrar. Hacia la parte posterior del cerebro hay una región encargada de recibir lo que vemos: las formas, los colores, los estímulos del mundo exterior. Diríjanse a la zona de la percepción visual.',
      confirmacion:
        'Correcto: este es el lóbulo occipital, la puerta de entrada de todo lo que se percibe.',
    },
    {
      regionId: 'hipocampo',
      pista:
        'Percibir no alcanza: lo percibido debe conservarse. En lo profundo del lóbulo temporal hay una estructura con forma de caballito de mar que decide qué se guarda y qué se olvida. Diríjanse a la región de la memoria.',
      confirmacion: 'Correcto: este es el hipocampo, el archivo del cerebro.',
    },
    {
      regionId: 'parietal',
      pista:
        'Lo aprendido necesita ordenarse en el espacio y en la lógica. En la parte superior del cerebro hay una región que gobierna la orientación, el cálculo y la ubicación de las cosas. Diríjanse a la zona encargada del espacio y el orden.',
      confirmacion:
        'Correcto: este es el lóbulo parietal, donde el cerebro organiza el espacio.',
    },
    {
      regionId: 'broca',
      pista:
        'Ningún pensamiento se organiza del todo sin palabras. Hacia el frente del cerebro existe una región asociada a la producción del lenguaje y a la planificación. Diríjanse a la zona del lenguaje y reconstruyan el sentido.',
      confirmacion:
        'Correcto: esta es el área de Broca, donde el lenguaje le da forma al pensamiento.',
    },
    {
      regionId: 'prefrontal',
      pista:
        'Solo queda un paso. La región más nueva, la última en madurar, ubicada justo detrás de la frente, es la que integra todo: la que decide, planifica y conecta. Diríjanse a ella con todo lo que reunieron en el camino.',
      confirmacion:
        'Correcto: esta es la corteza prefrontal. Es hora de encender el cerebro completo.',
    },
  ],

  // --------------------------------------------------------------------------
  // Layout del canvas
  // El brain ocupa la parte izquierda; el panel HUD ocupa la derecha.
  // --------------------------------------------------------------------------
  layout: {
    brainAreaX: 0,
    brainAreaY: 0,
    brainAreaW: 720,
    brainAreaH: 720,
    hudX: 720,
    hudW: 304, // = 1024 - 720
  },

  // --------------------------------------------------------------------------
  // MAPA — Sección 5 del spec
  // Estructura tipo dungeon: 6 salas-región + 3 salas conector.
  // Las puertas son "north" | "south" | "east" | "west" → roomId destino.
  // Las coords `minimap` son la posición en una grilla 3×5 (col, row) usada
  // SÓLO para dibujar el minimapa; no afectan la jugabilidad.
  // --------------------------------------------------------------------------
  mapa: {
    startRoomId: 'hub_central',
    // Dimensiones de la sala (coinciden con brainArea para que todo entre).
    salaW: 720,
    salaH: 720,
    grosorPared: 28,
    anchoPuerta: 128, // hueco generoso para que el avatar no quede trabado al borde
    rooms: {
      prefrontal: {
        regionId: 'prefrontal',
        nombre: 'Corteza prefrontal',
        doors: { south: 'hub_central' },
        minimap: { col: 1, row: 0 },
      },
      broca: {
        regionId: 'broca',
        nombre: 'Área de Broca',
        doors: { east: 'hub_central' },
        minimap: { col: 0, row: 1 },
      },
      parietal: {
        regionId: 'parietal',
        nombre: 'Lóbulo parietal',
        doors: { west: 'hub_central' },
        minimap: { col: 2, row: 1 },
      },
      hub_central: {
        regionId: null,
        nombre: 'Pasaje central',
        doors: { north: 'prefrontal', east: 'parietal', west: 'broca', south: 'hub_inferior' },
        minimap: { col: 1, row: 1 },
        pulsos: 5,
      },
      amigdala: {
        regionId: 'amigdala',
        nombre: 'Amígdala',
        doors: { east: 'hub_inferior' },
        minimap: { col: 0, row: 2 },
      },
      hipocampo: {
        regionId: 'hipocampo',
        nombre: 'Hipocampo',
        doors: { west: 'hub_inferior' },
        minimap: { col: 2, row: 2 },
      },
      hub_inferior: {
        regionId: null,
        nombre: 'Pasaje profundo',
        doors: { north: 'hub_central', west: 'amigdala', east: 'hipocampo', south: 'hub_posterior' },
        minimap: { col: 1, row: 2 },
        pulsos: 7,
      },
      hub_posterior: {
        regionId: null,
        nombre: 'Pasaje posterior',
        doors: { north: 'hub_inferior', south: 'occipital' },
        minimap: { col: 1, row: 3 },
        pulsos: 5,
      },
      occipital: {
        regionId: 'occipital',
        nombre: 'Lóbulo occipital',
        doors: { north: 'hub_posterior' },
        minimap: { col: 1, row: 4 },
      },
    },
  },

  // --------------------------------------------------------------------------
  // Pulsos de estrés / cortisol (Sección 5.3)
  // Si tocan a la neurona la frenan unos segundos, sin daño ni vidas.
  // --------------------------------------------------------------------------
  pulsosEstres: {
    radio: 14,
    velocidad: 165,             // px/s — más ágiles que en v2 inicial
    velocidadVariacion: 0.40,   // ± 40 % de variación por pulso
    duracionStunMs: 1400,
    factorVelocidadStun: 0.25,
    cooldownColisionMs: 500,
    // Wander: cada N ms cambian ligeramente de dirección. Hace los pulsos
    // menos predecibles que un rebote lineal puro.
    wanderIntervaloMinMs: 1400,
    wanderIntervaloMaxMs: 2800,
    wanderAnguloMax: Math.PI / 3, // ± 60° por giro
  },

  // --------------------------------------------------------------------------
  // Movimiento del avatar
  // --------------------------------------------------------------------------
  velocidadAvatar: {
    maxSpeed: 260,        // px/s — velocidad máxima
    acceleration: 1400,   // px/s² — qué tan rápido alcanza la velocidad
    drag: 1100,           // px/s² — qué tan rápido frena al soltar
    radio: 13,            // radio del cuerpo de la neurona (para colisión)
  },

  // --------------------------------------------------------------------------
  // Identidad de las regiones (Sección 10 del spec)
  // Las coordenadas x/y/radio sólo se usan para la vista compacta del cerebro
  // en EndScene y en la animación clímax. El mapa real son las salas (`mapa`).
  // --------------------------------------------------------------------------
  regiones: {
    prefrontal: {
      nombre: 'Corteza prefrontal',
      color: 0x854f0b, colorHex: '#854F0B', fondoSuave: 0xfaeeda,
      x: 360, y: 130, radio: 70,
    },
    broca: {
      nombre: 'Área de Broca',
      color: 0x993c1d, colorHex: '#993C1D', fondoSuave: 0xfaece7,
      x: 245, y: 245, radio: 52,
    },
    parietal: {
      nombre: 'Lóbulo parietal',
      color: 0x534ab7, colorHex: '#534AB7', fondoSuave: 0xeeedfe,
      x: 470, y: 295, radio: 60,
    },
    amigdala: {
      nombre: 'Amígdala',
      color: 0x993556, colorHex: '#993556', fondoSuave: 0xfbeaf0,
      x: 285, y: 425, radio: 50,
    },
    hipocampo: {
      nombre: 'Hipocampo',
      color: 0x0f6e56, colorHex: '#0F6E56', fondoSuave: 0xe1f5ee,
      x: 445, y: 460, radio: 50,
    },
    occipital: {
      nombre: 'Lóbulo occipital',
      color: 0x185fa5, colorHex: '#185FA5', fondoSuave: 0xe6f1fb,
      x: 360, y: 600, radio: 65,
    },
  },

  // --------------------------------------------------------------------------
  // Colores generales de interfaz
  // --------------------------------------------------------------------------
  ui: {
    tituloHex: '#1F3864', acentoHex: '#2E5FA3',
    textoSecundarioHex: '#5F5E5A', fondoHex: '#FBFAF7',
    titulo: 0x1f3864, acento: 0x2e5fa3,
    textoSecundario: 0x5f5e5a, fondo: 0xfbfaf7,
  },

  // --------------------------------------------------------------------------
  // Rutas de audio (placeholders — Sección 11)
  // Reemplazar estos archivos NO requiere tocar código.
  // --------------------------------------------------------------------------
  rutasAudio: {
    ambient: 'assets/audio/ambient.wav',
    tension: 'assets/audio/tension.wav',
    resolution: 'assets/audio/resolution.wav',
    stingLogro: 'assets/audio/sting-logro.wav',
    rhythm1: 'assets/audio/rhythm-1.wav',
    rhythm2: 'assets/audio/rhythm-2.wav',
    rhythm3: 'assets/audio/rhythm-3.wav',
    emotionCalma: 'assets/audio/emotion-calma.wav',
    emotionTension: 'assets/audio/emotion-tension.wav',
    emotionAlegria: 'assets/audio/emotion-alegria.wav',
    emotionTristeza: 'assets/audio/emotion-tristeza.wav',
  },

  // --------------------------------------------------------------------------
  // Sistema de audio dinámico
  // --------------------------------------------------------------------------
  audio: {
    volumenAmbient: 0.25,
    volumenTension: 0.0,
    volumenTensionMax: 0.35,
    volumenResolution: 0.6,
    volumenSting: 0.55,
    volumenEmocion: 0.7,
    volumenRitmo: 0.6,
    umbralTensionSegundos: 30,
  },

  // --------------------------------------------------------------------------
  // Dimensiones del canvas
  // --------------------------------------------------------------------------
  ancho: 1024,
  alto: 720,
};

// Orden fijo de progresión de las pistas (índice → regionId)
export const ORDEN_REGIONES = CONFIG.pistas.map((p) => p.regionId);
