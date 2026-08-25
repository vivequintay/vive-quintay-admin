"""Carga la PWA en un Chrome sin ventana y verifica dos cosas.

Es la red de seguridad que faltaba para tocar el JavaScript: sin esto, partir el archivo
seria a ciegas sobre la herramienta con la que el dueño maneja el negocio.

  1. QUE EL MODULO CARGUE. Un error de sintaxis o un import roto saltan al instante.

  2. QUE LOS BOTONES EXISTAN. Este es el que importa de verdad: el script es
     `type="module"`, y en un modulo las funciones NO son globales. Cualquier `onclick` del
     HTML que apunte a una funcion que no este colgada de `window` es un boton muerto — y
     no falla al cargar, falla el dia que alguien lo toca. Se inyecta un verificador que
     recorre TODOS los atributos on* del documento y comprueba uno por uno.

Sirve la carpeta por HTTP porque los modulos ES no cargan desde file://.

Uso:  python probar_pwa.py <carpeta>
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
ORIGEN = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
PUERTO = 8765

# Ruido que no dice nada del codigo: la pagina habla con Firebase y con CDN, y en una
# prueba sin sesion eso falla por definicion. Lo ultimo es ruido del propio Chrome.
IGNORAR = re.compile(
    r"favicon|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|ERR_NETWORK|net::ERR|"
    r"googleapis|gstatic|jsdelivr|tailwindcss|firebase|Failed to load resource|"
    r"manifest|serviceworker|sw\.js|Autofill|DevTools|GPU|Fontconfig|voice|"
    r"externally_managed_app_manager|installwebapp|registration_request", re.I)

VERIFICADOR = """
<div id="__verdicto" style="display:none"></div>
<script>
window.addEventListener('load', () => {
  const faltan = new Set();
  document.querySelectorAll('*').forEach(el => {
    for (const at of el.attributes) {
      if (!/^on[a-z]+$/.test(at.name)) continue;
      for (const m of at.value.matchAll(/\\b([A-Za-z_$][\\w$]*)\\s*\\(/g)) {
        const n = m[1];
        if (['if','for','while','return','typeof','function','catch','switch'].includes(n)) continue;
        if (typeof window[n] !== 'function') faltan.add(n + '  (' + at.name + ')');
      }
    }
  });
  document.getElementById('__verdicto').textContent =
      'HANDLERS_FALTANTES:' + (faltan.size ? [...faltan].join(' | ') : 'NINGUNO');
});
</script>
"""


class Silencioso(SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def main():
    tmp = tempfile.mkdtemp(prefix="pwa_prueba_")
    try:
        shutil.copytree(ORIGEN, tmp, dirs_exist_ok=True,
                        ignore=shutil.ignore_patterns(".git"))
        idx = os.path.join(tmp, "index.html")
        with open(idx, encoding="utf-8") as f:
            html = f.read()
        # El verificador va al final para que corra con todo ya definido.
        with open(idx, "w", encoding="utf-8") as f:
            f.write(html.replace("</body>", VERIFICADOR + "</body>", 1))

        srv = ThreadingHTTPServer(("127.0.0.1", PUERTO), partial(Silencioso, directory=tmp))
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        time.sleep(0.4)
        perfil = os.path.join(tempfile.gettempdir(), "perfil_pwa_prueba")
        try:
            r = subprocess.run([
                CHROME, "--headless=new", "--disable-gpu", "--no-first-run",
                "--no-default-browser-check", "--disable-extensions",
                f"--user-data-dir={perfil}", "--enable-logging=stderr", "--log-level=0",
                "--virtual-time-budget=7000", "--dump-dom",
                f"http://127.0.0.1:{PUERTO}/index.html",
            ], capture_output=True, text=True, timeout=180, errors="replace")
        finally:
            srv.shutdown()
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    dom, fallos = r.stdout or "", []

    graves = [l for l in (r.stderr or "").splitlines()
              if re.search(r"\b(Uncaught|is not defined|is not a function|SyntaxError|"
                           r"TypeError|ReferenceError|SEVERE)\b", l) and not IGNORAR.search(l)]
    print("1) EL MODULO CARGA")
    if graves:
        for l in graves[:20]:
            print("   *** " + l.strip()[:170])
        fallos.append("errores de consola")
    else:
        print("   sin errores de JavaScript")

    print()
    print("2) LOS BOTONES DEL HTML EXISTEN")
    m = re.search(r"HANDLERS_FALTANTES:([^<]*)", dom)
    if not m:
        print("   *** el verificador no llego a correr (la pagina no termino de cargar)")
        fallos.append("verificador sin resultado")
    elif m.group(1).strip() == "NINGUNO":
        print("   todos los on* apuntan a funciones que existen")
    else:
        for x in m.group(1).split("|"):
            print("   *** BOTON MUERTO: " + x.strip())
        fallos.append("handlers faltantes")

    print()
    print("3) LA ESTRUCTURA SIGUE AHI")
    for marca in ("gestor-makito", "escaner-caja", "pantalla-bloqueo", "inv-lista",
                  "makito-productos", "makito-historico"):
        ok = marca in dom
        print("   %-18s %s" % (marca, "presente" if ok else "*** AUSENTE"))
        if not ok:
            fallos.append(marca)

    print()
    print("4) CADA PESTAÑA TIENE SU PANEL")
    # Un boton de pestania sin panel al que apuntar es un boton que no hace nada. Es un
    # error facil de cometer al mover tarjetas de un panel a otro y no se ve mirando: la
    # pestania se pinta activa igual y la pantalla queda en blanco.
    for pagina in ("parking", "makito"):
        pes = set(re.findall(r'class="pes"[^>]*data-panel="(\w+)"', dom))
        pes |= set(re.findall(r'data-panel="(\w+)"\s+role="tab"', dom))
        paneles = set(re.findall(
            r'class="panel[^"]*"\s+data-de="%s"\s+data-panel="(\w+)"' % pagina, dom))
        botones = set(re.findall(
            r'<nav class="pestanas" data-de="%s".*?</nav>' % pagina, dom, re.S))
        botones = set(re.findall(r'data-panel="(\w+)"', botones.pop())) if botones else set()
        huerfanos = botones - paneles
        print("   %-8s %d pestañas · %d paneles %s"
              % (pagina, len(botones), len(paneles),
                 "" if not huerfanos else "*** SIN PANEL: " + ", ".join(sorted(huerfanos))))
        if huerfanos or not botones:
            fallos.append("pestañas de " + pagina)

    print()
    print("RESULTADO: " + ("FALLA (" + ", ".join(fallos) + ")" if fallos else "TODO OK"))
    raise SystemExit(1 if fallos else 0)


if __name__ == "__main__":
    main()
