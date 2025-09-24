// src/App.tsx - Updated to support both auction widget and verification
import { useEffect, useMemo, useState } from "react";
import { getPassport, verifyPassport } from "./lib/api";
import type { PassportRecord } from "./types";
import AuctionPassportWidget, { type WidgetData } from "./components/AuctionPassportWidget";
import PublicPassportVerification from "./components/PublicPassportVerification";

type AppMode = 'auction' | 'verify';
type TimelineEntry = NonNullable<WidgetData['timeline']>[number];


export default function App() {
  const [mode, setMode] = useState<AppMode>('auction');
  const [vin, setVin] = useState("");
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState<PassportRecord | null>(null);
  const [verify, setVerify] = useState<{ valid: boolean; reasons?: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const v = p.get("vin");
    const m = p.get("mode");
    
    // Determine mode from URL parameter or path
    if (m === 'verify' || location.pathname.includes('/verify')) {
      setMode('verify');
    } else {
      setMode('auction');
    }
    
    if (v && mode === 'auction') { 
      setVin(v); 
      load(v); 
    }
  }, [mode]);

  async function load(v: string) {
    setError(null); setLoading(true); setRecord(null); setVerify(null);
    try {
      const rec = await getPassport(v);
      setRecord(rec);
      if (rec.sealed) {
        const vr = await verifyPassport(v);
        setVerify(vr);
      }
      const url = new URL(window.location.href);
      url.searchParams.set('vin', v);
      url.searchParams.set('mode', 'auction');
      history.replaceState({}, "", url.toString());
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function serverOrigin() {
    const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/,"");
    try {
      const u = new URL(base, window.location.href);
      return `${u.protocol}//${u.host}`;
    } catch {
      return window.location.origin;
    }
  }

  function absUrl(u?: string) {
    if (!u) return undefined;
    return /^https?:\/\//i.test(u) ? u : serverOrigin() + u;
  }
  const data: WidgetData | null = useMemo(() => {
    if (!record) return null;
    const model = record.sealed || record.draft;
    if (!model) return null;

    const tyres = model.tyres_mm || {};
    const dtc = model.dtc || {};
    const now = Date.now();

    const items = [
      ...(record.sealed?.images || []),
      ...(record.draft?.images || []),
    ];

    const ROLE_LABEL: Record<string, string> = {
      exterior_front_34: 'Front 3/4',
      exterior_rear_34: 'Rear 3/4',
      left_side: 'Left side',
      right_side: 'Right side',
      interior_front: 'Interior',
      interior_rear: 'Interior (rear)',
      dash_odo: 'Dash (ODO)',
      engine_bay: 'Engine bay',
      tyre_fl: 'Tyre (FL)',
      tyre_fr: 'Tyre (FR)',
      tyre_rl: 'Tyre (RL)',
      tyre_rr: 'Tyre (RR)',
    };

    const ROLE_ORDER = [
      'exterior_front_34', 'exterior_rear_34', 'right_side', 'left_side',
      'interior_front', 'dash_odo', 'engine_bay', 'tyre_fl', 'tyre_fr', 'tyre_rl', 'tyre_rr'
    ];

    const byRole = new Map(items.map((item) => [item.role, item]));

    const gallery = ROLE_ORDER.map((role) => {
      const entry = byRole.get(role);
      const url = entry?.url ?? (entry?.object_key ? `/uploads/${entry.object_key}` : undefined);
      return { label: ROLE_LABEL[role] || role.replace(/_/g, ' '), url: absUrl(url) };
    });

    const timelineEntries: TimelineEntry[] = [];

    if (model.dekra?.inspection_ts) {
      timelineEntries.push({
        ts: model.dekra.inspection_ts,
        title: 'DEKRA inspection attached',
        note: model.dekra.site
      });
    }

    if (record.sealed?.seal?.sealed_ts) {
      timelineEntries.push({
        ts: record.sealed.seal.sealed_ts,
        title: 'Passport sealed',
        note: record.sealed.seal.key_id
      });
    }

    return {
      vin: model.vin,
      lotId: model.lot_id,
      odometerKm: model.odometer?.km ?? null,
      dtcStatus: dtc.status || 'n/a',
      dtcCodes: (dtc.codes || []).slice(0, 4),
      tyres: { FL: tyres.fl ?? null, FR: tyres.fr ?? null, RL: tyres.rl ?? null, RR: tyres.rr ?? null },
      dekraUrl: model.dekra?.url || null,
      seal: record.sealed
        ? {
            hash: record.sealed.seal?.hash,
            keyId: record.sealed.seal?.key_id,
            ts: record.sealed.seal?.sealed_ts,
            valid: !!verify?.valid
          }
        : null,
      gallery,
      timeline: timelineEntries,
      auction: {
        openAt: new Date(now - 10 * 60 * 1000).toISOString(),
        closeAt: new Date(now + 3 * 60 * 60 * 1000).toISOString(),
        reserveMet: true,
        currentBid: 179000,
        bids: 12,
        url: 'www.wesbank.co.za'
      },
      ev: model.ev
        ? {
            isElectric: model.ev.isElectric ?? undefined,
            batteryCapacityKwh: model.ev.batteryCapacityKwh,
            smartcarCompatible: model.ev.smartcarCompatible,
            capabilities: model.ev.capabilities
              ? {
                  obd_ev_pids: model.ev.capabilities.obd_ev_pids,
                  smartcar_oauth: model.ev.capabilities.smartcar_oauth,
                  manual: model.ev.capabilities.manual
                }
              : undefined,
            batteryHealth: model.ev.batteryHealth
              ? {
                  soh_pct: model.ev.batteryHealth.soh_pct,
                  soc_pct: model.ev.batteryHealth.soc_pct,
                  rangeKm: model.ev.batteryHealth.rangeKm,
                  chargingStatus: model.ev.batteryHealth.chargingStatus,
                  lastUpdated: model.ev.batteryHealth.lastUpdated
                }
              : undefined,
            provenance: model.ev.provenance
              ? {
                  detection: model.ev.provenance.detection,
                  detectionConfidence: model.ev.provenance.detectionConfidence,
                  batterySource: model.ev.provenance.batterySource
                }
              : undefined
          }
        : undefined
    };
  }, [record, verify]);

  // Public verification mode
  if (mode === 'verify') {
    return <PublicPassportVerification />;
  }

  // Auction widget mode (existing functionality)
  return (
    <div className="p-4 sm:p-6">
      {/* Mode switcher */}
      <div className="max-w-7xl mx-auto mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setMode('auction');
              const url = new URL(window.location.href);
              url.searchParams.set('mode', 'auction');
              history.replaceState({}, "", url.toString());
            }}
            className={`px-3 py-1 rounded text-sm font-medium ${
              mode === 'auction' 
                ? 'bg-teal-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Auction Widget
          </button>
          <button
            onClick={() => {
              setMode('verify');
              const url = new URL(window.location.href);
              url.searchParams.set('mode', 'verify');
              history.replaceState({}, "", url.toString());
            }}
            className={`px-3 py-1 rounded text-sm font-medium ${
              mode === ('verify' as AppMode)
                ? 'bg-teal-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Public Verification
          </button>
        </div>
        <span className="text-slate-500 text-sm">
          API: {import.meta.env.VITE_API_BASE_URL || window.location.origin}
        </span>
      </div>

      {/* Auction widget controls */}
      <div className="max-w-7xl mx-auto flex items-center gap-2 mb-4">
        <input
          value={vin}
          onChange={(e) => setVin(e.target.value)}
          placeholder="Enter VIN (e.g., WDD2040082R088866)"
          className="border border-slate-300 rounded-lg px-3 py-2 w-[32rem] max-w-full"
        />
        <button 
          onClick={() => vin && load(vin)} 
          className="rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold px-3 py-2"
        >
          Load
        </button>
      </div>

      {loading && <div className="max-w-7xl mx-auto text-slate-600">Loading…</div>}
      {error && <div className="max-w-7xl mx-auto text-rose-700">Error: {error}</div>}
      {data && (
        <div className="max-w-7xl mx-auto">
          <AuctionPassportWidget 
            data={data} 
            onNavigateToVerification={(vin) => {
              setMode('verify');
              const url = new URL(window.location.href);
              url.searchParams.set('mode', 'verify');
              url.searchParams.set('vin', vin);
              history.replaceState({}, "", url.toString());
            }}
          />
        </div>
      )}
    </div>
  );
}


