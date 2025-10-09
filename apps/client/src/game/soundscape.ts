type AudioContextLike = AudioContext;

const getAudioContext = (): AudioContextLike | undefined => {
  if (typeof window === "undefined") return undefined;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return undefined;
  return new Ctx();
};

export class Soundscape {
  private context?: AudioContextLike;
  private oceanSource?: AudioBufferSourceNode;
  private oceanGain?: GainNode;

  start(): void {
    if (!this.context) {
      this.context = getAudioContext();
    }
    const context = this.context;
    if (!context) return;
    if (context.state === "suspended") {
      void context.resume();
    }
    this.ensureOceanAmbience();
  }

  stop(): void {
    this.oceanSource?.stop();
    this.oceanSource = undefined;
    const context = this.context;
    if (!context) return;
    void context.suspend();
  }

  playOrderConfirm(): void {
    const context = this.ensureContext();
    if (!context) return;
    this.playTone({
      frequency: 540,
      duration: 0.18,
      type: "triangle",
      gain: 0.2
    });
  }

  playAlert(): void {
    const context = this.ensureContext();
    if (!context) return;
    this.playTone({ frequency: 320, duration: 0.4, type: "sawtooth", gain: 0.22 });
    this.playTone({ frequency: 260, duration: 0.45, type: "square", gain: 0.18, delay: 0.1 });
  }

  playRecovery(): void {
    const context = this.ensureContext();
    if (!context) return;
    this.playTone({ frequency: 660, duration: 0.25, type: "sine", gain: 0.18 });
    this.playTone({ frequency: 880, duration: 0.25, type: "sine", gain: 0.14, delay: 0.12 });
  }

  playDelivery(): void {
    const context = this.ensureContext();
    if (!context) return;
    this.playTone({ frequency: 520, duration: 0.18, type: "triangle", gain: 0.18 });
    this.playTone({ frequency: 620, duration: 0.2, type: "triangle", gain: 0.16, delay: 0.08 });
  }

  private ensureContext(): AudioContextLike | undefined {
    if (!this.context) {
      this.context = getAudioContext();
    }
    const context = this.context;
    if (!context) return undefined;
    if (context.state === "suspended") {
      void context.resume();
    }
    return context;
  }

  private ensureOceanAmbience(): void {
    const context = this.ensureContext();
    if (!context) return;
    if (this.oceanSource) {
      return;
    }
    const buffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
    const channel = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < channel.length; i += 1) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      channel[i] = lastOut * 0.6;
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = context.createGain();
    gain.gain.value = 0.08;
    source.connect(gain);
    gain.connect(context.destination);
    source.start();
    this.oceanSource = source;
    this.oceanGain = gain;
  }

  private playTone({
    frequency,
    duration,
    type,
    gain,
    delay = 0
  }: {
    frequency: number;
    duration: number;
    type: OscillatorType;
    gain: number;
    delay?: number;
  }): void {
    const context = this.ensureContext();
    if (!context) return;
    const startTime = context.currentTime + delay;
    const oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, startTime);
    envelope.gain.linearRampToValueAtTime(gain, startTime + 0.02);
    envelope.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    oscillator.connect(envelope);
    envelope.connect(context.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.05);
  }
}

