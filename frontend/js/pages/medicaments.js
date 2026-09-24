/* Page médicaments : recherche, catégories, filtre ordonnance, filtre par
   officine (?pharmacie=), tri sans rechargement, pagination. */
(async () => {
    const U = PG.utils,
        esc = U.esc,
        $ = (s) => document.querySelector(s);

    /* --- Chargement --- */
    const [medicaments, meta, stocks, pharmacies] = await Promise.all([
        PG.api.get('medicaments').catch((e) => {
            console.error(e);
            return [];
        }),
        PG.api.get('meta').catch(() => null),
        PG.api.get('stocks').catch(() => []),
        PG.api.get('pharmacies').catch(() => []),
    ]);
    if (!medicaments.length) {
        $('#resultats').innerHTML =
            '<p class="note">⚠️ Médicaments indisponibles — vérifie que le backend tourne.</p>';
        return;
    }

    /* --- État, lu depuis l'URL --- */
    const PAR_PAGE = 12;
    let page = 1;
    const f = {
        q: (U.param('q') || '').trim(),
        cat: U.param('categorie') || '',
        ord: U.param('ordonnance') === '1',
        ph: U.param('pharmacie') || '',
    };
    let tri = U.param('tri') || 'nom';

    /* --- Ancres du HTML vérifiées --- */
    const REQUIS = [
        'chips',
        'filters',
        'compte',
        'resultats',
        'vide',
        'pg',
        'filtre-ph',
    ];
    const absents = REQUIS.filter((id) => !document.getElementById(id));
    if (absents.length) {
        $('#resultats').innerHTML =
            `⚠️ Le HTML de la page manque d'éléments : <code>${absents.join(', ')}</code>.` +
            ` Compare medicaments.html avec la version de référence.`;
        return;
    }

    /* --- Helpers --- */
    const majQS = (patch) => {
        const p = new URLSearchParams(location.search);
        for (const [k, v] of Object.entries(patch)) {
            if (!v) p.delete(k);
            else p.set(k, v === true ? '1' : v);
        }
        const qs = p.toString();
        history.replaceState(
            null,
            '',
            '/medicaments.html' + (qs ? '?' + qs : ''),
        );
    };
    const nomPharmacie = () =>
        f.ph
            ? (pharmacies.find((p) => String(p.id) === f.ph) || {}).nom || null
            : null;

    /* --- Données dérivées --- */
    const dispo = new Map();
    for (const l of stocks) {
        const k = String(l.medicamentId);
        if (!dispo.has(k)) dispo.set(k, { ok: 0, rupture: 0 });
        l.statut === 'rupture' ? dispo.get(k).rupture++ : dispo.get(k).ok++;
    }
    const cats = [...new Set(medicaments.map((m) => m.categorie))].sort(
        (a, b) => a.localeCompare(b, 'fr'),
    );

    /* --- Chips catégories (préservent le filtre officine) --- */
    $('#chips').innerHTML = cats
        .map(
            (c) =>
                `<a class="chip-cat${c === f.cat ? ' act' : ''}" href="/medicaments.html?categorie=${encodeURIComponent(c)}${f.ph ? `&pharmacie=${encodeURIComponent(f.ph)}` : ''}">${esc(c)}</a>`,
        )
        .join('');

    /* --- Sidebar : tri + ordonnance --- */
    $('#filters').innerHTML = `
      <div class="filters-head">
        <h2>Filtres</h2>
        <button id="f-reset" class="text-link" type="button" style="font-size:13.5px">Réinitialiser</button>
      </div>
      <div><p class="f-label">Trier par</p>
        <div class="tri-radio">
          ${[
              ['nom', 'Nom (A→Z)'],
              ['prix', 'Prix croissant'],
          ]
              .map(
                  ([v, l]) =>
                      `<label class="check"><input type="radio" name="tri" value="${v}" ${tri === v ? 'checked' : ''}/> ${l}</label>`,
              )
              .join('')}
        </div></div>
      <div><p class="f-label">Ordonnance</p>
        <label class="check"><input type="checkbox" id="f-ord" ${f.ord ? 'checked' : ''}/> Sans ordonnance uniquement</label></div>
      <p class="note" style="margin-top:16px">Les prix sont donnés à titre indicatif. Seul le prix affiché en officine fait foi.</p>`;

    /* --- Filtrage + tri --- */
    function resultats() {
        let r = medicaments.filter((m) => {
            if (f.cat && m.categorie !== f.cat) return false;
            if (f.ord && m.ordonnance) return false;
            if (
                f.ph &&
                !stocks.some(
                    (l) =>
                        String(l.pharmacieId) === f.ph &&
                        String(l.medicamentId) === String(m.id),
                )
            )
                return false;
            if (
                f.q &&
                !U.sansAccent(`${m.nom} ${m.categorie}`).includes(
                    U.sansAccent(f.q),
                )
            )
                return false;
            return true;
        });
        if (tri === 'prix')
            r.sort(
                (a, b) =>
                    Number(a.prix) - Number(b.prix) ||
                    a.nom.localeCompare(b.nom, 'fr'),
            );
        else r.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
        return r;
    }

    const ligne = (m) => {
        const d = dispo.get(String(m.id)) || { ok: 0, rupture: 0 };
        const dispoTxt = d.ok
            ? `Disponible dans ${d.ok} officine${d.ok > 1 ? 's' : ''}`
            : d.rupture
              ? 'En rupture partout aujourd\u2019hui'
              : 'Disponibilité non renseignée';
        return `
      <div class="medrow">
        <div style="min-width:0">
          <p class="m-nom"><a href="/medicament.html?id=${encodeURIComponent(m.id)}">${esc(m.nom)}</a></p>
          <p class="m-meta">${esc(m.categorie)} · ${dispoTxt}${m.ordonnance ? ' · sur ordonnance' : ''}</p>
        </div>
        ${m.ordonnance ? '<span class="m-ordonnance">Ordonnance</span>' : ''}
        <span class="m-prix">${U.fcfa(m.prix)}</span>
      </div>`;
    };

    /* --- Rendu --- */
    function rendre() {
        try {
            const r = resultats();
            const pages = Math.max(1, Math.ceil(r.length / PAR_PAGE));
            page = Math.min(Math.max(1, page), pages);

            /* Titre + badge de contexte officine */
            const nomPh = nomPharmacie();
            document.querySelector('.page-head h1').textContent = nomPh
                ? `Stocks de la pharmacie ${nomPh}`
                : 'Médicaments et prix';
            $('#filtre-ph').innerHTML = nomPh
                ? `<span class="badge badge-ouvert">Filtré : stock de la pharmacie ${esc(nomPh)}
                     <a href="/medicaments.html" style="margin-left:6px" title="Retirer le filtre">✕</a></span>`
                : '';

            $('#resultats').innerHTML = r
                .slice((page - 1) * PAR_PAGE, page * PAR_PAGE)
                .map(ligne)
                .join('');
            $('#vide').hidden = r.length > 0;
            $('#compte').textContent =
                `Page ${page} sur ${pages} — ${r.length} médicament${r.length > 1 ? 's' : ''}` +
                (f.q ? ` pour « ${f.q} »` : '') +
                (f.cat ? ` · ${f.cat}` : '') +
                (nomPh ? ` · chez ${nomPh}` : '');
            $('#maj-note').textContent = meta
                ? `Mis à jour le ${U.dateFR(meta.majLe)}`
                : '';
            $('#pg').innerHTML = pagerHTML(pages);

            majQS({
                q: f.q,
                categorie: f.cat,
                ordonnance: f.ord,
                pharmacie: f.ph,
                tri: tri === 'nom' ? '' : tri,
            });
        } catch (e) {
            console.error(e);
            $('#compte').textContent = `⚠️ Erreur d'affichage : ${e.message}`;
        }
    }

    const pagerHTML = (pages) => {
        if (pages <= 1) return '';
        let h = `<button type="button" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''} aria-label="Page précédente">‹</button>`;
        for (let i = 1; i <= pages; i++)
            h += `<button type="button" data-page="${i}" class="${i === page ? 'act' : ''}"${i === page ? ' aria-current="page"' : ''}>${i}</button>`;
        h += `<button type="button" data-page="${page + 1}" ${page === pages ? 'disabled' : ''}>Suivant</button>`;
        return h;
    };

    const maj = () => {
        page = 1;
        rendre();
    };

    /* --- Événements --- */
    $('#pg').addEventListener('click', (e) => {
        const b = e.target.closest('button[data-page]');
        if (!b || b.disabled) return;
        page = Number(b.dataset.page);
        rendre();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    $('#f-ord').addEventListener('change', (e) => {
        f.ord = e.target.checked;
        maj();
    });
    document.querySelectorAll('input[name="tri"]').forEach((r) =>
        r.addEventListener('change', () => {
            tri = r.value;
            maj();
        }),
    );
    $('#f-reset').addEventListener('click', () => {
        location.href = '/medicaments.html';
    });

    rendre();
})().catch((e) => {
    console.error(e);
    document
        .getElementById('resultats')
        ?.insertAdjacentHTML(
            'beforebegin',
            `<p class="note">⚠️ Erreur de la page : ${e.message}</p>`,
        );
});
