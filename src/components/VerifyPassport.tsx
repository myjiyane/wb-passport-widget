import React from "react";
import { ShieldCheck, ShieldAlert, AlertTriangle, Clock, ExternalLink, QrCode, CheckCircle2 } from "lucide-react";

type VerifyResponse = {
  ok?: boolean;
  valid?: boolean;
  status?: "valid" | "invalid" | "unsealed" | "not_found" | "error";
  vin?: string;
  sealedAt?: string;    // ISO timestamp of when it was sealed
  verifiedAt?: string;  // ISO timestamp of verification event (optional)
  ref?: string;         // optional reference number
  dekraUrl?: string | null;
  message?: string;
};

function fmtTs(iso?: string) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

function getVinFromLocation(): string {
  const path = window.location.pathname || "";
  const m = path.match(/^\/verify\/(.+)$/);
  if (m && m[1]) return decodeURIComponent(m[1]);
  const sp = new URLSearchParams(window.location.search);
  return (sp.get("vin") || "").trim();
}

export default function VerifyPassport() {
  const [vin, setVin] = React.useState<string>(() => getVinFromLocation());
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<VerifyResponse | null>(null);

  React.useEffect(() => {
    const v = getVinFromLocation();
    if (v) fetchVerify(v);
    // listen for back/forward navigation
    const onPop = () => {
      const v2 = getVinFromLocation();
      setVin(v2);
      if (v2) fetchVerify(v2);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchVerify(v: string) {
    const q = v.trim();
    if (!q) return;
    setLoading(true); setError(null); setData(null);
    try {
      const res = await fetch(`/verify?vin=${encodeURIComponent(q)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        let message = `Server returned ${res.status}`;
        try { const j = await res.json(); if (j?.message) message = j.message; setData(j); } catch {}
        throw new Error(message);
      }
      const json = (await res.json()) as VerifyResponse;
      setData(json);
    } catch (e: any) {
      setError(e?.message || "Unable to verify at the moment.");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = vin.trim();
    if (!q) return;
    // update URL to /verify/:vin for shareability (no router required)
    const url = `/verify/${encodeURIComponent(q)}`;
    window.history.pushState({}, "", url);
    fetchVerify(q);
  }

  const status = data?.status || (data?.valid ? "valid" : undefined);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="rounded-2xl overflow-hidden border border-teal-200">
        <div className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 text-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 grid place-items-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm uppercase opacity-90">WesBank Auctions</div>
              <h1 className="text-xl sm:text-2xl font-semibold">Verify Vehicle Passport</h1>
            </div>
          </div>
        </div>

        <div className="bg-white px-5 py-4">
          {/* VIN input */}
          <form onSubmit={onSubmit} className="flex gap-2">
            <input
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              placeholder="Enter VIN (e.g. WF0AXXWPMADE12345)"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
              autoComplete="off"
            />
            <button
              className="rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
              disabled={!vin.trim()}
            >
              Verify
            </button>
          </form>
        </div>
      </div>

      {/* Results */}
      {loading && (
        <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            Verifying…
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            {error}
          </div>
        </div>
      )}

      {!loading && !error && data && (
        <div className="mt-4 rounded-2xl border bg-white">
          {/* Status banner */}
          <div
            className={`flex items-center justify-between gap-3 px-5 py-4 border-b ${
              status === "valid"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : status === "unsealed"
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {status === "valid" ? (
                <ShieldCheck className="w-5 h-5" />
              ) : status === "unsealed" ? (
                <Clock className="w-5 h-5" />
              ) : (
                <ShieldAlert className="w-5 h-5" />
              )}
              <div className="text-sm font-semibold">
                {status === "valid"
                  ? "Authenticity verified"
                  : status === "unsealed"
                  ? "Not sealed yet"
                  : "Cannot verify authenticity"}
              </div>
            </div>
            {data?.ref && <div className="text-xs opacity-80">Ref: {data.ref}</div>}
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-3 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-500 text-xs">VIN</div>
                <div className="font-mono text-base">{data?.vin || vin}</div>
              </div>
              {status === "valid" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                </span>
              )}
            </div>

            {/* Trust-first copy */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p>
                <span className="font-medium">Tamper-proof evidence:</span> this passport was sealed and timestamped on{" "}
                <span className="font-medium">{fmtTs(data?.sealedAt || data?.verifiedAt)}</span>. Any changes after sealing would
                invalidate verification.
              </p>
              {status === "valid" && (
                <div className="mt-2 text-xs text-slate-500">
                  Authenticity verified · {fmtTs(data?.verifiedAt || data?.sealedAt)} · WesBank Vehicle Passport
                </div>
              )}
            </div>

            {data?.message && <div className="text-xs text-slate-600">{data.message}</div>}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              {status === "valid" && data?.dekraUrl && (
                <a
                  href={data.dekraUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View official report
                </a>
              )}
              <a
                href="/help/integrity-seal"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
              >
                What is an integrity seal?
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
