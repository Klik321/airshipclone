/**
 * Airship — lead capture endpoint (Google Apps Script).
 * Receives form submissions from the website and appends one row per lead
 * to the bound Google Sheet. Runs on Google's servers 24/7 — works whether
 * your computer is on or off.
 *
 * SETUP: see SETUP.md in this folder.
 */

// Optional shared secret. If you set a value here, also set the same value as
// LEAD_TOKEN in script.js. Leave '' to accept all submissions.
var SHARED_TOKEN = '';

var HEADERS = ['תאריך', 'שם', 'טלפון', 'אימייל', 'סוג פנייה', 'פתרון', 'אירוע', 'הערות', 'מקור'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000); // avoid two submissions writing the same row at once

    var data = {};
    try { data = JSON.parse(e.postData.contents); } catch (err) { data = e.parameter || {}; }

    if (SHARED_TOKEN && data.token !== SHARED_TOKEN) {
      return json({ ok: false, error: 'unauthorized' });
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS); // write header once

    sheet.appendRow([
      new Date(),
      data.name || '',
      data.phone || '',
      data.email || '',
      data.need || '',
      data.solution || '',
      data.occasion || '',
      data.notes || '',
      data.source || ''
    ]);

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// A simple GET so you can sanity-check the URL in a browser.
function doGet() {
  return json({ ok: true, service: 'airship-lead-capture' });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
