
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export const SplashScreen: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const LOGO_URL = "https://raw.githubusercontent.com/connectcloudonetech-hash/cloudoneuae/refs/heads/main/images/logo-512.png";

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-8"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "backOut" }}
            className="flex flex-col items-center"
          >
            <img src={LOGO_URL} alt="SR INFOTECH" className="w-32 h-32 object-contain mb-6" />
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">SR INFOTECH</h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-2">Stock Manager</p>
          </motion.div>
          
          <div className="absolute bottom-12 flex flex-col items-center">
            <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="w-full h-full bg-red-600"
              />
            </div>
            <p className="text-[10px] font-bold text-slate-300 mt-4 uppercase tracking-widest">Version 2026.1.0</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
