import React, { useEffect, useMemo, useState } from "react";
import { getPassport, verifyPassport } from "./lib/api";
import type { PassportRecord } from "./types";
import AuctionPassportWidget, { type WidgetData } from "./components/AuctionPassportWidget";
import PublicPassportVerification from "./components/PublicPassportVerification";

type AppMode = 'auction' | 'verify';

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
      const url = new URL(window.location);
      url.searchParams.set('vin', v);
      url.searchParams.set('mode', 'auction');
      history.replaceState({}, "", url.toString());
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  const data: WidgetData | null = useMemo(() => {
    if (!record) return null;
    const model = record.sealed || record.draft;
    if (!model) return null;

    const tyres = model.tyres_mm || {};
    const dtc = model.dtc || {};
    const now = Date.now();

    return {
      vin: model.vin,
      lotId: model.lot_id,
      odometerKm: model.odometer?.km ?? null,
      dtcStatus: dtc.status || "n/a",
      dtcCodes: (dtc.codes || []).slice(0, 4),
      tyres: { FL: tyres.fl ?? null, FR: tyres.fr ?? null, RL: tyres.rl ?? null, RR: tyres.rr ?? null },
      dekraUrl: model.dekra?.url || null,
      seal: record.sealed ? {
        hash: record.sealed.seal?.hash,
        keyId: record.sealed.seal?.key_id,
        ts: record.sealed.seal?.sealed_ts,
        valid: !!verify?.valid
      } : null,
      gallery: ["Front 3/4","Rear 3/4","Right side","Left side","Interior","Dash (ODO)","Engine bay","Tyre (FL)"],
      timeline: [
        model.dekra?.inspection_ts ? { ts: model.dekra.inspection_ts, title: "DEKRA inspection attached", note: model.dekra.site || "" } : null,
        record.sealed?.seal?.sealed_ts ? { ts: record.sealed.seal.sealed_ts, title: "Passport sealed", note: record.sealed.seal.key_id } : null
      ].filter(Boolean) as any,
      auction: {
        openAt: new Date(now - 10 * 60 * 1000).toISOString(),
        closeAt: new Date(now + 3 * 60 * 60 * 1000).toISOString(),
        reserveMet: true,
        currentBid: 179000,
        bids: 12,
        url: "#"
      }
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
              const url = new URL(window.location);
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
              const url = new URL(window.location);
              url.searchParams.set('mode', 'verify');
              history.replaceState({}, "", url.toString());
            }}
            className={`px-3 py-1 rounded text-sm font-medium ${
              mode === 'verify' 
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
      {data && <div className="max-w-7xl mx-auto"><AuctionPassportWidget data={data} /></div>}
    </div>
  );
}