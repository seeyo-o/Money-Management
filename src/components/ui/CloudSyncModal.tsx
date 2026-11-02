import React, { useState, useRef } from 'react';
import {
  X,
  Cloud,
  HardDrive,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Smartphone,
  Laptop,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ isOpen, onClose }) => {
  const { isFirebaseLive, user } = useAuth();
  const { exportDataJSON, importDataJSON } = useFinance();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const envVarKeys = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
  ];

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadBackup = async () => {
    setIsExporting(true);
    try {
      const json = await exportDataJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `rasio-backup-${user?.email?.split('@')[0] || 'data'}-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal mengekspor data.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);
    setImportStatus(null);

    try {
      const text = await file.text();
      const res = await importDataJSON(text);
      if (res.success) {
        setImportStatus(
          `Berhasil memulihkan ${res.stats?.wallets || 0} dompet, ${res.stats?.categories || 0} kategori anggaran, dan ${res.stats?.transactions || 0} transaksi!`
        );
      } else {
        setImportError(res.error || 'Gagal memulihkan file cadangan.');
      }
    } catch (err: unknown) {
      setImportError((err as Error).message || 'Gagal membaca file JSON.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-modal border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl border ${
                isFirebaseLive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {isFirebaseLive ? <Cloud size={20} /> : <HardDrive size={20} />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Sinkronisasi Data (Cloud & Perangkat)</span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    isFirebaseLive
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {isFirebaseLive ? 'Cloud Firestore Aktif' : 'Demo Storage (Lokal)'}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Penyelarasan pembukuan antara Laptop, Handphone (HP), dan Cloud Database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Diagnostic Box: Why Laptop has data but Phone is 0 */}
          {!isFirebaseLive && (
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                <span>Penyebab Data di HP Jadi Nol (Berbeda dengan Laptop):</span>
              </div>
              <p className="text-amber-800 leading-relaxed">
                Karena repository GitHub Anda bersifat <strong>Public</strong>, file <code>.env</code> lokal yang berisi kunci Firebase secara otomatis diabaikan demi keamanan (agar kunci rahasia tidak bocor ke publik).
              </p>
              <p className="text-amber-800 leading-relaxed">
                Akibatnya, Vercel belum memiliki variabel tersebut dan menjalankan aplikasi dalam mode <strong>Demo Storage (Penyimpanan Memori Browser Lokal)</strong>. Data yang Anda masukkan di laptop tersimpan di memori laptop, sehingga browser HP yang terpisah belum memilikinya.
              </p>
            </div>
          )}

          {isFirebaseLive && (
            <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>Cloud Firestore Terhubung & Sinkron</span>
              </div>
              <p className="text-emerald-800 leading-relaxed">
                Aplikasi Anda terhubung langsung ke Firebase Cloud Database. Segala transaksi, dompet, dan alokasi yang Anda catat di laptop akan otomatis muncul di HP Anda secara real-time.
              </p>
            </div>
          )}

          {/* Quick Transfer Option (Ekspor / Impor JSON) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Solusi Cepat 10 Detik: Pindahkan Data via JSON
                </h4>
                <p className="text-[11px] text-slate-500">
                  Ekspor data dari laptop, kirim ke HP (via WA/Telegram), lalu impor langsung di HP
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadBackup}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                <Download size={14} className="text-teal-400" />
                <span>{isExporting ? 'Mengunduh...' : 'Unduh Cadangan JSON (Dari Laptop)'}</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold shadow-subtle transition disabled:opacity-50"
              >
                <Upload size={14} className="text-slate-500" />
                <span>{isImporting ? 'Memulihkan...' : 'Impor & Pulihkan Data JSON (Di HP)'}</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {importStatus && (
              <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-800 font-semibold">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <span>{importStatus}</span>
              </div>
            )}

            {importError && (
              <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-800 font-semibold">
                <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                <span>{importError}</span>
              </div>
            )}
          </div>

          {/* Permanent Cloud Sync Instructions */}
          {!isFirebaseLive && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Cloud size={15} className="text-teal-700" />
                  <span>Solusi Permanen: Hubungkan Firebase ke Vercel (1 Menit)</span>
                </h4>
              </div>

              <div className="text-xs text-slate-600 space-y-2 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200">
                <p>
                  <strong>Langkah 1:</strong> Buka dashboard Vercel Anda di{' '}
                  <a
                    href="https://vercel.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-teal-700 font-bold underline inline-flex items-center gap-0.5"
                  >
                    vercel.com <ExternalLink size={10} />
                  </a>{' '}
                  dan pilih proyek <strong>Money-Management</strong>.
                </p>
                <p>
                  <strong>Langkah 2:</strong> Buka tab <strong>Settings</strong> &rarr; pilih menu <strong>Environment Variables</strong>.
                </p>
                <p>
                  <strong>Langkah 3:</strong> Masukkan 6 variabel berikut (nilainya ada di file <code>.env</code> laptop Anda):
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                  {envVarKeys.map((k) => (
                    <div
                      key={k}
                      className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[10px] text-slate-800"
                    >
                      <span className="truncate">{k}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(k)}
                        className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition"
                        title="Salin Nama Variabel"
                      >
                        {copiedKey === k ? (
                          <Check size={12} className="text-emerald-600" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>

                <p className="pt-1">
                  <strong>Langkah 4:</strong> Buka tab <strong>Deployments</strong> di Vercel &rarr; klik ikon titik tiga (•••) pada deployment terbaru &rarr; pilih <strong>Redeploy</strong>.
                </p>
                <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-lg text-teal-900 font-medium text-[11px]">
                  ✨ <strong>Auto-Migrasi Aman:</strong> Saat Anda membuka Vercel di laptop setelah deploy, sistem kami akan <em>otomatis mendeteksi</em> data yang sudah Anda ketik di laptop dan mengunggahnya ke Cloud Firestore tanpa ada data yang hilang!
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
