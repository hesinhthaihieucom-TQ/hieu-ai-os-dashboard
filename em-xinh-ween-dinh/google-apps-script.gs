/**
 * Em Xinh Ween Đỉnh – nhận đăng ký từ ladipage, ghi vào Google Sheet (mỗi bảng 1 tab),
 * lưu hình thiệp / hình chuyển khoản vào Drive, và dựng giao diện sheet đẹp + tab "Tổng quan".
 * Cách cài / cập nhật: xem huong-dan-google-sheet.md  (sau khi dán, chạy hàm "setup" 1 lần)
 */
var FOLDER_NAME = 'EmXinh_WeenDinh_HinhDangKy';
var OVERVIEW = 'Tổng quan';
var DATA_ROW = 4;      // dòng đầu tiên chứa dữ liệu (dòng 1 = tiêu đề lớn, 2 = thống kê, 3 = tên cột)
var NCOL = 11;
var TABS = [
  { n: 'Series A', title: 'SERIES A  ·  ĐỘI MẠNH', sub: 'Đôi nữ hạng nặng – mỗi VĐV trình > 2.5', color: '#ff4fb8' },
  { n: 'Series B', title: 'SERIES B  ·  PHONG TRÀO', sub: 'Đôi nữ Newbie – mỗi VĐV trình < 2.5', color: '#8a2be2' },
  { n: 'KOL',      title: 'KOL  ·  ĐẠI CHIẾN',      sub: 'Đôi nữ KOLs tự do',                   color: '#ff9a2e' }
];
var HEADERS = ['Thời gian', 'Tên đăng ký (hiển thị trên thiệp)', 'Số điện thoại', 'Bảng thi đấu', 'Phí áp dụng',
               'Hình thiệp', 'Hình chuyển khoản', 'Mở thiệp', 'Mở CK', 'Trạng thái', 'Ghi chú'];
var STATUS = ['Chờ xác nhận', 'Đã nhận phí', 'Đã xác nhận', 'Hủy'];
var WIDTHS = [150, 230, 130, 110, 110, 130, 130, 90, 90, 140, 240];
var C = { dark: '#2b0b4a', gold: '#f5d77a', pink: '#ff4fb8', soft: '#fff5fb', line: '#f1cfe3', text: '#2a1a3a' };

/* ---------- tiện ích ---------- */
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function folder_() {
  var it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}

function saveImg_(dataUrl, name) {
  if (!dataUrl) return { url: '', id: '' };
  var m = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return { url: '', id: '' };
  var f = folder_().createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], name + '.jpg'));
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { url: f.getUrl(), id: f.getId() };
}

var SEP_ = null;
function sep_() {
  if (SEP_) return SEP_;
  var p = PropertiesService.getScriptProperties().getProperty('SEP');
  if (p) return (SEP_ = p);
  return (SEP_ = detectSep_());
}
function detectSep_() {
  var ss = ss_(), t = ss.insertSheet('_tmp');
  t.getRange('A1').setFormula('=IF(1=1,1,2)');
  SpreadsheetApp.flush();
  var ok = String(t.getRange('A1').getDisplayValue()) === '1';
  ss.deleteSheet(t);
  var s = ok ? ',' : ';';
  PropertiesService.getScriptProperties().setProperty('SEP', s);
  return s;
}
function f_(formula) { return formula.replace(/§/g, sep_()); }

function idFromUrl_(url) {
  var m = /[-\w]{25,}/.exec(url || '');
  return m ? m[0] : '';
}

function thumb_(url) {
  var id = idFromUrl_(url);
  return id ? f_('=IMAGE("https://drive.google.com/thumbnail?id=' + id + '&sz=w400"§4§110§110)') : '';
}

function link_(url, label) {
  return url ? f_('=HYPERLINK("' + url + '"§"' + label + '")') : '';
}

// 1 dòng dữ liệu theo đúng thứ tự cột
function makeRow_(time, ten, sdt, bang, phi, urlThiep, urlCk, status, note) {
  return [time, ten, sdt, bang, phi, thumb_(urlThiep), thumb_(urlCk), link_(urlThiep, 'Mở thiệp'), link_(urlCk, 'Mở CK'), status || STATUS[0], note || ''];
}

/* ---------- dựng giao diện 1 tab bảng ---------- */
function buildTab_(cfg) {
  var ss = ss_();
  var sh = ss.getSheetByName(cfg.n) || ss.insertSheet(cfg.n);

  // giữ lại dữ liệu cũ (cả bản cũ 9 cột lẫn bản mới 11 cột)
  var keep = [];
  if (sh.getLastRow() > 0) {
    var v = sh.getDataRange().getValues(), f = sh.getDataRange().getFormulas();
    var h = -1;
    for (var i = 0; i < v.length; i++) { if (String(v[i][0]) === 'Thời gian') { h = i; break; } }
    if (h >= 0) {
      var oldFmt = String(v[h][5]) === 'Hình thiệp'; // bản cũ: cột 6,7 là link thô
      for (var r = h + 1; r < v.length; r++) {
        if (!v[r][1]) continue;
        if (oldFmt) keep.push(makeRow_(v[r][0], v[r][1], v[r][2], v[r][3], v[r][4], v[r][5], v[r][6], v[r][7], v[r][8]));
        else {
          var u1 = (/"(https?:[^"]+)"/.exec(f[r][7] || '') || [])[1] || '';
          var u2 = (/"(https?:[^"]+)"/.exec(f[r][8] || '') || [])[1] || '';
          keep.push(makeRow_(v[r][0], v[r][1], v[r][2], v[r][3], v[r][4], u1, u2, v[r][9], v[r][10]));
        }
      }
    }
  }

  sh.clear();
  sh.clearConditionalFormatRules();
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).breakApart().setDataValidation(null);
  if (sh.getMaxColumns() > NCOL) sh.deleteColumns(NCOL + 1, sh.getMaxColumns() - NCOL);
  if (sh.getMaxColumns() < NCOL) sh.insertColumnsAfter(sh.getMaxColumns(), NCOL - sh.getMaxColumns());
  sh.setHiddenGridlines(false); // giữ đường kẻ ô cho dễ nhìn
  sh.setTabColor(cfg.color);
  sh.getRange(1, 1, sh.getMaxRows(), NCOL).setFontFamily('Roboto').setFontSize(11).setFontColor(C.text).setVerticalAlignment('middle');

  // dòng 1: tiêu đề lớn
  sh.getRange(1, 1, 1, NCOL).merge().setValue('🎃  EM XINH WEEN ĐỈNH · MÙA 4   |   ' + cfg.title)
    .setBackground(C.dark).setFontColor(C.gold).setFontFamily('Montserrat').setFontWeight('bold').setFontSize(17)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');
  sh.setRowHeight(1, 54);
  // dòng 2: thống kê nhanh
  sh.getRange(2, 1, 1, NCOL).merge()
    .setFormula(f_('="' + cfg.sub + '   •   Tổng đăng ký: "&COUNTA(B' + DATA_ROW + ':B)&"   •   Chờ xác nhận: "&COUNTIF(J' + DATA_ROW + ':J§"Chờ xác nhận")&"   •   Đã xác nhận: "&COUNTIF(J' + DATA_ROW + ':J§"Đã xác nhận")'))
    .setBackground(cfg.color).setFontColor('#ffffff').setFontWeight('bold').setFontSize(12).setHorizontalAlignment('left');
  sh.setRowHeight(2, 32);
  // dòng 3: tên cột
  sh.getRange(3, 1, 1, NCOL).setValues([HEADERS]).setBackground('#4a1a6e').setFontColor('#ffffff')
    .setFontFamily('Montserrat').setFontWeight('bold').setFontSize(10.5).setHorizontalAlignment('center').setWrap(true);
  sh.setRowHeight(3, 44);

  // cột
  for (var c = 0; c < NCOL; c++) sh.setColumnWidth(c + 1, WIDTHS[c]);
  var body = sh.getRange(DATA_ROW, 1, sh.getMaxRows() - DATA_ROW + 1, NCOL);
  // kẻ bảng đầy đủ: viền ngoài + đường ngang + đường dọc giữa các cột
  sh.getRange(3, 1, sh.getMaxRows() - 2, NCOL).setBorder(true, true, true, true, true, true, '#c9a3bd', SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(DATA_ROW, 1, sh.getMaxRows() - DATA_ROW + 1, 1).setNumberFormat('dd/MM/yyyy HH:mm').setHorizontalAlignment('center');
  sh.getRange(DATA_ROW, 2, sh.getMaxRows() - DATA_ROW + 1, 1).setFontWeight('bold').setWrap(true);
  sh.getRange(DATA_ROW, 3, sh.getMaxRows() - DATA_ROW + 1, 2).setHorizontalAlignment('center');
  sh.getRange(DATA_ROW, 5, sh.getMaxRows() - DATA_ROW + 1, 1).setNumberFormat('#,##0"đ"').setHorizontalAlignment('right').setFontWeight('bold').setFontColor('#b8560c');
  sh.getRange(DATA_ROW, 6, sh.getMaxRows() - DATA_ROW + 1, 2).setHorizontalAlignment('center');
  sh.getRange(DATA_ROW, 8, sh.getMaxRows() - DATA_ROW + 1, 2).setHorizontalAlignment('center').setFontColor('#1a73e8');
  sh.getRange(DATA_ROW, 10, sh.getMaxRows() - DATA_ROW + 1, 1).setHorizontalAlignment('center').setFontWeight('bold')
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(STATUS, true).build());
  sh.getRange(DATA_ROW, 11, sh.getMaxRows() - DATA_ROW + 1, 1).setWrap(true);

  // tô màu: sọc xen kẽ + trạng thái
  var rng = sh.getRange(DATA_ROW, 1, sh.getMaxRows() - DATA_ROW + 1, NCOL), jr = sh.getRange(DATA_ROW, 10, sh.getMaxRows() - DATA_ROW + 1, 1);
  var rules = [];
  function st(text, bg, fg) {
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(text).setBackground(bg).setFontColor(fg).setRanges([jr]).build());
  }
  st('Chờ xác nhận', '#fff1c9', '#8a5a00');
  st('Đã nhận phí', '#d8ebff', '#0b4f9c');
  st('Đã xác nhận', '#d3f5e1', '#13794a');
  st('Hủy', '#ffd9d9', '#a61b1b');
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(f_('=AND($B' + DATA_ROW + '<>""§ISEVEN(ROW()))')).setBackground(C.soft).setRanges([rng]).build());
  sh.setConditionalFormatRules(rules);
  sh.setFrozenRows(3);

  // ghi lại dữ liệu cũ (nếu có)
  if (keep.length) {
    sh.getRange(DATA_ROW, 1, keep.length, NCOL).setValues(keep.map(function (r) { return r.map(function (x) { return x; }); }));
    sh.setRowHeights(DATA_ROW, keep.length, 112);
  }
  return sh;
}

function getSheet_(bang) {
  var cfg = TABS.filter(function (t) { return t.n === bang; })[0];
  if (!cfg) cfg = { n: 'Khác', title: 'KHÁC', sub: 'Bảng khác', color: '#888888' };
  return ss_().getSheetByName(cfg.n) || buildTab_(cfg);
}

/* ---------- tab Tổng quan ---------- */
function buildOverview_() {
  var ss = ss_();
  var sh = ss.getSheetByName(OVERVIEW) || ss.insertSheet(OVERVIEW, 0);
  sh.clear(); sh.clearConditionalFormatRules();
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).breakApart();
  sh.getCharts().forEach(function (c) { sh.removeChart(c); });
  sh.setHiddenGridlines(true);
  sh.setTabColor('#f5d77a');
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).setFontFamily('Roboto').setBackground('#fbf6ff').setVerticalAlignment('middle');
  sh.setColumnWidths(1, 1, 24);
  for (var c = 2; c <= 9; c++) sh.setColumnWidth(c, 150);
  sh.setColumnWidth(10, 24);

  sh.getRange('B1:I1').merge().setValue('🎃  EM XINH WEEN ĐỈNH · MÙA 4  –  TỔNG QUAN ĐĂNG KÝ')
    .setBackground(C.dark).setFontColor(C.gold).setFontFamily('Montserrat').setFontWeight('bold').setFontSize(20).setHorizontalAlignment('left');
  sh.setRowHeight(1, 70);
  sh.getRange('B2:I2').merge().setValue('31.10.2026  ·  9:00 sáng  ·  Cộng Hòa Garden, Tân Bình   |   Đăng ký sớm 490K (đến 15/10), sau đó 590K')
    .setBackground(C.pink).setFontColor('#ffffff').setFontWeight('bold').setFontSize(12).setHorizontalAlignment('left');
  sh.setRowHeight(2, 34);
  sh.setRowHeight(3, 16);

  function sum_(col, crit) { // đếm theo trạng thái trên cả 3 tab
    return TABS.map(function (t) { return "COUNTIF('" + t.n + "'!J" + DATA_ROW + ':J§"' + crit + '")'; }).join('+');
  }
  var total = TABS.map(function (t) { return "COUNTA('" + t.n + "'!B" + DATA_ROW + ':B)'; }).join('+');
  var paid = TABS.map(function (t) {
    return "SUMIF('" + t.n + "'!J" + DATA_ROW + ':J§"Đã nhận phí"§\'' + t.n + "'!E" + DATA_ROW + ':E)+SUMIF(\'' + t.n + "'!J" + DATA_ROW + ':J§"Đã xác nhận"§\'' + t.n + "'!E" + DATA_ROW + ':E)';
  }).join('+');
  var expected = TABS.map(function (t) { return "SUM('" + t.n + "'!E" + DATA_ROW + ':E)'; }).join('+');

  var cards = [
    // [ô nhãn, ô giá trị, nhãn, công thức, màu nền, màu chữ số, định dạng]
    ['B4:C4', 'B5:C6', 'TỔNG ĐĂNG KÝ', '=' + total, '#ffffff', '#2b0b4a', '0'],
    ['D4:E4', 'D5:E6', 'CHỜ XÁC NHẬN', '=' + sum_('J', 'Chờ xác nhận'), '#fff1c9', '#8a5a00', '0'],
    ['F4:G4', 'F5:G6', 'ĐÃ NHẬN PHÍ', '=' + sum_('J', 'Đã nhận phí'), '#d8ebff', '#0b4f9c', '0'],
    ['H4:I4', 'H5:I6', 'ĐÃ XÁC NHẬN', '=' + sum_('J', 'Đã xác nhận'), '#d3f5e1', '#13794a', '0'],
    ['B8:C8', 'B9:C10', 'SERIES A', "=COUNTA('Series A'!B" + DATA_ROW + ':B)', '#ffe0f1', '#c01a85', '0'],
    ['D8:E8', 'D9:E10', 'SERIES B', "=COUNTA('Series B'!B" + DATA_ROW + ':B)', '#eadcff', '#5b1fb0', '0'],
    ['F8:G8', 'F9:G10', 'KOL', "=COUNTA('KOL'!B" + DATA_ROW + ':B)', '#ffe9cf', '#b8560c', '0'],
    ['H8:I8', 'H9:I10', 'ĐÃ THU (đ)', '=' + paid, '#2b0b4a', '#f5d77a', '#,##0"đ"']
  ];
  cards.forEach(function (k) {
    sh.getRange(k[0]).merge().setValue(k[2]).setBackground(k[4]).setFontColor(k[5]).setFontWeight('bold').setFontSize(10)
      .setFontFamily('Montserrat').setHorizontalAlignment('center').setVerticalAlignment('bottom');
    sh.getRange(k[1]).merge().setFormula(f_(k[3])).setBackground(k[4]).setFontColor(k[5]).setFontWeight('bold').setFontSize(30)
      .setFontFamily('Montserrat').setHorizontalAlignment('center').setVerticalAlignment('middle').setNumberFormat(k[6]);
    sh.getRange(k[0].split(':')[0] + ':' + k[1].split(':')[1]).setBorder(true, true, true, true, null, null, '#e3c4ee', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  });
  [4, 8].forEach(function (r) { sh.setRowHeight(r, 30); });
  [5, 6, 9, 10].forEach(function (r) { sh.setRowHeight(r, 34); });
  sh.setRowHeight(7, 14);

  // dự kiến + bảng phân bố để vẽ biểu đồ
  sh.getRange('B12:C12').merge().setValue('DOANH THU DỰ KIẾN').setFontWeight('bold').setFontFamily('Montserrat').setFontSize(10).setFontColor('#6a4a86');
  sh.getRange('D12:E12').merge().setFormula(f_('=' + expected)).setNumberFormat('#,##0"đ"').setFontWeight('bold').setFontSize(16).setFontColor('#b8560c').setHorizontalAlignment('left');
  sh.getRange('B14:C14').merge().setValue('PHÂN BỔ THEO BẢNG').setFontWeight('bold').setFontFamily('Montserrat').setFontSize(10).setFontColor('#6a4a86');
  sh.getRange('B15:C18').setValues([['Bảng', 'Số đăng ký'], ['Series A', ''], ['Series B', ''], ['KOL', '']]);
  sh.getRange('C16').setFormula('=B9'); sh.getRange('C17').setFormula('=D9'); sh.getRange('C18').setFormula('=F9');
  sh.getRange('B15:C15').setBackground('#4a1a6e').setFontColor('#ffffff').setFontWeight('bold');
  sh.getRange('B16:C18').setBackground('#ffffff').setBorder(true, true, true, true, true, true, C.line, SpreadsheetApp.BorderStyle.SOLID).setHorizontalAlignment('center');
  var chart = sh.newChart().setChartType(Charts.ChartType.PIE).addRange(sh.getRange('B15:C18'))
    .setPosition(14, 4, 0, 0).setOption('title', 'Tỷ lệ đăng ký theo bảng').setOption('width', 620).setOption('height', 280)
    .setOption('colors', ['#ff4fb8', '#8a2be2', '#ff9a2e']).setOption('pieHole', 0.45)
    .setOption('backgroundColor', '#fbf6ff').build();
  sh.insertChart(chart);
  sh.getRange('B20:C20').merge();
  sh.getRange('B31:I31').merge().setValue('Cột "Trạng thái" ở từng tab bảng: chọn Chờ xác nhận → Đã nhận phí → Đã xác nhận (hoặc Hủy). Số liệu ở đây tự cập nhật.')
    .setFontColor('#6a4a86').setFontStyle('italic').setFontSize(10);
  ss.setActiveSheet(sh); ss.moveActiveSheet(1);
}

/* ---------- chạy 1 lần (nút ▶ Chạy → setup) hoặc mỗi khi muốn dựng lại giao diện ---------- */
function setup() {
  SEP_ = null; PropertiesService.getScriptProperties().deleteProperty('SEP'); sep_(); // dò lại dấu phân cách theo ngôn ngữ sheet
  TABS.forEach(buildTab_);
  buildOverview_();
  var ss = ss_();
  ss.getSheets().forEach(function (s) {
    var n = s.getName();
    var ours = n === OVERVIEW || TABS.some(function (t) { return t.n === n; });
    if (!ours && s.getLastRow() <= 1 && ss.getSheets().length > 1) ss.deleteSheet(s); // xóa Sheet1 trống
  });
  ss.setSpreadsheetTimeZone('Asia/Ho_Chi_Minh');
}

/* ---------- nhận đăng ký từ ladipage ---------- */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var d = JSON.parse(e.postData.contents);
    if (!d.ten || !d.sdt || !d.bang || !d.thiep || !d.ck) throw new Error('thiếu thông tin');
    var safe = String(d.ten).replace(/[^\wÀ-ỹ ]/g, '').trim().slice(0, 40) + '_' + String(d.sdt).slice(-4);
    var a = saveImg_(d.thiep, 'thiep_' + safe), b = saveImg_(d.ck, 'ck_' + safe);
    var sh = getSheet_(d.bang);
    sh.appendRow(makeRow_(new Date(), d.ten, "'" + d.sdt, d.bang, Number(d.gia) || 0, a.url, b.url, STATUS[0], ''));
    sh.setRowHeight(sh.getLastRow(), 112);
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
