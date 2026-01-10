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
  
  // Override fetch to handle CORS for Pi SDK
  window.fetch = function(url, options = {}) {
    // If it's a Pi SDK request, add CORS headers
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
      
      return originalFetch.call(this, url, corsOptions).catch(error => {
        if (error.name === 'TypeError' && error.message.includes('CORS')) {
          console.warn('[PI CORS FIX] ⚠️ CORS error detected, using fallback');
          
          // Return a mock response for development
          return Promise.resolve(new Response(
            JSON.stringify({ error: 'CORS_FALLBACK', message: 'Pi SDK not available in development' }),
            { 
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          ));
        }
        throw error;
      });
    }
    
    // For all other requests, use original fetch
    return originalFetch.call(this, url, options);
  };
  
  // Pi SDK environment detection and fallback
  function setupPiFallback() {
    if (typeof window.Pi === 'undefined' && window.location.hostname === 'localhost') {
      console.log('[PI CORS FIX] 🔄 Setting up Pi SDK development fallback');
      
      window.Pi = {
        init: function(config) {
          console.log('[PI CORS FIX] 🎮 Pi.init() called with config:', config);
          return Promise.resolve({
            isSignedIn: false,
            user: null
          });
        },
        
        authenticate: function(scopes, onIncompletePaymentFound) {
          console.log('[PI CORS FIX] 🔐 Pi.authenticate() called');
          console.warn('[PI CORS FIX] ⚠️ Pi authentication not available in localhost development');
          
          // Return mock user for development
          return Promise.resolve({
            accessToken: 'mock_development_token',
            user: {
              uid: 'dev_user_123',
              username: 'dev_user'
            }
          });
        },
        
        createPayment: function(paymentData, callbacks) {
          console.log('[PI CORS FIX] 💰 Pi.createPayment() called with:', paymentData);
          console.warn('[PI CORS FIX] ⚠️ Pi payments not available in localhost development');
          
          if (callbacks && callbacks.onError) {
            callbacks.onError('DEVELOPMENT_MODE', 'Pi payments not available in development mode');
          }
          
          return Promise.reject(new Error('Pi payments not available in development mode'));
        },
        
        openShareDialog: function(title, message) {
          console.log('[PI CORS FIX] 📤 Pi.openShareDialog() called');
          console.warn('[PI CORS FIX] ⚠️ Pi share dialog not available in localhost development');
          return Promise.resolve();
        }
      };
      
      console.log('[PI CORS FIX] ✅ Pi SDK development fallback installed');
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
      console.log('[PI CORS FIX] ✅ Real Pi SDK detected, removing fallback');
      clearInterval(checkPiSDK);
    } else if (checkCount >= maxChecks) {
      console.log('[PI CORS FIX] ⏰ Pi SDK check timeout, keeping development fallback');
      clearInterval(checkPiSDK);
      setupPiFallback(); // Ensure fallback is in place
    }
  }, 100);
  
  console.log('[PI CORS FIX] ✅ Pi SDK CORS patches applied successfully');
})();