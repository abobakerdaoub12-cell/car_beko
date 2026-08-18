import { useState, useRef } from 'react';
import { Download, Upload, Database, ShieldCheck, FileJson, CheckCircle2, AlertTriangle, RefreshCw, Layers, HardDrive } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Form';
import { exportDatabaseToJSON, parseAndValidateBackup, type SystemBackupPayload } from '@/lib/backup';
import type { AppData } from '@/types';

interface BackupRestoreModalProps {
  open: boolean;
  onClose: () => void;
}

export function BackupRestoreModal({ open, onClose }: BackupRestoreModalProps) {
  const { data, restoreSystemData } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'export' | 'restore'>('export');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Restore state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedBackup, setParsedBackup] = useState<{
    data: AppData;
    meta?: SystemBackupPayload['meta'];
  } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    try {
      exportDatabaseToJSON(data);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setParseError(null);
    setRestoreSuccess(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = parseAndValidateBackup(content);
      if (result.valid && result.parsedData) {
        setParsedBackup({
          data: result.parsedData,
          meta: result.meta,
        });
      } else {
        setParsedBackup(null);
        setParseError(result.error || 'الملف غير صالح');
      }
    };
    reader.onerror = () => {
      setParseError('حدث خطأ أثناء قراءة الملف من جهازك.');
    };
    reader.readAsText(file);
  };

  const handleRestore = async () => {
    if (!parsedBackup) return;
    setIsRestoring(true);
    try {
      await restoreSystemData(parsedBackup.data);
      setRestoreSuccess(true);
      setTimeout(() => {
        setRestoreSuccess(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      setParseError(`فشلت عملية الاستعادة: ${err?.message || 'خطأ غير متوقع'}`);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="النسخ الاحتياطي وإدارة قاعدة البيانات"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-secondary-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-primary-600" />
            حفظ محلي آمن ومشفر بتنسيق JSON
          </span>
          <Button variant="secondary" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex rounded-xl bg-secondary-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'export'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-secondary-600 hover:text-secondary-900'
            }`}
          >
            <Download className="w-4 h-4" />
            تصدير نسخة احتياطية (JSON)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('restore')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'restore'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-secondary-600 hover:text-secondary-900'
            }`}
          >
            <Upload className="w-4 h-4" />
            استعادة من ملف نسخة
          </button>
        </div>

        {/* Tab 1: Export Backup */}
        {activeTab === 'export' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="p-3.5 rounded-xl bg-primary-50 border border-primary-100/80 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center shrink-0">
                <FileJson className="w-4 h-4" />
              </div>
              <div className="text-xs text-primary-900 leading-relaxed">
                <p className="font-bold mb-0.5">تصدير كامل لقاعدة بيانات النظام</p>
                <p className="text-primary-700">
                  يقوم هذا الخيار بتجميع كافة بيانات الحسابات، العملاء، المخزون، الفواتير، وسندات القبض في ملف JSON محفوظ على جهازك الشخصي، مما يتيح لك استعادته في أي وقت.
                </p>
              </div>
            </div>

            {/* Current Data Overview */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-secondary-700 block">
                محتويات النسخة الاحتياطية الحالية:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-secondary-100 flex items-center justify-between">
                  <span className="text-secondary-500">العملاء والمحلات:</span>
                  <span className="font-bold text-secondary-900 font-mono">{data.shops.length}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-secondary-100 flex items-center justify-between">
                  <span className="text-secondary-500">أصناف المخزون:</span>
                  <span className="font-bold text-secondary-900 font-mono">{data.inventory.length}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-secondary-100 flex items-center justify-between">
                  <span className="text-secondary-500">فواتير المبيعات:</span>
                  <span className="font-bold text-secondary-900 font-mono">{data.invoices.length}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-secondary-100 flex items-center justify-between">
                  <span className="text-secondary-500">سندات التحصيل:</span>
                  <span className="font-bold text-secondary-900 font-mono">{data.payments.length}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-secondary-100 flex items-center justify-between">
                  <span className="text-secondary-500">جولات التوزيع:</span>
                  <span className="font-bold text-secondary-900 font-mono">{data.trips.length}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-secondary-100 flex items-center justify-between">
                  <span className="text-secondary-500">الشحنات الواردة:</span>
                  <span className="font-bold text-secondary-900 font-mono">{data.shipments.length}</span>
                </div>
              </div>
            </div>

            {exportSuccess && (
              <div className="p-3 rounded-xl bg-success-50 border border-success-200 text-xs text-success-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success-600 shrink-0" />
                <span className="font-semibold">تم تحميل ملف النسخة الاحتياطية بنجاح إلى جهازك!</span>
              </div>
            )}

            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-sm"
              icon={<Download className="w-4 h-4" />}
            >
              {isExporting ? 'جاري تجهيز النسخة...' : 'تحميل وتصدير النسخة الاحتياطية (JSON) الآن'}
            </Button>
          </div>
        )}

        {/* Tab 2: Restore Backup */}
        {activeTab === 'restore' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="p-3.5 rounded-xl bg-warning-50 border border-warning-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning-600 shrink-0 mt-0.5" />
              <div className="text-xs text-warning-900 leading-relaxed">
                <p className="font-bold mb-0.5">تنبيه هام عند الاستعادة</p>
                <p className="text-warning-800">
                  استعادة نسخة ستقوم باستبدال أو تحديث بيانات النظام بالبيانات المحفوظة في ملف الـ JSON المرفوع.
                </p>
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Upload Dropzone / Button */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-secondary-200 hover:border-primary-400 bg-secondary-50/50 hover:bg-primary-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-white border border-secondary-200 mx-auto flex items-center justify-center text-primary-600 shadow-sm">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-secondary-800">
                  {selectedFile ? selectedFile.name : 'انقر لاختيار ملف النسخة الاحتياطية (.json)'}
                </p>
                <p className="text-[11px] text-secondary-400 mt-0.5">
                  يدعم ملفات النسخ الاحتياطي الخاصة بنظام أبناء الحاتمي
                </p>
              </div>
            </div>

            {parseError && (
              <div className="p-3 rounded-xl bg-error-50 border border-error-200 text-xs text-error-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-error-600 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            {/* File Inspection Preview */}
            {parsedBackup && (
              <div className="p-3.5 rounded-xl bg-secondary-50 border border-secondary-200 space-y-2">
                <div className="flex items-center justify-between text-xs border-b border-secondary-200/60 pb-2">
                  <span className="font-bold text-secondary-800 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-primary-600" />
                    بيانات النسخة المرفوعة:
                  </span>
                  {parsedBackup.meta?.exportedAt && (
                    <span className="text-[10px] text-secondary-400 font-mono">
                      بتاريخ: {new Date(parsedBackup.meta.exportedAt).toLocaleDateString('ar-LY')}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-lg border border-secondary-100">
                    <span className="text-[10px] text-secondary-400 block">المحلات</span>
                    <span className="font-bold text-secondary-900">{parsedBackup.data.shops.length}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-secondary-100">
                    <span className="text-[10px] text-secondary-400 block">المخزون</span>
                    <span className="font-bold text-secondary-900">{parsedBackup.data.inventory.length}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-secondary-100">
                    <span className="text-[10px] text-secondary-400 block">الفواتير</span>
                    <span className="font-bold text-secondary-900">{parsedBackup.data.invoices.length}</span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  onClick={handleRestore}
                  disabled={isRestoring}
                  className="w-full mt-2 py-2.5 text-xs font-bold"
                  icon={isRestoring ? <RefreshCw className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />}
                >
                  {isRestoring ? 'جاري تطبيق البيانات...' : 'تأكيد استعادة هذه النسخة الآن'}
                </Button>
              </div>
            )}

            {restoreSuccess && (
              <div className="p-3 rounded-xl bg-success-50 border border-success-200 text-xs text-success-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success-600 shrink-0" />
                <span className="font-bold">تم استعادة كافة بيانات النظام بنجاح!</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
