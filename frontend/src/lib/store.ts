import { API_BASE_URL } from './api-config'

export interface ScanResult {
  id: string;
  filename: string;
  time: string;
  totalRows: number;
  totalFeatures: number;
  benignCount: number;
  ransomwareCount: number;
  overallLabel: "Benign" | "Ransomware";
  overallConfidence: number;
  metrics: { accuracy: number; precision: number; recall: number; f1: number };
  // detailed analysis fields
  riskScore?: number;
  entropy?: number;
  entropyHeader?: number;
  entropyTail?: number;
  signatureMatch?: boolean;
  signatureFamily?: string | null;
  fileSize?: number;
  fileType?: string | null;
  layerBreakdown?: { signatures: number; entropy: number; peStructure: number; behavior: number };
  yaraMatchedCount?: number;
  yaraTotalScore?: number;
  chainCount?: number;
  chainScore?: number;
  detectionReasons?: string[];
  verdictReasonEn?: string;
  verdictReasonAr?: string;
}

// fetch scan history filtered by the given username
export async function fetchScans(username?: string): Promise<ScanResult[]> {
  try {
    const url = username
      ? `${API_BASE_URL}/api/scans?username=${encodeURIComponent(username)}`
      : `${API_BASE_URL}/api/scans`
    const res = await fetch(url)
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

// delete all scan records for a specific user (or all if no username given)
export async function clearScansDB(username?: string): Promise<void> {
  try {
    const url = username
      ? `${API_BASE_URL}/api/scans?username=${encodeURIComponent(username)}`
      : `${API_BASE_URL}/api/scans`
    await fetch(url, { method: 'DELETE' })
    window.dispatchEvent(new Event("scans-updated"))
  } catch {}
}

// delete ransomware alerts only (keeps benign scan logs)
export async function clearAlertsDB(username?: string): Promise<boolean> {
  try {
    const url = username
      ? `${API_BASE_URL}/api/alerts?username=${encodeURIComponent(username)}`
      : `${API_BASE_URL}/api/alerts`
    const res = await fetch(url, { method: 'DELETE' })
    if (!res.ok) return false
    window.dispatchEvent(new Event("scans-updated"))
    return true
  } catch {
    return false
  }
}

// fire a global event so all open pages know to reload their scan data
export function notifyUpdate() {
  window.dispatchEvent(new Event("scans-updated"))
}
