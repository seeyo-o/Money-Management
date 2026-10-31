import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { BookkeepingReport } from '../../domain/types';
import { formatIDR, formatDateID } from '../../domain/formatters';

export function exportBookkeepingPDF(report: BookkeepingReport): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 16;

  // 1. KOP LAPORAN
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text('LAPORAN PEMBUKUAN & ARUS KAS PRIBADI', 14, currentY);

  currentY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text(`Periode: ${report.periodLabel}`, 14, currentY);
  doc.text(`Email Pemilik: ${report.userEmail}`, 105, currentY);

  currentY += 4.5;
  doc.text(`Dicetak Pada: ${formatDateID(report.generatedAt)}`, 14, currentY);
  doc.text('Mata Uang: Indonesian Rupiah (IDR)', 105, currentY);

  // Divider Line
  currentY += 4;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(14, currentY, pageWidth - 14, currentY);
  currentY += 6;

  // 2. TABEL RINGKASAN EKSEKUTIF (Neraca Arus Kas)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('I. RINGKASAN EKSEKUTIF & MUTASI KAS BULANAN', 14, currentY);
  currentY += 3;

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [['Komponen Neraca Kas', 'Nominal (IDR)', 'Keterangan']],
    body: [
      ['Saldo Awal Periode', formatIDR(report.initialBalance), 'Saldo kas dan bank di awal bulan'],
      ['Total Pemasukan (Debit)', `+${formatIDR(report.totalIncomeDebit)}`, 'Akumulasi gaji, freelance, dan penyesuaian kas'],
      ['Total Pengeluaran (Kredit)', `-${formatIDR(report.totalExpenseCredit)}`, 'Seluruh belanja kebutuhan pokok dan gaya hidup'],
      ['Total Biaya Admin Mutasi', formatIDR(report.totalAdminFees), 'Biaya admin top-up e-wallet dan perbankan'],
      ['Arus Kas Bersih (Net Cashflow)', formatIDR(report.netCashflow), report.netCashflow >= 0 ? 'Surplus Operasional' : 'Defisit Operasional'],
      ['Saldo Akhir Periode', formatIDR(report.finalBalance), 'Posisi kas akhir periode setelah mutasi'],
    ],
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 1.8,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55 },
      1: { halign: 'right', fontStyle: 'bold', cellWidth: 45 },
      2: { textColor: [100, 116, 139] },
    },
    margin: { left: 14, right: 14 },
  });

  // @ts-expect-error autoTable plugin dynamic property
  currentY = doc.lastAutoTable.finalY + 6;

  // 3. TABEL RINCIAN SALDO AKHIR PER DOMPET
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('II. RINCIAN SALDO AKHIR PER DOMPET (MULTI-WALLET)', 14, currentY);
  currentY += 3;

  const walletRows = report.walletBalances.map((w) => [
    w.name,
    w.category === 'BANK' ? 'Rekening Bank Utama' : w.category === 'EWALLET' ? 'E-Wallet Harian' : 'Uang Tunai (Cash)',
    formatIDR(w.balance),
  ]);

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [['Nama Akun / Dompet', 'Tipe Instrumen', 'Saldo Akhir (IDR)']],
    body: walletRows,
    headStyles: {
      fillColor: [15, 118, 110],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 1.8,
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      2: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  // @ts-expect-error autoTable plugin dynamic property
  currentY = doc.lastAutoTable.finalY + 6;

  // 4. TABEL POSISI TABUNGAN BUDGET (SINKING FUND & BRANKAS CADANGAN)
  if (report.vaultReserves && report.vaultReserves.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('III. POSISI BRANKAS CADANGAN & TABUNGAN BUDGET (SINKING FUND)', 14, currentY);
    currentY += 3;

    const vaultRows = report.vaultReserves.map((v) => [
      v.name,
      v.mode === 'SINKING_FUND' ? 'Sinking Fund (Tabungan Berjangka)' : 'Anggaran Rutin (Strict Cap)',
      formatIDR(v.monthlyPlanCap),
      formatIDR(v.accumulatedVaultReserve),
      formatIDR(v.totalBackedCash),
      v.targetFundAmount ? formatIDR(v.targetFundAmount) : '-',
    ]);

    autoTable(doc, {
      startY: currentY,
      theme: 'grid',
      head: [['Kategori Budget', 'Mode Sistem', 'Target Rutin/Cap', 'Cadangan Vault', 'Total Terkumpul', 'Target Dana']],
      body: vaultRows,
      headStyles: {
        fillColor: [79, 70, 229], // Indigo 600
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        cellPadding: 2,
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [30, 41, 59],
        cellPadding: 1.8,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { cellWidth: 42 },
        2: { halign: 'right', cellWidth: 25 },
        3: { halign: 'right', cellWidth: 25 },
        4: { halign: 'right', fontStyle: 'bold', cellWidth: 26 },
        5: { halign: 'right', cellWidth: 24 },
      },
      margin: { left: 14, right: 14 },
    });

    // @ts-expect-error autoTable plugin dynamic property
    currentY = doc.lastAutoTable.finalY + 6;
  }

  // 5. AUDIT LOG REALOKASI DARURAT ANTAR-BUDGET (WORST-CASE LOG)
  if (report.emergencyReallocations && report.emergencyReallocations.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(225, 29, 72); // Rose 600
    doc.text('IV. AUDIT LOG REALOKASI DARURAT ANTAR-BUDGET (WORST-CASE OVERRIDE)', 14, currentY);
    currentY += 3;

    const emRows = report.emergencyReallocations.map((e) => [
      e.date,
      e.fromBudgetName || 'Sumber',
      e.toBudgetName || 'Tujuan',
      formatIDR(e.amount),
      e.reason || '-',
    ]);

    autoTable(doc, {
      startY: currentY,
      theme: 'grid',
      head: [['Tanggal', 'Diambil Dari', 'Dialokasikan Ke', 'Nominal', 'Alasan Darurat']],
      body: emRows,
      headStyles: {
        fillColor: [225, 29, 72],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        cellPadding: 2,
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [30, 41, 59],
        cellPadding: 1.8,
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 35 },
        2: { cellWidth: 35 },
        3: { halign: 'right', fontStyle: 'bold', cellWidth: 25 },
        4: { cellWidth: 67 },
      },
      margin: { left: 14, right: 14 },
    });

    // @ts-expect-error autoTable plugin dynamic property
    currentY = doc.lastAutoTable.finalY + 6;
  }

  // 6. TABEL JURNAL BUKU KAS (GENERAL LEDGER)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('V. JURNAL BUKU KAS KRONOLOGIS (GENERAL LEDGER)', 14, currentY);
  currentY += 3;

  const ledgerRows = report.ledgerEntries.map((e) => [
    String(e.no),
    e.date,
    e.description,
    e.categoryName,
    e.walletName,
    e.debit > 0 ? formatIDR(e.debit, false) : '-',
    e.credit > 0 ? formatIDR(e.credit, false) : '-',
    formatIDR(e.runningBalance, false),
  ]);

  autoTable(doc, {
    startY: currentY,
    theme: 'striped',
    head: [['No', 'Tanggal', 'Keterangan Transaksi', 'Kategori', 'Akun', 'Masuk (Debit)', 'Keluar (Kredit)', 'Saldo Berjalan']],
    body: ledgerRows,
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 1.8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 18 },
      2: { cellWidth: 50 },
      3: { cellWidth: 26 },
      4: { cellWidth: 24 },
      5: { halign: 'right', cellWidth: 20 },
      6: { halign: 'right', cellWidth: 20 },
      7: { halign: 'right', cellWidth: 22, fontStyle: 'bold' },
    },
    margin: { left: 10, right: 10 },
    showHead: 'everyPage',
  });

  // Footer page numbers
  // @ts-expect-error jsPDF page count
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Halaman ${i} dari ${totalPages} — Dokumen Pembukuan Resmi Rasio FinTech (Dual-Balance & Sinking Fund)`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  doc.save(`Laporan-Buku-Kas-${report.periodMonth}.pdf`);
}
