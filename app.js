/* CLAF Digital · Sistema SAAIA — vanilla JS */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.from((r || document).querySelectorAll(s)); };
  var fmtUSD = function (n) {
    n = Math.round(n);
    return '$' + n.toLocaleString('en-US') + ' USD';
  };
  var fmtCompact = function (n) {
    n = Math.round(n);
    return '$' + n.toLocaleString('en-US');
  };

  // ===== Scroll progress bar
  var sp = $('#scroll-progress');
  if (sp) {
    var updateProgress = function () {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? (window.scrollY / h) * 100 : 0;
      sp.style.width = Math.min(100, Math.max(0, p)) + '%';
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  // ===== Navbar
  var nav = $('.nav');
  var burger = $('.burger');
  var onScroll = function () {
    if (window.scrollY > 50) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ===== Reveal on view
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    $$('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    $$('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  // ===== Calculadora SAAIA
  var FUGA = { fast: 0.10, mid: 0.50, slow: 0.80 };
  var RECOVERY = { fast: 0.60, mid: 0.85, slow: 0.90 };
  var CIERRE = { c1: 0.20, c2: 0.40, c3: 0.60, c4: 0.78 };

  var state = {
    leads: 100,
    ticket: 500,
    response: 'mid',
    horasSin: 12,
    equipo: 2,
    cierre: 'c2'
  };

  var els = {
    leads: $('#i-leads'),
    leadsOut: $('#o-leads'),
    ticket: $('#i-ticket'),
    ticketOut: $('#o-ticket'),
    horas: $('#i-horas'),
    horasOut: $('#o-horas'),
    equipo: $('#i-equipo'),
    equipoOut: $('#o-equipo'),
    previewN: $('#preview-n'),
    go: $('#calc-go'),
    phase1: $('#calc-phase1'),
    loading: $('#calc-loading'),
    results: $('#calc-results'),
    loadSteps: $$('#calc-loading .load-step'),
    fx: $('#money-fx'),
  };

  function paintSlider(input) {
    var min = +input.min, max = +input.max, val = +input.value;
    var pct = ((val - min) / (max - min)) * 100;
    input.style.setProperty('--p', pct + '%');
  }

  function computeLoss() {
    var fuga = FUGA[state.response];
    var cierreV = CIERRE[state.cierre];
    var leadsLost = state.leads * fuga;
    var leadsNocturno = state.leads * 0.40 * (state.horasSin / 24);
    var costoOpor = leadsLost * state.ticket * cierreV;
    var ventasPerdidas = leadsNocturno * cierreV * state.ticket;
    var lossMonth = costoOpor + ventasPerdidas;
    var recovery = RECOVERY[state.response];
    var recuperable = lossMonth * recovery;
    var horasTotal = state.horasSin * 30;
    var fricEquipo = Math.max(0, (state.leads - state.equipo * 60) * 0.30) * state.ticket * cierreV * 0.5;
    var lossWithEq = lossMonth + fricEquipo * 0.4;
    return {
      lossMonth: lossWithEq,
      lossYear: lossWithEq * 12,
      leadsLost: leadsLost,
      leadsNocturno: leadsNocturno,
      costoOpor: costoOpor,
      ventasPerdidas: ventasPerdidas,
      recuperable: recuperable,
      horasTotal: horasTotal,
      cierreV: cierreV
    };
  }

  function bumpPreview() {
    var r = computeLoss();
    els.previewN.textContent = fmtCompact(r.lossMonth);
    els.previewN.classList.add('bump');
    setTimeout(function () { els.previewN.classList.remove('bump'); }, 220);
  }

  // Sliders
  function bindSlider(input, output, formatter, key) {
    if (!input) return;
    paintSlider(input);
    output.textContent = formatter(+input.value);
    input.addEventListener('input', function () {
      state[key] = +input.value;
      paintSlider(input);
      output.textContent = formatter(+input.value);
      bumpPreview();
    });
  }
  bindSlider(els.leads, els.leadsOut, function (v) { return v; }, 'leads');
  bindSlider(els.ticket, els.ticketOut, function (v) { return '$' + v.toLocaleString('en-US'); }, 'ticket');
  bindSlider(els.horas, els.horasOut, function (v) { return v + ' hs'; }, 'horasSin');
  bindSlider(els.equipo, els.equipoOut, function (v) { return v + (v === 1 ? ' persona' : ' personas'); }, 'equipo');

  // Radios (response + cierre)
  function bindRadioGroup(name, key) {
    var opts = $$('.opt[data-group="' + name + '"]');
    opts.forEach(function (o) {
      o.addEventListener('click', function () {
        opts.forEach(function (x) { x.classList.remove('active'); });
        o.classList.add('active');
        state[key] = o.dataset.value;
        bumpPreview();
      });
    });
  }
  bindRadioGroup('response', 'response');
  bindRadioGroup('cierre', 'cierre');

  // initial preview
  bumpPreview();

  // ===== Equivalences
  function moneyEquiv(amount) {
    if (amount >= 4500) {
      return [
        { ic: '✈️', t: 'Un viaje a Europa para dos personas — todo incluido.' },
        { ic: '📱', t: 'Un iPhone de gama alta nuevo cada mes.' },
        { ic: '🏖️', t: 'Un fin de semana largo en resort all-inclusive.' }
      ];
    }
    if (amount >= 800) {
      return [
        { ic: '📱', t: Math.max(1, Math.round(amount / 1200)) + ' celulares premium cada mes.' },
        { ic: '🎓', t: 'Un curso de especialización profesional.' },
        { ic: '🍽️', t: Math.round(amount / 80) + ' cenas para 4 personas.' }
      ];
    }
    return [
      { ic: '⛽', t: 'Tanques de nafta para todo un mes (' + Math.round(amount / 60) + ' tanques).' },
      { ic: '🍽️', t: Math.round(amount / 70) + ' cenas afuera para dos.' },
      { ic: '📺', t: Math.round(amount / 15) + ' suscripciones digitales mensuales.' }
    ];
  }

  function hoursEquiv(hours) {
    var capitulos = Math.round(hours * 60 / 45);
    var pacientes = Math.round(hours * 60 / 30);
    var pelis = Math.round(hours / 1.7);
    return [
      { ic: '📺', t: capitulos + ' capítulos de serie (45 min c/u).' },
      { ic: '🩺', t: pacientes + ' pacientes extra que podrías haber atendido.' },
      { ic: '🎬', t: pelis + ' películas completas.' }
    ];
  }

  // ===== Odometer
  function odometer(el, target, dur) {
    dur = dur || 1800;
    var start = performance.now();
    function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
    function step(now) {
      var p = Math.min(1, (now - start) / dur);
      var v = target * easeOutExpo(p);
      el.textContent = fmtCompact(v);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = fmtCompact(target);
    }
    requestAnimationFrame(step);
  }

  // ===== Particles
  function launchParticles(canvas, duration) {
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    function size() { canvas.width = window.innerWidth * dpr; canvas.height = window.innerHeight * dpr; canvas.style.width = window.innerWidth + 'px'; canvas.style.height = window.innerHeight + 'px'; }
    size();
    var glyphs = ['$', '💸', '💰', '🪙', '$'];
    var isMobile = window.innerWidth < 720;
    var N = isMobile ? 28 : 52;
    var parts = [];
    for (var i = 0; i < N; i++) {
      parts.push({
        x: Math.random() * canvas.width,
        y: canvas.height + Math.random() * 200 * dpr,
        vx: (Math.random() - 0.5) * 1.4 * dpr,
        vy: -(2 + Math.random() * 3.2) * dpr,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.08,
        g: glyphs[Math.floor(Math.random() * glyphs.length)],
        size: (22 + Math.random() * 18) * dpr,
        alpha: 0.85 + Math.random() * 0.15
      });
    }
    var start = performance.now();
    function frame(now) {
      var t = (now - start) / duration;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      parts.forEach(function (p) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.015 * dpr;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, p.alpha * (1 - t));
        ctx.font = p.size + 'px ' + (p.g === '$' ? 'JetBrains Mono, monospace' : 'sans-serif');
        ctx.fillStyle = p.g === '$' ? '#FF1744' : '#fff';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.g, 0, 0);
        ctx.restore();
      });
      if (t < 1) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    requestAnimationFrame(frame);
  }

  // ===== Reveal results
  function showResults() {
    var r = computeLoss();
    els.phase1.style.display = 'none';
    els.loading.classList.add('show');
    // step text reveal
    els.loadSteps.forEach(function (s, i) {
      setTimeout(function () { s.classList.add('on'); }, 300 + i * 350);
    });
    setTimeout(function () {
      els.loading.classList.remove('show');
      els.results.classList.add('show');
      var blocks = $$('.res-block');
      blocks.forEach(function (b, i) {
        setTimeout(function () { b.classList.add('in'); }, 80 + i * 100);
      });

      // fill big number with odometer
      odometer($('#res-loss-n'), r.lossMonth, 1700);
      $('#res-loss-yr-n').textContent = fmtCompact(r.lossYear);

      // money equivalences
      var eqMoney = moneyEquiv(r.lossMonth);
      $('#res-eq-grid').innerHTML = eqMoney.map(function (e) {
        return '<div class="res-eq-item"><span class="ico">' + e.ic + '</span><span>' + e.t + '</span></div>';
      }).join('');

      // metrics 2x2
      $('#m-leads').textContent = Math.round(r.leadsLost);
      $('#m-cost').textContent = fmtCompact(r.costoOpor / Math.max(1, r.leadsLost));
      $('#m-hours').textContent = r.horasTotal + ' hs';
      $('#m-recovery').textContent = Math.round(RECOVERY[state.response] * 100) + '%';

      // hours block
      $('#h-total').textContent = r.horasTotal;
      var pctMonth = Math.round((r.horasTotal / (24 * 30)) * 100);
      $('#h-pct').textContent = pctMonth + '% del mes sin cobertura.';
      setTimeout(function () { $('#h-bar').style.width = Math.min(100, pctMonth) + '%'; }, 200);

      var eqHours = hoursEquiv(r.horasTotal);
      $('#res-hours-equiv').innerHTML = eqHours.map(function (e) {
        return '<div class="res-eq-item"><span class="ico">' + e.ic + '</span><span>' + e.t + '</span></div>';
      }).join('');

      // distribution bars
      var total = r.costoOpor + r.ventasPerdidas + r.recuperable;
      if (total > 0) {
        var p1 = (r.costoOpor / total) * 100;
        var p2 = (r.ventasPerdidas / total) * 100;
        var p3 = (r.recuperable / total) * 100;
        $('#d1-val').textContent = Math.round(p1) + '%';
        $('#d2-val').textContent = Math.round(p2) + '%';
        $('#d3-val').textContent = Math.round(p3) + '%';
        setTimeout(function () {
          $('#d1-bar').style.width = p1 + '%';
          $('#d2-bar').style.width = p2 + '%';
          $('#d3-bar').style.width = p3 + '%';
        }, 220);
      }

      // diagnostic bullets
      var diag = $('#res-diag-ul');
      var leadStr = state.leads + ' leads/mes';
      var respLabel = ({ fast: 'respuesta rápida', mid: 'respuesta tardía', slow: 'respuesta muy lenta' })[state.response];
      diag.innerHTML = [
        '<li><span class="ic">⏳</span><span>Con <b>' + leadStr + '</b> y <b>' + respLabel + '</b>, aproximadamente <b>' + Math.round(r.leadsLost) + ' pacientes</b> podrían elegir otra clínica antes de que los contactes.</span></li>',
        '<li><span class="ic">🌙</span><span>Tu clínica está <b>' + state.horasSin + ' horas/día sin cobertura</b>, lo que equivale a <b>' + r.horasTotal + ' horas/mes</b> en silencio.</span></li>',
        '<li><span class="ic">💸</span><span>Según estos datos, la pérdida potencial estimada ronda los <b>' + fmtCompact(r.lossMonth) + '</b> por mes.</span></li>',
        '<li><span class="ic">🤖</span><span>Con SAAIA podrías recuperar una buena parte de esas oportunidades — hasta un <b>' + Math.round(RECOVERY[state.response] * 100) + '%</b>, según tu tiempo de respuesta.</span></li>'
      ].join('');

      // particles
      launchParticles(els.fx, 3500);

      // Meta CAPI — calculadora completada
      if (window.trackCalculadoraCompleted) {
        window.trackCalculadoraCompleted(r.lossMonth);
      }

      // scroll into results so user sees them
      setTimeout(function () {
        $('#calc-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }, 1850);
  }

  if (els.go) els.go.addEventListener('click', showResults);

  // ===== FAQ accordion
  $$('.faq-q').forEach(function (q) {
    q.addEventListener('click', function () {
      var item = q.closest('.faq-item');
      var wasOpen = item.classList.contains('open');
      $$('.faq-item').forEach(function (i) { i.classList.remove('open'); });
      if (!wasOpen) item.classList.add('open');
    });
  });

  // ===== year
  var yr = $('#year');
  if (yr) yr.textContent = new Date().getFullYear();

  // ============================================
  // WHATSAPP PHONE MOCKUP — parallax + conversation
  // ============================================
  var CONVERSATION = [
    { type: 'outgoing', text: 'Hola, quería sacar turno para una consulta', time: '14:30', delay: 600 },
    { type: 'incoming', text: '¡Hola! 👋 Soy el asistente de la clínica.\n¿Para qué especialidad necesitás el turno?', time: '14:30', delay: 1400 },
    { type: 'outgoing', text: 'Odontología', time: '14:31', delay: 2400 },
    { type: 'incoming', text: 'Perfecto ✅\n¿Tenés algún odontólogo de preferencia en nuestra clínica?', time: '14:31', delay: 3200 },
    { type: 'outgoing', text: 'Sí, con el Dr. Martínez', time: '14:32', delay: 4200 },
    { type: 'incoming', text: 'Genial 😊 Te paso el link para agendarte:\n👉 calendly.com/clinica/dr-martinez', time: '14:32', delay: 5000 },
    { type: 'outgoing', text: 'Listo, ya me agendé. ¡Gracias!', time: '14:33', delay: 6200 },
    { type: 'incoming', text: '🎉 ¡Cita confirmada!\n\n📅 Sábado 23 de mayo · 11:00 hs\n📍 Av. San Martín 1335, CABA\n\nLlegá 10 min antes ✨\n¿Necesitás reagendar?\n👉 link-reagendamiento.com', time: '14:33', delay: 7200 }
  ];

  function initParallax(sceneId, wrapperId) {
    var scene = $('#' + sceneId);
    var wrapper = $('#' + wrapperId);
    if (!scene || !wrapper) return;
    var cx = 0, cy = 0, tx = 0, ty = 0;
    var isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (!isCoarse) {
      scene.addEventListener('mousemove', function (e) {
        var r = scene.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        var dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        tx = dy * -10;
        ty = dx * 9;
      });
      scene.addEventListener('mouseleave', function () { tx = 0; ty = 0; });
    }
    function loop() {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      wrapper.style.transform = 'rotateX(' + cx.toFixed(2) + 'deg) rotateY(' + cy.toFixed(2) + 'deg)';
      requestAnimationFrame(loop);
    }
    loop();
  }

  function buildMsg(m) {
    var div = document.createElement('div');
    div.className = 'msg ' + m.type;
    var bubble = document.createElement('div');
    bubble.className = 'bubble';
    var processed = m.text.replace(/(https?:\/\/[^\s]+|[a-z0-9-]+\.[a-z]{2,}\/[^\s]*)/gi, function (url) {
      var href = url.indexOf('http') === 0 ? url : 'https://' + url;
      return '<a class="bubble-link" href="' + href + '" target="_blank" rel="noopener">' + url + '</a>';
    }).replace(/\n/g, '<br>');
    bubble.innerHTML = processed;
    var time = document.createElement('div');
    time.className = 'bubble-time';
    time.innerHTML = m.type === 'outgoing' ? (m.time + ' <span class="ticks">✓✓</span>') : m.time;
    bubble.appendChild(time);
    div.appendChild(bubble);
    return div;
  }

  function playConversation(scrollId, offset) {
    var container = $('#' + scrollId);
    if (!container) return;
    offset = offset || 0;
    var timers = [];

    function makeTyping() {
      var t = document.createElement('div');
      t.className = 'typing-bubble';
      t.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
      return t;
    }

    CONVERSATION.forEach(function (m, i) {
      var when = offset + m.delay;
      if (m.type === 'incoming') {
        timers.push(setTimeout(function () {
          var tb = makeTyping();
          container.appendChild(tb);
          requestAnimationFrame(function () { tb.classList.add('show'); });
          container.scrollTop = container.scrollHeight;
          tb._t = tb;
        }, Math.max(0, when - 700)));
        timers.push(setTimeout(function () {
          var typings = container.querySelectorAll('.typing-bubble');
          typings.forEach(function (t) { t.remove(); });
        }, when - 60));
      }
      timers.push(setTimeout(function () {
        var el = buildMsg(m);
        container.appendChild(el);
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { el.classList.add('visible'); });
        });
        container.scrollTop = container.scrollHeight;
      }, when));
    });

    var last = CONVERSATION[CONVERSATION.length - 1].delay;
    timers.push(setTimeout(function () {
      container.style.transition = 'opacity .5s';
      container.style.opacity = '0';
      setTimeout(function () {
        // reset but keep date pill
        var date = container.querySelector('.wa-date');
        container.innerHTML = '';
        if (date) container.appendChild(date);
        container.style.opacity = '1';
        playConversation(scrollId, 0);
      }, 600);
    }, offset + last + 4000));
  }

  function observePlay(scrollId, offset) {
    var c = $('#' + scrollId);
    if (!c) return;
    var played = false;
    if (!('IntersectionObserver' in window)) {
      playConversation(scrollId, offset);
      return;
    }
    var obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && !played) {
          played = true;
          playConversation(scrollId, offset);
          obs.disconnect();
        }
      });
    }, { threshold: 0.25 });
    obs.observe(c);
  }

  // init phones
  initParallax('phone-scene-1', 'phone-1');
  initParallax('phone-scene-2', 'phone-2');
  observePlay('scroll-1', 0);
  observePlay('scroll-2', 1500);
})();
