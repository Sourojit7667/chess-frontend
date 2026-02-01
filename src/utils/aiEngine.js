import { Chess } from "chess.js";

// Piece values for position evaluation
const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Position bonus tables (simplified)
const PAWN_TABLE = [
  0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30,
  20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10,
  0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0,
];

const KNIGHT_TABLE = [
  -50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30,
  0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20,
  15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50,
];

// Evaluate board position
const evaluateBoard = (game) => {
  let totalEvaluation = 0;
  const board = game.board();

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (piece) {
        const absoluteValue = getPieceValue(piece, i, j);
        totalEvaluation += piece.color === "w" ? absoluteValue : -absoluteValue;
      }
    }
  }

  return totalEvaluation;
};

const getPieceValue = (piece, x, y) => {
  const baseValue = PIECE_VALUES[piece.type];
  let positionValue = 0;

  if (piece.type === "p") {
    positionValue =
      piece.color === "w" ? PAWN_TABLE[x * 8 + y] : PAWN_TABLE[(7 - x) * 8 + y];
  } else if (piece.type === "n") {
    positionValue = KNIGHT_TABLE[x * 8 + y];
  }

  return baseValue + positionValue;
};

// Minimax with alpha-beta pruning
const minimax = (game, depth, alpha, beta, isMaximizingPlayer) => {
  if (depth === 0 || game.isGameOver()) {
    return evaluateBoard(game);
  }

  const moves = game.moves();

  if (isMaximizingPlayer) {
    let maxEval = -Infinity;
    for (const move of moves) {
      game.move(move);
      const evaluation = minimax(game, depth - 1, alpha, beta, false);
      game.undo();
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      game.move(move);
      const evaluation = minimax(game, depth - 1, alpha, beta, true);
      game.undo();
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break;
    }
    return minEval;
  }
};

// Get difficulty settings
const getDifficultySettings = (difficulty) => {
  const settings = {
    beginner: { depth: 1, randomness: 0.5 },
    amateur: { depth: 2, randomness: 0.3 },
    intermediate: { depth: 3, randomness: 0.15 },
    expert: { depth: 4, randomness: 0.05 },
    master: { depth: 5, randomness: 0 },
  };
  return settings[difficulty] || settings.intermediate;
};

// Main AI move function
export const getAIMove = (fen, difficulty = "intermediate") => {
  const game = new Chess(fen);
  const moves = game.moves();

  if (moves.length === 0) return null;

  const { depth, randomness } = getDifficultySettings(difficulty);

  // Add randomness for lower difficulties
  if (Math.random() < randomness) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  let bestMove = null;
  let bestValue = -Infinity;

  for (const move of moves) {
    game.move(move);
    const value = minimax(game, depth - 1, -Infinity, Infinity, false);
    game.undo();

    if (value > bestValue) {
      bestValue = value;
      bestMove = move;
    }
  }

  return bestMove;
};

// Calculate points based on difficulty
export const calculateAIPoints = (difficulty, won) => {
  const basePoints = {
    beginner: 10,
    amateur: 25,
    intermediate: 50,
    expert: 100,
    master: 200,
  };

  return won ? basePoints[difficulty] : 0;
};
