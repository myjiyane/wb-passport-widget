import type { PassportRecord, VerifyResponse } from "../types";

const BASE = (import.meta.env.VITE_API_BASE_URL || window.location.origin).replace(/\/+$/,"");
const API_KEY = import.meta.env.VITE_API_KEY as string | undefined;

// Enhanced verification response type
export interface DetailedVerifyResponse extends VerifyResponse {
  hash?: string;
  key_id?: string | null;
  passport?: {
    vin: string;
    lot_id?: string;
    seal?: {
      hash: string;
      key_id: string;
      sealed_ts: string;
    };
    dekra?: {
      url?: string;
      inspection_ts?: string;
      site?: string;
    };
    odometer?: {
      km?: number | null;
      source?: string;
    };
  };
}

async function j<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (API_KEY) headers.set('X-Api-Key', API_KEY);
  
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${errorText ? ': ' + errorText : ''}`);
  }
  return res.json() as Promise<T>;
}

// Existing functions
export async function getPassport(vin: string) {
  return j<PassportRecord>(`${BASE}/passports/${encodeURIComponent(vin)}`);
}

export async function verifyPassport(vin: string) {
  return j<VerifyResponse>(`${BASE}/verify?vin=${encodeURIComponent(vin)}`);
}

// New enhanced verification function that combines passport data with verification
export async function verifyPassportDetailed(vin: string): Promise<DetailedVerifyResponse> {
  try {
    // Get both verification and passport data
    const [verification, passport] = await Promise.all([
      verifyPassport(vin),
      getPassport(vin).catch(() => null) // Don't fail if passport not found
    ]);

    return {
      ...verification,
      passport: passport?.sealed ? {
        vin: passport.sealed.vin,
        lot_id: passport.sealed.lot_id,
        seal: passport.sealed.seal,
        dekra: passport.sealed.dekra,
        odometer: passport.sealed.odometer,
      } : undefined
    };
  } catch (error) {
    // If verification fails, still try to get basic passport info
    const passport = await getPassport(vin).catch(() => null);
    return {
      valid: false,
      reasons: [`Verification failed: ${(error as Error).message}`],
      passport: passport?.sealed ? {
        vin: passport.sealed.vin,
        lot_id: passport.sealed.lot_id,
        seal: passport.sealed.seal,
        dekra: passport.sealed.dekra,
        odometer: passport.sealed.odometer,
      } : undefined
    };
  }
}

// Utility function to validate VIN format
export function isValidVinFormat(vin: string): boolean {
  return /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin.trim());
}

// Utility function to format VIN
export function formatVin(vin: string): string {
  return vin.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17);
}



