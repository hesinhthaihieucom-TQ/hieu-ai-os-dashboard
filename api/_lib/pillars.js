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

const PILLAR_KEYS = PILLARS.map((p) => p.key);

// Prompt + tool schema phân loại trục nội dung TỪ CHỮ — dùng chung cho api/phan-loai-truc.js (gọi
// từ client, có auth) và api/cron/auto-fill-schedule.js (gọi trong cron, không qua HTTP/auth) — tách
// ra đây để 2 nơi không phải chép lại y hệt nhau (theo đúng tinh thần api/_lib/post-schema.js).
const TEXT_CLASSIFY_SYSTEM_PROMPT = `Bạn là chuyên gia phân loại nội dung mạng xã hội theo trục nội dung (content pillar) tại Việt Nam.

Đây là danh sách trục nội dung:
${PILLARS.map((p) => `- ${p.key}: ${p.label}`).join('\n')}

NHIỆM VỤ: Đọc tiêu đề/nội dung được đưa, chọn ĐÚNG 1 trục phù hợp nhất trong danh sách trên — không được bịa trục mới ngoài danh sách. Nếu nội dung pha trộn nhiều chủ đề, chọn trục NỔI BẬT NHẤT.`;

const TOOL_PHAN_LOAI_TRUC = {
  name: 'xuat_phan_loai_truc',
  description: 'Xuất đúng 1 trục nội dung phù hợp nhất.',
  input_schema: {
    type: 'object',
    properties: {
      truc: { type: 'string', enum: PILLAR_KEYS },
    },
    required: ['truc'],
  },
};

module.exports = { PILLARS, TEXT_CLASSIFY_SYSTEM_PROMPT, TOOL_PHAN_LOAI_TRUC };
