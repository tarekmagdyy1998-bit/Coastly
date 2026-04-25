import React, { useState } from 'react';
import { db, doc, updateDoc, handleFirestoreError, OperationType } from '../firebase';
import { Chalet } from '../types';
import { useTranslation } from 'react-i18next';
import { CustomCalendar } from './CustomCalendar';
import { Button } from './Button';
import { X, Calendar as CalendarIcon, Save } from 'lucide-react';
import { toast } from 'sonner';

interface CalendarManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  chalet: Chalet;
}

export const CalendarManageModal: React.FC<CalendarManageModalProps> = ({ isOpen, onClose, chalet }) => {
  const { t, i18n } = useTranslation();
  const [blockedDates, setBlockedDates] = useState<string[]>(chalet.blockedDates || []);
  const [saving, setSaving] = useState(false);

  const handleDateClick = (date: string) => {
    if (blockedDates.includes(date)) {
      setBlockedDates(blockedDates.filter(d => d !== date));
    } else {
      setBlockedDates([...blockedDates, date]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const chaletRef = doc(db, 'chalets', chalet.id);
      await updateDoc(chaletRef, {
        blockedDates: blockedDates
      });
      toast.success(i18n.language === 'ar' ? 'تم تحديث التقويم بنجاح' : 'Calendar updated successfully');
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'chalets');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-r w-full max-w-lg overflow-hidden shadow-shxl border border-sand-d/20 animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-sand-d/10 flex items-center justify-between bg-salt/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sea/10 rounded-full flex items-center justify-center text-sea">
              <CalendarIcon size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-ink">{i18n.language === 'ar' ? 'إدارة التوافر' : 'Manage Availability'}</h3>
              <p className="text-[10px] text-ink-s font-bold uppercase tracking-wider">{chalet.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-salt rounded-full transition-colors">
            <X size={20} className="text-ink-s" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <p className="text-xs text-ink-s mb-4 font-bold">
            {i18n.language === 'ar' 
              ? 'اضغط على الأيام لقفلها (سيظهر للعملاء أنها محجوزة) أو فتحها مرة أخرى.' 
              : 'Click on dates to block (booked) or unblock (available) them for customers.'}
          </p>
          
          <CustomCalendar 
            blockedDates={blockedDates}
            onDateClick={handleDateClick}
            isManageMode={true}
          />
        </div>

        <div className="p-6 bg-salt/30 border-t border-sand-d/10 flex gap-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button 
            variant="sea" 
            className="flex-1 flex items-center justify-center gap-2" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <Save size={18} />}
            {t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
};
