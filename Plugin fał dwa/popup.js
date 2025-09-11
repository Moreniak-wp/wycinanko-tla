// popup.js v7.1 
document.getElementById('downloadLogs').addEventListener('click', () => {
    chrome.storage.local.get(['inspector_logs'], (result) => {
        if (result.inspector_logs && result.inspector_logs.length > 0) {
            const logs = result.inspector_logs;
            const formattedLogs = "Logi z sesji - WP Ad Inspector (v26.0)\n" +
                                "========================================\n\n" +
                                logs.join('\n');
            const blob = new Blob([formattedLogs], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const a_moment = new Date();
            const timestamp = a_moment.getFullYear() + ('0' + (a_moment.getMonth() + 1)).slice(-2) + ('0' + a_moment.getDate()).slice(-2) + "_" + ('0' + a_moment.getHours()).slice(-2) + ('0' + a_moment.getMinutes()).slice(-2);
            a.href = url;
            a.download = `wp_inspector_logs_${timestamp}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else {
            alert('Brak loguw do pobrania w tej sesji.');
        }
    });
});

document.getElementById('clearLogs').addEventListener('click', () => {
    chrome.storage.local.remove('inspector_logs', () => {
        alert('Logi zostaly wyczyszczone.');
    });
});
