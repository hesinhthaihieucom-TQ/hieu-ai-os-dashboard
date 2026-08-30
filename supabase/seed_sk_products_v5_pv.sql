-- Điểm PV chính thức theo bảng giá bán lẻ Unicity chị Quỳnh gửi (2026-08-30) — cần cột sk_products.pv
-- (chạy schema_suc_khoe.sql trước). Giá bán lẻ trong bảng khớp đúng retail_price đã có sẵn, chỉ thêm
-- PV. Thêm mới "Bình chiết diệp lục" (mã 34308) — phụ kiện, chưa xếp nhánh.

update sk_products set pv = 51 where name = 'Bios Life Slim';
update sk_products set pv = 51 where name = 'Bios Life C';
update sk_products set pv = 16 where name = 'Paraway Plus';
update sk_products set pv = 10 where name = 'Red Clover Plus';
update sk_products set pv = 3 where name = 'BioReiShi Coffee';
update sk_products set pv = 38 where name = 'Unimate Lemon Ginger Flavored Mate';
update sk_products set pv = 12 where name = 'Bột Diệp Lục Super Chlorophyll Powder';
update sk_products set pv = 31 where name = 'Unicity Oasis';
update sk_products set pv = 26 where name = 'LC – Hương Vani';
update sk_products set pv = 9 where name = 'Hỗn hợp Canxi - Magiê';
update sk_products set pv = 14 where name = 'Bios Life Mannos';
update sk_products set pv = 19 where name = 'Probionic Plus';
update sk_products set pv = 14 where name = 'ChloroSpirulina';
update sk_products set pv = 26 where name = 'Joint Mobility';
update sk_products set pv = 20 where name = 'Chất xơ Lifiber';
update sk_products set pv = 20 where name = 'Omega Life-3 Resolv';
update sk_products set pv = 30 where name = 'Hawaiian Noni';
update sk_products set pv = 14 where name = 'Immunizen';
update sk_products set pv = 13 where name = 'Aloe Vera';
update sk_products set pv = 38 where name = 'Unimate Lemon Flavored Mate';
update sk_products set pv = 32 where name = 'Neigene Evolution Expert Ampoule';
update sk_products set pv = 12 where name = 'Neigene Evolution Makeup Remover Oil';
update sk_products set pv = 12 where name = 'Neigene Evolution Head To Toe Oil';
update sk_products set pv = 12 where name = 'Neigene Evolution Foaming Cleanser';
update sk_products set pv = 27 where name = 'Neigene Evolution Rich Care';
update sk_products set pv = 20 where name = 'Neigene Evolution Toning Lotion';
update sk_products set pv = 27 where name = 'Neigene Evolution Intense Care';
update sk_products set pv = 11 where name = 'Unicity Daily Suncare';

insert into sk_products (name, short_description, retail_price, pv)
select 'Bình chiết diệp lục', 'Phụ kiện đi kèm — bình pha/lắc các loại bột uống (diệp lục, chất xơ, LC...).', 74618, 1
where not exists (select 1 from sk_products where name = 'Bình chiết diệp lục');
