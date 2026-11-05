(function(){
  window.Modules = window.Modules || {};
  // Giải thích từng loại nghiệp — mỗi ngày là 1 loại; câu giải thích lấy từ ebook (nếu ebook đã viết) hoặc workbook (xem explainSrc).
  window.Modules['cac-loai-nghiep'] = {
    title: 'Các Loại Nghiệp',
    render(container){
      const days = (window.GN_DAYS||[]).filter(d=>d.explain);
      container.innerHTML = `
        <div class="page-head">
          <span class="tag">Hiểu nghiệp</span>
          <h1>Các loại nghiệp trong hành trình</h1>
          <p>Mỗi ngày bạn nhận diện một mô thức cũ. Bấm vào từng loại để hiểu nó là gì.</p>
          <div style="margin-top:10px;"><span class="help-btn" id="gn-help">❓ Hướng dẫn</span></div>
        </div>
        <div id="gn-types">
        ${days.map(d=>`
          <details class="kt-section">
            <summary class="kt-summary">Ngày ${d.n} — Nghiệp ${esc(d.title)}</summary>
            <div style="margin-top:8px;">
              <p style="font-size:16.5px;line-height:1.7;margin:0 0 8px;">${esc(d.explain)}</p>
              ${d.pattern?`<p style="font-size:16.5px;line-height:1.7;margin:0 0 8px;"><b>Mô thức cần quan sát:</b> ${esc(d.pattern)}</p>`:''}
              ${d.manifest.length?`<ul style="padding-left:20px;line-height:1.7;font-size:16.5px;margin:0 0 8px;">${d.manifest.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}
              <div class="btn-row" style="justify-content:flex-start;margin-top:10px;"><span class="btn btn-ghost btn-sm" data-open="${d.n}">Mở bài học ngày ${d.n}</span></div>
            </div>
          </details>`).join('')}
        </div>`;
      container.querySelectorAll('[data-open]').forEach(el=>{ el.onclick = ()=>{ window.PendingGnDay = parseInt(el.getAttribute('data-open'),10); location.hash = 'ngay'; }; });
      container.querySelector('#gn-help').onclick = ()=>{ if(window.startPageTour) window.startPageTour([{ selector:'#gn-types', title:'Các loại nghiệp', text:'Mỗi mục là 1 loại nghiệp của 1 ngày. Bấm để đọc giải thích, rồi bấm "Mở bài học" để vào học.' }]); };
    }
  };
})();
