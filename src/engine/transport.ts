const MIN_BPM = 30;
const MAX_BPM = 300;
const TICK_INTERVAL_MS = 10;

export class Transport {
  bpm: number = 120;
  beatsPerMeasure: number = 4;
  isPlaying: boolean = false;
  onBeat: ((beat: number) => void) | null = null;

  private startTime: number = 0;
  private pausedBeat: number = 0;
  private lastFiredBeat: number = -1;
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  setBpm(bpm: number): void {
    this.bpm = Math.max(MIN_BPM, Math.min(MAX_BPM, bpm));
  }

  getBeatDuration(): number {
    return 60000 / this.bpm;
  }

  getCurrentBeat(): number {
    if (!this.isPlaying) return this.pausedBeat;
    const elapsed = Date.now() - this.startTime;
    return this.pausedBeat + elapsed / this.getBeatDuration();
  }

  getCurrentMeasure(): number {
    return Math.floor(this.getCurrentBeat() / this.beatsPerMeasure);
  }

  getBeatInMeasure(): number {
    return Math.floor(this.getCurrentBeat()) % this.beatsPerMeasure;
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.startTime = Date.now();
    this.lastFiredBeat = Math.floor(this.pausedBeat);
    this.tickInterval = setInterval(() => this.tick(), TICK_INTERVAL_MS);
  }

  pause(): void {
    if (!this.isPlaying) return;
    this.pausedBeat = this.getCurrentBeat();
    this.isPlaying = false;
    this.clearTick();
  }

  stop(): void {
    this.isPlaying = false;
    this.pausedBeat = 0;
    this.lastFiredBeat = -1;
    this.clearTick();
  }

  private tick(): void {
    const currentBeat = Math.floor(this.getCurrentBeat());
    if (currentBeat > this.lastFiredBeat) {
      this.lastFiredBeat = currentBeat;
      this.onBeat?.(currentBeat);
    }
  }

  private clearTick(): void {
    if (this.tickInterval !== null) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }
}
