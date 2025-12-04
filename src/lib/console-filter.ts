/**
 * Suppress non-critical console errors and warnings
 * This helps clean up the console output for users
 */

const isDevelopment = import.meta.env.DEV;

// Store original console methods
const originalError = console.error;
const originalWarn = console.warn;
const originalLog = console.log;

// List of patterns to suppress in production
const suppressPatterns = [
  /SDKMessaging instantiated/i,
  /CORS policy/i,
  /Access to fetch.*blocked/i,
  /not a valid image/i,
  /Download error/i,
  /Failed to fetch|ERR_/i,
];

/**
 * Check if an error message should be suppressed
 */
function shouldSuppress(message: string): boolean {
  if (isDevelopment) {
    return false; // Show all logs in development
  }

  return suppressPatterns.some(pattern => 
    pattern.test(String(message))
  );
}

/**
 * Suppress console errors
 */
console.error = function(...args: any[]) {
  const message = args.map(arg => 
    typeof arg === 'string' ? arg : JSON.stringify(arg)
  ).join(' ');

  // Only suppress specific patterns in production
  if (!shouldSuppress(message)) {
    originalError.apply(console, args);
  }
};

/**
 * Suppress console warnings
 */
console.warn = function(...args: any[]) {
  const message = args.map(arg => 
    typeof arg === 'string' ? arg : JSON.stringify(arg)
  ).join(' ');

  // Only suppress specific patterns in production
  if (!shouldSuppress(message)) {
    originalWarn.apply(console, args);
  }
};

/**
 * Suppress console logs for specific patterns
 */
const originalLogImpl = console.log;
console.log = function(...args: any[]) {
  const message = args.map(arg => 
    typeof arg === 'string' ? arg : JSON.stringify(arg)
  ).join(' ');

  // Suppress specific Pi SDK and initialization logs
  if (isDevelopment || !shouldSuppress(message)) {
    originalLogImpl.apply(console, args);
  }
};

// Handle unhandled promise rejections gracefully
window.addEventListener('unhandledrejection', (event) => {
  const message = event.reason?.message || String(event.reason);
  
  // Only suppress non-critical errors
  if (shouldSuppress(message)) {
    event.preventDefault();
  }
});

export { shouldSuppress };
