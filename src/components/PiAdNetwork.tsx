import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PlayCircle, Droplets, Clock, CheckCircle } from 'lucide-react';
import { PI_CONFIG } from '@/config/pi-config';
import { usePi } from '@/contexts/PiContext';

interface AdReward {
  amount: number;
  currency: string;
  timestamp: Date;
}

interface AdNetworkConfig {
  enabled: boolean;
  rewardPerAd: number;
  maxAdsPerDay: number;
  minWatchTime: number;
}

const PiAdNetwork: React.FC = () => {
  const { piUser, isAuthenticated } = usePi();
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [adProgress, setAdProgress] = useState(0);
  const [dailyWatched, setDailyWatched] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [lastAdReward, setLastAdReward] = useState<AdReward | null>(null);
  const [adConfig] = useState<AdNetworkConfig>({
    enabled: import.meta.env.VITE_PI_AD_NETWORK_ENABLED === 'true',
    rewardPerAd: 10,
    maxAdsPerDay: 20,
    minWatchTime: 30
  });

  useEffect(() => {
    loadAdHistory();
  }, [piUser]);

  const loadAdHistory = async () => {
    if (!piUser) return;
    
    try {
      const savedData = localStorage.getItem(`ad_history_${piUser.uid}`);
      if (savedData) {
        const data = JSON.parse(savedData);
        setDailyWatched(data.dailyWatched || 0);
        setTotalEarnings(data.totalEarnings || 0);
      }
    } catch (error) {
      console.error('Error loading ad history:', error);
    }
  };

  const watchAd = async () => {
    if (!isAuthenticated || dailyWatched >= adConfig.maxAdsPerDay) {
      return;
    }

    setIsWatchingAd(true);
    setAdProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setAdProgress(prev => {
          const newProgress = prev + (100 / adConfig.minWatchTime);
          if (newProgress >= 100) {
            clearInterval(progressInterval);
            completeAdWatch();
            return 100;
          }
          return newProgress;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error watching ad:', error);
      setIsWatchingAd(false);
      setAdProgress(0);
    }
  };

  const completeAdWatch = async () => {
    try {
      const reward: AdReward = {
        amount: adConfig.rewardPerAd,
        currency: 'DROP',
        timestamp: new Date()
      };

      setDailyWatched(prev => prev + 1);
      setTotalEarnings(prev => prev + reward.amount);
      setLastAdReward(reward);
      
      const userData = {
        dailyWatched: dailyWatched + 1,
        totalEarnings: totalEarnings + reward.amount,
        lastReward: reward
      };
      localStorage.setItem(`ad_history_${piUser?.uid}`, JSON.stringify(userData));

      setTimeout(() => {
        setIsWatchingAd(false);
        setAdProgress(0);
      }, 2000);

    } catch (error) {
      console.error('Error completing ad watch:', error);
      setIsWatchingAd(false);
      setAdProgress(0);
    }
  };

  if (!adConfig.enabled) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertDescription>
              Pi Ad Network integration is currently disabled.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            Pi Ad Network
          </CardTitle>
          <CardDescription>
            Watch ads and earn DROP tokens
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Please authenticate with Pi Network to start watching ads.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlayCircle className="h-5 w-5" />
          Pi Ad Network
          <Badge variant="secondary">{PI_CONFIG.SANDBOX_MODE ? 'Sandbox' : 'Mainnet'}</Badge>
        </CardTitle>
        <CardDescription>
          Watch ads and earn DROP tokens on Pi Network
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Earnings Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Droplets className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-600">Today's Earnings</span>
            </div>
            <div className="text-2xl font-bold text-green-700">
              {dailyWatched * adConfig.rewardPerAd} DROP
            </div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">Ads Watched</span>
            </div>
            <div className="text-2xl font-bold text-blue-700">
              {dailyWatched}/{adConfig.maxAdsPerDay}
            </div>
          </div>
        </div>

        {/* Watch Ad Button */}
        <div className="text-center">
          {isWatchingAd ? (
            <div className="space-y-4">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-green-500 h-4 rounded-full transition-all duration-1000"
                  style={{ width: `${adProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">
                {adProgress < 100 
                  ? `Watching ad... ${Math.round((adConfig.minWatchTime * adProgress) / 100)}s`
                  : 'Ad complete! Distributing reward...'
                }
              </p>
              {adProgress >= 100 && (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span>+{adConfig.rewardPerAd} DROP earned!</span>
                </div>
              )}
            </div>
          ) : (
            <Button
              onClick={watchAd}
              disabled={dailyWatched >= adConfig.maxAdsPerDay}
              className="w-full"
              size="lg"
            >
              <PlayCircle className="h-5 w-5 mr-2" />
              {dailyWatched >= adConfig.maxAdsPerDay 
                ? 'Daily limit reached' 
                : `Watch Ad (+${adConfig.rewardPerAd} DROP)`
              }
            </Button>
          )}
        </div>

        {/* Last Reward */}
        {lastAdReward && (
          <Alert>
            <Droplets className="h-4 w-4" />
            <AlertDescription>
              Last reward: +{lastAdReward.amount} {lastAdReward.currency} at{' '}
              {lastAdReward.timestamp.toLocaleTimeString()}
            </AlertDescription>
          </Alert>
        )}

        {/* Info */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Earn {adConfig.rewardPerAd} DROP tokens per ad</p>
          <p>• Maximum {adConfig.maxAdsPerDay} ads per day</p>
          <p>• Minimum {adConfig.minWatchTime} seconds watch time required</p>
          <p>• Powered by Pi Ad Network API</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PiAdNetwork;