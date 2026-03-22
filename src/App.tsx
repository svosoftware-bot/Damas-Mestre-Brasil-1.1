import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Settings, 
  Users, 
  ShoppingBag, 
  Trophy, 
  Gift, 
  Coins, 
  Gem, 
  ChevronLeft,
  LogOut,
  Cpu,
  Volume2,
  MessageSquare,
  Bell,
  Info,
  User,
  Plus,
  Zap
} from 'lucide-react';
import { cn } from './utils/cn';
import { useCheckers, Player, Piece, Move } from './hooks/useCheckers';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import confetti from 'canvas-confetti';

type Screen = 'splash' | 'main-menu' | 'game' | 'equipment' | 'store' | 'settings' | 'friends' | 'ranking';
type AIDifficulty = 'beginner' | 'medium' | 'advanced';

interface GameSettings {
  boardStyle: 'classic' | 'modern' | 'brazil' | 'dark' | 'light-wood' | 'cream-brown' | 'sand';
  pieceStyle: '3d' | '2d';
  flatMode: boolean;
  whitePieceColor: string;
  blackPieceColor: string;
  showContrastCircle: boolean;
}

function AppContent() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [gameMode, setGameMode] = useState<'classic' | 'international' | 'ai'>('classic');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('medium');
  const [settings, setSettings] = useState<GameSettings>({
    boardStyle: 'cream-brown',
    pieceStyle: '3d',
    flatMode: false,
    whitePieceColor: '#ffffff',
    blackPieceColor: '#000000',
    showContrastCircle: true
  });
  const { user, profile, loading, login, logout } = useAuth();

  useEffect(() => {
    if (!loading && user && screen === 'splash') {
      setScreen('main-menu');
    } else if (!loading && !user && screen !== 'splash') {
      setScreen('splash');
    }
  }, [user, loading, screen]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#2a1a10] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-yellow-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#2a1a10] text-white font-sans overflow-hidden flex flex-col items-center justify-center">
      <div className="w-full max-w-md h-[800px] bg-[#3d2b1f] relative shadow-2xl overflow-hidden flex flex-col">
        {/* Background Image with Transparency */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <img 
            src="https://images.unsplash.com/photo-1593433551531-097c7ae5c0bc?auto=format&fit=crop&q=80&w=800" 
            alt="Checkers Board Background" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#3d2b1f]/60 via-[#3d2b1f]/40 to-[#3d2b1f]" />
        </div>

        <AnimatePresence mode="wait">
          {screen === 'splash' && (
            <SplashScreen key="splash" onLogin={login} />
          )}
          {screen === 'main-menu' && profile && (
            <MainMenu 
              key="main-menu" 
              profile={profile}
              onNavigate={setScreen} 
              onPlay={(mode, difficulty) => {
                setGameMode(mode);
                if (difficulty) setAiDifficulty(difficulty);
                setScreen('game');
              }} 
            />
          )}
          {screen === 'game' && (
            <GameScreen 
              key="game" 
              mode={gameMode} 
              aiDifficulty={aiDifficulty}
              settings={settings}
              onBack={() => setScreen('main-menu')} 
            />
          )}
          {screen === 'equipment' && (
            <EquipmentScreen key="equipment" onBack={() => setScreen('main-menu')} />
          )}
          {screen === 'store' && (
            <StoreScreen key="store" onBack={() => setScreen('main-menu')} />
          )}
          {screen === 'ranking' && (
            <RankingScreen key="ranking" onBack={() => setScreen('main-menu')} />
          )}
          {screen === 'settings' && (
            <SettingsScreen 
              key="settings" 
              settings={settings}
              onUpdateSettings={setSettings}
              onBack={() => setScreen('main-menu')} 
              onLogout={logout} 
            />
          )}
          {screen === 'friends' && (
            <FriendsScreen key="friends" onBack={() => setScreen('main-menu')} />
          )}
        </AnimatePresence>

        {/* Bottom Navigation (Only on main screens) */}
        {['main-menu', 'equipment', 'store', 'friends'].includes(screen) && (
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-[#2a1a10] border-t border-[#5d4037] flex items-center justify-around px-2 z-50">
            <NavButton icon={<Play size={24} />} label="Menu" active={screen === 'main-menu'} onClick={() => setScreen('main-menu')} />
            <NavButton icon={<Users size={24} />} label="Amigos" active={screen === 'friends'} onClick={() => setScreen('friends')} />
            <NavButton icon={<Trophy size={24} />} label="Eventos" active={false} onClick={() => {}} />
            <NavButton icon={<ShoppingBag size={24} />} label="Loja" active={screen === 'store'} onClick={() => setScreen('store')} />
            <NavButton icon={<Settings size={24} />} label="Ajustes" active={screen === 'settings'} onClick={() => setScreen('settings')} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 transition-all relative px-3 py-1 rounded-xl",
        active ? "text-[#f27d26] scale-110 bg-black/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]" : "text-[#8e9299] hover:text-white"
      )}
    >
      {icon}
      <span className="text-[10px] uppercase font-bold tracking-wider">{label}</span>
    </button>
  );
}

function TopBar({ profile, onSettings }: { profile: any, onSettings?: () => void }) {
  return (
    <div className="p-4 flex items-center justify-between bg-[#2a1a10]/50 backdrop-blur-sm z-50">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-full border-2 border-yellow-600 overflow-hidden bg-gray-800">
          <img src={profile.photoURL || "https://picsum.photos/seed/user/100/100"} alt="Avatar" referrerPolicy="no-referrer" />
        </div>
        <div className="bg-black/30 px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1">
          <span className="text-xs font-bold text-yellow-500">{profile.level}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="bg-black/40 px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
          <Gem size={14} className="text-blue-400" />
          <span className="text-xs font-bold">{profile.gems}</span>
          <Plus size={12} className="text-green-400 cursor-pointer" />
        </div>
        <div className="bg-black/40 px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
          <Coins size={14} className="text-yellow-500" />
          <span className="text-xs font-bold">{profile.coins}</span>
          <Plus size={12} className="text-green-400 cursor-pointer" />
        </div>
      </div>

      <button onClick={onSettings} className="p-2 bg-black/40 rounded-full border border-white/10">
        <Settings size={20} />
      </button>
    </div>
  );
}

function SplashScreen({ onLogin }: { onLogin: () => void, key?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10"
    >
      <div className="absolute inset-0 bg-black/40" />
      
      <div className="relative z-10 flex flex-col items-center gap-8 w-full">
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gradient-to-b from-[#009b3a] to-[#fedf00] p-4 rounded-2xl border-4 border-[#002776] shadow-2xl"
        >
          <h1 className="text-4xl font-black italic tracking-tighter text-white drop-shadow-lg text-center leading-tight">DAMAS<br/>MESTRE BRASIL</h1>
          <div className="flex justify-center gap-2 mt-2">
            <div className="w-8 h-8 rounded-full bg-white shadow-inner border border-gray-300" />
            <div className="w-8 h-8 rounded-full bg-black shadow-inner border border-gray-700" />
          </div>
        </motion.div>

        <div className="w-full space-y-4 mt-12">
          <button 
            onClick={onLogin}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl font-bold text-lg shadow-2xl border-t border-white/20 border-b-[6px] border-blue-900 active:border-b-0 active:translate-y-1.5 transition-all flex items-center justify-center gap-3"
          >
            <Users size={24} />
            Faça login com o Facebook
          </button>
          
          <button 
            onClick={onLogin}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl font-bold text-lg shadow-2xl border-t border-white/20 border-b-[6px] border-orange-800 active:border-b-0 active:translate-y-1.5 transition-all flex items-center justify-center gap-3"
          >
            <User size={24} />
            Jogue como Convidado
          </button>

          <button 
            onClick={onLogin}
            className="w-full py-4 bg-gradient-to-r from-green-600 to-green-500 rounded-xl font-bold text-lg shadow-2xl border-t border-white/20 border-b-[6px] border-green-900 active:border-b-0 active:translate-y-1.5 transition-all flex items-center justify-center gap-3"
          >
            <Play size={24} />
            Faça login com o Google Play
          </button>
        </div>

        <p className="text-[10px] text-white/60 mt-8">
          Ao jogar nosso jogo, você confirma que aceita nossa Política de Privacidade e nossos Termos e Condições.
        </p>
      </div>
    </motion.div>
  );
}

function MainMenu({ profile, onNavigate, onPlay }: { profile: any, onNavigate: (s: Screen) => void, onPlay: (m: 'classic' | 'international' | 'ai', difficulty?: AIDifficulty) => void, key?: string }) {
  const [showAIDifficulty, setShowAIDifficulty] = useState(false);

  return (
    <motion.div 
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      className="flex flex-col h-full relative z-10"
    >
      <TopBar profile={profile} onSettings={() => onNavigate('settings')} />
      
      <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto pb-24">
        <div className="grid grid-cols-3 gap-4">
          <MenuSmallButton icon={<Coins className="text-yellow-500" />} label="Moedas Grátis" />
          <MenuSmallButton icon={<Gift className="text-green-500" />} label="Caixa da Sorte" badge="!" />
          <MenuSmallButton 
            onClick={() => onNavigate('ranking')}
            icon={
              <div className="relative">
                <Trophy className="text-orange-500" />
                <motion.div
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute -top-1 -right-1"
                >
                  <Zap className="text-yellow-500" size={12} />
                </motion.div>
              </div>
            } 
            label="Ranking" 
          />
        </div>

        <div className="flex flex-col items-center my-4">
          <div className="bg-gradient-to-b from-[#009b3a] to-[#fedf00] px-6 py-2 rounded-xl border-2 border-[#002776] shadow-xl">
            <h2 className="text-xl font-black italic text-white text-center leading-tight">DAMAS<br/>MESTRE BRASIL</h2>
          </div>
        </div>

        <div className="space-y-4">
          <BigButton 
            onClick={() => onPlay('classic')}
            className="bg-gradient-to-r from-green-700 to-green-600"
            label="Jogar Clássico"
            icon={<div className="w-12 h-12 rounded-full bg-red-600 border-4 border-red-800 shadow-lg" />}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <BigButton 
              onClick={() => onPlay('international')}
              className="bg-gradient-to-r from-yellow-700 to-yellow-600 h-32"
              label="Jogar Internacionais"
              icon={<div className="w-10 h-10 rounded-full bg-gray-200 border-4 border-gray-400 shadow-lg" />}
            />
            <div className="relative h-32">
              <AnimatePresence mode="wait">
                {!showAIDifficulty ? (
                  <motion.div
                    key="ai-btn"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="h-full"
                  >
                    <BigButton 
                      onClick={() => setShowAIDifficulty(true)}
                      className="bg-gradient-to-r from-red-700 to-red-600 h-full"
                      label="COMPUTADOR"
                      icon={<Cpu size={32} className="text-white/80" />}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="ai-options"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="h-full bg-[#2a1a10] rounded-2xl border-2 border-red-600 p-2 flex flex-col gap-1 justify-center"
                  >
                    <button onClick={() => onPlay('ai', 'beginner')} className="w-full py-1.5 bg-green-700 rounded-lg text-[10px] font-black uppercase italic">Iniciante</button>
                    <button onClick={() => onPlay('ai', 'medium')} className="w-full py-1.5 bg-yellow-700 rounded-lg text-[10px] font-black uppercase italic">Médio</button>
                    <button onClick={() => onPlay('ai', 'advanced')} className="w-full py-1.5 bg-red-700 rounded-lg text-[10px] font-black uppercase italic">Avançado</button>
                    <button onClick={() => setShowAIDifficulty(false)} className="w-full text-[8px] font-bold text-white/40 uppercase mt-1">Voltar</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <ChestSlot label="Toque para desbloquear" time="10s" />
          <ChestSlot label="Toque para desbloquear" time="30s" />
          <ChestSlot label="Espaço para baú" />
          <ChestSlot label="Espaço para baú" />
        </div>

        <div className="bg-[#2a1a10] rounded-2xl p-4 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black italic uppercase text-yellow-500 flex items-center gap-2">
              <Zap size={14} /> Melhores Jogadas
            </h3>
            <button onClick={() => onNavigate('ranking')} className="text-[10px] font-bold text-white/40 uppercase">Ver Tudo</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-shrink-0 w-32 bg-[#3d2b1f] p-2 rounded-xl border border-white/5 flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full border border-yellow-500/50 overflow-hidden">
                  <img src={`https://picsum.photos/seed/p${i}/100/100`} alt="Player" />
                </div>
                <span className="text-[9px] font-bold truncate w-full text-center">Mestre {i}</span>
                <span className="text-[10px] font-black italic text-yellow-500">COMBO X{6-i}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MenuSmallButton({ icon, label, badge, onClick }: { icon: any, label: string, badge?: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="relative flex flex-col items-center gap-1 bg-[#4e342e] p-3 rounded-xl border-t border-white/10 border-b-4 border-black/40 shadow-xl active:border-b-0 active:translate-y-1 transition-all"
    >
      {badge && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full text-[10px] flex items-center justify-center font-bold border-2 border-[#4e342e]">{badge}</span>}
      {icon}
      <span className="text-[10px] font-bold text-center leading-tight">{label}</span>
    </button>
  );
}

function BigButton({ label, icon, className, onClick }: { label: string, icon: any, className?: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-2xl flex items-center justify-between shadow-2xl border-t border-white/10 border-b-[6px] border-black/40 active:border-b-0 active:translate-y-1.5 transition-all",
        className
      )}
    >
      <span className="text-xl font-black italic uppercase tracking-tight">{label}</span>
      {icon}
    </button>
  );
}

function ChestSlot({ label, time }: { label: string, time?: string }) {
  return (
    <div className="bg-[#2a1a10] rounded-xl p-3 border border-white/5 flex flex-col items-center gap-2 opacity-80">
      <div className="w-12 h-12 bg-[#4e342e] rounded-lg flex items-center justify-center">
        <ShoppingBag size={24} className="text-yellow-600/50" />
      </div>
      <span className="text-[10px] text-center font-bold text-white/60">{label}</span>
      {time && <span className="text-xs font-black text-yellow-500">{time}</span>}
    </div>
  );
}

function GameScreen({ mode, aiDifficulty, settings, onBack }: { mode: string, aiDifficulty: AIDifficulty, settings: GameSettings, onBack: () => void, key?: string }) {
  const boardSize = mode === 'international' ? 10 : 8;
  const { 
    pieces, turn, selectedPieceId, validMoves, winner, 
    selectPiece, makeMove, initBoard, lastBestPlay, clearLastBestPlay,
    getAllValidMoves
  } = useCheckers(boardSize);

  // AI Logic
  useEffect(() => {
    if (mode === 'ai' && turn === 'black' && !winner) {
      const timer = setTimeout(() => {
        const moves = getAllValidMoves('black', pieces);
        if (moves.length === 0) return;

        let selectedMove: Move;

        if (aiDifficulty === 'beginner') {
          selectedMove = moves[Math.floor(Math.random() * moves.length)];
        } else if (aiDifficulty === 'medium') {
          // Medium: Prefer jumps (already done), then prefer moves that make kings, then random
          const kingMoves = moves.filter(m => {
            const p = pieces.find(p => p.id === m.pieceId);
            return p?.type !== 'king' && m.to.row === boardSize - 1;
          });
          
          if (kingMoves.length > 0) {
            selectedMove = kingMoves[Math.floor(Math.random() * kingMoves.length)];
          } else {
            selectedMove = moves[Math.floor(Math.random() * moves.length)];
          }
        } else {
          // Advanced: Heuristic search
          // 1. If there's a jump that leads to more jumps or more captures, take it
          const jumpMoves = moves.filter(m => m.captured && m.captured.length > 0);
          if (jumpMoves.length > 0) {
            selectedMove = jumpMoves.reduce((prev, curr) => 
              (curr.captured?.length || 0) > (prev.captured?.length || 0) ? curr : prev
            , jumpMoves[0]);
          } else {
            // 2. Prefer moves that make kings
            const kingMoves = moves.filter(m => {
              const p = pieces.find(p => p.id === m.pieceId);
              return p?.type !== 'king' && m.to.row === boardSize - 1;
            });
            if (kingMoves.length > 0) {
              selectedMove = kingMoves[Math.floor(Math.random() * kingMoves.length)];
            } else {
              // 3. Prefer moves to the edges (safer)
              const edgeMoves = moves.filter(m => m.to.col === 0 || m.to.col === boardSize - 1);
              if (edgeMoves.length > 0) {
                selectedMove = edgeMoves[Math.floor(Math.random() * edgeMoves.length)];
              } else {
                selectedMove = moves[Math.floor(Math.random() * moves.length)];
              }
            }
          }
        }

        makeMove(selectedMove);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [turn, mode, pieces, winner, aiDifficulty, getAllValidMoves, makeMove, boardSize]);

  const getBoardColors = () => {
    switch (settings.boardStyle) {
      case 'modern':
        return { dark: 'bg-blue-900', light: 'bg-blue-100', border: 'border-blue-950' };
      case 'brazil':
        return { dark: 'bg-[#009b3a]', light: 'bg-[#fedf00]', border: 'border-[#002776]' };
      case 'dark':
        return { dark: 'bg-gray-900', light: 'bg-gray-700', border: 'border-black' };
      case 'light-wood':
        return { dark: 'bg-[#bcaaa4]', light: 'bg-[#f5f5f5]', border: 'border-[#8d6e63]' };
      case 'cream-brown':
        return { dark: 'bg-[#a1887f]', light: 'bg-[#fff3e0]', border: 'border-[#795548]' };
      case 'sand':
        return { dark: 'bg-[#d4a373]', light: 'bg-[#faedcd]', border: 'border-[#bc6c25]' };
      case 'classic':
      default:
        return { dark: 'bg-[#4e342e]', light: 'bg-[#d7ccc8]', border: 'border-[#2a1a10]' };
    }
  };

  const colors = getBoardColors();

  useEffect(() => {
    if (winner) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [winner]);

  return (
    <motion.div 
      initial={{ y: 800 }}
      animate={{ y: 0 }}
      exit={{ y: 800 }}
      className="absolute inset-0 bg-[#3d2b1f]/80 backdrop-blur-sm flex flex-col z-10"
    >
      <div className="p-4 flex items-center justify-between bg-black/20">
        <button onClick={onBack} className="p-2 bg-black/40 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold uppercase tracking-widest text-white/60">Turno de</span>
          <span className={cn("text-lg font-black uppercase italic", turn === 'white' ? "text-white" : "text-black")}>
            {turn === 'white' ? 'Brancas' : 'Pretas'}
          </span>
        </div>
        <button onClick={initBoard} className="p-2 bg-black/40 rounded-full">
          <Play size={24} className="rotate-90" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div 
          className={cn(
            "grid transition-all duration-500", 
            !settings.flatMode && "shadow-2xl",
            !settings.flatMode ? colors.border : "border-transparent"
          )}
          style={{ 
            gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
            width: '100%',
            aspectRatio: '1/1',
            borderWidth: settings.flatMode ? '0px' : '8px'
          }}
        >
          {Array.from({ length: boardSize * boardSize }).map((_, i) => {
            const row = Math.floor(i / boardSize);
            const col = i % boardSize;
            const isDark = (row + col) % 2 !== 0;
            const piece = pieces.find(p => p.row === row && p.col === col);
            const isValidMove = validMoves.find(m => m.to.row === row && m.to.col === col);

            return (
              <div 
                key={i}
                className={cn(
                  "relative flex items-center justify-center transition-colors duration-500",
                  isDark ? colors.dark : colors.light
                )}
                onClick={() => {
                  if (isValidMove) makeMove(isValidMove);
                }}
              >
                {piece && (
                  <motion.div 
                    layoutId={piece.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectPiece(piece.id);
                    }}
                    className={cn(
                      "w-[80%] h-[80%] rounded-full cursor-pointer flex items-center justify-center transition-all duration-300",
                      settings.pieceStyle === '3d' && !settings.flatMode ? "shadow-lg border-b-4" : "shadow-none border-0",
                      selectedPieceId === piece.id && "ring-4 ring-yellow-500 scale-110"
                    )}
                    style={{ 
                      backgroundColor: piece.player === 'white' ? settings.whitePieceColor : settings.blackPieceColor,
                      borderColor: piece.player === 'white' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'
                    }}
                  >
                    {settings.showContrastCircle && piece.type !== 'king' && (
                      <div 
                        className={cn(
                          "w-1/2 h-1/2 rounded-full border-2 opacity-40",
                          piece.player === 'white' ? "border-black" : "border-white"
                        )} 
                      />
                    )}
                    {piece.type === 'king' && (
                      <Trophy size={16} className={piece.player === 'white' ? "text-yellow-600" : "text-yellow-500"} />
                    )}
                  </motion.div>
                )}
                {isValidMove && (
                  <div className="w-4 h-4 bg-yellow-500/50 rounded-full animate-pulse" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {winner && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-8 text-center">
          <Trophy size={80} className="text-yellow-500 mb-4" />
          <h2 className="text-4xl font-black italic text-white mb-2">VITÓRIA!</h2>
          <p className="text-xl text-white/80 mb-8">As {winner === 'white' ? 'Brancas' : 'Pretas'} venceram o jogo.</p>
          <button 
            onClick={initBoard}
            className="px-12 py-4 bg-yellow-600 rounded-xl font-bold text-xl shadow-lg"
          >
            Jogar Novamente
          </button>
        </div>
      )}

      <AnimatePresence>
        {lastBestPlay && (
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center z-[100] pointer-events-none"
          >
            <div className="bg-yellow-500 text-black px-8 py-4 rounded-2xl shadow-[0_0_50px_rgba(234,179,8,0.5)] border-4 border-white flex flex-col items-center relative overflow-hidden">
              <div className="absolute -top-4 -right-4 text-black/10 font-black text-6xl rotate-12 pointer-events-none">REPLAY</div>
              <div className="absolute top-0 left-0 bg-black text-white text-[8px] font-black px-2 py-0.5 uppercase tracking-widest">MELHOR JOGADA</div>
              <Zap size={48} className="animate-bounce mb-2 mt-2" />
              <h2 className="text-3xl font-black italic uppercase tracking-tighter">COMBO X{lastBestPlay.count}!</h2>
              <p className="text-lg font-bold">Incrível!</p>
            </div>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              onAnimationComplete={() => clearLastBestPlay()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function EquipmentScreen({ onBack }: { onBack: () => void, key?: string }) {
  const [tab, setTab] = useState<'pieces' | 'stickers'>('pieces');
  
  return (
    <motion.div 
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      className="flex flex-col h-full bg-[#3d2b1f]/80 backdrop-blur-sm relative z-10"
    >
      <div className="p-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2 bg-black/40 rounded-full"><ChevronLeft size={24} /></button>
        <h2 className="text-xl font-black italic">Equipamento</h2>
        <div className="w-10" />
      </div>

      <div className="flex p-4 gap-2">
        <button 
          onClick={() => setTab('pieces')}
          className={cn("flex-1 py-2 rounded-lg font-bold transition-all", tab === 'pieces' ? "bg-yellow-600" : "bg-black/20")}
        >
          Peças
        </button>
        <button 
          onClick={() => setTab('stickers')}
          className={cn("flex-1 py-2 rounded-lg font-bold transition-all", tab === 'stickers' ? "bg-yellow-600" : "bg-black/20")}
        >
          Adesivos
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-4 pb-24">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="bg-[#2a1a10] rounded-xl p-3 border border-white/5 flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-700 to-black border-2 border-white/10 shadow-lg flex items-center justify-center">
              <div className="w-10 h-10 rounded-full border-2 border-white/20" />
            </div>
            <span className="text-[10px] font-bold text-center">Slate {i + 1}</span>
            <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-500 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function StoreScreen({ onBack }: { onBack: () => void, key?: string }) {
  return (
    <motion.div 
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      className="flex flex-col h-full bg-[#3d2b1f]/80 backdrop-blur-sm relative z-10"
    >
      <div className="p-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2 bg-black/40 rounded-full"><ChevronLeft size={24} /></button>
        <h2 className="text-xl font-black italic">Loja</h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        <section>
          <h3 className="text-sm font-bold uppercase tracking-widest text-yellow-500 mb-4">Baús Premium</h3>
          <div className="grid grid-cols-3 gap-4">
            <StoreItem icon={<ShoppingBag size={40} className="text-orange-500" />} label="Profissional" price="100" isGem />
            <StoreItem icon={<ShoppingBag size={40} className="text-blue-500" />} label="Mestre" price="200" isGem />
            <StoreItem icon={<ShoppingBag size={40} className="text-purple-500" />} label="Supremo" price="520" isGem />
          </div>
        </section>

        <section>
          <h3 className="text-sm font-bold uppercase tracking-widest text-yellow-500 mb-4">Gemas</h3>
          <div className="grid grid-cols-3 gap-4">
            <StoreItem icon={<Gem size={32} className="text-blue-400" />} label="Punhado" price="R$ 7,00" />
            <StoreItem icon={<Gem size={32} className="text-blue-400" />} label="Pilha" price="R$ 16,90" />
            <StoreItem icon={<Gem size={32} className="text-blue-400" />} label="Saco" price="R$ 33,90" />
          </div>
        </section>
      </div>
    </motion.div>
  );
}

function StoreItem({ icon, label, price, isGem }: { icon: any, label: string, price: string, isGem?: boolean }) {
  return (
    <div className="bg-[#2a1a10] rounded-xl p-3 border border-white/5 flex flex-col items-center gap-2">
      <div className="w-16 h-16 flex items-center justify-center bg-black/20 rounded-lg">
        {icon}
      </div>
      <span className="text-[10px] font-bold text-center">{label}</span>
      <div className="bg-green-600 px-3 py-1 rounded-full flex items-center gap-1">
        {isGem && <Gem size={10} />}
        <span className="text-[10px] font-black">{price}</span>
      </div>
    </div>
  );
}

function RankingScreen({ onBack }: { onBack: () => void, key?: string }) {
  const [tab, setTab] = useState<'hall' | 'best'>('hall');

  const hallOfFame = [
    { name: "Mestre Silva", wins: 1250, avatar: "https://picsum.photos/seed/p1/100/100", rank: 1 },
    { name: "Dama de Ferro", wins: 1100, avatar: "https://picsum.photos/seed/p2/100/100", rank: 2 },
    { name: "Rei do Tabuleiro", wins: 980, avatar: "https://picsum.photos/seed/p3/100/100", rank: 3 },
    { name: "Estrategista", wins: 850, avatar: "https://picsum.photos/seed/p4/100/100", rank: 4 },
    { name: "Checkmate", wins: 720, avatar: "https://picsum.photos/seed/p5/100/100", rank: 5 },
    { name: "Dama Brilhante", wins: 640, avatar: "https://picsum.photos/seed/p6/100/100", rank: 6 },
    { name: "Mestre das Peças", wins: 590, avatar: "https://picsum.photos/seed/p7/100/100", rank: 7 },
  ];

  const bestPlays = [
    { player: "Mestre Silva", count: 5, date: "22/03/2026", avatar: "https://picsum.photos/seed/p1/100/100" },
    { player: "Dama de Ferro", count: 4, date: "21/03/2026", avatar: "https://picsum.photos/seed/p2/100/100" },
    { player: "Rei do Tabuleiro", count: 4, date: "20/03/2026", avatar: "https://picsum.photos/seed/p3/100/100" },
    { player: "Checkmate", count: 3, date: "19/03/2026", avatar: "https://picsum.photos/seed/p5/100/100" },
  ];

  return (
    <motion.div 
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      className="flex flex-col h-full bg-[#3d2b1f]/80 backdrop-blur-sm relative z-10"
    >
      <div className="p-4 flex items-center justify-between bg-[#2a1a10]">
        <button onClick={onBack} className="p-2 bg-black/40 rounded-full"><ChevronLeft size={24} /></button>
        <h2 className="text-xl font-black italic uppercase tracking-tighter text-yellow-500">RANKING</h2>
        <div className="w-10" />
      </div>

      <div className="flex p-4 gap-2 bg-[#2a1a10]">
        <button 
          onClick={() => setTab('hall')}
          className={cn("flex-1 py-2 rounded-lg font-bold transition-all text-xs", tab === 'hall' ? "bg-yellow-600" : "bg-white/5")}
        >
          Hall da Fama
        </button>
        <button 
          onClick={() => setTab('best')}
          className={cn("flex-1 py-2 rounded-lg font-bold transition-all text-xs flex items-center justify-center gap-1", tab === 'best' ? "bg-yellow-600" : "bg-white/5")}
        >
          <Zap size={12} /> Melhores Jogadas
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {tab === 'hall' ? (
          <>
            <div className="flex justify-center mb-6 mt-2">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-yellow-500 overflow-hidden shadow-2xl">
                  <img src={hallOfFame[0].avatar} alt="Top 1" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black w-8 h-8 rounded-full flex items-center justify-center font-black shadow-lg">
                  1
                </div>
                <Trophy className="absolute -top-4 -left-4 text-yellow-500 rotate-[-20deg]" size={32} />
              </div>
            </div>

            {hallOfFame.map((player) => (
              <div 
                key={player.rank}
                className={cn(
                  "flex items-center gap-4 p-3 rounded-2xl border border-white/5 shadow-lg",
                  player.rank === 1 ? "bg-gradient-to-r from-yellow-900/40 to-yellow-600/20 border-yellow-500/30" : "bg-[#2a1a10]"
                )}
              >
                <div className="w-8 text-center font-black text-lg text-white/40">
                  {player.rank}
                </div>
                <div className="w-12 h-12 rounded-full border-2 border-white/10 overflow-hidden">
                  <img src={player.avatar} alt={player.name} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-sm">{player.name}</h3>
                  <span className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest">{player.wins} Vitórias</span>
                </div>
                {player.rank <= 3 && (
                  <Trophy size={20} className={cn(
                    player.rank === 1 ? "text-yellow-500" : 
                    player.rank === 2 ? "text-gray-300" : "text-orange-400"
                  )} />
                )}
              </div>
            ))}
          </>
        ) : (
          <div className="space-y-4">
            {bestPlays.map((play, i) => (
              <div key={i} className="bg-[#2a1a10] p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-yellow-500 overflow-hidden">
                  <img src={play.avatar} alt={play.player} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-sm">{play.player}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Zap size={14} className="text-yellow-500" />
                    <span className="text-xs font-black italic text-yellow-500">COMBO X{play.count}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-white/40 font-bold">{play.date}</div>
                  <button className="mt-1 text-[10px] bg-yellow-600 px-2 py-1 rounded font-black uppercase italic">Ver Replay</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SettingsScreen({ settings, onUpdateSettings, onBack, onLogout }: { settings: GameSettings, onUpdateSettings: (s: GameSettings) => void, onBack: () => void, onLogout: () => void, key?: string }) {
  return (
    <motion.div 
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      className="flex flex-col h-full bg-[#3d2b1f]/80 backdrop-blur-sm relative z-10"
    >
      <div className="p-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2 bg-black/40 rounded-full"><ChevronLeft size={24} /></button>
        <h2 className="text-xl font-black italic">Configurações</h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        <SettingsGroup label="Visual do Jogo">
          <SettingsItem 
            label="Estilo do Tabuleiro" 
            action={
              <select 
                value={settings.boardStyle}
                onChange={(e) => onUpdateSettings({ ...settings, boardStyle: e.target.value as any })}
                className="bg-green-600 px-2 py-1 rounded-lg font-bold text-xs outline-none"
              >
                <option value="classic">Clássico (Madeira)</option>
                <option value="light-wood">Madeira Clara</option>
                <option value="cream-brown">Creme & Marrom</option>
                <option value="sand">Areia (Bege)</option>
                <option value="modern">Moderno (Azul)</option>
                <option value="brazil">Brasil (Verde/Amarelo)</option>
                <option value="dark">Escuro</option>
              </select>
            } 
          />
          <SettingsItem 
            label="Modo 2D (Plano)" 
            action={
              <Toggle 
                active={settings.flatMode} 
                onToggle={() => onUpdateSettings({ ...settings, flatMode: !settings.flatMode })} 
              />
            } 
          />
          <SettingsItem 
            label="Cor das Peças Brancas" 
            action={
              <div className="flex gap-1">
                {['#ffffff', '#ff4444', '#4444ff', '#44ff44', '#ffff44'].map(color => (
                  <button 
                    key={color}
                    onClick={() => onUpdateSettings({ ...settings, whitePieceColor: color })}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-all",
                      settings.whitePieceColor === color ? "border-yellow-500 scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            } 
          />
          <SettingsItem 
            label="Cor das Peças Pretas" 
            action={
              <div className="flex gap-1">
                {['#000000', '#880000', '#000088', '#008800', '#888800'].map(color => (
                  <button 
                    key={color}
                    onClick={() => onUpdateSettings({ ...settings, blackPieceColor: color })}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-all",
                      settings.blackPieceColor === color ? "border-yellow-500 scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            } 
          />
          <SettingsItem 
            label="Círculo de Contraste" 
            action={
              <Toggle 
                active={settings.showContrastCircle} 
                onToggle={() => onUpdateSettings({ ...settings, showContrastCircle: !settings.showContrastCircle })} 
              />
            } 
          />
        </SettingsGroup>

        <SettingsGroup label="Conta">
          <SettingsItem label="Logout" action={<button onClick={onLogout} className="bg-red-600 px-4 py-1 rounded-lg font-bold flex items-center gap-2 text-xs"><LogOut size={14} /> Logout</button>} />
          <SettingsItem label="Modo de Treinamento" action={<button className="bg-green-600 px-4 py-1 rounded-lg font-bold text-xs">Jogar</button>} />
        </SettingsGroup>

        <SettingsGroup label="Opções de Jogo">
          <SettingsItem label="Idioma" action={<button className="bg-green-600 px-4 py-1 rounded-lg font-bold text-xs">Mudar</button>} />
          <SettingsItem label="Som" action={<Toggle active />} />
          <SettingsItem label="Conversas" action={<Toggle active />} />
          <SettingsItem label="Receber desafios apenas de amigos" action={<Toggle />} />
          <SettingsItem label="Anúncios direcionados" action={<Toggle />} />
          <SettingsItem label="Exibir notificações ao jogar" action={<Toggle active />} />
        </SettingsGroup>
      </div>
    </motion.div>
  );
}

function SettingsGroup({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-widest text-yellow-500 ml-2">{label}</h3>
      <div className="bg-[#2a1a10] rounded-2xl overflow-hidden border border-white/5">
        {children}
      </div>
    </div>
  );
}

function SettingsItem({ label, action }: { label: string, action: React.ReactNode }) {
  return (
    <div className="p-4 flex items-center justify-between border-b border-white/5 last:border-0">
      <span className="text-sm font-bold text-white/80">{label}</span>
      {action}
    </div>
  );
}

function Toggle({ active, onToggle }: { active?: boolean, onToggle?: () => void }) {
  return (
    <div 
      onClick={onToggle}
      className={cn("w-10 h-6 rounded-full p-1 transition-all cursor-pointer", active ? "bg-green-600" : "bg-gray-700")}
    >
      <div className={cn("w-4 h-4 bg-white rounded-full transition-all", active ? "translate-x-4" : "translate-x-0")} />
    </div>
  );
}

function FriendsScreen({ onBack }: { onBack: () => void, key?: string }) {
  return (
    <motion.div 
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      className="flex flex-col h-full bg-[#3d2b1f]/80 backdrop-blur-sm relative z-10"
    >
      <div className="p-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2 bg-black/40 rounded-full"><ChevronLeft size={24} /></button>
        <h2 className="text-xl font-black italic">Amigos</h2>
        <div className="w-10" />
      </div>

      <div className="flex p-4 gap-2">
        <button className="flex-1 py-2 rounded-lg font-bold bg-yellow-600">Desafio</button>
        <button className="flex-1 py-2 rounded-lg font-bold bg-black/20">Presentes</button>
        <button className="flex-1 py-2 rounded-lg font-bold bg-black/20">Mensagens</button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
        <Users size={64} className="text-white/20" />
        <p className="text-lg font-bold text-white/60">Você ainda não adicionou amigos!</p>
        <button className="bg-blue-600 px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg">
          <Users size={20} /> Convidar amigos
        </button>
      </div>
    </motion.div>
  );
}
