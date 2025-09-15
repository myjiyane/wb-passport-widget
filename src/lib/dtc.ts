// Minimal OBD-II DTC helper: known codes + sensible fallbacks.
const DTC_MAP: Record<string, string> = {
  // Emissions / catalyst
  P0420: "Catalyst system efficiency below threshold (Bank 1)",
  P0430: "Catalyst system efficiency below threshold (Bank 2)",

  // Fuel/air trim
  P0171: "System too lean (Bank 1)",
  P0174: "System too lean (Bank 2)",
  P0172: "System too rich (Bank 1)",
  P0175: "System too rich (Bank 2)",

  // EVAP
  P0440: "Evaporative emission control system (generic fault)",
  P0442: "Evaporative emission system leak detected (small leak)",
  P0455: "Evaporative emission system leak detected (large leak)",

  // Ignition/misfire
  P0300: "Random/multiple cylinder misfire detected",

  // Intake/MAF/O2
  P0101: "MAF/VAF circuit range/performance problem",
  P0113: "Intake air temperature sensor 1 circuit high",
  P0128: "Coolant thermostat (below regulating temperature)",
  P0130: "O2 sensor circuit (Bank 1, Sensor 1)",

  // Speed/TCM
  P0500: "Vehicle speed sensor (VSS) malfunction",
  P0700: "Transmission control system (TCM) malfunction (request MIL)"
};

const SYSTEM_MAP: Record<string, string> = {
  P: "Powertrain", B: "Body", C: "Chassis", U: "Network/Comm"
};

const P_CATEGORY_MAP: Record<string, string> = {
  "0": "generic (SAE)",
  "1": "manufacturer-specific",
  "2": "manufacturer-specific",
  "3": "manufacturer-specific"
};

const P_AREA_MAP: Record<string, string> = {
  "0": "generic fault",
  "1": "fuel/air metering",
  "2": "fuel/air metering (injector circuit)",
  "3": "ignition/misfire",
  "4": "auxiliary emission controls",
  "5": "vehicle speed/idle/aux inputs",
  "6": "computer/output circuits",
  "7": "transmission",
  "8": "transmission",
  "9": "SAE reserved",
  "A": "hybrid/EV (manufacturer-specific)"
};

function normalize(code: string): string {
  return (code || "").toUpperCase().trim();
}

/**
 * Describe a DTC (best-effort). Returns undefined if nothing sensible is known.
 */
export function describeDtc(raw: string): string | undefined {
  const code = normalize(raw);
  if (!/^[PCBU][0-9A-F]{4}$/.test(code)) return undefined;

  // Direct dictionary hit
  if (DTC_MAP[code]) return DTC_MAP[code];

  // Cylinder-specific misfires P0301..P0308
  const mMis = code.match(/^P030([1-8])$/);
  if (mMis) return `Cylinder ${mMis[1]} misfire detected`;

  // Common O2 heater/sensor generic family hints (keep short)
  if (/^P013[0-9A-F]$/.test(code)) return "O2 sensor circuit (Bank 1)";
  if (/^P015[0-9A-F]$/.test(code)) return "O2 sensor circuit (Bank 2)";

  // EVAP family hint
  if (/^P044[0-9A-F]$/.test(code)) return "Evaporative emission system fault";

  // Build a generic but useful hint
  const sys = SYSTEM_MAP[code[0]] || "Unknown system";
  if (code[0] === "P") {
    const family = P_CATEGORY_MAP[code[1]] || "unspecified";
    const area = P_AREA_MAP[code[2]] || "unspecified area";
    return `${sys} (${family}) — ${area} (${code.slice(0, 3)}xx)`;
  }
  return `${sys} fault`;
}
