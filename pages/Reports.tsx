
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Download, 
  Calendar, 
  Tag, 
  Building2,
  Loader2,
  FileText,
  ChevronDown,
  Clock,
  Layers,
  ArrowDownCircle,
  ArrowUpCircle,
  Info,
  CalendarDays,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  File as FilePdf,
  Activity,
  Banknote,
  Users,
  Edit3
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { stockService } from '../lib/services/stockService';
import { Customer, Supplier, StockMovement, MovementType } from '../types';
import { StatementSkeleton } from '../components/Skeleton';
import { formatCurrency, cn } from '../lib/utils';

import { useSearchParams, useNavigate } from 'react-router-dom';

type ReportTab = 'TODAY' | 'MONTHLY' | 'PARTY' | 'CATEGORY' | 'TYPE' | 'CUSTOM' | 'STOCK_REPORT' | 'SUPPLIER_REPORT' | 'CUSTOMER_REPORT';

export const Reports: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ReportTab>((searchParams.get('tab') as ReportTab) || 'TODAY');
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allMovements, setAllMovements] = useState<StockMovement[]>([]);
  const [isExporting, setIsExporting] = useState<'pdf' | 'excel' | null>(null);

  // Filter Selection States
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedMovementType, setSelectedMovementType] = useState<MovementType | ''>('');
  const [dateRange, setDateRange] = useState({ 
    start: new Date().toISOString().split('T')[0], 
    end: new Date().toISOString().split('T')[0] 
  });

  const categories = stockService.getCategories().filter(c => c !== 'OTHERS');
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const years = ["2024", "2025", "2026"];

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const [c, v, m] = await Promise.all([
      stockService.getCustomers(),
      stockService.getSuppliers(),
      stockService.getMovements()
    ]);
    setCustomers(c);
    setSuppliers(v);
    setAllMovements(m);
    setLoading(false);
  };

  const filteredMovements = useMemo(() => {
    return allMovements.filter(m => {
      const mDate = new Date(m.date);
      const today = new Date();
      
      if (activeTab === 'TODAY') {
        return mDate.toDateString() === today.toDateString();
      }
      
      if (activeTab === 'SUPPLIER_REPORT') {
        const matchesType = selectedMovementType ? m.type === selectedMovementType : true;
        return !!m.supplier_id && matchesType;
      }
      
      if (activeTab === 'CUSTOMER_REPORT') {
        const matchesType = selectedMovementType ? m.type === selectedMovementType : true;
        return !!m.customer_id && matchesType;
      }

      if (activeTab === 'MONTHLY') {
        const mYear = mDate.getFullYear().toString();
        const mMonthName = mDate.toLocaleString('default', { month: 'long' });
        return mYear === selectedYear && mMonthName === selectedMonth;
      }
      
      if (activeTab === 'PARTY') {
        const partyId = m.type === MovementType.IN ? m.supplier_id : m.customer_id;
        return selectedPartyId ? partyId === selectedPartyId : true;
      }
      
      if (activeTab === 'CATEGORY') {
        return selectedCategoryId ? m.category === selectedCategoryId : true;
      }

      if (activeTab === 'TYPE') {
        return selectedMovementType ? m.type === selectedMovementType : true;
      }
      
      if (activeTab === 'CUSTOM') {
        const startMatch = !dateRange.start || m.date >= dateRange.start;
        const endMatch = !dateRange.end || m.date <= dateRange.end;
        return startMatch && endMatch;
      }
      return true;
    });
  }, [allMovements, activeTab, selectedYear, selectedMonth, selectedPartyId, selectedCategoryId, selectedMovementType, dateRange]);

  const stats = useMemo(() => {
    const totalIn = filteredMovements
      .filter(m => m.type === MovementType.IN)
      .reduce((sum, m) => sum + m.nos, 0);
    const totalOut = filteredMovements
      .filter(m => m.type === MovementType.OUT)
      .reduce((sum, m) => sum + m.nos, 0);
    const cashIn = filteredMovements
      .filter(m => m.type === MovementType.IN)
      .reduce((sum, m) => sum + (m.amount || 0), 0);
    const cashOut = filteredMovements
      .filter(m => m.type === MovementType.OUT)
      .reduce((sum, m) => sum + (m.amount || 0), 0);
    
    return {
      totalIn,
      totalOut,
      netNos: totalIn - totalOut,
      cashIn,
      cashOut,
      netCash: cashIn - cashOut
    };
  }, [filteredMovements]);

  const getPartyName = (m: StockMovement) => {
    if (m.type === MovementType.IN) {
      return suppliers.find(v => v.id === m.supplier_id)?.name || m.supplier_id || 'INTERNAL';
    }
    return customers.find(c => c.id === m.customer_id)?.name || m.customer_id || 'INTERNAL';
  };

  const getPartyNameById = (id: string) => {
    const party = suppliers.find(v => v.id === id) || customers.find(c => c.id === id);
    return party?.name || id;
  };

  const handleExportPdf = () => {
    if (activeTab === 'STOCK_REPORT') {
      exportStockReportPdf();
      return;
    }
    if (filteredMovements.length === 0) return;
    setIsExporting('pdf');
    
    setTimeout(() => {
      const doc = new jsPDF('l', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Sort movements: Top to Bottom (Oldest to Newest)
      const sortedMovements = [...filteredMovements].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      });

      // Header Branding
      doc.setFillColor(15, 23, 42); // slate-900 for more corporate look
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      doc.text("SR INFOTECH UAE", 15, 18);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("CORPORATE INVENTORY & FINANCIAL STATEMENT", 15, 26);
      doc.text("AUTHORIZED AUDIT DOCUMENT", 15, 32);
      
      doc.setFontSize(14);
      doc.text("ACCOUNT STATEMENT", pageWidth - 15, 22, { align: 'right' });
      doc.setFontSize(8);
      doc.text(`GENERATED ON: ${new Date().toLocaleString().toUpperCase()}`, pageWidth - 15, 32, { align: 'right' });

      // Report Parameters Section
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("STATEMENT DETAILS:", 15, 52);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`REPORT TYPE: ${activeTab.replace('_', ' ').toUpperCase()}`, 15, 58);
      
      let paramY = 64;
      if (activeTab === 'MONTHLY') {
        doc.text(`PERIOD: ${selectedMonth.toUpperCase()} ${selectedYear}`, 15, paramY);
        paramY += 6;
      } else if (activeTab === 'PARTY') {
        doc.text(`PARTY: ${selectedPartyId ? getPartyNameById(selectedPartyId).toUpperCase() : 'ALL PARTIES'}`, 15, paramY);
        paramY += 6;
      } else if (activeTab === 'CATEGORY') {
        doc.text(`CATEGORY: ${selectedCategoryId ? selectedCategoryId.toUpperCase() : 'ALL CATEGORIES'}`, 15, paramY);
        paramY += 6;
      } else if (activeTab === 'CUSTOM') {
        doc.text(`RANGE: ${dateRange.start} TO ${dateRange.end}`, 15, paramY);
        paramY += 6;
      }

      // --- OVERALL TOTALS BAR (MOVED TO TOP) ---
      const totalsY = paramY + 5;
      doc.setFillColor(241, 245, 249); // Light slate/blue
      doc.rect(15, totalsY, pageWidth - 30, 25, 'F');
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("OVERALL TOTALS (PIECES):", 20, totalsY + 8);
      
      doc.setFontSize(9);
      doc.text(`TOTAL OUT: ${stats.totalOut} PCS`, 80, totalsY + 8);
      doc.text(`TOTAL IN: ${stats.totalIn} PCS`, 120, totalsY + 8);
      
      if (stats.netNos >= 0) doc.setTextColor(16, 185, 129);
      else doc.setTextColor(225, 29, 72);
      doc.text(`BALANCE: ${stats.netNos} PCS`, 160, totalsY + 8);

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.text("OVERALL TOTALS (CASH):", 20, totalsY + 18);
      doc.setFontSize(9);
      doc.text(`TOTAL IN AMOUNT: ${stats.cashIn.toLocaleString()}`, 80, totalsY + 18);
      doc.text(`TOTAL OUT AMOUNT: ${stats.cashOut.toLocaleString()}`, 140, totalsY + 18);
      
      if (stats.netCash >= 0) doc.setTextColor(16, 185, 129);
      else doc.setTextColor(225, 29, 72);
      doc.text(`BALANCE PROFIT: ${stats.netCash.toLocaleString()}`, 210, totalsY + 18);

      // --- MAIN TRANSACTION TABLE ---
      const tableColumn = ["DATE", "PARTY NAME", "CATEGORY", "REMARKS", "IN QTY", "OUT QTY", "UNIT PRICE", "IN AMOUNT", "OUT AMOUNT"];
      
      const tableRows = sortedMovements.map(m => {
        const inQty = m.type === MovementType.IN ? m.nos : 0;
        const outQty = m.type === MovementType.OUT ? m.nos : 0;
        const inAmt = m.type === MovementType.IN ? (m.amount || 0) : 0;
        const outAmt = m.type === MovementType.OUT ? (m.amount || 0) : 0;
        
        return [
          m.date,
          getPartyName(m).toUpperCase(),
          m.category.toUpperCase(),
          (m.remarks || '').toUpperCase(),
          inQty > 0 ? inQty : '-',
          outQty > 0 ? outQty : '-',
          m.unit_price ? m.unit_price.toLocaleString() : '-',
          inAmt > 0 ? inAmt.toLocaleString() : '-',
          outAmt > 0 ? outAmt.toLocaleString() : '-'
        ];
      });

      // Calculate Totals
      const totalInQty = sortedMovements.reduce((sum, m) => sum + (m.type === MovementType.IN ? m.nos : 0), 0);
      const totalOutQty = sortedMovements.reduce((sum, m) => sum + (m.type === MovementType.OUT ? m.nos : 0), 0);
      const totalInAmt = sortedMovements.reduce((sum, m) => sum + (m.type === MovementType.IN ? (m.amount || 0) : 0), 0);
      const totalOutAmt = sortedMovements.reduce((sum, m) => sum + (m.type === MovementType.OUT ? (m.amount || 0) : 0), 0);

      autoTable(doc, {
        startY: totalsY + 35,
        head: [tableColumn],
        body: tableRows,
        foot: [[
          'TOTAL', 
          '', 
          '', 
          '',
          totalInQty, 
          totalOutQty, 
          '',
          totalInAmt.toLocaleString(), 
          totalOutAmt.toLocaleString()
        ]],
        theme: 'grid',
        styles: {
          lineWidth: 0.1,
          lineColor: [203, 213, 225],
          fontSize: 7,
          textColor: [30, 41, 59],
          cellPadding: 3
        },
        headStyles: { 
          fillColor: [15, 23, 42], 
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center'
        },
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 40, fontStyle: 'bold' },
          2: { cellWidth: 30 },
          3: { cellWidth: 'auto' },
          4: { cellWidth: 15, halign: 'center', textColor: [16, 185, 129], fontStyle: 'bold' },
          5: { cellWidth: 15, halign: 'center', textColor: [225, 29, 72], fontStyle: 'bold' },
          6: { cellWidth: 20, halign: 'right' },
          7: { cellWidth: 25, halign: 'right', textColor: [16, 185, 129] },
          8: { cellWidth: 25, halign: 'right', textColor: [225, 29, 72] }
        },
        didDrawPage: (data) => {
          const totalPages = doc.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          const footerText = `SR INFOTECH UAE CORPORATE STATEMENT | PAGE ${doc.getNumberOfPages()} | CONFIDENTIAL AUDIT DOCUMENT`;
          doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }
      });



      const finalY = (doc as any).lastAutoTable.finalY + 10;

      // --- SUMMARY SECTION ---
      const summaryY = finalY;
      if (summaryY > pageHeight - 60) doc.addPage();
      
      const currentSummaryY = summaryY > pageHeight - 60 ? 20 : summaryY;
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("SUMMARY BY CATEGORY", 15, currentSummaryY);

      // Category Summary Table
      const categoryTotals: Record<string, { in: number, out: number, amount: number }> = {};
      filteredMovements.forEach(m => {
        if (!categoryTotals[m.category]) categoryTotals[m.category] = { in: 0, out: 0, amount: 0 };
        categoryTotals[m.category].amount += (m.amount || 0);
        if (m.type === MovementType.OUT) categoryTotals[m.category].out += m.nos;
        else categoryTotals[m.category].in += m.nos;
      });

      const summaryRows = Object.entries(categoryTotals).map(([cat, vals]) => [
        cat.toUpperCase(),
        vals.out,
        vals.in,
        vals.in - vals.out
      ]);

      autoTable(doc, {
        startY: currentSummaryY + 5,
        head: [["CATEGORY", "TOTAL OUT", "TOTAL IN", "NET BALANCE"]],
        body: summaryRows,
        theme: 'grid',
        styles: {
          lineWidth: 0.1,
          lineColor: [226, 232, 240]
        },
        headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontSize: 8, halign: 'center' },
        bodyStyles: { fontSize: 8, fontStyle: 'bold' },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'center' },
          3: { halign: 'center' }
        },
        margin: { left: 15, right: 15 },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 3) {
            const val = parseInt(data.cell.text[0]);
            if (val > 0) data.cell.styles.textColor = [16, 185, 129];
            else if (val < 0) data.cell.styles.textColor = [225, 29, 72];
          }
        }
      });

      doc.save(`SR_STATEMENT_${activeTab}_${new Date().getTime()}.pdf`);
      setIsExporting(null);
    }, 1200);
  };

  const handleExportExcel = () => {
    if (activeTab === 'STOCK_REPORT') {
      exportStockReportExcel();
      return;
    }
    if (filteredMovements.length === 0) return;
    setIsExporting('excel');

    setTimeout(() => {
      const data = filteredMovements.map(m => ({
        DATE: m.date,
        TYPE: m.type === MovementType.IN ? 'PURCHASE' : 'SALE',
        PARTY: getPartyName(m).toUpperCase(),
        CATEGORY: m.category.toUpperCase(),
        "SALE (-)": m.type === MovementType.OUT ? m.nos : 0,
        "PURCHASE (+)": m.type === MovementType.IN ? m.nos : 0,
        UNIT_PRICE: m.unit_price || 0,
        WEIGHT_KG: m.weight || 0,
        AMOUNT_INR: m.amount || 0,
        REMARKS: (m.remarks || '').toUpperCase()
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Statement");
      XLSX.writeFile(wb, `SR_STATEMENT_${activeTab}_${new Date().getTime()}.xlsx`);
      setIsExporting(null);
    }, 1000);
  };

  const exportStockReportPdf = () => {
    setIsExporting('pdf');
    setTimeout(() => {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      doc.setFillColor(220, 38, 38);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("SR INFOTECH UAE", 15, 18);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("INVENTORY AUDIT SYSTEM", 15, 26);
      doc.text("PROFESSIONAL STOCK MANAGEMENT", 15, 32);
      doc.setFontSize(14);
      doc.text("CURRENT STOCK STATEMENT", pageWidth - 15, 22, { align: 'right' });
      doc.setFontSize(8);
      doc.text(`DATE: ${new Date().toLocaleString().toUpperCase()}`, pageWidth - 15, 32, { align: 'right' });

      const catSummary: Record<string, { in: number, out: number, amount: number }> = {};
      allMovements.forEach((m) => {
        if (!catSummary[m.category]) catSummary[m.category] = { in: 0, out: 0, amount: 0 };
        catSummary[m.category].amount += (m.amount || 0);
        if (m.type === MovementType.IN) catSummary[m.category].in += m.nos;
        else catSummary[m.category].out += m.nos;
      });

      const summaryData = Object.entries(catSummary).map(([cat, vals]) => [
        cat.toUpperCase(),
        vals.out,
        vals.in,
        vals.in - vals.out,
        (vals.amount || 0).toLocaleString()
      ]);

      autoTable(doc, {
        startY: 50,
        head: [['CATEGORY', 'TOTAL SALE', 'TOTAL PURCHASE', 'CURRENT STOCK', 'VALUE (INR)']],
        body: summaryData,
        theme: 'grid',
        styles: {
          lineWidth: 0.1,
          lineColor: [30, 41, 59],
          fontSize: 9
        },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 9, lineWidth: 0.1 },
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { halign: 'center' },
          2: { halign: 'center' },
          3: { halign: 'center', fontStyle: 'bold' },
          4: { halign: 'right' }
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 3) {
            const val = parseInt(data.cell.text[0]);
            if (val > 0) data.cell.styles.textColor = [16, 185, 129];
            else if (val < 0) data.cell.styles.textColor = [225, 29, 72];
          }
        }
      });

      const totalCashIn = allMovements.filter(m => m.type === MovementType.OUT).reduce((sum, m) => sum + (m.amount || 0), 0);
      const totalCashOut = allMovements.filter(m => m.type === MovementType.IN).reduce((sum, m) => sum + (m.amount || 0), 0);
      const netCashBalance = totalCashIn - totalCashOut;

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFillColor(241, 245, 249);
      doc.rect(15, finalY, pageWidth - 30, 15, 'F');
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text(`CASH IN: ${totalCashIn.toLocaleString()}`, 20, finalY + 9.5);
      doc.text(`CASH OUT: ${totalCashOut.toLocaleString()}`, 80, finalY + 9.5);
      
      if (netCashBalance >= 0) doc.setTextColor(16, 185, 129);
      else doc.setTextColor(225, 29, 72);
      doc.text(`BALANCE: ${netCashBalance.toLocaleString()}`, 140, finalY + 9.5);

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 20, doc.internal.pageSize.getHeight() - 10);
        doc.text("CONFIDENTIAL: SR INFOTECH UAE STOCK STATEMENT", 15, doc.internal.pageSize.getHeight() - 10);
      }

      doc.save(`SR_STOCK_STATEMENT_${new Date().toISOString().split('T')[0]}.pdf`);
      setIsExporting(null);
    }, 1000);
  };

  const exportStockReportExcel = () => {
    setIsExporting('excel');
    setTimeout(() => {
      const catSummary: Record<string, { in: number, out: number }> = {};
      allMovements.forEach((m) => {
        if (!catSummary[m.category]) catSummary[m.category] = { in: 0, out: 0 };
        if (m.type === MovementType.IN) catSummary[m.category].in += m.nos;
        else catSummary[m.category].out += m.nos;
      });

      const data = Object.entries(catSummary).map(([cat, vals]) => ({
        CATEGORY: cat.toUpperCase(),
        "TOTAL SALE": vals.out,
        "TOTAL PURCHASE": vals.in,
        "CURRENT STOCK": vals.in - vals.out
      }));

      // Add summary row
      const totalCashIn = allMovements.filter(m => m.type === MovementType.OUT).reduce((sum, m) => sum + (m.amount || 0), 0);
      const totalCashOut = allMovements.filter(m => m.type === MovementType.IN).reduce((sum, m) => sum + (m.amount || 0), 0);
      
      data.push({
        CATEGORY: "--- TOTALS ---",
        "TOTAL SALE": "",
        "TOTAL PURCHASE": "",
        "CURRENT STOCK": ""
      } as any);

      data.push({
        CATEGORY: "TOTAL CASH IN",
        "TOTAL SALE": totalCashIn,
        "TOTAL PURCHASE": "",
        "CURRENT STOCK": ""
      } as any);

      data.push({
        CATEGORY: "TOTAL CASH OUT",
        "TOTAL SALE": totalCashOut,
        "TOTAL PURCHASE": "",
        "CURRENT STOCK": ""
      } as any);

      data.push({
        CATEGORY: "NET CASH BALANCE",
        "TOTAL SALE": totalCashIn - totalCashOut,
        "TOTAL PURCHASE": "",
        "CURRENT STOCK": ""
      } as any);

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Stock Statement");
      XLSX.writeFile(wb, `SR_STOCK_STATEMENT_${new Date().getTime()}.xlsx`);
      setIsExporting(null);
    }, 800);
  };

  const handleEdit = (m: StockMovement) => {
    const path = m.type === MovementType.IN ? `/carry-in/${m.id}` : `/carry-out/${m.id}`;
    navigate(path);
  };

  if (loading) return <StatementSkeleton />;

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-700">
      <header className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Reports</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Financial Statements</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExportPdf}
            disabled={!!isExporting || filteredMovements.length === 0}
            className="w-10 h-10 flex items-center justify-center bg-red-600 text-white rounded-xl shadow-lg shadow-red-100 active:scale-95 transition-all disabled:opacity-50"
          >
            {isExporting === 'pdf' ? <Loader2 size={18} className="animate-spin" /> : <FilePdf size={18} />}
          </button>
          <button 
            onClick={handleExportExcel}
            disabled={!!isExporting || filteredMovements.length === 0}
            className="w-10 h-10 flex items-center justify-center bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-200 active:scale-95 transition-all disabled:opacity-50"
          >
            {isExporting === 'excel' ? <Loader2 size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
          </button>
        </div>
      </header>

      <div className="relative">
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as ReportTab)}
          className="w-full pl-6 pr-12 py-4 bg-white border border-slate-100 rounded-[24px] text-[11px] font-black uppercase tracking-widest text-slate-800 appearance-none outline-none focus:ring-4 focus:ring-slate-900/5 transition shadow-soft"
        >
          <option value="TODAY">Today's Activity</option>
          <option value="MONTHLY">Monthly Audit</option>
          <option value="PARTY">Party Ledger</option>
          <option value="SUPPLIER_REPORT">All Suppliers</option>
          <option value="CUSTOMER_REPORT">All Customers</option>
          <option value="CATEGORY">Category Breakdown</option>
          <option value="STOCK_REPORT">Stock Statement</option>
          <option value="TYPE">Movement Type</option>
          <option value="CUSTOM">Custom Range</option>
        </select>
        <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
      </div>

      <section className="space-y-4">
        <div className="bg-white p-6 rounded-[32px] border border-slate-50 shadow-soft">
          <div className="flex items-center justify-between mb-6">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Configuration</h3>
             <button onClick={load} className="p-2 text-slate-400 active:rotate-180 transition-all duration-500">
                <RefreshCw size={16} />
             </button>
          </div>

          <div className="space-y-4">
            {activeTab === 'STOCK_REPORT' && (
              <div className="flex items-center bg-blue-50/50 p-4 rounded-2xl border border-blue-50">
                <Layers className="text-blue-500 mr-3" size={20} />
                <p className="text-[10px] font-black text-blue-900 uppercase">Current inventory balance statement.</p>
              </div>
            )}

            {activeTab === 'MONTHLY' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black text-slate-800 appearance-none outline-none uppercase">
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                </div>
                <div className="relative">
                  <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black text-slate-800 appearance-none outline-none uppercase">
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                </div>
              </div>
            )}

            {(activeTab === 'SUPPLIER_REPORT' || activeTab === 'CUSTOMER_REPORT' || activeTab === 'TYPE') && (
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1 rounded-2xl">
                 <button onClick={() => setSelectedMovementType('' as any)} className={`py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${!selectedMovementType ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>BOTH</button>
                 <button onClick={() => setSelectedMovementType(MovementType.IN)} className={`py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${selectedMovementType === MovementType.IN ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>IN</button>
                 <button onClick={() => setSelectedMovementType(MovementType.OUT)} className={`py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${selectedMovementType === MovementType.OUT ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>OUT</button>
              </div>
            )}

            {activeTab === 'CATEGORY' && (
              <div className="relative">
                <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black text-slate-800 appearance-none outline-none uppercase">
                  <option value="">ALL CATEGORIES</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              </div>
            )}

            {activeTab === 'PARTY' && (
              <div className="relative">
                <select value={selectedPartyId} onChange={(e) => setSelectedPartyId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black text-slate-800 appearance-none outline-none uppercase">
                  <option value="">ALL PARTIES</option>
                  <optgroup label="SUPPLIERS">
                    {suppliers.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </optgroup>
                  <optgroup label="CUSTOMERS">
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              </div>
            )}

            {activeTab === 'CUSTOM' && (
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black text-slate-800 outline-none" />
                <input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black text-slate-800 outline-none" />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-5 rounded-[32px] border border-slate-50 shadow-soft">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total In</p>
            <p className="text-xl font-black text-emerald-600">{stats.totalIn}</p>
          </div>
          <div className="bg-white p-5 rounded-[32px] border border-slate-50 shadow-soft">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Out</p>
            <p className="text-xl font-black text-rose-600">{stats.totalOut}</p>
          </div>
          <div className="bg-white p-5 rounded-[32px] border border-slate-50 shadow-soft">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total In Amount</p>
            <p className="text-xl font-black text-emerald-600">{formatCurrency(stats.cashIn)}</p>
          </div>
          <div className="bg-white p-5 rounded-[32px] border border-slate-50 shadow-soft">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Out Amount</p>
            <p className="text-xl font-black text-rose-600">{formatCurrency(stats.cashOut)}</p>
          </div>
          <div className="col-span-2 bg-slate-900 p-6 rounded-[32px] border border-slate-800 shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Balance Profit</p>
              <p className={cn(
                "text-2xl font-black tracking-tight",
                stats.netCash >= 0 ? "text-emerald-400" : "text-rose-400"
              )}>
                {formatCurrency(stats.netCash)}
              </p>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-white/10 transition-colors duration-500" />
          </div>
        </div>
      </section>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transactions</h3>
          <span className="text-[10px] font-bold text-slate-400">{filteredMovements.length} Entries</span>
        </div>
        
        {filteredMovements.length === 0 ? (
          <div className="bg-white p-12 rounded-[32px] border border-slate-50 shadow-soft text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <FileText size={32} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No transactions found</p>
          </div>
        ) : (
          filteredMovements.map((m, idx) => (
            <div 
              key={m.id} 
              onClick={() => handleEdit(m)}
              className="bg-white p-5 rounded-[32px] border border-slate-50 shadow-soft flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${m.type === MovementType.IN ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {m.type === MovementType.IN ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-slate-900 uppercase leading-tight">{m.category}</h4>
                    <Edit3 size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    {new Date(m.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} • {getPartyName(m)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-black ${m.type === MovementType.IN ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {m.type === MovementType.IN ? '+' : '-'}{m.nos}
                </p>
                <div className="flex flex-col items-end mt-0.5">
                  <p className="text-[8px] font-bold text-slate-400 uppercase">{formatCurrency(m.amount || 0)}</p>
                  {m.unit_price && (
                    <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest mt-0.5">
                      @{formatCurrency(m.unit_price)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
