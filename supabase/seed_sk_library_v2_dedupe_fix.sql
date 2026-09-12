-- SỬA LỖI: Thư Viện Sức Khỏe hiện bị TRÙNG LẶP mỗi mục 2 lần (2026-09-12, chị Quỳnh báo "sao bị lặp
-- lại vậy??"). Nguyên nhân: seed_sk_library_v1.sql chỉ là "insert" thường, không có ràng buộc unique/
-- on conflict nào trên issue_name — nên mỗi lần chạy lại file đó (kể cả vô tình chạy 2 lần) đều CHÈN
-- THÊM 11 dòng mới, không thay thế. An toàn chạy lại nhiều lần.

-- 1. Xoá bản trùng, chỉ giữ lại 1 dòng/issue_name (giữ dòng MỚI NHẤT — created_at lớn nhất, nếu bằng
--    nhau thì giữ id lớn nhất). Nếu 1 trong các bản trùng đã được gắn product_notes riêng (qua UI
--    Quản Trị) mà bản khác thì trống, ưu tiên giữ bản có product_notes phong phú hơn để không mất dữ
--    liệu admin đã chỉnh tay.
do $$
begin
  delete from sk_library_entries a
  using sk_library_entries b
  where a.issue_name = b.issue_name
    and a.id <> b.id
    and (
      (select count(*) from jsonb_object_keys(a.product_notes)) < (select count(*) from jsonb_object_keys(b.product_notes))
      or (
        (select count(*) from jsonb_object_keys(a.product_notes)) = (select count(*) from jsonb_object_keys(b.product_notes))
        and (a.created_at, a.id) < (b.created_at, b.id)
      )
    );
end $$;

-- 2. Thêm ràng buộc unique trên issue_name — chặn hẳn việc trùng lặp về sau, kể cả nếu ai đó lỡ chạy
--    lại seed_sk_library_v1.sql thêm 1 lần nữa.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sk_library_entries_issue_name_key') then
    alter table sk_library_entries add constraint sk_library_entries_issue_name_key unique (issue_name);
  end if;
end $$;
