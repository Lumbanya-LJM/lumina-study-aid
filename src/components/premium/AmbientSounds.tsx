import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, CloudRain, Wind, Waves, Coffee, Bird, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { haptics } from '@/lib/haptics';

interface SoundOption {
  id: string;
  name: string;
  icon: React.ElementType;
  url: string;
}

// Using free ambient sound URLs from Pixabay (CC0 License)
const SOUNDS: SoundOption[] = [
  { 
    id: 'rain', 
    name: 'Rain', 
    icon: CloudRain, 
    url: 'https://cdn.pixabay.com/audio/2022/05/13/audio_257112181d.mp3' 
  },
  { 
    id: 'wind', 
    name: 'Wind', 
    icon: Wind, 
    url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_b4bd4170c2.mp3' 
  },
  { 
    id: 'waves', 
    name: 'Ocean', 
    icon: Waves, 
    url: 'https://cdn.pixabay.com/audio/2022/02/07/audio_96e5c2922e.mp3' 
  },
  { 
    id: 'cafe', 
    name: 'Café', 
    icon: Coffee, 
    url: 'https://cdn.pixabay.com/audio/2022/10/30/audio_b77d6b32e0.mp3' 
  },
  { 
    id: 'birds', 
    name: 'Birds', 
    icon: Bird, 
    url: 'https://cdn.pixabay.com/audio/2022/03/28/audio_0e34d7fc5d.mp3' 
  },
  { 
    id: 'fire', 
    name: 'Fireplace', 
    icon: Flame, 
    url: 'https://cdn.pixabay.com/audio/2021/08/09/audio_dc39bde84d.mp3' 
  },
];

interface AmbientSoundsProps {
  className?: string;
  compact?: boolean;
}

export const AmbientSounds: React.FC<AmbientSoundsProps> = ({ className, compact = false }) => {
  const [activeSounds, setActiveSounds] = useState<Map<string, number>>(new Map());
  const [masterVolume, setMasterVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Initialize audio elements
  useEffect(() => {
    SOUNDS.forEach((sound) => {
      if (!audioRefs.current.has(sound.id)) {
        const audio = new Audio(sound.url);
        audio.loop = true;
        audio.volume = 0;
        audioRefs.current.set(sound.id, audio);
      }
    });

    return () => {
      audioRefs.current.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      audioRefs.current.clear();
    };
  }, []);

  // Update volumes when master volume or mute changes
  useEffect(() => {
    activeSounds.forEach((soundVolume, soundId) => {
      const audio = audioRefs.current.get(soundId);
      if (audio) {
        audio.volume = isMuted ? 0 : soundVolume * masterVolume;
      }
    });
  }, [masterVolume, isMuted, activeSounds]);

  const toggleSound = useCallback((soundId: string) => {
    haptics.light();
    const audio = audioRefs.current.get(soundId);
    if (!audio) return;

    setActiveSounds((prev) => {
      const newSounds = new Map(prev);
      if (newSounds.has(soundId)) {
        // Stop sound
        audio.pause();
        audio.currentTime = 0;
        newSounds.delete(soundId);
      } else {
        // Start sound
        audio.volume = isMuted ? 0 : 0.5 * masterVolume;
        audio.play().catch(console.error);
        newSounds.set(soundId, 0.5);
      }
      return newSounds;
    });
  }, [isMuted, masterVolume]);

  const updateSoundVolume = useCallback((soundId: string, volume: number) => {
    const audio = audioRefs.current.get(soundId);
    if (audio) {
      audio.volume = isMuted ? 0 : volume * masterVolume;
    }
    setActiveSounds((prev) => {
      const newSounds = new Map(prev);
      newSounds.set(soundId, volume);
      return newSounds;
    });
  }, [isMuted, masterVolume]);

  const toggleMute = useCallback(() => {
    haptics.light();
    setIsMuted((prev) => !prev);
  }, []);

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <button
          onClick={toggleMute}
          className={cn(
            'p-2 rounded-lg transition-colors',
            activeSounds.size > 0 && !isMuted
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {isMuted || activeSounds.size === 0 ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>
        <div className="flex gap-1">
          {SOUNDS.slice(0, 4).map((sound) => {
            const isActive = activeSounds.has(sound.id);
            return (
              <button
                key={sound.id}
                onClick={() => toggleSound(sound.id)}
                className={cn(
                  'p-1.5 rounded-lg transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground scale-105'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                )}
                title={sound.name}
              >
                <sound.icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Ambient Sounds</h3>
        <button
          onClick={toggleMute}
          className={cn(
            'p-2 rounded-lg transition-colors',
            isMuted ? 'text-muted-foreground' : 'text-primary'
          )}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Master volume */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground w-16">Master</span>
        <Slider
          value={[masterVolume * 100]}
          onValueChange={([v]) => setMasterVolume(v / 100)}
          max={100}
          step={1}
          className="flex-1"
        />
      </div>

      {/* Sound buttons */}
      <div className="grid grid-cols-3 gap-2">
        {SOUNDS.map((sound) => {
          const isActive = activeSounds.has(sound.id);
          const volume = activeSounds.get(sound.id) || 0;

          return (
            <div key={sound.id} className="space-y-2">
              <button
                onClick={() => toggleSound(sound.id)}
                className={cn(
                  'w-full flex flex-col items-center gap-1 p-3 rounded-xl transition-all',
                  isActive
                    ? 'bg-primary/10 border-2 border-primary text-primary'
                    : 'bg-muted/50 border-2 border-transparent text-muted-foreground hover:bg-muted'
                )}
              >
                <sound.icon className={cn('w-5 h-5', isActive && 'animate-pulse-ring')} />
                <span className="text-xs font-medium">{sound.name}</span>
              </button>
              {isActive && (
                <Slider
                  value={[volume * 100]}
                  onValueChange={([v]) => updateSoundVolume(sound.id, v / 100)}
                  max={100}
                  step={1}
                  className="w-full"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Hook to use ambient sounds globally
export const useAmbientSounds = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  
  const toggleAmbient = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  return { isPlaying, toggleAmbient };
};
