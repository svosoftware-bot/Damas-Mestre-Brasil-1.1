import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  signInWithPopup, 
  googleProvider, 
  signOut, 
  doc, 
  getDoc, 
  updateDoc,
  setDoc, 
  onSnapshot,
  handleFirestoreError,
  OperationType,
  FirebaseUser
} from '../firebase';

interface UserProfile {
  uid: string;
  playerId?: string;
  displayName: string | null;
  photoURL: string | null;
  coins: number;
  gems: number;
  level: number;
  xp: number;
  selectedPieceId: string;
  selectedStickerId: string;
  role: string;
  lastDailyClaim?: number;
  selectedBackgroundId: string;
  ownedBackgroundIds: string[];
  hasNewLuckyBoxItems: boolean;
  wins: number;
  losses: number;
  draws: number;
  forfeits: number;
  totalGames: number;
  trophies: number;
  clanId?: string;
  clanName?: string;
  clanTag?: string;
  clanRole?: string;
  ownedEmotes: string[];
  ownedBoardStyles: string[];
  ownedPieceColors?: string[];
  ownedQueenStickerIds?: string[];
  nameChangeCount?: number;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        // Listen for profile changes
        const unsubProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            let needsUpdate = false;
            const updateFields: any = {};

            // Migration for existing users
            if (!data.playerId) {
              const generatedId = Math.floor(10000000 + Math.random() * 90000000).toString();
              data.playerId = generatedId;
              updateFields.playerId = generatedId;
              needsUpdate = true;
            }
            if (!data.ownedBoardStyles) {
              const defaultStyles = ['cream-brown'];
              data.ownedBoardStyles = defaultStyles;
              updateFields.ownedBoardStyles = defaultStyles;
              needsUpdate = true;
            }
            if (!data.ownedEmotes || !data.ownedEmotes.includes('emote_default')) {
              const newEmotes = [...(data.ownedEmotes || []), 'emote_default'];
              data.ownedEmotes = newEmotes;
              updateFields.ownedEmotes = newEmotes;
              needsUpdate = true;
            }
            if (!data.ownedPieceColors) {
              const defaultColors = ['#ffffff', '#000000'];
              data.ownedPieceColors = defaultColors;
              updateFields.ownedPieceColors = defaultColors;
              needsUpdate = true;
            }
            if (!data.ownedQueenStickerIds) {
              const defaultStickers = ['default'];
              data.ownedQueenStickerIds = defaultStickers;
              updateFields.ownedQueenStickerIds = defaultStickers;
              needsUpdate = true;
            }

            if (needsUpdate) {
              updateDoc(userDocRef, updateFields).catch(err => console.error('Migration update error:', err));
            }
            setProfile(data);
          } else {
            // Create initial profile if it doesn't exist
            const initialProfile: UserProfile = {
              uid: firebaseUser.uid,
              playerId: Math.floor(10000000 + Math.random() * 90000000).toString(),
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              coins: 100,
              gems: 6,
              level: 1,
              xp: 0,
              selectedPieceId: 'slate-1',
              selectedStickerId: 'king-1',
              role: 'user',
              lastDailyClaim: 0,
              selectedBackgroundId: 'default',
              ownedBackgroundIds: ['default'],
              hasNewLuckyBoxItems: false,
              wins: 0,
              losses: 0,
              draws: 0,
              forfeits: 0,
              totalGames: 0,
              trophies: 0,
              ownedEmotes: ['emote_default'],
              ownedBoardStyles: ['cream-brown'],
              ownedPieceColors: ['#ffffff', '#000000'],
              ownedQueenStickerIds: ['default']
            };
            
            setDoc(userDocRef, initialProfile).catch(err => {
              handleFirestoreError(err, OperationType.CREATE, `users/${firebaseUser.uid}`);
            });
          }
          setLoading(false);
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
        });

        return () => unsubProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, data);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
