import { useState } from 'react';
import { Button } from '../components/Button';
import { FileText, Shield, Scale, Printer, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const LegalPage = () => {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<'contract' | 'cancel' | 'terms'>('contract');

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-12">
        <h1 className="text-3xl font-black">{t('legal.title')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Printer size={14} /> {t('legal.print')}
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Download size={14} /> {t('legal.pdf')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-salt p-1 rounded-full border border-sand-d/20 mb-12">
        <button 
          onClick={() => setTab('contract')}
          className={`flex-1 py-3 rounded-full text-sm font-bold transition-all ${tab === 'contract' ? 'bg-white text-sea shadow-sm' : 'text-ink-s'}`}
        >
          {t('legal.tabs.contract')}
        </button>
        <button 
          onClick={() => setTab('cancel')}
          className={`flex-1 py-3 rounded-full text-sm font-bold transition-all ${tab === 'cancel' ? 'bg-white text-sea shadow-sm' : 'text-ink-s'}`}
        >
          {t('legal.tabs.cancel')}
        </button>
        <button 
          onClick={() => setTab('terms')}
          className={`flex-1 py-3 rounded-full text-sm font-bold transition-all ${tab === 'terms' ? 'bg-white text-sea shadow-sm' : 'text-ink-s'}`}
        >
          {t('legal.tabs.terms')}
        </button>
      </div>

      <div className="bg-white rounded-r p-8 md:p-12 shadow-sh border border-sand-d/20 font-cairo leading-loose text-ink-m">
        {tab === 'contract' && (
          <div className="space-y-8">
            <div className="flex justify-between items-start border-b border-sand-d/20 pb-8">
              <div className={i18n.language === 'ar' ? 'text-right' : 'text-left'}>
                <span className="font-playfair text-2xl font-extrabold text-ink block mb-2">
                  C<span className="text-coral">o</span>astly <span className="font-cairo text-xl">· ساحلي</span>
                </span>
                <p className="text-xs text-ink-s">{t('legal.platform_desc')}</p>
              </div>
              <div className={i18n.language === 'ar' ? 'text-left' : 'text-right'}>
                <span className="bg-salt px-3 py-1 rounded-full text-[10px] font-bold border border-sand-d/20">{t('legal.version')}</span>
              </div>
            </div>

            <h2 className="text-2xl font-black text-ink text-center">{t('legal.contract_title')}</h2>

            <section className={`space-y-4 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>
              <h3 className={`font-bold text-sea ${i18n.language === 'ar' ? 'border-r-4 pr-3' : 'border-l-4 pl-3'} border-sea`}>{t('legal.sections.parties')}</h3>
              <p>{t('legal.sections.parties_desc')}</p>
            </section>

            <section className={`space-y-4 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>
              <h3 className={`font-bold text-sea ${i18n.language === 'ar' ? 'border-r-4 pr-3' : 'border-l-4 pl-3'} border-sea`}>{t('legal.sections.obligations')}</h3>
              <ul className={`list-disc list-inside space-y-2 ${i18n.language === 'ar' ? 'pr-4' : 'pl-4'}`}>
                {(t('legal.sections.obligations_list', { returnObjects: true }) as string[]).map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </section>

            <div className="bg-red-l border border-red/20 p-4 rounded-rs text-red text-sm font-bold">
              {t('legal.sections.warning')}
            </div>

            <section className={`space-y-4 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>
              <h3 className={`font-bold text-sea ${i18n.language === 'ar' ? 'border-r-4 pr-3' : 'border-l-4 pl-3'} border-sea`}>{t('legal.sections.commission')}</h3>
              <p>{t('legal.sections.commission_desc')}</p>
              <div className="bg-salt p-4 rounded-rs border border-sand-d/20 text-xs">
                <div className="font-bold mb-2">{t('legal.sections.example')}</div>
                {t('legal.sections.example_calc')}
              </div>
            </section>

            <div className="grid grid-cols-2 gap-8 pt-12 border-t border-sand-d/20">
              <div className="text-center">
                <div className="h-24 border-b border-sand-d/20 mb-2"></div>
                <p className="text-xs font-bold">{t('legal.sections.signatures.first')}</p>
              </div>
              <div className="text-center">
                <div className="h-24 border-b border-sand-d/20 mb-2"></div>
                <p className="text-xs font-bold">{t('legal.sections.signatures.second')}</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'cancel' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-black text-ink text-center">{t('legal.sections.cancel_title')}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-mint-l p-6 rounded-r border border-mint/20 text-center">
                <div className="text-3xl mb-2">🟢</div>
                <div className="font-black text-mint mb-1">{t('legal.sections.refund_100')}</div>
                <div className="text-[10px] text-ink-s">{t('legal.sections.refund_100_desc')}</div>
              </div>
              <div className="bg-gold-l p-6 rounded-r border border-gold/20 text-center">
                <div className="text-3xl mb-2">🟡</div>
                <div className="font-black text-gold mb-1">{t('legal.sections.refund_50')}</div>
                <div className="text-[10px] text-ink-s">{t('legal.sections.refund_50_desc')}</div>
              </div>
              <div className="bg-red-l p-6 rounded-r border border-red/20 text-center">
                <div className="text-3xl mb-2">🔴</div>
                <div className="font-black text-red mb-1">{t('legal.sections.refund_0')}</div>
                <div className="text-[10px] text-ink-s">{t('legal.sections.refund_0_desc')}</div>
              </div>
            </div>

            <section className={`space-y-4 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>
              <h3 className={`font-bold text-sea ${i18n.language === 'ar' ? 'border-r-4 pr-3' : 'border-l-4 pl-3'} border-sea`}>{t('legal.sections.cancel_penalties')}</h3>
              <p>{t('legal.sections.cancel_penalties_desc')}</p>
              <ul className={`list-disc list-inside space-y-2 ${i18n.language === 'ar' ? 'pr-4' : 'pl-4'} text-sm`}>
                {(t('legal.sections.cancel_penalties_list', { returnObjects: true }) as string[]).map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {tab === 'terms' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-black text-ink text-center">{t('legal.sections.terms_title')}</h2>
            <section className={`space-y-4 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>
              <h3 className={`font-bold text-sea ${i18n.language === 'ar' ? 'border-r-4 pr-3' : 'border-l-4 pl-3'} border-sea`}>{t('legal.sections.nature')}</h3>
              <p>{t('legal.sections.nature_desc')}</p>
            </section>
            <section className={`space-y-4 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>
              <h3 className={`font-bold text-sea ${i18n.language === 'ar' ? 'border-r-4 pr-3' : 'border-l-4 pl-3'} border-sea`}>{i18n.language === 'ar' ? '٣. سياسة العربون (الديبوزت)' : '3. Deposit Policy'}</h3>
              <p className="bg-salt p-4 rounded-rs border border-sand-d/20">
                {t('home.trust.deposit_notice')}
              </p>
            </section>
            <section className={`space-y-4 ${i18n.language === 'ar' ? 'text-right' : 'text-left'}`}>
              <h3 className={`font-bold text-sea ${i18n.language === 'ar' ? 'border-r-4 pr-3' : 'border-l-4 pl-3'} border-sea`}>{t('legal.sections.privacy')}</h3>
              <div className="bg-red-l border border-red/20 p-4 rounded-rs text-red text-sm font-bold">
                {t('legal.sections.privacy_desc')}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};
