import React, { useMemo, useState, useEffect, useCallback } from 'react';
import './App.css';

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
 * PUBLIC_INTERFACE
 * App is the main component for the Tic Tac Toe game.
 * - Tracks history for undo/jump-to-move
 * - Shows current player, winner, draw state
 * - Ocean Professional styled UI
 */
function App() {
  // Theme support (optional; kept minimal)
  const [theme] = useState('light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const [history, setHistory] = useState([Array(9).fill(null)]);
  const [step, setStep] = useState(0);
  const [xIsNext, setXIsNext] = useState(true);

  const current = history[step];
  const { winner, line: winningLine } = useMemo(() => calculateWinner(current), [current]);
  const isDraw = useMemo(() => !winner && current.every(Boolean), [winner, current]);

  const statusText = useMemo(() => {
    if (winner) return `Winner: ${winner}`;
    if (isDraw) return 'Draw';
    return `Turn: ${xIsNext ? 'X' : 'O'}`;
  }, [winner, isDraw, xIsNext]);

  const handleSquareClick = useCallback((index) => {
    if (winner || current[index] || isDraw) return;

    const next = current.slice();
    next[index] = xIsNext ? 'X' : 'O';

    // Update history to current step (support undo)
    const nextHistory = history.slice(0, step + 1).concat([next]);
    setHistory(nextHistory);
    setStep(step + 1);
    setXIsNext(!xIsNext);
  }, [winner, current, isDraw, xIsNext, history, step]);

  // PUBLIC_INTERFACE
  const resetGame = useCallback(() => {
    setHistory([Array(9).fill(null)]);
    setStep(0);
    setXIsNext(true);
  }, []);

  // PUBLIC_INTERFACE
  const jumpTo = useCallback((moveIndex) => {
    setStep(moveIndex);
    // X starts at move 0; turn parity determines next player
    setXIsNext(moveIndex % 2 === 0);
  }, []);

  return (
    <div className="app-root">
      <div className="hero-gradient" aria-hidden="true" />
      <main className="container" role="main">
        <header className="header">
          <h1 className="title">Tic Tac Toe</h1>
          <p className="subtitle">Two players on the same device</p>
        </header>

        <section className="status-card" aria-live="polite">
          <div className={`status-badge ${winner ? 'win' : isDraw ? 'draw' : xIsNext ? 'x' : 'o'}`}>
            {statusText}
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
