// UTILIDADES — piezas sin estado, compartidas por las dos pestañas.
// -----------------------------------------------------------------------------
// Salieron de app.js tal cual. Son las primeras en irse porque no dependen de nada: no
// leen datos, no guardan estado y no saben de Firebase. Moverlas no puede romper nada que
// el arnés no cace al instante.

export const num = (n) => Number(n) || 0;                       // evita NaN por datos faltantes
export const fmt = (n) => `$${Math.round(num(n)).toLocaleString('es-CL')}`; // CLP sin decimales, miles consistentes

export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
                      'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Helpers de fecha para el modo Día (calendario nativo)
export const isoKey = (dte) => `${dte.getFullYear()}-${String(dte.getMonth() + 1).padStart(2, '0')}-${String(dte.getDate()).padStart(2, '0')}`;
export const fechaCortaISO = (iso) => { if (!iso) return '—'; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };

// Escapa lo que venga de la base antes de meterlo en innerHTML: un nombre de producto con
// un signo raro no puede terminar inyectando etiquetas en la página.
export const gmEsc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// Anima un numero desde su valor actual al nuevo (count-up suave).
export function animateNum(id, to, isMoney) {
    const el = document.getElementById(id);
    if (!el) return;
    to = Math.round(num(to));
    const from = Number(el.dataset.val || 0);
    el.dataset.val = to;
    const render = (v) => el.innerText = isMoney ? fmt(v) : Math.round(v).toLocaleString('es-CL');
    if (from === to) { render(to); return; }
    const dur = 600, t0 = performance.now();
    const step = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        render(from + (to - from) * eased);
        if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}
