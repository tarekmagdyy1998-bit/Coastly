import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Star, Camera, X, CheckCircle2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { db, collection, addDoc, handleFirestoreError, OperationType, storage, doc, updateDoc } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  negotiationId: string;
  chaletId: string;
  chaletName: string;
}

export const ReviewModal = ({ isOpen, onClose, negotiationId, chaletId, chaletName }: ReviewModalProps) => {
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [realPhotos, setRealPhotos] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;

    if (!comment.trim()) {
      toast.error(i18n.language === 'ar' ? 'يرجى كتابة تعليق' : 'Please write a comment');
      return;
    }

    setIsSubmitting(true);
    try {
      let photoUrls: string[] = [];
      
      if (realPhotos.length > 0) {
        setIsUploading(true);
        const uploadPromises = realPhotos.map(async (file) => {
          const storageRef = ref(storage, `reviews/${chaletId}/${user.uid}/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          return getDownloadURL(storageRef);
        });
        photoUrls = await Promise.all(uploadPromises);
        setIsUploading(false);
      }

      const reviewData = {
        userId: user.uid,
        userName: profile?.displayName || 'Client',
        rating,
        comment,
        date: new Date().toISOString(),
        realPhotos: photoUrls,
        chaletId,
        negotiationId
      };

      // Add to reviews collection
      await addDoc(collection(db, 'reviews'), reviewData);

      // Update negotiation to mark as reviewed
      const negRef = doc(db, 'negotiations', negotiationId);
      await updateDoc(negRef, { reviewed: true });

      toast.success(i18n.language === 'ar' ? 'شكراً لتقييمك! تم حفظ الصور الواقعية.' : 'Thank you for your review! Real photos saved.');
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reviews');
      toast.error(i18n.language === 'ar' ? 'فشل في إرسال التقييم' : 'Failed to send review');
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={i18n.language === 'ar' ? 'تقييم الإقامة' : 'Rate Your Stay'} headerColor="bg-sea">
      <div className="space-y-6">
        <div className="text-center">
          <h4 className="font-black text-sea text-lg mb-1">{chaletName}</h4>
          <p className="text-xs text-ink-s">{i18n.language === 'ar' ? 'كيف كانت تجربتك؟ شاركنا صوراً واقعية للمكان' : 'How was your experience? Share real photos of the place'}</p>
        </div>

        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className={`p-2 transition-transform hover:scale-110 ${rating >= star ? 'text-gold' : 'text-sand-d'}`}
            >
              <Star size={32} fill={rating >= star ? 'currentColor' : 'none'} />
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-ink-s">{i18n.language === 'ar' ? 'رأيك في المكان' : 'Your Review'}</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full bg-salt border border-sand-d/30 rounded-rs p-4 text-sm outline-none focus:border-sea h-32 resize-none"
            placeholder={i18n.language === 'ar' ? 'اكتب تجربتك هنا...' : 'Write your experience here...'}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-ink-s flex items-center gap-2">
            <Camera size={14} className="text-sea" /> {i18n.language === 'ar' ? 'رفع صور واقعية (مهم جداً للآخرين)' : 'Upload Real Photos (Very important for others)'}
          </label>
          <div className="relative">
            <input 
              type="file" 
              multiple 
              accept="image/*"
              onChange={(e) => {
                if (e.target.files) {
                  setRealPhotos(Array.from(e.target.files));
                }
              }}
              className="hidden"
              id="real-photo-upload"
            />
            <label 
              htmlFor="real-photo-upload"
              className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-sand-d/30 rounded-rs bg-salt hover:bg-white hover:border-sea transition-all cursor-pointer group"
            >
              {realPhotos.length > 0 ? (
                <div className="flex flex-wrap gap-2 justify-center">
                  {realPhotos.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 bg-sea-p text-sea px-3 py-1 rounded-full text-[10px] font-bold">
                      <FileText size={12} /> {f.name}
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <Camera className="text-ink-s group-hover:text-sea mb-2" size={32} />
                  <span className="text-xs font-bold text-ink-s group-hover:text-sea">
                    {i18n.language === 'ar' ? 'اضغط لرفع الصور الواقعية' : 'Click to upload real photos'}
                  </span>
                </>
              )}
            </label>
          </div>
        </div>

        <Button 
          variant="sea" 
          className="w-full py-4 text-lg" 
          onClick={handleSubmit} 
          loading={isSubmitting || isUploading}
        >
          {isUploading ? (i18n.language === 'ar' ? 'جاري رفع الصور...' : 'Uploading Photos...') : (i18n.language === 'ar' ? 'إرسال التقييم ✅' : 'Submit Review ✅')}
        </Button>
      </div>
    </Modal>
  );
};
