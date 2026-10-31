import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { TransactionModal } from '../../features/transactions/TransactionModal';

export const AppShell: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        <Header
          pageTitle={getPageTitle(location.pathname)}
          onOpenAddModal={() => setIsAddModalOpen(true)}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
    </div>
  );
};
