import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { VIN_TEST_CASES, MOCK_PASSPORT_RECORDS } from '../../test-data/vin-test-data';

describe('EV Workflow Integration Tests', () => {
  let mockFetch: any;

  beforeEach(() => {
    mockFetch = vi.fn();
    (globalThis as any).fetch = mockFetch;

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000',
        search: '',
        pathname: '/',
        origin: 'http://localhost:3000'
      },
      writable: true
    });

    Object.defineProperty(window, 'history', {
      value: { replaceState: vi.fn() },
      writable: true
    });
  });

  describe('Complete EV Detection and Display Workflow', () => {
    const evTestCases = VIN_TEST_CASES.filter(tc => tc.expectedEV && tc.vin.length === 17);

    it.each(evTestCases)('should handle complete workflow for $manufacturer EV ($description)', async (testCase) => {
      const mockPassportRecord = MOCK_PASSPORT_RECORDS[testCase.vin] || {
        vin: testCase.vin,
        updatedAt: '2025-01-15T10:00:00Z',
        sealed: {
          vin: testCase.vin,
          seal: {
            hash: 'test-hash',
            sig: 'test-sig',
            key_id: 'test-key',
            sealed_ts: '2025-01-15T10:00:00Z'
          },
          ev: {
            isElectric: testCase.expectedEV,
            batteryCapacityKwh: testCase.expectedBatteryCapacity,
            smartcarCompatible: testCase.expectedSmartcarCompatible,
            provenance: {
              detection: 'vin_heuristic' as const,
              detectionConfidence: testCase.expectedDetectionConfidence
            }
          }
        }
      };

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/passports/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPassportRecord)
          });
        }
        if (url.includes('/verify?')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ valid: true })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      // Mock URL with VIN parameter for auction mode
      Object.defineProperty(window, 'location', {
        value: {
          href: `http://localhost:3000?vin=${testCase.vin}`,
          search: `?vin=${testCase.vin}`,
          pathname: '/'
        },
        writable: true
      });

      render(<App />);

      // Wait for the EV information to appear
      await waitFor(() => {
        expect(screen.getByText('Electric Vehicle')).toBeInTheDocument();
      });

      // Verify EV badge is shown
      expect(screen.getByText('⚡ Electric Vehicle')).toBeInTheDocument();

      // Verify manufacturer-specific information
      if (testCase.expectedBatteryCapacity) {
        expect(screen.getByText(`${testCase.expectedBatteryCapacity} kWh`)).toBeInTheDocument();
      }

      // Verify detection information
      if (testCase.expectedDetectionConfidence > 0) {
        expect(screen.getByText('VIN analysis')).toBeInTheDocument();
        expect(screen.getByText(`(${Math.round(testCase.expectedDetectionConfidence * 100)}% confidence)`)).toBeInTheDocument();
      }

      // Verify smartcar compatibility
      if (testCase.expectedSmartcarCompatible) {
        expect(screen.getByText('Live data compatible with owner consent')).toBeInTheDocument();
      } else {
        expect(screen.queryByText('Live data compatible with owner consent')).not.toBeInTheDocument();
      }
    });

    it('should switch between auction and verification modes for EV', async () => {
      const user = userEvent.setup();
      const testVin = 'WDD2040082R088866';

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/passports/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(MOCK_PASSPORT_RECORDS[testVin])
          });
        }
        if (url.includes('/verify?')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              valid: true,
              passport: {
                ...MOCK_PASSPORT_RECORDS[testVin].sealed,
                seal: MOCK_PASSPORT_RECORDS[testVin].sealed!.seal
              }
            })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      render(<App />);

      // Switch to verification mode
      const verifyButton = screen.getByText('Public Verification');
      await user.click(verifyButton);

      // Should now be in verification mode
      expect(screen.getByText('Vehicle Passport Verification')).toBeInTheDocument();

      // Enter VIN and verify
      const vinInput = screen.getByPlaceholderText(/Enter 17-character VIN/);
      await user.type(vinInput, testVin);

      const verifySubmitButton = screen.getByRole('button', { name: 'Verify' });
      await user.click(verifySubmitButton);

      // Wait for verification results with EV information
      await waitFor(() => {
        expect(screen.getByText('Passport Verified ✓')).toBeInTheDocument();
        expect(screen.getByText('Electric Vehicle Details')).toBeInTheDocument();
        expect(screen.getByText('⚡ EV Certified')).toBeInTheDocument();
      });

      // Switch back to auction mode
      const auctionButton = screen.getByText('Auction Widget');
      await user.click(auctionButton);

      // Should load the EV data in auction mode
      await waitFor(() => {
        expect(screen.getByText('Electric Vehicle')).toBeInTheDocument();
      });
    });
  });

  describe('Non-EV Vehicle Workflow', () => {
    it('should handle non-EV vehicles correctly', async () => {
      const nonEvVin = 'MAJFXXMTKFJP14265'; // Mazda ICE

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/passports/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(MOCK_PASSPORT_RECORDS[nonEvVin])
          });
        }
        if (url.includes('/verify?')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ valid: true })
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      Object.defineProperty(window, 'location', {
        value: {
          href: `http://localhost:3000?vin=${nonEvVin}`,
          search: `?vin=${nonEvVin}`,
          pathname: '/'
        },
        writable: true
      });

      render(<App />);

      // Wait for passport to load
      await waitFor(() => {
        expect(screen.getByText('MAJFXXMTKFJP14265')).toBeInTheDocument();
      });

      // Should NOT show EV information
      expect(screen.queryByText('Electric Vehicle')).not.toBeInTheDocument();
      expect(screen.queryByText('⚡ Electric Vehicle')).not.toBeInTheDocument();
    });
  });

  describe('Battery Health Scenarios Integration', () => {
    it('should display different battery health scenarios correctly', async () => {
      const testScenarios = [
        {
          name: 'Excellent Battery',
          batteryHealth: { soh_pct: 98, soc_pct: 90, rangeKm: 450, chargingStatus: 'idle' as const },
          expectedSocColor: 'text-emerald-700'
        },
        {
          name: 'Poor Battery',
          batteryHealth: { soh_pct: 75, soc_pct: 15, rangeKm: 120, chargingStatus: 'discharging' as const },
          expectedSocColor: 'text-rose-700'
        }
      ];

      for (const scenario of testScenarios) {
        const testVin = 'WDD2040082R088866';

        const mockRecord = {
          ...MOCK_PASSPORT_RECORDS[testVin],
          sealed: {
            ...MOCK_PASSPORT_RECORDS[testVin].sealed!,
            ev: {
              ...MOCK_PASSPORT_RECORDS[testVin].sealed!.ev!,
              batteryHealth: scenario.batteryHealth
            }
          }
        };

        mockFetch.mockImplementation((url: string) => {
          if (url.includes('/passports/')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(mockRecord)
            });
          }
          if (url.includes('/verify?')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ valid: true })
            });
          }
          return Promise.reject(new Error('Unexpected URL'));
        });

        const { unmount } = render(<App />);

        // Mock location for this test
        Object.defineProperty(window, 'location', {
          value: {
            href: `http://localhost:3000?vin=${testVin}`,
            search: `?vin=${testVin}`,
            pathname: '/'
          },
          writable: true
        });

        // Re-render with new data
        unmount();
        render(<App />);

        // Wait for EV section to load
        await waitFor(() => {
          expect(screen.getByText('Electric Vehicle')).toBeInTheDocument();
        });

        // Verify battery health values are displayed
        expect(screen.getByText(`${Math.round(scenario.batteryHealth.soh_pct)}%`)).toBeInTheDocument();
        expect(screen.getByText(`${Math.round(scenario.batteryHealth.soc_pct)}%`)).toBeInTheDocument();
        expect(screen.getByText(`${Math.round(scenario.batteryHealth.rangeKm)} km`)).toBeInTheDocument();
        expect(screen.getByText(scenario.batteryHealth.chargingStatus)).toBeInTheDocument();

        unmount();
      }
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle API errors gracefully in auction mode', async () => {
      mockFetch.mockImplementation(() => {
        return Promise.reject(new Error('API is down'));
      });

      Object.defineProperty(window, 'location', {
        value: {
          href: 'http://localhost:3000?vin=WDD2040082R088866',
          search: '?vin=WDD2040082R088866',
          pathname: '/'
        },
        writable: true
      });

      render(<App />);

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText('API is down')).toBeInTheDocument();
      });
    });

    it('should handle verification errors in verification mode', async () => {
      const user = userEvent.setup();

      mockFetch.mockImplementation(() => {
        return Promise.reject(new Error('Verification service unavailable'));
      });

      render(<App />);

      // Switch to verification mode
      const verifyButton = screen.getByText('Public Verification');
      await user.click(verifyButton);

      // Try to verify a VIN
      const vinInput = screen.getByPlaceholderText(/Enter 17-character VIN/);
      await user.type(vinInput, 'WDD2040082R088866');

      const verifySubmitButton = screen.getByRole('button', { name: 'Verify' });
      await user.click(verifySubmitButton);

      // Should show verification error
      await waitFor(() => {
        expect(screen.getByText('Verification Error')).toBeInTheDocument();
        expect(screen.getByText('Verification service unavailable')).toBeInTheDocument();
      });
    });
  });

  describe('Real-world VIN Scenarios', () => {
    it('should handle mixed manufacturer VINs in sequence', async () => {
      const vinSequence = [
        'WDD2040082R088866', // Mercedes EV
        'MAJFXXMTKFJP14265', // Mazda ICE
        'WBA1234567890123',  // BMW EV
        'LGX1234567890123'   // BYD EV (no smartcar)
      ];

      for (const vin of vinSequence) {
        const mockRecord = MOCK_PASSPORT_RECORDS[vin] || {
          vin,
          updatedAt: '2025-01-15T10:00:00Z',
          sealed: { vin, seal: { hash: 'test', sig: 'test', key_id: 'test', sealed_ts: '2025-01-15T10:00:00Z' } }
        };

        mockFetch.mockImplementation((url: string) => {
          if (url.includes('/passports/')) {
            return Promise.resolve({ ok: true, json: () => Promise.resolve(mockRecord) });
          }
          if (url.includes('/verify?')) {
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ valid: true }) });
          }
          return Promise.reject(new Error('Unexpected URL'));
        });

        Object.defineProperty(window, 'location', {
          value: {
            href: `http://localhost:3000?vin=${vin}`,
            search: `?vin=${vin}`,
            pathname: '/'
          },
          writable: true
        });

        const { unmount } = render(<App />);

        // Wait for content to load
        await waitFor(() => {
          expect(screen.getByText(vin)).toBeInTheDocument();
        });

        // Check EV status based on VIN
        const isEV = ['WDD2040082R088866', 'WBA1234567890123', 'LGX1234567890123'].includes(vin);

        if (isEV) {
          expect(screen.getByText('Electric Vehicle')).toBeInTheDocument();
          expect(screen.getByText('⚡ Electric Vehicle')).toBeInTheDocument();
        } else {
          expect(screen.queryByText('Electric Vehicle')).not.toBeInTheDocument();
          expect(screen.queryByText('⚡ Electric Vehicle')).not.toBeInTheDocument();
        }

        unmount();
      }
    });
  });
});