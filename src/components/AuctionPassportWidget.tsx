// src/components/AuctionPassportWidget.tsx
import React, { useMemo, useState } from "react";
import { X } from "lucide-react";
import { describeDtc } from "../lib/dtc";
import {
  Car,
  Gauge,
  Wrench,
  QrCode,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Camera,
  Clock,
  FileJson,
  CircleDollarSign,
  Bell,
  Timer,
} from "lucide-react";

export type WidgetData = {
  vin: string;
  lotId?: string;
  odometerKm?: number | null;
  dtcStatus?: "green" | "amber" | "red" | "n/a";
  dtcCodes?: { code: string; desc?: string }[];
  tyres?: { FL?: number | null; FR?: number | null; RL?: number | null; RR?: number | null };
  dekraUrl?: string | null;
  seal?: { hash?: string; keyId?: string; ts?: string; valid?: boolean } | null;
  gallery?: { label: string; url?: string }[];
  timeline?: { ts: string; title: string; note?: string }[];
  auction?: { openAt?: string; closeAt?: string; reserveMet?: boolean; currentBid?: number; bids?: number; url?: string };
};

const Pill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
    {children}
  </span>
);

const Badge: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
  <div
    className={`flex items-center gap-2 text-xs px-2 py-1 rounded-full border ${
      ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
    }`}
  >
    <CheckCircle2 className="w-3.5 h-3.5" />
    <span className="font-medium">{label}</span>
  </div>
);

/* ---------- Tyre helpers ---------- */

const getTyreCondition = (depth: number) => {
  if (depth >= 8)
    return { status: "Excellent", color: "text-green-700 bg-green-50 border-green-200", description: "Like new condition" };
  if (depth >= 4)
    return { status: "Good", color: "text-green-600 bg-green-50 border-green-200", description: "Good remaining life" };
  if (depth >= 2)
    return { status: "Fair", color: "text-amber-700 bg-amber-50 border-amber-200", description: "Consider replacement soon" };
  if (depth >= 1.6)
    return {
      status: "Legal Minimum",
      color: "text-red-700 bg-red-50 border-red-200",
      description: "At legal limit - replace immediately",
    };
  return {
    status: "Below Legal",
    color: "text-red-800 bg-red-100 border-red-300",
    description: "Unsafe - immediate replacement required",
  };
};

/** Moved to top-level scope so it can be used in AuctionPassportWidget */
const TyreAnalysis: React.FC<{ tyres: WidgetData["tyres"] }> = ({ tyres }) => {
  const depths = [tyres?.FL, tyres?.FR, tyres?.RL, tyres?.RR].filter((d): d is number => typeof d === "number");

  if (depths.length === 0) return null;

  const minDepth = Math.min(...depths);
  const maxDepth = Math.max(...depths);
  const avgDepth = depths.reduce((sum, d) => sum + d, 0) / depths.length;
  const variance = maxDepth - minDepth;

  const assessment = (() => {
    if (minDepth < 1.6)
      return {
        status: "Critical",
        color: "bg-red-100 border-red-300 text-red-800",
        message: "Vehicle has tyres below legal minimum (1.6mm). Immediate replacement required before use.",
        recommendation: "Do not drive - replace immediately",
      };
    if (minDepth < 2)
      return {
        status: "Poor",
        color: "bg-red-50 border-red-200 text-red-700",
        message: "Vehicle has tyres at or near legal minimum. Replacement urgently needed.",
        recommendation: "Budget for immediate tyre replacement",
      };
    if (minDepth < 4)
      return {
        status: "Fair",
        color: "bg-amber-50 border-amber-200 text-amber-700",
        message: "Tyres show moderate wear. Replacement should be planned within 6 months.",
        recommendation: "Plan for replacement in coming months",
      };
    if (variance > 3)
      return {
        status: "Uneven Wear",
        color: "bg-amber-50 border-amber-200 text-amber-700",
        message: "Significant variation in tyre wear detected. May indicate alignment or suspension issues.",
        recommendation: "Inspect for underlying mechanical issues",
      };
    return {
      status: "Good",
      color: "bg-green-50 border-green-200 text-green-700",
      message: "All tyres in good condition with adequate remaining tread.",
      recommendation: "No immediate action required",
    };
  })();

  return (
    <div className="mt-4 space-y-3">
      {/* Overall Assessment */}
      <div className={`p-4 rounded-lg border ${assessment.color}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Tyre Condition: {assessment.status}</div>
          <div className="text-sm">Min: {minDepth.toFixed(1)}mm</div>
        </div>
        <div className="text-sm mb-2">{assessment.message}</div>
        <div className="text-xs font-medium">Recommendation: {assessment.recommendation}</div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="text-center p-2 bg-slate-50 rounded">
          <div className="font-medium">Minimum</div>
          <div className="text-lg font-bold">{minDepth.toFixed(1)}mm</div>
        </div>
        <div className="text-center p-2 bg-slate-50 rounded">
          <div className="font-medium">Average</div>
          <div className="text-lg font-bold">{avgDepth.toFixed(1)}mm</div>
        </div>
        <div className="text-center p-2 bg-slate-50 rounded">
          <div className="font-medium">Variation</div>
          <div className="text-lg font-bold">{variance.toFixed(1)}mm</div>
        </div>
      </div>

      {/* Legal Information */}
      <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded">
        <div className="font-medium mb-1">Legal Requirements:</div>
        <div>• South African legal minimum: 1.6mm</div>
        <div>• Recommended replacement: 3.0mm</div>
        <div>• New tyre depth: 8-12mm</div>
      </div>
    </div>
  );
};

const TyreCell: React.FC<{ label: string; mm?: number | null }> = ({ label, mm }) => {
  const val = mm == null || Number.isNaN(mm) ? "—" : `${Number(mm).toFixed(1)}`;
  const condition = typeof mm === "number" ? getTyreCondition(mm) : null;

  return (
    <div className={`rounded-lg border p-3 ${condition?.color || "text-slate-600 bg-slate-50 border-slate-200"}`}>
      <div className="text-xs font-medium text-slate-500 mb-1">{label}</div>
      <div className="text-lg font-bold">{val}</div> <div className="text-xs font-medium mt-1">mm</div>
      {condition && (
        <>
          <div className="text-xs font-medium mt-1">{condition.status}</div>
        </>
      )}
    </div>
  );
};

/* ---------- Shared UI bits ---------- */

const fmtTs = (iso?: string) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
};

const TimelineItem: React.FC<{ ts: string; title: string; note?: string }> = ({ ts, title, note }) => (
  <div className="relative pl-6 pb-4">
    <div className="absolute left-0 top-2 w-3 h-3 rounded-full bg-teal-400" />
    <div className="text-xs text-slate-500">{fmtTs(ts)}</div>
    <div className="text-sm font-medium text-slate-800">{title}</div>
    {note && <div className="text-xs text-slate-500">{note}</div>}
  </div>
);

function shortMiddle(s?: string, left = 6, right = 6) {
  if (!s) return "—";
  if (s.length <= left + right + 1) return s;
  return `${s.slice(0, left)}…${s.slice(-right)}`;
}

const Box: React.FC<{ title: string; icon?: React.ReactNode; children?: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
    </div>
    {children}
  </div>
);

const KV: React.FC<{ k: string; v: React.ReactNode; mono?: boolean }> = ({ k, v, mono }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-slate-500">{k}</span>
    <span className={mono ? "font-mono" : ""}>{v}</span>
  </div>
);

const AuctionBox: React.FC<{
  status: "upcoming" | "live" | "closed";
  hh: string;
  mm: string;
  ss: string;
  auction?: WidgetData["auction"];
}> = ({ status, hh, mm, ss, auction }) => {
  const currency = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 });
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500">Current bid</div>
          <div className="text-xl font-bold">{auction?.currentBid != null ? currency.format(auction.currentBid) : "—"}</div>
          <div className="text-xs text-slate-500">
            {auction?.bids ?? 0} bids • {auction?.reserveMet ? "Reserve met" : "Reserve not met"}
          </div>
        </div>
        {status === "live" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 px-2 py-1 text-xs">
            <Timer className="w-3.5 h-3.5" /> Closes in {hh}:{mm}:{ss}
          </span>
        )}
        {status === "upcoming" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 text-xs">
            <Bell className="w-3.5 h-3.5" /> Opens in {hh}:{mm}:{ss}
          </span>
        )}
        {status === "closed" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 text-xs">
            Lot closed
          </span>
        )}
      </div>
      <div className="mt-3">
        {status === "live" && (
          <a
            href={auction?.url || "#"}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 text-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-teal-700"
          >
            Bid now
          </a>
        )}
        {status === "upcoming" && (
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-teal-300 text-teal-800 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-teal-50">
            Set reminder
          </button>
        )}
        {status === "closed" && (
          <button
            disabled
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 text-slate-500 bg-white px-4 py-2 text-sm font-medium"
          >
            Lot closed
          </button>
        )}
      </div>
    </div>
  );
};

/* ---------- Main widget ---------- */

export default function AuctionPassportWidget({ data, audience = "customer" }: { data: WidgetData; audience?: "customer" | "internal" }) {
  const [showJson, setShowJson] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const now = Date.now();
  const openTs = data.auction?.openAt ? new Date(data.auction.openAt).getTime() : 0;
  const closeTs = data.auction?.closeAt ? new Date(data.auction.closeAt).getTime() : 0;
  const status = data.auction ? (now < openTs ? "upcoming" : now < closeTs ? "live" : "closed") : "upcoming";
  const target = status === "upcoming" ? openTs : status === "live" ? closeTs : null;
  const remaining = target ? Math.max(0, Math.floor((target - now) / 1000)) : 0;
  const hh = String(Math.floor(remaining / 3600)).padStart(2, "0");
  const mm = String(Math.floor((remaining % 3600) / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  const showTech = audience === "internal";

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxIdx(null);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    if (lightboxIdx !== null) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [lightboxIdx]);

  const Dtc = useMemo(() => {
    if (data.dtcStatus === "green")
      return { icon: ShieldCheck, label: "No faults", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    if (data.dtcStatus === "amber")
      return { icon: AlertTriangle, label: "Advisories", cls: "text-amber-700 bg-amber-50 border-amber-200" };
    if (data.dtcStatus === "red")
      return { icon: ShieldAlert, label: "Critical faults", cls: "text-rose-700 bg-rose-50 border-rose-200" };
    return { icon: Wrench, label: "N/A", cls: "text-slate-700 bg-slate-50 border-slate-200" };
  }, [data.dtcStatus]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 rounded-2xl overflow-hidden border border-teal-200">
        <div className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 text-white">
          <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 grid place-items-center">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm uppercase tracking-wider/loose opacity-90">WesBank Auctions</div>
                <h1 className="text-xl sm:text-2xl font-semibold">Vehicle Passport</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge ok={!!data.seal?.valid} label={data.seal?.valid ? "Passport sealed" : "Not sealed"} />
              <div
                className={`flex items-center gap-2 text-xs px-2 py-1 rounded-full border ${
                  data.dekraUrl ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-slate-50 text-slate-600 border-slate-200"
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span className="font-medium">{data.dekraUrl ? "DEKRA linked" : "DEKRA pending"}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white px-5 py-3 flex flex-wrap items-center gap-3 text-sm">
          <Pill>
            VIN: <span className="ml-1 font-mono">{data.vin}</span>
          </Pill>
          {data.lotId && (
            <Pill>
              Lot: <span className="ml-1 font-mono">{data.lotId}</span>
            </Pill>
          )}
          {data.seal?.ts && (
            <Pill>
              Sealed: <span className="ml-1">{data.seal.ts}</span>
            </Pill>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Box title="Odometer" icon={<Gauge className="w-4 h-4 text-slate-500" />}>
          <div className="text-2xl font-bold">{data.odometerKm != null ? data.odometerKm.toLocaleString() : "—"} km</div>
          <div className="mt-1 text-xs text-slate-500 inline-flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            Last updated just now
          </div>
        </Box>

        <Box title="Fault Status" icon={<Wrench className="w-4 h-4 text-slate-500" />}>
          {/* status chip stays the same */}
          <div className={`inline-flex items-center gap-2 border rounded-lg px-3 py-2 ${Dtc.cls}`}>
            <Dtc.icon className="w-4 h-4" />
            <span className="text-sm font-semibold">{Dtc.label}</span>
          </div>

          {/* advisories list */}
          {(() => {
            const raw = (data.dtcCodes ?? []).filter((c) => /^[PCBU][0-9A-F]{4}$/i.test(c.code));
            const enriched = raw.map((c) => ({ code: c.code.toUpperCase(), desc: c.desc || describeDtc(c.code) }));
            const MAX = 5;
            const shown = enriched.slice(0, MAX);
            const extra = Math.max(0, enriched.length - shown.length);

            if (data.dtcStatus === "green" || shown.length === 0) {
              return <div className="mt-2 text-sm text-slate-600">No advisories reported.</div>;
            }

            return (
              <>
                <ul className="mt-2 space-y-2">
                  {shown.map((item) => (
                    <li key={item.code} className="text-sm text-slate-800">
                      {item.desc ?? "Diagnostic advisory"}
                      <span className="ml-2 text-xs text-slate-500 font-mono">({item.code})</span>
                    </li>
                  ))}
                </ul>
                {extra > 0 && <div className="mt-2 text-xs text-slate-500">+{extra} more advisories</div>}
              </>
            );
          })()}
        </Box>

        <Box title="Auction" icon={<CircleDollarSign className="w-4 h-4 text-slate-500" />}>
          <AuctionBox status={status} hh={hh} mm={mm} ss={ss} auction={data.auction} />
        </Box>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Box title="360° Gallery" icon={<Camera className="w-4 h-4 text-slate-500" />}>
          {Array.isArray(data.gallery) && data.gallery.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {data.gallery.map((g, idx) => (
                <button key={g.label + idx} className="w-full" onClick={() => g.url && setLightboxIdx(idx)} title={g.label}>
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    {g.url ? (
                      <img src={g.url} alt={g.label} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-slate-400 text-xs">{g.label}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-600">No photos yet.</div>
          )}
        </Box>

        <Box title="Tyres & Safety" icon={<Camera className="w-4 h-4 text-slate-500" />}>
          <div className="grid grid-cols-4 gap-2 mb-4">
            <TyreCell label="FL" mm={data.tyres?.FL} />
            <TyreCell label="FR" mm={data.tyres?.FR} />
            <TyreCell label="RL" mm={data.tyres?.RL} />
            <TyreCell label="RR" mm={data.tyres?.RR} />
          </div>
          <TyreAnalysis tyres={data.tyres} />
        </Box>

        <Box title="Integrity & Seal" icon={<ShieldCheck className="w-4 h-4 text-slate-500" />}>
          {/* Plain-English, trust-first state */}
          <div
            className={`flex items-center gap-2 text-sm mb-2 ${
              data.seal?.valid ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {data.seal?.valid ? "Integrity Seal: Verified" : "Integrity Seal: Verification unavailable"}
          </div>

          {/* customer-facing: tamper-proof line */}
          <p className="text-sm text-slate-700">
            <span className="font-medium">Tamper-proof evidence:</span> Any changes after sealing would invalidate verification.
          </p>

          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <a
              href={`/verify?vin=${encodeURIComponent(data.vin)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-teal-600 text-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-teal-700"
            >
              Verify authenticity
            </a>

            {/* Official report (e.g., DEKRA) */}
            {data.dekraUrl && (
              <a
                href={data.dekraUrl}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                target="_blank"
                rel="noopener noreferrer"
                title="View official report"
              >
                View official report
              </a>
            )}
          </div>

          {/* Bonus copy (badge line) – shown when verified */}
          {data.seal?.valid && (
            <div className="mt-2 text-xs text-slate-500">
              <span className="sr-only">Verification badge:</span>
              Authenticity verified · {fmtTs(data.seal?.ts)} · WesBank Digital Vehicle Passport
            </div>
          )}

          {/* Bonus copy (FAQ microcopy link) */}
          <div className="mt-3">
            <a
              href="/help/integrity-seal" /* replace with your actual route */
              className="text-xs text-slate-600 underline hover:text-slate-800"
              target="_blank"
              rel="noopener noreferrer"
            >
              What is an integrity seal?
            </a>
          </div>

          {/* Internal-only diagnostics remain hidden unless you opt-in via audience flag */}
          {showTech && (
            <div className="mt-3 space-y-2 text-xs text-slate-600 border-t border-slate-200 pt-3">
              <KV k="Seal hash"   v={shortMiddle(data.seal?.hash)}  mono />
              <KV k="Signing key" v={shortMiddle(data.seal?.keyId)} mono />
              <KV k="Valid"       v={data.seal?.valid ? "Yes" : "No"} />
            </div>
          )}
        </Box>

        {/* VIN Timeline */}
        <Box title="VIN Timeline" icon={<Clock className="w-4 h-4 text-slate-500" />}>
          {Array.isArray(data.timeline) && data.timeline.length > 0 ? (
            <div>
              {data.timeline
                .slice()
                .sort((a, b) => a.ts.localeCompare(b.ts))
                .map((t) => (
                  <TimelineItem key={t.ts + t.title} ts={t.ts} title={t.title} note={t.note} />
                ))}
            </div>
          ) : (
            <div className="text-sm text-slate-600">No events recorded yet.</div>
          )}
        </Box>
      </div>

      {/* Lightbox (last child in the return tree) */}
      {lightboxIdx !== null && data.gallery?.[lightboxIdx] && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxIdx(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            {/* prevent backdrop click */}
            <div className="flex items-center justify-between text-white mb-3">
              <div className="text-sm">{data.gallery[lightboxIdx].label}</div>
              <button className="p-2 hover:bg-white/10 rounded-lg" onClick={() => setLightboxIdx(null)} aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
              {data.gallery[lightboxIdx].url ? (
                <img
                  src={data.gallery[lightboxIdx].url}
                  alt={data.gallery[lightboxIdx].label}
                  className="w-full h-full object-contain"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full grid place-items-center text-slate-300">{data.gallery[lightboxIdx].label} (no image)</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
