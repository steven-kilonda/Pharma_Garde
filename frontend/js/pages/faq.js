/* Page FAQ : héros + sommaire sticky, accordéons par thème, filtre live. */
(async () => {
    const U = PG.utils,
        esc = U.esc,
        $ = (s) => document.querySelector(s);

    const faq = await PG.api.get('faq').catch((e) => {
        console.error(e);
        return [];
    });

    const cible = $('#faq-liste');
    if (!faq.length) {
        cible.innerHTML =
            '<p class="note">⚠️ FAQ indisponible — vérifie que le backend tourne (npm run dev).</p>';
        $('#faq-som').innerHTML = '';
        return;
    }

    /* Grouper par catégorie (ordre du backend préservé) */
    const groupes = new Map();
    for (const f of faq) {
        if (!groupes.has(f.categorie)) groupes.set(f.categorie, []);
        groupes.get(f.categorie).push(f);
    }
    const ancre = (cat) =>
        'g-' + U.sansAccent(cat).replace(/\W+/g, '-').toLowerCase();

    /* --- Sommaire sticky --- */
    $('#faq-som').innerHTML = [...groupes]
        .map(
            ([cat, items]) =>
                `<li><a href="#${ancre(cat)}" data-ancre="${ancre(cat)}">${esc(cat)} <b>${items.length}</b></a></li>`,
        )
        .join('');

    /* --- Groupes d'accordéons --- */
    cible.innerHTML =
        [...groupes]
            .map(
                ([cat, items]) => `
      <section class="faq-group" id="${ancre(cat)}" aria-labelledby="t-${ancre(cat)}">
        <h2 id="t-${ancre(cat)}">${esc(cat)} <small>${items.length} question${items.length > 1 ? 's' : ''}</small></h2>
        ${items
            .map(
                (f) => `
          <details class="faq-item">
            <summary>${esc(f.question)}</summary>
            <div class="rep">${esc(f.reponse)}</div>
          </details>`,
            )
            .join('')}
      </section>`,
            )
            .join('') +
        `
      <div class="faq-contact">
        <h2>Toujours une question&nbsp;?</h2>
        <p>Signalez une erreur sur une fiche, une officine fermée à tort ou un prix incorrect&nbsp;— chaque signalement aide les autres patients.</p>
        <div class="pro-actions">
          <a class="btn btn-primary" href="/urgence.html#signaler">Nous écrire</a>
          <a class="btn btn-ghost" href="/pharmacies.html">Voir les pharmacies</a>
        </div>
      </div>`;

    /* --- Sommaire : état actif au clic --- */
    $('#faq-som').addEventListener('click', (e) => {
        const a = e.target.closest('a[data-ancre]');
        if (!a) return;
        document
            .querySelectorAll('#faq-som a')
            .forEach((x) => x.classList.toggle('actif', x === a));
        /* Laisser le scroll natif d'ancre faire son travail */
    });

    /* --- Filtre live : ouvre les résultats, masque groupes vides, cache sommaire --- */
    let timer;
    $('#fq').addEventListener('input', (e) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            const q = U.sansAccent(e.target.value.trim());
            document.querySelectorAll('.faq-item').forEach((d) => {
                d.hidden =
                    Boolean(q) && !U.sansAccent(d.textContent).includes(q);
                if (!d.hidden && q) d.open = true;
            });
            document.querySelectorAll('.faq-group').forEach((g) => {
                g.hidden =
                    Boolean(q) &&
                    ![...g.querySelectorAll('.faq-item')].some(
                        (d) => !d.hidden,
                    );
            });
            $('#faq-som').style.display = q ? 'none' : '';
        }, 120);
    });
})();
