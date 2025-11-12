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
  // initialize the time left
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, Math.floor(totalSeconds || 0)));

  // refs to avoid stale closures and track interval
  const intervalRef = useRef(null);
  const latestTimeoutRef = useRef(onTimeout);
  const latestActiveRef = useRef(isActive);
  const latestTotalRef = useRef(totalSeconds);

  // keep refs updated
  useEffect(() => {
    latestTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    latestActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    latestTotalRef.current = totalSeconds;
  }, [totalSeconds]);

  // clear helper
  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // tick logic - decrease once per second and fire timeout at zero
  const tick = useCallback(() => {
    setTimeLeft((prev) => {
      if (prev <= 1) {
        // stopping at zero
        clear();
        // only notify if still active (not paused/game over)
        if (latestActiveRef.current) {
          try {
            latestTimeoutRef.current && latestTimeoutRef.current();
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error('Timer onTimeout error:', e);
          }
        }
        return 0;
      }
      return prev - 1;
    });
  }, [clear]);

  // start ticking if active
  const start = useCallback(() => {
    clear();
    if (latestActiveRef.current && (latestTotalRef.current ?? 0) > 0) {
      intervalRef.current = setInterval(tick, 1000);
    }
  }, [tick, clear]);

  // PUBLIC_INTERFACE
  const reset = useCallback(
    (nextTotalSeconds) => {
      // Reset to provided or last total
      const next = Math.max(0, Math.floor(nextTotalSeconds ?? latestTotalRef.current ?? 0));
      setTimeLeft(next);
      // restart interval when active
      clear();
      if (latestActiveRef.current && next > 0) {
        intervalRef.current = setInterval(tick, 1000);
      }
    },
    [tick, clear]
  );

  // PUBLIC_INTERFACE
  const pause = useCallback(() => {
    clear();
  }, [clear]);

  // PUBLIC_INTERFACE
  const resume = useCallback(() => {
    // do not depend on timeLeft here to avoid missing resume under StrictMode
    if (!intervalRef.current && latestActiveRef.current && (latestTotalRef.current ?? 0) > 0 && timeLeft > 0) {
      intervalRef.current = setInterval(tick, 1000);
    }
  }, [tick, timeLeft]);

  // Effect: set up interval whenever active state toggles
  useEffect(() => {
    if (isActive) {
      // ensure an interval exists
      clear();
      intervalRef.current = setInterval(tick, 1000);
    } else {
      clear();
    }
    return () => {
      // cleanup on dep change to avoid multiple intervals (StrictMode safe)
      clear();
    };
  }, [isActive, tick, clear]);

  // Effect: when totalSeconds changes (e.g., level change), reset to new total and restart if active
  useEffect(() => {
    const next = Math.max(0, Math.floor(totalSeconds || 0));
    setTimeLeft(next);
    clear();
    if (isActive && next > 0) {
      intervalRef.current = setInterval(tick, 1000);
    }
    // cleanup is handled by the effect's return in the isActive effect
  }, [totalSeconds, isActive, tick, clear]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clear();
    };
  }, [clear]);

  return { timeLeft, reset, pause, resume };
}

export default useTurnTimer;
