import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound, sounds } from '@/utils/sounds';
import { Progress } from "@/components/ui/progress";

export interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [enableChristmasTheme, setEnableChristmasTheme] = useState(() => {
    const saved = localStorage.getItem('droplink-christmas-theme');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    // Total loading time in milliseconds - slightly longer for smoother animation
    const totalLoadTime = 2800;
    // Update interval in milliseconds - more frequent updates for smoother progress
    const updateInterval = 16; // ~60fps
    // Calculate the number of updates needed
    const totalUpdates = totalLoadTime / updateInterval;
    // Calculate progress increment per update
    const progressIncrement = 100 / totalUpdates;
    
    // Start progress animation with easing
    const interval = setInterval(() => {
      setProgress((prevProgress) => {
        // Apply slight easing to make progress more natural
        const remaining = 100 - prevProgress;
        const increment = Math.min(progressIncrement * (0.5 + (remaining / 100)), remaining);
        
        if (prevProgress >= 100) {
          clearInterval(interval);
          return 100;
        }
        return Math.min(prevProgress + increment, 100);
      });
    }, updateInterval);
    
    // Complete the loading after the total time
    const timer = setTimeout(() => {
      // Play sound when loading completes (with error handling)
      try {
        playSound(sounds.loadingComplete, 0.4);
      } catch (error) {
        console.warn('Audio playback failed:', error);
      }
      
      // Set exiting state first for smooth transition
      setIsExiting(true);
      
      // Small delay after sound before transitioning
      setTimeout(() => {
        onComplete();
      }, 500);
    }, totalLoadTime);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [onComplete]);

  return (
    <AnimatePresence mode="wait" onExitComplete={() => {}}>
      {!isExiting && (
        <motion.div
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${enableChristmasTheme ? 'bg-gradient-to-b from-red-600 via-sky-400 to-green-600' : 'bg-sky-400'}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          key="splash-screen"
        >
          {/* Christmas Decorations - Only show when Christmas theme is enabled */}
          {enableChristmasTheme && (
            <>
              {/* Top Left Snowflakes */}
              <motion.div
                className="absolute left-4 top-4 text-4xl pointer-events-none"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ❄️
              </motion.div>
              
              {/* Top Right Christmas Tree */}
              <motion.div
                className="absolute right-4 top-4 text-4xl pointer-events-none"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                🎄
              </motion.div>
              
              {/* Bottom Left Christmas Tree */}
              <motion.div
                className="absolute left-4 bottom-4 text-4xl pointer-events-none"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
              >
                🎄
              </motion.div>
              
              {/* Bottom Right Snowflakes */}
              <motion.div
                className="absolute right-4 bottom-4 text-4xl pointer-events-none"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              >
                ❄️
              </motion.div>
              
              {/* Snowman - Top Center */}
              <motion.div
                className="absolute left-1/2 top-8 -translate-x-1/2 text-3xl pointer-events-none opacity-60"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                ⛄
              </motion.div>
              
              {/* Santa - Bottom Center */}
              <motion.div
                className="absolute left-1/2 bottom-8 -translate-x-1/2 text-3xl pointer-events-none opacity-70"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🎅
              </motion.div>
            </>
          )}

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
            className="text-center"
          >
            {/* Logo */}
            <motion.div
              className="mx-auto mb-6 h-24 w-24 rounded-xl bg-white p-4 shadow-lg relative"
              initial={{ scale: 0.8, rotate: -5 }}
              animate={{ 
                scale: [0.8, 1.05, 1],
                rotate: [-5, 2, 0] 
              }}
              transition={{ 
                delay: 0.3, 
                duration: 0.8, 
                ease: "easeOut",
                times: [0, 0.7, 1] 
              }}
            >
              {enableChristmasTheme ? (
                // Christmas SVG Logo with Santa Hat
                <svg viewBox="0 0 100 100" className="h-full w-full">
                  {/* Animated Snowflakes around logo */}
                  <motion.text
                    x="5"
                    y="20"
                    fontSize="12"
                    animate={{ opacity: [0.3, 1, 0.3], rotate: [0, 360] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    ❄️
                  </motion.text>
                  <motion.text
                    x="80"
                    y="25"
                    fontSize="10"
                    animate={{ opacity: [0.5, 1, 0.5], rotate: [360, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                  >
                    ❄️
                  </motion.text>
                  
                  {/* Water drop (Droplink logo) */}
                  <ellipse cx="50" cy="60" rx="20" ry="30" fill="#3B82F6" />
                  <ellipse cx="50" cy="55" rx="15" ry="22" fill="#60A5FA" opacity="0.7" />
                  <circle cx="45" cy="50" r="5" fill="white" opacity="0.6" />
                  
                  {/* Santa Hat on top of drop */}
                  <path
                    d="M 35 35 Q 50 20 65 35 L 60 45 L 40 45 Z"
                    fill="#DC2626"
                  />
                  <ellipse cx="50" cy="35" rx="17" ry="5" fill="white" />
                  <circle cx="65" cy="32" r="4" fill="white" />
                  
                  {/* Sparkles */}
                  <motion.circle
                    cx="25"
                    cy="70"
                    r="2"
                    fill="#FCD34D"
                    animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <motion.circle
                    cx="75"
                    cy="65"
                    r="2"
                    fill="#FCD34D"
                    animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.7 }}
                  />
                </svg>
              ) : (
                // Default logo
                <img 
                  src="https://i.ibb.co/LDGGGXCk/Gemini-Generated-Image-ar8t52ar8t52ar8t-1.png"
                  alt="Droplink Logo"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    console.warn('Failed to load splash screen logo');
                    e.currentTarget.src = '/droplink-logo.svg';
                  }}
                />
              )}
            </motion.div>
            
            {/* App Name */}
            <motion.h1 
              className={`mb-2 font-poppins text-4xl font-bold ${enableChristmasTheme ? 'text-white' : 'text-white'}`}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
            >
              {enableChristmasTheme ? '🎄 Droplink 🎄' : 'Droplink'}
            </motion.h1>
            
            {/* Company Name */}
            <motion.p 
              className="text-sm text-white/80"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
            >
              by MRWAIN ORGANIZATION
            </motion.p>
            
            {/* Progress Percentage */}
            <motion.p
              className={`mt-6 font-medium ${enableChristmasTheme ? 'text-white drop-shadow-lg' : 'text-white/90'}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              {enableChristmasTheme && '🎁 '}{Math.round(progress)}%{enableChristmasTheme && ' 🎁'}
            </motion.p>
            
            {/* Progress Bar */}
            <motion.div 
              className="mt-2 w-64 md:w-80"
              initial={{ opacity: 0, width: "60%" }}
              animate={{ opacity: 1, width: "100%" }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              <div className={enableChristmasTheme ? "relative" : ""}>
                <Progress 
                  value={progress} 
                  className={`h-2 overflow-hidden ${enableChristmasTheme ? 'bg-white/30' : ''}`}
                />
                {enableChristmasTheme && (
                  <motion.div
                    className="absolute -top-1 text-xl"
                    style={{ left: `${Math.min(progress, 95)}%` }}
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    🎅
                  </motion.div>
                )}
              </div>
            </motion.div>
            
            {/* Support Email */}
            <motion.p
              className={`mt-8 text-xs ${enableChristmasTheme ? 'text-white/80 font-medium' : 'text-white/60'}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              {enableChristmasTheme && '🎄 '}Need help? Contact us at support@droplinkspace{enableChristmasTheme && ' 🎄'}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
