export const validatePiEnvironment = async (): Promise<void> => {
  const errors: string[] = [];

  try {
    // Check validation key file
    const valResp = await fetch('/validation-key.txt', { cache: 'no-store' });
    if (!valResp.ok) {
      errors.push('Validation key file not accessible at /validation-key.txt');
    } else {
      const valText = (await valResp.text()).trim();
      const expected = import.meta.env.VITE_PI_VALIDATION_KEY || '';
      if (expected && valText !== expected) {
        errors.push('Validation key mismatch between file and environment variable');
      }
    }
  } catch (err) {
    errors.push('Failed to fetch /validation-key.txt');
  }

  try {
    // Check manifest has pi_app and keys
    const manResp = await fetch('/manifest.json', { cache: 'no-store' });
    if (!manResp.ok) {
      errors.push('manifest.json not accessible at /manifest.json');
    } else {
      const manifest = await manResp.json();
      const piApp = manifest?.pi_app;
      if (!piApp) {
        errors.push('manifest.json missing `pi_app` section');
      } else {
        const expectedApi = import.meta.env.VITE_PI_API_KEY || '';
        const expectedVal = import.meta.env.VITE_PI_VALIDATION_KEY || '';
        if (expectedApi && String(piApp.api_key) !== String(expectedApi)) {
          errors.push('manifest.pi_app.api_key does not match environment API key');
        }
        if (expectedVal && String(piApp.validation_key) !== String(expectedVal)) {
          errors.push('manifest.pi_app.validation_key does not match environment validation key');
        }
      }
    }
  } catch (err) {
    errors.push('Failed to fetch or parse /manifest.json');
  }

  try {
    // Pi SDK availability is guaranteed in Pi Browser. Cross-origin HEAD often fails due to CORS.
    // Perform a best-effort HEAD and never make this fatal (even on production).
    const sdkUrl = import.meta.env.VITE_PI_SDK_URL || 'https://sdk.minepi.com/pi-sdk.js';
    try {
      const sdkResp = await fetch(sdkUrl, { method: 'HEAD', cache: 'no-store' });
      if (!sdkResp.ok) {
        console.warn(`Pi SDK HEAD returned ${sdkResp.status} on ${sdkUrl} — continuing`);
      }
    } catch (e) {
      console.warn('Pi SDK HEAD failed (likely CORS/network) — skipping strict check', e);
    }
  } catch (err) {
    console.warn('Unexpected error during Pi SDK check — continuing', err);
  }

  if (errors.length > 0) {
    const message = `Pi environment validation failed:\n- ${errors.join('\n- ')}`;
    throw new Error(message);
  }
};
