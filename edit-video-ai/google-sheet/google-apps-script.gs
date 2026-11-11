/* =====================================================================================
 * GOOGLE SHEET — AI ĐÃ CHUYỂN KHOẢN KHOÁ "LÀM CHỦ EDIT VIDEO BẰNG AI"
 * Tự kéo giao dịch tiền VÀO từ SePay (cùng cách sheet Em Xinh), chỉ giữ các khoản có nội dung chuyển khoản
 * "SEVQR EDITAI <sđt>" (đúng nội dung mã QR trên ladipage), ghi mỗi khoản 1 dòng. Chạy lại không bị trùng (theo mã giao dịch).
 * Cài 1 lần: xem huong-dan.md (lấy SEPAY_TOKEN, chạy hàm setup rồi caiTuDong).
 * ===================================================================================== */
var TAB = 'Đã chuyển khoản';
var SEPAY_API = 'https://my.sepay.vn/userapi/transactions/list';
var GIA_UU_DAI = 990000;
var HEAD = ['Thời gian CK', 'Số điện thoại', 'Số tiền', 'Đúng giá?', 'Nội dung CK', 'Mã GD SePay', 'Đã mời vào nhóm Zalo?', 'Ghi chú'];

function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k) || ''; }

function setup() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(TAB) || ss.insertSheet(TAB);
  if (sh.getLastRow() < 3) {
    sh.getRange(1, 1).setValue('Danh sách đã chuyển khoản — khoá Làm Chủ Edit Video Bằng AI (tự cập nhật từ SePay mỗi 10 phút)')
      .setFontWeight('bold').setFontSize(13);
    sh.getRange(2, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight('bold').setBackground('#d9ae45').setFontColor('#111111');
    sh.setFrozenRows(2);
    sh.getRange('B3:B').setNumberFormat('@');             // cột SĐT là chữ để giữ số 0 đầu
    sh.getRange('C3:C').setNumberFormat('#,##0"đ"');
    sh.getRange('G3:G').insertCheckboxes();               // tick khi đã mời khách vào nhóm
    sh.setColumnWidths(1, 1, 130); sh.setColumnWidths(2, 1, 120); sh.setColumnWidths(3, 1, 110);
    sh.setColumnWidths(4, 1, 110); sh.setColumnWidths(5, 1, 280); sh.setColumnWidths(6, 1, 110);
    sh.setColumnWidths(7, 1, 170); sh.setColumnWidths(8, 1, 260);
  }
  var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('Trang tính1');
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def);
  SpreadsheetApp.getUi().alert('Đã dựng xong. Bước tiếp theo: Cài đặt dự án → Thuộc tính tập lệnh → thêm SEPAY_TOKEN, rồi chạy hàm caiTuDong.');
}

function sepayFetch_(days) {
  var token = prop_('SEPAY_TOKEN');
  if (!token) throw new Error('Chưa có SEPAY_TOKEN (Cài đặt dự án → Thuộc tính tập lệnh)');
  var min = Utilities.formatDate(new Date(Date.now() - days * 864e5), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss');
  var acc = prop_('SEPAY_ACCOUNT');
  var url = SEPAY_API + '?limit=1000&transaction_date_min=' + encodeURIComponent(min) + (acc ? '&account_number=' + encodeURIComponent(acc) : '');
  var res = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('SePay trả lỗi ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 200));
  return (JSON.parse(res.getContentText()).transactions || []).filter(function (t) { return Number(t.amount_in) > 0; });
}

// Ngân hàng đôi khi bỏ/đổi khoảng trắng ("SEVQREDITAI0912345678"), nên gom hết khoảng trắng rồi mới tìm EDITAI + 10 số.
function layDienThoai_(content) {
  var m = String(content || '').replace(/[\s.\-_]/g, '').toUpperCase().match(/EDITAI(0\d{9})/);
  return m ? m[1] : '';
}

function capNhat() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) return;
  try {
    var ss = SpreadsheetApp.getActive();
    var sh = ss.getSheetByName(TAB);
    if (!sh) { setup(); sh = ss.getSheetByName(TAB); }
    var co = {};                                           // mã GD đã có trong sheet
    if (sh.getLastRow() >= 3) sh.getRange(3, 6, sh.getLastRow() - 2, 1).getValues().forEach(function (r) { if (r[0] !== '') co[String(r[0])] = 1; });
    var txs = sepayFetch_(60).filter(function (t) { return /EDITAI/i.test(String(t.transaction_content || t.content || '').replace(/\s/g, '')); });
    txs.sort(function (a, b) { return String(a.transaction_date).localeCompare(String(b.transaction_date)); });
    var rows = [];
    txs.forEach(function (t) {
      var id = String(t.id); if (co[id]) return;
      var nd = String(t.transaction_content || t.content || ''), tien = Number(t.amount_in);
      var dung = tien === GIA_UU_DAI ? 'Đúng' : (tien > GIA_UU_DAI ? 'Cao hơn' : 'THIẾU TIỀN');
      rows.push([t.transaction_date, layDienThoai_(nd), tien, dung, nd, id, false, layDienThoai_(nd) ? '' : 'Không đọc được SĐT — hỏi khách']);
    });
    if (rows.length) {
      var r0 = Math.max(sh.getLastRow(), 2) + 1;
      sh.getRange(r0, 1, rows.length, HEAD.length).setValues(rows);
      sh.getRange(r0, 2, rows.length, 1).setNumberFormat('@');
      sh.getRange(r0, 7, rows.length, 1).insertCheckboxes();
      rows.forEach(function (r, i) {                       // tô đỏ dòng bất thường để dễ thấy
        if (r[3] !== 'Đúng' || !r[1]) sh.getRange(r0 + i, 1, 1, HEAD.length).setBackground('#fde2e1');
      });
    }
    var tong = Math.max(sh.getLastRow() - 2, 0);
    sh.getRange(1, 8).setValue('Tổng: ' + tong + ' người · cập nhật ' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM HH:mm')).setFontStyle('italic');
  } finally { lock.releaseLock(); }
}

function caiTuDong() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'capNhat') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('capNhat').timeBased().everyMinutes(10).create();
  capNhat();
  SpreadsheetApp.getUi().alert('Xong! Sheet sẽ tự cập nhật mỗi 10 phút.');
}
