import React, { useState, useMemo } from 'react';
import {
  Printer,
  Download,
  Filter,
  FileSpreadsheet,
  Calendar,
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  Vault,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { generateBookkeepingReport } from '../../domain/bookkeepingEngine';
import { formatIDR, formatDateID } from '../../domain/formatters';
import { exportBookkeepingPDF } from './pdfGenerator';
import { MonthPicker } from '../../components/ui/MonthPicker';

export const BookkeepingPage: React.FC = () => {
  const { wallets, categories, transactions, budgetLedger, selectedMonth, setSelectedMonth } =
    useFinance();
  const { user } = useAuth();

  const [selectedWalletFilter, setSelectedWalletFilter] = useState<string>('all');

  const report = useMemo(() => {
    return generateBookkeepingReport(
      wallets,
      categories,
      transactions,
      selectedMonth,
      user?.email || 'user@example.com',
      selectedWalletFilter,
      budgetLedger
    );
  }, [wallets, categories, transactions, selectedMonth, user, selectedWalletFilter, budgetLedger]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    exportBookkeepingPDF(report);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar (Hidden on physical print) */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-teal-400 flex items-center justify-center shrink-0">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Laporan Pembukuan Kas & Export PDF A4
            </h2>
            <p className="text-xs text-slate-500">
              General Ledger formal dengan running balance, brankas sinking fund & neraca arus kas
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month & Year Picker */}
          <MonthPicker
            value={selectedMonth}
            onChange={setSelectedMonth}
            align="left"
          />

          {/* Account Filter */}
          <select
            value={selectedWalletFilter}
            onChange={(e) => setSelectedWalletFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-700"
          >
            <option value="all">Semua Akun / Dompet</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.category})
              </option>
            ))}
          </select>

          {/* Action: Direct Print */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold shadow-subtle transition"
          >
            <Printer size={15} className="text-slate-500" />
            <span>Cetak Langsung</span>
          </button>

          {/* Action: Download PDF A4 */}
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm active:scale-95 transition"
          >
            <Download size={15} className="text-teal-400" />
            <span>Download PDF (A4)</span>
          </button>
        </div>
      </div>

      {/* Screen & Printable Document Layout */}
      <div className="printable-report bento-card p-6 sm:p-10 bg-white border border-slate-200 shadow-modal max-w-5xl mx-auto space-y-8">
        {/* I. Kop Laporan Resmi */}
        <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                Sistem Akuntansi Pribadi
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Laporan Pembukuan & Arus Kas Pribadi
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Kompilasi General Ledger, Neraca Likuiditas, Brankas Sinking Fund & Realokasi Darurat
            </p>
          </div>

          <div className="text-xs text-slate-500 sm:text-right space-y-1">
            <p>
              <strong className="text-slate-800">Periode:</strong> {report.periodLabel}
            </p>
            <p>
              <strong className="text-slate-800">Pemilik Akun:</strong> {report.userEmail}
            </p>
            <p>
              <strong className="text-slate-800">Tanggal Cetak:</strong>{' '}
              {formatDateID(report.generatedAt)}
            </p>
          </div>
        </div>

        {/* II. Neraca Arus Kas Eksekutif */}
        <div className="space-y-3">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
            I. Ringkasan Eksekutif & Neraca Arus Kas
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-medium text-slate-400 block mb-0.5">Saldo Awal:</span>
              <strong className="text-xs font-bold text-slate-800 tabular-numbers">
                {formatIDR(report.initialBalance)}
              </strong>
            </div>

            <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl">
              <span className="text-[10px] font-medium text-emerald-700 block mb-0.5">Debit (Masuk):</span>
              <strong className="text-xs font-bold text-emerald-800 tabular-numbers">
                +{formatIDR(report.totalIncomeDebit)}
              </strong>
            </div>

            <div className="p-3 bg-rose-50/60 border border-rose-200/80 rounded-xl">
              <span className="text-[10px] font-medium text-rose-700 block mb-0.5">Kredit (Keluar):</span>
              <strong className="text-xs font-bold text-rose-800 tabular-numbers">
                -{formatIDR(report.totalExpenseCredit)}
              </strong>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-medium text-slate-400 block mb-0.5">Biaya Admin:</span>
              <strong className="text-xs font-bold text-rose-600 tabular-numbers">
                {formatIDR(report.totalAdminFees)}
              </strong>
            </div>

            <div className="p-3 bg-indigo-50/60 border border-indigo-200/80 rounded-xl">
              <span className="text-[10px] font-medium text-indigo-700 block mb-0.5">Net Cashflow:</span>
              <strong
                className={`text-xs font-bold tabular-numbers ${
                  report.netCashflow >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {report.netCashflow >= 0 ? '+' : ''}
                {formatIDR(report.netCashflow)}
              </strong>
            </div>

            <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xs">
              <span className="text-[10px] font-medium text-teal-300 block mb-0.5">Saldo Akhir:</span>
              <strong className="text-xs font-black text-white tabular-numbers">
                {formatIDR(report.finalBalance)}
              </strong>
            </div>
          </div>
        </div>

        {/* III. Rincian Saldo Akhir Per Dompet */}
        <div className="space-y-3">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
            II. Rincian Posisi Saldo per Dompet (Multi-Wallet)
          </h2>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="py-2.5 px-4">Nama Akun / Dompet</th>
                  <th className="py-2.5 px-4">Kategori Akun</th>
                  <th className="py-2.5 px-4 text-right">Saldo Akhir Periode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {report.walletBalances.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 font-semibold">{w.name}</td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                      {w.category === 'BANK'
                        ? 'Rekening Bank Utama'
                        : w.category === 'EWALLET'
                        ? 'Dompet Digital (E-Wallet)'
                        : 'Uang Tunai (Cash)'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold tabular-numbers text-slate-900">
                      {formatIDR(w.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* IV. Posisi Brankas Cadangan & Tabungan Budget (Sinking Fund) */}
        {report.vaultReserves && report.vaultReserves.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Vault size={14} className="text-indigo-600" />
              <span>III. Posisi Brankas Cadangan & Tabungan Budget (Sinking Fund)</span>
            </h2>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-indigo-50 border-b border-indigo-100 text-indigo-900 font-bold">
                  <tr>
                    <th className="py-2 px-3">Kategori Budget</th>
                    <th className="py-2 px-3">Mode Sistem</th>
                    <th className="py-2 px-3 text-right">Target Rutin / Cap</th>
                    <th className="py-2 px-3 text-right">Cadangan Vault</th>
                    <th className="py-2 px-3 text-right">Total Terkumpul</th>
                    <th className="py-2 px-3 text-right">Target Dana</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {report.vaultReserves.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-semibold">{v.name}</td>
                      <td className="py-2 px-3 text-[11px] text-slate-500">
                        {v.mode === 'SINKING_FUND'
                          ? 'Sinking Fund (Tabungan Berjangka)'
                          : 'Anggaran Rutin (Strict Cap)'}
                      </td>
                      <td className="py-2 px-3 text-right font-medium tabular-numbers">
                        {formatIDR(v.monthlyPlanCap)}
                      </td>
                      <td className="py-2 px-3 text-right font-medium tabular-numbers text-indigo-600">
                        {formatIDR(v.accumulatedVaultReserve)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold tabular-numbers text-slate-900">
                        {formatIDR(v.totalBackedCash)}
                      </td>
                      <td className="py-2 px-3 text-right font-medium tabular-numbers text-slate-500">
                        {v.targetFundAmount ? formatIDR(v.targetFundAmount) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* V. Audit Log Realokasi Darurat Antar-Budget (Worst-Case Override) */}
        {report.emergencyReallocations && report.emergencyReallocations.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
              <AlertTriangle size={14} />
              <span>IV. Audit Log Realokasi Darurat Antar-Budget (Worst-Case Override)</span>
            </h2>

            <div className="overflow-x-auto rounded-xl border border-rose-200 bg-rose-50/30">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-rose-100/70 border-b border-rose-200 text-rose-900 font-bold">
                  <tr>
                    <th className="py-2 px-3 w-24">Tanggal</th>
                    <th className="py-2 px-3">Diambil Dari</th>
                    <th className="py-2 px-3">Dialokasikan Ke</th>
                    <th className="py-2 px-3 text-right">Nominal</th>
                    <th className="py-2 px-3">Alasan Darurat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-100 text-slate-800">
                  {report.emergencyReallocations.map((e) => (
                    <tr key={e.id}>
                      <td className="py-2 px-3 font-mono text-slate-600 text-[11px]">{e.date}</td>
                      <td className="py-2 px-3 font-semibold text-rose-700">
                        {e.fromBudgetName || 'Sumber'}
                      </td>
                      <td className="py-2 px-3 font-semibold text-emerald-700">
                        {e.toBudgetName || 'Tujuan'}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-numbers">
                        {formatIDR(e.amount)}
                      </td>
                      <td className="py-2 px-3 text-slate-600 text-[11px] italic">
                        {e.reason || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VI. Jurnal Buku Kas Kronologis (General Ledger) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              V. Jurnal Buku Kas Kronologis (General Ledger)
            </h2>
            <span className="text-[11px] text-slate-400 font-medium">
              Total {report.ledgerEntries.length} entri jurnal
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white font-bold text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 text-center w-10">No</th>
                  <th className="py-2.5 px-3 w-24">Tanggal</th>
                  <th className="py-2.5 px-4">Keterangan Transaksi</th>
                  <th className="py-2.5 px-3">Kategori</th>
                  <th className="py-2.5 px-3">Akun</th>
                  <th className="py-2.5 px-3 text-right">Masuk (Debit)</th>
                  <th className="py-2.5 px-3 text-right">Keluar (Kredit)</th>
                  <th className="py-2.5 px-4 text-right">Saldo Berjalan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {report.ledgerEntries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Tidak ada transaksi pada periode ini.
                    </td>
                  </tr>
                ) : (
                  report.ledgerEntries.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50 transition odd:bg-white even:bg-slate-50/40"
                    >
                      <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {row.no}
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">
                        {row.date}
                      </td>
                      <td className="py-2 px-4 font-medium text-slate-900">
                        {row.description}
                      </td>
                      <td className="py-2 px-3 text-slate-500 text-[11px]">
                        {row.categoryName}
                      </td>
                      <td className="py-2 px-3 text-slate-600 text-[11px] font-semibold">
                        {row.walletName}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-emerald-600 tabular-numbers">
                        {row.debit > 0 ? `+${formatIDR(row.debit, false)}` : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-rose-600 tabular-numbers">
                        {row.credit > 0 ? `-${formatIDR(row.credit, false)}` : '-'}
                      </td>
                      <td className="py-2 px-4 text-right font-bold text-slate-900 tabular-numbers">
                        {formatIDR(row.runningBalance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* VII. Catatan Kaki */}
        <div className="pt-6 border-t border-slate-200 text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>Dicetak otomatis melalui platform Rasio — Personal Finance & Forecasting.</span>
          <span>Dokumen Resmi Buku Kas Pribadi • Format Cetak Standar A4</span>
        </div>
      </div>
    </div>
  );
};
