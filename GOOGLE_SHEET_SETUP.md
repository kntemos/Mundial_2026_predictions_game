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

// Returns all predictions + entered results as JSON, so the app's "Standings"
// tab can draw the cumulative points chart. GET requests are readable from the
// browser (the response is served with Access-Control-Allow-Origin: *).
function doGet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var out = { predictions: [], results: [] };

  var preds = ss.getSheetByName('Predictions');
  if (preds && preds.getLastRow() > 1) {
    var pv = preds.getDataRange().getValues();
    for (var i = 1; i < pv.length; i++) {
      out.predictions.push({
        player: (pv[i][1] || '').toString().trim(),
        match: pv[i][2],
        homeScore: pv[i][6],
        awayScore: pv[i][7]
      });
    }
  }

  var results = ss.getSheetByName('Results');
  if (results && results.getLastRow() > 1) {
    var rv = results.getDataRange().getValues();
    for (var j = 1; j < rv.length; j++) {
      if (rv[j][3] !== '' && rv[j][4] !== '') {
        out.results.push({ match: rv[j][0], homeGoals: rv[j][3], awayGoals: rv[j][4] });
      }
    }
  }

  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ===================== Scoring & standings ===================== */

// Menu shown in the spreadsheet (appears after you reload the sheet).
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚽ Predictions')
    .addItem('1. Refresh match list', 'setupResultsTab')
    .addItem('2. Update standings', 'updateStandings')
    .addToUi();
}

function sign(n) {
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}

// Scoring rules:
//   3 pts  correct outcome (win / draw / loss)
//   3 pts  correct goal difference
//   2 pts  correct home-team goals
//   2 pts  correct away-team goals      -> exact score = 10 pts
function scorePrediction(ph, pa, ah, aa) {
  var pts = 0;
  var pd = ph - pa, ad = ah - aa;
  if (sign(pd) === sign(ad)) pts += 3; // outcome
  if (pd === ad) pts += 3;             // goal difference
  if (ph === ah) pts += 2;             // home goals
  if (pa === aa) pts += 2;             // away goals
  return pts;
}

// Lists every match people predicted into a "Results" tab so you can type
// the real scores. Safe to run again — it never overwrites scores you typed.
function setupResultsTab() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var preds = ss.getSheetByName('Predictions');
  if (!preds || preds.getLastRow() < 2) {
    SpreadsheetApp.getUi().alert('No predictions in the sheet yet.');
    return;
  }
  var results = ss.getSheetByName('Results') || ss.insertSheet('Results');
  if (results.getLastRow() === 0) {
    results.appendRow(['Match', 'Home', 'Away', 'HomeGoals', 'AwayGoals']);
    results.setFrozenRows(1);
  }

  var existing = {};
  var rv = results.getDataRange().getValues();
  for (var i = 1; i < rv.length; i++) existing[rv[i][0]] = true;

  var pv = preds.getDataRange().getValues();
  var seen = {};
  for (var j = 1; j < pv.length; j++) {
    var match = pv[j][2], home = pv[j][4], away = pv[j][5];
    if (!match || seen[match]) continue;
    seen[match] = true;
    if (!existing[match]) results.appendRow([match, home, away, '', '']);
  }
  results.autoResizeColumns(1, 5);
}

// Reads predictions + the scores you entered in Results, then writes a
// ranked "Standings" tab. Run it whenever you add new results.
function updateStandings() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var preds = ss.getSheetByName('Predictions');
  var results = ss.getSheetByName('Results');
  if (!preds || !results) {
    SpreadsheetApp.getUi().alert('Run "Refresh match list" first, then enter some results.');
    return;
  }

  // Actual results that have been filled in: match -> {h, a}
  var actual = {};
  var rv = results.getDataRange().getValues();
  for (var i = 1; i < rv.length; i++) {
    var m = rv[i][0], h = rv[i][3], a = rv[i][4];
    if (m !== '' && h !== '' && a !== '' && !isNaN(h) && !isNaN(a)) {
      actual[m] = { h: Number(h), a: Number(a) };
    }
  }

  var totals = {}, played = {};
  var pv = preds.getDataRange().getValues();
  for (var j = 1; j < pv.length; j++) {
    var player = (pv[j][1] || '').toString().trim();
    var match = pv[j][2], ph = pv[j][6], pa = pv[j][7];
    if (!player || !actual[match]) continue;
    if (ph === '' || pa === '' || isNaN(ph) || isNaN(pa)) continue;
    var pts = scorePrediction(Number(ph), Number(pa), actual[match].h, actual[match].a);
    totals[player] = (totals[player] || 0) + pts;
    played[player] = (played[player] || 0) + 1;
  }

  var rows = Object.keys(totals).map(function (p) {
    return [p, totals[p], played[p]];
  });
  rows.sort(function (x, y) { return y[1] - x[1] || (x[0] < y[0] ? -1 : 1); });

  var st = ss.getSheetByName('Standings') || ss.insertSheet('Standings');
  st.clear();
  st.appendRow(['Rank', 'Player', 'Points', 'Matches Scored']);
  st.setFrozenRows(1);
  var rank = 0, prevPts = null;
  for (var k = 0; k < rows.length; k++) {
    if (rows[k][1] !== prevPts) { rank = k + 1; prevPts = rows[k][1]; }
    st.appendRow([rank, rows[k][0], rows[k][1], rows[k][2]]);
  }
  st.autoResizeColumns(1, 4);

  ss.toast(
    rows.length + ' players ranked over ' + Object.keys(actual).length + ' finished matches.',
    'Standings updated', 5
  );
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

## 4. Points & standings (Results + Standings tabs)

The script also calculates points. **Scoring per match** (vs the real score):

| What you got right | Points |
| --- | --- |
| Outcome — win / draw / loss | 3 |
| Goal difference (e.g. real 2‑0, you put 3‑1) | 3 |
| Home‑team goals exactly | 2 |
| Away‑team goals exactly | 2 |
| **Exact score** (all of the above) | **10** |

Since you already pasted the first script, **replace the whole script** in the
Apps Script editor with the updated version above (it includes everything),
then **Save**. You do **not** need to redeploy the Web App. Finally, **reload
the spreadsheet** — a new **⚽ Predictions** menu appears in the menu bar.

Then each time matches finish:

1. **⚽ Predictions → 1. Refresh match list** — creates/updates a **`Results`**
   tab listing every match people predicted.
2. In the **`Results`** tab, type the real score into the **HomeGoals** and
   **AwayGoals** columns for the matches that have finished. Leave unfinished
   matches blank — they're simply ignored.
3. **⚽ Predictions → 2. Update standings** — creates/refreshes a **`Standings`**
   tab: each player ranked by total points (ties share a rank), with how many
   matches counted so far.

Re-run step 3 whenever you add more results. The first time you use the menu,
Google will ask you to authorize the script again (same as before) — that's
expected.

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
