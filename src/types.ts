export type DtcStatus = 'green' | 'amber' | 'red' | 'n/a';
export interface DtcCode { code: string; desc?: string }

export interface PassportDraft {
  vin: string;
  lot_id?: string;
  dekra?: { url?: string; inspection_ts?: string; site?: string };
  odometer?: { km?: number | null };
  tyres_mm?: { fl?: number|null; fr?: number|null; rl?: number|null; rr?: number|null };
  dtc?: { status?: DtcStatus; codes?: DtcCode[] };
  provenance?: { ts?: string; site?: string|null; captured_by?: string };
}

export interface PassportSealed extends PassportDraft {
  seal: { hash: string; sig: string; key_id: string; sealed_ts: string };
}

export interface PassportRecord {
  vin: string;
  draft?: PassportDraft;
  sealed?: PassportSealed;
  updatedAt: string;
}

export interface VerifyResponse { valid: boolean; reasons?: string[] }
