/* Page fiche pharmacie : identité, horaires, stock, mini-carte, proximité. */
(async () => {
    const U = PG.utils,
        esc = U.esc,
        $ = (s) => document.querySelector(s);
    const cible = $('#fiche');

    const JOURS_LONG = {
        dim: 'dimanche',
        lun: 'lundi',
        mar: 'mardi',
        mer: 'mercredi',
        jeu: 'jeudi',
        ven: 'vendredi',
        sam: 'samedi',
    };
    const ORDRE = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];
    const heureFR = (h) => String(h).replace(':', 'h');
    const minutesOf = (hhmm) => {
        const [h, m] = String(hhmm).split(':').map(Number);
        return h * 60 + m;
    };
    const fmtKm = (km) =>
        km == null ? '' : `à ${km.toFixed(1).replace('.', ',')} km`;
    const toast = (msg) => {
        let t = document.getElementById('toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'toast';
            t.className = 'toast';
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(t._h);
        t._h = setTimeout(() => t.classList.remove('show'), 3200);
    };
    const prochaineOuverture = (p) => {
        const now = new Date();
        const mNow = now.getHours() * 60 + now.getMinutes();
        for (let j = 0; j < 7; j++) {
            const d = new Date(now);
            d.setDate(now.getDate() + j);
            const h = (p.horaires || {})[U.JOURS[d.getDay()]];
            if (!h) continue;
            if (j === 0) {
                if (mNow >= minutesOf(h[0])) continue;
                return `rouvre aujourd'hui à ${heureFR(h[0])}`;
            }
            return `rouvre ${j === 1 ? 'demain' : JOURS_LONG[U.JOURS[d.getDay()]]} à ${heureFR(h[0])}`;
        }
        return null;
    };
    const introuvable = () => `
      <div class="introuvable">
        <p>Pharmacie introuvable</p>
        <a class="btn btn-dark" href="/pharmacies.html">Voir toutes les pharmacies</a>
      </div>`;

    const id = U.param('id');
    if (!id) {
        cible.innerHTML = introuvable();
        return;
    }

    const [
        ph,
        arrondissements,
        gardes,
        meta,
        pharmaciesList,
        medicaments,
        stockLignes,
    ] = await Promise.all([
        PG.api.getPharmacie(id).catch((e) => {
            console.error(e);
            return null;
        }),
        PG.api.get('arrondissements').catch(() => []),
        PG.api.get('gardes').catch(() => []),
        PG.api.get('meta').catch(() => null),
        PG.api.get('pharmacies').catch(() => []),
        PG.api.get('medicaments').catch(() => null),
        PG.api.get('stocks').catch(() => null),
    ]);

    if (!ph) {
        cible.innerHTML = introuvable();
        return;
    }

    const today = U.isoToday();
    const enGarde = gardes.some(
        (g) =>
            String(g.pharmacieId) === String(ph.id) &&
            g.debut <= today &&
            today <= g.fin,
    );
    const s = U.statut(ph, gardes);
    const arr =
        arrondissements.find(
            (a) => String(a.id) === String(ph.arrondissementId),
        ) || {};
    document.title = `Pharmacie ${ph.nom} — PharmaGarde Pointe-Noire`;

    /* Ligne de statut riche */
    const hAuj = (ph.horaires || {})[U.JOURS[new Date().getDay()]];
    let ligneStatut;
    if (s.code === 'garde24h') ligneStatut = 'Ouverte 24h/24 (garde)';
    else if (s.code === 'garde' && s.ouverte)
        ligneStatut = `Ouverte jusqu'à ${heureFR(hAuj[1])} (garde)`;
    else if (s.code === 'garde')
        ligneStatut = 'Sur appel la nuit — appelez avant de vous déplacer';
    else if (s.code === 'ouverte')
        ligneStatut = `Ouverte jusqu'à ${heureFR(hAuj[1])}`;
    else {
        const pr = prochaineOuverture(ph);
        ligneStatut = pr ? `Fermée · ${pr}` : 'Fermée';
    }

    /* Horaires de la semaine */
    const jAuj = U.JOURS[new Date().getDay()];
    const horairesHTML = ORDRE.map((j) => {
        const h = (ph.horaires || {})[j];
        const actif = j === jAuj;
        return `<div class="hr-row${actif ? ' actif' : ''}">
          <span>${JOURS_LONG[j]}${actif ? '<em class="hr-tag">Aujourd\u2019hui</em>' : ''}</span>
          <span class="hr-heures">${h ? `${heureFR(h[0])} – ${heureFR(h[1])}` : 'Fermé'}</span>
        </div>`;
    }).join('');

    /* Stock (section conditionnelle : requiert /api/medicaments + /api/stocks) */
    let stockHTML = '';
    if (medicaments && stockLignes) {
        const lignes = stockLignes.filter(
            (l) =>
                String(l.pharmacieId) === String(ph.id) &&
                l.statut === 'disponible',
        );
        const ruptures = stockLignes.filter(
            (l) =>
                String(l.pharmacieId) === String(ph.id) &&
                l.statut === 'rupture',
        ).length;
        stockHTML = `
        <section>
          <h2>Médicaments disponibles en stock</h2>
          <div class="med-grid">
            ${
                lignes
                    .slice(0, 3)
                    .map(
                        (l) => `
            <div class="med-mini">
              <p class="cat">${esc(l.categorie)}</p>
              <p class="nom">${esc(l.nom)}</p>
              <p class="prix">≈ ${U.fcfa(l.prix)}</p>
            </div>`,
                    )
                    .join('') ||
                '<p class="note">Aucun médicament déclaré en stock.</p>'
            }
          </div>
          <p style="margin-top:14px"><a class="text-link" href="/medicaments.html?pharmacie=${encodeURIComponent(ph.id)}">
            Voir les ${lignes.length} médicaments${ruptures ? ` (${ruptures} en rupture)` : ''}
          </a> <span class="dim" style="color:var(--muted);font-size:13px">· prix indicatifs FCFA</span></p>
        </section>`;
    }

    /* Proximité : haversine entre la fiche et les autres (indépendant de l'utilisateur) */
    const proches = pharmaciesList
        .filter((p) => String(p.id) !== String(ph.id))
        .map((p) => [p, U.distanceKm(ph, p)])
        .filter(([, km]) => km != null)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 3);

    const tel0 = (ph.telephones && ph.telephones[0]) || '';

    cible.innerHTML = `
    <div class="fiche-top">
      <div style="min-width:0">
        <div class="fiche-id-badges">
          ${U.badge(s)}
          ${ph.garde24h ? '<span class="mini-tag">24h/24</span>' : ''}
          ${ph.verifieeLe ? `<span class="badge badge-ouvert">Vérifiée le ${U.dateFR(ph.verifieeLe)}</span>` : ''}
          <span class="fiche-code">${esc(ph.code)}</span>
        </div>
        <h1>Pharmacie ${esc(ph.nom)}</h1>
        <p class="fiche-lieu">${esc(ph.quartier || '')}${ph.repere ? ` · ${esc(ph.repere)}` : ''}${arr.nom ? ` — ${esc(arr.numero)}<sup>e</sup> arrondissement, ${esc(arr.nom)}` : ''}<span id="km-ligne"></span></p>
      </div>
      <div class="fiche-actions">
        ${tel0 ? `<a class="btn btn-primary" style="min-height:48px" href="${U.telHref(tel0)}">${U.icon('phone', 16)} Appeler · ${esc(tel0)}</a>` : ''}
        <div class="fiche-actions-row">
          <a class="btn btn-outline btn-grow" target="_blank" rel="noopener" href="${U.itineraireHref(ph)}">${U.icon('pin', 16)} Itinéraire</a>
          <button id="fiche-share" class="btn btn-outline" type="button" title="Copier le lien">${U.icon('share', 16)}</button>
        </div>
      </div>
    </div>

    <div class="fiche-band">
      <span class="strong">${U.icon('clock', 16)} ${esc(ligneStatut)}</span>
      ${enGarde && meta ? `<span class="dim">De garde jusqu'au ${U.dateFR(meta.semaineAu)}</span>` : ''}
      <span class="dim">Planning publié chaque semaine · source officielle</span>
    </div>

    <div class="fiche-grid">
      <section style="display:grid;gap:40px">
        <div>
          <h2>Horaires de la semaine</h2>
          <div class="hr-list">${horairesHTML}</div>
        </div>
        ${stockHTML}
        <div>
            <h2>Localisation</h2>
            <div class="mini-map-wrap">
                <div id="mini-map"></div>
                <a class="text-link" style="display:block;padding:12px 16px;border-top:1px solid var(--line)"
                href="/carte.html?pharmacie=${encodeURIComponent(ph.id)}">
                Ouvrir dans la carte complète ↗
                </a>
            </div>
        </div>
      </section>

      <aside>
        <div class="aside-card">
          <h3>Services</h3>
          <ul class="svc">
            ${(ph.services || []).map((sv) => `<li><span class="ic">${U.icon('check', 15)}</span>${esc(sv)}</li>`).join('') || '<li class="note">Non renseigné</li>'}
          </ul>
        </div>
        <div class="aside-card">
          <h3>Prochaines gardes</h3>
          <p style="margin:12px 0 0;font-size:13.5px;line-height:1.55">
            ${
                enGarde && meta
                    ? `Semaine du <strong>${U.dateFR(meta.semaineDu)}</strong> au <strong>${U.dateFR(meta.semaineAu)}</strong>${ph.garde24h ? ' — service 24h/24.' : ' — horaires habituels en journée.'}`
                    : 'Aucune garde publiée pour cette officine sur la période affichée.'
            }
          </p>
          <p style="margin:10px 0 0;font-size:12px;color:var(--muted)">Le planning suivant est publié chaque semaine.</p>
        </div>
        <div class="aside-card">
          <h3>Téléphones</h3>
          <div class="tel-list">
            ${(ph.telephones || []).map((t) => `<a class="btn btn-outline" href="${U.telHref(t)}">${U.icon('phone', 16)} ${esc(t)}</a>`).join('') || '<p class="note">Aucun numéro publié</p>'}
          </div>
        </div>

        <div class="aside-card">
            <h3>Une erreur sur cette fiche&nbsp;?</h3>
            <p style="margin:10px 0 12px;font-size:13.5px;color:var(--muted)">Horaires, téléphone, statut — aidez-nous à corriger.</p>
            <a class="btn btn-outline btn-grow" href="/urgence.html?pharmacie=${encodeURIComponent(ph.id)}#signaler">Signaler</a>
        </div>
      </aside>
    </div>

    ${
        proches.length
            ? `
    <section style="margin-top:48px;padding-bottom:16px">
      <h2 style="font-size:1.35rem;letter-spacing:-0.02em">Autres pharmacies à proximité</h2>
      <div class="proches">
        ${proches
            .map(
                ([p, km]) => `
        <a class="pcard" href="/pharmacie.html?id=${encodeURIComponent(p.id)}" style="text-decoration:none">
          <div class="pcard-top">${U.badge(U.statut(p, gardes))}<small>${fmtKm(km)}</small></div>
          <h3 style="margin-top:12px;font-size:16px">Pharmacie ${esc(p.nom)}</h3>
          <p class="r">${esc(p.quartier || '')}${(p.telephones || [])[0] ? ` · ${esc(p.telephones[0])}` : ''}</p>
        </a>`,
            )
            .join('')}
      </div>
    </section>`
            : ''
    }`;

    /* Breadcrumb */
    $('#crumbs').innerHTML =
        `<a href="/index.html">Accueil</a> › <a href="/pharmacies.html">Pharmacies</a> › <span>${esc(ph.nom)}</span>`;

    /* Distance utilisateur : best-effort, après rendu (pas bloquant) */
    U.maPosition()
        .then((pos) => {
            const km = U.distanceKm(pos, ph);
            if (km != null)
                $('#km-ligne').innerHTML =
                    ` · <strong style="color:var(--ink)">${fmtKm(km)}</strong>`;
        })
        .catch(() => {});

    /* Partage */
    $('#fiche-share').addEventListener('click', async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Pharmacie ${ph.nom}`,
                    url: location.href,
                });
            } catch {}
        } else {
            try {
                await navigator.clipboard.writeText(location.href);
                toast('Lien copié.');
            } catch {}
        }
    });

    /* Mini-carte (Leaflet peut être absent si CDN indisponible : fiche utilisable quand même) */
    /* Mini-carte : tuiles OSM + pin + popup itinéraire — erreurs visibles */
    const mapEl = document.getElementById('mini-map');
    if (typeof L === 'undefined') {
        mapEl.insertAdjacentHTML(
            'beforebegin',
            '<p class="note">⚠️ Bibliothèque de carte non chargée (Leaflet).</p>',
        );
    } else if (ph.latitude == null || ph.longitude == null) {
        mapEl.insertAdjacentHTML(
            'beforebegin',
            '<p class="note">Coordonnées GPS non renseignées pour cette officine.</p>',
        );
    } else {
        try {
            const map = L.map('mini-map', {
                scrollWheelZoom: false,
                attributionControl: false,
            });
            map.setView([ph.latitude, ph.longitude], 16);
            /* Fond de plan : LA LIGNE qui manquait */
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap',
            }).addTo(map);
            const marker = L.marker([ph.latitude, ph.longitude], {
                icon: U.creerPin(L, { enGarde }),
            })
                .addTo(map)
                .bindPopup(
                    `<strong>Pharmacie ${esc(ph.nom)}</strong><br>${esc(ph.quartier || '')}<br>
                     <a href="${U.itineraireHref(ph)}" target="_blank" rel="noopener">Itinéraire vers ce point</a>`,
                );
            /* Recalcule les dimensions du conteneur après rendu du layout */
            setTimeout(() => map.invalidateSize(), 150);
            marker.openPopup();
        } catch (e) {
            console.warn('Carte :', e);
            mapEl.insertAdjacentHTML(
                'beforebegin',
                `<p class="note"> Carte indisponible : ${esc(e.message)}</p>`,
            );
        }
    }
})().catch((e) => {
    console.error(e);
    document
        .getElementById('fiche')
        ?.insertAdjacentHTML(
            'afterbegin',
            `<p class="note">  Erreur de la page : ${e.message}</p>`,
        );
});
