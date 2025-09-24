import type { PassportRecord } from '../types';

export interface VINTestCase {
  vin: string;
  description: string;
  manufacturer: string;
  expectedEV: boolean;
  expectedBatteryCapacity?: number;
  expectedSmartcarCompatible?: boolean;
  expectedDetectionConfidence: number;
  expectedMake?: string;
  notes?: string;
}

export const VIN_TEST_CASES: VINTestCase[] = [
  // Mercedes-Benz EVs (WDD prefix)
  {
    vin: 'WDD2040082R088866',
    description: 'Mercedes-Benz EQS - Real production VIN',
    manufacturer: 'Mercedes-Benz',
    expectedEV: true,
    expectedBatteryCapacity: 80,
    expectedSmartcarCompatible: true,
    expectedDetectionConfidence: 0.7,
    expectedMake: 'Mercedes-Benz',
    notes: 'EQ family vehicle'
  },
  {
    vin: 'WDD1A2B3C4D5E6789',
    description: 'Mercedes-Benz EV - Test VIN',
    manufacturer: 'Mercedes-Benz',
    expectedEV: true,
    expectedBatteryCapacity: 80,
    expectedSmartcarCompatible: true,
    expectedDetectionConfidence: 0.7,
    expectedMake: 'Mercedes-Benz'
  },

  // BMW EVs (WBA prefix)
  {
    vin: 'WBA1A2B3C4D5E6789',
    description: 'BMW iX - Test VIN',
    manufacturer: 'BMW',
    expectedEV: true,
    expectedBatteryCapacity: 85,
    expectedSmartcarCompatible: true,
    expectedDetectionConfidence: 0.7,
    expectedMake: 'BMW',
    notes: 'i4/iX models'
  },
  {
    vin: 'WBA9F8E7D6C5B4321',
    description: 'BMW i4 - Alternative test VIN',
    manufacturer: 'BMW',
    expectedEV: true,
    expectedBatteryCapacity: 85,
    expectedSmartcarCompatible: true,
    expectedDetectionConfidence: 0.7,
    expectedMake: 'BMW'
  },

  // Tesla EVs (JYJ prefix)
  {
    vin: 'JYJ1A2B3C4D5E6789',
    description: 'Tesla Model 3 - Test VIN',
    manufacturer: 'Tesla',
    expectedEV: true,
    expectedBatteryCapacity: 75,
    expectedSmartcarCompatible: true,
    expectedDetectionConfidence: 0.7,
    expectedMake: 'Tesla',
    notes: 'Model 3/Y'
  },
  {
    vin: 'JYJ9F8E7D6C5B4321',
    description: 'Tesla Model Y - Alternative test VIN',
    manufacturer: 'Tesla',
    expectedEV: true,
    expectedBatteryCapacity: 75,
    expectedSmartcarCompatible: true,
    expectedDetectionConfidence: 0.7,
    expectedMake: 'Tesla'
  },

  // Volkswagen EVs (WVW prefix)
  {
    vin: 'WVW1A2B3C4D5E6789',
    description: 'VW ID.4 - Test VIN',
    manufacturer: 'Volkswagen',
    expectedEV: true,
    expectedBatteryCapacity: 77,
    expectedSmartcarCompatible: true,
    expectedDetectionConfidence: 0.7,
    expectedMake: 'Volkswagen',
    notes: 'ID.3/ID.4 (region dependent)'
  },
  {
    vin: 'WVW9F8E7D6C5B4321',
    description: 'VW ID.3 - Alternative test VIN',
    manufacturer: 'Volkswagen',
    expectedEV: true,
    expectedBatteryCapacity: 77,
    expectedSmartcarCompatible: true,
    expectedDetectionConfidence: 0.7,
    expectedMake: 'Volkswagen'
  },

  // BYD EVs (LGX prefix) - No Smartcar support
  {
    vin: 'LGX1A2B3C4D5E6789',
    description: 'BYD EV - Test VIN (ZA import)',
    manufacturer: 'BYD',
    expectedEV: true,
    expectedBatteryCapacity: 60,
    expectedSmartcarCompatible: false,
    expectedDetectionConfidence: 0.7,
    expectedMake: 'BYD',
    notes: 'Confirm locally - ZA imports'
  },
  {
    vin: 'LGX9F8E7D6C5B4321',
    description: 'BYD Atto 3 - Alternative test VIN',
    manufacturer: 'BYD',
    expectedEV: true,
    expectedBatteryCapacity: 60,
    expectedSmartcarCompatible: false,
    expectedDetectionConfidence: 0.7,
    expectedMake: 'BYD'
  },

  // Non-EV Vehicles
  {
    vin: 'MAJFXXMTKFJP14265',
    description: 'Mazda ICE - Real production VIN',
    manufacturer: 'Mazda',
    expectedEV: false,
    expectedSmartcarCompatible: false,
    expectedDetectionConfidence: 0,
    notes: 'Internal combustion engine vehicle'
  },
  {
    vin: 'MAJ1234567890123',
    description: 'Mazda ICE - Test VIN',
    manufacturer: 'Mazda',
    expectedEV: false,
    expectedSmartcarCompatible: false,
    expectedDetectionConfidence: 0
  },
  {
    vin: '1G11234567890123',
    description: 'General Motors ICE - Test VIN',
    manufacturer: 'General Motors',
    expectedEV: false,
    expectedSmartcarCompatible: false,
    expectedDetectionConfidence: 0
  },
  {
    vin: 'KNE1234567890123',
    description: 'Hyundai ICE - Test VIN',
    manufacturer: 'Hyundai',
    expectedEV: false,
    expectedSmartcarCompatible: false,
    expectedDetectionConfidence: 0
  },

  // Edge cases and invalid VINs
  {
    vin: 'WDD123456789012',
    description: 'Invalid VIN - Too short (16 chars)',
    manufacturer: 'Invalid',
    expectedEV: false,
    expectedSmartcarCompatible: false,
    expectedDetectionConfidence: 0,
    notes: 'Invalid length - should be exactly 17 characters'
  },
  {
    vin: 'WDD1234567890123456',
    description: 'Invalid VIN - Too long (19 chars)',
    manufacturer: 'Invalid',
    expectedEV: false,
    expectedSmartcarCompatible: false,
    expectedDetectionConfidence: 0,
    notes: 'Invalid length - should be exactly 17 characters'
  },
  {
    vin: 'WDD12345I789O123',
    description: 'Invalid VIN - Contains invalid characters (I, O)',
    manufacturer: 'Invalid',
    expectedEV: false,
    expectedSmartcarCompatible: false,
    expectedDetectionConfidence: 0,
    notes: 'Contains invalid characters I and O'
  }
];

export const MOCK_PASSPORT_RECORDS: Record<string, PassportRecord> = {
  // Mercedes EQS with full EV data
  'WDD2040082R088866': {
    vin: 'WDD2040082R088866',
    updatedAt: '2025-01-15T10:30:00Z',
    sealed: {
      vin: 'WDD2040082R088866',
      lot_id: 'LOT-2025-001',
      seal: {
        hash: 'abc123def456',
        sig: 'signature123',
        key_id: 'key-001',
        sealed_ts: '2025-01-15T10:30:00Z'
      },
      dekra: {
        url: 'https://example.com/dekra-report-001',
        inspection_ts: '2025-01-14T14:00:00Z',
        site: 'Cape Town'
      },
      odometer: { km: 15000 },
      tyres_mm: { fl: 6.5, fr: 6.2, rl: 5.8, rr: 5.9 },
      dtc: { status: 'green', codes: [] },
      ev: {
        isElectric: true,
        batteryCapacityKwh: 107.8,
        smartcarCompatible: true,
        capabilities: {
          obd_ev_pids: true,
          smartcar_oauth: true,
          manual: true
        },
        provenance: {
          detection: 'vin_heuristic',
          detectionConfidence: 0.7,
          batterySource: 'obd'
        },
        batteryHealth: {
          soh_pct: 94.2,
          soc_pct: 78,
          rangeKm: 425,
          chargingStatus: 'idle',
          lastUpdated: '2025-01-15T09:45:00Z'
        }
      },
      timeline: [
        {
          ts: '2025-01-14T14:00:00Z',
          title: 'DEKRA inspection completed',
          note: 'Cape Town facility'
        },
        {
          ts: '2025-01-15T10:30:00Z',
          title: 'Digital passport sealed'
        }
      ]
    }
  },

  // BMW iX with moderate battery health
  'WBA1234567890123': {
    vin: 'WBA1234567890123',
    updatedAt: '2025-01-15T11:00:00Z',
    sealed: {
      vin: 'WBA1234567890123',
      lot_id: 'LOT-2025-002',
      seal: {
        hash: 'def456ghi789',
        sig: 'signature456',
        key_id: 'key-002',
        sealed_ts: '2025-01-15T11:00:00Z'
      },
      odometer: { km: 28000 },
      tyres_mm: { fl: 4.2, fr: 4.1, rl: 3.8, rr: 3.9 },
      dtc: { status: 'amber', codes: [{ code: 'P0420', desc: 'Advisory: EV system check recommended' }] },
      ev: {
        isElectric: true,
        batteryCapacityKwh: 85.0,
        smartcarCompatible: true,
        capabilities: {
          obd_ev_pids: true,
          smartcar_oauth: true,
          manual: true
        },
        provenance: {
          detection: 'vin_heuristic',
          detectionConfidence: 0.7,
          batterySource: 'manual'
        },
        batteryHealth: {
          soh_pct: 87.5,
          soc_pct: 45,
          rangeKm: 285,
          chargingStatus: 'charging',
          lastUpdated: '2025-01-15T10:15:00Z'
        }
      }
    }
  },

  // Tesla Model 3 with low battery
  'JYJ1234567890123': {
    vin: 'JYJ1234567890123',
    updatedAt: '2025-01-15T12:00:00Z',
    sealed: {
      vin: 'JYJ1234567890123',
      lot_id: 'LOT-2025-003',
      seal: {
        hash: 'ghi789jkl012',
        sig: 'signature789',
        key_id: 'key-003',
        sealed_ts: '2025-01-15T12:00:00Z'
      },
      odometer: { km: 85000 },
      tyres_mm: { fl: 2.1, fr: 2.3, rl: 1.8, rr: 1.9 },
      dtc: { status: 'red', codes: [{ code: 'B1600', desc: 'Critical: Battery system fault' }] },
      ev: {
        isElectric: true,
        batteryCapacityKwh: 75.0,
        smartcarCompatible: true,
        capabilities: {
          obd_ev_pids: true,
          smartcar_oauth: true,
          manual: true
        },
        provenance: {
          detection: 'vin_heuristic',
          detectionConfidence: 0.7,
          batterySource: 'obd'
        },
        batteryHealth: {
          soh_pct: 72.3,
          soc_pct: 12,
          rangeKm: 45,
          chargingStatus: 'discharging',
          lastUpdated: '2025-01-15T11:45:00Z'
        }
      }
    }
  },

  // BYD with no smartcar support
  'LGX1234567890123': {
    vin: 'LGX1234567890123',
    updatedAt: '2025-01-15T13:00:00Z',
    sealed: {
      vin: 'LGX1234567890123',
      lot_id: 'LOT-2025-004',
      seal: {
        hash: 'jkl012mno345',
        sig: 'signature012',
        key_id: 'key-004',
        sealed_ts: '2025-01-15T13:00:00Z'
      },
      odometer: { km: 12000 },
      tyres_mm: { fl: 7.2, fr: 7.1, rl: 6.8, rr: 6.9 },
      dtc: { status: 'green', codes: [] },
      ev: {
        isElectric: true,
        batteryCapacityKwh: 60.5,
        smartcarCompatible: false,
        capabilities: {
          obd_ev_pids: true,
          smartcar_oauth: false,
          manual: true
        },
        provenance: {
          detection: 'vin_heuristic',
          detectionConfidence: 0.7,
          batterySource: 'manual'
        },
        batteryHealth: {
          soh_pct: 96.8,
          soc_pct: 88,
          rangeKm: 380,
          chargingStatus: 'idle',
          lastUpdated: '2025-01-15T12:30:00Z'
        }
      }
    }
  },

  // Non-EV Mazda
  'MAJFXXMTKFJP14265': {
    vin: 'MAJFXXMTKFJP14265',
    updatedAt: '2025-01-15T14:00:00Z',
    sealed: {
      vin: 'MAJFXXMTKFJP14265',
      lot_id: 'LOT-2025-005',
      seal: {
        hash: 'mno345pqr678',
        sig: 'signature345',
        key_id: 'key-005',
        sealed_ts: '2025-01-15T14:00:00Z'
      },
      odometer: { km: 45000 },
      tyres_mm: { fl: 5.2, fr: 5.1, rl: 4.8, rr: 4.9 },
      dtc: { status: 'amber', codes: [{ code: 'P0171', desc: 'System too lean (Bank 1)' }] }
      // No EV section for ICE vehicle
    }
  }
};

export const BATTERY_HEALTH_SCENARIOS = [
  {
    name: 'Excellent Battery Health',
    soh_pct: 98.2,
    soc_pct: 85,
    rangeKm: 450,
    chargingStatus: 'idle' as const,
    expectedColor: 'emerald' // Good health indicator
  },
  {
    name: 'Good Battery Health',
    soh_pct: 91.5,
    soc_pct: 67,
    rangeKm: 380,
    chargingStatus: 'charging' as const,
    expectedColor: 'emerald'
  },
  {
    name: 'Fair Battery Health',
    soh_pct: 84.2,
    soc_pct: 45,
    rangeKm: 285,
    chargingStatus: 'idle' as const,
    expectedColor: 'amber' // Warning indicator
  },
  {
    name: 'Poor Battery Health',
    soh_pct: 76.8,
    soc_pct: 23,
    rangeKm: 150,
    chargingStatus: 'discharging' as const,
    expectedColor: 'rose' // Critical indicator
  },
  {
    name: 'Critical Battery Health',
    soh_pct: 68.1,
    soc_pct: 8,
    rangeKm: 35,
    chargingStatus: 'discharging' as const,
    expectedColor: 'rose'
  }
];