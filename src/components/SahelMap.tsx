import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { Chalet } from '../types';
import { formatCurrency } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { OfferModal } from './OfferModal';
import { Search, RefreshCw, ExternalLink } from 'lucide-react';

// Fix for default marker icons in Leaflet with React
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom Price Icon
const createPriceIcon = (price: number) => {
  return L.divIcon({
    className: 'custom-price-marker',
    html: `<div class="bg-sea text-white px-2 py-1 rounded-full font-black text-[10px] shadow-sh border border-white whitespace-nowrap hover:scale-110 transition-transform">${price.toLocaleString()}</div>`,
    iconSize: [40, 20],
    iconAnchor: [20, 10]
  });
};

function ChangeView({ chalets }: { chalets: Chalet[] }) {
  const map = useMap();
  useEffect(() => {
    const validChalets = chalets.filter(c => c.lat && c.lng);
    if (validChalets.length > 0) {
      const bounds = L.latLngBounds(validChalets.map(c => [c.lat!, c.lng!]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [chalets, map]);
  return null;
}

function MapEvents({ onMove }: { onMove: () => void }) {
  useMapEvents({
    moveend: () => {
      onMove();
    },
  });
  return null;
}

interface SahelMapProps {
  chalets: Chalet[];
  onRefresh?: () => void;
}

export const SahelMap: React.FC<SahelMapProps> = ({ chalets, onRefresh }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [selectedChalet, setSelectedChalet] = useState<Chalet | null>(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [showSearchButton, setShowSearchButton] = useState(false);
  
  // Center of North Coast (Sidi Abdel Rahman area)
  const center: [number, number] = [30.95, 28.85];

  const handleOpenOffer = (chalet: Chalet) => {
    setSelectedChalet(chalet);
    setIsOfferModalOpen(true);
  };

  const handleViewDetails = (chaletId: string) => {
    navigate(`/chalet/${chaletId}`);
  };

  const handleMapMove = useCallback(() => {
    setShowSearchButton(true);
  }, []);

  const handleSearchArea = () => {
    if (onRefresh) onRefresh();
    setShowSearchButton(false);
  };

  return (
    <>
      <div className="h-full w-full rounded-r overflow-hidden border-2 border-sea-ll/20 shadow-sh relative">
        <MapContainer 
          center={center} 
          zoom={11} 
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <ChangeView chalets={chalets} />
          <MapEvents onMove={handleMapMove} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {chalets.filter(c => c.lat && c.lng).map((chalet) => (
            <Marker 
              key={chalet.id} 
              position={[chalet.lat!, chalet.lng!]}
              icon={createPriceIcon(chalet.price)}
            >
              <Popup className="custom-popup">
                <div className={`p-0 min-w-[200px] overflow-hidden rounded-r ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>
                  <div className="relative h-28">
                    <img 
                      src={chalet.images && chalet.images.length > 0 ? chalet.images[0] : `https://picsum.photos/seed/${chalet.id}/300/200`} 
                      alt={chalet.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 right-2 glass px-2 py-1 rounded-full text-[10px] font-black text-sea shadow-sm border border-white/40">
                      {formatCurrency(chalet.price)}
                    </div>
                  </div>
                  <div className="p-3 bg-white">
                    <h4 className="font-black text-sm mb-1 truncate text-ink">{chalet.name}</h4>
                    <p className="text-[10px] text-ink-s mb-3 flex items-center gap-1 font-bold">
                      <span className="w-2 h-2 rounded-full bg-sea/40 border border-sea"></span>
                      {chalet.location}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => handleViewDetails(chalet.id)}
                        className="text-[10px] border border-sea text-sea py-2 rounded-rs font-black hover:bg-sea hover:text-white transition-all flex items-center justify-center gap-1"
                      >
                        <ExternalLink size={10} />
                        {i18n.language === 'ar' ? 'التفاصيل' : 'Details'}
                      </button>
                      <button 
                        onClick={() => handleOpenOffer(chalet)}
                        className="text-[10px] bg-sea text-white py-2 rounded-rs font-black hover:bg-ink transition-all shadow-sh"
                      >
                        {t('common.offer')} 💬
                      </button>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Search this area button */}
        {showSearchButton && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
            <button 
              onClick={handleSearchArea}
              className="bg-white text-ink px-4 py-2 rounded-full shadow-shm border border-sand-d/30 flex items-center gap-2 text-xs font-black hover:bg-sea hover:text-white transition-all scale-up"
            >
              <RefreshCw size={14} />
              {i18n.language === 'ar' ? 'البحث في هذه المنطقة' : 'Search this area'}
            </button>
          </div>
        )}
      </div>

      {selectedChalet && (
        <OfferModal 
          isOpen={isOfferModalOpen} 
          onClose={() => setIsOfferModalOpen(false)} 
          chalet={selectedChalet} 
        />
      )}
    </>
  );
};
