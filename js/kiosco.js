// HISTORIA DEL KIOSCO — dos años y medio de Makito, en gráficos.
// -----------------------------------------------------------------------------
// La sección de kiosco mostraba ocho cifras apiladas y ningún dibujo: para saber si el mes
// iba bien había que acordarse de cuánto fue el anterior. Acá vive lo que faltaba — la
// serie histórica y su lectura.
//
// DE DÓNDE SALEN LOS DATOS, que son DOS fuentes cosidas:
//
//   `historico_kiosco`  un documento por mes, nov-2023 -> jun-2026. Es lo que Makito
//                       vendió en Eleventa antes de vivir dentro de VQSPA.
//   `historico_cierres` los cierres de jornada, que traen el sub-mapa `makito`. Es lo que
//                       la caja registra desde julio de 2026.
//
// Se mezclan por mes y el histórico manda donde exista: es el dato consolidado. Cuando la
// caja empiece a publicar en `historico_kiosco` (VQSPA 14.8) la costura desaparece sola,
// sin tocar esto — el mes simplemente empieza a venir de la primera fuente.

import { fmt, num, MESES } from './util.js';
import { charts } from './graficos.js';

// Meses a la vista en el gráfico de tendencia. Doce cubre el año completo y deja comparar
// cada mes con el mismo del año pasado, que es la pregunta real de un negocio de temporada.
const MESES_TENDENCIA = 12;

const clave = (a, m) => `${a}-${String(m + 1).padStart(2, '0')}`;

// Lo ultimo que se dibujo, para poder repetirlo cuando el contenedor cambie de tamaño.
let ultimo = null;


// EL GRAFICO VIGILA SU PROPIA CAJA.
// -----------------------------------------------------------------------------
// Se probaron dos arreglos antes que este y ninguno bastó: redimensionar al cambiar de
// pestaña, y desactivar la proporción automática. El síntoma seguía — en una tablet el
// dibujo ocupaba ~490 px de una tarjeta de ~1110, que es justo el ancho de un teléfono.
// Chart.js habia medido una vez, con la medida equivocada, y no volvia a mirar.
//
// El problema de fondo era yo tratando de adivinar CUANDO hay que remedir: al mostrar la
// pestaña, al girar la pantalla, al cargar los datos... Siempre falta un caso. Un
// ResizeObserver no adivina: mira la caja y avisa cuando cambia, sea cual sea el motivo.
//
// El respiro de 120 ms junta los cambios en rafaga (al mostrar una pestaña el navegador
// puede disparar varios) y evita que redibujar provoque otro aviso en cadena.
let vigilando = false;
let pendiente = null;

// El <canvas> se estira a su caja por CSS. Es el cinturon ademas de los tirantes: aunque
// Chart.js calcule un ancho equivocado, el elemento no puede quedar mas angosto que su
// contenedor — y al observar el cambio, se redibuja con la medida buena.
function estirar(c) {
    if (!c) return;
    c.style.width = '100%';
    c.style.height = '100%';
    c.style.display = 'block';
}


export function vigilarTamano() {
    if (vigilando) return;
    const cajas = ['chartKioscoMeses', 'chartKioscoDias']
        .map((id) => document.getElementById(id))
        .filter((c) => c && c.parentElement)
        .map((c) => c.parentElement);
    if (!cajas.length || typeof ResizeObserver === 'undefined') return;

    const obs = new ResizeObserver(() => {
        if (!ultimo) return;
        clearTimeout(pendiente);
        pendiente = setTimeout(() => {
            const { unida, fecha } = ultimo;
            try { renderTendenciaKiosco(unida, fecha); renderMesKiosco(unida, fecha); } catch (e) {}
        }, 120);
    });
    cajas.forEach((c) => obs.observe(c));
    vigilando = true;
}


// Une las dos épocas en un solo mapa { '2026-05': {total, ganancia, tickets, dias} }.
export function unirHistoria(historico, cierres) {
    const out = {};
    // Primero los cierres, para que el histórico consolidado los pise donde exista.
    (cierres || []).forEach((c) => {
        if (!c.date) return;
        const k = clave(c.date.getFullYear(), c.date.getMonth());
        const mk = c.makito || {};
        const m = out[k] || (out[k] = { total: 0, ganancia: 0, tickets: 0, dias: {} });
        m.total += num(mk.total);
        m.ganancia += num(mk.ganancia);
        m.dias[c.date.getDate()] = { t: num(mk.total), g: num(mk.ganancia) };
    });
    Object.entries(historico || {}).forEach(([k, d]) => {
        out[k] = {
            total: num(d.total), ganancia: num(d.ganancia), tickets: num(d.tickets),
            dias_abiertos: num(d.dias_abiertos), dias: d.dias || {},
        };
    });
    return out;
}


// Los ultimos `n` meses hasta `hasta` (inclusive), en orden cronologico y SIN huecos: un
// mes cerrado sin ventas tiene que verse como cero y no desaparecer del eje.
export function serieMensual(unida, hasta, n = MESES_TENDENCIA) {
    const out = [];
    const d = new Date(hasta.getFullYear(), hasta.getMonth(), 1);
    d.setMonth(d.getMonth() - (n - 1));
    for (let i = 0; i < n; i++) {
        const k = clave(d.getFullYear(), d.getMonth());
        const m = unida[k];
        out.push({
            clave: k,
            etiqueta: MESES[d.getMonth()].slice(0, 3),
            anio: d.getFullYear(),
            total: m ? m.total : 0,
            ganancia: m ? m.ganancia : 0,
        });
        d.setMonth(d.getMonth() + 1);
    }
    return out;
}


// Este mes contra el MISMO mes del año pasado. Es la comparación que sirve en un negocio
// de temporada: comparar febrero con enero no dice nada cuando uno es verano y el otro no.
export function compararAnioAnterior(unida, fecha) {
    const hoy = unida[clave(fecha.getFullYear(), fecha.getMonth())];
    const antes = unida[clave(fecha.getFullYear() - 1, fecha.getMonth())];
    if (!hoy || !antes || !antes.total) return null;
    return {
        variacion: (hoy.total - antes.total) / antes.total * 100,
        anterior: antes.total,
        etiqueta: `${MESES[fecha.getMonth()].slice(0, 3)}-${String(fecha.getFullYear() - 1).slice(2)}`,
    };
}


export function renderTendenciaKiosco(unida, hasta) {
    const el = document.getElementById('chartKioscoMeses');
    if (!el) return;
    ultimo = { unida, fecha: hasta };
    const serie = serieMensual(unida, hasta);
    if (charts.kioscoMeses) charts.kioscoMeses.destroy();
    estirar(el);
    charts.kioscoMeses = new Chart(el, {
        type: 'bar',
        data: {
            labels: serie.map(s => s.etiqueta),
            datasets: [
                { label: 'Vendido', data: serie.map(s => s.total), backgroundColor: '#FFB300', borderRadius: 4, order: 2 },
                { label: 'Ganancia', type: 'line', data: serie.map(s => s.ganancia),
                  borderColor: '#00C853', borderWidth: 2, tension: .35, pointRadius: 2, fill: false, order: 1 },
            ],
        },
        options: {
            // ALTO FIJO manda sobre la proporción. Estos dos gráficos viven en un
            // contenedor con `height` en el HTML; sin desactivar `maintainAspectRatio`,
            // Chart.js impone su propia razón 2:1 y en pantalla ancha el dibujo queda
            // deformado contra la izquierda en vez de ocupar el espacio.
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, labels: { color: '#9CA3AF', font: { size: 9 }, boxWidth: 10, padding: 8 } },
                tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.raw)}` } },
            },
            scales: { y: { display: false }, x: { ticks: { color: '#6B7280', font: { size: 9 } } } },
        },
    });
}


export function renderMesKiosco(unida, fecha) {
    const el = document.getElementById('chartKioscoDias');
    if (!el) return;
    const m = unida[clave(fecha.getFullYear(), fecha.getMonth())] || { dias: {} };
    const ultimo = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate();
    const labels = Array.from({ length: ultimo }, (_, i) => i + 1);
    if (charts.kioscoDias) charts.kioscoDias.destroy();
    estirar(el);
    charts.kioscoDias = new Chart(el, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data: labels.map(d => num((m.dias[d] || m.dias[String(d)] || {}).t)),
                backgroundColor: '#00E0D0', borderRadius: 3,
            }],
        },
        options: {
            // ALTO FIJO manda sobre la proporción. Estos dos gráficos viven en un
            // contenedor con `height` en el HTML; sin desactivar `maintainAspectRatio`,
            // Chart.js impone su propia razón 2:1 y en pantalla ancha el dibujo queda
            // deformado contra la izquierda en vez de ocupar el espacio.
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { title: (c) => `Día ${c[0].label}`, label: (c) => fmt(c.raw) } },
            },
            scales: { y: { display: false }, x: { ticks: { color: '#6B7280', font: { size: 7 } } } },
        },
    });
}
