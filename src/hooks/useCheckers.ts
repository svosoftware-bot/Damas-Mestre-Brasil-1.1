import { useState, useCallback, useEffect } from 'react';

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
}

export function useCheckers(boardSize: number = 8) {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [turn, setTurn] = useState<Player>('white');
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [winner, setWinner] = useState<Player | null>(null);
  const [turnCaptures, setTurnCaptures] = useState<string[]>([]);
  const [lastBestPlay, setLastBestPlay] = useState<{ player: Player, count: number, pieceId: string } | null>(null);

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
    setTurn('white');
    setSelectedPieceId(null);
    setValidMoves([]);
    setWinner(null);
    setTurnCaptures([]);
    setLastBestPlay(null);
  }, [boardSize]);

  useEffect(() => {
    initBoard();
  }, [initBoard]);

  const getPieceAt = (row: number, col: number) => {
    return pieces.find(p => p.row === row && p.col === col);
  };

  const isWithinBoard = (row: number, col: number) => {
    return row >= 0 && row < boardSize && col >= 0 && col < boardSize;
  };

  const getValidMovesForPiece = useCallback((piece: Piece, currentPieces: Piece[], mustJump: boolean = false) => {
    const moves: Move[] = [];
    const directions = piece.type === 'king' 
      ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] 
      : piece.player === 'white' 
        ? [[-1, 1], [-1, -1]] 
        : [[1, 1], [1, -1]];

    // Jumps (Mandatory in most rules)
    const jumpDirections = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (const [dr, dc] of jumpDirections) {
      if (piece.type === 'king') {
        // Flying king jumps: search for a piece to jump over
        let nextR = piece.row + dr;
        let nextC = piece.col + dc;
        while (isWithinBoard(nextR + dr, nextC + dc)) {
          const midPiece = currentPieces.find(p => p.row === nextR && p.col === nextC);
          if (midPiece) {
            if (midPiece.player !== piece.player) {
              // Found an opponent piece, check if square after is empty
              let endR = nextR + dr;
              let endC = nextC + dc;
              while (isWithinBoard(endR, endC)) {
                const endPiece = currentPieces.find(p => p.row === endR && p.col === endC);
                if (!endPiece) {
                  moves.push({
                    pieceId: piece.id,
                    from: { row: piece.row, col: piece.col },
                    to: { row: endR, col: endC },
                    captured: [midPiece.id]
                  });
                  endR += dr;
                  endC += dc;
                } else {
                  break;
                }
              }
            }
            break; // Blocked by own piece or already jumped
          }
          nextR += dr;
          nextC += dc;
        }
      } else {
        const midR = piece.row + dr;
        const midC = piece.col + dc;
        const endR = piece.row + dr * 2;
        const endC = piece.col + dc * 2;

        if (isWithinBoard(endR, endC)) {
          const midPiece = currentPieces.find(p => p.row === midR && p.col === midC);
          const endPiece = currentPieces.find(p => p.row === endR && p.col === endC);

          if (midPiece && midPiece.player !== piece.player && !endPiece) {
            moves.push({
              pieceId: piece.id,
              from: { row: piece.row, col: piece.col },
              to: { row: endR, col: endC },
              captured: [midPiece.id]
            });
          }
        }
      }
    }

    if (mustJump) return moves;

    // Regular moves
    if (moves.length === 0) {
      for (const [dr, dc] of directions) {
        if (piece.type === 'king') {
          // Flying kings: move any distance
          let nextR = piece.row + dr;
          let nextC = piece.col + dc;
          while (isWithinBoard(nextR, nextC)) {
            const nextPiece = currentPieces.find(p => p.row === nextR && p.col === nextC);
            if (!nextPiece) {
              moves.push({
                pieceId: piece.id,
                from: { row: piece.row, col: piece.col },
                to: { row: nextR, col: nextC }
              });
              nextR += dr;
              nextC += dc;
            } else {
              break;
            }
          }
        } else {
          const nextR = piece.row + dr;
          const nextC = piece.col + dc;
          if (isWithinBoard(nextR, nextC)) {
            const nextPiece = currentPieces.find(p => p.row === nextR && p.col === nextC);
            if (!nextPiece) {
              moves.push({
                pieceId: piece.id,
                from: { row: piece.row, col: piece.col },
                to: { row: nextR, col: nextC }
              });
            }
          }
        }
      }
    }

    return moves;
  }, [boardSize]);

  const selectPiece = (id: string) => {
    const piece = pieces.find(p => p.id === id);
    if (!piece || piece.player !== turn) return;

    // Check if any piece MUST jump
    const allJumps: Move[] = [];
    pieces.filter(p => p.player === turn).forEach(p => {
      allJumps.push(...getValidMovesForPiece(p, pieces, true));
    });

    const pieceMoves = getValidMovesForPiece(piece, pieces, allJumps.length > 0);
    
    setSelectedPieceId(id);
    setValidMoves(pieceMoves);
  };

  const getAllValidMoves = useCallback((player: Player, currentPieces: Piece[]) => {
    const playerPieces = currentPieces.filter(p => p.player === player);
    const allJumps: Move[] = [];
    playerPieces.forEach(p => {
      allJumps.push(...getValidMovesForPiece(p, currentPieces, true));
    });

    if (allJumps.length > 0) return allJumps;

    const allRegular: Move[] = [];
    playerPieces.forEach(p => {
      allRegular.push(...getValidMovesForPiece(p, currentPieces, false));
    });
    return allRegular;
  }, [getValidMovesForPiece]);

  const makeMove = (move: Move) => {
    const piece = pieces.find(p => p.id === move.pieceId);
    if (!piece) return;

    let newPieces = pieces.map(p => {
      if (p.id === move.pieceId) {
        let newType = p.type;
        if (p.player === 'white' && move.to.row === 0) newType = 'king';
        if (p.player === 'black' && move.to.row === boardSize - 1) newType = 'king';
        return { ...p, row: move.to.row, col: move.to.col, type: newType };
      }
      return p;
    });

    if (move.captured) {
      newPieces = newPieces.filter(p => !move.captured!.includes(p.id));
      const updatedTurnCaptures = [...turnCaptures, ...move.captured];
      setTurnCaptures(updatedTurnCaptures);
      
      // Check for double jumps
      const movedPiece = newPieces.find(p => p.id === move.pieceId)!;
      const nextJumps = getValidMovesForPiece(movedPiece, newPieces, true);
      
      if (nextJumps.length > 0) {
        setPieces(newPieces);
        setSelectedPieceId(move.pieceId);
        setValidMoves(nextJumps);
        return;
      }

      // Turn ended with captures, check if it's a best play
      if (updatedTurnCaptures.length >= 3) {
        setLastBestPlay({
          player: turn,
          count: updatedTurnCaptures.length,
          pieceId: move.pieceId
        });
      }
    }

    setPieces(newPieces);
    setTurn(turn === 'white' ? 'black' : 'white');
    setSelectedPieceId(null);
    setValidMoves([]);
    setTurnCaptures([]);

    // Check for winner
    const opponent = turn === 'white' ? 'black' : 'white';
    const opponentPieces = newPieces.filter(p => p.player === opponent);
    if (opponentPieces.length === 0) {
      setWinner(turn);
    }
  };

  return {
    pieces,
    turn,
    selectedPieceId,
    validMoves,
    winner,
    selectPiece,
    makeMove,
    initBoard,
    lastBestPlay,
    clearLastBestPlay: () => setLastBestPlay(null),
    getAllValidMoves
  };
}
