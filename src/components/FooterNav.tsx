import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Mail, Search, Users, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';

export const FooterNav: React.FC = () => {
  const navigate = useNavigate();
  const [showFooter, setShowFooter] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop;
      
      if (currentScrollY < 50) {
        setShowFooter(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setShowFooter(false);
      } else if (currentScrollY < lastScrollY) {
        setShowFooter(true);
      }
      
      setLastScrollY(currentScrollY);

      // Auto-show footer after scroll stops
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setShowFooter(true);
      }, 2000);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [lastScrollY]);

  return (
    <nav
      className={`fixed left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-sky-200/60 dark:border-sky-800/60 shadow-[0_-4px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)] z-50 transition-all duration-500 ease-in-out ${showFooter ? 'bottom-0 translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-6xl mx-auto px-2 sm:px-4 py-2">
        <div className="flex justify-around items-center">
          {/* Home */}
          <button
            onClick={() => navigate('/')}
            className="relative flex flex-col items-center justify-center py-2 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 active:scale-95 transition-all duration-300 group rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950/30"
            title="Home"
          >
            <Home className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5 sm:mb-1 group-hover:scale-125 group-hover:rotate-3 transition-all duration-300 drop-shadow-sm" />
            <span className="text-xs sm:text-xs group-hover:font-semibold transition-all">Home</span>
            <span className="absolute inset-0 rounded-xl bg-gradient-to-t from-sky-400/0 to-sky-400/0 group-hover:from-sky-400/10 group-hover:to-transparent transition-all duration-300"></span>
          </button>

          {/* Inbox */}
          <button
            onClick={() => navigate('/inbox')}
            className="relative flex flex-col items-center justify-center py-2 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 active:scale-95 transition-all duration-300 group rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950/30"
            title="Inbox"
          >
            <Mail className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5 sm:mb-1 group-hover:scale-125 group-hover:-rotate-3 transition-all duration-300 drop-shadow-sm" />
            <span className="text-xs sm:text-xs group-hover:font-semibold transition-all">Inbox</span>
            <span className="absolute inset-0 rounded-xl bg-gradient-to-t from-sky-400/0 to-sky-400/0 group-hover:from-sky-400/10 group-hover:to-transparent transition-all duration-300"></span>
          </button>

          {/* Search Users */}
          <button
            onClick={() => navigate('/search-users')}
            className="relative flex flex-col items-center justify-center py-2 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 active:scale-95 transition-all duration-300 group rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950/30"
            title="Search Users"
          >
            <Search className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5 sm:mb-1 group-hover:scale-125 group-hover:rotate-12 transition-all duration-300 drop-shadow-sm" />
            <span className="text-xs sm:text-xs group-hover:font-semibold transition-all">Search</span>
            <span className="absolute inset-0 rounded-xl bg-gradient-to-t from-sky-400/0 to-sky-400/0 group-hover:from-sky-400/10 group-hover:to-transparent transition-all duration-300"></span>
          </button>

          {/* Followers */}
          <button
            onClick={() => navigate('/followers')}
            className="relative flex flex-col items-center justify-center py-2 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 active:scale-95 transition-all duration-300 group rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950/30"
            title="Followers"
          >
            <Users className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5 sm:mb-1 group-hover:scale-125 transition-all duration-300 drop-shadow-sm" />
            <span className="text-xs sm:text-xs group-hover:font-semibold transition-all">Followers</span>
            <span className="absolute inset-0 rounded-xl bg-gradient-to-t from-sky-400/0 to-sky-400/0 group-hover:from-sky-400/10 group-hover:to-transparent transition-all duration-300"></span>
          </button>

          {/* Menu */}
          <Drawer>
            <DrawerTrigger asChild>
              <button 
                className="relative flex flex-col items-center justify-center py-2 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 active:scale-95 transition-all duration-300 group rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950/30"
                title="More Options"
              >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5 sm:mb-1 group-hover:scale-125 group-hover:rotate-90 transition-all duration-300 drop-shadow-sm" />
                <span className="text-xs sm:text-xs group-hover:font-semibold transition-all">Menu</span>
                <span className="absolute inset-0 rounded-xl bg-gradient-to-t from-sky-400/0 to-sky-400/0 group-hover:from-sky-400/10 group-hover:to-transparent transition-all duration-300"></span>
              </button>
            </DrawerTrigger>
            <DrawerContent className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 fixed bottom-16 left-0 right-0 max-h-[70vh] z-50">
              <DrawerHeader className="border-b pb-3">
                <DrawerTitle className="text-base sm:text-lg font-semibold">Droplink Menu</DrawerTitle>
              </DrawerHeader>
              <div className="p-4 space-y-2 max-h-[calc(70vh-100px)] overflow-y-auto">
                <div className="text-xs uppercase tracking-wide text-slate-500 px-2 py-1 font-semibold">Quick Links</div>
                <Button onClick={() => navigate('/wallet')} variant="outline" size="sm" className="w-full justify-start">
                  Wallet
                </Button>
                <Button onClick={() => navigate('/subscription')} variant="outline" size="sm" className="w-full justify-start">
                  Subscriptions
                </Button>
                <Button onClick={() => navigate('/custom-domain')} variant="outline" size="sm" className="w-full justify-start">
                  Custom Domain
                </Button>
                <Button onClick={() => navigate('/ai-support')} variant="outline" size="sm" className="w-full justify-start">
                  AI Support
                </Button>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </nav>
  );
};
