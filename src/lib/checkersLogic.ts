import { Piece, Player, Move, PieceType } from '../hooks/useCheckers';

export function isWithinBoard(row: number, col: number, boardSize: number) {
  return row >= 0 && row < boardSize && col >= 0 && col < boardSize;
}

export function getValidMovesForPiece(
  piece: Piece,
  currentPieces: Piece[],
  boardSize: number,
  mustJump: boolean = false,
  rules: 'brazilian' | 'english' = 'brazilian'
): Move[] {
  const isEnglish = rules === 'english';
  const moves: Move[] = [];
  
  const directions = piece.type === 'king' 
    ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] 
    : piece.player === 'white' 
      ? [[-1, 1], [-1, -1]] 
      : [[1, 1], [1, -1]];

  // Jumps (Mandatory in most rules)
  const jumpDirections = (piece.type === 'pawn' && isEnglish)
    ? (piece.player === 'white' ? [[-1, 1], [-1, -1]] : [[1, 1], [1, -1]])
    : [[1, 1], [1, -1], [-1, 1], [-1, -1]];

  for (const [dr, dc] of jumpDirections) {
    if (piece.type === 'king' && !isEnglish) {
      // Flying king jumps: search for a piece to jump over (Brazilian/International)
      let nextR = piece.row + dr;
      let nextC = piece.col + dc;
      while (isWithinBoard(nextR + dr, nextC + dc, boardSize)) {
        const midPiece = currentPieces.find(p => p.row === nextR && p.col === nextC);
        if (midPiece) {
          if (midPiece.player !== piece.player) {
            // Found an opponent piece, check if square after is empty
            let endR = nextR + dr;
            let endC = nextC + dc;
            while (isWithinBoard(endR, endC, boardSize)) {
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
      // Ordinary pawn jumps, or English King jumps (which are exactly like pawn jumps but in all directions)
      const midR = piece.row + dr;
      const midC = piece.col + dc;
      const endR = piece.row + dr * 2;
      const endC = piece.col + dc * 2;

      if (isWithinBoard(endR, endC, boardSize)) {
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
      if (piece.type === 'king' && !isEnglish) {
        // Flying kings: move any distance (Brazilian/International)
        let nextR = piece.row + dr;
        let nextC = piece.col + dc;
        while (isWithinBoard(nextR, nextC, boardSize)) {
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
        // Ordinary pawn moves or English King moves (which are exactly like pawn moves but in all directions)
        const nextR = piece.row + dr;
        const nextC = piece.col + dc;
        if (isWithinBoard(nextR, nextC, boardSize)) {
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
}

export function getMaxCapturesForPiece(
  piece: Piece,
  currentPieces: Piece[],
  boardSize: number,
  rules: 'brazilian' | 'english' = 'brazilian'
): number {
  const jumps = getValidMovesForPiece(piece, currentPieces, boardSize, true, rules);
  if (jumps.length === 0) return 0;

  let max = 0;
  for (const jump of jumps) {
    // Temporarily apply the jump
    let nextPieces = currentPieces.filter(p => !jump.captured!.includes(p.id));
    nextPieces = nextPieces.map(p => {
      if (p.id === jump.pieceId) {
        return { ...p, row: jump.to.row, col: jump.to.col };
      }
      return p;
    });

    const movedPiece = nextPieces.find(p => p.id === jump.pieceId)!;
    
    // Brazilian/English Rule: If a pawn reaches the promotion row, it promotes and turn ends (no more captures in this sequence)
    const reachedPromotionRow = (movedPiece.player === 'white' && movedPiece.row === 0) || 
                                (movedPiece.player === 'black' && movedPiece.row === boardSize - 1);
    
    let captures = 1;
    if (!(reachedPromotionRow && movedPiece.type === 'pawn')) {
      captures += getMaxCapturesForPiece(movedPiece, nextPieces, boardSize, rules);
    }
    
    if (captures > max) max = captures;
  }
  return max;
}

export function getAllValidMoves(
  player: Player,
  currentPieces: Piece[],
  boardSize: number,
  rules: 'brazilian' | 'english' = 'brazilian'
): Move[] {
  const playerPieces = currentPieces.filter(p => p.player === player);
  const isEnglish = rules === 'english';
  
  const jumpsWithCounts: { move: Move, maxCaptures: number }[] = [];
  playerPieces.forEach(p => {
    const pieceJumps = getValidMovesForPiece(p, currentPieces, boardSize, true, rules);
    pieceJumps.forEach(m => {
      let nextPieces = currentPieces.filter(pc => !m.captured!.includes(pc.id));
      nextPieces = nextPieces.map(pc => {
        if (pc.id === m.pieceId) {
          return { ...pc, row: m.to.row, col: m.to.col };
        }
        return pc;
      });
      const movedPiece = nextPieces.find(pc => pc.id === m.pieceId)!;
      const totalCaptures = 1 + getMaxCapturesForPiece(movedPiece, nextPieces, boardSize, rules);
      jumpsWithCounts.push({ move: m, maxCaptures: totalCaptures });
    });
  });

  if (jumpsWithCounts.length > 0) {
    if (isEnglish) {
      // In English rules, capturing is mandatory, but there's no "longest capture path" requirement
      return jumpsWithCounts.map(j => j.move);
    } else {
      const maxPossible = Math.max(...jumpsWithCounts.map(j => j.maxCaptures));
      return jumpsWithCounts
        .filter(j => j.maxCaptures === maxPossible)
        .map(j => j.move);
    }
  }

  const allRegular: Move[] = [];
  playerPieces.forEach(p => {
    allRegular.push(...getValidMovesForPiece(p, currentPieces, boardSize, false, rules));
  });
  return allRegular;
}

export function applyMove(
  pieces: Piece[],
  move: Move,
  boardSize: number,
  rules: 'brazilian' | 'english' = 'brazilian'
): { newPieces: Piece[], nextJumps: Move[] } {
  const piece = pieces.find(p => p.id === move.pieceId);
  if (!piece) return { newPieces: pieces, nextJumps: [] };
  const isEnglish = rules === 'english';

  const reachedPromotionRow = (piece.player === 'white' && move.to.row === 0) || 
                              (piece.player === 'black' && move.to.row === boardSize - 1);

  let newPieces = pieces.map(p => {
    if (p.id === move.pieceId) {
      return { ...p, row: move.to.row, col: move.to.col };
    }
    return p;
  });

  if (move.captured) {
    newPieces = newPieces.filter(p => !move.captured!.includes(p.id));
    
    // Brazilian/English Rule: If a pawn reaches the promotion row, it promotes and turn ends.
    if (reachedPromotionRow && piece.type === 'pawn') {
      newPieces = newPieces.map(p => {
        if (p.id === move.pieceId) {
          return { ...p, type: 'king' };
        }
        return p;
      });
      return { newPieces, nextJumps: [] };
    }

    const movedPiece = newPieces.find(p => p.id === move.pieceId)!;
    
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
      if (isEnglish) {
        return { newPieces, nextJumps: nextJumpsWithCounts.map(j => j.move) };
      } else {
        const maxPossible = Math.max(...nextJumpsWithCounts.map(j => j.maxCaptures));
        const bestNextJumps = nextJumpsWithCounts
          .filter(j => j.maxCaptures === maxPossible)
          .map(j => j.move);
        return { newPieces, nextJumps: bestNextJumps };
      }
    }
  }

  // Turn ends or no more jumps available
  const finalIsKing = reachedPromotionRow || piece.type === 'king';
  newPieces = newPieces.map(p => {
    if (p.id === move.pieceId) {
      return { ...p, type: finalIsKing ? 'king' : p.type };
    }
    return p;
  });

  return { newPieces, nextJumps: [] };
}
