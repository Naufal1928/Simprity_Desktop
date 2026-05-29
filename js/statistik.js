// File: js/statistik.js

let barChartInstance;
let doughnutChartInstance;
let lineChartInstance;

document.addEventListener('DOMContentLoaded', async () => {
    const user = await window.checkAuth();
    if (!user) return;

    // Default font for Chart.js
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#9ca3af';

    // 1. Bar Chart (Distribusi Status)
    const ctxBar = document.getElementById('barChart').getContext('2d');
    barChartInstance = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: ['Tinggi', 'Sedang', 'Rendah'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#ff2a5f', '#ffc107', '#4ade80'],
                borderRadius: { topLeft: 10, topRight: 10, bottomLeft: 0, bottomRight: 0 },
                borderSkipped: false,
                barThickness: 60
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 },
                    grid: { color: '#f3f4f6', drawBorder: false },
                    border: { display: false }
                },
                x: { grid: { display: false }, border: { display: false } }
            }
        }
    });

    // 2. Doughnut Chart (Komposisi Kegiatan)
    const ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');
    doughnutChartInstance = new Chart(ctxDoughnut, {
        type: 'doughnut',
        data: {
            labels: ['Akademik', 'Organisasi', 'Pribadi'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#8b5cf6', '#4ade80', '#f3f4f6'],
                borderWidth: 0,
                cutout: '80%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            }
        }
    });

    // 3. Line Chart (Tren Prioritas Mingguan)
    const ctxLine = document.getElementById('lineChart').getContext('2d');
    const gradient = ctxLine.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

    lineChartInstance = new Chart(ctxLine, {
        type: 'line',
        data: {
            labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
            datasets: [{
                label: 'Prioritas',
                data: [0, 0, 0, 0, 0, 0, 0],
                borderColor: '#3b82f6',
                borderWidth: 2,
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#3b82f6',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 3,
                    ticks: { stepSize: 1 },
                    grid: { color: '#f3f4f6', drawBorder: false, borderDash: [5, 5] },
                    border: { display: false }
                },
                x: { grid: { display: false }, border: { display: false } }
            }
        }
    });

    // Statistik Helper
    function hitungMean(data) {
        if (!data.length) return 0;
        const total = data.reduce((sum, item) => sum + item.skor, 0);
        return total / data.length;
    }

    function hitungStatistik(data) {
        if (!data.length) return null;
        const mean = hitungMean(data);
        return { totalKegiatan: data.length, mean: Number(mean.toFixed(10)) };
    }

    // Fetch Data
    async function fetchStatistikData() {
        try {
            const { data, error } = await window.supabaseClient
                .from('activities')
                .select('*')
                .eq('user_id', user.id);

            if (error) throw error;

            if (!data || data.length === 0) {
                document.getElementById('statTotal').textContent = '0';
                document.getElementById('statMean').textContent = '0.00';
                document.getElementById('statBeban').textContent = 'RENGGANG';
                return;
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Hitung PNS Skor
            const kegiatanDenganSkor = data.map(item => {
                let skor = 0;
                let isActive = false;
                
                if (item.deadline) {
                    const deadline = new Date(item.deadline);
                    if (!isNaN(deadline.getTime())) {
                        deadline.setHours(0, 0, 0, 0);
                        const daysDiff = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
                        
                        if (!item.completed && daysDiff >= 0) {
                            isActive = true;
                            
                            let tenggat_val = 1;
                            if (daysDiff <= 2) tenggat_val = 3;
                            else if (daysDiff <= 5) tenggat_val = 2;

                            let beban_val = 1;
                            const est = parseInt(item.estimated_time) || parseInt(item.estimatedTime) || 1;
                            if (est >= 7) beban_val = 3;
                            else if (est >= 3) beban_val = 2;

                            let kep_val = 1;
                            const kep = (item.importance || '').toLowerCase();
                            if (kep.includes('penting')) kep_val = 3;
                            else if (kep.includes('sedang')) kep_val = 2;

                            let jenis_val = 1;
                            const kat = (item.category || '').toLowerCase();
                            if (kat.includes('akademik') || kat.includes('tugas')) jenis_val = 3;
                            else if (kat.includes('organisasi')) jenis_val = 2;

                            let konsek_val = 1;
                            const konsek = (item.consequence || '').toLowerCase();
                            if (konsek.includes('bahaya')) konsek_val = 3;
                            else if (konsek.includes('sedang')) konsek_val = 2;

                            const total_weighted = (tenggat_val * 0.3) + (beban_val * 0.2) + (kep_val * 0.25) + (jenis_val * 0.1) + (konsek_val * 0.15);

                            if (total_weighted >= 2.25) skor = 3;
                            else if (total_weighted > 1.5) skor = 2;
                            else skor = 1;
                        }
                    }
                }
                
                return { ...item, skor, isActive };
            });

            // Update Cards
            const activeKegiatan = kegiatanDenganSkor.filter(k => k.isActive);
            const stats = hitungStatistik(activeKegiatan);
            
            document.getElementById('statTotal').textContent = kegiatanDenganSkor.length;
            
            if (stats) {
                document.getElementById('statMean').textContent = stats.mean.toFixed(2);
                let statusBeban = "STABIL";
                if (stats.mean > 2.5) statusBeban = "TINGGI";
                else if (stats.mean < 1.5) statusBeban = "RENGGANG";
                document.getElementById('statBeban').textContent = statusBeban;
            } else {
                document.getElementById('statMean').textContent = '0.00';
                document.getElementById('statBeban').textContent = 'RENGGANG';
            }

            // Bar Chart Update
            let countTinggi = 0, countSedang = 0, countRendah = 0;
            kegiatanDenganSkor.forEach(k => {
                if (k.isActive) {
                    if (k.skor === 3) countTinggi++;
                    else if (k.skor === 2) countSedang++;
                    else countRendah++;
                }
            });
            barChartInstance.data.datasets[0].data = [countTinggi, countSedang, countRendah];
            barChartInstance.update();

            // Doughnut Chart Update
            let countAkademik = 0, countOrganisasi = 0, countPribadi = 0;
            kegiatanDenganSkor.forEach(k => {
                const kat = (k.category || '').trim().toLowerCase();
                if (kat === 'akademik' || kat === 'tugas') countAkademik++;
                else if (kat === 'organisasi') countOrganisasi++;
                else countPribadi++;
            });
            doughnutChartInstance.data.datasets[0].data = [countAkademik, countOrganisasi, countPribadi];
            doughnutChartInstance.update();

            const totalKat = countAkademik + countOrganisasi + countPribadi;
            if (totalKat > 0) {
                document.getElementById('legAkademik').textContent = Math.round((countAkademik / totalKat) * 100) + '%';
                document.getElementById('legOrganisasi').textContent = Math.round((countOrganisasi / totalKat) * 100) + '%';
                document.getElementById('legPribadi').textContent = Math.round((countPribadi / totalKat) * 100) + '%';
            }

            // Line Chart Update
            let dayScores = {0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []};
            kegiatanDenganSkor.forEach(k => {
                if (k.isActive && k.deadline) {
                    const d = new Date(k.deadline);
                    if (!isNaN(d.getTime())) dayScores[d.getDay()].push(k.skor);
                }
            });
            
            const getAvg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
            const trendData = [
                getAvg(dayScores[1]),
                getAvg(dayScores[2]),
                getAvg(dayScores[3]),
                getAvg(dayScores[4]),
                getAvg(dayScores[5]),
                getAvg(dayScores[6]),
                getAvg(dayScores[0])
            ];
            lineChartInstance.data.datasets[0].data = trendData;
            lineChartInstance.update();

        } catch (err) {
            console.error(err);
        }
    }

    fetchStatistikData();
});
