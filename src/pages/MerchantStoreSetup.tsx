
import React from "react";
import { Wrench } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const MerchantStoreSetup: React.FC = () => {
  return (
    <>
      <PageHeader 
        title="Store Setup" 
        description="Configure your merchant store (coming soon)"
        icon={<Wrench />}
      />
      <div className="min-h-screen dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4 relative overflow-hidden pb-24">
      {/* Background decorative elements - Light Mode */}
      <div className="dark:hidden absolute top-0 left-10 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="dark:hidden absolute top-40 right-10 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="dark:hidden absolute -bottom-8 left-20 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      {/* Background decorative elements - Dark Mode */}
      <div className="hidden dark:block absolute top-0 left-10 w-96 h-96 bg-blue-900 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob"></div>
      <div className="hidden dark:block absolute top-40 right-10 w-96 h-96 bg-purple-900 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="hidden dark:block absolute -bottom-8 left-20 w-96 h-96 bg-pink-900 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      {/* Main Card - Glassmorphism */}
      <div className="max-w-md w-full relative z-10">
        {/* Light Mode Glassmorphism - Ultra Transparent Glass */}
        <div className="dark:hidden backdrop-blur-2xl bg-white/20 dark:bg-transparent border border-white/25 rounded-3xl p-8 shadow-2xl hover:shadow-lg transition-all duration-300 overflow-hidden group backdrop-brightness-110">
          {/* Glass border glow effect */}
          <div className="absolute inset-0 rounded-3xl border border-white/40 pointer-events-none"></div>
          
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl"></div>
          
          {/* Inner glow */}
          <div className="absolute inset-0 bg-radial from-white/10 to-transparent pointer-events-none rounded-3xl"></div>
          
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-4 text-gray-800 drop-shadow-sm">Merchant Section</h2>
            <p className="text-lg text-gray-700 mb-2 drop-shadow-sm">Feature Coming Soon</p>
            <p className="text-gray-600 drop-shadow-sm">We are working hard to bring you powerful merchant tools. Stay tuned!</p>
            
            <button className="mt-6 w-full px-4 py-3 bg-gradient-to-r from-blue-400/30 to-purple-400/30 backdrop-blur-lg border border-white/40 rounded-xl text-gray-800 font-semibold hover:from-blue-400/50 hover:to-purple-400/50 hover:border-white/60 transition-all duration-200 hover:shadow-lg drop-shadow-sm">
              Learn More
            </button>
          </div>
        </div>

        {/* Dark Mode Glassmorphism - Ultra Transparent Glass */}
        <div className="hidden dark:block backdrop-blur-2xl bg-white/10 dark:bg-white/5 border border-white/15 rounded-3xl p-8 shadow-2xl hover:shadow-lg transition-all duration-300 overflow-hidden group">
          {/* Glass border glow effect */}
          <div className="absolute inset-0 rounded-3xl border border-white/20 pointer-events-none"></div>
          
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl"></div>
          
          {/* Inner glow */}
          <div className="absolute inset-0 bg-radial from-white/5 to-transparent pointer-events-none rounded-3xl"></div>
          
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-4 text-foreground drop-shadow-md">Merchant Section</h2>
            <p className="text-lg text-muted-foreground mb-2 drop-shadow-md">Feature Coming Soon</p>
            <p className="text-muted-foreground drop-shadow-md">We are working hard to bring you powerful merchant tools. Stay tuned!</p>
            
            <button className="mt-6 w-full px-4 py-3 bg-gradient-to-r from-blue-500/25 to-purple-500/25 backdrop-blur-lg border border-border rounded-xl text-foreground font-semibold hover:from-blue-500/40 hover:to-purple-500/40 hover:border-border transition-all duration-200 hover:shadow-lg drop-shadow-md">
              Learn More
            </button>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default MerchantStoreSetup;
