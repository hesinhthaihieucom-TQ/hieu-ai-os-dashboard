// Sản Phẩm Số — màn "🛒 Sản phẩm của tôi": tạo/sửa/xoá sản phẩm, upload file, bật/tắt công khai.
(function () {
const DRAFT_KEY = 'san-pham-so';

function newForm() {
  return {
    id: null, title: '', description: '', price: '', cover_image_url: null,
    file_storage_path: null, file_name: null, external_link: null, published: false,
    dinh_dang: '', mini_course_lessons: [], webinar_datetime: '',
  };
}

// Nhãn/hướng dẫn cho ô "link ngoài" — KHÁC NHAU theo dinh_dang (2026-09-01, giao hàng đúng theo
// loại sản phẩm — trước đây chỉ có 1 ô "link ngoài" chung chung cho mọi loại).
const EXTERNAL_LINK_LABEL = {
  template_file_mau: { label: 'Link template', placeholder: 'https://canva.com/... hoặc notion.so/...' },
  coaching_1_1: { label: 'Link đặt lịch', placeholder: 'https://calendly.com/...' },
  cong_dong_tra_phi: { label: 'Link mời nhóm', placeholder: 'https://zalo.me/g/... hoặc t.me/...' },
  webinar: { label: 'Link Zoom/Meet', placeholder: 'https://zoom.us/j/... hoặc meet.google.com/...' },
};

// Domain công khai cuối cùng cho khách mua — KHÁC với domain app này đang chạy (app này là màn
// quản lý của người bán, không phải trang khách xem). Hard-code domain thật vì đây là link được
// COPY RA NGOÀI cho khách, không phải 1 lệnh gọi api nội bộ — không thể dùng path tương đối.
function publicLink(slug) {
  return `https://hesinhthaihieu.com/apptaosanphamso/p/?slug=${encodeURIComponent(slug)}`;
}

function render(container) {
  const state = { view: 'list', products: [], loading: true, saving: false, error: null, form: null, moTaLoading: false, captions: {} };

  function persistDraft() {
    if (state.view === 'edit' && state.form) saveDraft(DRAFT_KEY, state.form);
  }

  async function fetchList() {
    try {
      const data = await callApi('api/san-pham-so-product', { action: 'list' });
      return data.products || [];
    } catch (e) { state.error = e.message; return []; }
  }

  async function boot() {
    state.products = await fetchList();
    const draft = await loadDraft(DRAFT_KEY);
    if (draft) { state.view = 'edit'; state.form = draft; }
    state.loading = false;
    draw();
  }

  function draw() {
    container.innerHTML = bodyHtml();
    bind();
  }

  function bodyHtml() {
    if (state.loading) return `<div class="loading"><div class="spinner"></div></div>`;
    return state.view === 'edit' ? editHtml() : listHtml();
  }

  // Màn trống cho người dùng MỚI (chưa có sản phẩm nào) — thiết kế lại 2026-09-05 (Quỳnh: "demo giao
  // diện mục sản phẩm của tôi với ng dùng mới và tối ưu lại cho dễ hiểu"). Trước đó chỉ có 1 dòng hint
  // chung + nút "+ Tạo sản phẩm mới" + 1 dòng "Chưa có sản phẩm nào" — không nói rõ 2 lối vào khác
  // nhau: (1) đã có file/link sẵn sàng bán ngay, điền tay ngay ở đây; (2) chưa có nội dung gì, cần AI
  // giúp tạo từ đầu ở Giai đoạn 1 trước. Thêm link chéo sang Tìm Sản Phẩm Phù Hợp/Chọn Loại — khép kín
  // đúng vòng lặp đã có sẵn CHIỀU NGƯỢC LẠI ở tim-san-pham.js's wizardIntroHtml() ("File đã HOÀN
  // CHỈNH, sẵn sàng bán ngay? Vào thẳng Sản phẩm của tôi"). Cùng bố cục card-giữa-trang đã dùng ở màn
  // trống của viet-noi-dung.js, cho nhất quán trong cùng 1 app.
  function emptyStateHtml() {
    return `
      <div class="card" style="text-align:center;padding:36px 24px;">
        <h2 style="font-size:17px;margin-bottom:8px;">Chưa có sản phẩm nào</h2>
        <div style="font-size:13.5px;color:var(--ink-soft);margin-bottom:16px;">Đây là trang khách nhìn thấy để mua — quét mã VietQR chuyển khoản là khách tự động nhận link tải ngay, không cần bạn xác nhận tay, khách cũng không cần tạo tài khoản.</div>
        <button class="btn" id="sps-new-btn" style="display:inline-block;width:auto;padding:12px 24px;">+ Tạo sản phẩm mới</button>
        <div style="font-size:12.5px;color:var(--ink-soft);margin-top:18px;">Chưa có nội dung sẵn sàng để bán? Để AI giúp tạo từ đầu ở <a href="#tao-ai" style="color:var(--accent);">🧭 Tìm Sản Phẩm Phù Hợp</a> hoặc <a href="#chon-loai" style="color:var(--accent);">🗂️ Chọn Loại Sản Phẩm Số</a>.</div>
      </div>
    `;
  }

  function listHtml() {
    if (!state.products.length) {
      return `
        ${emptyStateHtml()}
        ${state.error ? `<div class="error-box" style="margin-top:12px;">${esc(state.error)}</div>` : ''}
      `;
    }
    return `
      <div class="hint-box">Tạo trang giới thiệu bán file tải về (ebook, checklist, template...) — khách không cần tài khoản, quét mã VietQR chuyển khoản là tự động nhận link tải, không cần bạn xác nhận tay.</div>
      <button class="btn" id="sps-new-btn">+ Tạo sản phẩm mới</button>
      ${state.error ? `<div class="error-box" style="margin-top:12px;">${esc(state.error)}</div>` : ''}
      <div style="margin-top:16px;display:flex;flex-direction:column;gap:12px;">
        ${state.products.map(p => `
          <div class="card" style="margin-bottom:0;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
              <div>
                <b>${esc(p.title)}</b>
                <span style="margin-left:8px;font-size:12px;padding:2px 8px;border-radius:4px;background:${p.status === 'published' ? 'var(--accent-soft)' : '#EEE'};color:${p.status === 'published' ? 'var(--accent)' : '#888'};">${p.status === 'published' ? 'Đã đăng' : 'Nháp'}</span>
                <div style="color:var(--ink-soft);font-size:13.5px;margin-top:4px;">${(p.price || 0).toLocaleString('vi-VN')}đ</div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <span class="btn-ghost btn btn-sm" data-edit="${p.id}">Sửa</span>
                <span class="btn-ghost btn btn-sm" data-delete="${p.id}" style="color:var(--danger);">Xoá</span>
              </div>
            </div>
            ${p.status === 'published' ? `
              <div style="margin-top:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <span class="mono" style="font-size:12.5px;background:var(--accent-soft);padding:3px 8px;border-radius:6px;word-break:break-all;">${esc(publicLink(p.slug))}</span>
                <span class="btn-ghost btn btn-sm" data-copy-link="${esc(publicLink(p.slug))}">Copy link</span>
              </div>
              <div style="margin-top:8px;">
                <span class="btn-ghost btn btn-sm" data-caption-btn="${p.id}" ${(state.captions[p.id] && state.captions[p.id].loading) ? 'style="opacity:.5;pointer-events:none;"' : ''}>${(state.captions[p.id] && state.captions[p.id].loading) ? 'Đang viết…' : '📣 Viết caption quảng cáo (1 lượt)'}</span>
              </div>
              ${state.captions[p.id] && state.captions[p.id].text ? `
                <div class="hint-box" style="margin-top:8px;white-space:pre-line;">${esc(state.captions[p.id].text)}
                  <div class="btn-row" style="margin-top:8px;"><span class="btn-ghost btn btn-sm" data-copy-caption="${p.id}">Copy caption</span></div>
                </div>
              ` : ''}
              ${state.captions[p.id] && state.captions[p.id].error ? `<div class="error-box" style="margin-top:8px;">${esc(state.captions[p.id].error)}</div>` : ''}
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  // Nội dung giao hàng — KHÁC NHAU theo dinh_dang (2026-09-01). Chưa chọn loại (sản phẩm cũ trước
  // khi có tính năng này) mặc định về hành vi cũ (file HOẶC link chung chung).
  function deliverableFieldsHtml(f) {
    const dd = f.dinh_dang;
    if (dd === 'mini_course') {
      return `
        <label style="margin-top:14px;">Danh sách bài học</label>
        <div id="sps-lessons-list">
          ${(f.mini_course_lessons || []).map((l, i) => `
            <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">
              <input type="text" data-lesson-title="${i}" value="${esc(l.title || '')}" placeholder="Tên bài học" style="flex:1;">
              <input type="text" data-lesson-link="${i}" value="${esc(l.link || '')}" placeholder="Link video/Zoom/file" style="flex:1;">
              <span class="btn-ghost btn btn-sm" data-lesson-remove="${i}" style="color:var(--danger);white-space:nowrap;">Xoá</span>
            </div>
          `).join('')}
        </div>
        <span class="btn-ghost btn btn-sm" id="sps-lesson-add">+ Thêm bài học</span>
      `;
    }
    if (EXTERNAL_LINK_LABEL[dd]) {
      const info = EXTERNAL_LINK_LABEL[dd];
      return `
        <label style="margin-top:14px;">${esc(info.label)}</label>
        <input id="sps-external-link" type="text" value="${esc(f.external_link || '')}" placeholder="${esc(info.placeholder)}">
        ${dd === 'webinar' ? `
          <label style="margin-top:14px;">Ngày giờ diễn ra</label>
          <input id="sps-webinar-datetime" type="datetime-local" value="${esc(f.webinar_datetime || '')}">
        ` : ''}
      `;
    }
    return `
      <label style="margin-top:14px;">File sản phẩm (bắt buộc để đăng công khai, trừ khi đã có link ngoài bên dưới)</label>
      <input id="sps-file" type="file">
      <div id="sps-file-status" style="font-size:13px;color:var(--ink-soft);margin-top:4px;">${f.file_name ? `📎 ${esc(f.file_name)} — đã upload` : 'Chưa có file.'}</div>
      <label style="margin-top:14px;">Hoặc link ngoài (sách lật Heyzine, Notion, Canva...)</label>
      <input id="sps-external-link" type="text" value="${esc(f.external_link || '')}" placeholder="https://heyzine.com/flip-book/...">
    `;
  }

  function editHtml() {
    const f = state.form;
    return `
      <h2>${f.id ? 'Sửa sản phẩm' : 'Tạo sản phẩm mới'}</h2>
      <div class="card" style="max-width:520px;">
        <label>Tên sản phẩm</label>
        <input id="sps-title" type="text" value="${esc(f.title)}" placeholder="VD: Ebook 30 ngày quản lý chi tiêu">
        <label style="margin-top:14px;">Loại sản phẩm (tuỳ chọn — không chọn vẫn dùng được, mặc định coi như file/link tải về)</label>
        <div class="chips">
          ${DINH_DANG_OPTIONS.map(o => `<div class="chip ${f.dinh_dang === o.value ? 'selected' : ''}" data-sps-dinhdang="${esc(o.value)}">${esc(o.label)}</div>`).join('')}
        </div>
        <label style="margin-top:14px;">Mô tả (hiện trên trang giới thiệu)</label>
        <textarea id="sps-desc" rows="4" placeholder="Giới thiệu ngắn gọn nội dung, lợi ích cho người mua...">${esc(f.description || '')}</textarea>
        <div class="btn-row" style="margin-top:6px;">
          <span class="btn-ghost btn btn-sm" id="sps-ai-mo-ta-btn" ${(state.moTaLoading || !f.title.trim()) ? 'style="opacity:.5;pointer-events:none;"' : ''}>${state.moTaLoading ? 'Đang viết…' : '✨ Viết mô tả bằng AI (1 lượt)'}</span>
        </div>
        <label>Giá bán (đ)</label>
        <input id="sps-price" type="number" min="1000" step="1000" value="${esc(f.price)}" placeholder="VD: 99000">
        <div class="hint-box" style="margin-top:6px;">💡 Gợi ý khoảng giá tham khảo: Checklist/Workbook 49.000-149.000đ · Ebook 99.000-299.000đ · Mini-course 299.000-990.000đ · Template/File mẫu 49.000-199.000đ</div>
        <label>Ảnh bìa (tuỳ chọn)</label>
        <input id="sps-cover" type="file" accept="image/*">
        ${f.cover_image_url ? `<img src="${f.cover_image_url}" style="max-width:160px;border-radius:8px;margin-top:8px;display:block;">` : ''}
        ${deliverableFieldsHtml(f)}
        <label style="display:flex;align-items:center;gap:8px;margin-top:16px;cursor:pointer;font-size:13.5px;">
          <input id="sps-published" type="checkbox" ${f.published ? 'checked' : ''}> Công khai (cho khách mua ngay)
        </label>
        ${state.error ? `<div class="error-box" style="margin-top:10px;">${esc(state.error)}</div>` : ''}
        <div class="btn-row">
          <button class="btn" id="sps-save-btn" ${state.saving ? 'disabled' : ''}>${state.saving ? 'Đang lưu…' : 'Lưu'}</button>
          <span class="btn-ghost btn" id="sps-back-btn">Quay lại danh sách</span>
        </div>
      </div>
    `;
  }

  function bind() {
    if (state.view === 'list') {
      const newBtn = container.querySelector('#sps-new-btn');
      if (newBtn) newBtn.onclick = () => { state.form = newForm(); state.error = null; state.view = 'edit'; draw(); persistDraft(); };

      container.querySelectorAll('[data-edit]').forEach(el => {
        el.onclick = () => {
          const p = state.products.find(x => x.id === el.getAttribute('data-edit'));
          if (!p) return;
          state.form = {
            id: p.id, title: p.title, description: p.description || '', price: p.price, cover_image_url: p.cover_image_url || null,
            file_storage_path: p.file_storage_path || null, file_name: p.file_name || null, external_link: p.external_link || null, published: p.status === 'published',
            dinh_dang: p.dinh_dang || '', mini_course_lessons: Array.isArray(p.mini_course_lessons) ? p.mini_course_lessons : [], webinar_datetime: p.webinar_datetime ? p.webinar_datetime.slice(0, 16) : '',
          };
          state.error = null; state.view = 'edit'; draw(); persistDraft();
        };
      });

      container.querySelectorAll('[data-delete]').forEach(el => {
        el.onclick = async () => {
          if (!confirm('Xoá sản phẩm này? Không thể hoàn tác, khách đã mua vẫn giữ được link tải cũ.')) return;
          try {
            await callApi('api/san-pham-so-product', { action: 'delete', id: el.getAttribute('data-delete') });
            state.products = await fetchList();
            draw();
          } catch (e) { state.error = e.message; draw(); }
        };
      });

      container.querySelectorAll('[data-copy-link]').forEach(el => {
        el.onclick = async () => {
          try {
            await navigator.clipboard.writeText(el.getAttribute('data-copy-link'));
            const old = el.textContent;
            el.textContent = 'Đã copy ✓';
            setTimeout(() => { el.textContent = old; }, 1500);
          } catch (e) {}
        };
      });

      container.querySelectorAll('[data-caption-btn]').forEach(el => {
        el.onclick = async () => {
          const id = el.getAttribute('data-caption-btn');
          const p = state.products.find(x => x.id === id);
          if (!p) return;
          state.captions[id] = { loading: true, text: null, error: null };
          draw();
          const stopProgress = animateProgressButton(container.querySelector(`[data-caption-btn="${id}"]`), 12, 'Đang viết');
          try {
            const data = await callApi('api/san-pham-so-viet-caption', { title: p.title, description: p.description || '' }, 150000);
            state.captions[id] = { loading: false, text: data.caption, error: null };
          } catch (e) {
            state.captions[id] = { loading: false, text: null, error: e.message };
          }
          stopProgress();
          draw();
        };
      });

      container.querySelectorAll('[data-copy-caption]').forEach(el => {
        el.onclick = async () => {
          const id = el.getAttribute('data-copy-caption');
          const c = state.captions[id];
          if (!c || !c.text) return;
          try {
            await navigator.clipboard.writeText(c.text);
            const old = el.textContent;
            el.textContent = 'Đã copy ✓';
            setTimeout(() => { el.textContent = old; }, 1500);
          } catch (e) {}
        };
      });
      return;
    }

    // view === 'edit'
    const titleEl = container.querySelector('#sps-title');
    titleEl.oninput = () => { state.form.title = titleEl.value; persistDraft(); };
    const descEl = container.querySelector('#sps-desc');
    descEl.oninput = () => { state.form.description = descEl.value; persistDraft(); };
    const priceEl = container.querySelector('#sps-price');
    priceEl.oninput = () => { state.form.price = priceEl.value; persistDraft(); };
    const publishedEl = container.querySelector('#sps-published');
    publishedEl.onchange = () => { state.form.published = publishedEl.checked; persistDraft(); };

    container.querySelectorAll('[data-sps-dinhdang]').forEach(el => {
      el.onclick = () => {
        const v = el.getAttribute('data-sps-dinhdang');
        state.form.dinh_dang = (state.form.dinh_dang === v) ? '' : v;
        persistDraft(); draw();
      };
    });

    // #sps-external-link/#sps-file chỉ tồn tại tuỳ dinh_dang đang chọn (xem deliverableFieldsHtml).
    const externalLinkEl = container.querySelector('#sps-external-link');
    if (externalLinkEl) externalLinkEl.oninput = () => { state.form.external_link = externalLinkEl.value; persistDraft(); };
    const webinarDatetimeEl = container.querySelector('#sps-webinar-datetime');
    if (webinarDatetimeEl) webinarDatetimeEl.oninput = () => { state.form.webinar_datetime = webinarDatetimeEl.value; persistDraft(); };

    // Danh sách bài học (mini_course) — thêm/xoá/sửa từng dòng, không cần API riêng, lưu cùng lúc
    // bấm "Lưu" như mọi field khác của form.
    const lessonAddBtn = container.querySelector('#sps-lesson-add');
    if (lessonAddBtn) lessonAddBtn.onclick = () => {
      state.form.mini_course_lessons = [...(state.form.mini_course_lessons || []), { title: '', link: '' }];
      persistDraft(); draw();
    };
    container.querySelectorAll('[data-lesson-title]').forEach(el => {
      el.oninput = () => { state.form.mini_course_lessons[Number(el.getAttribute('data-lesson-title'))].title = el.value; persistDraft(); };
    });
    container.querySelectorAll('[data-lesson-link]').forEach(el => {
      el.oninput = () => { state.form.mini_course_lessons[Number(el.getAttribute('data-lesson-link'))].link = el.value; persistDraft(); };
    });
    container.querySelectorAll('[data-lesson-remove]').forEach(el => {
      el.onclick = () => {
        state.form.mini_course_lessons.splice(Number(el.getAttribute('data-lesson-remove')), 1);
        persistDraft(); draw();
      };
    });

    const aiMoTaBtn = container.querySelector('#sps-ai-mo-ta-btn');
    if (aiMoTaBtn) aiMoTaBtn.onclick = async () => {
      if (!state.form.title.trim()) { state.error = 'Vui lòng nhập tên sản phẩm trước.'; draw(); return; }
      state.moTaLoading = true; state.error = null; draw();
      const stopProgress = animateProgressButton(container.querySelector('#sps-ai-mo-ta-btn'), 12, 'Đang viết');
      try {
        const data = await callApi('api/san-pham-so-viet-mo-ta', { title: state.form.title, description_hien_tai: state.form.description || '' }, 150000);
        state.form.description = data.mo_ta;
        persistDraft();
      } catch (e) {
        state.error = e.message;
      }
      stopProgress();
      state.moTaLoading = false;
      draw();
    };

    const coverEl = container.querySelector('#sps-cover');
    coverEl.onchange = () => {
      const file = coverEl.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { state.form.cover_image_url = reader.result; persistDraft(); draw(); };
      reader.readAsDataURL(file);
    };

    const fileEl = container.querySelector('#sps-file');
    if (fileEl) fileEl.onchange = async () => {
      const file = fileEl.files[0];
      if (!file) return;
      if (!state.form.title.trim()) { state.error = 'Vui lòng nhập tên sản phẩm trước khi upload file.'; draw(); return; }
      const statusEl = container.querySelector('#sps-file-status');
      try {
        state.error = null;
        if (statusEl) statusEl.textContent = 'Đang chuẩn bị…';
        if (!state.form.id) {
          const saved = await callApi('api/san-pham-so-product', {
            action: 'save', title: state.form.title, description: state.form.description,
            price: Number(state.form.price) || 0, cover_image_url: state.form.cover_image_url,
          });
          state.form.id = saved.product.id;
        }
        if (statusEl) statusEl.textContent = 'Đang tạo link upload…';
        const { uploadUrl, path } = await callApi('api/san-pham-so-upload-url', { product_id: state.form.id, file_name: file.name });
        if (statusEl) statusEl.textContent = `Đang tải lên ${file.name}…`;
        const putResp = await fetch(uploadUrl, { method: 'PUT', headers: { 'content-type': file.type || 'application/octet-stream' }, body: file });
        if (!putResp.ok) throw new Error('Upload file thất bại — thử lại giúp mình.');
        state.form.file_storage_path = path;
        state.form.file_name = file.name;
        await callApi('api/san-pham-so-product', {
          action: 'save', id: state.form.id, title: state.form.title, description: state.form.description,
          price: Number(state.form.price) || 0, file_storage_path: path, file_name: file.name,
        });
        if (statusEl) statusEl.textContent = `📎 ${file.name} — đã upload ✓`;
        persistDraft();
      } catch (e) {
        state.error = e.message;
        draw();
      }
    };

    container.querySelector('#sps-back-btn').onclick = async () => {
      state.view = 'list';
      state.error = null;
      await clearDraft(DRAFT_KEY);
      draw();
    };

    container.querySelector('#sps-save-btn').onclick = async () => {
      const priceNum = Number(state.form.price);
      if (!state.form.title.trim()) { state.error = 'Vui lòng nhập tên sản phẩm.'; draw(); return; }
      if (!priceNum || priceNum <= 0) { state.error = 'Giá sản phẩm phải lớn hơn 0.'; draw(); return; }
      // Đủ nội dung giao hàng để công khai — KHÁC theo dinh_dang (mini_course cần ít nhất 1 bài học
      // có link, các loại còn lại cần file HOẶC link — xem lại đúng quy tắc này ở api/san-pham-so-product.js).
      const hasLessons = state.form.dinh_dang === 'mini_course' && (state.form.mini_course_lessons || []).some(l => l && l.link && l.link.trim());
      const hasGenericDeliverable = !!state.form.file_storage_path || !!state.form.external_link;
      if (state.form.published && (state.form.dinh_dang === 'mini_course' ? !hasLessons : !hasGenericDeliverable)) {
        state.error = state.form.dinh_dang === 'mini_course' ? 'Cần ít nhất 1 bài học có link trước khi đăng công khai.' : 'Cần upload file hoặc dán link ngoài trước khi đăng công khai.';
        draw(); return;
      }
      state.saving = true; state.error = null; draw();
      try {
        const data = await callApi('api/san-pham-so-product', {
          action: 'save', id: state.form.id, title: state.form.title, description: state.form.description,
          price: priceNum, cover_image_url: state.form.cover_image_url,
          file_storage_path: state.form.file_storage_path, file_name: state.form.file_name,
          external_link: state.form.external_link,
          dinh_dang: state.form.dinh_dang || null,
          mini_course_lessons: (state.form.mini_course_lessons || []).filter(l => l && ((l.title || '').trim() || (l.link || '').trim())),
          webinar_datetime: state.form.webinar_datetime ? new Date(state.form.webinar_datetime).toISOString() : null,
          status: state.form.published ? 'published' : 'draft',
        });
        state.form.id = data.product.id;
        state.saving = false;
        await clearDraft(DRAFT_KEY);
        state.view = 'list';
        state.products = await fetchList();
        draw();
      } catch (e) {
        state.saving = false;
        state.error = e.message;
        draw();
      }
    };
  }

  boot();
}

window.SanPhamSoScreens = window.SanPhamSoScreens || {};
window.SanPhamSoScreens['san-pham'] = render;
})();
