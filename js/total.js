// GRAN TOTAL — los dos negocios sumados, y lo que sólo se ve juntándolos.
// -----------------------------------------------------------------------------
// Parking y kiosco tienen cada uno su página, y ahí cada cual se mira a sí mismo. Esta es
// la que responde preguntas que NINGUNO puede responder por separado:
//
//   ¿Cuántos de los autos que entran compran algo?   (tasa de captura)
//   ¿Cuánto deja en el kiosco cada auto que estaciona?
//
// Eso decide si el kiosco vive del parking o si son dos negocios que comparten local. Y si
// la tasa sube o baja, es una palanca que se puede mover — poner el kiosco más a la vista,
// cambiar lo que se ofrece, mirar los horarios.

import { fmt, num } from './util.js';

// Debajo de este numero de autos las razones se vuelven ruido: con tres autos y un ticket,
// la "tasa de captura" da 33% y no significa nada.
const MINIMO_CONFIABLE = 20;


// Suma los dos negocios y dice cuanto pesa cada uno.
export function consolidar(parking, kiosco) {
    const p = num(parking), k = num(kiosco);
    const total = p + k;
    return {
        parking: p, kiosco: k, total,
        pesoParking: total > 0 ? p / total * 100 : 0,
        pesoKiosco: total > 0 ? k / total * 100 : 0,
    };
}


// Que porcentaje de los autos se lleva algo del kiosco. `null` cuando no hay autos
// suficientes para que el numero signifique algo.
export function tasaCaptura(ticketsKiosco, autos) {
    const a = num(autos), t = num(ticketsKiosco);
    if (a < MINIMO_CONFIABLE) return null;
    return Math.min(100, t / a * 100);
}


// Cuanto deja en el kiosco cada auto que estaciona (repartido entre TODOS, no solo entre
// los que compraron: la pregunta es cuanto vale un auto para el kiosco).
export function gastoPorAuto(ventaKiosco, autos) {
    const a = num(autos);
    return a > 0 ? num(ventaKiosco) / a : 0;
}


// Las luces y las sombras del periodo, ya redactadas. Devuelve dos listas de frases.
export function lucesYSombras(d) {
    const luces = [], sombras = [];

    if (d.variacionTotal != null) {
        const v = Math.abs(d.variacionTotal).toFixed(0);
        (d.variacionTotal >= 0 ? luces : sombras).push(
            `El total ${d.variacionTotal >= 0 ? 'subió' : 'bajó'} ${v}% respecto a ${d.etiquetaAnterior}`);
    }
    if (d.captura != null) {
        (d.captura >= 25 ? luces : sombras).push(
            `${d.captura.toFixed(0)} de cada 100 autos compran en el kiosco`);
    }
    if (d.margenKiosco > 0) {
        (d.margenKiosco >= 45 ? luces : sombras).push(
            `El kiosco deja ${d.margenKiosco.toFixed(0)}% de margen`);
    }
    if (d.pesoKiosco > 0) {
        luces.push(`El kiosco aporta ${d.pesoKiosco.toFixed(0)}% de lo recaudado`);
    }
    if (d.evadidos > 0) {
        sombras.push(`${d.evadidos} ${d.evadidos === 1 ? 'auto se fue' : 'autos se fueron'} sin pagar` +
                     (d.montoEvadido > 0 ? ` (${fmt(d.montoEvadido)})` : ''));
    }
    return { luces, sombras };
}


export function renderTotal(datos) {
    const cont = document.getElementById('total-contenido');
    if (!cont) return;

    const mes = consolidar(datos.parkingMes, datos.kioscoMes);
    const anio = consolidar(datos.parkingAnio, datos.kioscoAnio);
    const captura = tasaCaptura(datos.ticketsKiosco, datos.autos);
    const porAuto = gastoPorAuto(datos.kioscoMes, datos.autos);
    const margen = datos.kioscoMes > 0 ? datos.gananciaKiosco / datos.kioscoMes * 100 : 0;

    const { luces, sombras } = lucesYSombras({
        variacionTotal: datos.variacionTotal, etiquetaAnterior: datos.etiquetaAnterior,
        captura, margenKiosco: margen, pesoKiosco: mes.pesoKiosco,
        evadidos: datos.evadidos, montoEvadido: datos.montoEvadido,
    });

    const lista = (titulo, color, items, vacio) => `
        <div class="glass p-4 mb-3 border-l-4" style="border-color:${color}">
            <p class="text-[9px] uppercase font-black tracking-widest mb-2" style="color:${color}">${titulo}</p>
            ${items.length
                ? `<ul class="space-y-1">${items.map(t => `<li class="text-xs text-gray-200">· ${t}</li>`).join('')}</ul>`
                : `<p class="text-xs text-gray-500 italic">${vacio}</p>`}
        </div>`;

    cont.innerHTML = `
        <div class="card border-t-4 border-[#00E0D0] text-center">
            <p class="text-[9px] text-gray-400 uppercase font-black tracking-widest">Recaudado este mes</p>
            <p class="text-4xl font-black text-white leading-tight">${fmt(mes.total)}</p>
            <div class="flex gap-2 mt-4">
                <div class="glass p-3 flex-1">
                    <p class="text-[8px] text-gray-400 uppercase font-black">🅿️ Parking</p>
                    <p class="text-lg font-black text-white">${fmt(mes.parking)}</p>
                    <p class="text-[10px] text-gray-500">${mes.pesoParking.toFixed(0)}% del total</p>
                </div>
                <div class="glass p-3 flex-1">
                    <p class="text-[8px] text-gray-400 uppercase font-black">🛒 Makito</p>
                    <p class="text-lg font-black text-[#FFB300]">${fmt(mes.kiosco)}</p>
                    <p class="text-[10px] text-gray-500">${mes.pesoKiosco.toFixed(0)}% del total</p>
                </div>
            </div>
        </div>

        <!-- LO QUE SOLO SE VE JUNTANDO LOS DOS NEGOCIOS -->
        <div class="card border-t-4 border-[#FFB300]">
            <h2 class="text-[11.5px] font-bold text-gray-400 uppercase tracking-widest mb-3">🔗 Cómo se alimentan entre sí</h2>
            <div class="flex gap-2">
                <div class="glass p-3 flex-1 text-center">
                    <p class="text-2xl font-black text-[#00E0D0]">${captura == null ? '—' : captura.toFixed(0) + '%'}</p>
                    <p class="text-[9px] text-gray-400 uppercase font-black mt-1">de los autos<br>compran algo</p>
                </div>
                <div class="glass p-3 flex-1 text-center">
                    <p class="text-2xl font-black text-[#FFB300]">${fmt(porAuto)}</p>
                    <p class="text-[9px] text-gray-400 uppercase font-black mt-1">deja cada auto<br>en el kiosco</p>
                </div>
            </div>
            ${captura == null
                ? `<p class="text-[9px] text-gray-500 italic mt-3">Con menos de ${MINIMO_CONFIABLE} autos en el mes estos números no dicen nada todavía.</p>`
                : `<p class="text-[9px] text-gray-500 italic mt-3">Sobre ${num(datos.autos).toLocaleString('es-CL')} autos del mes.</p>`}
        </div>

        ${lista('☀️ Lo bueno', '#00C853', luces, 'Todavía no hay suficiente movimiento para destacar nada.')}
        ${lista('🌑 Lo que hay que mirar', '#F87171', sombras, 'Nada que reportar. Buen mes.')}

        <div class="card">
            <div class="flex justify-between items-center">
                <span class="text-[9px] text-gray-400 uppercase font-black tracking-widest">Recaudado en ${datos.anio}</span>
                <span class="text-xl font-black text-[#FFD700]">${fmt(anio.total)}</span>
            </div>
            <p class="text-[10px] text-gray-500 mt-1">
                Parking ${fmt(anio.parking)} · Makito ${fmt(anio.kiosco)}
            </p>
        </div>
    `;
}
