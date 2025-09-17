import React, { useEffect, useMemo, useState } from "react";
import { getPassport, verifyPassport } from "./lib/api";
import type { PassportRecord } from "./types";
import AuctionPassportWidget, { type WidgetData } from "./components/AuctionPassportWidget";
import VerifyPassport from "./components/VerifyPassport";

export default function App() {
  const [vin, setVin] = useState("");
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState<PassportRecord | null>(null);
  const [verify, setVerify] = useState<{ valid: boolean; reasons?: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isVerifyPage = typeof window !== "undefined" && window.location.pathname.startsWith("/verify");

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const v = p.get("vin");
    if (v) { setVin(v); load(v); }
  }, []);

  async function load(v: string) {
    setError(null); setLoading(true); setRecord(null); setVerify(null);
    try {
      const rec = await getPassport(v);
      setRecord(rec);
      if (rec.sealed) {
        const vr = await verifyPassport(v);
        setVerify(vr);
      }
      history.replaceState({}, "", `?vin=${encodeURIComponent(v)}`);
    } catch (e: any) {
      setError(e?.message || String(e));
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
    
    const items = [
      ...(record.sealed?.images?.items || []),
      ...(record.draft?.images?.items || []),
    ];

    // Role → user label (same names you show in intake)
    const ROLE_LABEL: Record<string,string> = {
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
      'exterior_front_34','exterior_rear_34','right_side','left_side',
      'interior_front','dash_odo','engine_bay','tyre_fl','tyre_fr','tyre_rl','tyre_rr'
    ];
    
    const byRole = new Map(items.map(i => [i.role, i]));

    // Build widget gallery items (label + url if present)
    const gallery = ROLE_ORDER.map(role => {
      const it = byRole.get(role);
      // Some backends store object_key instead of url; derive if needed:
      const u = it?.url ?? (it?.object_key ? `/uploads/${it.object_key}` : undefined);
      return { label: ROLE_LABEL[role] || role.replace(/_/g,' '), url: absUrl(u) };
    });


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
      gallery,
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

  return isVerifyPage ? (
      <div className="p-4 sm:p-6">
        <VerifyPassport />
      </div>
      ) : (
    <div className="p-4 sm:p-6">
      <div className="max-w-7xl mx-auto flex items-center gap-2 mb-4">
        <input
          value={vin}
          onChange={(e) => setVin(e.target.value)}
          placeholder="Enter VIN (e.g., WDD2040082R088866)"
          className="border border-slate-300 rounded-lg px-3 py-2 w-[32rem] max-w-full"
        />
        <button onClick={() => vin && load(vin)} className="rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold px-3 py-2">
          Load
        </button>
        <span className="text-slate-500 text-sm">API: {import.meta.env.VITE_API_BASE_URL || window.location.origin}</span>
      </div>

      {loading && <div className="max-w-7xl mx-auto text-slate-600">Loading…</div>}
      {error && <div className="max-w-7xl mx-auto text-rose-700">Error: {error}</div>}
      {data && <div className="max-w-7xl mx-auto"><AuctionPassportWidget data={data} /></div>}
    </div>
  );
}