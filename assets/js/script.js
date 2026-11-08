/**
 * Personal site — interactions
 *
 * - Theme toggle (saved choice > system preference), kept in sync with the OS
 * - Navigation: liquid indicator under the active link, scroll spy, mobile menu
 * - Liquid-glass details: pointer-following sheen, SVG refraction where supported
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
        const indicator = linksBox.querySelector('.nav-indicator');
        const links = Array.from(linksBox.querySelectorAll('.nav-link'));
        const sections = links
            .map((link) => document.querySelector(link.getAttribute('href')))
            .filter(Boolean);

        let activeId = '';

        function moveIndicator() {
            const active = links.find((l) => l.classList.contains('active'));
            if (!active || !indicator) return;
            indicator.style.width = active.offsetWidth + 'px';
            indicator.style.transform = 'translateX(' + active.offsetLeft + 'px)';
            indicator.style.opacity = '1';
        }

        function setActive(id) {
            if (!id || id === activeId) return;
            activeId = id;
            links.forEach((link) => {
                const on = link.getAttribute('href') === '#' + id;
                link.classList.toggle('active', on);
                if (on) link.setAttribute('aria-current', 'true');
                else link.removeAttribute('aria-current');
            });
            moveIndicator();
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

        let ticking = false;
        window.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                updateFromScroll();
                ticking = false;
            });
        }, { passive: true });

        updateFromScroll();
        window.addEventListener('resize', moveIndicator);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveIndicator);

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

        links.forEach((link) => link.addEventListener('click', () => {
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

        // Specular highlight follows the pointer (mouse / trackpad only)
        if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

        let pending = null;
        let frame = 0;

        document.addEventListener('pointermove', (e) => {
            pending = e;
            if (frame) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                const target = pending.target.closest && pending.target.closest('.glass, .glass-btn');
                if (!target) return;
                const rect = target.getBoundingClientRect();
                target.style.setProperty('--mx', ((pending.clientX - rect.left) / rect.width * 100).toFixed(1) + '%');
                target.style.setProperty('--my', ((pending.clientY - rect.top) / rect.height * 100).toFixed(1) + '%');
            });
        }, { passive: true });
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
        const GROW_MS = 1400;

        // Random shape, chosen once per visit; size is derived from the viewport on every draw
        const shape = {
            branchRatio: 0.78 + (Math.random() - 0.5) * 0.05,
            mainAngle: Math.PI / 6 + (Math.random() - 0.5) * 0.2,
            extraSplit: 0.6 + (Math.random() - 0.5) * 0.2,
            lengthFactor: 0.25 + Math.random() * 0.05
        };

        let width = 0;
        let height = 0;
        let color = '';
        let growFrame = 0;

        function readColor() {
            color = getComputedStyle(root).getPropertyValue('--tree').trim() || 'rgba(0,0,0,0.4)';
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

        function branch(x1, y1, length, angle, depth, maxDepth) {
            if (depth >= maxDepth || length < 2) return;

            const x2 = x1 + length * Math.cos(angle);
            const y2 = y1 + length * Math.sin(angle);

            ctx.lineWidth = Math.max(0.5, length * 0.02);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            const next = length * shape.branchRatio;
            branch(x2, y2, next, angle + shape.mainAngle, depth + 1, maxDepth);
            branch(x2, y2, next, angle - shape.mainAngle, depth + 1, maxDepth);

            // Secondary "buds" part-way along the branch
            if (depth > 1) {
                const xb = x1 + length * shape.extraSplit * Math.cos(angle);
                const yb = y1 + length * shape.extraSplit * Math.sin(angle);
                branch(xb, yb, next * 0.6, angle + shape.mainAngle, depth + 2, maxDepth);
                branch(xb, yb, next * 0.6, angle - shape.mainAngle, depth + 2, maxDepth);
            }
        }

        function draw(maxDepth) {
            ctx.clearRect(0, 0, width, height);
            ctx.strokeStyle = color;
            ctx.lineCap = 'round';
            const startX = Math.min(50, width * 0.08);
            // Trunk scales with height, capped by width so the crown fits on phones
            const trunk = Math.min(height * shape.lengthFactor, width * 0.5);
            branch(startX, height, trunk, -Math.PI / 2, 0, maxDepth);
        }

        function grow() {
            cancelAnimationFrame(growFrame);
            if (reducedMotion.matches) {
                draw(MAX_DEPTH);
                return;
            }
            let start = 0;
            const step = (t) => {
                if (!start) start = t;
                const p = Math.min((t - start) / GROW_MS, 1);
                const eased = 1 - Math.pow(1 - p, 3);
                draw(Math.max(1, Math.ceil(eased * MAX_DEPTH)));
                if (p < 1) growFrame = requestAnimationFrame(step);
            };
            growFrame = requestAnimationFrame(step);
        }

        readColor();
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
                resize();
                lastW = width;
                lastH = height;
                draw(MAX_DEPTH);
            });
        });

        // Recolour (not regrow) on theme change
        document.addEventListener('themechange', () => {
            cancelAnimationFrame(growFrame);
            readColor();
            draw(MAX_DEPTH);
        });
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
