import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AuctionPassportWidget, { type WidgetData } from '../components/AuctionPassportWidget';
import { BATTERY_HEALTH_SCENARIOS } from '../test-data/vin-test-data';

// Mock the DTC library
vi.mock('../lib/dtc', () => ({
  describeDtc: (code: string) => {
    const descriptions: Record<string, string> = {
      'P0420': 'EV system check recommended',
      'B1600': 'Battery system fault',
      'P0171': 'System too lean (Bank 1)'
    };
    return descriptions[code] || 'Unknown diagnostic code';
  }
}));

describe('AuctionPassportWidget', () => {
  const createMockWidgetData = (overrides: Partial<WidgetData> = {}): WidgetData => ({
    vin: 'WDD2040082R088866',
    lotId: 'LOT-2025-001',
    odometerKm: 15000,
    dtcStatus: 'green',
    dtcCodes: [],
    tyres: { FL: 6.5, FR: 6.2, RL: 5.8, RR: 5.9 },
    dekraUrl: null,
    seal: {
      hash: 'abc123',
      keyId: 'key-001',
      ts: '2025-01-15T10:30:00Z',
      valid: true
    },
    gallery: [],
    timeline: [],
    auction: {
      openAt: new Date(Date.now() + 3600000).toISOString(),
      closeAt: new Date(Date.now() + 7200000).toISOString(),
      reserveMet: true,
      currentBid: 179000,
      bids: 12,
      url: 'https://example.com'
    },
    ...overrides
  });

  describe('Basic Widget Rendering', () => {
    it('should render basic widget information', () => {
      const data = createMockWidgetData();
      render(<AuctionPassportWidget data={data} />);

      expect(screen.getByText('Vehicle Passport')).toBeInTheDocument();
      expect(screen.getByText(/VIN:/)).toBeInTheDocument();
      expect(screen.getByText('WDD2040082R088866')).toBeInTheDocument();
      expect(screen.getByText('LOT-2025-001')).toBeInTheDocument();
    });

    it('should render odometer information', () => {
      const data = createMockWidgetData({ odometerKm: 25000 });
      render(<AuctionPassportWidget data={data} />);

      expect(screen.getByText('25,000 km')).toBeInTheDocument();
    });

    it('should render auction information', () => {
      const data = createMockWidgetData();
      render(<AuctionPassportWidget data={data} />);

      expect(screen.getByText(/R\s*179\s*000/)).toBeInTheDocument(); // South African currency format
      expect(screen.getByText('12 bids • Reserve met')).toBeInTheDocument();
    });
  });

  describe('EV Information Display', () => {
    it('should display EV section when vehicle is electric', () => {
      const data = createMockWidgetData({
        ev: {
          isElectric: true,
          batteryCapacityKwh: 80,
          smartcarCompatible: true,
          provenance: {
            detection: 'vin_heuristic',
            detectionConfidence: 0.7
          }
        }
      });

      render(<AuctionPassportWidget data={data} />);

      expect(screen.getByText('Electric Vehicle')).toBeInTheDocument();
      expect(screen.getByText('⚡ Electric Vehicle')).toBeInTheDocument();
      expect(screen.getByText('80 kWh')).toBeInTheDocument();
    });

    it('should not display EV section when vehicle is not electric', () => {
      const data = createMockWidgetData({ ev: undefined });
      render(<AuctionPassportWidget data={data} />);

      expect(screen.queryByText('Electric Vehicle')).not.toBeInTheDocument();
      expect(screen.queryByText('⚡ Electric Vehicle')).not.toBeInTheDocument();
    });

    it('should display battery health information when available', () => {
      const data = createMockWidgetData({
        ev: {
          isElectric: true,
          batteryCapacityKwh: 107.8,
          smartcarCompatible: true,
          batteryHealth: {
            soh_pct: 94.2,
            soc_pct: 78,
            rangeKm: 425,
            chargingStatus: 'idle',
            lastUpdated: '2025-01-15T09:45:00Z'
          },
          provenance: {
            detection: 'vin_heuristic',
            detectionConfidence: 0.7,
            batterySource: 'obd'
          }
        }
      });

      render(<AuctionPassportWidget data={data} />);

      expect(screen.getByText('78%')).toBeInTheDocument(); // SoC
      expect(screen.getByText('425 km')).toBeInTheDocument(); // Range
      expect(screen.getByText('94%')).toBeInTheDocument(); // SoH
      expect(screen.getByText('idle')).toBeInTheDocument(); // Charging status
      expect(screen.getByText('107.8 kWh')).toBeInTheDocument(); // Battery capacity
    });
  });

  describe('Battery Health Scenarios', () => {
    BATTERY_HEALTH_SCENARIOS.forEach(scenario => {
      it(`should display ${scenario.name.toLowerCase()} with correct styling`, () => {
        const data = createMockWidgetData({
          ev: {
            isElectric: true,
            batteryCapacityKwh: 80,
            smartcarCompatible: true,
            batteryHealth: {
              soh_pct: scenario.soh_pct,
              soc_pct: scenario.soc_pct,
              rangeKm: scenario.rangeKm,
              chargingStatus: scenario.chargingStatus,
              lastUpdated: '2025-01-15T09:45:00Z'
            }
          }
        });

        render(<AuctionPassportWidget data={data} />);

        // Check that the values are displayed
        expect(screen.getByText(`${Math.round(scenario.soh_pct)}%`)).toBeInTheDocument();
        expect(screen.getByText(`${Math.round(scenario.soc_pct)}%`)).toBeInTheDocument();
        expect(screen.getByText(`${Math.round(scenario.rangeKm)} km`)).toBeInTheDocument();
        expect(screen.getByText(scenario.chargingStatus)).toBeInTheDocument();
      });
    });

    it('should display charging status with appropriate styling', () => {
      const { rerender } = render(<AuctionPassportWidget data={createMockWidgetData({
        ev: {
          isElectric: true,
          batteryHealth: { chargingStatus: 'charging', soc_pct: 50, rangeKm: 200 }
        }
      })} />);

      let chargingElement = screen.getByText('charging');
      expect(chargingElement).toHaveClass('text-emerald-700');

      // Test discharging status
      rerender(<AuctionPassportWidget data={createMockWidgetData({
        ev: {
          isElectric: true,
          batteryHealth: { chargingStatus: 'discharging', soc_pct: 30, rangeKm: 100 }
        }
      })} />);

      chargingElement = screen.getByText('discharging');
      expect(chargingElement).toHaveClass('text-amber-700');
    });
  });

  describe('EV Detection Information', () => {
    it('should display EV information with battery health', () => {
      const data = createMockWidgetData({
        ev: {
          isElectric: true,
          batteryCapacityKwh: 80,
          provenance: {
            detection: 'vin_heuristic',
            detectionConfidence: 0.7,
            batterySource: 'obd'
          },
          batteryHealth: {
            soh_pct: 85,
            soc_pct: 70,
            rangeKm: 300,
            chargingStatus: 'idle',
            lastUpdated: '2025-01-15T09:45:00Z'
          }
        }
      });

      render(<AuctionPassportWidget data={data} />);

      // Check for the key EV information that should be displayed
      expect(screen.getByText('Electric Vehicle')).toBeInTheDocument();
      expect(screen.getByText('80 kWh')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument(); // SoH
      expect(screen.getByText('70%')).toBeInTheDocument(); // SoC
    });

    it('should display smartcar compatibility information', () => {
      const data = createMockWidgetData({
        ev: {
          isElectric: true,
          smartcarCompatible: true,
          capabilities: {
            obd_ev_pids: true,
            smartcar_oauth: true,
            manual: true
          }
        }
      });

      render(<AuctionPassportWidget data={data} />);

      expect(screen.getByText('Live data compatible with owner consent')).toBeInTheDocument();
      expect(screen.getByText('OBD EV diagnostics supported')).toBeInTheDocument();
    });

    it('should handle non-smartcar compatible vehicles', () => {
      const data = createMockWidgetData({
        ev: {
          isElectric: true,
          smartcarCompatible: false,
          capabilities: {
            obd_ev_pids: true,
            smartcar_oauth: false,
            manual: true
          }
        }
      });

      render(<AuctionPassportWidget data={data} />);

      expect(screen.queryByText('Live data compatible with owner consent')).not.toBeInTheDocument();
      expect(screen.getByText('OBD EV diagnostics supported')).toBeInTheDocument();
    });
  });

  describe('DTC Status Display', () => {
    it('should display green status for no faults', () => {
      const data = createMockWidgetData({
        dtcStatus: 'green',
        dtcCodes: []
      });

      render(<AuctionPassportWidget data={data} />);

      expect(screen.getByText('No faults')).toBeInTheDocument();
      expect(screen.getByText('No advisories reported.')).toBeInTheDocument();
    });

    it('should display amber status with advisories', () => {
      const data = createMockWidgetData({
        dtcStatus: 'amber',
        dtcCodes: [{ code: 'P0420', desc: 'EV system check recommended' }]
      });

      render(<AuctionPassportWidget data={data} />);

      expect(screen.getByText('Advisories')).toBeInTheDocument();
      expect(screen.getByText('EV system check recommended')).toBeInTheDocument();
      expect(screen.getByText('(P0420)')).toBeInTheDocument();
    });

    it('should display red status for critical faults', () => {
      const data = createMockWidgetData({
        dtcStatus: 'red',
        dtcCodes: [{ code: 'B1600', desc: 'Battery system fault' }]
      });

      render(<AuctionPassportWidget data={data} />);

      expect(screen.getByText('Critical faults')).toBeInTheDocument();
      expect(screen.getByText('Battery system fault')).toBeInTheDocument();
      expect(screen.getByText('(B1600)')).toBeInTheDocument();
    });
  });

  describe('Tyre Information Display', () => {
    it('should display tyre measurements with correct color coding', () => {
      const data = createMockWidgetData({
        tyres: { FL: 6.5, FR: 2.1, RL: 4.2, RR: 1.8 }
      });

      render(<AuctionPassportWidget data={data} />);

      // Should show all tyre values
      expect(screen.getByText('6.5')).toBeInTheDocument(); // FL - Good (green)
      expect(screen.getByText('2.1')).toBeInTheDocument(); // FR - Critical (red)
      expect(screen.getByText('4.2')).toBeInTheDocument(); // RL - Warning (amber)
      expect(screen.getByText('1.8')).toBeInTheDocument(); // RR - Critical (red)
    });

    it('should handle null tyre values', () => {
      const data = createMockWidgetData({
        tyres: { FL: null, FR: 5.0, RL: null, RR: 3.0 }
      });

      render(<AuctionPassportWidget data={data} />);

      expect(screen.getAllByText('—')).toHaveLength(2); // Two null values
      expect(screen.getByText('5.0')).toBeInTheDocument();
      expect(screen.getByText('3.0')).toBeInTheDocument();
    });
  });

  describe('Navigation and Verification', () => {
    it('should render verification button', () => {
      const data = createMockWidgetData();
      render(<AuctionPassportWidget data={data} />);

      const verifyButtons = screen.getAllByText('Verify');
      expect(verifyButtons).toHaveLength(2); // Mobile and desktop versions
    });

    it('should call onNavigateToVerification when verification button is clicked', () => {
      const mockNavigate = vi.fn();
      const data = createMockWidgetData();

      render(<AuctionPassportWidget data={data} onNavigateToVerification={mockNavigate} />);

      const verifyButton = screen.getAllByText('Verify')[0];
      verifyButton.click();

      expect(mockNavigate).toHaveBeenCalledWith('WDD2040082R088866');
    });
  });

  describe('Seal Information', () => {
    it('should display seal information when present', () => {
      const data = createMockWidgetData({
        seal: {
          hash: 'abc123def456',
          keyId: 'key-001',
          ts: '2025-01-15T10:30:00Z',
          valid: true
        }
      });

      render(<AuctionPassportWidget data={data} />);

      expect(screen.getByText('Passport sealed')).toBeInTheDocument();
    });

    it('should handle missing seal information', () => {
      const data = createMockWidgetData({ seal: null });
      render(<AuctionPassportWidget data={data} />);

      expect(screen.getByText('Not sealed')).toBeInTheDocument();
    });
  });
});