# Tic Tac Toe – Ocean Professional (React)

A polished, accessible two‑player (same device) Tic Tac Toe game built with React and styled using the Ocean Professional theme.

## Features

- Responsive 3×3 board with keyboard and screen reader support
- Player turn indicator with color accents (X = primary, O = secondary)
- Win detection with highlighted winning line
- Draw detection
- Reset game button
- Move history with jump-to-move (undo)
- Clean UI with subtle shadows, rounded corners, and gradient background
- No backend or external services

## Run

From this directory:

- npm start
  - Starts the app on http://localhost:3000 (uses CRA default dev port)
- npm test
  - Runs unit tests
- npm run build
  - Builds the production bundle

No additional environment variables are required. If you choose to change ports, CRA supports PORT env. A .env.example is provided at the project root if needed by your setup.

## Controls

- Click or press Enter/Space on a square to place your mark.
- Use the Move History buttons to jump to any previous move.
- Press Reset to start a new game.

## Theme

Core colors (also set as CSS variables in src/App.css):
- primary #2563EB
- secondary #F59E0B
- error #EF4444
- background #f9fafb
- surface #ffffff
- text #111827
- gradient from-blue-500/10 to-gray-50 (implemented via a subtle radial gradient)

## Accessibility

- Squares are real buttons with aria-pressed
- Board is a grid with gridcells for semantics
- Live region announces status changes
- Keyboard operable by default

