/* Page urgences : numéros (API + secours en dur), pharmacies de garde, formulaire de signalement. */
(async () => {
    const U = PG.utils,
        esc = U.esc,
        $ = (s) => document.querySelector(s);

    /* --- Numéros d'urgence : API en source, cartes supplémentaires si au-delà de 117/118 --- */
    const numeros = await PG.api.get('numerourgence').catch(() => []);
    const connus = new Set(['117', '118']);
    const extras = numeros.filter((n) => !connus.has(String(n.numero)));
    if (extras.length) {
        $('#urg-extra').innerHTML = extras
            .map(
                (n) => `
            <a class="urg-card" href="${U.telHref(n.numero)}">
              <small>${esc(n.nom)}</small>
              <span class="num">${esc(n.numero)}</span>
              <p>${esc(n.description || '')}</p>
              <span class="appeler btn btn-ghost">Appeler le ${esc(n.numero)}</span>
            </a>`,
            )
            .join('');
    }

    /* --- Résumé des gardes du jour (le héros renvoie vers la liste) --- */
    const [gardes, pharmacies] = await Promise.all([
        PG.api.get('gardes').catch(() => []),
        PG.api.get('pharmacies').catch(() => []),
    ]);
    const today = U.isoToday();
    const gardeAujourdhui = pharmacies.filter((p) =>
        gardes.some(
            (g) =>
                String(g.pharmacieId) === String(p.id) &&
                g.debut <= today &&
                today <= g.fin,
        ),
    );
    const h24 = gardeAujourdhui.filter((p) => p.garde24h);
    const txt = $('#urg-garde-txt');
    if (txt) {
        txt.textContent = gardeAujourdhui.length
            ? `${gardeAujourdhui.length} officines de garde cette semaine, dont ${h24.length} accessibles 24h/24.`
            : 'Planning en cours de publication — appelez le 118 en cas d\u2019urgence vitale.';
    }

    /* --- Formulaire de signalement --- */
    const pharmaciesListe = pharmacies;
    const selPh = $('#sig-pharmacie');
    selPh.innerHTML =
        '<option value="">— Aucune en particulier —</option>' +
        pharmaciesListe
            .map(
                (p) =>
                    `<option value="${esc(p.id)}">Pharmacie ${esc(p.nom)} — ${esc(p.quartier || '')}</option>`,
            )
            .join('');

    /* Pré-sélection depuis la fiche : /urgence.html?pharmacie=3#signaler */
    const phPre = U.param('pharmacie');
    if (phPre) selPh.value = phPre;

    const form = $('#form-signaler'),
        errBox = $('#form-err'),
        okBox = $('#form-ok'),
        submit = $('#sig-submit');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errBox.classList.remove('show');
        okBox.classList.remove('show');

        const data = Object.fromEntries(new FormData(form));
        if (!data.message || data.message.trim().length < 10) {
            errBox.textContent =
                'Décrivez le problème en quelques mots (10 caractères minimum).';
            errBox.classList.add('show');
            return;
        }

        submit.disabled = true;
        submit.textContent = 'Envoi…';
        try {
            const res = await PG.api.post('signalements', {
                type: data.type,
                message: data.message,
                nom: data.nom || null,
                telephone: data.telephone || null,
                pharmacieId: data.pharmacieId || null,
            });
            okBox.textContent = res.message || 'Signalement reçu — merci !';
            okBox.classList.add('show');
            form.reset();
            selPh.value = '';
        } catch (err) {
            errBox.textContent =
                err.message ||
                'Envoi impossible — réessayez ou appelez le 118.';
            errBox.classList.add('show');
        } finally {
            submit.disabled = false;
            submit.textContent = 'Envoyer le signalement';
        }
    });

    /* Ancre #signaler / #inscrire / #numeros : surligner la section visée */
    if (location.hash) {
        const cible = document.querySelector(location.hash);
        if (cible)
            setTimeout(
                () =>
                    cible.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                    }),
                150,
            );
    }
})();
