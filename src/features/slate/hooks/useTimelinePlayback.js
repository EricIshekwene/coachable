import { useEffect, useRef, useState } from "react";

export function useTimelinePlayback({ defaultLoopSeconds }) {
  const [timePercent, setTimePercent] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const [loopSeconds, setLoopSeconds] = useState(defaultLoopSeconds);

  const playRafId = useRef(null);
  const playLastTsRef = useRef(null);
  const isPlayingRef = useRef(false);

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  const handleTimePercentChange = (next) => {
    const clamped = clamp(Number(next) || 0, 0, 100);
    setTimePercent((prev) => (Object.is(prev, clamped) ? prev : clamped));
    if (isPlayingRef.current) {
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      if (playRafId.current) cancelAnimationFrame(playRafId.current);
      playRafId.current = null;
      playLastTsRef.current = null;
      return;
    }

    const tick = (ts) => {
      if (!isPlayingRef.current) return;
      if (playLastTsRef.current == null) playLastTsRef.current = ts;
      const dt = (ts - playLastTsRef.current) / 1000;
      playLastTsRef.current = ts;

      const speed = (0.25 + (speedMultiplier / 100) * 3.75) * 3;
      const delta = (dt / loopSeconds) * 100 * speed;
      let shouldStop = false;

      setTimePercent((prev) => {
        let next = prev + delta;
        if (next >= 100) {
          if (autoplayEnabled) {
            next = next % 100;
          } else {
            next = 100;
            shouldStop = true;
          }
        }
        if (next <= 0) next = 0;
        return next;
      });

      if (shouldStop) {
        isPlayingRef.current = false;
        setIsPlaying(false);
        return;
      }

      playRafId.current = requestAnimationFrame(tick);
    };

    playRafId.current = requestAnimationFrame(tick);

    return () => {
      if (playRafId.current) cancelAnimationFrame(playRafId.current);
      playRafId.current = null;
      playLastTsRef.current = null;
    };
  }, [isPlaying, speedMultiplier, autoplayEnabled, loopSeconds]);

  const resetTimelinePlayback = () => {
    setTimePercent(0);
    setIsPlaying(false);
  };

  return {
    timePercent,
    setTimePercent,
    handleTimePercentChange,
    speedMultiplier,
    setSpeedMultiplier,
    isPlaying,
    setIsPlaying,
    autoplayEnabled,
    setAutoplayEnabled,
    loopSeconds,
    setLoopSeconds,
    isPlayingRef,
    resetTimelinePlayback,
  };
}

export default useTimelinePlayback;
