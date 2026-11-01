import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Check,
} from 'lucide-react';
import { ID_MONTHS, ID_MONTHS_SHORT, getMonthLabel } from '../../domain/formatters';

interface MonthPickerProps {
  value: string; // e.g. "2026-11" or "ALL"
  onChange: (value: string) => void;
  className?: string;
  align?: 'left' | 'right';
  showAllOption?: boolean;
  allOptionLabel?: string;
}

export const MonthPicker: React.FC<MonthPickerProps> = ({
  value,
  onChange,
  className = '',
  align = 'right',
  showAllOption = false,
  allOptionLabel = 'Semua Waktu',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse currently selected year and month from value
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1; // 1-12
  const todayVal = `${todayYear}-${String(todayMonth).padStart(2, '0')}`;

  const parsed = useMemo(() => {
    if (!value || value === 'ALL') {
      return { year: todayYear, month: todayMonth, isAll: true };
    }
    const [yStr, mStr] = value.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    return {
      year: isNaN(y) ? todayYear : y,
      month: isNaN(m) ? todayMonth : m,
      isAll: false,
    };
  }, [value, todayYear, todayMonth]);

  // Year being viewed in the picker
  const [viewYear, setViewYear] = useState<number>(parsed.year);
  const [isSelectingYear, setIsSelectingYear] = useState<boolean>(false);

  // Sync viewYear when popover opens
  useEffect(() => {
    if (isOpen) {
      setViewYear(parsed.year);
      setIsSelectingYear(false);
    }
  }, [isOpen, parsed.year]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsSelectingYear(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setIsSelectingYear(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Year range available for selection (2024 to 2033)
  const availableYears = useMemo(() => {
    const start = Math.min(todayYear - 2, viewYear - 1);
    const end = Math.max(todayYear + 7, viewYear + 2);
    const list: number[] = [];
    for (let y = start; y <= end; y++) {
      list.push(y);
    }
    return list;
  }, [todayYear, viewYear]);

  const handleSelectMonth = (monthIndex: number) => {
    const val = `${viewYear}-${String(monthIndex + 1).padStart(2, '0')}`;
    onChange(val);
    setIsOpen(false);
    setIsSelectingYear(false);
  };

  const handleSelectAll = () => {
    onChange('ALL');
    setIsOpen(false);
    setIsSelectingYear(false);
  };

  const handleSelectToday = () => {
    onChange(todayVal);
    setIsOpen(false);
    setIsSelectingYear(false);
  };

  // Label to display on the trigger button
  const displayLabel = useMemo(() => {
    if (value === 'ALL') return allOptionLabel;
    if (!value) return getMonthLabel(todayVal);
    return getMonthLabel(value);
  }, [value, allOptionLabel, todayVal]);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-800 shadow-subtle transition-all cursor-pointer select-none active:scale-98"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <CalendarIcon size={14} className="text-teal-700 shrink-0" />
        <span className="tabular-numbers">{displayLabel}</span>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-teal-700' : ''
          }`}
        />
      </button>

      {/* Floating Popover */}
      {isOpen && (
        <div
          className={`absolute z-50 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-modal border border-slate-200/90 p-4 animate-fade-in ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Popover Header: Year navigation */}
          <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-100">
            <button
              type="button"
              onClick={() => {
                setViewYear((y) => y - 1);
              }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
              title="Tahun Sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Year Selector Toggle */}
            <button
              type="button"
              onClick={() => setIsSelectingYear((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold text-slate-900 hover:bg-slate-100 transition group"
              title="Klik untuk memilih tahun lain"
            >
              <span>Tahun {viewYear}</span>
              <ChevronDown
                size={13}
                className={`text-slate-400 group-hover:text-slate-700 transition-transform duration-200 ${
                  isSelectingYear ? 'rotate-180 text-teal-700' : ''
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() => {
                setViewYear((y) => y + 1);
              }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
              title="Tahun Berikutnya"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Body: Year Grid View OR Months Grid View */}
          {isSelectingYear ? (
            /* Year Picker Grid */
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                Pilih Tahun
              </span>
              <div className="grid grid-cols-3 gap-1.5 max-h-52 overflow-y-auto pr-1">
                {availableYears.map((yr) => {
                  const isCurrentView = yr === viewYear;
                  const isRealYear = yr === todayYear;

                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => {
                        setViewYear(yr);
                        setIsSelectingYear(false);
                      }}
                      className={`py-2 px-2 text-xs rounded-xl font-bold transition flex items-center justify-center gap-1 ${
                        isCurrentView
                          ? 'bg-slate-900 text-white shadow-sm'
                          : isRealYear
                          ? 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <span>{yr}</span>
                      {isCurrentView && <Check size={12} className="text-teal-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Months Grid (4 columns x 3 rows) */
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {ID_MONTHS_SHORT.map((shortName, idx) => {
                  const monthNum = idx + 1;
                  const isSelected = !parsed.isAll && parsed.year === viewYear && parsed.month === monthNum;
                  const isThisMonth = viewYear === todayYear && monthNum === todayMonth;

                  return (
                    <button
                      key={shortName}
                      type="button"
                      onClick={() => handleSelectMonth(idx)}
                      className={`relative py-2.5 px-2 rounded-xl text-xs font-bold transition text-center flex flex-col items-center justify-center ${
                        isSelected
                          ? 'bg-teal-700 text-white shadow-sm ring-2 ring-teal-700/20'
                          : isThisMonth
                          ? 'bg-teal-50 text-teal-800 border border-teal-300/80 hover:bg-teal-100'
                          : 'bg-slate-50/80 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <span>{shortName}</span>
                      <span
                        className={`text-[9px] font-medium leading-none mt-0.5 ${
                          isSelected ? 'text-teal-100' : 'text-slate-400'
                        }`}
                      >
                        {ID_MONTHS[idx]}
                      </span>

                      {/* Small indicator dot for the real current month */}
                      {isThisMonth && !isSelected && (
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Bottom Quick Action Shortcuts */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                {showAllOption ? (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                      value === 'ALL'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {allOptionLabel}
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium">
                    Hari ini: {today.getDate()} {ID_MONTHS[today.getMonth()]} {todayYear}
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleSelectToday}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-teal-700 hover:text-teal-900 hover:bg-teal-50 font-bold transition ml-auto"
                  title="Langsung ke bulan sekarang"
                >
                  <RotateCcw size={12} />
                  <span>Bulan Ini</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
