
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  Loader2,
  Building2,
  FileText,
  Download,
  Calendar,
  ArrowDownCircle,
  ArrowUpCircle,
  FileSpreadsheet,
  File as FilePdf,
  History as HistoryIcon,
  PlusCircle,
  MinusCircle,
  TrendingUp,
  Package,
  Wallet,
  Zap,
  Trophy,
  Banknote,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Customer, Supplier, StockMovement, MovementType } from '../types';
import { formatCurrency } from '../lib/utils';
import { stockService } from '../lib/services/stockService';
import { TableSkeleton } from '../components/Skeleton';

export const Customers: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allMovements, setAllMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedCustomerForReport, setSelectedCustomerForReport] = useState<Customer | null>(null);
  const [customerMovements, setCustomerMovements] = useState<StockMovement[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState<'all' | 'day' | 'month' | 'custom'>('all');

  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '' });

  useEffect(() => {
    fetchData();
  }, []);

  // Handle reopening the modal if redirected back from CarryIn/Out
  useEffect(() => {
    if (!loading && customers.length > 0 && location.state?.reopenId) {
      const targetCustomer = customers.find(c => c.id === location.state.reopenId);
      if (targetCustomer) {
        handleViewReport(targetCustomer);
        // Clear the state so it doesn't reopen on every refresh
        window.history.replaceState({}, document.title);
      }
    }
  }, [loading, customers, location.state]);

  const fetchData = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const [c, sm, cm, v] = await Promise.all([
      stockService.getCustomers(),
      stockService.getSupplierMovements(),
      stockService.getCustomerMovements(),
      stockService.getSuppliers()
    ]);
    
    // Include all customer movements + internal entries (no customer/supplier ID)
    const combinedMovements = [
      ...cm,
      ...sm.filter(m => !m.customer_id && !m.supplier_id)
    ];
    
    setCustomers(c);
    setAllMovements(combinedMovements);
    setSuppliers(v);
    setLoading(false);
  };

  // Aggregate stats for the whole directory
  const directoryStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    // Filter movements for directory stats
    const filteredMovementsForStats = allMovements.filter(m => {
      const isInternalIn = !m.customer_id && !m.supplier_id && m.type === MovementType.IN;
      if (!m.customer_id && !isInternalIn) return false;
      
      const mDate = m.date;
      if (reportType === 'day') return mDate === today;
      if (reportType === 'month') {
        const now = new Date();
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        return mDate.startsWith(monthStr);
      }
      if (reportType === 'custom') {
        if (!startDate && !endDate) return true;
        if (startDate && !endDate) return mDate >= startDate;
        if (!startDate && endDate) return mDate <= endDate;
        return mDate >= startDate && mDate <= endDate;
      }
      return true;
    });

    const activeToday = new Set(
      allMovements
        .filter(m => m.date === today && m.customer_id)
        .map(m => m.customer_id)
    ).size;

    const totalIn = filteredMovementsForStats.filter(m => m.type === MovementType.IN).reduce((sum, m) => sum + m.nos, 0);
    const totalOut = filteredMovementsForStats.filter(m => m.type === MovementType.OUT).reduce((sum, m) => sum + m.nos, 0);
    const amountIn = filteredMovementsForStats.filter(m => m.type === MovementType.IN).reduce((sum, m) => sum + (m.amount || 0), 0);
    const amountOut = filteredMovementsForStats.filter(m => m.type === MovementType.OUT).reduce((sum, m) => sum + (m.amount || 0), 0);

    return {
      totalPartners: customers.length,
      activeToday,
      totalIn,
      totalOut,
      net: totalIn - totalOut,
      amountIn,
      amountOut,
      pendingAmount: amountIn - amountOut
    };
  }, [customers, allMovements, reportType, startDate, endDate]);

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({ 
        name: customer.name,
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || ''
      });
    } else {
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', email: '', address: '' });
    }
    setIsModalOpen(true);
  };

  const handleViewReport = async (customer: Customer) => {
    setSelectedCustomerForReport(customer);
    setLoadingReport(true);
    setReportType('all');
    setStartDate('');
    setEndDate('');
    const movements = await stockService.getMovementsByCustomerId(customer.id);
    setCustomerMovements(movements);
    setLoadingReport(false);
  };

  const filteredCustomerMovements = useMemo(() => {
    if (reportType === 'all') return customerMovements;
    
    return customerMovements.filter(m => {
      const mDate = m.date;
      if (reportType === 'day') {
        const today = new Date().toISOString().split('T')[0];
        return mDate === today;
      }
      if (reportType === 'month') {
        const now = new Date();
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        return mDate.startsWith(monthStr);
      }
      if (reportType === 'custom') {
        if (!startDate && !endDate) return true;
        if (startDate && !endDate) return mDate >= startDate;
        if (!startDate && endDate) return mDate <= endDate;
        return mDate >= startDate && mDate <= endDate;
      }
      return true;
    });
  }, [customerMovements, reportType, startDate, endDate]);

  const customerStats = useMemo(() => {
    if (!filteredCustomerMovements.length) return { in: 0, out: 0, net: 0, cashIn: 0, cashOut: 0, netCash: 0, productSummary: {}, supplierSummary: {} };
    const totalIn = filteredCustomerMovements.filter(m => m.type === MovementType.IN).reduce((sum, m) => sum + m.nos, 0);
    const totalOut = filteredCustomerMovements.filter(m => m.type === MovementType.OUT).reduce((sum, m) => sum + m.nos, 0);
    const amountIn = filteredCustomerMovements.filter(m => m.type === MovementType.IN).reduce((sum, m) => sum + (m.amount || 0), 0);
    const amountOut = filteredCustomerMovements.filter(m => m.type === MovementType.OUT).reduce((sum, m) => sum + (m.amount || 0), 0);
    
    const productSummary: Record<string, { in: number, out: number, net: number, amount: number }> = {};

    filteredCustomerMovements.forEach(m => {
      if (!productSummary[m.category]) {
        productSummary[m.category] = { in: 0, out: 0, net: 0, amount: 0 };
      }
      productSummary[m.category].amount += (m.amount || 0);
      if (m.type === MovementType.IN) {
        productSummary[m.category].in += m.nos;
        productSummary[m.category].net += m.nos;
      } else {
        productSummary[m.category].out += m.nos;
        productSummary[m.category].net -= m.nos;
      }
    });

    return {
      in: totalIn,
      out: totalOut,
      net: totalIn - totalOut,
      amountIn,
      amountOut,
      pendingAmount: amountIn - amountOut,
      productSummary
    };
  }, [filteredCustomerMovements]);

  const handleClearHistory = async () => {
    if (!selectedCustomerForReport) return;
    if (window.confirm(`ARE YOU SURE YOU WANT TO CLEAR ALL TRANSACTION HISTORY FOR ${selectedCustomerForReport.name.toUpperCase()}? THIS CANNOT BE UNDONE.`)) {
      setLoadingReport(true);
      await stockService.clearCustomerHistory(selectedCustomerForReport.id);
      const movements = await stockService.getMovementsByCustomerId(selectedCustomerForReport.id);
      setCustomerMovements(movements);
      setLoadingReport(false);
      fetchData(); // Refresh directory stats
    }
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setIsSubmitting(true);
    try {
      await stockService.deleteCustomer(customerToDelete.id);
      if (selectedCustomerForReport?.id === customerToDelete.id) {
        setSelectedCustomerForReport(null);
      }
      await fetchData();
      setIsDeleteModalOpen(false);
      setCustomerToDelete(null);
    } catch (error) {
      console.error("Failed to delete customer:", error);
      alert("Failed to delete customer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const finalName = formData.name.toUpperCase();
    const details = {
      phone: formData.phone,
      email: formData.email,
      address: formData.address
    };

    try {
      if (editingCustomer) {
        await stockService.updateCustomer(editingCustomer.id, { name: finalName, ...details });
      } else {
        await stockService.addCustomer(finalName, details);
      }
      
      // Refresh all directory data to sync global summaries and lists
      await fetchData();
      
      setIsSubmitting(false);
      setIsModalOpen(false);
      
      // Scroll to top to show the updated summary cards
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error("Failed to save customer:", error);
      setIsSubmitting(false);
    }
  };

  const handleDeleteMovement = async (m: StockMovement) => {
    if (window.confirm(`ARE YOU SURE YOU WANT TO DELETE THIS TRANSACTION? THIS WILL REVERT STOCK BALANCES.`)) {
      try {
        await stockService.deleteMovement(m.id);
        if (selectedCustomerForReport) {
          const movements = await stockService.getMovementsByCustomerId(selectedCustomerForReport.id);
          setCustomerMovements(movements);
        }
        await fetchData(); // Refresh directory stats
      } catch (error) {
        console.error("Failed to delete movement:", error);
        alert("Failed to delete transaction. Please try again.");
      }
    }
  };

  const handleQuickEntry = (type: MovementType) => {
    if (!selectedCustomerForReport) return;
    const path = type === MovementType.IN ? '/carry-in' : '/carry-out';
    navigate(path, { state: { customerId: selectedCustomerForReport.id } });
  };

  const handleEditMovement = (m: StockMovement) => {
    if (!selectedCustomerForReport) return;
    const path = m.type === MovementType.IN ? `/carry-in/${m.id}` : `/carry-out/${m.id}`;
    navigate(path, { state: { customerId: selectedCustomerForReport.id } });
  };

  const exportAllCustomersPdf = () => {
    if (customers.length === 0) return;
    setIsExporting('all_customers_pdf');
    
    setTimeout(() => {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // --- HEADER DESIGN ---
      doc.setFillColor(220, 38, 38); // red-600
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
      doc.text("CUSTOMER DIRECTORY", pageWidth - 15, 22, { align: 'right' });
      doc.setFontSize(8);
      doc.text(`GENERATED: ${new Date().toLocaleString().toUpperCase()}`, pageWidth - 15, 32, { align: 'right' });

      // Add Date Range Info
      let dateRangeText = "ALL TIME";
      if (reportType === 'day') dateRangeText = `TODAY: ${new Date().toLocaleDateString().toUpperCase()}`;
      else if (reportType === 'month') dateRangeText = `MONTHLY: ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase()}`;
      else if (reportType === 'custom') dateRangeText = `PERIOD: ${startDate || 'START'} TO ${endDate || 'END'}`;

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("REPORT PERIOD:", pageWidth - 15, 36, { align: 'right' });
      doc.setFont("helvetica", "normal");
      doc.text(dateRangeText, pageWidth - 15, 40, { align: 'right' });

      // --- SUMMARY SECTION ---
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("DIRECTORY SUMMARY", 15, 52);

      const summaryData = [
        ["TOTAL CUSTOMERS", `${directoryStats.totalPartners}`],
        ["ACTIVE IN PERIOD", `${directoryStats.activeToday}`],
        ["TOTAL PURCHASE (IN)", `${directoryStats.totalIn} PCS`],
        ["TOTAL RETURN (OUT)", `${directoryStats.totalOut} PCS`],
        ["NET STOCK BALANCE", `${directoryStats.net} PCS`],
        ["TOTAL AMOUNT IN", `INR ${directoryStats.amountIn.toLocaleString()}`],
        ["TOTAL AMOUNT OUT", `INR ${directoryStats.amountOut.toLocaleString()}`],
        ["PENDING AMOUNT", `INR ${directoryStats.pendingAmount.toLocaleString()}`]
      ];

      autoTable(doc, {
        startY: 57,
        body: summaryData,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 4, lineWidth: 0.1, lineColor: [226, 232, 240] },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 60 },
          1: { halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: 15, right: 15 }
      });

      // --- PARTY WISE SUMMARY ---
      const today = new Date().toISOString().split('T')[0];
      const filteredMovementsForPdf = allMovements.filter(m => {
        const isInternalIn = !m.customer_id && !m.supplier_id && m.type === MovementType.IN;
        if (!m.customer_id && !isInternalIn) return false;
        
        const mDate = m.date;
        if (reportType === 'day') return mDate === today;
        if (reportType === 'month') {
          const now = new Date();
          const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          return mDate.startsWith(monthStr);
        }
        if (reportType === 'custom') {
          if (!startDate && !endDate) return true;
          if (startDate && !endDate) return mDate >= startDate;
          if (!startDate && endDate) return mDate <= endDate;
          return mDate >= startDate && mDate <= endDate;
        }
        return true;
      });

      const partySummaryRows = customers.map(c => {
        const movements = filteredMovementsForPdf.filter(m => m.customer_id === c.id);
        const totalIn = movements.filter(m => m.type === MovementType.IN).reduce((sum, m) => sum + m.nos, 0);
        const totalOut = movements.filter(m => m.type === MovementType.OUT).reduce((sum, m) => sum + m.nos, 0);
        return [
          c.name.toUpperCase(),
          totalIn,
          totalOut,
          totalIn - totalOut
        ];
      });

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("PARTY WISE STOCK SUMMARY", 15, (doc as any).lastAutoTable.finalY + 15);

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [["CUSTOMER NAME", "TOTAL IN", "TOTAL OUT", "NET BALANCE"]],
        body: partySummaryRows,
        theme: 'grid',
        styles: {
          lineWidth: 0.1,
          lineColor: [226, 232, 240],
          fontSize: 8,
          textColor: [30, 41, 59],
          cellPadding: 3
        },
        headStyles: { 
          fillColor: [71, 85, 105], 
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { halign: 'center' },
          2: { halign: 'center' },
          3: { halign: 'center', fontStyle: 'bold' }
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 3) {
            const val = parseInt(data.cell.text[0]);
            if (val > 0) data.cell.styles.textColor = [16, 185, 129];
            else if (val < 0) data.cell.styles.textColor = [225, 29, 72];
          }
        }
      });

      // --- DETAILED TRANSACTION LEDGER ---
      if (filteredMovementsForPdf.length > 0) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("DETAILED TRANSACTION LEDGER (ALL CUSTOMERS)", 15, (doc as any).lastAutoTable.finalY + 15);

        const ledgerRows = filteredMovementsForPdf.map(m => {
          const party = customers.find(c => c.id === m.customer_id)?.name || 'UNKNOWN';
          return [
            m.date,
            party.toUpperCase(),
            m.type === MovementType.IN ? `(+) ${m.nos}` : `(-) ${m.nos}`,
            m.category.toUpperCase(),
            m.unit_price ? m.unit_price.toLocaleString() : '-',
            (m.amount || 0).toLocaleString()
          ];
        });

        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 20,
          head: [["DATE", "CUSTOMER", "TYPE/QTY", "PRODUCT", "UNIT PRICE", "AMOUNT"]],
          body: ledgerRows,
          theme: 'striped',
          styles: { fontSize: 7, cellPadding: 2 },
          headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
          columnStyles: {
            2: { fontStyle: 'bold' },
            4: { halign: 'right' },
            5: { halign: 'right' }
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 2) {
              if (data.cell.text[0].includes('(+)')) data.cell.styles.textColor = [16, 185, 129];
              else data.cell.styles.textColor = [225, 29, 72];
            }
          }
        });
      }

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `SR INFOTECH UAE - PAGE ${i} OF ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      doc.save(`SR_INFOTECH_CUSTOMERS_DIRECTORY_${new Date().getTime()}.pdf`);
      setIsExporting(null);
    }, 500);
  };

  const exportPdf = () => {
    if (!selectedCustomerForReport || filteredCustomerMovements.length === 0) return;
    setIsExporting('pdf');
    
    setTimeout(() => {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Sort movements: Top to Bottom (Oldest to Newest)
      const sortedMovements = [...filteredCustomerMovements].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      });

      // --- HEADER DESIGN ---
      doc.setFillColor(15, 23, 42); // slate-900
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
      doc.text("CUSTOMER STATEMENT", pageWidth - 15, 22, { align: 'right' });
      doc.setFontSize(8);
      doc.text(`GENERATED: ${new Date().toLocaleString().toUpperCase()}`, pageWidth - 15, 32, { align: 'right' });

      // Report Parameters Section
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("CUSTOMER DETAILS:", 15, 52);
      
      doc.setFontSize(9);
      doc.text("NAME:", 15, 60);
      doc.setFont("helvetica", "normal");
      doc.text(selectedCustomerForReport.name.toUpperCase(), 45, 60);

      // Add Date Range Info
      let dateRangeText = "ALL TIME";
      if (reportType === 'day') dateRangeText = `TODAY: ${new Date().toLocaleDateString().toUpperCase()}`;
      else if (reportType === 'month') dateRangeText = `MONTHLY: ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase()}`;
      else if (reportType === 'custom') dateRangeText = `PERIOD: ${startDate || 'START'} TO ${endDate || 'END'}`;

      doc.setFont("helvetica", "bold");
      doc.text("REPORT PERIOD:", pageWidth - 15, 52, { align: 'right' });
      doc.setFont("helvetica", "normal");
      doc.text(dateRangeText, pageWidth - 15, 57, { align: 'right' });
      
      let headerInfoY = 66;
      if (selectedCustomerForReport.phone) {
        doc.setFont("helvetica", "bold");
        doc.text("PHONE:", 15, headerInfoY);
        doc.setFont("helvetica", "normal");
        doc.text(selectedCustomerForReport.phone, 45, headerInfoY);
        headerInfoY += 6;
      }
      
      if (selectedCustomerForReport.email) {
        doc.setFont("helvetica", "bold");
        doc.text("EMAIL:", 15, headerInfoY);
        doc.setFont("helvetica", "normal");
        doc.text(selectedCustomerForReport.email.toLowerCase(), 45, headerInfoY);
        headerInfoY += 6;
      }

      if (selectedCustomerForReport.address) {
        doc.setFont("helvetica", "bold");
        doc.text("ADDRESS:", 15, headerInfoY);
        doc.setFont("helvetica", "normal");
        const splitAddress = doc.splitTextToSize(selectedCustomerForReport.address.toUpperCase(), pageWidth - 60);
        doc.text(splitAddress, 45, headerInfoY);
        headerInfoY += (splitAddress.length * 5) + 2;
      }

      // --- OVERALL TOTALS BAR (MOVED TO TOP) ---
      const totalsY = headerInfoY + 5;
      doc.setFillColor(241, 245, 249); // Light slate/blue
      doc.rect(15, totalsY, pageWidth - 30, 25, 'F');
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("OVERALL TOTALS (PIECES):", 20, totalsY + 8);
      
      doc.setFontSize(9);
      doc.text(`TOTAL OUT: ${customerStats.out} PCS`, 80, totalsY + 8);
      doc.text(`TOTAL IN: ${customerStats.in} PCS`, 120, totalsY + 8);
      
      if (customerStats.net >= 0) doc.setTextColor(16, 185, 129);
      else doc.setTextColor(225, 29, 72);
      doc.text(`BALANCE: ${customerStats.net} PCS`, 160, totalsY + 8);

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.text("OVERALL TOTALS (AMOUNT):", 20, totalsY + 18);
      doc.setFontSize(9);
      doc.text(`AMOUNT IN: ${customerStats.amountIn.toLocaleString()}`, 80, totalsY + 18);
      doc.text(`AMOUNT OUT: ${customerStats.amountOut.toLocaleString()}`, 120, totalsY + 18);
      
      if (customerStats.pendingAmount >= 0) doc.setTextColor(16, 185, 129);
      else doc.setTextColor(225, 29, 72);
      doc.text(`PENDING: ${customerStats.pendingAmount.toLocaleString()}`, 160, totalsY + 18);

      // --- MAIN TRANSACTION TABLE ---
      const tableColumn = ["DATE", "CATEGORY", "IN QTY", "OUT QTY", "IN AMOUNT", "OUT AMOUNT", "BALANCE QTY"];
      
      let runningQty = 0;
      const tableRows = sortedMovements.map(m => {
        const inQty = m.type === MovementType.IN ? m.nos : 0;
        const outQty = m.type === MovementType.OUT ? m.nos : 0;
        const inAmt = m.type === MovementType.IN ? (m.amount || 0) : 0;
        const outAmt = m.type === MovementType.OUT ? (m.amount || 0) : 0;
        
        runningQty += (inQty - outQty);

        return [
          m.date,
          m.category.toUpperCase(),
          inQty > 0 ? inQty : '-',
          outQty > 0 ? outQty : '-',
          inAmt > 0 ? inAmt.toLocaleString() : '-',
          outAmt > 0 ? outAmt.toLocaleString() : '-',
          runningQty
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
          totalInQty, 
          totalOutQty, 
          totalInAmt.toLocaleString(), 
          totalOutAmt.toLocaleString(), 
          runningQty
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
          1: { cellWidth: 'auto', fontStyle: 'bold' },
          2: { cellWidth: 15, halign: 'center', textColor: [16, 185, 129], fontStyle: 'bold' },
          3: { cellWidth: 15, halign: 'center', textColor: [225, 29, 72], fontStyle: 'bold' },
          4: { cellWidth: 25, halign: 'right', textColor: [16, 185, 129] },
          5: { cellWidth: 25, halign: 'right', textColor: [225, 29, 72] },
          6: { cellWidth: 20, halign: 'center', fontStyle: 'bold' }
        },
        didDrawPage: (data) => {
          const totalPages = doc.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          const footerText = `SR INFOTECH UAE CORPORATE STATEMENT | PAGE ${doc.getNumberOfPages()} OF ${totalPages} | CONFIDENTIAL AUDIT REPORT`;
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
      const summaryRows = Object.entries(customerStats.productSummary).map(([cat, v]) => {
        const vals = v as { in: number, out: number, net: number, amount: number };
        return [
          cat.toUpperCase(),
          vals.out,
          vals.in,
          vals.net
        ];
      });

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

      doc.save(`SR_STMT_${selectedCustomerForReport.name.toUpperCase().replace(/\s+/g, '_')}.pdf`);
      setIsExporting(null);
    }, 1000);
  };

  const exportCategoryPdf = (category: string) => {
    if (!selectedCustomerForReport) return;
    const categoryMovements = filteredCustomerMovements.filter(m => m.category === category);
    if (categoryMovements.length === 0) return;

    setIsExporting(`pdf_${category}`);
    
    setTimeout(() => {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // --- HEADER DESIGN ---
      doc.setFillColor(220, 38, 38); // red-600
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
      doc.text("CATEGORY AUDIT REPORT", pageWidth - 15, 22, { align: 'right' });
      doc.setFontSize(8);
      doc.text(`GENERATED: ${new Date().toLocaleString().toUpperCase()}`, pageWidth - 15, 32, { align: 'right' });

      // Report Parameters Section
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("CUSTOMER DETAILS:", 15, 52);
      
      doc.setFontSize(8);
      doc.text("NAME:", 15, 60);
      doc.setFont("helvetica", "normal");
      doc.text(selectedCustomerForReport.name.toUpperCase(), 45, 60);

      // Add Date Range Info
      let dateRangeText = "ALL TIME";
      if (reportType === 'day') dateRangeText = `TODAY: ${new Date().toLocaleDateString().toUpperCase()}`;
      else if (reportType === 'month') dateRangeText = `MONTHLY: ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase()}`;
      else if (reportType === 'custom') dateRangeText = `PERIOD: ${startDate || 'START'} TO ${endDate || 'END'}`;

      doc.setFont("helvetica", "bold");
      doc.text("REPORT PERIOD:", pageWidth - 15, 52, { align: 'right' });
      doc.setFont("helvetica", "normal");
      doc.text(dateRangeText, pageWidth - 15, 57, { align: 'right' });

      // --- MAIN TRANSACTION TABLE ---
      const tableColumn = ["DATE", "TYPE", "QTY (PCS)", "UNIT PRICE", "WT (KG)", "AMT (INR)", "NOTES"];
      const tableRows = categoryMovements.map(m => [
        m.date,
        m.type === MovementType.IN ? 'IN (+)' : 'OUT (-)',
        m.nos,
        m.unit_price ? m.unit_price.toLocaleString() : '-',
        m.weight || '-',
        (m.amount || 0).toLocaleString(),
        (m.remarks || '-').toUpperCase()
      ]);

      autoTable(doc, {
        startY: 70,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        styles: {
          lineWidth: 0.1,
          lineColor: [226, 232, 240],
          fontSize: 8,
          textColor: [30, 41, 59],
          cellPadding: 3
        },
        headStyles: { 
          fillColor: [30, 41, 59], 
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          1: { halign: 'center', fontStyle: 'bold' },
          2: { halign: 'center', fontStyle: 'bold' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' }
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 1) {
            if (data.cell.text[0].includes('IN')) data.cell.styles.textColor = [16, 185, 129];
            else data.cell.styles.textColor = [225, 29, 72];
          }
        }
      });

      const catStats = categoryMovements.reduce((acc, m) => {
        if (m.type === MovementType.IN) {
          acc.in += m.nos;
          acc.amountIn += (m.amount || 0);
        } else {
          acc.out += m.nos;
          acc.amountOut += (m.amount || 0);
        }
        return acc;
      }, { in: 0, out: 0, amountIn: 0, amountOut: 0 });

      const finalY = (doc as any).lastAutoTable.finalY + 15;
      if (finalY < pageHeight - 60) {
        doc.setFillColor(241, 245, 249);
        doc.rect(15, finalY, pageWidth - 30, 35, 'F');
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text(`CATEGORY SUMMARY: ${category.toUpperCase()}`, 20, finalY + 8);
        
        doc.setFontSize(9);
        doc.text(`TOTAL IN: ${catStats.in} PCS`, 20, finalY + 16);
        doc.text(`TOTAL OUT: ${catStats.out} PCS`, 80, finalY + 16);
        doc.text(`BALANCE: ${catStats.in - catStats.out} PCS`, 140, finalY + 16);

        doc.text(`AMOUNT IN: ${catStats.amountIn.toLocaleString()}`, 20, finalY + 26);
        doc.text(`AMOUNT OUT: ${catStats.amountOut.toLocaleString()}`, 80, finalY + 26);
        doc.text(`PENDING: ${(catStats.amountIn - catStats.amountOut).toLocaleString()}`, 140, finalY + 26);
      }

      doc.save(`SR_CAT_${category.toUpperCase()}_${selectedCustomerForReport.name.toUpperCase().replace(/\s+/g, '_')}.pdf`);
      setIsExporting(null);
    }, 800);
  };

  const exportExcel = () => {
    if (!selectedCustomerForReport) return;
    setIsExporting('excel');
    setTimeout(() => {
      const header = [
        ["SR INFOTECH UAE - CUSTOMER STATEMENT"],
        ["Customer Name", selectedCustomerForReport.name.toUpperCase()],
        ["Report Date", new Date().toLocaleString()],
        ["Report Period", reportType.toUpperCase()],
        [],
        ["DATE", "TYPE", "PRODUCT", "CARRY IN (NOS)", "CARRY OUT (NOS)", "WEIGHT (KG)", "AMOUNT (INR)", "VALUE / REMARKS"]
      ];
      const body = filteredCustomerMovements.map(m => [
        m.date, 
        m.type, 
        m.category.toUpperCase(), 
        m.type === MovementType.IN ? m.nos : 0, 
        m.type === MovementType.OUT ? m.nos : 0, 
        m.weight || 0, 
        m.amount || 0,
        (m.remarks || '').toUpperCase()
      ]);
      const ws = XLSX.utils.aoa_to_sheet([...header, ...body]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Transactions");
      XLSX.writeFile(wb, `${selectedCustomerForReport.name.toUpperCase()}_Report.xlsx`);
      setIsExporting(null);
    }, 1000);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-24 max-w-lg mx-auto">
      <AnimatePresence mode="wait">
        {!selectedCustomerForReport ? (
          <motion.div 
            key="directory"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <header className="flex items-center justify-between px-1">
              <div>
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                  Customers
                </h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">
                  Corporate Directory
                </p>
              </div>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => handleOpenModal()} 
                className="w-12 h-12 flex items-center justify-center bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-200"
              >
                <Plus size={24} />
              </motion.button>
            </header>

            {/* Directory Summary - Bento Style */}
            <div className="grid grid-cols-2 gap-3">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <ArrowDownCircle size={16} />
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inbound</span>
                </div>
                <p className="text-2xl font-black text-slate-900 leading-none">{directoryStats.totalIn}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Total Pieces</p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                    <ArrowUpCircle size={16} />
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Outbound</span>
                </div>
                <p className="text-2xl font-black text-slate-900 leading-none">{directoryStats.totalOut}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Total Pieces</p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-slate-900 p-6 rounded-[40px] shadow-2xl shadow-slate-200 col-span-2 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-6 opacity-10">
                  <Wallet size={80} className="text-white" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Net Outstanding</span>
                    <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${directoryStats.pendingAmount >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {directoryStats.pendingAmount >= 0 ? 'Credit' : 'Debit'}
                    </div>
                  </div>
                  <p className="text-4xl font-black text-white tracking-tighter">₹{Math.abs(directoryStats.pendingAmount).toLocaleString()}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Across {customers.length} Active Partners</p>
                    <div className="w-1 h-1 bg-slate-700 rounded-full" />
                    <p className="text-[10px] font-bold text-slate-500 uppercase">{directoryStats.net} PCS Balance</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Search Bar */}
            <div className="relative group px-1">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Search customer directory..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value.toUpperCase())} 
                className="w-full pl-16 pr-6 py-6 bg-white border border-slate-100 rounded-[32px] focus:ring-8 focus:ring-slate-900/5 outline-none transition shadow-sm font-bold text-slate-900 uppercase text-xs tracking-wider placeholder:text-slate-300" 
              />
            </div>

            {/* Customer List */}
            <div className="space-y-3 px-1">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-white h-20 rounded-2xl border border-slate-50 shadow-sm" />
                ))
              ) : filteredCustomers.length > 0 ? (
                filteredCustomers.map((c, idx) => {
                  const movements = allMovements.filter(m => m.customer_id === c.id);
                  const totalIn = movements.filter(m => m.type === MovementType.IN).reduce((sum, m) => sum + m.nos, 0);
                  const totalOut = movements.filter(m => m.type === MovementType.OUT).reduce((sum, m) => sum + m.nos, 0);
                  const amountIn = movements.filter(m => m.type === MovementType.IN).reduce((sum, m) => sum + (m.amount || 0), 0);
                  const amountOut = movements.filter(m => m.type === MovementType.OUT).reduce((sum, m) => sum + (m.amount || 0), 0);
                  const pendingQty = totalIn - totalOut;
                  const pendingAmount = amountIn - amountOut;

                  return (
                    <motion.div 
                      key={c.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      whileTap={{ scale: 0.98 }}
                      className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm active:shadow-inner transition-all group flex items-center justify-between" 
                      onClick={() => handleViewReport(c)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all duration-300 flex-shrink-0">
                          <Users size={20} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-black text-slate-900 uppercase leading-none truncate tracking-tight">{c.name}</h3>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-[9px] font-black uppercase tracking-wider ${pendingQty >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                              {pendingQty} PCS
                            </span>
                            <span className="w-1 h-1 bg-slate-200 rounded-full" />
                            <span className={`text-[9px] font-black uppercase tracking-wider ${pendingAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              ₹{Math.abs(pendingAmount).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                        <button onClick={(e) => { e.stopPropagation(); handleOpenModal(c); }} className="p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"><Edit2 size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(c); }} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="py-20 text-center bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-100">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">No customers found</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="report"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <header className="flex items-center justify-between px-1">
              <div className="flex items-center gap-4">
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedCustomerForReport(null)}
                  className="w-12 h-12 flex items-center justify-center bg-white border border-slate-100 rounded-2xl text-slate-900 shadow-sm"
                >
                  <ArrowLeft size={24} />
                </motion.button>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                    {selectedCustomerForReport.name}
                  </h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">
                    Transaction Audit
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={exportPdf}
                  disabled={!!isExporting}
                  className="w-10 h-10 flex items-center justify-center bg-red-600 text-white rounded-xl shadow-lg shadow-red-100 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isExporting === 'pdf' ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                </motion.button>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={exportExcel}
                  disabled={!!isExporting}
                  className="w-10 h-10 flex items-center justify-center bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-200 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isExporting === 'excel' ? <Loader2 size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
                </motion.button>
              </div>
            </header>

            {/* Date Filter Bar - Mobile Optimized */}
            <div className="bg-white p-2 rounded-[28px] border border-slate-100 shadow-sm flex items-center gap-2 overflow-x-auto no-scrollbar">
              {['all', 'day', 'month', 'custom'].map((type) => (
                <button 
                  key={type}
                  onClick={() => setReportType(type as any)}
                  className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${reportType === type ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}
                >
                  {type}
                </button>
              ))}

              {reportType === 'custom' && (
                <motion.div 
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  className="flex items-center gap-2 pr-2"
                >
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none"
                  />
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none"
                  />
                </motion.div>
              )}
            </div>

            {/* Action Bar for Report */}
            <div className="grid grid-cols-2 gap-3">
              <motion.button 
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleQuickEntry(MovementType.OUT)}
                className="flex items-center justify-center gap-3 py-5 bg-rose-500 text-white rounded-[28px] shadow-xl shadow-rose-200/50 border border-rose-400/20"
              >
                <MinusCircle size={18} />
                <span className="text-[10px] font-black uppercase tracking-[0.15em]">Goods Out</span>
              </motion.button>
              <motion.button 
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleQuickEntry(MovementType.IN)}
                className="flex items-center justify-center gap-3 py-5 bg-emerald-500 text-white rounded-[28px] shadow-xl shadow-emerald-200/50 border border-emerald-400/20"
              >
                <PlusCircle size={18} />
                <span className="text-[10px] font-black uppercase tracking-[0.15em]">Goods In</span>
              </motion.button>
            </div>

            {/* Summary Cards Section */}
            {!loadingReport && filteredCustomerMovements.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                      <ArrowDownCircle size={16} />
                    </div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Purchased</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900 leading-none">{customerStats.in}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Total Pieces</p>
                </div>

                <div className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                      <ArrowUpCircle size={16} />
                    </div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Returned</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900 leading-none">{customerStats.out}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Total Pieces</p>
                </div>

                <div className="bg-slate-900 p-6 rounded-[40px] shadow-2xl shadow-slate-200 col-span-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-10">
                    <Banknote size={80} className="text-white" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Account Balance</span>
                      <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${customerStats.pendingAmount >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {customerStats.pendingAmount >= 0 ? 'Credit' : 'Debit'}
                      </div>
                    </div>
                    <p className="text-4xl font-black text-white tracking-tighter">{formatCurrency(Math.abs(customerStats.pendingAmount))}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Net Stock: {customerStats.net} PCS</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Report Content */}
            {loadingReport ? (
              <TableSkeleton rows={10} />
            ) : filteredCustomerMovements.length > 0 ? (
              <div className="space-y-6">
                {/* Transaction Ledger */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Activity Ledger</h3>
                    <span className="text-[10px] font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-full">{filteredCustomerMovements.length}</span>
                  </div>
                  <div className="space-y-2.5">
                    {filteredCustomerMovements.map((m, idx) => (
                      <motion.div 
                        key={m.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm group relative overflow-hidden"
                      >
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.type === MovementType.IN ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                              {m.type === MovementType.IN ? <ArrowDownCircle size={16} /> : <ArrowUpCircle size={16} />}
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight leading-none">{m.date}</p>
                              <p className={`text-[9px] font-black uppercase tracking-[0.2em] mt-1 ${m.type === MovementType.IN ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {m.type === MovementType.IN ? 'Purchase' : 'Return'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-slate-900 leading-none">{m.nos} PCS</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1">{formatCurrency(m.amount || 0)}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-50">
                          <div className="flex-1 pr-4 min-w-0">
                            <p className="text-[10px] font-black text-slate-900 uppercase truncate tracking-tight">{m.category}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase truncate mt-0.5">{m.remarks || 'No remarks provided'}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => handleEditMovement(m)}
                              className="p-1 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button 
                              onClick={() => handleDeleteMovement(m)}
                              className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 bg-slate-50/50 rounded-[48px] border-2 border-dashed border-slate-100 text-center px-8">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
                  <HistoryIcon size={40} className="text-slate-200" />
                </div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">No activity found</p>
                <p className="text-[10px] font-bold text-slate-300 uppercase mt-2">Try adjusting your filters or date range</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDeleteModalOpen && customerToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
              onClick={() => setIsDeleteModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-[48px] shadow-2xl overflow-hidden p-10 text-center"
            >
              <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <Trash2 size={48} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-3">Confirm Deletion</h3>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest leading-relaxed mb-10">
                Are you sure you want to delete <span className="text-slate-900 font-black">"{customerToDelete.name}"</span>? This will permanently remove all associated transaction history.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="py-5 bg-slate-100 text-slate-600 font-black rounded-2xl uppercase text-[10px] tracking-widest"
                >
                  Cancel
                </motion.button>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={confirmDeleteCustomer}
                  disabled={isSubmitting}
                  className="py-5 bg-rose-600 text-white font-black rounded-2xl shadow-xl shadow-rose-100 uppercase text-[10px] tracking-widest flex items-center justify-center disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Delete'}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="relative bg-white w-full max-w-md rounded-t-[48px] sm:rounded-[48px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{editingCustomer ? 'Edit' : 'New'} Customer</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-3 text-slate-400 hover:bg-white hover:shadow-sm rounded-2xl transition-all"><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-10 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Customer / Company Name</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value.toUpperCase()})} 
                    className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-slate-900/5 focus:border-slate-900 font-black text-slate-900 uppercase text-sm transition-all" 
                    placeholder="E.G. RELIANCE INDUSTRIES" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Phone Number</label>
                    <input 
                      type="text" 
                      value={formData.phone} 
                      onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                      className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-slate-900/5 focus:border-slate-900 font-bold text-slate-900 text-sm transition-all" 
                      placeholder="+91 ..." 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Email Address</label>
                    <input 
                      type="email" 
                      value={formData.email} 
                      onChange={(e) => setFormData({...formData, email: e.target.value})} 
                      className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-slate-900/5 focus:border-slate-900 font-bold text-slate-900 text-sm transition-all" 
                      placeholder="info@company.com" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Office Address</label>
                  <textarea 
                    value={formData.address} 
                    onChange={(e) => setFormData({...formData, address: e.target.value})} 
                    className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-8 focus:ring-slate-900/5 focus:border-slate-900 font-bold text-slate-900 text-sm transition-all resize-none" 
                    placeholder="Full business address..." 
                    rows={2}
                  />
                </div>
                <div className="pt-6">
                  <motion.button 
                    whileTap={{ scale: 0.98 }}
                    type="submit" 
                    disabled={isSubmitting} 
                    className="w-full py-6 bg-slate-900 text-white font-black rounded-3xl shadow-2xl shadow-slate-200 uppercase text-xs tracking-[0.2em] flex items-center justify-center disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin mr-3" size={20} /> : <Check className="mr-3" size={20} />}
                    Confirm Account
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
