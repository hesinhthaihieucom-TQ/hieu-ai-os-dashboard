-- XÂY NHÂN HIỆU — ghim cố định 3 bài lên đầu Kho chung (không theo bài mới nhất nữa).
-- Chạy sau khi đã có content_bank_shared (schema.sql). An toàn để chạy lại nhiều lần.

alter table content_bank_shared add column if not exists pin_order integer;

update content_bank_shared set pin_order = 1 where title = 'DẤU HIỆU MỘT GIA ĐÌNH ĐANG CÓ PHÚC KHÍ';
update content_bank_shared set pin_order = 2 where title = 'CHỈ CẦN BẠN DÁM KẾT THÚC NGHIỆT DUYÊN THÌ LẬP TỨC CÓ THỂ ĐỔI MỆNH';
update content_bank_shared set pin_order = 3 where title = 'BỐN BƯỚC TÍCH SẢN DÀNH CHO NGƯỜI ĐANG CÓ NỢ';
