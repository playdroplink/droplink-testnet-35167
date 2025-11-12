// Deno type definitions for TypeScript
// This file helps TypeScript understand Deno globals in the IDE
// These types are available at runtime in the Deno environment

declare namespace Deno {
  export namespace env {
    export function get(key: string): string | undefined;
  }
}

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// These are available in Deno runtime
declare const fetch: typeof globalThis.fetch;
declare const Request: typeof globalThis.Request;
declare const Response: typeof globalThis.Response;
declare const console: typeof globalThis.console;
declare const crypto: typeof globalThis.crypto;

