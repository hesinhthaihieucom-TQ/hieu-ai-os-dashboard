-- "tất cả những câu nào dài trên 2 dòng đều là quote đó, a tách riêng ra đi" (chị Quỳnh 2026-09-01)
-- Tách các hook đã nạp trước đây (dài hơn ngưỡng ước lượng "2 dòng" trên thẻ hiển thị, ~100 ký tự)
-- sang category='quote' — cùng ngưỡng và cùng key 'quote' mà code (kho-hook.js/auto-fill-week.js) giờ
-- tự gán cho hook mới từ nay về sau. Không đụng các dòng đã là 'quote' rồi. An toàn chạy lại nhiều lần.
update hooks_bank_shared
set category = 'quote'
where category is distinct from 'quote'
  and length(hook_text) > 100;

update hooks_bank_personal
set category = 'quote'
where category is distinct from 'quote'
  and length(hook_text) > 100;
