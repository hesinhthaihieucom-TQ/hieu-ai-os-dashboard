(function(){
// Kho hình — ảnh/clip riêng của khách. Máy dựng tìm B-roll ở đây TRƯỚC khi dùng ảnh AI (ưu tiên tư
// liệu thật, quy tắc dựng số 13). Hiện chỉ tải lên/xem/xoá; gắn nhãn tự động bằng AI vision làm sau.
// Xoá chỉ xoá dòng dv_assets: file trong Storage vẫn còn (chưa có API xoá file) — dọn bằng việc định kỳ sau.
const MAX_BYTES = 500 * 1024 * 1024;
window.Modules = window.Modules || {};
window.Modules['kho-hinh'] = {
  title: 'Kho hình',
  async render(container, ctx){
    const state = { assets:[], urls:{}, busy:false, msg:null, optOpen:false };
    async function load(){
      const { data } = await ctx.supabase.from('dv_assets').select('*').eq('user_id', ctx.user.id).order('created_at', { ascending:false }).limit(120);
      state.assets = data || [];
      // Chỉ lấy link xem cho ảnh (clip hiện biểu tượng) và tối đa 60 ảnh gần nhất cho nhẹ.
      const imgs = state.assets.filter(a=>a.kind==='image' && !state.urls[a.id]).slice(0,60);
      await Promise.all(imgs.map(async a=>{ try{ state.urls[a.id] = await getFileUrl(a.path); }catch(e){} }));
    }
    function draw(){
      container.innerHTML = `
        <div class="page-head"><h1>Kho hình</h1><p>Ảnh và clip của bạn. Máy dựng ưu tiên lấy hình minh hoạ từ đây, thiếu mới dùng ảnh AI.</p></div>
        <div class="card" style="margin-bottom:16px;">
          <input type="file" id="f" accept="image/*,video/*" multiple style="display:none">
          <button class="btn" id="pick" ${state.busy?'disabled':''}>${state.busy?'Đang tải lên…':'+ Thêm ảnh, clip'}</button>
          ${state.msg?`<div class="hint-box">${esc(state.msg)}</div>`:''}
        </div>
        ${state.assets.length ? `<div class="asset-grid">${state.assets.map(a=>`
          <div class="asset" data-id="${a.id}">${a.kind==='image' && state.urls[a.id] ? `<img src="${esc(state.urls[a.id])}" alt="" loading="lazy">` : (a.kind==='video'?'🎬':'🖼️')}
            <div class="nm">${esc(a.name||'')}</div></div>`).join('')}</div>
          <div style="margin-top:18px;"><span class="more-toggle" id="opt">${state.optOpen?'▴':'▾'} Tuỳ chọn</span>
            ${state.optOpen?`<div style="margin-top:10px;font-size:15px;color:var(--ink-soft);">Bấm vào một ảnh/clip để xoá nó khỏi kho.</div>`:''}</div>`
          : `<div class="card" style="color:var(--ink-soft);">Kho đang trống.</div>`}`;
      const f = container.querySelector('#f');
      container.querySelector('#pick').onclick = ()=>f.click();
      f.onchange = ()=>upload([...f.files]);
      const opt = container.querySelector('#opt'); if(opt) opt.onclick = ()=>{ state.optOpen = !state.optOpen; draw(); };
      container.querySelectorAll('.asset').forEach(el=>{ el.onclick = async ()=>{
        if(!state.optOpen) return;
        if(!await confirmModal('Xoá hình này khỏi kho?', 'Xoá')) return;
        await ctx.supabase.from('dv_assets').delete().eq('id', el.getAttribute('data-id')); await load(); draw();
      }; });
    }
    async function upload(files){
      if(!files.length) return;
      state.busy = true; state.msg = null; draw();
      let ok = 0, skipped = 0;
      for(const file of files){
        const kind = /^image\//.test(file.type) ? 'image' : /^video\//.test(file.type) ? 'video' : null;
        if(!kind || file.size > MAX_BYTES){ skipped++; continue; }
        try{
          const { uploadUrl, path } = await callApi('api/dung-video-upload-url', { purpose:'asset', file_name:file.name });
          await uploadWithProgress(uploadUrl, file);
          const { error } = await ctx.supabase.from('dv_assets').insert({ user_id:ctx.user.id, kind, path, name:file.name });
          if(error) throw error; ok++;
        } catch(e){ skipped++; }
      }
      state.busy = false;
      state.msg = `Đã thêm ${ok} tệp${skipped?`, bỏ qua ${skipped} tệp (sai loại, quá 500 MB hoặc lỗi tải)`:''}.`;
      await load(); draw();
    }
    container.innerHTML = `<div class="loading"><div class="spinner"></div><p>Đang tải…</p></div>`;
    await load(); draw();
  },
};
})();
