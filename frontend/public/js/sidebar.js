/**
 * sidebar.js
 * Centralized logic for sidebar interactions
 */

function initSidebarUI() {
    syncUserAvatarUI();
    startRealtimeDateTime();
    initNotificationCenter();

    const logoutBtn = document.getElementById('logoutBtn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();

            // Konfirmasi logout (Opsional)
            if (confirm('Apakah Anda yakin ingin keluar?')) {
                handleGlobalLogout();
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebarUI);
} else {
    initSidebarUI();
}

function buildAvatarUrl(avatar) {
    if (!avatar) return '';
    if (avatar.startsWith('http')) return avatar;
    return `http://localhost:5000${avatar}`;
}

function syncUserAvatarUI(avatarFromArg) {
    try {
        const userRaw = localStorage.getItem('user');
        const user = userRaw ? JSON.parse(userRaw) : null;
        let avatar = avatarFromArg;

        if (!avatar) {
            avatar = user?.avatar || '';
        }

        const avatarUrl = buildAvatarUrl(avatar);
        const avatarHtml = avatarUrl
            ? `<img src="${avatarUrl}" alt="Avatar" class="avatar-image" />`
            : '<i class="fas fa-user-circle"></i>';

        const accountAvatar = document.querySelector('.account-avatar');
        if (accountAvatar) accountAvatar.innerHTML = avatarHtml;

        const sidebarAvatar = document.querySelector('.user-avatar-sidebar');
        if (sidebarAvatar) sidebarAvatar.innerHTML = avatarHtml;

        const displayName = user?.full_name || user?.name || 'User';
        const displayRole = user?.role || 'Customer';

        const accountName = document.querySelector('.account-name');
        if (accountName) accountName.textContent = displayName;

        const accountRole = document.querySelector('.account-role');
        if (accountRole) accountRole.textContent = displayRole === 'Customer' ? 'Pelanggan' : displayRole;

        const sidebarName = document.querySelector('.user-info-sidebar h4');
        if (sidebarName) sidebarName.textContent = displayName;

        const sidebarRole = document.querySelector('.user-info-sidebar p');
        if (sidebarRole) sidebarRole.textContent = displayRole;
    } catch (error) {
        console.warn('Failed to sync avatar UI:', error);
    }
}

function startRealtimeDateTime() {
    const dateNode = document.getElementById('liveDateTime');
    if (!dateNode) return;

    const updateDateTime = () => {
        const now = new Date();
        const dateLabel = now.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        const timeLabel = now.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        dateNode.textContent = `${dateLabel} • ${timeLabel}`;
    };

    updateDateTime();
    setInterval(updateDateTime, 1000);
}

function initNotificationCenter() {
    const bell = document.getElementById('notificationBell');
    const panel = document.getElementById('notificationPanel');
    const list = document.getElementById('notificationList');
    const empty = document.getElementById('notificationEmpty');
    const markAll = document.getElementById('notificationMarkAll');

    if (!bell || !panel || !list || !empty) return;

    const readStorageKey = getNotificationReadStorageKey();
    let notifications = [];

    const readIds = loadReadIds();

    const openPanel = () => {
        panel.hidden = false;
        bell.setAttribute('aria-expanded', 'true');
    };

    const closePanel = () => {
        panel.hidden = true;
        bell.setAttribute('aria-expanded', 'false');
    };

    bell.addEventListener('click', function (event) {
        event.stopPropagation();
        if (panel.hidden) {
            openPanel();
        } else {
            closePanel();
        }
    });

    panel.addEventListener('click', function (event) {
        event.stopPropagation();
    });

    document.addEventListener('click', function () {
        closePanel();
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            closePanel();
        }
    });

    if (markAll) {
        markAll.addEventListener('click', function () {
            notifications.forEach((item) => readIds.add(item.id));
            saveReadIds(readIds);
            renderNotifications();
        });
    }

    loadAndRender();
    setInterval(loadAndRender, 60000);

    async function loadAndRender() {
        notifications = await collectNotifications();
        renderNotifications();
    }

    function renderNotifications() {
        if (!notifications.length) {
            list.innerHTML = '';
            empty.hidden = false;
            updateBadge(0);
            return;
        }

        empty.hidden = true;

        const sorted = notifications.slice().sort((a, b) => {
            const aTime = new Date(a.time || 0).getTime() || 0;
            const bTime = new Date(b.time || 0).getTime() || 0;
            return bTime - aTime;
        });

        let unreadCount = 0;

        list.innerHTML = sorted
            .map((item) => {
                const isUnread = !readIds.has(item.id);
                if (isUnread) unreadCount += 1;

                const safeTitle = escapeHtml(item.title);
                const safeMessage = escapeHtml(item.message);
                const safeTime = escapeHtml(formatNotificationTime(item.time));
                const safeHref = item.href || '#';

                return `
                    <a href="${safeHref}" class="notification-item ${isUnread ? 'unread' : ''}" data-notification-id="${item.id}">
                        <div class="notification-item-title">
                            <strong>${safeTitle}</strong>
                            <span class="notification-time">${safeTime}</span>
                        </div>
                        <p class="notification-message">${safeMessage}</p>
                    </a>
                `;
            })
            .join('');

        updateBadge(unreadCount);

        const itemNodes = list.querySelectorAll('.notification-item');
        itemNodes.forEach((node) => {
            node.addEventListener('click', function () {
                const notificationId = node.getAttribute('data-notification-id');
                if (notificationId) {
                    readIds.add(notificationId);
                    saveReadIds(readIds);
                }
            });
        });
    }

    function updateBadge(count) {
        let badge = bell.querySelector('.notification-badge');

        if (count <= 0) {
            if (badge) badge.remove();
            return;
        }

        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'notification-badge';
            bell.appendChild(badge);
        }

        badge.textContent = count > 99 ? '99+' : String(count);
    }

    function loadReadIds() {
        try {
            const raw = localStorage.getItem(readStorageKey);
            const legacyRaw = localStorage.getItem('userNotificationReadIds');
            let effectiveRaw = raw;

            // Migrasi satu kali dari key lama agar status baca lama tidak hilang.
            if (!raw && legacyRaw) {
                localStorage.setItem(readStorageKey, legacyRaw);
                localStorage.removeItem('userNotificationReadIds');
                effectiveRaw = legacyRaw;
            }

            if (!effectiveRaw) return new Set();

            const parsed = JSON.parse(effectiveRaw);
            if (!Array.isArray(parsed)) return new Set();

            return new Set(parsed);
        } catch (error) {
            return new Set();
        }
    }

    function saveReadIds(idsSet) {
        const compact = Array.from(idsSet).slice(-500);
        localStorage.setItem(readStorageKey, JSON.stringify(compact));
    }
}

function getNotificationReadStorageKey() {
    try {
        const userRaw = localStorage.getItem('user');
        const user = userRaw ? JSON.parse(userRaw) : null;
        const userId = user?.id || user?.email || 'guest';
        return `userNotificationReadIds:${String(userId)}`;
    } catch (error) {
        return 'userNotificationReadIds:guest';
    }
}

async function collectNotifications() {
    const fromPage = collectNotificationsFromPageData();
    const fromApi = await collectNotificationsFromApi();

    const merged = [...fromApi, ...fromPage];
    const unique = new Map();

    merged.forEach((item) => {
        if (!item || !item.id) return;
        if (!unique.has(item.id)) {
            unique.set(item.id, item);
        }
    });

    return Array.from(unique.values());
}

function collectNotificationsFromPageData() {
    const notifications = [];

    const historyNode = document.getElementById('history-data');
    if (historyNode && historyNode.dataset.history) {
        const historyItems = safeParseJson(historyNode.dataset.history, []);
        historyItems.forEach((item) => {
            notifications.push(buildSubmissionNotification(item));
        });
    }

    const transactionNode = document.getElementById('transaction-data');
    if (transactionNode && transactionNode.dataset.transactions) {
        const transactionItems = safeParseJson(transactionNode.dataset.transactions, []);
        transactionItems.forEach((item) => {
            notifications.push(buildTransactionNotification(item));
        });
    }

    const dashboardNode = document.getElementById('dashboard-data');
    if (dashboardNode && dashboardNode.dataset.dashboard) {
        const dashboard = safeParseJson(dashboardNode.dataset.dashboard, {});
        const recentSubs = Array.isArray(dashboard.recentSubmissions) ? dashboard.recentSubmissions : [];
        recentSubs.forEach((item, index) => {
            const id = item.id || item.appId || `dashboard-sub-${index}`;
            notifications.push({
                id: `dashboard-sub-${id}`,
                title: `Pengajuan #${item.appId || item.no_permohonan || id}`,
                message: `Status pengajuan: ${item.status || 'Menunggu Verifikasi'}`,
                time: item.dateSubmitted || item.created_at || null,
                href: '/user/history'
            });
        });
    }

    return notifications.filter(Boolean);
}

async function collectNotificationsFromApi() {
    const token = localStorage.getItem('token');
    if (!token) return [];

    const apiBase = 'http://localhost:5000/api';
    const headers = { Authorization: `Bearer ${token}` };

    const [historyResult, transactionResult] = await Promise.allSettled([
        fetch(`${apiBase}/user/history`, { headers }),
        fetch(`${apiBase}/user/transactions`, { headers })
    ]);

    const notifications = [];

    if (historyResult.status === 'fulfilled' && historyResult.value.ok) {
        try {
            const json = await historyResult.value.json();
            const records = Array.isArray(json.data) ? json.data : [];
            records.forEach((item) => notifications.push(buildSubmissionNotification(item)));
        } catch (error) {
            console.warn('Failed to parse history notifications:', error);
        }
    }

    if (transactionResult.status === 'fulfilled' && transactionResult.value.ok) {
        try {
            const json = await transactionResult.value.json();
            const records = Array.isArray(json.data) ? json.data : [];
            records.forEach((item) => notifications.push(buildTransactionNotification(item)));
        } catch (error) {
            console.warn('Failed to parse transaction notifications:', error);
        }
    }

    return notifications.filter(Boolean);
}

function buildSubmissionNotification(item) {
    if (!item) return null;

    const id = item.id || item.appId || item.no_permohonan;
    if (!id) return null;

    const status = item.status || 'Menunggu Verifikasi';
    const refNumber = item.no_permohonan || String(id).padStart(6, '0');

    return {
        id: `submission-${id}-${status}`,
        title: `Pengajuan ${refNumber}`,
        message: `Status terbaru: ${status}`,
        time: item.updated_at || item.created_at || item.dateSubmitted || null,
        href: `/user/history/${id}`
    };
}

function buildTransactionNotification(item) {
    if (!item) return null;

    const id = item.id || item.transaction_id || item.payment_id;
    if (!id) return null;

    const status = item.status_pembayaran || item.status || 'Belum Bayar';
    const invoice = item.no_invoice || `INV-${String(item.submission_id || id).padStart(5, '0')}`;

    return {
        id: `transaction-${id}-${status}`,
        title: `Transaksi ${invoice}`,
        message: `Status pembayaran: ${status}`,
        time: item.updated_at || item.created_at || null,
        href: `/user/transaction/${id}`
    };
}

function safeParseJson(raw, fallback) {
    try {
        if (!raw) return fallback;
        return JSON.parse(raw.replace(/\\'/g, "'"));
    } catch (error) {
        return fallback;
    }
}

function formatNotificationTime(value) {
    if (!value) return '-';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';

    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return 'Baru saja';
    if (diffMinutes < 60) return `${diffMinutes} menit lalu`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;

    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function escapeHtml(input) {
    const value = String(input || '');
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

window.syncUserAvatarUI = syncUserAvatarUI;

/**
 * Handle logout process
 */
function handleGlobalLogout() {
    const storageKeys = [
        'token',
        'user',
        'admin_token',
        'user_token'
    ];

    storageKeys.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });

    // Gunakan replace agar halaman terlindungi tidak kembali lewat tombol Back.
    window.location.replace(`/logout?t=${Date.now()}`);
}
