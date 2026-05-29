// File: js/edit.js

document.addEventListener('DOMContentLoaded', async () => {
    const user = await window.checkAuth();
    if (!user) return;

    const container = document.getElementById('edit-activity-container');
    let allActivities = [];

    // Format Tanggal
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

    // Hitung Prioritas (Hanya untuk warna border, dsb) dengan PNS
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
        
        if (daysDiff < 0 && item.completed !== true) return 'red';
        
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

        if (total_weighted >= 2.25) return 'red';
        if (total_weighted > 1.5) return 'yellow';
        return 'green';
    }

    // Render
    function renderActivities() {
        container.innerHTML = '';

        if (allActivities.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">Belum ada kegiatan.</p>';
            return;
        }

        allActivities.forEach(item => {
            const colorClass = hitungPrioritas(item);
            const t = formatDateText(item.deadline);
            
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

            // Logic completed
            const isDone = item.completed === true;
            // Warna kartu jika selesai: Hijau muda
            const circleColor = isDone ? 'background-color: #22c55e; border-color: #22c55e;' : '';
            
            const card = document.createElement('div');
            card.className = `activity-card ${colorClass}`;
            if(isDone || daysDiff < 0) {
                card.className = `activity-card grey`;
                card.style.cssText = 'opacity: 0.8; filter: grayscale(100%);';
            }

            card.innerHTML = `
                <div class="activity-info">
                    <div class="activity-details">
                        <h4>${item.category || 'Tanpa Kategori'}</h4>
                        <h3>${item.name}</h3>
                    </div>
                    <div class="activity-time">
                        <i class="fa-regular fa-clock"></i>
                        ${t}
                    </div>
                </div>
                <div class="edit-actions" style="display: flex; gap: 0.8rem; align-items: center;">
                    <button class="btn-circle btn-complete" data-id="${item.id}" style="${circleColor}" title="Tandai Selesai"></button>
                    ${!isDone ? `<button class="btn-delete" data-id="${item.id}" title="Hapus"><i class="fa-regular fa-trash-can"></i></button>` : ''}
                </div>
            `;
            container.appendChild(card);
        });

        // Pasang Event Listeners
        document.querySelectorAll('.btn-complete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                await markCompleted(id);
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const confirmDelete = confirm("Apakah Anda yakin ingin menghapus kegiatan ini?");
                if(confirmDelete) {
                    await deleteActivity(id);
                }
            });
        });
    }

    // Fetch
    async function fetchActivities() {
        try {
            const { data, error } = await window.supabaseClient
                .from('activities')
                .select('*')
                .eq('user_id', user.id)
                .order('deadline', { ascending: true });
                
            if (error) throw error;
            const sortActivitiesData = (a, b) => {
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
            };

            let fetchedData = data || [];
            fetchedData.sort(sortActivitiesData);
            allActivities = fetchedData;
            renderActivities();
        } catch(err) {
            console.error(err);
            container.innerHTML = '<p style="text-align: center; color: red;">Gagal memuat data.</p>';
        }
    }

    // Mark Completed
    async function markCompleted(id) {
        try {
            const { error } = await window.supabaseClient
                .from('activities')
                .update({ completed: true, status: 'completed' })
                .eq('id', id);
                
            if (error) throw error;
            
            // Update state lokal dan render ulang agar langsung berubah warna
            const item = allActivities.find(a => a.id == id);
            if(item) {
                item.completed = true;
                item.status = 'completed';
            }
            const sortActivitiesData = (a, b) => {
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
            };
            
            allActivities.sort(sortActivitiesData);
            renderActivities();
            
        } catch(err) {
            console.error('Gagal menyelesaikan:', err);
            alert('Gagal memperbarui status. Pastikan tabel memiliki kolom completed bertipe boolean.');
        }
    }

    // Delete
    async function deleteActivity(id) {
        try {
            const { error } = await window.supabaseClient
                .from('activities')
                .delete()
                .eq('id', id);
                
            if (error) throw error;
            
            allActivities = allActivities.filter(a => a.id != id);
            renderActivities();
            
        } catch(err) {
            console.error('Gagal menghapus:', err);
            alert('Gagal menghapus kegiatan.');
        }
    }

    fetchActivities();
});
