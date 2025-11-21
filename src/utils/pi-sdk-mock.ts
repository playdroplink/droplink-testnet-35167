// Removed Pi SDK mock. Use only real Pi Network SDK in production/mainnet.
  (window as any).Pi.__isMock = true;
  console.log('Mock Pi SDK installed on window.Pi (dev-only)');
}

export default installMockPi;
