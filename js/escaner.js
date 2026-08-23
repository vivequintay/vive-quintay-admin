// ESCÁNER DE CÓDIGOS DE BARRA — la cámara del teléfono.
// -----------------------------------------------------------------------------
// Salió de app.js con una frontera nueva y a propósito: este módulo NO sabe qué es un
// producto ni qué se hace con el código. Enciende la cámara, lee, y avisa. Quien lo llama
// decide el resto. Antes estaba enredado con el catálogo del kiosco y no se podía tocar
// una cosa sin leer la otra.
//
// Su estado (la cámara y el lector) es SUYO y de nadie más, que es justo lo que lo hace
// separable: ninguna otra parte del programa lo toca.
//
// HISTORIA DE DOS FALLAS, para que no vuelvan:
//
//   1. `BarcodeDetector` es una API del navegador que en Android depende de un módulo de
//      Google Play Services. Puede desaparecer con una actualización sin que nadie toque
//      nada. Por eso la cámara se pide SIEMPRE, aunque el lector falte: verla encendida
//      separa "no hay permiso" de "no hay decodificador", que son problemas distintos.
//
//   2. El fallo real que se vio en terreno no fue ninguno de los dos: la caja del video
//      quedaba fuera de pantalla porque el modal conservaba su scroll. La cámara encendía
//      y nadie la veía. De ahí que los mensajes de acá tengan que ser precisos — con un
//      "no pude abrir la cámara" genérico se perdieron dos diagnósticos.

let stream = null;
let leyendo = false;
let detector = null;

const FORMATOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'codabar', 'itf'];

// Cuántos cuadros seguidos pueden fallar antes de darse por vencido. Fallar en algunos es
// normal (imagen movida o borrosa); treinta seguidos significa que el decodificador no está
// funcionando, y eso hay que decirlo en vez de dejar la cámara girando en vano.
const FALLOS_TOLERADOS = 30;


// POR QUÉ EL ESCÁNER PUEDE NO ANDAR, EN CONCRETO.
// Tres causas distintas con tres arreglos distintos; el mensaje tiene que distinguirlas.
export function diagnostico() {
    return [
        window.isSecureContext ? 'HTTPS ok' : 'SIN HTTPS',
        (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ? 'cámara ok' : 'sin API de cámara',
        ('BarcodeDetector' in window) ? 'lector ok' : 'SIN lector de códigos',
    ].join(' · ');
}


// El navegador informa la causa en el NOMBRE de la excepción, no en su texto.
export function motivoCamara(e) {
    switch (e && e.name) {
        case 'NotAllowedError':      return 'Permiso de cámara denegado';
        case 'NotFoundError':        return 'Este equipo no tiene cámara';
        case 'NotReadableError':     return 'La cámara está ocupada por otra aplicación';
        case 'OverconstrainedError': return 'No hay cámara trasera disponible';
        case 'SecurityError':        return 'El navegador bloqueó la cámara por seguridad';
        default:                     return 'No se pudo abrir la cámara (' + ((e && e.name) || e) + ')';
    }
}


export function detener() {
    leyendo = false;
    if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        stream = null;
    }
}


// `video` es el <video> donde mostrarse, `avisar` recibe cada mensaje para el operador y
// `alLeer` se llama UNA vez con el código, después de apagar la cámara.
export async function escanear({ video, avisar, alLeer }) {
    const decir = avisar || (() => {});

    // 1) LA CÁMARA SE PIDE SIEMPRE, aunque falte el lector (ver cabecera).
    decir('Abriendo cámara…');
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = stream;
        await video.play();
    } catch (e) {
        decir(motivoCamara(e) + '. Ingresa el código a mano. [' + diagnostico() + ']');
        return;
    }

    // 2) EL LECTOR. Si no está, la cámara QUEDA ABIERTA a propósito: sirve para confirmar
    // que el permiso está bien y deja el problema acotado al decodificador.
    if (!('BarcodeDetector' in window)) {
        decir('La cámara funciona, pero este navegador ya no trae el lector de códigos. '
            + 'Ingresa el código a mano. [' + diagnostico() + ']');
        return;
    }
    try {
        detector = new BarcodeDetector({ formats: FORMATOS });
    } catch (e) {
        decir('El lector de códigos no arrancó: ' + ((e && e.name) || e)
            + '. Ingresa el código a mano.');
        return;
    }

    leyendo = true;
    decir('Apunta al código de barras…');
    let fallos = 0;
    const tick = async () => {
        if (!leyendo) return;
        try {
            const codes = await detector.detect(video);
            if (codes && codes.length) {
                const c = codes[0].rawValue;
                detener();
                decir('Código leído: ' + c);
                if (alLeer) alLeer(c);
                return;
            }
            fallos = 0;
        } catch (e) {
            if (++fallos >= FALLOS_TOLERADOS) {
                leyendo = false;
                decir('El lector de códigos está fallando: ' + ((e && e.name) || e)
                    + '. Ingresa el código a mano. [' + diagnostico() + ']');
                return;
            }
        }
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}
