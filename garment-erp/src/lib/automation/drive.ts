/**
 * Google Drive integration — REMOVED.
 *
 * All report archiving via Google Drive has been removed.
 * Reports are delivered through Telegram only.
 *
 * This stub is kept so any remaining imports compile without errors.
 */

export interface DriveUploadOptions {
  filename:   string;
  buffer:     Buffer;
  mimeType:   string;
  ethYear:    number;
  ethMonth:   number;
  monthName:  string;
  reportType: string;
}

export interface DriveUploadResult {
  fileId: string;
  webUrl: string;
}

/** No-op stub — returns empty strings. */
export async function uploadToDrive(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _options: DriveUploadOptions
): Promise<DriveUploadResult> {
  return { fileId: "", webUrl: "" };
}
