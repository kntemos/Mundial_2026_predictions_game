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
var LOCK_BEFORE_MS = 5 * 60 * 1000; // predictions lock 5 min before kickoff

// Kickoff per match label ("Home v Away"), with timezone offset (CET). The
// SERVER clock + this table decide whether a pick is too late, so a player
// changing their own device clock can't sneak in a late change.
// Keep in sync with src/matches.ts if you edit the fixtures.
var KICKOFFS = {
  'Mexico v South Africa': '2026-06-11T21:00:00+02:00',
  'South Korea v Czechia': '2026-06-12T04:00:00+02:00',
  'Canada v Bosnia and Herzegovina': '2026-06-12T21:00:00+02:00',
  'USA v Paraguay': '2026-06-13T03:00:00+02:00',
  'Qatar v Switzerland': '2026-06-13T21:00:00+02:00',
  'Brazil v Morocco': '2026-06-14T00:00:00+02:00',
  'Haiti v Scotland': '2026-06-14T03:00:00+02:00',
  'Australia v Türkiye': '2026-06-14T06:00:00+02:00',
  'Germany v Curaçao': '2026-06-14T19:00:00+02:00',
  'Netherlands v Japan': '2026-06-14T22:00:00+02:00',
  'Ivory Coast v Ecuador': '2026-06-15T01:00:00+02:00',
  'Sweden v Tunisia': '2026-06-15T04:00:00+02:00',
  'Spain v Cape Verde': '2026-06-15T18:00:00+02:00',
  'Belgium v Egypt': '2026-06-15T21:00:00+02:00',
  'Saudi Arabia v Uruguay': '2026-06-16T00:00:00+02:00',
  'Iran v New Zealand': '2026-06-16T03:00:00+02:00',
  'France v Senegal': '2026-06-16T21:00:00+02:00',
  'Iraq v Norway': '2026-06-17T00:00:00+02:00',
  'Argentina v Algeria': '2026-06-17T03:00:00+02:00',
  'Austria v Jordan': '2026-06-17T06:00:00+02:00',
  'Portugal v DR Congo': '2026-06-17T19:00:00+02:00',
  'England v Croatia': '2026-06-17T22:00:00+02:00',
  'Ghana v Panama': '2026-06-18T01:00:00+02:00',
  'Uzbekistan v Colombia': '2026-06-18T04:00:00+02:00',
  'Czechia v South Africa': '2026-06-18T18:00:00+02:00',
  'Switzerland v Bosnia and Herzegovina': '2026-06-18T21:00:00+02:00',
  'Canada v Qatar': '2026-06-19T00:00:00+02:00',
  'Mexico v South Korea': '2026-06-19T03:00:00+02:00',
  'USA v Australia': '2026-06-19T21:00:00+02:00',
  'Scotland v Morocco': '2026-06-20T00:00:00+02:00',
  'Brazil v Haiti': '2026-06-20T02:30:00+02:00',
  'Türkiye v Paraguay': '2026-06-20T05:00:00+02:00',
  'Netherlands v Sweden': '2026-06-20T19:00:00+02:00',
  'Germany v Ivory Coast': '2026-06-20T22:00:00+02:00',
  'Ecuador v Curaçao': '2026-06-21T02:00:00+02:00',
  'Tunisia v Japan': '2026-06-21T06:00:00+02:00',
  'Spain v Saudi Arabia': '2026-06-21T18:00:00+02:00',
  'Belgium v Iran': '2026-06-21T21:00:00+02:00',
  'Uruguay v Cape Verde': '2026-06-22T00:00:00+02:00',
  'New Zealand v Egypt': '2026-06-22T03:00:00+02:00',
  'Argentina v Austria': '2026-06-22T19:00:00+02:00',
  'France v Iraq': '2026-06-22T23:00:00+02:00',
  'Norway v Senegal': '2026-06-23T02:00:00+02:00',
  'Jordan v Algeria': '2026-06-23T05:00:00+02:00',
  'Portugal v Uzbekistan': '2026-06-23T19:00:00+02:00',
  'England v Ghana': '2026-06-23T22:00:00+02:00',
  'Panama v Croatia': '2026-06-24T01:00:00+02:00',
  'Colombia v DR Congo': '2026-06-24T04:00:00+02:00',
  'Switzerland v Canada': '2026-06-24T21:00:00+02:00',
  'Bosnia and Herzegovina v Qatar': '2026-06-24T21:00:00+02:00',
  'Scotland v Brazil': '2026-06-25T00:00:00+02:00',
  'Morocco v Haiti': '2026-06-25T00:00:00+02:00',
  'Czechia v Mexico': '2026-06-25T03:00:00+02:00',
  'South Africa v South Korea': '2026-06-25T03:00:00+02:00',
  'Curaçao v Ivory Coast': '2026-06-25T22:00:00+02:00',
  'Ecuador v Germany': '2026-06-25T22:00:00+02:00',
  'Japan v Sweden': '2026-06-26T01:00:00+02:00',
  'Tunisia v Netherlands': '2026-06-26T01:00:00+02:00',
  'Türkiye v USA': '2026-06-26T04:00:00+02:00',
  'Paraguay v Australia': '2026-06-26T04:00:00+02:00',
  'Norway v France': '2026-06-26T21:00:00+02:00',
  'Senegal v Iraq': '2026-06-26T21:00:00+02:00',
  'Cape Verde v Saudi Arabia': '2026-06-27T02:00:00+02:00',
  'Uruguay v Spain': '2026-06-27T02:00:00+02:00',
  'Egypt v Iran': '2026-06-27T05:00:00+02:00',
  'New Zealand v Belgium': '2026-06-27T05:00:00+02:00',
  'Panama v England': '2026-06-27T23:00:00+02:00',
  'Croatia v Ghana': '2026-06-27T23:00:00+02:00',
  'Colombia v Portugal': '2026-06-28T01:30:00+02:00',
  'DR Congo v Uzbekistan': '2026-06-28T01:30:00+02:00',
  'Algeria v Austria': '2026-06-28T04:00:00+02:00',
  'Jordan v Argentina': '2026-06-28T04:00:00+02:00',
};

function isLockedServer(matchLabel) {
  var iso = KICKOFFS[matchLabel];
  if (!iso) return false; // unknown fixture -> treat as open
  return Date.now() >= new Date(iso).getTime() - LOCK_BEFORE_MS;
}

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
    var when = new Date().toISOString(); // server time; client's submittedAt is ignored
    var incoming = data.predictions || [];

    // Find this player's existing rows (keyed by match) + their sheet positions.
    var values = sheet.getDataRange().getValues();
    var existing = {};
    var rowsToDelete = [];
    for (var i = values.length - 1; i >= 1; i--) {
      if ((values[i][1] || '').toString().trim().toLowerCase() === player.toLowerCase()) {
        if (!(values[i][2] in existing)) existing[values[i][2]] = values[i];
        rowsToDelete.push(i + 1);
      }
    }

    // Build final rows: KEEP already-locked picks as-is, apply updates only to
    // matches that are still open. This preserves earlier predictions and
    // rejects any late change to a locked match.
    var finalByMatch = {};
    for (var mkey in existing) {
      if (isLockedServer(mkey)) finalByMatch[mkey] = existing[mkey];
    }
    incoming.forEach(function (r) {
      if (isLockedServer(r.match)) return; // too late — ignore
      finalByMatch[r.match] =
        [when, player, r.match, r.date, r.home, r.away, r.homeScore, r.awayScore];
    });

    // Rewrite this player's rows (delete old bottom-up, then append merged set).
    rowsToDelete.forEach(function (rn) { sheet.deleteRow(rn); });
    Object.keys(finalByMatch).forEach(function (mkey) {
      sheet.appendRow(finalByMatch[mkey]);
    });

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, written: Object.keys(finalByMatch).length }))
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

## Deadline enforcement (server-side lock)

`doPost` now enforces the 5-minutes-before-kickoff deadline using the **server's
own clock** and the `KICKOFFS` table — so changing a device clock, editing the
page, or POSTing directly can no longer add or change a pick after a match
locks. On every submit it:

- **Keeps** all of a player's already-locked picks exactly as saved.
- **Applies updates only to matches that are still open.**
- **Ignores** any value sent for a locked match.

So earlier predictions are never lost, and late changes are silently dropped.

> After replacing the script you must **redeploy a new version** (Deploy →
> Manage deployments → Edit ✏️ → Version: New version → Deploy) for this to take
> effect. The in-app lock still exists as the friendly UX layer; this is the
> rule that actually enforces it. If you edit fixtures in `src/matches.ts`,
> update the `KICKOFFS` table to match.

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
