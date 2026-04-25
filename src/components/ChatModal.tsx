import { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Send, AlertTriangle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { db, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  negotiationId: string;
}

export const ChatModal = ({ isOpen, onClose, title, negotiationId }: ChatModalProps) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !negotiationId) return;

    const q = query(
      collection(db, 'negotiations', negotiationId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [isOpen, negotiationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !user || !negotiationId) return;

    // Phone Filter
    if (/\d{8,}/.test(message) || /واتساب|موبايل|تليفون|رقمي|اتصل/i.test(message)) {
      toast.error('⛔ تم حذف الرسالة تلقائياً لمخالفتها سياسة الخصوصية (حظر تداول الأرقام)');
      setMessage('');
      return;
    }

    const text = message;
    setMessage('');

    try {
      await addDoc(collection(db, 'negotiations', negotiationId, 'messages'), {
        text,
        senderId: user.uid,
        senderRole: (user as any).role || 'client',
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('فشل في إرسال الرسالة');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} headerColor="bg-ink">
      <div className="flex flex-col h-[500px]">
        {/* Warning Notice */}
        <div className="bg-gold-l border border-gold/10 p-3 rounded-rs text-[10px] text-gold font-bold mb-4 flex items-center gap-2">
          <AlertTriangle size={14} />
          المحادثة مراقبة آلياً لضمان أمانك. يمنع تداول أرقام الهاتف أو الروابط الخارجية.
        </div>

        {/* Chat Thread */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 no-scrollbar">
          {messages.length === 0 && (
            <div className="text-center py-10">
              <span className="bg-salt text-[10px] text-ink-s px-3 py-1 rounded-full border border-sand-d/20">
                تم فتح المحادثة. تذكر أن تبادل أرقام الهاتف محظور تماماً.
              </span>
            </div>
          )}
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={cn(
                "flex flex-col",
                msg.senderId === user?.uid ? "items-end" : "items-start"
              )}
            >
              <div className={cn(
                "max-w-[80%] p-3 text-sm leading-relaxed",
                msg.senderId === user?.uid 
                  ? "bg-sea text-white rounded-[14px_14px_4px_14px]" 
                  : "bg-white border border-sand-d/30 text-ink rounded-[14px_14px_14px_4px]"
              )}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="flex gap-2 pt-4 border-t border-sand-d/10">
          <input 
            type="text" 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="اكتب رسالتك هنا..."
            className="flex-1 bg-salt border border-sand-d/30 rounded-rs px-4 py-3 text-sm outline-none focus:border-sea"
          />
          <Button variant="sea" className="w-12 h-12 p-0 rounded-rs" onClick={handleSend}>
            <Send size={20} />
          </Button>
        </div>
      </div>
    </Modal>
  );
};
