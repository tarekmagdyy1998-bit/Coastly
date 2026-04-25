import { useRef } from 'react';
import { Button } from './Button';
import { CheckCircle2, Calendar, Phone, Receipt, ShieldCheck, Download, MapPin, X } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { Negotiation } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

interface VoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  negotiation: Negotiation;
  clientName?: string;
}

export const VoucherModal = ({ isOpen, onClose, negotiation, clientName }: VoucherModalProps) => {
  const { t, i18n } = useTranslation();
  const voucherRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleDownloadPDF = async () => {
    if (!voucherRef.current) return;

    try {
      const canvas = await html2canvas(voucherRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`Sahel_Voucher_${negotiation.id.toUpperCase()}.pdf`);
      toast.success(i18n.language === 'ar' ? 'تم تحميل القسيمة بنجاح' : 'Voucher downloaded successfully');
    } catch (error) {
      console.error('PDF Generation Error:', error);
      toast.error(i18n.language === 'ar' ? 'فشل في تحميل القسيمة' : 'Failed to download voucher');
    }
  };

  const confirmedDate = negotiation.confirmedAt ? new Date(negotiation.confirmedAt) : new Date();
  
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-2xl rounded-r shadow-2xl overflow-hidden relative"
        >
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-salt rounded-full transition-colors z-10"
          >
            <X size={20} className="text-ink-s" />
          </button>

          <div ref={voucherRef} className="bg-white">
            <div className="bg-mint p-6 text-white text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-white/20 p-3 rounded-full">
                  <ShieldCheck size={40} />
                </div>
              </div>
              <h2 className="text-2xl font-black uppercase tracking-widest mb-1">
                {t('negotiations.voucher.title')}
              </h2>
              <p className="text-xs font-bold opacity-80">
                {t('negotiations.voucher.booking_id')}: {negotiation.id.toUpperCase()}
              </p>
            </div>

            <div className="p-8 space-y-8">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="text-[10px] text-ink-s font-bold uppercase mb-1">{t('negotiations.voucher.confirmed_at')}</div>
                  <div className="text-sm font-black">
                    {confirmedDate.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}
                  </div>
                  <div className="text-xs text-ink-s">
                    {confirmedDate.toLocaleTimeString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-ink-s font-bold uppercase mb-1">{i18n.language === 'ar' ? 'الحالة' : 'Status'}</div>
                  <div className="text-mint font-black text-sm flex items-center justify-end gap-1">
                    <CheckCircle2 size={16} /> {i18n.language === 'ar' ? 'مؤكد ومدفوع' : 'Confirmed & Paid'}
                  </div>
                </div>
              </div>

              <div className="h-px bg-sand-d/10" />

              {/* Main Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <div className="text-[10px] text-ink-s font-bold uppercase mb-1">{i18n.language === 'ar' ? 'الشاليه' : 'Chalet'}</div>
                    <div className="text-lg font-black text-sea">{negotiation.chaletName}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-ink-s font-bold uppercase mb-1">{t('negotiations.voucher.office_phone')}</div>
                    <div className="text-sm font-bold">{negotiation.officeName}</div>
                    <div className="text-sm text-sea font-mono flex items-center gap-2 mt-1">
                      <Phone size={14} /> {negotiation.officePhone}
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <div className="text-[10px] text-ink-s font-bold uppercase mb-1">{i18n.language === 'ar' ? 'الفترة' : 'Dates'}</div>
                    <div className="text-sm font-bold flex items-center gap-2">
                      <Calendar size={16} className="text-sea" /> {negotiation.dates}
                    </div>
                    <div className="text-xs text-ink-s font-bold mt-1">{negotiation.nights} {t('negotiations.nights')}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-ink-s font-bold uppercase mb-1">{t('negotiations.voucher.client_phone')}</div>
                    <div className="text-sm font-bold">{negotiation.clientName || clientName || (i18n.language === 'ar' ? 'العميل' : 'Client')}</div>
                    <div className="text-sm text-sea font-mono flex items-center gap-2 mt-1">
                      <Phone size={14} /> {negotiation.clientPhone}
                    </div>
                  </div>
                </div>
              </div>

              {/* Financials - Invoice Style */}
              <div className="bg-salt p-8 rounded-r border border-sand-d/20 shadow-inner space-y-6">
                <div className="flex items-center gap-2 text-xs font-black text-ink-m uppercase tracking-widest border-b border-sand-d/20 pb-2">
                  <Receipt size={16} className="text-sea" /> {i18n.language === 'ar' ? 'تفاصيل الفاتورة' : 'Invoice Details'}
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-s font-bold">
                      {i18n.language === 'ar' ? 'إجمالي الإقامة' : 'Stay Total'} 
                      <span className="text-[10px] font-normal block opacity-70">
                        ({formatCurrency(negotiation.agreedPrice || negotiation.currentOffer || 0)} × {negotiation.nights || 1} {i18n.language === 'ar' ? 'ليالي' : 'nights'})
                      </span>
                    </span>
                    <span className="font-bold">{formatCurrency((negotiation.agreedPrice || negotiation.currentOffer || 0) * (negotiation.nights || 1))}</span>
                  </div>
                  
                  {(negotiation.beachPassFee || 0) > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-ink-s">{i18n.language === 'ar' ? 'رسوم دخول الشاطئ' : 'Beach Pass Fee'}</span>
                      <span className="font-bold">{formatCurrency(negotiation.beachPassFee || 0)}</span>
                    </div>
                  )}
                  
                  {(negotiation.securityDeposit || 0) > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-ink-s">{i18n.language === 'ar' ? 'تأمين مسترد' : 'Security Deposit'}</span>
                      <span className="font-bold text-coral">{formatCurrency(negotiation.securityDeposit || 0)}</span>
                    </div>
                  )}

                  {(negotiation.housekeepingFee || 0) > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-ink-s">{i18n.language === 'ar' ? 'رسوم النظافة' : 'Housekeeping Fee'}</span>
                      <span className="font-bold">{formatCurrency(negotiation.housekeepingFee || 0)}</span>
                    </div>
                  )}

                  {negotiation.electricityMode === 'prepaid' ? (
                    <div className="bg-sea-p/50 p-3 rounded-rs border border-sea-ll/20 space-y-1">
                      <div className="flex justify-between text-xs font-bold text-sea">
                        <span>{i18n.language === 'ar' ? 'نظام الكهرباء' : 'Electricity System'}</span>
                        <span>{i18n.language === 'ar' ? 'كارت شحن' : 'Prepaid Card'}</span>
                      </div>
                      <p className="text-[9px] text-sea/80 leading-relaxed">
                        {i18n.language === 'ar' 
                          ? "تنبيه: الشاليه يعمل بنظام كارت الشحن الذكي. يتحمل المستأجر تكلفة الاستهلاك الفعلي وشحن الكارت خلال فترة الإقامة."
                          : "Note: The chalet uses a prepaid meter system. The guest is responsible for recharging the card based on their actual consumption."
                        }
                      </p>
                    </div>
                  ) : (
                    (negotiation.electricityFee || 0) > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-ink-s">{i18n.language === 'ar' ? 'رسوم الكهرباء' : 'Electricity Fee'}</span>
                        <span className="font-bold">{formatCurrency(negotiation.electricityFee || 0)}</span>
                      </div>
                    )
                  )}

                  <div className="h-px bg-sand-d/20 my-4" />

                  <div className="flex justify-between text-base font-black text-ink">
                    <span>{i18n.language === 'ar' ? 'إجمالي المبلغ' : 'Grand Total'}</span>
                    <span>{formatCurrency(negotiation.totalAmount || 0)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm text-mint font-bold bg-mint-l/20 p-2 rounded-rs">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 size={16} /> {i18n.language === 'ar' ? 'المبلغ المدفوع (عربون)' : 'Deposit Paid'}
                    </span>
                    <span className="font-black">{formatCurrency(negotiation.depositAmount || 0)}</span>
                  </div>

                  <div className="bg-coral-p p-4 rounded-rs border-2 border-coral/20 flex justify-between items-center">
                    <div>
                      <div className="text-[10px] font-black text-coral uppercase tracking-widest mb-1">
                        {i18n.language === 'ar' ? 'المبلغ المتبقي عند الوصول' : 'Remaining Balance on Arrival'}
                      </div>
                      <div className="text-2xl font-black text-coral">
                        {formatCurrency(negotiation.remainingBalance || 0)}
                      </div>
                    </div>
                    <div className="bg-coral text-white p-2 rounded-full">
                      <Receipt size={24} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-salt p-4 text-center border-t border-sand-d/10">
                <div className="text-[10px] text-ink-s font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                  <ShieldCheck size={14} className="text-mint" /> 
                  {i18n.language === 'ar' ? 'حجز آمن وموثق عبر ساحلي' : 'Secure & Verified Booking via Sahel'}
                </div>
              </div>
            </div>
          </div>

          {/* Actions - Outside the ref to avoid being in PDF */}
          <div className="p-8 pt-0 flex flex-col sm:flex-row gap-4">
            <Button 
              variant="ink" 
              className="flex-1 flex items-center justify-center gap-2 py-4"
              onClick={handleDownloadPDF}
            >
              <Download size={18} /> {t('negotiations.voucher.download')}
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 flex items-center justify-center gap-2 py-4"
            >
              <MapPin size={18} /> {t('negotiations.voucher.location')}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
