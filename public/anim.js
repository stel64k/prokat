/*
 * Motion layer (Phase 1).
 * Uses GSAP when it is available and the user has not requested reduced motion.
 * Every helper degrades to a no-op so the app keeps working if vendor files are missing.
 */
(function () {
  function gsapReady() { return typeof window.gsap !== 'undefined'; }
  function reduced() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }
  function enabled() { return gsapReady() && !reduced(); }

  function moneyHTML(v) {
    var n = Number(v) || 0;
    return '<span class="money-anim" data-value="' + n + '">' + money(n) + '</span>';
  }

  var MOTION = {
    enabled: enabled,

    modalIn: function (root) {
      if (!enabled()) { root.style.opacity = ''; return; }
      var modal = root.querySelector('.modal');
      gsap.killTweensOf(root);
      if (modal) gsap.killTweensOf(modal);
      gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.18, ease: 'power1.out' });
      if (modal) {
        gsap.fromTo(modal,
          { y: 14, scale: 0.97, opacity: 0 },
          { y: 0, scale: 1, opacity: 1, duration: 0.24, ease: 'power2.out', clearProps: 'transform' });
      }
      MOTION.countUpAll(root.querySelector('.modal'));
    },

    modalOut: function (root, done) {
      if (!enabled()) { done(); return; }
      var modal = root.querySelector('.modal');
      if (!modal) { done(); return; }
      gsap.killTweensOf(root);
      gsap.killTweensOf(modal);
      gsap.to(root, { opacity: 0, duration: 0.16, ease: 'power1.in' });
      gsap.to(modal, {
        y: 10, scale: 0.98, opacity: 0, duration: 0.16, ease: 'power1.in',
        onComplete: done
      });
    },

    countUpAll: function (root) {
      if (!enabled() || !root) return;
      var els = root.querySelectorAll('.money-anim[data-value]');
      Array.prototype.forEach.call(els, function (el) {
        var to = Number(el.getAttribute('data-value')) || 0;
        if (!to) return;
        var box = { v: 0 };
        el.textContent = money(0);
        gsap.to(box, {
          v: to, duration: 0.55, ease: 'power2.out',
          onUpdate: function () { el.textContent = money(box.v); }
        });
      });
    },

    reveal: function (container, selector, opts) {
      if (!enabled() || !container) return;
      opts = opts || {};
      var els = Array.prototype.slice.call(container.querySelectorAll(selector));
      if (opts.limit && els.length > opts.limit) els = els.slice(0, opts.limit);
      if (!els.length) return;
      gsap.fromTo(els,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: opts.duration || 0.3, ease: 'power2.out', stagger: opts.stagger || 0.03, overwrite: 'auto', clearProps: 'transform,opacity' });
    },

    flipCapture: function (root, selector) {
      if (!enabled() || typeof window.Flip === 'undefined' || !root) return null;
      var els = Array.prototype.slice.call(root.querySelectorAll(selector));
      if (!els.length) return null;
      return Flip.getState(els, { props: 'opacity' });
    },

    flipPlay: function (state) {
      if (!enabled() || typeof window.Flip === 'undefined' || !state) return;
      if (!state.targets || !state.targets.length) return;
      Flip.from(state, {
        duration: 0.4, ease: 'power2.out', absolute: true, stagger: 0.02,
        onEnter: function (els) {
          return gsap.fromTo(els, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' });
        },
        onLeave: function (els) {
          return gsap.to(els, { opacity: 0, scale: 0.96, duration: 0.22, ease: 'power1.in' });
        }
      });
    },

    pulse: function (el) {
      if (!enabled() || !el) return false;
      gsap.fromTo(el,
        { boxShadow: '0 0 0 3px rgba(22,163,74,.85)' },
        { boxShadow: '0 0 0 0 rgba(22,163,74,0)', duration: 1.1, ease: 'power2.out', clearProps: 'boxShadow' });
      return true;
    },

    toastIn: function (el) {
      if (!el) return;
      if (!enabled()) { el.style.opacity = '1'; return; }
      gsap.killTweensOf(el);
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.22, ease: 'power2.out' });
    },

    toastOut: function (el, done) {
      if (!el) { done(); return; }
      if (!enabled()) { done(); return; }
      gsap.killTweensOf(el);
      gsap.to(el, { opacity: 0, duration: 0.18, ease: 'power1.in', onComplete: done });
    }
  };

  window.MOTION = MOTION;
  window.moneyHTML = moneyHTML;
})();
