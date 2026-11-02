import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { HardDrive } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { TransactionModal } from '../../features/transactions/TransactionModal';
import { CloudSyncModal } from '../ui/CloudSyncModal';
import { useAuth } from '../../context/AuthContext';

export const AppShell: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);
  const { isFirebaseLive } = useAuth();
  const location = useLocation();

  const getPageTitle = (pathname: string): string => {
    if (pathname.includes('/transactions')) return 'Transaksi & Mutasi';
    if (pathname.includes('/wallets')) return 'Dompet & Rekonsiliasi';
    if (pathname.includes('/budgets')) return 'Perencanaan Anggaran';
    if (pathname.includes('/bookkeeping')) return 'Laporan Pembukuan & Cetak PDF';
    return 'Dashboard & Analisis Rasional';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex font-sans">
      {/* Desktop Sidebar */}
      <Sidebar onOpenCloudSync={() => setIsCloudSyncOpen(true)} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        <Header
          pageTitle={getPageTitle(location.pathname)}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onOpenCloudSync={() => setIsCloudSyncOpen(true)}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {!isFirebaseLive && (
            <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 via-amber-50/80 to-orange-50/70 border border-amber-200/90 rounded-2xl shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5 sm:mt-0">
                  <HardDrive size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-950 flex items-center gap-2">
                    <span>Mode Penyimpanan Demo (Lokal Browser)</span>
                    <span className="text-[10px] font-extrabold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full">
                      Offline Storage
                    </span>
                  </h4>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    Data Anda saat ini tersimpan di browser perangkat ini dan belum terhubung ke Cloud Database (itulah sebabnya di HP Anda belum muncul). Hubungkan Firebase di Vercel atau gunakan fitur ekspor/impor cadangan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCloudSyncOpen(true)}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition shrink-0 self-start sm:self-auto cursor-pointer"
              >
                Panduan Sinkronisasi Laptop & HP
              </button>
            </div>
          )}

          <Outlet context={{ onOpenAddModal: () => setIsAddModalOpen(true) }} />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav onOpenAddModal={() => setIsAddModalOpen(true)} />

      {/* Global Quick Add Transaction Modal */}
      <TransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Cloud Sync & Backup Modal */}
      <CloudSyncModal
        isOpen={isCloudSyncOpen}
        onClose={() => setIsCloudSyncOpen(false)}
      />
    </div>
  );
};
