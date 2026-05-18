// ============================================================================
// Sinapsis — Configuración editable
// ----------------------------------------------------------------------------
// Centraliza todo el contenido que el equipo puede ajustar sin tocar la lógica.
// Si tocás algo acá, no hace falta tocar el resto del código.
// ============================================================================

export const CONFIG = {
  // --------------------------------------------------------------------------
  // Cronómetro
  // --------------------------------------------------------------------------
  tiempoTotalSegundos: 900, // 15:00

  // --------------------------------------------------------------------------
  // Estación 2 — Lóbulo occipital
  // --------------------------------------------------------------------------
  palabraOccipital: 'NEURONA',
  palabrasOccipitalAlternativas: ['SINAPSIS', 'CEREBRO', 'APRENDER'],

  // --------------------------------------------------------------------------
  // Estación 5 — Área de Broca
  // --------------------------------------------------------------------------
  fraseBroca: 'No se puede aprender lo que no se siente',
  distractoresBroca: ['siempre', 'todo', 'fácilmente'],

  // --------------------------------------------------------------------------
  // Estación 3 — Hipocampo
  // --------------------------------------------------------------------------
  rondasHipocampo: [4, 5, 6],
  toleranciaTimingMs: 320, // ventana de tolerancia por golpe

  // --------------------------------------------------------------------------
  // Estación 4 — Lóbulo parietal
  // --------------------------------------------------------------------------
  grillaParietal: {
    cols: 6,
    rows: 6,
    inicio: { x: 0, y: 5 },
    meta: { x: 5, y: 0 },
    obstaculos: [
      { x: 2, y: 4 },
      { x: 3, y: 3 },
      { x: 1, y: 2 },
      { x: 4, y: 1 },
    ],
  },

  // --------------------------------------------------------------------------
  // Estación 6 — Corteza prefrontal
  // --------------------------------------------------------------------------
  preguntasPrefrontal: [
    {
      regionId: 'amigdala',
      pregunta: '¿Qué hay que hacer con la amígdala para que el cerebro pueda aprender?',
      opciones: ['Calmarla', 'Estimularla al máximo', 'Ignorarla', 'Bloquearla'],
      correcta: 0,
    },
    {
      regionId: 'occipital',
      pregunta: '¿Qué palabra revelaste en la zona de la percepción?',
      opciones: ['SINAPSIS', 'CEREBRO', 'NEURONA', 'MEMORIA'],
      correcta: 2,
    },
    {
      regionId: 'hipocampo',
      pregunta: '¿Qué función cumple el hipocampo?',
      opciones: ['Producir el lenguaje', 'Guardar la memoria', 'Procesar lo que vemos', 'Sentir emociones'],
      correcta: 1,
    },
    {
      regionId: 'parietal',
      pregunta: '¿Qué tipo de pensamiento usaste para planificar la ruta?',
      opciones: ['La improvisación', 'La memorización', 'La planificación', 'La intuición'],
      correcta: 2,
    },
    {
      regionId: 'broca',
      pregunta: '¿Qué tuviste que reconstruir en la zona del lenguaje?',
      opciones: ['Una palabra suelta', 'Una frase con sentido', 'Una secuencia de colores', 'Un patrón rítmico'],
      correcta: 1,
    },
  ],

  // --------------------------------------------------------------------------
  // Textos largos (apertura, fin de tiempo, cierre)
  // --------------------------------------------------------------------------
  textoApertura:
    'Están a punto de recorrer un cerebro adolescente. Ustedes son un aprendizaje que intenta consolidarse, y para lograrlo deben encender sus seis regiones. No les diremos a dónde ir: deberán deducirlo. Cada región se reconoce por aquello que hace. Atiendan la primera indicación.',

  textoFinDeTiempo:
    'El tiempo de esta sesión terminó. Cada región que lograron encender es una conexión real que su cerebro construyó al resolver, equivocarse y volver a intentar. El recorrido continúa ahora en la conversación con su grupo.',

  textoCierreCompleto:
    'Encendieron el cerebro completo. Lo que recorrieron es lo que su propio cerebro hace cada vez que aprende algo nuevo: regula la emoción, percibe, recuerda, organiza, pone en palabras e integra. Cada vez que se equivocaron y volvieron a intentar, una conexión real se hizo más fuerte. Eso es aprender.',

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
  // Layout del mapa
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
  // Identidad de las regiones (Sección 10 del spec)
  // Posiciones: vista cenital del cerebro, frente apuntando hacia arriba.
  // Coordenadas dentro del brainArea (0..720 / 0..720).
  // --------------------------------------------------------------------------
  regiones: {
    prefrontal: {
      nombre: 'Corteza prefrontal',
      color: 0x854f0b,
      colorHex: '#854F0B',
      fondoSuave: 0xfaeeda,
      x: 360, y: 130,
      radio: 70,
    },
    broca: {
      nombre: 'Área de Broca',
      color: 0x993c1d,
      colorHex: '#993C1D',
      fondoSuave: 0xfaece7,
      x: 245, y: 245,
      radio: 52,
    },
    parietal: {
      nombre: 'Lóbulo parietal',
      color: 0x534ab7,
      colorHex: '#534AB7',
      fondoSuave: 0xeeedfe,
      x: 470, y: 295,
      radio: 60,
    },
    amigdala: {
      nombre: 'Amígdala',
      color: 0x993556,
      colorHex: '#993556',
      fondoSuave: 0xfbeaf0,
      x: 285, y: 425,
      radio: 50,
    },
    hipocampo: {
      nombre: 'Hipocampo',
      color: 0x0f6e56,
      colorHex: '#0F6E56',
      fondoSuave: 0xe1f5ee,
      x: 445, y: 460,
      radio: 50,
    },
    occipital: {
      nombre: 'Lóbulo occipital',
      color: 0x185fa5,
      colorHex: '#185FA5',
      fondoSuave: 0xe6f1fb,
      x: 360, y: 600,
      radio: 65,
    },
  },

  // --------------------------------------------------------------------------
  // Colores generales de interfaz
  // --------------------------------------------------------------------------
  ui: {
    tituloHex: '#1F3864',
    acentoHex: '#2E5FA3',
    textoSecundarioHex: '#5F5E5A',
    fondoHex: '#FBFAF7',
    titulo: 0x1f3864,
    acento: 0x2e5fa3,
    textoSecundario: 0x5f5e5a,
    fondo: 0xfbfaf7,
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
    volumenTension: 0.0, // arranca silenciado, se sube progresivamente
    volumenTensionMax: 0.35,
    volumenResolution: 0.6,
    volumenSting: 0.55,
    volumenEmocion: 0.7,
    volumenRitmo: 0.6,
    umbralTensionSegundos: 30, // tiempo sin progreso para que empiece la tensión
  },

  // --------------------------------------------------------------------------
  // Dimensiones del canvas
  // --------------------------------------------------------------------------
  ancho: 1024,
  alto: 720,
};

// Orden fijo de progresión de las pistas (índice → regionId)
export const ORDEN_REGIONES = CONFIG.pistas.map((p) => p.regionId);
