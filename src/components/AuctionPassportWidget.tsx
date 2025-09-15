import React, { useMemo, useState } from "react";
import { describeDtc } from "../lib/dtc";
import { Car, Gauge, Wrench, QrCode, CheckCircle2, ShieldCheck, ShieldAlert, AlertTriangle, Camera, Clock, FileJson, CircleDollarSign, Bell, Timer } from "lucide-react";

export type WidgetData = {
  vin: string;
  lotId?: string;
  odometerKm?: number | null;
  dtcStatus?: 'green'|'amber'|'red'|'n/a';
  dtcCodes?: { code:string; desc?:string }[];
  tyres?: { FL?: number|null; FR?: number|null; RL?: number|null; RR?: number|null };
  dekraUrl?: string | null;
  seal?: { hash?: string; keyId?: string; ts?: string; valid?: boolean } | null;
  gallery?: string[];
  timeline?: { ts: string; title: string; note?: string }[];
  auction?: { openAt?: string; closeAt?: string; reserveMet?: boolean; currentBid?: number; bids?: number; url?: string };
};

const Pill: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  <span className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full bg-teal-100 text-teal-800 border border-teal-200">{children}</span>;

const Badge: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) =>
  <div className={`flex items-center gap-2 text-xs px-2 py-1 rounded-full border ${ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
    <CheckCircle2 className="w-3.5 h-3.5" /><span className="font-medium">{label}</span>
  </div>;

const TyreCell: React.FC<{ label: string; mm?: number|null }> = ({ label, mm }) => {
  const val = (mm==null || Number.isNaN(mm)) ? "—" : `${Number(mm).toFixed(1)} mm`;
  const tone = (typeof mm === "number")
    ? (mm <= 2 ? "text-rose-700 bg-rose-50 border-rose-200"
      : mm <= 4 ? "text-amber-700 bg-amber-50 border-amber-200"
      : "text-emerald-700 bg-emerald-50 border-emerald-200")
    : "text-slate-600 bg-slate-50 border-slate-200";
  return (
    <div className={`rounded-md border px-2 py-1 text-xs font-medium text-center ${tone}`}>
      <span className="text-[11px] mr-1 text-slate-500">{label}</span>{val}
    </div>
  );
};

const fmtTs = (iso?: string) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(); // keep simple; you can localize to en-ZA if you prefer
  } catch { return iso; }
};

const TimelineItem: React.FC<{ ts: string; title: string; note?: string }> = ({ ts, title, note }) => (
  <div className="relative pl-6 pb-4">
    <div className="absolute left-0 top-2 w-3 h-3 rounded-full bg-teal-400" />
    <div className="text-xs text-slate-500">{fmtTs(ts)}</div>
    <div className="text-sm font-medium text-slate-800">{title}</div>
    {note && <div className="text-xs text-slate-500">{note}</div>}
  </div>
);


const Box: React.FC<{ title: string; icon?: React.ReactNode; children?: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
    <div className="flex items-center gap-2 mb-3">{icon}<h3 className="text-sm font-semibold text-slate-700">{title}</h3></div>
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
  status: 'upcoming'|'live'|'closed'; hh: string; mm: string; ss: string;
  auction?: WidgetData['auction']
}> = ({ status, hh, mm, ss, auction }) => {
  const currency = new Intl.NumberFormat("en-ZA",{ style:"currency", currency:"ZAR", maximumFractionDigits:0 });
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500">Current bid</div>
          <div className="text-xl font-bold">{auction?.currentBid != null ? currency.format(auction.currentBid) : "—"}</div>
          <div className="text-xs text-slate-500">{auction?.bids ?? 0} bids • {auction?.reserveMet ? "Reserve met" : "Reserve not met"}</div>
        </div>
        {status === "live" && <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 px-2 py-1 text-xs"><Timer className="w-3.5 h-3.5" /> Closes in {hh}:{mm}:{ss}</span>}
        {status === "upcoming" && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 text-xs"><Bell className="w-3.5 h-3.5" /> Opens in {hh}:{mm}:{ss}</span>}
        {status === "closed" && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 text-xs">Lot closed</span>}
      </div>
      <div className="mt-3">
        {status === "live" && <a href={auction?.url || "#"} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 text-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-teal-700">Bid now</a>}
        {status === "upcoming" && <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-teal-300 text-teal-800 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-teal-50">Set reminder</button>}
        {status === "closed" && <button disabled className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 text-slate-500 bg-white px-4 py-2 text-sm font-medium">Lot closed</button>}
      </div>
    </div>
  );
};

export default function AuctionPassportWidget({ data }: { data: WidgetData }) {
  const [showJson, setShowJson] = useState(false);
  const now = Date.now();
  const openTs = data.auction?.openAt ? new Date(data.auction.openAt).getTime() : 0;
  const closeTs = data.auction?.closeAt ? new Date(data.auction.closeAt).getTime() : 0;
  const status = data.auction ? (now < openTs ? "upcoming" : now < closeTs ? "live" : "closed") : "upcoming";
  const target = status === "upcoming" ? openTs : status === "live" ? closeTs : null;
  const remaining = target ? Math.max(0, Math.floor((target - now)/1000)) : 0;
  const hh = String(Math.floor(remaining / 3600)).padStart(2, "0");
  const mm = String(Math.floor((remaining % 3600) / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  const Dtc = useMemo(() => {
    if (data.dtcStatus === "green") return { icon: ShieldCheck, label: "No faults", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    if (data.dtcStatus === "amber") return { icon: AlertTriangle, label: "Advisories", cls: "text-amber-700 bg-amber-50 border-amber-200" };
    if (data.dtcStatus === "red")   return { icon: ShieldAlert, label: "Critical faults", cls: "text-rose-700 bg-rose-50 border-rose-200" };
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
              <div className={`flex items-center gap-2 text-xs px-2 py-1 rounded-full border ${data.dekraUrl ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                <QrCode className="w-3.5 h-3.5" /><span className="font-medium">{data.dekraUrl ? "DEKRA linked" : "DEKRA pending"}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white px-5 py-3 flex flex-wrap items-center gap-3 text-sm">
          <Pill>VIN: <span className="ml-1 font-mono">{data.vin}</span></Pill>
          {data.lotId && <Pill>Lot: <span className="ml-1 font-mono">{data.lotId}</span></Pill>}
          {data.seal?.ts && <Pill>Sealed: <span className="ml-1">{data.seal.ts}</span></Pill>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Box title="Odometer" icon={<Gauge className="w-4 h-4 text-slate-500" />}>
          <div className="text-2xl font-bold">{data.odometerKm != null ? data.odometerKm.toLocaleString() : "—"} km</div>
          <div className="mt-1 text-xs text-slate-500 inline-flex items-center gap-2"><Clock className="w-3.5 h-3.5" />Last updated just now</div>
        </Box>
        
        <Box title="Fault Status" icon={<Wrench className="w-4 h-4 text-slate-500" />}>
          {/* status chip stays the same */}
          <div className={`inline-flex items-center gap-2 border rounded-lg px-3 py-2 ${Dtc.cls}`}>
            <Dtc.icon className="w-4 h-4" /><span className="text-sm font-semibold">{Dtc.label}</span>
          </div>

          {/* advisories list */}
          {(() => {
            // keep only real OBD-II codes
            const raw = (data.dtcCodes ?? []).filter(c => /^[PCBU][0-9A-F]{4}$/i.test(c.code));
            const enriched = raw.map(c => ({ code: c.code.toUpperCase(), desc: c.desc || describeDtc(c.code) }));
            const MAX = 5;
            const shown = enriched.slice(0, MAX);
            const extra = Math.max(0, enriched.length - shown.length);

            if ((data.dtcStatus === "green") || shown.length === 0) {
              return <div className="mt-2 text-sm text-slate-600">No advisories reported.</div>;
            }

            return (
              <>
                <ul className="mt-2 space-y-2">
                  {shown.map(item => (
                    <li key={item.code} className="text-sm text-slate-800">
                      {item.desc ?? "Diagnostic advisory"}
                      <span className="ml-2 text-xs text-slate-500 font-mono">({item.code})</span>
                    </li>
                  ))}
                </ul>
                {extra > 0 && (
                  <div className="mt-2 text-xs text-slate-500">+{extra} more advisories</div>
                )}
              </>
            );
          })()}
        </Box>

        <Box title="Auction" icon={<CircleDollarSign className="w-4 h-4 text-slate-500" />}>
          <AuctionBox status={status} hh={hh} mm={mm} ss={ss} auction={data.auction} />
        </Box>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Box title="Tyres (mm)" icon={<Camera className="w-4 h-4 text-slate-500" />}>
          <div className="grid grid-cols-4 gap-2">
            <TyreCell label="FL" mm={data.tyres?.FL} />
            <TyreCell label="FR" mm={data.tyres?.FR} />
            <TyreCell label="RL" mm={data.tyres?.RL} />
            <TyreCell label="RR" mm={data.tyres?.RR} />
          </div>
        </Box>

        <Box title="Integrity & Seal" icon={<ShieldCheck className="w-4 h-4 text-slate-500" />}>
          <div className="space-y-2 text-sm">
            <KV k="Seal hash" v={data.seal?.hash || "—"} mono />
            <KV k="Signing key" v={data.seal?.keyId || "—"} mono />
            <KV k="Status" v={data.seal?.valid ? "Valid ✓" : "Invalid ✕"} />
            <a href={data.dekraUrl || "#"} className="mt-2 w-full inline-flex justify-center text-sm font-medium border border-slate-200 rounded-lg py-2 hover:bg-slate-50">Verify with DEKRA</a>
          </div>
        </Box>

        <Box title="Passport JSON" icon={<FileJson className="w-4 h-4 text-slate-500" />}>
          <button onClick={() => setShowJson(v => !v)} className="text-sm inline-flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50">
            {showJson ? "Hide" : "Show"} JSON
          </button>
          {showJson && <pre className="mt-3 text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto">{JSON.stringify(data, null, 2)}</pre>}
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
            <div className="text-sm text-slate-600">No timeline events yet.</div>
          )}
        </Box>
 
      </div>
    </div>
  );
}