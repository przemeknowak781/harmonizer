# Vocal Harmonizer — Specyfikacja Produktu

## 1. Wizja produktu

Webowa aplikacja do harmonizowania głosu w czasie rzeczywistym. Użytkownik śpiewa do mikrofonu, aplikacja wykrywa wysokość dźwięku (pitch) i generuje 1–4 dodatkowe głosy harmoniczne zgodne z wybraną tonacją i skalą. Wszystko działa client-side w przeglądarce — zero backendu, zero przesyłania audio na serwer.

**Porównywalne produkty:** Waves Harmony (plugin VST, $40), Harmonizr (iOS AUv3), Antelope InTune Harmony, AIR Vocal Harmonizer. Nasza przewaga: zero instalacji, działa w przeglądarce, darmowy tier.

---

## 2. Użytkownik docelowy

- Wokaliści amatorzy chcący usłyszeć jak brzmi ich melodia z harmoniami
- Twórcy contentu / TikTok / YouTube Shorts — efekt „chóru" na żywo
- Edukacja muzyczna — nauka interwałów i harmonii
- Muzycy na jam sessions — szybkie prototypowanie aranżacji wokalnych

---

## 3. Architektura techniczna

### 3.1 Stos technologiczny

| Warstwa | Technologia |
|---|---|
| UI | React 19 + Tailwind CSS |
| Audio I/O | Web Audio API (`getUserMedia`, `AudioContext`) |
| Pitch detection | AudioWorklet + algorytm YIN lub autokorelacja |
| Pitch shifting | Phase Vocoder (STFT) via AudioWorklet |
| Teoria muzyczna | Własny engine (skale, interwały, akordy) |
| Build | Vite |
| Hosting | Statyczny (Vercel / Netlify / GitHub Pages) |

### 3.2 Pipeline audio (real-time)

```
Mikrofon
  → getUserMedia()
  → AudioContext
  → AnalyserNode (wizualizacja)
  → PitchDetectorWorklet (YIN / autokorelacja → F₀ w Hz)
  → HarmonyEngine (F₀ + tonacja + reguły → częstotliwości harmonii)
  → PitchShifterWorklet[] (phase vocoder, 1 na każdy głos)
  → GainNode[] (mix głośności per głos)
  → StereoPannerNode[] (panorama per głos)
  → MasterGainNode
  → destination (głośniki / słuchawki)
```

### 3.3 Pitch Detection — szczegóły

**Algorytm:** YIN (de Cheveigné & Kawahara, 2002) — lepszy od autokorelacji dla głosu ludzkiego, niski error rate.

- Implementacja jako `AudioWorkletProcessor` (nie `ScriptProcessorNode` — deprecated)
- Buffer size: 2048 samples przy 44.1 kHz → ~46 ms okno, aktualizacja co ~23 ms (50% overlap)
- Zakres detekcji: 80 Hz – 1000 Hz (pokrywa bas – sopran)
- Threshold: 0.15 (parametr YIN, regulowany)
- Output: częstotliwość F₀ w Hz + confidence (0–1)

### 3.4 Pitch Shifting — szczegóły

**Algorytm:** Phase Vocoder z Identity Phase Locking

- FFT size: 4096
- Hop size: 256 (overlap ~94%)
- Okno: Hann
- Preservuje formant (opcjonalnie) — przesunięcie pitch bez efektu „wiewiórki"
- Latencja wynikowa: ~30–50 ms (akceptowalna dla śpiewu z monitorem)

**Alternatywa:** Biblioteka `SoundTouchJS` (port SoundTouch C++) jako fallback dla prostszej implementacji.

**Alternatywa 2:** Biblioteka `phaze` (AudioWorklet phase vocoder, MIT license, gotowy moduł).

---

## 4. Music Theory Engine

### 4.1 Dane wejściowe

- **Tonacja** (key): C, C#, D, ... B
- **Tryb** (mode): major, natural minor, harmonic minor, dorian, mixolydian, pentatonic
- **Typ harmonii**: tercja wyżej, tercja niżej, kwinta, oktawa, swobodny interwał

### 4.2 Logika generowania harmonii

```
1. Odbierz F₀ z detektora → przelicz na numer MIDI (noteNum)
2. Znajdź stopień skali (scale degree) najbliższy do noteNum w wybranej tonacji
3. Snap do skali (kwantyzacja do najbliższego dźwięku w skali)
4. Dla każdego głosu harmonicznego:
   a. Oblicz interwał (np. tercja diatoniczna = +2 stopnie skali)
   b. Przelicz docelowy stopień skali → częstotliwość docelowa
   c. Oblicz ratio = freq_docelowa / F₀
   d. Wyślij ratio do PitchShifterWorklet
```

### 4.3 Typy harmonii (presety)

| Preset | Głos 1 | Głos 2 | Głos 3 | Głos 4 |
|---|---|---|---|---|
| Duet (tercja wyżej) | +3rd | — | — | — |
| Duet (tercja niżej) | −3rd | — | — | — |
| Triad | +3rd | +5th | — | — |
| Choir | +3rd | −3rd | +5th | +octave |
| Power | +5th | +octave | — | — |
| Barbershop | +3rd | −3rd | −5th | — |
| Octaves | +oct | −oct | — | — |
| Custom | user | user | user | user |

### 4.4 Głosy — parametry per voice

- **Interval:** interwał diatoniczny (unison, 2nd, 3rd, 4th, 5th, 6th, 7th, octave) + kierunek (up/down)
- **Detune:** ±50 centów (humanizacja, delikatne rozstrojenie)
- **Formant shift:** ±6 półtonów (zmiana barwy bez zmiany pitch)
- **Pan:** −100% L ... +100% R
- **Volume:** 0–100%
- **Delay:** 0–50 ms (efekt doubling / chorus)

---

## 5. Interfejs użytkownika

### 5.1 Ekran główny — Live Mode

```
┌─────────────────────────────────────────────┐
│  🎤 VocalHarmonizer              ⚙️ Settings│
├─────────────────────────────────────────────┤
│                                             │
│         ╔═══════════════════╗               │
│         ║   PITCH DISPLAY   ║               │
│         ║                   ║               │
│         ║     ♪ E4          ║               │
│         ║   ══════●═══════  ║  ← wskaźnik   │
│         ║   -50¢    +50¢    ║    intonacji   │
│         ╚═══════════════════╝               │
│                                             │
│  Tonacja: [C ▾]  Tryb: [Major ▾]           │
│  Preset:  [Triad ▾]                        │
│                                             │
│  ┌─ Głos 1 ──┐ ┌─ Głos 2 ──┐ ┌─ Dry ─────┐│
│  │  +3rd ↑   │ │  +5th ↑   │ │           ││
│  │ vol ████░░│ │ vol ███░░░│ │ vol █████░││
│  │ pan ──●── │ │ pan ●──── │ │ pan ──●── ││
│  └───────────┘ └───────────┘ └───────────┘│
│                                             │
│        [ ● REC ]    [ ▶ PLAY ]              │
│                                             │
├─────────────────────────────────────────────┤
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ▲ Waveform / Spektrogram (canvas)         │
└─────────────────────────────────────────────┘
```

### 5.2 Ekran ustawień

- Wybór urządzenia wejściowego (mikrofon)
- Noise gate threshold (dB)
- Latency compensation
- Formant preservation on/off
- Pitch correction strength (0% = natural, 100% = auto-tune)
- Dark / light mode
- Export format (WAV / MP3)

### 5.3 Wizualizacje (Canvas / WebGL)

1. **Pitch indicator** — aktualna nuta + odchylenie w centach (jak tuner)
2. **Waveform** — przebieg czasowy sygnału wejściowego
3. **Voice constellation** — układ harmonii jako punkty na kole (root, 3rd, 5th itp.)
4. **Opcjonalnie: Spektrogram** — heatmapa częstotliwości w czasie

---

## 6. Funkcje

### 6.1 MVP (v1.0)

- [ ] Dostęp do mikrofonu (`getUserMedia`)
- [ ] Pitch detection w real-time (YIN, AudioWorklet)
- [ ] Pitch shifting 1–2 głosów (phase vocoder)
- [ ] Wybór tonacji i trybu (major / minor)
- [ ] 4 presety harmonii (duet up, duet down, triad, power)
- [ ] Kontrola głośności i panoramy per głos
- [ ] Pitch display (tuner-style)
- [ ] Waveform visualization
- [ ] Responsive design (mobile-first)

### 6.2 v1.1

- [ ] Nagrywanie sesji (MediaRecorder API → WAV blob)
- [ ] Export do WAV
- [ ] Pitch correction (lekki auto-tune na głosie głównym)
- [ ] Noise gate
- [ ] Więcej presetów (barbershop, choir, octaves)
- [ ] MIDI input — tonacja / akordy z klawiatury MIDI (Web MIDI API)

### 6.3 v2.0

- [ ] Formant preservation (żeby tercja wyżej nie brzmiała jak wiewiórka)
- [ ] Chord detection z MIDI / audio backtracku → auto-harmonizacja
- [ ] Import backtracku (MP3/WAV) — śpiewanie do podkładu
- [ ] Multi-track recording (osobne ścieżki per głos)
- [ ] Export multi-track (ZIP ze ścieżkami WAV)
- [ ] PWA (offline, install na telefon)
- [ ] Custom preset editor z zapisem (localStorage / IndexedDB)

### 6.4 v3.0 (nice-to-have)

- [ ] AI chord detection z backtracku (ML model, np. TensorFlow.js)
- [ ] Looper — nagrywanie pętli i nakładanie warstw
- [ ] Efekty: reverb (ConvolverNode), delay, chorus
- [ ] Social sharing — generowanie krótkich klipów
- [ ] Collaborative mode — dwie osoby śpiewają razem (WebRTC)

---

## 7. Wymagania niefunkcjonalne

| Parametr | Wymaganie |
|---|---|
| Latencja end-to-end | < 50 ms (percepcyjny próg komfortu dla muzyki) |
| Wspierane przeglądarki | Chrome 90+, Edge 90+, Safari 17+, Firefox 115+ |
| AudioWorklet support | Wymagany (fallback: ScriptProcessorNode z ostrzeżeniem) |
| Mobile | Pełna funkcjonalność na iOS Safari i Android Chrome |
| Prywatność | Zero transmisji audio — 100% client-side |
| Rozmiar bundla | < 500 KB gzipped (bez assets audio) |
| FPS wizualizacji | 60 fps (requestAnimationFrame) |

---

## 8. Ryzyka techniczne i mitigacje

| Ryzyko | Wpływ | Mitigacja |
|---|---|---|
| Latencja phase vocodera zbyt wysoka | Głos opóźniony vs. dry = dyskomfort | Tuning FFT/hop size; opcja „low latency mode" z mniejszym FFT (2048) kosztem jakości |
| iOS Safari ograniczenia AudioWorklet | Brak działania na iPhone | Feature detection + fallback na ScriptProcessorNode; testowanie na każdym iOS release |
| Pitch detection niestabilna przy hałasie | Fałszywe harmonies | Noise gate + confidence threshold; ignorowanie F₀ gdy confidence < 0.8 |
| Efekt „wiewiórki" przy dużych interwałach | Nienaturalny dźwięk | Formant preservation (PSOLA lub envelope-based) w v2.0 |
| Firefox detune range ±1200 centów | Ograniczony zakres pitch shift | Własny pitch shifter zamiast natywnego detune |

---

## 9. Kluczowe biblioteki i zasoby open-source

| Nazwa | Rola | Licencja |
|---|---|---|
| `phaze` (olvb/phaze) | AudioWorklet phase vocoder pitch shifter | MIT |
| `SoundTouchJS` | Pitch shifting + tempo (port SoundTouch C++) | LGPL |
| `PitchDetect` (cwilso) | Referencyjna implementacja autokorelacji | Apache 2.0 |
| `Tone.js` | Wrapper Web Audio API, scheduling, efekty | MIT |
| Własny YIN worklet | Pitch detection (implementacja z paperu) | — |

---

## 10. Harmonogram orientacyjny

| Faza | Czas | Deliverable |
|---|---|---|
| **Spike / PoC** | 1–2 tyg. | Pitch detection + 1 głos pitch-shifted w przeglądarce |
| **MVP (v1.0)** | 4–6 tyg. | Pełny pipeline: detekcja → harmonia → 2 głosy → UI |
| **v1.1** | +3–4 tyg. | Nagrywanie, noise gate, pitch correction, MIDI in |
| **v2.0** | +6–8 tyg. | Formant preservation, backtrack, multi-track, PWA |

---

## 11. Metryki sukcesu

- Latencja < 50 ms na Chrome desktop (mierzona AudioContext.currentTime delta)
- Pitch detection accuracy > 95% dla czystego głosu (weryfikacja: syntetyczny sinus sweep)
- Rozmiar bundla < 500 KB
- Lighthouse Performance > 90
- Użytkownik potrafi zaśpiewać z harmonią w < 10 sekund od wejścia na stronę (onboarding)