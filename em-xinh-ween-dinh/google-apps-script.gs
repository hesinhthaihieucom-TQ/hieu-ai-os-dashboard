/**
 * Nhận đăng ký giải Em Xinh Ween Đỉnh từ ladipage -> ghi vào Google Sheet này,
 * lưu hình thiệp / hình chuyển khoản vào thư mục Drive "EmXinh_WeenDinh_HinhDangKy".
 * Cách cài: xem huong-dan-google-sheet.md
 */
var SHEET_NAME = 'Đăng ký';
var FOLDER_NAME = 'EmXinh_WeenDinh_HinhDangKy';
var HEADERS = ['Thời gian','Tên đăng ký (hiển thị trên thiệp)','Số điện thoại','Bảng thi đấu','Đồng đội','Phí áp dụng','Hình thiệp','Hình chuyển khoản','Trạng thái','Ghi chú'];

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#ff4fb8').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.getRange(2, 9, 998, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(['Chờ xác nhận','Đã nhận phí','Đã xác nhận','Hủy'], true).build());
  }
  return sh;
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
    if (!d.ten || !d.sdt || !d.bang || !d.thiep) throw new Error('thiếu thông tin');
    var safe = String(d.ten).replace(/[^\wÀ-ỹ ]/g, '').trim().slice(0, 40) + '_' + String(d.sdt).slice(-4);
    var link1 = saveImg_(d.thiep, 'thiep_' + safe);
    var link2 = saveImg_(d.ck, 'ck_' + safe);
    getSheet_().appendRow([new Date(), d.ten, "'" + d.sdt, d.bang, d.doidoi || '', d.gia || '', link1, link2, 'Chờ xác nhận', '']);
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
