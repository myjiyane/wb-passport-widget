import React, { useMemo, useState } from "react";
import { describeDtc } from "../lib/dtc";
import { Car, Gauge, Wrench, QrCode, CheckCircle2, ShieldCheck, ShieldAlert, AlertTriangle, Camera, Clock, CircleDollarSign, Bell, Timer, ExternalLink, Shield, X, Battery } from "lucide-react";
export type WidgetData = {
  vin: string;
  lotId?: string;
  odometerKm?: number | null;
  dtcStatus?: 'green'|'amber'|'red'|'n/a';
  dtcCodes?: { code:string; desc?:string }[];
  tyres?: { FL?: number|null; FR?: number|null; RL?: number|null; RR?: number|null };
  dekraUrl?: string | null;
  seal?: { hash?: string; keyId?: string; ts?: string; valid?: boolean } | null;
  gallery?: { label: string; url?: string }[];
  timeline?: { ts: string; title: string; note?: string }[];
  auction?: { openAt?: string; closeAt?: string; reserveMet?: boolean; currentBid?: number; bids?: number; url?: string };
  ev?: {
    isElectric?: boolean;
    batteryCapacityKwh?: number;
    smartcarCompatible?: boolean;
    capabilities?: {
      obd_ev_pids?: boolean;
      smartcar_oauth?: boolean;
      manual?: boolean;
    };
    batteryHealth?: {
      soh_pct?: number;
      soc_pct?: number;
      rangeKm?: number;
      chargingStatus?: 'charging' | 'idle' | 'discharging';
      lastUpdated?: string;
    };
    provenance?: {
      detection?: 'vin_heuristic'|'manual';
      detectionConfidence?: number;
      batterySource?: 'obd'|'manual'|'photo'|'mock';
    };
  };
};

export interface AuctionPassportWidgetProps {
  data: WidgetData;
  onNavigateToVerification?: (vin: string) => void;
}

const Pill: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-teal-100 text-teal-800 border border-teal-200">{children}</span>;

const Badge: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) =>
  <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
    <CheckCircle2 className="w-3.5 h-3.5" /><span className="font-medium">{label}</span>
  </div>;

const TyreCell: React.FC<{ label: string; mm?: number|null }> = ({ label, mm }) => {
  const val = (mm==null || Number.isNaN(mm)) ? "—" : `${Number(mm).toFixed(1)}`;
  const tone = (typeof mm === "number")
    ? (mm <= 2 ? "text-rose-700 bg-rose-50 border-rose-200"
      : mm <= 4 ? "text-amber-700 bg-amber-50 border-amber-200"
      : "text-emerald-700 bg-emerald-50 border-emerald-200")
    : "text-slate-600 bg-slate-50 border-slate-200";
  return (
    <div className={`rounded-md border px-2 py-2 text-xs font-medium text-center ${tone}`}>
      <div className="text-[10px] text-slate-500 mb-0.5">{label}</div>
      <div className="font-bold">{val}</div>
      <div className="text-[10px] text-slate-500">mm</div>
    </div>
  );
};

const fmtTs = (iso?: string) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(); // Shorter date format for mobile
  } catch {
    return iso;
  }
};

const TimelineItem: React.FC<{ ts: string; title: string; note?: string }> = ({ ts, title, note }) => (
  <div className="relative pl-5 pb-3 last:pb-0">
    <div className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-teal-400" />
    <div className="text-[11px] text-slate-500">{fmtTs(ts)}</div>
    <div className="text-sm font-medium text-slate-800 leading-tight">{title}</div>
    {note && <div className="text-[11px] text-slate-500 mt-0.5">{note}</div>}
  </div>
);

const Box: React.FC<{ title: string; icon?: React.ReactNode; children?: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-3 sm:p-4">
    <div className="flex items-center gap-2 mb-2 sm:mb-3">
      {icon}<h3 className="text-sm font-semibold text-slate-700">{title}</h3>
    </div>
    {children}
  </div>
);

const AuctionBox: React.FC<{
  status: 'upcoming'|'live'|'closed'; hh: string; mm: string; ss: string;
  auction?: WidgetData['auction']
}> = ({ status, hh, mm, ss, auction }) => {
  const currency = new Intl.NumberFormat("en-ZA",{ style:"currency", currency:"ZAR", maximumFractionDigits:0 });
  return (
    <div className="space-y-3">
      <div className="text-center sm:flex sm:items-center sm:justify-between sm:text-left">
        <div>
          <div className="text-xs text-slate-500">Current bid</div>
          <div className="text-xl sm:text-2xl font-bold">{auction?.currentBid != null ? currency.format(auction.currentBid) : "—"}</div>
          <div className="text-xs text-slate-500">{auction?.bids ?? 0} bids • {auction?.reserveMet ? "Reserve met" : "Reserve not met"}</div>
        </div>
        <div className="mt-2 sm:mt-0">
          {status === "live" && <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 px-2 py-1 text-xs"><Timer className="w-3.5 h-3.5" /> {hh}:{mm}:{ss}</span>}
          {status === "upcoming" && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 text-xs"><Bell className="w-3.5 h-3.5" /> {hh}:{mm}:{ss}</span>}
          {status === "closed" && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 text-xs">Closed</span>}
        </div>
      </div>
      <div>
        {status === "live" && <a href={auction?.url || "#"} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 text-white px-4 py-3 text-sm font-medium shadow-sm hover:bg-teal-700">Bid now</a>}
        {status === "upcoming" && <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-teal-300 text-teal-800 bg-white px-4 py-3 text-sm font-medium shadow-sm hover:bg-teal-50">Set reminder</button>}
        {status === "closed" && <button disabled className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 text-slate-500 bg-white px-4 py-3 text-sm font-medium">Lot closed</button>}
      </div>
    </div>
  );
};

export default function AuctionPassportWidget({ data, onNavigateToVerification }: AuctionPassportWidgetProps) {
  const now = Date.now();
  const openTs = data.auction?.openAt ? new Date(data.auction.openAt).getTime() : 0;
  const closeTs = data.auction?.closeAt ? new Date(data.auction.closeAt).getTime() : 0;
  const status = data.auction ? (now < openTs ? "upcoming" : now < closeTs ? "live" : "closed") : "upcoming";
  const target = status === "upcoming" ? openTs : status === "live" ? closeTs : null;
  const remaining = target ? Math.max(0, Math.floor((target - now)/1000)) : 0;
  const hh = String(Math.floor(remaining / 3600)).padStart(2, "0");
  const mm = String(Math.floor((remaining % 3600) / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const closeLightbox = () => setLightboxIdx(null);

  const Dtc = useMemo(() => {
    if (data.dtcStatus === "green") return { icon: ShieldCheck, label: "No faults", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    if (data.dtcStatus === "amber") return { icon: AlertTriangle, label: "Advisories", cls: "text-amber-700 bg-amber-50 border-amber-200" };
    if (data.dtcStatus === "red")   return { icon: ShieldAlert, label: "Critical faults", cls: "text-rose-700 bg-rose-50 border-rose-200" };
    return { icon: Wrench, label: "N/A", cls: "text-slate-700 bg-slate-50 border-slate-200" };
  }, [data.dtcStatus]);

  const handleVerificationClick = () => {
    if (onNavigateToVerification) {
      onNavigateToVerification(data.vin);
    } else {
      const url = new URL(window.location.href);
      url.searchParams.set('mode', 'verify');
      url.searchParams.set('vin', data.vin);
      window.location.href = url.toString();
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-2 sm:px-0">
      {/* Header - More compact on mobile */}
      <div className="mb-4 rounded-xl sm:rounded-2xl overflow-hidden border border-teal-200">
        <div className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 text-white">
          <div className="px-3 sm:px-5 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white/15 grid place-items-center">
                  <Car className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm uppercase tracking-wider opacity-90">WesBank Auctions</div>
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold">Vehicle Passport</h1>
                </div>
              </div>
              {/* Mobile: Show only verify button, hide other badges */}
              <div className="sm:hidden">
                <button
                  onClick={handleVerificationClick}
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border border-white/30 text-white hover:bg-white/10 transition-colors"
                  title="Verify passport authenticity"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span className="font-medium">Verify</span>
                </button>
              </div>
              {/* Desktop: Show all badges */}
              <div className="hidden sm:flex items-center gap-2">
                <Badge ok={!!data.seal?.valid} label={data.seal?.valid ? "Passport sealed" : "Not sealed"} />
                <div className={`flex items-center gap-2 text-xs px-2 py-1 rounded-full border ${data.dekraUrl ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                  <QrCode className="w-3.5 h-3.5" /><span className="font-medium">{data.dekraUrl ? "DEKRA linked" : "DEKRA pending"}</span>
                </div>
                <button
                  onClick={handleVerificationClick}
                  className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border border-white/30 text-white hover:bg-white/10 transition-colors"
                  title="Verify passport authenticity"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span className="font-medium">Verify</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Improved pills layout for mobile */}
        <div className="bg-white px-3 sm:px-5 py-2 sm:py-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Pill>VIN: <span className="font-mono text-xs sm:text-sm">{data.vin}</span></Pill>
            {data.lotId && <Pill>Lot: <span className="font-mono">{data.lotId}</span></Pill>}
            {data.seal?.ts && <Pill>Sealed: <span className="hidden sm:inline">{data.seal.ts}</span><span className="sm:hidden">{fmtTs(data.seal.ts)}</span></Pill>}
          </div>
        </div>
      </div>

      {/* Top metrics - Stack on mobile, 3-column on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <Box title="Odometer" icon={<Gauge className="w-4 h-4 text-slate-500" />}>
          <div className="text-xl sm:text-2xl font-bold">{data.odometerKm != null ? data.odometerKm.toLocaleString() : "—"} km</div>
          <div className="mt-1 text-xs text-slate-500 inline-flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />Last updated just now
          </div>
        </Box>
        
        <Box title="Fault Status" icon={<Wrench className="w-4 h-4 text-slate-500" />}>
          <div className={`inline-flex items-center gap-2 border rounded-lg px-3 py-2 ${Dtc.cls}`}>
            <Dtc.icon className="w-4 h-4" /><span className="text-sm font-semibold">{Dtc.label}</span>
          </div>

          {(() => {
            const raw = (data.dtcCodes ?? []).filter(c => /^[PCBU][0-9A-F]{4}$/i.test(c.code));
            const enriched = raw.map(c => ({ code: c.code.toUpperCase(), desc: c.desc || describeDtc(c.code) }));
            const MAX = 3; // Reduced for mobile
            const shown = enriched.slice(0, MAX);
            const extra = Math.max(0, enriched.length - shown.length);

            if ((data.dtcStatus === "green") || shown.length === 0) {
              return <div className="mt-2 text-sm text-slate-600">No advisories reported.</div>;
            }

            return (
              <>
                <ul className="mt-2 space-y-1.5">
                  {shown.map(item => (
                    <li key={item.code} className="text-xs sm:text-sm text-slate-800 leading-tight">
                      {item.desc ?? "Diagnostic advisory"}
                      <span className="ml-2 text-xs text-slate-500 font-mono">({item.code})</span>
                    </li>
                  ))}
                </ul>
                {extra > 0 && (
                  <div className="mt-2 text-xs text-slate-500">+{extra} more</div>
                )}
              </>
            );
          })()}
        </Box>

        <Box title="Auction" icon={<CircleDollarSign className="w-4 h-4 text-slate-500" />}>
          <AuctionBox status={status} hh={hh} mm={mm} ss={ss} auction={data.auction} />
        </Box>
      </div>

      {/* Secondary content - Stack on mobile, 2-column on tablet, 3-column on desktop */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Box title="360° Gallery" icon={<Camera className="w-4 h-4 text-slate-500" />}>
          {Array.isArray(data.gallery) && data.gallery.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {data.gallery.map((g, idx) => (
                <button key={g.label + idx} className="w-full" onClick={() => g.url && setLightboxIdx(idx)} title={g.label}>
                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                    {g.url ? (
                      <img src={g.url} alt={g.label} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-slate-400 text-xs p-1 text-center leading-tight">{g.label}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-600">No photos yet.</div>
          )}
        </Box>
        
        <Box title="Tyres (mm)" icon={<Camera className="w-4 h-4 text-slate-500" />}>
          <div className="grid grid-cols-4 gap-2">
            <TyreCell label="FL" mm={data.tyres?.FL} />
            <TyreCell label="FR" mm={data.tyres?.FR} />
            <TyreCell label="RL" mm={data.tyres?.RL} />
            <TyreCell label="RR" mm={data.tyres?.RR} />
          </div>
        </Box>

        <Box title="Timeline" icon={<Clock className="w-4 h-4 text-slate-500" />}>
          {Array.isArray(data.timeline) && data.timeline.length > 0 ? (
            <div className="space-y-2">
              {data.timeline
                .slice()
                .sort((a, b) => a.ts.localeCompare(b.ts))
                .map((t) => (
                  <TimelineItem key={t.ts + t.title} ts={t.ts} title={t.title} note={t.note} />
                ))}
            </div>
          ) : (
            <div className="text-sm text-slate-600">No events recorded.</div>
          )}
        </Box>

         {/* EV Battery & Information panel */}
        {data.ev?.isElectric && (
          <Box title="Electric Vehicle" icon={<Battery className="w-4 h-4 text-slate-500" />}>
            {data.ev.batteryHealth ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">State of Charge</span>
                  <span className="text-sm font-semibold">
                    {typeof data.ev.batteryHealth.soc_pct === 'number' ? `${Math.round(data.ev.batteryHealth.soc_pct)}%` : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Range</span>
                  <span className="text-sm font-semibold">
                    {typeof data.ev.batteryHealth.rangeKm === 'number' ? `${Math.round(data.ev.batteryHealth.rangeKm)} km` : 'N/A'}
                  </span>
                </div>
                {'soh_pct' in (data.ev.batteryHealth) && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Battery Health (SoH)</span>
                    <span className={`text-sm font-semibold ${
                      (data.ev.batteryHealth.soh_pct ?? 0) >= 90 ? 'text-emerald-700' :
                      (data.ev.batteryHealth.soh_pct ?? 0) >= 80 ? 'text-amber-700' : 'text-rose-700'
                    }`}>
                      {typeof data.ev.batteryHealth.soh_pct === 'number' ? `${Math.round(data.ev.batteryHealth.soh_pct)}%` : 'N/A'}
                    </span>
                  </div>
                )}
                {data.ev.batteryCapacityKwh && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Battery Capacity</span>
                    <span className="text-sm font-semibold">
                      {data.ev.batteryCapacityKwh} kWh
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Charging Status</span>
                  <span className={`text-sm font-medium capitalize ${
                    data.ev.batteryHealth.chargingStatus === 'charging' ? 'text-emerald-700' :
                    data.ev.batteryHealth.chargingStatus === 'discharging' ? 'text-amber-700' : 'text-slate-600'
                  }`}>
                    {data.ev.batteryHealth.chargingStatus ?? 'N/A'}
                  </span>
                </div>
                {data.ev.batteryHealth.lastUpdated && (
                  <div className="text-xs text-slate-500 text-right">
                    Updated {fmtTs(data.ev.batteryHealth.lastUpdated)}
                  </div>
                )}
                {data.ev.provenance?.batterySource && (
                  <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200">
                    Source: {data.ev.provenance.batterySource}
                    {data.ev.provenance.detection === 'vin_heuristic' && data.ev.provenance.detectionConfidence && (
                      <> • {Math.round(data.ev.provenance.detectionConfidence * 100)}% confidence</>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-slate-600">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-xs font-medium">
                    ⚡ Electric Vehicle
                  </span>
                </div>
                {data.ev.batteryCapacityKwh && (
                  <div className="flex items-center justify-between mb-1">
                    <span>Battery Capacity:</span>
                    <span className="font-semibold">{data.ev.batteryCapacityKwh} kWh</span>
                  </div>
                )}
                <div className="text-xs text-slate-500 mt-2 space-y-1">
                  <div>
                    Detection: {data.ev?.provenance?.detection === 'vin_heuristic' ? 'VIN analysis' : 'Manual'}
                    {typeof data.ev?.provenance?.detectionConfidence === 'number' && (
                      <> ({Math.round(data.ev.provenance!.detectionConfidence * 100)}% confidence)</>
                    )}
                  </div>
                  {data.ev?.smartcarCompatible && (
                    <div>Live data compatible with owner consent</div>
                  )}
                  {data.ev?.capabilities?.obd_ev_pids && (
                    <div>OBD EV diagnostics supported</div>
                  )}
                </div>
              </div>
            )}
          </Box>
        )}
      </div>

      {/* Integrity Section - Compact on mobile */}
      <div className="mt-4 sm:mt-6 rounded-xl sm:rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/20 grid place-items-center">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-semibold">Digital Integrity</h3>
              <p className="text-xs opacity-90">Tamper-proof verification</p>
            </div>
          </div>
        </div>
        
        <div className="p-3 sm:p-4">
          <p className="text-sm text-slate-700 mb-3 text-center leading-relaxed">
            This vehicle passport has been cryptographically sealed. Any unauthorized changes would invalidate verification.
          </p>

          {data.seal?.ts && (
            <div className="text-xs text-slate-600 text-center mb-3 sm:mb-4">
              Sealed: {fmtTs(data.seal.ts)}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
            <button
              onClick={handleVerificationClick}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-teal-700"
            >
              <Shield className="w-4 h-4" />
              Verify Authenticity
            </button>
            
            {data.dekraUrl && (
              <a
                href={data.dekraUrl}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white text-slate-700 px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">View Official Report</span>
                <span className="sm:hidden">Official Report</span>
              </a>
            )}
          </div>

          <div className="text-center mt-3">
            <a 
              href="/help/integrity-seal"
              className="text-xs text-slate-600 hover:text-slate-800 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn about verification
            </a>
          </div>
        </div>
      </div>

      {/* Lightbox - Mobile optimized */}
      {lightboxIdx !== null && data.gallery?.[lightboxIdx] && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 sm:p-4"
          onClick={closeLightbox}
        >
          <div className="relative bg-white rounded-xl max-w-4xl max-h-full overflow-hidden">
            <button
              onClick={closeLightbox}
              className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
            >
              ×
            </button>
            <div className="w-full h-full max-h-[80vh] overflow-hidden">
              {data.gallery[lightboxIdx].url ? (
                <img
                  src={data.gallery[lightboxIdx].url}
                  alt={data.gallery[lightboxIdx].label}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full grid place-items-center text-slate-300 text-sm">{data.gallery[lightboxIdx].label} (no image)</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Integrity Section - Compact on mobile */}
      <div className="mt-4 sm:mt-6 rounded-xl sm:rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/20 grid place-items-center">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-semibold">Digital Integrity</h3>
              <p className="text-xs opacity-90">Tamper-proof verification</p>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4">
          <p className="text-sm text-slate-700 mb-3 text-center leading-relaxed">
            This vehicle passport has been cryptographically sealed. Any unauthorized changes would invalidate verification.
          </p>

          {data.seal?.ts && (
            <div className="text-xs text-slate-600 text-center mb-3 sm:mb-4">
              Sealed: {fmtTs(data.seal.ts)}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
            <button
              onClick={handleVerificationClick}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-teal-700"
            >
              <Shield className="w-4 h-4" />
              Verify Authenticity
            </button>

            {data.dekraUrl && (
              <a
                href={data.dekraUrl}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white text-slate-700 px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">View Official Report</span>
                <span className="sm:hidden">Official Report</span>
              </a>
            )}
          </div>

          <div className="text-center mt-3">
            <a
              href="/help/integrity-seal"
              className="text-xs text-slate-600 hover:text-slate-800 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn about verification
            </a>
          </div>
        </div>
      </div>

      {/* Lightbox - Mobile optimized */}
      {lightboxIdx !== null && data.gallery?.[lightboxIdx] && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 sm:p-4"
          onClick={() => setLightboxIdx(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between text-white mb-2 sm:mb-3 px-2">
              <div className="text-sm font-medium">{data.gallery[lightboxIdx].label}</div>
              <button className="p-2 hover:bg-white/10 rounded-lg" onClick={() => setLightboxIdx(null)} aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-video w-full rounded-lg sm:rounded-xl overflow-hidden bg-black">
              {data.gallery[lightboxIdx].url ? (
                <img
                  src={data.gallery[lightboxIdx].url}
                  alt={data.gallery[lightboxIdx].label}
                  className="w-full h-full object-contain"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full grid place-items-center text-slate-300 text-sm">{data.gallery[lightboxIdx].label} (no image)</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}