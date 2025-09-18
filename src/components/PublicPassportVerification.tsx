import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, XCircle, Clock, ExternalLink, Car, QrCode } from 'lucide-react';
import { verifyPassportDetailed, isValidVinFormat, formatVin, type DetailedVerifyResponse } from '../lib/api';

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

              {/* Passport Details */}
              {verification.data?.passport && (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Basic Info */}
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
                          <span className="font-medium">Odometer:</span>
                          <span>{verification.data.passport.odometer.km.toLocaleString()} km</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Seal Information */}
                  {verification.data.passport.seal && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm uppercase tracking-wide opacity-75">Digital Seal</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">Sealed:</span>
                          <span>{formatTimestamp(verification.data.passport.seal.sealed_ts)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Key ID:</span>
                          <span className="font-mono text-xs">{verification.data.passport.seal.key_id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Hash:</span>
                          <span className="font-mono text-xs">{verification.data.passport.seal.hash.slice(0, 16)}...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* DEKRA Link */}
              {verification.data?.passport?.dekra?.url && (
                <div className="mt-6 pt-4 border-t border-current border-opacity-20">
                  <a
                    href={verification.data.passport.dekra.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View DEKRA Inspection Report
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* About Section */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3">About Vehicle Passport Verification</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            WesBank Digital Vehicle Passports use cryptographic signatures to ensure data integrity and authenticity. 
            Each sealed passport contains tamper-proof records of vehicle condition, inspection data, and ownership history.
          </p>
          <p>
            <strong>Verification Process:</strong> The system validates the digital signature against the passport content 
            using industry-standard encryption. A valid signature confirms the data hasn't been altered since sealing.
          </p>
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-200">
            <QrCode className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500">
              Powered by WesBank Digital Asset Platform • Secured with ECDSA P-256 encryption
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicPassportVerification;