(function () {
  "use strict";

  var GTM_ID = "GTM-XXXXXXX";
  var META_PIXEL_ID = "TODO_META_PIXEL_ID";
  var GTM_PLACEHOLDER = "GTM-XXXXXXX";
  var META_PLACEHOLDER = "TODO_META_PIXEL_ID";
  var reduceMotionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
  var coarsePointerMedia = window.matchMedia("(pointer: coarse)");

  function hasConfiguredGtmId() {
    return Boolean(GTM_ID && GTM_ID !== GTM_PLACEHOLDER);
  }

  function hasConfiguredMetaPixelId() {
    return Boolean(META_PIXEL_ID && META_PIXEL_ID !== META_PLACEHOLDER);
  }

  function bootTrackingTags() {
    var shouldBootGtm = hasConfiguredGtmId();
    var shouldBootMeta = hasConfiguredMetaPixelId();

    if (!shouldBootGtm && !shouldBootMeta) return;

    window.dataLayer = window.dataLayer || [];

    if (shouldBootGtm) {
      var hasGtm = Array.prototype.some.call(
        document.querySelectorAll("script[src]"),
        function (node) {
          return (node.getAttribute("src") || "").indexOf("googletagmanager.com/gtm.js") !== -1;
        }
      );

      if (!hasGtm) {
        var gtmScript = document.createElement("script");
        gtmScript.async = true;
        gtmScript.src = "https://www.googletagmanager.com/gtm.js?id=" + GTM_ID;
        document.head.appendChild(gtmScript);
      }
    }

    if (shouldBootMeta && typeof window.fbq !== "function") {
      !(function (f, b, e, v, n, t, s) {
        if (f.fbq) return;
        n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = true;
        n.version = "2.0";
        n.queue = [];
        t = b.createElement(e);
        t.async = true;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

      window.fbq("init", META_PIXEL_ID);
      window.fbq("track", "PageView");
    }
  }

  function scheduleTrackingBoot() {
    if (!hasConfiguredGtmId() && !hasConfiguredMetaPixelId()) return;

    var booted = false;
    var bootOnce = function () {
      if (booted) return;
      booted = true;
      bootTrackingTags();
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(bootOnce, { timeout: 2500 });
    } else {
      window.setTimeout(bootOnce, 1800);
    }

    ["click", "scroll", "touchstart", "keydown"].forEach(function (eventName) {
      window.addEventListener(eventName, bootOnce, { passive: true, once: true });
    });
  }

  function payload(extra) {
    var base = {
      lang: document.documentElement.lang || "es-CO",
      page_path: window.location.pathname
    };

    return extra ? Object.assign(base, extra) : base;
  }

  function pushEvent(name, data) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: name }, data || {}));

    if (typeof window.fbq === "function") {
      window.fbq("trackCustom", name, data || {});
    }
  }

  function bindTrackedLinks() {
    document.querySelectorAll("a[data-track]").forEach(function (link) {
      link.addEventListener("click", function (event) {
        var kind = link.getAttribute("data-track") || "unknown";
        var href = link.getAttribute("href") || "";
        var data = payload({ cta_kind: kind, destination: href });

        if (kind === "whatsapp") {
          event.preventDefault();
          pushEvent("cta_whatsapp_click", data);
          setTimeout(function () {
            window.location.href = href;
          }, 120);
          return;
        }

        if (kind === "call") {
          pushEvent("cta_call_click", data);
          return;
        }

        pushEvent("cta_click", data);
      });
    });
  }

  function bindForms() {
    document.querySelectorAll("form.contact-form").forEach(function (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();

        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }

        var data = new FormData(form);
        var interest = data.get("interes") || data.get("interest") || "unspecified";

        pushEvent("cta_form_submit", payload({ interest: interest }));

        var status = form.querySelector(".form-status");
        if (status) {
          status.textContent =
            form.getAttribute("data-success-message") ||
            "Gracias. Recibimos tu información y te responderemos pronto.";
        }

        form.reset();
      });
    });
  }

  function setYear() {
    document.querySelectorAll("[data-current-year]").forEach(function (node) {
      node.textContent = String(new Date().getFullYear());
    });
  }

  function createRafThrottled(handler) {
    var scheduled = false;

    return function () {
      if (document.hidden) return;
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(function () {
        scheduled = false;
        if (document.hidden) return;
        handler();
      });
    };
  }

  function shouldUseHeroParallax() {
    return false;
  }

  function shouldUseSectionParallax() {
    return window.innerWidth > 768;
  }

  function setNavbarState() {
    var nav = document.getElementById("tmNav");
    if (!nav) return;

    if (window.scrollY > 120) {
      nav.classList.add("scroll");
    } else {
      nav.classList.remove("scroll");
    }
  }

  function bindNavbarScroll() {
    setNavbarState();
    var onFrame = createRafThrottled(setNavbarState);
    window.addEventListener("scroll", onFrame, { passive: true });
    window.addEventListener("resize", onFrame);
  }

  function bindMobileNavClose() {
    var nav = document.getElementById("tmNav");
    if (!nav) return;

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        var collapse = document.querySelector(".navbar-collapse.show");
        if (collapse) {
          collapse.classList.remove("show");
        }
      });
    });
  }

  function getOffSet() {
    var offset = 450;
    var windowHeight = window.innerHeight;

    if (windowHeight > 500) offset = 400;
    if (windowHeight > 680) offset = 300;
    if (windowHeight > 830) offset = 210;

    return offset;
  }

  function bindParallax() {
    var hero = document.querySelector(".tm-parallax");

    if (!hero) return;

    var update = function () {
      if (!shouldUseHeroParallax()) return;
      // Match template: background_image_parallax($(".tm-parallax"), 0.30)
      var yPos = Math.round(0.7 * window.scrollY - getOffSet());
      hero.style.backgroundPosition = "center " + yPos + "px";
    };

    window.addEventListener("scroll", update, { passive: true });
    // Match template resize behavior (force set once on resize).
    window.addEventListener("resize", update);
  }

  function bindSectionParallax() {
    var sections = Array.prototype.slice.call(document.querySelectorAll(".tm-parallax-2"));

    if (!sections.length) return;

    sections.forEach(function (section) {
      section.style.backgroundAttachment = "fixed";
    });

    var update = function () {
      var pos = window.scrollY;

      sections.forEach(function (section) {
        if (!shouldUseSectionParallax()) {
          section.style.backgroundPosition = "center";
          return;
        }

        // Match template: background_image_parallax_2($object, 0.80)
        var firstTop = section.offsetTop;
        var yPos = Math.round(0.2 * (firstTop - pos) - 186);
        section.style.backgroundPosition = "center " + yPos + "px";
      });
    };

    window.addEventListener("scroll", update, { passive: true });
  }

  function bindTemplateMediaSections() {
    if (!window.jQuery) return;
    var $ = window.jQuery;

    if ($.fn.slick && $(".tm-testimonials-carousel").length) {
      $(".tm-testimonials-carousel").each(function () {
        var $carousel = $(this);
        if ($carousel.hasClass("slick-initialized")) return;

        $carousel.slick({
          dots: true,
          prevArrow: false,
          nextArrow: false,
          infinite: false,
          slidesToShow: 3,
          slidesToScroll: 1,
          responsive: [
            { breakpoint: 992, settings: { slidesToShow: 2 } },
            { breakpoint: 768, settings: { slidesToShow: 2 } },
            { breakpoint: 480, settings: { slidesToShow: 1 } }
          ]
        });
      });
    }
  }

  function bindRevealElements() {
    var revealNodes = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));

    if (!revealNodes.length) return;

    document.documentElement.classList.add("tm-js");

    if (!("IntersectionObserver" in window)) {
      revealNodes.forEach(function (node) {
        node.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );

    revealNodes.forEach(function (node) {
      observer.observe(node);
    });
  }

  function bindHeavyEffectMediaChanges() {
    var refresh = function () {
      window.dispatchEvent(new Event("resize"));
    };

    if (typeof reduceMotionMedia.addEventListener === "function") {
      reduceMotionMedia.addEventListener("change", refresh);
      coarsePointerMedia.addEventListener("change", refresh);
    } else if (typeof reduceMotionMedia.addListener === "function") {
      // Safari < 14 fallback.
      reduceMotionMedia.addListener(refresh);
      coarsePointerMedia.addListener(refresh);
    }
  }

  function bindLightweightPageVisibilitySync() {
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) {
        window.dispatchEvent(new Event("resize"));
      }
    });
  }

  function bindTouchScrollOptimization() {
    if (!coarsePointerMedia.matches) return;
    document.documentElement.classList.add("tm-touch-device");
  }

  function bindSlowHardwareOptimization() {
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) {
      document.documentElement.classList.add("tm-low-power-device");
    }
  }

  function bindPerformanceHelpers() {
    bindHeavyEffectMediaChanges();
    bindLightweightPageVisibilitySync();
    bindTouchScrollOptimization();
    bindSlowHardwareOptimization();
  }

  function init() {
    scheduleTrackingBoot();
    bindPerformanceHelpers();
    bindTrackedLinks();
    bindForms();
    setYear();
    bindRevealElements();
    bindNavbarScroll();
    bindMobileNavClose();
    bindParallax();
    bindSectionParallax();
    bindTemplateMediaSections();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
