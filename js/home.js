// File: js/home.js
// Dipanggil oleh home.html

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cek Autentikasi
    const user = await window.checkAuth();
    if (!user) return; // Jika tidak login, checkAuth() sudah mengalihkan halaman

    // Sapa nama user
    const fullName = user.user_metadata?.full_name || 'User';
    const firstName = fullName.split(" ")[0];
    document.getElementById("welcomeText").innerHTML = `Halo, ${firstName}!`;

    const container = document.getElementById('home-activity-container');
    const statSelesai = document.getElementById('stat-selesai');
    const statReview = document.getElementById('stat-review');

    // Helper Tanggal
    function formatDateText(dateStr) {
        if (!dateStr) return "Tenggat tidak diketahui";
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const d = new Date(dateStr);
        const dOnly = new Date(d);
        dOnly.setHours(0, 0, 0, 0);

        if (dOnly.getTime() === today.getTime()) return "Hari ini, 23:59";

        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
        return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
    }

    // Set Header Kalender
    const calMonths = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const calDate = new Date();
    document.getElementById('calendar-month-year').textContent = `${calMonths[calDate.getMonth()]} ${calDate.getFullYear()}`;

    // 2. Fetch Data
    async function fetchHomeData() {
        try {
            const { data, error } = await window.supabaseClient
                .from('activities') // Tabel yang benar adalah activities
                .select('*')
                .eq('user_id', user.id);

            if (error) throw error;

            let selesaiCount = 0;
            let reviewCount = 0;
            let mendatangList = [];
            
            let sumScore = 0;
            let activeCount = 0;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            (data || []).forEach(item => {
                const deadline = new Date(item.deadline);
                deadline.setHours(0, 0, 0, 0);
                const diffTime = deadline - today;
                const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (item.completed === true || daysDiff < 0) {
                    selesaiCount++;
                } else {
                    reviewCount++;

                    // PNS Logic (Priority Notification System)
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
                    let pColorClass = 'green';
                    let pText = 'RENDAH';
                    let pTagClass = 'green-tag';

                    if (total_weighted >= 2.25) {
                        priorityScore = 3;
                        pColorClass = 'red'; pText = 'TINGGI'; pTagClass = 'high';
                    } else if (total_weighted > 1.5) {
                        priorityScore = 2;
                        pColorClass = 'yellow'; pText = 'SEDANG'; pTagClass = 'medium';
                    }

                    mendatangList.push({
                        ...item,
                        daysDiff,
                        priorityScore,
                        pColorClass,
                        pText,
                        pTagClass
                    });
                    
                    sumScore += priorityScore;
                    activeCount++;
                }
            });

            // Update DOM Stats
            statSelesai.textContent = selesaiCount;
            statReview.textContent = reviewCount;
            
            // Alert Banner
            const meanScore = activeCount > 0 ? sumScore / activeCount : 0;
            const alertBanner = document.getElementById('home-alert-banner');
            const alertTitle = document.getElementById('home-alert-title');
            const alertDesc = document.getElementById('home-alert-desc');
            
            if (activeCount === 0) {
                alertBanner.style.background = 'linear-gradient(to bottom right, #f0fdf4 60%, #ffffff 100%)';
                alertBanner.style.borderColor = '#dcfce7';
                alertTitle.style.color = '#15803d';
                alertTitle.innerHTML = '<i class="fa-regular fa-face-smile"></i> STATUS: RENGGANG';
                alertDesc.textContent = 'Tidak ada tugas yang sedang aktif. Anda bebas untuk bersantai!';
            } else if (meanScore > 2.5) {
                alertBanner.style.background = 'linear-gradient(to bottom right, #fef2f2 60%, #ffffff 100%)';
                alertBanner.style.borderColor = '#fee2e2';
                alertTitle.style.color = '#b91c1c';
                alertTitle.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> STATUS: WASPADA';
                alertDesc.textContent = 'Beban kerja Anda sangat tinggi! Segera selesaikan tugas-tugas prioritas tertinggi Anda.';
            } else if (meanScore < 1.5) {
                alertBanner.style.background = 'linear-gradient(to bottom right, #f0fdf4 60%, #ffffff 100%)';
                alertBanner.style.borderColor = '#dcfce7';
                alertTitle.style.color = '#15803d';
                alertTitle.innerHTML = '<i class="fa-regular fa-face-smile"></i> STATUS: RENGGANG';
                alertDesc.textContent = 'Beban kerja Anda tergolong ringan. Nikmati waktu luang atau mulai mencicil tugas.';
            } else {
                alertBanner.style.background = 'linear-gradient(to bottom right, #fefce8 60%, #ffffff 100%)';
                alertBanner.style.borderColor = '#fef9c3';
                alertTitle.style.color = '#a16207';
                alertTitle.innerHTML = '<i class="fa-solid fa-circle-info"></i> STATUS: STABIL';
                alertDesc.textContent = 'Beban kerja Anda normal dan stabil. Terus pertahankan ritme kerja yang baik ini.';
            }

            // Sort & Render Activities
            mendatangList.sort((a, b) => {
                if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
                return a.daysDiff - b.daysDiff;
            });

            const topActivities = mendatangList.slice(0, 3);
            container.innerHTML = '';
            
            if (topActivities.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 1rem;">Tidak ada kegiatan mendatang.</p>';
                return;
            }

            topActivities.forEach(item => {
                const card = document.createElement('div');
                card.className = `activity-card ${item.pColorClass}`;
                const t = formatDateText(item.deadline);

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
                    <div class="tag ${item.pTagClass}">${item.pText}</div>
                `;
                container.appendChild(card);
            });

            // --- BROWSER PUSH NOTIFICATION ---
            if ("Notification" in window) {
                if (Notification.permission === "default") {
                    Notification.requestPermission();
                }

                if (Notification.permission === "granted") {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const lastNotified = localStorage.getItem('last_notified_date');
                    
                    // Hanya memunculkan pop-up sekali sehari agar tidak mengganggu
                    if (lastNotified !== todayStr) {
                        // Cari kegiatan mendesak (Prioritas Tinggi atau Tenggat hari ini)
                        const urgentTasks = mendatangList.filter(item => item.priorityScore === 3 || item.daysDiff === 0);
                        
                        if (urgentTasks.length > 0) {
                            const notifTitle = "Simprity: Peringatan Tugas Mendesak!";
                            let notifBody = `Ada ${urgentTasks.length} tugas mendesak hari ini. Cek sekarang!`;
                            if (urgentTasks.length === 1) {
                                notifBody = `Jangan lupa selesaikan: ${urgentTasks[0].name}`;
                            }
                            
                            new Notification(notifTitle, {
                                body: notifBody,
                                icon: 'assets/logo1.png'
                            });
                            
                            localStorage.setItem('last_notified_date', todayStr);
                        }
                    }
                }
            }

        } catch (err) {
            console.error('Error mengambil data:', err);
            container.innerHTML = '<p style="text-align: center; color: red; padding: 1rem;">Gagal memuat kegiatan.</p>';
        }
    }

    fetchHomeData();
});
