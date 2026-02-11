(function () {
  'use strict';

  var SHELL_ID = 'caseStudyModalShell';
  var CONTENT_ID = 'caseStudyModalContent';
  var currentModal = null;
  var cache = {};

  // Lazy-create the single modal shell
  function ensureShell() {
    var shell = document.getElementById(SHELL_ID);
    if (shell) return shell;

    shell = document.createElement('div');
    shell.id = SHELL_ID;
    shell.style.cssText =
      'display:none;position:fixed;z-index:1000;left:0;top:0;width:100%;height:100%;' +
      'overflow:auto;background-color:rgba(0,0,0,0.7);align-items:center;justify-content:center;';

    var inner = document.createElement('div');
    inner.style.cssText =
      'background-color:#1f1f1f;color:#e0e0e0;margin:auto;padding:20px;border-radius:20px;' +
      'width:90%;max-width:900px;position:relative;top:20px;border:2px solid #00ffaa;' +
      'box-shadow:0 4px 20px rgba(0,0,0,0.5),0 0 8px #00aaff,0 0 12px #aa00ff;';

    var closeBtn = document.createElement('span');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText =
      'color:#aaa;float:right;font-size:28px;font-weight:bold;cursor:pointer;' +
      'position:absolute;top:10px;right:20px;';
    closeBtn.addEventListener('click', closeModal);

    var content = document.createElement('div');
    content.id = CONTENT_ID;

    inner.appendChild(closeBtn);
    inner.appendChild(content);
    shell.appendChild(inner);
    document.body.appendChild(shell);

    // Backdrop click
    shell.addEventListener('click', function (e) {
      if (e.target === shell) closeModal();
    });

    return shell;
  }

  /* ── Close & cleanup ───────────────────────────────────── */
  function closeModal() {
    var shell = document.getElementById(SHELL_ID);
    if (!shell) return;
    shell.style.display = 'none';
    document.body.style.overflow = '';
    resetAllMedia();
    currentModal = null;
  }

  function resetAllMedia() {
    var el = document.getElementById(CONTENT_ID);
    if (!el) return;

    // YouTube placeholders – remove injected iframes, restore placeholder
    el.querySelectorAll('[data-youtube-id]').forEach(function (ph) {
      var container = findIframeContainer(ph);
      if (container) { container.innerHTML = ''; container.style.display = 'none'; }
      ph.style.display = 'block';
    });

    // iframes with data-src
    el.querySelectorAll('iframe[data-src]').forEach(function (f) { f.src = ''; });

    // Any other YouTube iframes that were set dynamically
    el.querySelectorAll('iframe').forEach(function (f) {
      if (f.src && f.src.indexOf('youtube.com') !== -1) f.src = '';
    });

    // Local <video>
    el.querySelectorAll('video').forEach(function (v) {
      v.pause(); v.currentTime = 0;
    });

    // Re-show play overlays (generic pattern: ids ending in PlayOverlay)
    el.querySelectorAll('[id$="PlayOverlay"]').forEach(function (o) { o.style.display = 'flex'; });

    // Sporting-Bet overlay
    var sbo = el.querySelector('#sportingBetOverlay');
    if (sbo) sbo.style.display = 'flex';
  }

  /* ── Find the iframe container sibling of a placeholder ── */
  function findIframeContainer(placeholder) {
    var parent = placeholder.parentElement;
    if (!parent) return null;
    // Look for a sibling div whose id contains "Iframe"
    var children = parent.children;
    for (var i = 0; i < children.length; i++) {
      var id = children[i].id || '';
      if (id.indexOf('Iframe') !== -1 && children[i] !== placeholder) return children[i];
    }
    return null;
  }

  /* ── Video initialisation after content injection ──────── */
  function initVideos() {
    var el = document.getElementById(CONTENT_ID);
    if (!el) return;

    // 1. YouTube placeholders  →  click to play
    el.querySelectorAll('[data-youtube-id]').forEach(function (ph) {
      var ytId = ph.getAttribute('data-youtube-id');
      var container = findIframeContainer(ph);
      if (!container) return;

      ph.style.cursor = 'pointer';
      ph.onclick = function () {
        ph.style.display = 'none';
        container.style.display = 'block';
        container.innerHTML =
          '<iframe width="100%" height="100%" src="https://www.youtube.com/embed/' +
          ytId + '?autoplay=1&rel=0&modestbranding=1" frameborder="0" ' +
          'allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" ' +
          'allowfullscreen style="border-radius:8px"></iframe>';
      };
    });

    // 2. iframes with data-src (Primo Rico, Década, Claro Flamingo)
    el.querySelectorAll('iframe[data-src]').forEach(function (f) {
      f.src = f.getAttribute('data-src');
    });

    // 3. Sporting-Bet pattern (overlay + pre-existing iframe)
    var sbOverlay = el.querySelector('#sportingBetOverlay');
    var sbPlay = el.querySelector('#sportingBetPlayBtn');
    var sbIframe = el.querySelector('#new2CaseStudyVideo');
    if (sbOverlay && sbIframe) {
      var sbUrl = 'https://www.youtube.com/embed/mSS8R5a4IWo?si=5EZ4ZRZAXu83AfYI&start=85&autoplay=1';
      function playSB() { sbIframe.src = sbUrl; sbOverlay.style.display = 'none'; }
      sbOverlay.onclick = playSB;
      if (sbPlay) sbPlay.onclick = function (e) { e.preventDefault(); playSB(); };
    }

    // 4. Local videos with play overlay
    var videoConfigs = [
      { overlay: 'tateMainPlayOverlay', video: 'tateMainVideo' },
      { overlay: 'tateSecondPlayOverlay', video: 'tateSecondVideo' },
      { overlay: 'beloPlayOverlay', video: 'beloCaseStudyVideo' },
      { overlay: 'globoAgroPlayOverlay', video: 'globoAgroVideo' },
      { overlay: 'antartidaClipPlayOverlay', video: 'antartidaClipVideo' },
      { overlay: 'antartidaBrunoPlayOverlay', video: 'antartidaBrunoVideo' }
    ];

    videoConfigs.forEach(function (cfg) {
      var overlay = el.querySelector('#' + cfg.overlay);
      var video = el.querySelector('#' + cfg.video);
      if (!overlay || !video) return;

      overlay.style.cursor = 'pointer';
      overlay.onclick = function () {
        overlay.style.display = 'none';
        video.style.display = 'block';

        var source = video.querySelector('source');
        if (source && source.getAttribute('data-src')) {
          source.src = source.getAttribute('data-src');
          source.removeAttribute('data-src');
          video.load();
        }
        video.play().catch(function () {
          overlay.style.display = 'flex';
          video.style.display = 'none';
        });
      };
    });

    // 5. Instagram embed (Ludmilla)
    var igPlaceholder = el.querySelector('#instagram-embed-placeholder');
    if (igPlaceholder) loadInstagramEmbed(el);
  }

  /* ── Instagram embed helper (moved from inline script) ── */
  function loadInstagramEmbed(root) {
    var container = root.querySelector('#instagram-embed-container');
    var placeholder = root.querySelector('#instagram-embed-placeholder');
    if (!container || container.hasAttribute('data-loaded')) return;
    container.setAttribute('data-loaded', 'true');

    container.innerHTML =
      '<blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/reel/C5woI5XPI_f/" ' +
      'data-instgrm-version="14" style="background:#222;border:0;border-radius:12px;margin:1rem auto;' +
      'max-width:540px;min-width:326px;padding:0;width:calc(100% - 2px);">' +
      '<div style="padding:16px;"><a href="https://www.instagram.com/reel/C5woI5XPI_f/" ' +
      'style="color:#00ffaa;text-decoration:none;" target="_blank">Ver esta publicação no Instagram</a></div></blockquote>';

    if (!document.querySelector('script[src*="instagram.com/embed.js"]')) {
      var s = document.createElement('script');
      s.async = true;
      s.src = '//www.instagram.com/embed.js';
      s.onload = function () { if (window.instgrm) window.instgrm.Embeds.process(); };
      document.head.appendChild(s);
    } else if (window.instgrm) {
      window.instgrm.Embeds.process();
    }

    setTimeout(function () {
      if (placeholder) placeholder.style.display = 'none';
      container.style.display = 'block';
    }, 1000);
  }

  /* ── Open a modal by name ──────────────────────────────── */
  function openModal(name) {
    var shell = ensureShell();
    var contentEl = document.getElementById(CONTENT_ID);
    currentModal = name;

    // Loading spinner
    contentEl.innerHTML =
      '<div style="text-align:center;padding:40px;">' +
      '<i class="fas fa-spinner fa-spin" style="font-size:24px;color:#00ffaa;"></i></div>';
    shell.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    if (cache[name]) {
      inject(name, cache[name], contentEl);
      return;
    }

    fetch('/modals/' + name + '.html')
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.text();
      })
      .then(function (html) {
        cache[name] = html;
        inject(name, html, contentEl);
      })
      .catch(function () {
        if (currentModal === name) {
          contentEl.innerHTML =
            '<div style="text-align:center;padding:40px;color:#ff4444;">' +
            'Erro ao carregar conteúdo. Tente novamente.</div>';
        }
      });
  }

  function inject(name, html, contentEl) {
    if (currentModal !== name) return;
    contentEl.innerHTML = html;
    initVideos();
  }

  /* ── Bootstrap ─────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-modal]').forEach(function (trigger) {
      trigger.style.cursor = 'pointer';
      trigger.addEventListener('click', function () {
        openModal(this.getAttribute('data-modal'));
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && currentModal) closeModal();
    });
  });
})();
