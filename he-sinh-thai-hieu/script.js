// ---------- Story video ----------
(function () {
  var thumb = document.getElementById('storyThumb');
  var video = document.getElementById('storyVideo');
  if (!thumb || !video) return;

  function play() {
    thumb.classList.add('hide');
    video.style.display = 'block';
    video.play().catch(function (e) { console.warn(e); });
  }

  thumb.addEventListener('click', play);
  video.addEventListener('ended', function () {
    video.style.display = 'none';
    video.currentTime = 0;
    thumb.classList.remove('hide');
  });

  var ctaPlay = document.getElementById('storyCtaPlay');
  if (ctaPlay) {
    ctaPlay.addEventListener('click', function (e) {
      e.preventDefault();
      play();
      thumb.closest('.story-video-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
})();

// ---------- Proof tabs + lightbox ----------
function proofSwitch(tab) {
  document.querySelectorAll('.proof-tabs .tab-btn').forEach(function (t) { t.classList.toggle('active', t.dataset.tab === tab); });
  document.querySelectorAll('.proof-panel').forEach(function (p) { p.classList.toggle('active', p.id === 'panel-' + tab); });
}
function proofZoom(card) {
  var src = card.querySelector('img').src;
  document.getElementById('lightboxImg').src = src;
  document.getElementById('lightbox').classList.add('open');
}

// ---------- Quiz ----------
(function () {
  var BRANCHES = {
    hanh: { name: 'HIỂU HẠNH', color: '#B8862E', logo: '/he-sinh-thai-hieu/assets/images/branch-hanh.png', link: 'https://docs.google.com/forms/d/e/1FAIpQLSdta1H-B_ewAEEUr291J7BsMfdEQK_lW-J2Gg1iNnenWy4Gdg/viewform' },
    manh: { name: 'HIỂU MẠNH', color: '#2F6F62', logo: '/he-sinh-thai-hieu/assets/images/branch-manh.png', link: 'https://hieu-de-khoe-manh.vercel.app/' },
    kenh: { name: 'HIỂU KÊNH', color: '#262622', logo: '/he-sinh-thai-hieu/assets/images/branch-kenh.png', link: 'https://xaynhanhieu8dongtien.netlify.app/' }
  };
  var TOTAL = 5;
  var state = { answers: {}, top: null };

  window.quizOpen = function () {
    document.getElementById('quizOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
    state.answers = {};
    document.querySelectorAll('.quiz-opt').forEach(function (o) { o.classList.remove('selected'); });
    goToStep(1);
  };
  window.quizClose = function () {
    document.getElementById('quizOverlay').classList.remove('open');
    document.body.style.overflow = '';
  };

  function goToStep(step) {
    document.querySelectorAll('.quiz-step').forEach(function (el) { el.classList.toggle('active', el.dataset.step == step); });
    var wrap = document.getElementById('quizProgressWrap');
    if (step === 'result') {
      wrap.style.display = 'none';
    } else {
      wrap.style.display = 'flex';
      document.getElementById('quizProgressFill').style.width = (step / TOTAL * 100) + '%';
      document.getElementById('quizProgressLabel').textContent = 'Câu ' + step + '/' + TOTAL;
    }
  }

  document.querySelectorAll('.quiz-options').forEach(function (group) {
    group.addEventListener('click', function (e) {
      var btn = e.target.closest('.quiz-opt');
      if (!btn) return;
      var q = group.dataset.q;
      group.querySelectorAll('.quiz-opt').forEach(function (o) { o.classList.remove('selected'); });
      btn.classList.add('selected');
      state.answers[q] = btn.dataset.val;
      setTimeout(function () {
        if (parseInt(q) < TOTAL) goToStep(parseInt(q) + 1);
        else showResult();
      }, 320);
    });
  });

  function showResult() {
    var scores = { hanh: 0, manh: 0, kenh: 0 };
    Object.values(state.answers).forEach(function (v) { scores[v]++; });
    var ranked = Object.keys(scores)
      .map(function (k) { return { key: k, score: scores[k], pct: Math.round(scores[k] / TOTAL * 100) }; })
      .sort(function (a, b) { return b.score - a.score; });
    state.top = ranked[0].key;

    var html = '';
    ranked.forEach(function (r, idx) {
      var b = BRANCHES[r.key];
      var isTop = idx === 0;
      html += '<div class="quiz-rank' + (isTop ? ' top' : '') + '">' +
        '<div class="quiz-rank-head">' +
          '<div class="quiz-rank-logo"><img src="' + b.logo + '" alt="' + b.name + '"></div>' +
          '<span class="quiz-rank-name">' + b.name + (isTop ? ' <span class="quiz-rank-badge">Phù hợp nhất</span>' : '') + '</span>' +
          '<span class="quiz-rank-pct" style="color:' + b.color + '">' + r.pct + '%</span>' +
        '</div>' +
        '<div class="quiz-rank-bar-track"><div class="quiz-rank-bar-fill" style="width:' + r.pct + '%;background:' + b.color + '"></div></div>' +
      '</div>';
    });
    document.getElementById('quizRanks').innerHTML = html;
    goToStep('result');
  }

  window.quizGoToProduct = function () {
    if (!state.top) return;
    var branch = state.top;
    quizClose();

    var tabMap = { hanh: 'hanh', manh: 'manh', kenh: 'kenh' };
    if (typeof proofSwitch === 'function') proofSwitch(tabMap[branch] || 'kenh');

    setTimeout(function () {
      var proofEl = document.getElementById('proof');
      if (proofEl) proofEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 250);

    setTimeout(function () {
      var map = { hanh: 's-hanh', manh: 's-manh', kenh: 's-kenh' };
      var el = document.getElementById(map[branch]);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 1900);
  };

  document.getElementById('quizOverlay').addEventListener('click', function (e) {
    if (e.target === this) quizClose();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.getElementById('quizOverlay').classList.contains('open')) quizClose();
  });
})();
