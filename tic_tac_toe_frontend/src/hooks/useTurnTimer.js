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
  // initialize the time left from totalSeconds (clamped to integer >= 0)
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, Math.floor(totalSeconds || 0)));

  // Refs to avoid stale closures and track interval and latest inputs
  const intervalRef = useRef(null);
  const latestTimeoutRef = useRef(onTimeout);
  const latestActiveRef = useRef(isActive);
  const latestTotalRef = useRef(totalSeconds);

  // Keep refs fresh
  useEffect(() => {
    latestTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    latestActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    latestTotalRef.current = totalSeconds;
  }, [totalSeconds]);

  // Helper to clear interval
  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Core ticking logic
  const tick = useCallback(() => {
    setTimeLeft((prev) => {
      if (prev <= 1) {
        // Reached zero, stop and notify if still active
        clear();
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

  // PUBLIC_INTERFACE
  const reset = useCallback(
    (nextTotalSeconds) => {
      const next = Math.max(0, Math.floor(nextTotalSeconds ?? latestTotalRef.current ?? 0));
      setTimeLeft(next);
      // Restart ticking if active and we have time to count
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
    // Start only if not already running, active, and time remaining
    if (!intervalRef.current && latestActiveRef.current && (latestTotalRef.current ?? 0) > 0 && timeLeft > 0) {
      intervalRef.current = setInterval(tick, 1000);
    }
  }, [tick, timeLeft]);

  /**
   * Single authoritative effect to manage the interval lifecycle.
   * Starts interval when:
   *  - isActive is true
   *  - timeLeft > 0
   * Cleans up on changes or unmount. This avoids competing effects in StrictMode.
   */
  useEffect(() => {
    // Ensure displayed time corresponds to incoming totalSeconds when it changes
    // but do not force reset if timeLeft already matches (prevents jitter)
    const normalizedTotal = Math.max(0, Math.floor(totalSeconds || 0));
    // If total changes and timeLeft exceeds new total, clamp down
    if (timeLeft > normalizedTotal) {
      setTimeLeft(normalizedTotal);
    } else if (timeLeft === 0 && normalizedTotal > 0 && isActive) {
      // Edge: if we were at zero but a new total arrives while active, initialize
      setTimeLeft(normalizedTotal);
    }

    if (isActive && timeLeft > 0) {
      // Start ticking
      clear();
      intervalRef.current = setInterval(tick, 1000);
    } else {
      // Not active or no time, ensure cleared
      clear();
    }

    return () => {
      clear();
    };
    // Depend on isActive, timeLeft, and totalSeconds to respond to changes
  }, [isActive, timeLeft, totalSeconds, tick, clear]);

  // Cleanup on unmount (extra safety)
  useEffect(() => {
    return () => {
      clear();
    };
  }, [clear]);

  return { timeLeft, reset, pause, resume };
}

export default useTurnTimer;
