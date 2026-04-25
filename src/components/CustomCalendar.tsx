import React, { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, isBefore, startOfDay, parseISO, isWithinInterval } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from 'lucide-react';
import { cn } from '../lib/utils';

interface CustomCalendarProps {
  blockedDates?: string[];
  availableFrom?: string;
  availableTo?: string;
  selectedDates?: { checkIn: string | null; checkOut: string | null };
  onDateClick?: (date: string) => void;
  isManageMode?: boolean;
}

export const CustomCalendar: React.FC<CustomCalendarProps> = ({ 
  blockedDates = [], 
  availableFrom,
  availableTo,
  selectedDates = { checkIn: null, checkOut: null }, 
  onDateClick,
  isManageMode = false
}) => {
  const { i18n } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const locale = i18n.language === 'ar' ? ar : enUS;

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const renderMonth = (month: Date) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { locale });
    const endDate = endOfWeek(monthEnd, { locale });

    const calendarHeader = (
      <div className="text-sm font-black text-ink uppercase tracking-widest text-center mb-4 pb-2 border-b border-sand-d/10">
        {format(month, 'MMMM yyyy', { locale })}
      </div>
    );

    const weekDays = [];
    const weekStartDate = startOfWeek(new Date(), { locale });
    for (let i = 0; i < 7; i++) {
      weekDays.push(
        <div key={i} className="text-center text-[9px] font-black text-ink-s uppercase py-2">
          {format(addDays(weekStartDate, i), 'eeeeee', { locale })}
        </div>
      );
    }

    const rows = [];
    let days = [];
    let day = startDate;
    const today = startOfDay(new Date());

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const formattedDay = format(day, 'yyyy-MM-dd');
        let isBlocked = blockedDates.includes(formattedDay);
        
        // Check if outside availability range
        if (!isManageMode && availableFrom && availableTo) {
          const from = parseISO(availableFrom);
          const to = parseISO(availableTo);
          try {
            if (!isWithinInterval(day, { start: from, end: to })) {
              isBlocked = true;
            }
          } catch (e) {
            // Invalid range
          }
        }

        const isPast = isBefore(day, today) && !isSameDay(day, today);
        const isCurrentMonth = isSameMonth(day, monthStart);
        
        const isCheckIn = selectedDates.checkIn === formattedDay;
        const isCheckOut = selectedDates.checkOut === formattedDay;
        
        // Range Logic
        let isInRange = false;
        if (selectedDates.checkIn && selectedDates.checkOut) {
          const checkIn = parseISO(selectedDates.checkIn);
          const checkOut = parseISO(selectedDates.checkOut);
          try {
            isInRange = isWithinInterval(day, { start: checkIn, end: checkOut });
          } catch (e) {
            // Invalid interval
          }
        }

        const selectable = !isPast && (isManageMode || !isBlocked);

        days.push(
          <div key={formattedDay} className="relative p-0.5">
            <button
              disabled={!selectable && !isManageMode}
              onClick={() => onDateClick?.(formattedDay)}
              className={cn(
                "relative w-full aspect-square flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all rounded-full overflow-hidden",
                !isCurrentMonth ? "text-ink-s opacity-0 pointer-events-none" : "text-ink",
                isPast ? "opacity-30 cursor-not-allowed" : "",
                isBlocked && !isManageMode ? "bg-red/5 text-red-d opacity-50 cursor-not-allowed line-through" : "hover:bg-salt",
                (isCheckIn || isCheckOut) ? "bg-sea text-white z-10 shadow-shm ring-2 ring-sea-ll" : "",
                isInRange && !isCheckIn && !isCheckOut ? "bg-sea-p text-sea rounded-none scale-y-90" : "",
                isManageMode && isBlocked ? "bg-coral-l text-coral border border-coral" : "",
                !isPast && isCurrentMonth && selectable ? "hover:scale-110 active:scale-95" : ""
              )}
            >
              {format(day, 'd')}
              {isBlocked && !isManageMode && (
                <div className="absolute top-1 right-1 w-1 h-1 bg-red rounded-full" />
              )}
            </button>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.getTime()} className="grid grid-cols-7">
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div className="flex-1 min-w-[280px]">
        {calendarHeader}
        <div className="grid grid-cols-7 mb-1">{weekDays}</div>
        <div className="space-y-0.5">{rows}</div>
      </div>
    );
  };

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-r p-4 sm:p-6 shadow-sh border border-sand-d/20">
      <div className="flex items-center justify-between mb-6">
        <button onClick={prevMonth} className="p-2 hover:bg-salt rounded-full transition-colors text-ink-s shrink-0">
          <ChevronLeft size={20} className={i18n.language === 'ar' ? 'rotate-180' : ''} />
        </button>
        <div className="flex-1 flex flex-col sm:flex-row gap-8 px-4 overflow-hidden">
          {renderMonth(currentMonth)}
          <div className="hidden lg:block w-px bg-sand-d/10 h-auto" />
          <div className="hidden lg:block flex-1">
            {renderMonth(addMonths(currentMonth, 1))}
          </div>
        </div>
        <button onClick={nextMonth} className="p-2 hover:bg-salt rounded-full transition-colors text-ink-s shrink-0">
          <ChevronRight size={20} className={i18n.language === 'ar' ? 'rotate-180' : ''} />
        </button>
      </div>
      
      <div className="mt-8 flex flex-wrap gap-4 sm:gap-6 pt-6 border-t border-sand-d/10 text-[9px] font-black uppercase tracking-wider text-ink-s justify-center sm:justify-start">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-sea rounded-full" />
          {i18n.language === 'ar' ? 'مختار' : 'Selected'}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-sea-p rounded-none" />
          {i18n.language === 'ar' ? 'في النطاق' : 'In Range'}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-l border border-red/20 rounded-full flex items-center justify-center">
            <div className="w-full h-px bg-red/40 rotate-45" />
          </div>
          {i18n.language === 'ar' ? 'محجوز/مغلق' : 'Booked/Closed'}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-salt rounded-full border border-sand-d/10" />
          {i18n.language === 'ar' ? 'متاح' : 'Available'}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 p-2 bg-sea-ll/5 rounded text-[8px] font-bold text-ink-s italic border border-sea/5">
        <Info size={10} className="text-sea" />
        {i18n.language === 'ar' ? 'اختر تاريخ الوصول ثم تاريخ المغادرة لنرى السعر الإجمالي.' : 'Select check-in then check-out to see total price.'}
      </div>
    </div>
  );
};
