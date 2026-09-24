/* Page carte plein écran : markers filtrables, panneau synchronisé, géoloc. */
(async () => {
    const U = PG.utils,
        esc = U.esc,
        $ = (s) => document.querySelector(s);

    const [arrondissements, pharmacies, gardes] = await Promise.all([
        PG.api.get('arrondissements').catch(() => []),
        PG.api.get('pharmacies').catch(() => []),
        PG.api.get('gardes').catch(() => []),
    ]);
    if (!pharmacies.length) {
        document
            .querySelector('.carte-zone')
            .insertAdjacentHTML(
                'afterbegin',
                '<p class="note" style="position:relative;z-index:1001;margin:16px">⚠️ Données indisponibles — vérifie que le backend tourne.</p>',
            );
        return;
    }

    /* --- État --- */
    const today = U.isoToday();
    const enGardeIds = new Set(
        gardes
            .filter((g) => g.debut <= today && today <= g.fin)
            .map((g) => String(g.pharmacieId)),
    );
    const nomArr = (id) =>
        (arrondissements.find((a) => String(a.id) === String(id)) || {}).nom ||
        '';
    const fmtKm = (km) =>
        km == null ? '' : `${km.toFixed(1).replace('.', ',')} km`;
    const CENTRE_VILLE = { latitude: -4.79, longitude: 11.85 };
    let pos = CENTRE_VILLE;

    const f = {
        q: (U.param('q') || '').trim(),
        arr: U.param('arrondissement') || '',
        garde: U.param('garde') === '1',
        ouvert: U.param('ouvert') === '1',
    };
    const cibleId = U.param('pharmacie');

    /* --- Contrôles de filtre --- */
    const selArr = $('#cf-arr');
    selArr.innerHTML =
        '<option value="">Tous les arrondissements</option>' +
        arrondissements
            .map(
                (a) =>
                    `<option value="${esc(a.id)}"${String(a.id) === f.arr ? ' selected' : ''}>${esc(a.numero)} — ${esc(a.nom)}</option>`,
            )
            .join('');
    const btnGarde = $('#cf-garde'),
        btnOuvert = $('#cf-ouvert');
    btnGarde.setAttribute('aria-pressed', String(f.garde));
    btnOuvert.setAttribute('aria-pressed', String(f.ouvert));
    $('#cf-q').value = f.q;

    const majQS = () => {
        const p = new URLSearchParams();
        if (f.q) p.set('q', f.q);
        if (f.arr) p.set('arrondissement', f.arr);
        if (f.garde) p.set('garde', '1');
        if (f.ouvert) p.set('ouvert', '1');
        const qs = p.toString();
        history.replaceState(null, '', '/carte.html' + (qs ? '?' + qs : ''));
    };

    /* --- Carte --- */
    const map = L.map('carte', { zoomControl: false });
    map.setView([-4.79, 11.85], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    setTimeout(() => map.invalidateSize(), 150);

    const groupe = L.layerGroup().addTo(map);
    const markers = new Map();

    const filtres = () =>
        pharmacies.filter((p) => {
            if (f.arr && String(p.arrondissementId) !== f.arr) return false;
            if (f.garde && !enGardeIds.has(String(p.id))) return false;
            if (f.ouvert && !U.statut(p, gardes).ouverte) return false;
            if (f.q && !U.match(p, f.q)) return false;
            return true;
        });

    const pinOpts = (p) => {
        const s = U.statut(p, gardes);
        return s.code === 'garde24h' || s.code === 'garde'
            ? { enGarde: true }
            : s.code === 'fermee'
              ? { fermee: true }
              : {};
    };

    const popupHTML = (p) => {
        const tel = (p.telephones || [])[0] || '';
        return `<strong>Pharmacie ${esc(p.nom)}</strong><br>
          <span style="color:var(--muted)">${esc(p.quartier || '')}${p.repere ? ` · ${esc(p.repere)}` : ''}</span><br>
          ${tel ? `<a href="${U.telHref(tel)}">${esc(tel)}</a> · ` : ''}<a href="/pharmacie.html?id=${encodeURIComponent(p.id)}">Fiche complète</a>`;
    };

    function rendreMarkers() {
        groupe.clearLayers();
        markers.clear();
        for (const p of filtres()) {
            if (p.latitude == null || p.longitude == null) continue;
            const m = L.marker([p.latitude, p.longitude], {
                icon: U.creerPin(L, pinOpts(p)),
                pid: String(p.id),
            }).bindPopup(popupHTML(p));
            groupe.addLayer(m);
            markers.set(String(p.id), m);
        }
    }

    /* --- Panneau de résultats --- */
    const ligne = (p) => {
        const tel = (p.telephones || [])[0] || '';
        const km = U.distanceKm(pos, p);
        return `
        <div class="cp-row" data-id="${esc(p.id)}">
          <div class="t">${U.badge(U.statut(p, gardes))}${km != null ? `<small>${fmtKm(km)}</small>` : ''}</div>
          <h3>Pharmacie ${esc(p.nom)}</h3>
          <p class="where">${esc(nomArr(p.arrondissementId))}${p.quartier ? ` · ${esc(p.quartier)}` : ''}</p>
          <div class="acts">
            ${tel ? `<a class="btn btn-dark" href="${U.telHref(tel)}">${U.icon('phone', 14)} Appeler</a>` : ''}
            <a class="btn btn-outline" href="/pharmacie.html?id=${encodeURIComponent(p.id)}">Fiche</a>
          </div>
        </div>`;
    };

    function rendreListe() {
        const liste = filtres().sort(
            (a, b) =>
                (U.distanceKm(pos, a) ?? 99) - (U.distanceKm(pos, b) ?? 99) ||
                a.nom.localeCompare(b.nom, 'fr'),
        );
        $('#cp-liste').innerHTML =
            liste.map(ligne).join('') ||
            '<p class="note" style="padding:16px">Aucune pharmacie ne correspond aux filtres.</p>';
        $('#cp-compte').textContent =
            `${liste.length} pharmacie${liste.length > 1 ? 's' : ''}` +
            (f.arr ? ` à ${nomArr(f.arr)}` : ' · triées par distance');
        $('#cp-titre').textContent = f.arr
            ? `Pharmacies à ${nomArr(f.arr)}`
            : 'Pharmacies';
    }

    function highlight(id) {
        document
            .querySelectorAll('.cp-row')
            .forEach((r) =>
                r.classList.toggle('hl', r.dataset.id === String(id)),
            );
        document
            .querySelector(`.cp-row[data-id="${String(id)}"]`)
            ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    /* --- Panneau → carte --- */
    $('#cp-liste').addEventListener('click', (e) => {
        if (e.target.closest('a')) return; // Appeler / Fiche : navigation normale
        const row = e.target.closest('.cp-row[data-id]');
        if (!row) return;
        const m = markers.get(row.dataset.id);
        if (m) {
            map.flyTo(m.getLatLng(), 16);
            m.openPopup();
        }
        highlight(row.dataset.id);
    });

    /* Survol d'une ligne → le pin grossit */
    $('#cp-liste').addEventListener('mouseover', (e) => {
        const row = e.target.closest('.cp-row[data-id]');
        markers.get(row?.dataset.id)?.getElement()?.classList.add('hover');
    });
    $('#cp-liste').addEventListener('mouseout', (e) => {
        const row = e.target.closest('.cp-row[data-id]');
        markers.get(row?.dataset.id)?.getElement()?.classList.remove('hover');
    });

    /* --- Carte → panneau (popup ouverte = ligne surlignée) --- */
    map.on('popupopen', (e) => highlight(e.popup._source?.options?.pid));

    /* --- Événements filtres --- */
    const maj = () => {
        rendreMarkers();
        rendreListe();
        majQS();
    };
    btnGarde.addEventListener('click', () => {
        f.garde = !f.garde;
        btnGarde.setAttribute('aria-pressed', String(f.garde));
        maj();
    });
    btnOuvert.addEventListener('click', () => {
        f.ouvert = !f.ouvert;
        btnOuvert.setAttribute('aria-pressed', String(f.ouvert));
        maj();
    });
    selArr.addEventListener('change', () => {
        f.arr = selArr.value;
        maj();
    });
    $('#cf-q').addEventListener('input', (e) => {
        f.q = e.target.value.trim();
        maj();
    });

    /* --- Contrôles carte --- */
    $('#c-geo').addEventListener('click', () => {
        U.maPosition()
            .then((p) => {
                pos = p;
                map.flyTo([p.latitude, p.longitude], 14);
                rendreListe();
            })
            .catch(() => {});
    });
    $('#c-zin').addEventListener('click', () => map.zoomIn());
    $('#c-zout').addEventListener('click', () => map.zoomOut());

    /* --- Panneau repliable (replié par défaut sur mobile) --- */
    const panel = $('#panel'),
        btnToggle = $('#cp-toggle');
    const setPanel = (ouvert) => {
        panel.classList.toggle('replie', !ouvert);
        btnToggle.setAttribute('aria-expanded', String(ouvert));
        btnToggle.textContent = ouvert ? '‹' : '›';
    };
    btnToggle.addEventListener('click', () =>
        setPanel(panel.classList.contains('replie')),
    );
    if (window.innerWidth < 720) setPanel(false);

    /* --- Rendu initial + cible éventuelle --- */
    rendreMarkers();
    rendreListe();

    if (cibleId) {
        const p = pharmacies.find((x) => String(x.id) === String(cibleId));
        const m = markers.get(String(cibleId));
        if (p && m) {
            map.flyTo([p.latitude, p.longitude], 16);
            setTimeout(() => m.openPopup(), 400);
            highlight(cibleId);
        }
    } else {
        /* Géoloc non bloquante : re-tri de la liste quand la position arrive */
        U.maPosition()
            .then((p) => {
                pos = p;
                rendreListe();
            })
            .catch(() => {});
    }
})();
