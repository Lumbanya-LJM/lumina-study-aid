// Sound notification system for app events

type SoundType = 'classStart' | 'newUpdate' | 'message' | 'success' | 'reminder';

interface SoundConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  volume: number;
  pattern?: number[]; // For multi-tone sounds
}

const soundConfigs: Record<SoundType, SoundConfig> = {
  classStart: {
    frequency: 880,
    duration: 150,
    type: 'sine',
    volume: 0.3,
    pattern: [880, 1100, 1320], // Rising tones
  },
  newUpdate: {
    frequency: 660,
    duration: 100,
    type: 'sine',
    volume: 0.2,
    pattern: [660, 880],
  },
  message: {
    frequency: 520,
    duration: 80,
    type: 'sine',
    volume: 0.15,
  },
  success: {
    frequency: 587,
    duration: 120,
    type: 'sine',
    volume: 0.2,
    pattern: [587, 880],
  },
  reminder: {
    frequency: 440,
    duration: 200,
    type: 'triangle',
    volume: 0.25,
    pattern: [440, 550, 440],
  },
};

let audioContext: AudioContext | null = null;
let isSoundEnabled = true;

// Initialize audio context (must be called after user interaction)
function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

// Play a single tone
function playTone(frequency: number, duration: number, type: OscillatorType, volume: number): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

      // Smooth envelope
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration / 1000);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration / 1000);

      oscillator.onended = () => resolve();
    } catch (error) {
      console.warn('Sound playback failed:', error);
      resolve();
    }
  });
}

// Play a sound by type
export async function playSound(type: SoundType): Promise<void> {
  if (!isSoundEnabled) return;

  const config = soundConfigs[type];
  if (!config) return;

  try {
    if (config.pattern) {
      // Play pattern of tones
      for (const freq of config.pattern) {
        await playTone(freq, config.duration, config.type, config.volume);
        await new Promise((r) => setTimeout(r, 50)); // Small gap between tones
      }
    } else {
      await playTone(config.frequency, config.duration, config.type, config.volume);
    }
  } catch (error) {
    console.warn('Sound playback error:', error);
  }
}

// Enable/disable sounds
export function setSoundEnabled(enabled: boolean): void {
  isSoundEnabled = enabled;
  localStorage.setItem('luminary_sound_enabled', String(enabled));
}

// Get current sound state
export function isSoundEnabledState(): boolean {
  const stored = localStorage.getItem('luminary_sound_enabled');
  if (stored !== null) {
    isSoundEnabled = stored === 'true';
  }
  return isSoundEnabled;
}

// Initialize sound state from storage
export function initSoundState(): void {
  const stored = localStorage.getItem('luminary_sound_enabled');
  if (stored !== null) {
    isSoundEnabled = stored === 'true';
  }
}

// Sound notification utilities
export const sounds = {
  classStart: () => playSound('classStart'),
  newUpdate: () => playSound('newUpdate'),
  message: () => playSound('message'),
  success: () => playSound('success'),
  reminder: () => playSound('reminder'),
  setEnabled: setSoundEnabled,
  isEnabled: isSoundEnabledState,
  init: initSoundState,
};

export default sounds;
