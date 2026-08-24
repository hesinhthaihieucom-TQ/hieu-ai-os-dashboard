// Sản Phẩm Số — app ĐỘC LẬP, KHÔNG nằm trong sidebar Xây Nhân Hiệu (dù dùng chung Supabase, cùng
// email/mật khẩu đăng nhập được ở cả 2 nơi). Sau này lên domain thật sẽ là
// hesinhthaihieu.com/apptaosanphamso (qua Cloudflare Worker, giống cách nhan-hieu/ đang lên
// hesinhthaihieu.com/webxaynhanhieu — xem CLAUDE.md) — KHÔNG được hard-code path tuyệt đối
// bắt đầu bằng "/san-pham-so" ở đây, mọi lệnh gọi api phải dùng đường dẫn TƯƠNG ĐỐI để tự khớp
// đúng theo bất kỳ tiền tố nào trang đang được phục vụ dưới đó (giống lý do callApi() ở
// nhan-hieu/js/util.js dùng path tương đối).

const SUPABASE_URL = 'https://ltcjlnvceuspnwldsbgi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_j0ohsTIc7Df5_dz5vDiniA_nB5jPYWy';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

const app = document.getElementById('app');
const DRAFT_KEY = 'san-pham-so';
let currentUser = null;

async function callApi(path, body) {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const token = sessionData && sessionData.session ? sessionData.session.access_token : null;
  const resp = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || 'Có lỗi xảy ra.');
  return data;
}

async function loadDraft() {
  try {
    const { data } = await supabaseClient.from('module_drafts').select('data').eq('user_id', currentUser.id).eq('module_key', DRAFT_KEY).maybeSingle();
    return data ? data.data : null;
  } catch (e) { return null; }
}
async function saveDraft(d) {
  try { await supabaseClient.from('module_drafts').upsert({ user_id: currentUser.id, module_key: DRAFT_KEY, data: d, updated_at: new Date().toISOString() }, { onConflict: 'user_id,module_key' }); } catch (e) {}
}
async function clearDraft() {
  try { await supabaseClient.from('module_drafts').delete().eq('user_id', currentUser.id).eq('module_key', DRAFT_KEY); } catch (e) {}
}

function newForm() {
  return { id: null, title: '', description: '', price: '', cover_image_url: null, file_storage_path: null, file_name: null, published: false };
}

// Domain công khai cuối cùng cho khách mua — KHÁC với domain app này đang chạy (app này là màn
// quản lý của người bán, không phải trang khách xem). Hard-code domain thật vì đây là link được
// COPY RA NGOÀI cho khách, không phải 1 lệnh gọi api nội bộ — không thể dùng path tương đối.
function publicLink(slug) {
  return `https://hesinhthaihieu.com/apptaosanphamso/p/?slug=${encodeURIComponent(slug)}`;
}

function topbarHtml(profile) {
  return `
    <div class="topbar">
      <h1>🛒 Sản Phẩm Số</h1>
      <span class="signout" id="signout-btn">${esc((profile && profile.full_name) || '')} — Đăng xuất</span>
    </div>
  `;
}
function bindTopbar() {
  const btn = document.getElementById('signout-btn');
  if (btn) btn.onclick = async () => { await supabaseClient.auth.signOut(); };
}

function renderLogin(err) {
  app.innerHTML = `
    <div class="wrap" style="max-width:400px;">
      <h1 style="text-align:center;">Sản Phẩm Số</h1>
      <div class="card">
        <label>Email</label>
        <input id="login-email" type="email" placeholder="ban@email.com">
        <label>Mật khẩu</label>
        <input id="login-pass" type="password" placeholder="Mật khẩu">
        <div class="btn-row" style="justify-content:center;">
          <button class="btn btn-full" id="login-btn">Đăng nhập</button>
        </div>
        ${err ? `<div class="error-box">${esc(err)}</div>` : ''}
        <div class="hint-box">Dùng đúng email/mật khẩu tài khoản Xây Nhân Hiệu — không cần tạo tài khoản mới ở đây.</div>
      </div>
    </div>
  `;
  const passEl = document.getElementById('login-pass');
  passEl.onkeydown = (e) => { if (e.key === 'Enter') document.getElementById('login-btn').click(); };
  document.getElementById('login-btn').onclick = async () => {
    const email = document.getElementById('login-email').value.trim();
    const pass = passEl.value;
    const btn = document.getElementById('login-btn');
    btn.disabled = true; btn.textContent = 'Đang đăng nhập…';
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
    if (error) { renderLogin(error.message); return; }
    boot();
  };
}

function renderNotEnabled(profile) {
  app.innerHTML = `
    <div class="wrap" style="max-width:460px;">
      ${topbarHtml(profile)}
      <div class="card">Tài khoản của bạn chưa được bật tính năng bán Sản Phẩm Số. Liên hệ để được hỗ trợ.</div>
    </div>
  `;
  bindTopbar();
}

async function renderDashboard(profile) {
  const state = { view: 'list', products: [], loading: true, saving: false, error: null, form: null };

  function persistDraft() {
    if (state.view === 'edit' && state.form) saveDraft(state.form);
  }

  async function fetchList() {
    try {
      const data = await callApi('api/san-pham-so-product', { action: 'list' });
      return data.products || [];
    } catch (e) { state.error = e.message; return []; }
  }

  async function boot() {
    state.products = await fetchList();
    const draft = await loadDraft();
    if (draft) { state.view = 'edit'; state.form = draft; }
    state.loading = false;
    draw();
  }

  function draw() {
    document.getElementById('sps-body').innerHTML = bodyHtml();
    bind();
  }

  function bodyHtml() {
    if (state.loading) return `<div class="loading"><div class="spinner"></div></div>`;
    return state.view === 'edit' ? editHtml() : listHtml();
  }

  function listHtml() {
    return `
      <div class="hint-box">Tạo trang giới thiệu bán file tải về (ebook, checklist, template...) — khách không cần tài khoản, quét mã VietQR chuyển khoản là tự động nhận link tải, không cần bạn xác nhận tay.</div>
      <button class="btn" id="sps-new-btn">+ Tạo sản phẩm mới</button>
      ${state.error ? `<div class="error-box" style="margin-top:12px;">${esc(state.error)}</div>` : ''}
      <div style="margin-top:16px;display:flex;flex-direction:column;gap:12px;">
        ${state.products.length === 0 ? `<div class="card">Chưa có sản phẩm nào.</div>` : state.products.map(p => `
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
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  function editHtml() {
    const f = state.form;
    return `
      <h2>${f.id ? 'Sửa sản phẩm' : 'Tạo sản phẩm mới'}</h2>
      <div class="card" style="max-width:520px;">
        <label>Tên sản phẩm</label>
        <input id="sps-title" type="text" value="${esc(f.title)}" placeholder="VD: Ebook 30 ngày quản lý chi tiêu">
        <label>Mô tả (hiện trên trang giới thiệu)</label>
        <textarea id="sps-desc" rows="4" placeholder="Giới thiệu ngắn gọn nội dung, lợi ích cho người mua...">${esc(f.description || '')}</textarea>
        <label>Giá bán (đ)</label>
        <input id="sps-price" type="number" min="1000" step="1000" value="${esc(f.price)}" placeholder="VD: 99000">
        <label>Ảnh bìa (tuỳ chọn)</label>
        <input id="sps-cover" type="file" accept="image/*">
        ${f.cover_image_url ? `<img src="${f.cover_image_url}" style="max-width:160px;border-radius:8px;margin-top:8px;display:block;">` : ''}
        <label>File sản phẩm (bắt buộc để đăng công khai)</label>
        <input id="sps-file" type="file">
        <div id="sps-file-status" style="font-size:13px;color:var(--ink-soft);margin-top:4px;">${f.file_name ? `📎 ${esc(f.file_name)} — đã upload` : 'Chưa có file.'}</div>
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
      const newBtn = document.getElementById('sps-new-btn');
      if (newBtn) newBtn.onclick = () => { state.form = newForm(); state.error = null; state.view = 'edit'; draw(); persistDraft(); };

      document.querySelectorAll('[data-edit]').forEach(el => {
        el.onclick = () => {
          const p = state.products.find(x => x.id === el.getAttribute('data-edit'));
          if (!p) return;
          state.form = { id: p.id, title: p.title, description: p.description || '', price: p.price, cover_image_url: p.cover_image_url || null, file_storage_path: p.file_storage_path || null, file_name: p.file_name || null, published: p.status === 'published' };
          state.error = null; state.view = 'edit'; draw(); persistDraft();
        };
      });

      document.querySelectorAll('[data-delete]').forEach(el => {
        el.onclick = async () => {
          if (!confirm('Xoá sản phẩm này? Không thể hoàn tác, khách đã mua vẫn giữ được link tải cũ.')) return;
          try {
            await callApi('api/san-pham-so-product', { action: 'delete', id: el.getAttribute('data-delete') });
            state.products = await fetchList();
            draw();
          } catch (e) { state.error = e.message; draw(); }
        };
      });

      document.querySelectorAll('[data-copy-link]').forEach(el => {
        el.onclick = async () => {
          try {
            await navigator.clipboard.writeText(el.getAttribute('data-copy-link'));
            const old = el.textContent;
            el.textContent = 'Đã copy ✓';
            setTimeout(() => { el.textContent = old; }, 1500);
          } catch (e) {}
        };
      });
      return;
    }

    // view === 'edit'
    const titleEl = document.getElementById('sps-title');
    titleEl.oninput = () => { state.form.title = titleEl.value; persistDraft(); };
    const descEl = document.getElementById('sps-desc');
    descEl.oninput = () => { state.form.description = descEl.value; persistDraft(); };
    const priceEl = document.getElementById('sps-price');
    priceEl.oninput = () => { state.form.price = priceEl.value; persistDraft(); };
    const publishedEl = document.getElementById('sps-published');
    publishedEl.onchange = () => { state.form.published = publishedEl.checked; persistDraft(); };

    const coverEl = document.getElementById('sps-cover');
    coverEl.onchange = () => {
      const file = coverEl.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { state.form.cover_image_url = reader.result; persistDraft(); draw(); };
      reader.readAsDataURL(file);
    };

    const fileEl = document.getElementById('sps-file');
    fileEl.onchange = async () => {
      const file = fileEl.files[0];
      if (!file) return;
      if (!state.form.title.trim()) { state.error = 'Vui lòng nhập tên sản phẩm trước khi upload file.'; draw(); return; }
      const statusEl = document.getElementById('sps-file-status');
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

    document.getElementById('sps-back-btn').onclick = async () => {
      state.view = 'list';
      state.error = null;
      await clearDraft();
      draw();
    };

    document.getElementById('sps-save-btn').onclick = async () => {
      const priceNum = Number(state.form.price);
      if (!state.form.title.trim()) { state.error = 'Vui lòng nhập tên sản phẩm.'; draw(); return; }
      if (!priceNum || priceNum <= 0) { state.error = 'Giá sản phẩm phải lớn hơn 0.'; draw(); return; }
      if (state.form.published && !state.form.file_storage_path) { state.error = 'Cần upload file trước khi đăng công khai.'; draw(); return; }
      state.saving = true; state.error = null; draw();
      try {
        const data = await callApi('api/san-pham-so-product', {
          action: 'save', id: state.form.id, title: state.form.title, description: state.form.description,
          price: priceNum, cover_image_url: state.form.cover_image_url,
          file_storage_path: state.form.file_storage_path, file_name: state.form.file_name,
          status: state.form.published ? 'published' : 'draft',
        });
        state.form.id = data.product.id;
        state.saving = false;
        await clearDraft();
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

  app.innerHTML = `<div class="wrap">${topbarHtml(profile)}<div id="sps-body"></div></div>`;
  bindTopbar();
  await boot();
}

async function boot() {
  app.innerHTML = `<div class="wrap"><div class="loading">Đang tải…</div></div>`;
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) { renderLogin(); return; }
  currentUser = data.session.user;
  const { data: profile } = await supabaseClient.from('profiles').select('id,full_name,can_sell_products').eq('id', currentUser.id).maybeSingle();
  if (!profile || !profile.can_sell_products) { renderNotEnabled(profile); return; }
  renderDashboard(profile);
}

supabaseClient.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') { currentUser = null; renderLogin(); }
});

boot();
