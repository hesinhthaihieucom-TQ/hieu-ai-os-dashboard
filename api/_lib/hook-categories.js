// Danh sách 15 loại hook dùng chung cho: tạo hook theo chủ đề, và tự phân loại hook người dùng tự nhập.
const HOOK_CATEGORIES = {
  to_mo_bo_ngo: { label: 'Tò mò bỏ ngỏ', desc: 'Mở ra một khoảng trống thông tin khiến người đọc phải đọc tiếp mới biết câu trả lời.' },
  canh_bao_mat_mat: { label: 'Cảnh báo / mất mát', desc: 'Chỉ ra thứ người đọc đang mất/sắp mất nếu không hành động.' },
  nghich_ly: { label: 'Nghịch lý / phản trực giác', desc: 'Nêu một điều nghe ngược với lẽ thường, khiến người đọc khựng lại.' },
  cau_hoi_goi_mo: { label: 'Câu hỏi gợi mở', desc: 'Đặt câu hỏi chạm đúng vấn đề/nỗi đau khiến người đọc tự soi vào mình.' },
  con_so_cu_the: { label: 'Con số cụ thể', desc: 'Dùng số liệu/tỷ lệ cụ thể, gây tò mò hoặc gây sốc.' },
  bi_mat_noi_bo: { label: 'Bí mật / nội bộ ngành', desc: 'Hé lộ điều ít ai nói ra, kiểu insider trong ngành.' },
  truoc_sau: { label: 'So sánh trước - sau', desc: 'Đối lập rõ trạng thái trước và sau một hành động/quyết định.' },
  khan_hiem_thoi_han: { label: 'Khan hiếm / thời hạn', desc: 'Tạo cảm giác cấp bách, sắp hết cơ hội/thời gian.' },
  thu_nhan_ca_nhan: { label: 'Thú nhận cá nhân', desc: 'Kể thật một sai lầm/trải nghiệm cá nhân để tạo sự chân thật, gần gũi.' },
  loi_sai_pho_bien: { label: 'Lỗi sai phổ biến', desc: 'Chỉ thẳng 1 sai lầm rất nhiều người mắc mà không biết.' },
  ket_qua_gay_soc: { label: 'Kết quả gây sốc / bằng chứng xã hội', desc: 'Đưa ra 1 kết quả cụ thể, ấn tượng làm bằng chứng đáng tin.' },
  lat_nguoc_niem_tin: { label: 'Lật ngược niềm tin', desc: 'Đập tan một niềm tin phổ biến mà người đọc vẫn tin là đúng.' },
  chi_dich_danh: { label: 'Chỉ đích danh / hiệu ứng gương', desc: 'Gọi đúng tên đối tượng cụ thể khiến người đọc thấy "đang nói về mình".' },
  kich_ban_gia_dinh: { label: 'Kịch bản giả định', desc: 'Đặt người đọc vào 1 tình huống giả định cụ thể để họ hình dung ngay.' },
  su_that_phu_phang: { label: 'Sự thật phũ phàng', desc: 'Nói thẳng một sự thật khó nghe nhưng đúng, không né tránh.' },
};

module.exports = { HOOK_CATEGORIES };
