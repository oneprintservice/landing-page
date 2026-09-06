
auth.onAuthStateChanged(user => {
            if (user) {
                window.location.href = 'dashboard.html';
            }
        });

        document.getElementById('btn-login').addEventListener('click', () => {

            const username = document.getElementById('login-user').value.trim();
            const pass = document.getElementById('login-pass').value;

            if (!username || !pass) return;

            const emailFormat = username.includes('@')
                ? username
                : username + "@oneprint.com";

            auth.signInWithEmailAndPassword(emailFormat, pass)
            .catch(err => {
                console.error(err);
                document.getElementById('login-error')
                .classList.remove('hidden');
            });
        });

        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('btn-login').click();
            }
        });
