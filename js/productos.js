// PRODUCTOS — qué se vende de verdad en Makito.
// -----------------------------------------------------------------------------
// El catálogo dice qué EXISTE: 294 productos en una lista que crece sola. Esto dice qué
// SE MUEVE, que es otra pregunta y es la que sirve para decidir qué reponer.
//
// NO ES OTRA LISTA INTERMINABLE. Ese fue justo el reclamo del catálogo. Acá lo primero que
// se ve son tres cifras que resumen los 284 productos, y la lista viene después, ordenable
// y dentro de su propia caja con scroll.
//
// Los datos vienen de `makito_ranking/general`: un solo documento con todo adentro, armado
// desde los 9.636 renglones de ticket que Eleventa guardó entre nov-2023 y jun-2026.

import { fmt, num } from './util.js';

// Debajo de esto el margen porcentual es anécdota: un producto que vendió dos unidades con
// 80% de margen no es un buen negocio, es ruido.
const MINIMO_PARA_MARGEN = 20;

// Menos de esto en toda la historia de Makito es un producto que ocupa estante y no se mueve.
const UMBRAL_SIN_ROTAR = 5;


export function margen(p) {
    return num(p.v) > 0 ? num(p.g) / num(p.v) * 100 : 0;
}


export function ordenar(productos, criterio) {
    const l = (productos || []).slice();
    if (criterio === 'ganancia') return l.sort((a, b) => num(b.g) - num(a.g));
    if (criterio === 'unidades') return l.sort((a, b) => num(b.u) - num(a.u));
    if (criterio === 'margen') {
        // Sólo compiten los que vendieron lo suficiente; el resto queda al final en su
        // orden de venta, visible pero sin contaminar el podio.
        const juegan = l.filter(p => num(p.u) >= MINIMO_PARA_MARGEN).sort((a, b) => margen(b) - margen(a));
        const resto = l.filter(p => num(p.u) < MINIMO_PARA_MARGEN).sort((a, b) => num(b.v) - num(a.v));
        return juegan.concat(resto);
    }
    return l.sort((a, b) => num(b.v) - num(a.v));
}


// Cuántos productos hacen el `parte`% de la venta. La respuesta suele sorprender y es
// accionable: si veinte productos son el 80%, esos veinte no pueden faltar nunca.
export function concentracion(productos, parte = 80) {
    const l = ordenar(productos, 'vendido');
    const total = l.reduce((s, p) => s + num(p.v), 0);
    if (!total) return { cuantos: 0, de: l.length, parte };
    let suma = 0, cuantos = 0;
    for (const p of l) {
        suma += num(p.v);
        cuantos++;
        if (suma / total * 100 >= parte) break;
    }
    return { cuantos, de: l.length, parte };
}


// Los que casi no se mueven. Ordenados de menos a más: el primero es el peor.
export function sinRotar(productos, umbral = UMBRAL_SIN_ROTAR) {
    return (productos || [])
        .filter(p => num(p.u) > 0 && num(p.u) <= umbral)
        .sort((a, b) => num(a.u) - num(b.u));
}


export function filtrar(productos, texto) {
    const t = (texto || '').trim().toLowerCase();
    if (!t) return productos || [];
    return (productos || []).filter(p =>
        String(p.n || '').toLowerCase().includes(t) || String(p.c || '').includes(t));
}


function fila(p, total, puesto) {
    const parte = total > 0 ? num(p.v) / total * 100 : 0;
    const m = margen(p);
    return `
        <div class="glass p-3">
            <div class="flex justify-between items-start gap-2">
                <div class="min-w-0 flex-1">
                    <p class="text-xs font-bold text-white truncate">
                        <span class="text-gray-500 font-mono">${String(puesto).padStart(2, '0')}</span>
                        ${p.n}
                    </p>
                    <p class="text-[9px] text-gray-500 mt-0.5">
                        ${num(p.u).toLocaleString('es-CL')} u · ${num(p.t).toLocaleString('es-CL')} tickets · margen ${m.toFixed(0)}%
                    </p>
                </div>
                <div class="text-right flex-none">
                    <p class="text-sm font-black text-[#FFB300]">${fmt(p.v)}</p>
                    <p class="text-[9px] text-[#00C853]">+${fmt(p.g)}</p>
                </div>
            </div>
            <!-- La barra hace comparable de un vistazo lo que una columna de cifras no. -->
            <div class="mt-2 h-1 rounded-full bg-[#0A2F4F] overflow-hidden">
                <div class="h-full bg-[#FFB300]" style="width:${Math.min(100, parte * 4).toFixed(1)}%"></div>
            </div>
        </div>`;
}


export function renderProductos(datos, filtro = '', criterio = 'vendido') {
    const cont = document.getElementById('makito-productos');
    if (!cont) return;

    if (!datos || !(datos.productos || []).length) {
        cont.innerHTML = "<p class='text-gray-500 italic text-center text-xs'>Todavía no hay ranking de productos.</p>";
        return;
    }

    const todos = datos.productos;
    const total = num(datos.total);
    const conc = concentracion(todos);
    const quietos = sinRotar(todos);
    const lista = ordenar(filtrar(todos, filtro), criterio);

    const boton = (val, txt) => `
        <button onclick="productosOrden('${val}')"
                class="pes ${criterio === val ? 'on' : ''}" style="flex:1 1 0">${txt}</button>`;

    cont.innerHTML = `
        <div class="card border-t-4 border-[#FFB300]">
            <h2 class="mb-3 text-[11.5px] font-bold text-gray-400 uppercase tracking-widest text-center">🏆 Qué se vende</h2>
            <div class="flex gap-2">
                <div class="glass p-3 flex-1 text-center">
                    <p class="text-2xl font-black text-[#FFB300]">${conc.cuantos}</p>
                    <p class="text-[9px] text-gray-400 uppercase font-black mt-1">productos son<br>el ${conc.parte}% de la venta</p>
                </div>
                <div class="glass p-3 flex-1 text-center">
                    <p class="text-2xl font-black text-white">${conc.de}</p>
                    <p class="text-[9px] text-gray-400 uppercase font-black mt-1">productos<br>vendidos</p>
                </div>
                <div class="glass p-3 flex-1 text-center">
                    <p class="text-2xl font-black text-[#F87171]">${quietos.length}</p>
                    <p class="text-[9px] text-gray-400 uppercase font-black mt-1">casi no<br>rotan</p>
                </div>
            </div>
            <p class="text-[9px] text-gray-500 italic mt-3 text-center">
                ${num(datos.unidades).toLocaleString('es-CL')} unidades vendidas entre ${datos.desde || '—'} y ${datos.hasta || '—'}.
            </p>
        </div>

        ${quietos.length ? `
        <div class="card border-t-4 border-[#F87171]">
            <h2 class="mb-2 text-[11.5px] font-bold text-gray-400 uppercase tracking-widest text-center">🐌 Ocupan estante</h2>
            <p class="text-[9px] text-gray-500 text-center mb-3">${UMBRAL_SIN_ROTAR} unidades o menos en toda la historia del kiosco.</p>
            <div class="flex flex-wrap gap-1 justify-center">
                ${quietos.slice(0, 14).map(p =>
                    `<span class="text-[9px] px-2 py-1 rounded-lg bg-[#0A2F4F] text-gray-300">${p.n} · ${num(p.u)}u</span>`).join('')}
                ${quietos.length > 14 ? `<span class="text-[9px] px-2 py-1 text-gray-500 italic">y ${quietos.length - 14} más</span>` : ''}
            </div>
        </div>` : ''}

        <div class="card border-t-4 border-[#FFB300]">
            <div class="flex gap-1 mb-3 bg-[#0A2F4F] p-1 rounded-xl">
                ${boton('vendido', 'Vendido')}${boton('ganancia', 'Ganancia')}${boton('unidades', 'Unidades')}${boton('margen', 'Margen')}
            </div>
            <input id="prod-filtro" oninput="productosFiltrar(this.value)" value="${filtro.replace(/"/g, '&quot;')}"
                   class="comp-select w-full mb-3" placeholder="Filtrar por nombre o código…">
            <div class="space-y-2 lista-scroll">
                ${lista.length
                    ? lista.map((p, i) => fila(p, total, i + 1)).join('')
                    : "<p class='text-gray-500 italic text-center text-xs'>Nada con ese filtro.</p>"}
            </div>
            <div class="fade-bottom"></div>
        </div>`;

    // Devolver el cursor al filtro: sin esto, cada letra tecleada lo perdía porque el HTML
    // se rehace entero.
    if (filtro) {
        const inp = document.getElementById('prod-filtro');
        if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    }
}
