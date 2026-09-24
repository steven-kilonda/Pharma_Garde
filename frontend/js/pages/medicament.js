/* Page fiche médicament : prix, disponibilité par officine triée par distance. */
(async () => {
    const U = PG.utils,
        esc = U.esc,
        $ = (s) => document.querySelector(s);
    const cible = $('#fiche');

    const id = U.param('id');
    const introuvable = () => `
      <div class="introuvable">
        <p>Médicament introuvable</p>
        <a class="btn btn-dark" href="/medicaments.html">Voir tous les médicaments</a>
      </div>`;
    if (!id) {
        cible.innerHTML = introuvable();
        return;
    }

    const [med, pharmacies, stocks, gardes] = await Promise.all([
        PG.api
            .get('medicaments')
            .then(
                (liste) =>
                    liste.find((m) => String(m.id) === String(id)) || null,
            )
            .catch(() => null),
        PG.api.get('pharmacies').catch(() => []),
        PG.api.get('stocks').catch(() => []),
        PG.api.get('gardes').catch(() => []),
    ]);
    if (!med) {
        cible.innerHTML = introuvable();
        return;
    }

    document.title = `${med.nom} — PharmaGarde Pointe-Noire`;

    /* Officines déclarant ce médicament */
    const lignes = stocks.filter((l) => String(l.medicamentId) === String(id));
    const parPharmacie = new Map(
        lignes.map((l) => [String(l.pharmacieId), l.statut]),
    );
    const officines = pharmacies
        .filter((p) => parPharmacie.has(String(p.id)))
        .map((p) => ({ p, statut: parPharmacie.get(String(p.id)) }));

    /* Position : utilisateur, repli centre-ville — tri au chargement */
    const CENTRE_VILLE = { latitude: -4.79, longitude: 11.85 };
    let pos = null;
    const enGardeIds = new Set(
        gardes
            .filter((g) => g.debut <= U.isoToday() && U.isoToday() <= g.fin)
            .map((g) => String(g.pharmacieId)),
    );

    /* Rendu principal (avant la géoloc, qui re-triera ensuite) */
    const rendreTableau = () => {
        const triees = [...officines].sort((a, b) => {
            const dA = pos ? U.distanceKm(pos, a.p) : null;
            const dB = pos ? U.distanceKm(pos, b.p) : null;
            const ordreStatut = (s) => (s === 'disponible' ? 0 : 1);
            return (
                ordreStatut(a.statut) - ordreStatut(b.statut) ||
                (dA ?? 99) - (dB ?? 99) ||
                a.p.nom.localeCompare(b.p.nom, 'fr')
            );
        });
        $('#tab-off-body').innerHTML = triees
            .map(({ p, statut }) => {
                const km = pos ? U.distanceKm(pos, p) : null;
                const enGarde = enGardeIds.has(String(p.id));
                const dispo = statut === 'disponible';
                return `
          <tr class="${dispo ? '' : 't-rupture'}">
            <td>
              <a href="/pharmacie.html?id=${encodeURIComponent(p.id)}" style="font-weight:600;text-decoration:none">${esc(p.nom)}</a>
              <span style="display:block;font-size:12.5px;color:var(--muted)">
                ${esc(p.quartier || '')}${km != null ? ` · à ${km.toFixed(1).replace('.', ',')} km` : ''}${enGarde ? ' · de garde' : ''}
              </span>
            </td>
            <td class="t-prix">${dispo ? U.fcfa(med.prix) : '—'}</td>
            <td>
              <span class="${dispo ? 'stock-ok' : 'stock-rp'}">${dispo ? 'EN STOCK' : 'RUPTURE'}</span>
            </td>
            <td style="text-align:right">
              <a class="btn btn-dark" style="min-height:38px" href="${U.telHref((p.telephones || [])[0] || '')}">${U.icon('phone', 15)} Appeler</a>
            </td>
          </tr>`;
            })
            .join('');
    };

    const nbOk = officines.filter((o) => o.statut === 'disponible').length;

    cible.innerHTML = `
    <div class="fiche-top">
      <div style="min-width:0">
        <div class="fiche-id-badges">
          ${med.ordonnance ? '<span class="m-ordonnance">Sur ordonnance</span>' : '<span class="badge badge-ouvert">Sans ordonnance</span>'}
          <span class="badge badge-ouvert">${esc(med.categorie)}</span>
        </div>
        <h1>${esc(med.nom)}</h1>
      </div>
    </div>

    <div class="prix-box">
      <span class="p-val">${U.fcfa(med.prix)}</span>
      <span class="p-meta">prix indicatif · ${nbOk} officine${nbOk > 1 ? 's' : ''} le déclarent en stock aujourd'hui</span>
    </div>

    <p class="note" style="margin-top:18px;max-width:70ch">
      Prix déclarés par les officines, susceptibles d'évoluer. Aucune vente en
      ligne sur ce site — demandez toujours conseil à votre pharmacien.
    </p>

    <section style="margin-top:36px">
      <h2 style="font-size:1.35rem;letter-spacing:-0.02em">Où le trouver à Pointe-Noire</h2>
      <table class="tab-off">
        <thead>
          <tr><th>Officine</th><th>Prix</th><th>Stock</th><th></th></tr>
        </thead>
        <tbody id="tab-off-body"></tbody>
      </table>
      ${officines.length ? '' : '<p class="note" style="margin-top:12px">Aucune officine ne déclare ce médicament dans ses stocks actuellement.</p>'}
    </section>`;

    $('#crumbs').innerHTML =
        `<a href="/index.html">Accueil</a> › <a href="/medicaments.html">Médicaments</a> › <span>${esc(med.nom)}</span>`;

    rendreTableau();

    /* Géoloc non bloquante : re-tri du tableau quand la position arrive */
    U.maPosition()
        .then((p) => {
            pos = p;
            rendreTableau();
        })
        .catch(() => {
            pos = CENTRE_VILLE;
            rendreTableau();
        });
})().catch((e) => {
    console.error(e);
    document
        .getElementById('fiche')
        ?.insertAdjacentHTML(
            'afterbegin',
            `<p class="note"> Erreur de la page : ${e.message}</p>`,
        );
});
