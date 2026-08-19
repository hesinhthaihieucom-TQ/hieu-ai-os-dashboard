// 13 câu hỏi dạng textarea trong wizard Định Vị (nhan-hieu/js/dinh-vi.js) — dùng chung cho việc
// suy luận ngược câu trả lời gốc từ kết quả đã có sẵn (dán vào, hoặc đã lưu từ trước không còn
// answers). Bỏ qua 5 câu dạng chọn (chips/radio) vì khó khớp đúng 1 lựa chọn có sẵn từ văn bản tự do.
const ANSWER_FIELDS = {
  a1: 'Công việc/lĩnh vực hiện tại, đã làm bao lâu, giỏi nhất ở đâu, đang kẹt ở đâu.',
  a2: 'Mục đích xây thương hiệu cá nhân, sản phẩm/dịch vụ/khoá học muốn dẫn người xem về.',
  b1: 'Biến cố hoặc hành trình để lại bài học sâu sắc, có thể làm "linh hồn" cho kênh.',
  b2: 'Điều người khác hay tìm đến hỏi/khen nhiều nhất, chủ đề có thể nói rất lâu.',
  b3: 'Việc thích làm đến mức không thấy mệt, và việc không thích/dễ tụt năng lượng.',
  b4: 'Điều từng tự ti hoặc bị chê.',
  c4: 'Chất liệu hình ảnh có thể quay dễ dàng mỗi ngày.',
  d1: 'Người làm nội dung tương tự đang làm tốt điều gì, khác biệt ở điểm nào.',
  d2: 'Câu nói 10 giây để người lạ nhớ được mình là ai.',
  d3: 'Điều tin sâu sắc nhất về lĩnh vực đang làm, không phải ai cũng đồng ý.',
  e1: 'Công việc làm nhiều nhất mỗi ngày, đồ vật/không gian luôn xuất hiện cùng.',
  e2: 'Phong cách ăn mặc/xuất hiện có nhất quán không, đặc điểm gì.',
  e3: 'Điểm chung về hình ảnh của những người có thương hiệu mạnh mà ngưỡng mộ.',
};

module.exports = { ANSWER_FIELDS };
