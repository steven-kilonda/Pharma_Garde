(() => {
    const ICONS = {
        search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
        alert: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17h.01"/>',
        menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
        close: '<path d="M6 6l12 12M18 6 6 18"/>',
        phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.4 2.1L8.1 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.6 1.9Z"/>',
        pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        check: '<path d="M20 6 9 17l-5-5"/>',
        share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
        arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    };

    const icon = (name, size = 20) =>
        `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

    const hydrateIcons = (root = document) =>
        root.querySelectorAll('[data-icon]').forEach((el) => {
            el.innerHTML = icon(el.dataset.icon, Number(el.dataset.size || 20));
        });

    const esc = (s) =>
        String(s ?? '').replace(
            /[&<>"']/g,
            (c) =>
                ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;',
                })[c],
        );

    const JOURS = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
    const MOIS = [
        'janvier',
        'février',
        'mars',
        'avril',
        'mai',
        'juin',
        'juillet',
        'août',
        'septembre',
        'octobre',
        'novembre',
        'décembre',
    ];

    const isoToday = (d = new Date()) => {
        const p = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    };
    const dateFR = (iso) => {
        if (!iso) return '';
        const [y, m, d] = iso.split('-').map(Number);
        return `${d} ${MOIS[m - 1]} ${y}`;
    };
    const plageFR = (a, b) => {
        if (!a || !b) return '';
        const [, ma, ja] = a.split('-').map(Number);
        const [yb, mb, jb] = b.split('-').map(Number);
        return ma === mb
            ? `${ja} au ${jb} ${MOIS[mb - 1]} ${yb}`
            : `${ja} ${MOIS[ma - 1]} au ${jb} ${MOIS[mb - 1]} ${yb}`;
    };

    /* "04 439 65 50" -> "tel:+2424396550" */
    const telHref = (n) =>
        'tel:+' + String(n).replace(/\D/g, '').replace(/^0/, '242');
    const itineraireHref = (p) =>
        `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`;

    const enMin = (hhmm) => {
        const [h, m] = hhmm.split(':').map(Number);
        return h * 60 + m;
    };
    const ouverteMaintenant = (p, maintenant = new Date()) => {
        const h = (p.horaires || {})[JOURS[maintenant.getDay()]];
        if (!h) return false;
        const m = maintenant.getHours() * 60 + maintenant.getMinutes();
        return m >= enMin(h[0]) && m < enMin(h[1]);
    };

    /* Recherche : insensible à la casse et aux accents */
    const sansAccent = (s) =>
        String(s ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    const match = (p, q) => {
        const a = sansAccent(q);
        return ['nom', 'quartier', 'repere', 'code'].some((k) =>
            sansAccent(p[k]).includes(a),
        );
    };

    /* Paramètre d'URL de la page courante */

    const param = (k) => new URLSearchParams(location.search).get(k);

    /* Prix : 1200 -> "1 200 FCFA" */

    const fcfa = (n) =>
        new Intl.NumberFormat('fr-FR').format(Number(n) || 0) + ' FCFA';

    /* Géo : distance haversine en km (null si coordonnées manquantes) */

    const distanceKm = (a, b) => {
        if ([a, b].some((x) => x?.latitude == null || x?.longitude == null))
            return null;
        const R = 6371,
            rad = Math.PI / 180;
        const dLat = (b.latitude - a.latitude) * rad;
        const dLon = (b.longitude - a.longitude) * rad;
        const s =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(a.latitude * rad) *
                Math.cos(b.latitude * rad) *
                Math.sin(dLon / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(s));
    };

    /* Position de l'utilisateur (rejette si refus ou indisponible) */
    const maPosition = () =>
        new Promise((resolve, reject) => {
            if (!navigator.geolocation)
                return reject(new Error('Géolocalisation indisponible'));
            navigator.geolocation.getCurrentPosition(
                (pos) =>
                    resolve({
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                    }),
                reject,
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
            );
        });

    const statut = (p, gardes = [], maintenant = new Date()) => {
        const today = isoToday(maintenant);
        const enGarde = gardes.some(
            (g) =>
                String(g.pharmacieId) === String(p.id) &&
                g.debut <= today &&
                today <= g.fin,
        );
        if (enGarde && p.garde24h)
            return {
                code: 'garde24h',
                label: 'De garde · 24h/24',
                classe: 'badge-garde',
                enGarde: true,
                ouverte: true,
            };
        if (enGarde)
            return {
                code: 'garde',
                label: 'De garde · sur appel',
                classe: 'badge-garde',
                enGarde: true,
                ouverte: ouverteMaintenant(p, maintenant),
            };

        if (ouverteMaintenant(p, maintenant))
            return {
                code: 'ouverte',
                label: 'Ouverte',
                classe: 'badge-ouvert',
                enGarde: false,
                ouverte: true,
            };
        return {
            code: 'fermee',
            label: 'Fermée',
            classe: 'badge-ferme',
            enGarde: false,
            ouverte: false,
        };
    };
    const badge = (s) =>
        `<span class="badge ${s.classe}">${esc(s.label)}</span>`;

    const creerPin = (L, { enGarde = false, fermee = false } = {}) => {

        /* --- Pin SVG inline : plein = de garde/ouverte, creux = fermée --- */
        const fond = fermee ? '#EDF1EE' : enGarde ? '#1F7047' : '#0F2E20';
        const croix = fermee ? '#A9BCAE' : enGarde ? '#7ED6A0' : '#9DE2B7';
        const contour = fermee ? '#8FA396' : '#FFFFFF';
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46">
          <path d="M18 0C8 0 0 8 0 18c0 13.5 18 28 18 28s18-14.5 18-28C36 8 28 0 18 0z" fill="${fond}" stroke="${contour}" stroke-width="2"/>
          <path d="M15 10h6v5h5v6h-5v5h-6v-5h-5v-6h5z" fill="${croix}"/>
        </svg>`;
        return L.divIcon({
            html: svg,
            className: 'pin-pharma',
            iconSize: [36, 46],
            iconAnchor: [18, 46],
            popupAnchor: [0, -42],
        });
    };

    window.PG = window.PG || {};
    PG.utils = {
        icon,
        hydrateIcons,
        esc,
        JOURS,
        isoToday,
        dateFR,
        plageFR,
        telHref,
        itineraireHref,
        ouverteMaintenant,
        statut,
        badge,
        sansAccent,
        match,
        param,
        fcfa,
        distanceKm,
        maPosition,
        creerPin,
    };
})();
