import React, { useRef, useState, useEffect } from 'react';
import { Printer, X, Download, ExternalLink, Banknote, Building2, Clock, Check, Edit2 } from 'lucide-react';
import type { Invoice, Shop } from '@/types';
import { formatAed, formatDate } from '@/lib/format';
import { cityLabel } from '@/lib/geo';
import { useApp } from '@/context/AppContext';

// Helper to sanitize person name from generic administrative labels
export function cleanPersonName(name?: string | null): string {
  if (!name) return '';
  let cleaned = name.trim();
  // Strip parenthetical roles like (Admin), (admin), (مدير النظام), (مدير), (مندوب), etc.
  cleaned = cleaned.replace(/\s*\((admin|administrator|مدير\s*النظام|مدير|مندوب|مسؤول|مشرف|كامل الصلاحيات)[^)]*\)/gi, '');
  // Strip standalone generic administrative titles
  cleaned = cleaned.replace(/^(مدير\s*النظام|المسؤول|المشرف|مستخدم|admin|administrator|مدير)$/gi, '');
  return cleaned.trim();
}

interface PrintInvoiceModalProps {
  invoice: Invoice;
  shop?: Shop | null;
  onClose: () => void;
  autoPrint?: boolean;
}

export function PrintInvoiceModal({ invoice, shop, onClose, autoPrint = false }: PrintInvoiceModalProps) {
  const { currentUser } = useApp();
  const printRef = useRef<HTMLDivElement>(null);
  const [downloaded, setDownloaded] = useState(false);

  // Compute a clean, real person account name for the distributor
  const initialDistributor = (() => {
    const rawInvoiceCreated = cleanPersonName(invoice.createdByName);
    if (rawInvoiceCreated) return rawInvoiceCreated;

    // Fallback to current user if their name is a real person name
    const currentClean = cleanPersonName(currentUser?.name);
    if (currentClean) return currentClean;

    // If trip name/driver exists and is a person name
    const tripClean = cleanPersonName(invoice.tripName);
    if (tripClean) return tripClean;

    return 'أبوبكر دعوب';
  })();

  const [distributorName, setDistributorName] = useState(initialDistributor);
  const [isEditingDistributor, setIsEditingDistributor] = useState(false);

  const shopPhone = shop?.phone || '—';
  const shopCity = shop?.city ? `${cityLabel(shop.city)} ${shop.area ? `- ${shop.area}` : ''}` : '';

  // Generate self-contained standalone HTML document for reliable printing
  const generatePrintableHTML = () => {
    const linesRows = invoice.lines.map((line, idx) => `
      <tr class="${idx % 2 === 1 ? 'even-row' : ''}">
        <td class="col-num">${idx + 1}</td>
        <td class="col-desc">
          <strong>${line.description}</strong>
          ${line.oem ? `<span class="oem">(${line.oem})</span>` : ''}
        </td>
        <td class="col-qty">${line.qty}</td>
        <td class="col-price">${formatAed(line.unitPrice)}</td>
        <td class="col-total">${formatAed(line.lineTotal)}</td>
      </tr>
    `).join('');

    // Fill at least 5 rows
    const blankRowsCount = Math.max(0, 5 - invoice.lines.length);
    let blankRows = '';
    for (let i = 0; i < blankRowsCount; i++) {
      const idx = invoice.lines.length + i;
      blankRows += `
        <tr class="${idx % 2 === 1 ? 'even-row' : ''}">
          <td class="col-num">${idx + 1}</td>
          <td class="col-desc">&nbsp;</td>
          <td class="col-qty">&nbsp;</td>
          <td class="col-price">&nbsp;</td>
          <td class="col-total">&nbsp;</td>
        </tr>
      `;
    }

    const cashVal = invoice.cashAmount ?? (invoice.paymentMethod === 'cash' ? invoice.paidAmount : 0);
    const bankVal = invoice.bankAmount ?? (invoice.paymentMethod === 'bank' ? invoice.paidAmount : 0);
    const debtVal = Math.max(0, invoice.total - invoice.paidAmount);

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>فاتورة مبيعات جملة - ${invoice.number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Cairo', system-ui, -apple-system, sans-serif;
      background-color: #fff;
      color: #1e293b;
      padding: 20px;
      direction: rtl;
      font-size: 13px;
      line-height: 1.4;
    }

    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }

    .sheet {
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
      border: 1px solid #e2e8f0;
      padding: 24px 30px;
    }

    @media print {
      body {
        padding: 0;
      }
      .sheet {
        border: none;
        padding: 0;
        max-width: 100%;
      }
      .no-print {
        display: none !important;
      }
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 14px;
      border-bottom: 1px solid #e2e8f0;
    }

    .distributor-info {
      text-align: right;
      font-size: 12px;
      color: #475569;
    }

    .distributor-info p {
      margin-bottom: 3px;
    }

    .distributor-info strong {
      color: #0f172a;
    }

    .brand-section {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .brand-title {
      font-size: 18px;
      font-weight: 900;
      color: #0f172a;
      margin-top: 4px;
    }

    .brand-sub {
      font-size: 11px;
      font-weight: 700;
      color: #0284c7;
      letter-spacing: 1px;
    }

    .title-banner {
      position: relative;
      text-align: center;
      margin: 14px 0;
      padding: 6px 0;
    }

    .title-banner::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1.5px;
      background-color: #d5c3aa;
    }

    .title-banner::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 1.5px;
      background-color: #d5c3aa;
    }

    .title-banner h2 {
      font-size: 19px;
      font-weight: 900;
      color: #0f172a;
      display: inline-block;
      padding: 0 16px;
      background: #fff;
      position: relative;
      z-index: 2;
    }

    .meta-grid {
      display: flex;
      justify-content: space-between;
      margin: 10px 0 14px 0;
      font-size: 13px;
    }

    .meta-col {
      width: 48%;
    }

    .meta-item {
      display: flex;
      align-items: baseline;
      margin-bottom: 6px;
    }

    .meta-label {
      font-weight: 700;
      color: #334155;
      white-space: nowrap;
      margin-left: 8px;
    }

    .meta-value-dotted {
      flex: 1;
      border-bottom: 1px dotted #94a3b8;
      font-weight: 700;
      color: #0f172a;
      padding-bottom: 2px;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      border: 1px solid #94a3b8;
      font-size: 12px;
    }

    .items-table th {
      background-color: #1b558f;
      color: #ffffff;
      font-weight: 700;
      padding: 7px 8px;
      text-align: right;
      border: 1px solid #1b558f;
    }

    .items-table td {
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
      text-align: right;
    }

    .items-table .even-row {
      background-color: #f1f6fa;
    }

    .col-num {
      width: 36px;
      text-align: center !important;
      font-weight: bold;
    }

    .col-qty {
      width: 60px;
      text-align: center !important;
      font-weight: bold;
    }

    .col-price {
      width: 105px;
      text-align: center !important;
      font-weight: bold;
      direction: ltr;
    }

    .col-total {
      width: 115px;
      text-align: center !important;
      font-weight: 900;
      direction: ltr;
    }

    .oem {
      font-size: 11px;
      color: #64748b;
      margin-right: 6px;
      font-family: monospace;
    }

    .totals-box {
      margin-top: 10px;
      border: 1px solid #94a3b8;
      border-radius: 2px;
      overflow: hidden;
    }

    .grand-total-row {
      background-color: #e8f1f8;
      padding: 8px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 900;
      font-size: 15px;
      color: #0f172a;
      border-bottom: 1px solid #cbd5e1;
    }

    .grand-total-num {
      font-size: 18px;
      color: #0369a1;
      direction: ltr;
    }

    .payments-row {
      display: flex;
      justify-content: space-between;
      background: #fff;
      font-size: 12px;
    }

    .payment-cell {
      flex: 1;
      padding: 6px 12px;
      display: flex;
      justify-content: space-between;
      border-left: 1px solid #cbd5e1;
    }

    .payment-cell:last-child {
      border-left: none;
    }

    .payment-cell.debt {
      background-color: #fffbeb;
      font-weight: bold;
    }

    .footer-notes {
      margin-top: 14px;
      padding-top: 6px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #64748b;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <!-- Header -->
    <div class="header">
      <div class="distributor-info">
        <p>الموزع: <strong>${distributorName}</strong></p>
        <p>أرقام الهاتف: <span dir="ltr" style="font-weight: 600;">0920896042 - 0924532407</span></p>
        <p>العنوان: <strong>طرابلس - ليبيا</strong></p>
        ${invoice.tripName ? `<p>رحلة التوزيع: <strong>${invoice.tripName}</strong></p>` : ''}
      </div>

      <div class="brand-section">
        <svg width="84" height="40" viewBox="0 0 200 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M100 8 C102 8 103 9 104 11 L106 14 C109 15 112 16 115 18 L118 16 C120 15 122 15 123 17 L128 25 C129 27 129 29 127 30 L124 32 C125 35 125 38 124 41 L127 43 C129 44 129 46 128 48 L123 56 C122 58 120 58 118 57 L115 55 C112 57 109 58 106 59 L104 62 C103 64 102 65 100 65 C98 65 97 64 96 62 L94 59 C91 58 88 57 85 55 L82 57 C80 58 78 58 77 56 L72 48 C71 46 71 44 73 43 L76 41 C75 38 75 35 76 32 L73 30 C71 29 71 27 72 25 L77 17 C78 15 80 15 82 16 L85 18 C88 16 91 15 94 14 L96 11 C97 9 98 8 100 8 Z" fill="#94a3b8" opacity="0.8"/>
          <circle cx="100" cy="36.5" r="14" fill="white" />
          <path d="M93 39 C93 37 94 35 96 34 L98 31 C99 30 101 30 102 31 L104 34 C106 35 107 37 107 39 L93 39 Z" fill="#0284c7" />
          <circle cx="95" cy="40" r="1.5" fill="#334155" />
          <circle cx="105" cy="40" r="1.5" fill="#334155" />
          <path d="M60 48 C55 42 55 35 60 30 C64 26 70 26 74 29 L82 37 L77 42 L69 34 C67 32 63 32 61 34 C59 36 59 40 61 42 L80 61 L70 65 L60 48 Z" fill="#0284c7" />
          <path d="M140 48 C145 42 145 35 140 30 C136 26 130 26 126 29 L118 37 L123 42 L131 34 C133 32 137 32 139 34 C141 36 141 40 139 42 L120 61 L130 65 L140 48 Z" fill="#0284c7" />
          <rect x="75" y="38" width="50" height="9" rx="4.5" fill="#0284c7" />
        </svg>
        <div class="brand-title">ابناء الحاتمي لقطع الغيار</div>
        <div class="brand-sub">توزيع جملة</div>
      </div>
    </div>

    <!-- Title Bar -->
    <div class="title-banner">
      <h2>فاتورة مبيعات جملة</h2>
    </div>

    <!-- Meta Info -->
    <div class="meta-grid">
      <div class="meta-col">
        <div class="meta-item">
          <span class="meta-label">اسم المحل/العميل:</span>
          <span class="meta-value-dotted">${invoice.shopName}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">رقم الهاتف:</span>
          <span class="meta-value-dotted" dir="ltr">${shopPhone}</span>
        </div>
        ${shopCity ? `
        <div class="meta-item">
          <span class="meta-label">المدينة / المنطقة:</span>
          <span class="meta-value-dotted">${shopCity}</span>
        </div>` : ''}
      </div>

      <div class="meta-col">
        <div class="meta-item">
          <span class="meta-label">رقم الفاتورة:</span>
          <span class="meta-value-dotted" style="color: #0369a1;">#${invoice.number}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">التاريخ والوقت:</span>
          <span class="meta-value-dotted">${formatDate(invoice.date)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">حالة الفاتورة:</span>
          <span class="meta-value-dotted">${invoice.status === 'paid' ? 'خالصة (مدفوعة)' : invoice.status === 'partial' ? 'دفعة جزئية' : 'آجل (غير مدفوعة)'}</span>
        </div>
      </div>
    </div>

    <!-- Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 36px; text-align: center;">ت</th>
          <th>اسم القطعة / البيان</th>
          <th style="width: 60px; text-align: center;">الكمية</th>
          <th style="width: 105px; text-align: center;">السعر جملة</th>
          <th style="width: 115px; text-align: center;">الاجمالي</th>
        </tr>
      </thead>
      <tbody>
        ${linesRows}
        ${blankRows}
      </tbody>
    </table>

    <!-- Totals & Payments -->
    <div class="totals-box">
      ${invoice.discount > 0 ? `
      <div style="display: flex; justify-content: space-between; background: #f8fafc; padding: 6px 14px; font-size: 12px; border-bottom: 1px solid #e2e8f0;">
        <span>المجموع قبل الخصم: <strong dir="ltr">${formatAed(invoice.subtotal)}</strong></span>
        <span style="color: #dc2626;">الخصم الممنوح: <strong dir="ltr">-${formatAed(invoice.discount)}</strong></span>
      </div>` : ''}
      
      <div class="grand-total-row">
        <span>الاجمالي الكلي للفاتورة:</span>
        <span class="grand-total-num">${formatAed(invoice.total)}</span>
      </div>

      <div class="payments-row">
        <div class="payment-cell">
          <span>المدفوع نقداً (كاش):</span>
          <strong dir="ltr" style="color: #15803d;">${formatAed(cashVal)}</strong>
        </div>
        <div class="payment-cell">
          <span>المدفوع تحويل مصرفي:</span>
          <strong dir="ltr" style="color: #0284c7;">${formatAed(bankVal)}</strong>
        </div>
        <div class="payment-cell debt">
          <span>المتبقي (آجل):</span>
          <strong dir="ltr" style="color: ${debtVal > 0 ? '#b91c1c' : '#15803d'};">${formatAed(debtVal)}</strong>
        </div>
      </div>
    </div>

    <!-- Footer Notes -->
    <div class="footer-notes">
      <span>شكراً لتعاملكم معنا</span>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`;
  };

  // 1. Direct Print via dynamically created Hidden Iframe (Works 100% inside sandboxed iframe containers)
  const handleDirectPrint = () => {
    try {
      const htmlContent = generatePrintableHTML();
      
      // Create hidden iframe in the document
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();

        // Trigger print on the iframe
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (err) {
            console.warn('Iframe print error, falling back to window.print():', err);
            window.print();
          } finally {
            // Clean up iframe after a few seconds
            setTimeout(() => {
              document.body.removeChild(iframe);
            }, 3000);
          }
        }, 500);
      } else {
        window.print();
      }
    } catch (e) {
      console.warn('Direct print fallback:', e);
      window.print();
    }
  };

  // 2. Open in New Tab for full browser printing (if user popup allows)
  const handleOpenInNewWindow = () => {
    const htmlContent = generatePrintableHTML();
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const newWin = window.open(blobUrl, '_blank');
    if (!newWin) {
      // If popup was blocked, fallback to direct print
      handleDirectPrint();
    }
  };

  // 3. Download standalone HTML/Print file
  const handleDownloadHTML = () => {
    const htmlContent = generatePrintableHTML();
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `فاتورة-${invoice.number}-${invoice.shopName}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  React.useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        handleDirectPrint();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Top Action Bar (Hidden in Print) */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-secondary-900/95 backdrop-blur text-white px-3 sm:px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 sm:gap-3 print:hidden max-w-[95vw] overflow-x-auto border border-white/10">
        <button
          type="button"
          onClick={handleDirectPrint}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all whitespace-nowrap cursor-pointer active:scale-95"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة فورية</span>
        </button>

        <button
          type="button"
          onClick={handleOpenInNewWindow}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-secondary-800 hover:bg-secondary-700 text-secondary-100 font-semibold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer"
          title="فتح الفاتورة في نافذة متصفح منفصلة للطباعة بحرية"
        >
          <ExternalLink className="w-4 h-4 text-primary-400" />
          <span>فتح بنافذة مستقلة</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadHTML}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-secondary-800 hover:bg-secondary-700 text-secondary-100 font-semibold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer"
          title="حفظ الفاتورة كملف HTML مستقل قابل للفتح والطباعة من أي جهاز"
        >
          {downloaded ? <Check className="w-4 h-4 text-success-400" /> : <Download className="w-4 h-4 text-secondary-400" />}
          <span>{downloaded ? 'تم التحميل' : 'حفظ الفاتورة'}</span>
        </button>

        <div className="w-px h-5 bg-white/20 shrink-0" />

        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 text-secondary-300 hover:text-white text-xs sm:text-sm font-medium transition-colors px-2 py-1"
        >
          <X className="w-4 h-4" />
          <span>إغلاق</span>
        </button>
      </div>

      {/* The Printable Invoice Sheet */}
      <div
        ref={printRef}
        className="w-full max-w-[820px] bg-white text-secondary-900 rounded-2xl shadow-2xl p-6 sm:p-10 my-12 print:my-0 print:p-6 print:w-full print:max-w-none print:shadow-none print:rounded-none border border-secondary-200 print:border-none print-invoice-sheet"
        dir="rtl"
      >
        {/* Header matching the reference invoice */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-secondary-200">
          {/* Left: Distributor details */}
          <div className="text-right space-y-1 text-xs text-secondary-700">
            <div className="flex items-center gap-1.5 font-bold text-sm text-secondary-900">
              <span>الموزع:</span>
              {isEditingDistributor ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={distributorName}
                    onChange={(e) => setDistributorName(e.target.value)}
                    className="border border-primary-400 rounded px-1.5 py-0.5 text-xs font-bold text-primary-800 bg-primary-50 focus:outline-hidden focus:ring-1 focus:ring-primary-500"
                    placeholder="اسم الموزع"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setIsEditingDistributor(false)}
                    className="px-1.5 py-0.5 rounded bg-primary-600 text-white text-[10px] hover:bg-primary-700"
                  >
                    تم
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 group">
                  <span className="text-primary-700 font-bold">{distributorName}</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingDistributor(true)}
                    className="opacity-0 group-hover:opacity-100 text-secondary-400 hover:text-primary-600 print:hidden transition-opacity p-0.5"
                    title="تعديل اسم الموزع قبل الطباعة"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-secondary-600">
              أرقام الهاتف: <span className="font-mono font-semibold" dir="ltr">0920896042 - 0924532407</span>
            </p>
            <p className="text-secondary-600">
              العنوان: <span className="font-semibold">طرابلس - ليبيا</span>
            </p>
            {invoice.tripName && (
              <p className="text-[11px] text-secondary-500 font-medium">
                رحلة التوزيع: {invoice.tripName}
              </p>
            )}
          </div>

          {/* Right: Company Logo & Brand Name */}
          <div className="flex flex-col items-center text-center">
            {/* SVG Logo matching the wrench + gear + car badge */}
            <div className="flex items-center justify-center mb-1">
              <svg className="w-24 h-12" viewBox="0 0 200 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M100 8 C102 8 103 9 104 11 L106 14 C109 15 112 16 115 18 L118 16 C120 15 122 15 123 17 L128 25 C129 27 129 29 127 30 L124 32 C125 35 125 38 124 41 L127 43 C129 44 129 46 128 48 L123 56 C122 58 120 58 118 57 L115 55 C112 57 109 58 106 59 L104 62 C103 64 102 65 100 65 C98 65 97 64 96 62 L94 59 C91 58 88 57 85 55 L82 57 C80 58 78 58 77 56 L72 48 C71 46 71 44 73 43 L76 41 C75 38 75 35 76 32 L73 30 C71 29 71 27 72 25 L77 17 C78 15 80 15 82 16 L85 18 C88 16 91 15 94 14 L96 11 C97 9 98 8 100 8 Z"
                  fill="#94a3b8"
                  opacity="0.8"
                />
                <circle cx="100" cy="36.5" r="14" fill="white" />
                <path
                  d="M93 39 C93 37 94 35 96 34 L98 31 C99 30 101 30 102 31 L104 34 C106 35 107 37 107 39 L93 39 Z"
                  fill="#0284c7"
                />
                <circle cx="95" cy="40" r="1.5" fill="#334155" />
                <circle cx="105" cy="40" r="1.5" fill="#334155" />
                <path
                  d="M60 48 C55 42 55 35 60 30 C64 26 70 26 74 29 L82 37 L77 42 L69 34 C67 32 63 32 61 34 C59 36 59 40 61 42 L80 61 L70 65 L60 48 Z"
                  fill="#0284c7"
                />
                <path
                  d="M140 48 C145 42 145 35 140 30 C136 26 130 26 126 29 L118 37 L123 42 L131 34 C133 32 137 32 139 34 C141 36 141 40 139 42 L120 61 L130 65 L140 48 Z"
                  fill="#0284c7"
                />
                <rect x="75" y="38" width="50" height="9" rx="4.5" fill="#0284c7" />
              </svg>
            </div>
            <h1 className="font-extrabold text-base sm:text-lg text-secondary-900 tracking-tight">
              ابناء الحاتمي لقطع الغيار
            </h1>
            <p className="text-[11px] font-semibold text-primary-700 tracking-wider">
              توزيع جملة
            </p>
          </div>
        </div>

        {/* Title Bar with warm dividers as in the image */}
        <div className="py-2.5 my-3 relative flex items-center justify-center">
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-[#d5c3aa]/80" />
          <h2 className="text-lg sm:text-xl font-extrabold text-secondary-900 tracking-wide px-4 bg-white z-10">
            فاتورة مبيعات جملة
          </h2>
          <div className="absolute inset-x-0 bottom-0 h-[1.5px] bg-[#d5c3aa]/80" />
        </div>

        {/* Customer & Invoice Meta Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 py-2 text-xs sm:text-sm">
          {/* Right Column: Customer Info */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-secondary-800 whitespace-nowrap">اسم المحل/العميل:</span>
              <span className="font-bold text-secondary-900 text-sm border-b border-dotted border-secondary-400 flex-1 pb-0.5">
                {invoice.shopName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-secondary-800 whitespace-nowrap">رقم الهاتف:</span>
              <span className="font-mono font-semibold text-secondary-800 border-b border-dotted border-secondary-400 flex-1 pb-0.5" dir="ltr">
                {shopPhone}
              </span>
            </div>
            {shopCity && (
              <div className="flex items-center gap-2 text-xs text-secondary-600">
                <span className="font-bold text-secondary-700 whitespace-nowrap">المدينة / المنطقة:</span>
                <span className="border-b border-dotted border-secondary-400 flex-1 pb-0.5">
                  {shopCity}
                </span>
              </div>
            )}
          </div>

          {/* Left Column: Invoice Number & Date */}
          <div className="space-y-1.5 sm:text-left">
            <div className="flex items-center sm:justify-end gap-2">
              <span className="font-bold text-secondary-800 whitespace-nowrap">رقم الفاتورة:</span>
              <span className="font-mono font-bold text-primary-800 text-sm border-b border-dotted border-secondary-400 pb-0.5 px-2">
                #{invoice.number}
              </span>
            </div>
            <div className="flex items-center sm:justify-end gap-2">
              <span className="font-bold text-secondary-800 whitespace-nowrap">التاريخ والوقت:</span>
              <span className="font-medium text-secondary-800 border-b border-dotted border-secondary-400 pb-0.5 px-2">
                {formatDate(invoice.date)}
              </span>
            </div>
            <div className="flex items-center sm:justify-end gap-2">
              <span className="font-bold text-secondary-800 whitespace-nowrap">حالة الفاتورة:</span>
              <span className="font-bold text-xs px-2 py-0.5 rounded bg-secondary-100 text-secondary-800">
                {invoice.status === 'paid' ? 'خالصة (مدفوعة)' : invoice.status === 'partial' ? 'دفعة جزئية' : 'آجل (غير مدفوعة)'}
              </span>
            </div>
          </div>
        </div>

        {/* Table of items matching the classic Libyan Auto Parts layout */}
        <div className="mt-3 overflow-hidden rounded-sm border border-secondary-300">
          <table className="w-full text-right text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-[#1b558f] text-white font-bold text-xs sm:text-sm">
                <th className="py-2 px-2 text-center w-10 border-l border-white/20">ت</th>
                <th className="py-2 px-3 border-l border-white/20">اسم القطعة / البيان</th>
                <th className="py-2 px-2 text-center w-16 border-l border-white/20">الكمية</th>
                <th className="py-2 px-3 text-center w-28 border-l border-white/20">السعر جملة</th>
                <th className="py-2 px-3 text-center w-32">الاجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-200 text-secondary-800">
              {invoice.lines.map((line, idx) => {
                const isEven = idx % 2 === 1;
                return (
                  <tr key={line.itemId || idx} className={isEven ? 'bg-[#f1f6fa]' : 'bg-white'}>
                    <td className="py-2 px-2 text-center font-mono font-bold text-xs border-l border-secondary-200">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 border-l border-secondary-200">
                      <span className="font-bold text-secondary-900">{line.description}</span>
                      {line.oem && (
                        <span className="text-[11px] font-mono text-secondary-500 mr-2" dir="ltr">
                          ({line.oem})
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center font-bold font-mono text-secondary-900 border-l border-secondary-200">
                      {line.qty}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-semibold tabular-nums border-l border-secondary-200">
                      {formatAed(line.unitPrice)}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold tabular-nums text-secondary-900">
                      {formatAed(line.lineTotal)}
                    </td>
                  </tr>
                );
              })}

              {/* Extra blank rows to preserve aesthetic height if items are few */}
              {invoice.lines.length < 5 &&
                Array.from({ length: 5 - invoice.lines.length }).map((_, i) => (
                  <tr key={`blank-${i}`} className={(invoice.lines.length + i) % 2 === 1 ? 'bg-[#f1f6fa]' : 'bg-white'}>
                    <td className="py-3 px-2 text-center text-secondary-300 border-l border-secondary-200 font-mono">
                      {invoice.lines.length + i + 1}
                    </td>
                    <td className="py-3 px-3 border-l border-secondary-200">&nbsp;</td>
                    <td className="py-3 px-2 border-l border-secondary-200">&nbsp;</td>
                    <td className="py-3 px-3 border-l border-secondary-200">&nbsp;</td>
                    <td className="py-3 px-3">&nbsp;</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Payments Breakdown Block */}
        <div className="mt-3 border border-secondary-300 rounded-sm overflow-hidden text-xs sm:text-sm">
          {/* Subtotal & Discount if applicable */}
          {invoice.discount > 0 && (
            <div className="grid grid-cols-2 bg-secondary-50 border-b border-secondary-200 px-4 py-1.5">
              <div className="flex justify-between font-medium text-secondary-600">
                <span>المجموع قبل الخصم:</span>
                <span className="font-mono tabular-nums">{formatAed(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between font-medium text-error-600 pr-6">
                <span>الخصم الممنوح:</span>
                <span className="font-mono tabular-nums">-{formatAed(invoice.discount)}</span>
              </div>
            </div>
          )}

          {/* Grand Total Row */}
          <div className="flex items-center justify-between bg-[#e8f1f8] px-4 py-2.5 font-bold text-sm sm:text-base border-b border-secondary-200">
            <span className="text-secondary-900">الاجمالي الكلي للفاتورة:</span>
            <span className="font-mono font-extrabold text-primary-900 text-lg tabular-nums">
              {formatAed(invoice.total)}
            </span>
          </div>

          {/* Payments detail (Cash / Bank / Debt) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-secondary-200 bg-white p-2.5 text-xs">
            <div className="py-1 px-2 flex items-center justify-between">
              <span className="font-semibold text-secondary-700 flex items-center gap-1">
                <Banknote className="w-3.5 h-3.5 text-success-600 inline" /> المدفوع نقداً (كاش):
              </span>
              <span className="font-mono font-bold text-success-700 tabular-nums">
                {formatAed(invoice.cashAmount ?? (invoice.paymentMethod === 'cash' ? invoice.paidAmount : 0))}
              </span>
            </div>

            <div className="py-1 px-2 flex items-center justify-between">
              <span className="font-semibold text-secondary-700 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-primary-600 inline" /> المدفوع تحويل مصرفي:
              </span>
              <span className="font-mono font-bold text-primary-700 tabular-nums">
                {formatAed(invoice.bankAmount ?? (invoice.paymentMethod === 'bank' ? invoice.paidAmount : 0))}
              </span>
            </div>

            <div className="py-1 px-2 flex items-center justify-between bg-warning-50/60 rounded">
              <span className="font-semibold text-warning-900 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-warning-700 inline" /> المتبقي على الحساب (آجل):
              </span>
              <span className={`font-mono font-extrabold tabular-nums ${invoice.total - invoice.paidAmount > 0 ? 'text-error-600' : 'text-success-700'}`}>
                {formatAed(Math.max(0, invoice.total - invoice.paidAmount))}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-4 pt-3 text-xs text-secondary-500 border-t border-secondary-200 text-center">
          <p className="font-medium">شكراً لتعاملكم معنا</p>
        </div>
      </div>
    </div>
  );
}
