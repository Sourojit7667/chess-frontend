import { useState, useEffect, useMemo } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

const ChessBoard = ({
  fen,
  onMove,
  playerColor = "white",
  disabled = false,
  showMoveHistory = true,
  allowBothSides = false, // For local two-player mode
}) => {
  // Initialize game with the provided FEN or default starting position
  const [game, setGame] = useState(() => new Chess(fen || undefined));
  const [moveHistory, setMoveHistory] = useState([]);
  const [showTurnNotification, setShowTurnNotification] = useState(true);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [optionSquares, setOptionSquares] = useState({});

  // Sync game state when fen prop changes (e.g., when AI makes a move)
  useEffect(() => {
    if (fen && fen !== game.fen()) {
      setGame(new Chess(fen));
      setSelectedSquare(null);
      setOptionSquares({});
      setValidMoves([]);
    }
  }, [fen]);

  // Auto-hide turn notification after 3 seconds, show again after 10 seconds of inactivity
  useEffect(() => {
    // Show notification initially (wrapped in setTimeout to avoid sync setState)
    const showTimer = setTimeout(() => {
      setShowTurnNotification(true);
    }, 0);

    // Hide after 3 seconds
    const hideTimer = setTimeout(() => {
      setShowTurnNotification(false);
    }, 3000);

    // Show again after 10 seconds (reminder)
    const reminderTimer = setTimeout(() => {
      setShowTurnNotification(true);
    }, 10000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearTimeout(reminderTimer);
    };
  }, [game]);

  // Get valid moves for a square and highlight them with modern 3D effect
  const getMoveOptions = (square) => {
    const moves = game.moves({ square, verbose: true });
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares = {};
    moves.forEach((move) => {
      const isCapture = move.captured || move.flags.includes('e');
      newSquares[move.to] = {
        background: isCapture
          ? 'radial-gradient(circle, rgba(220, 38, 38, 0.8) 70%, rgba(185, 28, 28, 0.4) 70%, transparent 75%)'
          : 'radial-gradient(circle, rgba(34, 197, 94, 0.7) 20%, rgba(22, 163, 74, 0.3) 20%, transparent 25%)',
        boxShadow: isCapture 
          ? 'inset 0 0 15px rgba(220, 38, 38, 0.5)' 
          : 'none',
        borderRadius: '50%',
        transition: 'all 0.2s ease',
      };
    });
    
    // Highlight selected square with golden glow
    newSquares[square] = {
      background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.6) 0%, rgba(245, 158, 11, 0.5) 100%)',
      boxShadow: 'inset 0 0 20px rgba(251, 191, 36, 0.6), 0 0 15px rgba(251, 191, 36, 0.4)',
    };
    
    setOptionSquares(newSquares);
    setValidMoves(moves);
    return true;
  };

  // Handle square click
  const onSquareClick = ({ square, piece }) => {
    if (disabled) return;

    const currentTurn = game.turn();
    const clickedPiece = game.get(square);
    
    // Check if it's player's turn (or allow both sides in local mode)
    const isPlayersTurn = allowBothSides || 
      (currentTurn === 'w' && playerColor === 'white') ||
      (currentTurn === 'b' && playerColor === 'black');

    // If a piece is already selected
    if (selectedSquare) {
      // Check if clicked square is a valid move
      const moveAttempt = validMoves.find(m => m.to === square);
      
      if (moveAttempt) {
        // Make the move
        makeMove(selectedSquare, square);
        setSelectedSquare(null);
        setOptionSquares({});
        setValidMoves([]);
        return;
      }
      
      // If clicking on another piece of the same color (current turn), select it
      if (clickedPiece && clickedPiece.color === currentTurn && isPlayersTurn) {
        setSelectedSquare(square);
        getMoveOptions(square);
        return;
      }
      
      // Clear selection
      setSelectedSquare(null);
      setOptionSquares({});
      setValidMoves([]);
      return;
    }

    // No piece selected - select one if it's the right color
    if (clickedPiece && clickedPiece.color === currentTurn && isPlayersTurn) {
      setSelectedSquare(square);
      getMoveOptions(square);
    }
  };

  // Handle piece click (when dragging is enabled)
  const onPieceClick = ({ piece, square }) => {
    if (disabled) return;
    
    const currentTurn = game.turn();
    const clickedPiece = game.get(square);
    
    const isPlayersTurn = allowBothSides || 
      (currentTurn === 'w' && playerColor === 'white') ||
      (currentTurn === 'b' && playerColor === 'black');

    if (clickedPiece && clickedPiece.color === currentTurn && isPlayersTurn) {
      setSelectedSquare(square);
      getMoveOptions(square);
    }
  };

  // Helper function to make a move
  const makeMove = (sourceSquare, targetSquare) => {
    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q", // Always promote to queen for simplicity
      });

      if (move === null) return false;

      // Store full move details for better history display
      const moveDetail = {
        san: move.san,
        piece: move.piece,
        from: move.from,
        to: move.to,
        color: move.color,
        captured: move.captured || null,
        promotion: move.promotion || null,
        flags: move.flags,
      };

      setGame(new Chess(game.fen()));
      setMoveHistory([...moveHistory, moveDetail]);
      setSelectedSquare(null);
      setOptionSquares({});
      setValidMoves([]);

      if (onMove) {
        onMove(
          move,
          game.fen(),
          game.isGameOver(),
          game.isCheckmate(),
          game.isDraw(),
        );
      }

      return true;
    } catch (_) {
      return false;
    }
  };

  // Handle piece drop (drag and drop)
  const onPieceDrop = ({ piece, sourceSquare, targetSquare }) => {
    if (disabled) return false;
    const result = makeMove(sourceSquare, targetSquare);
    return result;
  };

  // Modern 3D-style chessboard options
  const chessboardOptions = {
    position: game.fen(),
    boardOrientation: playerColor,
    onSquareClick: onSquareClick,
    onPieceClick: onPieceClick,
    onPieceDrop: onPieceDrop,
    squareStyles: optionSquares,
    allowDragging: !disabled,
    showAnimations: true,
    animationDurationInMs: 200,
    boardStyle: {
      borderRadius: "16px",
      boxShadow: `
        0 0 0 8px rgba(139, 90, 43, 0.9),
        0 0 0 12px rgba(101, 67, 33, 1),
        0 20px 50px rgba(0, 0, 0, 0.6),
        0 10px 20px rgba(0, 0, 0, 0.4),
        inset 0 0 30px rgba(0, 0, 0, 0.1)
      `,
      transform: "perspective(1000px) rotateX(2deg)",
      transition: "transform 0.3s ease, box-shadow 0.3s ease",
    },
    darkSquareStyle: {
      background: "linear-gradient(135deg, #7b5c3e 0%, #5d4427 50%, #4a3620 100%)",
      boxShadow: "inset 2px 2px 4px rgba(0,0,0,0.3), inset -1px -1px 2px rgba(255,255,255,0.1)",
    },
    lightSquareStyle: {
      background: "linear-gradient(135deg, #f5deb3 0%, #e8d4a2 50%, #dcc591 100%)",
      boxShadow: "inset 2px 2px 4px rgba(255,255,255,0.5), inset -1px -1px 2px rgba(0,0,0,0.1)",
    },
    dropSquareStyle: {
      boxShadow: "inset 0 0 20px 5px rgba(76, 175, 80, 0.6)",
      background: "radial-gradient(circle, rgba(76, 175, 80, 0.4) 0%, transparent 70%)",
    },
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="chessboard-3d-container">
        <div className="board-glow"></div>
        <Chessboard options={chessboardOptions} />
      </div>

      {/* Move History */}
      {showMoveHistory && (
        <div className="card flex-1 min-h-[400px] max-w-md">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span>📜</span> Move History
          </h3>

          {/* Game Status */}
          <div className="mb-4">
            {game.isCheckmate() && (
              <div className="text-lg font-bold text-green-400 bg-green-900/20 py-3 px-4 rounded-lg border border-green-400/50 flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                <span>Checkmate! {game.turn() === "w" ? "Black" : "White"} wins!</span>
              </div>
            )}
            {game.isDraw() && (
              <div className="text-lg font-bold text-yellow-400 bg-yellow-900/20 py-3 px-4 rounded-lg border border-yellow-400/50 flex items-center gap-2">
                <span className="text-2xl">🤝</span>
                <span>Draw!</span>
              </div>
            )}
            {game.isCheck() && !game.isCheckmate() && (
              <div className="text-base font-semibold text-red-400 bg-red-900/20 py-2 px-3 rounded-lg border border-red-400/50 animate-pulse flex items-center gap-2">
                <span>⚠️</span>
                <span>Check!</span>
              </div>
            )}
            {!game.isGameOver() && showTurnNotification && (
              <div className="text-base text-white font-medium bg-blue-600/20 py-2 px-3 rounded-lg border border-blue-400/50 flex items-center gap-2">
                <span>{game.turn() === "w" ? "⚪" : "⚫"}</span>
                <span>{game.turn() === "w" ? "White" : "Black"} to move</span>
              </div>
            )}
          </div>

          {/* Move List */}
          <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {moveHistory.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                <span className="text-4xl mb-2 block">♟️</span>
                <p>No moves yet</p>
                <p className="text-sm mt-1">Make your first move!</p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Group moves in pairs (white + black) */}
                {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, pairIndex) => {
                  const whiteMove = moveHistory[pairIndex * 2];
                  const blackMove = moveHistory[pairIndex * 2 + 1];
                  
                  return (
                    <div key={pairIndex} className="flex gap-2 items-stretch">
                      {/* Move number */}
                      <div className="w-8 flex-shrink-0 flex items-center justify-center text-gray-500 font-bold text-sm">
                        {pairIndex + 1}.
                      </div>
                      
                      {/* White's move */}
                      <div className="flex-1">
                        <MoveCard move={whiteMove} isWhite={true} />
                      </div>
                      
                      {/* Black's move */}
                      <div className="flex-1">
                        {blackMove ? (
                          <MoveCard move={blackMove} isWhite={false} />
                        ) : (
                          <div className="h-full rounded-lg bg-white/5 border border-dashed border-white/10"></div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Move count summary */}
          {moveHistory.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/10 text-sm text-gray-400 flex justify-between">
              <span>Total moves: {moveHistory.length}</span>
              <span>Turn: {Math.ceil(moveHistory.length / 2)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper component for displaying a single move
const MoveCard = ({ move, isWhite }) => {
  // Piece icons
  const pieceIcons = {
    k: isWhite ? '♔' : '♚',
    q: isWhite ? '♕' : '♛',
    r: isWhite ? '♖' : '♜',
    b: isWhite ? '♗' : '♝',
    n: isWhite ? '♘' : '♞',
    p: isWhite ? '♙' : '♟',
  };

  // Piece names
  const pieceNames = {
    k: 'King',
    q: 'Queen',
    r: 'Rook',
    b: 'Bishop',
    n: 'Knight',
    p: 'Pawn',
  };

  const pieceIcon = pieceIcons[move.piece] || '♙';
  const pieceName = pieceNames[move.piece] || 'Pawn';
  const isCapture = move.captured;
  const isCastling = move.flags.includes('k') || move.flags.includes('q');
  const isPromotion = move.promotion;
  const isCheck = move.san.includes('+');
  const isCheckmate = move.san.includes('#');

  // Format square for display (e.g., e2 -> E2)
  const formatSquare = (sq) => sq.toUpperCase();

  return (
    <div 
      className={`
        rounded-lg p-2 text-sm transition-all duration-200 hover:scale-[1.02]
        ${isWhite 
          ? 'bg-gradient-to-r from-amber-900/30 to-amber-800/20 border border-amber-500/30' 
          : 'bg-gradient-to-r from-slate-700/50 to-slate-600/30 border border-slate-500/30'
        }
        ${isCheckmate ? 'ring-2 ring-red-500/50' : ''}
        ${isCheck && !isCheckmate ? 'ring-1 ring-yellow-500/50' : ''}
      `}
    >
      <div className="flex items-center gap-2">
        {/* Piece icon */}
        <span className={`text-xl ${isWhite ? 'text-amber-200' : 'text-slate-300'}`}>
          {pieceIcon}
        </span>
        
        {/* Move details */}
        <div className="flex-1 min-w-0">
          {isCastling ? (
            <div className="flex items-center gap-1">
              <span className="font-semibold text-white">
                {move.flags.includes('k') ? 'Castle Kingside' : 'Castle Queenside'}
              </span>
              <span className="text-xs text-gray-400">{move.flags.includes('k') ? 'O-O' : 'O-O-O'}</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1 flex-wrap">
                <span className={`font-medium ${isWhite ? 'text-amber-100' : 'text-slate-200'}`}>
                  {pieceName}
                </span>
                <span className="text-gray-400">
                  {formatSquare(move.from)}
                </span>
                <span className={`${isCapture ? 'text-red-400' : 'text-gray-500'}`}>
                  {isCapture ? '⚔️' : '→'}
                </span>
                <span className={`font-semibold ${isCapture ? 'text-red-300' : 'text-green-300'}`}>
                  {formatSquare(move.to)}
                </span>
              </div>
              
              {/* Capture info */}
              {isCapture && (
                <div className="text-xs text-red-400/80 mt-0.5">
                  captures {pieceNames[move.captured] || 'piece'}
                </div>
              )}
              
              {/* Promotion info */}
              {isPromotion && (
                <div className="text-xs text-purple-400 mt-0.5">
                  promotes to {pieceNames[move.promotion]}
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Status indicators */}
        <div className="flex flex-col items-center gap-0.5">
          {isCheckmate && <span className="text-xs">💀</span>}
          {isCheck && !isCheckmate && <span className="text-xs">⚡</span>}
          {isCapture && !isCheckmate && !isCheck && <span className="text-xs">⚔️</span>}
        </div>
      </div>
    </div>
  );
};

export default ChessBoard;
