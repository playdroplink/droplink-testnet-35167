// Quick test for DROP token integration
import { usePi } from '@/contexts/PiContext';

export const QuickDropTest = () => {
  const { 
    isAuthenticated, 
    getDROPBalance, 
    createDROPTrustline, 
    requestDropTokens 
  } = usePi();

  const testDropToken = async () => {
    if (!isAuthenticated) {
      console.log('❌ Please authenticate first');
      return;
    }

    console.log('🔍 Checking DROP balance...');
    const balance = await getDROPBalance();
    console.log('Balance:', balance);

    if (!balance.hasTrustline) {
      console.log('🔗 Creating trustline...');
      const success = await createDROPTrustline();
      console.log('Trustline created:', success);
    }

    // Optional: Request test tokens
    // const tokens = await requestDropTokens(10);
    // console.log('Tokens requested:', tokens);
  };

  return (
    <button onClick={testDropToken}>
      Test DROP Token Integration
    </button>
  );
};