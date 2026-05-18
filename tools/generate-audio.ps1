# ============================================================================
# Sinapsis — Generador de audio placeholder
# ----------------------------------------------------------------------------
# Genera los 11 archivos WAV listados en la Sección 11 de la especificación.
# Son tonos sintéticos simples, lo bastante para que el juego suene de punta
# a punta. Reemplazables sin tocar el código (ver config.js → rutasAudio).
#
# Uso:   powershell -ExecutionPolicy Bypass -File tools/generate-audio.ps1
# Salida: assets/audio/*.wav
# ============================================================================

param(
    [string]$OutDir = (Join-Path $PSScriptRoot "..\assets\audio")
)

$OutDir = [System.IO.Path]::GetFullPath($OutDir)
if (-not (Test-Path $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir | Out-Null
}

Write-Host "Generando WAVs placeholder en: $OutDir"

# Compilar generador rápido en C#
$src = @"
using System;
using System.IO;

public static class WavGen {
    const int SR = 22050;

    public static void WriteWav(string path, double[] samples) {
        int n = samples.Length;
        using (var fs = File.Create(path))
        using (var bw = new BinaryWriter(fs)) {
            bw.Write(System.Text.Encoding.ASCII.GetBytes("RIFF"));
            bw.Write(36 + n * 2);
            bw.Write(System.Text.Encoding.ASCII.GetBytes("WAVE"));
            bw.Write(System.Text.Encoding.ASCII.GetBytes("fmt "));
            bw.Write(16);
            bw.Write((short)1);   // PCM
            bw.Write((short)1);   // mono
            bw.Write(SR);
            bw.Write(SR * 2);
            bw.Write((short)2);
            bw.Write((short)16);
            bw.Write(System.Text.Encoding.ASCII.GetBytes("data"));
            bw.Write(n * 2);
            for (int i = 0; i < n; i++) {
                double v = samples[i];
                if (v < -1) v = -1;
                if (v > 1) v = 1;
                bw.Write((short)(v * 32760));
            }
        }
    }

    // Note: una nota con envolvente ADSR
    public static void AddNote(double[] buf, double startSec, double durSec,
                               double freq, double amp,
                               double attack, double release) {
        int i0 = (int)(startSec * SR);
        int iEnd = i0 + (int)(durSec * SR);
        if (iEnd > buf.Length) iEnd = buf.Length;
        double phase = 0;
        double dphase = 2 * Math.PI * freq / SR;
        for (int i = i0; i < iEnd; i++) {
            double t = (i - i0) / (double)SR;
            // envolvente AR (sin sustain explícito)
            double env;
            if (t < attack) env = t / attack;
            else if (t > durSec - release) env = Math.Max(0, (durSec - t) / release);
            else env = 1.0;
            // base sine + segundo armónico para algo más rico
            double s = 0.7 * Math.Sin(phase) + 0.25 * Math.Sin(2 * phase) + 0.07 * Math.Sin(3 * phase);
            buf[i] += amp * env * s;
            phase += dphase;
        }
    }

    // Drone: tono continuo sostenido (para ambient/tension)
    public static void AddDrone(double[] buf, double startSec, double durSec,
                                double freq, double amp,
                                double fadeIn, double fadeOut,
                                double vibratoHz, double vibratoDepth) {
        int i0 = (int)(startSec * SR);
        int iEnd = i0 + (int)(durSec * SR);
        if (iEnd > buf.Length) iEnd = buf.Length;
        double phase = 0;
        for (int i = i0; i < iEnd; i++) {
            double t = (i - i0) / (double)SR;
            double env;
            if (t < fadeIn) env = t / fadeIn;
            else if (t > durSec - fadeOut) env = Math.Max(0, (durSec - t) / fadeOut);
            else env = 1.0;
            double f = freq * (1.0 + vibratoDepth * Math.Sin(2 * Math.PI * vibratoHz * t));
            double dphase = 2 * Math.PI * f / SR;
            phase += dphase;
            double s = Math.Sin(phase) + 0.3 * Math.Sin(phase * 1.5);
            buf[i] += amp * env * s;
        }
    }

    // Click: ruido percusivo corto
    public static void AddClick(double[] buf, double startSec, double durSec, double amp, int seed) {
        int i0 = (int)(startSec * SR);
        int iEnd = i0 + (int)(durSec * SR);
        if (iEnd > buf.Length) iEnd = buf.Length;
        var rng = new Random(seed);
        for (int i = i0; i < iEnd; i++) {
            double t = (i - i0) / (double)SR;
            double env = Math.Exp(-t * 25.0);
            double s = (rng.NextDouble() * 2 - 1) * env;
            buf[i] += amp * s;
        }
    }

    public static double[] MakeBuffer(double durSec) {
        return new double[(int)(durSec * SR)];
    }

    public static void Normalize(double[] buf, double target) {
        double mx = 0;
        for (int i = 0; i < buf.Length; i++) {
            double a = Math.Abs(buf[i]);
            if (a > mx) mx = a;
        }
        if (mx < 1e-9) return;
        double k = target / mx;
        for (int i = 0; i < buf.Length; i++) buf[i] *= k;
    }
}
"@

Add-Type -TypeDefinition $src -Language CSharp

# Helpers
function Out([string]$name) { Join-Path $OutDir $name }

# Frecuencias de notas
$C3 = 130.81; $D3 = 146.83; $E3 = 164.81; $F3 = 174.61; $G3 = 196.00; $A3 = 220.00; $B3 = 246.94
$C4 = 261.63; $D4 = 293.66; $E4 = 329.63; $F4 = 349.23; $G4 = 392.00; $A4 = 440.00; $B4 = 493.88
$C5 = 523.25; $D5 = 587.33; $E5 = 659.25; $G5 = 783.99
$Fs3 = 185.00 # F#3
$Bb3 = 233.08 # Bb3 (para acorde menor)

# ----------------------------------------------------------------------------
# ambient — bucle de fondo calmo (6 s)
# Drones suaves C3 + G3 con vibrato lento.
# ----------------------------------------------------------------------------
$buf = [WavGen]::MakeBuffer(6.0)
[WavGen]::AddDrone($buf, 0.0, 6.0, $C3, 0.18, 0.5, 0.5, 0.15, 0.005)
[WavGen]::AddDrone($buf, 0.0, 6.0, $G3, 0.14, 0.5, 0.5, 0.12, 0.006)
[WavGen]::AddDrone($buf, 0.0, 6.0, $C4, 0.07, 1.0, 1.0, 0.08, 0.003)
[WavGen]::Normalize($buf, 0.5)
[WavGen]::WriteWav((Out "ambient.wav"), $buf)
Write-Host "  - ambient.wav"

# ----------------------------------------------------------------------------
# tension — bucle de tensión (6 s)
# Intervalo disonante (tritono C-F#) + leve trémolo.
# ----------------------------------------------------------------------------
$buf = [WavGen]::MakeBuffer(6.0)
[WavGen]::AddDrone($buf, 0.0, 6.0, $C3, 0.20, 0.4, 0.4, 0.30, 0.020)
[WavGen]::AddDrone($buf, 0.0, 6.0, $Fs3, 0.15, 0.4, 0.4, 0.45, 0.025)
[WavGen]::AddDrone($buf, 0.0, 6.0, $D4, 0.07, 0.6, 0.6, 0.6, 0.030)
[WavGen]::Normalize($buf, 0.55)
[WavGen]::WriteWav((Out "tension.wav"), $buf)
Write-Host "  - tension.wav"

# ----------------------------------------------------------------------------
# resolution — fragmento corto de resolución (1.4 s)
# Arpegio ascendente C-E-G-C → acorde final.
# ----------------------------------------------------------------------------
$buf = [WavGen]::MakeBuffer(1.4)
[WavGen]::AddNote($buf, 0.00, 0.30, $C4, 0.55, 0.01, 0.15)
[WavGen]::AddNote($buf, 0.18, 0.30, $E4, 0.55, 0.01, 0.15)
[WavGen]::AddNote($buf, 0.36, 0.30, $G4, 0.55, 0.01, 0.15)
[WavGen]::AddNote($buf, 0.54, 0.85, $C5, 0.60, 0.01, 0.40)
[WavGen]::AddNote($buf, 0.55, 0.85, $E5, 0.40, 0.01, 0.40)
[WavGen]::AddNote($buf, 0.55, 0.85, $G5, 0.30, 0.01, 0.40)
[WavGen]::Normalize($buf, 0.85)
[WavGen]::WriteWav((Out "resolution.wav"), $buf)
Write-Host "  - resolution.wav"

# ----------------------------------------------------------------------------
# sting-logro — sonido corto de logro (0.7 s)
# Acorde brillante C-E-G + ataque rápido.
# ----------------------------------------------------------------------------
$buf = [WavGen]::MakeBuffer(0.7)
[WavGen]::AddNote($buf, 0.00, 0.65, $C5, 0.60, 0.005, 0.40)
[WavGen]::AddNote($buf, 0.00, 0.65, $E5, 0.55, 0.005, 0.40)
[WavGen]::AddNote($buf, 0.00, 0.65, $G5, 0.50, 0.005, 0.40)
[WavGen]::Normalize($buf, 0.9)
[WavGen]::WriteWav((Out "sting-logro.wav"), $buf)
Write-Host "  - sting-logro.wav"

# ----------------------------------------------------------------------------
# rhythm-1, rhythm-2, rhythm-3 — patrones rítmicos (Estación 3)
# IMPORTANTE: NO etiquetar como "ondas alfa" ni frecuencias del aprendizaje
# (Sección 16 del spec). Son notas de piano sintético neutras.
# Timings DEBEN coincidir con `dificultad.hipocampo.patrones` en config.js.
# ----------------------------------------------------------------------------
function Make-Rhythm([double[]]$timesMs, [string]$file) {
    $totalSec = ($timesMs[-1] / 1000.0) + 0.6
    $buf = [WavGen]::MakeBuffer($totalSec)
    foreach ($t in $timesMs) {
        $tSec = $t / 1000.0
        # Nota corta tipo "click de piano"
        [WavGen]::AddNote($buf, $tSec, 0.30, $E4, 0.55, 0.005, 0.20)
        [WavGen]::AddNote($buf, $tSec, 0.30, $E5, 0.30, 0.005, 0.20)
    }
    [WavGen]::Normalize($buf, 0.85)
    [WavGen]::WriteWav((Out $file), $buf)
}

# v2: patrones más largos e irregulares (Sección 6.0 — público terciario).
Make-Rhythm @(0, 350, 700, 1250, 1600) "rhythm-1.wav"
Write-Host "  - rhythm-1.wav (5 golpes)"
Make-Rhythm @(0, 300, 750, 1200, 1500, 1900, 2400) "rhythm-2.wav"
Write-Host "  - rhythm-2.wav (7 golpes)"
Make-Rhythm @(0, 350, 650, 1100, 1450, 1800, 2300, 2700, 3200) "rhythm-3.wav"
Write-Host "  - rhythm-3.wav (9 golpes)"

# ----------------------------------------------------------------------------
# emotion-calma — ~4 s, acorde mayor sostenido y suave (C mayor, registro bajo)
# ----------------------------------------------------------------------------
$buf = [WavGen]::MakeBuffer(4.0)
[WavGen]::AddNote($buf, 0.00, 4.0, $C4, 0.4, 0.5, 1.5)
[WavGen]::AddNote($buf, 0.00, 4.0, $E4, 0.35, 0.5, 1.5)
[WavGen]::AddNote($buf, 0.00, 4.0, $G4, 0.3, 0.5, 1.5)
[WavGen]::Normalize($buf, 0.75)
[WavGen]::WriteWav((Out "emotion-calma.wav"), $buf)
Write-Host "  - emotion-calma.wav"

# ----------------------------------------------------------------------------
# emotion-tension — ~4 s, intervalo disonante con notas en staccato
# ----------------------------------------------------------------------------
$buf = [WavGen]::MakeBuffer(4.0)
for ($i = 0; $i -lt 8; $i++) {
    $t = 0.1 + $i * 0.45
    [WavGen]::AddNote($buf, $t, 0.25, $C4, 0.45, 0.005, 0.10)
    [WavGen]::AddNote($buf, $t, 0.25, ($C4 * 1.0595), 0.40, 0.005, 0.10)  # C + Db (semitono)
}
[WavGen]::AddDrone($buf, 0.0, 4.0, $C3, 0.10, 0.5, 1.0, 0.0, 0.0)
[WavGen]::Normalize($buf, 0.85)
[WavGen]::WriteWav((Out "emotion-tension.wav"), $buf)
Write-Host "  - emotion-tension.wav"

# ----------------------------------------------------------------------------
# emotion-alegria — ~4 s, arpegio mayor brillante y rápido
# ----------------------------------------------------------------------------
$buf = [WavGen]::MakeBuffer(4.0)
$alegriaSecuencia = @($C5, $E5, $G5, $C5, $E5, $G5, $C5, $E5, $G5, $C5, $E5, $G5)
for ($i = 0; $i -lt $alegriaSecuencia.Length; $i++) {
    $t = 0.05 + $i * 0.18
    if ($t -gt 3.7) { break }
    [WavGen]::AddNote($buf, $t, 0.22, $alegriaSecuencia[$i], 0.5, 0.005, 0.12)
}
# Acorde final
[WavGen]::AddNote($buf, 2.6, 1.3, $C5, 0.45, 0.01, 0.7)
[WavGen]::AddNote($buf, 2.6, 1.3, $E5, 0.40, 0.01, 0.7)
[WavGen]::AddNote($buf, 2.6, 1.3, $G5, 0.35, 0.01, 0.7)
[WavGen]::Normalize($buf, 0.85)
[WavGen]::WriteWav((Out "emotion-alegria.wav"), $buf)
Write-Host "  - emotion-alegria.wav"

# ----------------------------------------------------------------------------
# emotion-tristeza — ~4 s, acorde menor lento (A menor) en registro bajo
# ----------------------------------------------------------------------------
$buf = [WavGen]::MakeBuffer(4.0)
[WavGen]::AddNote($buf, 0.00, 4.0, $A3, 0.4, 0.8, 1.8)
[WavGen]::AddNote($buf, 0.00, 4.0, $C4, 0.35, 0.8, 1.8)
[WavGen]::AddNote($buf, 0.00, 4.0, $E4, 0.25, 0.8, 1.8)
# Pequeño descenso melódico
[WavGen]::AddNote($buf, 0.5, 0.7, $E4, 0.35, 0.05, 0.4)
[WavGen]::AddNote($buf, 1.3, 0.7, $D4, 0.35, 0.05, 0.4)
[WavGen]::AddNote($buf, 2.1, 0.9, $C4, 0.35, 0.05, 0.5)
[WavGen]::AddNote($buf, 3.0, 1.0, $A3, 0.40, 0.05, 0.6)
[WavGen]::Normalize($buf, 0.75)
[WavGen]::WriteWav((Out "emotion-tristeza.wav"), $buf)
Write-Host "  - emotion-tristeza.wav"

Write-Host ""
Write-Host "Listo. Archivos generados en $OutDir"
