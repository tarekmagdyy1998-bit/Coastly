import React, { useState, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { X, MapPin, Home, DollarSign, Bed, Info, Upload, Trash2, Loader2, Sparkles, Shield, Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, collection, addDoc, storage, ref, uploadBytes, getDownloadURL, doc, updateDoc, getDocs, where, query, serverTimestamp } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Chalet } from '../types';
import { sendWhatsAppNotification, formatChaletNotification } from '../services/whatsappService';

// Fix for default marker icons in Leaflet with React
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface AddChaletModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Chalet | null;
}

const LocationPicker = ({ lat, lng, onChange }: { lat: number; lng: number; onChange: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return lat ? <Marker position={[lat, lng]} /> : null;
};

export const AddChaletModal: React.FC<AddChaletModalProps> = ({ isOpen, onClose, initialData }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    location: initialData?.location || '',
    price: initialData?.price?.toString() || '',
    rooms: initialData?.rooms?.toString() || '',
    description: initialData?.description || '',
    lat: initialData?.lat || 30.95,
    lng: initialData?.lng || 28.85,
    beachPassFee: initialData?.beachPassFee?.toString() || '',
    beachPassDuration: initialData?.beachPassDuration || '',
    beachPassPersons: initialData?.beachPassPersons?.toString() || '',
    securityDeposit: initialData?.securityDeposit?.toString() || '',
    allowedGroups: initialData?.allowedGroups || ['families'],
    noMixedGroups: initialData?.noMixedGroups ?? true,
    idRequired: initialData?.idRequired ?? true,
    housekeepingFee: initialData?.housekeepingFee?.toString() || '',
    electricityFee: initialData?.electricityFee?.toString() || '',
    electricityMode: initialData?.electricityMode || 'fixed',
    availableFrom: initialData?.availableFrom || '',
    availableTo: initialData?.availableTo || '',
  });

  const [nights, setNights] = useState(0);

  React.useEffect(() => {
    if (formData.availableFrom && formData.availableTo) {
      const start = new Date(formData.availableFrom);
      const end = new Date(formData.availableTo);
      if (end > start) {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setNights(diffDays);
      } else {
        setNights(0);
      }
    } else {
      setNights(0);
    }
  }, [formData.availableFrom, formData.availableTo]);

  // Update state when initialData changes
  React.useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        location: initialData.location,
        price: initialData.price.toString(),
        rooms: initialData.rooms.toString(),
        type: initialData.type || 'chalet',
        description: initialData.description,
        lat: initialData.lat,
        lng: initialData.lng,
        beachPassFee: initialData.beachPassFee?.toString() || '',
        beachPassDuration: initialData.beachPassDuration || '',
        beachPassPersons: initialData.beachPassPersons?.toString() || '',
        securityDeposit: initialData.securityDeposit?.toString() || '',
        allowedGroups: initialData.allowedGroups || ['families'],
        noMixedGroups: initialData.noMixedGroups ?? true,
        idRequired: initialData.idRequired ?? true,
        housekeepingFee: initialData.housekeepingFee?.toString() || '',
        electricityFee: initialData.electricityFee?.toString() || '',
        electricityMode: initialData.electricityMode || 'fixed',
        availableFrom: initialData.availableFrom || '',
        availableTo: initialData.availableTo || '',
      });
      setImages(initialData.images || []);
    } else {
      setFormData({
        name: '',
        location: 'Marina',
        price: '',
        rooms: '',
        type: 'chalet',
        description: '',
        lat: 30.95,
        lng: 28.85,
        beachPassFee: '',
        beachPassDuration: '',
        beachPassPersons: '',
        securityDeposit: '',
        allowedGroups: ['families'],
        noMixedGroups: true,
        idRequired: true,
        housekeepingFee: '',
        electricityFee: '',
        electricityMode: 'fixed',
        availableFrom: '',
        availableTo: '',
      });
      setImages([]);
    }
  }, [initialData, isOpen]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setUploading(true);
    const fileList = Array.from(files);
    const total = fileList.length;
    
    toast.info(i18n.language === 'ar' ? `بدء معالجة ${total} صور...` : `Starting processing ${total} images...`);

    const uploadPromises = fileList.map(async (file: File, index) => {
      if (!file.type.startsWith('image/')) {
        toast.error(i18n.language === 'ar' ? `الملف "${file.name}" ليس صورة.` : `File "${file.name}" is not an image.`);
        return;
      }

      // 1. Get Instant Preview (Parallel & Fast)
      const previewUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Add to state immediately - this shows the image to user
      setImages(prev => [...prev, previewUrl]);

      // 2. Background Upload (Non-blocking)
      // We don't 'await' this inside the main loop for UI responsiveness
      (async () => {
        try {
          const options = {
            maxSizeMB: 0.1,
            maxWidthOrHeight: 800,
            useWebWorker: false
          };

          const compressedFile = await imageCompression(file, options);
          const fileName = `${Date.now()}_${index}_${Math.random().toString(36).substring(7)}_${file.name}`;
          const storageRef = ref(storage, `chalets/${user.uid}/${fileName}`);
          const snapshot = await uploadBytes(storageRef, compressedFile);
          const downloadUrl = await getDownloadURL(snapshot.ref);
          
          // Replace the preview with the real storage URL silently
          setImages(prev => prev.map(img => img === previewUrl ? downloadUrl : img));
        } catch (storageError) {
          console.error(`Storage fallback for ${file.name}:`, storageError);
        }
      })();
    });

    try {
      // We only await the creation of promises, not the storage part
      await Promise.all(uploadPromises);
      toast.success(i18n.language === 'ar' ? 'تم معالجة الصور بنجاح' : 'Images processed successfully');
    } catch (error) {
      console.error('Critical Processing Error:', error);
      toast.error(i18n.language === 'ar' ? 'حدث خطأ أثناء معالجة الصور' : 'An error occurred during image processing');
    } finally {
      setUploading(false); // Enable the "Add Chalet" button early!
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.lat || !formData.lng) {
      toast.error(i18n.language === 'ar' ? 'يرجى تحديد موقع الشاليه على الخريطة' : 'Please select the chalet location on the map');
      return;
    }
    if (images.length === 0) {
      toast.error(i18n.language === 'ar' ? 'يرجى رفع صورة واحدة على الأقل' : 'Please upload at least one image');
      return;
    }

    setLoading(true);
    try {
      // Create data object
      const rawData: any = {
        name: formData.name,
        location: formData.location,
        price: Number(formData.price),
        rooms: Number(formData.rooms),
        description: formData.description,
        lat: formData.lat,
        lng: formData.lng,
        allowedGroups: formData.allowedGroups,
        noMixedGroups: formData.noMixedGroups,
        idRequired: formData.idRequired,
        electricityMode: formData.electricityMode,
        type: formData.type,
        officeId: user.uid,
        status: initialData?.status || 'available',
        availableFrom: formData.availableFrom || null,
        availableTo: formData.availableTo || null,
        images: images,
        amenities: initialData?.amenities || ['Pool', 'AC', 'WiFi'],
        blockedDates: initialData?.blockedDates || [],
        createdAt: initialData?.createdAt || serverTimestamp(),
      };

      // Add optional numeric fields only if they have values
      if (formData.beachPassFee) rawData.beachPassFee = Number(formData.beachPassFee);
      if (formData.beachPassPersons) rawData.beachPassPersons = Number(formData.beachPassPersons);
      if (formData.beachPassDuration) rawData.beachPassDuration = formData.beachPassDuration;
      if (formData.securityDeposit) rawData.securityDeposit = Number(formData.securityDeposit);
      if (formData.housekeepingFee) rawData.housekeepingFee = Number(formData.housekeepingFee);
      if (formData.electricityFee && formData.electricityMode !== 'prepaid') {
        rawData.electricityFee = Number(formData.electricityFee);
      }

      let chaletId = initialData?.id;
      if (chaletId) {
        await updateDoc(doc(db, 'chalets', chaletId), rawData);
        toast.success(i18n.language === 'ar' ? 'تم تحديث الشاليه بنجاح' : 'Chalet updated successfully');
      } else {
        const docRef = await addDoc(collection(db, 'chalets'), {
          ...rawData,
          createdAt: new Date().toISOString(),
        });
        chaletId = docRef.id;
        toast.success(i18n.language === 'ar' ? 'تمت إضافة الشاليه بنجاح' : 'Chalet added successfully');

        // Trigger WhatsApp Notifications for new chalet
        try {
          const subscribersSnapshot = await getDocs(query(collection(db, 'subscribers'), where('active', '==', true)));
          const subscribers = subscribersSnapshot.docs.map(doc => doc.data().phoneNumber);
          
          if (subscribers.length > 0) {
            const message = formatChaletNotification(formData.name, formData.location, Number(formData.price), i18n.language as 'ar' | 'en');
            
            // Send notifications (in a real app, this should be handled by a background job or cloud function)
            for (const phone of subscribers) {
              await sendWhatsAppNotification(phone, message);
            }
            console.log(`Sent WhatsApp notifications to ${subscribers.length} subscribers`);
          }
        } catch (notifyError) {
          console.error('Failed to send WhatsApp notifications:', notifyError);
          // Don't show error to user as the chalet was saved successfully
        }
      }
      onClose();
    } catch (error) {
      console.error('Error saving chalet:', error);
      toast.error(i18n.language === 'ar' ? 'حدث خطأ أثناء حفظ الشاليه' : 'Error saving chalet');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-5xl max-h-[95vh] rounded-r shadow-shl overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-sand-d/20 flex justify-between items-center">
          <h2 className="text-xl font-black">{i18n.language === 'ar' ? 'إضافة شاليه جديد' : 'Add New Chalet'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-salt rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-ink-s mb-1 uppercase tracking-wider">{i18n.language === 'ar' ? 'اسم الشاليه' : 'Chalet Name'}</label>
                <div className="relative">
                  <Home className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-s" size={16} />
                  <input 
                    type="text" 
                    required 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-salt border border-sand-d/20 rounded-rs py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-sea"
                    placeholder={i18n.language === 'ar' ? 'مثال: شاليه مارينا ٧' : 'e.g. Marina 7 Chalet'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-ink-s mb-1 uppercase tracking-wider">{i18n.language === 'ar' ? 'نوع الوحدة' : 'Unit Type'}</label>
                  <select 
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    className="w-full bg-salt border border-sand-d/20 rounded-rs py-2 px-3 text-sm focus:outline-none focus:border-sea"
                  >
                    <option value="chalet">{i18n.language === 'ar' ? 'شاليه' : 'Chalet'}</option>
                    <option value="villa">{i18n.language === 'ar' ? 'فيلا' : 'Villa'}</option>
                    <option value="apartment">{i18n.language === 'ar' ? 'شقة' : 'Apartment'}</option>
                    <option value="cabin">{i18n.language === 'ar' ? 'كابينة' : 'Cabin'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ink-s mb-1 uppercase tracking-wider">{i18n.language === 'ar' ? 'المنطقة' : 'Location/Area'}</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-s" size={16} />
                    <select 
                      value={formData.location}
                      onChange={e => setFormData({...formData, location: e.target.value})}
                      className="w-full bg-salt border border-sand-d/20 rounded-rs py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-sea appearance-none"
                    >
                      <option value="Marina">{i18n.language === 'ar' ? 'مارينا' : 'Marina'}</option>
                      <option value="Hacienda">{i18n.language === 'ar' ? 'هاسيندا' : 'Hacienda'}</option>
                      <option value="Sidi Abdel Rahman">{i18n.language === 'ar' ? 'سيدي عبد الرحمن' : 'Sidi Abdel Rahman'}</option>
                      <option value="Alamein">{i18n.language === 'ar' ? 'العلمين' : 'Alamein'}</option>
                      <option value="Ras El Hekma">{i18n.language === 'ar' ? 'رأس الحكمة' : 'Ras El Hekma'}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-ink-s mb-1 uppercase tracking-wider">{i18n.language === 'ar' ? 'السعر لليلة' : 'Price per Night'}</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-s" size={16} />
                    <input 
                      type="number" 
                      required 
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: e.target.value})}
                      className="w-full bg-salt border border-sand-d/20 rounded-rs py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-sea"
                      placeholder="5000"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-ink-s mb-1 uppercase tracking-wider">{i18n.language === 'ar' ? 'عدد الغرف' : 'Rooms'}</label>
                  <div className="relative">
                    <Bed className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-s" size={16} />
                    <input 
                      type="number" 
                      required 
                      value={formData.rooms}
                      onChange={e => setFormData({...formData, rooms: e.target.value})}
                      className="w-full bg-salt border border-sand-d/20 rounded-rs py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-sea"
                      placeholder="3"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-ink-s mb-1 uppercase tracking-wider">{i18n.language === 'ar' ? 'وصف الشاليه' : 'Description'}</label>
                <div className="relative">
                  <Info className="absolute left-3 top-3 text-ink-s" size={16} />
                  <textarea 
                    required 
                    rows={3}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-salt border border-sand-d/20 rounded-rs py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-sea"
                    placeholder={i18n.language === 'ar' ? 'اكتب تفاصيل الشاليه والمزايا...' : 'Write chalet details and features...'}
                  />
                </div>
              </div>

              {/* Beach Pass & Security Deposit */}
              <div className="p-4 bg-salt rounded-r border border-sand-d/20 space-y-4">
                <h4 className="text-xs font-black text-sea flex items-center gap-2">
                  <Sparkles size={14} /> {i18n.language === 'ar' ? 'الرسوم الإضافية والتأمين' : 'Additional Fees & Deposit'}
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-ink-s mb-1 uppercase tracking-wider">{t('home.trust.beach_pass')}</label>
                    <input 
                      type="number" 
                      value={formData.beachPassFee}
                      onChange={e => setFormData({...formData, beachPassFee: e.target.value})}
                      className="w-full bg-white border border-sand-d/20 rounded-rs py-2 px-3 text-xs focus:outline-none focus:border-sea"
                      placeholder="e.g. 500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-ink-s mb-1 uppercase tracking-wider">{i18n.language === 'ar' ? 'لعدد أفراد' : 'For Persons'}</label>
                    <input 
                      type="number" 
                      value={formData.beachPassPersons}
                      onChange={e => setFormData({...formData, beachPassPersons: e.target.value})}
                      className="w-full bg-white border border-sand-d/20 rounded-rs py-2 px-3 text-xs focus:outline-none focus:border-sea"
                      placeholder="e.g. 4"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-ink-s mb-1 uppercase tracking-wider">{t('home.trust.security_deposit')}</label>
                  <input 
                    type="number" 
                    value={formData.securityDeposit}
                    onChange={e => setFormData({...formData, securityDeposit: e.target.value})}
                    className="w-full bg-white border border-sand-d/20 rounded-rs py-2 px-3 text-xs focus:outline-none focus:border-sea"
                    placeholder={i18n.language === 'ar' ? 'مثال: ثمن ليلة واحدة' : 'e.g. Price of one night'}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-ink-s mb-1 uppercase tracking-wider">{i18n.language === 'ar' ? 'رسوم النظافة' : 'Housekeeping Fee'}</label>
                    <input 
                      type="number" 
                      value={formData.housekeepingFee}
                      onChange={e => setFormData({...formData, housekeepingFee: e.target.value})}
                      className="w-full bg-white border border-sand-d/20 rounded-rs py-2 px-3 text-xs focus:outline-none focus:border-sea"
                      placeholder="e.g. 200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-ink-s mb-1 uppercase tracking-wider">{i18n.language === 'ar' ? 'رسوم الكهرباء' : 'Electricity Fee'}</label>
                    <input 
                      type="number" 
                      disabled={formData.electricityMode === 'prepaid'}
                      value={formData.electricityFee}
                      onChange={e => setFormData({...formData, electricityFee: e.target.value})}
                      className={`w-full bg-white border border-sand-d/20 rounded-rs py-2 px-3 text-xs focus:outline-none focus:border-sea ${formData.electricityMode === 'prepaid' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      placeholder={formData.electricityMode === 'prepaid' ? (i18n.language === 'ar' ? 'كارت شحن' : 'Prepaid Card') : 'e.g. 100'}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={formData.electricityMode === 'prepaid'}
                      onChange={e => setFormData({...formData, electricityMode: e.target.checked ? 'prepaid' : 'fixed'})}
                      className="w-4 h-4 rounded border-sand-d/30 text-sea focus:ring-sea"
                    />
                    <span className="text-xs font-bold text-ink-m group-hover:text-sea transition-colors">
                      {i18n.language === 'ar' ? 'نظام كارت شحن الكهرباء' : 'Prepaid Electricity Card'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Housing Rules */}
              <div className="p-4 bg-salt rounded-r border border-sand-d/20 space-y-4">
                <h4 className="text-xs font-black text-coral flex items-center gap-2">
                  <Shield size={14} /> {t('home.trust.housing_rules')}
                </h4>
                
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {['families', 'men', 'women'].map(group => (
                      <button
                        key={group}
                        type="button"
                        onClick={() => {
                          const current = formData.allowedGroups;
                          const next = current.includes(group as any) 
                            ? current.filter(g => g !== group)
                            : [...current, group as any];
                          setFormData({...formData, allowedGroups: next});
                        }}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${
                          formData.allowedGroups.includes(group as any)
                            ? 'bg-sea text-white border-sea'
                            : 'bg-white text-ink-s border-sand-d/20 hover:border-sea'
                        }`}
                      >
                        {t(`home.trust.rules.${group}`)}
                      </button>
                    ))}
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={formData.noMixedGroups}
                      onChange={e => setFormData({...formData, noMixedGroups: e.target.checked})}
                      className="w-4 h-4 rounded border-sand-d/30 text-sea focus:ring-sea"
                    />
                    <span className="text-xs font-bold text-ink-m group-hover:text-sea transition-colors">{t('home.trust.rules.no_mixed')}</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={formData.idRequired}
                      onChange={e => setFormData({...formData, idRequired: e.target.checked})}
                      className="w-4 h-4 rounded border-sand-d/30 text-sea focus:ring-sea"
                    />
                    <span className="text-xs font-bold text-ink-m group-hover:text-sea transition-colors">{t('home.trust.id_upload')}</span>
                  </label>
                </div>
              </div>

              {/* Availability Range */}
              <div className="p-4 bg-sea-ll/10 rounded-r border border-sea/20 space-y-4">
                <h4 className="text-xs font-black text-sea flex items-center gap-2">
                  <CalendarIcon size={14} /> {i18n.language === 'ar' ? 'فترة الإتاحة (اختياري)' : 'Availability Range (Optional)'}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-ink-s mb-1 uppercase tracking-wider">{i18n.language === 'ar' ? 'من تاريخ' : 'From Date'}</label>
                    <input 
                      type="date" 
                      value={formData.availableFrom}
                      onChange={e => setFormData({...formData, availableFrom: e.target.value})}
                      className="w-full bg-white border border-sand-d/20 rounded-rs py-2 px-3 text-xs focus:outline-none focus:border-sea"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-ink-s mb-1 uppercase tracking-wider">{i18n.language === 'ar' ? 'إلى تاريخ' : 'To Date'}</label>
                    <input 
                      type="date" 
                      value={formData.availableTo}
                      onChange={e => setFormData({...formData, availableTo: e.target.value})}
                      className="w-full bg-white border border-sand-d/20 rounded-rs py-2 px-3 text-xs focus:outline-none focus:border-sea"
                    />
                  </div>
                </div>
                {nights > 0 && (
                  <div className="p-2 bg-white/50 rounded flex items-center justify-between">
                    <span className="text-[10px] font-bold text-ink-s">{i18n.language === 'ar' ? 'إجمالي الليالي المتاحة:' : 'Total Available Nights:'}</span>
                    <span className="text-sm font-black text-sea">{nights} {i18n.language === 'ar' ? 'ليلة' : 'nights'}</span>
                  </div>
                )}
              </div>

            </div>

            {/* Image Upload */}
            <div className="space-y-4">
              <label className="block text-[10px] font-bold text-ink-s mb-1 uppercase tracking-wider">{i18n.language === 'ar' ? 'صور الشاليه (إجباري)' : 'Chalet Photos (Mandatory)'}</label>
              <div className="grid grid-cols-3 gap-3">
                <AnimatePresence>
                  {images.map((url, index) => (
                    <motion.div 
                      key={url}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="relative aspect-square rounded-rs overflow-hidden group border border-sand-d/20"
                    >
                      <img src={url} alt="Chalet" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button 
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 p-1.5 bg-red text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      >
                        <Trash2 size={12} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="aspect-square rounded-rs border-2 border-dashed border-sand-d/40 flex flex-col items-center justify-center gap-2 hover:border-sea hover:bg-sea-p transition-all group"
                >
                  {uploading ? (
                    <Loader2 className="animate-spin text-sea" size={24} />
                  ) : (
                    <>
                      <Upload className="text-ink-s group-hover:text-sea transition-colors" size={24} />
                      <span className="text-[10px] font-bold text-ink-s group-hover:text-sea">{i18n.language === 'ar' ? 'رفع صور' : 'Upload'}</span>
                    </>
                  )}
                </button>
              </div>
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleImageUpload}
              />
            </div>
          </div>

          <div className="space-y-4 flex flex-col">
            <label className="block text-[10px] font-bold text-ink-s mb-1 uppercase tracking-wider">
              {i18n.language === 'ar' ? 'حدد موقع الشاليه على الخريطة (إجباري)' : 'Select Chalet Location on Map (Mandatory)'}
            </label>
            <div className="flex-1 min-h-[300px] rounded-r overflow-hidden border-2 border-sand-d/20 relative">
              <MapContainer 
                center={[30.95, 28.85]} 
                zoom={10} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationPicker 
                  lat={formData.lat} 
                  lng={formData.lng} 
                  onChange={(lat, lng) => setFormData(prev => ({ ...prev, lat, lng }))} 
                />
              </MapContainer>
              <div className="absolute bottom-2 left-2 right-2 glass p-2 rounded-rs text-[10px] text-ink-s z-[1000] text-center">
                {i18n.language === 'ar' ? 'اضغط على الخريطة لتحديد الموقع بدقة' : 'Click on the map to set the exact location'}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-ink-s font-bold">
              <div>Lat: {formData.lat.toFixed(6)}</div>
              <div>Lng: {formData.lng.toFixed(6)}</div>
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-sand-d/20 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>{i18n.language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
          <Button variant="ink" className="flex-1" onClick={handleSubmit} disabled={loading || uploading}>
            {loading ? (i18n.language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (i18n.language === 'ar' ? 'إضافة الشاليه' : 'Add Chalet')}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
