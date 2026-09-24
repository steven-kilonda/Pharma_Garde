(() => {
    async function get(collection) {
        const res = await fetch(`/api/${collection}`);
        if (!res.ok) {
            throw new Error(`API /api/${collection} → HTTP ${res.status}`);
        }
        return res.json();
    }

    async function getPharmacie(id) {
        const res = await fetch(`/api/pharmacies/${encodeURIComponent(id)}`);
        if (res.status === 404) return null;
        if (!res.ok)
            throw new Error(`API pharmacie ${id} → HTTP ${res.status}`);
        return res.json();
    }

    async function post(collection, body) {
        const res = await fetch(`/api/${collection}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok)
            throw new Error(
                data.error || `POST /api/${collection} → HTTP ${res.status}`,
            );
        return data;
    }

    window.PG = window.PG || {};
    PG.api = { get, getPharmacie, post };
})();
