import { Piece, Player, Move } from '../hooks/useCheckers';
import { getAllValidMoves, applyMove } from './checkersLogic';

export type Difficulty = 'beginner' | 'medium' | 'advanced';

const PIECE_VALUE = 100;
const KING_VALUE = 300;
const POSITION_VALUE = 10;

function evaluateBoard(pieces: Piece[], player: Player, boardSize: number): number {
  let score = 0;
  const opponent = player === 'white' ? 'black' : 'white';

  for (const piece of pieces) {
    let pieceScore = piece.type === 'king' ? KING_VALUE : PIECE_VALUE;
    
    // Position bonus: prefer center and forward positions
    const distFromStart = piece.player === 'white' ? (boardSize - 1 - piece.row) : piece.row;
    pieceScore += distFromStart * POSITION_VALUE;

    // Edge bonus: pieces on edges are safer
    if (piece.col === 0 || piece.col === boardSize - 1) {
      pieceScore += 5;
    }

    if (piece.player === player) {
      score += pieceScore;
    } else {
      score -= pieceScore;
    }
  }

  return score;
}

interface MinimaxResult {
  score: number;
  move: Move | null;
}

function minimax(
  pieces: Piece[],
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  player: Player,
  boardSize: number,
  rules: 'brazilian' | 'english' = 'brazilian'
): MinimaxResult {
  const currentTurn = isMaximizing ? player : (player === 'white' ? 'black' : 'white');
  const moves = getAllValidMoves(currentTurn, pieces, boardSize, rules);

  if (depth === 0 || moves.length === 0) {
    return { score: evaluateBoard(pieces, player, boardSize), move: null };
  }

  let bestMove: Move | null = null;

  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const move of moves) {
      const { newPieces, nextJumps } = applyMove(pieces, move, boardSize, rules);
      
      let score: number;
      if (nextJumps.length > 0) {
        // If there are next jumps, the same player continues their turn
        // We don't decrement depth for multi-jumps as they are part of the same "move"
        const result = minimax(newPieces, depth, alpha, beta, true, player, boardSize, rules);
        score = result.score;
      } else {
        const result = minimax(newPieces, depth - 1, alpha, beta, false, player, boardSize, rules);
        score = result.score;
      }

      if (score > maxScore) {
        maxScore = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return { score: maxScore, move: bestMove };
  } else {
    let minScore = Infinity;
    for (const move of moves) {
      const { newPieces, nextJumps } = applyMove(pieces, move, boardSize, rules);
      
      let score: number;
      if (nextJumps.length > 0) {
        const result = minimax(newPieces, depth, alpha, beta, false, player, boardSize, rules);
        score = result.score;
      } else {
        const result = minimax(newPieces, depth - 1, alpha, beta, true, player, boardSize, rules);
        score = result.score;
      }

      if (score < minScore) {
        minScore = score;
        bestMove = move;
      }
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return { score: minScore, move: bestMove };
  }
}

export function getBestMove(
  pieces: Piece[],
  player: Player,
  difficulty: Difficulty,
  boardSize: number,
  rules: 'brazilian' | 'english' = 'brazilian'
): Move | null {
  let depth = 2;
  if (difficulty === 'medium') depth = 4;
  if (difficulty === 'advanced') depth = 6;

  const result = minimax(pieces, depth, -Infinity, Infinity, true, player, boardSize, rules);
  return result.move;
}
