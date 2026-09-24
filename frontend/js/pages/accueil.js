/* Page accueil : chiffres, pharmacies de garde en cours, zones dépliables. */
(async () => {
    const U = PG.utils,
        esc = U.esc,
        $ = (id) => document.getElementById(id);

    const [meta, arrondissements, pharmacies, gardes] = await Promise.all([
        PG.api.get('meta').catch((e) => {
            console.error(e);
            return null;
        }),
        PG.api.get('arrondissements').catch((e) => {
            console.error(e);
            return [];
        }),
        PG.api.get('pharmacies').catch((e) => {
            console.error(e);
            return [];
        }),
        PG.api.get('gardes').catch((e) => {
            console.error(e);
            return [];
        }),
    ]);

    /* --- Chiffres --- */
    const enGardeIds = new Set(gardes.map((g) => String(g.pharmacieId)));
    $('stats').innerHTML = `
      <div class="stat"><dt>Pharmacies vérifiées</dt><dd>${pharmacies.length}</dd></div>
      <div class="stat"><dt>De garde cette semaine</dt><dd>${enGardeIds.size}</dd></div>
      <div class="stat"><dt>Arrondissements couverts</dt><dd>${arrondissements.length}</dd></div>`;

    $('semaine-label').textContent = meta
        ? `Semaine du ${U.plageFR(meta.semaineDu, meta.semaineAu)} · vérifiée le ${U.dateFR(meta.majLe)}.`
        : 'Planning indisponible — backend injoignable.';

    /* --- De garde ce soir --- */
    const today = U.isoToday();
    const gardeAujourdhui = pharmacies
        .filter((p) =>
            gardes.some(
                (g) =>
                    String(g.pharmacieId) === String(p.id) &&
                    g.debut <= today &&
                    today <= g.fin,
            ),
        )
        .sort((a, b) => Number(b.garde24h) - Number(a.garde24h))
        .slice(0, 3);

    const carte = (p) => {
        const tel = (p.telephones && p.telephones[0]) || '';
        return `
        <article class="pcard">
          <div class="pcard-top"><small>${esc(p.quartier || '')}</small>${U.badge(U.statut(p, gardes))}</div>
          <h3><a href="/pharmacie.html?id=${encodeURIComponent(p.id)}">${esc(p.nom)}</a></h3>
          <p class="r">${esc(p.repere || '')}</p>
          <div class="pcard-actions">
            <a class="btn btn-primary btn-grow" href="${U.telHref(tel)}">${U.icon('phone', 16)} Appeler</a>
            <a class="btn btn-outline" href="${U.itineraireHref(p)}" target="_blank" rel="noopener">Itinéraire</a>
          </div>
        </article>`;
    };

    $('gardes-cards').innerHTML = !pharmacies.length
        ? '<p class="note">  Données indisponibles — vérifie que le backend tourne (npm run dev).</p>'
        : gardeAujourdhui.length
          ? gardeAujourdhui.map(carte).join('')
          : '<p class="note">Aucune pharmacie de garde aujourd\'hui selon le planning en base.</p>';

    /* --- Zones --- */
    const zones = $('zones');
    if (!arrondissements.length) {
        zones.innerHTML =
            '<p class="note">   Arrondissements indisponibles — backend injoignable.</p>';
        return;
    }

    const nbPharmacies = (id) =>
        pharmacies.filter((p) => String(p.arrondissementId) === String(id))
            .length;
    const nbEnGarde = (id) =>
        pharmacies.filter(
            (p) =>
                String(p.arrondissementId) === String(id) &&
                enGardeIds.has(String(p.id)),
        ).length;

    zones.innerHTML =
        arrondissements
            .map(
                (a) => `
        <button type="button" class="zone" data-zone="${esc(a.id)}" aria-expanded="false">
          <small>Arrondissement ${esc(a.numero)}</small>
          <strong>${esc(a.nom)}</strong>
          <span class="zn">${nbEnGarde(a.id)} en garde · ${nbPharmacies(a.id)} pharmacies</span>
        </button>`,
            )
            .join('') +
        `
        <a class="zone zone-cta zone-all" href="/pharmacies.html">
          <strong>Toutes les pharmacies</strong><span class="push">Liste complète et recherche</span>
        </a>
        <a class="zone zone-cta zone-map" href="/carte.html">
          <strong>Voir la carte</strong><span class="push">Pharmacies géolocalisées</span>
        </a>`;

    zones.addEventListener('click', (e) => {
        const z = e.target.closest('.zone[data-zone]');
        if (!z) return;
        const etaitOuvert = z.getAttribute('aria-expanded') === 'true';
        zones
            .querySelectorAll('.zone[data-zone]')
            .forEach((b) => b.setAttribute('aria-expanded', 'false'));
        zones.querySelector('.zone-panel')?.remove();
        if (etaitOuvert) return;

        z.setAttribute('aria-expanded', 'true');
        const id = z.dataset.zone;
        const nom =
            (arrondissements.find((a) => String(a.id) === String(id)) || {})
                .nom || '';
        const liste = pharmacies.filter(
            (p) => String(p.arrondissementId) === String(id),
        );
        const item = (p) => `<li>
          <a href="/pharmacie.html?id=${encodeURIComponent(p.id)}">${esc(p.nom)}
            <span>${esc(p.quartier || '')}${enGardeIds.has(String(p.id)) ? ' · de garde' : ''}</span>
          </a></li>`;

        z.insertAdjacentHTML(
            'afterend',
            `
          <div class="zone-panel">
            <h3>Arrondissement de ${esc(nom)}</h3>
            <ul class="chips"><li><a class="chip" href="/pharmacies.html?arrondissement=${encodeURIComponent(id)}"><b>${nbEnGarde(id)}</b> en garde cette semaine</a></li></ul>
            <ul class="panel-list">${liste.map(item).join('') || '<li class="note">Aucune officine répertoriée.</li>'}</ul>
            <p class="panel-foot"><a class="text-link" href="/pharmacies.html?arrondissement=${encodeURIComponent(id)}">Voir toutes les pharmacies de l'arrondissement</a></p>
          </div>`,
        );
    });
})();
