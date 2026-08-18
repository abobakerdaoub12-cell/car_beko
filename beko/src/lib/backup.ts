import type { AppData } from '@/types';

export interface SystemBackupPayload {
  meta: {
    system: string;
    version: string;
    exportedAt: string;
    exportTimestamp: number;
    description: string;
    counts: {
      shops: number;
      inventory: number;
      shipments: number;
      trips: number;
      invoices: number;
      payments: number;
      vehicles: number;
      capitalTransactions?: number;
    };
  };
  data: AppData;
}

/**
 * Exports the complete application database to a formatted JSON file and triggers download.
 */
export function exportDatabaseToJSON(data: AppData): void {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
  const filename = `Hatimi_Backup_${dateStr}_${timeStr}.json`;

  const payload: SystemBackupPayload = {
    meta: {
      system: 'أبناء الحاتمي لقطع الغيار - Wholesale Auto Parts',
      version: '1.0.0',
      exportedAt: now.toISOString(),
      exportTimestamp: now.getTime(),
      description: 'نسخة احتياطية كاملة لقاعدة بيانات نظام إدارة وتوزيع قطع الغيار',
      counts: {
        shops: data.shops?.length || 0,
        inventory: data.inventory?.length || 0,
        shipments: data.shipments?.length || 0,
        trips: data.trips?.length || 0,
        invoices: data.invoices?.length || 0,
        payments: data.payments?.length || 0,
        vehicles: data.vehicles?.length || 0,
        capitalTransactions: data.capitalTransactions?.length || 0,
      },
    },
    data: {
      shops: data.shops || [],
      inventory: data.inventory || [],
      shipments: data.shipments || [],
      trips: data.trips || [],
      invoices: data.invoices || [],
      payments: data.payments || [],
      vehicles: data.vehicles || [],
      capitalTransactions: data.capitalTransactions || [],
    },
  };

  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(payload, null, 2))}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute('download', filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Validates and restores system data from a JSON string.
 */
export function parseAndValidateBackup(jsonString: string): { valid: boolean; error?: string; parsedData?: AppData; meta?: SystemBackupPayload['meta'] } {
  try {
    const raw = JSON.parse(jsonString);
    let appData: AppData | null = null;
    let meta: SystemBackupPayload['meta'] | undefined = undefined;

    if (raw && typeof raw === 'object') {
      if (raw.data && typeof raw.data === 'object' && Array.isArray(raw.data.shops)) {
        appData = raw.data as AppData;
        meta = raw.meta;
      } else if (Array.isArray(raw.shops)) {
        // Direct AppData format
        appData = raw as AppData;
      }
    }

    if (!appData) {
      return { valid: false, error: 'الملف لا يحتوي على بيانات نظام صالحة.' };
    }

    const cleanData: AppData = {
      shops: Array.isArray(appData.shops) ? appData.shops : [],
      inventory: Array.isArray(appData.inventory) ? appData.inventory : [],
      shipments: Array.isArray(appData.shipments) ? appData.shipments : [],
      trips: Array.isArray(appData.trips) ? appData.trips : [],
      invoices: Array.isArray(appData.invoices) ? appData.invoices : [],
      payments: Array.isArray(appData.payments) ? appData.payments : [],
      vehicles: Array.isArray(appData.vehicles) ? appData.vehicles : [],
      capitalTransactions: Array.isArray(appData.capitalTransactions) ? appData.capitalTransactions : [],
    };

    return { valid: true, parsedData: cleanData, meta };
  } catch (err: any) {
    return { valid: false, error: `فشل قراءة الملف: ${err?.message || 'تنسيق JSON غير صالح'}` };
  }
}
