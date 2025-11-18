import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

interface SplashScreenProps {
  onLoadingComplete: () => void;
}

export const SplashScreen = ({ onLoadingComplete }: SplashScreenProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onLoadingComplete, 500);
          return 100;
        }
        return prev + 5;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [onLoadingComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#00BFFF]">
      <div className="flex flex-col items-center space-y-6 px-4">
        {/* Logo */}
        <div className="bg-white rounded-2xl p-4 shadow-lg">
          <img 
            src="/droplink-logo.png" 
            alt="Droplink" 
            className="w-16 h-16"
          />
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-bold text-white">Droplink</h1>
          <p className="text-white/90 text-sm tracking-wide">by MRWAIN ORGANIZATION</p>
        </div>

        {/* Progress */}
        <div className="w-64 space-y-2">
          <Progress value={progress} className="h-1 bg-muted" />
          <p className="text-center text-white font-semibold text-lg">{progress}%</p>
        </div>

        {/* Support Text */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <p className="text-white/80 text-sm">
            Need help? Contact us at support@droplinkspace
          </p>
        </div>
      </div>
    </div>
  );
};
