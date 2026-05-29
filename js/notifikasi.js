// File: js/notifikasi.js

document.addEventListener('DOMContentLoaded', async () => {
    const user = await window.checkAuth();
    if (!user) return;

    const container = document.getElementById('notif-container');

    async function fetchNotifications() {
        try {
            const { data, error } = await window.supabaseClient
                .from('activities')
                .select('*')
                .eq('user_id', user.id);
                
            if (error) throw error;
            
            let activeList = [];
            const today = new Date();
            today.setHours(0,0,0,0);

            (data || []).forEach(item => {
                if (item.completed) return; // Skip completed

                if (item.deadline) {
                    const deadline = new Date(item.deadline);
                    if (!isNaN(deadline.getTime())) {
                        deadline.setHours(0,0,0,0);
                        const diffTime = deadline - today;
                        const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        if (daysDiff >= 0) {
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
                            
                            let priorityScore = 1;
                            let colorClass = 'green';
                            let textTag = 'RENDAH';
                            let icon = 'fa-clipboard-list';
                            let tagClass = 'green-tag';
                            let messageSuffix = 'Bisa disiapkan secara perlahan.';

                            if (total_weighted >= 2.25) {
                                priorityScore = 3;
                                colorClass = 'red';
                                textTag = 'TINGGI';
                                tagClass = 'high';
                                icon = 'fa-exclamation';
                                messageSuffix = 'Prioritas tinggi, segera selesaikan!';
                            } else if (total_weighted > 1.5) {
                                priorityScore = 2;
                                colorClass = 'yellow';
                                textTag = 'SEDANG';
                                tagClass = 'medium';
                                icon = 'fa-triangle-exclamation';
                                messageSuffix = 'Jangan lupa dikerjakan.';
                            }
                            
                            let message = daysDiff === 0 
                                ? `Tenggat waktu HARI INI! ${messageSuffix}` 
                                : `Tenggat waktu ${daysDiff} hari lagi. ${messageSuffix}`;

                            activeList.push({
                                ...item, daysDiff, priorityScore, colorClass, textTag, tagClass, icon, message
                            });
                        }
                    }
                }
            });

            // Sort berdasarkan prioritas lalu hari terdekat
            activeList.sort((a, b) => {
                if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
                return a.daysDiff - b.daysDiff;
            });

            // Render HTML
            container.innerHTML = '<h2 class="section-title">Daftar Pengingat</h2>';
            
            if (activeList.length === 0) {
                container.innerHTML += '<p style="text-align: center; color: #6b7280; padding: 2rem;">Tidak ada pengingat atau kegiatan mendatang.</p>';
                return;
            }

            activeList.forEach(item => {
                const html = `
                <div class="notif-card ${item.colorClass}">
                    <div class="notif-icon">
                        <i class="fa-solid ${item.icon}"></i>
                    </div>
                    <div class="notif-content">
                        <h3>${item.name}</h3>
                        <p>${item.message}</p>
                    </div>
                    <div class="notif-meta">
                        <span class="notif-time">${item.daysDiff === 0 ? 'HARI INI' : item.daysDiff + ' HARI LAGI'}</span>
                        <div class="notif-tags">
                            <span class="tag dark" style="text-transform: uppercase;">${item.category || 'UMUM'}</span>
                            <span class="tag ${item.tagClass}">${item.textTag}</span>
                        </div>
                    </div>
                </div>`;
                container.innerHTML += html;
            });
            
        } catch(err) {
            console.error(err);
            container.innerHTML = '<p style="text-align: center; color: red;">Gagal memuat notifikasi.</p>';
        }
    }

    fetchNotifications();
});
