import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, XCircle, Clock, ExternalLink, Car, QrCode } from 'lucide-react';

// Enhanced verification response type
interface DetailedVerifyResponse {
  valid: boolean;
  reasons?: string[];
  hash?: string;
  key_id?: string | null;
  passport?: {
    vin: string;
    lot_id?: string;
    seal?: {
      hash: string;
      key_id: string;
      sealed_ts: string;
    };
    dekra?: {
      url?: string;
      inspection_ts?: string;
      site?: string;
    };
    odometer?: {
      km?: number | null;
      source?: string;
    };
  };
}

// API functions
const BASE = (import.meta.env.VITE_API_BASE_URL || window.location.origin).replace(/\/+$/,"");
const API_KEY = import.meta.env.VITE_API_KEY as string | undefined;

async function apiCall<T>(url: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { ...(init?.headers as any) };
  if (API_KEY) headers['X-Api-Key'] = API_KEY;
  
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${errorText ? ': ' + errorText : ''}`);
  }
  return res.json() as Promise<T>;
}

async function getPassport(vin: string) {
  return apiCall<any>(`${BASE}/passports/${encodeURIComponent(vin)}`);
}

async function verifyPassport(vin: string) {
  return apiCall<{valid: boolean; reasons?: string[]}>(`${BASE}/verify?vin=${encodeURIComponent(vin)}`);
}

async function verifyPassportDetailed(vin: string): Promise<DetailedVerifyResponse> {
  try {
    // Get both verification and passport data
    const [verification, passport] = await Promise.all([
      verifyPassport(vin),
      getPassport(vin).catch(() => null) // Don't fail if passport not found
    ]);

    return {
      ...verification,
      passport: passport?.sealed ? {
        vin: passport.sealed.vin,
        lot_id: passport.sealed.lot_id,
        seal: passport.sealed.seal,
        dekra: passport.sealed.dekra,
        odometer: passport.sealed.odometer,
      } : undefined
    };
  } catch (error) {
    // If verification fails, still try to get basic passport info
    const passport = await getPassport(vin).catch(() => null);
    return {
      valid: false,
      reasons: [`Verification failed: ${(error as Error).message}`],
      passport: passport?.sealed ? {
        vin: passport.sealed.vin,
        lot_id: passport.sealed.lot_id,
        seal: passport.sealed.seal,
        dekra: passport.sealed.dekra,
        odometer: passport.sealed.odometer,
      } : undefined
    };
  }
}

// Utility functions
function isValidVinFormat(vin: string): boolean {
  return /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin.trim());
}

function formatVin(vin: string): string {
  return vin.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17);
}

interface VerificationState {
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: DetailedVerifyResponse;
  error?: string;
}

const PublicPassportVerification: React.FC = () => {
  const [vin, setVin] = useState('');
  const [verification, setVerification] = useState<VerificationState>({ status: 'idle' });

  // Check URL params for VIN on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlVin = urlParams.get('vin');
    if (urlVin && isValidVinFormat(urlVin)) {
      setVin(formatVin(urlVin));
      handleVerify(formatVin(urlVin));
    }
  }, []);

  const handleVerify = async (vinToVerify?: string) => {
    const targetVin = vinToVerify || vin;
    const formattedVin = formatVin(targetVin);

    if (!isValidVinFormat(formattedVin)) {
      setVerification({
        status: 'error',
        error: 'Please enter a valid 17-character VIN'
      });
      return;
    }

    setVerification({ status: 'loading' });

    try {
      const result = await verifyPassportDetailed(formattedVin);
      setVerification({
        status: 'success',
        data: result
      });

      // Update URL
      const url = new URL(window.location.href);
      url.searchParams.set('vin', formattedVin);
      window.history.replaceState({}, '', url.toString());
    } catch (error) {
      setVerification({
        status: 'error',
        error: (error as Error).message
      });
    }
  };

  const handleVinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17);
    setVin(value);
  };

  const formatTimestamp = (iso?: string) => {
    if (!iso) return 'Unknown';
    try {
      return new Date(iso).toLocaleString('en-ZA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Africa/Johannesburg'
      });
    } catch {
      return iso;
    }
  };

  const getVerificationStatus = () => {
    if (verification.status !== 'success' || !verification.data) return null;

    const { valid, reasons, passport } = verification.data;

    if (valid && passport?.seal) {
      return {
        icon: ShieldCheck,
        title: 'Passport Verified ✓',
        subtitle: 'This vehicle passport is authentic and tamper-proof',
        className: 'bg-emerald-50 border-emerald-200 text-emerald-800'
      };
    }

    if (!valid && passport?.seal) {
      return {
        icon: ShieldAlert,
        title: 'Verification Failed',
        subtitle: `Integrity issues detected: ${reasons?.join(', ') || 'Unknown error'}`,
        className: 'bg-red-50 border-red-200 text-red-800'
      };
    }

    return {
      icon: AlertTriangle,
      title: 'No Sealed Passport Found',
      subtitle: 'This VIN does not have a sealed digital passport',
      className: 'bg-amber-50 border-amber-200 text-amber-800'
    };
  };

  const statusInfo = getVerificationStatus();

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vehicle Passport Verification</h1>
            <p className="text-gray-600">Verify the authenticity of a WesBank digital vehicle passport</p>
          </div>
        </div>
      </div>

      {/* VIN Input */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Vehicle Identification Number (VIN)
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={vin}
            onChange={handleVinChange}
            placeholder="Enter 17-character VIN (e.g., WDD2040082R088866)"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-lg font-mono tracking-wider focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            maxLength={17}
          />
          <button
            onClick={() => handleVerify()}
            disabled={verification.status === 'loading' || !isValidVinFormat(vin)}
            className="px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            {verification.status === 'loading' ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verifying...
              </div>
            ) : (
              'Verify'
            )}
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Character count: {vin.length}/17
        </div>
      </div>

      {/* Verification Results */}
      {verification.status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3">
            <XCircle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-800">Verification Error</h3>
              <p className="text-red-700">{verification.error}</p>
            </div>
          </div>
        </div>
      )}

      {verification.status === 'success' && statusInfo && (
        <div className={`border rounded-xl p-6 mb-6 ${statusInfo.className}`}>
          <div className="flex items-start gap-4">
            <statusInfo.icon className="w-8 h-8 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">{statusInfo.title}</h3>
              <p className="mb-4">{statusInfo.subtitle}</p>

              {/* Sealed Inspection Data Details */}
              {verification.data?.passport && verification.data.passport.seal && (
                <div className="space-y-6">
                  {/* What Was Sealed */}
                  <div className="bg-white bg-opacity-50 rounded-lg p-4 border border-current border-opacity-20">
                    <h4 className="font-semibold text-sm uppercase tracking-wide mb-3">
                      Sealed Mechanic Inspection Data
                    </h4>
                    <div className="text-sm space-y-3">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium">VIN Verification:</span>
                          <div className="font-mono text-xs mt-1">{verification.data.passport.vin}</div>
                        </div>
                        <div>
                          <span className="font-medium">Inspection Date:</span>
                          <div className="text-xs mt-1">{formatTimestamp(verification.data.passport.seal.sealed_ts)}</div>
                        </div>
                        <div>
                          <span className="font-medium">Odometer Reading:</span>
                          <div className="text-xs mt-1">
                            {verification.data.passport.odometer?.km 
                              ? `${verification.data.passport.odometer.km.toLocaleString()} km (measured by mechanic)`
                              : 'Not recorded during inspection'
                            }
                          </div>
                        </div>
                        <div>
                          <span className="font-medium">Vehicle Condition:</span>
                          <div className="text-xs mt-1">
                            Professional assessment completed
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Integrity Guarantee */}
                  <div className="bg-white bg-opacity-30 rounded-lg p-4 border border-current border-opacity-20">
                    <h4 className="font-semibold text-sm mb-2">🔒 Integrity Guarantee</h4>
                    <p className="text-sm">
                      This data was captured during our certified mechanical inspection and immediately sealed using cryptographic technology. 
                      Any attempt to alter the inspection results would break the digital signature and be instantly detectable.
                    </p>
                  </div>

                  {/* Basic Passport Info */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm uppercase tracking-wide opacity-75">Vehicle Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">VIN:</span>
                          <span className="font-mono">{verification.data.passport.vin}</span>
                        </div>
                        {verification.data.passport.lot_id && (
                          <div className="flex justify-between">
                            <span className="font-medium">Lot ID:</span>
                            <span className="font-mono">{verification.data.passport.lot_id}</span>
                          </div>
                        )}
                        {verification.data.passport.odometer?.km && (
                          <div className="flex justify-between">
                            <span className="font-medium">Measured Odometer:</span>
                            <span>{verification.data.passport.odometer.km.toLocaleString()} km</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Digital Seal Technical Details */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm uppercase tracking-wide opacity-75">Digital Seal</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">Sealed:</span>
                          <span>{formatTimestamp(verification.data.passport.seal.sealed_ts)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Authority:</span>
                          <span className="font-mono text-xs">{verification.data.passport.seal.key_id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Hash:</span>
                          <span className="font-mono text-xs">{verification.data.passport.seal.hash.slice(0, 16)}...</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Status:</span>
                          <span className={verification.data.valid ? 'text-emerald-700 font-medium' : 'text-red-700 font-medium'}>
                            {verification.data.valid ? '✓ Verified' : '✗ Invalid'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Historical Reports Section */}
              {verification.data?.passport?.dekra?.url && (
                <div className="mt-6 pt-4 border-t border-current border-opacity-20">
                  <h4 className="font-semibold text-sm mb-3">📋 Attached Historical Reports</h4>
                  <p className="text-sm mb-3 opacity-90">
                    Independent inspection reports attached to this vehicle's history:
                  </p>
                  <a
                    href={verification.data.passport.dekra.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View DEKRA Inspection Report
                    <span className="text-xs opacity-75">(Opens in new window)</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced About Section */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">About WesBank Digital Vehicle Passports</h3>
        <div className="text-sm text-gray-600 space-y-3">
          <div>
            <h4 className="font-medium text-gray-800 mb-1">🔧 What We Inspect & Seal</h4>
            <p>
              Our certified mechanics perform comprehensive inspections and immediately seal the results using cryptographic technology. 
              The sealed data includes: VIN verification, precise odometer readings, tyre measurements, vehicle condition assessment, 
              and detailed mechanical findings.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-800 mb-1">🔒 How Digital Sealing Works</h4>
            <p>
              Inspection data is cryptographically "sealed" the moment our mechanic completes the assessment. 
              This creates a tamper-proof digital fingerprint (hash) that makes any subsequent changes to the data immediately detectable. 
              Think of it as a digital wax seal that breaks if anyone tries to alter the contents.
            </p>
          </div>

          <div>
            <h4 className="font-medium text-gray-800 mb-1">📋 Historical Reports vs. Our Inspection</h4>
            <p>
              We may attach historical inspection reports (like DEKRA) when available, but our digital seal specifically protects 
              the current mechanical inspection data performed by our certified technicians. This ensures you have both 
              recent verified condition data and historical context.
            </p>
          </div>

          <div>
            <h4 className="font-medium text-gray-800 mb-1">✅ Verification Process</h4>
            <p>
              Verification validates the digital signature against the sealed inspection content using industry-standard ECDSA P-256 encryption. 
              A valid signature mathematically proves the inspection data hasn't been altered since our mechanic sealed it.
            </p>
          </div>

          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-200">
            <QrCode className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500">
              Powered by WesBank Digital Asset Platform • Secured with ECDSA P-256 encryption • Certified Mechanical Inspections
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicPassportVerification;