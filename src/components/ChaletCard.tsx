import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Chalet } from '../types';
import { Button } from './Button';
import { MapPin, Users, BedDouble, Star } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { motion } from 'motion/react';
import { OfferModal } from './OfferModal';
import { useTranslation } from 'react-i18next';

interface ChaletCardProps {
  chalet: Chalet;
}

export const ChaletCard: React.FC<ChaletCardProps> = ({ chalet }) => {
  const { t, i18n } = useTranslation();
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);

  const displayImage = chalet.images && chalet.images.length > 0 
    ? chalet.images[0] 
    : `https://picsum.photos/seed/${chalet.id}/800/600`;

  return (
    <>
      <motion.div 
        whileHover={{ y: -5 }}
        className="bg-white rounded-r overflow-hidden shadow-sh border border-sand-d/20 group"
      >
        <Link to={`/chalet/${chalet.id}`} className="block h-48 relative overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform duration-500 bg-salt">
          <img 
            src={displayImage} 
            alt={chalet.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none select-none rotate-12">
            <span className="font-playfair text-4xl font-black text-white">COASTLY</span>
          </div>

          <div className={`absolute top-3 ${i18n.language === 'ar' ? 'right-3' : 'left-3'} flex flex-col gap-2`}>
            {chalet.badge === 'nego' && (
              <span className="bg-coral text-white text-[10px] px-2 py-1 rounded-rxs font-bold uppercase tracking-wider">{t('common.negotiable')}</span>
            )}
            {chalet.availableGaps && chalet.availableGaps.length > 0 && (
              <span className="bg-sea text-white text-[10px] px-2 py-1 rounded-rxs font-bold uppercase tracking-wider animate-pulse">✨ {i18n.language === 'ar' ? 'عرض سد فجوة' : 'Gap Deal'}</span>
            )}
            {chalet.badge === 'new' && (
              <span className="bg-sea text-white text-[10px] px-2 py-1 rounded-rxs font-bold uppercase tracking-wider">{t('common.new')}</span>
            )}
            {chalet.badge === 'verified' && (
              <span className="bg-mint text-white text-[10px] px-2 py-1 rounded-rxs font-bold uppercase tracking-wider">✓ {t('common.verified')}</span>
            )}
            {!chalet.badge && !chalet.availableGaps && (
              <span className="bg-sea text-white text-[10px] px-2 py-1 rounded-rxs font-bold uppercase tracking-wider">{t('common.verified')}</span>
            )}
          </div>
          
          <div className={`absolute top-3 ${i18n.language === 'ar' ? 'left-3' : 'right-3'} bg-white/90 backdrop-blur-sm text-ink text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1 shadow-sm`}>
            <Star size={10} className="fill-gold text-gold" /> {chalet.rating || 4.5}
          </div>

          {chalet.minNights && (
            <div className={`absolute bottom-3 ${i18n.language === 'ar' ? 'right-3' : 'left-3'} bg-coral/80 backdrop-blur-sm text-white text-[9px] px-2 py-1 rounded-rxs font-bold`}>
              {i18n.language === 'ar' ? `أقل إقامة: ${chalet.minNights} ليالي` : `Min: ${chalet.minNights} nights`}
            </div>
          )}

          {chalet.office && (
            <div className={`absolute bottom-3 ${i18n.language === 'ar' ? 'left-3' : 'right-3'} bg-ink/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-rxs`}>
              {chalet.office}
            </div>
          )}
        </Link>
        
        <div className="p-4">
          <div className="flex items-center gap-1 text-ink-s text-xs mb-1">
            <MapPin size={12} />
            {chalet.location}
          </div>
          <Link to={`/chalet/${chalet.id}`}>
            <h3 className="text-lg font-tajawal font-bold mb-3 group-hover:text-sea transition-colors line-clamp-1">{chalet.name}</h3>
          </Link>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="bg-salt text-ink-s text-[10px] px-2 py-0.5 rounded-rxs border border-sand-d/30 flex items-center gap-1">
              <BedDouble size={10} /> {chalet.rooms} {t('common.rooms')}
            </span>
            {chalet.allowedGroups?.includes('families') && (
              <span className="bg-mint-l text-mint text-[10px] px-2 py-0.5 rounded-rxs border border-mint/20">
                {t('home.trust.rules.families')}
              </span>
            )}
            {chalet.noMixedGroups && (
              <span className="bg-red-l text-red text-[10px] px-2 py-0.5 rounded-rxs border border-red/20">
                {t('home.trust.rules.no_mixed')}
              </span>
            )}
            {(chalet.amenities || chalet.features || []).slice(0, 1).map(f => (
              <span key={f} className="bg-sea-p text-sea text-[10px] px-2 py-0.5 rounded-rxs border border-sea-ll/20">
                {f}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-sand-d/10">
            <div>
              <span className="text-2xl font-tajawal font-black text-ink">{formatCurrency(chalet.price)}</span>
              <span className="text-ink-s text-xs mx-1">/{t('common.night')}</span>
            </div>
            <Button 
              variant="coral" 
              size="sm" 
              className="rounded-full px-4"
              onClick={() => setIsOfferModalOpen(true)}
            >
              {t('common.offer')} 💬
            </Button>
          </div>
        </div>
      </motion.div>

      <OfferModal 
        isOpen={isOfferModalOpen} 
        onClose={() => setIsOfferModalOpen(false)} 
        chalet={chalet} 
      />
    </>
  );
};
