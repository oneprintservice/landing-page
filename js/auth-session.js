/* Authentication, technician identity and idle session handling. */
        let currentTeknisi = "TEKNISI";
        let currentServisKey = null;

        auth.onAuthStateChanged(user => {
            if (!user) { window.location.href = 'login.html'; }
            else {
                const name = user.email.split('@')[0].toUpperCase();
                currentTeknisi = name;
                const el = document.getElementById('user-display');
                if (el) el.innerText = "TEKNISI: " + name;
            }
        });

        const logoutButton = document.getElementById('btn-logout');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                auth.signOut().then(() => window.location.href = 'login.html');
            });
        }

        let idleTime = 0;
        setInterval(() => {
            if (auth.currentUser) {
                idleTime++;
                const timer = document.getElementById('idle-timer');
                if (timer) timer.innerText = `Idle: ${idleTime}/30 mnt`;
                if (idleTime >= 30) auth.signOut().then(() => window.location.href = 'login.html');
            }
        }, 60000);

        function resetTimer() { idleTime = 0; }
        window.onmousemove = resetTimer;
        window.onclick = resetTimer;
        window.onkeypress = resetTimer;
