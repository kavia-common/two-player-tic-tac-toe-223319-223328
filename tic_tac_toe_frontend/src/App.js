import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import useTurnTimer from './hooks/useTurnTimer';

/**
 * PUBLIC_INTERFACE
 * Square component renders a single cell button of the Tic Tac Toe board.
 * Accessible: uses button, aria-pressed, and keyboard operability.
 */
function Square({ value, onClick, highlight, index, disabled }) {
  /** Square label for accessibility */
  const label = useMemo(() => {
    const row = Math.floor(index / 3) + 1;
    const col = (index % 3) + 1;
    return `Square row ${row}, column ${col}${value ? `, ${value}` : ''}`;
  }, [index, value]);

  return (
    <button
      type="button"
      className={`ttt-square ${value ? `filled ${value === 'X' ? 'x' : 'o'}` : ''} ${highlight ? 'win' : ''}`}
      onClick={onClick}
      aria-pressed={!!value}
      aria-label={label}
      disabled={disabled || !!value}
      data-index={index}
    >
      <span className="sr-only">{label}</span>
      {value || ''}
    </button>
  );
}

/**
 * PUBLIC_INTERFACE
 * Board component renders a 3x3 grid of Square components.
 */
function Board({ squares, onSquareClick, winningLine, disabled }) {
  return (
    <div className="ttt-board" role="grid" aria-label="Tic Tac Toe Board">
      {squares.map((sq, i) => (
        <div key={i} role="gridcell" className="cell">
          <Square
            value={sq}
            onClick={() => onSquareClick(i)}
            highlight={winningLine?.includes(i)}
            index={i}
            disabled={disabled}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Calculate the winner and return {winner, line} where:
 * - winner: 'X' | 'O' | null
 * - line: array of indices for the winning line, or null
 */
function calculateWinner(squares) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6],            // diagonals
  ];
  for (const [a, b, c] of lines) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a], line: [a, b, c] };
    }
  }
  return { winner: null, line: null };
}

/**
 * Level configuration with seconds per turn.
 */
const LEVELS = {
  Easy: 30,
  Medium: 15,
  Hard: 7,
};
const LEVEL_STORAGE_KEY = 'ttt.level';
const MUTE_STORAGE_KEY = 'ttt.soundMuted';

/**
 * PUBLIC_INTERFACE
 * App is the main component for the Tic Tac Toe game.
 * - Tracks history for undo/jump-to-move
 * - Shows current player, winner, draw state
 * - Ocean Professional styled UI
 * - Adds level-based per-turn timer with forfeit on timeout
 */
function App() {
  // Theme support (optional; kept minimal)
  const [theme] = useState('light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Load level from localStorage (default Medium)
  const initialLevel = useMemo(() => {
    try {
      const stored = window.localStorage.getItem(LEVEL_STORAGE_KEY);
      if (stored && LEVELS[stored]) return stored;
    } catch (e) {
      // ignore storage errors
    }
    return 'Medium';
  }, []);
  const [level, setLevel] = useState(initialLevel);

  // Mute preference from localStorage (default: unmuted false)
  const initialMuted = useMemo(() => {
    try {
      const stored = window.localStorage.getItem(MUTE_STORAGE_KEY);
      if (stored === 'true') return true;
      if (stored === 'false') return false;
    } catch (e) {
      // ignore
    }
    return false;
  }, []);
  const [isMuted, setIsMuted] = useState(initialMuted);

  const [history, setHistory] = useState([Array(9).fill(null)]);
  const [step, setStep] = useState(0);
  const [xIsNext, setXIsNext] = useState(true);

  const current = history[step];
  const { winner, line: winningLine } = useMemo(() => calculateWinner(current), [current]);
  const isDraw = useMemo(() => !winner && current.every(Boolean), [winner, current]);
  const gameOver = !!winner || isDraw;

  const levelSeconds = LEVELS[level];

  // Timeout handler: forfeit current turn (no move), switch player and reset the timer
  const onTimeout = useCallback(() => {
    if (gameOver) return; // do nothing if game finished
    setXIsNext((prev) => !prev);
    // Timer reset handled below using effect + timer.reset when xIsNext changes
  }, [gameOver]);

  // Hook: per-turn timer, active only when game is not over
  const { timeLeft, reset: resetTimer, pause: pauseTimer, resume: resumeTimer } = useTurnTimer(
    levelSeconds,
    !gameOver, // timer runs while game active
    onTimeout
  );

  // Persist level selection
  useEffect(() => {
    try {
      window.localStorage.setItem(LEVEL_STORAGE_KEY, level);
    } catch (e) {
      // ignore storage errors
    }
  }, [level]);

  // Persist mute preference
  useEffect(() => {
    try {
      window.localStorage.setItem(MUTE_STORAGE_KEY, String(isMuted));
    } catch (e) {
      // ignore
    }
  }, [isMuted]);

  // Compose status text
  const statusText = useMemo(() => {
    if (winner) return `Winner: ${winner}`;
    if (isDraw) return 'Draw';
    return `Turn: ${xIsNext ? 'X' : 'O'}`;
  }, [winner, isDraw, xIsNext]);

  // Color phase based on timeLeft percentage for badge
  const timePct = useMemo(() => {
    const t = Math.max(0, Math.min(1, timeLeft / (levelSeconds || 1)));
    return t;
  }, [timeLeft, levelSeconds]);

  const timeBadgeClass = useMemo(() => {
    if (timePct <= 0.25) return 'time-badge danger';
    if (timePct <= 0.5) return 'time-badge warn';
    return 'time-badge ok';
  }, [timePct]);

  // Track one-time 5s alert per turn
  const fiveSecAlertFiredRef = useRef(false);
  const lastTurnKeyRef = useRef(null);

  // Basic beep using Web Audio API (non-intrusive short blip)
  const playBeep = useCallback(() => {
    if (isMuted) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880; // A5 short beep
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.14);
      // Close context shortly after to avoid resource leaks
      setTimeout(() => ctx.close(), 250);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Beep not supported:', e);
    }
  }, [isMuted]);

  // Derive a "turn key" to know when a new turn starts to reset alert
  const turnKey = useMemo(() => {
    // combine current player and step to represent a unique turn
    return `${xIsNext ? 'X' : 'O'}-${step}`;
  }, [xIsNext, step]);

  // Reset the alert state whenever the turn changes or level changes or timer resets are expected
  useEffect(() => {
    if (lastTurnKeyRef.current !== turnKey) {
      fiveSecAlertFiredRef.current = false;
      lastTurnKeyRef.current = turnKey;
    }
  }, [turnKey]);

  // When a new turn starts (turnKey changes) and the game is active,
  // ensure the timer is reset for the new player. This also covers timeout-driven turn switches.
  useEffect(() => {
    if (!gameOver) {
      resetTimer(levelSeconds);
      resumeTimer();
    } else {
      pauseTimer();
    }
  }, [turnKey, gameOver, levelSeconds, resetTimer, resumeTimer, pauseTimer]);

  // Fire the 5s alert (one-time per turn). Only when timeLeft exactly hits 5.
  useEffect(() => {
    if (gameOver) return;
    if (timeLeft === 5 && !fiveSecAlertFiredRef.current) {
      fiveSecAlertFiredRef.current = true;
      // visual cue handled via adding 'pulse' class conditionally
      playBeep();
    }
    // If timer was reset to full (>5), ensure we can fire again later in this new turn
    if (timeLeft > 5 && fiveSecAlertFiredRef.current && lastTurnKeyRef.current === turnKey) {
      // do nothing; keep as fired for this very same turn
    }
  }, [timeLeft, gameOver, playBeep, turnKey]);

  // Handle a square click: place mark, update history, check winner/draw via derived state,
  // then switch player and reset timer if game continues.
  const handleSquareClick = useCallback(
    (index) => {
      if (winner || current[index] || isDraw) return;

      const next = current.slice();
      next[index] = xIsNext ? 'X' : 'O';

      // Update history to current step (support undo)
      const nextHistory = history.slice(0, step + 1).concat([next]);
      setHistory(nextHistory);
      setStep(step + 1);

      // After move, check if game would be over. We can compute here quickly:
      const { winner: nextWinner } = calculateWinner(next);
      const nextIsDraw = !nextWinner && next.every(Boolean);

      if (nextWinner || nextIsDraw) {
        // game ends -> pause timer
        pauseTimer();
      } else {
        // Switch player and reset timer for the next player
        setXIsNext(!xIsNext);
        resetTimer(levelSeconds);
      }
    },
    [winner, current, isDraw, xIsNext, history, step, pauseTimer, resetTimer, levelSeconds]
  );

  // PUBLIC_INTERFACE
  const resetGame = useCallback(() => {
    // Keep selected level; reset board and state
    setHistory([Array(9).fill(null)]);
    setStep(0);
    setXIsNext(true);
    // Reset timer for starting player
    resetTimer(levelSeconds);
    resumeTimer();
  }, [levelSeconds, resetTimer, resumeTimer]);

  // PUBLIC_INTERFACE
  const jumpTo = useCallback((moveIndex) => {
    setStep(moveIndex);
    // X starts at move 0; turn parity determines next player
    const nextXIsNext = moveIndex % 2 === 0;
    setXIsNext(nextXIsNext);
    // If game not over at that state, reset timer to full for that player's new turn
    // Determine board at moveIndex
    // We'll compute winner/draw from history after render, but we can optimistically reset now.
    resetTimer(levelSeconds);
    if (!gameOver) {
      resumeTimer();
    }
  }, [levelSeconds, resetTimer, resumeTimer, gameOver]);

  // When level changes, reset timer to full for the current player (if game active)
  useEffect(() => {
    if (!gameOver) {
      resetTimer(levelSeconds);
      resumeTimer();
    } else {
      pauseTimer();
    }
  }, [levelSeconds, gameOver, resetTimer, resumeTimer, pauseTimer]);

  // Pause timer when gameOver changes to true; resume when becomes false
  useEffect(() => {
    if (gameOver) {
      pauseTimer();
    } else {
      resumeTimer();
    }
  }, [gameOver, pauseTimer, resumeTimer]);

  // Level selector handler
  const handleLevelChange = useCallback((e) => {
    const nextLevel = e.target.value;
    if (LEVELS[nextLevel]) {
      setLevel(nextLevel);
      // Timer reset is managed by effect on levelSeconds
    }
  }, []);

  return (
    <div className="app-root">
      <div className="hero-gradient" aria-hidden="true" />
      <main className="container" role="main">
        <header className="header">
          <h1 className="title">Tic Tac Toe</h1>
          <p className="subtitle">Two players on the same device</p>
        </header>

        {/* Level Selector */}
        <section className="status-card" aria-label="Level selection">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
            <label htmlFor="level" style={{ fontWeight: 600, color: '#374151' }}>Level</label>
            <select
              id="level"
              aria-label="Select difficulty level"
              value={level}
              onChange={handleLevelChange}
              className="btn"
              style={{
                borderRadius: 12,
                padding: '8px 12px',
                borderColor: 'rgba(17,24,39,0.1)',
                background: 'var(--surface)',
                cursor: 'pointer',
              }}
            >
              {Object.keys(LEVELS).map((k) => (
                <option key={k} value={k}>{k} ({LEVELS[k]}s/turn)</option>
              ))}
            </select>
          </div>
        </section>

        <section className="status-card" aria-live="polite">
          <div className={`status-badge ${winner ? 'win' : isDraw ? 'draw' : xIsNext ? 'x' : 'o'}`} style={{ gap: 10 }}>
            {statusText}
            {!gameOver && (
              <span
                className={`${timeBadgeClass} ${(timeLeft <= 5 && fiveSecAlertFiredRef.current) ? 'pulse' : ''}`}
                role="status"
                aria-live="polite"
                aria-label={`Time left: ${timeLeft} seconds`}
                style={{
                  marginLeft: 10,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 40,
                  height: 28,
                  padding: '0 10px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  transition: 'background-color 0.3s ease, color 0.3s ease',
                }}
              >
                {timeLeft}s
              </span>
            )}
          </div>
        </section>

        <section className="game">
          <Board
            squares={current}
            onSquareClick={handleSquareClick}
            winningLine={winningLine}
            disabled={!!winner || isDraw}
          />
        </section>

        <section className="controls">
          <button
            type="button"
            className="btn primary"
            onClick={resetGame}
            aria-label="Reset the game"
          >
            Reset
          </button>
        </section>

        {/* Settings (sound) */}
        <section className="settings" aria-label="Settings">
          <label className="toggle" htmlFor="mute-sound">
            <input
              id="mute-sound"
              type="checkbox"
              checked={isMuted}
              onChange={(e) => setIsMuted(e.target.checked)}
              aria-label="Mute 5-second alert sound"
            />
            <span>{isMuted ? 'Sound muted' : 'Sound on'}</span>
          </label>
        </section>

        <section className="history" aria-label="Move history">
          <h2 className="history-title">Move History</h2>
          <ol className="history-list">
            {history.map((_, move) => {
              const desc = move ? `Go to move #${move}` : 'Go to game start';
              const isActive = move === step;
              return (
                <li key={move}>
                  <button
                    type="button"
                    className={`btn ghost ${isActive ? 'active' : ''}`}
                    onClick={() => jumpTo(move)}
                    aria-current={isActive ? 'step' : undefined}
                    aria-label={desc}
                  >
                    {desc}
                  </button>
                </li>
              );
            })}
          </ol>
        </section>

        <footer className="footer">
          <small>Ocean Professional theme</small>
        </footer>
      </main>
    </div>
  );
}

export default App;
