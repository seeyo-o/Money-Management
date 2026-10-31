import React, { useState, useEffect } from 'react';
import { formatIDR, parseSmartAmount } from '../../domain/formatters';

interface SmartCurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export const SmartCurrencyInput: React.FC<SmartCurrencyInputProps> = ({
  value,
  onChange,
  placeholder = '0',
  autoFocus = false,
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState<string>(
    value > 0 ? formatIDR(value, false) : ''
  );

  useEffect(() => {
    if (value > 0) {
      setDisplayValue(formatIDR(value, false));
    } else if (value === 0 && displayValue !== '') {
      setDisplayValue('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplayValue(raw);
    const parsed = parseSmartAmount(raw);
    onChange(parsed);
  };

  const handleBlur = () => {
    if (value > 0) {
      setDisplayValue(formatIDR(value, false));
    }
  };

  const addAmount = (increment: number) => {
    const nextVal = (value || 0) + increment;
    onChange(nextVal);
    setDisplayValue(formatIDR(nextVal, false));
  };

  const clearAmount = () => {
    onChange(0);
    setDisplayValue('');
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="relative flex items-center">
        <span className="absolute left-3.5 text-sm font-semibold text-slate-400 select-none">
          Rp
        </span>
        <input
          type="text"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-11 pr-12 py-3 bg-white border border-slate-200 rounded-xl text-lg font-bold text-slate-900 tabular-numbers placeholder:text-slate-300 focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10 transition"
        />
        {value > 0 && (
          <button
            type="button"
            onClick={clearAmount}
            className="absolute right-3 text-xs text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md transition"
          >
            Reset
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
        <span className="text-[11px] font-medium text-slate-400 mr-1">Cepat:</span>
        {[
          { label: '+10rb', val: 10000 },
          { label: '+25rb', val: 25000 },
          { label: '+50rb', val: 50000 },
          { label: '+100rb', val: 100000 },
          { label: '+500rb', val: 500000 },
          { label: '+1jt', val: 1000000 },
        ].map((btn) => (
          <button
            key={btn.label}
            type="button"
            onClick={() => addAmount(btn.val)}
            className="text-xs font-semibold px-2.5 py-1 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-lg transition tabular-numbers"
          >
            {btn.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-slate-400 mt-1.5">
        Tip: Anda bisa mengetik langsung seperti <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">50k</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">100rb</code>, atau <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">1.5jt</code>.
      </p>
    </div>
  );
};
