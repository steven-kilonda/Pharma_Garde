(() => {
    const U = PG.utils;
    const page = document.body.dataset.page || '';

    const NAV = [
        ['accueil', 'Accueil', '/index.html'],
        ['pharmacies', 'Pharmacies', '/pharmacies.html'],
        ['medicaments', 'Médicaments', '/medicaments.html'],
        ['carte', 'Carte', '/carte.html'],
        ['faq', 'FAQ', '/faq.html'],
    ];
    const liens = NAV.map(
        ([k, l, h]) =>
            `<a href="${h}"${page === k ? ' aria-current="page"' : ''}>${l}</a>`,
    ).join('');
    const croix = (c) =>
        `<svg width="20" height="20" viewBox="0 0 100 100" aria-hidden="true"><path d="M36 0h28v36h36v28H64v36H36V64H0V36h36z" fill="${c}"/></svg>`;

    const header = document.querySelector('[data-header]');
    if (header)
        header.outerHTML = `
    <div class="banner on-dark"><div class="wrap">
      <span class="live-dot" aria-hidden="true"></span>
      <p id="ticker" class="ticker">Pharmacies de garde de Pointe-Noire, planning hebdomadaire</p>
    </div></div>
    <header class="site-header padding-t-xl"><div class="wrap bar">
      <a href="/index.html" class="brand" aria-label="PharmaGarde Pointe-Noire, accueil">
        <span class="brand-mark">${croix('#0F2E20')}</span>
        <span><span class="brand-name">PharmaGarde</span><span class="brand-sub">Pointe-Noire</span></span>
      </a>
      <nav class="nav-main" aria-label="Navigation principale">${liens}</nav>
      <div class="bar-end">
        <a href="/urgence.html" class="btn btn-dark">${U.icon('alert', 16)} Urgences</a>
        <button id="menu-btn" class="menu-btn" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="menu-mobile">${U.icon('menu', 24)}</button>
      </div>
    </div>
    <div id="menu-mobile" class="menu-mobile">${liens}
      <a href="/urgence.html" class="btn btn-dark">${U.icon('alert', 16)} Urgences</a>
    </div></header>`;

    const btn = document.getElementById('menu-btn');
    const menu = document.getElementById('menu-mobile');
    const setMenu = (open) => {
        menu.classList.toggle('open', open);
        btn.setAttribute('aria-expanded', String(open));
        document.body.style.overflow = open ? 'hidden' : '';
    };
    btn?.addEventListener('click', () =>
        setMenu(!menu.classList.contains('open')),
    );
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setMenu(false);
    });
    document.addEventListener('click', (e) => {
        if (
            menu.classList.contains('open') &&
            !menu.contains(e.target) &&
            !btn.contains(e.target)
        )
            setMenu(false);
    });
    menu?.querySelectorAll('a').forEach((a) =>
        a.addEventListener('click', () => setMenu(false)),
    );

    const footer = document.querySelector('[data-footer]');
    if (footer)
        footer.outerHTML = `
    <footer class="site-footer on-dark"><div class="wrap foot-grid">
      <div>
        <a href="/index.html" class="foot-brand"><span class="brand-mark">${croix('#0F2E20')}</span><span class="brand-name">PharmaGarde</span></a>
        <p>Le planning hebdomadaire des pharmacies de garde de Pointe-Noire, avec itinéraire et appel en un geste.</p>
      </div>
      <div><h4>Navigation</h4><ul>${NAV.map(([, l, h]) => `<li><a href="${h}">${l}</a></li>`).join('')}</ul></div>
      <div><h4>Ressources</h4><ul>
        <li><a href="/pharmacies.html?garde=1">Planning de la semaine</a></li>
        <li><a href="/medicaments.html">Médicaments et prix</a></li>
        <li><a href="/urgence.html#signaler">Signaler une erreur</a></li>
      </ul></div>
      <div><h4>Professionnels</h4><ul>
        <li><a href="/urgence.html#inscrire">Inscrire une pharmacie</a></li>
        <li><a href="/urgence.html#signaler">Corriger une fiche</a></li>
        <li><a href="/faq.html">Questions fréquentes</a></li>
      </ul></div>
    </div>
    <div class="foot-bar"><div class="wrap">
      <p style="margin:0"><strong>Urgences</strong> : pompiers <a href="tel:118"><b>118</b></a>, police <a href="tel:117"><b>117</b></a></p>
      <a href="/urgence.html#numeros" class="text-link" style="color:var(--leaf-400);text-decoration-color:var(--leaf-400)">Tous les numéros d'urgence</a>
    </div></div>
    <div class="foot-bar small"><div class="wrap">
      <p style="margin:0;display:flex;flex-wrap:wrap;gap:6px 20px"><a href="/faq.html">Questions fréquentes</a><a href="/contact.html">Nous contacter</a><a href="/mentions-legales.html">Mentions légales</a></p>
      <p style="margin:0">Ce site ne remplace pas un avis médical.</p>
    </div></div></footer>`;

    if (page !== 'urgence' && page !== 'carte')
        document.body.insertAdjacentHTML(
            'beforeend',
            `<a href="/urgence.html" class="sos" aria-label="Urgences, SOS">SOS</a>`,
        );

    /* Ticker : semaine courante (échoue en silence si données absentes) */
    PG.api
        ?.get('meta')
        .then((m) => {
            const t = document.getElementById('ticker');
            if (m && t)
                t.textContent = `Pharmacies de garde du ${U.plageFR(m.semaineDu, m.semaineAu)}. Liste mise à jour le ${U.dateFR(m.majLe)}.`;
        })
        .catch(() => {});

    U.hydrateIcons();
})();
