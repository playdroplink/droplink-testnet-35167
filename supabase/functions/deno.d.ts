// Deno global types for edge functions
declare global {
  namespace Deno {
    const env: {
      get(key: string): string | undefined;
      set(key: string, value: string): void;
      toObject(): { [index: string]: string };
    };
  }
}
