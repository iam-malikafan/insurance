/**
 * Website reviews backend – Google Apps Script
 * Stores reviews in a Google Sheet and returns them to the website.
 * Setup: see SETUP.md
 */
const SHEET_NAME = 'Reviews';
const NOTIFY_EMAIL = 'karandeepsinghinsurance@gmail.com'; // set to '' to turn off email alerts

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['Date', 'Name', 'Service', 'Rating', 'Review', 'Show (TRUE/FALSE)']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Website reads reviews here
function doGet() {
  const rows = getSheet_().getDataRange().getValues();
  rows.shift();
  const out = rows
    .filter(r => r[1] && String(r[5]).toUpperCase() !== 'FALSE')
    .map(r => ({ date: r[0], name: String(r[1]), service: String(r[2]), rating: Number(r[3]) || 5, text: String(r[4]) }))
    .reverse()
    .slice(0, 100);
  return json_(out);
}

// Website posts new reviews here
function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents || '{}');
    const name = String(d.name || '').trim().slice(0, 60);
    const service = String(d.service || '').trim().slice(0, 60);
    const text = String(d.text || '').trim().slice(0, 600);
    const rating = Math.max(1, Math.min(5, parseInt(d.rating, 10) || 5));
    if (!name || text.length < 10) return json_({ ok: false });
    // basic spam guard: block links
    if (/https?:\/\/|www\./i.test(text)) return json_({ ok: false });

    const lock = LockService.getScriptLock();
    lock.waitLock(5000);
    getSheet_().appendRow([new Date(), name, service, rating, text, true]);
    lock.releaseLock();

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail(NOTIFY_EMAIL, 'New website review (' + rating + '★) – ' + name,
        name + ' (' + service + ') wrote:\n\n' + text +
        '\n\nTo hide this review, open the Google Sheet and set "Show" to FALSE.');
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false });
  }
}
