/// <reference types="vite/client" />

// Minimal typing for the legacy pdf.js build (works on older phones and tablets).
declare module 'pdfjs-dist/legacy/build/pdf.mjs' {
  export const GlobalWorkerOptions: { workerSrc: string };
  export function getDocument(src: unknown): { promise: Promise<any>; destroy: () => void };
}
