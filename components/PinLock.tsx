
import React, { useState, useEffect } from 'react';
import { Lock, Delete, Fingerprint, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PinLockProps {
  onSuccess: () => void;
}

export const PinLock: React.FC<PinLockProps> = ({ onSuccess }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const savedPin = localStorage.getItem('sr_security_pin');
  const isFingerprintEnabled = localStorage.getItem('sr_fingerprint') === 'true';

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === savedPin) {
        onSuccess();
      } else {
        setError(true);
        setPin('');
        setTimeout(() => setError(false), 500);
      }
    }
  }, [pin, savedPin, onSuccess]);

  const handleNumber = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col items-center justify-center p-8 safe-area-top safe-area-bottom">
      <div className="mb-12 text-center">
        <div className="w-20 h-20 bg-red-600 rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-red-500/20">
          <ShieldCheck size={40} className="text-white" />
        </div>
        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Security Lock</h2>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Enter your 4-digit PIN to continue</p>
      </div>

      <div className="flex gap-4 mb-16">
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            animate={error ? { x: [0, -10, 10, -10, 10, 0] } : {}}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
              pin.length >= i ? 'bg-red-600 border-red-600 scale-125' : 'bg-transparent border-slate-700'
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 w-full max-w-xs">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleNumber(num.toString())}
            className="w-full aspect-square rounded-full bg-slate-800/50 text-white text-2xl font-black flex items-center justify-center active:bg-red-600 active:scale-90 transition-all"
          >
            {num}
          </button>
        ))}
        <div className="flex items-center justify-center">
          {isFingerprintEnabled && (
            <button 
              onClick={onSuccess}
              className="w-16 h-16 rounded-full bg-slate-800/50 text-emerald-500 flex items-center justify-center active:bg-emerald-500 active:text-white transition-all"
            >
              <Fingerprint size={32} />
            </button>
          )}
        </div>
        <button
          onClick={() => handleNumber('0')}
          className="w-full aspect-square rounded-full bg-slate-800/50 text-white text-2xl font-black flex items-center justify-center active:bg-red-600 active:scale-90 transition-all"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          className="w-full aspect-square rounded-full flex items-center justify-center text-slate-400 active:text-white active:scale-90 transition-all"
        >
          <Delete size={32} />
        </button>
      </div>
    </div>
  );
};
