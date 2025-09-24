import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_API_BASE_URL: 'http://localhost:3000',
    VITE_API_KEY: 'test-api-key'
  },
  writable: true
});

// Mock fetch for API calls
(globalThis as any).fetch = vi.fn();