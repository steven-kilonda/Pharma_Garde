/* Page pharmacies : sidebar filtres + tri, lignes de résultats, pagination. */
(async () => {
    const U = PG.utils,
        esc = U.esc,
        $ = (s) => document.querySelector(s);

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
    if (!pharmacies.length) {
        $('#resultats').innerHTML =
            '<p class="note">Données indisponibles — vérifie que le backend tourne.</p>';
        return;
    }

    /* --- état --- */
    const today = U.isoToday();
    const debutSemaine = meta?.semaineDu || today;
    const finSemaine = meta?.semaineAu || today;
    const enGardeIds = new Set(
        gardes
            .filter((g) => g.debut <= finSemaine && debutSemaine <= g.fin)
            .map((g) => String(g.pharmacieId)),
    );
    const enGardeAujourdhuiIds = new Set(
        gardes
            .filter((g) => g.debut <= today && today <= g.fin)
            .map((g) => String(g.pharmacieId)),
    );
    const nomArr = (id) =>
        (arrondissements.find((a) => String(a.id) === String(id)) || {}).nom ||
        '';
    const JOURS_LONG = {
        dim: 'dimanche',
        lun: 'lundi',
        mar: 'mardi',
        mer: 'mercredi',
        jeu: 'jeudi',
        ven: 'vendredi',
        sam: 'samedi',
    };
    const heureFR = (h) => String(h).replace(':', 'h');
    const minutesOf = (hhmm) => {
        const [h, m] = String(hhmm).split(':').map(Number);
        return h * 60 + m;
    };
    const fmtKm = (km) =>
        km == null ? '' : `à ${km.toFixed(1).replace('.', ',')} km`;
    const PAR_PAGE = 6;

    const CENTRE_VILLE = { latitude: -4.79, longitude: 11.85 };
    let pos = CENTRE_VILLE,
        page = 1;
    const f = {
        q: (U.param('q') || '').trim(),
        arr: U.param('arrondissement') || '',
        quartier: U.param('quartier') || '',
        garde: U.param('garde') === '1',
        ouvert: U.param('ouvert') === '1',
        h24: U.param('h24') === '1',
        dist: Number(U.param('dist') || 0),
        services: new Set(
            (U.param('services') || '').split(',').filter(Boolean),
        ),
        tri: U.param('tri') || 'distance',
    };

    /* --- helpers locaux --- */
    const enGarde = (p) => enGardeIds.has(String(p.id));
    const enGardeAujourdhui = (p) =>
        enGardeAujourdhuiIds.has(String(p.id));
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
            '/pharmacies.html' + (qs ? '?' + qs : ''),
        );
    };
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
                return { texte: `rouvre aujourd'hui à ${heureFR(h[0])}` };
            }
            return {
                texte: `rouvre ${j === 1 ? 'demain' : JOURS_LONG[U.JOURS[d.getDay()]]} à ${heureFR(h[0])}`,
            };
        }
        return null;
    };

    /* --- sidebar : filtres + TRI --- */
    const tousServices = [
        ...new Set(pharmacies.flatMap((p) => p.services || [])),
    ].sort((a, b) => a.localeCompare(b, 'fr'));

    $('#filters').innerHTML = `
        <div class="filters-head">
            <h2>Filtres</h2>
            <button id="f-reset" class="text-link" type="button" style="font-size:13.5px">Réinitialiser</button>
        </div>
        <div><p class="f-label" style="margin-top:0">Trier par</p>
        <div class="tri-radio">
          ${[
              ['distance', 'Distance'],
              ['garde', 'De garde (aujourd\u2019hui)'],
              ['alphabetique', 'Alphabétique'],
          ]
              .map(
                  ([v, l]) =>
                      `<label class="check"><input type="radio" name="tri" value="${v}" ${f.tri === v ? 'checked' : ''}/> ${l}</label>`,
              )
              .join('')}
        </div></div>
      <div><p class="f-label">Position</p>
        <button id="f-pos" class="btn btn-dark btn-grow" type="button">${U.icon('pin', 16)} Utiliser ma position</button></div>
      <div><p class="f-label">Arrondissement</p>
        <select id="f-arr" class="field"><option value="">Tous les arrondissements</option>
          ${arrondissements.map((a) => `<option value="${esc(a.id)}"${String(a.id) === f.arr ? ' selected' : ''}>${esc(a.numero)} — ${esc(a.nom)}</option>`).join('')}</select></div>
      <div><p class="f-label">Quartier</p>
        <select id="f-quartier" class="field"><option value="">Tous les quartiers</option></select></div>
      <div><p class="f-label">Statut</p>
        <label class="check"><input type="checkbox" id="f-garde" ${f.garde ? 'checked' : ''}/> De garde cette semaine</label>
        <label class="check"><input type="checkbox" id="f-ouvert" ${f.ouvert ? 'checked' : ''}/> Ouvert maintenant</label>
        <label class="check"><input type="checkbox" id="f-h24" ${f.h24 ? 'checked' : ''}/> Ouvert 24h/24</label></div>
      ${
          tousServices.length
              ? `<div><p class="f-label">Services</p>
        ${tousServices.map((s) => `<label class="check"><input type="checkbox" data-service="${esc(s)}" ${f.services.has(s) ? 'checked' : ''}/> ${esc(s)}</label>`).join('')}</div>`
              : ''
      }
      <div><p class="f-label">Distance maximale</p>
        <input type="range" id="f-dist" min="0" max="15" step="1" value="${f.dist}"/>
        <p class="range-val">Rayon : <b id="f-dist-val">${f.dist ? f.dist + ' km' : 'désactivé'}</b> — <span id="distance-base">depuis le centre-ville (estimation)</span></p>
        <button id="voir-res" class="btn btn-dark btn-grow" type="button" style="margin-top:14px">Voir les résultats</button></div>`;

    const selArr = $('#f-arr'),
        selQua = $('#f-quartier'),
        rngDist = $('#f-dist');
    const majQuartiers = () => {
        const qs = [
            ...new Set(
                pharmacies
                    .filter(
                        (p) => !f.arr || String(p.arrondissementId) === f.arr,
                    )
                    .map((p) => p.quartier)
                    .filter(Boolean),
            ),
        ].sort((a, b) => a.localeCompare(b, 'fr'));
        selQua.innerHTML =
            '<option value="">Tous les quartiers</option>' +
            qs
                .map(
                    (q) =>
                        `<option${q === f.quartier ? ' selected' : ''}>${esc(q)}</option>`,
                )
                .join('');
    };
    majQuartiers();
    selQua.value = f.quartier;

    /* --- filtrage + tri --- */
    function resultats() {
        let r = pharmacies.filter((p) => {
            if (f.q && !U.match(p, f.q)) return false;
            if (f.arr && String(p.arrondissementId) !== f.arr) return false;
            if (f.quartier && p.quartier !== f.quartier) return false;
            if (f.garde && !enGarde(p)) return false;
            if (f.h24 && !p.garde24h) return false;
            if (f.ouvert && !U.statut(p, gardes).ouverte) return false;
            if (
                f.services.size &&
                ![...f.services].every((s) => (p.services || []).includes(s))
            )
                return false;
            p._km = pos ? U.distanceKm(pos, p) : null;
            if (f.dist && (p._km == null || p._km > f.dist)) return false;
            return true;
        });
        if (f.tri === 'distance')
            r.sort(
                (a, b) =>
                    (a._km ?? 99) - (b._km ?? 99) ||
                    a.nom.localeCompare(b.nom, 'fr'),
            );
        else if (f.tri === 'alphabetique')
            r.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
        else
            r.sort(
                (a, b) =>
                    Number(enGardeAujourdhui(b)) -
                        Number(enGardeAujourdhui(a)) ||
                    (a._km ?? 99) - (b._km ?? 99),
            );
        return r;
    }

    const infoLigne = (p) => {
        const s = U.statut(p, gardes);
        if (s.code === 'garde24h')
            return `Ouverte 24h/24 · garde jusqu'au ${U.dateFR(meta?.semaineAu)}`;
        if (s.code === 'garde' && s.ouverte)
            return 'Ouverte en ce moment · de garde, appelez avant de venir';
        if (s.code === 'garde')
            return 'De garde · sur appel — appelez avant de vous déplacer';
        if (s.code === 'ouverte') return 'Ouverte en ce moment';
        const pr = prochaineOuverture(p);
        return pr ? `Fermée · ${pr.texte}` : 'Fermée';
    };

    const carte = (p) => {
        const tel = (p.telephones && p.telephones[0]) || '';
        const dist = pos ? fmtKm(U.distanceKm(pos, p)) : '';
        return `
      <article class="lrow">
        <div class="lrow-main">
          <div class="lrow-badges">${U.badge(U.statut(p, gardes))}${enGardeAujourdhui(p) ? ' <span class="mini-tag">Aujourd\u2019hui</span>' : ''}</div>
          <h3><a href="/pharmacie.html?id=${encodeURIComponent(p.id)}">Pharmacie ${esc(p.nom)}</a></h3>
          <p class="where">${esc(nomArr(p.arrondissementId))}${p.quartier ? ` · ${esc(p.quartier)}` : ''}${dist ? ` · ${dist}` : ''}</p>
          <p class="info">${infoLigne(p)}</p>
        </div>
        <div class="lrow-actions">
          ${tel ? `<a class="btn btn-dark" href="${U.telHref(tel)}">${U.icon('phone', 16)} Appeler</a>` : ''}
          <a class="btn btn-outline" target="_blank" rel="noopener" href="${U.itineraireHref(p)}">Itinéraire</a>
        </div>
      </article>`;
    };

    /* --- pagination (boutons explicites type="button") --- */
    const pagerHTML = (pages) => {
        if (pages <= 1) return '';
        let h = `<button type="button" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''} aria-label="Page précédente">‹</button>`;
        for (let i = 1; i <= pages; i++)
            h += `<button type="button" data-page="${i}" class="${i === page ? 'act' : ''}"${i === page ? ' aria-current="page"' : ''}>${i}</button>`;
        h += `<button type="button" data-page="${page + 1}" ${page === pages ? 'disabled' : ''}>Suivant</button>`;
        return h;
    };

    function rendre() {
        try {
            const r = resultats();
            $('#titre').textContent = f.arr
                ? `Pharmacies à ${nomArr(f.arr)}`
                : 'Pharmacies';
            $('#crumbs').innerHTML =
                `<a href="/index.html">Accueil</a> › <a href="/pharmacies.html">Pharmacies</a>${f.arr ? ` › <span>${esc(nomArr(f.arr))}</span>` : ''}`;
            $('#head-badges').innerHTML =
                `<span class="badge badge-ouvert">${r.length} résultat${r.length > 1 ? 's' : ''}</span>` +
                `<span class="badge badge-garde">${enGardeIds.size} de garde</span>`;
            $('#maj-note').textContent = meta
                ? `Mis à jour le ${U.dateFR(meta.majLe)}`
                : '';
            $('#vue-carte').href =
                '/carte.html' +
                (f.arr ? `?arrondissement=${encodeURIComponent(f.arr)}` : '');

            const pages = Math.max(1, Math.ceil(r.length / PAR_PAGE));
            page = Math.min(Math.max(1, page), pages);
            $('#resultats').innerHTML = r
                .slice((page - 1) * PAR_PAGE, page * PAR_PAGE)
                .map(carte)
                .join('');
            $('#vide').hidden = r.length > 0;
            $('#compte').textContent =
                `Page ${page} sur ${pages} — ${r.length} résultat${r.length > 1 ? 's' : ''}${f.q ? ` pour « ${f.q} »` : ''}`;
            $('#pg').innerHTML = pagerHTML(pages);
            majQS({
                q: f.q,
                arrondissement: f.arr,
                quartier: f.quartier,
                garde: f.garde,
                ouvert: f.ouvert,
                h24: f.h24,
                dist: f.dist || '',
                services: [...f.services].join(',') || '',
                tri: f.tri === 'distance' ? '' : f.tri,
            });
        } catch (e) {
            console.error('Erreur de rendu :', e);
            $('#compte').textContent = `     Erreur d'affichage : ${e.message}`;
        }
    }
    const maj = () => {
        page = 1;
        rendre();
    };
    const appliquerPosition = (nouvellePosition) => {
        pos = nouvellePosition;
        document.getElementById('distance-base').textContent =
            'depuis votre position';
        const bouton = $('#f-pos');
        bouton.textContent = 'Position activée ✓';
        maj();
    };

    /* --- événements --- */
    selArr.addEventListener('change', () => {
        f.arr = selArr.value;
        f.quartier = '';
        majQuartiers();
        maj();
    });
    selQua.addEventListener('change', () => {
        f.quartier = selQua.value;
        maj();
    });
    $('#f-garde').addEventListener('change', (e) => {
        f.garde = e.target.checked;
        maj();
    });
    $('#f-ouvert').addEventListener('change', (e) => {
        f.ouvert = e.target.checked;
        maj();
    });
    $('#f-h24').addEventListener('change', (e) => {
        f.h24 = e.target.checked;
        maj();
    });
    $('#filters').addEventListener('change', (e) => {
        const s = e.target.dataset?.service;
        if (!s) return;
        e.target.checked ? f.services.add(s) : f.services.delete(s);
        maj();
    });
    document.querySelectorAll('input[name="tri"]').forEach((r) =>
        r.addEventListener('change', () => {
            f.tri = r.value;
            maj();
        }),
    );
    rngDist.addEventListener('input', () => {
        f.dist = Number(rngDist.value);
        $('#f-dist-val').textContent = f.dist ? f.dist + ' km' : 'désactivé';
    });
    rngDist.addEventListener('change', maj);
    $('#f-pos').addEventListener('click', (e) => {
        const bouton = e.currentTarget;
        bouton.disabled = true;
        bouton.textContent = 'Recherche de votre position…';
        U.maPosition()
            .then((p) => {
                appliquerPosition(p);
                toast('Tri par distance depuis votre position.');
            })
            .catch((err) => {
                bouton.textContent = 'Réessayer ma position';
                const raison = !window.isSecureContext
                    ? 'La localisation exige une connexion HTTPS.'
                    : err.code === 1
                      ? 'Autorisez la localisation dans les réglages du navigateur.'
                      : err.code === 3
                        ? 'La recherche de position a expiré. Réessayez.'
                        : 'Votre position est indisponible. Vérifiez les réglages de localisation.';
                toast(`${raison} Distances estimées depuis le centre-ville.`);
            })
            .finally(() => {
                bouton.disabled = false;
            });
    });
    $('#voir-res').addEventListener('click', () =>
        $('#resultats').scrollIntoView({ behavior: 'smooth' }),
    );
    $('#f-reset').addEventListener('click', () => {
        location.href = '/pharmacies.html';
    });
    $('#pg').addEventListener('click', (e) => {
        const b = e.target.closest('button[data-page]');
        if (!b || b.disabled) return;
        page = Number(b.dataset.page);
        rendre();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    /* Rendre les résultats sans attendre la géolocalisation. */
    rendre();

    /* Si le navigateur a déjà accordé l'accès, actualiser en arrière-plan. */
    navigator.permissions
        ?.query({ name: 'geolocation' })
        .then((permission) => {
            if (permission.state === 'granted')
                U.maPosition().then(appliquerPosition).catch(console.warn);
        })
        .catch(() => {});
})().catch((e) => {
    console.error(e);
    document
        .getElementById('resultats')
        ?.insertAdjacentHTML(
            'beforebegin',
            `<p class="note">       Erreur de la page : ${e.message}</p>`,
        );
});
