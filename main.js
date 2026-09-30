(function () {
    'use strict';

    var root = document.documentElement;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    /* ---------- Theme: the sky switch ---------- */

    var skies = Array.prototype.slice.call(document.querySelectorAll('[data-sky]'));

    function isDark() {
        return root.dataset.theme === 'dark';
    }

    function applyTheme(dark, persist) {
        root.dataset.theme = dark ? 'dark' : 'light';
        skies.forEach(function (sky) {
            sky.querySelector('.sky-orb').setAttribute('aria-checked', String(dark));
        });
        if (persist) {
            try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
        }
    }

    function setP(p) {
        root.style.setProperty('--p', String(p));
    }

    function settle(dark) {
        root.classList.remove('is-dragging');
        setP(dark ? 1 : 0);
        applyTheme(dark, true);
    }

    skies.forEach(function (sky) {
        var orb = sky.querySelector('.sky-orb');
        var axis = sky.dataset.axis;
        var drag = null;

        function progressAt(event) {
            var rect = sky.getBoundingClientRect();
            var size = axis === 'y' ? rect.height : rect.width;
            var pos = axis === 'y' ? event.clientY - rect.top : event.clientX - rect.left;
            var inset = axis === 'y' ? 18 : rect.width * 0.1;
            return Math.min(1, Math.max(0, (pos - inset) / (size - inset * 2)));
        }

        sky.addEventListener('pointerdown', function (event) {
            if (event.button !== 0) return;
            drag = { startX: event.clientX, startY: event.clientY, moved: false };
            sky.setPointerCapture(event.pointerId);
        });

        sky.addEventListener('pointermove', function (event) {
            if (!drag) return;
            if (!drag.moved) {
                var dist = Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY);
                if (dist < 4) return;
                drag.moved = true;
                root.classList.add('is-dragging');
            }
            var p = progressAt(event);
            setP(p);
            // Flip the page theme live once the orb passes the middle
            if ((p > 0.5) !== isDark()) applyTheme(p > 0.5, false);
        });

        function endDrag(event) {
            if (!drag) return;
            var wasDrag = drag.moved;
            drag = null;
            if (wasDrag) {
                settle(progressAt(event) > 0.5);
            } else {
                settle(!isDark());
            }
        }

        sky.addEventListener('pointerup', endDrag);
        sky.addEventListener('pointercancel', function () {
            drag = null;
            settle(isDark());
        });

        // Keyboard: the orb is a switch
        orb.addEventListener('click', function (event) {
            // Pointer clicks are handled by pointerup on the sky
            if (event.detail !== 0) return;
            settle(!isDark());
        });

        orb.addEventListener('keydown', function (event) {
            var forward = axis === 'y' ? 'ArrowDown' : 'ArrowRight';
            var back = axis === 'y' ? 'ArrowUp' : 'ArrowLeft';
            if (event.key === forward) { event.preventDefault(); settle(true); }
            if (event.key === back) { event.preventDefault(); settle(false); }
        });
    });

    applyTheme(isDark(), false);

    // Follow the system setting until the visitor picks a theme themselves
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (event) {
        var saved = null;
        try { saved = localStorage.getItem('theme'); } catch (e) {}
        if (saved) return;
        setP(event.matches ? 1 : 0);
        applyTheme(event.matches, false);
    });

    /* ---------- Clock ---------- */

    var clock = document.querySelector('[data-clock]');
    if (clock) {
        var format = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Europe/Berlin',
            hour: '2-digit',
            minute: '2-digit'
        });
        var tick = function () { clock.textContent = format.format(new Date()); };
        tick();
        setInterval(tick, 20000);
        clock.parentElement.title = "Carlo's local time";
    }

    /* ---------- ShowUp heatmap ---------- */

    var heat = document.querySelector('[data-heat]');
    if (heat) {
        var seed = 7;
        var random = function () {
            seed = (seed * 16807) % 2147483647;
            return seed / 2147483647;
        };
        var cells = '';
        for (var i = 0; i < 26 * 4; i++) {
            var r = random();
            var level = r < 0.3 ? 0 : r < 0.5 ? 1 : r < 0.75 ? 2 : 3;
            cells += '<i data-l="' + level + '"></i>';
        }
        heat.innerHTML = cells;
    }

    /* ---------- Objects: flip and tilt ---------- */

    var hint = document.querySelector('[data-flip-hint]');

    document.querySelectorAll('[data-obj]').forEach(function (obj) {
        var tilt = obj.querySelector('.obj-tilt');
        var front = obj.querySelector('.face--front');
        var back = obj.querySelector('.face--back');

        function setFlipped(flipped) {
            obj.classList.toggle('is-flipped', flipped);
            front.setAttribute('aria-pressed', String(flipped));
            front.inert = flipped;
            back.inert = !flipped;
            if (flipped && hint) hint.classList.add('is-done');
        }

        back.inert = true;

        front.addEventListener('click', function (event) {
            setFlipped(true);
            // Only move focus for keyboard users, so mouse and touch never get a focus ring
            var link = back.querySelector('.btn-store');
            if (event.detail === 0 && link) link.focus({ preventScroll: true });
        });

        front.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                front.click();
            }
        });

        back.addEventListener('click', function (event) {
            if (event.target.closest('a')) return;
            setFlipped(false);
            if (event.detail === 0) front.focus({ preventScroll: true });
            else if (document.activeElement) document.activeElement.blur();
        });

        if (!finePointer || reduceMotion) return;

        obj.addEventListener('pointermove', function (event) {
            var rect = obj.getBoundingClientRect();
            var x = (event.clientX - rect.left) / rect.width;
            var y = (event.clientY - rect.top) / rect.height;
            var flip = obj.classList.contains('is-flipped') ? -1 : 1;
            tilt.style.setProperty('--ry', ((x - 0.5) * 12 * flip).toFixed(2) + 'deg');
            tilt.style.setProperty('--rx', ((0.5 - y) * 10).toFixed(2) + 'deg');
            obj.style.setProperty('--mx', (flip === 1 ? x : 1 - x).toFixed(3));
            obj.style.setProperty('--my', y.toFixed(3));
        });

        obj.addEventListener('pointerleave', function () {
            tilt.style.removeProperty('--rx');
            tilt.style.removeProperty('--ry');
        });
    });

    /* ---------- Reveal on scroll ---------- */

    var reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window && !reduceMotion) {
        var observer = new IntersectionObserver(function (entries) {
            var index = 0;
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.style.setProperty('--d', (index++ * 0.08) + 's');
                entry.target.classList.add('in');
                observer.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -8% 0px' });
        reveals.forEach(function (el) { observer.observe(el); });
    } else {
        reveals.forEach(function (el) { el.classList.add('in'); });
    }

    /* ---------- iMessage contact ---------- */

    var form = document.querySelector('[data-chat-form]');
    var thread = document.querySelector('[data-thread]');

    if (form && thread) {
        var input = form.querySelector('input');
        var busy = false;

        var updateTails = function () {
            var messages = thread.querySelectorAll('.msg');
            messages.forEach(function (msg, i) {
                var next = messages[i + 1];
                var side = msg.classList.contains('msg--out') ? 'out' : 'in';
                var nextSide = next && (next.classList.contains('msg--out') ? 'out' : 'in');
                msg.classList.toggle('tail', side !== nextSide);
            });
        };

        var addMessage = function (className, text) {
            var el = document.createElement('p');
            el.className = className;
            if (text) el.textContent = text;
            thread.appendChild(el);
            updateTails();
            thread.scrollTop = thread.scrollHeight;
            return el;
        };

        var wait = function (ms) {
            return new Promise(function (resolve) { setTimeout(resolve, reduceMotion ? 0 : ms); });
        };

        updateTails();

        input.addEventListener('input', function () {
            form.classList.toggle('has-text', input.value.trim().length > 0);
        });

        form.addEventListener('submit', function (event) {
            event.preventDefault();
            var text = input.value.trim();
            if (busy) return;
            if (!text) {
                form.classList.remove('shake');
                void form.offsetWidth;
                form.classList.add('shake');
                input.focus();
                return;
            }
            busy = true;

            var from = input.getBoundingClientRect();
            input.value = '';
            form.classList.remove('has-text');

            var bubble = addMessage('msg msg--out', text);
            var to = bubble.getBoundingClientRect();
            if (!reduceMotion && bubble.animate) {
                bubble.animate([
                    { transform: 'translate(' + (from.left - to.left) + 'px,' + (from.top - to.top) + 'px) scale(0.85)', opacity: 0.4 },
                    { transform: 'none', opacity: 1 }
                ], { duration: 480, easing: 'cubic-bezier(0.34, 1.36, 0.5, 1)' });
            }

            var status;
            wait(600)
                .then(function () {
                    status = addMessage('msg--status', 'Delivered');
                    return wait(900);
                })
                .then(function () {
                    var typing = addMessage('msg msg--in typing');
                    typing.setAttribute('aria-label', 'Carlo is typing');
                    typing.innerHTML = '<i></i><i></i><i></i>';
                    return wait(1400).then(function () { return typing; });
                })
                .then(function (typing) {
                    typing.remove();
                    status.textContent = 'Read';
                    addMessage('msg msg--in', 'Love it! Opening your mail app so this actually reaches me ✉️');
                    return wait(1200);
                })
                .then(function () {
                    var mailto = 'mailto:hello@carlomaryska.com'
                        + '?subject=' + encodeURIComponent('Hi Carlo')
                        + '&body=' + encodeURIComponent(text);
                    window.location.href = mailto;
                    busy = false;
                });
        });
    }
})();
