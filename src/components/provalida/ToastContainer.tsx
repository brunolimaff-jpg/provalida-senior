'use client';

import { Toaster } from 'sonner';

/**
 * Container de toasts usando a biblioteca sonner.
 */
export default function ToastContainer() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          borderRadius: '10px',
          border: '1px solid var(--border)',
          fontFamily: 'Satoshi, Inter, sans-serif',
        },
      }}
    />
  );
}
