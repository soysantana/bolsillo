import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export type DownloadResult = 'downloaded' | 'opened' | 'saved' | 'shared';

const BACKUP_FOLDER = 'Bolsillo';

const isAppleMobile = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const canShare = (file: File): boolean => {
  try {
    return (
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    );
  } catch {
    return false;
  }
};

const shareFile = async (file: File, title: string): Promise<boolean> => {
  if (!canShare(file)) return false;
  await navigator.share({ files: [file], title });
  return true;
};

const shareNativeFile = async (uri: string, name: string): Promise<boolean> => {
  if (!Capacitor.isPluginAvailable('Share')) return false;
  const { value } = await Share.canShare();
  if (!value) return false;
  await Share.share({
    title: name,
    files: [uri],
    dialogTitle: 'Compartir archivo',
  });
  return true;
};

const saveNativeFile = async (name: string, content: string): Promise<DownloadResult> => {
  await Filesystem.mkdir({
    path: BACKUP_FOLDER,
    directory: Directory.Documents,
    recursive: true,
  }).catch(() => undefined);

  const { uri } = await Filesystem.writeFile({
    path: `${BACKUP_FOLDER}/${name}`,
    data: content,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
    recursive: true,
  });
  try {
    return (await shareNativeFile(uri, name)) ? 'shared' : 'saved';
  } catch {
    return 'saved';
  }
};

const openFile = (blob: Blob): boolean => {
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    URL.revokeObjectURL(url);
    return false;
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
};

const anchorDownload = (name: string, blob: Blob): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export async function downloadFile(
  name: string,
  content: string,
  type: string,
): Promise<DownloadResult> {
  if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Filesystem')) {
    return saveNativeFile(name, content);
  }

  const blob = new Blob([content], { type });
  const file = new File([blob], name, { type });
  if (isAppleMobile()) {
    if (await shareFile(file, name)) return 'shared';
    if (openFile(blob)) return 'opened';
    throw new Error('Download unavailable');
  }
  anchorDownload(name, blob);
  return 'downloaded';
}
