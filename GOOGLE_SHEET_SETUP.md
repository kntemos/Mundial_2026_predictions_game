# Collecting predictions in a Google Sheet

The **Submit predictions** button POSTs each person's picks to a Google Apps
Script Web App, which appends them to a Google Sheet you own. No database, and
your friends don't need a Google account — they just open the app and submit.

Re-submitting **replaces** that player's previous rows, so people can change
their minds and the sheet stays clean (one set of rows per player).

## 1. Create the sheet + script

1. Create a new Google Sheet (any name).
2. **Extensions → Apps Script**.
3. Delete the placeholder code and paste the script below. **Save** (💾).

```javascript
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Predictions') || ss.insertSheet('Predictions');

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(
        ['Timestamp', 'Player', 'Match', 'Date', 'Home', 'Away', 'HomeScore', 'AwayScore']
      );
    }

    var data = JSON.parse(e.postData.contents);
    var player = (data.player || '').toString().trim();
    var when = data.submittedAt || new Date().toISOString();
    var rows = data.predictions || [];

    // Remove this player's previous rows so a re-submit updates their picks.
    var values = sheet.getDataRange().getValues();
    for (var i = values.length - 1; i >= 1; i--) {
      if ((values[i][1] || '').toString().trim().toLowerCase() === player.toLowerCase()) {
        sheet.deleteRow(i + 1);
      }
    }

    rows.forEach(function (r) {
      sheet.appendRow([when, player, r.match, r.date, r.home, r.away, r.homeScore, r.awayScore]);
    });

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, written: rows.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput('Mundial 2026 predictions endpoint is live.');
}
```

## 2. Deploy it as a Web App

1. Top-right **Deploy → New deployment**.
2. Click the gear ⚙ next to "Select type" → **Web app**.
3. Settings:
   - **Execute as:** Me
   - **Who has access:** **Anyone**  ← required so friends can submit without logging in
4. **Deploy**, then **Authorize access** and allow the permissions (it's your own script).
5. Copy the **Web app URL** — it ends in `/exec`.

> If you later edit the script, use **Deploy → Manage deployments → Edit (pencil)
> → Version: New version** to push changes to the *same* URL.

## 3. Connect the app to your sheet

1. In this project folder, copy `.env.example` to **`.env.local`**.
2. Paste your URL:

   ```
   VITE_SHEET_ENDPOINT=https://script.google.com/macros/s/AKfy.../exec
   ```

3. Restart the dev server (`npm run dev`) so the new value is picked up.
   For a hosted build, set the same variable in your host's env and rebuild.

Now click **Submit predictions** — a new row set should appear in your sheet.

## Notes

- Apps Script Web Apps don't send CORS headers, so the app submits in
  `no-cors` mode and can't read the response. It assumes success if there's no
  network error. If something looks off, check the sheet directly.
- The endpoint URL ends up in the app's client-side JavaScript (that's normal
  and unavoidable for a static site). It's not a secret — anyone with the URL
  can append rows — but it's harmless for a friendly predictions game. Keeping
  it in `.env.local` just keeps it out of the public Git repo.
- **Export file** still works as an offline backup if you'd rather not use the
  sheet, or if a friend has no internet at submit time.
```
