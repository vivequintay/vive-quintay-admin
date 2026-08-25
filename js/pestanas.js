// PESTAÑAS INTERNAS — cada negocio deja de ser una sola página infinita.
// -----------------------------------------------------------------------------
// Deslizar cambia de NEGOCIO (parking · makito · total). Las pestañas cambian de TEMA
// dentro de un negocio. Son dos ejes distintos y por eso no se pisan:
//
//     ←  deslizar  →     cambia de negocio
//     [ tocar arriba ]   cambia de tema
//
// EL PROBLEMA QUE RESUELVEN: la página de parking medía 1.721 px de alto. Para llegar al
// historial de cierres había que pasar por delante de nueve gráficos que quizá no se venían
// a mirar. Nadie entra a la app "a leer todo": se entra con una pregunta.
//
// SE RECUERDA LA PESTAÑA DE CADA PÁGINA POR SEPARADO. Quien vive en 'Evasión' del parking y
// en 'Inventario' de Makito encuentra las dos como las dejó.

const MEMORIA = 'vq_pestana_';

let alCambiar = null;   // aviso: quedó a la vista el panel X de la página Y


function panelesDe(pagina) {
    return document.querySelectorAll(`.panel[data-de="${pagina}"]`);
}


function botonesDe(pagina) {
    return document.querySelectorAll(`.pestanas[data-de="${pagina}"] .pes`);
}


// Cuál es el panel visible de una página. Se pregunta en vez de recordarse en una variable
// porque la fuente de verdad es el DOM: si algo más lo cambia, esto sigue siendo cierto.
export function pestanaActual(pagina) {
    const activo = document.querySelector(`.pestanas[data-de="${pagina}"] .pes.on`);
    return activo ? activo.dataset.panel : null;
}


export function abrirPestana(pagina, panel, avisar = true) {
    const botones = botonesDe(pagina);
    if (!botones.length) return;

    // Si piden un panel que no existe (memoria vieja de una versión anterior), la primera.
    const existe = Array.from(botones).some(b => b.dataset.panel === panel);
    if (!existe) panel = botones[0].dataset.panel;

    botones.forEach(b => {
        const on = b.dataset.panel === panel;
        b.classList.toggle('on', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    panelesDe(pagina).forEach(p => p.classList.toggle('oculta', p.dataset.panel !== panel));

    // Al cambiar de tema se vuelve arriba. Sin esto se aterriza a media altura del panel
    // nuevo, heredando el scroll del anterior, y parece que faltara contenido.
    const sec = document.querySelector(`.pagina[data-pagina="${pagina}"]`);
    if (sec) sec.scrollTop = 0;

    try { localStorage.setItem(MEMORIA + pagina, panel); } catch (e) {}
    if (avisar && alCambiar) alCambiar(pagina, panel);
}


// `avisar(pagina, panel)` se llama cuando un panel queda a la vista, para que quien dibuje
// gráficos pueda rehacer las medidas: un canvas dentro de un panel escondido mide cero.
export function iniciarPestanas(avisar) {
    alCambiar = avisar;

    document.querySelectorAll('.pestanas').forEach(nav => {
        const pagina = nav.dataset.de;
        nav.addEventListener('click', e => {
            const b = e.target.closest('.pes');
            if (b) abrirPestana(pagina, b.dataset.panel);
        });

        let guardada = null;
        try { guardada = localStorage.getItem(MEMORIA + pagina); } catch (e) {}
        abrirPestana(pagina, guardada || nav.querySelector('.pes').dataset.panel, false);
    });
}
