// File: js/tambah.js

document.addEventListener('DOMContentLoaded', async () => {
    const user = await window.checkAuth();
    if (!user) return;

    function calculatePriority(importance, consequence) {
        const importanceScore = { 'Normal': 1, 'Sedang': 2, 'Penting': 3 };
        const consequenceScore = { 'Santai': 1, 'Sedang': 2, 'Bahaya': 3 };
        const score =
            (importanceScore[importance] || 1) * 0.6 +
            (consequenceScore[consequence] || 1) * 0.4;
        if (score >= 2.4) return 'Tinggi';
        if (score >= 1.6) return 'Sedang';
        return 'Rendah';
    }

    const btnSimpan = document.getElementById('btn-simpan');
    if (btnSimpan) {
        btnSimpan.addEventListener('click', async (e) => {
            e.preventDefault();
            
            // Get inputs
            const namaKegiatan = document.getElementById('nama-kegiatan').value;
            const tenggatWaktu = document.getElementById('tenggat-waktu').value;
            const estimasiWaktu = document.getElementById('estimasi-waktu').value;
            
            // Get active category
            let kategori = "";
            const catActive = document.querySelector('.cat-btn.active');
            if (catActive) {
                kategori = catActive.textContent.trim();
            }
            
            // Get active importance
            let tingkatKepentingan = "Normal";
            const impActive = document.querySelector('.importance .sel-box.active');
            if (impActive) {
                tingkatKepentingan = impActive.getAttribute('data-val');
            }
            
            // Get active consequence
            let konsekuensiTelat = "Santai";
            const consActive = document.querySelector('.consequence .sel-box.active');
            if (consActive) {
                konsekuensiTelat = consActive.getAttribute('data-val');
            }
            
            // Validation
            if (!namaKegiatan || !tenggatWaktu || !estimasiWaktu) {
                alert("Harap lengkapi semua data (Nama, Tanggal, dan Estimasi)!");
                return;
            }

            btnSimpan.textContent = "Menyimpan...";
            btnSimpan.disabled = true;

            const priority = calculatePriority(tingkatKepentingan, konsekuensiTelat);

            const { data, error } = await window.supabaseClient
                .from('activities')
                .insert([
                    {
                        user_id: user.id,
                        name: namaKegiatan,
                        category: kategori,
                        deadline: tenggatWaktu,
                        estimated_time: parseInt(estimasiWaktu),
                        importance: tingkatKepentingan,
                        consequence: konsekuensiTelat,
                        priority: priority,
                        status: 'pending',
                        completed: false
                    }
                ]);

            if (error) {
                console.error('Supabase Error:', error);
                alert('Gagal menyimpan kegiatan. Detail error: ' + error.message);
                btnSimpan.textContent = "Simpan";
                btnSimpan.disabled = false;
            } else {
                alert('Kegiatan berhasil disimpan!');
                window.location.href = "daftar_kegiatan.html";
            }
        });
    }
});
