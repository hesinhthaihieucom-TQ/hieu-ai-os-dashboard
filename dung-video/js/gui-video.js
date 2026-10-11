(function(){
// Gửi video — bước 1 chọn kiểu gửi (6 kiểu như Calita Cut), bước 2 chọn file + tải lên. MỚI bật kiểu
// "Một video mình nói" (pipeline hiện tại chỉ có kiểu này); các kiểu còn lại hiện "Sắp có" thay vì
// giấu đi, để khách biết app sẽ có và không hỏi "sao thiếu".
// Trình tự quan trọng: xin link upload TRƯỚC → tạo dòng dv_jobs (kèm source_path) → tải file lên →
// dv_queue_job. Khách không .update() được dv_jobs (chỉ RPC), nên source_path phải có ngay lúc insert.
// Tải lỗi thì xoá dòng việc vừa tạo, không để việc "ma" treo ở trạng thái uploading.
const KINDS = [
  { key:'video_noi', ic:'🎙️', title:'Một video mình nói', desc:'Quay điện thoại, nói vào máy. Máy cắt thừa, chèn chữ, chèn hình từ kho, làm bìa, viết caption.', on:true },
  { key:'video_noi_tu_lieu', ic:'🗂️', title:'Video nói + ảnh, clip, nhạc của mình', desc:'1 video bạn nói + ảnh, clip muốn chèn, có thể kèm 1 bài nhạc nền.', on:false },
  { key:'giong_doc_kho', ic:'🎧', title:'Chỉ giọng đọc, máy tự lấy cảnh từ kho', desc:'1 file ghi âm giọng đọc (không quay mặt). Máy tự lấy ảnh, clip trong Kho hình ghép thành video.', on:false },
  { key:'giong_doc_tu_lieu', ic:'📼', title:'Giọng đọc + ảnh, clip của mình', desc:'1 file ghi âm + ảnh, clip bạn quay. Máy lồng giọng lên đúng các ảnh, clip đó.', on:false },
  { key:'anh_nhac', ic:'🖼️', title:'Ảnh + nhạc, không giọng', desc:'Từ 5 ảnh + 1 bài nhạc. Máy cắt ảnh đúng nhịp nhạc, có hiệu ứng chuyển cảnh.', on:false },
];
const MAX_BYTES = 2 * 1024 * 1024 * 1024;
const DRAFT_KEY = 'dung_video_gui';

window.Modules = window.Modules || {};
window.Modules['gui-video'] = {
  title: 'Gửi video',
  async render(container, ctx){
    const state = { step:1, kind:'video_noi', title:'', file:null, uploading:false, pct:0, error:null };
    // Nháp chỉ giữ lựa chọn kiểu + tiêu đề (file đã chọn không giữ được qua reload — trình duyệt không cho).
    const d = await loadModuleDraft(ctx, DRAFT_KEY);
    if(d){ state.kind = d.kind || state.kind; state.title = d.title || ''; state.step = d.step || 1; }
    const persist = ()=>saveModuleDraft(ctx, DRAFT_KEY, { kind:state.kind, title:state.title, step:state.step });

    function draw(){
      if(state.step === 1){
        container.innerHTML = `
          <div class="page-head"><a style="font-size:14.5px;color:var(--ink-soft);cursor:pointer;" id="back-home">‹ Tổng quan</a><h1 style="margin-top:8px;">Gửi video</h1>
            <div style="height:4px;background:var(--line);border-radius:3px;margin-top:14px;"><div style="width:33%;height:100%;background:#D9423E;border-radius:3px;"></div></div></div>
          <h3 style="font-family:'Be Vietnam Pro',sans-serif;font-size:17px;margin-bottom:12px;">Bạn gửi gì?</h3>
          ${KINDS.map(k=>`<div class="kind-card ${state.kind===k.key?'sel':''} ${k.on?'':'off'}" data-k="${k.key}">
            <div class="ic">${k.ic}</div><div><b>${esc(k.title)}${k.on?'':' <span style="font-size:12.5px;font-weight:600;color:var(--ink-soft);">· Sắp có</span>'}</b><span class="d">${esc(k.desc)}</span></div></div>`).join('')}
          <button class="btn btn-full" id="next" style="background:#E10D0D;">Tiếp</button>`;
        container.querySelector('#back-home').onclick = ()=>{ location.hash = 'tong-quan'; };
        container.querySelectorAll('.kind-card').forEach(el=>{ el.onclick = ()=>{
          const k = KINDS.find(x=>x.key===el.getAttribute('data-k')); if(!k.on) return;
          state.kind = k.key; persist(); draw(); }; });
        container.querySelector('#next').onclick = ()=>{ state.step = 2; persist(); draw(); };
        return;
      }
      container.innerHTML = `
        <div class="page-head"><a style="font-size:14.5px;color:var(--ink-soft);cursor:pointer;" id="back1">‹ Đổi kiểu gửi</a><h1 style="margin-top:8px;">Chọn video</h1>
          <div style="height:4px;background:var(--line);border-radius:3px;margin-top:14px;"><div style="width:66%;height:100%;background:#D9423E;border-radius:3px;"></div></div></div>
        <div class="card">
          <div class="field"><label>Tên video (không bắt buộc)</label><input type="text" id="title" maxlength="80" placeholder="VD: 5 dấu hiệu cơ thể đang tích mỡ" value="${esc(state.title)}"></div>
          <div class="field"><label>File video</label>
            <input type="file" id="file" accept="video/*" style="display:none">
            <button class="btn btn-ghost" id="pick" ${state.uploading?'disabled':''}>${state.file?'Đổi file':'Chọn video từ điện thoại'}</button>
            ${state.file?`<div style="margin-top:10px;font-size:15.5px;">🎬 <b>${esc(state.file.name)}</b> · ${esc(fmtSize(state.file.size))}</div>`:''}
          </div>
          ${state.uploading?`<div class="progress-bar"><div style="width:${Math.round(state.pct*100)}%"></div></div><div style="font-size:14.5px;color:var(--ink-soft);margin-top:8px;">Đang tải lên ${Math.round(state.pct*100)}% — đừng đóng trang cho đến khi xong.</div>`:''}
          ${state.error?`<div class="error-box">${esc(state.error)}</div>`:''}
          <button class="btn btn-full" id="send" style="background:#E10D0D;" ${(!state.file||state.uploading)?'disabled':''}>${state.uploading?'Đang gửi…':'+ Gửi video'}</button>
        </div>`;
      container.querySelector('#back1').onclick = ()=>{ if(state.uploading) return; state.step = 1; persist(); draw(); };
      container.querySelector('#title').oninput = (e)=>{ state.title = e.target.value; persist(); };
      const fileInput = container.querySelector('#file');
      container.querySelector('#pick').onclick = ()=>fileInput.click();
      fileInput.onchange = ()=>{
        const f = fileInput.files[0]; if(!f) return;
        if(!/^video\//.test(f.type)) { state.error = 'Chỉ nhận file video.'; draw(); return; }
        if(f.size > MAX_BYTES){ state.error = 'Video lớn hơn 2 GB — cắt ngắn bớt rồi gửi lại.'; draw(); return; }
        state.file = f; state.error = null; draw();
      };
      container.querySelector('#send').onclick = send;
    }

    async function send(){
      state.uploading = true; state.pct = 0; state.error = null; draw();
      let jobId = null;
      try{
        const { uploadUrl, path } = await callApi('api/dung-video-upload-url', { purpose:'source', file_name: state.file.name });
        const { data: job, error } = await ctx.supabase.from('dv_jobs').insert({
          user_id: ctx.user.id, kind: state.kind, title: state.title.trim() || null,
          source_path: path, source_name: state.file.name, source_size: state.file.size,
        }).select('id').single();
        if(error) throw new Error('Không tạo được việc — thử lại giúp mình.');
        jobId = job.id;
        let last = 0;
        await uploadWithProgress(uploadUrl, state.file, (p)=>{ if(p - last > 0.01){ last = p; state.pct = p; const bar = container.querySelector('.progress-bar > div'); if(bar) bar.style.width = Math.round(p*100)+'%'; } });
        const { error: qe } = await ctx.supabase.rpc('dv_queue_job', { p_job_id: jobId });
        if(qe) throw new Error('Tải lên xong nhưng chưa xếp hàng được — thử lại giúp mình.');
        await clearModuleDraft(ctx, DRAFT_KEY);
        window.__dvOpenJob = jobId;
        if(window.dvRefreshBadges) window.dvRefreshBadges();
        location.hash = 'video-cua-toi';
      } catch(e){
        if(jobId) await ctx.supabase.from('dv_jobs').delete().eq('id', jobId);
        state.uploading = false; state.error = e.message; draw();
      }
    }
    draw();
  },
};
})();
