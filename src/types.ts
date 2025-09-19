export type DtcStatus = 'green' | 'amber' | 'red' | 'n/a';
export interface DtcCode { code: string; desc?: string }

export type EvBatterySource = 'obd' | 'manual' | 'photo' | 'mock';

export interface PassportDraft {
  vin: string;
  lot_id?: string;
  dekra?: { url?: string; inspection_ts?: string; site?: string };
  odometer?: { km?: number | null };
  tyres_mm?: { fl?: number|null; fr?: number|null; rl?: number|null; rr?: number|null };
  dtc?: { status?: DtcStatus; codes?: DtcCode[] };
  provenance?: { ts?: string; site?: string|null; captured_by?: string };
  images?: { label: string; url?: string; role: string; object_key?: string }[];
  timeline?: { ts: string; title: string; note?: string }[];
  ev?: {
    isElectric?: boolean;
    batteryCapacityKwh?: number;
    smartcarCompatible?: boolean;
    capabilities?: {
      obd_ev_pids?: boolean;
      smartcar_oauth?: boolean;
      manual?: boolean;
    };
    provenance?: {
      detection?: 'vin_heuristic' | 'manual';
      detectionConfidence?: number;
      batterySource?: EvBatterySource;
    };
    batteryHealth?: {
      soh_pct?: number;
      soc_pct?: number;
      rangeKm?: number;
      chargingStatus?: 'charging' | 'idle' | 'discharging';
      lastUpdated?: string;
    };
  };
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
