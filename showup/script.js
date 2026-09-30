// ShowUp landing page: the page is a week. Each section is a day that gets
// checked off as you scroll through it. Monday you have to check in yourself.
(() => {
    document.documentElement.classList.add("js");

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const dots = [...document.querySelectorAll("[data-dot]")];
    const days = [...document.querySelectorAll("[data-day]")];
    const summary = document.querySelector("[data-summary]");
    const done = new Set();

    function markDone(i) {
        if (done.has(i)) return;
        done.add(i);
        dots[i].classList.add("is-done");
        dots[i].setAttribute("aria-label", dots[i].getAttribute("aria-label") + ", checked in");
        renderSummary();
    }

    // ─── Week progress ───
    const dayObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const i = Number(entry.target.dataset.day);
            dots.forEach((d, k) => d.classList.toggle("is-current", k === i));
            if (i > 0) markDone(i);
        }
    }, { rootMargin: "-45% 0px -45% 0px" });
    days.forEach((d) => dayObserver.observe(d));

    // ─── Monday: hold to check in ───
    const checkin = document.querySelector(".checkin");
    const btn = checkin.querySelector(".checkin-btn");
    const hint = document.querySelector("[data-hint]");
    const toast = document.querySelector(".toast");
    const HOLD_MS = 750;
    let progress = 0;
    let holding = false;
    let raf = 0;
    let last = 0;

    function setProgress(p) {
        progress = Math.max(0, Math.min(1, p));
        btn.style.setProperty("--p", progress);
    }

    function tick(now) {
        const dt = now - last;
        last = now;
        setProgress(progress + (holding ? dt / HOLD_MS : -dt / 300));
        if (holding && progress >= 1) return complete();
        if (holding || progress > 0) raf = requestAnimationFrame(tick);
    }

    function startHold(e) {
        if (checkin.dataset.state !== "idle") return;
        e.preventDefault();
        btn.setPointerCapture?.(e.pointerId);
        holding = true;
        last = performance.now();
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(tick);
    }

    function endHold() {
        if (!holding) return;
        holding = false;
        if (progress < 1 && checkin.dataset.state === "idle") {
            hint.textContent = "Keep holding…";
        }
    }

    function complete() {
        holding = false;
        setProgress(1);
        checkin.dataset.state = "locating";
        hint.textContent = "Verifying location…";
        btn.setAttribute("aria-busy", "true");

        setTimeout(() => {
            checkin.dataset.state = "done";
            setProgress(0);
            btn.removeAttribute("aria-busy");
            btn.setAttribute("aria-label", "Checked in");
            hint.textContent = "Checked in at Fitness SF · 06:47";
            markDone(0);
            showToast();
        }, reduceMotion ? 200 : 1400);
    }

    let toastTimer = 0;
    const bar = document.querySelector(".bar");
    const heroTitle = document.querySelector(".hero-title");
    function showToast() {
        toast.hidden = false;
        // Center it in the gap between the bar and the headline, covering the "01 Monday" tag.
        const top = bar.getBoundingClientRect().bottom;
        const bottom = heroTitle.getBoundingClientRect().top;
        toast.style.top = Math.max(top + 8, (top + bottom - toast.offsetHeight) / 2) + "px";
        requestAnimationFrame(() => toast.classList.add("is-in"));
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.classList.remove("is-in");
            setTimeout(() => { toast.hidden = true; }, 500);
        }, 4200);
    }

    btn.addEventListener("pointerdown", startHold);
    btn.addEventListener("pointerup", endHold);
    btn.addEventListener("pointercancel", endHold);
    btn.addEventListener("lostpointercapture", endHold);
    btn.addEventListener("contextmenu", (e) => e.preventDefault());
    // Keyboard (Enter/Space) produces a click with detail 0: check in straight away.
    btn.addEventListener("click", (e) => {
        if (e.detail === 0 && checkin.dataset.state === "idle") complete();
    });

    // ─── Tuesday: live check-in feed ───
    const feed = document.querySelector(".feed");
    const noteTemplate = feed.firstElementChild.cloneNode(true);
    const messages = [
        "Joshua checked in · 🔥 31 days",
        "Noah joined Early Birds",
        "Lucas checked in at Fitness SF",
        "Ben checked in again. Show-off.",
        "Joshua completed Workweek Warriors",
        "Noah checked in at 06:02",
    ];
    let msgIndex = 0;
    let feedTimer = 0;

    function pushNote() {
        const note = noteTemplate.cloneNode(true);
        note.querySelector("div > p:last-child").textContent = messages[msgIndex++ % messages.length];
        feed.prepend(note);
        const notes = feed.querySelectorAll(".note:not(.is-out)");
        if (notes.length > 3) {
            const old = notes[notes.length - 1];
            old.classList.add("is-out");
            old.addEventListener("animationend", () => old.remove(), { once: true });
        }
    }

    new IntersectionObserver(([entry]) => {
        clearInterval(feedTimer);
        if (entry.isIntersecting) feedTimer = setInterval(pushNote, 2200);
    }, { threshold: 0.3 }).observe(feed.closest(".day"));

    // ─── Thursday: penalty slider ───
    const range = document.getElementById("penalty-range");
    const amount = document.querySelector("[data-amount]");
    const caption = document.querySelector("[data-caption]");
    const captions = [
        [0, "No penalty. Bold. Let's see how that goes."],
        [5, "A smoothie for Ben. On you."],
        [10, "Buys Joshua lunch. He will say thank you."],
        [15, "Ben's next protein tub, partly funded by you."],
        [25, "That's a month of your friend's gym membership."],
        [35, "Noah is already looking at new lifting shoes."],
        [50, "At this point, just go to the gym."],
    ];

    function renderPenalty() {
        const v = Number(range.value);
        amount.textContent = "$" + v;
        amount.classList.toggle("is-zero", v === 0);
        range.style.setProperty("--fill", (v / Number(range.max)) * 100 + "%");
        caption.textContent = captions.filter(([min]) => v >= min).pop()[1];
    }
    range.addEventListener("input", renderPenalty);
    renderPenalty();

    // ─── Friday: count up stats ───
    const countObserver = new IntersectionObserver((entries, obs) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            obs.unobserve(entry.target);
            if (reduceMotion) continue;
            const el = entry.target;
            const target = Number(el.dataset.count);
            const start = performance.now();
            const run = (now) => {
                const t = Math.min(1, (now - start) / 1200);
                el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
                if (t < 1) requestAnimationFrame(run);
            };
            requestAnimationFrame(run);
        }
    }, { threshold: 0.6 });
    document.querySelectorAll("[data-count]").forEach((c) => countObserver.observe(c));

    // ─── Sunday: week summary + commitment ───
    function renderSummary() {
        const n = done.size;
        if (n === 7) {
            summary.innerHTML = `<b>7/7.</b> Perfect week. Ben is impressed.`;
        } else if (!done.has(0) && n === 6) {
            summary.innerHTML = `<b>6/7.</b> You skipped Monday. Ben noticed. <button type="button" data-goto-mon>Check in now</button>`;
        } else {
            summary.innerHTML = `<b>${n}/7</b> days this week.`;
        }
    }
    summary.addEventListener("click", (e) => {
        if (!e.target.closest("[data-goto-mon]")) return;
        document.getElementById("mon").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
        setTimeout(() => btn.focus({ preventScroll: true }), 600);
    });
    renderSummary();

    const commitLabel = document.querySelector("[data-commit-label]");
    document.querySelectorAll('input[name="days"]').forEach((input) => {
        input.addEventListener("change", () => {
            const n = Number(input.value);
            commitLabel.textContent = n === 7 ? "Commit to every day" : `Commit to ${n} day${n > 1 ? "s" : ""}`;
        });
    });

    // ─── Reveal on scroll ───
    const revealables = document.querySelectorAll(".split .copy, .phone, .hand, .sunday > *:not(.ghost)");
    const revealObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.classList.add("is-in");
            revealObserver.unobserve(entry.target);
        }
    }, { rootMargin: "0px 0px -10% 0px" });
    revealables.forEach((el) => {
        el.classList.add("reveal");
        revealObserver.observe(el);
    });
})();
