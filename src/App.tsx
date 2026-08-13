import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Settings, 
  Users, 
  ShoppingBag, 
  Trophy, 
  Crown,
  Gift, 
  Coins, 
  Gem, 
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Mail,
  HelpCircle,
  FileText,
  Lock,
  LogOut,
  Cpu,
  Volume2,
  MessageSquare,
  Bell,
  Info,
  User,
  Plus,
  Zap,
  Target,
  Share2,
  Link,
  MessageCircle,
  Facebook,
  Camera,
  Archive,
  Twitter,
  Send,
  Shield,
  Eye,
  Flag,
  UserPlus,
  UserMinus,
  Skull,
  Search,
  Sword,
  Trash2,
  MonitorOff,
  Globe,
  X,
  Sparkles,
  Star,
  Heart,
  Ghost,
  Flame,
  Smile,
  PlayCircle,
  Youtube,
  ExternalLink,
  Clock,
  ArrowUpRight,
  Check,
  Copy
} from 'lucide-react';
import { cn } from './utils/cn';
import { useCheckers, Player, Piece, Move } from './hooks/useCheckers';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Chat } from './components/Chat';
import confetti from 'canvas-confetti';
import { db, auth, collection, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp, handleFirestoreError, OperationType, increment, deleteField, getDocs, writeBatch, runTransaction } from './firebase';
import { toast, Toaster } from 'sonner';
import { getBestMove } from './lib/checkersAi';
import { applyMove, getAllValidMoves as logicGetAllValidMoves } from './lib/checkersLogic';

type Screen = 'splash' | 'main-menu' | 'game' | 'equipment' | 'store' | 'settings' | 'friends' | 'ranking' | 'lucky-box' | 'clan' | 'profile-details' | 'tournament';
type AIDifficulty = 'beginner' | 'medium' | 'advanced';

export const FICTITIOUS_PLAYERS: Record<string, { name: string, photo: string, wins: number, losses: number, draws: number, trophies: number, level: number }> = {
  'fictitious_maria': {
    name: 'Maria SP',
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150',
    wins: 145,
    losses: 110,
    draws: 35,
    trophies: 820,
    level: 15
  },
  'fictitious_matheus': {
    name: 'Matheus',
    photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150',
    wins: 98,
    losses: 87,
    draws: 20,
    trophies: 610,
    level: 11
  },
  'fictitious_carlos': {
    name: 'Carlos VR',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
    wins: 210,
    losses: 180,
    draws: 50,
    trophies: 1240,
    level: 22
  }
};

export const getFictitiousDifficulty = (fictitiousId: string): 'beginner' | 'medium' | 'advanced' => {
  const saved = localStorage.getItem(`fictitious_difficulty_${fictitiousId}`);
  if (saved === 'medium' || saved === 'advanced') {
    return saved as 'beginner' | 'medium' | 'advanced';
  }
  return 'beginner';
};

export const advanceFictitiousDifficulty = (fictitiousId: string) => {
  const current = getFictitiousDifficulty(fictitiousId);
  let next: 'beginner' | 'medium' | 'advanced' = 'beginner';
  if (current === 'beginner') {
    next = 'medium';
  } else if (current === 'medium' || current === 'advanced') {
    next = 'advanced';
  }
  localStorage.setItem(`fictitious_difficulty_${fictitiousId}`, next);
  return next;
};

interface BestPlay {
  id: string;
  player: Player;
  playerName: string;
  avatar: string;
  count: number;
  date: string;
  moves: Move[];
  initialBoard: Piece[];
  boardSize: number;
  settings: Partial<GameSettings>;
}

interface GameSettings {
  boardStyle: 'classic' | 'modern' | 'brazil' | 'dark' | 'light-wood' | 'cream-brown' | 'sand' | 'green';
  pieceStyle: '3d' | '2d';
  flatMode: boolean;
  myPieceColor: string;
  opponentPieceColor: string;
  showContrastCircle: boolean;
  backgroundId?: string;
  soundEnabled: boolean;
  conversationsEnabled: boolean;
  friendChallengesOnly: boolean;
  targetedAdsEnabled: boolean;
  notificationsEnabled: boolean;
  myQueenStickerId?: string;
  opponentQueenStickerId?: string;
  myPieceCollectionId?: string;
  opponentPieceCollectionId?: string;
  language?: string;
}

const BOARD_THEMES = [
  { id: 'green', label: 'Verde', dark: 'bg-[#064e3b]', light: 'bg-[#d1fae5]' },
  { id: 'cream-brown', label: 'Creme', dark: 'bg-[#a1887f]', light: 'bg-[#fff3e0]' },
  { id: 'dark', label: 'Escuro', dark: 'bg-gray-900', light: 'bg-gray-700' },
  { id: 'classic', label: 'Clássico', dark: 'bg-[#4e342e]', light: 'bg-[#d7ccc8]' },
  { id: 'modern', label: 'Moderno', dark: 'bg-blue-900', light: 'bg-blue-100' },
  { id: 'brazil', label: 'Brasil', dark: 'bg-[#009b3a]', light: 'bg-[#fedf00]' },
  { id: 'light-wood', label: 'Madeira Clara', dark: 'bg-[#bcaaa4]', light: 'bg-[#f5f5f5]' },
  { id: 'sand', label: 'Areia', dark: 'bg-[#d4a373]', light: 'bg-[#faedcd]' },
  { id: 'gold', label: 'Ouro Real', dark: 'bg-[#1a1a1a]', light: 'bg-[#fbbf24]' },
  { id: 'neon', label: 'Cyber Neon', dark: 'bg-[#000000]', light: 'bg-[#f0abfc]' },
];

export const PIECE_COLLECTIONS = [
  { id: 'default', name: 'Padrão', colors: ['#ffffff', '#ff4444', '#00d2ff', '#ffb700', '#44ff44', '#ff007a', '#000000'] },
  { id: 'brazil_flag', name: 'Brasil', isSpecial: true, price: 20, currency: 'gems', rarity: 'Lendário' },
  { id: 'argentina_flag', name: 'Argentina', isSpecial: true, price: 20, currency: 'gems', rarity: 'Lendário' },
  { id: 'russia_flag', name: 'Rússia', isSpecial: true, price: 20, currency: 'gems', rarity: 'Lendário' },
  { id: 'japan_flag', name: 'Japão', isSpecial: true, price: 20, currency: 'gems', rarity: 'Lendário' },
  { id: 'usa_flag', name: 'EUA', isSpecial: true, price: 20, currency: 'gems', rarity: 'Lendário' },
  { id: 'france_flag', name: 'França', isSpecial: true, price: 20, currency: 'gems', rarity: 'Lendário' },
  { id: 'germany_flag', name: 'Alemanha', isSpecial: true, price: 20, currency: 'gems', rarity: 'Lendário' },
  { id: 'italy_flag', name: 'Itália', isSpecial: true, price: 20, currency: 'gems', rarity: 'Lendário' },
  { id: 'mexico_flag', name: 'México', isSpecial: true, price: 20, currency: 'gems', rarity: 'Lendário' },
  { id: 'china_flag', name: 'China', isSpecial: true, price: 20, currency: 'gems', rarity: 'Lendário' },
  { id: 'uk_flag', name: 'Reino Unido', isSpecial: true, price: 20, currency: 'gems', rarity: 'Lendário' },
];

export const SHOP_PIECE_COLORS = [
  { hex: '#ff4444', name: 'Peça Vermelha', price: 50 },
  { hex: '#00d2ff', name: 'Peça Azul', price: 50 },
  { hex: '#ffb700', name: 'Peça Amarela', price: 50 },
  { hex: '#44ff44', name: 'Peça Verde', price: 50 },
  { hex: '#ff007a', name: 'Peça Rosa', price: 50 },
];

const generateTournamentMatches = (participants: string[]) => {
  const numParticipants = participants.length;
  const numRounds = Math.ceil(Math.log2(numParticipants));
  const totalSlots = Math.pow(2, numRounds);
  
  const players = [...participants];
  while (players.length < totalSlots) {
    players.push(null as any);
  }
  
  // Shuffle Round 1
  players.sort(() => Math.random() - 0.5);
  
  let matches: any[] = [];
  
  // Round 1
  for (let i = 0; i < totalSlots; i += 2) {
    const p1 = players[i];
    const p2 = players[i+1];
    const matchId = `r1_m${i/2}`;
    
    const match = {
      id: matchId,
      round: 1,
      player1: p1,
      player2: p2,
      status: p1 && p2 ? 'pending' : 'finished',
      winner: !p1 ? p2 : (!p2 ? p1 : null),
      nextMatchId: numRounds > 1 ? `r2_m${Math.floor(i/4)}` : null,
      nextMatchSlot: (i/2) % 2 === 0 ? 'player1' : 'player2'
    };
    matches.push(match);
  }
  
  // Subsequent Rounds
  for (let r = 2; r <= numRounds; r++) {
    const numMatchesInRound = Math.pow(2, numRounds - r);
    for (let m = 0; m < numMatchesInRound; m++) {
      const matchId = `r${r}_m${m}`;
      const match = {
        id: matchId,
        round: r,
        player1: null as string | null,
        player2: null as string | null,
        status: 'waiting',
        winner: null as string | null,
        nextMatchId: r < numRounds ? `r${r+1}_m${Math.floor(m/2)}` : null,
        nextMatchSlot: m % 2 === 0 ? 'player1' : 'player2'
      };
      
      const prevM1 = matches.find(prev => prev.id === `r${r-1}_m${m*2}`);
      const prevM2 = matches.find(prev => prev.id === `r${r-1}_m${m*2+1}`);
      
      if (prevM1?.winner) match.player1 = prevM1.winner;
      if (prevM2?.winner) match.player2 = prevM2.winner;
      
      if (match.player1 && match.player2) {
        match.status = 'pending';
      }
      
      matches.push(match);
    }
  }
  
  return { matches, numRounds };
};

const FlagPiece = ({ id, isKing }: { id: string; isKing?: boolean }) => {
  const getFlagContent = () => {
    switch (id) {
      case 'brazil_flag':
        return (
          <div className="w-full h-full bg-[#009b3a] relative flex items-center justify-center">
            <div className="w-[85%] h-[55%] bg-[#fedf00] rotate-45 absolute shadow-sm" />
            <div className="w-[35%] h-[35%] bg-[#002776] rounded-full absolute shadow-inner flex items-center justify-center overflow-hidden border border-[#001746]">
              <div className="w-full h-[3px] bg-white absolute -rotate-15 shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
              <div className="absolute inset-0 opacity-40">
                <div className="absolute top-1/4 left-1/2 w-0.5 h-0.5 bg-white rounded-full" />
                <div className="absolute bottom-1/4 right-1/3 w-0.5 h-0.5 bg-white rounded-full" />
                <div className="absolute top-1/2 left-1/4 w-0.5 h-0.5 bg-white rounded-full" />
              </div>
            </div>
            <div className="absolute bottom-[10%] w-full text-center">
              <span className="text-[6px] font-black text-white uppercase tracking-tighter drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">Brasil</span>
            </div>
          </div>
        );
      case 'argentina_flag':
        return (
          <div className="w-full h-full bg-[#74ACDF] relative flex flex-col">
            <div className="flex-1 bg-[#74ACDF]" />
            <div className="flex-1 bg-white flex items-center justify-center">
               <div className="w-4 h-4 rounded-full bg-yellow-500 relative flex items-center justify-center">
                  <div className="absolute w-full h-full border-2 border-orange-600 rounded-full opacity-50" />
                  <div className="w-1 h-1 bg-orange-700 rounded-full" />
               </div>
            </div>
            <div className="flex-1 bg-[#74ACDF]" />
            <div className="absolute bottom-[10%] w-full text-center">
              <span className="text-[6px] font-black text-white uppercase tracking-tighter drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">Argentina</span>
            </div>
          </div>
        );
      case 'russia_flag':
        return (
          <div className="w-full h-full flex flex-col">
            <div className="flex-1 bg-white" />
            <div className="flex-1 bg-[#0039A6]" />
            <div className="flex-1 bg-[#D52B1E]" />
            <div className="absolute bottom-[10%] w-full text-center">
              <span className="text-[6px] font-black text-white uppercase tracking-tighter drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">Rússia</span>
            </div>
          </div>
        );
      case 'japan_flag':
        return (
          <div className="w-full h-full bg-white relative flex items-center justify-center">
            <div className="w-[50%] h-[50%] bg-[#BC002D] rounded-full shadow-sm" />
            <div className="absolute bottom-[10%] w-full text-center">
              <span className="text-[6px] font-black text-gray-800 uppercase tracking-tighter drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">Japão</span>
            </div>
          </div>
        );
      case 'usa_flag':
        return (
          <div className="w-full h-full bg-white relative flex flex-col overflow-hidden">
            <div className="absolute top-0 left-0 w-[45%] h-[55%] bg-[#3C3B6E] flex flex-wrap p-0.5 gap-0.5 content-start">
               {Array.from({ length: 9 }).map((_, i) => (
                 <div key={i} className="w-0.5 h-0.5 bg-white rounded-full opacity-80" />
               ))}
            </div>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className={cn("flex-1", i % 2 === 0 ? "bg-[#B22234]" : "bg-white")} />
            ))}
            <div className="absolute bottom-[10%] w-full text-center">
              <span className="text-[6px] font-black text-white uppercase tracking-tighter drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">EUA</span>
            </div>
          </div>
        );
      case 'france_flag':
        return (
          <div className="w-full h-full flex">
            <div className="flex-1 bg-[#002395]" />
            <div className="flex-1 bg-white" />
            <div className="flex-1 bg-[#ED2939]" />
            <div className="absolute bottom-[10%] w-full text-center">
              <span className="text-[6px] font-black text-white uppercase tracking-tighter drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">França</span>
            </div>
          </div>
        );
      case 'germany_flag':
        return (
          <div className="w-full h-full flex flex-col">
            <div className="flex-1 bg-black" />
            <div className="flex-1 bg-[#FF0000]" />
            <div className="flex-1 bg-[#FFCC00]" />
            <div className="absolute bottom-[10%] w-full text-center">
              <span className="text-[6px] font-black text-white uppercase tracking-tighter drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">Alemanha</span>
            </div>
          </div>
        );
      case 'italy_flag':
        return (
          <div className="w-full h-full flex">
            <div className="flex-1 bg-[#009246]" />
            <div className="flex-1 bg-white" />
            <div className="flex-1 bg-[#ce2b37]" />
            <div className="absolute bottom-[10%] w-full text-center">
              <span className="text-[6px] font-black text-white uppercase tracking-tighter drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">Itália</span>
            </div>
          </div>
        );
      case 'mexico_flag':
        return (
          <div className="w-full h-full flex relative">
            <div className="flex-1 bg-[#006847]" />
            <div className="flex-1 bg-white flex items-center justify-center">
              <div className="w-3 h-3 relative">
                {/* Eagle representation */}
                <div className="absolute inset-0 bg-amber-800 rounded-full opacity-40" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-amber-900 rounded-full" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-1 bg-green-800 rounded-sm" />
              </div>
            </div>
            <div className="flex-1 bg-[#CE1126]" />
            <div className="absolute bottom-[10%] w-full text-center">
              <span className="text-[6px] font-black text-white uppercase tracking-tighter drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">México</span>
            </div>
          </div>
        );
      case 'china_flag':
        return (
          <div className="w-full h-full bg-[#EE1C25] relative">
            <div className="absolute top-[15%] left-[15%] w-3 h-3 bg-[#FFFF00] clip-path-star" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} />
            <div className="absolute top-[5%] left-[35%] w-1 h-1 bg-[#FFFF00] rotate-[23deg]" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} />
            <div className="absolute top-[15%] left-[42%] w-1 h-1 bg-[#FFFF00] rotate-[45deg]" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} />
            <div className="absolute top-[28%] left-[42%] w-1 h-1 bg-[#FFFF00] rotate-[0deg]" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} />
            <div className="absolute top-[38%] left-[35%] w-1 h-1 bg-[#FFFF00] rotate-[20deg]" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }} />
            <div className="absolute bottom-[10%] w-full text-center">
              <span className="text-[6px] font-black text-white uppercase tracking-tighter drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">China</span>
            </div>
          </div>
        );
      case 'uk_flag':
        return (
          <div className="w-full h-full bg-[#012169] relative overflow-hidden">
            {/* White diagonals */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-2 bg-white rotate-45" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-2 bg-white -rotate-45" />
            {/* Red diagonals */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-0.5 bg-[#C8102E] rotate-45 translate-y-[1px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-0.5 bg-[#C8102E] -rotate-45 -translate-y-[1px]" />
            {/* White cross */}
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-3 bg-white" />
            <div className="absolute left-1/2 top-0 -translate-x-1/2 h-full w-3 bg-white" />
            {/* Red cross */}
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-1.5 bg-[#C8102E]" />
            <div className="absolute left-1/2 top-0 -translate-x-1/2 h-full w-1.5 bg-[#C8102E]" />
            <div className="absolute bottom-[10%] w-full text-center z-20">
              <span className="text-[4px] font-black text-white uppercase tracking-tighter drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">Reino Unido</span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-full h-full rounded-full relative flex items-center justify-center overflow-hidden border-2 border-black/20 shadow-inner">
        {/* Glossy effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-white/40 pointer-events-none z-10" />
        
        {getFlagContent()}

        {/* King Crown if applicable */}
        {isKing && (
          <div className="absolute top-[10%] z-20">
            <Crown size={8} className="text-yellow-400 fill-yellow-400 drop-shadow-md" />
          </div>
        )}
      </div>
    </div>
  );
};

function AppContent() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [gameMode, setGameMode] = useState<'classic' | 'international' | 'ai' | 'ai_international' | 'multiplayer' | 'local' | 'local_international'>('classic');
  const [multiplayerGameId, setMultiplayerGameId] = useState<string | null>(null);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('medium');
  const [isInviting, setIsInviting] = useState(false);
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem('gameSettings');
      if (saved) {
        return { language: 'system', ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error(e);
    }
    return {
      boardStyle: 'cream-brown',
      pieceStyle: '3d',
      flatMode: false,
      myPieceColor: '#ffffff',
      opponentPieceColor: '#000000',
      showContrastCircle: true,
      soundEnabled: true,
      conversationsEnabled: true,
      friendChallengesOnly: false,
      targetedAdsEnabled: false,
      notificationsEnabled: true,
      myQueenStickerId: 'default',
      opponentQueenStickerId: 'default',
      myPieceCollectionId: 'default',
      opponentPieceCollectionId: 'default',
      language: 'system'
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('gameSettings', JSON.stringify(settings));
    } catch (e) {
      console.error(e);
    }
  }, [settings]);
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [tournamentMatchId, setTournamentMatchId] = useState<string | null>(null);
  const { user, profile, loading, login, logout, updateProfile } = useAuth();
  const [savedBestPlays, setSavedBestPlays] = useState<BestPlay[]>([]);
  const [spectatorBackgroundId, setSpectatorBackgroundId] = useState<string | null>(null);
  const selectedBg = BACKGROUNDS.find(bg => bg.id === (screen === 'game' && spectatorBackgroundId ? spectatorBackgroundId : profile?.selectedBackgroundId)) || BACKGROUNDS[0];

  const [allClans, setAllClans] = useState<any[]>([]);
  const [incomingChallenge, setIncomingChallenge] = useState<any>(null);
  const [incomingTournamentInvite, setIncomingTournamentInvite] = useState<any>(null);
  const [incomingMatchInvitation, setIncomingMatchInvitation] = useState<any>(null);
  const [highlightItemId, setHighlightItemId] = useState<string | null>(null);
  const [globalNotifications, setGlobalNotifications] = useState<any[]>([]);

  const [isSearchingMatch, setIsSearchingMatch] = useState(false);
  const [matchmakingDocId, setMatchmakingDocId] = useState<string | null>(null);
  const quickMatchmakingTimerRef = useRef<any>(null);

  const joinFictitiousMatch = async (matchmakingId: string, rules: 'brazilian' | 'english' = 'brazilian') => {
    if (!profile || !user) return;
    
    if (quickMatchmakingTimerRef.current) {
      clearTimeout(quickMatchmakingTimerRef.current);
      quickMatchmakingTimerRef.current = null;
    }

    try {
      // 1. Delete matchmaking waiting document to prevent race condition with real players
      await deleteDoc(doc(db, 'quick_matchmaking', matchmakingId));
      setMatchmakingDocId(null);

      // 2. Select a fictitious opponent
      const fictitiousIds = ['fictitious_maria', 'fictitious_matheus', 'fictitious_carlos'];
      const selectedFictitiousId = fictitiousIds[Math.floor(Math.random() * fictitiousIds.length)];
      const fData = FICTITIOUS_PLAYERS[selectedFictitiousId];

      const gameId = `quick_game_fictitious_${selectedFictitiousId}_${Date.now()}`;
      
      // Create the game board
      const isInternational = false;
      const boardSize = 8;
      const rowsPerPlayer = 3;
      const initialPieces: Piece[] = [];
      for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
          if ((row + col) % 2 !== 0) {
            if (row < rowsPerPlayer) {
              initialPieces.push({
                id: `black-${row}-${col}`,
                player: 'black',
                type: 'pawn',
                row,
                col,
              });
            } else if (row >= boardSize - rowsPerPlayer) {
              initialPieces.push({
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

      // 3. Create the game document in Firestore
      await setDoc(doc(db, 'games', gameId), {
        players: [user.uid, selectedFictitiousId],
        playerNames: {
          [user.uid]: profile.displayName || 'Jogador',
          [selectedFictitiousId]: fData.name
        },
        board: JSON.stringify(initialPieces),
        turn: 'white',
        status: 'active',
        isInternational,
        boardSize,
        rowsPerPlayer,
        rules: rules,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isQuickMatch: true,
        betAmount: 25,
        visualSettings: {
          boardStyle: settings.boardStyle,
          pieceStyle: settings.pieceStyle,
          flatMode: settings.flatMode,
          myPieceColor: settings.myPieceColor,
          opponentPieceColor: settings.opponentPieceColor,
          showContrastCircle: settings.showContrastCircle,
          backgroundId: profile.selectedBackgroundId || 'default'
        },
        visualSettingsOwnerId: profile.uid
      });

      // 4. Start game
      setGameMode('multiplayer');
      setMultiplayerGameId(gameId);
      setScreen('game');
      setIsSearchingMatch(false);
      toast.success(`Conectado com ${fData.name}! Partida iniciada.`);
    } catch (err: any) {
      toast.error("Erro ao iniciar partida fictícia. Reembolsando...");
      // Refund
      await updateProfile({ coins: (profile.coins || 0) + 25 });
      setIsSearchingMatch(false);
      handleFirestoreError(err, OperationType.WRITE, `quick_matchmaking/${matchmakingId}`);
    }
  };

  const startQuickMatchmaking = async (rules: 'brazilian' | 'english' = 'brazilian') => {
    if (!profile || !user) return;
    if ((profile.coins || 0) < 25) {
      toast.error("Moedas insuficientes! Você precisa de 25 moedas para jogar.");
      return;
    }

    try {
      // 1. Deduct 25 coins immediately
      await updateProfile({ coins: (profile.coins || 0) - 25 });
      toast.success("Iniciando busca por adversário online (Aposta de 25 🪙)!");
      setIsSearchingMatch(true);

      // 2. Query for an existing waiting match from someone else with the same rules
      const matchmakingRef = collection(db, 'quick_matchmaking');
      const q = query(
        matchmakingRef,
        where('status', '==', 'waiting'),
        where('rules', '==', rules),
        orderBy('createdAt', 'desc'),
        limit(10)
      );

      const querySnapshot = await getDocs(q);
      let matchedDoc: any = null;

      // Filter in memory to ensure we don't match ourselves
      const availableDocs = querySnapshot.docs.filter(d => d.data().userId !== user.uid);

      if (availableDocs.length > 0) {
        // Try to claim the first available document using a transaction
        for (const candidateDoc of availableDocs) {
          const success = await runTransaction(db, async (transaction) => {
            const freshDoc = await transaction.get(candidateDoc.ref);
            if (freshDoc.exists() && freshDoc.data().status === 'waiting') {
              const gameId = `quick_game_${freshDoc.id}_${Date.now()}`;
              
              // Create the game state
              const isInternational = false;
              const boardSize = 8;
              const rowsPerPlayer = 3;
              const initialPieces: Piece[] = [];
              for (let row = 0; row < boardSize; row++) {
                for (let col = 0; col < boardSize; col++) {
                  if ((row + col) % 2 !== 0) {
                    if (row < rowsPerPlayer) {
                      initialPieces.push({
                        id: `black-${row}-${col}`,
                        player: 'black',
                        type: 'pawn',
                        row,
                        col,
                      });
                    } else if (row >= boardSize - rowsPerPlayer) {
                      initialPieces.push({
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

              // Set the game document
              transaction.set(doc(db, 'games', gameId), {
                players: [freshDoc.data().userId, user.uid],
                playerNames: {
                  [freshDoc.data().userId]: freshDoc.data().userName || 'Oponente',
                  [user.uid]: profile.displayName || 'Jogador'
                },
                board: JSON.stringify(initialPieces),
                turn: 'white',
                status: 'active',
                isInternational,
                boardSize,
                rowsPerPlayer,
                rules: rules,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                isQuickMatch: true,
                betAmount: 25,
                visualSettings: {
                  boardStyle: settings.boardStyle,
                  pieceStyle: settings.pieceStyle,
                  flatMode: settings.flatMode,
                  myPieceColor: settings.myPieceColor,
                  opponentPieceColor: settings.opponentPieceColor,
                  showContrastCircle: settings.showContrastCircle,
                  backgroundId: profile.selectedBackgroundId || 'default'
                },
                visualSettingsOwnerId: profile.uid
              });

              // Mark matchmaking document as matched
              transaction.update(candidateDoc.ref, {
                status: 'matched',
                gameId,
                opponentId: user.uid,
                opponentName: profile.displayName || 'Jogador',
                updatedAt: serverTimestamp()
              });

              return gameId;
            }
            return null;
          }).catch((err) => {
            console.error("Matchmaking transaction failed candidate", err);
            return null;
          });

          if (success) {
            matchedDoc = success;
            break;
          }
        }
      }

      if (matchedDoc) {
        // Match successfully completed! Transition to game
        setGameMode('multiplayer');
        setMultiplayerGameId(matchedDoc);
        setScreen('game');
        setIsSearchingMatch(false);
        toast.success("Oponente encontrado! Partida iniciada.");
        return;
      }

      // No match found or couldn't claim one, let's create our own waiting entry
      const myMatchRef = doc(collection(db, 'quick_matchmaking'));
      await setDoc(myMatchRef, {
        userId: user.uid,
        userName: profile.displayName || 'Jogador',
        userPhoto: profile.photoURL || '',
        status: 'waiting',
        gameId: null,
        opponentId: null,
        opponentName: null,
        rules: rules,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setMatchmakingDocId(myMatchRef.id);

      // Start 4-second fallback timer to fictitious match
      if (quickMatchmakingTimerRef.current) clearTimeout(quickMatchmakingTimerRef.current);
      quickMatchmakingTimerRef.current = setTimeout(() => {
        joinFictitiousMatch(myMatchRef.id, rules);
      }, 4000);

    } catch (err: any) {
      toast.error("Erro ao iniciar busca. Tente novamente.");
      setIsSearchingMatch(false);
      handleFirestoreError(err, OperationType.WRITE, 'quick_matchmaking');
    }
  };

  const cancelQuickMatchmaking = async () => {
    if (!profile || !user) return;
    setIsSearchingMatch(false);
    
    if (quickMatchmakingTimerRef.current) {
      clearTimeout(quickMatchmakingTimerRef.current);
      quickMatchmakingTimerRef.current = null;
    }

    // Refund the coins immediately
    try {
      await updateProfile({ coins: (profile.coins || 0) + 25 });
      toast.info("Busca cancelada. Moedas devolvidas!");
    } catch (err) {
      console.error("Error refunding coins", err);
    }

    if (matchmakingDocId) {
      try {
        await deleteDoc(doc(db, 'quick_matchmaking', matchmakingDocId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `quick_matchmaking/${matchmakingDocId}`);
      }
      setMatchmakingDocId(null);
    }
  };

  useEffect(() => {
    if (!matchmakingDocId || !user) return;

    const unsubscribe = onSnapshot(doc(db, 'quick_matchmaking', matchmakingDocId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.status === 'matched' && data.gameId) {
          toast.success("Adversário encontrado! Partida iniciada.");
          setGameMode('multiplayer');
          setMultiplayerGameId(data.gameId);
          setScreen('game');
          setIsSearchingMatch(false);
          setMatchmakingDocId(null);
        }
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `quick_matchmaking/${matchmakingDocId}`);
    });

    return () => unsubscribe();
  }, [matchmakingDocId, user]);

  const previewEmote = (emote: any) => {
    const content = emote.video || emote.image || emote.emoji;
    const isImage = !!emote.image;
    const isVideo = !!emote.video;
    const sound = emote.sound;

    // Play sound if available
    if (sound) {
      const audio = new Audio(sound);
      audio.play().catch(e => console.log("Error playing preview sound (silenced):", e));
    }

    // Add locally for preview display (Large Center)
    const localId = 'preview_' + Date.now();
    setGlobalNotifications(prev => [...prev, { 
      id: localId, 
      type: 'emote', 
      content: content,
      isImage: isImage,
      isVideo: isVideo,
      sound: sound,
      senderName: emote.name || 'Prévia', 
      senderId: 'preview' 
    }]);
    setTimeout(() => {
      setGlobalNotifications(prev => prev.filter(n => n.id !== localId));
    }, 3000);
  };

  // Update lastSeen and status
  useEffect(() => {
    if (!user?.uid) return;
    const updateLastSeen = async () => {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          lastSeen: serverTimestamp(),
          status: screen === 'game' ? 'playing' : 'online',
          currentGameId: screen === 'game' ? multiplayerGameId : null
        });
      } catch (err) {
        // Silently fail if user doc doesn't exist yet or permissions
      }
    };
    updateLastSeen();
    const interval = setInterval(updateLastSeen, 30000);
    return () => clearInterval(interval);
  }, [user?.uid, screen, multiplayerGameId]);

  // Listen for tournament match invitations
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'tournament_match_invitations'),
      where('targetId', '==', user.uid),
      where('status', '==', 'pending')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const invitation = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        setIncomingMatchInvitation(invitation);
        playBeep();
      } else {
        setIncomingMatchInvitation(null);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'tournament_match_invitations');
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // Listen for accepted match invitations (as inviter)
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'tournament_match_invitations'),
      where('inviterId', '==', user.uid),
      where('status', '==', 'accepted')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const invitationDoc = snapshot.docs[0];
        const invitationData = invitationDoc.data();
        
        setTournamentId(invitationData.tournamentId);
        setTournamentMatchId(invitationData.matchId);
        setGameMode('multiplayer');
        setMultiplayerGameId(invitationData.matchId);
        setScreen('game');

        updateDoc(doc(db, 'tournament_match_invitations', invitationDoc.id), { 
          status: 'started' 
        }).catch(err => {
          handleFirestoreError(err, OperationType.UPDATE, `tournament_match_invitations/${invitationDoc.id}`);
        });
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'tournament_match_invitations');
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
      console.error("Error playing beep:", e);
    }
  };

  // Sync clans from Firestore
  useEffect(() => {
    if (!user) return;
    const clansRef = collection(db, 'clans');
    const unsubscribe = onSnapshot(clansRef, (snapshot) => {
      const clansData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllClans(clansData);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'clans');
    });
    return () => unsubscribe();
  }, [user]);

  // Sync tournament invites
  useEffect(() => {
    if (!user) return;
    const invitesRef = collection(db, 'tournament_invites');
    const q = query(invitesRef, where('targetId', '==', user.uid), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setIncomingTournamentInvite({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setIncomingTournamentInvite(null);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'tournament_invites');
    });
    return () => unsubscribe();
  }, [user]);

  // Sync current user status in clan
  useEffect(() => {
    if (!user || !profile?.clanId) return;

    const memberDocRef = doc(db, 'clans', profile.clanId, 'members', user.uid);
    
    const updateStatus = async (status: 'online' | 'offline' | 'playing') => {
      try {
        await setDoc(memberDocRef, {
          uid: user.uid,
          name: profile.displayName || 'Jogador',
          avatar: profile.photoURL || '',
          role: profile.clanRole || 'member',
          trophies: profile.trophies || 0,
          status: status,
          currentGameId: status === 'playing' ? multiplayerGameId : null,
          lastActive: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        // Silently fail for status updates to avoid spamming errors if permission is lost
      }
    };

    const currentStatus = screen === 'game' ? 'playing' : 'online';
    updateStatus(currentStatus);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        updateStatus('offline');
      } else {
        updateStatus(currentStatus);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Update status periodically to keep lastActive fresh
    const interval = setInterval(() => updateStatus(currentStatus), 60000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
      updateStatus('offline');
    };
  }, [user, profile?.clanId, profile?.clanRole, profile?.displayName, profile?.photoURL, profile?.trophies, screen]);

  // Listen for incoming challenges
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'challenges'),
      where('targetId', '==', user.uid),
      where('status', '==', 'pending')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const challenge = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        setIncomingChallenge(challenge);
        playBeep();
      } else {
        setIncomingChallenge(null);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'challenges');
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // Listen for accepted challenges (as challenger)
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'challenges'),
      where('challengerId', '==', user.uid),
      where('status', '==', 'accepted')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const challengeDoc = snapshot.docs[0];
        const challengeData = challengeDoc.data();
        // Challenge accepted! Move to game screen
        setGameMode('multiplayer');
        setMultiplayerGameId(challengeData.gameId || null);
        setScreen('game');
        // Mark as started to avoid re-triggering
        setDoc(doc(db, 'challenges', challengeDoc.id), { 
          status: 'started' 
        }, { merge: true }).catch(err => {
          handleFirestoreError(err, OperationType.UPDATE, `challenges/${challengeDoc.id}`);
        });
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'challenges');
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const playClick = () => {
    if (!settings.soundEnabled) {
      console.log('Sound disabled, skipping click sound');
      return;
    }
    console.log('Playing click sound');
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    audio.volume = 0.4;
    audio.play().catch(err => console.log('Error playing click sound:', err));
  };

  useEffect(() => {
    if (!loading && user && screen === 'splash') {
      setScreen('main-menu');
    } else if (!loading && !user && screen !== 'splash') {
      setScreen('splash');
    }
  }, [user, loading, screen]);

  useEffect(() => {
    if (screen === 'lucky-box' && profile?.hasNewLuckyBoxItems) {
      updateProfile({ hasNewLuckyBoxItems: false });
    }
  }, [screen, profile?.hasNewLuckyBoxItems, updateProfile]);

  useEffect(() => {
    const saved = localStorage.getItem('bestPlays');
    if (saved) {
      try {
        const parsed: BestPlay[] = JSON.parse(saved);
        // Deduplicate
        const unique: BestPlay[] = [];
        const seen = new Set<string>();
        parsed.forEach(p => {
          const key = JSON.stringify(p.initialBoard) + JSON.stringify(p.moves);
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(p);
          }
        });
        setSavedBestPlays(unique);
      } catch (e) {
        console.error('Failed to parse best plays', e);
      }
    }
  }, []);

  const saveBestPlay = (play: Omit<BestPlay, 'id' | 'date'>) => {
    // Check for duplicates
    const isDuplicate = savedBestPlays.some(p => {
      const sameBoard = JSON.stringify(p.initialBoard) === JSON.stringify(play.initialBoard);
      const sameMoves = JSON.stringify(p.moves) === JSON.stringify(play.moves);
      return sameBoard && sameMoves;
    });

    if (isDuplicate) return;

    const newPlay: BestPlay = {
      ...play,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toLocaleDateString('pt-BR')
    };
    const updated = [newPlay, ...savedBestPlays].slice(0, 20); // Keep last 20
    setSavedBestPlays(updated);
    localStorage.setItem('bestPlays', JSON.stringify(updated));
  };

  const sendMatchInvitation = async (tournamentId: string, match: any) => {
    const targetId = match.player1 === auth.currentUser?.uid ? match.player2 : match.player1;
    if (!targetId) return;

    setIsInviting(true);
    try {
      // Check if target is online
      const userDoc = await getDoc(doc(db, 'users', targetId));
      const userData = userDoc.data();
      if (userData?.status !== 'online') {
        toast.error("O adversário não está online no momento.");
        return;
      }

      await addDoc(collection(db, 'tournament_match_invitations'), {
        tournamentId: tournamentId,
        matchId: match.id,
        inviterId: auth.currentUser?.uid,
        inviterName: profile?.displayName || 'Jogador',
        targetId: targetId,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success("Convite enviado! Aguardando o adversário aceitar.");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'tournament_match_invitations');
    } finally {
      setIsInviting(false);
    }
  };

  const createTournamentGame = async (tId: string, mId: string) => {
    try {
      const gameRef = doc(db, 'games', mId);
      const gameSnap = await getDoc(gameRef);
      if (!gameSnap.exists()) {
        const tournamentRef = doc(db, 'tournaments', tId);
        const tournamentSnap = await getDoc(tournamentRef);
        
        if (tournamentSnap.exists()) {
          const tData = tournamentSnap.data();
          const match = tData?.matches?.find((m: any) => m.id === mId);
          
          if (match) {
            const isInternational = match.isInternational || tData.isInternational;
            const boardSize = isInternational ? 10 : 8;
            const rowsPerPlayer = isInternational ? 4 : 3;
            const initialPieces: any[] = [];
            for (let r = 0; r < boardSize; r++) {
              for (let c = 0; c < boardSize; c++) {
                if ((r + c) % 2 === 1) {
                  if (r < rowsPerPlayer) initialPieces.push({ id: `b-${r}-${c}`, row: r, col: c, player: 'black', isKing: false });
                  if (r > boardSize - (rowsPerPlayer + 1)) initialPieces.push({ id: `w-${r}-${c}`, row: r, col: c, player: 'white', isKing: false });
                }
              }
            }

            await setDoc(gameRef, {
              players: [match.player1, match.player2],
              board: JSON.stringify(initialPieces),
              turn: 'white',
              status: 'active',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              tournamentId: tId,
              matchId: mId,
              isInternational: !!isInternational,
              boardSize,
              rowsPerPlayer,
              visualSettings: {
                boardStyle: settings.boardStyle,
                pieceStyle: settings.pieceStyle,
                flatMode: settings.flatMode,
                myPieceColor: settings.myPieceColor,
                opponentPieceColor: settings.opponentPieceColor,
                showContrastCircle: settings.showContrastCircle,
                backgroundId: profile.selectedBackgroundId || 'default',
                myQueenStickerId: settings.myQueenStickerId,
                opponentQueenStickerId: settings.opponentQueenStickerId
              },
              visualSettingsOwnerId: profile.uid
            });
          }
        }
      }
    } catch (err) {
      console.error("Error creating tournament game:", err);
      throw err;
    }
  };

  const onStartMatch = async (tId: string, mId: string) => {
    setTournamentId(tId);
    setTournamentMatchId(mId);
    
    try {
      await createTournamentGame(tId, mId);
    } catch (err) {
      // Error already logged in createTournamentGame
    }

    setGameMode('multiplayer');
    setMultiplayerGameId(mId);
    setScreen('game');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#2a1a10] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-yellow-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#2a1a10] text-white font-sans overflow-hidden flex flex-col items-center justify-center">
      <div 
        className="w-full max-w-md h-[800px] relative shadow-2xl overflow-hidden flex flex-col transition-colors duration-500"
        style={{ backgroundColor: selectedBg.hex || '#3d2b1f' }}
      >
        {/* Background Image with Transparency */}
        <div className="absolute inset-0 z-0 opacity-70 pointer-events-none">
          {(selectedBg as any).isPattern ? (
            <div 
              className="w-full h-full" 
              style={{ 
                backgroundImage: `url(${selectedBg.image})`, 
                backgroundSize: (selectedBg as any).patternSize || '400px', 
                backgroundRepeat: 'repeat' 
              }} 
            />
          ) : (
            <img 
              src={selectedBg.image} 
              alt="Checkers Board Background" 
              className="w-full h-full object-cover object-center"
              referrerPolicy="no-referrer"
            />
          )}
          <div 
            className="absolute inset-0 transition-colors duration-500" 
            style={{ 
              background: `linear-gradient(to bottom, ${(selectedBg.hex || '#3d2b1f')}99, ${(selectedBg.hex || '#3d2b1f')}66, ${selectedBg.hex || '#3d2b1f'})` 
            }}
          />
        </div>

        <AnimatePresence mode="wait">
          {screen === 'splash' && (
            <SplashScreen key="splash" onLogin={login} playClick={playClick} />
          )}
          {screen === 'main-menu' && profile && (
            <MainMenu 
              key="main-menu" 
              profile={profile}
              updateProfile={updateProfile}
              onNavigate={setScreen} 
              onStartQuickMatchmaking={startQuickMatchmaking}
              onPlay={async (mode, difficulty) => {
                setGameMode(mode);
                if (difficulty) setAiDifficulty(difficulty);
                
                // Create a game document even for AI/Local games to allow spectating
                try {
                  const gameId = `game_${profile.uid}_${Date.now()}`;
                  const isInternational = mode === 'international' || mode === 'local_international' || mode === 'ai_international';
                  const boardSize = isInternational ? 10 : 8;
                  const rowsPerPlayer = isInternational ? 4 : 3;
                  
                  const initialPieces: Piece[] = [];
                  for (let row = 0; row < boardSize; row++) {
                    for (let col = 0; col < boardSize; col++) {
                      if ((row + col) % 2 !== 0) {
                        if (row < rowsPerPlayer) {
                          initialPieces.push({
                            id: `black-${row}-${col}`,
                            player: 'black',
                            type: 'pawn',
                            row,
                            col,
                          });
                        } else if (row >= boardSize - rowsPerPlayer) {
                          initialPieces.push({
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

                  await setDoc(doc(db, 'games', gameId), {
                    players: [profile.uid, (mode === 'ai' || mode === 'ai_international') ? 'ai' : 'local_opponent'],
                    playerNames: {
                      [profile.uid]: profile.displayName || 'Jogador 1',
                      'ai': `IA (${difficulty === 'beginner' ? 'Iniciante' : difficulty === 'medium' ? 'Médio' : 'Avançado'})`,
                      'local_opponent': 'Jogador 2'
                    },
                    board: JSON.stringify(initialPieces),
                    turn: 'white',
                    status: 'active',
                    mode: (mode === 'local' || mode === 'local_international') ? 'classic' : (mode === 'ai_international' ? 'ai' : mode),
                    isLocal: mode === 'local' || mode === 'local_international',
                    isInternational: isInternational,
                    rules: 'brazilian',
                    aiDifficulty: difficulty || null,
                    timestamp: serverTimestamp(),
                    lastMove: null,
                    spectators: [],
                    visualSettings: {
                      boardStyle: settings.boardStyle,
                      pieceStyle: settings.pieceStyle,
                      flatMode: settings.flatMode,
                      myPieceColor: settings.myPieceColor,
                      opponentPieceColor: settings.opponentPieceColor,
                      showContrastCircle: settings.showContrastCircle,
                      backgroundId: profile.selectedBackgroundId || 'default',
                      myQueenStickerId: settings.myQueenStickerId,
                      opponentQueenStickerId: settings.opponentQueenStickerId
                    },
                    visualSettingsOwnerId: profile.uid
                  });
                  
                  // Update profile status to playing
                  await updateProfile({
                    status: 'playing',
                    currentGameId: gameId
                  });
                  
                  setMultiplayerGameId(gameId);
                } catch (err) {
                  console.error("Error creating game for spectating:", err);
                }
                
                setScreen('game');
              }} 
              playClick={playClick}
              savedBestPlays={savedBestPlays}
              incomingChallenge={incomingChallenge}
              onAcceptChallenge={async (challenge) => {
                playClick();
                try {
                  const gameId = `game_${challenge.id}`;
                  const isInternational = challenge.isInternational;
                  const boardSize = isInternational ? 10 : 8;
                  const rowsPerPlayer = isInternational ? 4 : 3;
                  const initialPieces: Piece[] = [];
                  
                  for (let row = 0; row < boardSize; row++) {
                    for (let col = 0; col < boardSize; col++) {
                      if ((row + col) % 2 !== 0) {
                        if (row < rowsPerPlayer) {
                          initialPieces.push({
                            id: `black-${row}-${col}`,
                            player: 'black',
                            type: 'pawn',
                            row,
                            col,
                          });
                        } else if (row >= boardSize - rowsPerPlayer) {
                          initialPieces.push({
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

                  await setDoc(doc(db, 'games', gameId), {
                    players: [challenge.challengerId, challenge.targetId],
                    playerNames: {
                      [challenge.challengerId]: challenge.challengerName,
                      [challenge.targetId]: profile.displayName || 'Anonymous'
                    },
                    board: JSON.stringify(initialPieces),
                    turn: 'white',
                    status: 'active',
                    isInternational: !!isInternational,
                    boardSize,
                    rowsPerPlayer,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    visualSettings: {
                      boardStyle: settings.boardStyle,
                      pieceStyle: settings.pieceStyle,
                      flatMode: settings.flatMode,
                      myPieceColor: settings.myPieceColor,
                      opponentPieceColor: settings.opponentPieceColor,
                      showContrastCircle: settings.showContrastCircle,
                      backgroundId: profile.selectedBackgroundId || 'default'
                    },
                    visualSettingsOwnerId: profile.uid
                  });

                  await setDoc(doc(db, 'challenges', challenge.id), {
                    status: 'accepted',
                    gameId: gameId
                  }, { merge: true });

                  // Update profile status to playing
                  await updateProfile({
                    status: 'playing',
                    currentGameId: gameId
                  });

                  setGameMode('multiplayer');
                  setMultiplayerGameId(gameId);
                  setScreen('game');
                } catch (err) {
                  handleFirestoreError(err, OperationType.UPDATE, `challenges/${challenge.id}`);
                }
              }}
            />
          )}
          {screen === 'game' && profile && (
            <GameScreen 
              key="game" 
              mode={gameMode} 
              multiplayerGameId={multiplayerGameId}
              tournamentId={tournamentId}
              matchId={tournamentMatchId}
              aiDifficulty={aiDifficulty}
              settings={settings}
              profile={profile}
              updateProfile={updateProfile}
              onBack={() => { 
                playClick(); 
                setScreen(tournamentId ? 'tournament' : 'main-menu'); 
                setTournamentId(null);
                setTournamentMatchId(null);
                setSpectatorBackgroundId(null);
              }} 
              onSaveBestPlay={saveBestPlay}
              playClick={playClick}
              onUpdateVisualSettings={(vs) => {
                if (vs.backgroundId) {
                  setSpectatorBackgroundId(vs.backgroundId);
                }
              }}
              onShowEmote={previewEmote}
            />
          )}
          {screen === 'equipment' && profile && (
            <EquipmentScreen 
              key="equipment" 
              profile={profile}
              updateProfile={updateProfile}
              onBack={() => { playClick(); setScreen('main-menu'); }} 
            />
          )}
          {screen === 'store' && profile && (
            <StoreScreen 
              key="store" 
              profile={profile}
              updateProfile={updateProfile}
              onBack={() => { playClick(); setScreen('main-menu'); }} 
              onNavigate={setScreen}
              onHighlightItem={setHighlightItemId}
              onPreviewEmote={previewEmote}
            />
          )}
          {screen === 'profile-details' && profile && (
            <ProfileDetailsScreen 
              key="profile-details"
              profile={profile}
              onBack={() => { playClick(); setScreen('main-menu'); }}
              playClick={playClick}
              savedBestPlays={savedBestPlays}
            />
          )}
          {screen === 'ranking' && (
            <RankingScreen 
              key="ranking" 
              onBack={() => { playClick(); setScreen('main-menu'); }} 
              savedBestPlays={savedBestPlays}
              playClick={playClick}
              settings={settings}
            />
          )}
          {screen === 'settings' && profile && (
            <SettingsScreen 
              key="settings" 
              profile={profile}
              updateProfile={updateProfile}
              settings={settings}
              onUpdateSettings={setSettings}
              onBack={() => { playClick(); setScreen('main-menu'); }} 
              onLogout={() => { playClick(); logout(); }} 
              playClick={playClick}
              onNavigate={setScreen}
            />
          )}
          {screen === 'friends' && profile && (
            <FriendsScreen 
              key="friends" 
              profile={profile}
              onNavigate={setScreen}
              onBack={() => { playClick(); setScreen('main-menu'); }} 
              onChallenge={async (target) => {
                if (!target?.uid) return;
                playClick();
                try {
                  const challengeId = `${profile.uid}_${target.uid}_${Date.now()}`;
                  await setDoc(doc(db, 'challenges', challengeId), {
                    challengerId: profile.uid,
                    challengerName: profile.displayName || 'Jogador',
                    targetId: target.uid,
                    status: 'pending',
                    timestamp: serverTimestamp()
                  });
                  toast.success(`Desafio enviado para ${target.name}!`);
                } catch (err) {
                  handleFirestoreError(err, OperationType.CREATE, 'challenges');
                }
              }}
              onWatch={async (gameId) => {
                playClick();
                try {
                  const gameDoc = await getDoc(doc(db, 'games', gameId));
                  if (gameDoc.exists()) {
                    const data = gameDoc.data();
                    setGameMode(data.mode || 'multiplayer');
                    setMultiplayerGameId(gameId);
                    if (data.visualSettings?.backgroundId) {
                      setSpectatorBackgroundId(data.visualSettings.backgroundId);
                    }
                    setScreen('game');
                  }
                } catch (err) {
                  console.error("Error fetching game for spectating:", err);
                }
              }}
              playClick={playClick}
            />
          )}
          {screen === 'lucky-box' && profile && (
            <LuckyBoxScreen 
              key="lucky-box" 
              profile={profile}
              updateProfile={updateProfile}
              settings={settings}
              onUpdateSettings={setSettings}
              onBack={() => { playClick(); setScreen('main-menu'); }} 
              highlightItemId={highlightItemId}
              onClearHighlight={() => setHighlightItemId(null)}
              onPreviewEmote={previewEmote}
              playClick={playClick}
            />
          )}
          {screen === 'clan' && profile && (
            <ClanScreen 
              key="clan" 
              profile={profile}
              updateProfile={updateProfile}
              soundEnabled={settings.soundEnabled}
              onBack={() => { playClick(); setScreen('settings'); }} 
              onChallenge={async (target) => {
                if (!target?.uid) return;
                playClick();
                try {
                  const challengeId = `${profile.uid}_${target.uid}_${Date.now()}`;
                  await setDoc(doc(db, 'challenges', challengeId), {
                    challengerId: profile.uid,
                    challengerName: profile.displayName || 'Jogador',
                    targetId: target.uid,
                    status: 'pending',
                    timestamp: serverTimestamp()
                  });
                  toast.success(`Desafio enviado para ${target.name}!`);
                } catch (err) {
                  handleFirestoreError(err, OperationType.CREATE, 'challenges');
                }
              }}
              onWatch={async (gameId) => {
                playClick();
                try {
                  const gameDoc = await getDoc(doc(db, 'games', gameId));
                  if (gameDoc.exists()) {
                    const data = gameDoc.data();
                    setGameMode(data.mode || 'multiplayer');
                    setMultiplayerGameId(gameId);
                    if (data.visualSettings?.backgroundId) {
                      setSpectatorBackgroundId(data.visualSettings.backgroundId);
                    }
                    setScreen('game');
                  }
                } catch (err) {
                  console.error("Error fetching game for spectating:", err);
                }
              }}
              allClans={allClans}
              playClick={playClick}
            />
          )}
          {screen === 'tournament' && profile && (
            <TournamentScreen 
              key="tournament" 
              profile={profile}
              onBack={() => { playClick(); setScreen('main-menu'); }} 
              onStartMatch={onStartMatch}
              onInviteMatch={(tId, m) => sendMatchInvitation(tId, m)}
              playClick={playClick}
              isInviting={isInviting}
            />
          )}
        </AnimatePresence>

        {/* Tournament Invite Modal */}
        {incomingTournamentInvite && (
          <TournamentInviteModal 
            invite={incomingTournamentInvite}
            onAccept={async () => {
              playClick();
              try {
                await updateDoc(doc(db, 'tournament_invites', incomingTournamentInvite.id), {
                  status: 'accepted'
                });
                setIncomingTournamentInvite(null);
                setScreen('tournament');
              } catch (err) {
                handleFirestoreError(err, OperationType.UPDATE, 'tournament_invites');
              }
            }}
            onDecline={async () => {
              playClick();
              try {
                await updateDoc(doc(db, 'tournament_invites', incomingTournamentInvite.id), {
                  status: 'declined'
                });
                setIncomingTournamentInvite(null);
              } catch (err) {
                handleFirestoreError(err, OperationType.UPDATE, 'tournament_invites');
              }
            }}
          />
        )}

        {/* Match Invitation Modal */}
        {incomingMatchInvitation && (
          <MatchInvitationModal 
            invitation={incomingMatchInvitation}
            onAccept={async () => {
              playClick();
              try {
                await updateDoc(doc(db, 'tournament_match_invitations', incomingMatchInvitation.id), {
                  status: 'accepted'
                });
                
                // Create the game document before navigating
                await createTournamentGame(incomingMatchInvitation.tournamentId, incomingMatchInvitation.matchId);

                setTournamentId(incomingMatchInvitation.tournamentId);
                setTournamentMatchId(incomingMatchInvitation.matchId);
                setGameMode('multiplayer');
                setMultiplayerGameId(incomingMatchInvitation.matchId);
                setScreen('game');
                setIncomingMatchInvitation(null);
              } catch (err) {
                handleFirestoreError(err, OperationType.UPDATE, 'tournament_match_invitations');
              }
            }}
            onDecline={async () => {
              playClick();
              try {
                await updateDoc(doc(db, 'tournament_match_invitations', incomingMatchInvitation.id), {
                  status: 'declined'
                });
                setIncomingMatchInvitation(null);
              } catch (err) {
                handleFirestoreError(err, OperationType.UPDATE, 'tournament_match_invitations');
              }
            }}
          />
        )}

        {/* Large Animated Emote Display (Global Previews) */}
        <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center">
          <AnimatePresence>
            {globalNotifications.filter(n => n.type === 'emote').map((notif) => (
              <motion.div
                key={`global_large_${notif.id}`}
                initial={{ opacity: 0, scale: 0, y: 50 }}
                animate={{ 
                  opacity: [0, 1, 1, 0], 
                  scale: [0.5, 1.2, 1, 0.8],
                  y: [50, 0, -20, -50]
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ duration: 3, times: [0, 0.1, 0.8, 1] }}
                className="flex flex-col items-center"
              >
                <div className="bg-black/40 backdrop-blur-xl p-6 rounded-full border-4 border-yellow-500/50 shadow-[0_0_50px_rgba(234,179,8,0.3)] mb-4">
                  {notif.isVideo ? (
                    <video 
                      src={notif.content} 
                      autoPlay 
                      loop 
                      muted 
                      playsInline 
                      className="w-32 h-32 object-contain" 
                    />
                  ) : notif.isImage ? (
                    <img 
                      src={notif.content} 
                      alt="emote" 
                      className="w-32 h-32 object-contain" 
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <span className="text-8xl animate-bounce">{notif.content}</span>
                  )}
                </div>
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-yellow-600 text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-xl border-b-2 border-yellow-800"
                >
                  {notif.senderName}
                </motion.span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Bottom Navigation (Only on main screens) */}
        {['main-menu', 'equipment', 'store', 'friends', 'lucky-box', 'tournament'].includes(screen) && (
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-[#2a1a10] border-t border-[#5d4037] flex items-center justify-around px-2 z-50">
            <NavButton icon={<Play size={24} />} label="Menu" active={screen === 'main-menu'} onClick={() => { playClick(); setScreen('main-menu'); }} />
            <NavButton icon={<Users size={24} />} label="Amigos" active={screen === 'friends'} onClick={() => { playClick(); setScreen('friends'); }} />
            <NavButton icon={<Trophy size={24} />} label="Eventos" active={screen === 'tournament'} onClick={() => { playClick(); setScreen('tournament'); }} />
            <NavButton icon={<ShoppingBag size={24} />} label="Loja" active={screen === 'store'} onClick={() => { playClick(); setScreen('store'); }} />
            <NavButton icon={<Settings size={24} />} label="Ajustes" active={screen === 'settings'} onClick={() => { playClick(); setScreen('settings'); }} />
          </div>
        )}

        {isSearchingMatch && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#2a1a10] border-2 border-yellow-500/50 p-8 rounded-2xl max-w-sm w-full shadow-2xl text-center relative overflow-hidden text-white"
            >
              {/* Brazil background design element */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#009b3a]/5 to-[#fedf00]/5 pointer-events-none" />

              <div className="relative z-10">
                <div className="w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6 relative animate-pulse">
                  <Zap size={48} className="text-yellow-400 animate-bounce" />
                  <div className="absolute inset-0 border-4 border-yellow-500/30 rounded-full animate-ping" />
                </div>

                <h3 className="text-2xl font-black uppercase italic text-yellow-400 mb-2 tracking-wide">
                  Procurando Adversário
                </h3>
                <p className="text-white/80 text-sm mb-2 font-medium">
                  Aguardando outro jogador entrar...
                </p>
                <div className="flex items-center justify-center gap-1.5 text-xs text-white/50 mb-6 bg-white/5 py-1.5 px-3 rounded-lg max-w-xs mx-auto">
                  <Coins size={14} className="text-yellow-500" />
                  <span>Aposta: 25 Moedas • Prêmio: 50 Moedas</span>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex justify-center items-center gap-2 text-yellow-400 text-xs font-bold bg-yellow-500/10 py-2.5 px-4 rounded-xl border border-yellow-500/20">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
                    <span>BUSCANDO CONEXÃO...</span>
                  </div>

                  <button 
                    onClick={cancelQuickMatchmaking}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 active:translate-y-0.5 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-red-600/20 border-b-4 border-red-800"
                  >
                    Cancelar & Reembolsar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

export const BACKGROUNDS = [
  { id: 'default', name: 'Padrão', color: 'bg-[#3d2b1f]', hex: '#3d2b1f', image: 'https://images.unsplash.com/photo-1593433551531-097c7ae5c0bc?auto=format&fit=crop&q=80&w=800' },
  { id: 'blue', name: 'Estampa Azul', color: 'bg-blue-900', hex: '#1e3a8a', image: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=800', price: 100 },
  { id: 'yellow', name: 'Estampa Amarela', color: 'bg-yellow-600', hex: '#ca8a04', image: 'https://images.unsplash.com/photo-1586772002130-b0f3daa6288b?auto=format&fit=crop&q=80&w=800', price: 100 },
  { id: 'green', name: 'Estampa Verde Clara', color: 'bg-green-500', hex: '#3d2b1f', image: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=800', price: 100 },
  { id: 'brazil-vibrant', name: 'Tigre', color: 'bg-green-600', hex: '#3d2b1f', image: 'https://images.unsplash.com/photo-1551972251-12070d63502a?auto=format&fit=crop&q=80&w=800', price: 100 },
  { id: 'copa-especial', name: 'Copa Especial', color: 'bg-green-600', hex: '#3d2b1f', image: 'https://copilot.microsoft.com/th/id/BCO.a2025efe-1f9b-432b-9d8c-4053daf9e4a9.png', price: 100, isPattern: true },
  { id: 'pink', name: 'Estampa Rosa', color: 'bg-pink-500', hex: '#ec4899', image: 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?auto=format&fit=crop&q=80&w=800', price: 100, isPattern: true },
];

interface EmoteItem {
  id: string;
  name: string;
  price: number;
  currency: 'coins' | 'gems';
  emoji?: string;
  image?: string;
  video?: string;
  sound?: string;
}

export const EMOTES: EmoteItem[] = [
  { id: 'emote_default', name: 'Padrão', emoji: '👋', price: 0, currency: 'coins' },
  { id: 'emote_smile', name: 'Sorriso', emoji: '😊', price: 100, currency: 'coins' },
  { id: 'emote_laugh', name: 'Risada', emoji: '😂', price: 100, currency: 'coins' },
  { id: 'emote_cool', name: 'Legal', emoji: '😎', price: 100, currency: 'coins' },
  { id: 'emote_angry', name: 'Bravo', emoji: '😠', price: 100, currency: 'coins' },
  { id: 'emote_surprised', name: 'Surpreso', emoji: '😲', price: 100, currency: 'coins' },
  { id: 'emote_thinking', name: 'Pensando', emoji: '🤔', price: 100, currency: 'coins' },
  { id: 'emote_clap', name: 'Aplauso', emoji: '👏', price: 100, currency: 'coins' },
  { id: 'emote_fire', name: 'Fogo', emoji: '🔥', price: 100, currency: 'coins' },
  { id: 'emote_skull', name: 'Caveira', emoji: '💀', price: 100, currency: 'coins' },
  { id: 'emote_vampire', name: 'Vampiro', emoji: '🧛', price: 100, currency: 'coins' },
  { id: 'emote_custom', name: 'Emoji Especial', image: 'https://lh3.googleusercontent.com/d/1FVQRRW7h3NBChGiwfnypWSJOAo_nI1BG', price: 100, currency: 'coins' },
];

export const ANIMATED_EMOTES: EmoteItem[] = [
  { 
    id: 'anim_special', 
    name: 'Emote Especial', 
    video: 'https://drive.google.com/uc?id=1yFVkeApaQW_2vAzfL4p0aRWEe3mhrC0K', 
    sound: 'https://drive.google.com/uc?id=1yFVkeApaQW_2vAzfL4p0aRWEe3mhrC0K', 
    price: 10, 
    currency: 'gems' 
  },
  { 
    id: 'anim_laugh', 
    name: 'Riso Animado', 
    video: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJueXp6bmZ6bmZ6bmZ6bmZ6bmZ6bmZ6bmZ6bmZ6bmZ6bmZ6bmZ6JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKVUn7iM8FMEU24/giphy.mp4', 
    sound: 'https://assets.mixkit.co/active_storage/sfx/2771/2771-preview.mp3',
    price: 10, 
    currency: 'gems' 
  },
];

export const QUEEN_STICKERS = [
  { id: 'default', name: 'Troféu Padrão', icon: Trophy },
  { id: 'crown', name: 'Coroa Real', icon: Crown },
  { id: 'star', name: 'Estrela Mestre', icon: Star },
  { id: 'heart', name: 'Coração Valente', icon: Heart },
  { id: 'bull', name: 'Boi com Chifre', icon: Ghost },
];

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

function TopBar({ profile, onSettings, onFriends, onProfile, playClick }: { profile: any, onSettings?: () => void, onFriends?: () => void, onProfile?: () => void, playClick: () => void }) {
  return (
    <div className="p-3 flex items-center justify-between bg-[#2a1a10]/50 backdrop-blur-sm z-50 gap-2">
      <div 
        className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:bg-white/5 p-1 rounded-xl transition-colors"
        onClick={() => { playClick(); onProfile?.(); }}
      >
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-full border-2 border-yellow-600 overflow-hidden bg-gray-800 shadow-lg">
            <img src={profile.photoURL || "https://picsum.photos/seed/user/100/100"} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-yellow-600 px-1.5 py-0.5 rounded-full border border-black/50 flex items-center justify-center min-w-[20px]">
            <span className="text-[10px] font-black text-black">{profile.level}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-black uppercase tracking-tight leading-none text-white truncate drop-shadow-md">
              {profile.displayName || 'Jogador'}
            </span>
            <span className="text-[10px] font-bold uppercase text-blue-400 leading-tight truncate">
              {profile.clanName || 'Sem Clã'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1.5 rounded-xl border border-white/10 shadow-inner shrink-0">
            <Crown size={16} className="text-yellow-500 fill-yellow-500/20" />
            <span className="text-sm font-black text-yellow-500 drop-shadow-sm">{profile.trophies || 0}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex gap-1">
          <div className="bg-black/40 px-2 py-1 rounded-full border border-white/10 flex items-center gap-1">
            <Gem size={12} className="text-blue-400" />
            <span className="text-[10px] font-bold">{profile.gems}</span>
          </div>
          <motion.div 
            id="topbar-coins-indicator"
            key={profile.coins}
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 0.3, ease: "easeOut", delay: 0.5 }}
            className="bg-black/40 px-2 py-1 rounded-full border border-white/10 flex items-center gap-1"
          >
            <Coins size={12} className="text-yellow-500" />
            <span className="text-[10px] font-bold">{profile.coins}</span>
          </motion.div>
        </div>


      </div>
    </div>
  );
}

function SplashScreen({ onLogin, playClick }: { onLogin: () => void, playClick: () => void, key?: string }) {
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
            onClick={() => { playClick(); onLogin(); }}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl font-bold text-lg shadow-2xl border-t border-white/20 border-b-[6px] border-blue-900 active:border-b-0 active:translate-y-1.5 transition-all flex items-center justify-center gap-3"
          >
            <Users size={24} />
            Faça login com o Facebook
          </button>
          
          <button 
            onClick={() => { playClick(); onLogin(); }}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl font-bold text-lg shadow-2xl border-t border-white/20 border-b-[6px] border-orange-800 active:border-b-0 active:translate-y-1.5 transition-all flex items-center justify-center gap-3"
          >
            <User size={24} />
            Jogue como Convidado
          </button>

          <button 
            onClick={() => { playClick(); onLogin(); }}
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

function MainMenu({ 
  profile, 
  updateProfile, 
  onNavigate, 
  onPlay, 
  playClick, 
  savedBestPlays,
  incomingChallenge,
  onAcceptChallenge,
  onStartQuickMatchmaking
}: { 
  profile: any, 
  updateProfile: (data: any) => Promise<void>, 
  onNavigate: (s: Screen) => void, 
  onPlay: (m: 'classic' | 'international' | 'ai' | 'ai_international' | 'local' | 'local_international', difficulty?: AIDifficulty) => void, 
  playClick: () => void, 
  savedBestPlays: BestPlay[],
  incomingChallenge?: any,
  onAcceptChallenge?: (challenge: any) => void,
  onStartQuickMatchmaking: (rules?: 'brazilian' | 'english') => void,
  key?: string 
}) {
  const [showAIDifficulty, setShowAIDifficulty] = useState(false);
  const [aiMode, setAiMode] = useState<'classic' | 'international'>('classic');
  const [showClassicOptions, setShowClassicOptions] = useState(false);
  const [showOfflineOptions, setShowOfflineOptions] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showCoinFeedback, setShowCoinFeedback] = useState(false);
  const [flyingCoins, setFlyingCoins] = useState<any[]>([]);

  const [showQuickMatchConfig, setShowQuickMatchConfig] = useState(false);
  const [rulesSelection, setRulesSelection] = useState<'brazilian' | 'english'>(() => {
    const saved = localStorage.getItem('checkers_rules_selection');
    return (saved === 'english' || saved === 'brazilian') ? saved : 'brazilian';
  });
  const [activeRulesModal, setActiveRulesModal] = useState(false);
  const [rulesView, setRulesView] = useState<'brazilian' | 'english'>('brazilian');

  const rulesData = {
    brazilian: {
      title: 'Damas Brasileiras',
      items: [
        { label: 'Tamanho do tabuleiro', value: '8x8' },
        { label: 'Captura obrigatória', value: 'Sim' },
        { label: 'Maior captura', value: 'Sim' },
        { label: 'Damas voadoras', value: 'Sim' },
        { label: 'As peças capturam para trás', value: 'Sim' }
      ]
    },
    english: {
      title: 'Damas Inglesas',
      items: [
        { label: 'Tamanho do tabuleiro', value: '8x8' },
        { label: 'Captura obrigatória', value: 'Sim' },
        { label: 'Maior captura', value: 'Não' },
        { label: 'Damas voadoras', value: 'Não' },
        { label: 'As peças capturam para trás', value: 'Não' }
      ]
    }
  };

  const canClaimDaily = () => {
    if (!profile.lastDailyClaim) return true;
    const now = Date.now();
    const lastClaim = profile.lastDailyClaim;
    const oneDay = 24 * 60 * 60 * 1000;
    return now - lastClaim >= oneDay;
  };

  const handleDailyClaim = (e: React.MouseEvent) => {
    if (!canClaimDaily()) return;
    
    playClick();
    updateProfile({ 
      coins: (profile.coins || 0) + 5,
      lastDailyClaim: Date.now()
    });
    
    setShowCoinFeedback(true);
    setTimeout(() => setShowCoinFeedback(false), 1500);

    // Trigger flying coins
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const startX = rect.left + rect.width / 2 - 10;
    const startY = rect.top + rect.height / 2 - 10;
    
    const targetEl = document.getElementById('topbar-coins-indicator');
    let targetX = window.innerWidth - 60;
    let targetY = 24;
    if (targetEl) {
      const targetRect = targetEl.getBoundingClientRect();
      targetX = targetRect.left + targetRect.width / 2 - 10;
      targetY = targetRect.top + targetRect.height / 2 - 10;
    }

    const count = 12;
    const newCoins = Array.from({ length: count }).map((_, i) => {
      // Create random dispersion arcs before zooming to the target
      const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.4 - 0.2);
      const distance = 30 + Math.random() * 40;
      const arcX = Math.cos(angle) * distance;
      const arcY = Math.sin(angle) * distance - 30; // pull upwards slightly
      
      return {
        id: Date.now() + i + Math.random(),
        startX,
        startY,
        midX: startX + arcX,
        midY: startY + arcY,
        targetX,
        targetY,
        delay: i * 0.05,
        duration: 0.6 + Math.random() * 0.3
      };
    });
    
    setFlyingCoins(prev => [...prev, ...newCoins]);
    setTimeout(() => {
      setFlyingCoins(prev => prev.filter(c => !newCoins.find(nc => nc.id === c.id)));
    }, 2000);
  };

  return (
    <motion.div 
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      className="flex flex-col h-full relative z-10"
    >
      <TopBar 
        profile={profile} 
        onSettings={() => onNavigate('settings')} 
        onFriends={() => onNavigate('friends')}
        onProfile={() => onNavigate('profile-details')}
        playClick={playClick} 
      />
      
      {/* Flying Coins Layer */}
      <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
        <AnimatePresence>
          {flyingCoins.map((coin) => (
            <motion.div
              key={coin.id}
              initial={{ 
                x: coin.startX, 
                y: coin.startY, 
                opacity: 0, 
                scale: 0.5,
                rotate: 0 
              }}
              animate={{ 
                x: [coin.startX, coin.midX, coin.targetX],
                y: [coin.startY, coin.midY, coin.targetY],
                opacity: [1, 1, 0.9, 0],
                scale: [0.6, 1.2, 1, 0.4],
                rotate: [0, 180, 360, 720]
              }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: coin.duration, 
                ease: "easeInOut",
                delay: coin.delay
              }}
              className="absolute text-yellow-500"
            >
              <Coins size={22} className="drop-shadow-[0_2px_8px_rgba(234,179,8,0.8)] fill-yellow-400" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto pb-24">
        <ShareModal 
          isOpen={isShareModalOpen} 
          onClose={() => setIsShareModalOpen(false)} 
          playClick={playClick} 
        />
        <div className="grid grid-cols-3 gap-4">
          <div className="relative">
            <MenuSmallButton 
              playClick={playClick} 
              onClick={handleDailyClaim}
              icon={
                <div className={cn("relative", !canClaimDaily() && "opacity-50 grayscale")}>
                  <Archive className="text-yellow-500" />
                  {!canClaimDaily() && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-0.5 bg-red-500 rotate-45" />
                    </div>
                  )}
                </div>
              } 
              label={canClaimDaily() ? "Ofertas Diárias" : "Coletado"} 
            />
            <AnimatePresence>
              {showCoinFeedback && (
                <motion.div
                  initial={{ y: 0, opacity: 0, scale: 0.5 }}
                  animate={{ y: -40, opacity: 1, scale: 1.2 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none z-50 flex items-center gap-1 bg-yellow-500 text-black px-2 py-0.5 rounded-full font-black text-xs shadow-lg"
                >
                  <Coins size={10} /> +5
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <MenuSmallButton 
            playClick={playClick} 
            onClick={() => onNavigate('lucky-box')}
            icon={<Gift className="text-green-500" />} 
            label="Caixa da Sorte" 
            badge={profile.hasNewLuckyBoxItems ? "!" : undefined} 
          />
          <MenuSmallButton 
            playClick={playClick}
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
          <div 
            onClick={() => incomingChallenge && onAcceptChallenge?.(incomingChallenge)}
            className={cn(
              "bg-gradient-to-b from-[#009b3a] to-[#fedf00] px-6 py-2 rounded-xl border-2 border-[#002776] shadow-xl relative cursor-pointer active:scale-95 transition-all",
              incomingChallenge && "animate-bounce ring-4 ring-yellow-400 ring-offset-2 ring-offset-[#2a1a10]"
            )}
          >
            <h2 className="text-xl font-black italic text-white text-center leading-tight">DAMAS<br/>MESTRE BRASIL</h2>
            {incomingChallenge && (
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-3 py-1 rounded-full text-[10px] font-black whitespace-nowrap shadow-lg border border-black/20">
                DESAFIO DE: {incomingChallenge.challengerName.toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <AnimatePresence mode="wait">
              {!showClassicOptions ? (
                <motion.div
                  key="classic-btn"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <BigButton 
                    playClick={playClick}
                    onClick={() => setShowClassicOptions(true)}
                    className="bg-gradient-to-r from-green-700 to-green-600 border-b-4 border-green-900 active:border-b-0 active:translate-y-1 transition-all"
                    label="JOGAR ONLINE"
                    icon={<Globe size={32} className="text-white/80" />}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="classic-options"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="bg-[#2a1a10] rounded-2xl border-2 border-green-600 p-3 flex flex-col gap-2 shadow-2xl"
                >
                  <button 
                    onClick={() => {
                      playClick();
                      setIsShareModalOpen(true);
                    }} 
                    className="w-full py-4 bg-gradient-to-r from-blue-700 to-blue-600 rounded-xl font-black uppercase italic shadow-lg flex flex-col items-center justify-center gap-1 border-t border-white/10 border-b-4 border-blue-900 active:border-b-0 active:translate-y-1 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Share2 size={24} /> Convidar Amigos
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse shadow-[0_0_5px_rgba(96,165,250,0.5)]" />
                      <span className="text-[10px] font-bold text-white/70 normal-case tracking-wide">Compartilhar link</span>
                    </div>
                  </button>
                  <button 
                    onClick={() => {
                      playClick();
                      setShowQuickMatchConfig(true);
                      setRulesView(rulesSelection);
                    }} 
                    className="w-full py-4 bg-gradient-to-r from-yellow-600 to-amber-500 rounded-xl font-black uppercase italic shadow-lg flex flex-col items-center justify-center gap-1 border-t border-white/10 border-b-4 border-yellow-800 active:border-b-0 active:translate-y-1 transition-all"
                  >
                    <div className="flex items-center gap-3 text-yellow-950">
                      <Zap size={24} className="text-yellow-900 animate-pulse" /> Partida Rápida (Aposta 25 🪙)
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-yellow-900 rounded-full animate-pulse" />
                      <span className="text-[10px] font-black text-yellow-950/80 normal-case tracking-wide">Busca online • Custo: 25 Moedas • Vencedor ganha 50</span>
                    </div>
                  </button>
                  <button 
                    onClick={() => {
                      playClick();
                      setShowClassicOptions(false);
                    }} 
                    className="w-full py-2 text-xs font-bold text-white/40 uppercase mt-1 hover:text-white transition-colors"
                  >
                    Voltar
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <AnimatePresence mode="wait">
              {!showAIDifficulty ? (
                <motion.div
                  key="ai-btn"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <BigButton 
                    playClick={playClick}
                    onClick={() => setShowAIDifficulty(true)}
                    className="bg-gradient-to-r from-red-700 to-red-600 border-b-4 border-red-900 active:border-b-0 active:translate-y-1 transition-all"
                    label="TREINAR CPU"
                    icon={<Cpu size={32} className="text-white/80" />}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="ai-options"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="bg-[#2a1a10] rounded-2xl border-2 border-red-600 p-3 flex flex-col gap-2 shadow-2xl"
                >
                  <motion.button 
                    whileTap={{ scale: 0.98, filter: "brightness(1.5)", boxShadow: "0 0 20px rgba(255,255,255,0.5)" }}
                    onClick={() => { playClick(); onPlay(aiMode === 'international' ? 'ai_international' : 'ai', 'beginner'); }} 
                    className="w-full py-3 bg-green-700 rounded-xl text-xs font-black uppercase italic shadow-lg border-b-4 border-green-900 active:border-b-0 active:translate-y-1 transition-all"
                  >
                    Iniciante
                  </motion.button>
                  <motion.button 
                    whileTap={{ scale: 0.98, filter: "brightness(1.5)", boxShadow: "0 0 20px rgba(255,255,255,0.5)" }}
                    onClick={() => { playClick(); onPlay(aiMode === 'international' ? 'ai_international' : 'ai', 'medium'); }} 
                    className="w-full py-3 bg-yellow-700 rounded-xl text-xs font-black uppercase italic shadow-lg border-b-4 border-yellow-900 active:border-b-0 active:translate-y-1 transition-all"
                  >
                    Médio
                  </motion.button>
                  <motion.button 
                    whileTap={{ scale: 0.98, filter: "brightness(1.5)", boxShadow: "0 0 20px rgba(255,255,255,0.5)" }}
                    onClick={() => { playClick(); onPlay(aiMode === 'international' ? 'ai_international' : 'ai', 'advanced'); }} 
                    className="w-full py-3 bg-red-700 rounded-xl text-xs font-black uppercase italic shadow-lg border-b-4 border-red-900 active:border-b-0 active:translate-y-1 transition-all"
                  >
                    Avançado
                  </motion.button>
                  <motion.button 
                    whileTap={{ scale: 0.95, filter: "brightness(1.5)", boxShadow: "0 0 20px rgba(255,255,255,0.5)" }}
                    onClick={() => { playClick(); setShowAIDifficulty(false); }} 
                    className="w-full py-2 text-xs font-bold text-white/40 uppercase mt-1 hover:text-white transition-colors"
                  >
                    Voltar
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <AnimatePresence mode="wait">
              {!showOfflineOptions ? (
                <motion.div
                  key="offline-btn"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <BigButton 
                    playClick={playClick}
                    onClick={() => setShowOfflineOptions(true)}
                    className="bg-gradient-to-r from-blue-800 to-blue-700 border-b-4 border-blue-950 active:border-b-0 active:translate-y-1 transition-all"
                    label="MODO OFFLINE"
                    icon={<MonitorOff size={32} className="text-white/80" />}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="offline-options"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="bg-[#2a1a10] rounded-2xl border-2 border-blue-600 p-3 flex flex-col gap-2 shadow-2xl"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-white/40 uppercase italic ml-1">Clássico (8x8)</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => {
                            playClick();
                            setAiMode('classic');
                            setShowAIDifficulty(true);
                            setShowOfflineOptions(false);
                          }} 
                          className="py-3 bg-gradient-to-r from-red-700 to-red-600 rounded-xl font-black uppercase italic shadow-lg flex flex-col items-center justify-center gap-1 border-t border-white/10 border-b-4 border-red-900 active:border-b-0 active:translate-y-1 transition-all"
                        >
                          <Cpu size={20} /> Contra CPU
                        </button>
                        <button 
                          onClick={() => {
                            playClick();
                            onPlay('local');
                            setShowOfflineOptions(false);
                          }} 
                          className="py-3 bg-gradient-to-r from-green-700 to-green-600 rounded-xl font-black uppercase italic shadow-lg flex flex-col items-center justify-center gap-1 border-t border-white/10 border-b-4 border-green-900 active:border-b-0 active:translate-y-1 transition-all"
                        >
                          <Users size={20} /> 2 Jogadores
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-white/40 uppercase italic ml-1 text-yellow-500/60">Internacional (10x10)</span>
                      <button 
                        onClick={() => {
                          playClick();
                          onPlay('local_international');
                          setShowOfflineOptions(false);
                        }} 
                        className="w-full py-4 bg-gradient-to-r from-yellow-700 to-yellow-600 rounded-xl font-black uppercase italic shadow-lg flex flex-col items-center justify-center gap-1 border-t border-white/10 border-b-4 border-yellow-900 active:border-b-0 active:translate-y-1 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <Users size={24} /> 2 Jogadores
                        </div>
                      </button>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      playClick();
                      setShowOfflineOptions(false);
                    }} 
                    className="w-full py-2 text-xs font-bold text-white/40 uppercase mt-1 hover:text-white transition-colors"
                  >
                    Voltar
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <ChestSlot playClick={playClick} label="Toque para desbloquear" time="10s" />
          <ChestSlot playClick={playClick} label="Toque para desbloquear" time="30s" />
          <ChestSlot playClick={playClick} label="Espaço para baú" />
          <ChestSlot playClick={playClick} label="Espaço para baú" />
        </div>

        <div className="bg-[#2a1a10] rounded-2xl p-4 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black italic uppercase text-yellow-500 flex items-center gap-2">
              <Zap size={14} /> Melhores Jogadas
            </h3>
            <button onClick={() => onNavigate('ranking')} className="text-[10px] font-bold text-white/40 uppercase">Ver Tudo</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {savedBestPlays.length === 0 ? (
              <div className="w-full py-4 text-center text-[10px] font-bold text-white/20 uppercase tracking-widest">
                Nenhuma jogada épica ainda
              </div>
            ) : (
              savedBestPlays.slice(0, 5).map(play => (
                <div 
                  key={play.id} 
                  onClick={() => onNavigate('ranking')}
                  className="flex-shrink-0 w-32 bg-black/20 p-2 rounded-xl border border-white/5 flex flex-col items-center gap-1 cursor-pointer active:scale-95 transition-transform"
                >
                  <div className="w-10 h-10 rounded-full border border-yellow-500/50 overflow-hidden">
                    <img src={play.avatar} alt="Player" />
                  </div>
                  <span className="text-[9px] font-bold truncate w-full text-center">{play.playerName}</span>
                  <span className="text-[10px] font-black italic text-yellow-500">COMBO X{play.count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Partida Rápida Config Modal */}
        {showQuickMatchConfig && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-[#3d2b1f] border-4 border-[#5c3e2b] rounded-2xl p-5 shadow-2xl relative flex flex-col gap-4 text-white"
            >
              {/* Close Button */}
              <button 
                onClick={() => {
                  playClick();
                  setShowQuickMatchConfig(false);
                }}
                className="absolute -top-3 -right-3 w-8 h-8 bg-red-600 border-2 border-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-500 transition-colors z-10 cursor-pointer"
              >
                <X size={18} className="text-white font-bold" />
              </button>

              <h3 className="text-xl font-black text-center text-yellow-400 uppercase italic tracking-wide">
                Partida Rápida
              </h3>

              <div className="bg-[#2a1a10] border border-[#5c3e2b] p-4 rounded-xl flex flex-col gap-2 shadow-inner">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60 font-medium">Custo da Busca:</span>
                  <span className="text-yellow-400 font-bold flex items-center gap-1">25 <Coins size={14} className="inline fill-yellow-500 text-yellow-500" /></span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60 font-medium">Recompensa Vitória:</span>
                  <span className="text-yellow-400 font-bold flex items-center gap-1">50 <Coins size={14} className="inline fill-yellow-500 text-yellow-500" /></span>
                </div>
                <div className="h-px bg-[#5c3e2b]/50 my-1" />
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-white/50 font-bold uppercase tracking-wider">Regra Atual:</span>
                  <div className="flex items-center justify-between bg-[#1f130b] border border-[#5c3e2b]/30 rounded-lg p-2.5">
                    <span className="text-sm font-black text-yellow-100">
                      {rulesSelection === 'brazilian' ? 'Damas Brasileiras' : 'Damas Inglesas'}
                    </span>
                    <span className="text-[10px] bg-yellow-500/10 text-yellow-400 font-bold px-2 py-0.5 rounded border border-yellow-500/20 uppercase">
                      {rulesSelection === 'brazilian' ? 'Padrão' : 'Inglesa'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <button 
                  onClick={() => {
                    playClick();
                    setActiveRulesModal(true);
                    setRulesView(rulesSelection);
                  }}
                  className="w-full py-3 bg-gradient-to-r from-blue-700 to-blue-600 rounded-xl font-bold text-sm shadow-md border-t border-white/10 border-b-4 border-blue-900 active:border-b-0 active:translate-y-0.5 hover:brightness-110 transition-all flex items-center justify-center gap-2 uppercase tracking-wide cursor-pointer"
                >
                  <Settings size={18} /> Alterar Regras
                </button>

                <button 
                  onClick={() => {
                    playClick();
                    setShowQuickMatchConfig(false);
                    onStartQuickMatchmaking(rulesSelection);
                  }}
                  className="w-full py-3.5 bg-gradient-to-r from-green-600 to-emerald-500 rounded-xl font-black italic shadow-md border-t border-white/10 border-b-4 border-green-800 active:border-b-0 active:translate-y-0.5 hover:brightness-110 transition-all flex items-center justify-center gap-2 text-white uppercase text-base cursor-pointer"
                >
                  <Zap size={20} className="text-yellow-300 animate-pulse" /> Iniciar Jogo
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Change Rules Slider Modal (Visual matching user requested image) */}
        {activeRulesModal && (
          <div className="absolute inset-0 bg-black/75 flex items-center justify-center p-4 z-[60]">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-[330px] bg-gradient-to-b from-[#2563eb] to-[#172554] border-[6px] border-[#0f172a] rounded-[24px] p-5 shadow-2xl relative flex flex-col gap-4 text-white select-none"
            >
              {/* Close Button */}
              <button 
                onClick={() => {
                  playClick();
                  setActiveRulesModal(false);
                }}
                className="absolute -top-3 -right-3 w-8 h-8 bg-red-600 border-2 border-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-500 transition-colors z-30 cursor-pointer"
              >
                <X size={18} className="text-white font-bold" />
              </button>

              {/* Left Arrow */}
              <button 
                onClick={() => {
                  playClick();
                  setRulesView(prev => prev === 'brazilian' ? 'english' : 'brazilian');
                }}
                className="absolute -left-4 top-[48%] -translate-y-[50%] w-9 h-9 bg-gradient-to-b from-yellow-300 to-amber-500 hover:from-yellow-200 hover:to-amber-400 text-yellow-950 rounded-full flex items-center justify-center shadow-lg border border-amber-600 border-b-2 active:border-b-0 transition-all z-20 cursor-pointer"
              >
                <ChevronLeft size={20} className="font-bold stroke-[3]" />
              </button>

              {/* Right Arrow */}
              <button 
                onClick={() => {
                  playClick();
                  setRulesView(prev => prev === 'brazilian' ? 'english' : 'brazilian');
                }}
                className="absolute -right-4 top-[48%] -translate-y-[50%] w-9 h-9 bg-gradient-to-b from-yellow-300 to-amber-500 hover:from-yellow-200 hover:to-amber-400 text-yellow-950 rounded-full flex items-center justify-center shadow-lg border border-amber-600 border-b-2 active:border-b-0 transition-all z-20 cursor-pointer"
              >
                <ChevronRight size={20} className="font-bold stroke-[3]" />
              </button>

              {/* Header Title */}
              <h3 className="text-xl font-bold text-center text-[#ffdf80] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] tracking-wide font-sans mt-1">
                {rulesView === 'brazilian' ? 'Damas Brasileiras' : 'Damas Inglesas'}
              </h3>

              {/* Inner Rules Panel */}
              <div className="bg-[#0f172a]/70 border border-[#1e3a8a]/40 rounded-[16px] p-4 flex flex-col gap-3.5 shadow-inner">
                {rulesData[rulesView].items.map((item, index) => (
                  <div 
                    key={index} 
                    className={cn(
                      "flex justify-between items-center pb-2.5",
                      index !== rulesData[rulesView].items.length - 1 && "border-b border-[#1e3a8a]/30"
                    )}
                  >
                    <span className="text-white font-black text-[13px] tracking-wide pr-2">
                      {item.label}
                    </span>
                    <span className="text-white font-black text-[13px] text-right shrink-0">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Select button */}
              <div className="flex justify-center mt-1">
                {rulesSelection === rulesView ? (
                  <div className="bg-[#0f172a]/50 border border-[#ffffff10] rounded-xl py-2.5 px-6 flex items-center gap-1.5 justify-center shadow-inner min-w-[140px]">
                    <Check size={18} className="text-green-500 stroke-[3]" />
                    <span className="text-white font-bold text-sm tracking-wide">Selecionado</span>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      playClick();
                      setRulesSelection(rulesView);
                      localStorage.setItem('checkers_rules_selection', rulesView);
                      toast.success(`Regras alteradas para: ${rulesView === 'brazilian' ? 'Damas Brasileiras' : 'Damas Inglesas'}`);
                    }}
                    className="bg-gradient-to-b from-[#76e100] to-[#519d00] text-white font-black tracking-wide py-2.5 px-8 rounded-xl shadow-[0_3px_0_#336400] border-t border-white/20 active:translate-y-0.5 active:shadow-none transition-all text-center text-sm min-w-[140px] uppercase cursor-pointer"
                  >
                    Selecionar
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MenuSmallButton({ icon, label, badge, onClick, playClick }: { icon: any, label: string, badge?: string, onClick?: (e: React.MouseEvent) => void, playClick?: () => void }) {
  return (
    <button 
      onClick={(e) => { playClick?.(); onClick?.(e); }}
      className="relative flex flex-col items-center gap-1 bg-[#4e342e] p-3 rounded-xl border-t border-white/10 border-b-4 border-black/40 shadow-xl active:border-b-0 active:translate-y-1 transition-all"
    >
      {badge && (
        <motion.span 
          initial={{ scale: 0 }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full text-[10px] flex items-center justify-center font-bold border-2 border-[#4e342e]"
        >
          {badge}
        </motion.span>
      )}
      {icon}
      <span className="text-[10px] font-bold text-center leading-tight">{label}</span>
    </button>
  );
}

function BigButton({ label, icon, className, labelClassName, onClick, playClick }: { label: string, icon: any, className?: string, labelClassName?: string, onClick?: () => void, playClick?: () => void }) {
  return (
    <button 
      onClick={() => { playClick?.(); onClick?.(); }}
      className={cn(
        "w-full p-4 rounded-2xl flex items-center justify-between shadow-2xl border-t border-white/10 border-b-[6px] border-black/40 active:border-b-0 active:translate-y-1.5 transition-all",
        className
      )}
    >
      <span className={cn("text-xl font-black italic uppercase tracking-tight", labelClassName)}>{label}</span>
      {icon}
    </button>
  );
}

function ChestSlot({ label, time, playClick }: { label: string, time?: string, playClick?: () => void }) {
  return (
    <div 
      onClick={playClick}
      className="bg-[#2a1a10] rounded-xl p-3 border border-white/5 flex flex-col items-center gap-2 opacity-80 cursor-pointer active:scale-95 transition-transform"
    >
      <div className="w-12 h-12 bg-[#4e342e] rounded-lg flex items-center justify-center">
        <ShoppingBag size={24} className="text-yellow-600/50" />
      </div>
      <span className="text-[10px] text-center font-bold text-white/60">{label}</span>
      {time && <span className="text-xs font-black text-yellow-500">{time}</span>}
    </div>
  );
}

function CoinFlying({ count, onComplete }: { count: number, onComplete: () => void }) {
  const [coins, setCoins] = useState<{ id: number, x: number, y: number }[]>([]);
  
  useEffect(() => {
    if (count <= 0) {
      onComplete();
      return;
    }

    const newCoins = Array.from({ length: Math.min(count, 20) }).map((_, i) => ({
      id: i,
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 100,
      y: window.innerHeight / 2 + (Math.random() - 0.5) * 100,
    }));
    setCoins(newCoins);

    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [count, onComplete]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      <AnimatePresence>
        {coins.map((coin) => (
          <motion.div
            key={coin.id}
            initial={{ x: coin.x, y: coin.y, scale: 0, opacity: 0 }}
            animate={{ 
              x: window.innerWidth * 0.75, 
              y: 30, 
              scale: [0, 1.5, 1], 
              opacity: [0, 1, 1, 0] 
            }}
            transition={{ 
              duration: 1.5, 
              delay: coin.id * 0.05,
              ease: "backOut"
            }}
            className="absolute"
          >
            <div className="w-6 h-6 bg-yellow-500 rounded-full border-2 border-yellow-600 flex items-center justify-center shadow-lg">
              <Coins size={14} className="text-yellow-900" />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function VersusIntro({ player1: rawPlayer1, player2: rawPlayer2, onComplete, soundEnabled }: { player1: any, player2: any, onComplete: () => void, soundEnabled: boolean }) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (soundEnabled) {
      const audio = new Audio('https://cdn.jsdelivr.net/gh/lichess-org/lila@master/public/sound/standard/GenericNotify.mp3');
      audio.volume = 0.6;
      audio.play().catch(err => console.log('Error playing intro sound:', err));
    }
    const timer = setTimeout(() => {
      onCompleteRef.current();
    }, 5000);
    return () => clearTimeout(timer);
  }, [soundEnabled]);

  const player1 = rawPlayer1 || { name: 'Jogador 1', photo: '', wins: 0, losses: 0, draws: 0, forfeits: 0, trophies: 0, level: 1 };
  const player2 = rawPlayer2 || { name: 'Jogador 2', photo: '', wins: 0, losses: 0, draws: 0, forfeits: 0, trophies: 0, level: 1 };

  const getWinrate = (p: any) => {
    if (!p) return 0;
    const total = (p.wins || 0) + (p.losses || 0) + (p.draws || 0) + (p.forfeits || 0);
    if (total === 0) return 0;
    return Math.round(((p.wins || 0) / total) * 100);
  };

  const p1Winrate = getWinrate(player1);
  const p2Winrate = getWinrate(player2);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Background: Wooden Checkers Board with Light Effect */}
      <div 
        className="absolute inset-0 bg-cover bg-center scale-110 opacity-70"
        style={{ 
          backgroundImage: "url('https://images.unsplash.com/photo-1586165368502-1bad197a6461?q=80&w=2000&auto=format&fit=crop')",
          filter: 'brightness(0.3) contrast(1.3)'
        }}
      />
      
      {/* Checkers Overlay Pattern - More visible for "Dama" feel */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ 
             backgroundImage: `linear-gradient(45deg, rgba(0,0,0,0.4) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.4) 75%, rgba(0,0,0,0.4)), 
                               linear-gradient(45deg, rgba(0,0,0,0.4) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.4) 75%, rgba(0,0,0,0.4))`,
             backgroundSize: '120px 120px',
             backgroundPosition: '0 0, 60px 60px'
           }} 
      />

      {/* Light Effect / Spotlight */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_20%,_rgba(0,0,0,0.9)_90%)]" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-500/5 blur-[150px] rounded-full" />
      
      {/* Animated Particles/Lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: -100, y: Math.random() * 100 + '%', opacity: 0 }}
            animate={{ 
              x: '120%', 
              opacity: [0, 0.2, 0],
            }}
            transition={{ 
              duration: Math.random() * 4 + 3, 
              repeat: Infinity, 
              delay: Math.random() * 2,
              ease: "linear"
            }}
            className="absolute h-[1px] w-64 bg-gradient-to-r from-transparent via-blue-400/10 to-transparent"
          />
        ))}
      </div>

      <div className="relative w-full max-w-5xl px-2 md:px-4 flex flex-col items-center gap-4 md:gap-10">
        
        {/* DESKTOP Matchup Layout (shown on md and up) */}
        <div className="hidden md:flex flex-row items-center justify-between w-full relative z-10 gap-4">
          
          {/* Player 1 (Desafiante) */}
          <motion.div
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center gap-4 w-[32%]"
          >
            {/* Tag */}
            <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-full">
              Desafiante
            </span>

            {/* Glowing Smaller Avatar with Level Badge */}
            <div className="relative">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full blur opacity-75 animate-pulse"></div>
              <div className="relative w-24 h-24 rounded-full border-4 border-blue-400 bg-gray-900 overflow-hidden shadow-2xl flex items-center justify-center">
                {player1.photo ? (
                  <img src={player1.photo} alt={player1.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User size={40} className="text-blue-400/40" />
                )}
              </div>
              
              {/* Level Badge */}
              <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-blue-600 to-cyan-600 border-2 border-white text-white text-[11px] font-black w-7 h-7 rounded-full flex items-center justify-center shadow-lg">
                {player1.level || 1}
              </div>
            </div>

            {/* Name */}
            <h3 className="text-white text-xl font-black italic uppercase truncate leading-tight text-center max-w-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {player1.name}
            </h3>

            {/* Epic Trophies Display */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="w-full max-w-[220px] bg-gradient-to-b from-yellow-500/20 via-yellow-600/5 to-transparent border border-yellow-500/30 rounded-2xl p-3 flex flex-col items-center gap-1 shadow-[0_0_20px_rgba(234,179,8,0.1)]"
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-yellow-500/20 rounded-xl border border-yellow-500/30">
                  <Trophy size={20} className="text-yellow-400 animate-bounce" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[9px] font-bold text-yellow-500/80 uppercase tracking-widest leading-none">Coroas</span>
                  <span className="text-xl font-black text-white leading-none drop-shadow-sm">
                    {player1.trophies || 0}
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Stats Center & VS */}
          <div className="flex flex-col items-center gap-4 w-[36%] z-20">
            
            {/* Animated VS Emblem */}
            <motion.div
              initial={{ scale: 3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, type: "spring", damping: 10 }}
              className="relative w-24 h-24 flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full animate-ping" />
              <div className="absolute inset-2 bg-gradient-to-r from-blue-600 to-red-600 opacity-20 blur-md rounded-full" />
              <span className="text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-white to-red-400 drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]">VS</span>
            </motion.div>

            {/* Battle Report Panel */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="w-full bg-black/85 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col gap-3"
            >
              <div className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.25em] pb-2 border-b border-white/10 w-full text-center flex items-center justify-center gap-1.5">
                <Sword size={12} className="text-yellow-500" /> Relatório de Batalha
              </div>

              {/* Compare Winrate */}
              <div className="flex flex-col gap-1 w-full px-1">
                <div className="flex justify-between text-[10px] font-black uppercase text-white/50">
                  <span>Vitórias %</span>
                  <span>Vitórias %</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-blue-400 w-8 text-left">{p1Winrate}%</span>
                  <div className="flex-1 h-3.5 bg-white/5 rounded-full overflow-hidden border border-white/10 flex">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-400 h-full" style={{ width: `${p1Winrate || 50}%` }} />
                    <div className="bg-gradient-to-l from-red-600 to-red-400 h-full ml-auto" style={{ width: `${p2Winrate || 50}%` }} />
                  </div>
                  <span className="text-xs font-black text-red-400 w-8 text-right">{p2Winrate}%</span>
                </div>
              </div>

              {/* Battle Stats List */}
              <div className="flex flex-col gap-2 w-full mt-1">
                {[
                  { label: 'Vitórias', p1: player1.wins || 0, p2: player2.wins || 0, color: 'text-green-400', bg: 'bg-green-500/10' },
                  { label: 'Derrotas', p1: player1.losses || 0, p2: player2.losses || 0, color: 'text-red-400', bg: 'bg-red-500/10' },
                  { label: 'Empates', p1: player1.draws || 0, p2: player2.draws || 0, color: 'text-gray-400', bg: 'bg-gray-500/10' },
                  { label: 'Desistência', p1: player1.forfeits || 0, p2: player2.forfeits || 0, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                ].map((stat, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl border border-white/5 p-2 h-9">
                    {/* Player 1 Stat */}
                    <div className="w-12 text-center font-black text-xs text-blue-400">{stat.p1}</div>
                    
                    {/* Metric Label */}
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest text-center">{stat.label}</span>
                    
                    {/* Player 2 Stat */}
                    <div className="w-12 text-center font-black text-xs text-red-400">{stat.p2}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Player 2 (Oponente) */}
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center gap-4 w-[32%]"
          >
            {/* Tag */}
            <span className="px-3 py-1 bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-full">
              Defensor
            </span>

            {/* Glowing Smaller Avatar with Level Badge */}
            <div className="relative">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-red-500 to-orange-500 rounded-full blur opacity-75 animate-pulse"></div>
              <div className="relative w-24 h-24 rounded-full border-4 border-red-400 bg-gray-900 overflow-hidden shadow-2xl flex items-center justify-center">
                {player2.photo ? (
                  <img src={player2.photo} alt={player2.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User size={40} className="text-red-400/40" />
                )}
              </div>
              
              {/* Level Badge */}
              <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-red-600 to-orange-600 border-2 border-white text-white text-[11px] font-black w-7 h-7 rounded-full flex items-center justify-center shadow-lg">
                {player2.level || 1}
              </div>
            </div>

            {/* Name */}
            <h3 className="text-white text-xl font-black italic uppercase truncate leading-tight text-center max-w-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {player2.name}
            </h3>

            {/* Epic Trophies Display */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="w-full max-w-[220px] bg-gradient-to-b from-yellow-500/20 via-yellow-600/5 to-transparent border border-yellow-500/30 rounded-2xl p-3 flex flex-col items-center gap-1 shadow-[0_0_20px_rgba(234,179,8,0.1)]"
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-yellow-500/20 rounded-xl border border-yellow-500/30">
                  <Trophy size={20} className="text-yellow-400 animate-bounce" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[9px] font-bold text-yellow-500/80 uppercase tracking-widest leading-none">Coroas</span>
                  <span className="text-xl font-black text-white leading-none drop-shadow-sm">
                    {player2.trophies || 0}
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>

        </div>

        {/* MOBILE Matchup Layout (shown only on mobile) */}
        <div className="flex md:hidden flex-col items-center w-full relative z-10 gap-3 px-1">
          
          {/* Players Side by Side Row */}
          <div className="flex items-center justify-between w-full gap-2 relative">
            
            {/* Player 1 Left */}
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex-1 flex flex-col items-center text-center gap-1 min-w-0"
            >
              <span className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[8px] font-black uppercase tracking-wider rounded-full">
                Desafiante
              </span>

              {/* Glowing Avatar */}
              <div className="relative my-1">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full blur-sm opacity-75"></div>
                <div className="relative w-16 h-16 rounded-full border-2 border-blue-400 bg-gray-900 overflow-hidden shadow-lg flex items-center justify-center">
                  {player1.photo ? (
                    <img src={player1.photo} alt={player1.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User size={28} className="text-blue-400/40" />
                  )}
                </div>
                {/* Level Badge */}
                <div className="absolute -bottom-0.5 -right-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 border border-white text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                  {player1.level || 1}
                </div>
              </div>

              {/* Name */}
              <h3 className="text-white text-sm font-black italic uppercase truncate max-w-full drop-shadow-sm leading-none py-0.5">
                {player1.name}
              </h3>

              {/* Crowns */}
              <div className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded-lg text-[9px] font-black text-yellow-400 leading-none">
                <Trophy size={9} className="animate-bounce" />
                <span>{player1.trophies || 0}</span>
              </div>
            </motion.div>

            {/* Glowing VS Middle */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", damping: 8 }}
              className="flex flex-col items-center justify-center px-2 flex-shrink-0"
            >
              <div className="relative w-12 h-12 flex items-center justify-center">
                <div className="absolute inset-0 bg-blue-500/15 blur-md rounded-full animate-pulse" />
                <span className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-white to-red-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">VS</span>
              </div>
            </motion.div>

            {/* Player 2 Right */}
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex-1 flex flex-col items-center text-center gap-1 min-w-0"
            >
              <span className="px-2 py-0.5 bg-red-500/20 border border-red-500/30 text-red-400 text-[8px] font-black uppercase tracking-wider rounded-full">
                Defensor
              </span>

              {/* Glowing Avatar */}
              <div className="relative my-1">
                <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-full blur-sm opacity-75"></div>
                <div className="relative w-16 h-16 rounded-full border-2 border-red-400 bg-gray-900 overflow-hidden shadow-lg flex items-center justify-center">
                  {player2.photo ? (
                    <img src={player2.photo} alt={player2.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User size={28} className="text-red-400/40" />
                  )}
                </div>
                {/* Level Badge */}
                <div className="absolute -bottom-0.5 -right-0.5 bg-gradient-to-r from-red-600 to-orange-600 border border-white text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                  {player2.level || 1}
                </div>
              </div>

              {/* Name */}
              <h3 className="text-white text-sm font-black italic uppercase truncate max-w-full drop-shadow-sm leading-none py-0.5">
                {player2.name}
              </h3>

              {/* Crowns */}
              <div className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded-lg text-[9px] font-black text-yellow-400 leading-none">
                <Trophy size={9} className="animate-bounce" />
                <span>{player2.trophies || 0}</span>
              </div>
            </motion.div>

          </div>

          {/* Compact Battle Report */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="w-full bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-2.5 shadow-xl"
          >
            <div className="text-[9px] font-black text-yellow-500 uppercase tracking-widest pb-1.5 border-b border-white/5 w-full text-center flex items-center justify-center gap-1">
              <Sword size={10} className="text-yellow-500" /> Relatório de Batalha
            </div>
            
            {/* Compare Winrate */}
            <div className="flex items-center justify-between gap-2 mt-2">
              <span className="text-[10px] font-black text-blue-400 leading-none">{p1Winrate}%</span>
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 flex">
                <div className="bg-gradient-to-r from-blue-600 to-blue-400 h-full" style={{ width: `${p1Winrate || 50}%` }} />
                <div className="bg-gradient-to-l from-red-600 to-red-400 h-full ml-auto" style={{ width: `${p2Winrate || 50}%` }} />
              </div>
              <span className="text-[10px] font-black text-red-400 leading-none">{p2Winrate}%</span>
            </div>

            {/* Battle Stats Row (Horizontal display to save vertical space) */}
            <div className="grid grid-cols-4 gap-1 mt-2">
              {[
                { label: 'Vitórias', p1: player1.wins || 0, p2: player2.wins || 0, p1Color: 'text-blue-400', p2Color: 'text-red-400' },
                { label: 'Derrotas', p1: player1.losses || 0, p2: player2.losses || 0, p1Color: 'text-blue-400', p2Color: 'text-red-400' },
                { label: 'Empates', p1: player1.draws || 0, p2: player2.draws || 0, p1Color: 'text-blue-400', p2Color: 'text-red-400' },
                { label: 'Desist.', p1: player1.forfeits || 0, p2: player2.forfeits || 0, p1Color: 'text-blue-400', p2Color: 'text-red-400' },
              ].map((stat, i) => (
                <div key={i} className="flex flex-col items-center justify-center bg-white/5 border border-white/5 rounded-lg py-1 px-0.5">
                  <span className="text-[7px] font-black text-white/45 uppercase tracking-tighter mb-0.5 leading-none">{stat.label}</span>
                  <div className="flex items-center gap-0.5 leading-none">
                    <span className={cn("text-[9px] font-black", stat.p1Color)}>{stat.p1}</span>
                    <span className="text-[7px] text-white/10 font-bold">/</span>
                    <span className={cn("text-[9px] font-black", stat.p2Color)}>{stat.p2}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

        </div>

        {/* Loading / Battlefield Status */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="w-full max-w-md bg-gradient-to-r from-transparent via-blue-500/10 to-transparent p-4 rounded-full border-y border-white/5 flex items-center justify-center mt-4"
        >
          <div className="flex items-center gap-4">
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,1)]" 
            />
            <span className="text-[10px] font-black italic uppercase tracking-[0.4em] text-white/60">Carregando Arena de Dama</span>
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.75 }}
              className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,1)]" 
            />
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}

function GameScreen({ mode, aiDifficulty, settings, profile, updateProfile, onBack, onSaveBestPlay, playClick, multiplayerGameId, tournamentId, matchId, onUpdateVisualSettings, onShowEmote }: { mode: string, aiDifficulty: AIDifficulty, settings: GameSettings, profile: any, updateProfile: (data: any) => Promise<void>, onBack: () => void, onSaveBestPlay?: (play: Omit<BestPlay, 'id' | 'date'>) => void, playClick: () => void, key?: string, multiplayerGameId?: string | null, tournamentId?: string | null, matchId?: string | null, onUpdateVisualSettings?: (settings: Partial<GameSettings>) => void, onShowEmote?: (emote: any) => void }) {
  const boardSize = (mode === 'international' || mode === 'local_international' || mode === 'ai_international') ? 10 : 8;
  const [matchCoins, setMatchCoins] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hoveredMove, setHoveredMove] = useState<Move | null>(null);
  const [isEmoteSelectorOpen, setIsEmoteSelectorOpen] = useState(false);
  const [isEmojiSelectorOpen, setIsEmojiSelectorOpen] = useState(false);
  const [isResignModalOpen, setIsResignModalOpen] = useState(false);
  const [isDrawModalOpen, setIsDrawModalOpen] = useState(false);
  const [incomingDrawRequest, setIncomingDrawRequest] = useState<{ from: string, senderName: string } | null>(null);
  const [quickMessage, setQuickMessage] = useState('');
  const [notifications, setNotifications] = useState<{ id: string, type: 'message' | 'emote', content: string, senderName: string, senderId: string }[]>([]);
  const [showCoinAnimation, setShowCoinAnimation] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [showCaptureHints, setShowCaptureHints] = useState(true);
  const [coinsToAward, setCoinsToAward] = useState(0);
  const [gameVisualSettings, setGameVisualSettings] = useState<Partial<GameSettings>>(settings);
  const [visualSettingsOwnerId, setVisualSettingsOwnerId] = useState<string | null>(null);
  const [gameRules, setGameRules] = useState<'brazilian' | 'english'>('brazilian');
  const [showVersusIntro, setShowVersusIntro] = useState(true);
  const [hasResigned, setHasResigned] = useState(false);
  const [isQuickMatchGame, setIsQuickMatchGame] = useState(false);
  const gameId = React.useMemo(() => {
    if (multiplayerGameId) return multiplayerGameId;
    return `game_${mode}_${profile.uid || 'guest'}_${Date.now()}`;
  }, [mode, profile.uid, multiplayerGameId]);

  const handleSendQuickMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickMessage.trim() || !auth.currentUser || !gameId) return;

    const messageText = quickMessage.trim();
    setQuickMessage('');

    // Add locally for immediate feedback at the bottom
    const localId = 'local_msg_' + Date.now();
    setNotifications(prev => [...prev, { 
      id: localId, 
      type: 'message', 
      content: messageText, 
      senderName: 'Você', 
      senderId: auth.currentUser?.uid || 'me' 
    }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== localId));
    }, 15000);

    try {
      const messagesRef = collection(db, 'games', gameId, 'messages');
      await addDoc(messagesRef, {
        senderId: auth.currentUser.uid,
        senderName: profile.displayName || 'Jogador',
        senderPhoto: profile.photoURL || '',
        text: messageText,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `games/${gameId}/messages`);
    }
  };

  const showEmote = async (emote: any) => {
    setIsEmoteSelectorOpen(false);

    const content = emote.video || emote.image || emote.emoji;
    const isImage = !!emote.image;
    const isVideo = !!emote.video;
    const sound = emote.sound;

    // Trigger global centered display
    onShowEmote?.(emote);

    // Add locally for immediate feedback at the bottom (small size)
    const localId = 'local_' + Date.now();
    setNotifications(prev => [...prev, { 
      id: localId, 
      type: 'emote', 
      content: content,
      isImage: isImage,
      isVideo: isVideo,
      sound: sound,
      senderName: 'Você', 
      senderId: auth.currentUser?.uid || 'me' 
    }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== localId));
    }, 5000);

    // Sync emote to Firestore
    if (gameId && auth.currentUser) {
      try {
        const emotesRef = collection(db, 'games', gameId, 'emotes');
        await addDoc(emotesRef, {
          senderId: auth.currentUser.uid,
          senderName: profile.displayName || 'Jogador',
          emoji: content,
          isImage: isImage,
          isVideo: isVideo,
          sound: sound || null,
          timestamp: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `games/${gameId}/emotes`);
      }
    }
  };

  // Listen for messages and emotes for notifications
  useEffect(() => {
    if (!gameId || !auth.currentUser) return;

    // Listen for messages
    const messagesRef = collection(db, 'games', gameId, 'messages');
    const mq = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));
    const unsubscribeMessages = onSnapshot(mq, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          // Only show if it's from someone else and it's not the initial load (approx)
          if (data.senderId !== auth.currentUser?.uid && data.timestamp) {
            const id = change.doc.id;
            setNotifications(prev => {
              if (prev.some(n => n.id === id)) return prev;
              return [...prev, { id, type: 'message', content: data.text, senderName: data.senderName, senderId: data.senderId }];
            });
            setTimeout(() => {
              setNotifications(prev => prev.filter(n => n.id !== id));
            }, 15000);
          }
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `games/${gameId}/messages`);
    });

    // Listen for emotes
    const emotesRef = collection(db, 'games', gameId, 'emotes');
    const eq = query(emotesRef, orderBy('timestamp', 'desc'), limit(1));
    const unsubscribeEmotes = onSnapshot(eq, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          // Only show if it's from someone else (sender already added it locally)
          if (data.senderId !== auth.currentUser?.uid && data.timestamp) {
            const id = change.doc.id;
            
            // Trigger global centered display
            onShowEmote?.({
              video: data.isVideo ? data.emoji : null,
              image: data.isImage ? data.emoji : null,
              emoji: (!data.isVideo && !data.isImage) ? data.emoji : null,
              sound: data.sound,
              name: data.senderName
            });

            setNotifications(prev => {
              if (prev.some(n => n.id === id)) return prev;
              return [...prev, { 
                id, 
                type: 'emote', 
                content: data.emoji, 
                isImage: data.isImage,
                isVideo: data.isVideo,
                sound: data.sound,
                senderName: data.senderName, 
                senderId: data.senderId 
              }];
            });
            setTimeout(() => {
              setNotifications(prev => prev.filter(n => n.id !== id));
            }, 5000);
          }
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `games/${gameId}/emotes`);
    });

    return () => {
      unsubscribeMessages();
      unsubscribeEmotes();
    };
  }, [gameId]);

  const [userColor, setUserColor] = useState<'white' | 'black' | null>(null);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState<string>('Oponente');
  const [opponentPhoto, setOpponentPhoto] = useState<string>('');
  const [player1Info, setPlayer1Info] = useState<{ name: string, photo: string, wins?: number, losses?: number, draws?: number, forfeits?: number, trophies?: number, level?: number }>({ name: 'Jogador 1', photo: '', wins: 0, losses: 0, draws: 0, forfeits: 0, trophies: 0, level: 1 });
  const [player2Info, setPlayer2Info] = useState<{ name: string, photo: string, wins?: number, losses?: number, draws?: number, forfeits?: number, trophies?: number, level?: number }>({ name: 'Jogador 2', photo: '', wins: 0, losses: 0, draws: 0, forfeits: 0, trophies: 0, level: 1 });
  const [isSpectator, setIsSpectator] = useState(false);
  const [spectators, setSpectators] = useState<any[]>([]);

  // States for viewing the previous move by clicking and holding
  const [lastMoveOfPlayer, setLastMoveOfPlayer] = useState<{
    white: { from: { row: number; col: number }, to: { row: number; col: number } } | null;
    black: { from: { row: number; col: number }, to: { row: number; col: number } } | null;
  }>({ white: null, black: null });
  const [activeHighlightPlayerMove, setActiveHighlightPlayerMove] = useState<'white' | 'black' | null>(null);
  const lastProcessedMoveRef = useRef<{ player: 'white' | 'black', from: { row: number; col: number }, to: { row: number; col: number } } | null>(null);

  const [gameUpdatedAt, setGameUpdatedAt] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(60);

  const { 
    pieces, turn, selectedPieceId, validMoves, winner, 
    selectPiece, makeMove: originalMakeMove, initBoard, lastBestPlay, clearLastBestPlay,
    getAllValidMoves, setWinner, setPieces, setTurn, scores, setRules
  } = useCheckers(boardSize, gameRules);

  useEffect(() => {
    setRules(gameRules);
  }, [gameRules, setRules]);

  const allCurrentValidMoves = React.useMemo(() => {
    if ((!showHints && !showCaptureHints) || isSpectator || !!winner) return [];
    
    // In AI mode, only show hints for the user (white)
    if (mode === 'ai' && turn !== 'white') return [];
    
    // In multiplayer mode, only show hints for the user's turn
    if (mode === 'multiplayer' && turn !== userColor) return [];
    
    const allMoves = getAllValidMoves(turn, pieces, boardSize);
    
    // If only capture hints are on, filter for moves that capture pieces
    if (showCaptureHints && !showHints) {
      return allMoves.filter(m => m.captured && m.captured.length > 0);
    }
    
    return allMoves;
  }, [showHints, showCaptureHints, turn, pieces, boardSize, isSpectator, winner, getAllValidMoves, mode, userColor]);

  const piecesWithMovesIds = React.useMemo(() => {
    return new Set(allCurrentValidMoves.map(m => m.pieceId));
  }, [allCurrentValidMoves]);

  // Cleanup: reset status to online when leaving the game
  useEffect(() => {
    return () => {
      if (!isSpectator && auth.currentUser) {
        updateProfile({
          status: 'online',
          currentGameId: null
        }).catch(err => console.error("Error resetting status:", err));
      }
    };
  }, [isSpectator, updateProfile]);

  // Reset last moves on board reset
  useEffect(() => {
    const startPiecesCount = boardSize === 10 ? 40 : 24;
    if (pieces.length === startPiecesCount && turn === 'white' && !winner) {
      setLastMoveOfPlayer({ white: null, black: null });
      if (lastProcessedMoveRef.current) {
        lastProcessedMoveRef.current = null;
      }
    }
  }, [pieces.length, turn, winner, boardSize]);

  useEffect(() => {
    const fetchGameInfo = async () => {
      if (gameId && auth.currentUser) {
        try {
          const gameRef = doc(db, 'games', gameId);
          const gameDoc = await getDoc(gameRef);
          if (gameDoc.exists()) {
            const data = gameDoc.data();
            setIsQuickMatchGame(data.isQuickMatch || false);
            if (data.rules) {
              setGameRules(data.rules);
            }
            const playerIndex = data.players.indexOf(auth.currentUser.uid);
            
            // Fetch both players info for spectators and correct display
            const p1Id = data.players[0];
            const p2Id = data.players[1];
            const playerNames = data.playerNames || {};
            
            if (p1Id) {
              if (p1Id === 'ai' || p1Id === 'local_opponent') {
                setPlayer1Info({ name: playerNames[p1Id] || 'IA', photo: '', wins: 0, losses: 0, draws: 0, forfeits: 0, trophies: 0, level: 1 });
              } else if (p1Id.startsWith('fictitious_')) {
                const fData = FICTITIOUS_PLAYERS[p1Id] || { name: 'Fictício', photo: '', wins: 0, losses: 0, draws: 0, trophies: 0, level: 1 };
                setPlayer1Info({
                  name: fData.name,
                  photo: fData.photo,
                  wins: fData.wins,
                  losses: fData.losses,
                  draws: fData.draws,
                  forfeits: 0,
                  trophies: fData.trophies,
                  level: fData.level
                });
              } else {
                const p1Doc = await getDoc(doc(db, 'users', p1Id));
                if (p1Doc.exists()) {
                  const pData = p1Doc.data();
                  setPlayer1Info({ 
                    name: pData.displayName || 'Jogador 1', 
                    photo: pData.photoURL || '',
                    wins: pData.wins || 0,
                    losses: pData.losses || 0,
                    draws: pData.draws || 0,
                    forfeits: pData.forfeits || 0,
                    trophies: pData.trophies || 0,
                    level: pData.level || 1
                  });
                }
              }
            }
            if (p2Id) {
              if (p2Id === 'ai' || p2Id === 'local_opponent') {
                setPlayer2Info({ name: playerNames[p2Id] || 'IA', photo: '', wins: 0, losses: 0, draws: 0, forfeits: 0, trophies: 0, level: 1 });
              } else if (p2Id.startsWith('fictitious_')) {
                const fData = FICTITIOUS_PLAYERS[p2Id] || { name: 'Fictício', photo: '', wins: 0, losses: 0, draws: 0, trophies: 0, level: 1 };
                setPlayer2Info({
                  name: fData.name,
                  photo: fData.photo,
                  wins: fData.wins,
                  losses: fData.losses,
                  draws: fData.draws,
                  forfeits: 0,
                  trophies: fData.trophies,
                  level: fData.level
                });
              } else {
                const p2Doc = await getDoc(doc(db, 'users', p2Id));
                if (p2Doc.exists()) {
                  const pData = p2Doc.data();
                  setPlayer2Info({ 
                    name: pData.displayName || 'Jogador 2', 
                    photo: pData.photoURL || '',
                    wins: pData.wins || 0,
                    losses: pData.losses || 0,
                    draws: pData.draws || 0,
                    forfeits: pData.forfeits || 0,
                    trophies: pData.trophies || 0,
                    level: pData.level || 1
                  });
                }
              }
            }

            if (playerIndex !== -1) {
              setIsSpectator(false);
              setUserColor(playerIndex === 0 ? 'white' : 'black');
              
              // Fetch opponent info
              const oppId = data.players.find((id: string) => id !== auth.currentUser?.uid);
              if (oppId) {
                setOpponentId(oppId);
                if (oppId === 'ai' || oppId === 'local_opponent') {
                  setOpponentName(playerNames[oppId] || (oppId === 'ai' ? 'IA' : 'Jogador 2'));
                  setOpponentPhoto('');
                } else if (oppId.startsWith('fictitious_')) {
                  const fData = FICTITIOUS_PLAYERS[oppId] || { name: 'Fictício', photo: '' };
                  setOpponentName(fData.name);
                  setOpponentPhoto(fData.photo);
                } else {
                  const opponentDoc = await getDoc(doc(db, 'users', oppId));
                  if (opponentDoc.exists()) {
                    setOpponentName(opponentDoc.data().displayName || 'Oponente');
                    setOpponentPhoto(opponentDoc.data().photoURL || '');
                  }
                }
              }
            } else {
              // User is a spectator
              setIsSpectator(true);
              setUserColor('white'); // Default view for spectators
              setShowVersusIntro(false); // Don't show intro for spectators
              
              // Add to spectators list in Firestore
              const currentSpectators = data.spectators || [];
              if (!currentSpectators.some((s: any) => s.uid === auth.currentUser?.uid)) {
                await updateDoc(gameRef, {
                  spectators: [...currentSpectators, {
                    uid: auth.currentUser.uid,
                    name: profile.displayName || 'Espectador',
                    photoURL: profile.photoURL || ''
                  }]
                });
              }
            }
          }
        } catch (error) {
          console.error("Error fetching game info:", error);
        }
      } else if (mode === 'ai') {
        setIsSpectator(false);
        setUserColor('white');
        setOpponentName(`IA (${aiDifficulty === 'beginner' ? 'Iniciante' : aiDifficulty === 'medium' ? 'Médio' : 'Avançado'})`);
        setPlayer1Info({ 
          name: profile.displayName || 'Você', 
          photo: profile.photoURL || '',
          wins: profile.wins || 0,
          losses: profile.losses || 0,
          draws: profile.draws || 0,
          forfeits: profile.forfeits || 0,
          trophies: profile.trophies || 0,
          level: profile.level || 1
        });
        setPlayer2Info({ 
          name: `IA (${aiDifficulty === 'beginner' ? 'Iniciante' : aiDifficulty === 'medium' ? 'Médio' : 'Avançado'})`, 
          photo: '',
          wins: 0,
          losses: 0,
          draws: 0,
          forfeits: 0,
          trophies: aiDifficulty === 'beginner' ? 120 : aiDifficulty === 'medium' ? 450 : 1150,
          level: aiDifficulty === 'beginner' ? 2 : aiDifficulty === 'medium' ? 10 : 30
        });
      } else {
        setIsSpectator(false);
        setUserColor('white');
        setOpponentName('Jogador 2');
        setPlayer1Info({ name: 'Jogador 1', photo: '', wins: 0, losses: 0, draws: 0, forfeits: 0, trophies: 0, level: 1 });
        setPlayer2Info({ name: 'Jogador 2', photo: '', wins: 0, losses: 0, draws: 0, forfeits: 0, trophies: 0, level: 1 });
      }
    };
    fetchGameInfo();

    // Cleanup: remove from spectators when leaving
    return () => {
      if (mode === 'multiplayer' && gameId && auth.currentUser) {
        const gameRef = doc(db, 'games', gameId);
        getDoc(gameRef).then(snap => {
          if (snap.exists()) {
            const data = snap.data();
            const currentSpectators = data.spectators || [];
            const updatedSpectators = currentSpectators.filter((s: any) => s.uid !== auth.currentUser?.uid);
            updateDoc(gameRef, { spectators: updatedSpectators }).catch(err => console.error("Error removing spectator:", err));
          }
        });
      }
    };
  }, [mode, gameId, aiDifficulty, profile.uid]);

  // Listen for spectators updates
  useEffect(() => {
    if (mode !== 'multiplayer' || !gameId) return;
    const unsubscribe = onSnapshot(doc(db, 'games', gameId), (snap) => {
      if (snap.exists()) {
        setSpectators(snap.data().spectators || []);
      }
    });
    return () => unsubscribe();
  }, [mode, gameId]);

  const isFlipped = mode === 'multiplayer' 
    ? userColor === 'black' 
    : false; // For AI and Local 2-player, keep board static as phone is in the middle

  // Sync multiplayer game state
  useEffect(() => {
    if (!gameId) return;

    // If we are a player in AI or Local mode, we are the source of truth, don't pull from Firestore
    // to avoid race conditions or overwriting local state.
    if (!isSpectator && mode !== 'multiplayer') return;

    const unsubscribe = onSnapshot(doc(db, 'games', gameId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setIsQuickMatchGame(data.isQuickMatch || false);
        if (data.updatedAt) {
          setGameUpdatedAt(data.updatedAt);
        } else {
          setGameUpdatedAt(new Date());
        }
        if (data.rules) {
          setGameRules(data.rules);
        }
        if (data.visualSettingsOwnerId) {
          setVisualSettingsOwnerId(data.visualSettingsOwnerId);
        }
        if (data.visualSettings && (isSpectator || profile.uid !== data.visualSettingsOwnerId)) {
          setGameVisualSettings(data.visualSettings);
          onUpdateVisualSettings?.(data.visualSettings);
        }
        if (data.board) {
          const remotePieces = JSON.parse(data.board);
          // Use functional update to avoid dependency on 'pieces'
          setPieces(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(remotePieces)) {
              return remotePieces;
            }
            return prev;
          });
        }
        if (data.turn) {
          setTurn(prev => {
            if (prev !== data.turn) return data.turn;
            return prev;
          });
        }
        if (data.winner !== undefined) {
          setWinner(prev => {
            if (prev !== data.winner) return data.winner;
            return prev;
          });
        }
        if (data.lastMove) {
          setLastMoveOfPlayer(prev => {
            const mPlayer = data.lastMove.player;
            const mFrom = data.lastMove.from;
            const mTo = data.lastMove.to;
            if (JSON.stringify(prev[mPlayer]) !== JSON.stringify({ from: mFrom, to: mTo })) {
              return {
                ...prev,
                [mPlayer]: { from: mFrom, to: mTo }
              };
            }
            return prev;
          });
        }

        // Handle draw request
        if (data.drawRequest) {
          if (data.drawRequest.status === 'pending') {
            if (data.drawRequest.from !== auth.currentUser?.uid) {
              setIncomingDrawRequest({ from: data.drawRequest.from, senderName: data.drawRequest.senderName });
            }
          } else if (data.drawRequest.status === 'declined') {
            if (data.drawRequest.from === auth.currentUser?.uid) {
              const id = 'draw_declined_' + Date.now();
              setNotifications(prev => [...prev, { id, type: 'message', content: 'Pedido de empate recusado.', senderName: 'Sistema', senderId: 'system' }]);
              setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
              // Clear it
              updateDoc(doc(db, 'games', gameId), { drawRequest: deleteField() }).catch(err => console.error(err));
            }
            setIncomingDrawRequest(null);
          } else if (data.drawRequest.status === 'accepted') {
            setIncomingDrawRequest(null);
          }
        } else {
          setIncomingDrawRequest(null);
        }
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `games/${gameId}`);
    });

    return () => unsubscribe();
  }, [mode, gameId, setPieces, setTurn, setWinner, isSpectator]);

  // Sync visual settings to Firestore if we are the owner
  useEffect(() => {
    if (!isSpectator && mode === 'multiplayer' && gameId && visualSettingsOwnerId === profile.uid) {
      updateDoc(doc(db, 'games', gameId), {
        visualSettings: {
          boardStyle: settings.boardStyle,
          pieceStyle: settings.pieceStyle,
          flatMode: settings.flatMode,
          myPieceColor: settings.myPieceColor,
          opponentPieceColor: settings.opponentPieceColor,
          showContrastCircle: settings.showContrastCircle,
          backgroundId: profile.selectedBackgroundId || 'default',
          myQueenStickerId: settings.myQueenStickerId,
          opponentQueenStickerId: settings.opponentQueenStickerId
        }
      }).catch(err => console.error("Error updating visual settings:", err));
    }
  }, [settings, profile.selectedBackgroundId, isSpectator, mode, gameId, visualSettingsOwnerId, profile.uid]);

  // Online game turn timer (1 minute limit)
  useEffect(() => {
    if (mode !== 'multiplayer' || !gameId || !!winner) {
      setTimeLeft(60);
      return;
    }

    const interval = setInterval(() => {
      if (!gameUpdatedAt) {
        setTimeLeft(60);
        return;
      }

      const getMillis = (val: any) => {
        if (!val) return Date.now();
        if (typeof val.toMillis === 'function') return val.toMillis();
        if (typeof val.toDate === 'function') return val.toDate().getTime();
        if (val instanceof Date) return val.getTime();
        if (typeof val === 'number') return val;
        if (typeof val === 'string') return new Date(val).getTime();
        if (val.seconds) return val.seconds * 1000 + Math.floor(val.nanoseconds / 1000000);
        return Date.now();
      };

      const turnStartedMs = getMillis(gameUpdatedAt);
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - turnStartedMs) / 1000));
      const remaining = Math.max(0, 60 - elapsedSeconds);
      setTimeLeft(remaining);

      // Timeout check
      const isMyTurn = !isSpectator && turn === userColor;
      const timeoutThreshold = isMyTurn ? 60 : 62; // 2 seconds delay for opponent to act as fallback

      if (elapsedSeconds >= timeoutThreshold) {
        clearInterval(interval);
        
        // Execute timeout
        const handleTimeout = async () => {
          const activeTurn = turn;
          const moves = logicGetAllValidMoves(activeTurn, pieces, boardSize, gameRules);
          if (moves && moves.length > 0) {
            const randomIndex = Math.floor(Math.random() * moves.length);
            const initialMove = moves[randomIndex];
            
            let currentPieces = [...pieces];
            let lastMove = initialMove;
            let capturedSequence: string[] = lastMove.captured ? [...lastMove.captured] : [];
            let moveSteps = [lastMove];
            
            let result = applyMove(currentPieces, lastMove, boardSize, gameRules);
            currentPieces = result.newPieces;
            let nextJumps = result.nextJumps;
            
            while (nextJumps && nextJumps.length > 0) {
              const nextRandomIndex = Math.floor(Math.random() * nextJumps.length);
              const nextMove = nextJumps[nextRandomIndex];
              moveSteps.push(nextMove);
              if (nextMove.captured) {
                capturedSequence.push(...nextMove.captured);
              }
              lastMove = nextMove;
              const nextResult = applyMove(currentPieces, nextMove, boardSize, gameRules);
              currentPieces = nextResult.newPieces;
              nextJumps = nextResult.nextJumps;
            }
            
            const nextTurn = activeTurn === 'white' ? 'black' : 'white';
            
            let newWinner: any = null;
            const opponentPieces = currentPieces.filter(p => p.player === nextTurn);
            if (opponentPieces.length === 0) {
              newWinner = activeTurn;
            } else {
              const opponentMoves = logicGetAllValidMoves(nextTurn, currentPieces, boardSize, gameRules);
              if (opponentMoves.length === 0) {
                newWinner = activeTurn;
              }
            }
            
            try {
              const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
              const startMove = moveSteps[0];
              const finalMove = moveSteps[moveSteps.length - 1];
              
              const fromCol = cols[startMove.from.col] || `C${startMove.from.col}`;
              const fromRow = boardSize - startMove.from.row;
              const toCol = cols[finalMove.to.col] || `C${finalMove.to.col}`;
              const toRow = boardSize - finalMove.to.row;
              
              const isCapture = capturedSequence.length > 0;
              const separator = isCapture ? '✕' : '➔';
              const moveNotation = `${fromCol}${fromRow} ${separator} ${toCol}${toRow}`;
              
              const colorLabel = activeTurn === 'white' ? 'Brancas' : 'Pretas';
              const playerDisplayName = activeTurn === 'white' 
                ? (player1Info?.name || 'Brancas')
                : (player2Info?.name || 'Pretas');
                
              const logText = `[TEMPO] ${playerDisplayName} (${colorLabel}): ${moveNotation}`;
              
              const messagesRef = collection(db, 'games', gameId, 'messages');
              await addDoc(messagesRef, {
                senderId: auth.currentUser?.uid || 'system',
                senderName: 'Sistema',
                text: logText,
                isSystem: true,
                timestamp: serverTimestamp()
              });
              
              const gameRef = doc(db, 'games', gameId);
              const updatePayload: any = {
                board: JSON.stringify(currentPieces),
                turn: nextTurn,
                winner: newWinner || null,
                updatedAt: serverTimestamp(),
                lastMove: {
                  player: activeTurn,
                  from: startMove.from,
                  to: finalMove.to
                }
              };
              
              await updateDoc(gameRef, updatePayload);
              
              setPieces(currentPieces);
              setTurn(nextTurn);
              if (newWinner) {
                setWinner(newWinner);
              }
              setGameUpdatedAt(new Date());
              
            } catch (err) {
              console.error("Error executing timeout move:", err);
            }
          }
        };
        handleTimeout();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [mode, gameId, gameUpdatedAt, turn, winner, isSpectator, userColor, pieces, boardSize, getAllValidMoves]);

  const makeMove = async (move: Move, isAi: boolean = false, isTimeoutMove: boolean = false) => {
    // If it's spectator, don't allow moves
    if (isSpectator) return;

    // If it's multiplayer, check if it's our turn
    if (mode === 'multiplayer' && gameId) {
      const isFictitiousAI = opponentId?.startsWith('fictitious_') && isAi;
      if (!isFictitiousAI && !isTimeoutMove) {
        const gameDoc = await getDoc(doc(db, 'games', gameId));
        if (gameDoc.exists()) {
          const data = gameDoc.data();
          const playerIndex = data.players.indexOf(auth.currentUser?.uid);
          const playerColor = playerIndex === 0 ? 'white' : 'black';
          if (turn !== playerColor) return;
        }
      }

      // Add system message log for the move
      try {
        const isCapture = !!(move.captured && move.captured.length > 0);
        const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        const fromCol = cols[move.from.col] || `C${move.from.col}`;
        const fromRow = boardSize - move.from.row;
        const toCol = cols[move.to.col] || `C${move.to.col}`;
        const toRow = boardSize - move.to.row;
        const separator = isCapture ? '✕' : '➔';
        const moveNotation = `${fromCol}${fromRow} ${separator} ${toCol}${toRow}`;
        
        const colorLabel = turn === 'white' ? 'Brancas' : 'Pretas';
        const playerDisplayName = turn === 'white' 
          ? (player1Info?.name || 'Brancas')
          : (player2Info?.name || 'Pretas');
          
        const logText = `${playerDisplayName} (${colorLabel}): ${moveNotation}`;
        
        const messagesRef = collection(db, 'games', gameId, 'messages');
        await addDoc(messagesRef, {
          senderId: auth.currentUser?.uid || 'system',
          senderName: 'Sistema',
          text: logText,
          isSystem: true,
          timestamp: serverTimestamp()
        });
      } catch (err) {
        console.error("Error sending move log:", err);
      }
    }

    // Track previous move
    const playerWhoMoved = turn;
    lastProcessedMoveRef.current = { player: playerWhoMoved, from: move.from, to: move.to };
    setLastMoveOfPlayer(prev => ({
      ...prev,
      [playerWhoMoved]: { from: move.from, to: move.to }
    }));

    const isAiMove = isAi || (mode === 'ai' && turn === 'black');
    if (move.captured && move.captured.length > 0) {
      playCaptureSound();
      
      // Only reward human moves
      if (!isAiMove) {
        let coinsGained = 0;
        move.captured.forEach(id => {
          const capturedPiece = pieces.find(p => p.id === id);
          if (capturedPiece) {
            // King capture = 3 coins, Pawn capture = 1 coin
            coinsGained += capturedPiece.type === 'king' ? 3 : 1;
          }
        });
        
        // Combo bonus: 3 or more captures = +2 coins
        if (move.captured.length >= 3) {
          coinsGained += 2;
        }

        // Limit per match: max 20 coins
        const remainingLimit = 20 - matchCoins;
        const actualGained = Math.min(coinsGained, remainingLimit);

        if (actualGained > 0) {
          setMatchCoins(prev => prev + actualGained);
          updateProfile({ 
            coins: (profile.coins || 0) + actualGained
          });
        }
      }
    } else {
      playMoveSound();
    }

    setGameUpdatedAt(new Date());
    originalMakeMove(move, isAiMove);
  };

  // Sync state to Firestore after local move
  const lastSyncedState = React.useRef<string>('');
  useEffect(() => {
    if (!gameId || !auth.currentUser || isSpectator || !userColor) return;

    const syncGame = async () => {
      const currentState = JSON.stringify({ pieces, turn, winner });
      if (currentState === lastSyncedState.current) return;

      try {
        const gameRef = doc(db, 'games', gameId);
        const updatePayload: any = {
          board: JSON.stringify(pieces),
          turn,
          winner,
          updatedAt: serverTimestamp()
        };
        if (lastProcessedMoveRef.current) {
          updatePayload.lastMove = lastProcessedMoveRef.current;
        }
        await updateDoc(gameRef, updatePayload);
        lastSyncedState.current = currentState;
      } catch (err) {
        console.error("Error syncing game state:", err);
      }
    };

    syncGame();
  }, [pieces, turn, winner, gameId, isSpectator]);

  useEffect(() => {
    if (lastBestPlay && onSaveBestPlay) {
      // Only save if it's not the AI's turn (AI is black in 'ai' mode)
      const isAI = mode === 'ai' && lastBestPlay.player === 'black';
      if (!isAI) {
        onSaveBestPlay({
          player: lastBestPlay.player,
          playerName: profile.displayName || (lastBestPlay.player === 'white' ? 'Jogador 1' : 'Jogador 2'),
          avatar: profile.photoURL || `https://picsum.photos/seed/${profile.uid || 'p1'}/100/100`,
          count: lastBestPlay.count,
          moves: lastBestPlay.moves,
          initialBoard: lastBestPlay.initialBoard,
          boardSize: boardSize,
          settings: {
            boardStyle: settings.boardStyle,
            pieceStyle: settings.pieceStyle,
            flatMode: settings.flatMode,
            myPieceColor: settings.myPieceColor,
            opponentPieceColor: settings.opponentPieceColor,
            showContrastCircle: settings.showContrastCircle,
            myQueenStickerId: settings.myQueenStickerId,
            opponentQueenStickerId: settings.opponentQueenStickerId
          }
        });
        clearLastBestPlay();
      }
    }
  }, [lastBestPlay, onSaveBestPlay, clearLastBestPlay, mode, profile, boardSize]);

  const playMoveSound = () => {
    if (!settings.soundEnabled) return;
    console.log('Playing move sound');
    const audio = new Audio('https://cdn.jsdelivr.net/gh/lichess-org/lila@master/public/sound/standard/Move.mp3');
    audio.volume = 0.4;
    audio.play().catch(err => console.log('Error playing move sound:', err));
  };

  const playCaptureSound = () => {
    if (!settings.soundEnabled) return;
    console.log('Playing capture sound');
    const audio = new Audio('https://cdn.jsdelivr.net/gh/lichess-org/lila@master/public/sound/standard/Capture.mp3');
    audio.volume = 0.5;
    audio.play().catch(err => console.log('Error playing capture sound:', err));
  };

  const playSelectSound = () => {
    if (!settings.soundEnabled) return;
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    audio.volume = 0.2;
    audio.play().catch(() => {});
  };

  const playVictorySound = () => {
    if (!settings.soundEnabled) return;
    console.log('Playing victory sound');
    // More celebratory sound
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');
    audio.volume = 0.6;
    audio.play().catch(err => console.log('Error playing victory sound:', err));
  };

  const playDrawSound = () => {
    if (!settings.soundEnabled) return;
    console.log('Playing draw sound');
    // More neutral sound
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1003/1003-preview.mp3');
    audio.volume = 0.5;
    audio.play().catch(err => console.log('Error playing draw sound:', err));
    
    // Set duration to 1.5 seconds
    setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
    }, 1500);
  };


  const sendFictitiousInteraction = async (type: 'message' | 'emote', content: string) => {
    if (!gameId || !opponentId) return;
    const fData = FICTITIOUS_PLAYERS[opponentId];
    if (!fData) return;

    try {
      if (type === 'message') {
        const messagesRef = collection(db, 'games', gameId, 'messages');
        await addDoc(messagesRef, {
          senderId: opponentId,
          senderName: fData.name,
          senderPhoto: fData.photo,
          text: content,
          timestamp: serverTimestamp()
        });
      } else {
        const emotesRef = collection(db, 'games', gameId, 'emotes');
        await addDoc(emotesRef, {
          senderId: opponentId,
          senderName: fData.name,
          emoji: content,
          isImage: false,
          isVideo: false,
          sound: null,
          timestamp: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error sending fictitious interaction:", error);
    }
  };

  // Fictitious opponent welcome message
  useEffect(() => {
    if (mode === 'multiplayer' && gameId && opponentId?.startsWith('fictitious_')) {
      const timer = setTimeout(() => {
        const greetings: Record<string, string[]> = {
          'fictitious_maria': [
            'Olá! Sou a Maria de SP. Boa sorte! 😊',
            'Oi! Vamos jogar uma boa partida! 🍀',
            'Tudo bem? Que vença o melhor! 👍'
          ],
          'fictitious_matheus': [
            'Fala aí! Pronto para o desafio? 😎',
            'E aí! Boa sorte, vai precisar! 😉',
            'Opa! Vamos para cima, bom jogo! 👊'
          ],
          'fictitious_carlos': [
            'Saudações. Me chamo Carlos. Excelente partida para nós. 🧠',
            'Olá. Pronto para um jogo estratégico? 👍',
            'Boa partida. Que vença a melhor tática. 🎯'
          ]
        };
        const pool = greetings[opponentId] || ['Boa sorte!'];
        const greet = pool[Math.floor(Math.random() * pool.length)];
        sendFictitiousInteraction('message', greet);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [gameId, opponentId, mode]);

  // Fictitious AI Logic
  useEffect(() => {
    if (mode === 'multiplayer' && opponentId?.startsWith('fictitious_') && turn === 'black' && !winner && !isSpectator) {
      const difficulty = getFictitiousDifficulty(opponentId);
      const timer = setTimeout(async () => {
        const selectedMove = getBestMove(pieces, 'black', difficulty, boardSize, gameRules);
        if (selectedMove) {
          makeMove(selectedMove, true);
          
          // Determine if we captured any piece or made a king
          const capturedAny = selectedMove.captured && selectedMove.captured.length > 0;
          const pieceBefore = pieces.find(p => p.id === selectedMove.pieceId);
          const becameKing = selectedMove.isKing && pieceBefore && pieceBefore.type === 'pawn';
          
          // Roll a chance for in-game comments / emotes (40% chance)
          const roll = Math.random();
          if (roll < 0.4) {
            setTimeout(() => {
              if (becameKing) {
                const kingMsgs: Record<string, string[]> = {
                  'fictitious_maria': ['Fiz uma dama! Agora segura! 👑', 'Olha ela! Dama de respeito! 😎', '👑'],
                  'fictitious_matheus': ['Minha primeira dama! 🔥', 'Dama neles! Haha! 😈', '👑'],
                  'fictitious_carlos': ['Dama estabelecida. O jogo mudou. 🧠', 'Excelente! Dama conquistada. 👍', '👑']
                };
                const pool = kingMsgs[opponentId] || ['Dama!'];
                const item = pool[Math.floor(Math.random() * pool.length)];
                if (item === '👑') sendFictitiousInteraction('emote', '👑');
                else sendFictitiousInteraction('message', item);
              } else if (capturedAny) {
                const captureMsgs: Record<string, string[]> = {
                  'fictitious_maria': ['Mais uma peça para a conta! 😂', 'Com licença, peguei! 🤭', '🔥'],
                  'fictitious_matheus': ['Essa foi fácil! Valeu! 😎', 'Já era mais uma! ⚡', '🔥'],
                  'fictitious_carlos': ['Captura efetuada com sucesso. 🎯', 'Movimento preciso. 👍', '🎯']
                };
                const pool = captureMsgs[opponentId] || ['Captura!'];
                const item = pool[Math.floor(Math.random() * pool.length)];
                if (item === '🔥' || item === '🎯') sendFictitiousInteraction('emote', item);
                else sendFictitiousInteraction('message', item);
              } else {
                const friendlyEmotes = ['👍', '😎', '🤔', '😊', '🙌'];
                const emote = friendlyEmotes[Math.floor(Math.random() * friendlyEmotes.length)];
                sendFictitiousInteraction('emote', emote);
              }
            }, 1000);
          }
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [turn, mode, pieces, winner, opponentId, isSpectator, boardSize]);

  // AI Logic
  useEffect(() => {
    if (mode === 'ai' && turn === 'black' && !winner && !isSpectator) {
      const timer = setTimeout(() => {
        const selectedMove = getBestMove(pieces, 'black', aiDifficulty as any, boardSize, gameRules);
        if (selectedMove) {
          makeMove(selectedMove, true);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [turn, mode, pieces, winner, aiDifficulty, makeMove, boardSize]);

  const useRemoteSettings = mode === 'multiplayer' && (isSpectator || profile.uid !== visualSettingsOwnerId);

  const getBoardColors = () => {
    const style = useRemoteSettings ? (gameVisualSettings.boardStyle || 'classic') : settings.boardStyle;
    switch (style) {
      case 'green':
        return { dark: 'bg-[#064e3b]', light: 'bg-[#d1fae5]', border: 'border-[#064e3b]' };
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
  const currentFlatMode = useRemoteSettings ? gameVisualSettings.flatMode : settings.flatMode;
  const currentPieceStyle = useRemoteSettings ? gameVisualSettings.pieceStyle : settings.pieceStyle;
  
  const currentMyPieceColor = useRemoteSettings ? (gameVisualSettings.myPieceColor || '#ffffff') : settings.myPieceColor;
  const currentOpponentPieceColor = useRemoteSettings ? (gameVisualSettings.opponentPieceColor || '#000000') : settings.opponentPieceColor;
  
  // Resolve which color is which based on userColor
  // If userColor is white, then white is 'my' and black is 'opponent'
  // If userColor is black, then black is 'my' and white is 'opponent'
  // If userColor is null (e.g. spectator or local), default to white=my, black=opponent
  const currentWhitePieceColor = (userColor === 'black') ? currentOpponentPieceColor : currentMyPieceColor;
  const currentBlackPieceColor = (userColor === 'black') ? currentMyPieceColor : currentOpponentPieceColor;

  const currentShowContrastCircle = useRemoteSettings ? gameVisualSettings.showContrastCircle : settings.showContrastCircle;

  useEffect(() => {
    if (winner && !isSpectator) {
      if (winner === 'draw') {
        playDrawSound();
      } else {
        playVictorySound();
      }

      // If it is a fictitious opponent, trigger a post-game interaction and advance difficulty!
      if (opponentId?.startsWith('fictitious_')) {
        advanceFictitiousDifficulty(opponentId);
        
        const isFictitiousWinner = winner === 'black'; // fictitious opponent won
        const isFictitiousDraw = winner === 'draw';
        
        setTimeout(() => {
          const endMsgs: Record<string, { win: string[], loss: string[], draw: string[] }> = {
            'fictitious_maria': {
              win: ['Ganhei! Boa partida! Jogou muito! 😊', 'Nossa, foi por pouco! Excelente jogo! 🍀', 'Eba, que jogão! Obrigada pela partida! 🙌'],
              loss: ['Parabéns! Você joga super bem! 👏', 'Poxa, perdi! Mas adorei o jogo, parabéns! 😊', 'Parabéns pela vitória! Merecido! 🎉'],
              draw: ['Empate! Jogo muito equilibrado! 👍', 'Nossa, empatamos! Bom jogo para nós dois! 🤝']
            },
            'fictitious_matheus': {
              win: ['É isso aí! Boa partida cara! 👊', 'Ganhei, mas foi sofrido! Jogou muito! 😎', 'Vitória! Valeu pelo jogo! 👍'],
              loss: ['Nossa, você joga demais! Parabéns! 🤯', 'Perdi! Mandou muito bem, cara! 👊', 'Parabéns! Na próxima eu te ganho! 😉'],
              draw: ['Empatou! Jogo pegado! 👍', 'Empate! Boa partida, cara! 🤝']
            },
            'fictitious_carlos': {
              win: ['Partida concluída. Obrigado pelo excelente confronto! 🧠', 'Vitória bem disputada. Parabéns pela estratégia! 👍', 'Obrigado pelo jogo! Uma vitória estratégica. 🎯'],
              loss: ['Derrota justa. Seus movimentos foram excelentes. Parabéns! 🤝', 'Incrível estratégia! Parabéns pela merecida vitória! 🧠', 'Excelente jogo! Você dominou o tabuleiro. 👏'],
              draw: ['Empate técnico ideal. Uma partida muito estratégica. 🤝', 'Fim de jogo em empate. Parabéns pelo confronto equilibrado! 🧠']
            }
          };
          const poolObj = endMsgs[opponentId] || { win: ['Bom jogo!'], loss: ['Parabéns!'], draw: ['Empate!'] };
          const pool = isFictitiousDraw ? poolObj.draw : (isFictitiousWinner ? poolObj.win : poolObj.loss);
          const msg = pool[Math.floor(Math.random() * pool.length)];
          sendFictitiousInteraction('message', msg);
        }, 1800);
      }
      
      // Reward for winning
      const isWinner = userColor ? winner === userColor : winner === 'white';
      const isDraw = winner === 'draw';
      const xpGain = isWinner ? 50 : (isDraw ? 20 : 10);
      
      let trophyGain = 0;
      if (isWinner) trophyGain = 6;
      else if (isDraw) trophyGain = 2;
      else trophyGain = -4;

      const currentTrophies = profile.trophies || 0;
      let newTrophies = currentTrophies + trophyGain;
      
      // Floor logic: when reaching 20, it doesn't go below 20
      if (currentTrophies >= 20 && newTrophies < 20) {
        newTrophies = 20;
      } else if (newTrophies < 0) {
        newTrophies = 0;
      }

      const oldCoins = profile.coins || 0;
      let actualGained = 0;
      if (isQuickMatchGame) {
        if (isWinner) {
          actualGained = 50;
        } else if (isDraw) {
          actualGained = 25; // refund bet
        } else {
          actualGained = 0; // lost bet
        }
      } else {
        // End of game coins also respect the 20 coins limit per match
        // Convert score to coins as requested: "os valores serão revertido em moedas"
        const scoreCoins = userColor === 'white' ? scores.white : scores.black;
        const gameEndCoins = (isWinner ? 10 : (isDraw ? 5 : 2)) + scoreCoins;
        const remainingLimit = 30 - matchCoins; // Increased limit to accommodate score coins
        actualGained = Math.min(gameEndCoins, remainingLimit);
      }
      const newCoins = oldCoins + actualGained;
      
      setCoinsToAward(actualGained);
      setShowCoinAnimation(true);
      
      // Gem milestone: every 100 trophies (coroas) = 10 gems
      const oldTrophyMilestones = Math.floor(currentTrophies / 100);
      const newTrophyMilestones = Math.floor(newTrophies / 100);
      const gemsGained = (newTrophyMilestones > oldTrophyMilestones) ? (newTrophyMilestones - oldTrophyMilestones) * 10 : 0;

      updateProfile({ 
        coins: newCoins,
        gems: (profile.gems || 0) + gemsGained,
        wins: (profile.wins || 0) + (isWinner ? 1 : 0),
        losses: (profile.losses || 0) + (!isWinner && !isDraw ? 1 : 0),
        draws: (profile.draws || 0) + (isDraw ? 1 : 0),
        forfeits: (profile.forfeits || 0) + (hasResigned ? 1 : 0),
        totalGames: (profile.totalGames || 0) + 1,
        xp: (profile.xp || 0) + xpGain,
        level: Math.floor(((profile.xp || 0) + xpGain) / 100) + 1,
        trophies: newTrophies
      });

      // Update tournament scores if applicable
      if (tournamentId && matchId) {
        const updateTournament = async () => {
          try {
            const tournamentRef = doc(db, 'tournaments', tournamentId);
            const tournamentSnap = await getDoc(tournamentRef);
            if (tournamentSnap.exists()) {
              const tData = tournamentSnap.data();
              const newScores = { ...(tData.scores || {}) };
              const winnerId = winner === 'white' ? tData.matches.find((m: any) => m.id === matchId).player1 : tData.matches.find((m: any) => m.id === matchId).player2;
              
              if (winner === 'draw') {
                const m = tData.matches.find((m: any) => m.id === matchId);
                newScores[m.player1] = (newScores[m.player1] || 0) + 1;
                newScores[m.player2] = (newScores[m.player2] || 0) + 1;
              } else if (winnerId) {
                newScores[winnerId] = (newScores[winnerId] || 0) + 3;
              }

              const newMatches = tData.matches.map((m: any) => 
                m.id === matchId ? { ...m, status: 'finished', winner: winner === 'draw' ? 'draw' : winnerId } : m
              );

              // Handle bracket progression
              const finishedMatch = newMatches.find((m: any) => m.id === matchId);
              if (finishedMatch && finishedMatch.winner && finishedMatch.winner !== 'draw' && finishedMatch.nextMatchId) {
                const nextMatchIdx = newMatches.findIndex((m: any) => m.id === finishedMatch.nextMatchId);
                if (nextMatchIdx !== -1) {
                  const nextMatch = { ...newMatches[nextMatchIdx] };
                  nextMatch[finishedMatch.nextMatchSlot] = finishedMatch.winner;
                  
                  // If both players are now present, set status to pending
                  if (nextMatch.player1 && nextMatch.player2) {
                    nextMatch.status = 'pending';
                  }
                  newMatches[nextMatchIdx] = nextMatch;
                }
              }

              // Check if tournament is finished (final match winner decided)
              const roundsCount = tData.totalRounds || Math.ceil(Math.log2(tData.participants.length));
              const finalMatch = newMatches.find((m: any) => m.round === roundsCount);
              let tournamentStatus = tData.status;
              let championId = tData.championId;
              let championName = tData.championName;

              if (finalMatch && finalMatch.winner && finalMatch.winner !== 'draw') {
                tournamentStatus = 'finished';
                championId = finalMatch.winner;
                // We'll let the expiration check or a separate effect fetch the name if needed, 
                // but let's try to set it here if it's the current user
                if (championId === profile.uid) {
                  championName = profile.displayName || 'Você';
                }
              }

              await updateDoc(tournamentRef, {
                scores: newScores,
                matches: newMatches,
                status: tournamentStatus,
                championId,
                championName
              });
            }
          } catch (err) {
            console.error("Error updating tournament score:", err);
          }
        };
        updateTournament();
      }

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
      className="absolute inset-0 bg-black/40 backdrop-blur-md flex flex-col z-10"
    >
      <AnimatePresence>
        {showVersusIntro && (
          <VersusIntro 
            player1={player1Info} 
            player2={player2Info} 
            onComplete={() => setShowVersusIntro(false)} 
            soundEnabled={settings.soundEnabled}
          />
        )}
      </AnimatePresence>

      {showCoinAnimation && (
        <CoinFlying count={coinsToAward} onComplete={() => setShowCoinAnimation(false)} />
      )}
      <div className="px-1.5 md:px-4 py-1.5 md:py-2 flex items-center justify-between bg-black/20 gap-1 md:gap-2 overflow-hidden">
        <button onClick={onBack} className="p-1 md:p-1.5 bg-black/40 rounded-full flex-shrink-0">
          <ChevronLeft size={16} className="md:w-5 md:h-5" />
        </button>
        
        <div className="flex-1 flex items-center justify-center gap-1 md:gap-2 px-1">
          {!isSpectator ? (
            <button 
              onClick={() => {
                playClick();
                setShowCaptureHints(!showCaptureHints);
              }}
              className={cn(
                "px-1.5 py-0.5 md:px-2 md:py-1 rounded-lg text-[7px] md:text-[8px] font-black uppercase tracking-tight md:tracking-wider border transition-all duration-300 flex items-center gap-0.5 md:gap-1 flex-shrink-0",
                showCaptureHints 
                  ? "bg-orange-500/20 border-orange-500 text-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]" 
                  : "bg-black/40 border-white/10 text-white/40 hover:text-white/60"
              )}
            >
              <Target size={8} className={cn("md:w-2.5 md:h-2.5", showCaptureHints ? "animate-pulse" : "")} />
              {showCaptureHints ? 'Capturas ON' : 'Ver Capturas'}
            </button>
          ) : (
            <div className="text-white/40 font-black italic text-[9px] md:text-[10px] uppercase tracking-wider text-center line-clamp-1">
              Assistindo
            </div>
          )}
        </div>

        <div className="flex gap-0.5 md:gap-1 items-center flex-shrink-0">
          {!isSpectator && (
            <>
              <button 
                onClick={() => {
                  playClick();
                  setIsResignModalOpen(true);
                }} 
                className="px-1.5 py-0.5 bg-red-600/40 rounded-lg text-[7px] md:text-[8px] font-black uppercase tracking-tight md:tracking-wider border border-red-500/30 flex items-center gap-0.5 md:gap-1 flex-shrink-0"
              >
                <Flag size={8} className="md:w-2.5 md:h-2.5" /> Desistir
              </button>
              <button 
                onClick={() => {
                  playClick();
                  setIsDrawModalOpen(true);
                }} 
                className="px-1.5 py-0.5 bg-gray-600/40 rounded-lg text-[7px] md:text-[8px] font-black uppercase tracking-tight md:tracking-wider border border-white/10 flex-shrink-0"
              >
                Empate
              </button>
              <button 
                onClick={() => {
                  playClick();
                  setShowHints(!showHints);
                }} 
                className={cn(
                  "px-1.5 py-0.5 rounded-lg text-[7px] md:text-[8px] font-black uppercase tracking-tight md:tracking-wider border transition-all duration-200 flex items-center gap-0.5 md:gap-1 flex-shrink-0",
                  showHints 
                    ? "bg-[#39FF14]/20 border-[#39FF14] text-[#39FF14] shadow-[0_0_10px_rgba(57,255,20,0.3)]" 
                    : "bg-gray-600/40 border-white/10 text-white/60"
                )}
              >
                <Zap size={8} className={cn("md:w-2.5 md:h-2.5", showHints ? "animate-pulse" : "")} /> {showHints ? 'Dicas ON' : 'Dicas'}
              </button>
            </>
          )}
          {isSpectator && (
            <div className="px-1.5 py-0.5 bg-yellow-600/40 rounded-lg text-[7px] md:text-[8px] font-black uppercase tracking-tight md:tracking-wider border border-yellow-500/30 flex items-center gap-0.5 md:gap-1 text-yellow-500 flex-shrink-0">
              <Eye size={8} className="md:w-2.5 md:h-2.5" /> Assistindo
            </div>
          )}
          {!isSpectator && (
            <button onClick={initBoard} className="p-1 md:p-1.5 bg-black/40 rounded-full flex-shrink-0">
              <Play size={16} className="rotate-90 md:w-5 md:h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Scoreboard Area - Matching User Drawing */}
      <div className="px-4 py-0.5 space-y-2">
        <div className="bg-blue-900/20 border-2 border-blue-500/40 rounded-xl p-1.5 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex flex-col gap-0.5 flex-1">
              {/* Player 1 */}
              <div className={cn(
                "flex items-center justify-between transition-all duration-300",
                turn === 'white' ? "opacity-100 translate-x-1" : "opacity-40"
              )}>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.3)] flex items-center justify-center overflow-hidden">
                    {mode === 'multiplayer' ? (
                      isSpectator ? (
                        player1Info.photo ? <img src={player1Info.photo} alt="" className="w-full h-full object-cover" /> : <User size={10} className="text-black" />
                      ) : (
                        opponentPhoto && userColor === 'black' ? <img src={opponentPhoto} alt="" className="w-full h-full object-cover" /> : <User size={10} className="text-black" />
                      )
                    ) : (
                      <User size={10} className="text-black" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[6px] font-black text-blue-400 uppercase tracking-tighter leading-none mb-0.5">Brancas</span>
                    <div className="flex items-center gap-1.5">
                      {mode === 'multiplayer' && (
                        <div className="flex items-center gap-1 mr-1">
                          <div className="w-12 h-1.5 bg-gray-800/80 rounded-full overflow-hidden border border-white/5 flex-shrink-0">
                            <div 
                              className={cn(
                                "h-full transition-all duration-1000 ease-linear",
                                turn === 'white' ? (timeLeft <= 15 ? "bg-red-500 animate-pulse" : "bg-emerald-500") : "bg-gray-700/40"
                              )}
                              style={{ width: `${turn === 'white' ? (timeLeft / 60) * 100 : 0}%` }}
                            />
                          </div>
                          {turn === 'white' && (
                            <span className={cn(
                              "text-[8px] font-black leading-none min-w-[16px] tabular-nums",
                              timeLeft <= 15 ? "text-red-500 animate-pulse" : "text-emerald-500"
                            )}>
                              {timeLeft}s
                            </span>
                          )}
                        </div>
                      )}
                      <span className="text-xs font-black text-white leading-none">
                        {mode === 'local' ? 'Jogador 1' : (isSpectator ? player1Info.name : (userColor === 'white' ? profile.displayName || 'Você' : opponentName))}
                      </span>
                      <button
                        title="Segure para ver a última jogada deste jogador"
                        className={cn(
                          "p-0.5 rounded transition-all bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20 active:bg-yellow-500/30 focus:outline-none select-none cursor-pointer",
                          !lastMoveOfPlayer.white && "opacity-20 cursor-not-allowed border-transparent bg-transparent"
                        )}
                        onMouseDown={() => lastMoveOfPlayer.white && setActiveHighlightPlayerMove('white')}
                        onMouseUp={() => setActiveHighlightPlayerMove(null)}
                        onMouseLeave={() => setActiveHighlightPlayerMove(null)}
                        onTouchStart={(e) => {
                          if (lastMoveOfPlayer.white) {
                            e.preventDefault();
                            setActiveHighlightPlayerMove('white');
                          }
                        }}
                        onTouchEnd={() => setActiveHighlightPlayerMove(null)}
                        disabled={!lastMoveOfPlayer.white}
                      >
                        <ArrowUpRight size={10} className={cn(lastMoveOfPlayer.white && "animate-pulse")} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-black/40 px-1.5 py-0.5 rounded-lg border border-white/10">
                  <span className="text-sm font-black text-yellow-500 tabular-nums">
                    {scores.white.toString().padStart(2, '0')}
                  </span>
                  <Coins size={10} className="text-yellow-500" />
                </div>
              </div>

              {/* VS Divider */}
              <div className="flex items-center gap-2">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent opacity-20" />
                <div className="text-blue-500/40 font-black italic text-[7px] px-1">VS</div>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent opacity-20" />
              </div>

              {/* Player 2 */}
              <div className={cn(
                "flex items-center justify-between transition-all duration-300",
                turn === 'black' ? "opacity-100 translate-x-1" : "opacity-40"
              )}>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-black border border-white/20 shadow-[0_0_10px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden">
                    {mode === 'multiplayer' ? (
                      isSpectator ? (
                        player2Info.photo ? <img src={player2Info.photo} alt="" className="w-full h-full object-cover" /> : <User size={10} className="text-white" />
                      ) : (
                        opponentPhoto && userColor === 'white' ? <img src={opponentPhoto} alt="" className="w-full h-full object-cover" /> : <User size={10} className="text-white" />
                      )
                    ) : (
                      <User size={10} className="text-white" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[6px] font-black text-red-400 uppercase tracking-tighter leading-none mb-0.5">Pretas</span>
                    <div className="flex items-center gap-1.5">
                      {mode === 'multiplayer' && (
                        <div className="flex items-center gap-1 mr-1">
                          <div className="w-12 h-1.5 bg-gray-800/80 rounded-full overflow-hidden border border-white/5 flex-shrink-0">
                            <div 
                              className={cn(
                                "h-full transition-all duration-1000 ease-linear",
                                turn === 'black' ? (timeLeft <= 15 ? "bg-red-500 animate-pulse" : "bg-emerald-500") : "bg-gray-700/40"
                              )}
                              style={{ width: `${turn === 'black' ? (timeLeft / 60) * 100 : 0}%` }}
                            />
                          </div>
                          {turn === 'black' && (
                            <span className={cn(
                              "text-[8px] font-black leading-none min-w-[16px] tabular-nums",
                              timeLeft <= 15 ? "text-red-500 animate-pulse" : "text-emerald-500"
                            )}>
                              {timeLeft}s
                            </span>
                          )}
                        </div>
                      )}
                      <span className="text-sm font-black text-white leading-none">
                        {mode === 'local' ? 'Jogador 2' : (isSpectator ? player2Info.name : (userColor === 'black' ? profile.displayName || 'Você' : opponentName))}
                      </span>
                      <button
                        title="Segure para ver a última jogada deste jogador"
                        className={cn(
                          "p-0.5 rounded transition-all bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20 active:bg-yellow-500/30 focus:outline-none select-none cursor-pointer",
                          !lastMoveOfPlayer.black && "opacity-20 cursor-not-allowed border-transparent bg-transparent"
                        )}
                        onMouseDown={() => lastMoveOfPlayer.black && setActiveHighlightPlayerMove('black')}
                        onMouseUp={() => setActiveHighlightPlayerMove(null)}
                        onMouseLeave={() => setActiveHighlightPlayerMove(null)}
                        onTouchStart={(e) => {
                          if (lastMoveOfPlayer.black) {
                            e.preventDefault();
                            setActiveHighlightPlayerMove('black');
                          }
                        }}
                        onTouchEnd={() => setActiveHighlightPlayerMove(null)}
                        disabled={!lastMoveOfPlayer.black}
                      >
                        <ArrowUpRight size={10} className={cn(lastMoveOfPlayer.black && "animate-pulse")} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-black/40 px-1.5 py-0.5 rounded-lg border border-white/10">
                  <span className="text-sm font-black text-yellow-500 tabular-nums">
                    {scores.black.toString().padStart(2, '0')}
                  </span>
                  <Coins size={10} className="text-yellow-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Spectators List */}
        {spectators.length > 0 && (
          <div className="flex items-center gap-2 bg-black/20 rounded-lg px-2 py-1 border border-white/5">
            <div className="flex items-center gap-1 text-[8px] font-black text-white/40 uppercase tracking-widest">
              <Users size={10} />
              <span>Espectadores ({spectators.length})</span>
            </div>
            <div className="flex -space-x-2 overflow-hidden">
              {spectators.slice(0, 5).map((s, idx) => (
                <div key={s.uid} className="w-4 h-4 rounded-full border border-black bg-gray-800 flex items-center justify-center overflow-hidden" title={s.name}>
                  {s.photoURL ? (
                    <img src={s.photoURL} alt={s.name} className="w-full h-full object-cover" />
                  ) : (
                    <User size={8} className="text-white/40" />
                  )}
                </div>
              ))}
              {spectators.length > 5 && (
                <div className="w-4 h-4 rounded-full border border-black bg-gray-900 flex items-center justify-center text-[6px] font-bold text-white/60">
                  +{spectators.length - 5}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-start p-2 pb-16 relative z-[30] overflow-y-auto scrollbar-hide">
        <div className="w-full max-w-[min(100vw-1rem,62vh)] flex flex-col relative">
          <div 
            className={cn(
              "grid", 
              !currentFlatMode && "shadow-2xl",
              !currentFlatMode ? colors.border : "border-transparent"
            )}
            style={{ 
              gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
              gridTemplateRows: `repeat(${boardSize}, 1fr)`,
              width: '100%',
              aspectRatio: '1/1',
              borderWidth: currentFlatMode ? '0px' : '8px'
            }}
          >
            {Array.from({ length: boardSize * boardSize }).map((_, i) => {
              const vRow = Math.floor(i / boardSize);
              const vCol = i % boardSize;
              const row = isFlipped ? (boardSize - 1) - vRow : vRow;
              const col = isFlipped ? (boardSize - 1) - vCol : vCol;
              const isDark = (row + col) % 2 !== 0;
              const piece = pieces.find(p => p.row === row && p.col === col);
              const isValidMove = validMoves.find(m => m.to.row === row && m.to.col === col);
              const isHintPiece = (showHints || showCaptureHints) && piece && piecesWithMovesIds.has(piece.id);
              const isHintMove = (showHints || showCaptureHints) && allCurrentValidMoves.some(m => m.to.row === row && m.to.col === col);
              const isOrangeHint = showCaptureHints && !showHints;
              const isCapturedByHover = hoveredMove?.captured?.some(id => pieces.find(p => p.id === id)?.row === row && pieces.find(p => p.id === id)?.col === col);

              const isFromTile = activeHighlightPlayerMove && lastMoveOfPlayer[activeHighlightPlayerMove] && 
                lastMoveOfPlayer[activeHighlightPlayerMove]?.from.row === row && 
                lastMoveOfPlayer[activeHighlightPlayerMove]?.from.col === col;

              const isToTile = activeHighlightPlayerMove && lastMoveOfPlayer[activeHighlightPlayerMove] && 
                lastMoveOfPlayer[activeHighlightPlayerMove]?.to.row === row && 
                lastMoveOfPlayer[activeHighlightPlayerMove]?.to.col === col;

              return (
                <div 
                  key={i}
                  className={cn(
                    "relative flex items-center justify-center transition-colors duration-200",
                    isDark ? colors.dark : colors.light,
                    isValidMove && "cursor-pointer hover:bg-yellow-500/20"
                  )}
                  onMouseEnter={() => isValidMove && setHoveredMove(isValidMove)}
                  onMouseLeave={() => setHoveredMove(null)}
                  onClick={() => {
                    if (isValidMove) {
                      makeMove(isValidMove);
                      setHoveredMove(null);
                    }
                  }}
                >
                  {isFromTile && (
                    <div className="absolute inset-0 bg-red-500/20 border-4 border-dashed border-red-500 animate-pulse rounded z-30 flex flex-col items-center justify-center pointer-events-none select-none">
                      <span className="text-[8px] font-black tracking-widest text-white bg-red-600 px-1 py-0.5 rounded shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
                        DE
                      </span>
                    </div>
                  )}

                  {isToTile && (
                    <div className="absolute inset-0 bg-green-500/20 border-4 border-solid border-green-500 animate-pulse rounded z-30 flex flex-col items-center justify-center pointer-events-none select-none">
                      <span className="text-[8px] font-black tracking-widest text-white bg-green-600 px-1 py-0.5 rounded shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
                        PARA
                      </span>
                    </div>
                  )}

                  {piece && (
                    <motion.div 
                      animate={{
                        scale: 1,
                        opacity: isCapturedByHover ? 0.4 : 1,
                      }}
                      transition={{
                        duration: 0
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isSpectator) return;
                        playSelectSound();
                        selectPiece(piece.id);
                      }}
                      className={cn(
                        "w-[80%] h-[80%] rounded-full cursor-pointer flex items-center justify-center absolute transition-all duration-200 overflow-hidden",
                        isHintPiece && cn(
                          isOrangeHint 
                            ? "shadow-[0_0_15px_#FF8C00,0_0_30px_#FF8C00] ring-2 ring-[#FF8C00]" 
                            : "shadow-[0_0_15px_#39FF14,0_0_30px_#39FF14] ring-2 ring-[#39FF14]",
                          "z-20"
                        ),
                        currentPieceStyle === '3d' && !currentFlatMode 
                          ? cn(
                              "shadow-[0_6px_0_rgba(0,0,0,0.4),0_10px_15px_rgba(0,0,0,0.3)] border-t border-white/20",
                              piece.type === 'king' && "shadow-[0_12px_0_rgba(0,0,0,0.5),0_18px_25px_rgba(0,0,0,0.4)] -translate-y-1",
                              isHintPiece && cn(
                                "shadow-[0_6px_0_rgba(0,0,0,0.4)]",
                                isOrangeHint ? "shadow-[0_0_20px_#FF8C00]" : "shadow-[0_0_20px_#39FF14]"
                              )
                            )
                          : "shadow-none border-0"
                      )}
                      style={{ 
                        background: (() => {
                          const isMyPiece = piece.player === userColor || (userColor === null && piece.player === 'white');
                          const collectionId = useRemoteSettings
                            ? (isMyPiece ? gameVisualSettings.myPieceCollectionId : gameVisualSettings.opponentPieceCollectionId)
                            : (isMyPiece ? settings.myPieceCollectionId : settings.opponentPieceCollectionId);
                          
                          const collection = PIECE_COLLECTIONS.find(c => c.id === collectionId);
                          if (collection?.isSpecial) {
                            return 'transparent';
                          }

                          return currentPieceStyle === '3d' && !currentFlatMode
                            ? `radial-gradient(circle at 30% 30%, ${piece.player === 'white' ? '#fff' : '#444'} 0%, ${piece.player === 'white' ? currentWhitePieceColor : currentBlackPieceColor} 70%)`
                            : piece.player === 'white' ? currentWhitePieceColor : currentBlackPieceColor;
                        })(),
                        borderColor: piece.player === 'white' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'
                      }}
                    >
                      {(() => {
                        const isMyPiece = piece.player === userColor || (userColor === null && piece.player === 'white');
                        const collectionId = useRemoteSettings
                          ? (isMyPiece ? gameVisualSettings.myPieceCollectionId : gameVisualSettings.opponentPieceCollectionId)
                          : (isMyPiece ? settings.myPieceCollectionId : settings.opponentPieceCollectionId);
                        
                        const collection = PIECE_COLLECTIONS.find(c => c.id === collectionId);
                        if (collection?.isSpecial) {
                          return <FlagPiece id={collectionId} isKing={piece.type === 'king'} />;
                        }
                        return null;
                      })()}
                      {currentPieceStyle === '3d' && !currentFlatMode && (() => {
                        const isMyPiece = piece.player === userColor || (userColor === null && piece.player === 'white');
                        const collectionId = useRemoteSettings
                          ? (isMyPiece ? gameVisualSettings.myPieceCollectionId : gameVisualSettings.opponentPieceCollectionId)
                          : (isMyPiece ? settings.myPieceCollectionId : settings.opponentPieceCollectionId);
                        const collection = PIECE_COLLECTIONS.find(c => c.id === collectionId);
                        if (collection?.isSpecial) return null;
                        return (
                          <div className={cn(
                            "absolute inset-[15%] rounded-full border-2 border-black/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]",
                            piece.type === 'king' && "border-black/20"
                          )} />
                        );
                      })()}
                      {piece.type === 'king' && currentPieceStyle === '3d' && !currentFlatMode && (
                        <div className="absolute inset-0 rounded-full border-b-4 border-black/20 translate-y-[3px]" />
                      )}
                      {isCapturedByHover && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute inset-0 flex items-center justify-center text-red-500 z-10"
                        >
                          <Skull size={24} className="drop-shadow-lg" />
                        </motion.div>
                      )}
                      {currentShowContrastCircle && piece.type !== 'king' && (
                        <div 
                          className={cn(
                            "w-1/2 h-1/2 rounded-full border-2 opacity-40",
                            piece.player === 'white' ? "border-black" : "border-white"
                          )} 
                        />
                      )}
                      {piece.type === 'king' && (() => {
                        const isMyPiece = piece.player === userColor || (userColor === null && piece.player === 'white');
                        const stickerId = useRemoteSettings 
                          ? (isMyPiece ? gameVisualSettings.myQueenStickerId : gameVisualSettings.opponentQueenStickerId)
                          : (isMyPiece ? settings.myQueenStickerId : settings.opponentQueenStickerId);
                        const finalStickerId = stickerId || 'default';
                        const sticker = QUEEN_STICKERS.find(s => s.id === finalStickerId) || QUEEN_STICKERS[0];
                        const Icon = sticker.icon;
                        return <Icon size={16} className={piece.player === 'white' ? "text-yellow-600" : "text-yellow-500"} />;
                      })()}
                    </motion.div>
                  )}
                  {isValidMove && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={cn(
                        "w-4 h-4 rounded-full transition-all duration-200 absolute",
                        hoveredMove === isValidMove ? "bg-yellow-400 scale-150 shadow-[0_0_10px_rgba(250,204,21,0.8)]" : "bg-yellow-500/50"
                      )} 
                    />
                  )}
                  {isHintMove && !isValidMove && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.6 }}
                      className={cn(
                        "w-3 h-3 rounded-full absolute",
                        isOrangeHint ? "bg-[#FF8C00]/40 shadow-[0_0_8px_#FF8C00]" : "bg-[#39FF14]/40 shadow-[0_0_8px_#39FF14]"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* New Bottom Controls Bar under the Board */}
          {!winner && (
            <div className="mt-4 flex items-start justify-between w-full relative min-h-[140px] px-1">
              
              {/* Left Side: Buttons (Emoji, Emote, Chat Messages) */}
              <div className="flex items-center gap-2 relative z-50">
                
                {/* Emoji Selector */}
                <div className="relative">
                  <button 
                    onClick={() => { 
                      playClick(); 
                      setIsEmojiSelectorOpen(!isEmojiSelectorOpen);
                      setIsEmoteSelectorOpen(false);
                    }}
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-all border-b-4 shadow-xl active:scale-95 active:translate-y-[2px]",
                      isEmojiSelectorOpen ? "bg-yellow-600 border-yellow-800" : "bg-blue-600 border-blue-800 hover:bg-blue-500"
                    )}
                    title="Emojis"
                  >
                    <Smile size={24} className="text-white" />
                  </button>

                  <AnimatePresence>
                    {isEmojiSelectorOpen && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                        className="absolute bottom-14 left-0 bg-black/95 backdrop-blur-xl p-3 rounded-2xl border border-white/10 grid grid-cols-4 gap-2 shadow-2xl z-50 min-w-[160px]"
                      >
                        {EMOTES.filter(e => (profile.ownedEmotes || []).includes(e.id)).map(emote => (
                          <button 
                            key={emote.id}
                            onClick={() => { playClick(); showEmote(emote); setIsEmojiSelectorOpen(false); }}
                            className="text-2xl hover:scale-125 transition-transform p-1 flex items-center justify-center bg-white/5 rounded-lg hover:bg-white/10"
                          >
                            {emote.emoji}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Animated Emotes Selector */}
                <div className="relative">
                  <button 
                    onClick={() => { 
                      playClick(); 
                      setIsEmoteSelectorOpen(!isEmoteSelectorOpen);
                      setIsEmojiSelectorOpen(false);
                    }}
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-all border-b-4 shadow-xl active:scale-95 active:translate-y-[2px]",
                      isEmoteSelectorOpen ? "bg-yellow-600 border-yellow-800" : "bg-indigo-600 border-indigo-800 hover:bg-indigo-500"
                    )}
                    title="Emotes Animados"
                  >
                    <PlayCircle size={24} className="text-white" />
                  </button>

                  <AnimatePresence>
                    {isEmoteSelectorOpen && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                        className="absolute bottom-14 left-0 bg-black/95 backdrop-blur-xl p-3 rounded-2xl border border-white/10 grid grid-cols-2 gap-2 shadow-2xl z-50 min-w-[140px]"
                      >
                        {ANIMATED_EMOTES.filter(e => (profile.ownedEmotes || []).includes(e.id)).map(emote => (
                          <button 
                            key={emote.id}
                            onClick={() => { playClick(); showEmote(emote); setIsEmoteSelectorOpen(false); }}
                            className="text-2xl hover:scale-125 transition-transform p-1 flex items-center justify-center bg-white/5 rounded-lg hover:bg-white/10"
                          >
                            <div className="w-10 h-10 flex items-center justify-center bg-black/20 rounded-lg relative overflow-hidden">
                              <video 
                                src={emote.video} 
                                autoPlay 
                                loop 
                                muted 
                                playsInline 
                                className="w-full h-full object-contain" 
                              />
                            </div>
                          </button>
                        ))}
                        {ANIMATED_EMOTES.filter(e => (profile.ownedEmotes || []).includes(e.id)).length === 0 && (
                          <div className="col-span-2 text-[10px] text-white/40 text-center py-2 px-1">
                            Sem emotes<br/>animados
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Messages (Chat Toggle) Button */}
                <button 
                  onClick={() => {
                    playClick();
                    setIsChatOpen(!isChatOpen);
                  }}
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all border-b-4 shadow-xl active:scale-95 active:translate-y-[2px]",
                    isChatOpen ? "bg-yellow-600 border-yellow-800" : "bg-teal-600 border-teal-800 hover:bg-teal-500"
                  )}
                  title="Mensagens (Chat)"
                >
                  <MessageSquare size={24} className="text-white" />
                </button>

              </div>

              {/* Right Side: Messages Display (Notifications) - aligned bottom-right, not exceeding the board */}
              <div className="flex flex-col items-end gap-2 overflow-hidden max-h-[140px] max-w-[60%] pointer-events-none pr-1">
                <AnimatePresence initial={false}>
                  {[...notifications].reverse().slice(0, 3).map((notif) => (
                    <motion.div
                      key={notif.id}
                      layout
                      initial={{ opacity: 0, x: 50, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 50, scale: 0.8, transition: { duration: 0.2 } }}
                      className={cn(
                        "px-3 py-1.5 rounded-2xl backdrop-blur-md border shadow-lg flex items-center gap-2 shrink-0 pointer-events-auto max-w-full",
                        notif.type === 'message' ? "bg-black/80 border-white/10" : "bg-yellow-600/80 border-yellow-500/30"
                      )}
                    >
                      <span className="text-[10px] font-black uppercase text-yellow-500 truncate shrink-0 max-w-[60px]">
                        {notif.senderName}:
                      </span>
                      {notif.type === 'message' ? (
                        <span className="text-xs font-semibold text-white truncate max-w-[120px] sm:max-w-[180px]">
                          {notif.content}
                        </span>
                      ) : (
                        <span className="text-xl shrink-0">{notif.content}</span>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

            </div>
          )}
        </div>
      </div>

      {winner && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-[100] p-8 text-center">
          {winner === 'draw' ? (
            <Info size={80} className="text-blue-400 mb-4" />
          ) : (
            <Trophy size={80} className="text-yellow-500 mb-4" />
          )}
          <h2 className="text-4xl font-black italic text-white mb-2">
            {winner === 'draw' ? 'EMPATE!' : 'VITÓRIA!'}
          </h2>
          <p className="text-xl text-white/80 mb-8">
            {winner === 'draw' 
              ? 'O jogo terminou empatado.' 
              : `As ${winner === 'white' ? 'Brancas' : 'Pretas'} venceram o jogo.`}
          </p>
          <div className="flex flex-col gap-3 w-full max-w-[240px]">
            <button 
              onClick={initBoard}
              className="w-full py-4 bg-yellow-600 rounded-xl font-black italic text-xl shadow-lg active:scale-95 transition-all uppercase tracking-widest border-b-4 border-yellow-800"
            >
              Jogar Novamente
            </button>
            <button 
              onClick={onBack}
              className="w-full py-4 bg-white/10 border border-white/20 rounded-xl font-black italic text-xl shadow-lg active:scale-95 transition-all uppercase tracking-widest"
            >
              Início
            </button>
          </div>
        </div>
      )}

      {!winner && (
        <Chat 
          gameId={gameId} 
          profile={profile} 
          isOpen={isChatOpen} 
          onToggle={() => {
            playClick();
            setIsChatOpen(!isChatOpen);
          }} 
        />
      )}

      {/* Confirmation Modals */}
      <AnimatePresence>
        {isResignModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 p-6 rounded-2xl max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Flag size={32} className="text-red-500" />
              </div>
              <h3 className="text-xl font-black uppercase italic text-white mb-2">Desistir?</h3>
              <p className="text-white/60 text-sm mb-6">Tem certeza que deseja desistir da partida? O oponente será declarado vencedor.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsResignModalOpen(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    setIsResignModalOpen(false);
                    setHasResigned(true);
                    setWinner(turn === 'white' ? 'black' : 'white');
                  }}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors shadow-lg shadow-red-600/20"
                >
                  Desistir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isDrawModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 p-6 rounded-2xl max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={32} className="text-blue-500" />
              </div>
              <h3 className="text-xl font-black uppercase italic text-white mb-2">Pedir Empate?</h3>
              <p className="text-white/60 text-sm mb-6">Deseja realmente declarar empate nesta partida?</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDrawModalOpen(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={async () => {
                    setIsDrawModalOpen(false);
                    if (mode === 'multiplayer' && gameId && auth.currentUser) {
                      try {
                        await updateDoc(doc(db, 'games', gameId), {
                          drawRequest: {
                            from: auth.currentUser.uid,
                            senderName: profile.displayName || 'Oponente',
                            status: 'pending'
                          }
                        });
                        const id = 'draw_req_' + Date.now();
                        setNotifications(prev => [...prev, { id, type: 'message', content: 'Pedido de empate enviado...', senderName: 'Sistema', senderId: 'system' }]);
                        setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
                      } catch (error) {
                        handleFirestoreError(error, OperationType.UPDATE, `games/${gameId}`);
                      }
                    } else {
                      setWinner('draw');
                    }
                  }}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors shadow-lg shadow-blue-600/20"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {incomingDrawRequest && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 p-6 rounded-2xl max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={32} className="text-yellow-500" />
              </div>
              <h3 className="text-xl font-black uppercase italic text-white mb-2">Pedido de Empate</h3>
              <p className="text-white/60 text-sm mb-6">{incomingDrawRequest.senderName} está pedindo empate. Aceita?</p>
              <div className="flex gap-3">
                <button 
                  onClick={async () => {
                    if (!gameId) return;
                    try {
                      await updateDoc(doc(db, 'games', gameId), {
                        'drawRequest.status': 'declined'
                      });
                      setIncomingDrawRequest(null);
                    } catch (error) {
                      handleFirestoreError(error, OperationType.UPDATE, `games/${gameId}`);
                    }
                  }}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
                >
                  Recusar
                </button>
                <button 
                  onClick={async () => {
                    if (!gameId) return;
                    try {
                      await updateDoc(doc(db, 'games', gameId), {
                        winner: 'draw',
                        'drawRequest.status': 'accepted'
                      });
                      setIncomingDrawRequest(null);
                    } catch (error) {
                      handleFirestoreError(error, OperationType.UPDATE, `games/${gameId}`);
                    }
                  }}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors shadow-lg shadow-green-600/20"
                >
                  Aceitar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

function EquipmentScreen({ profile, updateProfile, onBack }: { profile: any, updateProfile: (data: any) => Promise<void>, onBack: () => void, key?: string }) {
  const [tab, setTab] = useState<'pieces' | 'stickers'>('pieces');
  
  return (
    <motion.div 
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      className="flex flex-col h-full bg-black/40 backdrop-blur-md relative z-10"
    >
      <div className="p-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2 bg-black/40 rounded-full"><ChevronLeft size={24} /></button>
        <h2 className="text-xl font-black italic">Equipamento</h2>
        <div className="w-10" />
      </div>

      <div className="flex p-4 gap-2 overflow-x-auto scrollbar-hide">
        <button 
          onClick={() => setTab('pieces')}
          className={cn("flex-shrink-0 px-6 py-2 rounded-lg font-bold transition-all", tab === 'pieces' ? "bg-yellow-600" : "bg-black/20")}
        >
          Peças
        </button>
        <button 
          onClick={() => setTab('stickers')}
          className={cn("flex-shrink-0 px-6 py-2 rounded-lg font-bold transition-all", tab === 'stickers' ? "bg-yellow-600" : "bg-black/20")}
        >
          Adesivos
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-4 pb-24">
        {tab === 'pieces' ? (
          Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-[#2a1a10] rounded-xl p-3 border border-white/5 flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-700 to-black border-2 border-white/10 shadow-lg flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-2 border-white/20" />
              </div>
              <span className="text-[10px] font-bold text-center">Slate {i + 1}</span>
              <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500 w-1/3" />
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 text-center py-12 text-white/40 italic">Em breve...</div>
        )}
      </div>
    </motion.div>
  );
}

function LuckyBoxScreen({ 
  profile, 
  updateProfile, 
  settings, 
  onUpdateSettings, 
  onBack,
  highlightItemId,
  onClearHighlight,
  onPreviewEmote,
  playClick
}: { 
  profile: any, 
  updateProfile: (data: any) => Promise<void>, 
  settings: GameSettings, 
  onUpdateSettings: (s: GameSettings) => void, 
  onBack: () => void,
  highlightItemId?: string | null,
  onClearHighlight?: () => void,
  onPreviewEmote?: (emote: any) => void,
  playClick: () => void,
  key?: string 
}) {
  const [luckyView, setLuckyView] = useState<'main' | 'backgrounds' | 'boards' | 'stickers' | 'emoji' | 'emotes' | 'pieces'>('main');
  const [stickerTarget, setStickerTarget] = useState<'my' | 'opponent'>('my');

  useEffect(() => {
    if (highlightItemId) {
      const timer = setTimeout(() => {
        onClearHighlight?.();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [highlightItemId, onClearHighlight]);

  return (
    <motion.div 
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      className="flex flex-col h-full bg-black/40 backdrop-blur-md relative z-10"
    >
      <div className="p-4 flex items-center justify-between">
        <button 
          onClick={luckyView === 'main' ? onBack : () => setLuckyView('main')} 
          className="p-2 bg-black/40 rounded-full"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-xl font-black italic">
          {luckyView === 'main' ? 'Caixa da Sorte' : 
           luckyView === 'backgrounds' ? 'Suas Estampas' :
           luckyView === 'boards' ? 'Temas de Tabuleiro' :
           luckyView === 'stickers' ? 'Adesivos de Dama' :
           luckyView === 'emoji' ? 'Seus Emoji' : 
           luckyView === 'pieces' ? 'Coleção de Peças' : 'Seus Emotes'}
        </h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {luckyView === 'main' ? (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-yellow-600 to-yellow-800 p-4 rounded-3xl shadow-2xl border-4 border-yellow-500 flex flex-col items-center gap-2 relative overflow-hidden mb-6">
              <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
              <Gift size={40} className="text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)] animate-bounce" />
              <div className="text-center">
                <h3 className="text-xl font-black italic uppercase tracking-tighter">SUA COLEÇÃO</h3>
                <p className="text-[10px] font-bold text-white/80">Personalize sua experiência!</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => setLuckyView('backgrounds')}
                className="bg-[#2a1a10] rounded-2xl p-4 border border-white/10 flex items-center gap-4 transition-all active:scale-95 hover:bg-[#3a2a20]"
              >
                <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center border border-yellow-500/20">
                  <Archive size={24} className="text-yellow-500" />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-sm font-black italic uppercase block">Estampas</span>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Fundo da Tela</span>
                </div>
                <ChevronLeft size={20} className="rotate-180 text-white/20" />
              </button>

              <button 
                onClick={() => setLuckyView('boards')}
                className="bg-[#2a1a10] rounded-2xl p-4 border border-white/10 flex items-center gap-4 transition-all active:scale-95 hover:bg-[#3a2a20]"
              >
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                  <MonitorOff size={24} className="text-blue-500" />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-sm font-black italic uppercase block">Temas de Tabuleiro</span>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Cores das Casas</span>
                </div>
                <ChevronLeft size={20} className="rotate-180 text-white/20" />
              </button>

              <button 
                onClick={() => setLuckyView('pieces')}
                className="bg-[#2a1a10] rounded-2xl p-4 border border-white/10 flex items-center gap-4 transition-all active:scale-95 hover:bg-[#3a2a20]"
              >
                <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center border border-orange-500/20">
                  <div className="relative flex items-center">
                    <div className="w-5 h-5 rounded-full bg-white border border-black/20 shadow-sm z-10" />
                    <div className="w-5 h-5 rounded-full bg-black border border-white/20 shadow-sm -ml-2" />
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <span className="text-sm font-black italic uppercase block">Coleção de Peças</span>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Cores das Peças</span>
                </div>
                <ChevronLeft size={20} className="rotate-180 text-white/20" />
              </button>

              <button 
                onClick={() => setLuckyView('stickers')}
                className="bg-[#2a1a10] rounded-2xl p-4 border border-white/10 flex items-center gap-4 transition-all active:scale-95 hover:bg-[#3a2a20]"
              >
                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20">
                  <Crown size={24} className="text-purple-500" />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-sm font-black italic uppercase block">Adesivos de Dama</span>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Ícone da Dama</span>
                </div>
                <ChevronLeft size={20} className="rotate-180 text-white/20" />
              </button>

              <button 
                onClick={() => setLuckyView('emoji')}
                className="bg-[#2a1a10] rounded-2xl p-4 border border-white/10 flex items-center gap-4 transition-all active:scale-95 hover:bg-[#3a2a20]"
              >
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center border border-green-500/20">
                  <span className="text-2xl">😊</span>
                </div>
                <div className="flex-1 text-left">
                  <span className="text-sm font-black italic uppercase block">Emoji</span>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Reações Estáticas</span>
                </div>
                <ChevronLeft size={20} className="rotate-180 text-white/20" />
              </button>

              <button 
                onClick={() => setLuckyView('emotes')}
                className="bg-[#2a1a10] rounded-2xl p-4 border border-white/10 flex items-center gap-4 transition-all active:scale-95 hover:bg-[#3a2a20]"
              >
                <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20">
                  <PlayCircle size={24} className="text-red-500" />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-sm font-black italic uppercase block">Emotes</span>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Reações Animadas</span>
                </div>
                <ChevronLeft size={20} className="rotate-180 text-white/20" />
              </button>
            </div>
          </div>
        ) : luckyView === 'backgrounds' ? (
          <div className="grid grid-cols-2 gap-4">
            {BACKGROUNDS.filter(bg => (profile.ownedBackgroundIds || []).includes(bg.id)).map((bg) => (
              <button 
                key={bg.id} 
                onClick={() => updateProfile({ selectedBackgroundId: bg.id })}
                className={cn(
                  "bg-[#2a1a10] rounded-2xl p-4 border-2 transition-all relative overflow-hidden group",
                  profile.selectedBackgroundId === bg.id ? "border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]" : "border-white/5",
                  highlightItemId === bg.id && "border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.5)] scale-105 z-10"
                )}
              >
                {highlightItemId === bg.id && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-green-500/10 pointer-events-none"
                  />
                )}
                <div className={cn("w-full aspect-video rounded-xl mb-3 shadow-lg overflow-hidden relative", bg.color)}>
                  <img src={bg.image} alt={bg.name} className="w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-500" />
                  {profile.selectedBackgroundId === bg.id && (
                    <div className="absolute inset-0 bg-yellow-500/20 flex items-center justify-center">
                      <Zap size={32} className="text-yellow-500 fill-yellow-500" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-xs font-black uppercase italic tracking-tighter">{bg.name}</span>
                  {profile.selectedBackgroundId === bg.id ? (
                    <span className="text-[10px] font-black text-yellow-500 uppercase flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
                      Equipado
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-white/40 uppercase">Toque para usar</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : luckyView === 'boards' ? (
          <div className="grid grid-cols-3 gap-4">
            {BOARD_THEMES.filter(theme => (profile.ownedBoardStyles || []).includes(theme.id)).map((theme) => (
              <button
                key={theme.id}
                onClick={() => { 
                  onUpdateSettings({ 
                    ...settings, 
                    boardStyle: theme.id as any 
                  }); 
                }}
                className={cn(
                  "flex-shrink-0 w-full aspect-square rounded-2xl border-2 transition-all relative",
                  settings.boardStyle === theme.id 
                    ? "border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)] scale-105" 
                    : "border-white/10 hover:border-white/20",
                  highlightItemId === theme.id && "border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.5)] scale-110 z-10"
                )}
              >
                {highlightItemId === theme.id && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute -top-2 -left-2 bg-yellow-500 rounded-full p-1 shadow-lg z-20"
                  >
                    <Sparkles size={12} className="text-black" />
                  </motion.div>
                )}
                <div className="w-full h-full rounded-[14px] overflow-hidden grid grid-cols-2 grid-rows-2">
                  <div className={cn("w-full h-full", theme.light)} />
                  <div className={cn("w-full h-full", theme.dark)} />
                  <div className={cn("w-full h-full", theme.dark)} />
                  <div className={cn("w-full h-full", theme.light)} />
                </div>
                {settings.boardStyle === theme.id && (
                  <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1 shadow-lg">
                    <Zap size={10} className="text-white fill-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : luckyView === 'pieces' ? (
          <div className="space-y-6">
            <div className="flex bg-black/40 rounded-xl p-1">
              <button 
                onClick={() => setStickerTarget('my')}
                className={cn(
                  "flex-1 py-2 rounded-lg text-[10px] font-bold transition-all",
                  stickerTarget === 'my' ? "bg-green-600 text-white shadow-lg" : "text-white/40 hover:text-white/60"
                )}
              >
                Minhas Peças
              </button>
              <button 
                onClick={() => setStickerTarget('opponent')}
                className={cn(
                  "flex-1 py-2 rounded-lg text-[10px] font-bold transition-all",
                  stickerTarget === 'opponent' ? "bg-green-600 text-white shadow-lg" : "text-white/40 hover:text-white/60"
                )}
              >
                Peças do Adversário
              </button>
            </div>

            {/* Círculo de Contraste */}
            <div className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5">
              <div className="space-y-0.5">
                <span className="text-xs font-black uppercase text-white/80 tracking-wider block">{t('contrastCircle', settings.language)}</span>
                <span className="text-[9px] text-white/40 uppercase font-bold tracking-wider">Destacar centro das peças</span>
              </div>
              <Toggle 
                active={settings.showContrastCircle} 
                onToggle={() => onUpdateSettings({ ...settings, showContrastCircle: !settings.showContrastCircle })} 
                playClick={playClick}
              />
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Cores Disponíveis</p>
              <div className="grid grid-cols-4 gap-3">
                 {PIECE_COLLECTIONS.find(c => c.id === 'default')?.colors?.map((color) => {
                  const isSelected = stickerTarget === 'my' 
                    ? settings.myPieceColor === color && settings.myPieceCollectionId === 'default'
                    : settings.opponentPieceColor === color && settings.opponentPieceCollectionId === 'default';
                  
                  const isColorOwned = color === '#ffffff' || color === '#000000' || (profile?.ownedPieceColors || []).includes(color);
                  
                  return (
                    <button
                      key={color}
                      onClick={() => {
                        if (!isColorOwned) {
                          toast.error("Esta cor está bloqueada. Compre-a na loja por 50 moedas!");
                          return;
                        }
                        onUpdateSettings({ 
                          ...settings, 
                          [stickerTarget === 'my' ? 'myPieceColor' : 'opponentPieceColor']: color,
                          [stickerTarget === 'my' ? 'myPieceCollectionId' : 'opponentPieceCollectionId']: 'default'
                        });
                      }}
                      className={cn(
                        "aspect-square rounded-2xl border-2 transition-all relative flex items-center justify-center",
                        !isColorOwned && "opacity-60",
                        isSelected 
                          ? "border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] scale-110" 
                          : "border-white/10 hover:border-white/20 bg-black/20"
                      )}
                    >
                      <div className="w-8 h-8 rounded-full shadow-lg relative flex items-center justify-center" style={{ backgroundColor: color }}>
                        {!isColorOwned && (
                          <Lock size={12} className="text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" />
                        )}
                      </div>
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5 shadow-lg">
                          <Zap size={8} className="text-white fill-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {(profile.ownedPieceCollections || []).length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Edições Especiais</p>
                <div className="grid grid-cols-4 gap-3">
                  {PIECE_COLLECTIONS.filter(c => (profile.ownedPieceCollections || []).includes(c.id)).map((collection) => {
                    const isSelected = stickerTarget === 'my' 
                      ? settings.myPieceCollectionId === collection.id 
                      : settings.opponentPieceCollectionId === collection.id;
                    
                    return (
                      <button
                        key={collection.id}
                        onClick={() => onUpdateSettings({ 
                          ...settings, 
                          [stickerTarget === 'my' ? 'myPieceCollectionId' : 'opponentPieceCollectionId']: collection.id 
                        })}
                        className={cn(
                          "aspect-square rounded-2xl border-2 transition-all relative flex items-center justify-center overflow-hidden",
                          isSelected 
                            ? "border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] scale-110" 
                            : "border-white/10 hover:border-white/20 bg-black/20",
                          highlightItemId === collection.id && "border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.5)] scale-110 z-10"
                        )}
                      >
                        {collection.isSpecial && (
                          <div className="w-12 h-12 relative">
                            <FlagPiece id={collection.id} />
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                              <span className="text-[8px] font-black text-yellow-400 uppercase drop-shadow-md">{collection.name}</span>
                            </div>
                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                              <span className="text-[6px] font-bold text-blue-400 uppercase drop-shadow-sm">{collection.rarity}</span>
                            </div>
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5 shadow-lg z-20">
                            <Zap size={8} className="text-white fill-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : luckyView === 'stickers' ? (
          <div className="space-y-4">
            <div className="flex bg-black/40 rounded-xl p-1">
              <button 
                onClick={() => setStickerTarget('my')}
                className={cn(
                  "flex-1 py-2 rounded-lg text-[10px] font-bold transition-all",
                  stickerTarget === 'my' ? "bg-green-600 text-white shadow-lg" : "text-white/40 hover:text-white/60"
                )}
              >
                Minhas Peças
              </button>
              <button 
                onClick={() => setStickerTarget('opponent')}
                className={cn(
                  "flex-1 py-2 rounded-lg text-[10px] font-bold transition-all",
                  stickerTarget === 'opponent' ? "bg-green-600 text-white shadow-lg" : "text-white/40 hover:text-white/60"
                )}
              >
                Peças do Adversário
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {QUEEN_STICKERS.filter(s => s.id === 'default' || (profile.ownedQueenStickerIds || []).includes(s.id)).map((sticker) => {
                const isSelected = stickerTarget === 'my' 
                  ? settings.myQueenStickerId === sticker.id 
                  : settings.opponentQueenStickerId === sticker.id;
                
                return (
                  <button 
                    key={sticker.id} 
                    onClick={() => onUpdateSettings({ 
                      ...settings, 
                      [stickerTarget === 'my' ? 'myQueenStickerId' : 'opponentQueenStickerId']: sticker.id 
                    })}
                    className={cn(
                      "bg-[#2a1a10] rounded-2xl p-4 border-2 transition-all flex flex-col items-center justify-center gap-2 relative",
                      isSelected ? "border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)] scale-105" : "border-white/5",
                      highlightItemId === sticker.id && "border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.5)] scale-110 z-10"
                    )}
                  >
                    {highlightItemId === sticker.id && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-1 shadow-lg z-20"
                      >
                        <Sparkles size={12} className="text-black" />
                      </motion.div>
                    )}
                    <sticker.icon size={32} className={cn(isSelected ? "text-green-500" : "text-white/60")} />
                    <span className="text-[10px] font-bold text-center">{sticker.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : luckyView === 'emoji' ? (
          <div className="grid grid-cols-4 gap-4">
            {EMOTES.filter(emote => (profile.ownedEmotes || []).includes(emote.id)).map((emote) => (
              <button 
                key={emote.id} 
                onClick={() => onPreviewEmote?.(emote)}
                className={cn(
                  "bg-[#2a1a10] rounded-2xl p-4 border-2 transition-all flex flex-col items-center justify-center gap-2 relative active:scale-95",
                  highlightItemId === emote.id ? "border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.5)] scale-110 z-10" : "border-white/5"
                )}
              >
                {highlightItemId === emote.id && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-1 shadow-lg z-20"
                  >
                    <Sparkles size={12} className="text-black" />
                  </motion.div>
                )}
                {emote.image ? (
                  <img 
                    src={emote.image} 
                    alt={emote.name} 
                    className="w-12 h-12 object-contain" 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/emote/48/48';
                    }}
                  />
                ) : (
                  <span className="text-3xl">{emote.emoji}</span>
                )}
                <span className="text-[10px] font-bold text-center">{emote.name}</span>
              </button>
            ))}
            {(!profile.ownedEmotes || profile.ownedEmotes.filter(id => EMOTES.some(e => e.id === id)).length === 0) && (
              <div className="col-span-4 text-center py-8 text-white/40 italic text-xs">
                Nenhum emoji adquirido. Vá até a loja para comprar!
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {ANIMATED_EMOTES.filter(emote => (profile.ownedEmotes || []).includes(emote.id)).map((emote) => (
              <button 
                key={emote.id} 
                onClick={() => onPreviewEmote?.(emote)}
                className={cn(
                  "bg-[#2a1a10] rounded-2xl p-4 border-2 transition-all flex flex-col items-center justify-center gap-2 relative active:scale-95",
                  highlightItemId === emote.id ? "border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.5)] scale-110 z-10" : "border-white/5"
                )}
              >
                {highlightItemId === emote.id && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-1 shadow-lg z-20"
                  >
                    <Sparkles size={12} className="text-black" />
                  </motion.div>
                )}
                <div className="w-16 h-16 flex items-center justify-center bg-black/20 rounded-lg relative overflow-hidden">
                  <video 
                    src={emote.video} 
                    autoPlay 
                    loop 
                    muted 
                    playsInline 
                    className="w-12 h-12 object-contain" 
                  />
                </div>
                <span className="text-[10px] font-bold text-center">{emote.name}</span>
              </button>
            ))}
            {(!profile.ownedEmotes || profile.ownedEmotes.filter(id => ANIMATED_EMOTES.some(e => e.id === id)).length === 0) && (
              <div className="col-span-4 text-center py-8 text-white/40 italic text-xs">
                Nenhum emote adquirido. Vá até a loja para comprar!
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StoreScreen({ profile, updateProfile, onBack, onNavigate, onHighlightItem, onPreviewEmote }: { profile: any, updateProfile: (data: any) => Promise<void>, onBack: () => void, onNavigate?: (s: Screen) => void, onHighlightItem?: (id: string) => void, onPreviewEmote?: (emote: any) => void, key?: string }) {
  const [openingReward, setOpeningReward] = useState<any>(null);
  const [storeView, setStoreView] = useState<'main' | 'emotes' | 'emoji' | 'backgrounds' | 'boards' | 'pieces' | 'stickers' | 'chests'>('main');

  const handleBuyBackground = async (bg: any) => {
    const ownedIds = profile.ownedBackgroundIds || [];
    
    if (profile.coins < bg.price) {
      toast.error("Saldo Insuficiente");
      return;
    }
    
    if (ownedIds.includes(bg.id)) {
      toast.info("Você já possui este fundo!");
      return;
    }

    await updateProfile({
      coins: profile.coins - bg.price,
      ownedBackgroundIds: [...ownedIds, bg.id],
      hasNewLuckyBoxItems: true
    });

    setOpeningReward({
      type: 'background',
      rewardId: bg.id,
      rewardName: bg.name,
      rewardIcon: (
        <div className={cn("w-20 h-20 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20", bg.color)}>
          <img src={bg.image} alt={bg.name} className="w-full h-full object-cover opacity-60" />
        </div>
      ),
      rewardTypeLabel: 'Estampa de Fundo'
    });
  };

  const handleBuyBoardTheme = async (theme: any) => {
    const ownedIds = profile.ownedBoardStyles || [];
    
    if (profile.coins < 100) {
      toast.error("Saldo Insuficiente");
      return;
    }
    
    if (ownedIds.includes(theme.id)) {
      toast.info("Você já possui este tema!");
      return;
    }

    await updateProfile({
      coins: profile.coins - 100,
      ownedBoardStyles: [...ownedIds, theme.id],
      hasNewLuckyBoxItems: true
    });

    setOpeningReward({
      type: 'board',
      rewardId: theme.id,
      rewardName: theme.label,
      rewardIcon: (
        <div className="w-20 h-20 rounded-2xl overflow-hidden grid grid-cols-2 grid-rows-2 shadow-2xl border-2 border-white/20">
          <div className={cn("w-full h-full", theme.light || "bg-gray-200")} />
          <div className={cn("w-full h-full", theme.dark || "bg-gray-800")} />
          <div className={cn("w-full h-full", theme.dark || "bg-gray-800")} />
          <div className={cn("w-full h-full", theme.light || "bg-gray-200")} />
        </div>
      ),
      rewardTypeLabel: 'Tema de Tabuleiro'
    });
  };

  const handleBuyPieceColor = async (item: any) => {
    const ownedColors = profile?.ownedPieceColors || ['#ffffff', '#000000'];
    
    if (profile.coins < item.price) {
      toast.error("Saldo Insuficiente");
      return;
    }
    
    if (ownedColors.includes(item.hex)) {
      toast.info("Você já possui esta cor!");
      return;
    }

    await updateProfile({
      coins: profile.coins - item.price,
      ownedPieceColors: [...ownedColors, item.hex],
      hasNewLuckyBoxItems: true
    });

    setOpeningReward({
      type: 'piece_color',
      rewardId: item.hex,
      rewardName: item.name,
      rewardIcon: (
        <div className="w-20 h-20 rounded-full flex items-center justify-center bg-black/40 border-2 border-white/20 shadow-2xl">
          <div className="w-16 h-16 rounded-full shadow-inner" style={{ backgroundColor: item.hex }} />
        </div>
      ),
      rewardTypeLabel: 'Cor de Peça'
    });
  };

  const handleBuyQueenSticker = async (sticker: any) => {
    const ownedStickers = profile?.ownedQueenStickerIds || ['default'];
    
    if (profile.gems < 20) {
      toast.error("Saldo Insuficiente");
      return;
    }
    
    if (ownedStickers.includes(sticker.id)) {
      toast.info("Você já possui este adesivo!");
      return;
    }

    await updateProfile({
      gems: profile.gems - 20,
      ownedQueenStickerIds: [...ownedStickers, sticker.id],
      hasNewLuckyBoxItems: true
    });

    const IconComp = sticker.icon;

    setOpeningReward({
      type: 'sticker',
      rewardId: sticker.id,
      rewardName: sticker.name,
      rewardIcon: (
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-black/40 border-2 border-white/20 shadow-2xl">
          <IconComp size={48} className="text-yellow-500" />
        </div>
      ),
      rewardTypeLabel: 'Adesivo de Dama'
    });
  };

  const handleBuyEmote = async (emote: any) => {
    const ownedIds = profile.ownedEmotes || [];
    
    if (ownedIds.includes(emote.id)) {
      toast.info("Você já possui este emote!");
      return;
    }

    if (emote.currency === 'coins') {
      if (profile.coins < emote.price) {
        toast.error("Saldo Insuficiente");
        return;
      }
      await updateProfile({
        coins: profile.coins - emote.price,
        ownedEmotes: [...ownedIds, emote.id],
        hasNewLuckyBoxItems: true
      });
    } else {
      if (profile.gems < emote.price) {
        toast.error("Saldo Insuficiente");
        return;
      }
      await updateProfile({
        gems: profile.gems - emote.price,
        ownedEmotes: [...ownedIds, emote.id],
        hasNewLuckyBoxItems: true
      });
    }

    onPreviewEmote?.(emote);

    setOpeningReward({
      type: 'emote',
      rewardId: emote.id,
      rewardName: emote.name,
      rewardIcon: (
        <div className="w-20 h-20 flex items-center justify-center bg-white/5 rounded-3xl border border-white/10 shadow-2xl">
          {emote.video ? (
            <video src={emote.video} autoPlay loop muted playsInline className="w-16 h-16 object-contain" />
          ) : emote.image ? (
            <img 
              src={emote.image} 
              alt={emote.name} 
              className="w-16 h-16 object-contain" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/emote/64/64';
              }}
            />
          ) : (
            <span className="text-6xl">{emote.emoji}</span>
          )}
        </div>
      ),
      rewardTypeLabel: 'Emote'
    });
  };

  const handleBuyChest = async (chest: any, currency?: 'coins' | 'gems') => {
    const selectedCurrency = currency || (chest.priceGems ? 'gems' : 'coins');
    
    if (selectedCurrency === 'gems') {
      if (profile.gems < (chest.priceGems || chest.price)) {
        toast.error("Saldo Insuficiente");
        return;
      }
    } else {
      if (profile.coins < (chest.priceCoins || chest.price)) {
        toast.error("Saldo Insuficiente");
        return;
      }
    }
    
    const ownedBoardStyles = profile.ownedBoardStyles || [];
    const ownedEmotes = profile.ownedEmotes || [];
    const ownedQueenStickerIds = profile.ownedQueenStickerIds || [];
    const ownedBackgroundIds = profile.ownedBackgroundIds || [];

    // Check if user already owns the reward if it's a specific reward chest
    if (chest.rewardId) {
      if (chest.rewardType === 'board' && ownedBoardStyles.includes(chest.rewardId)) {
        toast.info("Você já possui este tema!");
        return;
      }
      if (chest.rewardType === 'emote' && ownedEmotes.includes(chest.rewardId)) {
        toast.info("Você já possui este emote!");
        return;
      }
      if (chest.rewardType === 'sticker' && ownedQueenStickerIds.includes(chest.rewardId)) {
        toast.info("Você já possui este adesivo!");
        return;
      }
      if (chest.rewardType === 'background' && ownedBackgroundIds.includes(chest.rewardId)) {
        toast.info("Você já possui este fundo!");
        return;
      }
    }

    // Handle random reward if it's a multi-reward chest
    let finalReward = chest;
    if (chest.rewards) {
      // Filter out already owned rewards if possible, or just pick one
      const availableRewards = chest.rewards.filter((r: any) => {
        if (r.type === 'board') return !ownedBoardStyles.includes(r.id);
        if (r.type === 'emote') return !ownedEmotes.includes(r.id);
        if (r.type === 'sticker') return !ownedQueenStickerIds.includes(r.id);
        if (r.type === 'background') return !ownedBackgroundIds.includes(r.id);
        return true;
      });

      if (availableRewards.length === 0) {
        toast.info("Você já possui todos os itens deste baú!");
        return;
      }

      const randomIdx = Math.floor(Math.random() * availableRewards.length);
      const reward = availableRewards[randomIdx];
      finalReward = {
        ...chest,
        rewardId: reward.id,
        rewardName: reward.name,
        rewardType: reward.type
      };
    }

    const updateData: any = {
      hasNewLuckyBoxItems: true
    };

    if (selectedCurrency === 'gems') {
      updateData.gems = profile.gems - (chest.priceGems || chest.price);
    } else {
      updateData.coins = profile.coins - (chest.priceCoins || chest.price);
    }

    if (finalReward.rewardType === 'board') {
      updateData.ownedBoardStyles = [...ownedBoardStyles, finalReward.rewardId];
    } else if (finalReward.rewardType === 'emote') {
      updateData.ownedEmotes = [...ownedEmotes, finalReward.rewardId];
    } else if (finalReward.rewardType === 'sticker') {
      updateData.ownedQueenStickerIds = [...ownedQueenStickerIds, finalReward.rewardId];
    } else if (finalReward.rewardType === 'background') {
      updateData.ownedBackgroundIds = [...ownedBackgroundIds, finalReward.rewardId];
    } else if (finalReward.rewardType === 'piece_collection') {
      updateData.ownedPieceCollections = [...(profile.ownedPieceCollections || []), finalReward.rewardId];
    }

    await updateProfile(updateData);
    
    let rewardIcon;
    if (finalReward.rewardType === 'board') {
      const theme = BOARD_THEMES.find(t => t.id === finalReward.rewardId);
      rewardIcon = (
        <div className="w-20 h-20 rounded-2xl overflow-hidden grid grid-cols-2 grid-rows-2 shadow-2xl border-2 border-white/20">
          {theme && (
            <>
              <div className={cn("w-full h-full", theme.light)} />
              <div className={cn("w-full h-full", theme.dark)} />
              <div className={cn("w-full h-full", theme.dark)} />
              <div className={cn("w-full h-full", theme.light)} />
            </>
          )}
        </div>
      );
    } else if (finalReward.rewardType === 'sticker') {
      const sticker = QUEEN_STICKERS.find(s => s.id === finalReward.rewardId);
      rewardIcon = (
        <div className="w-20 h-20 flex items-center justify-center bg-white/5 rounded-3xl border border-white/10 shadow-2xl">
          {sticker && <sticker.icon size={48} className="text-yellow-500" />}
        </div>
      );
    } else if (finalReward.rewardType === 'background') {
      const bg = BACKGROUNDS.find(b => b.id === finalReward.rewardId);
      rewardIcon = (
        <div className={cn("w-20 h-20 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20", bg?.color)}>
          <img src={bg?.image} alt={bg?.name} className="w-full h-full object-cover opacity-60" />
        </div>
      );
    } else if (finalReward.rewardType === 'piece_collection') {
      rewardIcon = (
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#009b3a] via-[#fedf00] to-[#002776] border-4 border-white/20 shadow-2xl flex items-center justify-center overflow-hidden">
          <div className="w-12 h-8 bg-[#009b3a] relative flex items-center justify-center">
            <div className="w-8 h-5 bg-[#fedf00] rotate-45 absolute" />
            <div className="w-4 h-4 bg-[#002776] rounded-full absolute" />
          </div>
        </div>
      );
    } else {
      const emote = [...EMOTES, ...ANIMATED_EMOTES].find(e => e.id === finalReward.rewardId);
      if (emote) {
        onPreviewEmote?.(emote);
      }
      rewardIcon = (
        <div className="w-20 h-20 flex items-center justify-center bg-white/5 rounded-3xl border border-white/10 shadow-2xl">
          {emote?.video ? (
            <video src={emote.video} autoPlay loop muted playsInline className="w-16 h-16 object-contain" />
          ) : emote?.image ? (
            <img 
              src={emote.image} 
              alt={emote.name} 
              className="w-16 h-16 object-contain" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/emote/64/64';
              }}
            />
          ) : (
            <span className="text-6xl">{emote?.emoji}</span>
          )}
        </div>
      );
    }

    setOpeningReward({
      type: 'chest',
      rewardId: finalReward.rewardId,
      rewardName: finalReward.rewardName,
      rewardIcon,
      rewardTypeLabel: finalReward.rewardType === 'board' ? 'Tema de Tabuleiro' : 
                       (finalReward.rewardType === 'sticker' ? 'Adesivo de Dama' : 
                       (finalReward.rewardType === 'background' ? 'Estampa de Fundo' : 
                       (finalReward.rewardType === 'piece_collection' ? 'Coleção de Peças' : 'Emote')))
    });
  };

  const handleBuyGems = async (gemPack: any) => {
    await updateProfile({
      gems: (profile.gems || 0) + gemPack.amount
    });

    setOpeningReward({
      type: 'gems',
      rewardId: gemPack.id,
      rewardName: `${gemPack.amount} Gemas`,
      rewardIcon: (
        <div className="w-20 h-20 flex items-center justify-center bg-blue-500/10 rounded-3xl border border-blue-500/20 shadow-2xl">
          <Gem size={60} className="text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]" />
        </div>
      ),
      rewardTypeLabel: 'Moeda Premium'
    });
  };

  const handleBuyCoinsPack = async (coinPack: any) => {
    if (profile.gems < coinPack.gemPrice) {
      toast.error("Saldo de Gemas Insuficiente!");
      return;
    }

    await updateProfile({
      gems: (profile.gems || 0) - coinPack.gemPrice,
      coins: (profile.coins || 0) + coinPack.amount
    });

    setOpeningReward({
      type: 'coins',
      rewardId: coinPack.id,
      rewardName: `${coinPack.amount.toLocaleString('pt-BR')} Moedas`,
      rewardIcon: (
        <div className="w-20 h-20 flex items-center justify-center bg-yellow-500/10 rounded-3xl border border-yellow-500/20 shadow-2xl">
          <Coins size={60} className="text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)] fill-yellow-400" />
        </div>
      ),
      rewardTypeLabel: 'Moeda Comum'
    });
  };

  return (
    <motion.div 
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      className="flex flex-col h-full bg-black/40 backdrop-blur-md relative z-10"
    >
      <AnimatePresence>
        {openingReward && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.5, y: 100 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-xs bg-gradient-to-b from-[#2a1a10] to-[#1a0f0a] rounded-[40px] border-4 border-yellow-500/50 p-8 flex flex-col items-center gap-6 shadow-[0_0_50px_rgba(234,179,8,0.3)] relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5" />
              
              {/* Flash Effect */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ delay: 0.4, duration: 0.3 }}
                className="absolute inset-0 z-20 bg-white"
              />

              <motion.div
                animate={{ 
                  rotate: [0, -15, 15, -15, 15, 0],
                  scale: [1, 1.2, 1.2, 1.2, 1.2, 1],
                  y: [0, -10, -10, -10, -10, 0]
                }}
                transition={{ duration: 0.6, times: [0, 0.2, 0.4, 0.6, 0.8, 1] }}
                className="relative"
              >
                <div className="absolute inset-0 bg-yellow-500 blur-3xl opacity-30 animate-pulse" />
                {openingReward.type === 'chest' ? (
                  <ShoppingBag size={120} className="text-yellow-500 relative z-10 drop-shadow-[0_0_20px_rgba(234,179,8,0.5)]" />
                ) : (
                  <Gift size={120} className="text-yellow-500 relative z-10 drop-shadow-[0_0_20px_rgba(234,179,8,0.5)]" />
                )}
                
                {/* Particles */}
                <AnimatePresence>
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, x: 0, y: 0 }}
                      animate={{ 
                        scale: [0, 1, 0],
                        x: (i % 2 === 0 ? 1 : -1) * (Math.random() * 100 + 50),
                        y: (i < 3 ? 1 : -1) * (Math.random() * 100 + 50),
                        rotate: 360
                      }}
                      transition={{ delay: 0.5, duration: 1 }}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-yellow-400"
                    >
                      <Sparkles size={20} fill="currentColor" />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-center space-y-2"
              >
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-yellow-500">
                  {openingReward.type === 'chest' ? 'Baú Aberto!' : 'Item Adquirido!'}
                </h3>
                <p className="text-xs font-bold text-white/60">Você desbloqueou um novo item:</p>
              </motion.div>

              <motion.div 
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.8, type: 'spring' }}
                className="bg-white/5 p-6 rounded-3xl border border-white/10 flex flex-col items-center gap-4 w-full"
              >
                {openingReward.rewardIcon}
                <div className="text-center">
                  <span className="text-lg font-black italic uppercase tracking-tighter block">{openingReward.rewardName}</span>
                  <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest flex items-center justify-center gap-1">
                    <Sparkles size={10} /> {openingReward.rewardTypeLabel}
                  </span>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-2xl w-full text-center"
              >
                <p className="text-[10px] font-bold text-yellow-500 uppercase leading-tight">
                  {openingReward.type === 'gems' 
                    ? 'Suas gemas foram adicionadas ao seu saldo!' 
                    : openingReward.type === 'coins'
                    ? 'Suas moedas foram adicionadas ao seu saldo!'
                    : 'Este item já está disponível na sua Caixa da Sorte para ser equipado!'}
                </p>
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 }}
                onClick={() => {
                  setOpeningReward(null);
                }}
                className="w-full py-4 bg-yellow-500 text-black font-black italic uppercase tracking-tighter rounded-2xl shadow-lg shadow-yellow-500/20 active:scale-95 transition-transform cursor-pointer relative z-30"
              >
                Confirmar Coleta
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 flex items-center justify-between">
        <button 
          onClick={storeView === 'main' ? onBack : () => setStoreView('main')} 
          className="p-2 bg-black/40 rounded-full"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-xl font-black italic">
          {storeView === 'main' ? 'Loja' : 
           storeView === 'emotes' ? 'Coleção de Emotes' : 
           storeView === 'emoji' ? 'Coleção de Emoji' :
           storeView === 'backgrounds' ? 'Estampas de Fundo' :
           storeView === 'boards' ? 'Temas de Tabuleiro' :
           storeView === 'pieces' ? 'Estilos de Peças' :
           storeView === 'stickers' ? 'Adesivos de Dama' :
           'Baús Premium'}
        </h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        {storeView === 'main' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Elegant Header Card/Banner for the Shop */}
            <div className="bg-gradient-to-r from-[#2a1a10] to-[#1e130b] border border-yellow-500/10 rounded-3xl p-6 flex items-center justify-between shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5" />
              <div className="space-y-1 relative z-10">
                <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest block">Bem-vindo à</span>
                <h3 className="text-2xl font-black italic uppercase text-white tracking-tight">Loja de Itens</h3>
                <p className="text-xs text-white/50">Personalize seu jogo de damas!</p>
              </div>
              <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center border border-yellow-500/20 shadow-lg relative z-10">
                <ShoppingBag size={32} className="text-yellow-500 animate-pulse" />
              </div>
            </div>

            <section>
              <h3 className="text-sm font-bold uppercase tracking-widest text-yellow-500 mb-4">Coleções & Categorias</h3>
              <div className="grid grid-cols-2 gap-4">
                {/* 1. Emotes Animados */}
                <motion.button 
                  whileHover={{ scale: 1.02, translateY: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStoreView('emotes')}
                  className="bg-gradient-to-b from-[#2d1e14] to-[#1e130b] border border-yellow-500/20 rounded-2xl p-5 flex flex-col items-center gap-3 text-center transition-all duration-200 shadow-lg shadow-black/30 hover:border-yellow-500/50 hover:shadow-[0_0_15px_rgba(234,179,8,0.1)] relative overflow-hidden group"
                >
                  <div className="absolute -inset-px bg-gradient-to-b from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                  <div className="w-14 h-14 bg-yellow-500/5 rounded-full flex items-center justify-center border border-yellow-500/10 shadow-inner relative overflow-hidden group-hover:bg-yellow-500/10 group-hover:border-yellow-500/20 transition-all">
                    <video 
                      src="https://drive.google.com/uc?id=1yFVkeApaQW_2vAzfL4p0aRWEe3mhrC0K" 
                      autoPlay 
                      loop 
                      muted 
                      playsInline 
                      className="w-10 h-10 object-contain opacity-80 group-hover:opacity-100 transition-opacity" 
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-black italic uppercase tracking-wider block text-white/90 group-hover:text-yellow-400 transition-colors">Emotes Animados</span>
                    <span className="text-[9px] font-bold text-yellow-500/70 uppercase tracking-widest block">Gemas Premium</span>
                  </div>
                </motion.button>

                {/* 2. Emojis Clássicos */}
                <motion.button 
                  whileHover={{ scale: 1.02, translateY: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStoreView('emoji')}
                  className="bg-gradient-to-b from-[#2d1e14] to-[#1e130b] border border-yellow-500/20 rounded-2xl p-5 flex flex-col items-center gap-3 text-center transition-all duration-200 shadow-lg shadow-black/30 hover:border-yellow-500/50 hover:shadow-[0_0_15px_rgba(234,179,8,0.1)] relative overflow-hidden group"
                >
                  <div className="absolute -inset-px bg-gradient-to-b from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                  <div className="w-14 h-14 bg-yellow-500/5 rounded-full flex items-center justify-center border border-yellow-500/10 shadow-inner group-hover:bg-yellow-500/10 group-hover:border-yellow-500/20 transition-all text-2xl">
                    😊
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-black italic uppercase tracking-wider block text-white/90 group-hover:text-yellow-400 transition-colors">Emojis Clássicos</span>
                    <span className="text-[9px] font-bold text-yellow-500/70 uppercase tracking-widest block">Moedas / Gemas</span>
                  </div>
                </motion.button>

                {/* 3. Estampas de Fundo */}
                <motion.button 
                  whileHover={{ scale: 1.02, translateY: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStoreView('backgrounds')}
                  className="bg-gradient-to-b from-[#2d1e14] to-[#1e130b] border border-yellow-500/20 rounded-2xl p-5 flex flex-col items-center gap-3 text-center transition-all duration-200 shadow-lg shadow-black/30 hover:border-yellow-500/50 hover:shadow-[0_0_15px_rgba(234,179,8,0.1)] relative overflow-hidden group"
                >
                  <div className="absolute -inset-px bg-gradient-to-b from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                  <div className="w-14 h-14 bg-yellow-500/5 rounded-full flex items-center justify-center border border-yellow-500/10 shadow-inner group-hover:bg-yellow-500/10 group-hover:border-yellow-500/20 transition-all text-yellow-500 flex items-center justify-center">
                    <Sparkles size={24} />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-black italic uppercase tracking-wider block text-white/90 group-hover:text-yellow-400 transition-colors">Estampas de Fundo</span>
                    <span className="text-[9px] font-bold text-yellow-500/70 uppercase tracking-widest block">Moedas Comuns</span>
                  </div>
                </motion.button>

                {/* 4. Temas de Tabuleiro */}
                <motion.button 
                  whileHover={{ scale: 1.02, translateY: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStoreView('boards')}
                  className="bg-gradient-to-b from-[#2d1e14] to-[#1e130b] border border-yellow-500/20 rounded-2xl p-5 flex flex-col items-center gap-3 text-center transition-all duration-200 shadow-lg shadow-black/30 hover:border-yellow-500/50 hover:shadow-[0_0_15px_rgba(234,179,8,0.1)] relative overflow-hidden group"
                >
                  <div className="absolute -inset-px bg-gradient-to-b from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                  <div className="w-14 h-14 bg-yellow-500/5 rounded-full flex items-center justify-center border border-yellow-500/10 shadow-inner group-hover:bg-yellow-500/10 group-hover:border-yellow-500/20 transition-all text-yellow-500 flex items-center justify-center">
                    <div className="w-6 h-6 rounded overflow-hidden grid grid-cols-2 grid-rows-2 border border-white/20">
                      <div className="bg-[#e4a853] w-full h-full" />
                      <div className="bg-[#7d481b] w-full h-full" />
                      <div className="bg-[#7d481b] w-full h-full" />
                      <div className="bg-[#e4a853] w-full h-full" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-black italic uppercase tracking-wider block text-white/90 group-hover:text-yellow-400 transition-colors">Temas do Tabuleiro</span>
                    <span className="text-[9px] font-bold text-yellow-500/70 uppercase tracking-widest block">Moedas Comuns</span>
                  </div>
                </motion.button>

                {/* 5. Adesivos de Dama */}
                <motion.button 
                  whileHover={{ scale: 1.02, translateY: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStoreView('stickers')}
                  className="bg-gradient-to-b from-[#2d1e14] to-[#1e130b] border border-yellow-500/20 rounded-2xl p-5 flex flex-col items-center gap-3 text-center transition-all duration-200 shadow-lg shadow-black/30 hover:border-yellow-500/50 hover:shadow-[0_0_15px_rgba(234,179,8,0.1)] relative overflow-hidden group"
                >
                  <div className="absolute -inset-px bg-gradient-to-b from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                  <div className="w-14 h-14 bg-yellow-500/5 rounded-full flex items-center justify-center border border-yellow-500/10 shadow-inner group-hover:bg-yellow-500/10 group-hover:border-yellow-500/20 transition-all text-yellow-500 flex items-center justify-center">
                    <Crown size={24} />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-black italic uppercase tracking-wider block text-white/90 group-hover:text-yellow-400 transition-colors">Adesivos de Dama</span>
                    <span className="text-[9px] font-bold text-yellow-500/70 uppercase tracking-widest block">Gemas Premium</span>
                  </div>
                </motion.button>

                {/* 6. Peças & Coleções */}
                <motion.button 
                  whileHover={{ scale: 1.02, translateY: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStoreView('pieces')}
                  className="bg-gradient-to-b from-[#2d1e14] to-[#1e130b] border border-yellow-500/20 rounded-2xl p-5 flex flex-col items-center gap-3 text-center transition-all duration-200 shadow-lg shadow-black/30 hover:border-yellow-500/50 hover:shadow-[0_0_15px_rgba(234,179,8,0.1)] relative overflow-hidden group"
                >
                  <div className="absolute -inset-px bg-gradient-to-b from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                  <div className="w-14 h-14 bg-yellow-500/5 rounded-full flex items-center justify-center border border-yellow-500/10 shadow-inner group-hover:bg-yellow-500/10 group-hover:border-yellow-500/20 transition-all flex items-center justify-center">
                    <div className="flex gap-1 items-center">
                      <div className="w-4 h-4 rounded-full bg-red-500 shadow-md border border-white/10" />
                      <div className="w-5 h-5 -ml-1">
                        <FlagPiece id="brazil" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-black italic uppercase tracking-wider block text-white/90 group-hover:text-yellow-400 transition-colors">Peças & Coleções</span>
                    <span className="text-[9px] font-bold text-yellow-500/70 uppercase tracking-widest block">Cores & Coleções</span>
                  </div>
                </motion.button>

                {/* 7. Baús Premium */}
                <motion.button 
                  whileHover={{ scale: 1.02, translateY: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStoreView('chests')}
                  className="bg-gradient-to-b from-[#2d1e14] to-[#1e130b] border border-yellow-500/20 rounded-2xl p-5 flex flex-col items-center gap-3 text-center transition-all duration-200 shadow-lg shadow-black/30 hover:border-yellow-500/50 hover:shadow-[0_0_15px_rgba(234,179,8,0.1)] relative overflow-hidden group col-span-2"
                >
                  <div className="absolute -inset-px bg-gradient-to-b from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                  <div className="w-14 h-14 bg-yellow-500/5 rounded-full flex items-center justify-center border border-yellow-500/10 shadow-inner group-hover:bg-yellow-500/10 group-hover:border-yellow-500/20 transition-all text-yellow-500 flex items-center justify-center">
                    <Gift size={24} />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-black italic uppercase tracking-wider block text-white/90 group-hover:text-yellow-400 transition-colors">Baús Premium</span>
                    <span className="text-[9px] font-bold text-yellow-500/70 uppercase tracking-widest block">Gemas Premium</span>
                  </div>
                </motion.button>
              </div>
            </section>

            {/* Coins & Gems Inline Sections at the Bottom */}
            <section className="space-y-6 pt-4 border-t border-white/5">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-yellow-500 mb-4">Moedas</h3>
                <div className="grid grid-cols-3 gap-4">
                  <StoreItem 
                    icon={<Coins size={32} className="text-yellow-500 fill-yellow-400" />} 
                    label="Punhado de Moedas (100)" 
                    price="3" 
                    isGem={true}
                    onClick={() => handleBuyCoinsPack({ id: 'coins-pack-1', amount: 100, gemPrice: 3 })}
                  />
                  <StoreItem 
                    icon={<Coins size={32} className="text-yellow-500 fill-yellow-400" />} 
                    label="Saco de Moedas (250)" 
                    price="6" 
                    isGem={true}
                    onClick={() => handleBuyCoinsPack({ id: 'coins-pack-2', amount: 250, gemPrice: 6 })}
                  />
                  <StoreItem 
                    icon={<Coins size={32} className="text-yellow-500 fill-yellow-400" />} 
                    label="Baú de Moedas (500)" 
                    price="10" 
                    isGem={true}
                    onClick={() => handleBuyCoinsPack({ id: 'coins-pack-3', amount: 500, gemPrice: 10 })}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-yellow-500 mb-4">Gemas</h3>
                <div className="grid grid-cols-3 gap-4">
                  <StoreItem 
                    icon={<Gem size={32} className="text-blue-400" />} 
                    label="Punhado (10 Gemas)" 
                    price="R$ 7,00" 
                    onClick={() => handleBuyGems({ id: 'gems-1', amount: 10 })}
                  />
                  <StoreItem 
                    icon={<Gem size={32} className="text-blue-400" />} 
                    label="Pilha (30 Gemas)" 
                    price="R$ 16,90" 
                    onClick={() => handleBuyGems({ id: 'gems-2', amount: 30 })}
                  />
                  <StoreItem 
                    icon={<Gem size={32} className="text-blue-400" />} 
                    label="Saco (50 Gemas)" 
                    price="R$ 33,90" 
                    onClick={() => handleBuyGems({ id: 'gems-3', amount: 50 })}
                  />
                </div>
              </div>
            </section>
          </div>
        )}

        {storeView === 'emotes' && (
          <div className="grid grid-cols-3 gap-4 animate-fadeIn">
            {ANIMATED_EMOTES.map((emote) => (
              <StoreItem 
                key={emote.id}
                icon={
                  <div className="w-16 h-16 flex items-center justify-center bg-black/20 rounded-lg relative overflow-hidden">
                    <video 
                      src={emote.video} 
                      autoPlay 
                      loop 
                      muted 
                      playsInline 
                      className="w-12 h-12 object-contain" 
                    />
                  </div>
                } 
                label={emote.name} 
                price={emote.price.toString()} 
                isGem={emote.currency === 'gems'}
                isOwned={(profile.ownedEmotes || []).includes(emote.id)}
                onClick={() => {
                  if ((profile.ownedEmotes || []).includes(emote.id)) {
                    onPreviewEmote?.(emote);
                  } else {
                    handleBuyEmote(emote);
                  }
                }}
              />
            ))}
          </div>
        )}

        {storeView === 'emoji' && (
          <div className="grid grid-cols-3 gap-4 animate-fadeIn">
            {EMOTES.filter(e => e.id !== 'emote_default').map((emote) => (
              <StoreItem 
                key={emote.id}
                icon={
                  emote.image ? (
                    <img 
                      src={emote.image} 
                      alt={emote.name} 
                      className="w-12 h-12 object-contain" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/emote/48/48';
                      }}
                    />
                  ) : (
                    <span className="text-4xl">{emote.emoji}</span>
                  )
                } 
                label={emote.name} 
                price={emote.price.toString()} 
                isGem={emote.currency === 'gems'}
                isOwned={(profile.ownedEmotes || []).includes(emote.id)}
                onClick={() => {
                  if ((profile.ownedEmotes || []).includes(emote.id)) {
                    onPreviewEmote?.(emote);
                  } else {
                    handleBuyEmote(emote);
                  }
                }}
              />
            ))}
          </div>
        )}

        {storeView === 'backgrounds' && (
          <div className="grid grid-cols-3 gap-4 animate-fadeIn">
            {BACKGROUNDS.filter(bg => bg.id !== 'default').map((bg) => (
              <StoreItem 
                key={bg.id}
                icon={
                  <div className={cn("w-12 h-12 rounded-lg shadow-inner overflow-hidden", bg.color)}>
                    <img src={bg.image} alt={bg.name} className="w-full h-full object-cover opacity-50" />
                  </div>
                } 
                label={bg.name} 
                price={bg.price?.toString() || "0"} 
                isOwned={(profile.ownedBackgroundIds || []).includes(bg.id)}
                onClick={() => handleBuyBackground(bg)}
              />
            ))}
          </div>
        )}

        {storeView === 'boards' && (
          <div className="grid grid-cols-3 gap-4 animate-fadeIn">
            {BOARD_THEMES.filter(theme => theme.id !== 'cream-brown').map((theme) => (
              <StoreItem 
                key={theme.id}
                icon={
                  <div className="w-12 h-12 rounded-lg overflow-hidden grid grid-cols-2 grid-rows-2 shadow-inner border border-white/10">
                    <div className={cn("w-full h-full", theme.light)} />
                    <div className={cn("w-full h-full", theme.dark)} />
                    <div className={cn("w-full h-full", theme.dark)} />
                    <div className={cn("w-full h-full", theme.light)} />
                  </div>
                } 
                label={theme.label} 
                price="100" 
                isOwned={(profile.ownedBoardStyles || []).includes(theme.id)}
                onClick={() => handleBuyBoardTheme(theme)}
              />
            ))}
          </div>
        )}

        {storeView === 'pieces' && (
          <div className="space-y-6 animate-fadeIn">
            <section>
              <h3 className="text-sm font-bold uppercase tracking-widest text-yellow-500 mb-4">Peças de Cores</h3>
              <div className="grid grid-cols-3 gap-4">
                {SHOP_PIECE_COLORS.map((item) => (
                  <StoreItem 
                    key={item.hex}
                    icon={
                      <div className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center bg-black/30 border border-white/10">
                        <div className="w-8 h-8 rounded-full" style={{ backgroundColor: item.hex }} />
                      </div>
                    } 
                    label={item.name} 
                    price={item.price.toString()} 
                    isOwned={(profile?.ownedPieceColors || []).includes(item.hex)}
                    onClick={() => handleBuyPieceColor(item)}
                  />
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold uppercase tracking-widest text-yellow-500 mb-4">Coleção de Peças</h3>
              <div className="grid grid-cols-3 gap-4">
                {PIECE_COLLECTIONS.filter(c => c.id !== 'default').map((collection) => (
                  <StoreItem 
                    key={collection.id}
                    icon={
                      <div className="w-12 h-12 relative">
                        <FlagPiece id={collection.id} />
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                          <span className="text-[6px] font-black text-yellow-400 uppercase drop-shadow-md">{collection.name}</span>
                        </div>
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                          <span className="text-[5px] font-bold text-blue-400 uppercase drop-shadow-sm">{collection.rarity}</span>
                        </div>
                      </div>
                    } 
                    label={collection.name} 
                    price={collection.price?.toString() || "0"} 
                    isGem 
                    isOwned={(profile.ownedPieceCollections || []).includes(collection.id)}
                    onClick={() => handleBuyChest({ 
                      id: `chest-${collection.id}`, 
                      price: collection.price || 0, 
                      rewardId: collection.id, 
                      rewardName: collection.name, 
                      rewardType: 'piece_collection' 
                    })}
                  />
                ))}
              </div>
            </section>
          </div>
        )}

        {storeView === 'stickers' && (
          <div className="grid grid-cols-3 gap-4 animate-fadeIn">
            {QUEEN_STICKERS.filter(s => s.id !== 'default').map((sticker) => {
              const IconComp = sticker.icon;
              return (
                <StoreItem 
                  key={sticker.id}
                  icon={
                    <div className="w-12 h-12 flex items-center justify-center bg-black/30 border border-white/10 rounded-xl text-yellow-500">
                      <IconComp size={24} />
                    </div>
                  } 
                  label={sticker.name} 
                  price="20" 
                  isGem={true}
                  isOwned={(profile?.ownedQueenStickerIds || []).includes(sticker.id)}
                  onClick={() => handleBuyQueenSticker(sticker)}
                />
              );
            })}
          </div>
        )}

        {storeView === 'chests' && (
          <div className="grid grid-cols-3 gap-4 animate-fadeIn">
            <StoreItem 
              icon={<ShoppingBag size={40} className="text-orange-500" />} 
              label="Baú Brasil" 
              price="10" 
              isGem 
              isOwned={(profile.ownedBoardStyles || []).includes('brazil')}
              onClick={() => handleBuyChest({ id: 'chest-brazil', price: 10, rewardId: 'brazil', rewardName: 'Brasil', rewardType: 'board' })}
            />
            <StoreItem 
              icon={<ShoppingBag size={40} className="text-blue-500" />} 
              label="Baú Mestre" 
              price="10" 
              isGem 
              isOwned={(profile.ownedEmotes || []).includes('emote_skull')}
              onClick={() => handleBuyChest({ id: 'chest-skull', price: 10, rewardId: 'emote_skull', rewardName: 'Emote Caveira', rewardType: 'emote' })}
            />
            <StoreItem 
              icon={<ShoppingBag size={40} className="text-purple-500" />} 
              label="Baú Supremo" 
              price="10" 
              isGem 
              isOwned={(profile.ownedQueenStickerIds || []).includes('crown')}
              onClick={() => handleBuyChest({ id: 'chest-crown', price: 10, rewardId: 'crown', rewardName: 'Adesivo Coroa Real', rewardType: 'sticker' })}
            />
            <StoreItem 
              icon={<ShoppingBag size={40} className="text-pink-500" />} 
              label="Baú Pé de Chinelo" 
              price="10"
              isGem
              isOwned={
                (profile.ownedBackgroundIds || []).includes('pink') && 
                (profile.ownedQueenStickerIds || []).includes('bull') && 
                (profile.ownedEmotes || []).includes('emote_vampire')
              }
              onClick={() => handleBuyChest({ 
                id: 'chest-pe-de-chinelo', 
                price: 10, 
                rewards: [
                  { id: 'pink', name: 'Estampa Rosa', type: 'background' },
                  { id: 'bull', name: 'Adesivo Boi com Chifre', type: 'sticker' },
                  { id: 'emote_vampire', name: 'Emote Vampiro', type: 'emote' }
                ]
              })}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StoreItem({ icon, label, price, isGem, isOwned, onClick, priceCoins, priceGems }: { icon: any, label: string, price?: string, isGem?: boolean, isOwned?: boolean, onClick?: (currency?: 'coins' | 'gems') => void, key?: string, priceCoins?: string, priceGems?: string }) {
  const isRealMoney = price?.includes('R$');
  const currencyType = isRealMoney ? 'real' : (isGem ? 'gems' : 'coins');

  return (
    <div className={cn(
      "rounded-xl p-3 flex flex-col items-center gap-2 transition-all border",
      isOwned 
        ? "bg-[#2a1a10]/50 border-white/5 opacity-50 grayscale" 
        : currencyType === 'coins'
          ? "border-yellow-500/30 bg-gradient-to-b from-[#2d1e14] to-[#1e130b] shadow-[0_0_12px_rgba(234,179,8,0.06)] hover:border-yellow-500/50 hover:shadow-[0_0_18px_rgba(234,179,8,0.12)]"
          : currencyType === 'gems'
            ? "border-green-500/30 bg-gradient-to-b from-[#17271b] to-[#0f1a12] shadow-[0_0_12px_rgba(34,197,94,0.06)] hover:border-green-500/50 hover:shadow-[0_0_18px_rgba(34,197,94,0.12)]"
            : "border-blue-500/20 bg-gradient-to-b from-[#141f2d] to-[#0b141e] shadow-[0_0_12px_rgba(59,130,246,0.06)] hover:border-blue-500/40 hover:shadow-[0_0_18px_rgba(59,130,246,0.12)]"
    )}>
      <div className="w-16 h-16 flex items-center justify-center bg-black/20 rounded-lg">
        {icon}
      </div>
      <span className="text-[10px] font-bold text-center leading-tight h-6 flex items-center">{label}</span>
      
      {priceCoins && priceGems && !isOwned ? (
        <div className="flex flex-col gap-1 w-full">
          <button 
            onClick={() => onClick?.('gems')}
            className="bg-green-500 hover:bg-green-400 text-black px-2 py-1 rounded-full flex items-center justify-center gap-1 transition-all active:scale-95 font-black text-[10px] shadow-sm"
          >
            <Gem size={10} />
            <span className="text-[10px] font-black">{priceGems}</span>
          </button>
          <button 
            onClick={() => onClick?.('coins')}
            className="bg-yellow-500 hover:bg-yellow-400 text-black px-2 py-1 rounded-full flex items-center justify-center gap-1 transition-all active:scale-95 font-black text-[10px] shadow-sm"
          >
            <Coins size={10} />
            <span className="text-[10px] font-black">{priceCoins}</span>
          </button>
        </div>
      ) : (
        <button 
          onClick={() => onClick?.(isGem ? 'gems' : 'coins')}
          disabled={isOwned}
          className={cn(
            "px-3 py-1 rounded-full flex items-center gap-1 w-full justify-center transition-all active:scale-95 font-black text-[10px]",
            isOwned 
              ? "bg-gray-600 text-gray-350" 
              : currencyType === 'coins'
                ? "bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_2px_8px_rgba(234,179,8,0.25)] hover:scale-[1.02]"
                : currencyType === 'gems'
                  ? "bg-green-500 hover:bg-green-400 text-black shadow-[0_2px_8px_rgba(34,197,94,0.25)] hover:scale-[1.02]"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_2px_8px_rgba(59,130,246,0.25)] hover:scale-[1.02]"
          )}
        >
          {isGem && !isOwned && <Gem size={10} />}
          {!isGem && !isOwned && !isRealMoney && <Coins size={10} />}
          <span className="text-[10px] font-black">{isOwned ? "ADQUIRIDO" : price}</span>
        </button>
      )}
    </div>
  );
}

function RankingScreen({ onBack, savedBestPlays, playClick, settings }: { onBack: () => void, savedBestPlays: BestPlay[], playClick: () => void, settings: GameSettings, key?: string }) {
  const [tab, setTab] = useState<'hall' | 'best'>('hall');
  const [selectedPlay, setSelectedPlay] = useState<BestPlay | null>(null);
  const [hallOfFame, setHallOfFame] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHallOfFame = async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('wins', 'desc'), limit(10));
        const querySnapshot = await getDocs(q);
        const players = querySnapshot.docs.map((doc, index) => ({
          name: doc.data().displayName || 'Jogador',
          wins: doc.data().wins || 0,
          avatar: doc.data().photoURL || `https://picsum.photos/seed/${doc.id}/100/100`,
          rank: index + 1
        }));
        setHallOfFame(players);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'users');
      } finally {
        setIsLoading(false);
      }
    };
    fetchHallOfFame();
  }, []);

  const handleShare = async (play: BestPlay) => {
    playClick();
    const shareText = `Confira minha jogada incrível no Damas Mestre Brasil! Fiz um COMBO X${play.count}!`;
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Damas Mestre Brasil - Melhor Jogada',
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      toast.success('Link copiado para a área de transferência!');
    }
  };

  return (
    <motion.div 
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      className="flex flex-col h-full bg-black/40 backdrop-blur-md relative z-10"
    >
      <div className="p-4 flex items-center justify-between bg-[#2a1a10]">
        <button onClick={onBack} className="p-2 bg-black/40 rounded-full"><ChevronLeft size={24} /></button>
        <h2 className="text-xl font-black italic uppercase tracking-tighter text-yellow-500">RANKING</h2>
        <div className="w-10" />
      </div>

      <div className="flex p-4 gap-2 bg-[#2a1a10]">
        <button 
          onClick={() => { playClick(); setTab('hall'); }}
          className={cn("flex-1 py-2 rounded-lg font-bold transition-all text-xs", tab === 'hall' ? "bg-yellow-600" : "bg-white/5")}
        >
          Hall da Fama
        </button>
        <button 
          onClick={() => { playClick(); setTab('best'); }}
          className={cn("flex-1 py-2 rounded-lg font-bold transition-all text-xs flex items-center justify-center gap-1", tab === 'best' ? "bg-yellow-600" : "bg-white/5")}
        >
          <Zap size={12} /> Melhores Jogadas
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-white/40">
            <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-xs font-bold uppercase tracking-widest">Carregando Ranking...</p>
          </div>
        ) : tab === 'hall' ? (
          <>
            {hallOfFame.length > 0 && (
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
            )}

            {hallOfFame.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-white/40">
                <Trophy size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-bold italic">Ranking vazio!</p>
                <p className="text-[10px] uppercase tracking-widest mt-1">Seja o primeiro a vencer!</p>
              </div>
            ) : (
              hallOfFame.map((player) => (
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
              ))
            )}
          </>
        ) : (
          <div className="space-y-4">
            {savedBestPlays.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-white/40">
                <Zap size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-bold italic">Nenhuma jogada épica ainda!</p>
                <p className="text-[10px] uppercase tracking-widest mt-1">Capture 3 ou mais peças em um turno</p>
              </div>
            ) : (
              savedBestPlays.map((play) => (
                <div key={play.id} className="bg-[#2a1a10] p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border-2 border-yellow-500 overflow-hidden">
                    <img src={play.avatar} alt={play.playerName} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-sm">{play.playerName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Zap size={14} className="text-yellow-500" />
                      <span className="text-xs font-black italic text-yellow-500">COMBO X{play.count}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <div className="text-[10px] text-white/40 font-bold">{play.date}</div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleShare(play)}
                        className="p-2 bg-white/5 rounded-lg text-white/60 hover:text-white transition-colors"
                      >
                        <Share2 size={14} />
                      </button>
                      <button 
                        onClick={() => { playClick(); setSelectedPlay(play); }}
                        className="text-[10px] bg-yellow-600 px-3 py-1.5 rounded font-black uppercase italic shadow-lg active:scale-95 transition-transform"
                      >
                        Ver Replay
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedPlay && (
          <PlaybackModal 
            play={selectedPlay} 
            onClose={() => setSelectedPlay(null)} 
            soundEnabled={settings.soundEnabled}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function PlaybackModal({ play, onClose, soundEnabled }: { play: BestPlay, onClose: () => void, soundEnabled: boolean }) {
  const [currentStep, setCurrentStep] = useState(-1); // -1 is initial board
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackBoard, setPlaybackBoard] = useState<Piece[]>(play.initialBoard);

  const playMoveSound = () => {
    if (!soundEnabled) return;
    const audio = new Audio('https://cdn.jsdelivr.net/gh/lichess-org/lila@master/public/sound/standard/Move.mp3');
    audio.volume = 0.4;
    audio.play().catch(err => console.log('Error playing move sound:', err));
  };

  const playCaptureSound = () => {
    if (!soundEnabled) return;
    const audio = new Audio('https://cdn.jsdelivr.net/gh/lichess-org/lila@master/public/sound/standard/Capture.mp3');
    audio.volume = 0.5;
    audio.play().catch(err => console.log('Error playing capture sound:', err));
  };

  const getBoardColors = (style?: string) => {
    switch (style) {
      case 'green':
        return { dark: 'bg-[#064e3b]', light: 'bg-[#d1fae5]', border: 'border-[#064e3b]' };
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

  const colors = getBoardColors(play.settings?.boardStyle);

  useEffect(() => {
    if (currentStep !== -1) {
      const move = play.moves[currentStep];
      if (move.captured && move.captured.length > 0) {
        playCaptureSound();
      } else {
        playMoveSound();
      }
    }
  }, [currentStep, play.moves]);

  useEffect(() => {
    if (currentStep === -1) {
      setPlaybackBoard(play.initialBoard);
    } else {
      // Reconstruct board up to current step
      let board = [...play.initialBoard];
      for (let i = 0; i <= currentStep; i++) {
        const move = play.moves[i];
        board = board.map(p => {
          if (p.id === move.pieceId) {
            return { ...p, row: move.to.row, col: move.to.col, type: move.isKing ? 'king' : p.type };
          }
          return p;
        });
        if (move.captured) {
          board = board.filter(p => !move.captured!.includes(p.id));
        }
      }
      setPlaybackBoard(board);
    }
  }, [currentStep, play]);

  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= play.moves.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, play.moves.length]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4"
    >
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-yellow-500 overflow-hidden">
              <img src={play.avatar} alt={play.playerName} />
            </div>
            <div>
              <h3 className="font-black italic text-sm">{play.playerName}</h3>
              <div className="flex items-center gap-1">
                <Zap size={10} className="text-yellow-500" />
                <span className="text-[10px] font-black italic text-yellow-500">COMBO X{play.count}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 rounded-full"><ChevronLeft size={24} className="rotate-[-90deg]" /></button>
        </div>

        <div 
          className={cn(
            "grid", 
            !play.settings?.flatMode && "shadow-2xl",
            !play.settings?.flatMode ? colors.border : "border-transparent"
          )}
          style={{ 
            gridTemplateColumns: `repeat(${play.boardSize}, 1fr)`,
            width: '100%',
            aspectRatio: '1/1',
            borderWidth: play.settings?.flatMode ? '0px' : '8px'
          }}
        >
          {Array.from({ length: play.boardSize * play.boardSize }).map((_, i) => {
            const row = Math.floor(i / play.boardSize);
            const col = i % play.boardSize;
            const isDark = (row + col) % 2 !== 0;
            const piece = playbackBoard.find(p => p.row === row && p.col === col);
            const isMovingPiece = piece?.id === play.moves[0].pieceId;

            return (
              <div 
                key={i}
                className={cn(
                  "relative flex items-center justify-center",
                  isDark ? colors.dark : colors.light
                )}
              >
                {piece && (
                  <motion.div 
                    layoutId={piece.id}
                    className={cn(
                      "w-[80%] h-[80%] rounded-full flex items-center justify-center",
                      play.settings?.pieceStyle === '3d' && !play.settings?.flatMode ? "shadow-lg border-b-4" : "shadow-none border-0",
                      isMovingPiece && "ring-2 ring-yellow-500 ring-offset-1 ring-offset-transparent"
                    )}
                    style={{ 
                      backgroundColor: piece.player === play.player ? (play.settings?.myPieceColor || '#ffffff') : (play.settings?.opponentPieceColor || '#000000'),
                      borderColor: piece.player === 'white' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'
                    }}
                  >
                    {play.settings?.showContrastCircle && piece.type !== 'king' && (
                      <div 
                        className={cn(
                          "w-1/2 h-1/2 rounded-full border-2 opacity-40",
                          piece.player === 'white' ? "border-black" : "border-white"
                        )} 
                      />
                    )}
                    {piece.type === 'king' && (() => {
                      const isMyPiece = piece.player === play.player;
                      const stickerId = isMyPiece ? play.settings?.myQueenStickerId : play.settings?.opponentQueenStickerId;
                      const finalStickerId = stickerId || 'default';
                      const sticker = QUEEN_STICKERS.find(s => s.id === finalStickerId) || QUEEN_STICKERS[0];
                      const Icon = sticker.icon;
                      return <Icon size={12} className={piece.player === 'white' ? "text-yellow-600" : "text-yellow-500"} />;
                    })()}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Passo {currentStep + 2} de {play.moves.length + 1}</span>
            <div className="flex gap-1">
              {play.moves.map((_, i) => (
                <div key={i} className={cn("w-1.5 h-1.5 rounded-full", i <= currentStep ? "bg-yellow-500" : "bg-white/10")} />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button 
              onClick={() => {
                setCurrentStep(-1);
                setIsPlaying(false);
              }}
              className="p-4 bg-white/5 rounded-2xl active:scale-95 transition-transform"
            >
              <ChevronLeft size={24} />
            </button>
            
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-20 h-20 bg-yellow-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(202,138,4,0.3)] active:scale-95 transition-transform"
            >
              {isPlaying ? <div className="w-6 h-6 bg-white rounded-sm" /> : <Play size={32} fill="currentColor" className="ml-1" />}
            </button>

            <button 
              onClick={() => {
                setCurrentStep(prev => Math.min(play.moves.length - 1, prev + 1));
                setIsPlaying(false);
              }}
              className="p-4 bg-white/5 rounded-2xl active:scale-95 transition-transform"
            >
              <ChevronLeft size={24} className="rotate-180" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ConfirmationModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = "Confirmar", 
  cancelText = "Cancelar",
  confirmColor = "bg-red-600"
}: { 
  isOpen: boolean, 
  title: string, 
  message: string, 
  onConfirm: () => void, 
  onCancel: () => void,
  confirmText?: string,
  cancelText?: string,
  confirmColor?: string
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#2a1a10] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
      >
        <h3 className="text-lg font-black uppercase italic text-white mb-2">{title}</h3>
        <p className="text-sm text-white/60 mb-6">{message}</p>
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            className={cn("flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg active:scale-95 transition-all", confirmColor)}
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ShareModal({ isOpen, onClose, playClick, text }: { isOpen: boolean, onClose: () => void, playClick: () => void, text?: string }) {
  const shareUrl = window.location.href;
  const shareText = text || "Vem jogar Damas Mestre Brasil comigo!";

  const shareOptions = [
    { name: 'WhatsApp', icon: <MessageCircle size={24} className="text-green-500" />, color: 'bg-green-500/10', url: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}` },
    { name: 'Facebook', icon: <Facebook size={24} className="text-blue-600" />, color: 'bg-blue-600/10', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}` },
    { name: 'Twitter', icon: <Twitter size={24} className="text-sky-500" />, color: 'bg-sky-500/10', url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}` },
    { name: 'Telegram', icon: <Send size={24} className="text-sky-600" />, color: 'bg-sky-600/10', url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}` },
    { name: 'Copiar Link', icon: <Link size={24} className="text-gray-400" />, color: 'bg-gray-400/10', action: () => { navigator.clipboard.writeText(shareUrl); toast.success('Link copiado!'); } },
  ];

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Damas Mestre Brasil',
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="relative w-full max-w-md bg-[#2a1a10] rounded-t-3xl sm:rounded-3xl border-t-2 sm:border-2 border-yellow-600/30 p-6 shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50" />
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                <Share2 size={24} className="text-yellow-500" /> Compartilhar
              </h3>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <ChevronLeft size={24} className="rotate-[-90deg]" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-8">
              {shareOptions.map((option) => (
                <button 
                  key={option.name}
                  onClick={() => {
                    playClick();
                    if (option.action) option.action();
                    else if (option.url) window.open(option.url, '_blank');
                  }}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-active:scale-90", option.color)}>
                    {option.icon}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">{option.name}</span>
                </button>
              ))}
            </div>

            {navigator.share && (
              <button 
                onClick={() => { playClick(); handleNativeShare(); }}
                className="w-full py-4 bg-yellow-600 rounded-2xl font-black uppercase italic shadow-lg flex items-center justify-center gap-3 border-t border-white/10 border-b-4 border-yellow-900 active:border-b-0 active:translate-y-1 transition-all"
              >
                <Share2 size={20} /> Mais Opções
              </button>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ProfileDetailsScreen({ profile, onBack, playClick, savedBestPlays }: { profile: any, onBack: () => void, playClick: () => void, savedBestPlays: BestPlay[], key?: string }) {
  const stats = [
    { label: 'Vitórias', value: profile.wins || 0, color: 'text-green-500', icon: <Trophy size={16} /> },
    { label: 'Derrotas', value: profile.losses || 0, color: 'text-red-500', icon: <Flag size={16} /> },
    { label: 'Empates', value: profile.draws || 0, color: 'text-gray-400', icon: <Info size={16} /> },
    { label: 'Total de Jogos', value: profile.totalGames || 0, color: 'text-blue-400', icon: <Play size={16} /> },
  ];

  const winRate = profile.totalGames > 0 ? Math.round((profile.wins / profile.totalGames) * 100) : 0;

  return (
    <motion.div 
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      className="flex flex-col h-full bg-black/40 backdrop-blur-md relative z-10"
    >
      <div className="p-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 bg-black/40 rounded-full"><ChevronLeft size={24} /></button>
        <h2 className="text-xl font-black uppercase italic tracking-tighter">Relatório do Jogador</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        {/* Header Card */}
        <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 p-6 rounded-3xl border border-yellow-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <User size={120} />
          </div>
          
          <div className="flex items-center gap-6 relative z-10">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-yellow-500 overflow-hidden bg-gray-800 shadow-2xl">
                <img src={profile.photoURL || "https://picsum.photos/seed/user/100/100"} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-yellow-500 px-3 py-1 rounded-full border-2 border-black font-black text-black text-sm">
                LVL {profile.level}
              </div>
            </div>
            
            <div className="flex-1">
              <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-none mb-1">{profile.displayName || 'Jogador'}</h3>
              <p className="text-blue-400 font-bold uppercase text-xs mb-3">{profile.clanName || 'Sem Clã'}</p>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
                  <Crown size={16} className="text-yellow-500" />
                  <span className="text-lg font-black text-yellow-500">{profile.trophies || 0}</span>
                </div>
                <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(profile.xp % 100)}%` }}
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, i) => (
            <div key={i} className="bg-black/20 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-1">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-white/40">
                {stat.icon}
                {stat.label}
              </div>
              <div className={cn("text-2xl font-black", stat.color)}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Win Rate Card */}
        <div className="bg-black/20 p-6 rounded-3xl border border-white/5 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase text-white/40 mb-1">Taxa de Vitória</h4>
            <div className="text-4xl font-black text-white italic">{winRate}%</div>
          </div>
          <div className="w-20 h-20 relative">
            <svg className="w-full h-full" viewBox="0 0 36 36">
              <path
                className="text-white/10"
                strokeDasharray="100, 100"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <motion.path
                initial={{ strokeDasharray: "0, 100" }}
                animate={{ strokeDasharray: `${winRate}, 100` }}
                className="text-green-500"
                strokeWidth="3"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
          </div>
        </div>

        {/* Best Plays Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-yellow-500">Melhores Jogadas Recentes</h3>
            <Zap size={14} className="text-yellow-500" />
          </div>
          
          <div className="space-y-2">
            {savedBestPlays.length === 0 ? (
              <div className="p-8 text-center bg-black/10 rounded-2xl border border-dashed border-white/10">
                <p className="text-xs text-white/40">Nenhuma jogada épica registrada ainda.</p>
              </div>
            ) : (
              savedBestPlays.slice(0, 3).map((play, i) => (
                <div key={i} className="bg-black/20 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-600/20 flex items-center justify-center text-orange-500 font-black">
                      {play.count}x
                    </div>
                    <div>
                      <div className="text-xs font-bold">Captura Múltipla</div>
                      <div className="text-[10px] text-white/40">{play.date}</div>
                    </div>
                  </div>
                  <Zap size={16} className="text-yellow-500" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Economy Section */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Coins size={20} className="text-yellow-500" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-white/40">Moedas</div>
              <div className="text-lg font-black text-white">{profile.coins}</div>
            </div>
          </div>
          <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Gem size={20} className="text-blue-500" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-white/40">Gemas</div>
              <div className="text-lg font-black text-white">{profile.gems}</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const LANGUAGES = [
  { id: 'system', name: 'Idioma do Sistema', flag: '🌐' },
  { id: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷' },
  { id: 'en', name: 'English', flag: '🇺🇸' },
  { id: 'es', name: 'Español', flag: '🇪🇸' },
  { id: 'fr', name: 'Français', flag: '🇫🇷' },
  { id: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { id: 'it', name: 'Italiano', flag: '🇮🇹' },
  { id: 'ja', name: '日本語', flag: '🇯🇵' },
  { id: 'ru', name: 'Русский', flag: '🇷🇺' },
  { id: 'zh', name: '简体中文', flag: '🇨🇳' },
];

const TRANSLATIONS: Record<string, Record<string, string>> = {
  'pt-BR': {
    settingsTitle: 'Configurações',
    generalSettings: 'Configurações Gerais',
    boardStyle: 'Estilo do Tabuleiro',
    pieceStyle: 'Estilo das Peças',
    contrastCircle: 'Círculo de Contraste',
    account: 'Conta',
    logout: 'Sair da Conta',
    gameOptions: 'Opções de Jogo',
    language: 'Idioma',
    systemLanguage: 'Idioma do Sistema',
    changeLanguage: 'Mudar',
    sound: 'Som',
    testSound: 'Testar',
    conversations: 'Conversas',
    friendChallenges: 'Receber desafios apenas de amigos',
    notifications: 'Exibir notificações ao jogar',
    credits: 'Créditos',
    developedBy: 'Desenvolvido por',
    version: 'Versão',
    releaseYear: 'Lançamento',
    selectLanguageTitle: 'Selecione o Idioma',
    close: 'Fechar',
    languageChanged: 'Idioma alterado com sucesso!',
    myPieces: 'Minhas Peças',
    opponentPieces: 'Peças do Adversário',
    rulesTab: 'Regras',
    settingsTab: 'Ajustes',
    predefinedAvatarLabel: 'Escolha um Avatar',
    editProfileLabel: 'Editar Perfil',
    avatarUploadLabel: 'Enviar Foto (PNG/JPG)',
    nameLabel: 'Nome',
    saveButton: 'Salvar',
    informations: 'Informações',
  },
  'en': {
    settingsTitle: 'Settings',
    generalSettings: 'General Settings',
    boardStyle: 'Board Style',
    pieceStyle: 'Piece Style',
    contrastCircle: 'Contrast Circle',
    account: 'Account',
    logout: 'Logout',
    gameOptions: 'Game Options',
    language: 'Language',
    systemLanguage: 'System Language',
    changeLanguage: 'Change',
    sound: 'Sound',
    testSound: 'Test',
    conversations: 'Chats',
    friendChallenges: 'Receive challenges only from friends',
    notifications: 'Show notifications while playing',
    credits: 'Credits',
    developedBy: 'Developed by',
    version: 'Version',
    releaseYear: 'Released',
    selectLanguageTitle: 'Select Language',
    close: 'Close',
    languageChanged: 'Language changed successfully!',
    myPieces: 'My Pieces',
    opponentPieces: 'Opponent Pieces',
    rulesTab: 'Rules',
    settingsTab: 'Settings',
    predefinedAvatarLabel: 'Choose an Avatar',
    editProfileLabel: 'Edit Profile',
    avatarUploadLabel: 'Upload Photo (PNG/JPG)',
    nameLabel: 'Name',
    saveButton: 'Save',
    informations: 'Information',
  },
  'es': {
    settingsTitle: 'Configuración',
    generalSettings: 'Ajustes Generales',
    boardStyle: 'Estilo del Tablero',
    pieceStyle: 'Estilo de Piezas',
    contrastCircle: 'Círculo de Contraste',
    account: 'Cuenta',
    logout: 'Cerrar Sesión',
    gameOptions: 'Opciones de Juego',
    language: 'Idioma',
    systemLanguage: 'Idioma del Sistema',
    changeLanguage: 'Cambiar',
    sound: 'Sonido',
    testSound: 'Probar',
    conversations: 'Chats',
    friendChallenges: 'Recibir desafíos solo de amigos',
    notifications: 'Mostrar notificaciones al jugar',
    credits: 'Créditos',
    developedBy: 'Desarrollado por',
    version: 'Versión',
    releaseYear: 'Lanzamiento',
    selectLanguageTitle: 'Seleccionar Idioma',
    close: 'Cerrar',
    languageChanged: '¡Idioma cambiado correctamente!',
    myPieces: 'Mis Piezas',
    opponentPieces: 'Piezas del Adversario',
    rulesTab: 'Reglas',
    settingsTab: 'Ajustes',
    predefinedAvatarLabel: 'Elige un Avatar',
    editProfileLabel: 'Editar Perfil',
    avatarUploadLabel: 'Subir Foto (PNG/JPG)',
    nameLabel: 'Nombre',
    saveButton: 'Guardar',
    informations: 'Información',
  },
  'fr': {
    settingsTitle: 'Paramètres',
    generalSettings: 'Paramètres Généraux',
    boardStyle: 'Style du Plateau',
    pieceStyle: 'Style des Pièces',
    contrastCircle: 'Cercle de Contraste',
    account: 'Compte',
    logout: 'Se Déconnecter',
    gameOptions: 'Options de Jeu',
    language: 'Langue',
    systemLanguage: 'Langue du Système',
    changeLanguage: 'Modifier',
    sound: 'Son',
    testSound: 'Tester',
    conversations: 'Discussions',
    friendChallenges: 'Défis des amis uniquement',
    notifications: 'Afficher les notifications en jouant',
    credits: 'Crédits',
    developedBy: 'Développé par',
    version: 'Version',
    releaseYear: 'Sortie',
    selectLanguageTitle: 'Choisir la Langue',
    close: 'Fermer',
    languageChanged: 'Langue modifiée avec succès !',
    myPieces: 'Mes Pièces',
    opponentPieces: 'Pièces de l\'Adversaire',
    rulesTab: 'Règles',
    settingsTab: 'Paramètres',
    predefinedAvatarLabel: 'Choisir un Avatar',
    editProfileLabel: 'Modifier le Profil',
    avatarUploadLabel: 'Télécharger Photo (PNG/JPG)',
    nameLabel: 'Nom',
    saveButton: 'Enregistrer',
    informations: 'Informations',
  },
  'de': {
    settingsTitle: 'Einstellungen',
    generalSettings: 'Allgemeine Einstellungen',
    boardStyle: 'Brettstil',
    pieceStyle: 'Figurenstil',
    contrastCircle: 'Kontrastkreis',
    account: 'Konto',
    logout: 'Abmelden',
    gameOptions: 'Spieloptionen',
    language: 'Sprache',
    systemLanguage: 'System-Sprache',
    changeLanguage: 'Ändern',
    sound: 'Ton',
    testSound: 'Testen',
    conversations: 'Chats',
    friendChallenges: 'Herausforderungen nur von Freunden',
    notifications: 'Benachrichtigungen beim Spielen',
    credits: 'Mitwirkende',
    developedBy: 'Entwickelt von',
    version: 'Version',
    releaseYear: 'Veröffentlicht',
    selectLanguageTitle: 'Sprache auswählen',
    close: 'Schließen',
    languageChanged: 'Sprache erfolgreich geändert!',
    myPieces: 'Meine Figuren',
    opponentPieces: 'Gegnerfiguren',
    rulesTab: 'Regeln',
    settingsTab: 'Optionen',
    predefinedAvatarLabel: 'Avatar wählen',
    editProfileLabel: 'Profil bearbeiten',
    avatarUploadLabel: 'Foto hochladen (PNG/JPG)',
    nameLabel: 'Name',
    saveButton: 'Speichern',
    informations: 'Informationen',
  },
  'it': {
    settingsTitle: 'Impostazioni',
    generalSettings: 'Impostazioni Generali',
    boardStyle: 'Stile Scacchiera',
    pieceStyle: 'Stile Pedine',
    contrastCircle: 'Cerchio di Contrasto',
    account: 'Account',
    logout: 'Disconnetti',
    gameOptions: 'Opzioni di Gioco',
    language: 'Lingua',
    systemLanguage: 'Lingua di Sistema',
    changeLanguage: 'Modifica',
    sound: 'Suono',
    testSound: 'Prova',
    conversations: 'Chat',
    friendChallenges: 'Sfide solo da amici',
    notifications: 'Mostra notifiche durante il gioco',
    credits: 'Crediti',
    developedBy: 'Sviluppato da',
    version: 'Versione',
    releaseYear: 'Rilascio',
    selectLanguageTitle: 'Seleziona Lingua',
    close: 'Chiudi',
    languageChanged: 'Lingua modificata con successo!',
    myPieces: 'Le Mie Pedine',
    opponentPieces: 'Pedine dell\'Avversario',
    rulesTab: 'Regole',
    settingsTab: 'Ajustes',
    predefinedAvatarLabel: 'Scegli un Avatar',
    editProfileLabel: 'Modifica Profilo',
    avatarUploadLabel: 'Carica Foto (PNG/JPG)',
    nameLabel: 'Nome',
    saveButton: 'Salva',
    informations: 'Informazioni',
  },
  'ja': {
    settingsTitle: '設定',
    generalSettings: '一般設定',
    boardStyle: '盤面スタイル',
    pieceStyle: '駒スタイル',
    contrastCircle: 'コントラスト円',
    account: 'アカウント',
    logout: 'ログアウト',
    gameOptions: 'ゲームオプション',
    language: '言語',
    systemLanguage: 'システム言語',
    changeLanguage: '変更',
    sound: '音量',
    testSound: 'テスト',
    conversations: 'チャット',
    friendChallenges: 'フレンドからの挑戦のみ受信',
    notifications: 'プレイ中の通知表示',
    credits: 'クレジット',
    developedBy: '開発者',
    version: 'バージョン',
    releaseYear: 'リリース年',
    selectLanguageTitle: '言語の選択',
    close: '閉じる',
    languageChanged: '言語が正常に変更されました！',
    myPieces: '自分の駒',
    opponentPieces: '相手の駒',
    rulesTab: 'ルール',
    settingsTab: '設定項目',
    predefinedAvatarLabel: 'アバターを選択',
    editProfileLabel: 'プロフィールの編集',
    avatarUploadLabel: '写真をアップロード (PNG/JPG)',
    nameLabel: '名前',
    saveButton: '保存',
    informations: '情報',
  },
  'ru': {
    settingsTitle: 'Настройки',
    generalSettings: 'Общие Настройки',
    boardStyle: 'Стиль Доски',
    pieceStyle: 'Стиль Фигур',
    contrastCircle: 'Контрастный Круг',
    account: 'Аккаунт',
    logout: 'Выйти',
    gameOptions: 'Игровые Опции',
    language: 'Язык',
    systemLanguage: 'Системный Язык',
    changeLanguage: 'Изменить',
    sound: 'Звук',
    testSound: 'Проверить',
    conversations: 'Чаты',
    friendChallenges: 'Вызовы только от друзей',
    notifications: 'Показывать уведомления в игре',
    credits: 'Авторы',
    developedBy: 'Разработчик',
    version: 'Версия',
    releaseYear: 'Выпуск',
    selectLanguageTitle: 'Выберите Язык',
    close: 'Закрыть',
    languageChanged: 'Язык успешно изменен!',
    myPieces: 'Мои Фигуры',
    opponentPieces: 'Фигуры Противника',
    rulesTab: 'Правила',
    settingsTab: 'Опции',
    predefinedAvatarLabel: 'Выберите Аватар',
    editProfileLabel: 'Редактировать Профиль',
    avatarUploadLabel: 'Загрузить фото (PNG/JPG)',
    nameLabel: 'Имя',
    saveButton: 'Сохранить',
    informations: 'Информация',
  },
  'zh': {
    settingsTitle: '设置',
    generalSettings: '通用设置',
    boardStyle: '棋盘样式',
    pieceStyle: '棋子样式',
    contrastCircle: '对比度圆圈',
    account: '账户',
    logout: '退出登录',
    gameOptions: '游戏选项',
    language: '语言',
    systemLanguage: '系统语言',
    changeLanguage: '更改',
    sound: '声音',
    testSound: '测试',
    conversations: '聊天',
    friendChallenges: '仅接受好友挑战',
    notifications: '游戏时显示通知',
    credits: '鸣谢',
    developedBy: '开发者',
    version: '版本',
    releaseYear: '发布年份',
    selectLanguageTitle: '选择语言',
    close: '关闭',
    languageChanged: '语言修改成功！',
    myPieces: '我的棋子',
    opponentPieces: '对手棋子',
    rulesTab: '规则',
    settingsTab: '设置',
    predefinedAvatarLabel: '选择头像',
    editProfileLabel: '编辑个人资料',
    avatarUploadLabel: '上传图片 (PNG/JPG)',
    nameLabel: '名字',
    saveButton: '保存',
    informations: '信息',
  }
};

const getActiveLanguage = (settingsLanguage: string | undefined): string => {
  if (!settingsLanguage || settingsLanguage === 'system') {
    const sysLang = typeof navigator !== 'undefined' ? (navigator.language || (navigator.languages && navigator.languages[0]) || 'pt-BR') : 'pt-BR';
    const langCode = sysLang.split('-')[0];
    if (sysLang.startsWith('pt')) return 'pt-BR';
    if (TRANSLATIONS[langCode]) return langCode;
    return 'pt-BR';
  }
  return settingsLanguage;
};

const t = (key: string, settingsLanguage?: string) => {
  const activeLang = getActiveLanguage(settingsLanguage);
  return TRANSLATIONS[activeLang]?.[key] || TRANSLATIONS['pt-BR']?.[key] || key;
};

function SettingsScreen({ profile, updateProfile, settings, onUpdateSettings, onBack, onLogout, playClick, onNavigate }: { profile: any, updateProfile: (data: any) => Promise<void>, settings: GameSettings, onUpdateSettings: (s: GameSettings) => void, onBack: () => void, onLogout: () => void, playClick: () => void, onNavigate?: (s: Screen) => void, key?: string }) {
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'rules'>('settings');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const [newName, setNewName] = useState(profile?.displayName || '');
  const [nameError, setNameError] = useState('');
  const [nameSuccess, setNameSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (profile?.displayName) {
      setNewName(profile.displayName);
    }
  }, [profile?.displayName]);

  const handleNameChange = async (paymentType?: 'free' | 'coins' | 'gems') => {
    setNameError('');
    setNameSuccess('');

    const trimmedName = newName.trim();
    if (!trimmedName) {
      setNameError('O nome não pode ser vazio.');
      return;
    }
    if (trimmedName === profile.displayName) {
      setNameError('O novo nome deve ser diferente do atual.');
      return;
    }
    if (trimmedName.length < 3) {
      setNameError('O nome deve ter pelo menos 3 caracteres.');
      return;
    }
    if (trimmedName.length > 20) {
      setNameError('O nome pode ter no máximo 20 caracteres.');
      return;
    }

    const currentCount = profile.nameChangeCount || 0;
    let actualPayment: 'free' | 'coins' | 'gems' = 'free';

    if (currentCount >= 3) {
      if (!paymentType) {
        setNameError('Selecione se deseja pagar com moedas ou gemas.');
        return;
      }
      actualPayment = paymentType;
    }

    setIsSubmitting(true);
    try {
      const updates: any = {
        displayName: trimmedName,
        nameChangeCount: currentCount + 1,
      };

      if (actualPayment === 'coins') {
        if ((profile.coins || 0) < 500) {
          setNameError('Moedas insuficientes! Você precisa de 500 moedas.');
          setIsSubmitting(false);
          return;
        }
        updates.coins = (profile.coins || 0) - 500;
      } else if (actualPayment === 'gems') {
        if ((profile.gems || 0) < 50) {
          setNameError('Gemas insuficientes! Você precisa de 50 gemas.');
          setIsSubmitting(false);
          return;
        }
        updates.gems = (profile.gems || 0) - 50;
      }

      await updateProfile(updates);
      setNameSuccess('Nome alterado com sucesso!');
      playClick();
    } catch (err: any) {
      console.error(err);
      setNameError('Erro ao atualizar nome. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const predefinedAvatars = [
    { name: "Humano 1", url: "https://picsum.photos/seed/avatar1/100/100" },
    { name: "Humano 2", url: "https://picsum.photos/seed/avatar2/100/100" },
    { name: "Humano 3", url: "https://picsum.photos/seed/avatar3/100/100" },
    { name: "Humano 4", url: "https://picsum.photos/seed/avatar4/100/100" },
    { name: "Humano 5", url: "https://picsum.photos/seed/avatar5/100/100" },
    { name: "Humano 6", url: "https://picsum.photos/seed/avatar6/100/100" },
    { name: "Leão", url: "https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&q=80&w=120&h=120" },
    { name: "Gato", url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=120&h=120" },
    { name: "Cachorro", url: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=120&h=120" },
    { name: "Cobra", url: "https://images.unsplash.com/photo-1531386151447-fd76ad50012f?auto=format&fit=crop&q=80&w=120&h=120" },
    { name: "Águia", url: "https://images.unsplash.com/photo-1611689342806-0863700ce1e4?auto=format&fit=crop&q=80&w=120&h=120" },
    { name: "Tucano", url: "https://images.unsplash.com/photo-1552410260-0fd9b577afa6?auto=format&fit=crop&q=80&w=120&h=120" },
    { name: "Tubarão", url: "https://images.unsplash.com/photo-1560275669-46c5a88d6a4c?auto=format&fit=crop&q=80&w=120&h=120" },
    { name: "Coelho", url: "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&q=80&w=120&h=120" },
    { name: "Canguru", url: "https://images.unsplash.com/photo-1533038590840-1cde6e668a91?auto=format&fit=crop&q=80&w=120&h=120" },
    { name: "Raposa", url: "https://images.unsplash.com/photo-1474511320723-9a56873867b5?auto=format&fit=crop&q=80&w=120&h=120" },
    { name: "Panda", url: "https://images.unsplash.com/photo-1508817628294-5a453fa0b8fb?auto=format&fit=crop&q=80&w=120&h=120" },
    { name: "Lobo", url: "https://images.unsplash.com/photo-1590424753042-35f56754b423?auto=format&fit=crop&q=80&w=120&h=120" },
    { name: "Urso", url: "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&q=80&w=120&h=120" },
    { name: "Macaco", url: "https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?auto=format&fit=crop&q=80&w=120&h=120" },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      updateProfile({ photoURL: base64String }).then(() => {
        setUploading(false);
        playClick();
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <motion.div 
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      className="flex flex-col h-full bg-black/40 backdrop-blur-md relative z-10"
    >
      <div className="p-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2 bg-black/40 rounded-full"><ChevronLeft size={24} /></button>
        <div className="flex bg-black/40 rounded-xl p-1">
          <button 
            onClick={() => { playClick(); setActiveTab('settings'); }}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
              activeTab === 'settings' ? "bg-green-600 text-white shadow-lg" : "text-white/40 hover:text-white/60"
            )}
          >
            {t('settingsTab', settings.language)}
          </button>
          <button 
            onClick={() => { playClick(); setActiveTab('rules'); }}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
              activeTab === 'rules' ? "bg-green-600 text-white shadow-lg" : "text-white/40 hover:text-white/60"
            )}
          >
            {t('rulesTab', settings.language)}
          </button>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {activeTab === 'settings' ? (
          <>
            <SettingsGroup label={t('editProfileLabel', settings.language)}>
          <div className="bg-black/20 p-4 rounded-xl space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full border-4 border-yellow-600 overflow-hidden bg-gray-800 relative group">
                <img src={profile.photoURL || "https://picsum.photos/seed/user/100/100"} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm font-bold">{profile.displayName || "Jogador"}</p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-2"
                >
                  <Camera size={14} /> {t('avatarUploadLabel', settings.language)}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </div>

             <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase text-white/40">{t('predefinedAvatarLabel', settings.language)}</p>
              <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto p-1 bg-black/10 rounded-xl">
                {predefinedAvatars.map((avatar, i) => (
                  <button 
                    key={i}
                    title={avatar.name}
                    onClick={() => { playClick(); updateProfile({ photoURL: avatar.url }); }}
                    className={cn(
                      "aspect-square rounded-full border-2 transition-all overflow-hidden relative group cursor-pointer",
                      profile.photoURL === avatar.url ? "border-yellow-500 scale-105 shadow-lg shadow-yellow-500/20" : "border-white/10 opacity-70 hover:opacity-100"
                    )}
                  >
                    <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-x-0 bottom-0 bg-black/80 text-[6px] font-black uppercase text-center text-white py-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap overflow-hidden text-ellipsis">
                      {avatar.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Alteração de Nome */}
            <div className="border-t border-white/5 pt-4 space-y-3">
              <p className="text-[10px] font-bold uppercase text-white/40 tracking-wider">{t('editProfileLabel', settings.language)}</p>
              <div className="space-y-2">
                <input 
                  type="text"
                  maxLength={20}
                  placeholder="Digite seu novo nome..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-yellow-500/50 text-white placeholder-white/20 transition-all"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    setNameError('');
                    setNameSuccess('');
                  }}
                  disabled={isSubmitting}
                />
                
                {/* Alterações gratuitas left display & Warning */}
                <div className="flex flex-col gap-1.5 p-2.5 bg-yellow-500/5 border border-yellow-500/10 rounded-xl text-xs text-white/70">
                  <div className="flex justify-between items-center font-bold">
                    <span>Alterações Grátis Utilizadas:</span>
                    <span className={cn(
                      "font-mono px-1.5 py-0.5 rounded text-[10px]",
                      (profile.nameChangeCount || 0) < 3 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                    )}>
                      {Math.min(3, profile.nameChangeCount || 0)} / 3
                    </span>
                  </div>
                  <p className="text-[10px] text-white/50 leading-relaxed">
                    Você tem direito a 3 alterações gratuitas. Após isso, cada mudança custará <span className="text-yellow-500 font-bold">500 Moedas</span> ou <span className="text-teal-400 font-bold">50 Gemas</span>.
                  </p>
                </div>

                {nameError && (
                  <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                    <X size={14} className="shrink-0" />
                    <span>{nameError}</span>
                  </div>
                )}

                {nameSuccess && (
                  <div className="p-2.5 bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-xl flex items-center gap-2">
                    <Sparkles size={14} className="shrink-0 animate-bounce" />
                    <span>{nameSuccess}</span>
                  </div>
                )}

                {/* Botões de Ação baseados no saldo / limite */}
                {(profile.nameChangeCount || 0) < 3 ? (
                  <button
                    onClick={() => handleNameChange('free')}
                    disabled={isSubmitting || !newName.trim() || newName.trim() === profile.displayName}
                    className={cn(
                      "w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95",
                      isSubmitting || !newName.trim() || newName.trim() === profile.displayName
                        ? "bg-white/5 text-white/30 border border-white/5 cursor-not-allowed"
                        : "bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-black"
                    )}
                  >
                    {isSubmitting ? 'Alterando...' : `Mudar Nome (Grátis - Restam ${3 - (profile.nameChangeCount || 0)})`}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-yellow-500/80 uppercase text-center">Selecione o Método de Pagamento</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleNameChange('coins')}
                        disabled={isSubmitting || !newName.trim() || newName.trim() === profile.displayName || (profile.coins || 0) < 500}
                        className={cn(
                          "py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow active:scale-95 border",
                          (profile.coins || 0) < 500 || !newName.trim() || newName.trim() === profile.displayName
                            ? "bg-white/5 text-white/30 border-white/5 cursor-not-allowed"
                            : "bg-gradient-to-r from-[#2a1a10] to-[#3d2b1f] hover:from-yellow-600 hover:to-amber-600 hover:text-black text-yellow-500 border-yellow-500/20"
                        )}
                      >
                        <Coins size={14} className={cn((profile.coins || 0) < 500 ? "text-white/30" : "text-yellow-500")} />
                        <span>500 Moedas</span>
                      </button>
                      <button
                        onClick={() => handleNameChange('gems')}
                        disabled={isSubmitting || !newName.trim() || newName.trim() === profile.displayName || (profile.gems || 0) < 50}
                        className={cn(
                          "py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow active:scale-95 border",
                          (profile.gems || 0) < 50 || !newName.trim() || newName.trim() === profile.displayName
                            ? "bg-white/5 text-white/30 border-white/5 cursor-not-allowed"
                            : "bg-gradient-to-r from-[#1a1c2a] to-[#2b2d3f] hover:from-teal-600 hover:to-cyan-600 hover:text-white text-teal-400 border-teal-500/20"
                        )}
                      >
                        <Gem size={14} className={cn((profile.gems || 0) < 50 ? "text-white/30" : "text-teal-400")} />
                        <span>50 Gemas</span>
                      </button>
                    </div>
                    {((profile.coins || 0) < 500 && (profile.gems || 0) < 50) && (
                      <p className="text-[10px] text-red-400/80 text-center font-bold">Saldo insuficiente de moedas e gemas para realizar a alteração!</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </SettingsGroup>

        <SettingsGroup label={t('generalSettings', settings.language)}>
          <div className="p-4 space-y-3">
            {/* Opção para Ver Informações Completas */}
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">{t('informations', settings.language)}</p>
              <button
                type="button"
                onClick={() => { playClick(); setIsInfoOpen(true); }}
                className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-slate-950/40 to-zinc-950/40 hover:from-slate-900/50 hover:to-zinc-900/50 rounded-xl border border-white/5 hover:border-white/10 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-transform">
                    <Info size={16} className="text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Informações do Jogo</h4>
                    <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-0.5">Clique para Ver Detalhes Completos</p>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                  <ChevronRight size={14} className="text-white/60 group-hover:text-white" />
                </div>
              </button>
            </div>

            {/* Ajuda, Suporte e Mensagens */}
            <div className="border-t border-white/5 pt-4 mt-1 space-y-3">
              <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Ajuda, Suporte e Mensagens</p>
              <a
                href="mailto:svosoftware@gmail.com?subject=Damas%20Pro%20-%20Suporte"
                onClick={() => playClick()}
                className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-blue-900/40 to-indigo-900/40 hover:from-blue-800/50 hover:to-indigo-800/50 rounded-xl border border-blue-500/20 hover:border-blue-500/40 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-transform">
                    <Mail size={16} className="text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Contatar Suporte</h4>
                    <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-0.5">svosoftware@gmail.com</p>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                  <HelpCircle size={14} className="text-white/60 group-hover:text-white" />
                </div>
              </a>
            </div>

            {/* Políticas e Diretrizes */}
            <div className="border-t border-white/5 pt-4 mt-1 space-y-3">
              <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Políticas e Diretrizes</p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => { playClick(); setIsTermsOpen(true); }}
                  className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-amber-950/40 to-yellow-950/40 hover:from-amber-900/50 hover:to-yellow-900/50 rounded-xl border border-yellow-500/10 hover:border-yellow-500/30 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 group-hover:scale-105 transition-transform">
                      <FileText size={16} className="text-yellow-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Termos e Condições</h4>
                      <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-0.5">Termos de Uso do Jogo</p>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                    <ChevronRight size={14} className="text-white/60 group-hover:text-white" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { playClick(); setIsPrivacyOpen(true); }}
                  className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-teal-950/40 to-emerald-950/40 hover:from-teal-900/50 hover:to-emerald-900/50 rounded-xl border border-emerald-500/10 hover:border-emerald-500/30 text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform">
                      <Shield size={16} className="text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Política de Privacidade</h4>
                      <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-0.5">Privacy Policy of the Game</p>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                    <ChevronRight size={14} className="text-white/60 group-hover:text-white" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </SettingsGroup>

        <SettingsGroup label={t('account', settings.language)}>
          <SettingsItem 
            label="ID do Jogador" 
            action={
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-yellow-500 font-bold bg-yellow-500/10 px-2.5 py-1 rounded-lg border border-yellow-500/20">
                  {profile.playerId || 'Gerando...'}
                </span>
                <button
                  onClick={() => {
                    playClick();
                    if (profile.playerId) {
                      navigator.clipboard.writeText(profile.playerId);
                      toast.success("ID copiado para a área de transferência!");
                    }
                  }}
                  className="bg-white/10 hover:bg-white/20 p-1.5 rounded-lg text-white/80 hover:text-white transition-colors cursor-pointer"
                  title="Copiar ID"
                >
                  <Copy size={14} />
                </button>
              </div>
            } 
          />
          <SettingsItem label={t('logout', settings.language)} action={<button onClick={onLogout} className="bg-red-600 px-4 py-1 rounded-lg font-bold flex items-center gap-2 text-xs"><LogOut size={14} /> {t('logout', settings.language)}</button>} />
        </SettingsGroup>

        <SettingsGroup label={t('gameOptions', settings.language)}>
          <SettingsItem 
            label={t('language', settings.language)} 
            action={
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/60 font-medium">
                  {LANGUAGES.find(l => l.id === (settings.language || 'system'))?.name || 'Idioma do Sistema'}
                </span>
                <button 
                  onClick={() => { playClick(); setIsLangModalOpen(true); }} 
                  className="bg-green-600 hover:bg-green-500 px-4 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer"
                >
                  {t('changeLanguage', settings.language)}
                </button>
              </div>
            } 
          />
          <SettingsItem label={t('sound', settings.language)} action={
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
                  audio.volume = 0.4;
                  audio.play().catch(err => console.log('Test sound error:', err));
                }}
                className="text-[10px] bg-white/10 px-2 py-1 rounded-md hover:bg-white/20 transition-colors"
              >
                {t('testSound', settings.language)}
              </button>
              <Toggle active={settings.soundEnabled} onToggle={() => onUpdateSettings({ ...settings, soundEnabled: !settings.soundEnabled })} playClick={playClick} />
            </div>
          } />
          <SettingsItem label={t('conversations', settings.language)} action={<Toggle active={settings.conversationsEnabled} onToggle={() => onUpdateSettings({ ...settings, conversationsEnabled: !settings.conversationsEnabled })} playClick={playClick} />} />
          <SettingsItem label={t('friendChallenges', settings.language)} action={<Toggle active={settings.friendChallengesOnly} onToggle={() => onUpdateSettings({ ...settings, friendChallengesOnly: !settings.friendChallengesOnly })} playClick={playClick} />} />
          <SettingsItem label={t('notifications', settings.language)} action={<Toggle active={settings.notificationsEnabled} onToggle={() => onUpdateSettings({ ...settings, notificationsEnabled: !settings.notificationsEnabled })} playClick={playClick} />} />
        </SettingsGroup>
      </>
    ) : (
      <div className="space-y-8 py-4 px-2">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
            <Info size={24} className="text-green-500" />
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase">Manual de Regras</h1>
        </div>

        <RuleSection 
          title="Captura Obrigatória" 
          description="Sempre que houver uma peça adversária ao alcance, o salto é mandatório. Não capturar quando possível é contra as regras oficiais." 
        />
        
        <RuleSection 
          title="Lei da Maioria" 
          description="Havendo mais de uma opção de captura, você deve obrigatoriamente escolher o caminho que elimina o maior número de peças adversárias." 
        />

        <RuleSection 
          title="Damas Voadoras" 
          description="Ao atingir a última linha, a peça torna-se Dama, podendo mover-se e capturar em qualquer distância diagonal, tanto para frente quanto para trás." 
        />

        <RuleSection 
          title="Vitória" 
          description="Vence o jogador que capturar todas as peças do adversário ou deixá-lo sem movimentos possíveis." 
        />
      </div>
    )}
  </div>

  {isLangModalOpen && (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a0f0a] border border-white/10 rounded-3xl w-full max-w-md p-6 relative flex flex-col max-h-[85vh]"
      >
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
          <h2 className="text-lg font-black uppercase text-yellow-500 tracking-wide">
            {t('selectLanguageTitle', settings.language)}
          </h2>
          <button 
            onClick={() => { playClick(); setIsLangModalOpen(false); }}
            className="p-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar">
          {LANGUAGES.map((lang) => {
            const isSelected = (settings.language || 'system') === lang.id;
            return (
              <button
                key={lang.id}
                onClick={() => {
                  playClick();
                  onUpdateSettings({ ...settings, language: lang.id });
                  setIsLangModalOpen(false);
                  toast.success(t('languageChanged', lang.id));
                }}
                className={cn(
                  "w-full flex items-center justify-between p-3.5 rounded-xl border font-bold text-sm transition-all cursor-pointer text-left",
                  isSelected 
                    ? "bg-green-600/20 border-green-500 text-green-400" 
                    : "bg-white/5 border-white/5 text-white/80 hover:bg-white/10 hover:border-white/10"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{lang.flag}</span>
                  <span>{lang.name}</span>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20">
                    <Check size={12} className="text-black stroke-[3px]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => { playClick(); setIsLangModalOpen(false); }}
          className="mt-4 w-full py-2.5 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all border border-white/5 cursor-pointer"
        >
          {t('close', settings.language)}
        </button>
      </motion.div>
    </div>
  )}

  {isTermsOpen && (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a0f0a] border border-white/10 rounded-3xl w-full max-w-lg p-6 relative flex flex-col max-h-[85vh]"
      >
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
          <h2 className="text-lg font-black uppercase text-yellow-500 tracking-wide">
            Terms & Conditions
          </h2>
          <button 
            onClick={() => { playClick(); setIsTermsOpen(false); }}
            className="p-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 no-scrollbar space-y-4">
          {/* Logo svosoftware */}
          <div className="flex flex-col items-center justify-center py-4 px-6 bg-white/5 rounded-2xl border border-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 opacity-50 animate-pulse" />
            <div className="relative flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 font-mono font-black text-white text-sm tracking-tighter">
                sv
              </div>
              <span className="text-lg font-black tracking-tight text-white font-sans">
                svo<span className="text-blue-400 font-normal">software</span>
              </span>
            </div>
            <p className="text-[8px] uppercase tracking-widest text-white/40 font-black mt-2">Gaming & Software Solutions</p>
          </div>

          <div className="text-xs text-white/70 space-y-3 leading-relaxed font-sans text-justify">
            <p className="font-extrabold text-white text-sm tracking-tight border-b border-white/5 pb-1 uppercase">Damas Mestre Brasil - End User Agreement</p>
            <p>Welcome to Damas Mestre Brasil, an online checkers game developed by <span className="text-blue-400 font-bold">svosoftware</span>. By accessing, downloading or playing the game, you agree to be legally bound by these Terms and Conditions.</p>
            
            <div className="space-y-1">
              <h3 className="font-black text-yellow-500 uppercase text-[10px] tracking-wider">1. License Grant & Restrictions</h3>
              <p className="text-white/60">svosoftware grants you a non-exclusive, non-transferable, revocable license to access and play Damas Mestre Brasil solely for personal, non-commercial entertainment purposes. You agree not to copy, modify, distribute, or reverse engineer any part of the game.</p>
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-yellow-500 uppercase text-[10px] tracking-wider">2. Account & Virtual Assets</h3>
              <p className="text-white/60">Your progress, virtual coins, gems, emotes, and board custom cosmetics are tied to your profile. Virtual assets have no real-world monetary value and cannot be transferred or exchanged for real currency. svosoftware reserves the right to manage, regulate, control, modify, or eliminate virtual currency or assets at any time.</p>
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-yellow-500 uppercase text-[10px] tracking-wider">3. Fair Play & Conduct</h3>
              <p className="text-white/60">We promote a fun, safe, and competitive environment. You agree not to use cheats, automation software, hacks, or unauthorized third-party modifications. Any exploitation of bugs or game mechanics is strictly prohibited and can result in account suspension.</p>
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-yellow-500 uppercase text-[10px] tracking-wider">4. Termination of Access</h3>
              <p className="text-white/60">svosoftware reserves the right to suspend or terminate your account and access to the game services at its sole discretion, without notice, for conduct violating these Terms.</p>
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-yellow-500 uppercase text-[10px] tracking-wider">5. Disclaimer of Warranties</h3>
              <p className="text-white/60">The game is provided "as is" and "as available" without warranties of any kind, either express or implied. svosoftware does not guarantee that the game will be uninterrupted, secure, or free from bugs.</p>
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-yellow-500 uppercase text-[10px] tracking-wider">6. Limitation of Liability</h3>
              <p className="text-white/60">In no event shall svosoftware, its developers, or affiliates be liable for any direct, indirect, incidental, or consequential damages arising out of your use or inability to use the game.</p>
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-yellow-500 uppercase text-[10px] tracking-wider">7. Updates to Terms</h3>
              <p className="text-white/60">We may modify these terms at any time. Your continued play after updates constitutes acceptance of the new terms.</p>
            </div>

            <div className="border-t border-white/5 pt-2.5 mt-4 text-center">
              <p className="text-[10px] font-bold text-white/40">CONTACT & SUPPORT</p>
              <p className="text-xs font-black text-blue-400 mt-0.5">svosoftware@gmail.com</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => { playClick(); setIsTermsOpen(false); }}
          className="mt-4 w-full py-2.5 bg-yellow-600 hover:bg-yellow-500 rounded-xl font-bold text-xs uppercase tracking-wider text-black transition-all cursor-pointer shadow-lg shadow-yellow-600/10"
        >
          {t('close', settings.language)}
        </button>
      </motion.div>
    </div>
  )}

  {isPrivacyOpen && (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0b131a] border border-white/10 rounded-3xl w-full max-w-lg p-6 relative flex flex-col max-h-[85vh]"
      >
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
          <h2 className="text-lg font-black uppercase text-emerald-500 tracking-wide">
            Privacy Policy
          </h2>
          <button 
            onClick={() => { playClick(); setIsPrivacyOpen(false); }}
            className="p-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 no-scrollbar space-y-4">
          {/* Logo svosoftware */}
          <div className="flex flex-col items-center justify-center py-4 px-6 bg-white/5 rounded-2xl border border-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 opacity-50 animate-pulse" />
            <div className="relative flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 font-mono font-black text-white text-sm tracking-tighter">
                sv
              </div>
              <span className="text-lg font-black tracking-tight text-white font-sans">
                svo<span className="text-blue-400 font-normal">software</span>
              </span>
            </div>
            <p className="text-[8px] uppercase tracking-widest text-white/40 font-black mt-2">Gaming & Software Solutions</p>
          </div>

          <div className="text-xs text-white/70 space-y-3 leading-relaxed font-sans text-justify">
            <p className="font-extrabold text-white text-sm tracking-tight border-b border-white/5 pb-1 uppercase">Damas Mestre Brasil - Privacy Policy</p>
            <p>At Damas Mestre Brasil, developed by <span className="text-blue-400 font-bold">svosoftware</span>, your privacy is extremely important to us. This Privacy Policy describes how we collect, use, and protect your information when you play our game.</p>
            
            <div className="space-y-1">
              <h3 className="font-black text-emerald-500 uppercase text-[10px] tracking-wider">1. Information We Collect</h3>
              <p className="text-white/60">We may collect user profile details (such as username, avatar, email, and social login identifiers) to manage your game progress, virtual assets, matches, and achievements. We also collect basic gameplay data, device model, and connection status for matchmaking and leaderboard updates.</p>
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-emerald-500 uppercase text-[10px] tracking-wider">2. How We Use Information</h3>
              <p className="text-white/60">Your data is utilized strictly to provide, maintain, personalize, and improve the gaming experience. This includes syncing your progress, managing multiplayer matchups, processing global leaderboard rankings, and distributing Lucky Box rewards.</p>
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-emerald-500 uppercase text-[10px] tracking-wider">3. Data Sharing & Security</h3>
              <p className="text-white/60">We do not sell, trade, or rent your personal identification information to third parties. Gameplay statistics and usernames are publicly visible inside the game's leaderboards and clan sections. We employ standard industry security protocols to keep your information safe.</p>
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-emerald-500 uppercase text-[10px] tracking-wider">4. Third-Party Services</h3>
              <p className="text-white/60">The game uses secure backend systems (such as Google Firebase) for user authentication and data persistence. These external services are operated under their respective privacy rules and secure policies.</p>
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-emerald-500 uppercase text-[10px] tracking-wider">5. Your Data Rights</h3>
              <p className="text-white/60">You have the right to request access to or deletion of your profile data. If you wish to delete your account or have any privacy-related inquiries, please contact us directly via email.</p>
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-emerald-500 uppercase text-[10px] tracking-wider">6. Policy Changes</h3>
              <p className="text-white/60">svosoftware may update this Privacy Policy from time to time. We encourage players to check this page periodically for any changes. Your continued play after updates signifies your consent.</p>
            </div>

            <div className="border-t border-white/5 pt-2.5 mt-4 text-center">
              <p className="text-[10px] font-bold text-white/40">PRIVACY & DATA PROTECTION</p>
              <p className="text-xs font-black text-blue-400 mt-0.5">svosoftware@gmail.com</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => { playClick(); setIsPrivacyOpen(false); }}
          className="mt-4 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-xs uppercase tracking-wider text-black transition-all cursor-pointer shadow-lg shadow-emerald-600/10"
        >
          {t('close', settings.language)}
        </button>
      </motion.div>
    </div>
  )}

  {isInfoOpen && (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0f111a] border border-white/10 rounded-3xl w-full max-w-lg p-6 relative flex flex-col max-h-[85vh]"
      >
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
          <h2 className="text-lg font-black uppercase text-blue-500 tracking-wide">
            Informações do Jogo
          </h2>
          <button 
            onClick={() => { playClick(); setIsInfoOpen(false); }}
            className="p-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 no-scrollbar space-y-4">
          {/* Logo svosoftware */}
          <div className="flex flex-col items-center justify-center py-5 px-6 bg-white/5 rounded-2xl border border-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 opacity-50 animate-pulse" />
            <div className="relative flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 font-mono font-black text-white text-base tracking-tighter">
                sv
              </div>
              <span className="text-xl font-black tracking-tight text-white font-sans">
                svo<span className="text-blue-400 font-normal">software</span>
              </span>
            </div>
            <p className="text-[8px] uppercase tracking-widest text-white/40 font-black mt-2">Gaming & Software Solutions</p>
          </div>

          <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/50 font-bold uppercase tracking-wider text-[10px]">Jogo</span>
              <span className="font-extrabold text-white text-sm italic">Damas Mestre Brasil</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/50 font-bold uppercase tracking-wider text-[10px]">Desenvolvedor</span>
              <span className="font-extrabold text-yellow-500 text-sm">Tuico Martins</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/50 font-bold uppercase tracking-wider text-[10px]">Empresa</span>
              <span className="font-extrabold text-blue-400 text-sm">svosoftware</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/50 font-bold uppercase tracking-wider text-[10px]">Versão</span>
              <span className="font-extrabold text-white text-sm">1.0</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/50 font-bold uppercase tracking-wider text-[10px]">Ano de Lançamento</span>
              <span className="font-extrabold text-white text-sm">2026</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/50 font-bold uppercase tracking-wider text-[10px]">Suporte</span>
              <span className="font-extrabold text-blue-400 text-xs">svosoftware@gmail.com</span>
            </div>
          </div>

          <div className="text-xs text-white/70 space-y-2 leading-relaxed font-sans text-justify">
            <h3 className="font-black text-blue-400 uppercase text-[10px] tracking-wider">Sobre o Damas Mestre Brasil</h3>
            <p className="text-white/60 font-medium">O <span className="text-white font-bold">Damas Mestre Brasil</span> é a experiência definitiva do jogo clássico de damas. Projetado com visual moderno e de alta fidelidade, ele conta com um ecossistema completo de jogo contra o robô (CPU), partidas locais e uma Caixa da Sorte cheia de colecionáveis, emotes interativos, tabuleiros customizados, peças exclusivas e fundos animados para personalizar a sua jogatina ao máximo.</p>
            
            <h3 className="font-black text-blue-400 uppercase text-[10px] tracking-wider pt-1">Desenvolvimento e Tecnologia</h3>
            <p className="text-white/60 font-medium">Criado com paixão para oferecer o melhor desempenho e responsividade. Utiliza tecnologias web modernas de ponta, animações fluidas via Framer Motion e uma interface de alta definição estilizada com Tailwind CSS.</p>
          </div>
        </div>

        <button
          onClick={() => { playClick(); setIsInfoOpen(false); }}
          className="mt-4 w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all cursor-pointer shadow-lg shadow-blue-600/10"
        >
          {t('close', settings.language)}
        </button>
      </motion.div>
    </div>
  )}
</motion.div>
);
}

function SettingsGroup({ label, children }: { label: string, children: React.ReactNode }) {
return (
<div className="space-y-2">
  <h3 className="text-xs font-bold uppercase tracking-widest text-yellow-500 ml-2">{label}</h3>
  <div className="bg-black/20 rounded-2xl overflow-hidden border border-white/5">
    {children}
  </div>
</div>
);
}

function RuleSection({ title, description }: { title: string, description: string }) {
return (
<div className="space-y-2">
  <div className="flex items-center gap-2">
    <div className="w-2 h-2 rounded-full bg-green-500" />
    <h3 className="text-lg font-black uppercase tracking-wide text-white">{title}</h3>
  </div>
  <p className="text-sm text-white/60 leading-relaxed font-medium">
    {description}
  </p>
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

function Toggle({ active, onToggle, playClick }: { active?: boolean, onToggle?: () => void, playClick?: () => void }) {
  return (
    <div 
      onClick={() => { playClick?.(); onToggle?.(); }}
      className={cn("w-10 h-6 rounded-full p-1 transition-all cursor-pointer", active ? "bg-green-600" : "bg-gray-700")}
    >
      <div className={cn("w-4 h-4 bg-white rounded-full transition-all", active ? "translate-x-4" : "translate-x-0")} />
    </div>
  );
}

function FriendsScreen({ profile, onBack, onChallenge, onWatch, playClick, onNavigate }: { profile: any, onBack: () => void, onChallenge: (target: any) => void, onWatch: (gameId: string) => void, playClick: () => void, onNavigate: (screen: Screen) => void, key?: string }) {
  const [activeTab, setActiveTab] = useState<'challenge' | 'clanFriends' | 'messages'>('challenge');
  const [searchQuery, setSearchQuery] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [clanMembers, setClanMembers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sync clan members from Firestore if user is in a clan
  useEffect(() => {
    if (!profile?.clanId) return;
    const membersRef = collection(db, 'clans', profile.clanId, 'members');
    const unsubscribe = onSnapshot(membersRef, (snapshot) => {
      const membersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClanMembers(membersData);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `clans/${profile.clanId}/members`);
    });
    return () => unsubscribe();
  }, [profile?.clanId]);

  // Fetch all real users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, limit(50));
        const querySnapshot = await getDocs(q);
        const usersData = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(u => u.id !== profile.uid); // Filter out current user
        setAllUsers(usersData);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'users');
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, [profile.uid]);

  const filteredAllUsers = allUsers
    .filter(u => 
      (u.displayName || 'Jogador').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const trophiesA = a.trophies || 0;
      const trophiesB = b.trophies || 0;
      if (trophiesB !== trophiesA) {
        return trophiesB - trophiesA;
      }
      const lvlA = a.level || 1;
      const lvlB = b.level || 1;
      if (lvlB !== lvlA) {
        return lvlB - lvlA;
      }
      return (a.displayName || '').localeCompare(b.displayName || '');
    });

  const filteredClanMembers = clanMembers
    .filter(m => 
      (m.name || 'Membro').toLowerCase().includes(searchQuery.toLowerCase()) && m.uid !== profile.uid
    )
    .sort((a, b) => {
      const trophiesA = a.trophies || 0;
      const trophiesB = b.trophies || 0;
      if (trophiesB !== trophiesA) {
        return trophiesB - trophiesA;
      }
      return (a.name || '').localeCompare(b.name || '');
    });

  const getWinRate = (wins: number = 0, total: number = 0) => {
    if (!total) return 0;
    return Math.round((wins / total) * 100);
  };

  const xpPercentage = (profile?.xp || 0) % 100;

  return (
    <motion.div 
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      className="flex flex-col h-full bg-gradient-to-b from-[#1a0f0a]/95 via-[#2a1a10]/95 to-[#150a05]/95 backdrop-blur-xl relative z-10"
    >
      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        playClick={playClick} 
      />

      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-white/5 bg-black/20">
        <button 
          onClick={onBack} 
          className="p-2 bg-white/5 hover:bg-white/10 active:scale-95 transition-all rounded-xl border border-white/10"
        >
          <ChevronLeft size={20} className="text-amber-400" />
        </button>
        <h2 className="text-lg font-black tracking-wider uppercase bg-gradient-to-r from-yellow-400 via-amber-300 to-amber-500 bg-clip-text text-transparent italic flex items-center gap-2">
          <Users size={20} className="text-yellow-500" />
          Amigos & Clã
        </h2>
        <button 
          onClick={() => { playClick(); setIsShareModalOpen(true); }}
          className="p-2 bg-yellow-600/10 hover:bg-yellow-600/20 border border-yellow-500/20 active:scale-95 transition-all rounded-xl text-yellow-500"
          title="Convidar Amigo"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        
        {/* User Card Dashboard */}
        <div className="bg-gradient-to-r from-[#3d2b1f]/80 to-[#2c1d13]/80 backdrop-blur-md rounded-2xl p-4 border border-yellow-600/30 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none -mr-8 -mt-8" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none -ml-6 -mb-6" />
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <img 
                src={profile.photoURL || `https://picsum.photos/seed/${profile.uid}/100/100`} 
                alt={profile.displayName || 'Meu Perfil'} 
                className="w-14 h-14 rounded-full border-2 border-yellow-500 shadow-lg shadow-yellow-500/10" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full border border-[#2a1a10] uppercase">
                Lvl {profile.level || 1}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white truncate">{profile.displayName || 'Jogador'}</h3>
                {profile.clanTag && (
                  <span className="bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 text-[9px] font-black px-1.5 py-0.5 rounded-md">
                    [{profile.clanTag}]
                  </span>
                )}
              </div>
              
              {/* XP progress bar */}
              <div className="mt-2">
                <div className="flex justify-between text-[10px] text-white/50 mb-1">
                  <span>Progresso do Nível</span>
                  <span className="font-mono text-yellow-500">{xpPercentage}%</span>
                </div>
                <div className="w-full bg-black/40 rounded-full h-1.5 p-0.5 border border-white/5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-yellow-500 to-amber-500 h-full rounded-full shadow-[0_0_8px_rgba(234,179,8,0.5)] transition-all duration-500"
                    style={{ width: `${xpPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/5 text-center">
            <div className="bg-black/20 rounded-xl p-2 border border-white/5">
              <div className="flex items-center justify-center gap-1 text-yellow-500 mb-0.5">
                <Trophy size={14} className="animate-bounce" />
                <span className="text-xs font-black">{profile.trophies || 0}</span>
              </div>
              <p className="text-[8px] uppercase font-bold text-white/40 tracking-wider">Troféus</p>
            </div>
            <div className="bg-black/20 rounded-xl p-2 border border-white/5">
              <div className="flex items-center justify-center gap-1 text-amber-400 mb-0.5">
                <Coins size={14} />
                <span className="text-xs font-black">{profile.coins || 0}</span>
              </div>
              <p className="text-[8px] uppercase font-bold text-white/40 tracking-wider">Moedas</p>
            </div>
            <div className="bg-black/20 rounded-xl p-2 border border-white/5">
              <div className="flex items-center justify-center gap-1 text-teal-400 mb-0.5">
                <Gem size={14} />
                <span className="text-xs font-black">{profile.gems || 0}</span>
              </div>
              <p className="text-[8px] uppercase font-bold text-white/40 tracking-wider font-sans">Gemas</p>
            </div>
          </div>
        </div>

        {/* Painel Social & Clã */}
        <div className="bg-gradient-to-br from-[#301d12]/80 to-[#1e1008]/80 rounded-2xl p-4 border border-yellow-600/20 shadow-xl space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-yellow-600/10 flex items-center justify-center border border-yellow-500/25">
                <Shield size={18} className="text-yellow-500 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase text-yellow-500 tracking-wider">Social & Clã</h4>
                <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest mt-0.5">Gerenciar equipes e competições</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2.5">
            <button 
              onClick={() => { playClick(); onNavigate('clan'); }} 
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white py-2.5 px-4 rounded-xl font-extrabold text-xs transition-all shadow-md active:scale-95 border-b-2 border-blue-900 cursor-pointer uppercase italic tracking-wider"
            >
              <Shield size={13} />
              {profile.clanId ? 'Ver Meu Clã' : 'Criar Clã'}
            </button>
            
            <button 
              onClick={() => { playClick(); onNavigate('clan'); }} 
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-700 to-emerald-700 hover:from-green-600 hover:to-emerald-600 text-white py-2.5 px-4 rounded-xl font-extrabold text-xs transition-all shadow-md active:scale-95 border-b-2 border-green-900 cursor-pointer uppercase italic tracking-wider"
            >
              <Users size={13} />
              {profile.clanId ? 'Mudar Clã' : 'Buscar Clãs'}
            </button>
          </div>
        </div>

        {/* Searching Box */}
        <div className="relative">
          <input 
            type="text" 
            placeholder="Buscar jogadores pelo nome..." 
            className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 text-white placeholder-white/30 transition-all shadow-inner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Segmented Controls (Tabs) */}
        <div className="bg-black/40 p-1 rounded-xl flex gap-1 border border-white/5">
          <button 
            onClick={() => { playClick(); setActiveTab('challenge'); }}
            className={cn(
              "flex-1 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5", 
              activeTab === 'challenge' 
                ? "bg-gradient-to-r from-yellow-600 to-amber-600 text-black shadow-lg" 
                : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            <Users size={14} />
            Jogadores
          </button>
          <button 
            onClick={() => { playClick(); setActiveTab('clanFriends'); }}
            className={cn(
              "flex-1 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5", 
              activeTab === 'clanFriends' 
                ? "bg-gradient-to-r from-yellow-600 to-amber-600 text-black shadow-lg" 
                : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            <Shield size={14} />
            Membros
          </button>
          <button 
            onClick={() => { playClick(); setActiveTab('messages'); }}
            className={cn(
              "flex-1 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5", 
              activeTab === 'messages' 
                ? "bg-gradient-to-r from-yellow-600 to-amber-600 text-black shadow-lg" 
                : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            <MessageSquare size={14} />
            Mensagens
          </button>
        </div>

        {/* Lists Content */}
        <div>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-white/40">
              <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(234,179,8,0.3)]" />
              <p className="text-xs font-bold uppercase tracking-widest text-yellow-500 animate-pulse">Sincronizando Jogadores...</p>
            </div>
          ) : activeTab === 'challenge' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-black uppercase text-yellow-500/70 tracking-wider">Lobby Global</h3>
                <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[8px] font-bold text-green-400">{allUsers.length} ONLINE</span>
                </div>
              </div>

              {filteredAllUsers.length > 0 ? (
                <div className="space-y-2.5">
                  {filteredAllUsers.map((player) => {
                    const isOnline = player.status === 'online';
                    const isPlaying = player.status === 'playing';
                    const winRate = getWinRate(player.wins, player.totalGames);

                    return (
                      <motion.div 
                        key={player.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/[0.03] hover:bg-white/[0.06] rounded-2xl p-3 flex items-center gap-4 border border-white/5 hover:border-white/10 transition-all duration-300 shadow-md group relative overflow-hidden"
                      >
                        {/* Glow on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/0 to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                        {/* Avatar */}
                        <div className="relative">
                          <img 
                            src={player.photoURL || `https://picsum.photos/seed/${player.id}/100/100`} 
                            alt={player.displayName} 
                            className={cn(
                              "w-12 h-12 rounded-full border-2 transition-all duration-300",
                              isOnline ? "border-green-500" : isPlaying ? "border-amber-500 animate-pulse" : "border-white/10 grayscale"
                            )} 
                            referrerPolicy="no-referrer" 
                          />
                          <span className={cn(
                            "absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#1a0f0a] shadow-inner",
                            isOnline ? "bg-green-500 shadow-green-500/50" : isPlaying ? "bg-amber-500 shadow-amber-500/50" : "bg-gray-500"
                          )} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <h4 className="font-bold text-sm text-white truncate">{player.displayName || 'Jogador'}</h4>
                            <span className="bg-white/10 text-white/60 text-[8px] font-bold px-1 py-0.5 rounded">
                              Lvl {player.level || 1}
                            </span>
                          </div>
                          
                          {/* Player Stats Bar */}
                          <div className="flex items-center gap-3 text-[10px] text-white/50 font-medium">
                            <span className="flex items-center gap-0.5 text-yellow-500/80">
                              <Trophy size={10} />
                              {player.trophies || 0}
                            </span>
                            {player.totalGames > 0 && (
                              <span className="flex items-center gap-1 text-indigo-400">
                                <Flame size={10} />
                                {winRate}% Taxa
                              </span>
                            )}
                            <span className={cn(
                              "font-bold uppercase text-[9px] tracking-wide",
                              isOnline ? "text-green-500" : isPlaying ? "text-amber-500" : "text-white/30"
                            )}>
                              {isOnline ? 'Disponível' : isPlaying ? 'Em Partida' : 'Offline'}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 shrink-0">
                          {isPlaying && player.currentGameId && (
                            <button 
                              onClick={() => onWatch(player.currentGameId)}
                              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 shadow-lg shadow-emerald-950/50 px-3 py-1.5 rounded-xl text-[10px] font-black italic active:scale-95 transition-all flex items-center gap-1 text-white border-b-2 border-emerald-800 active:border-b-0"
                            >
                              <Eye size={12} className="animate-pulse" /> ASSISTIR
                            </button>
                          )}
                          {!isPlaying && (
                            <button 
                              onClick={() => onChallenge({ uid: player.id, name: player.displayName || 'Jogador' })}
                              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-950/50 px-3.5 py-2 rounded-xl text-xs font-black italic active:scale-95 transition-all text-white border-b-2 border-blue-800 active:border-b-0 flex items-center gap-1"
                            >
                              <Sword size={12} /> DESAFIAR
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                  <Users size={48} className="text-white/20 animate-pulse" />
                  <div className="space-y-1">
                    <p className="font-bold text-white/80">Nenhum jogador encontrado</p>
                    <p className="text-xs text-white/40 max-w-[220px] mx-auto">Nenhum jogador corresponde à sua busca no momento.</p>
                  </div>
                  <button 
                    onClick={() => { playClick(); setIsShareModalOpen(true); }}
                    className="bg-gradient-to-r from-yellow-600 to-amber-600 text-black px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:from-yellow-500 hover:to-amber-500 active:scale-95 transition-all text-sm"
                  >
                    <Plus size={18} /> Convidar Amigos
                  </button>
                </div>
              )}
            </div>
          ) : activeTab === 'clanFriends' ? (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase text-yellow-500/70 tracking-wider ml-1">Membros Ativos</h3>
              
              {!profile?.clanId ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                  <Shield size={48} className="text-yellow-600/40 animate-pulse" />
                  <div className="space-y-1">
                    <p className="font-bold text-white/80">Você não tem um Clã</p>
                    <p className="text-xs text-white/40 max-w-[220px] mx-auto">Participe ou crie um Clã para desafiar seus companheiros de equipe e ganhar prêmios!</p>
                  </div>
                  <button 
                    onClick={() => { playClick(); onBack(); onNavigate('clan'); }}
                    className="bg-gradient-to-r from-yellow-600 to-amber-600 text-black px-6 py-2.5 rounded-xl font-bold flex items-center gap-1.5 shadow-lg hover:from-yellow-500 hover:to-amber-500 active:scale-95 transition-all text-sm"
                  >
                    <Shield size={16} /> Explorar Clãs
                  </button>
                </div>
              ) : filteredClanMembers.length > 0 ? (
                <div className="space-y-2.5">
                  {filteredClanMembers.map((member) => {
                    const isOnline = member.status === 'online';
                    const isPlaying = member.status === 'playing';

                    return (
                      <motion.div 
                        key={member.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/[0.03] hover:bg-white/[0.06] rounded-2xl p-3 flex items-center gap-4 border border-white/5 hover:border-white/10 transition-all duration-300 shadow-md group relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/0 to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                        {/* Avatar */}
                        <div className="relative">
                          <img 
                            src={member.avatar || `https://picsum.photos/seed/${member.uid}/100/100`} 
                            alt={member.name} 
                            className={cn(
                              "w-12 h-12 rounded-full border-2 transition-all duration-300",
                              isOnline ? "border-green-500" : isPlaying ? "border-amber-500 animate-pulse" : "border-white/10 grayscale"
                            )} 
                            referrerPolicy="no-referrer" 
                          />
                          <span className={cn(
                            "absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#1a0f0a] shadow-inner",
                            isOnline ? "bg-green-500" : isPlaying ? "bg-amber-500" : "bg-gray-500"
                          )} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <h4 className="font-bold text-sm text-white truncate">{member.name}</h4>
                            <span className={cn(
                              "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider",
                              member.role === 'leader' ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" : "bg-white/10 text-white/60"
                            )}>
                              {member.role === 'leader' ? 'Líder' : 'Membro'}
                            </span>
                          </div>
                          
                          {/* Member Stats */}
                          <div className="flex items-center gap-3 text-[10px] text-white/50 font-medium">
                            <span className="flex items-center gap-0.5 text-yellow-500/80">
                              <Trophy size={10} />
                              {member.trophies || 0}
                            </span>
                            <span className={cn(
                              "font-bold uppercase text-[9px] tracking-wide",
                              isOnline ? "text-green-500" : isPlaying ? "text-amber-500" : "text-white/30"
                            )}>
                              {isOnline ? 'Online' : isPlaying ? 'Em Partida' : 'Offline'}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 shrink-0">
                          {isPlaying && member.currentGameId && (
                            <button 
                              onClick={() => onWatch(member.currentGameId)}
                              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 shadow-lg shadow-emerald-950/50 px-3 py-1.5 rounded-xl text-[10px] font-black italic active:scale-95 transition-all flex items-center gap-1 text-white border-b-2 border-emerald-800 active:border-b-0"
                            >
                              <Eye size={12} className="animate-pulse" /> ASSISTIR
                            </button>
                          )}
                          {!isPlaying && (
                            <button 
                              onClick={() => onChallenge({ uid: member.uid, name: member.name })}
                              className="bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 shadow-lg shadow-amber-950/50 px-3.5 py-2 rounded-xl text-xs font-black italic active:scale-95 transition-all text-black border-b-2 border-yellow-800 active:border-b-0 flex items-center gap-1"
                            >
                              <Sword size={12} /> DESAFIAR
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center py-8 text-xs text-white/30 italic">Nenhum membro encontrado correspondente à busca.</p>
              )}
            </div>
          ) : (
            /* Elegant messages view placeholder */
            <div className="flex flex-col items-center justify-center py-12 text-center gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-6">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 mb-2 relative">
                <MessageSquare size={32} className="animate-pulse" />
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-yellow-500 rounded-full" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-white/85">Chat da Partida Ativo</p>
                <p className="text-xs text-white/40 max-w-[240px] mx-auto leading-relaxed">
                  Para manter as partidas focadas, o chat em tempo real é integrado diretamente no tabuleiro de jogo!
                </p>
              </div>
              
              <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-left w-full text-xs text-white/60 space-y-1">
                <p className="font-semibold text-yellow-500">Como funciona?</p>
                <p>1. Inicie um desafio contra qualquer jogador.</p>
                <p>2. Clique no ícone de balão de fala no jogo.</p>
                <p>3. Converse em tempo real enquanto joga!</p>
              </div>

              <button 
                onClick={() => { playClick(); setActiveTab('challenge'); }}
                className="bg-gradient-to-r from-yellow-600 to-amber-600 text-black px-6 py-2.5 rounded-xl font-bold shadow-lg hover:from-yellow-500 hover:to-amber-500 active:scale-95 transition-all text-xs"
              >
                Ver Jogadores Online
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function TournamentInviteModal({ invite, onAccept, onDecline }: { invite: any, onAccept: () => void, onDecline: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#2a1a10] border-2 border-yellow-600 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center"
      >
        <div className="w-16 h-16 bg-yellow-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-yellow-600">
          <Trophy size={32} className="text-yellow-500" />
        </div>
        <h2 className="text-xl font-black uppercase italic mb-2">Convite de Torneio!</h2>
        <p className="text-white/70 text-sm mb-6">
          <span className="text-yellow-500 font-bold">{invite.senderName}</span> convidou você para participar de um torneio de damas!
        </p>
        <div className="flex gap-3">
          <button 
            onClick={onDecline}
            className="flex-1 py-3 bg-red-900/50 rounded-xl font-bold uppercase text-xs border border-red-500/30"
          >
            Recusar
          </button>
          <button 
            onClick={onAccept}
            className="flex-1 py-3 bg-green-600 rounded-xl font-bold uppercase text-xs shadow-lg border-b-4 border-green-900 active:border-b-0 active:translate-y-1 transition-all"
          >
            Aceitar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function MatchInvitationModal({ invitation, onAccept, onDecline }: { invitation: any, onAccept: () => void, onDecline: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#1a0f0a] border-2 border-blue-600 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center"
      >
        <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-blue-600">
          <Sword size={32} className="text-blue-500" />
        </div>
        <h2 className="text-xl font-black uppercase italic mb-2 text-blue-400">Hora de Jogar!</h2>
        <p className="text-white/70 text-sm mb-6">
          <span className="text-blue-400 font-bold">{invitation.inviterName}</span> está te chamando para a partida do torneio!
        </p>
        <div className="flex gap-3">
          <button 
            onClick={onDecline}
            className="flex-1 py-3 bg-red-900/50 rounded-xl font-bold uppercase text-xs border border-red-500/30"
          >
            Recusar
          </button>
          <button 
            onClick={onAccept}
            className="flex-1 py-3 bg-blue-600 rounded-xl font-bold uppercase text-xs shadow-lg border-b-4 border-blue-900 active:border-b-0 active:translate-y-1 transition-all"
          >
            Aceitar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function CreateTournamentModal({ profile, onClose, playClick }: { profile: any, onClose: () => void, playClick: () => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'), limit(50));
        const snapshot = await getDocs(q);
        const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }))
          .filter(u => u.uid !== profile.uid);
        setAllUsers(users);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'users');
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, [profile.uid]);

  const filteredUsers = allUsers.filter(u => 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.clanName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = async () => {
    if (selectedUsers.length === 0) return;
    playClick();
    setIsCreating(true);
    try {
      const tournamentId = `tournament_${Date.now()}`;
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 6);

      const participants = [profile.uid, ...selectedUsers];
      const { matches, numRounds } = generateTournamentMatches(participants);

      const tournamentData = {
        id: tournamentId,
        creatorId: profile.uid,
        creatorName: profile.displayName || 'Jogador',
        participants: participants,
        status: 'active',
        createdAt: serverTimestamp(),
        expiresAt: expiresAt,
        matches: matches,
        currentRound: 1,
        totalRounds: numRounds,
        scores: participants.reduce((acc, uid) => ({ ...acc, [uid]: 0 }), {})
      };

      await setDoc(doc(db, 'tournaments', tournamentId), tournamentData);

      // Send invites as notifications
      for (const targetId of selectedUsers) {
        const inviteId = `invite_${tournamentId}_${targetId}`;
        await setDoc(doc(db, 'tournament_invites', inviteId), {
          id: inviteId,
          tournamentId,
          senderId: profile.uid,
          senderName: profile.displayName || 'Jogador',
          targetId,
          status: 'pending',
          timestamp: serverTimestamp()
        });
      }

      toast.success('Torneio criado! O chaveamento foi gerado e o tempo de 6 horas começou.');
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'tournaments');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#2a1a10] border-2 border-green-600 rounded-2xl w-full max-w-md h-[600px] flex flex-col shadow-2xl"
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-black uppercase italic">Criar Torneio</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
            <input 
              type="text" 
              placeholder="Buscar amigos ou clãs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-green-500 transition-colors"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-[350px] scrollbar-hide">
            {isLoading ? (
              <div className="py-10 text-center text-white/40 italic">Carregando jogadores...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-10 text-center text-white/40 italic">Nenhum jogador encontrado</div>
            ) : (
              filteredUsers.map((u) => (
                <div 
                  key={u.uid}
                  onClick={() => {
                    if (selectedUsers.includes(u.uid)) {
                      setSelectedUsers(selectedUsers.filter(id => id !== u.uid));
                    } else {
                      setSelectedUsers([...selectedUsers, u.uid]);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                    selectedUsers.includes(u.uid) 
                      ? "bg-green-600/20 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)]" 
                      : "bg-black/20 border-white/5 hover:bg-black/40"
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-900/50 flex items-center justify-center border border-white/10 overflow-hidden">
                    {u.photoURL ? <img src={u.photoURL} alt="" className="w-full h-full object-cover" /> : <User size={20} />}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{u.displayName || 'Jogador'}</div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider">{u.clanName ? `[${u.clanTag}] ${u.clanName}` : 'Sem Clã'}</div>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                    selectedUsers.includes(u.uid) ? "bg-green-500 border-green-500" : "border-white/20"
                  )}>
                    {selectedUsers.includes(u.uid) && <Zap size={12} className="text-white" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-auto p-4 border-t border-white/10">
          <button 
            onClick={handleCreate}
            disabled={selectedUsers.length === 0 || isCreating}
            className={cn(
              "w-full py-4 rounded-xl font-black uppercase italic shadow-lg border-b-4 transition-all flex items-center justify-center gap-2",
              selectedUsers.length > 0 && !isCreating
                ? "bg-green-600 border-green-900 hover:bg-green-500 active:border-b-0 active:translate-y-1" 
                : "bg-white/5 border-white/10 text-white/20 cursor-not-allowed opacity-50 grayscale"
            )}
          >
            {isCreating ? (
              <>
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
                Criando...
              </>
            ) : (
              <>
                <Trophy size={20} />
                Criar e Convidar ({selectedUsers.length})
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function TournamentCountdown({ expiresAt, showProgressBar = false }: { expiresAt: any, showProgressBar?: boolean }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, totalMs: 0 });

  useEffect(() => {
    const calculate = () => {
      const targetDate = expiresAt?.toDate ? expiresAt.toDate() : new Date(expiresAt);
      const diff = targetDate.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, totalMs: 0 });
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours, minutes, seconds, totalMs: diff });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const { hours, minutes, seconds, totalMs } = timeLeft;
  
  if (totalMs <= 0) {
    return (
      <span className="font-bold text-red-500 uppercase tracking-widest text-[10px] flex items-center justify-center gap-1 animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Expirado
      </span>
    );
  }

  // 6 hours total
  const totalDuration = 6 * 60 * 60 * 1000;
  const progressPercent = Math.max(0, Math.min(100, (totalMs / totalDuration) * 100));

  // Determine colors based on urgency
  let timerColor = "text-green-400";
  let progressColor = "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]";
  if (totalMs < 1 * 60 * 60 * 1000) { // < 1 hour
    timerColor = "text-red-500 font-bold animate-pulse";
    progressColor = "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)] animate-pulse";
  } else if (totalMs < 3 * 60 * 60 * 1000) { // < 3 hours
    timerColor = "text-yellow-500";
    progressColor = "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]";
  }

  return (
    <div className="flex flex-col gap-1 w-full items-center">
      <div className="flex items-center gap-1">
        <Clock size={12} className={timerColor} />
        <div className={`font-mono font-black tracking-wider text-xs flex items-center gap-0.5 ${timerColor}`}>
          <span className="bg-black/40 px-1 py-0.5 rounded min-w-[18px] text-center border border-white/5">
            {hours.toString().padStart(2, '0')}
          </span>
          <span className="opacity-70 animate-pulse">:</span>
          <span className="bg-black/40 px-1 py-0.5 rounded min-w-[18px] text-center border border-white/5">
            {minutes.toString().padStart(2, '0')}
          </span>
          <span className="opacity-70 animate-pulse">:</span>
          <span className="bg-black/40 px-1 py-0.5 rounded min-w-[18px] text-center border border-white/5">
            {seconds.toString().padStart(2, '0')}
          </span>
        </div>
      </div>
      {showProgressBar && (
        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden border border-white/5 max-w-[120px]">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={`h-full rounded-full ${progressColor}`}
          />
        </div>
      )}
    </div>
  );
}

function TournamentScreen({ profile, onBack, onStartMatch, onInviteMatch, playClick, isInviting }: { profile: any, onBack: () => void, onStartMatch: (tId: string, mId: string) => void, onInviteMatch: (tId: string, match: any) => void, playClick: () => void, isInviting: boolean, key?: string }) {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTournamentForBracket, setSelectedTournamentForBracket] = useState<any>(null);
  const [playerStatuses, setPlayerStatuses] = useState<Record<string, { status: string, lastSeen: any }>>({});
  const [tournamentToDelete, setTournamentToDelete] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTournaments(data);
      setIsLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'tournaments');
    });
    return () => unsubscribe();
  }, []);

  // Synchronize selected tournament with the latest data
  useEffect(() => {
    if (selectedTournamentForBracket) {
      const latest = tournaments.find(t => t.id === selectedTournamentForBracket.id);
      if (latest) {
        // Only update if something actually changed to avoid unnecessary re-renders
        // We can compare the matches array length or status as a simple check
        if (latest.matches?.length !== selectedTournamentForBracket.matches?.length || 
            latest.status !== selectedTournamentForBracket.status ||
            JSON.stringify(latest.scores) !== JSON.stringify(selectedTournamentForBracket.scores)) {
          setSelectedTournamentForBracket(latest);
        }
      }
    }
  }, [tournaments, selectedTournamentForBracket?.id]);

  // Sync player statuses for active tournaments
  useEffect(() => {
    const activeT = tournaments.filter(t => t.status === 'active');
    if (activeT.length === 0) return;

    const uids = new Set<string>();
    activeT.forEach(t => {
      t.participants?.forEach((uid: string) => uids.add(uid));
    });

    if (uids.size === 0) return;

    const unsubscribes = Array.from(uids).map(uid => {
      return onSnapshot(doc(db, 'users', uid), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setPlayerStatuses(prev => ({
            ...prev,
            [uid]: { status: data.status || 'offline', lastSeen: data.lastSeen }
          }));
        }
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [tournaments]);

  // Check for expired tournaments and determine champions
  useEffect(() => {
    const checkExpirations = async () => {
      const now = new Date();
      for (const t of tournaments) {
        if (t.status === 'active' || t.status === 'pending') {
          const expiresAt = t.expiresAt?.toDate ? t.expiresAt.toDate() : new Date(t.expiresAt);
          if (now > expiresAt) {
            // Determine champion based on points
            let maxPoints = -1;
            let championId = '';
            let championName = '';
            
            if (t.scores) {
              Object.entries(t.scores).forEach(([uid, points]: [string, any]) => {
                if (points > maxPoints) {
                  maxPoints = points;
                  championId = uid;
                }
              });
            }

            // Fetch champion name if we have an ID
            if (championId) {
              try {
                const userSnap = await getDoc(doc(db, 'users', championId));
                if (userSnap.exists()) {
                  championName = userSnap.data().displayName || 'Jogador';
                }
              } catch (err) {
                console.error("Error fetching champion name:", err);
              }
            }

            await updateDoc(doc(db, 'tournaments', t.id), {
              status: 'finished',
              championId,
              championName: championName || 'Empate'
            });
          }
        }
      }
    };
    if (tournaments.length > 0) checkExpirations();
  }, [tournaments]);

  const deleteTournament = async (tId: string) => {
    playClick();
    try {
      await deleteDoc(doc(db, 'tournaments', tId));
      // Also delete invites
      const invitesQuery = query(collection(db, 'tournament_invites'), where('tournamentId', '==', tId));
      const invitesSnap = await getDocs(invitesQuery);
      for (const inviteDoc of invitesSnap.docs) {
        await deleteDoc(doc(db, 'tournament_invites', inviteDoc.id));
      }
      toast.success("Torneio excluído com sucesso!");
      setTournamentToDelete(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `tournaments/${tId}`);
    }
  };

  const activeTournaments = tournaments.filter(t => t.status !== 'finished');
  const finishedTournaments = tournaments.filter(t => t.status === 'finished');

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="absolute inset-0 bg-[#2a1a10] z-40 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 bg-black/40 border-b border-white/10 flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-black uppercase italic leading-none">Torneios</h1>
          <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Competição de 6 horas</p>
        </div>
        <button 
          onClick={() => { playClick(); setIsCreateModalOpen(true); }}
          className="p-3 bg-green-600 rounded-xl shadow-lg border-b-4 border-green-900 active:border-b-0 active:translate-y-1 transition-all"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-28 space-y-6 scrollbar-hide">
        {/* Active Tournaments */}
        <section>
          <h2 className="text-xs font-black text-yellow-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
            Torneios Ativos
          </h2>
          <div className="space-y-3">
            {isLoading ? (
              <div className="py-10 text-center text-white/20 italic">Carregando...</div>
            ) : activeTournaments.length === 0 ? (
              <div className="py-10 text-center text-white/20 italic">Nenhum torneio ativo</div>
            ) : (
              activeTournaments.map((t) => (
                <div key={t.id} className="bg-black/40 border-2 border-white/5 rounded-2xl p-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 flex items-center gap-2">
                    <div className="text-[8px] font-black bg-yellow-600 px-2 py-0.5 rounded-full uppercase">
                      {t.status === 'pending' ? 'Aguardando' : 'Em Andamento'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    {t.creatorId === profile.uid && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setTournamentToDelete(t.id); }}
                        className="p-2 bg-red-600/20 hover:bg-red-600/40 text-red-500 rounded-xl transition-all active:scale-95 shadow-lg shadow-red-900/20"
                        title="Excluir Torneio"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <div className="w-10 h-10 bg-yellow-600/20 rounded-full flex items-center justify-center border border-yellow-600/30">
                      <Trophy size={20} className="text-yellow-500" />
                    </div>
                    <div>
                      <div className="font-black uppercase italic text-sm">Torneio de {t.creatorName}</div>
                      <div className="text-[10px] text-white/40">{t.participants?.length || 0} Participantes</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-white/5 rounded-xl p-2 text-center">
                      <div className="text-[8px] text-white/40 uppercase">Seus Pontos</div>
                      <div className="text-lg font-black text-yellow-500">{t.scores?.[profile.uid] || 0}</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-2 flex flex-col items-center justify-center">
                      <div className="text-[8px] text-white/40 uppercase mb-1">Tempo Restante</div>
                      <TournamentCountdown expiresAt={t.expiresAt} showProgressBar={true} />
                    </div>
                  </div>

                  {t.status === 'active' && (
                    <div className="mb-3 space-y-2">
                      <div className="text-[8px] text-white/40 uppercase font-black tracking-widest">Partidas Atuais</div>
                      {t.matches && t.matches.length > 0 ? (
                        t.matches.map((m: any, idx: number) => (
                          <div key={idx} className="bg-black/20 rounded-lg p-2 flex items-center justify-between border border-white/5">
                            <div className="flex items-center gap-2 flex-1">
                              <div className="text-[10px] font-bold truncate max-w-[60px]">{m.player1Name || 'Jogador 1'}</div>
                              <div className="text-[8px] text-white/20">VS</div>
                              <div className="text-[10px] font-bold truncate max-w-[60px]">{m.player2Name || 'Jogador 2'}</div>
                            </div>
                            {m.status === 'finished' ? (
                              <div className="text-[8px] font-black text-green-500 uppercase">Fim</div>
                            ) : (
                              (m.player1 === profile.uid || m.player2 === profile.uid) && (
                                <div className="flex items-center gap-2">
                                  {(() => {
                                    const opponentId = m.player1 === profile.uid ? m.player2 : m.player1;
                                    const isOpponentOnline = playerStatuses[opponentId]?.status === 'online';
                                    return (
                                      <button 
                                        onClick={() => {
                                          playClick();
                                          if (isOpponentOnline) {
                                            onInviteMatch(t.id, m);
                                          } else {
                                            toast.error("O adversário está offline. Aguarde ele ficar online para jogar.");
                                          }
                                        }}
                                        className={cn(
                                          "px-2 py-1 rounded text-[8px] font-black uppercase transition-all",
                                          isOpponentOnline ? "bg-blue-600 hover:bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]" : "bg-white/10 opacity-50"
                                        )}
                                      >
                                        {isOpponentOnline ? 'Jogar Agora' : 'Offline'}
                                      </button>
                                    );
                                  })()}
                                </div>
                              )
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-[10px] text-white/20 italic">Nenhuma partida formada</div>
                      )}
                    </div>
                  )}

                  <button 
                    onClick={() => {
                      playClick();
                      setSelectedTournamentForBracket(t);
                    }}
                    className="w-full py-2.5 bg-white/10 rounded-xl font-bold text-xs uppercase hover:bg-white/20 transition-colors"
                  >
                    Ver Detalhes / Chaveamento
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Finished Tournaments */}
        <section>
          <h2 className="text-xs font-black text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Archive size={14} />
            Histórico de Torneios
          </h2>
          <div className="space-y-3">
            {finishedTournaments.length === 0 ? (
              <div className="py-10 text-center text-white/10 italic">Nenhum torneio finalizado</div>
            ) : (
              finishedTournaments.map((t) => (
                <div key={t.id} className="bg-black/20 border border-white/5 rounded-2xl p-4 relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {t.creatorId === profile.uid && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setTournamentToDelete(t.id); }}
                          className="p-2 bg-red-600/20 hover:bg-red-600/40 text-red-500 rounded-xl transition-all active:scale-95 shadow-lg shadow-red-900/20"
                          title="Excluir Torneio"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center">
                        <Trophy size={16} className="text-white/20" />
                      </div>
                      <div>
                        <div className="font-black uppercase italic text-xs">Torneio de {t.creatorName}</div>
                        <div className="text-[8px] text-white/20">Finalizado em {t.expiresAt?.toDate ? t.expiresAt.toDate().toLocaleDateString() : new Date(t.expiresAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[8px] text-yellow-500 uppercase font-black">Campeão</div>
                      <div className="text-xs font-black text-white">{t.championName || 'Nenhum'}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      playClick();
                      setSelectedTournamentForBracket(t);
                    }}
                    className="w-full py-1.5 bg-white/5 rounded-lg text-[8px] font-black uppercase hover:bg-white/10 transition-colors"
                  >
                    Ver Chaveamento Final
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {isCreateModalOpen && (
        <CreateTournamentModal 
          profile={profile}
          onClose={() => setIsCreateModalOpen(false)}
          playClick={playClick}
        />
      )}

        {selectedTournamentForBracket && (
          <TournamentBracketModal 
            tournament={selectedTournamentForBracket}
            onClose={() => setSelectedTournamentForBracket(null)}
            playClick={playClick}
            onStartMatch={onStartMatch}
            onInviteMatch={onInviteMatch}
            isInviting={isInviting}
          />
        )}

        {tournamentToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#1a0f0a] border-2 border-red-600/30 rounded-3xl w-full max-w-sm p-6 text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-600/30">
                <Trash2 size={32} className="text-red-500" />
              </div>
              <h3 className="text-xl font-black uppercase italic mb-2">Excluir Torneio?</h3>
              <p className="text-white/60 text-sm mb-6">Esta ação não pode ser desfeita. Todos os dados do torneio serão perdidos.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setTournamentToDelete(null)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => deleteTournament(tournamentToDelete)}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 font-bold shadow-lg shadow-red-900/40 transition-colors"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
    </motion.div>
  );
}

function TournamentBracketModal({ tournament, onClose, playClick, onStartMatch, onInviteMatch, isInviting }: { tournament: any, onClose: () => void, playClick: () => void, onStartMatch: (tId: string, mId: string) => void, onInviteMatch: (tId: string, match: any) => void, isInviting: boolean }) {
  const roundsCount = tournament.totalRounds || Math.ceil(Math.log2(tournament.participants.length));
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
  const [playerStatuses, setPlayerStatuses] = useState<Record<string, { status: string, lastSeen: any }>>({});

  useEffect(() => {
    // Collect all unique UIDs from participants and matches to ensure everyone is covered
    const participantUids = (tournament.participants || []) as string[];
    const matchUids = (tournament.matches || []).flatMap((m: any) => [m.player1, m.player2]).filter(Boolean);
    const allUids = [...new Set([...participantUids, ...matchUids])].filter(Boolean);
    
    if (allUids.length === 0) return;

    const unsubscribes = allUids.map(uid => {
      return onSnapshot(doc(db, 'users', uid), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const name = data.displayName || 'Jogador';
          const status = data.status || 'offline';
          const lastSeen = data.lastSeen;
          
          setPlayerNames(prev => ({ ...prev, [uid]: name }));
          setPlayerStatuses(prev => ({
            ...prev,
            [uid]: { status, lastSeen }
          }));
        }
      }, (err) => {
        console.error(`Error listening to user ${uid} in bracket:`, err);
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [tournament.id, tournament.participants, tournament.matches]);
  
  const abbreviateName = (name: string) => {
    if (!name || name === '...') return name;
    const parts = name.trim().split(/\s+/).filter(p => p.length > 0);
    if (parts.length <= 1) return name;
    
    const firstName = parts[0];
    const lastPart = parts[parts.length - 1];
    // Return First Name + Last Initial (e.g., "Antonio M.")
    return `${firstName} ${lastPart.charAt(0).toUpperCase()}.`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a0f0a] border-2 border-yellow-600/30 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="p-4 bg-black/40 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Trophy size={20} className="text-yellow-500" />
            <div>
              <h2 className="font-black uppercase italic text-sm">Chaveamento do Torneio</h2>
              <p className="text-[8px] text-white/40 uppercase tracking-widest">Eliminação Simples</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-black/30 border border-white/5 rounded-2xl px-4 py-2 self-start sm:self-auto">
            <div className="text-left hidden xs:block">
              <span className="text-[8px] text-white/40 uppercase block font-black leading-none mb-0.5">Tempo Restante</span>
              <span className="text-[9px] text-red-400 font-bold uppercase leading-none">Fim do Torneio</span>
            </div>
            <div className="w-28">
              <TournamentCountdown expiresAt={tournament.expiresAt} showProgressBar={true} />
            </div>
          </div>

          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors self-end sm:self-auto">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 lg:p-8 scrollbar-hide bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.05)_0%,transparent_70%)]">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center lg:items-start py-4 lg:py-8">
            {Array.from({ length: roundsCount }).map((_, rIdx) => {
              const roundNum = rIdx + 1;
              const roundMatches = tournament.matches?.filter((m: any) => m.round === roundNum) || [];
              
              return (
                <div key={roundNum} className="flex flex-col gap-8 lg:gap-12 w-full max-w-sm lg:w-72 shrink-0">
                  <div className="text-[12px] lg:text-[14px] font-black text-yellow-500 uppercase tracking-widest text-center mb-4 lg:mb-8 bg-yellow-500/10 py-2 rounded-full border border-yellow-500/20">
                    {roundNum === roundsCount ? '🏆 Grande Final' : `Rodada ${roundNum}`}
                  </div>
                  <div className="flex flex-col gap-8 lg:gap-16 flex-1 justify-center">
                    {roundMatches.map((m: any) => {
                      const isParticipant = m.player1 === auth.currentUser?.uid || m.player2 === auth.currentUser?.uid;
                      const p1Status = m.player1 ? playerStatuses[m.player1]?.status : 'offline';
                      const p2Status = m.player2 ? playerStatuses[m.player2]?.status : 'offline';
                      const bothOnline = p1Status === 'online' && p2Status === 'online';

                      return (
                        <div key={m.id} className="relative group">
                          <div className={cn(
                            "bg-black/80 border-2 rounded-2xl lg:rounded-3xl p-3 lg:p-5 space-y-3 lg:space-y-4 transition-all relative z-10",
                            m.status === 'pending' ? "border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.4)] scale-[1.02] lg:scale-105" : "border-white/10 opacity-90"
                          )}>
                            {/* Player 1 */}
                            <div className={cn(
                              "flex items-center justify-between px-3 py-2 lg:px-4 lg:py-4 rounded-xl lg:rounded-2xl text-sm lg:text-xl font-black transition-colors",
                              m.winner === m.player1 && m.player1 ? "bg-green-500/20 text-green-400 border border-green-500/40" : "bg-white/5 text-white/50 border border-transparent"
                            )}>
                              <div className="flex items-center gap-2 lg:gap-3 flex-1 min-w-0">
                                <div className={cn(
                                  "w-2 h-2 lg:w-4 lg:h-4 rounded-full shrink-0",
                                  m.player1 ? (p1Status === 'online' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" : "bg-white/20") : "bg-white/10"
                                )} />
                                <span className="truncate block">
                                  {m.player1 ? (
                                    playerNames[m.player1] ? (
                                      <span className="lg:hidden">{abbreviateName(playerNames[m.player1])}</span>
                                    ) : '...'
                                  ) : 'Aguardando...'}
                                  {m.player1 && playerNames[m.player1] && (
                                    <span className="hidden lg:inline">{playerNames[m.player1]}</span>
                                  )}
                                </span>
                              </div>
                              {m.winner === m.player1 && m.player1 && <Crown size={16} className="lg:w-5 lg:h-5 animate-bounce shrink-0 ml-2" />}
                            </div>

                            <div className="flex items-center gap-2 lg:gap-4 px-2">
                              <div className="h-[1px] flex-1 bg-white/10" />
                              <span className="text-[10px] lg:text-[12px] text-white/20 font-black italic tracking-tighter">VS</span>
                              <div className="h-[1px] flex-1 bg-white/10" />
                            </div>

                            {/* Player 2 */}
                            <div className={cn(
                              "flex items-center justify-between px-3 py-2 lg:px-4 lg:py-4 rounded-xl lg:rounded-2xl text-sm lg:text-xl font-black transition-colors",
                              m.winner === m.player2 && m.player2 ? "bg-green-500/20 text-green-400 border border-green-500/40" : "bg-white/5 text-white/50 border border-transparent"
                            )}>
                              <div className="flex items-center gap-2 lg:gap-3 flex-1 min-w-0">
                                <div className={cn(
                                  "w-2 h-2 lg:w-4 lg:h-4 rounded-full shrink-0",
                                  m.player2 ? (p2Status === 'online' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" : "bg-white/20") : "bg-white/10"
                                )} />
                                <span className="truncate block">
                                  {m.player2 ? (
                                    playerNames[m.player2] ? (
                                      <span className="lg:hidden">{abbreviateName(playerNames[m.player2])}</span>
                                    ) : '...'
                                  ) : 'Aguardando...'}
                                  {m.player2 && playerNames[m.player2] && (
                                    <span className="hidden lg:inline">{playerNames[m.player2]}</span>
                                  )}
                                </span>
                              </div>
                              {m.winner === m.player2 && m.player2 && <Crown size={16} className="lg:w-5 lg:h-5 animate-bounce shrink-0 ml-2" />}
                            </div>

                            {m.status === 'pending' && (
                              <div className="absolute -top-2 -right-2 lg:-top-3 lg:-right-3 flex flex-col items-end gap-1 lg:gap-2">
                                {bothOnline ? (
                                  <div className="bg-green-600 text-[8px] lg:text-[10px] font-black px-2 lg:px-3 py-0.5 lg:py-1 rounded-full uppercase animate-pulse shadow-lg">
                                    Online
                                  </div>
                                ) : (
                                  <div className="bg-white/10 text-[8px] lg:text-[10px] font-black px-2 lg:px-3 py-0.5 lg:py-1 rounded-full uppercase">
                                    Aguardando
                                  </div>
                                )}
                                <div className="flex gap-1 lg:gap-2">
                                  {isParticipant && m.player1 && m.player2 && bothOnline && (
                                    <button 
                                      onClick={() => {
                                        playClick();
                                        onInviteMatch(tournament.id, m);
                                      }}
                                      disabled={isInviting}
                                      className={cn(
                                        "text-[9px] lg:text-[11px] font-black px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg lg:rounded-xl uppercase shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all active:scale-90 flex items-center gap-1 lg:gap-2",
                                        isInviting ? "bg-white/10 text-white/20 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 text-white"
                                      )}
                                    >
                                      {isInviting ? (
                                        <motion.div 
                                          animate={{ rotate: 360 }}
                                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                          className="w-3 h-3 lg:w-4 lg:h-4 border-2 border-white/30 border-t-white rounded-full"
                                        />
                                      ) : (
                                        <Sword size={10} className="lg:w-3 lg:h-3" />
                                      )}
                                      {isInviting ? '...' : 'Jogar'}
                                    </button>
                                  )}
                                  {!isParticipant && m.player1 && m.player2 && (
                                    <button 
                                      onClick={() => {
                                        playClick();
                                        onStartMatch(tournament.id, m.id);
                                      }}
                                      className="text-[9px] lg:text-[11px] font-black px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg lg:rounded-xl uppercase bg-yellow-600 hover:bg-yellow-500 text-white shadow-[0_0_20px_rgba(202,138,4,0.5)] transition-all active:scale-90 flex items-center gap-1 lg:gap-2"
                                    >
                                      <Eye size={10} className="lg:w-3 lg:h-3" /> Assistir
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Connector lines to next round */}
                          {roundNum < roundsCount && (
                            <div className="absolute top-1/2 -right-12 w-12 h-[2px] bg-white/10 z-0">
                              <div className={cn(
                                "absolute right-0 w-2 h-2 rounded-full -translate-y-1/2",
                                m.winner ? "bg-green-500" : "bg-white/10"
                              )} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 bg-black/40 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
              <span className="text-[10px] font-black text-white/60 uppercase">Sua Partida</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
              <span className="text-[10px] font-black text-white/60 uppercase">Online</span>
            </div>
          </div>
          <p className="text-[10px] text-yellow-500 font-black uppercase italic tracking-widest">
            {tournament.status === 'active' ? 'Eliminação Direta: Perdeu, Saiu!' : 'Torneio Encerrado'}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function ClanScreen({ profile, updateProfile, onBack, onChallenge, onWatch, allClans, playClick, soundEnabled }: { profile: any, updateProfile: (data: any) => Promise<void>, onBack: () => void, onChallenge: (target: any) => void, onWatch: (gameId: string) => void, allClans: any[], playClick: () => void, soundEnabled: boolean, key?: string }) {
  const [clanName, setClanName] = useState('');
  const [clanTag, setClanTag] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'members' | 'invites'>('info');
  const [mode, setMode] = useState<'create' | 'join'>('join');
  const [searchQuery, setSearchQuery] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [clanMembers, setClanMembers] = useState<any[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    confirmColor?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Sync clan members from Firestore
  useEffect(() => {
    if (!profile.clanId) return;
    const membersRef = collection(db, 'clans', profile.clanId, 'members');
    const unsubscribe = onSnapshot(membersRef, (snapshot) => {
      const membersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClanMembers(membersData);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `clans/${profile.clanId}/members`);
    });
    return () => unsubscribe();
  }, [profile.clanId]);

  const handleCreateClan = async () => {
    if (!clanName || !clanTag) return;
    playClick();
    setIsCreating(true);
    
    try {
      const newClanId = 'clan_' + Date.now();
      const clanRef = doc(db, 'clans', newClanId);
      
      const newClan = {
        name: clanName,
        tag: clanTag.toUpperCase(),
        leaderId: profile.uid,
        leaderName: profile.displayName || 'Líder',
        trophies: profile.trophies || 0,
        memberCount: 1,
        createdAt: serverTimestamp()
      };

      await setDoc(clanRef, newClan);

      // Add creator as leader member
      const memberRef = doc(db, 'clans', newClanId, 'members', profile.uid);
      await setDoc(memberRef, {
        uid: profile.uid,
        name: profile.displayName || 'Líder',
        avatar: profile.photoURL || '',
        role: 'leader',
        trophies: profile.trophies || 0,
        status: 'online',
        lastActive: serverTimestamp()
      });

      await updateProfile({ 
        clanId: newClanId,
        clanName: clanName,
        clanTag: clanTag.toUpperCase(),
        clanRole: 'leader'
      });

      setIsCreating(false);
      if (soundEnabled) {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');
        audio.volume = 0.5;
        audio.play().catch(err => console.log('Error playing confetti sound:', err));
      }
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'clans');
      setIsCreating(false);
    }
  };

  const handleJoinClan = async (clan: any) => {
    if (clan.memberCount >= 50) {
      toast.error('Este clã já está cheio!');
      return;
    }
    playClick();
    setIsCreating(true);
    try {
      // Add user as member
      const memberRef = doc(db, 'clans', clan.id, 'members', profile.uid);
      await setDoc(memberRef, {
        uid: profile.uid,
        name: profile.displayName || 'Membro',
        avatar: profile.photoURL || '',
        role: 'member', // Always 'member' when joining
        trophies: profile.trophies || 0,
        status: 'online',
        lastActive: serverTimestamp()
      });

      // Update clan member count and trophies using increment
      const clanRef = doc(db, 'clans', clan.id);
      await setDoc(clanRef, {
        memberCount: increment(1),
        trophies: increment(profile.trophies || 0)
      }, { merge: true });

      await updateProfile({ 
        clanId: clan.id,
        clanName: clan.name,
        clanTag: clan.tag,
        clanRole: 'member'
      });

      setIsCreating(false);
      if (soundEnabled) {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');
        audio.volume = 0.5;
        audio.play().catch(err => console.log('Error playing confetti sound:', err));
      }
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.6 }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `clans/${clan.id}/members`);
      setIsCreating(false);
    }
  };

  if (!profile.clanId) {
    return (
      <motion.div 
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -300, opacity: 0 }}
        className="flex flex-col h-full bg-black/40 backdrop-blur-md relative z-10"
      >
        <div className="p-4 flex items-center justify-between">
          <button onClick={onBack} className="p-2 bg-black/40 rounded-full"><ChevronLeft size={24} /></button>
          <h2 className="text-xl font-black italic">{mode === 'create' ? 'Criar Clã' : 'Participar de Clã'}</h2>
          <div className="w-10" />
        </div>

        <div className="flex px-4 gap-2 mb-4">
          <button 
            onClick={() => { playClick(); setMode('join'); }}
            className={cn("flex-1 py-2 rounded-lg font-bold text-xs transition-all", mode === 'join' ? "bg-blue-600 shadow-lg" : "bg-black/20")}
          >
            Participar
          </button>
          <button 
            onClick={() => { playClick(); setMode('create'); }}
            className={cn("flex-1 py-2 rounded-lg font-bold text-xs transition-all", mode === 'create' ? "bg-blue-600 shadow-lg" : "bg-black/20")}
          >
            Criar
          </button>
        </div>

        {mode === 'create' ? (
          <div className="flex-1 p-6 flex flex-col gap-6">
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-24 h-24 bg-blue-600/20 rounded-2xl border-2 border-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                <Shield size={48} className="text-blue-400" />
              </div>
              <p className="text-center text-sm text-white/60">Crie um clã para unir seus amigos e competir juntos!</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-white/40 ml-2">Nome do Clã</label>
                <input 
                  type="text" 
                  placeholder="Ex: Mestres do Tabuleiro"
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-blue-500/50"
                  value={clanName}
                  onChange={(e) => setClanName(e.target.value)}
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-white/40 ml-2">Tag do Clã (3-4 letras)</label>
                <input 
                  type="text" 
                  placeholder="Ex: MST"
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-blue-500/50 uppercase"
                  value={clanTag}
                  onChange={(e) => setClanTag(e.target.value.toUpperCase())}
                  maxLength={4}
                />
              </div>
            </div>

            <div className="mt-auto pb-8">
              <button 
                onClick={handleCreateClan}
                disabled={!clanName || clanTag.length < 3 || isCreating}
                className={cn(
                  "w-full py-4 rounded-xl font-black uppercase italic shadow-lg flex items-center justify-center gap-3 transition-all",
                  (!clanName || clanTag.length < 3 || isCreating) 
                    ? "bg-gray-600 opacity-50 cursor-not-allowed" 
                    : "bg-gradient-to-r from-blue-700 to-blue-600 border-b-4 border-blue-900 active:border-b-0 active:translate-y-1"
                )}
              >
                {isCreating ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus size={24} /> Criar Clã (500 Moedas)
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
              <input 
                type="text" 
                placeholder="Procurar clãs..."
                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pb-8">
              {allClans.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.tag.toLowerCase().includes(searchQuery.toLowerCase())).map(clan => (
                <div key={clan.id} className="bg-black/20 p-4 rounded-2xl border border-white/5 flex items-center gap-4 group">
                  <div className="w-12 h-12 bg-blue-600/20 rounded-xl border border-blue-500/30 flex items-center justify-center shrink-0">
                    <Shield size={24} className="text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm truncate">{clan.name}</h4>
                      <span className="text-[10px] font-bold text-blue-400">[{clan.tag}]</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-white/40 font-bold uppercase">
                      <span className="flex items-center gap-1"><Users size={10} /> {clan.members}/50</span>
                      <span className="flex items-center gap-1"><Trophy size={10} className="text-yellow-500" /> {clan.trophies}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleJoinClan(clan)}
                    disabled={isCreating}
                    className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg text-[10px] font-black uppercase italic shadow-lg active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isCreating ? '...' : 'Participar'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      className="flex flex-col h-full bg-black/40 backdrop-blur-md relative z-10"
    >
      <div className="p-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2 bg-black/40 rounded-full"><ChevronLeft size={24} /></button>
        <div className="flex flex-col items-center">
          <h2 className="text-lg font-black italic leading-tight">{profile.clanName}</h2>
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">[{profile.clanTag}]</span>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex px-4 gap-2 mb-4">
        <button 
          onClick={() => { playClick(); setActiveTab('info'); }}
          className={cn("flex-1 py-2 rounded-lg font-bold text-xs transition-all", activeTab === 'info' ? "bg-blue-600 shadow-lg" : "bg-black/20")}
        >
          Info
        </button>
        <button 
          onClick={() => { playClick(); setActiveTab('members'); }}
          className={cn("flex-1 py-2 rounded-lg font-bold text-xs transition-all", activeTab === 'members' ? "bg-blue-600 shadow-lg" : "bg-black/20")}
        >
          Membros
        </button>
        <button 
          onClick={() => { playClick(); setActiveTab('invites'); }}
          className={cn("flex-1 py-2 rounded-lg font-bold text-xs transition-all", activeTab === 'invites' ? "bg-blue-600 shadow-lg" : "bg-black/20")}
        >
          Convites
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-24">
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-blue-600/20 rounded-2xl border-2 border-blue-500 flex items-center justify-center">
                <Shield size={40} className="text-blue-400" />
              </div>
              <div className="text-center">
                <p className="text-xs text-white/60">Líder do Clã</p>
                <p className="font-bold">{allClans.find(c => c.id === profile.clanId)?.leaderName || profile.displayName}</p>
                {(() => {
                  const leader = clanMembers.find(m => m.role === 'leader');
                  if (leader && leader.uid !== profile.uid && profile.clanRole !== 'member') {
                    const lastActive = leader.lastActive?.toDate?.() || new Date(leader.lastActive);
                    const isInactive = Date.now() - lastActive.getTime() > 7 * 24 * 60 * 60 * 1000;
                    if (isInactive) {
                      return (
                        <button 
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: "Reivindicar Liderança",
                              message: "O líder está inativo há mais de 7 dias. Deseja reivindicar a liderança?",
                              confirmText: "Reivindicar",
                              confirmColor: "bg-yellow-600",
                              onConfirm: async () => {
                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                playClick();
                                try {
                                  const batch = writeBatch(db);
                                  batch.update(doc(db, 'clans', profile.clanId, 'members', profile.uid), { role: 'leader' });
                                  batch.update(doc(db, 'clans', profile.clanId, 'members', leader.uid), { role: 'co-leader' });
                                  batch.update(doc(db, 'clans', profile.clanId), { leaderId: profile.uid, leaderName: profile.displayName });
                                  await batch.commit();
                                  await updateProfile({ clanRole: 'leader' });
                                  toast.success("Você agora é o líder do clã!");
                                } catch (err) {
                                  handleFirestoreError(err, OperationType.UPDATE, `clans/${profile.clanId}`);
                                }
                              }
                            });
                          }}
                          className="mt-2 px-3 py-1 bg-yellow-600 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                        >
                          Reivindicar Liderança
                        </button>
                      );
                    }
                  }
                  return null;
                })()}
              </div>
              <div className="grid grid-cols-2 gap-4 w-full mt-2">
                <div className="bg-black/20 p-3 rounded-xl text-center">
                  <p className="text-[10px] text-white/40 uppercase">Membros</p>
                  <p className="font-black">{clanMembers.length} / 50</p>
                </div>
                <div className="bg-black/20 p-3 rounded-xl text-center">
                  <p className="text-[10px] text-white/40 uppercase">Troféus</p>
                  <p className="font-black flex items-center justify-center gap-1">
                    <Trophy size={12} className="text-yellow-500" /> {clanMembers.reduce((acc, m) => acc + (m.trophies || 0), 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-3">
              <h3 className="text-xs font-bold uppercase text-white/40">Descrição</h3>
              <p className="text-sm italic text-white/80">Bem-vindos ao clã {profile.clanName}! Vamos dominar o tabuleiro.</p>
            </div>

            <button 
              onClick={() => {
                setConfirmModal({
                  isOpen: true,
                  title: "Sair do Clã",
                  message: "Tem certeza que deseja sair do clã?",
                  confirmText: "Sair",
                  confirmColor: "bg-red-600",
                  onConfirm: async () => {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    playClick();
                    if (profile.clanId) {
                      try {
                        const clanId = profile.clanId;
                        const isLeader = profile.clanRole === 'leader';
                        
                        if (isLeader) {
                          const otherMembers = clanMembers.filter(m => m.uid !== profile.uid);
                          const nextLeader = otherMembers.sort((a, b) => {
                            const roleOrder = { 'co-leader': 0, elder: 1, member: 2 };
                            const aOrder = roleOrder[a.role as keyof typeof roleOrder] ?? 3;
                            const bOrder = roleOrder[b.role as keyof typeof roleOrder] ?? 3;
                            if (aOrder !== bOrder) return aOrder - bOrder;
                            return (b.trophies || 0) - (a.trophies || 0);
                          })[0];

                          if (nextLeader) {
                            const batch = writeBatch(db);
                            batch.update(doc(db, 'clans', clanId, 'members', nextLeader.uid), { role: 'leader' });
                            batch.update(doc(db, 'clans', clanId), { 
                              leaderId: nextLeader.uid, 
                              leaderName: nextLeader.name,
                              memberCount: increment(-1),
                              trophies: increment(-(profile.trophies || 0))
                            });
                            batch.delete(doc(db, 'clans', clanId, 'members', profile.uid));
                            await batch.commit();
                            toast.success(`Liderança transferida para ${nextLeader.name}`);
                          } else {
                            // Clan is empty, delete it
                            const batch = writeBatch(db);
                            batch.delete(doc(db, 'clans', clanId, 'members', profile.uid));
                            batch.delete(doc(db, 'clans', clanId));
                            await batch.commit();
                            toast.info("Clã excluído pois não restam membros.");
                          }
                        } else {
                          // Regular member leaving
                          const batch = writeBatch(db);
                          batch.delete(doc(db, 'clans', clanId, 'members', profile.uid));
                          batch.update(doc(db, 'clans', clanId), {
                            memberCount: increment(-1),
                            trophies: increment(-(profile.trophies || 0))
                          });
                          await batch.commit();
                        }
                        
                        await updateProfile({ 
                          clanId: deleteField() as any, 
                          clanName: deleteField() as any, 
                          clanTag: deleteField() as any, 
                          clanRole: deleteField() as any 
                        });
                        toast.success("Você saiu do clã.");
                      } catch (err) {
                        handleFirestoreError(err, OperationType.DELETE, `clans/${profile.clanId}`);
                        toast.error("Erro ao sair do clã. Tente novamente.");
                      }
                    }
                  }
                });
              }}
              className="w-full py-3 bg-red-600/20 border border-red-600/50 rounded-xl text-red-500 font-bold text-xs uppercase tracking-widest active:scale-95 transition-all"
            >
              Sair do Clã
            </button>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="space-y-3">
            {/* Members List */}
            {clanMembers.sort((a, b) => {
              // Sort by role (leader first) then trophies
              const roleOrder = { leader: 0, 'co-leader': 1, elder: 2, member: 3 };
              const aOrder = roleOrder[a.role as keyof typeof roleOrder] ?? 4;
              const bOrder = roleOrder[b.role as keyof typeof roleOrder] ?? 4;
              if (aOrder !== bOrder) return aOrder - bOrder;
              return (b.trophies || 0) - (a.trophies || 0);
            }).filter(m => m.status === 'online' || m.status === 'playing').map(member => (
              <div key={member.id} className={cn(
                "bg-black/20 rounded-2xl p-3 flex items-center gap-3 border",
                member.role === 'leader' ? "border-yellow-500/30" : "border-white/5"
              )}>
                <div className="relative">
                  <img src={member.avatar} alt={member.name} className={cn(
                    "w-12 h-12 rounded-full border-2",
                    member.role === 'leader' ? "border-yellow-500" : "border-white/10"
                  )} referrerPolicy="no-referrer" />
                  {member.role === 'leader' && (
                    <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-0.5">
                      <Shield size={10} className="text-black" />
                    </div>
                  )}
                  <div className={cn(
                    "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#3d2b1f]",
                    member.status === 'online' ? "bg-green-500" : member.status === 'playing' ? "bg-yellow-500" : "bg-gray-500"
                  )} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm">{member.name}</h4>
                  <p className={cn(
                    "text-[10px] uppercase font-black tracking-widest",
                    member.role === 'leader' ? "text-yellow-500" : member.role === 'co-leader' ? "text-blue-400" : member.role === 'elder' ? "text-green-400" : "text-white/40"
                  )}>{member.role === 'leader' ? 'Líder' : member.role === 'co-leader' ? 'Co-Líder' : member.role === 'elder' ? 'Ancião' : 'Membro'}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="text-xs font-bold flex items-center gap-1">
                    <Trophy size={10} className="text-yellow-500" /> {member.trophies || 0}
                  </p>
                  <div className="flex gap-2">
                    {member.uid !== profile.uid && (
                      <div className="flex gap-1">
                        {/* Promotion/Demotion logic */}
                        {((profile.clanRole === 'leader') || (profile.clanRole === 'co-leader' && (member.role === 'elder' || member.role === 'member'))) && (
                          <div className="flex flex-col gap-1">
                            {member.role !== 'leader' && (
                              <button 
                                onClick={async () => {
                                  playClick();
                                  const roles = ['member', 'elder', 'co-leader', 'leader'];
                                  const currentIndex = roles.indexOf(member.role);
                                  if (currentIndex < roles.length - 1) {
                                    const nextRole = roles[currentIndex + 1];
                                    // If promoting to leader, current leader becomes co-leader
                                    if (nextRole === 'leader' && profile.clanRole === 'leader') {
                                      const batch = writeBatch(db);
                                      batch.update(doc(db, 'clans', profile.clanId, 'members', member.uid), { role: 'leader' });
                                      batch.update(doc(db, 'clans', profile.clanId, 'members', profile.uid), { role: 'co-leader' });
                                      batch.update(doc(db, 'clans', profile.clanId), { leaderId: member.uid, leaderName: member.name });
                                      await batch.commit();
                                      await updateProfile({ clanRole: 'co-leader' });
                                    } else if (nextRole !== 'leader') {
                                      await updateDoc(doc(db, 'clans', profile.clanId, 'members', member.uid), { role: nextRole });
                                    }
                                  }
                                }}
                                className="bg-green-600/20 text-green-500 p-1 rounded hover:bg-green-600/40 transition-colors"
                                title="Promover"
                              >
                                <ChevronUp size={12} />
                              </button>
                            )}
                            {member.role !== 'member' && member.role !== 'leader' && (
                              <button 
                                onClick={async () => {
                                  playClick();
                                  const roles = ['member', 'elder', 'co-leader', 'leader'];
                                  const currentIndex = roles.indexOf(member.role);
                                  if (currentIndex > 0) {
                                    const prevRole = roles[currentIndex - 1];
                                    await updateDoc(doc(db, 'clans', profile.clanId, 'members', member.uid), { role: prevRole });
                                  }
                                }}
                                className="bg-red-600/20 text-red-500 p-1 rounded hover:bg-red-600/40 transition-colors"
                                title="Rebaixar"
                              >
                                <ChevronDown size={12} />
                              </button>
                            )}
                          </div>
                        )}
                        
                        {/* Kick logic */}
                        {((profile.clanRole === 'leader') || 
                          (profile.clanRole === 'co-leader' && (member.role === 'elder' || member.role === 'member')) ||
                          (profile.clanRole === 'elder' && member.role === 'member')) && (
                          <button 
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: "Expulsar Membro",
                                message: `Expulsar ${member.name} do clã?`,
                                confirmText: "Expulsar",
                                confirmColor: "bg-red-600",
                                onConfirm: async () => {
                                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                  playClick();
                                  try {
                                    const memberRef = doc(db, 'clans', profile.clanId, 'members', member.uid);
                                    await deleteDoc(memberRef);
                                    const clanRef = doc(db, 'clans', profile.clanId);
                                    await updateDoc(clanRef, {
                                      memberCount: increment(-1),
                                      trophies: increment(-(member.trophies || 0))
                                    });
                                    toast.success(`${member.name} foi expulso.`);
                                  } catch (err) {
                                    handleFirestoreError(err, OperationType.DELETE, `clans/${profile.clanId}/members/${member.uid}`);
                                  }
                                }
                              });
                            }}
                            className="bg-red-600 p-1.5 rounded-lg text-white hover:bg-red-700 transition-colors shadow-lg active:scale-95"
                            title="Expulsar"
                          >
                            <UserMinus size={14} />
                          </button>
                        )}
                      </div>
                    )}
                    {member.status === 'playing' && member.currentGameId && (
                      <button 
                        onClick={() => onWatch(member.currentGameId)}
                        className="bg-green-600 px-3 py-1 rounded-lg text-[10px] font-black italic shadow-lg active:scale-95 transition-all flex items-center gap-1"
                      >
                        <Eye size={12} /> ASSISTIR
                      </button>
                    )}
                    {member.uid !== profile.uid && member.status !== 'playing' && (
                      <button 
                        onClick={() => onChallenge({ uid: member.uid || member.id, name: member.name })}
                        className="bg-blue-600 px-3 py-1 rounded-lg text-[10px] font-black italic shadow-lg active:scale-95 transition-all"
                      >
                        DESAFIAR
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {clanMembers.filter(m => m.status === 'online' || m.status === 'playing').length === 0 && (
              <p className="text-center py-8 text-white/40 text-sm italic">Nenhum membro online no momento.</p>
            )}
          </div>
        )}

        {activeTab === 'invites' && (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
            <UserPlus size={64} className="text-white/20" />
            <p className="text-lg font-bold text-white/60">Convide seus amigos!</p>
            {(profile.clanRole === 'leader' || profile.clanRole === 'co-leader' || profile.clanRole === 'elder') ? (
              <button 
                onClick={() => { playClick(); setIsShareModalOpen(true); }}
                className="bg-blue-600 px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all"
              >
                <Share2 size={20} /> Compartilhar Link
              </button>
            ) : (
              <p className="text-sm text-white/40 italic px-8">Somente Líderes, Co-Líderes e Anciãos podem convidar novos membros.</p>
            )}
          </div>
        )}
      </div>
      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        playClick={playClick} 
        text={`Vem participar do meu clã [${profile.clanTag}] ${profile.clanName} no Damas Mestre Brasil!`}
      />

      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        confirmColor={confirmModal.confirmColor}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </motion.div>
  );
}
