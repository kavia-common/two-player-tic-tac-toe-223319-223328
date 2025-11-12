import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * PUBLIC_INTERFACE
 * useTurnTimer manages a per-turn countdown for a game.
 *
 * @param {number} totalSeconds - The full duration for a turn (in seconds).
 * @param {boolean} isActive - Whether the timer should be running (e.g., game is ongoing and it's someone's turn).
 * @param {() => void} onTimeout - Callback invoked when the countdown reaches zero.
 *
 * @returns {{ timeLeft: number, reset: (nextTotalSeconds?: number) => void, pause: () => void, resume: () => void }}
 * - timeLeft: current seconds remaining for the active turn
 * - reset: resets timer to totalSeconds (or provided nextTotalSeconds) and restarts if isActive
 * - pause, resume: control ticking without destroying the state
 */
export function useTurnTimer(totalSeconds, isActive, onTimeout) {
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, Math.floor(totalSeconds || 0)));
  const intervalRef = useRef(null);
  const latestTimeoutRef = useRef(onTimeout);
  const latestActiveRef = useRef(isActive);
  const latestTotalRef = useRef(totalSeconds);

  // keep refs up to date to avoid stale closures
  useEffect(() => {
    latestTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    latestActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    latestTotalRef.current = totalSeconds;
  }, [totalSeconds]);

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    setTimeLeft((prev) => {
      if (prev <= 1) {
        // will hit zero -> stop and fire timeout
        clear();
        // use ref to avoid stale onTimeout
        if (latestActiveRef.current) {
          // only trigger timeout if still active
          try {
            latestTimeoutRef.current && latestTimeoutRef.current();
          } catch (e) {
            // swallow to avoid breaking render cycles
            // eslint-disable-next-line no-console
            console.error('Timer onTimeout error:', e);
          }
        }
        return 0;
      }
      return prev - 1;
    });
  }, [clear]);

  const start = useCallback(() => {
    clear();
    if (latestActiveRef.current && latestTotalRef.current > 0) {
      intervalRef.current = setInterval(tick, 1000);
    }
  }, [tick, clear]);

  const reset = useCallback(
    (nextTotalSeconds) => {
      clear();
      const next = Math.max(0, Math.floor(nextTotalSeconds ?? latestTotalRef.current ?? 0));
      setTimeLeft(next);
      if (latestActiveRef.current && next > 0) {
        intervalRef.current = setInterval(tick, 1000);
      }
    },
    [clear, tick]
  );

  const pause = useCallback(() => {
    clear();
  }, [clear]);

  const resume = useCallback(() => {
    if (!intervalRef.current && latestActiveRef.current && timeLeft > 0) {
      intervalRef.current = setInterval(tick, 1000);
    }
  }, [tick, timeLeft]);

  // React to isActive changes
  useEffect(() => {
    if (isActive) {
      // ensure ticking resumes
      resume();
    } else {
      // pause when not active
      pause();
    }
  }, [isActive, pause, resume]);

  // Reset internal state if totalSeconds changes meaningfully (level change)
  useEffect(() => {
    setTimeLeft(Math.max(0, Math.floor(totalSeconds || 0)));
    // restart ticking if active
    if (isActive) {
      reset(totalSeconds);
    } else {
      pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalSeconds]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clear();
    };
  }, [clear]);

  return { timeLeft, reset, pause, resume };
}

export default useTurnTimer;
