import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  isWithinBoard, 
  getValidMovesForPiece, 
  getMaxCapturesForPiece, 
  getAllValidMoves 
} from '../lib/checkersLogic';

export type Player = 'white' | 'black';
export type PieceType = 'pawn' | 'king';

export interface Piece {
  id: string;
  player: Player;
  type: PieceType;
  row: number;
  col: number;
}

export interface Move {
  pieceId: string;
  from: { row: number; col: number };
  to: { row: number; col: number };
  captured?: string[]; // IDs of captured pieces
  isKing?: boolean; // If the piece became a king or was already a king
}

export function useCheckers(boardSize: number = 8, initialRules: 'brazilian' | 'english' = 'brazilian') {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [turn, setTurn] = useState<Player>('white');
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [winner, setWinner] = useState<Player | 'draw' | null>(null);
  const [scores, setScores] = useState<{ white: number, black: number }>({ white: 0, black: 0 });
  const [turnCaptures, setTurnCaptures] = useState<string[]>([]);
  const [turnMoves, setTurnMoves] = useState<Move[]>([]);
  const [initialPiecesForTurn, setInitialPiecesForTurn] = useState<Piece[]>([]);
  const [lastBestPlay, setLastBestPlay] = useState<{ player: Player, count: number, pieceId: string, moves: Move[], initialBoard: Piece[] } | null>(null);
  const [rules, setRules] = useState<'brazilian' | 'english'>(initialRules);

  const nextStartingPlayerRef = useRef<Player>('white');

  // Initialize board
  const initBoard = useCallback(() => {
    const newPieces: Piece[] = [];
    const rowsPerPlayer = boardSize === 8 ? 3 : 4;

    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        if ((row + col) % 2 !== 0) {
          if (row < rowsPerPlayer) {
            newPieces.push({
              id: `black-${row}-${col}`,
              player: 'black',
              type: 'pawn',
              row,
              col,
            });
          } else if (row >= boardSize - rowsPerPlayer) {
            newPieces.push({
              id: `white-${row}-${col}`,
              player: 'white',
              type: 'pawn',
              row,
              col,
            });
          }
        }
      }
    }
    setPieces(newPieces);
    
    const currentStartingPlayer = nextStartingPlayerRef.current;
    setTurn(currentStartingPlayer);
    nextStartingPlayerRef.current = currentStartingPlayer === 'white' ? 'black' : 'white';

    setSelectedPieceId(null);
    setValidMoves([]);
    setWinner(null);
    setScores({ white: 0, black: 0 });
    setTurnCaptures([]);
    setTurnMoves([]);
    setInitialPiecesForTurn([]);
    setLastBestPlay(null);
  }, [boardSize]);

  useEffect(() => {
    initBoard();
  }, [initBoard]);

  const getPieceAt = (row: number, col: number) => {
    return pieces.find(p => p.row === row && p.col === col);
  };

  const selectPiece = (id: string) => {
    const piece = pieces.find(p => p.id === id);
    if (!piece || piece.player !== turn) return;

    const allMoves = getAllValidMoves(turn, pieces, boardSize, rules);
    const pieceMoves = allMoves.filter(m => m.pieceId === id);
    
    setSelectedPieceId(id);
    setValidMoves(pieceMoves);
  };

  const makeMove = (move: Move, isAi: boolean = false) => {
    const piece = pieces.find(p => p.id === move.pieceId);
    if (!piece) return;

    if (turnMoves.length === 0) {
      setInitialPiecesForTurn([...pieces]);
    }

    const reachedPromotionRow = (piece.player === 'white' && move.to.row === 0) || 
                                (piece.player === 'black' && move.to.row === boardSize - 1);

    // Temporarily move the piece to check for next jumps
    let newPieces = pieces.map(p => {
      if (p.id === move.pieceId) {
        return { ...p, row: move.to.row, col: move.to.col };
      }
      return p;
    });

    if (move.captured) {
      newPieces = newPieces.filter(p => !move.captured!.includes(p.id));
      const updatedTurnCaptures = [...turnCaptures, ...move.captured];
      setTurnCaptures(updatedTurnCaptures);
      
      // Update scores
      setScores(prev => ({
        ...prev,
        [turn]: prev[turn] + move.captured!.length
      }));
      
      // Brazilian/English Rule: If a pawn reaches the promotion row, it promotes and turn ends.
      if (reachedPromotionRow && piece.type === 'pawn') {
        const finalIsKing = true;
        const updatedMove = { ...move, isKing: finalIsKing };
        const updatedTurnMoves = [...turnMoves, updatedMove];
        setTurnMoves(updatedTurnMoves);

        newPieces = newPieces.map(p => {
          if (p.id === move.pieceId) {
            return { ...p, type: 'king' };
          }
          return p;
        });

        if (move.captured && !isAi) {
          if (updatedTurnCaptures.length >= 3) {
            setLastBestPlay({
              player: turn,
              count: updatedTurnCaptures.length,
              pieceId: move.pieceId,
              moves: updatedTurnMoves,
              initialBoard: initialPiecesForTurn.length > 0 ? initialPiecesForTurn : [...pieces]
            });
          }
        }

        setPieces(newPieces);
        setTurn(turn === 'white' ? 'black' : 'white');
        setSelectedPieceId(null);
        setValidMoves([]);
        setTurnCaptures([]);
        setTurnMoves([]);
        setInitialPiecesForTurn([]);
        
        // Winner check
        const opponent = turn === 'white' ? 'black' : 'white';
        const opponentPieces = newPieces.filter(p => p.player === opponent);
        if (opponentPieces.length === 0) {
          setWinner(turn);
          return;
        }
        const opponentMoves = getAllValidMoves(opponent, newPieces, boardSize, rules);
        if (opponentMoves.length === 0) {
          setWinner(turn);
          return;
        }
        return;
      }

      const movedPiece = newPieces.find(p => p.id === move.pieceId)!;
      // Check for next jumps AS THE CURRENT TYPE (pawn stays pawn if it was a pawn)
      const nextJumpsWithCounts: { move: Move, maxCaptures: number }[] = [];
      const possibleNextJumps = getValidMovesForPiece(movedPiece, newPieces, boardSize, true, rules);
      
      possibleNextJumps.forEach(m => {
        let nextNextPieces = newPieces.filter(pc => !m.captured!.includes(pc.id));
        nextNextPieces = nextNextPieces.map(pc => {
          if (pc.id === m.pieceId) {
            return { ...pc, row: m.to.row, col: m.to.col };
          }
          return pc;
        });
        const nextMovedPiece = nextNextPieces.find(pc => pc.id === m.pieceId)!;
        const totalCaptures = 1 + getMaxCapturesForPiece(nextMovedPiece, nextNextPieces, boardSize, rules);
        nextJumpsWithCounts.push({ move: m, maxCaptures: totalCaptures });
      });

      if (nextJumpsWithCounts.length > 0) {
        const bestNextJumps = rules === 'english'
          ? nextJumpsWithCounts.map(j => j.move)
          : (() => {
              const maxPossible = Math.max(...nextJumpsWithCounts.map(j => j.maxCaptures));
              return nextJumpsWithCounts
                .filter(j => j.maxCaptures === maxPossible)
                .map(j => j.move);
            })();

        // Continue turn as current type (no promotion yet)
        const updatedMove = { ...move, isKing: piece.type === 'king' };
        setTurnMoves([...turnMoves, updatedMove]);
        setPieces(newPieces);
        setSelectedPieceId(move.pieceId);
        setValidMoves(bestNextJumps);
        return;
      }
    }

    // Turn ends or no more jumps available
    // Now we check for promotion
    const finalIsKing = reachedPromotionRow || piece.type === 'king';
    const updatedMove = { ...move, isKing: finalIsKing };
    const updatedTurnMoves = [...turnMoves, updatedMove];
    setTurnMoves(updatedTurnMoves);

    // Final update to pieces with promotion if applicable
    newPieces = newPieces.map(p => {
      if (p.id === move.pieceId) {
        return { ...p, type: finalIsKing ? 'king' : p.type };
      }
      return p;
    });

    if (move.captured && !isAi) {
      const updatedTurnCaptures = [...turnCaptures, ...move.captured];
      // Check for best play
      if (updatedTurnCaptures.length >= 3) {
        setLastBestPlay({
          player: turn,
          count: updatedTurnCaptures.length,
          pieceId: move.pieceId,
          moves: updatedTurnMoves,
          initialBoard: initialPiecesForTurn.length > 0 ? initialPiecesForTurn : [...pieces]
        });
      }
    }

    setPieces(newPieces);
    setTurn(turn === 'white' ? 'black' : 'white');
    setSelectedPieceId(null);
    setValidMoves([]);
    setTurnCaptures([]);
    setTurnMoves([]);
    setInitialPiecesForTurn([]);

    // Check for winner
    const opponent = turn === 'white' ? 'black' : 'white';
    const opponentPieces = newPieces.filter(p => p.player === opponent);
    
    if (opponentPieces.length === 0) {
      setWinner(turn);
      return;
    }

    const opponentMoves = getAllValidMoves(opponent, newPieces, boardSize, rules);
    if (opponentMoves.length === 0) {
      setWinner(turn);
      return;
    }
  };

  const getCustomAllValidMoves = useCallback((player: Player, currentPieces: Piece[], bSize: number) => {
    return getAllValidMoves(player, currentPieces, bSize, rules);
  }, [rules]);

  return {
    pieces,
    setPieces,
    turn,
    setTurn,
    selectedPieceId,
    validMoves,
    winner,
    scores,
    selectPiece,
    makeMove,
    initBoard,
    lastBestPlay,
    clearLastBestPlay: () => setLastBestPlay(null),
    getAllValidMoves: getCustomAllValidMoves,
    setWinner,
    rules,
    setRules
  };
}
