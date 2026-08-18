-- XÂY NHÂN HIỆU — migration v11: thêm "trục nội dung" (tags) cho Kho Hook chung, để lọc
-- theo trục thay vì phải lướt hết cả kho (giống cách Kho Content đã lọc theo tags).
-- Chạy 1 lần trong Supabase SQL Editor. An toàn để chạy lại nhiều lần.

alter table hooks_bank_shared add column if not exists tags text[];

-- Gắn tag cho các hook cũ (đã seed trước đây, chưa có tags) dựa theo từ khoá trong hook_text —
-- không hoàn hảo 100% nhưng đủ để nhóm lại, đỡ ngộp khi duyệt kho. Chỉ chạy cho dòng chưa có tags.
update hooks_bank_shared set tags = array['tai_chinh']
where tags is null and (
  hook_text ilike '%tiền%' or hook_text ilike '%tài chính%' or hook_text ilike '%tiết kiệm%'
  or hook_text ilike '%thu nhập%' or hook_text ilike '%nợ%' or hook_text ilike '%sao kê%' or hook_text ilike '%đầu tư%'
);

update hooks_bank_shared set tags = array['tam_linh']
where tags is null and (
  hook_text ilike '%tâm linh%' or hook_text ilike '%phong thuỷ%' or hook_text ilike '%phong thủy%'
  or hook_text ilike '%nhân quả%' or hook_text ilike '%phước%' or hook_text ilike '%phúc%' or hook_text ilike '%nghiệp%'
  or hook_text ilike '%gia tiên%' or hook_text ilike '%vận%'
);

update hooks_bank_shared set tags = array['hon_nhan_gia_dinh']
where tags is null and (
  hook_text ilike '%hôn nhân%' or hook_text ilike '%chồng%' or hook_text ilike '%vợ%'
  or hook_text ilike '%con cái%' or hook_text ilike '%gia đình%' or hook_text ilike '%cha mẹ%' or hook_text ilike '%con dâu%'
);

update hooks_bank_shared set tags = array['kinh_doanh']
where tags is null and (
  hook_text ilike '%kinh doanh%' or hook_text ilike '%bán hàng%' or hook_text ilike '%khách hàng%'
  or hook_text ilike '%doanh thu%' or hook_text ilike '%lợi nhuận%'
);

update hooks_bank_shared set tags = array['suc_khoe_lam_dep']
where tags is null and (
  hook_text ilike '%sức khoẻ%' or hook_text ilike '%sức khỏe%' or hook_text ilike '%da%'
  or hook_text ilike '%cân nặng%' or hook_text ilike '%ngủ%' or hook_text ilike '%bác sĩ%'
);

update hooks_bank_shared set tags = array['xay_kenh']
where tags is null and (
  hook_text ilike '%kênh%' or hook_text ilike '%content%' or hook_text ilike '%video%'
  or hook_text ilike '%follow%' or hook_text ilike '%đăng bài%' or hook_text ilike '%facebook%'
);

-- Còn lại (chưa khớp từ khoá nào) đưa vào Phát triển bản thân — nhóm bắt buộc chung phù hợp nhất
-- cho các hook dạng tư duy/động lực/quan sát cuộc sống không rơi vào 6 trục trên.
update hooks_bank_shared set tags = array['phat_trien_ban_than'] where tags is null;
