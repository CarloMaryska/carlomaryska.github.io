// Builds the "On this page" list from the numbered section headings and
// highlights the section you're reading.
(() => {
    const toc = document.querySelector(".toc");
    const headings = [...document.querySelectorAll(".prose section > h2")];
    if (!toc || !headings.length) return;

    const list = document.createElement("ol");
    const links = headings.map((h2) => {
        const [, num, title] = h2.textContent.trim().match(/^(\d+)\.\s*(.*)$/) || [, "", h2.textContent.trim()];
        const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        h2.closest("section").id = id;
        h2.innerHTML = `<span class="num">${num.padStart(2, "0")}</span><span>${title}</span>`;

        const a = document.createElement("a");
        a.href = `#${id}`;
        a.innerHTML = `<span>${num.padStart(2, "0")}</span>${title}`;
        const li = document.createElement("li");
        li.append(a);
        list.append(li);
        return a;
    });

    // Collapsible on small screens, always open next to the text on wide ones.
    const box = document.createElement("details");
    const label = document.createElement("summary");
    label.textContent = "On this page";
    box.append(label, list);
    toc.append(box);
    const wide = window.matchMedia("(min-width: 901px)");
    const syncOpen = () => { box.open = wide.matches; };
    wide.addEventListener("change", syncOpen);
    syncOpen();
    list.addEventListener("click", (e) => {
        if (e.target.closest("a") && !wide.matches) box.open = false;
    });

    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const i = headings.findIndex((h) => h.closest("section") === entry.target);
            links.forEach((a, k) => a.classList.toggle("is-active", k === i));
        }
    }, { rootMargin: "-20% 0px -70% 0px" });
    headings.forEach((h) => observer.observe(h.closest("section")));
})();
