'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
  if (!client) return;

  const loginPath = `login.html?next=${encodeURIComponent(getCurrentPagePath())}`;
  const userEmailEl = document.getElementById('auth-user-email');
  const logoutBtn = document.getElementById('btn-logout');

  try {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;

    if (!data.session) {
      if (userEmailEl) userEmailEl.textContent = 'Guest';
      if (logoutBtn) {
        logoutBtn.textContent = 'Login';
        logoutBtn.addEventListener('click', () => {
          window.location.href = loginPath;
        });
      }
      return;
    }

    if (userEmailEl) userEmailEl.textContent = data.session.user.email || 'Signed in';
    if (logoutBtn) {
      logoutBtn.textContent = 'Logout';
      logoutBtn.addEventListener('click', async () => {
        await client.auth.signOut();
        window.location.reload();
      });
    }
  } catch {
    if (userEmailEl) userEmailEl.textContent = 'Guest';
    if (logoutBtn) {
      logoutBtn.textContent = 'Login';
      logoutBtn.addEventListener('click', () => {
        window.location.href = loginPath;
      });
    }
  }
});

function getCurrentPagePath() {
  const path = (window.location.pathname || '').split('/').pop() || 'preview.html';
  return path + (window.location.search || '');
}
