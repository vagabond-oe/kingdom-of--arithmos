(() => {
    'use strict';

    /* =========================================================
       DATA - edit the house names / mottos here.
       They are used on the Houses page, About page and the
       Login/Register "House" dropdown.
       ========================================================= */
    const HOUSES = [
        { name: 'House I',   motto: 'Motto to be provided.' },
        { name: 'House II',  motto: 'Motto to be provided.' },
        { name: 'House III', motto: 'Motto to be provided.' },
        { name: 'House IV',  motto: 'Motto to be provided.' },
        { name: 'House V',   motto: 'Motto to be provided.' }
    ];
    const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

    const PAGES = ['home', 'about', 'houses', 'events', 'contact', 'login'];
    const TITLES = {
        home: 'Home', about: 'About', houses: 'Houses',
        events: 'Events', contact: 'Contact', login: 'Login'
    };

    /* ---------- Supabase ---------- */
    const cfg = window.ARITHMOS_CONFIG || {};
    const configured = Boolean(
        cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
        !cfg.SUPABASE_URL.startsWith('YOUR_') && !cfg.SUPABASE_ANON_KEY.startsWith('YOUR_')
    );
    const sb = configured && window.supabase
        ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
        : null;
    const AUTH_DOMAIN = cfg.AUTH_DOMAIN || 'arithmos.app';
    const NOT_READY = 'Server not connected yet. Add your keys in config.js.';

    let profile = null; // { username, house } of the logged-in player

    /* ---------- helpers ---------- */
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    const esc = (str) => String(str).replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));

    function setStatus(el, message, type) {
        el.textContent = message;
        el.className = 'status' + (type ? ' ' + type : '');
    }

    /* =========================================================
       PAGE ROUTER (smooth transitions are done in CSS)
       ========================================================= */
    const header = $('#siteHeader');
    const menuToggle = $('#menuToggle');
    let currentPage = null;

    function closeMenu() {
        header.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
    }

    function showPage(id) {
        if (!PAGES.includes(id)) id = 'home';
        if (id === currentPage) return;
        currentPage = id;

        $$('.page').forEach((page) => {
            const isActive = page.id === id;
            page.classList.toggle('active', isActive);
            page.setAttribute('aria-hidden', String(!isActive));
            if ('inert' in page) page.inert = !isActive;
        });

        $$('[data-nav]').forEach((link) => {
            const on = link.dataset.nav === id;
            link.classList.toggle('active', on);
            if (on) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });

        const active = $('#' + id);
        if (active) active.scrollTop = 0;

        document.title = (id === 'home' ? '' : TITLES[id] + ' | ') + 'The Kingdom of Arithmos';
        closeMenu();
    }

    window.addEventListener('hashchange', () => showPage(location.hash.slice(1)));

    menuToggle.addEventListener('click', () => {
        const open = header.classList.toggle('open');
        menuToggle.setAttribute('aria-expanded', String(open));
    });

    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

    // close mobile menu when clicking outside it
    document.addEventListener('click', (e) => {
        if (!header.contains(e.target)) closeMenu();
    });

    // stagger index for entrance animations
    $$('[data-stagger]').forEach((group) => {
        Array.from(group.children).forEach((child, i) => child.style.setProperty('--i', i));
    });

    /* =========================================================
       HOUSES (Houses page, About page chips, dropdowns)
       ========================================================= */
    function renderHouses() {
        $('#houseGrid').innerHTML = HOUSES.map((h, i) => `
            <article class="card house-card" style="--i:${i}">
                <span class="house-num">${ROMAN[i] || i + 1}</span>
                <h3>${esc(h.name)}</h3>
                <p>${esc(h.motto)}</p>
            </article>`).join('');

        $('#aboutHouses').innerHTML = HOUSES
            .map((h) => `<span class="chip">${esc(h.name)}</span>`).join('');

        $$('.house-select').forEach((select) => {
            select.innerHTML = '<option value="" disabled selected>Choose your house</option>' +
                HOUSES.map((h) => `<option value="${esc(h.name)}">${esc(h.name)}</option>`).join('');
        });
    }

    /* =========================================================
       LOGIN (accounts are created by the organiser, see admin/)
       ========================================================= */
    const loginLabel = $('#loginLabel');
    const authBox = $('#authBox');
    const welcome = $('#welcome');

    function refreshAuthUI() {
        if (profile) {
            loginLabel.textContent = profile.username;
            $('#welcomeName').textContent = profile.username;
            $('#welcomeHouse').textContent = profile.house;
            welcome.hidden = false;
            authBox.hidden = true;
        } else {
            loginLabel.textContent = 'Login';
            welcome.hidden = true;
            authBox.hidden = false;
        }
    }

    async function loadProfile(userId) {
        const { data, error } = await sb
            .from('profiles')
            .select('username, house')
            .eq('id', userId)
            .maybeSingle();
        return error ? null : data;
    }

    $('#loginPanel').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const status = $('#loginStatus');
        const button = $('button[type="submit"]', form);
        const house = form.house.value;
        const username = form.username.value.trim().toLowerCase();
        const password = form.password.value;

        if (!house || !username || !password) {
            return setStatus(status, 'Please fill in house, username and password.', 'error');
        }
        if (!sb) return setStatus(status, NOT_READY, 'error');

        const FAIL = 'Invalid house, username or password.';
        button.disabled = true;
        setStatus(status, 'Opening the gates...');

        try {
            const { data, error } = await sb.auth.signInWithPassword({
                email: `${username}@${AUTH_DOMAIN}`,
                password
            });
            if (error || !data.user) return setStatus(status, FAIL, 'error');

            const found = await loadProfile(data.user.id);
            if (!found || found.house !== house) {
                await sb.auth.signOut();
                return setStatus(status, FAIL, 'error');
            }

            profile = found;
            form.reset();
            setStatus(status, '');
            refreshAuthUI();
        } catch (err) {
            setStatus(status, 'Network problem. Please try again.', 'error');
        } finally {
            button.disabled = false;
        }
    });

    $('#logoutBtn').addEventListener('click', async () => {
        if (sb) await sb.auth.signOut();
        profile = null;
        refreshAuthUI();
    });

    if (sb) {
        // keep other tabs / expired sessions in sync (no awaits inside this callback)
        sb.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') { profile = null; refreshAuthUI(); }
        });
    }

    /* =========================================================
       CONTACT FORM -> Supabase "messages" table
       ========================================================= */
    $('#contactForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const status = $('#contactStatus');
        const button = $('button[type="submit"]', form);
        const name = form.elements.name.value.trim();
        const email = form.elements.email.value.trim();
        const message = form.elements.message.value.trim();

        if (!name || !message) return setStatus(status, 'Please enter your name and a message.', 'error');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return setStatus(status, 'Please enter a valid email address.', 'error');
        }
        if (!sb) return setStatus(status, NOT_READY, 'error');

        button.disabled = true;
        const { error } = await sb.from('messages').insert({ name, email, message });
        button.disabled = false;

        if (error) return setStatus(status, 'Could not send. Please try again.', 'error');
        form.reset();
        setStatus(status, 'Your raven has been sent. Thank you!', 'ok');
    });

    /* =========================================================
       INIT
       ========================================================= */
    async function init() {
        renderHouses();
        showPage(location.hash.slice(1) || 'home');
        refreshAuthUI();

        // restore an existing login after page refresh
        if (sb) {
            try {
                const { data } = await sb.auth.getSession();
                if (data.session) {
                    profile = await loadProfile(data.session.user.id);
                    if (!profile) await sb.auth.signOut();
                    refreshAuthUI();
                }
            } catch (err) { /* stay logged out */ }
        }
    }

    init();
})();