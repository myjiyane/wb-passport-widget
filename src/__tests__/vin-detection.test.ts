import { describe, it, expect } from 'vitest';
import { VIN_TEST_CASES, type VINTestCase } from '../test-data/vin-test-data';

// Mock the EV detection logic from the backend
function detectEVFromVin(vinRaw: string) {
  const EV_CAPABILITIES: Record<string, { make: string; smartcar: boolean; battery: number; note?: string }> = {
    WDD: { make: 'Mercedes-Benz', smartcar: true,  battery: 80 }, // EQ family
    WBA: { make: 'BMW',           smartcar: true,  battery: 85 }, // i4/iX
    JYJ: { make: 'Tesla',         smartcar: true,  battery: 75 }, // Model 3/Y
    WVW: { make: 'Volkswagen',    smartcar: true,  battery: 77 }, // ID.3/ID.4
    LGX: { make: 'BYD', smartcar: false, battery: 60, note: 'Confirm locally' },
  };

  const vin = (vinRaw || '').trim().toUpperCase();

  if (vin.length !== 17) {
    return {
      isElectric: false,
      smartcarCompatible: false,
      confidence: 0,
      source: 'vin_heuristic',
      notes: 'invalid_vin_length'
    };
  }

  // Check for invalid characters (I, O, Q not allowed in VINs)
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
    return {
      isElectric: false,
      smartcarCompatible: false,
      confidence: 0,
      source: 'vin_heuristic',
      notes: 'invalid_vin_characters'
    };
  }

  const wmi = vin.substring(0, 3);
  const match = EV_CAPABILITIES[wmi];
  const confidence = match ? 0.7 : 0;

  return {
    isElectric: !!match,
    make: match?.make,
    smartcarCompatible: match?.smartcar ?? false,
    batteryEstimateKwh: match?.battery,
    confidence,
    source: 'vin_heuristic' as const,
    notes: match?.note,
  };
}

describe('VIN Detection and EV Identification', () => {
  describe('VIN Format Validation', () => {
    it('should validate correct VIN length', () => {
      const validVin = 'WDD2040082R088866';
      const result = detectEVFromVin(validVin);
      expect(result.notes).not.toBe('invalid_vin_length');
    });

    it('should reject VINs that are too short', () => {
      const shortVin = 'WDD123456789012'; // 16 characters
      const result = detectEVFromVin(shortVin);
      expect(result.isElectric).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.notes).toBe('invalid_vin_length');
    });

    it('should reject VINs that are too long', () => {
      const longVin = 'WDD1234567890123456'; // 19 characters
      const result = detectEVFromVin(longVin);
      expect(result.isElectric).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.notes).toBe('invalid_vin_length');
    });

    it('should reject VINs with invalid characters', () => {
      const invalidVin = 'WDD12345I789O123Q'; // Contains I, O, Q
      const result = detectEVFromVin(invalidVin);
      expect(result.isElectric).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.notes).toBe('invalid_vin_characters');
    });

    it('should accept valid VIN characters', () => {
      const validVin = 'WDD1234567890ABCD'; // Valid characters only
      const result = detectEVFromVin(validVin);
      expect(result.notes).not.toBe('invalid_vin_characters');
    });
  });

  describe('EV Detection by Manufacturer', () => {
    const evCases = VIN_TEST_CASES.filter(testCase => testCase.expectedEV);
    const nonEvCases = VIN_TEST_CASES.filter(testCase => !testCase.expectedEV && testCase.vin.length === 17);

    describe('Electric Vehicles', () => {
      it.each(evCases)('should detect $manufacturer EV: $description', (testCase: VINTestCase) => {
        const result = detectEVFromVin(testCase.vin);

        expect(result.isElectric).toBe(testCase.expectedEV);
        expect(result.confidence).toBe(testCase.expectedDetectionConfidence);
        expect(result.smartcarCompatible).toBe(testCase.expectedSmartcarCompatible);

        if (testCase.expectedMake) {
          expect(result.make).toBe(testCase.expectedMake);
        }

        if (testCase.expectedBatteryCapacity) {
          expect(result.batteryEstimateKwh).toBe(testCase.expectedBatteryCapacity);
        }
      });
    });

    describe('Non-Electric Vehicles', () => {
      it.each(nonEvCases)('should not detect $manufacturer as EV: $description', (testCase: VINTestCase) => {
        const result = detectEVFromVin(testCase.vin);

        expect(result.isElectric).toBe(false);
        expect(result.confidence).toBe(0);
        expect(result.smartcarCompatible).toBe(false);
        expect(result.make).toBeUndefined();
        expect(result.batteryEstimateKwh).toBeUndefined();
      });
    });
  });

  describe('Manufacturer-Specific Tests', () => {
    describe('Mercedes-Benz (WDD)', () => {
      it('should detect Mercedes EV with correct specifications', () => {
        const result = detectEVFromVin('WDD2040082R088866');

        expect(result.isElectric).toBe(true);
        expect(result.make).toBe('Mercedes-Benz');
        expect(result.batteryEstimateKwh).toBe(80);
        expect(result.smartcarCompatible).toBe(true);
        expect(result.confidence).toBe(0.7);
      });
    });

    describe('BMW (WBA)', () => {
      it('should detect BMW EV with correct specifications', () => {
        const result = detectEVFromVin('WBA1A2B3C4D5E6789');

        expect(result.isElectric).toBe(true);
        expect(result.make).toBe('BMW');
        expect(result.batteryEstimateKwh).toBe(85);
        expect(result.smartcarCompatible).toBe(true);
        expect(result.confidence).toBe(0.7);
      });
    });

    describe('Tesla (JYJ)', () => {
      it('should detect Tesla EV with correct specifications', () => {
        const result = detectEVFromVin('JYJ1A2B3C4D5E6789');

        expect(result.isElectric).toBe(true);
        expect(result.make).toBe('Tesla');
        expect(result.batteryEstimateKwh).toBe(75);
        expect(result.smartcarCompatible).toBe(true);
        expect(result.confidence).toBe(0.7);
      });
    });

    describe('Volkswagen (WVW)', () => {
      it('should detect VW EV with correct specifications', () => {
        const result = detectEVFromVin('WVW1A2B3C4D5E6789');

        expect(result.isElectric).toBe(true);
        expect(result.make).toBe('Volkswagen');
        expect(result.batteryEstimateKwh).toBe(77);
        expect(result.smartcarCompatible).toBe(true);
        expect(result.confidence).toBe(0.7);
      });
    });

    describe('BYD (LGX)', () => {
      it('should detect BYD EV with no Smartcar support', () => {
        const result = detectEVFromVin('LGX1A2B3C4D5E6789');

        expect(result.isElectric).toBe(true);
        expect(result.make).toBe('BYD');
        expect(result.batteryEstimateKwh).toBe(60);
        expect(result.smartcarCompatible).toBe(false);
        expect(result.confidence).toBe(0.7);
        expect(result.notes).toBe('Confirm locally');
      });
    });
  });

  describe('Case Sensitivity', () => {
    it('should handle lowercase VINs correctly', () => {
      const lowerVin = 'wdd2040082r088866';
      const upperVin = 'WDD2040082R088866';

      const lowerResult = detectEVFromVin(lowerVin);
      const upperResult = detectEVFromVin(upperVin);

      expect(lowerResult).toEqual(upperResult);
      expect(lowerResult.isElectric).toBe(true);
      expect(lowerResult.make).toBe('Mercedes-Benz');
    });

    it('should handle mixed case VINs correctly', () => {
      const mixedVin = 'WdD2040082r088866';
      const result = detectEVFromVin(mixedVin);

      expect(result.isElectric).toBe(true);
      expect(result.make).toBe('Mercedes-Benz');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty VIN', () => {
      const result = detectEVFromVin('');

      expect(result.isElectric).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.notes).toBe('invalid_vin_length');
    });

    it('should handle undefined VIN', () => {
      const result = detectEVFromVin(undefined as any);

      expect(result.isElectric).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.notes).toBe('invalid_vin_length');
    });

    it('should handle VIN with whitespace', () => {
      const vinWithSpaces = '  WDD2040082R088866  ';
      const result = detectEVFromVin(vinWithSpaces);

      expect(result.isElectric).toBe(true);
      expect(result.make).toBe('Mercedes-Benz');
    });

    it('should handle unknown manufacturer WMI', () => {
      const unknownVin = 'XYZ1234567890123'; // XYZ is not a known EV manufacturer
      const result = detectEVFromVin(unknownVin);

      expect(result.isElectric).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.make).toBeUndefined();
    });
  });

  describe('Confidence Scoring', () => {
    it('should return 0.7 confidence for known EV manufacturers', () => {
      const evVins = ['WDD1A2B3C4D5E6789', 'WBA1A2B3C4D5E6789', 'JYJ1A2B3C4D5E6789', 'WVW1A2B3C4D5E6789', 'LGX1A2B3C4D5E6789'];

      evVins.forEach(vin => {
        const result = detectEVFromVin(vin);
        expect(result.confidence).toBe(0.7);
        expect(result.isElectric).toBe(true);
      });
    });

    it('should return 0 confidence for unknown manufacturers', () => {
      const nonEvVins = ['MAJ1234567890123', '1G11234567890123', 'KNE1234567890123'];

      nonEvVins.forEach(vin => {
        const result = detectEVFromVin(vin);
        expect(result.confidence).toBe(0);
        expect(result.isElectric).toBe(false);
      });
    });

    it('should return 0 confidence for invalid VINs', () => {
      const invalidVins = ['WDD123', 'WDD12345I789O123Q', ''];

      invalidVins.forEach(vin => {
        const result = detectEVFromVin(vin);
        expect(result.confidence).toBe(0);
        expect(result.isElectric).toBe(false);
      });
    });
  });
});