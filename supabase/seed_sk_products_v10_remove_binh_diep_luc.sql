-- Bỏ sản phẩm "Bình chiết diệp lục" khỏi catalog (2026-09-05, chị Quỳnh: "bỏ cái bình chiết diệp
-- lục đi") — sk_customer_products.product_id có "on delete cascade" nên nếu khách nào đã lỡ được
-- gán sản phẩm này thì dòng gán đó tự xoá theo, không lỗi. An toàn chạy lại nhiều lần (no-op nếu đã
-- xoá).
delete from sk_products where name = 'Bình chiết diệp lục';
