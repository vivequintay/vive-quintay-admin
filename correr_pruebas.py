"""Corre pruebas.html en un Chrome sin ventana y reporta el resultado.

Son las pruebas de la LOGICA (la costura de las dos epocas del kiosco y la comparacion
interanual), separadas del arnes `probar_pwa.py` que comprueba que la pagina cargue y que
los botones existan. Dos cosas distintas, dos comandos distintos.

Uso:  python correr_pruebas.py
"""
import html
import os
import re
import shutil
import subprocess
import tempfile
import threading
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
AQUI = os.path.dirname(os.path.abspath(__file__))
PUERTO = 8766


class Silencioso(SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def main():
    perfil = tempfile.mkdtemp(prefix="perfil_pruebas_")
    srv = ThreadingHTTPServer(("127.0.0.1", PUERTO), partial(Silencioso, directory=AQUI))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    time.sleep(0.3)
    try:
        r = subprocess.run([
            CHROME, "--headless=new", "--disable-gpu", "--no-first-run",
            "--disable-extensions",
            # PERFIL NUEVO CADA VEZ. Reutilizarlo hacia que Chrome sirviera la version
            # anterior de pruebas.html desde su cache: se agregaban pruebas y el contador
            # seguia diciendo 18. Un perfil desechable no tiene cache que servir.
            "--user-data-dir=" + perfil,
            "--virtual-time-budget=6000", "--dump-dom",
            f"http://127.0.0.1:{PUERTO}/pruebas.html",
        ], capture_output=True, text=True, timeout=180, errors="replace")
    finally:
        srv.shutdown()
        shutil.rmtree(perfil, ignore_errors=True)

    m = re.search(r'<pre id="salida">(.*?)</pre>', r.stdout or "", re.S)
    if not m:
        print("Las pruebas no llegaron a correr. Salida del navegador:")
        print((r.stdout or "")[:600])
        raise SystemExit(1)

    salida = html.unescape(m.group(1))
    print(salida)
    raise SystemExit(0 if "TODAS OK" in salida else 1)


if __name__ == "__main__":
    main()
