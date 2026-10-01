/* FitFind landing page: tap the outfit in the hero and it runs the app's scan. */

(() => {
    "use strict";

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

    // Products from the app's onboarding. Boxes and pill positions are in % of the photo.
    const PHOTO = { src: "./img/look-hero.jpg", aspect: 941 / 1672 };
    const PIECES = [
        { cat: "Cap", desc: "Green fitted baseball cap with a small white logo", name: "Green fitted cap", shop: "New Era", img: "cap", box: [27, 14, 24, 8], pill: [39, 12.5] },
        { cat: "Jacket", desc: "Mustard cotton work jacket with a printed chest logo", name: "Central Park Jacket", shop: "Bode", img: "jacket", box: [30, 24, 51, 28], pill: [45, 40] },
        { cat: "Trousers", desc: "Light-wash baggy jeans with a wallet chain", name: "Baggy washed jeans", shop: "Weekday", img: "jeans", box: [35, 51, 34, 41], pill: [52, 70] },
        { cat: "Shoes", desc: "White leather sneakers with black stripes and a gum sole", name: "adidas Samba OG", shop: "adidas", img: "shoes", box: [35, 91.5, 30, 6], pill: [50, 94.5] },
    ];

    const STEPS = ["Scanning the photo", "Finding the pieces", "Searching shops", "Comparing matches"];
    const COMPARE_MS = 2600;

    // ─── Scanner: idle → finding → boxes → comparing → done ───
    const fig = $("[data-look]");
    const panel = $("[data-panel]");
    const scanBtn = $("[data-scan]");

    fig.style.aspectRatio = PHOTO.aspect;
    fig.dataset.state = "idle";

    fig.insertAdjacentHTML("beforeend", `
        <div class="look-shade"></div>
        <div class="look-shimmer"></div>
        <p class="look-finding"><span class="spinner"></span>Finding the pieces</p>
        <div class="look-boxes">${PIECES.map((p, i) => `
            <span class="box" data-i="${i}"
                style="--x:${p.box[0]}%;--y:${p.box[1]}%;--w:${p.box[2]}%;--h:${p.box[3]}%;--pl:${((p.pill[0] - p.box[0]) / p.box[2]) * 100}%;--pt:${((p.pill[1] - p.box[1]) / p.box[3]) * 100}%;--d:${i * 90}ms"
                ><span class="box-pill"><i></i>${p.cat}</span></span>`).join("")}
        </div>`);

    const boxes = $$(".box", fig);

    function renderComparing() {
        panel.innerHTML = `
            <div class="panel-card">
                <p class="cmp-head"><b>Comparing matches</b><span data-pct>0%</span></p>
                <div class="cmp-bar"><i data-bar></i></div>
                <ul class="cmp-steps">${STEPS.map((t) => `<li>${t}</li>`).join("")}</ul>
            </div>`;
    }

    // Laid out like the app's result list: category, description, then the match card.
    function renderDone(secs) {
        panel.innerHTML = `
            <div class="panel-card panel-card--done">
                <div class="done-head">
                    <span class="done-thumb" style="background-image:url(${PHOTO.src})"></span>
                    <p><b>${PIECES.length} pieces</b><span>Scanned just now · ${secs}s</span></p>
                </div>
                <ul class="results">${PIECES.map((p, i) => `
                    <li class="result" data-i="${i}">
                        <p class="result-cat">${p.cat}</p>
                        <p class="result-desc">${p.desc}</p>
                        <div class="result-card">
                            <span class="result-thumb" style="background-image:url(./img/p-${p.img}.jpg)"></span>
                            <span class="result-text"><strong>${p.name}</strong><small>${p.shop}</small></span>
                            <svg class="result-chev" viewBox="0 0 8 14" aria-hidden="true"><path d="M1.5 1.5 6.5 7l-5 5.5"/></svg>
                        </div>
                    </li>`).join("")}
                </ul>
            </div>`;
        // Hovering a result lights up its box.
        $$(".result", panel).forEach((row) => {
            const box = boxes[+row.dataset.i];
            row.addEventListener("mouseenter", () => box.classList.add("is-hot"));
            row.addEventListener("mouseleave", () => box.classList.remove("is-hot"));
        });
    }

    // One smooth run from 0 to 100%; each step ticks off as the bar passes it.
    function runProgress() {
        const steps = $$(".cmp-steps li", panel);
        const bar = $("[data-bar]", panel);
        const pct = $("[data-pct]", panel);
        return new Promise((resolve) => {
            const t0 = performance.now();
            const frame = (now) => {
                const t = reduce ? 1 : Math.min(1, (now - t0) / COMPARE_MS);
                const v = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2; // ease in-out
                bar.style.width = `${v * 100}%`;
                pct.textContent = `${Math.round(v * 100)}%`;
                steps.forEach((s, i) => s.classList.toggle("is-done", v >= (i + 1) / steps.length - 0.001));
                if (t < 1) requestAnimationFrame(frame); else resolve();
            };
            requestAnimationFrame(frame);
        });
    }

    async function start() {
        if (fig.dataset.state !== "idle") return;
        const t0 = performance.now();
        hideReticle();
        $("[data-try]")?.classList.add("is-gone");
        scanBtn.disabled = true;
        fig.dataset.state = "finding";
        await wait(1400);
        fig.dataset.state = "boxes";
        scanBtn.classList.add("is-gone");
        await wait(600);
        fig.dataset.state = "comparing";
        renderComparing();
        await runProgress();
        await wait(250);
        fig.dataset.state = "done";
        renderDone(Math.max(3, Math.round((performance.now() - t0) / 1000)));
    }

    scanBtn.addEventListener("click", start);
    fig.addEventListener("click", start);

    // ─── Reticle: the scan brackets follow the pointer over the photo ───
    const reticle = $("[data-reticle]");
    function hideReticle() { reticle.classList.remove("is-on"); }

    if (finePointer) {
        let rx = 0, ry = 0, tx = 0, ty = 0, raf = 0;
        const loop = () => {
            rx += (tx - rx) * (reduce ? 1 : 0.28);
            ry += (ty - ry) * (reduce ? 1 : 0.28);
            reticle.style.transform = `translate(${rx}px, ${ry}px)`;
            raf = Math.abs(tx - rx) + Math.abs(ty - ry) > 0.3 ? requestAnimationFrame(loop) : 0;
        };
        fig.addEventListener("pointermove", (e) => {
            const idle = fig.dataset.state === "idle";
            reticle.classList.toggle("is-on", idle);
            fig.classList.toggle("has-reticle", idle);
            tx = e.clientX; ty = e.clientY;
            if (!reticle.classList.contains("was-on")) { rx = tx; ry = ty; reticle.classList.add("was-on"); }
            if (!raf) raf = requestAnimationFrame(loop);
        });
        fig.addEventListener("pointerleave", () => {
            hideReticle();
            reticle.classList.remove("was-on");
        });
    }

    // ─── Social flow: the phone follows the step you're reading ───
    const screens = $$("[data-screens] img");
    const steps = $$(".flow-step");
    const stepIO = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (!e.isIntersecting) return;
            const n = +e.target.dataset.step;
            steps.forEach((s) => s.classList.toggle("is-on", s === e.target));
            screens.forEach((img, i) => img.classList.toggle("is-on", i === n));
        });
    }, { rootMargin: "-45% 0px -45% 0px" });
    steps.forEach((s) => stepIO.observe(s));

    // Comments pile in one by one, then FitFind answers.
    new IntersectionObserver(([e], io) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        io.disconnect();
    }, { threshold: 0.35 }).observe($("[data-comments]"));

    // ─── Bar turns dark over the dark ending ───
    const bar = $(".bar");
    const dark = $$(".final, .foot");
    const darkIO = new IntersectionObserver((entries) => {
        entries.forEach((e) => e.target.classList.toggle("is-under-bar", e.isIntersecting));
        bar.classList.toggle("is-dark", dark.some((el) => el.classList.contains("is-under-bar")));
    }, { rootMargin: `0px 0px -${innerHeight - 40}px 0px` });
    dark.forEach((el) => darkIO.observe(el));

    // ─── Reveal on scroll ───
    const revealIO = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (!e.isIntersecting) return;
            e.target.classList.add("is-in");
            revealIO.unobserve(e.target);
        });
    }, { threshold: 0.15 });
    $$(".final-copy, .how-head, .social-head").forEach((el) => revealIO.observe(el));
})();
