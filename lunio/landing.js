// Lunio landing page: the page is one night. Scrolling moves the clock from
// 23:12 to 08:30. At 00:30 the page stops your scroll until you breathe.
(() => {
    const root = document.documentElement;
    root.classList.add("js");

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const $ = (sel, el = document) => el.querySelector(sel);
    const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

    // Minutes since 22:00, so the night doesn't wrap at midnight.
    const toMin = (hhmm) => {
        const [h, m] = hhmm.split(":").map(Number);
        return ((h + 24 - 22) % 24) * 60 + m;
    };
    const fmt = (min) => {
        const t = Math.round(min) + 22 * 60;
        const h = Math.floor(t / 60) % 24;
        return String(h).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0");
    };
    const lerp = (a, b, k) => a + (b - a) * k;
    const clamp01 = (v) => Math.min(1, Math.max(0, v));

    // ─── Stars ───
    const stars = $(".stars");
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 120; i++) {
        const s = document.createElement("i");
        s.style.left = rand() * 100 + "%";
        s.style.top = rand() * 100 + "%";
        s.style.setProperty("--s", (rand() < 0.85 ? 1 : 2) + rand() * 0.6 + "px");
        s.style.setProperty("--o", (0.25 + rand() * 0.6).toFixed(2));
        if (rand() < 0.3) {
            s.className = "tw";
            s.style.setProperty("--d", (2 + rand() * 4).toFixed(1) + "s");
        }
        frag.appendChild(s);
    }
    stars.appendChild(frag);

    // ─── Clock, sky and moon follow the scroll ───
    const bar = $(".bar");
    const clock = $("[data-clock]");
    const moon = $("[data-moon]");
    const sky = $(".sky");
    const scenes = $$("[data-time]");
    const sun = $(".sun");
    const morning = $(".morning");
    const START = toMin("23:12");
    const END = toMin("08:30");

    // colour and star brightness at points of the night
    const SKY = [
        [toMin("23:12"), [11, 18, 51], 0.35],
        [toMin("00:30"), [5, 9, 34], 0.6],
        [toMin("03:00"), [2, 2, 10], 1],
        [toMin("07:10"), [9, 14, 44], 0.5],
        [toMin("08:30"), [22, 26, 70], 0.1],
    ];

    let anchors = [];
    function measure() {
        const vh = window.innerHeight;
        anchors = scenes.map((el) => ({
            y: Math.max(0, el.getBoundingClientRect().top + window.scrollY - vh * 0.2),
            t: toMin(el.dataset.time),
        }));
        anchors[0].y = 0;
    }

    function timeAt(y) {
        if (y <= anchors[0].y) return anchors[0].t;
        for (let i = 1; i < anchors.length; i++) {
            const a = anchors[i - 1];
            const b = anchors[i];
            if (y < b.y) return lerp(a.t, b.t, (y - a.y) / (b.y - a.y || 1));
        }
        return anchors[anchors.length - 1].t;
    }

    function paintSky(t) {
        let i = 1;
        while (i < SKY.length - 1 && t > SKY[i][0]) i++;
        const [t0, c0, s0] = SKY[i - 1];
        const [t1, c1, s1] = SKY[i];
        const k = clamp01((t - t0) / (t1 - t0));
        const rgb = c0.map((v, j) => Math.round(lerp(v, c1[j], k)));
        sky.style.setProperty("--sky", `rgb(${rgb})`);
        sky.style.setProperty("--stars", lerp(s0, s1, k).toFixed(3));
    }

    let locked = false;
    function render() {
        const t = locked ? toMin("00:30") : timeAt(window.scrollY);
        clock.textContent = fmt(t);
        moon.style.setProperty("--p", clamp01((t - START) / (END - START)).toFixed(4));
        paintSky(t);

        const r = morning.getBoundingClientRect();
        sun.style.setProperty("--rise", clamp01(1 - r.top / window.innerHeight).toFixed(3));
    }

    // ─── Doomscroll phone ───
    const FEED = [
        ["POV: it's 1am and you have work at 8", "@sleepy.dev", "😭", "#ff4f8b", "#7a1fa2", "1.2M"],
        ["wait for the end…", "@catsofnight", "🐈", "#ffb03a", "#e2471f", "884K"],
        ["part 7 of 12, don't skip", "@pasta.lab", "🍝", "#ff6a3d", "#b3123a", "402K"],
        ["nobody: / me at 00:43:", "@just.one.more", "🫠", "#27d3c3", "#1a4fd6", "2.4M"],
        ["3 signs you need sleep (you won't like #2)", "@wellness.ish", "😴", "#8f6bff", "#1c1b6b", "97K"],
        ["day 184 of learning guitar", "@riff.daily", "🎸", "#34c46a", "#0f5c4a", "51K"],
        ["rating every gas station snack", "@snack.court", "🍫", "#ffd23f", "#ff7a00", "1.9M"],
        ["this changed my life (not clickbait)", "@glow.up", "✨", "#ff5fd2", "#5b2bd9", "613K"],
        ["the algorithm knows you", "@for.you.page", "👀", "#3aa0ff", "#0a2a8a", "3.1M"],
    ];
    const feed = $("[data-feed]");
    const doom = $(".doom");
    const tile = ([cap, who, emoji, a, b, likes]) => `
        <div class="tile" style="--a:${a};--b:${b}">
            <p class="tile-top"><span>Following</span><b>For You</b></p>
            <span class="tile-emoji">${emoji}</span>
            <div class="tile-side"><span class="like">${likes}</span><span class="talk">${(parseInt(likes, 10) * 7) % 900 + 12}</span><span class="send">Share</span></div>
            <p class="tile-cap"><b>${who}</b>${cap}</p>
        </div>`;
    // two copies so the loop can jump back without a visible seam
    feed.innerHTML = FEED.concat(FEED).map(tile).join("");

    let idx = 0;
    let swipeTimer = 0;
    let heroVisible = true;
    const setGlow = () => doom.style.setProperty("--glow", FEED[idx % FEED.length][3]);
    setGlow();

    function swipe() {
        idx++;
        feed.style.transform = `translateY(${-idx * 100}%)`;
        setGlow();
        if (idx === FEED.length) {
            setTimeout(() => {
                feed.classList.add("no-anim");
                idx = 0;
                feed.style.transform = "translateY(0)";
                void feed.offsetHeight;
                feed.classList.remove("no-anim");
            }, 600);
        }
    }

    function runFeed() {
        clearInterval(swipeTimer);
        if (reduceMotion || !heroVisible || document.body.classList.contains("is-calm")) return;
        swipeTimer = setInterval(swipe, 1500);
    }

    new IntersectionObserver(([e]) => {
        heroVisible = e.isIntersecting;
        runFeed();
    }).observe($(".hero"));

    // ─── Wind-down: gentle vs hardcore ───
    const mode = $(".mode");
    const modeCopy = $("[data-mode-copy]");
    const MODE_COPY = {
        gentle: "Open a blocked app and Lunio steps in with a short ritual first. If you really need it, you can still get through.",
        hard: "No uninstalling apps. No changing the date and time. No quick detour through Shortcuts. Blocked stays blocked until 08:30.",
    };
    $$("[data-mode]", mode).forEach((btn) => {
        btn.addEventListener("click", () => {
            const m = btn.dataset.mode;
            mode.dataset.mode = m;
            $$("[data-mode]", mode).forEach((b) => b.setAttribute("aria-checked", String(b === btn)));
            modeCopy.textContent = MODE_COPY[m];
        });
    });

    // ─── 00:30: the interception ───
    const intercept = $("#intercept");
    const title = $("[data-intercept-title]");
    const sub = $("[data-intercept-sub]");
    const breatheBtn = $("[data-breathe]");
    const skipBtn = $("[data-skip]");
    let resolved = false;

    // mascot: the Lottie animation from the app
    if (window.lottie) {
        lottie.loadAnimation({
            container: $("[data-face]"),
            renderer: "svg",
            loop: true,
            autoplay: !reduceMotion,
            path: "./assets/face.json",
        });
    }
    let lastY = window.scrollY;

    const blockKeys = ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "];
    const stop = (e) => e.preventDefault();
    const stopKeys = (e) => {
        if (blockKeys.includes(e.key) && !e.target.closest("button, input")) e.preventDefault();
    };

    function lock() {
        if (locked || resolved) return;
        locked = true;
        window.scrollTo({ top: intercept.offsetTop, behavior: "instant" });
        root.classList.add("is-locked");
        bar.classList.add("is-quiet");
        window.addEventListener("wheel", stop, { passive: false });
        window.addEventListener("touchmove", stop, { passive: false });
        window.addEventListener("keydown", stopKeys);
        breatheBtn.focus({ preventScroll: true });
        render();
    }

    function unlock() {
        locked = false;
        resolved = true;
        root.classList.remove("is-locked");
        bar.classList.remove("is-quiet");
        window.removeEventListener("wheel", stop);
        window.removeEventListener("touchmove", stop);
        window.removeEventListener("keydown", stopKeys);
        document.body.classList.add("is-calm");
        runFeed();
        render();
    }

    const next = () => $("#rituals").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });

    breatheBtn.addEventListener("click", () => {
        if (intercept.dataset.state === "done") return next();
        intercept.dataset.state = "breathing";
        const steps = [
            "Breathe in", "Breathe in", "Breathe in", "Breathe in",
            "Breathe out", "Breathe out", "Breathe out", "Breathe out",
        ];
        let s = 0;
        const tick = () => {
            if (s === steps.length) return finish();
            const n = 4 - (s % 4);
            title.innerHTML = `${steps[s]} <span class="count">${n}</span>`;
            sub.textContent = s < 4 ? "Slowly, through your nose." : "Let it all go.";
            s++;
            setTimeout(tick, 1000);
        };
        tick();
    });

    function finish() {
        intercept.dataset.state = "done";
        title.textContent = "Better, right?";
        sub.textContent = "Eight seconds and the pull is already weaker. Lunio does this every time you reach for a blocked app after bedtime.";
        breatheBtn.textContent = "Continue";
        skipBtn.hidden = true;
        unlock();
    }

    skipBtn.addEventListener("click", () => {
        title.textContent = "Fair enough.";
        sub.textContent = "In Hardcore mode, Lunio wouldn't let you off that easily.";
        breatheBtn.textContent = "Continue";
        intercept.dataset.state = "done";
        skipBtn.hidden = true;
        unlock();
        next();
    });

    // ─── Three good things ───
    const good = $("[data-good]");
    const inputs = $$("input", good);
    const save = $("button[type=submit]", good);
    const week = $$(".streak-week li", good);
    week[(new Date().getDay() + 6) % 7].classList.add("is-today");

    inputs.forEach((i) => i.addEventListener("input", () => {
        save.disabled = !inputs.every((x) => x.value.trim());
    }));
    good.addEventListener("submit", (e) => {
        e.preventDefault();
        try { localStorage.setItem("lunio-good", JSON.stringify(inputs.map((i) => i.value.trim()))); } catch {}
        good.classList.add("is-saved");
    });
    $("[data-good-reset]").addEventListener("click", () => {
        inputs.forEach((i) => (i.value = ""));
        save.disabled = true;
        good.classList.remove("is-saved");
        inputs[0].focus();
    });

    // ─── Soundscapes ───
    const sounds = $("#sounds");
    const tracks = {};
    let playing = null;

    function fade(audio, to, ms, done) {
        const from = audio.volume;
        const t0 = performance.now();
        const step = (now) => {
            const k = Math.min(1, (now - t0) / ms);
            audio.volume = from + (to - from) * k;
            if (k < 1) requestAnimationFrame(step);
            else if (done) done();
        };
        requestAnimationFrame(step);
    }

    function stopSound() {
        if (!playing) return;
        const a = tracks[playing];
        fade(a, 0, 600, () => a.pause());
        $(`[data-sound="${playing}"]`).setAttribute("aria-pressed", "false");
        playing = null;
        sounds.dataset.playing = "";
    }

    $$("[data-sound]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const name = btn.dataset.sound;
            const was = playing;
            stopSound();
            if (was === name) return;
            const a = tracks[name] ||= Object.assign(new Audio(`./assets/sound-${name}.mp3`), { loop: true, volume: 0 });
            a.volume = 0;
            a.play().then(() => fade(a, 0.8, 1200)).catch(() => {});
            playing = name;
            btn.setAttribute("aria-pressed", "true");
            sounds.dataset.playing = name;
        });
    });

    new IntersectionObserver(([e]) => { if (!e.isIntersecting) stopSound(); }).observe(sounds);

    // ─── Reveals and bars ───
    const reveals = $$(".scene:not(.hero) .copy, .scene:not(.hero) > .phone, .try .phone, .phones, .ritual-grid, .sound-grid, .good, .intercept-card, .quiet > *, .bars");
    reveals.forEach((el) => el.classList.add("reveal"));
    const io = new IntersectionObserver((entries) => {
        for (const e of entries) {
            if (!e.isIntersecting) continue;
            e.target.classList.add("is-in");
            io.unobserve(e.target);
        }
    }, { rootMargin: "0px 0px -12% 0px" });
    reveals.forEach((el) => io.observe(el));
    $$("[data-bars]").forEach((el) => io.observe(el));

    // ─── Scroll loop ───
    let raf = 0;
    window.addEventListener("scroll", () => {
        const y = window.scrollY;
        const top = intercept.offsetTop;
        if (!resolved && !locked && lastY < top - 1 && y >= top - 1) lock();
        lastY = y;
        if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); });
    }, { passive: true });

    window.addEventListener("resize", () => { measure(); render(); });
    window.addEventListener("load", () => { measure(); render(); });
    measure();
    render();
})();
