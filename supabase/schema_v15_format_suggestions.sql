-- Dạng Content: lưu gợi ý AI + lựa chọn thủ công của người dùng ngay trên positioning_results,
-- để chỉ gọi AI đúng 1 lần khi vừa hoàn thành/làm lại Định Vị, không gọi lại mỗi lần đăng nhập/mở trang.
alter table positioning_results add column if not exists format_suggestions jsonb;
alter table positioning_results add column if not exists chosen_formats jsonb not null default '[]'::jsonb;
