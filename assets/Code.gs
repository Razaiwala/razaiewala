/**
 * Jindal Razaie Udyog — Bulk Order logging + status lookup
 *
 * SETUP:
 * 1. Open your Google Sheet.
 * 2. Extensions -> Apps Script, paste this whole file in as Code.gs.
 * 3. Change SHEET_NAME below if your tab isn't called "Orders".
 * 4. Deploy -> New deployment -> type: Web app
 *      - Execute as: Me
 *      - Who has access: Anyone
 * 5. Copy the Web app URL it gives you and put it in
 *    GOOGLE_SHEET_SCRIPT_URL in bulk_order.js (and in your
 *    track_order.html if that page calls this same URL).
 *
 * SHEET COLUMNS (auto-created if the sheet is empty):
 * Timestamp | Order ID | Party Name | Mobile | Product | Quantity | Status
 */

const SHEET_NAME = "Orders";
/* Matches the columns already in the user's sheet: A=Order ID, B=Customer
   Name, C=Phone, D=Product, E=Quantity, F=Status, G=Timestamp (added at
   the end so it doesn't disturb the existing layout). */
const HEADERS = ["Order ID", "Customer Name", "Phone", "Product", "Quantity", "Status", "Timestamp"];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  /* Always keep row 1 aligned to HEADERS, whether the sheet was just
     created or already had a header row from an earlier version. */
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  return sheet;
}

/**
 * Handles new orders sent from bulk_order.js (fetch POST, mode: "no-cors").
 * Because the request is fired with mode:"no-cors", the browser sends the
 * body as text/plain — we still read it the same way via e.postData.contents.
 */
function doPost(e) {
  try {
    const sheet = getSheet_();
    const data = JSON.parse(e.postData.contents);

    sheet.appendRow([
      data.orderId || "",
      data.partyName || "",
      data.mobile || "",
      data.product || "",
      data.quantity || "",
      data.status || "Pending",
      new Date()
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handles status lookups from track_order.html:
 *   GET .../exec?orderId=JRU12345678
 * Returns the matching row's status (and other details) as JSON.
 */
function doGet(e) {
  try {
    const orderId = e.parameter.orderId;
    if (!orderId) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: "error", message: "Missing orderId parameter" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const sheet = getSheet_();
    const values = sheet.getDataRange().getValues();
    // values[0] is the header row

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (String(row[0]).trim() === orderId.trim()) {
        return ContentService
          .createTextOutput(JSON.stringify({
            status: "success",
            found: true,
            orderId: row[0],
            partyName: row[1],
            mobile: row[2],
            product: row[3],
            quantity: row[4],
            orderStatus: row[5],
            timestamp: row[6]
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success", found: false, message: "Order not found" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
