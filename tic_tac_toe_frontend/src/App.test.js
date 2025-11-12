import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('Tic Tac Toe App', () => {
  test('shows initial turn and updates on move', () => {
    render(<App />);
    expect(screen.getByText(/Turn: X/i)).toBeInTheDocument();

    const squares = screen.getAllByRole('button', { name: /Square row/i });
    fireEvent.click(squares[0]); // X
    expect(screen.getByText(/Turn: O/i)).toBeInTheDocument();
  });

  test('detects a winning line and allows reset', () => {
    render(<App />);
    const squares = screen.getAllByRole('button', { name: /Square row/i });

    // X: 0, O: 3, X: 1, O: 4, X: 2 => X wins top row
    fireEvent.click(squares[0]);
    fireEvent.click(squares[3]);
    fireEvent.click(squares[1]);
    fireEvent.click(squares[4]);
    fireEvent.click(squares[2]);

    expect(screen.getByText(/Winner: X/i)).toBeInTheDocument();

    const reset = screen.getByRole('button', { name: /Reset the game/i });
    fireEvent.click(reset);

    expect(screen.getByText(/Turn: X/i)).toBeInTheDocument();
  });

  test('history renders and supports jump to start', () => {
    render(<App />);
    const squares = screen.getAllByRole('button', { name: /Square row/i });

    fireEvent.click(squares[0]); // move 1
    fireEvent.click(squares[4]); // move 2

    const goStart = screen.getByRole('button', { name: /Go to game start/i });
    fireEvent.click(goStart);

    expect(screen.getByText(/Turn: X/i)).toBeInTheDocument();
  });
});
