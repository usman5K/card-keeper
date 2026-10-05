import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export type ExportCsvResult =
  | { ok: true; method: 'share' | 'download' }
  | { ok: false; reason: string };

function downloadOnWeb(filename: string, contents: string): ExportCsvResult {
  if (typeof document === 'undefined') {
    return { ok: false, reason: 'CSV download is not available in this browser.' };
  }
  const blob = new Blob([contents], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  return { ok: true, method: 'download' };
}

export async function exportCsvFile(
  filename: string,
  contents: string,
): Promise<ExportCsvResult> {
  if (Platform.OS === 'web') {
    return downloadOnWeb(filename, contents);
  }

  try {
    const file = new File(Paths.cache, filename);
    file.create({ overwrite: true });
    file.write(contents);

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      return {
        ok: false,
        reason: 'Sharing is not available on this device.',
      };
    }

    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export FuelLedger report',
      UTI: 'public.comma-separated-values-text',
    });
    return { ok: true, method: 'share' };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : 'Could not export CSV',
    };
  }
}
