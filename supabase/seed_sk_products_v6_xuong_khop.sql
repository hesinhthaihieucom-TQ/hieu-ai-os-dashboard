-- Thêm nhánh "Xương khớp" (2026-08-30, chị Quỳnh chốt) — Canxi-Magiê và Joint Mobility đang bị xếp
-- nhầm vào Làm đẹp da, chuyển sang nhánh riêng cho đúng. Cần chạy schema_suc_khoe.sql trước (đã thêm
-- 'xuong_khop' vào ràng buộc category).

update sk_products set category = 'xuong_khop' where name in ('Hỗn hợp Canxi - Magiê', 'Joint Mobility');
