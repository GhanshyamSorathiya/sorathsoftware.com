/* =====================================================================
   SorathERP — site scripts
   ---------------------------------------------------------------------
   EDIT THIS BLOCK ONLY. Every link, download and contact detail on the
   site is driven from CONFIG below. Anything left as an empty string
   falls back to a pre-filled WhatsApp message, so no button is ever a
   dead end.
   ===================================================================== */
const CONFIG = {
  // Installer is too large for git (>100MB GitHub limit) — hosted as a GitHub
  // Release asset instead of a repo file. Update the tag below whenever a new
  // installer build is uploaded as a release.
  downloadUrl: 'https://github.com/GhanshyamSorathiya/sorathsoftware.com/releases/download/v1.0.0/SorathERP-Setup.exe',
  // TODO: product tour video (YouTube link is fine). Empty = scroll to the
  // "See it at work" section on the homepage instead.
  tourUrl: '',
  // TODO: training video playlist and user-manual PDF
  trainingUrl: '',
  manualUrl: '',
  // TODO: remote support tool installer
  remoteToolUrl: '',
  // TODO: placeholder until the real sales/support numbers are live
  phone: '+911111111111',
  whatsapp: '911111111111',
  // Support ticket form posts here (multipart/form-data) — see
  // SorathERP.Licensing/src/SorathERP.LicenseApi/Controllers/SupportController.cs.
  // Empty = the ticket is sent as a pre-filled WhatsApp message instead.
  formEndpoint: 'https://license-api.sorathsoftware.com/api/support',
};

(() => {
  const wa = (msg) =>
    `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;

  const open = (url) => window.open(url, '_blank', 'noopener');

  /* Run fn once, the first time el is meaningfully on screen. Uses
     IntersectionObserver where it reports reliably, with a scroll/rAF fallback
     for the older Android WebViews a lot of our users are on. */
  const onceVisible = (el, ratio, fn) => {
    let done = false;
    const fire = () => {
      if (done) return;
      done = true;
      cleanup();
      fn();
    };
    const check = () => {
      const r = el.getBoundingClientRect();
      if (!r.height) return;
      const visible = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
      if (visible / Math.min(r.height, window.innerHeight) >= ratio) fire();
    };
    let io = null;
    const cleanup = () => {
      if (io) io.disconnect();
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
    if (window.IntersectionObserver) {
      io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) fire(); });
      }, { threshold: ratio });
      io.observe(el);
    }
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    requestAnimationFrame(check);
  };

  // ===== One dispatcher for every CTA on the site =====
  // Markup opts in with data-action="…" — see the table below.
  const ACTIONS = {
    download: () =>
      CONFIG.downloadUrl
        ? (window.location.href = CONFIG.downloadUrl)
        : open(wa("Hi, I'd like the SorathERP free trial download link.")),

    tour: () => {
      if (CONFIG.tourUrl) return open(CONFIG.tourUrl);
      const showcase = document.querySelector('.showcase-section');
      if (showcase) return window.scrollTo({ top: showcase.offsetTop - 80, behavior: 'smooth' });
      open(wa("Hi, I'd like to see a product tour of SorathERP."));
    },

    demo: () => open(wa("Hi, I'd like to book a free demo of SorathERP.")),

    'training-videos': () =>
      CONFIG.trainingUrl
        ? open(CONFIG.trainingUrl)
        : open(wa('Hi, please share the SorathERP training videos.')),

    manual: () =>
      CONFIG.manualUrl
        ? open(CONFIG.manualUrl)
        : open(wa('Hi, please share the SorathERP user manual PDF.')),

    'remote-tool': () =>
      CONFIG.remoteToolUrl
        ? (window.location.href = CONFIG.remoteToolUrl)
        : open(wa("Hi, I need remote support — please share the remote support tool.")),
  };

  document.querySelectorAll('[data-action]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const run = ACTIONS[el.getAttribute('data-action')];
      if (!run) return;
      e.preventDefault();
      run();
    });
  });

  // ===== Mobile nav toggle =====
  document.querySelectorAll('.nav-toggle').forEach((toggle) => {
    const header = toggle.closest('.nav, .legal-nav-simple');
    const menu = header && header.querySelector('.nav-menu');
    if (!menu) return;

    const closeMenu = () => {
      menu.classList.remove('open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    };

    toggle.addEventListener('click', () => {
      const willOpen = !menu.classList.contains('open');
      menu.classList.toggle('open', willOpen);
      toggle.classList.toggle('open', willOpen);
      toggle.setAttribute('aria-expanded', String(willOpen));
    });

    menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  });

  // ===== Showcase tab switching =====
  const tabs = document.querySelectorAll('.tab-item');
  const panels = document.querySelectorAll('.doc-panel');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');

      tabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle('active', active);
        t.setAttribute('aria-selected', String(active));
        t.setAttribute('tabindex', active ? '0' : '-1');
        t.querySelector('.tab-item-arrow').textContent = active ? '→' : '';
      });

      panels.forEach((panel) => {
        const active = panel.getAttribute('data-panel') === target;
        panel.classList.toggle('active', active);
        panel.hidden = !active;
        if (active) {
          // restart the docIn animation
          panel.style.animation = 'none';
          void panel.offsetWidth;
          panel.style.animation = '';
        }
      });
    });

    // Arrow-key navigation between tabs (WAI-ARIA tab pattern)
    tab.addEventListener('keydown', (e) => {
      const list = [...tabs];
      const i = list.indexOf(tab);
      let next = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = list[(i + 1) % list.length];
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = list[(i - 1 + list.length) % list.length];
      if (!next) return;
      e.preventDefault();
      next.focus();
      next.click();
    });
  });

  // ===== Stat counter animation =====
  const counters = document.querySelectorAll('[data-count]');
  const seen = new WeakSet();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const animate = (el) => {
    if (seen.has(el)) return;
    seen.add(el);
    const target = parseInt(el.getAttribute('data-count'), 10);
    if (reduceMotion) {
      el.textContent = target.toLocaleString('en-IN');
      return;
    }
    const dur = 1400;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString('en-IN');
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) animate(entry.target);
    });
  }, { threshold: 0.2 });

  counters.forEach((el) => {
    io.observe(el);
    onceVisible(el, 0.2, () => animate(el));
  });

  // ===== Sync stage: interactive Online/Offline demo =====
  // Same behaviour on every screen size — no scroll pinning, the visitor drives
  // it. Offline: bills pile up locally and the links are shown broken. Back
  // online: the queue flushes and all three numbers converge.
  const stage = document.querySelector('.sync-stage');
  if (stage) {
    const el = (id) => document.getElementById(id);
    const app = el('sync-app'), cloud = el('sync-cloud'), phone = el('sync-phone');
    const link1 = el('sync-link-1'), link2 = el('sync-link-2');
    const appTotal = el('sync-app-total'), cloudTotal = el('sync-cloud-total'), phoneTotal = el('sync-phone-total');
    const appState = el('sync-app-state'), appStateText = el('sync-app-state-text');
    const cloudStatus = el('sync-status-cloud'), phoneDelta = el('sync-phone-delta');
    const billList = el('sync-bill-list'), phoneRows = el('sync-phone-rows');
    const raiseBtn = el('sync-raise');
    const segs = stage.parentElement.querySelectorAll('.sync-seg-opt');

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fmt = (n) => '₹' + n.toLocaleString('en-IN');
    const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));

    const BILLS = [
      { party: 'Shree Krishna Traders', amt: 640 },
      { party: 'Patel Engineering', amt: 1280 },
      { party: 'Shah Textiles', amt: 2340 },
      { party: 'Jadeja Steel', amt: 960 },
      { party: 'Rajkot Hardware', amt: 1750 },
    ];

    let online = true;
    let invoiceNo = 2040;
    let deskTotal = 42850;
    let syncedTotal = 42850;
    let queue = [];
    let busy = false;
    let billIndex = 0;

    const paintState = () => {
      appTotal.textContent = fmt(deskTotal);
      cloudTotal.textContent = fmt(syncedTotal);
      phoneTotal.textContent = fmt(syncedTotal);

      const behind = deskTotal - syncedTotal;

      appState.classList.toggle('is-offline', !online);
      appState.classList.toggle('is-online', online);
      appStateText.textContent = online
        ? (behind > 0 ? `Online · syncing ${fmt(behind)}…` : 'Online · everything synced')
        : (queue.length ? `Offline · ${queue.length} bill${queue.length > 1 ? 's' : ''} queued` : 'Offline · billing continues');

      link1.classList.toggle('blocked', !online);
      link2.classList.toggle('blocked', false);
      phone.classList.toggle('is-stale', !online && queue.length > 0);

      phoneDelta.textContent = behind > 0 ? `${fmt(behind)} not synced yet` : 'Live · matches desktop';
      phoneDelta.style.color = behind > 0 ? '#C67A1F' : '#1C9E5A';

      cloudStatus.textContent = behind > 0 && !online ? 'Waiting for desktop' : 'Synced ✓';
      cloudStatus.classList.toggle('syncing', behind > 0 && !online);
    };

    const addBillRow = (bill) => {
      const row = document.createElement('div');
      row.className = 'sync-bill-row fresh' + (online ? '' : ' queued');
      row.setAttribute('data-inv', bill.no);
      row.innerHTML =
        `<span>${bill.party} · INV-${bill.no}${online ? '' : '<span class="sync-bill-queued-tag">queued</span>'}</span>` +
        `<span class="sync-bill-amt">${fmt(bill.amt)}</span>`;
      billList.prepend(row);
      while (billList.children.length > 4) billList.lastElementChild.remove();
      return row;
    };

    const addPhoneRow = (bill) => {
      const row = document.createElement('div');
      row.className = 'sync-phone-row';
      row.innerHTML = `<span>${bill.party.split(' ')[0]} ${bill.party.split(' ')[1] || ''}</span><b>${fmt(bill.amt)}</b>`;
      phoneRows.prepend(row);
      while (phoneRows.children.length > 3) phoneRows.lastElementChild.remove();
    };

    const flow = async (link, node) => {
      link.classList.add('flowing');
      await wait(760);
      link.classList.remove('flowing');
      node.classList.add('pulse');
      await wait(420);
      node.classList.remove('pulse');
    };

    // Push one queued bill up to the cloud, then out to the phone.
    const push = async (bill) => {
      cloudStatus.textContent = 'Syncing…';
      cloudStatus.classList.add('syncing');
      await flow(link1, cloud);
      syncedTotal += bill.amt;
      cloudTotal.textContent = fmt(syncedTotal);
      await flow(link2, phone);
      addPhoneRow(bill);
      phoneTotal.textContent = fmt(syncedTotal);
      phoneTotal.classList.add('bump');
      setTimeout(() => phoneTotal.classList.remove('bump'), 520);
      // This bill is no longer queued — clear its badge as it lands.
      const row = billList.querySelector(`.sync-bill-row[data-inv="${bill.no}"]`);
      if (row) {
        row.classList.remove('queued');
        const tag = row.querySelector('.sync-bill-queued-tag');
        if (tag) tag.remove();
      }
      paintState();
    };

    const flush = async () => {
      while (queue.length) await push(queue.shift());
      billList.querySelectorAll('.sync-bill-row.queued').forEach((r) => {
        r.classList.remove('queued');
        const tag = r.querySelector('.sync-bill-queued-tag');
        if (tag) tag.remove();
      });
      paintState();
    };

    const lock = async (fn) => {
      if (busy) return;
      busy = true;
      raiseBtn.disabled = true;
      try { await fn(); } finally {
        busy = false;
        raiseBtn.disabled = false;
      }
    };

    const setConn = (next) => {
      if (next === online) return Promise.resolve();
      online = next;
      segs.forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute('data-conn') === (online ? 'online' : 'offline'))));
      paintState();
      return online && queue.length ? lock(flush) : Promise.resolve();
    };

    const raise = () => lock(async () => {
      const src = BILLS[billIndex % BILLS.length];
      billIndex += 1;
      const bill = { party: src.party, amt: src.amt, no: ++invoiceNo };
      deskTotal += bill.amt;
      addBillRow(bill);
      app.classList.add('pulse');
      appTotal.textContent = fmt(deskTotal);
      await wait(340);
      app.classList.remove('pulse');
      paintState();
      if (online) await push(bill);
      else queue.push(bill);
      paintState();
    });

    raiseBtn.addEventListener('click', raise);

    segs.forEach((btn) => {
      btn.addEventListener('click', () => setConn(btn.getAttribute('data-conn') === 'online'));
    });

    paintState();

    /* ---- Scripted three-beat demo ----
       Plays once when the section first comes into view: a bill synced online,
       a bill queued offline, then the queue flushing on reconnect. Any touch of
       the controls hands over immediately and it never plays again. */
    let userTook = false;
    const chip = document.getElementById('sync-demo-chip');
    const handOver = () => {
      if (userTook) return;
      userTook = true;
      if (chip) chip.hidden = true;
    };
    ['pointerdown', 'keydown'].forEach((ev) => stage.parentElement.addEventListener(ev, handOver));

    /* If the tab is hidden mid-demo the remaining beats get throttled by the
       browser and could be minutes late — end the demo and settle on a clean
       synced state so nobody comes back to a half-offline stage. */
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && !userTook) {
        handOver();
        setConn(true);
      }
    });

    const playDemo = async () => {
      if (chip) chip.hidden = false;
      const beat = async (ms, fn) => {
        await wait(ms);
        if (userTook) throw 'handed over';
        await fn();
        if (userTook) throw 'handed over';
      };
      try {
        await beat(700, raise);            // 1 — online: lands on every device
        await beat(1100, () => setConn(false));
        await beat(600, raise);            // 2 — offline: queues locally
        await beat(1500, () => setConn(true)); // 3 — reconnect: queue flushes
      } catch (e) {
        /* user took over mid-demo — leave the stage exactly as it is */
      }
      if (chip) chip.hidden = true;
    };

    // Under reduced-motion the demo would flash through with no legibility, so
    // the visitor drives it themselves instead.
    if (!reduce) onceVisible(stage, 0.4, () => { if (!userTook) playDemo(); });
  }

  // ===== Support contact form =====
  const supportForm = document.getElementById('support-form');
  if (supportForm) {
    const succeed = () => {
      const success = document.createElement('div');
      success.className = 'form-success';
      success.textContent = 'Thanks — your ticket has been noted. Our team will reach out shortly.';
      supportForm.parentElement.replaceChild(success, supportForm);
    };

    supportForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = new FormData(supportForm);
      const submit = supportForm.querySelector('.btn-submit');
      submit.disabled = true;
      submit.textContent = 'Sending…';

      // No endpoint configured yet — hand the ticket to WhatsApp so the
      // lead is never silently dropped.
      if (!CONFIG.formEndpoint) {
        const lines = [...data.entries()].filter(([, v]) => String(v).trim()).map(([k, v]) => `${k}: ${v}`);
        open(wa('SorathERP support request\n\n' + lines.join('\n')));
        succeed();
        return;
      }

      try {
        const res = await fetch(CONFIG.formEndpoint, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: data,
        });
        if (!res.ok) throw new Error(res.status);
        succeed();
      } catch (err) {
        submit.disabled = false;
        submit.textContent = 'Submit ticket';
        let msg = supportForm.querySelector('.form-error');
        if (!msg) {
          msg = document.createElement('div');
          msg.className = 'form-error';
          supportForm.appendChild(msg);
        }
        msg.innerHTML =
          `Sorry — that didn't send. Please call <a href="tel:${CONFIG.phone}">${CONFIG.phone}</a> ` +
          `or <a href="${wa('Hi, I need help with SorathERP.')}" target="_blank" rel="noopener">message us on WhatsApp</a>.`;
      }
    });
  }
})();
