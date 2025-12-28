// Sound notification system for app events

type SoundType = 'classStart' | 'newUpdate' | 'message' | 'success' | 'reminder' | 'recordingReady' | 'taskComplete' | 'typing';

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
  recordingReady: {
    frequency: 698,
    duration: 130,
    type: 'sine',
    volume: 0.25,
    pattern: [698, 880, 1047], // C-E-G chord progression
  },
  taskComplete: {
    frequency: 523,
    duration: 100,
    type: 'sine',
    volume: 0.2,
    pattern: [523, 659, 784, 1047], // Rising arpeggio for completion
  },
  typing: {
    frequency: 800,
    duration: 30,
    type: 'sine',
    volume: 0.05,
  },
};

let audioContext: AudioContext | null = null;
let isSoundEnabled = true;
let isLuminaSoundsEnabled = false; // Lumina sounds OFF by default

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
  // Initialize Lumina sounds state (OFF by default)
  const luminaStored = localStorage.getItem('lumina_sounds_enabled');
  if (luminaStored !== null) {
    isLuminaSoundsEnabled = luminaStored === 'true';
  } else {
    isLuminaSoundsEnabled = false; // Default to OFF
  }
}

// Lumina sounds specific functions
export function setLuminaSoundsEnabled(enabled: boolean): void {
  isLuminaSoundsEnabled = enabled;
  localStorage.setItem('lumina_sounds_enabled', String(enabled));
}

export function isLuminaSoundsEnabledState(): boolean {
  const stored = localStorage.getItem('lumina_sounds_enabled');
  if (stored !== null) {
    isLuminaSoundsEnabled = stored === 'true';
  }
  return isLuminaSoundsEnabled;
}

// Sound notification utilities
export const sounds = {
  classStart: () => playSound('classStart'),
  newUpdate: () => playSound('newUpdate'),
  message: () => playSound('message'),
  success: () => playSound('success'),
  reminder: () => playSound('reminder'),
  recordingReady: () => playSound('recordingReady'),
  taskComplete: () => {
    // Only play if Lumina sounds are enabled
    if (isLuminaSoundsEnabledState()) {
      return playSound('taskComplete');
    }
    return Promise.resolve();
  },
  typing: () => {
    // Only play if Lumina sounds are enabled
    if (isLuminaSoundsEnabledState()) {
      return playSound('typing');
    }
    return Promise.resolve();
  },
  setEnabled: setSoundEnabled,
  isEnabled: isSoundEnabledState,
  setLuminaEnabled: setLuminaSoundsEnabled,
  isLuminaEnabled: isLuminaSoundsEnabledState,
  init: initSoundState,
};

export default sounds;
