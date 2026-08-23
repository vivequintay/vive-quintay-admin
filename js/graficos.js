// GRÁFICOS — los dibujos de Chart.js.
// -----------------------------------------------------------------------------
// Salieron de app.js tal cual. Se separan porque reciben los datos por parámetro y no leen
// nada del estado del programa: sólo saben pintar. Eso los hace la base sobre la que se
// pueden agregar los gráficos del kiosco sin volver a abrir el archivo grande.
//
// `charts` guarda la instancia viva de cada gráfico. Es indispensable: Chart.js NO deja dos
// gráficos sobre el mismo <canvas>, así que antes de redibujar hay que destruir el anterior
// o el segundo no aparece. Es un objeto que se muta por propiedad, nunca se reasigna — por
// eso puede viajar como `const` entre módulos.

const ANIO = new Date().getFullYear();

export const charts = {};


export function renderPie(id, data) {
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(document.getElementById(id), {
        type: 'doughnut',
        // Con todo en cero el gráfico saldría vacío y parecería roto: se dibuja un aro
        // completo del primer color para que se vea que hay gráfico y no hay datos.
        data: { datasets: [{ data: data[0] + data[1] === 0 ? [1, 0] : data, backgroundColor: ['#00C853', '#00E0D0'], borderWidth: 0 }] },
        options: { cutout: '75%', plugins: { legend: { display: false } } }
    });
}


export function renderLine(dict) {
    const ctx = document.getElementById('chartMensual');
    const labels = Array.from({ length: 31 }, (_, i) => i + 1);
    const data = labels.map(d => dict[d] || 0);
    if (charts.line) charts.line.destroy();
    charts.line = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [{ data, borderColor: '#00E0D0', tension: 0.4, fill: true, backgroundColor: 'rgba(0,224,208,0.05)' }] },
        options: { plugins: { legend: false }, scales: { y: { display: false }, x: { ticks: { color: '#6B7280', font: { size: 8 } } } } }
    });
}


// `arrPrev` son los mismos doce meses del año ANTERIOR. Si no hay nada que comparar, la
// línea no se dibuja y la leyenda se esconde: una leyenda con una sola serie es ruido.
export function renderBar(arr, arrPrev) {
    if (charts.bar) charts.bar.destroy();
    const hayPrev = arrPrev && arrPrev.some(v => v != null && v > 0);
    const datasets = [{ type: 'bar', label: String(ANIO), data: arr, backgroundColor: '#FFD700', borderRadius: 4, order: 2 }];
    if (hayPrev) {
        datasets.unshift({
            type: 'line', label: String(ANIO - 1), data: arrPrev,
            borderColor: '#00E0D0', borderWidth: 2, tension: 0.35, pointRadius: 2,
            fill: false, spanGaps: false, order: 1
        });
    }
    charts.bar = new Chart(document.getElementById('chartAnual'), {
        type: 'bar',
        data: { labels: ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'], datasets },
        options: {
            plugins: { legend: hayPrev ? { display: true, labels: { color: '#9CA3AF', font: { size: 9 }, boxWidth: 10, padding: 8 } } : { display: false } },
            scales: { y: { display: false } }
        }
    });
}
