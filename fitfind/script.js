(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SCAN_MS = 5200;
  const HOLD_MS = 8500;

  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  const hero = document.getElementById("scan-demo");
  if (hero) {
    if (reduce) {
      hero.classList.add("is-found");
    } else {
      const run = () => {
        hero.classList.remove("is-found", "is-scanning");
        void hero.offsetWidth;
        hero.classList.add("is-scanning");
        window.setTimeout(() => {
          hero.classList.remove("is-scanning");
          hero.classList.add("is-found");
        }, SCAN_MS);
      };
      run();
      window.setInterval(run, SCAN_MS + HOLD_MS);
    }
  }

  const sharePhone = document.getElementById("share-demo");
  if (!sharePhone) return;
  const video = sharePhone.querySelector(".tt-video");

  const resetShare = () => {
    sharePhone.classList.remove("is-sharehot", "is-sheet", "is-pick", "is-scanning", "is-found");
    if (video) {
      video.play().catch(() => {});
    }
  };

  const runShare = async () => {
    resetShare();
    if (reduce) {
      sharePhone.classList.add("is-found");
      if (video) video.pause();
      return;
    }

    await sleep(700);
    sharePhone.classList.add("is-sharehot");
    await sleep(1100);
    sharePhone.classList.remove("is-sharehot");
    sharePhone.classList.add("is-sheet");
    await sleep(900);
    sharePhone.classList.add("is-pick");
    await sleep(800);
    sharePhone.classList.remove("is-sheet", "is-pick");
    if (video) video.pause();
    await sleep(320);
    sharePhone.classList.remove("is-scanning");
    void sharePhone.offsetWidth;
    sharePhone.classList.add("is-scanning");
    await sleep(SCAN_MS);
    sharePhone.classList.remove("is-scanning");
    sharePhone.classList.add("is-found");
    await sleep(HOLD_MS);
  };

  let loop;
  const start = () => {
    if (loop) return;
    const tick = async () => {
      await runShare();
      if (!reduce) loop = window.setTimeout(tick, 400);
    };
    tick();
  };

  const io = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) start();
  }, { threshold: 0.35 });
  io.observe(sharePhone);
})();
