import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PublicPassportVerification from '../components/PublicPassportVerification';
import { MOCK_PASSPORT_RECORDS } from '../test-data/vin-test-data';

// Mock API responses
const mockApiResponses = {
  success: (vin: string) => ({
    valid: true,
    passport: {
      vin: vin,
      lot_id: MOCK_PASSPORT_RECORDS[vin]?.sealed?.lot_id,
      seal: MOCK_PASSPORT_RECORDS[vin]?.sealed?.seal,
      dekra: MOCK_PASSPORT_RECORDS[vin]?.sealed?.dekra,
      odometer: MOCK_PASSPORT_RECORDS[vin]?.sealed?.odometer,
      ev: MOCK_PASSPORT_RECORDS[vin]?.sealed?.ev
    }
  }),
  failed: {
    valid: false,
    reasons: ['Verification failed: Invalid signature']
  },
  notFound: {
    valid: false,
    reasons: ['Passport not found']
  }
};

describe('PublicPassportVerification', () => {
  let mockFetch: any;

  beforeEach(() => {
    // Mock fetch globally
    mockFetch = vi.fn();
    (globalThis as any).fetch = mockFetch;

    // Mock URL and history
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000',
        search: '',
        pathname: '/'
      },
      writable: true
    });

    Object.defineProperty(window, 'history', {
      value: {
        replaceState: vi.fn()
      },
      writable: true
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render the verification form', () => {
      render(<PublicPassportVerification />);

      expect(screen.getByText('Vehicle Passport Verification')).toBeInTheDocument();
      expect(screen.getByText('Verify the authenticity of a WesBank digital vehicle passport')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Enter 17-character VIN/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Verify' })).toBeInTheDocument();
    });

    it('should show character count', () => {
      render(<PublicPassportVerification />);
      expect(screen.getByText('Character count: 0/17')).toBeInTheDocument();
    });

    it('should have verify button disabled initially', () => {
      render(<PublicPassportVerification />);
      const verifyButton = screen.getByRole('button', { name: 'Verify' });
      expect(verifyButton).toBeDisabled();
    });
  });

  describe('VIN Input Handling', () => {
    it('should update character count as user types', async () => {
      const user = userEvent.setup();
      render(<PublicPassportVerification />);

      const input = screen.getByPlaceholderText(/Enter 17-character VIN/);
      await user.type(input, 'WDD2040');

      expect(screen.getByText('Character count: 7/17')).toBeInTheDocument();
      expect(input).toHaveValue('WDD2040');
    });

    it('should format VIN to uppercase', async () => {
      const user = userEvent.setup();
      render(<PublicPassportVerification />);

      const input = screen.getByPlaceholderText(/Enter 17-character VIN/);
      await user.type(input, 'wdd2040082r088866');

      expect(input).toHaveValue('WDD2040082R088866');
    });

    it('should remove invalid characters', async () => {
      const user = userEvent.setup();
      render(<PublicPassportVerification />);

      const input = screen.getByPlaceholderText(/Enter 17-character VIN/);
      await user.type(input, 'WDD-204#008@2R088866');

      expect(input).toHaveValue('WDD2040082R088866');
    });

    it('should limit VIN to 17 characters', async () => {
      const user = userEvent.setup();
      render(<PublicPassportVerification />);

      const input = screen.getByPlaceholderText(/Enter 17-character VIN/);
      await user.type(input, 'WDD2040082R088866EXTRA');

      expect(input).toHaveValue('WDD2040082R088866');
      expect(screen.getByText('Character count: 17/17')).toBeInTheDocument();
    });

    it('should enable verify button when VIN is 17 characters', async () => {
      const user = userEvent.setup();
      render(<PublicPassportVerification />);

      const input = screen.getByPlaceholderText(/Enter 17-character VIN/);
      const verifyButton = screen.getByRole('button', { name: 'Verify' });

      expect(verifyButton).toBeDisabled();

      await user.type(input, 'WDD2040082R088866');

      expect(verifyButton).not.toBeDisabled();
    });
  });

  describe('Verification Process', () => {
    beforeEach(() => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('WDD2040082R088866')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockApiResponses.success('WDD2040082R088866'))
          });
        }
        if (url.includes('INVALIDVIN123456')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockApiResponses.notFound)
          });
        }
        return Promise.reject(new Error('API Error'));
      });
    });

    it('should show loading state during verification', async () => {
      // Create a delayed mock for this specific test
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('WDD2040082R088866')) {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve(mockApiResponses.success('WDD2040082R088866'))
              });
            }, 100);
          });
        }
        return Promise.reject(new Error('API Error'));
      });

      const user = userEvent.setup();
      render(<PublicPassportVerification />);

      const input = screen.getByPlaceholderText(/Enter 17-character VIN/);
      const verifyButton = screen.getByRole('button', { name: 'Verify' });

      await user.type(input, 'WDD2040082R088866');
      await user.click(verifyButton);

      // Should show loading state immediately after clicking
      expect(screen.getByText('Verifying...')).toBeInTheDocument();

      // Wait for the verification to complete
      await waitFor(() => {
        expect(screen.queryByText('Verifying...')).not.toBeInTheDocument();
      });
    });

    it('should display successful verification results', async () => {
      const user = userEvent.setup();
      render(<PublicPassportVerification />);

      const input = screen.getByPlaceholderText(/Enter 17-character VIN/);
      const verifyButton = screen.getByRole('button', { name: 'Verify' });

      await user.type(input, 'WDD2040082R088866');
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText('Passport Verified ✓')).toBeInTheDocument();
        expect(screen.getByText('This vehicle passport is authentic and tamper-proof')).toBeInTheDocument();
      });
    });

    it('should display EV information for electric vehicles', async () => {
      const user = userEvent.setup();
      render(<PublicPassportVerification />);

      const input = screen.getByPlaceholderText(/Enter 17-character VIN/);
      const verifyButton = screen.getByRole('button', { name: 'Verify' });

      await user.type(input, 'WDD2040082R088866');
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText('Electric Vehicle Details')).toBeInTheDocument();
        expect(screen.getByText('⚡ EV Certified')).toBeInTheDocument();
        expect(screen.getByText('State of Charge:')).toBeInTheDocument();
        expect(screen.getByText('78%')).toBeInTheDocument();
        expect(screen.getByText('Range:')).toBeInTheDocument();
        expect(screen.getByText('425 km')).toBeInTheDocument();
        expect(screen.getByText('Battery Health (SoH):')).toBeInTheDocument();
        expect(screen.getByText('94%')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error for invalid VIN format', async () => {
      const user = userEvent.setup();
      render(<PublicPassportVerification />);

      const input = screen.getByPlaceholderText(/Enter 17-character VIN/);
      const verifyButton = screen.getByRole('button', { name: 'Verify' });

      await user.type(input, 'INVALID');

      // Try to click verify button (should still be disabled, but test the validation)
      expect(verifyButton).toBeDisabled();
    });

    it('should display error for API failures', async () => {
      mockFetch.mockImplementation(() =>
        Promise.reject(new Error('Network error'))
      );

      const user = userEvent.setup();
      render(<PublicPassportVerification />);

      const input = screen.getByPlaceholderText(/Enter 17-character VIN/);
      const verifyButton = screen.getByRole('button', { name: 'Verify' });

      await user.type(input, 'WDD2040082R088866');
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText('Verification Error')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should display not found message for unknown VINs', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockApiResponses.notFound)
        })
      );

      const user = userEvent.setup();
      render(<PublicPassportVerification />);

      const input = screen.getByPlaceholderText(/Enter 17-character VIN/);
      const verifyButton = screen.getByRole('button', { name: 'Verify' });

      await user.type(input, 'UNKNOWN1234567890');
      await user.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText('No Sealed Passport Found')).toBeInTheDocument();
        expect(screen.getByText('This VIN does not have a sealed digital passport')).toBeInTheDocument();
      });
    });
  });

  describe('Battery Health Display', () => {
    it('should display battery health with color coding', async () => {
      // Test high SoC (green)
      const mockHighSoC = {
        ...mockApiResponses.success('WDD2040082R088866'),
        passport: {
          ...mockApiResponses.success('WDD2040082R088866').passport,
          ev: {
            ...MOCK_PASSPORT_RECORDS['WDD2040082R088866'].sealed!.ev,
            batteryHealth: {
              soh_pct: 95,
              soc_pct: 85, // High SoC should be green
              rangeKm: 450,
              chargingStatus: 'idle' as const,
              lastUpdated: '2025-01-15T09:45:00Z'
            }
          }
        }
      };

      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockHighSoC)
        })
      );

      const user = userEvent.setup();
      render(<PublicPassportVerification />);

      const input = screen.getByPlaceholderText(/Enter 17-character VIN/);
      const verifyButton = screen.getByRole('button', { name: 'Verify' });

      await user.type(input, 'WDD2040082R088866');
      await user.click(verifyButton);

      await waitFor(() => {
        const socElement = screen.getByText('85%');
        expect(socElement).toHaveClass('text-emerald-700');
      });
    });

    it('should display charging status with appropriate styling', async () => {
      const mockCharging = {
        ...mockApiResponses.success('WDD2040082R088866'),
        passport: {
          ...mockApiResponses.success('WDD2040082R088866').passport,
          ev: {
            ...MOCK_PASSPORT_RECORDS['WDD2040082R088866'].sealed!.ev,
            batteryHealth: {
              ...MOCK_PASSPORT_RECORDS['WDD2040082R088866'].sealed!.ev!.batteryHealth,
              chargingStatus: 'charging' as const
            }
          }
        }
      };

      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCharging)
        })
      );

      const user = userEvent.setup();
      render(<PublicPassportVerification />);

      const input = screen.getByPlaceholderText(/Enter 17-character VIN/);
      const verifyButton = screen.getByRole('button', { name: 'Verify' });

      await user.type(input, 'WDD2040082R088866');
      await user.click(verifyButton);

      await waitFor(() => {
        const chargingElement = screen.getByText('charging');
        expect(chargingElement).toHaveClass('text-emerald-700');
      });
    });
  });

  describe('URL Parameter Handling', () => {
    it('should auto-verify VIN from URL parameter', async () => {
      // Mock location with VIN parameter
      Object.defineProperty(window, 'location', {
        value: {
          href: 'http://localhost:3000?vin=WDD2040082R088866',
          search: '?vin=WDD2040082R088866',
          pathname: '/'
        },
        writable: true
      });

      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockApiResponses.success('WDD2040082R088866'))
        })
      );

      render(<PublicPassportVerification />);

      // Should auto-populate and verify
      await waitFor(() => {
        expect(screen.getByDisplayValue('WDD2040082R088866')).toBeInTheDocument();
        expect(screen.getByText('Passport Verified ✓')).toBeInTheDocument();
      });
    });
  });

  describe('Information Sections', () => {
    it('should render about section', () => {
      render(<PublicPassportVerification />);

      expect(screen.getByText('About WesBank Digital Vehicle Passports')).toBeInTheDocument();
      expect(screen.getByText('🔧 What We Inspect & Seal')).toBeInTheDocument();
      expect(screen.getByText('🔒 How Digital Sealing Works')).toBeInTheDocument();
      expect(screen.getByText('📋 Historical Reports vs. Our Inspection')).toBeInTheDocument();
      expect(screen.getByText('✅ Verification Process')).toBeInTheDocument();
    });

    it('should render powered by footer', () => {
      render(<PublicPassportVerification />);

      expect(screen.getByText(/Powered by WesBank Digital Asset Platform/)).toBeInTheDocument();
      expect(screen.getByText(/Secured with ECDSA P-256 encryption/)).toBeInTheDocument();
    });
  });
});