// NAVEGACIÓN — una portada y tres páginas que se deslizan.
// -----------------------------------------------------------------------------
// Antes lo primero que se veía eran dos pestañas compartiendo el ancho de la pantalla, y
// cada negocio vivía apretado contra el otro. Ahora la portada es la puerta de la empresa y
// cada negocio tiene su página entera; deslizando se pasa de una a otra y a la suma.
//
//     PORTADA  ─→  PARKING  ←→  MAKITO  ←→  GRAN TOTAL
//
// EL DESLIZAMIENTO ES SCROLL NATIVO (scroll-snap), no una librería ni gestos hechos a mano.
// El navegador ya lo hace con la inercia y el rebote del sistema, y ningún gesto propio se
// siente tan bien como el del teléfono. Acá sólo se escucha DÓNDE quedó.
//
// SE RECUERDA LA ÚLTIMA PÁGINA. Quien entra veinte veces al día a mirar el kiosco no tiene
// por qué pasar veinte veces por la puerta.

const PAGINAS = ['parking', 'makito', 'total'];
const MEMORIA = 'vq_pagina';

let alCambiar = null;   // aviso al resto del programa: la página X quedó a la vista


function elementos() {
    return {
        portada: document.getElementById('portada'),
        pistas: document.getElementById('paginas'),
        puntos: document.querySelectorAll('#puntos-paginas .p'),
    };
}


function pintarPuntos(indice) {
    elementos().puntos.forEach((p, i) => p.classList.toggle('on', i === indice));
}


export function indiceActual() {
    const { pistas } = elementos();
    if (!pistas || !pistas.clientWidth) return 0;
    return Math.round(pistas.scrollLeft / pistas.clientWidth);
}


export function irA(nombre, suave = true) {
    const i = Math.max(0, PAGINAS.indexOf(nombre));
    const { portada, pistas } = elementos();
    if (portada) portada.classList.add('oculta');
    if (pistas) {
        // 'auto' al restaurar: con 'smooth' se ve la pantalla viajando desde la primera
        // página hasta la guardada cada vez que se abre, que parece un error.
        pistas.scrollTo({ left: i * pistas.clientWidth, behavior: suave ? 'smooth' : 'auto' });
    }
    pintarPuntos(i);
    try { localStorage.setItem(MEMORIA, PAGINAS[i]); } catch (e) {}
    if (alCambiar) alCambiar(PAGINAS[i]);
}


export function irAPortada() {
    const { portada } = elementos();
    if (portada) portada.classList.remove('oculta');
}


// `avisar(nombre)` se llama cada vez que una página queda a la vista. Lo usa el resto del
// programa para redibujar lo que estaba oculto — un gráfico dibujado en una página que no
// se veía queda con la medida equivocada.
export function iniciarNavegacion(avisar) {
    alCambiar = avisar;
    const { pistas } = elementos();

    // Al soltar el dedo, ver en cuál quedó. `scrollend` es lo exacto; donde no exista
    // (Safari aún no lo trae) se cae a un temporizador sobre `scroll`, que es lo mismo con
    // menos precisión.
    let quieto = null;
    const asentar = () => {
        const i = indiceActual();
        pintarPuntos(i);
        try { localStorage.setItem(MEMORIA, PAGINAS[i]); } catch (e) {}
        if (alCambiar) alCambiar(PAGINAS[i]);
    };
    if (pistas) {
        if ('onscrollend' in window) {
            pistas.addEventListener('scrollend', asentar);
        } else {
            pistas.addEventListener('scroll', () => {
                clearTimeout(quieto);
                quieto = setTimeout(asentar, 140);
            }, { passive: true });
        }
        // Al girar el teléfono el ancho cambia y el scroll queda entre dos páginas.
        window.addEventListener('resize', () => {
            const i = indiceActual();
            pistas.scrollTo({ left: i * pistas.clientWidth, behavior: 'auto' });
        });
    }

    let guardada = null;
    try { guardada = localStorage.getItem(MEMORIA); } catch (e) {}
    if (guardada && PAGINAS.includes(guardada)) {
        irA(guardada, false);
    } else {
        // Primera visita: la portada, para que se entienda que hay dos negocios.
        irAPortada();
        pintarPuntos(0);
    }
}
