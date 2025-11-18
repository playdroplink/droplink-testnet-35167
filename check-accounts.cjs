const StellarSDK = require('@stellar/stellar-sdk');
const server = new StellarSDK.Horizon.Server('https://api.testnet.minepi.com');

async function checkAccountStatus() {
  const issuerPublic = 'GBVTV77XFMDYSSVIG6ZGSRAGZ3S7KA4275YYLOLIROOD3Y3F3TH5U3EI';
  const distributorPublic = 'GCTPMH43NGN7E4IXLQ27H2XWGGWWDY3I6UAPBFXYQSEUPEKNQE2BZXC2';
  
  console.log('🔍 Checking Account Status...');
  console.log('==============================');
  
  // Check issuer account
  try {
    const issuerAccount = await server.loadAccount(issuerPublic);
    console.log('✅ Issuer account is active');
    console.log(`   Sequence: ${issuerAccount.sequence}`);
    console.log(`   Home Domain: ${issuerAccount.home_domain || 'Not set'}`);
    issuerAccount.balances.forEach(balance => {
      if (balance.asset_type === 'native') {
        console.log(`   Test-Pi Balance: ${balance.balance}`);
      }
    });
  } catch (error) {
    console.log('❌ Issuer account not found/funded');
    console.log('   Need to fund with Test-Pi first');
    console.log(`   Friendbot URL: https://api.testnet.minepi.com/friendbot?addr=${issuerPublic}`);
  }
  
  // Check distributor account  
  try {
    const distributorAccount = await server.loadAccount(distributorPublic);
    console.log('\n✅ Distributor account is active');
    console.log(`   Sequence: ${distributorAccount.sequence}`);
    distributorAccount.balances.forEach(balance => {
      if (balance.asset_type === 'native') {
        console.log(`   Test-Pi Balance: ${balance.balance}`);
      } else {
        console.log(`   ${balance.asset_code}: ${balance.balance}`);
      }
    });
  } catch (error) {
    console.log('\n❌ Distributor account not found/funded');
    console.log(`   Friendbot URL: https://api.testnet.minepi.com/friendbot?addr=${distributorPublic}`);
  }
  
  console.log('\n💡 To fund accounts:');
  console.log('====================');
  console.log('1. Use Pi Testnet Faucet (Friendbot)');
  console.log('2. Or fund via Pi Wallet app on testnet');
  console.log('3. Each account needs Test-Pi for transaction fees');
}

checkAccountStatus();