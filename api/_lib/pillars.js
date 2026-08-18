// Danh sách trục nội dung dùng chung — khớp đúng key với PILLARS/HOOK_PILLARS phía client
// (nhan-hieu/js/kho-content.js, kho-hook.js) để AI phân loại ra đúng nhóm hiển thị được ngay.
const PILLARS = [
  { key: 'tai_chinh', label: 'Tài chính' },
  { key: 'tam_linh', label: 'Tâm linh' },
  { key: 'hon_nhan_gia_dinh', label: 'Hôn nhân & Gia đình' },
  { key: 'phat_trien_ban_than', label: 'Phát triển bản thân' },
  { key: 'kinh_doanh', label: 'Kinh doanh' },
  { key: 'suc_khoe_lam_dep', label: 'Sức khoẻ & Làm đẹp' },
  { key: 'xay_kenh', label: 'Xây kênh & Content' },
];

module.exports = { PILLARS };
