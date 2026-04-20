"use client";

import { useCallback, useMemo, useRef } from "react";

type UseSoundOptions = {
  volume?: number;
};

type PlaySound = () => Promise<void>;

function playFallbackTone(volume: number) {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  const AudioContextConstructor =
    window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextConstructor) {
    return Promise.resolve();
  }

  const context = new AudioContextConstructor();
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gainNode.gain.value = Math.max(0, Math.min(1, volume)) * 0.08;

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start();

  return new Promise<void>((resolve) => {
    window.setTimeout(() => {
      oscillator.stop();
      void context.close().finally(() => {
        resolve();
      });
    }, 120);
  });
}

export default function useSound(
  src?: string,
  options: UseSoundOptions = {},
): PlaySound {
  const volume = options.volume ?? 0.75;
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playFallback = useCallback(() => playFallbackTone(volume), [volume]);

  const play = useMemo<PlaySound>(() => {
    return async () => {
      if (!src) {
        await playFallback();
        return;
      }

      try {
        if (typeof window === "undefined") {
          return;
        }

        if (!audioRef.current) {
          audioRef.current = new Audio(src);
          audioRef.current.preload = "auto";
        }

        audioRef.current.volume = Math.max(0, Math.min(1, volume));
        audioRef.current.currentTime = 0;

        await audioRef.current.play();
      } catch (error) {
        console.warn("useSound playback failed, using fallback tone:", error);
        await playFallback();
      }
    };
  }, [playFallback, src, volume]);

  return play;
}
