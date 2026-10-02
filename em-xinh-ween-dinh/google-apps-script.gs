/**
 * Nhận đăng ký giải Em Xinh Ween Đỉnh từ ladipage -> ghi vào Google Sheet này,
 * mỗi bảng (Series A / Series B / KOL) 1 sheet riêng; lưu hình thiệp / hình chuyển khoản vào thư mục Drive "EmXinh_WeenDinh_HinhDangKy".
 * Cách cài: xem huong-dan-google-sheet.md
 */
var TABS = ['Series A', 'Series B', 'KOL']; // mỗi bảng thi đấu 1 sheet
var FOLDER_NAME = 'EmXinh_WeenDinh_HinhDangKy';
var HEADERS = ['Thời gian','Tên đăng ký (hiển thị trên thiệp)','Số điện thoại','Bảng thi đấu','Phí áp dụng','Hình thiệp','Hình chuyển khoản','Trạng thái','Ghi chú'];

function getSheet_(bang) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = TABS.indexOf(bang) >= 0 ? bang : 'Khác';
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#ff4fb8').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.setColumnWidths(1, HEADERS.length, 150);
    sh.getRange(2, 8, 998, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(['Chờ xác nhận','Đã nhận phí','Đã xác nhận','Hủy'], true).build());
  }
  return sh;
}

// Chạy 1 lần (nút ▶ Chạy) để tạo sẵn 3 sheet Series A / Series B / KOL
function setup() {
  TABS.forEach(function (t) { getSheet_(t); });
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var first = ss.getSheets().filter(function (s) { return TABS.indexOf(s.getName()) < 0 && s.getLastRow() <= 1; });
  first.forEach(function (s) { if (ss.getSheets().length > 1) ss.deleteSheet(s); });
}

function folder_() {
  var it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}

function saveImg_(dataUrl, name) {
  if (!dataUrl) return '';
  var m = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return '';
  var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], name + '.jpg');
  var f = folder_().createFile(blob);
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return f.getUrl();
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var d = JSON.parse(e.postData.contents);
    if (!d.ten || !d.sdt || !d.bang || !d.thiep || !d.ck) throw new Error('thiếu thông tin');
    var safe = String(d.ten).replace(/[^\wÀ-ỹ ]/g, '').trim().slice(0, 40) + '_' + String(d.sdt).slice(-4);
    var link1 = saveImg_(d.thiep, 'thiep_' + safe);
    var link2 = saveImg_(d.ck, 'ck_' + safe);
    getSheet_(d.bang).appendRow([new Date(), d.ten, "'" + d.sdt, d.bang, d.gia || '', link1, link2, 'Chờ xác nhận', '']);
    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function doGet() { return out_({ ok: true, msg: 'Em Xinh Ween Đỉnh – endpoint đang chạy' }); }

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
