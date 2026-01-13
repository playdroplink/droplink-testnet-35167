// Pi SDK CORS Fix for Development
// This script patches the Pi SDK to work with localhost development

(function() {
  'use strict';
  
  console.log('[PI CORS FIX] 🔧 Applying Pi SDK CORS patches for development...');
  
  // Store original postMessage
  const originalPostMessage = window.postMessage;
  const originalFetch = window.fetch;
  
  // Override postMessage to handle origin mismatches
  window.postMessage = function(message, targetOrigin, transfer) {
    try {
      // If it's a Pi SDK message and we're on localhost, be more permissive
      if (targetOrigin && targetOrigin.includes('minepi.com') && window.location.hostname === 'localhost') {
        console.log('[PI CORS FIX] 📤 Intercepting Pi SDK postMessage for localhost compatibility');
        
        // Try the original call first
        try {
          return originalPostMessage.call(this, message, targetOrigin, transfer);
        } catch (error) {
          console.log('[PI CORS FIX] 🔄 Origin mismatch detected, using fallback approach');
          
          // Create a custom event instead
          const event = new CustomEvent('pi-message', {
            detail: { message, targetOrigin, transfer }
          });
          window.dispatchEvent(event);
          return;
        }
      }
      
      // For all other cases, use original postMessage
      return originalPostMessage.call(this, message, targetOrigin, transfer);
    } catch (error) {
      console.error('[PI CORS FIX] ❌ PostMessage error:', error.message);
      // Fallback to original behavior
      return originalPostMessage.call(this, message, targetOrigin, transfer);
    }
  };
  
  // Override fetch to add CORS headers for Pi SDK, but do not return mock data
  window.fetch = function(url, options = {}) {
    if (typeof url === 'string' && url.includes('minepi.com')) {
      console.log('[PI CORS FIX] 📡 Intercepting Pi SDK fetch request');
      const corsOptions = {
        ...options,
        mode: 'cors',
        headers: {
          ...options.headers,
          'Access-Control-Allow-Origin': '*',
        }
      };
      return originalFetch.call(this, url, corsOptions);
    }
    return originalFetch.call(this, url, options);
  };
  
  // Pi SDK environment detection without mocking
  function setupPiFallback() {
    if (typeof window.Pi === 'undefined' && window.location.hostname === 'localhost') {
      console.warn('[PI CORS FIX] ⚠️ Pi SDK not available on localhost. No mock installed. Use Pi Browser / real SDK.');
    }
  }
  
  // Apply fallback immediately and after DOM ready
  setupPiFallback();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupPiFallback);
  } else {
    setupPiFallback();
  }
  
  // Monitor for Pi SDK loading
  let checkCount = 0;
  const maxChecks = 50; // 5 seconds
  
  const checkPiSDK = setInterval(() => {
    checkCount++;
    
    if (typeof window.Pi !== 'undefined' && window.Pi.init) {
      console.log('[PI CORS FIX] ✅ Real Pi SDK detected, no fallback needed');
      clearInterval(checkPiSDK);
    } else if (checkCount >= maxChecks) {
      console.warn('[PI CORS FIX] ⏰ Pi SDK check timeout; still no SDK detected.');
      clearInterval(checkPiSDK);
      setupPiFallback();
    }
  }, 100);
  
  console.log('[PI CORS FIX] ✅ Pi SDK CORS patches applied successfully');
})();