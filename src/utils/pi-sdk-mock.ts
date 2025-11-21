// Dev-only Pi SDK mock for local sandbox testing
// Install by calling `installMockPi()` — it will attach a minimal `window.Pi` implementation
// that supports `init`, `authenticate`, `nativeFeaturesList`, `createPayment`, and Ads API.

export function installMockPi() {
  if (typeof window === 'undefined') return;
  if ((window as any).Pi) return;

  const fakeUid = () => `pi_${Math.random().toString(36).slice(2, 10)}`;

  const PiMock: any = {
    init: async (config: any) => {
      console.log('Mock Pi.init called with', config);
      return Promise.resolve();
    },

    authenticate: async (scopes: string[] = [], onIncompletePaymentFound?: (p: any) => void) => {
      console.log('Mock Pi.authenticate called, scopes=', scopes);
      // Simulate user picking a username and optional wallet address
      const uid = fakeUid();
      const username = `mockuser_${uid.slice(-6)}`;
      const wallet_address = `GMOCK${Math.random().toString(36).slice(2, 18).toUpperCase()}`;

      // Simulated access token
      const accessToken = `mock_access_${Math.random().toString(36).slice(2)}`;

      // Slight delay to mimic async behavior
      await new Promise(res => setTimeout(res, 400));

      return {
        accessToken,
        user: {
          uid,
          username,
          wallet_address
        }
      };
    },

    nativeFeaturesList: async () => {
      return Promise.resolve(['ad_network', 'native_sharing']);
    },

    createPayment: async (paymentData: any, callbacks: any) => {
      console.log('Mock Pi.createPayment', paymentData);
      // Call onReadyForServerApproval then onReadyForServerCompletion
      const paymentId = `mockpay_${Math.random().toString(36).slice(2,8)}`;
      if (callbacks?.onReadyForServerApproval) callbacks.onReadyForServerApproval(paymentId);
      await new Promise(res => setTimeout(res, 400));
      if (callbacks?.onReadyForServerCompletion) callbacks.onReadyForServerCompletion(paymentId, `tx_${Math.random().toString(36).slice(2,12)}`);
      return Promise.resolve();
    },

    openShareDialog: async (title: string, text: string) => {
      console.log('Mock Pi.openShareDialog', title, text);
      return Promise.resolve(true);
    },

    openUrlInBrowser: async (url: string) => {
      window.open(url, '_blank');
      return Promise.resolve(true);
    },

    showRewardedAd: async () => {
      await new Promise(res => setTimeout(res, 300));
      const adId = `mock_ad_${Math.random().toString(36).slice(2,9)}`;
      return { result: 'AD_REWARDED', adId };
    },

    showInterstitialAd: async () => {
      await new Promise(res => setTimeout(res, 200));
      return { result: 'AD_CLOSED' };
    },

    Ads: {
      isAdReady: async () => true
    }
  };

  (window as any).Pi = PiMock;
  // Mark the mock so the app can detect and relax verification in dev
  (window as any).Pi.__isMock = true;
  console.log('Mock Pi SDK installed on window.Pi (dev-only)');
}

export default installMockPi;
