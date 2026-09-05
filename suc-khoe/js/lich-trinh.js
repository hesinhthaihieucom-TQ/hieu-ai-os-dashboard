// Lịch Trình Của Bạn — 3 tab theo đúng tỉ trọng giải pháp chị Quỳnh chốt (2026-08-30): 70% sản phẩm,
// 20% ăn uống, 10% tập luyện.
// - "Sản Phẩm": hướng dẫn sử dụng theo khung giờ (sk_packages.regimen_sections, tĩnh — lấy từ file
//   HD_ chị gửi) HIỂN THỊ TRƯỚC, rồi tới lịch trình mốc ngày cũ (sk_package_schedule_items, nếu gói
//   có thiết lập thêm qua Quản Trị).
// - "Ăn Uống" / "Tập Luyện": nội dung THAM KHẢO CHUNG cho mọi gói (không lưu DB — kiến thức nền tảng
//   tĩnh, giống quy ước "Kiến Thức Nền Tảng" ở tai-chinh — chị Quỳnh muốn xem trước, nếu cần chỉnh gì
//   sau này sẽ đổi thành admin-editable).
const SK_GI_TABLES = [
  { title:'1 — Tinh bột (ngũ cốc, lương thực)', color:'#e8643c', high:['Cơm gạo trắng 86','Xôi 98','Bánh mì trắng 75','Khoai tây rương 111','Khoai tây trắng luộc 82','Khoai tây nghiền 87'], mid:['Cháo gạo nếp 65','Cơm gạo trắng Basmati - Ấn 67','Đỗ 67','Bún gạo 61','Ngô ngọt luộc 68','Bánh mì lúa mạch đen 58','Cơm gạo lứt 66'], low:['Khoai lang 54','Bánh Mochi bột gạo 48','Cháo cám gạo 19','Cháo gạo đen 42','Xôi/bột từ táo biến tính, đậu gạo 55','Sắn luộc 46','Cháo lứa mì 30'] },
  { title:'2 — Trái cây', color:'#1f9d63', high:['Dưa hấu 72'], mid:['Nho đen 56','Kiwi 58','Dứa tươi 59','Cherry chín đậm 63','Nho khô 64'], low:['Bưởi 25','Táo khô 26','Mơ tươi 26','Mận khô đã tách hột 29','Chuối xanh 30','Mơ tươi 34','Táo tươi 36','Lê tươi 38','Lê tươi 38','Mận 39','Dâu tây tươi 40','Cherry xanh 41','Đào tươi 42','Nước lê đóng hộp 44','Cam tươi 48','Mứt cam 48','Xoài chín 51','Nước mơ đóng hộp 51','Nước đào đóng hộp 51','Chuối tươi 52','Việt quất — blueberry 53'] },
  { title:'3 — Rau củ', color:'#2f7fc4', high:['Khoai tây nướng 111'], mid:['Ngô ngọt luộc 58','Cháo ngô 68','Khoai tây trắng luộc 82','Khoai tây nghiền 87'], low:['Cà rốt 39','Củ cải 52','Đậu Hà Lan non 54'] },
];

(function(){
function render(container, ctx){
  const state = { loading:true, tab:'sanpham', items:[], doneIds:new Set(), packageName:null, regimenSections:[], productByName:{}, busyId:null,
    insightText:'', insightLoading:false, insightResult:'', insightError:'', customerProducts:[],
    calcWeight:'', calcGoal:'duy_tri', healthLevel:null };

  function draw(){ container.innerHTML = html(); bind(); }

  // Không còn bắt buộc có sk_package_id mới tải/hiện được trang (2026-09-05, chị Quỳnh: "gán gói ở
  // đây là gán sản phẩm khách đang dùng á, chứ k phải mỗi combo") — khách mua lẻ/ngoài app không có
  // Combo (sk_package_id null) nhưng có sk_customer_products vẫn cần thấy đúng hướng dẫn sử dụng của
  // đúng sản phẩm họ dùng, xem sanPhamTab().
  async function load(){
    const packageId = ctx.profile && ctx.profile.sk_package_id;
    const [{ data: pkg }, { data: items }, { data: progress }, { data: products }, { data: customerProductRows }, { data: checkin }] = await Promise.all([
      packageId ? ctx.supabase.from('sk_packages').select('name,regimen_sections').eq('id', packageId).maybeSingle() : Promise.resolve({ data:null }),
      packageId ? ctx.supabase.from('sk_package_schedule_items').select('*').eq('package_id', packageId).order('day_offset', { ascending:true }) : Promise.resolve({ data:[] }),
      ctx.supabase.from('sk_schedule_progress').select('schedule_item_id').eq('user_id', ctx.user.id),
      ctx.supabase.from('sk_products').select('id,name,image_url,retail_price,detail_sections,short_description'),
      ctx.supabase.from('sk_customer_products').select('product_id,reminder_time').eq('user_id', ctx.user.id),
      ctx.supabase.from('sk_health_checkins').select('survey_insulin,survey_toxin,survey_metabolic').eq('user_id', ctx.user.id).maybeSingle(),
    ]);
    state.packageName = pkg ? pkg.name : null;
    state.regimenSections = (pkg && Array.isArray(pkg.regimen_sections)) ? pkg.regimen_sections : [];
    state.items = items || [];
    state.doneIds = new Set((progress||[]).map(p=>p.schedule_item_id));
    // Mức độ nguy cơ từ Kiểm Tra Sức Khỏe (2026-09-05, chị Quỳnh: "người bình thường thì theo phác
    // đồ của em, người có vấn đề sức khỏe nặng theo nhãn") — null nếu khách CHƯA làm Kiểm Tra Sức
    // Khỏe (không tự suy diễn "an toàn" hay "nặng" khi chưa có dữ liệu, mặc định dùng phác đồ như cũ).
    state.healthLevel = checkin ? skComputeHealthLevel(checkin.survey_insulin, checkin.survey_toxin, checkin.survey_metabolic).level : null;
    const allProducts = products || [];
    allProducts.forEach(p=>{ state.productByName[p.name] = p; });
    const reminderByProductId = Object.fromEntries((customerProductRows||[]).map(r=>[r.product_id, r.reminder_time]));
    state.customerProducts = allProducts.filter(p=>reminderByProductId[p.id]!==undefined)
      .map(p=>({ ...p, _reminderTime: reminderByProductId[p.id] }));
    state.loading = false;
    draw();
  }

  // Lấy đúng mục "Đối tượng sử dụng"/"Cách dùng" đã có sẵn trong detail_sections (không cần viết lại
  // hướng dẫn riêng cho từng khách) — fallback short_description nếu sản phẩm chưa có mục này.
  function skProductUsageHtml(p){
    const sections = Array.isArray(p.detail_sections) ? p.detail_sections : [];
    const usage = sections.filter(s=>/đối tượng|cách dùng/i.test(s.title||''));
    if(usage.length===0) return p.short_description ? `<div style="font-size:13px;color:var(--ink-soft);line-height:1.7;">${esc(p.short_description)}</div>` : '';
    return usage.map(sec=>{
      const meta = skSectionMeta(sec.title);
      return `<div style="margin-top:8px;">${skSectionHeaderHtml(sec.title, meta.color, meta.icon)}<div style="font-size:13px;line-height:1.7;">${skRichBodyHtml(sec.body)}</div></div>`;
    }).join('');
  }

  function targetDate(dayOffset){
    const started = ctx.profile && ctx.profile.sk_package_started_at;
    if(!started) return null;
    const d = new Date(started);
    d.setDate(d.getDate() + Number(dayOffset));
    return d;
  }

  async function toggleDone(itemId, isDone){
    state.busyId = itemId; draw();
    if(isDone){
      await ctx.supabase.from('sk_schedule_progress').delete().eq('user_id', ctx.user.id).eq('schedule_item_id', itemId);
      state.doneIds.delete(itemId);
    } else {
      await ctx.supabase.from('sk_schedule_progress').upsert({ user_id: ctx.user.id, schedule_item_id: itemId }, { onConflict:'user_id,schedule_item_id' });
      state.doneIds.add(itemId);
    }
    state.busyId = null;
    draw();
  }

  // Khách TỰ đặt giờ nhắc của chính mình (2026-09-05, chị Quỳnh: "cái nhắc lịch dùng sản phẩm...
  // nên cho người dùng tự cài giờ nhắc chứ không phải mình") — profiles.sk_reminder_time là giờ
  // nhắc CHUNG/ngày cho gói Combo của riêng người này (không ảnh hưởng người khác cùng gói).
  async function savePackageReminderTime(time){
    const { error } = await ctx.supabase.from('profiles').update({ sk_reminder_time: time||null }).eq('id', ctx.user.id);
    if(error){ alert('Không lưu được giờ nhắc: ' + error.message); return; }
    if(ctx.profile) ctx.profile.sk_reminder_time = time||null;
  }

  // sk_customer_products cho phép chính chủ UPDATE reminder_time (RLS "sk_customer_products_owner_update",
  // xem schema_suc_khoe.sql) — khách KHÔNG tự thêm/bớt sản phẩm được (chỉ admin gán), chỉ tự đặt giờ.
  async function saveCustomerProductReminderTime(productId, time){
    const { error } = await ctx.supabase.from('sk_customer_products').update({ reminder_time: time||null }).eq('user_id', ctx.user.id).eq('product_id', productId);
    if(error){ alert('Không lưu được giờ nhắc: ' + error.message); return; }
    const p = state.customerProducts.find(x=>x.id===productId);
    if(p) p._reminderTime = time||null;
  }

  function regimenHtml(){
    if(state.regimenSections.length===0) return '';
    return `
      <div class="page-head" style="margin-bottom:12px;"><h2 style="font-size:17px;">Hướng dẫn sử dụng theo khung giờ</h2></div>
      ${state.regimenSections.map(sec=>`
        <details class="kt-section" open>
          <summary class="kt-summary">⏰ ${esc(sec.time_label||'')}</summary>
          <div style="margin-top:12px;">
            ${sec.note ? `<div class="hint-box" style="margin-bottom:12px;">${esc(sec.note)}</div>` : ''}
            ${(sec.steps||[]).map(step=>{
              const p = step.product_name ? state.productByName[step.product_name] : null;
              const isPriority = !!step.priority;
              // Liều theo phác đồ combo (mặc định) hay theo đúng nhãn công bố (2026-09-05, chị Quỳnh:
              // "người bình thường thì theo phác đồ của em, người có vấn đề sức khỏe nặng theo nhãn")
              // — CHỈ áp dụng khi Kiểm Tra Sức Khỏe của khách ở mức "Cao" VÀ step này có ghi liều nhãn
              // riêng (safe_instruction, xem seed_sk_packages_regimen_v1.sql — chỉ 3 sản phẩm có phác
              // đồ combo khác nhãn: Bios Life Slim, Aloe Vera, Red Clover Plus).
              const usingSafe = state.healthLevel==='Cao' && step.safe_instruction;
              const shownInstruction = usingSafe ? step.safe_instruction : step.instruction;
              return `
              <div style="display:flex;gap:12px;align-items:flex-start;padding:10px 14px;margin:0 -14px;border-bottom:1px solid var(--line);${isPriority?'background:#fff8ec;border-radius:8px;':''}">
                ${p && p.image_url ? `<img src="${esc(p.image_url)}" alt="" style="width:44px;height:44px;object-fit:cover;border-radius:8px;flex-shrink:0;">` : `<div style="width:44px;height:44px;border-radius:8px;background:var(--surface-soft,#f5f5f5);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:18px;">🍽️</div>`}
                <div style="flex:1;min-width:0;">
                  ${step.product_name ? `<div style="font-weight:700;font-size:13.5px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;"><span>${esc(step.product_name)}${isPriority ? ` <span style="font-size:10px;font-weight:700;color:#fff;background:#e8643c;border-radius:5px;padding:2px 6px;vertical-align:middle;">⭐ Ưu tiên mua trước</span>` : ''}</span>${p && p.retail_price!=null ? `<span style="font-family:'IBM Plex Mono',monospace;color:var(--accent);white-space:nowrap;">${Number(p.retail_price).toLocaleString('vi-VN')}đ</span>` : ''}</div>` : ''}
                  <div style="font-size:13px;color:var(--ink-soft);margin-top:2px;line-height:1.6;">${esc(shownInstruction||'')}</div>
                  ${usingSafe ? `<div style="font-size:11.5px;color:#c0392b;margin-top:4px;">⚠️ Dùng đúng liều theo nhãn công bố — kết quả Kiểm Tra Sức Khỏe của bạn ở mức Cao nên ưu tiên an toàn hơn phác đồ thường.</div>` : ''}
                </div>
              </div>
            `;}).join('')}
            ${(sec.steps||[]).some(s=>s.priority) ? `<div style="font-size:12px;color:var(--ink-soft);margin-top:8px;">⭐ = sản phẩm nên ưu tiên mua trước nếu chưa mua trọn bộ.</div>` : ''}
          </div>
        </details>
      `).join('')}
    `;
  }

  function sanPhamTab(){
    const doneCount = state.items.filter(i=>state.doneIds.has(i.id)).length;
    return `
      ${state.packageName ? `
        <div class="card" style="margin-bottom:18px;">
          ${skSectionHeaderHtml('Giờ nhắc mỗi ngày của bạn', '#7c6bd4', '⏰')}
          <div style="font-size:13px;color:var(--ink-soft);margin-bottom:10px;">Chọn 1 giờ trong ngày để nhận thông báo nhắc xem lịch trình gói "${esc(state.packageName)}" — tự chọn giờ phù hợp với bạn.</div>
          <input type="time" id="lt-package-reminder" value="${esc((ctx.profile && ctx.profile.sk_reminder_time) || '')}" style="width:auto;margin:0;">
        </div>
      ` : ''}
      ${state.customerProducts.length>0 ? `
        <div class="page-head" style="margin-bottom:12px;"><h2 style="font-size:17px;">Sản phẩm bạn đang dùng</h2></div>
        ${state.customerProducts.map(p=>`
          <div class="card" style="margin-bottom:16px;display:flex;gap:14px;align-items:flex-start;">
            ${p.image_url ? `<img src="${esc(p.image_url)}" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:9px;flex-shrink:0;">` : ''}
            <div style="flex:1;min-width:0;">
              <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
                <div style="font-weight:700;font-size:14.5px;">${esc(p.name)}</div>
                ${p.retail_price!=null ? `<div style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:var(--accent);white-space:nowrap;">${Number(p.retail_price).toLocaleString('vi-VN')}đ</div>` : ''}
              </div>
              <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
                <label style="font-size:12.5px;color:var(--ink-soft);margin:0;">⏰ Giờ nhắc dùng:</label>
                <input type="time" data-customer-product-reminder="${p.id}" value="${esc(p._reminderTime||'')}" style="width:auto;margin:0;">
              </div>
              ${skProductUsageHtml(p)}
            </div>
          </div>
        `).join('')}
      ` : ''}
      ${regimenHtml()}
      ${state.items.length>0 ? `
        <div class="page-head" style="margin:24px 0 12px;"><h2 style="font-size:17px;">Mốc theo ngày (đã hoàn thành ${doneCount}/${state.items.length})</h2></div>
        ${state.items.map(item=>{
          const isDone = state.doneIds.has(item.id);
          const date = targetDate(item.day_offset);
          return `
            <div class="section" style="display:flex;gap:14px;align-items:flex-start;">
              <span data-toggle="${item.id}|${isDone?'1':'0'}" style="cursor:pointer;font-size:22px;flex-shrink:0;margin-top:2px;" title="${isDone?'Bấm để bỏ đánh dấu':'Bấm để đánh dấu đã xong'}">
                ${state.busyId===item.id ? '…' : (isDone ? '✅' : '⬜')}
              </span>
              <div>
                <div class="meta">${date ? esc(fmtDate(date)) : `Ngày ${item.day_offset}`}</div>
                <div style="font-weight:600;font-size:14.5px;${isDone?'text-decoration:line-through;color:var(--ink-soft);':''}">${esc(item.title)}</div>
                ${item.description ? `<div style="font-size:13.5px;color:var(--ink-soft);margin-top:4px;">${esc(item.description)}</div>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      ` : (state.regimenSections.length===0 ? `<div class="hint-box">Gói này chưa có lịch trình chi tiết — chị Quỳnh sẽ bổ sung sớm.</div>` : '')}
    `;
  }

  function giTableHtml(t){
    return `
      <details class="kt-section">
        <summary class="kt-summary" style="color:${t.color};">${esc(t.title)}</summary>
        <div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
          <div><div style="background:#fdeee8;color:#c0392b;font-weight:700;font-size:12px;border-radius:6px;padding:4px 8px;margin-bottom:6px;text-align:center;">Cao (70+)</div><div style="font-size:12.5px;line-height:1.8;">${t.high.map(x=>esc(x)).join('<br>')}</div></div>
          <div><div style="background:#fff7e6;color:#b8860b;font-weight:700;font-size:12px;border-radius:6px;padding:4px 8px;margin-bottom:6px;text-align:center;">Trung bình (56-69)</div><div style="font-size:12.5px;line-height:1.8;">${t.mid.map(x=>esc(x)).join('<br>')}</div></div>
          <div><div style="background:#eef6f0;color:#1f9d63;font-weight:700;font-size:12px;border-radius:6px;padding:4px 8px;margin-bottom:6px;text-align:center;">Thấp (0-55)</div><div style="font-size:12.5px;line-height:1.8;">${t.low.map(x=>esc(x)).join('<br>')}</div></div>
        </div>
      </details>
    `;
  }

  // Tính nhu cầu Nước & Protein mỗi ngày, quy đổi ra thực phẩm (2026-09-05, chị Quỳnh: "có chỗ tính
  // luôn lượng nước cần uống trong ngày, lượng protein cần ăn trong ngày luôn, tương đương vào bn
  // lượng thực phẩm") — công thức Protein giữ NGUYÊN như bản tĩnh cũ (cân nặng × 1,5 hoặc × 2,0-2,2),
  // Nước dùng công thức phổ biến 35ml/kg. Quy đổi thực phẩm dùng ĐÚNG các số liệu tham khảo protein
  // đã có sẵn trong bản tĩnh cũ, không bịa số mới.
  const SK_PROTEIN_FOOD_REF = [
    { label:'Ức gà', per100g:23 },
    { label:'Thăn bò', per100g:26 },
    { label:'Cá hồi', per100g:21 },
    { label:'Thăn heo nạc', per100g:21 },
    { label:'Đậu phụ', per100g:8 },
  ];
  function nutritionCalcHtml(){
    const w = parseFloat(state.calcWeight);
    const validWeight = isFinite(w) && w > 0;
    const proteinPerKg = state.calcGoal === 'tang_co_giam_mo' ? 2.1 : 1.5;
    const proteinTarget = validWeight ? Math.round(w * proteinPerKg) : null;
    const waterTargetMl = validWeight ? Math.round(w * 35) : null;
    return `
      <div class="card" style="margin-bottom:18px;">
        ${skSectionHeaderHtml('Tính nhu cầu Nước & Protein mỗi ngày', '#7c6bd4', '🥩')}
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:14px;">
          <div>
            <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-bottom:4px;">Cân nặng hiện tại (kg)</label>
            <input type="number" id="calc-weight" value="${esc(state.calcWeight)}" placeholder="VD: 60" style="width:110px;margin:0;">
          </div>
          <div>
            <label style="display:block;font-size:12.5px;font-weight:600;color:var(--ink-soft);margin-bottom:4px;">Mục tiêu</label>
            <select id="calc-goal" style="width:auto;margin:0;">
              <option value="duy_tri" ${state.calcGoal==='duy_tri'?'selected':''}>Duy trì (×1,5)</option>
              <option value="tang_co_giam_mo" ${state.calcGoal==='tang_co_giam_mo'?'selected':''}>Tăng cơ/giảm mỡ (×2,0-2,2)</option>
            </select>
          </div>
        </div>
        ${validWeight ? `
          <div style="display:flex;gap:24px;flex-wrap:wrap;margin-bottom:14px;">
            <div>
              <div style="font-family:'IBM Plex Mono',monospace;font-size:22px;font-weight:700;color:var(--accent);">${(waterTargetMl/1000).toFixed(1)} lít</div>
              <div style="font-size:12px;color:var(--ink-soft);">Nước cần uống/ngày (~35ml × cân nặng)</div>
            </div>
            <div>
              <div style="font-family:'IBM Plex Mono',monospace;font-size:22px;font-weight:700;color:var(--accent);">${proteinTarget}g</div>
              <div style="font-size:12px;color:var(--ink-soft);">Protein cần/ngày</div>
            </div>
          </div>
          <div style="font-size:13px;font-weight:600;margin-bottom:6px;">Tương đương khoảng (chọn 1 hoặc kết hợp nhiều loại):</div>
          <div style="font-size:13px;color:var(--ink-soft);line-height:1.9;">
            ${SK_PROTEIN_FOOD_REF.map(f=>`• ${Math.round(proteinTarget/f.per100g*100)}g ${esc(f.label)}`).join('<br>')}
            <br>• hoặc thêm 1 quả trứng (≈7g) / 1 gói LC (≈12g protein) cho tiện khi ăn ngoài.
          </div>
        ` : `<div class="hint-box">Nhập cân nặng để tính nhu cầu nước & protein mỗi ngày cho riêng bạn.</div>`}
        <div style="font-size:11.5px;color:var(--ink-soft);margin-top:12px;">Công thức tham khảo chung, không thay thế tư vấn dinh dưỡng chuyên sâu — điều chỉnh theo mức vận động và tình trạng sức khỏe thực tế.</div>
      </div>
    `;
  }

  function anUongTab(){
    return `
      <div class="card" style="margin-bottom:18px;">
        ${skSectionHeaderHtml('Vì sao ăn đúng nhịp giúp đốt mỡ tốt hơn?', '#e8643c', '🍽️')}
        ${skRichBodyHtml(`Nhịp ăn 4-4-12 (hoặc 5-5-10): Sáng — 4 tiếng — Trưa — 4 tiếng — Tối — 12 tiếng qua đêm về lại bữa sáng hôm sau.
- Cơ thể cần khoảng cách đủ dài giữa các bữa ăn để insulin có thời gian hạ xuống và cơ thể chuyển từ "đốt đường" sang "đốt mỡ". Ăn quá sát bữa khiến insulin luôn cao, mỡ không được giải phóng.
- Khoảng nhịn ban ngày: giãn bữa 4-6 tiếng (không quá 6 tiếng để tránh tụt đường huyết, mất cơ).
- Khoảng nhịn ban đêm: 8-12 tiếng (không quá 16 tiếng để tránh tụt đường huyết, mất cơ).
- Không cần (và không nên) nhịn quá dài nếu chưa có nền tảng.`)}
      </div>

      <div class="card" style="margin-bottom:18px;">
        ${skSectionHeaderHtml('Nguyên tắc dinh dưỡng chuyển hoá', '#1f9d63', '🥗')}
        ${skRichBodyHtml(`- Loại bỏ đường tinh luyện: đường làm insulin tăng nhanh, khiến cơ thể không vào được vùng đốt mỡ.
- Ưu tiên chất béo tốt: giúp no lâu, ổn định năng lượng, hỗ trợ chuyển hoá mỡ (dầu thực vật, cá béo, các loại hạt — hạn chế mỡ động vật đã qua chiên rán nhiều lần).
- Chọn tinh bột tốt — chỉ số GI thấp: để năng lượng được giải phóng chậm, không bị đói nhanh.
👉 Không phải nhịn ăn, mà là đổi loại năng lượng cơ thể đang dùng.`)}
      </div>

      <div class="card" style="margin-bottom:18px;">
        ${skSectionHeaderHtml('Quy tắc bàn tay — không cần cân, không cần tính calo', '#2f7fc4', '✋')}
        ${skRichBodyHtml(`- 1 lòng bàn tay = Chất đạm (thịt, cá, trứng, đậu phụ...)
- 2 lòng bàn tay = Rau xanh
- 1 nắm tay = Tinh bột (cơm, khoai, ngũ cốc...)
- 1 ngón tay cái = Chất béo (dầu ăn, bơ, các loại hạt...)
👉 Chia đĩa ăn theo tỉ lệ 4-3-2-1: Rau xanh (nhiều nhất) — Đạm — Tinh bột — Chất béo.`)}
      </div>

      ${nutritionCalcHtml()}

      <div class="page-head" style="margin-bottom:12px;"><h2 style="font-size:17px;">Bảng chỉ số đường huyết (GI) để chọn thực phẩm</h2></div>
      <div class="hint-box" style="margin-bottom:14px;">Ưu tiên nhóm GI THẤP — TRUNG BÌNH, dùng có kiểm soát; hạn chế nhóm GI CAO, nhất là buổi tối. Không cần kiêng tuyệt đối, chỉ cần giảm dần và thay thế thông minh.</div>
      ${SK_GI_TABLES.map(giTableHtml).join('')}
    `;
  }

  // Tab "Tinh · Khí · Thần" (2026-08-31, xem kho-tai-lieu/triet-ly-tinh-khi-than-app-suc-khoe.md,
  // chị Quỳnh: "áp dụng chung với nhau" — SONG SONG với 3 tab thực hành đã có, KHÔNG thay thế) — 3
  // tab kia đã phủ Bế Tinh (Sản Phẩm: sản phẩm+giờ dùng) và Dưỡng Khí (Ăn Uống+Tập Luyện), còn thiếu
  // đúng mảnh An Thần — tab này bù đúng phần còn thiếu, tĩnh (không lưu DB) giống anUongTab/tapLuyenTab.
  function tinhKhiThanTab(){
    return `
      <div class="card" style="margin-bottom:18px;">
        ${skSectionHeaderHtml('Bế Tinh — bảo tồn tài nguyên', '#c0392b', '🕯️')}
        ${skRichBodyHtml(`- Ngủ đều nhịp sinh học: lên giường trước 23h để cơ thể khôi phục lại niềm tin và tự sửa chữa tế bào sâu.
- Giữ ấm lưng và chân trước khi ngủ: ngâm chân nước ấm 10 phút, đi vớ mỏng để kéo nhiệt lượng xuống đan điền, xoa dịu hệ thần kinh.
- Nói câu "Hôm nay đủ rồi" trước khi ngủ: nghi thức đóng lại một ngày, buông bảng việc cần làm để không bị đốt lén năng lượng trong đêm.
- Quả Dục: chọn đúng 1 thói quen đang vượt ngưỡng (thức khuya lướt điện thoại, làm việc quá sức...) và giảm 20-30% áp lực đó.`)}
      </div>

      <div class="card" style="margin-bottom:18px;">
        ${skSectionHeaderHtml('Dưỡng Khí — khai thông năng lượng', '#2f7fc4', '🌬️')}
        ${skRichBodyHtml(`- Hơi thở bụng: 3 phút vào sáng và tối để sạc lại khí lực.
- Đi bộ hiền: 20-30 phút/ngày, nhịp nhẹ, vừa đi vừa nói chuyện được — tránh đi nhanh đến mức thở dốc, tim đập nhanh (đó là "tiêu khí", đốt cháy sinh lực dự trữ).
- Ăn no 7 phần, nhai kỹ, ăn chậm, tắt màn hình khi ăn — Tỳ Vị là gốc của khí, ăn quá tải khiến khí bị nghẽn thay vì sinh ra.
⚠️ Lưu ý an toàn: tuyệt đối không tắm nước lạnh ngay sau khi tập (5 Thức Suối Nguồn Tây Tạng hoặc bất kỳ bài tập nào) — để cơ thể nghỉ tự nhiên 30 phút rồi mới tắm nước ấm.`)}
      </div>

      <div class="card" style="margin-bottom:18px;">
        ${skSectionHeaderHtml('An Thần — làm sạch tâm trí', '#7c6bd4', '✨')}
        ${skRichBodyHtml(`- Nghi thức "Tắt Tâm" 10 phút mỗi ngày: ngồi thẳng lưng nhẹ nhàng (không gồng), thở chậm 12 nhịp, thở ra dài hơn hít vào.
- Tháo 3 nút thắt: thả lỏng Hàm (hàm căng thì đầu căng) — thả lỏng Vai (đặt xuống gánh nặng đang gồng gánh) — thả lỏng Bụng (thôi gồng lên để tỏ ra mạnh mẽ, để bụng phồng xẹp tự nhiên theo hơi thở).
- Tồn Thần Thanh Tâm: tắt toàn bộ màn hình điện thoại trước khi ngủ 30 phút để thần không bị dắt đi.
- Nước ấm buổi sáng: uống ngay khi thức dậy, nghi thức kết nối cơ thể vật lý và thiên nhiên trước khi bắt đầu ngày mới.`)}
      </div>

      <div class="hint-box">Theo dõi điểm Tinh/Khí/Thần hằng tuần ở mục "Theo Dõi Sức Khỏe Theo Tuần" (phần Siêu Âm Năng Lượng) để biết trụ nào đang cần chăm nhiều hơn.</div>

      <div class="card" style="margin-top:18px;">
        ${skSectionHeaderHtml('Tìm năng lượng Xanh trong biến cố (Insight Overlay)', '#1f9d63', '🌱')}
        <div style="font-size:13px;color:var(--ink-soft);margin-bottom:12px;">Kể ngắn gọn 1 tình huống khó khăn bạn đang gặp — AI sẽ giúp bạn nhìn thấy điều đang được mở ra/dịch chuyển từ chính biến cố đó, không phải để thay thế tư vấn chuyên môn.</div>
        <textarea id="tkt-insight-input" placeholder="VD: Con dâu tôi vừa dọn ra ở riêng sau mâu thuẫn với gia đình..." style="min-height:90px;" ${state.insightLoading?'disabled':''}>${esc(state.insightText)}</textarea>
        <button class="btn btn-sm" id="tkt-insight-submit" style="margin-top:10px;" ${state.insightLoading?'disabled':''}>${state.insightLoading?'Đang tìm…':'Tìm năng lượng Xanh'}</button>
        ${state.insightError ? `<div class="error-box" style="margin-top:10px;">${esc(state.insightError)}</div>` : ''}
        ${state.insightResult ? `<div class="hint-box" style="margin-top:12px;line-height:1.8;">${esc(state.insightResult)}</div>` : ''}
      </div>
    `;
  }

  async function submitInsight(){
    if(state.insightLoading || !state.insightText.trim()) return;
    state.insightLoading = true; state.insightError = ''; state.insightResult = ''; draw();
    try{
      const data = await callApi('/api/suc-khoe-insight', { bien_co: state.insightText.trim() });
      state.insightResult = data.insight;
    } catch(e){
      state.insightError = e.message || 'Không tìm được insight — thử lại giúp mình.';
    }
    state.insightLoading = false; draw();
  }

  function tapLuyenTab(){
    return `
      <div class="card">
        ${skSectionHeaderHtml('Nhóm 1 — Chưa tập bao giờ', '#1f9d63', '🌱')}
        <div style="font-size:13px;color:var(--ink-soft);margin-bottom:14px;">Người mới, mẹ bỉm, người mệt, thừa cân, ngại vận động.</div>
        ${skRichBodyHtml(`🎯 Mục tiêu:
- Đánh thức cơ thể
- Tạo thói quen
- Không đau — không sợ tập
⏰ Tần suất: 3 buổi/tuần, 15-20 phút/buổi.
📅 Lịch gợi ý: Thứ 2 — Thứ 4 — Thứ 6 (hoặc cách ngày, không cần đúng thứ).`)}
        <div style="margin-top:14px;">
          <div style="font-weight:700;font-size:13.5px;margin-bottom:8px;">🧑‍🦰 Nội dung mỗi buổi</div>
          ${skRichBodyHtml(`1. Khởi động (5 phút): xoay cổ — vai — hông — gối; thở sâu, làm nóng nhẹ.
2. Bài tập chính (10 phút): mỗi bài 30-40 giây, nghỉ 20-30 giây giữa các bài.
3. Giãn cơ — thả lỏng (5 phút).`)}
        </div>
        <div class="hint-box" style="margin-top:14px;">
          ⚠️ Lưu ý quan trọng: Không cần ra mồ hôi nhiều · Không tập đến mệt rã rời · Tập xong vẫn còn năng lượng → là đúng.
        </div>
      </div>
      <div class="hint-box" style="margin-top:16px;">Các nhóm thể lực khá hơn (đã tập quen, thể lực tốt) sẽ được chị Quỳnh bổ sung bài tập riêng sau.</div>
    `;
  }

  function html(){
    if(!ctx.profile) return `<div class="loading"><div class="spinner"></div></div>`;
    if(state.loading) return `<div class="loading"><div class="spinner"></div></div>`;
    // Không có Combo (sk_package_id) NHƯNG có sản phẩm lẻ được gán (sk_customer_products) vẫn hiện
    // trang bình thường (2026-09-05) — chỉ chặn hẳn khi KHÔNG có cả 2.
    if(!ctx.profile.sk_package_id && state.customerProducts.length===0){
      return `
        <div class="page-head"><h1>Lịch Trình Của Bạn</h1></div>
        <div class="hint-box">Bạn chưa được gán gói sản phẩm/chương trình nào — liên hệ để được kích hoạt đúng gói/sản phẩm bạn đã mua, lịch trình sẽ tự hiện ra ở đây.</div>
      `;
    }
    return `
      <div class="page-head">
        <h1>Lịch Trình Của Bạn</h1>
        <p>${state.packageName ? `Gói: <b>${esc(state.packageName)}</b> — giải pháp gồm 70% sản phẩm, 20% ăn uống, 10% tập luyện.` : 'Hướng dẫn sử dụng đúng các sản phẩm bạn đang dùng.'}</p>
      </div>
      <div class="chips" style="margin-bottom:20px;">
        <div class="chip ${state.tab==='sanpham'?'selected':''}" data-tab="sanpham">🧪 Sản Phẩm</div>
        <div class="chip ${state.tab==='anuong'?'selected':''}" data-tab="anuong">🥗 Ăn Uống</div>
        <div class="chip ${state.tab==='tapluyen'?'selected':''}" data-tab="tapluyen">🏃 Tập Luyện</div>
        <div class="chip ${state.tab==='tinhkhithan'?'selected':''}" data-tab="tinhkhithan">🕯️ Tinh · Khí · Thần</div>
      </div>
      ${state.tab==='sanpham' ? sanPhamTab() : state.tab==='anuong' ? anUongTab() : state.tab==='tinhkhithan' ? tinhKhiThanTab() : tapLuyenTab()}
    `;
  }

  function bind(){
    container.querySelectorAll('[data-tab]').forEach(el=>{
      el.onclick = ()=>{ state.tab = el.getAttribute('data-tab'); draw(); };
    });
    const packageReminderEl = container.querySelector('#lt-package-reminder');
    if(packageReminderEl) packageReminderEl.onchange = (e)=>savePackageReminderTime(e.target.value);
    container.querySelectorAll('[data-customer-product-reminder]').forEach(el=>{
      el.onchange = (e)=>saveCustomerProductReminderTime(el.getAttribute('data-customer-product-reminder'), e.target.value);
    });
    container.querySelectorAll('[data-toggle]').forEach(el=>{
      el.onclick = ()=>{
        const [id, doneFlag] = el.getAttribute('data-toggle').split('|');
        toggleDone(id, doneFlag==='1');
      };
    });
    const insightInput = container.querySelector('#tkt-insight-input');
    if(insightInput) insightInput.oninput = (e)=>{ state.insightText = e.target.value; };
    const insightSubmit = container.querySelector('#tkt-insight-submit');
    if(insightSubmit) insightSubmit.onclick = submitInsight;
    const calcWeightEl = container.querySelector('#calc-weight');
    // draw() thay toàn bộ innerHTML → input cũ bị huỷ, phải lưu vị trí con trỏ trước rồi khôi phục
    // trên node MỚI sau khi vẽ lại, không thì mất focus giữa chừng khi đang gõ (theo đúng bài học đã
    // gặp ở thu-vien-suc-khoe.js #tv-search).
    if(calcWeightEl) calcWeightEl.oninput = (e)=>{
      state.calcWeight = e.target.value;
      draw();
      const newEl = container.querySelector('#calc-weight');
      if(newEl) newEl.focus();
    };
    const calcGoalEl = container.querySelector('#calc-goal');
    if(calcGoalEl) calcGoalEl.onchange = (e)=>{ state.calcGoal = e.target.value; draw(); };
  }

  draw();
  load();
}

window.Modules = window.Modules || {};
window.Modules['lich-trinh'] = { title:'Lịch Trình Của Bạn', render };
})();
