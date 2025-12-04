import { useEffect, useRef, useState } from 'react';
import { Music, Volume2, VolumeX, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BackgroundMusicPlayerProps {
  musicUrl?: string;
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
}

export const BackgroundMusicPlayer = ({
  musicUrl,
  autoPlay = true,
  loop = true,
  className = ''
}: BackgroundMusicPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3); // Default to 30% volume
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState(false);

  // Initialize audio element
  useEffect(() => {
    if (!musicUrl || !audioRef.current) return;

    const audio = audioRef.current;
    audio.src = musicUrl;
    audio.volume = volume;
    audio.loop = loop;

    // Auto-play if specified
    if (autoPlay) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch(() => {
            // Auto-play prevented by browser
            setIsPlaying(false);
          });
      }
    }

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [musicUrl, autoPlay, loop]);

  // Handle play/pause
  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    }
  };

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      setIsMuted(false);
    }
  };

  // Handle mute/unmute
  const handleMuteToggle = () => {
    if (!audioRef.current) return;
    
    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  // Update current time as audio plays
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Set duration when metadata loads
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  // Handle error
  const handleError = () => {
    setError(true);
    setIsPlaying(false);
  };

  // Format time to MM:SS
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!musicUrl) return null;

  if (error) {
    return (
      <div className={`flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <Music className="w-4 h-4 text-red-500" />
        <span className="text-xs text-red-600">Background music failed to load</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg ${className}`}>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        onError={handleError}
        crossOrigin="anonymous"
      />

      {/* Player Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-medium text-gray-700">Background Music</span>
        </div>
        <span className="text-xs text-gray-500">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden cursor-pointer" 
        onClick={(e) => {
          if (!audioRef.current) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const percent = (e.clientX - rect.left) / rect.width;
          audioRef.current.currentTime = percent * duration;
        }}
      >
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
          style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        {/* Play/Pause Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={handlePlayPause}
          className="h-8 w-8 p-0 flex items-center justify-center bg-white hover:bg-blue-100 border-blue-200"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 text-blue-600" />
          ) : (
            <Play className="w-4 h-4 text-blue-600" />
          )}
        </Button>

        {/* Volume Control */}
        <div className="flex items-center gap-1 flex-1">
          {/* Mute/Unmute Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleMuteToggle}
            className="h-8 w-8 p-0 flex items-center justify-center"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-gray-500" />
            ) : (
              <Volume2 className="w-4 h-4 text-blue-600" />
            )}
          </Button>

          {/* Volume Slider */}
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer flex-1"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(isMuted ? 0 : volume) * 100}%, #e5e7eb ${(isMuted ? 0 : volume) * 100}%, #e5e7eb 100%)`
            }}
            title="Volume"
          />
        </div>

        {/* Playing indicator */}
        {isPlaying && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-600">Playing</span>
          </div>
        )}
      </div>
    </div>
  );
};
