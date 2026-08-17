// Kiến thức dùng chung: 12 dạng content (từ tài liệu Buổi 4) + hướng dẫn chọn dạng theo ngành.
const FORMAT_NAMES = [
  'Text trên ảnh AI', 'Text trên ảnh thật', 'Text trên Video AI + Caption', 'Text trên Video thật + Caption',
  'Video Ngồi Nói', 'POV (First Person View)', 'Vlog (kể chuyện bằng cuộc sống)', 'Take note viết bằng AI',
  'Ghi chú viết tay AI', 'Case Study (chứng minh)', 'Livestream / Mini Q&A', 'Meme / Bắt Trend',
];

const FORMAT_GUIDE = `CHỌN DẠNG CONTENT PHÙ HỢP (trong đúng 12 dạng sau):
- Text trên ảnh AI: hợp tâm thức/tài chính/sức khoẻ/khoa học, khi cần "hiểu ý tưởng" hơn "tin con người". Không hợp spa/BĐS/mỹ phẩm/thời trang.
- Text trên ảnh thật: hợp coach/đào tạo/tài chính/sức khoẻ/phát triển bản thân, khi cần "tin người chia sẻ". Không hợp F&B/nội thất/du lịch.
- Text trên Video AI + Caption: hợp tâm thức/tài chính/giáo dục/sức khoẻ, khi cần viral bằng ý tưởng trừu tượng. Không hợp spa/BĐS/review sản phẩm.
- Text trên Video thật + Caption: hợp coach/sức khoẻ/tài chính/phát triển bản thân/lifestyle — lựa chọn toàn diện mặc định nếu không có tiêu chí đặc biệt.
- Video Ngồi Nói: hợp coach/đào tạo/sức khoẻ/tài chính/tuyển dụng, khi cần chuyển đổi mạnh. Không hợp thời trang/makeup/nấu ăn.
- POV (First Person View): hợp F&B/beauty/sức khoẻ/nghề thủ công/du lịch, khi công việc có nhiều hành động trực quan. Không hợp ngành thuần nói/tư duy.
- Vlog: hợp chuyên gia/CEO/kinh doanh/sức khoẻ/F&B/giáo dục/beauty, khi muốn kể hành trình dài.
- Take note viết bằng AI: hợp giáo dục/tài chính/sức khoẻ/marketing, khi cần hệ thống hoá kiến thức thành checklist/quy trình.
- Ghi chú viết tay AI: hợp giáo dục/tài chính/sức khoẻ/marketing/AI, khi cần cảm giác gần gũi hơn ảnh AI thông thường.
- Case Study: hợp sức khoẻ/coaching/tài chính/kinh doanh/beauty/giáo dục, khi cần bằng chứng cụ thể để chuyển đổi.
- Livestream / Mini Q&A: hợp coaching/sức khoẻ/tài chính/kinh doanh/giáo dục/beauty, khi cần xử lý niềm tin và chốt nhu cầu nhanh.
- Meme / Bắt Trend: hợp giải trí/creator/KOC/review/giáo dục/sức khoẻ/tài chính, khi muốn tăng nhận diện nhanh — không nên dùng làm chủ lực cho chuyên gia/bác sĩ.`;

module.exports = { FORMAT_NAMES, FORMAT_GUIDE };
