import type { PassportRecord, VerifyResponse } from "../types";

const BASE = (import.meta.env.VITE_API_BASE_URL || window.location.origin).replace(/\/+$/,"");

async function j<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function getPassport(vin: string) {
  return j<PassportRecord>(`${BASE}/passports/${encodeURIComponent(vin)}`);
}

export async function verifyPassport(vin: string) {
  return j<VerifyResponse>(`${BASE}/verify?vin=${encodeURIComponent(vin)}`);
}
