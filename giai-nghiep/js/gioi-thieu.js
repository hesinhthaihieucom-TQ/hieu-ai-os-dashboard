(function(){
  window.Modules = window.Modules || {};
  // Phần mở đầu của ebook (lời mở đầu, 5 trụ cột, dành cho ai, giá trị, nhịp thực hành, lời khế ước) — chép nguyên văn.
  window.Modules['gioi-thieu'] = {
    title: 'Giới Thiệu Hành Trình',
    render(container){
      const front = window.GN_FRONT || [];
      container.innerHTML = `
        <div class="page-head">
          <span class="tag">Giới thiệu</span>
          <h1>21 Ngày Chuyển Hóa Nghiệp</h1>
          <p>Đọc phần mở đầu trước khi bắt đầu Ngày 1.</p>
          <div style="margin-top:10px;"><span class="help-btn" id="gn-help">❓ Hướng dẫn</span></div>
        </div>
        <div id="gn-front">
        ${front.map((f,i)=>`
          <details class="kt-section" ${i===0?'open':''}>
            <summary class="kt-summary">${esc(f.h)}</summary>
            <div style="margin-top:8px;">${gnParas(f.items).map(p=>/^0\d\s/.test(p)||/^TRỤ CỘT/.test(p)||/^\d\.\s/.test(p)?`<p style="font-size:16.5px;line-height:1.7;margin:12px 0 2px;"><b>${esc(p)}</b></p>`:`<p style="font-size:16.5px;line-height:1.7;margin:0 0 8px;">${esc(p)}</p>`).join('')}</div>
          </details>`).join('')}
        </div>
        <div class="btn-row"><button class="btn" id="gn-go">Bắt đầu hành trình →</button></div>`;
      container.querySelector('#gn-go').onclick = ()=>{ location.hash = 'trang-chu'; };
      container.querySelector('#gn-help').onclick = ()=>{
        if(window.startPageTour) window.startPageTour([{ selector:'#gn-front', title:'Phần mở đầu', text:'Bấm vào từng mục để mở ra đọc. Đọc chậm, không vội.' }]);
      };
    }
  };
})();
