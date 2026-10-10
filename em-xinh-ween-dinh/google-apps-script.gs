/**
 * Em Xinh Ween Đỉnh – nhận đăng ký từ ladipage, ghi vào Google Sheet (mỗi bảng 1 tab),
 * lưu hình thiệp / hình chuyển khoản vào Drive, và dựng giao diện sheet đẹp + tab "Tổng quan".
 * Cách cài / cập nhật: xem huong-dan-google-sheet.md  (sau khi dán, chạy hàm "setup" 1 lần)
 */
var FOLDER_NAME = 'EmXinh_WeenDinh_HinhDangKy';
var OVERVIEW = 'Tổng quan';
var DATA_ROW = 4;      // dòng đầu tiên chứa dữ liệu (dòng 1 = tiêu đề lớn, 2 = thống kê, 3 = tên cột)
var NCOL = 10;
var STATUS_COL = 9, NOTE_COL = 10;   // cột Trạng thái / Ghi chú
var TABS = [
  { n: 'Series A', title: 'SERIES A  ·  ĐỘI MẠNH', sub: 'Đôi nữ hạng nặng – mỗi VĐV trình > 2.5', color: '#ff4fb8' },
  { n: 'Series B', title: 'SERIES B  ·  PHONG TRÀO', sub: 'Đôi nữ Newbie – mỗi VĐV trình < 2.5', color: '#8a2be2' },
  { n: 'KOL',      title: 'KOL  ·  ĐẠI CHIẾN',      sub: 'Đôi nữ KOLs tự do',                   color: '#ff9a2e' }
];
var HEADERS = ['Thời gian', 'Tên đăng ký (hiển thị trên thiệp)', 'Số điện thoại', 'Bảng thi đấu', 'Phí áp dụng',
               'Hình thiệp', 'Hình chuyển khoản', 'Mở CK', 'Trạng thái', 'Ghi chú'];
var STATUS = ['Chờ xác nhận', 'Đã nhận phí', 'Đã xác nhận', 'Hủy'];
var WIDTHS = [150, 230, 130, 110, 110, 130, 130, 90, 140, 240];
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

function urlFromThumb_(formula) {   // lấy lại link Drive từ công thức =IMAGE(...id=XXX...)
  var m = /id=([-\w]{20,})/.exec(String(formula || ''));
  return m ? 'https://drive.google.com/file/d/' + m[1] + '/view' : '';
}

function link_(url, label) {
  return url ? f_('=HYPERLINK("' + url + '"§"' + label + '")') : '';
}

// 1 dòng dữ liệu theo đúng thứ tự cột
function makeRow_(time, ten, sdt, bang, phi, urlThiep, urlCk, status, note) {
  var p = String(sdt == null ? '' : sdt).replace(/^'/, '').replace(/\s/g, '');
  if (/^\d{9}$/.test(p)) p = '0' + p;           // dòng cũ bị mất số 0 đầu khi Sheet đổi sang số
  return [time, ten, p, bang, phi, thumb_(urlThiep), thumb_(urlCk), link_(urlCk, 'Mở CK'), status || STATUS[0], note || ''];
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
      var hasOpenThiep = String(v[h][7]) === 'Mở thiệp';          // header 11 cột (bản trước) hay 10 cột (bản này)
      var stIdx = hasOpenThiep ? 9 : 8;
      for (var r = h + 1; r < v.length; r++) {
        if (!v[r][1]) continue;
        if (/^https?:/.test(String(v[r][5]))) {
          // dòng do bản script cũ ghi: cột F/G là link thô, H là trạng thái, I là ghi chú
          keep.push(makeRow_(v[r][0], v[r][1], v[r][2], v[r][3], v[r][4], v[r][5], v[r][6], v[r][7], v[r][8]));
        } else {
          keep.push(makeRow_(v[r][0], v[r][1], v[r][2], v[r][3], v[r][4], urlFromThumb_(f[r][5]), urlFromThumb_(f[r][6]), v[r][stIdx], v[r][stIdx + 1]));
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
    .setFormula(f_('="' + cfg.sub + '   •   Tổng đăng ký: "&COUNTA(B' + DATA_ROW + ':B)&"   •   Chờ xác nhận: "&COUNTIF(I' + DATA_ROW + ':I§"Chờ xác nhận")&"   •   Đã xác nhận: "&COUNTIF(I' + DATA_ROW + ':I§"Đã xác nhận")'))
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
  sh.getRange(DATA_ROW, 3, sh.getMaxRows() - DATA_ROW + 1, 1).setNumberFormat('@');   // SĐT luôn là chữ, không mất số 0 đầu
  sh.getRange(DATA_ROW, 3, sh.getMaxRows() - DATA_ROW + 1, 2).setHorizontalAlignment('center');
  sh.getRange(DATA_ROW, 5, sh.getMaxRows() - DATA_ROW + 1, 1).setNumberFormat('#,##0"đ"').setHorizontalAlignment('right').setFontWeight('bold').setFontColor('#b8560c');
  sh.getRange(DATA_ROW, 6, sh.getMaxRows() - DATA_ROW + 1, 2).setHorizontalAlignment('center');
  sh.getRange(DATA_ROW, 8, sh.getMaxRows() - DATA_ROW + 1, 1).setHorizontalAlignment('center').setFontColor('#1a73e8');
  sh.getRange(DATA_ROW, STATUS_COL, sh.getMaxRows() - DATA_ROW + 1, 1).setHorizontalAlignment('center').setFontWeight('bold')
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(STATUS, true).build());
  sh.getRange(DATA_ROW, NOTE_COL, sh.getMaxRows() - DATA_ROW + 1, 1).setWrap(true);

  // tô màu: sọc xen kẽ + trạng thái
  var rng = sh.getRange(DATA_ROW, 1, sh.getMaxRows() - DATA_ROW + 1, NCOL), jr = sh.getRange(DATA_ROW, STATUS_COL, sh.getMaxRows() - DATA_ROW + 1, 1);
  var rules = [];
  function st(text, bg, fg) {
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(text).setBackground(bg).setFontColor(fg).setRanges([jr]).build());
  }
  st('Chờ xác nhận', '#fff1c9', '#8a5a00');
  st('Đã nhận phí', '#d8ebff', '#0b4f9c');
  st('Đã xác nhận', '#d3f5e1', '#13794a');
  st('Hủy', '#ffd9d9', '#a61b1b');
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(f_('=AND($B' + DATA_ROW + '<>""§ISEVEN(ROW()))')).setBackground(C.soft).setRanges([rng]).build());
  var pr = sh.getRange(DATA_ROW, 2, sh.getMaxRows() - DATA_ROW + 1, 2);
  rules.unshift(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(f_('=AND($C' + DATA_ROW + '<>""§COUNTIFS($B$' + DATA_ROW + ':$B§$B' + DATA_ROW + '§$C$' + DATA_ROW + ':$C§$C' + DATA_ROW + ')>1)')).setBackground('#ffc9c9').setFontColor('#a61b1b').setBold(true).setRanges([pr]).build());
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
    return TABS.map(function (t) { return "COUNTIF('" + t.n + "'!I" + DATA_ROW + ':I§"' + crit + '")'; }).join('+');
  }
  var total = TABS.map(function (t) { return "COUNTA('" + t.n + "'!B" + DATA_ROW + ':B)'; }).join('+');
  var paid = TABS.map(function (t) {
    return "SUMIF('" + t.n + "'!I" + DATA_ROW + ':I§"Đã nhận phí"§\'' + t.n + "'!E" + DATA_ROW + ':E)+SUMIF(\'' + t.n + "'!I" + DATA_ROW + ':I§"Đã xác nhận"§\'' + t.n + "'!E" + DATA_ROW + ':E)';
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

/* ---------- xóa các dòng đăng ký trùng (chạy tay: chọn hàm xoaTrung → Chạy) ----------
 * Trùng = cùng số điện thoại VÀ cùng tên trong cùng 1 tab (cùng SĐT nhưng khác tên = 2 người, giữ cả hai). Giữ dòng có trạng thái "xa" nhất (Đã xác nhận > Đã nhận phí > Chờ xác nhận),
 * bằng nhau thì giữ dòng đăng ký sớm nhất. Dòng bị xóa được chép sang tab "Đã xóa (trùng)" để còn khôi phục.
 * Cùng SĐT + tên xuất hiện ở 2 tab khác nhau (A và B): KHÔNG xóa, chỉ báo để BTC tự quyết. */
function normPhone_(v) {
  var d = String(v || '').replace(/\D/g, '');
  if (d.indexOf('84') === 0 && d.length === 11) d = '0' + d.slice(2);
  return d;
}
function normName_(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().replace(/\s+/g, ' ').trim();
}
function dupKey_(ten, sdt) { return normPhone_(sdt) + '|' + normName_(ten); } // trùng = cùng SĐT VÀ cùng tên (khác tên = 2 người, vd 1 người đăng ký hộ bạn đánh cặp)
function rank_(r) {
  var s = String(r[7] || '') + '|' + String(r[8] || '') + '|' + String(r[9] || '');
  if (s.indexOf('Đã xác nhận') >= 0) return 3;
  if (s.indexOf('Đã nhận phí') >= 0) return 2;
  if (s.indexOf('Chờ xác nhận') >= 0) return 1;
  return 0;
}
function xoaTrung() {
  var ss = ss_(), bk = ss.getSheetByName('Đã xóa (trùng)') || ss.insertSheet('Đã xóa (trùng)');
  if (bk.getLastRow() === 0) { bk.appendRow(['Tab gốc', 'Dòng cũ', 'Lý do', 'Thời gian đăng ký', 'Tên', 'SĐT', 'Bảng', 'Trạng thái / ghi chú', 'Xóa lúc']); bk.setFrozenRows(1); }
  var removed = [], seen = {}, cross = [];
  TABS.forEach(function (t) {
    var sh = ss.getSheetByName(t.n);
    if (!sh || sh.getLastRow() < DATA_ROW) return;
    var n = sh.getLastRow() - DATA_ROW + 1, vals = sh.getRange(DATA_ROW, 1, n, NCOL).getValues(), groups = {};
    vals.forEach(function (r, i) {
      if (!r[1]) return;
      var k = dupKey_(r[1], r[2]);
      (groups[k] = groups[k] || []).push(i);
      if (normPhone_(r[2])) { if (seen[k] && seen[k] !== t.n) cross.push(r[1] + ' (' + normPhone_(r[2]) + ') ở ' + seen[k] + ' và ' + t.n); seen[k] = seen[k] || t.n; }
    });
    var del = [];
    Object.keys(groups).forEach(function (k) {
      var idx = groups[k]; if (idx.length < 2) return;
      var best = idx[0];
      idx.forEach(function (i) { if (rank_(vals[i]) > rank_(vals[best])) best = i; });
      idx.forEach(function (i) { if (i !== best) del.push(i); });
    });
    del.sort(function (a, b) { return b - a; });
    del.forEach(function (i) {
      var r = vals[i];
      bk.appendRow([t.n, DATA_ROW + i, 'Trùng SĐT + tên', r[0], r[1], "'" + r[2], r[3], String(r[9] || r[7] || '') + ' ' + String(r[10] || r[8] || ''), new Date()]);
      removed.push(t.n + ' dòng ' + (DATA_ROW + i) + ': ' + r[1] + ' – ' + r[2]);
      sh.deleteRow(DATA_ROW + i);
    });
  });
  var msg = removed.length ? 'Đã xóa ' + removed.length + ' dòng trùng (chép sang tab "Đã xóa (trùng)").' : 'Không có dòng trùng (cùng SĐT và cùng tên) trong cùng tab.';
  if (cross.length) msg += ' Lưu ý trùng giữa 2 tab (không xóa): ' + cross.join('; ');
  Logger.log(msg + '\n' + removed.join('\n'));
  ss.toast(msg, 'Kiểm tra trùng', 15);
}

/* ---------- kiểm tra có sót thí sinh không (chạy tay: chọn hàm kiemTraSot → Chạy) ----------
 * Mỗi lượt đăng ký thành công đều lưu ảnh vào thư mục Drive trước khi ghi dòng vào sheet.
 * Hàm này so các ảnh trong thư mục với các dòng trong 3 tab: ảnh nào chưa có dòng tương ứng
 * (tên + 4 số cuối SĐT) sẽ được liệt kê ở tab "Có thể sót" kèm link ảnh để BTC thêm tay. */
function safeName_(ten) { return String(ten).replace(/[^\wÀ-ỹ ]/g, '').trim().slice(0, 40); }
function kiemTraSot() {
  var ss = ss_(), have = {}, rows = 0;
  TABS.forEach(function (t) {
    var sh = ss.getSheetByName(t.n);
    if (!sh || sh.getLastRow() < DATA_ROW) return;
    sh.getRange(DATA_ROW, 2, sh.getLastRow() - DATA_ROW + 1, 2).getValues().forEach(function (r) {
      if (!r[0]) return;
      rows++;
      have[(safeName_(r[0]) + '_' + String(r[1]).replace(/\D/g, '').slice(-4)).toLowerCase()] = true;
    });
  });
  var it = DriveApp.getFoldersByName(FOLDER_NAME);
  if (!it.hasNext()) { ss.toast('Chưa có thư mục ảnh đăng ký.', 'Kiểm tra sót', 10); return; }
  var files = it.next().getFiles(), map = {}, nfile = 0;
  while (files.hasNext()) {
    var f = files.next(), m = /^(thiep|ck)_(.+)\.jpg$/.exec(f.getName());
    if (!m) continue;
    nfile++;
    var k = m[2], o = map[k] = map[k] || { thiep: '', ck: '', time: f.getDateCreated() };
    o[m[1]] = f.getUrl();
    if (f.getDateCreated() < o.time) o.time = f.getDateCreated();
  }
  var sh = ss.getSheetByName('Có thể sót') || ss.insertSheet('Có thể sót');
  sh.clear();
  sh.appendRow(['Khóa (tên_4 số cuối SĐT)', 'Gửi lúc', 'Link thiệp', 'Link chuyển khoản', 'Ghi chú']);
  sh.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#ff4fb8').setFontColor('#ffffff');
  var miss = 0;
  Object.keys(map).sort(function (a, b) { return map[a].time - map[b].time; }).forEach(function (k) {
    if (have[k.toLowerCase()]) return;
    miss++;
    sh.appendRow([k, map[k].time, map[k].thiep, map[k].ck, 'Có ảnh nhưng chưa có dòng trong 3 tab – kiểm tra rồi thêm tay (cần hỏi SĐT đầy đủ + bảng)']);
  });
  sh.getRange(2, 2, Math.max(1, miss), 1).setNumberFormat('dd/MM/yyyy HH:mm');
  sh.setColumnWidths(1, 5, 220);
  var msg = 'Thư mục có ' + Object.keys(map).length + ' lượt gửi (' + nfile + ' ảnh), 3 tab có ' + rows + ' dòng. ' + (miss ? 'SÓT ' + miss + ' lượt – xem tab "Có thể sót".' : 'Không sót lượt nào.');
  Logger.log(msg);
  ss.toast(msg, 'Kiểm tra sót', 20);
}

/* ---------- thêm tay 1 người vào sheet (khi form lỗi mà đã chuyển khoản) ----------
 * Sửa 2 dòng SDT và BANG bên dưới cho đúng, bấm Lưu, chọn hàm themTay → Chạy. Chạy 1 lần thôi (có kiểm tra trùng). */
function themTay() {
  var NGUOI = {
    ten: 'Huỳnh Thị Mỹ Tiên',
    SDT: '',                 // <-- điền số điện thoại của bạn, ví dụ '0901234567'
    BANG: '',                // <-- 'Series A' hoặc 'Series B'
    phi: 490000,
    gio: new Date('2026-10-07T20:24:00+07:00'),
    ghiChu: 'Form lỗi, BTC nhập tay. Đã chuyển khoản 490.000đ lúc 20:22:33 07/10/2026, mã GD 2732774766 (Sacombank → MB).'
  };
  if (!NGUOI.SDT || TABS.map(function (t) { return t.n; }).indexOf(NGUOI.BANG) < 0) { ss_().toast('Chưa điền SDT hoặc BANG (Series A / Series B) trong hàm themTay.', 'Thêm tay', 15); return; }
  if (findPhone_(NGUOI.SDT, NGUOI.ten)) { ss_().toast('Người này đã có trong sheet: ' + findPhone_(NGUOI.SDT, NGUOI.ten), 'Thêm tay', 15); return; }
  var sh = getSheet_(NGUOI.BANG);
  sh.appendRow(makeRow_(NGUOI.gio, NGUOI.ten, "'" + NGUOI.SDT, NGUOI.BANG, NGUOI.phi, '', '', 'Đã nhận phí', NGUOI.ghiChu));
  sh.setRowHeight(sh.getLastRow(), 60);
  ss_().toast('Đã thêm ' + NGUOI.ten + ' vào ' + NGUOI.BANG + '. Nhớ gửi lại ảnh thiệp cho bạn qua Zalo.', 'Thêm tay', 15);
}

/* =====================================================================================
 * TỰ ĐỐI SOÁT TIỀN VỀ TỪ SEPAY  →  tự chuyển "Chờ xác nhận" thành "Đã nhận phí"
 * Cài 1 lần: (1) lấy API token ở my.sepay.vn → Cấu hình công ty → API Access;
 *            (2) Apps Script → Cài đặt dự án → Thuộc tính tập lệnh: thêm SEPAY_TOKEN = <token>
 *                (tuỳ chọn) SEPAY_ACCOUNT = số tài khoản nhận tiền như hiển thị trên SePay (nếu SePay có nhiều tài khoản);
 *            (3) chạy hàm caiTuDongSePay 1 lần → sau đó tự chạy mỗi 10 phút.
 * Khớp = số tiền vào >= phí đăng ký VÀ nội dung chuyển khoản chứa đủ các từ trong tên (không dấu) hoặc 9 số cuối SĐT.
 * Tab "SePay đối soát" liệt kê mọi khoản tiền vào + khoản nào CHƯA KHỚP ai (người đã chuyển khoản nhưng chưa đăng ký).
 * ===================================================================================== */
var SEPAY_API = 'https://my.sepay.vn/userapi/transactions/list';
var SEPAY_TAB = 'SePay đối soát';

function sepayProp_(k) { return PropertiesService.getScriptProperties().getProperty(k) || ''; }

function sepayFetch_(days) {
  var token = sepayProp_('SEPAY_TOKEN');
  if (!token) throw new Error('Chưa có SEPAY_TOKEN (Cài đặt dự án → Thuộc tính tập lệnh)');
  var min = Utilities.formatDate(new Date(Date.now() - days * 864e5), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss');
  var acc = sepayProp_('SEPAY_ACCOUNT');
  var url = SEPAY_API + '?limit=1000&transaction_date_min=' + encodeURIComponent(min) + (acc ? '&account_number=' + encodeURIComponent(acc) : '');
  var res = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('SePay trả lỗi ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 200));
  var j = JSON.parse(res.getContentText());
  return (j.transactions || []).filter(function (t) { return Number(t.amount_in) > 0; });
}

function txDate_(s) { return new Date(String(s).replace(' ', 'T') + '+07:00'); }

function payMatches_(row, tx) {
  var content = normName_(tx.transaction_content || tx.content || '') ;
  var tokens = normName_(row.ten).split(' ').filter(function (w) { return w.length > 1; });
  var okName = tokens.length >= 2 && tokens.every(function (w) { return (' ' + content + ' ').indexOf(' ' + w + ' ') >= 0; });
  var ph = normPhone_(row.sdt).slice(-9);
  var okPhone = ph.length === 9 && String(tx.transaction_content || '').replace(/\D/g, '').indexOf(ph) >= 0;
  var okAmt = Number(tx.amount_in) >= Number(row.phi || 0);
  var dt = txDate_(tx.transaction_date) - new Date(row.time).getTime();
  var okTime = dt >= -3 * 864e5 && dt <= 20 * 864e5;
  return (okName || okPhone) && okAmt && okTime;
}

function kiemTraSePay() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) return;
  var ss = ss_(), now = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM HH:mm');
  try {
    var txs = sepayFetch_(21);
    // đọc log cũ để biết khoản nào đã khớp với ai
    var lg = ss.getSheetByName(SEPAY_TAB) || ss.insertSheet(SEPAY_TAB);
    var paired = {}, usedTx = {};
    if (lg.getLastRow() >= 3) lg.getRange(3, 1, lg.getLastRow() - 2, 6).getValues().forEach(function (r) {
      if (r[4] === 'Đã khớp' && r[0]) { usedTx[String(r[0])] = String(r[5]); paired[String(r[5])] = String(r[0]); }
    });
    // gom các dòng đăng ký (trừ Hủy)
    var rows = [];
    TABS.forEach(function (t) {
      var sh = ss.getSheetByName(t.n);
      if (!sh || sh.getLastRow() < DATA_ROW) return;
      sh.getRange(DATA_ROW, 1, sh.getLastRow() - DATA_ROW + 1, NCOL).getValues().forEach(function (r, i) {
        if (!r[1] || String(r[STATUS_COL - 1]) === 'Hủy') return;
        rows.push({ tab: t.n, sh: sh, line: DATA_ROW + i, time: r[0], ten: r[1], sdt: r[2], phi: r[4], status: String(r[STATUS_COL - 1] || ''), key: t.n + ' · ' + r[1] + ' · ' + normPhone_(r[2]) });
      });
    });
    rows.sort(function (a, b) { return new Date(a.time) - new Date(b.time); });
    var changed = 0;
    txs.sort(function (a, b) { return txDate_(a.transaction_date) - txDate_(b.transaction_date); });
    txs.forEach(function (tx) {
      var id = String(tx.id);
      if (usedTx[id]) return;
      var best = null, bestGap = 1e18;
      rows.forEach(function (rw) {
        if (paired[rw.key]) return;                       // dòng này đã có khoản tiền khác khớp rồi
        if (!payMatches_(rw, tx)) return;
        var gap = Math.abs(txDate_(tx.transaction_date) - new Date(rw.time).getTime());
        if (gap < bestGap) { best = rw; bestGap = gap; }
      });
      if (!best) return;
      usedTx[id] = best.key; paired[best.key] = id;
      if (!best.status || best.status === 'Chờ xác nhận') {
        best.sh.getRange(best.line, STATUS_COL).setValue('Đã nhận phí');
        var nc = best.sh.getRange(best.line, NOTE_COL), old = String(nc.getValue() || '');
        nc.setValue((old ? old + ' | ' : '') + '✅ SePay tự xác nhận: ' + Number(tx.amount_in).toLocaleString('vi-VN') + 'đ lúc ' + tx.transaction_date + ' (GD ' + id + ')');
        changed++;
      }
    });
    // ghi lại tab đối soát
    lg.clear();
    lg.getRange(1, 1, 1, 6).merge().setValue('ĐỐI SOÁT TIỀN VỀ TỪ SEPAY – cập nhật ' + now + ' (21 ngày gần nhất)').setBackground('#2b0b4a').setFontColor('#f5d77a').setFontWeight('bold').setFontSize(13);
    lg.getRange(2, 1, 1, 6).setValues([['Mã GD', 'Thời gian', 'Số tiền', 'Nội dung chuyển khoản', 'Trạng thái', 'Khớp với (tab · tên · SĐT)']]).setBackground('#ff4fb8').setFontColor('#ffffff').setFontWeight('bold');
    var out = txs.slice().sort(function (a, b) { return txDate_(b.transaction_date) - txDate_(a.transaction_date); }).map(function (tx) {
      var id = String(tx.id), m = usedTx[id];
      return ["'" + id, tx.transaction_date, Number(tx.amount_in), tx.transaction_content || '', m ? 'Đã khớp' : 'Chưa khớp', m || ''];
    });
    if (out.length) {
      lg.getRange(3, 1, out.length, 6).setValues(out);
      lg.getRange(3, 3, out.length, 1).setNumberFormat('#,##0"đ"');
      lg.setConditionalFormatRules([SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Chưa khớp').setBackground('#ffd9d9').setFontColor('#a61b1b').setBold(true).setRanges([lg.getRange(3, 5, out.length, 1)]).build()]);
    }
    lg.setColumnWidths(1, 6, 150); lg.setColumnWidth(4, 340); lg.setColumnWidth(6, 330); lg.setFrozenRows(2);
    var unmatched = out.filter(function (r) { return r[4] === 'Chưa khớp'; }).length;
    ss.toast('SePay: ' + changed + ' người vừa được xác nhận tiền; ' + unmatched + ' khoản tiền vào chưa khớp ai (xem tab "' + SEPAY_TAB + '").', 'Đối soát SePay', 10);
  } catch (e) {
    var lg2 = ss.getSheetByName(SEPAY_TAB) || ss.insertSheet(SEPAY_TAB);
    lg2.getRange('H1').setValue('Lỗi lần chạy ' + now + ': ' + e);
    Logger.log('kiemTraSePay lỗi: ' + e);
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

// chạy 1 lần để bật tự động đối soát mỗi 10 phút
function caiTuDongSePay() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'kiemTraSePay') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('kiemTraSePay').timeBased().everyMinutes(10).create();
  kiemTraSePay();
}

/* ---------- nhận đăng ký từ ladipage ---------- */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var d = JSON.parse(e.postData.contents);
    if (!d.ten || !d.sdt || !d.bang || !d.thiep || !d.ck) throw new Error('thiếu thông tin');
    // chống ghi trùng: cùng mã gửi (bấm lại/mạng chập chờn) hoặc cùng SĐT + cùng tên + bảng trong 30 phút (khác tên = người khác)
    var cache = CacheService.getScriptCache();
    var kId = 'id_' + (d.id || ''), kPh = 'ph_' + d.bang + '_' + dupKey_(d.ten, d.sdt);
    if ((d.id && cache.get(kId)) || cache.get(kPh)) return out_({ ok: true, dup: true });
    var safe = String(d.ten).replace(/[^\wÀ-ỹ ]/g, '').trim().slice(0, 40) + '_' + String(d.sdt).slice(-4);
    var a = saveImg_(d.thiep, 'thiep_' + safe), b = saveImg_(d.ck, 'ck_' + safe);
    var sh = getSheet_(d.bang);
    var warn = findPhone_(d.sdt, d.ten);
    sh.appendRow(makeRow_(new Date(), d.ten, "'" + d.sdt, d.bang, Number(d.gia) || 0, a.url, b.url, STATUS[0], warn ? '⚠ Cùng tên + SĐT đã đăng ký trước đó: ' + warn : ''));
    if (d.id) cache.put(kId, '1', 21600);
    cache.put(kPh, '1', 1800);
    sh.setRowHeight(sh.getLastRow(), 112);
    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

// tìm người cùng SĐT + cùng tên đã đăng ký ở các tab (để cảnh báo trùng, không chặn)
function findPhone_(sdt, ten) {
  var key = dupKey_(ten, sdt), hits = [];
  TABS.forEach(function (t) {
    var sh = ss_().getSheetByName(t.n);
    if (!sh || sh.getLastRow() < DATA_ROW) return;
    var vals = sh.getRange(DATA_ROW, 2, sh.getLastRow() - DATA_ROW + 1, 2).getValues();
    for (var i = 0; i < vals.length; i++) if (vals[i][0] && dupKey_(vals[i][0], vals[i][1]) === key) hits.push(t.n + ' dòng ' + (DATA_ROW + i));
  });
  return hits.join(', ');
}

function doGet() { return out_({ ok: true, msg: 'Em Xinh Ween Đỉnh – endpoint đang chạy' }); }

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
