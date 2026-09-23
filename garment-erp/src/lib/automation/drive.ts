/**
 * Google Drive archive module.
 *
 * Uses a service-account JSON key (env vars) with drive.file scope.
 * Folder structure follows the Ethiopian calendar:
 *   Factory Reports / {year} ዓ.ም / {month} — {monthName} / {reportType}
 *
 * File names: YYYY-MM-DD_report-type_v1.pdf  (zero-padded, sorts correctly)
 * On correction: _v2, original kept.
 *
 * Service account credentials come from env:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY  (newlines as \n in .env)
 *   GOOGLE_DRIVE_ROOT_FOLDER_ID
 */

const DRIVE_API = "https://www.googleapis.com/upload/drive/v3/files";
const DRIVE_META = "https://www.googleapis.com/drive/v3/files";

// ─── JWT helper ───────────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string | null> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key   = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
  if (!email || !key) return null;

  const now  = Math.floor(Date.now() / 1000);
  const claim = {
    iss:   email,
    scope: "https://www.googleapis.com/auth/drive.file",
    aud:   "https://oauth2.googleapis.com/token",
    iat:   now,
    exp:   now + 3600,
  };

  // Build unsigned JWT
  const header  = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" })).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
  const payload = btoa(JSON.stringify(claim)).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
  const unsigned = `${header}.${payload}`;

  // Sign with RS256 — requires crypto.subtle (Node 18+)
  const pemBody = key.replace(/-----[A-Z ]+-----/g, "").replace(/\s/g, "");
  const keyBuf  = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", keyBuf,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );
  const sigBuf = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", cryptoKey,
    new TextEncoder().encode(unsigned)
  );
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf))).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
  const jwt = `${unsigned}.${sig}`;

  const res  = await fetch("https://oauth2.googleapis.com/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  return data.access_token ?? null;
}

// ─── Folder helpers ───────────────────────────────────────────────────────────

async function findOrCreateFolder(
  token: string,
  name: string,
  parentId: string
): Promise<string> {
  // Search for existing folder
  const q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
  const res = await fetch(`${DRIVE_META}?q=${encodeURIComponent(q)}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (data.files?.length > 0) return data.files[0].id;

  // Create
  const cr = await fetch(`${DRIVE_META}?fields=id`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents:  [parentId],
    }),
  });
  const cd = await cr.json();
  return cd.id;
}

/** Build the Drive folder path for a given report date and type. */
async function getOrCreateReportFolder(
  token:      string,
  rootId:     string,
  ethYear:    number,
  ethMonth:   number,
  monthName:  string,
  reportType: string
): Promise<string> {
  const yearFolder  = await findOrCreateFolder(token, `${ethYear} ዓ.ም`,                  rootId);
  const monthFolder = await findOrCreateFolder(token, `${ethMonth} — ${monthName}`,        yearFolder);
  const typeFolder  = await findOrCreateFolder(token, reportType,                          monthFolder);
  return typeFolder;
}

// ─── Upload ────────────────────────────────────────────────────────────────────

export interface DriveUploadResult {
  ok:      boolean;
  fileId?: string;
  webUrl?: string;
  error?:  string;
}

export async function uploadToDrive(opts: {
  filename:   string;
  buffer:     Buffer;
  mimeType:   string;       // "application/pdf" or spreadsheet mime
  ethYear:    number;
  ethMonth:   number;
  monthName:  string;
  reportType: string;       // human-readable folder name, e.g. "Incentive Statement"
}): Promise<DriveUploadResult> {
  const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!rootId) return { ok: false, error: "GOOGLE_DRIVE_ROOT_FOLDER_ID not set" };

  const token = await getAccessToken();
  if (!token)  return { ok: false, error: "Could not obtain Drive access token" };

  try {
    const folderId = await getOrCreateReportFolder(
      token, rootId, opts.ethYear, opts.ethMonth, opts.monthName, opts.reportType
    );

    // Multipart upload
    const boundary = "===boundary===";
    const meta     = JSON.stringify({ name: opts.filename, parents: [folderId] });
    const body     = [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8",
      "",
      meta,
      `--${boundary}`,
      `Content-Type: ${opts.mimeType}`,
      "",
    ].join("\r\n") + "\r\n" + opts.buffer.toString("binary") + `\r\n--${boundary}--`;

    const res  = await fetch(`${DRIVE_API}?uploadType=multipart&fields=id,webViewLink`, {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary="${boundary}"`,
      },
      body: Buffer.from(body, "binary"),
    });
    const data = await res.json();

    if (data.id) {
      return { ok: true, fileId: data.id, webUrl: data.webViewLink };
    }
    return { ok: false, error: data.error?.message ?? "Upload failed" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
