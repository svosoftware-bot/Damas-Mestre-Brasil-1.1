import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, MessageSquare, X, User } from 'lucide-react';
import { db, auth, collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { cn } from '../utils/cn';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  text: string;
  timestamp: any;
  isSystem?: boolean;
}

interface ChatProps {
  gameId: string;
  profile: any;
  isOpen: boolean;
  onToggle: () => void;
}

export function Chat({ gameId, profile, isOpen, onToggle }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!gameId) return;

    const messagesRef = collection(db, 'games', gameId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `games/${gameId}/messages`);
    });

    return () => unsubscribe();
  }, [gameId]);

  useEffect(() => {
    if (isOpen) {
      // Small timeout to allow the opening animation to settle
      const timer = setTimeout(scrollToBottom, 50);
      return () => clearTimeout(timer);
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !auth.currentUser) return;

    const messageText = newMessage.trim();
    setNewMessage('');

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

  return (
    <>
      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="absolute bottom-40 left-6 w-80 h-96 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-black/40 border-bottom border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-yellow-500" />
                <span className="font-bold text-sm uppercase tracking-wider">Chat da Partida</span>
              </div>
              <button onClick={onToggle} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-white/30 space-y-2">
                  <MessageSquare size={32} />
                  <p className="text-xs uppercase tracking-widest">Sem mensagens ainda</p>
                </div>
              ) : (
                messages.map((msg) => {
                  if (msg.isSystem) {
                    return (
                      <div 
                        key={msg.id}
                        className="w-full text-center my-2.5 px-2"
                      >
                        <span className="text-[11px] font-semibold text-amber-300/65 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1 italic tracking-wide inline-block shadow-sm">
                          {msg.text}
                        </span>
                      </div>
                    );
                  }

                  const isMe = msg.senderId === auth.currentUser?.uid;
                  return (
                    <div 
                      key={msg.id}
                      className={cn(
                        "flex flex-col max-w-[85%]",
                        isMe ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      {!isMe && (
                        <span className="text-[10px] font-bold text-white/40 mb-1 ml-1 uppercase tracking-tighter">
                          {msg.senderName}
                        </span>
                      )}
                      <div 
                        className={cn(
                          "px-3 py-2 rounded-2xl text-sm",
                          isMe 
                            ? "bg-yellow-600 text-white rounded-tr-none" 
                            : "bg-white/10 text-white/90 rounded-tl-none"
                        )}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-3 bg-black/20 border-t border-white/5 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-yellow-500/50 transition-colors"
              />
              <button 
                type="submit"
                disabled={!newMessage.trim()}
                className="p-2 bg-yellow-600 rounded-xl disabled:opacity-50 disabled:grayscale hover:bg-yellow-500 transition-colors"
              >
                <Send size={18} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
