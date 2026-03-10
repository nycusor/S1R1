/**
 * Google Apps Script Web App for Round 1 / Stage 1 ID Test.
 *
 * Setup:
 * 1. Create a Google Sheet and copy its spreadsheet ID.
 * 2. Replace SPREADSHEET_ID below.
 * 3. In Apps Script, paste this file as Code.gs.
 * 4. Deploy -> New deployment -> Web app.
 * 5. Execute as: Me
 * 6. Who has access: Anyone with the link
 * 7. Copy the Web App URL into CONFIG.endpointUrl in the HTML.
 */

const SPREADSHEET_ID = 'PASTE_YOUR_SPREADSHEET_ID_HERE';
const SHEET_SUBMISSIONS = 'submissions';
const SHEET_PAIR_RUNS = 'pair_runs';
const SHEET_TRIAL_LOGS = 'trial_logs';

function doPost(e) {
  try {
    ensureSheets_();

    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_({ ok: false, message: 'No POST body received.' }, 400);
    }

    const payload = JSON.parse(e.postData.contents);
    const submissionId = Utilities.getUuid();
    const receivedAt = new Date();

    writeSubmission_(payload, submissionId, receivedAt);
    writePairRuns_(payload, submissionId, receivedAt);
    writeTrialLogs_(payload, submissionId, receivedAt);

    return jsonResponse_({
      ok: true,
      submission_id: submissionId,
      received_at: receivedAt.toISOString()
    });
  } catch (err) {
    return jsonResponse_({ ok: false, message: String(err && err.message ? err.message : err) }, 500);
  }
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureSheets_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  const submissionHeaders = [
    'submission_id', 'received_at', 'participant_id', 'name', 'phone', 'phone_normalized',
    'class_no', 'round', 'stage', 'start_at', 'end_at', 'app_version', 'submitted_client_at', 'user_agent'
  ];

  const pairRunHeaders = [
    'submission_id', 'received_at', 'participant_id', 'pair', 'started_at', 'completed_at',
    'status', 'precise_band', 'coarse_window', 'final_reason', 'total_items'
  ];

  const trialLogHeaders = [
    'submission_id', 'received_at', 'participant_id', 'pair', 'order', 'phase', 'step',
    'file', 'response', 'at'
  ];

  ensureSheet_(ss, SHEET_SUBMISSIONS, submissionHeaders);
  ensureSheet_(ss, SHEET_PAIR_RUNS, pairRunHeaders);
  ensureSheet_(ss, SHEET_TRIAL_LOGS, trialLogHeaders);
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
}

function writeSubmission_(payload, submissionId, receivedAt) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_SUBMISSIONS);

  sheet.appendRow([
    submissionId,
    receivedAt.toISOString(),
    payload.participant_id || '',
    payload.name || '',
    payload.phone || '',
    payload.phone_normalized || normalizePhone_(payload.phone || ''),
    payload.class_no || '',
    payload.round || '',
    payload.stage || '',
    payload.start_at || '',
    payload.end_at || '',
    payload.app_version || '',
    payload.submitted_client_at || '',
    payload.user_agent || ''
  ]);
}

function writePairRuns_(payload, submissionId, receivedAt) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_PAIR_RUNS);
  const pairRuns = Array.isArray(payload.pair_runs) ? payload.pair_runs : [];

  if (!pairRuns.length) return;

  const rows = pairRuns.map(run => [
    submissionId,
    receivedAt.toISOString(),
    payload.participant_id || '',
    run.pair || '',
    run.started_at || '',
    run.completed_at || '',
    run.status || '',
    run.precise_band || '',
    run.coarse_window || '',
    run.final_reason || '',
    run.total_items || ''
  ]);

  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function writeTrialLogs_(payload, submissionId, receivedAt) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_TRIAL_LOGS);
  const pairRuns = Array.isArray(payload.pair_runs) ? payload.pair_runs : [];

  const rows = [];
  pairRuns.forEach(run => {
    const logs = Array.isArray(run.logs) ? run.logs : [];
    logs.forEach(log => {
      rows.push([
        submissionId,
        receivedAt.toISOString(),
        payload.participant_id || '',
        run.pair || '',
        log.order || '',
        log.phase || '',
        log.step || '',
        log.file || '',
        log.response || '',
        log.at || ''
      ]);
    });
  });

  if (!rows.length) return;
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function normalizePhone_(phone) {
  return String(phone || '').replace(/\D/g, '');
}
