// File: js/kegiatan.js

document.addEventListener('DOMContentLoaded', async () => {
    const user = await window.checkAuth();
    if (!user) return;

    const container = document.getElementById('activity-container');
    const searchInput = document.getElementById('search-input');
    const btnSearch = document.getElementById('btn-search');
    const chips = document.querySelectorAll('.chip');
    let allActivities = [];
    let currentFilter = 'Semua';
    let searchQuery = '';

    // 1. Fungsi Hitung Prioritas dengan PNS
    function hitungPrioritas(item) {
        const today = new Date();
        today.setHours(0,0,0,0);
        
        let daysDiff = 999;
        if (item.deadline) {
            const deadline = new Date(item.deadline);
            if (!isNaN(deadline.getTime())) {
                deadline.setHours(0,0,0,0);
                daysDiff = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
            }
        }
        
        if (daysDiff < 0 && item.completed !== true) return { colorClass: 'red', text: 'TERLAMBAT', tagClass: 'high' };
        
        let tenggat_val = 1;
        if (daysDiff <= 2) tenggat_val = 3;
        else if (daysDiff <= 5) tenggat_val = 2;

        let beban_val = 1;
        const est = parseInt(item.estimated_time) || parseInt(item.estimatedTime) || 1;
        if (est >= 7) beban_val = 3;
        else if (est >= 3) beban_val = 2;

        let kep_val = 1; // Default Normal
        const kep = (item.importance || '').toLowerCase();
        if (kep.includes('penting')) kep_val = 3;
        else if (kep.includes('sedang')) kep_val = 2;

        let jenis_val = 1; // Default Pribadi
        const kat = (item.category || '').toLowerCase();
        if (kat.includes('akademik') || kat.includes('tugas')) jenis_val = 3;
        else if (kat.includes('organisasi')) jenis_val = 2;

        let konsek_val = 1; // Default Santai
        const konsek = (item.consequence || '').toLowerCase();
        if (konsek.includes('bahaya')) konsek_val = 3;
        else if (konsek.includes('sedang')) konsek_val = 2;

        const total_weighted = (tenggat_val * 0.3) + (beban_val * 0.2) + (kep_val * 0.25) + (jenis_val * 0.1) + (konsek_val * 0.15);

        if (total_weighted >= 2.25) {
            return { colorClass: 'red', text: 'TINGGI', tagClass: 'high' };
        } else if (total_weighted > 1.5) {
            return { colorClass: 'yellow', text: 'SEDANG', tagClass: 'medium' };
        } else {
            return { colorClass: 'green', text: 'RENDAH', tagClass: 'green-tag' };
        }
    }

    // 2. Fungsi Format Tanggal
    function formatDateText(dateStr) {
        if (!dateStr) return "Tenggat tidak diketahui";
        const today = new Date();
        today.setHours(0,0,0,0);
        const d = new Date(dateStr);
        const dOnly = new Date(d);
        dOnly.setHours(0,0,0,0);
        
        if (dOnly.getTime() === today.getTime()) return "Hari ini, 23:59";
        
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
        return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
    }

    // 3. Render Cards
    function renderActivities() {
        container.innerHTML = ''; // bersihkan container

        const filtered = allActivities.filter(item => {
            let matchCategory = false;
            if (currentFilter === 'Semua') matchCategory = true;
            else if (currentFilter === 'Akademik' && (item.category === 'Akademik' || item.category === 'Tugas')) matchCategory = true;
            else matchCategory = item.category === currentFilter;
            
            const matchSearch = (item.name || '').toLowerCase().includes(searchQuery);
            return matchCategory && matchSearch;
        });

        if (filtered.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">Tidak ada kegiatan yang ditemukan.</p>';
            return;
        }

        filtered.forEach(item => {
            const p = hitungPrioritas(item);
            const t = formatDateText(item.deadline);
            
            // Render elemen
            const card = document.createElement('div');
            card.className = `activity-card ${p.colorClass}`;
            
            let daysDiff = 999;
            if (item.deadline) {
                const today = new Date();
                today.setHours(0,0,0,0);
                const deadline = new Date(item.deadline);
                if (!isNaN(deadline.getTime())) {
                    deadline.setHours(0,0,0,0);
                    daysDiff = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
                }
            }
            
            if (item.completed || daysDiff < 0) {
                card.className = `activity-card grey`;
                card.style.cssText = 'opacity: 0.8; filter: grayscale(100%);';
                p.tagClass = 'grey-tag';
                p.text = item.completed ? 'SELESAI' : 'KEDALUWARSA';
            }
            
            // Logic sembunyikan text jika bukan filter 'Semua'
            const hideStyle = currentFilter === 'Semua' ? '' : 'style="display: none;"';

            card.innerHTML = `
                <div class="activity-info">
                    <div class="activity-details">
                        <h4 ${hideStyle}>${item.category || 'Tanpa Kategori'}</h4>
                        <h3>${item.name}</h3>
                    </div>
                    <div class="activity-time">
                        <i class="fa-regular fa-clock"></i>
                        ${t}
                    </div>
                </div>
                <div class="tag ${p.tagClass}" ${hideStyle}>${p.text}</div>
            `;
            container.appendChild(card);
        });
    }

    // 4. Fetch dari Supabase
    async function fetchActivities() {
        try {
            const { data, error } = await window.supabaseClient
                .from('activities')
                .select('*')
                .eq('user_id', user.id)
                .order('deadline', { ascending: true }); // Urut terdekat
                
            if (error) throw error;
            
            let fetchedData = data || [];
            fetchedData.sort((a, b) => {
                const getInactiveScore = (item) => {
                    if (item.completed) return 1;
                    if (item.deadline) {
                        const d = new Date(item.deadline);
                        d.setHours(0,0,0,0);
                        const today = new Date();
                        today.setHours(0,0,0,0);
                        if (d - today < 0) return 1;
                    }
                    return 0;
                };
                const aScore = getInactiveScore(a);
                const bScore = getInactiveScore(b);
                if (aScore !== bScore) return aScore - bScore;
                return new Date(a.deadline) - new Date(b.deadline);
            });
            
            allActivities = fetchedData;
            renderActivities();
        } catch(err) {
            console.error('Error mengambil data:', err);
            container.innerHTML = '<p style="text-align: center; color: red; padding: 2rem;">Gagal memuat data dari database.</p>';
        }
    }

    // 5. Setup Filter Chips
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilter = chip.textContent.trim();
            renderActivities();
        });
    });

    // 6. Setup Search Input & Button
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            renderActivities();
        });
    }

    if (btnSearch) {
        btnSearch.addEventListener('click', () => {
            searchQuery = searchInput.value.toLowerCase();
            renderActivities();
        });
    }

    // Mulai
    fetchActivities();
});
