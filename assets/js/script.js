/**
 * Personal site — interactions
 *
 * - Theme toggle (saved choice > system preference), kept in sync with the OS
 * - Navigation: scroll spy (active link in blue), mobile menu
 * - Liquid glass: SVG refraction where supported
 * - Reveal-on-scroll
 * - Fractal tree background with a growth animation
 *
 * No dependencies.
 *
 * @author Roman Dolgopolyi
 * @version 3.0.0
 */
(function () {
    'use strict';

    const root = document.documentElement;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    /* ------------------------------------------------------------------ */
    /* Storage (localStorage can throw in private modes / blocked storage) */
    /* ------------------------------------------------------------------ */
    const store = {
        get(key) {
            try { return localStorage.getItem(key); } catch (e) { return null; }
        },
        set(key, value) {
            try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
        }
    };

    /* ------------------------------------------------------------------ */
    /* Theme                                                               */
    /* ------------------------------------------------------------------ */
    function initTheme() {
        const toggle = document.getElementById('theme-toggle');
        const icon = toggle && toggle.querySelector('i');
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

        function apply(theme) {
            root.setAttribute('data-theme', theme);
            if (icon) {
                icon.className = theme === 'dark' ? 'bi bi-sun' : 'bi bi-moon-stars';
                toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
            }
            document.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
        }

        apply(root.getAttribute('data-theme') || 'light');

        if (toggle) {
            toggle.addEventListener('click', () => {
                const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                store.set('theme', next);
                apply(next);
            });
        }

        // Follow the OS only while the visitor hasn't picked a theme themselves
        systemDark.addEventListener('change', (e) => {
            if (!store.get('theme')) apply(e.matches ? 'dark' : 'light');
        });
    }

    /* ------------------------------------------------------------------ */
    /* Navigation                                                          */
    /* ------------------------------------------------------------------ */
    function initNav() {
        const nav = document.getElementById('nav');
        const menuBtn = document.getElementById('menu-toggle');
        const linksBox = document.getElementById('nav-links');
        const links = Array.from(linksBox.querySelectorAll('.nav-link'));
        const sections = links
            .map((link) => document.querySelector(link.getAttribute('href')))
            .filter(Boolean);

        let activeId = '';

        function setActive(id) {
            if (!id || id === activeId) return;
            activeId = id;
            links.forEach((link) => {
                const on = link.getAttribute('href') === '#' + id;
                link.classList.toggle('active', on);
                if (on) link.setAttribute('aria-current', 'true');
                else link.removeAttribute('aria-current');
            });
        }

        // Scroll spy: the section crossing the middle of the viewport is active
        function updateFromScroll() {
            const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
            if (atBottom) {
                setActive(sections[sections.length - 1].id);
                return;
            }
            const middle = window.innerHeight / 2;
            let current = sections[0].id;
            sections.forEach((section) => {
                if (section.getBoundingClientRect().top <= middle) current = section.id;
            });
            setActive(current);
        }

        // While the page auto-scrolls to a clicked section, pause the scroll spy so only
        // the clicked link is highlighted. It resumes when the scroll settles, or as soon
        // as the visitor scrolls by hand (wheel, touch or keys).
        let spyPaused = false;
        let idleTimer = 0;
        let maxTimer = 0;

        function resumeSpy() {
            spyPaused = false;
            clearTimeout(idleTimer);
            clearTimeout(maxTimer);
        }

        function waitForScrollToSettle() {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(resumeSpy, 150);
        }

        function pauseSpy() {
            spyPaused = true;
            clearTimeout(maxTimer);
            maxTimer = setTimeout(resumeSpy, 4000); // safety net if the scroll never reports its end
            waitForScrollToSettle();
        }

        window.addEventListener('scrollend', () => { if (spyPaused) resumeSpy(); });
        ['wheel', 'touchstart'].forEach((type) => {
            window.addEventListener(type, () => { if (spyPaused) resumeSpy(); }, { passive: true });
        });
        window.addEventListener('keydown', (e) => {
            if (spyPaused && ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) resumeSpy();
        });

        let ticking = false;
        window.addEventListener('scroll', () => {
            if (spyPaused) {
                waitForScrollToSettle();
                return;
            }
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                if (!spyPaused) updateFromScroll();
                ticking = false;
            });
        }, { passive: true });

        updateFromScroll();

        // Mobile menu
        function setMenu(open) {
            nav.classList.toggle('open', open);
            menuBtn.setAttribute('aria-expanded', String(open));
            menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
            menuBtn.querySelector('i').className = open ? 'bi bi-x-lg' : 'bi bi-list';
        }

        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            setMenu(!nav.classList.contains('open'));
        });

        // In-page links in the header (sections and the name): highlight the target right
        // away and keep the spy quiet during the automatic scroll
        nav.querySelectorAll('a[href^="#"]').forEach((link) => link.addEventListener('click', () => {
            pauseSpy();
            setActive(link.getAttribute('href').slice(1));
            setMenu(false);
        }));

        document.addEventListener('click', (e) => {
            if (nav.classList.contains('open') && !nav.contains(e.target)) setMenu(false);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && nav.classList.contains('open')) {
                setMenu(false);
                menuBtn.focus();
            }
        });

        // Close the mobile menu if the window grows into the desktop layout
        window.matchMedia('(min-width: 821px)').addEventListener('change', (e) => {
            if (e.matches) setMenu(false);
        });
    }

    /* ------------------------------------------------------------------ */
    /* Liquid glass                                                        */
    /* ------------------------------------------------------------------ */
    function initGlass() {
        // SVG filters inside backdrop-filter currently render only in Chromium
        const brands = (navigator.userAgentData && navigator.userAgentData.brands) || [];
        if (brands.some((b) => /Chromium/i.test(b.brand))) {
            root.classList.add('supports-refraction');
        }
    }

    /* ------------------------------------------------------------------ */
    /* Reveal on scroll                                                    */
    /* ------------------------------------------------------------------ */
    function initReveal() {
        const items = document.querySelectorAll('.reveal');
        if (!('IntersectionObserver' in window) || reducedMotion.matches) {
            items.forEach((el) => el.classList.add('in'));
            return;
        }
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in');
                    io.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
        items.forEach((el) => io.observe(el));
    }

    /* ------------------------------------------------------------------ */
    /* Fractal tree                                                        */
    /* ------------------------------------------------------------------ */
    function initTree() {
        const canvas = document.getElementById('fractal-tree-canvas');
        if (!canvas || !canvas.getContext) return;
        const ctx = canvas.getContext('2d');

        const MAX_DEPTH = 10;
        const GROW_MS = 2200;      // time for the trees to grow in
        const RECOLOR_MS = 400;    // matches the page background's theme transition

        // Two identical trees, one from each bottom corner. They share one random
        // shape, chosen once per visit; size is derived from the viewport on every draw.
        function randomShape() {
            return {
                branchRatio: 0.78 + (Math.random() - 0.5) * 0.05,
                mainAngle: Math.PI / 6 + (Math.random() - 0.5) * 0.2,
                extraSplit: 0.6 + (Math.random() - 0.5) * 0.2,
                lengthFactor: 0.25 + Math.random() * 0.05
            };
        }
        const shape = randomShape();
        const shapes = [shape, shape];

        let width = 0;
        let height = 0;
        let color = [0, 0, 0, 0.4];   // r, g, b, a
        let growFrame = 0;
        let growing = false;          // true while the grow-in animation runs

        function readColor() {
            const raw = getComputedStyle(root).getPropertyValue('--tree').trim();
            const nums = (raw.match(/[\d.]+/g) || []).map(Number);
            return nums.length >= 3 ? [nums[0], nums[1], nums[2], nums.length > 3 ? nums[3] : 1] : [0, 0, 0, 0.4];
        }

        function rgba(c) {
            return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + c[3].toFixed(3) + ')';
        }

        function resize() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = canvas.clientWidth;
            height = canvas.clientHeight;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            // setTransform (not scale) so repeated resizes don't compound
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        // `growth` is a continuous level count (e.g. 3.4): branches at depth 3 are drawn
        // 40% of their length, deeper ones not yet. Each branch extends smoothly from its
        // base, and its children start once it is fully grown.
        function branch(shape, x1, y1, length, angle, depth, growth) {
            if (depth >= growth || length < 2) return;

            const f = Math.min(1, growth - depth);
            const x2 = x1 + length * f * Math.cos(angle);
            const y2 = y1 + length * f * Math.sin(angle);

            ctx.lineWidth = Math.max(0.5, length * 0.02);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            if (f < 1) return;

            const next = length * shape.branchRatio;
            branch(shape, x2, y2, next, angle + shape.mainAngle, depth + 1, growth);
            branch(shape, x2, y2, next, angle - shape.mainAngle, depth + 1, growth);

            // Secondary "buds" part-way along the branch
            if (depth > 1) {
                const xb = x1 + length * shape.extraSplit * Math.cos(angle);
                const yb = y1 + length * shape.extraSplit * Math.sin(angle);
                branch(shape, xb, yb, next * 0.6, angle + shape.mainAngle, depth + 2, growth);
                branch(shape, xb, yb, next * 0.6, angle - shape.mainAngle, depth + 2, growth);
            }
        }

        function draw(growth) {
            ctx.clearRect(0, 0, width, height);
            ctx.strokeStyle = rgba(color);
            ctx.lineCap = 'round';
            const inset = Math.min(50, width * 0.08);
            const starts = [inset, width - inset];
            shapes.forEach((shape, i) => {
                // Trunk scales with height, capped by width so both crowns fit on phones
                const trunk = Math.min(height * shape.lengthFactor, width * 0.32);
                branch(shape, starts[i], height, trunk, -Math.PI / 2, 0, growth);
            });
        }

        function grow() {
            cancelAnimationFrame(growFrame);
            if (reducedMotion.matches) {
                draw(MAX_DEPTH);
                return;
            }
            growing = true;
            let start = 0;
            const step = (t) => {
                if (!start) start = t;
                const p = Math.min((t - start) / GROW_MS, 1);
                // Gentle ease-in-out over the whole growth; each level gets a smooth slice
                const eased = 0.5 - Math.cos(Math.PI * p) / 2;
                draw(eased * MAX_DEPTH);
                if (p < 1) growFrame = requestAnimationFrame(step);
                else growing = false;
            };
            growFrame = requestAnimationFrame(step);
        }

        // Fade the trees to the new theme colour instead of switching instantly
        let recolorFrame = 0;
        function recolor() {
            cancelAnimationFrame(recolorFrame);
            const from = color.slice();
            const to = readColor();
            if (reducedMotion.matches) {
                color = to;
                if (!growing) draw(MAX_DEPTH);
                return;
            }
            let start = 0;
            const step = (t) => {
                if (!start) start = t;
                const p = Math.min((t - start) / RECOLOR_MS, 1);
                color = from.map((v, i) => v + (to[i] - v) * p);
                // While growing, the grow loop redraws each frame with the current colour
                if (!growing) draw(MAX_DEPTH);
                if (p < 1) recolorFrame = requestAnimationFrame(step);
            };
            recolorFrame = requestAnimationFrame(step);
        }

        color = readColor();
        resize();
        grow();

        // Redraw at full size on resize; ignore height-only jitter from mobile browser bars
        let lastW = width;
        let lastH = height;
        let resizeFrame = 0;
        window.addEventListener('resize', () => {
            cancelAnimationFrame(resizeFrame);
            resizeFrame = requestAnimationFrame(() => {
                if (canvas.clientWidth === lastW && Math.abs(canvas.clientHeight - lastH) < 120) return;
                cancelAnimationFrame(growFrame);
                growing = false;
                resize();
                lastW = width;
                lastH = height;
                draw(MAX_DEPTH);
            });
        });

        // Recolour (not regrow) on theme change
        document.addEventListener('themechange', recolor);
    }

    /* ------------------------------------------------------------------ */
    /* Boot                                                                */
    /* ------------------------------------------------------------------ */
    function boot() {
        const year = document.getElementById('current-year');
        if (year) year.textContent = new Date().getFullYear();

        initTheme();
        initNav();
        initGlass();
        initReveal();
        initTree();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
