'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const isLogin = body.classList.contains('login-body');
  const isSignup = body.classList.contains('signup-body');
  if (!isLogin && !isSignup) return;

  const configWarning = document.getElementById('auth-config-warning');
  const form = document.getElementById('auth-form');
  const submitBtn = document.getElementById('auth-submit-btn');
  const submitText = document.getElementById('auth-submit-text');
  const message = document.getElementById('auth-message');
  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  const passwordToggle = document.getElementById('auth-password-toggle');
  const confirmInput = document.getElementById('auth-confirm-password');
  const nameInput = document.getElementById('auth-name');
  const googleBtn = document.getElementById('auth-google-btn');

  const cfg = window.getSupabaseConfig ? window.getSupabaseConfig() : { invalid: true };
  if (cfg.invalid && configWarning) {
    configWarning.classList.remove('hidden');
  }

  if (isLogin) {
    const params = new URLSearchParams(window.location.search);
    if (params.get('signup') === 'success') {
      showMessage('success', 'Account created successfully. Please log in.');
    }
  }

  if (passwordToggle && passwordInput) {
    passwordToggle.addEventListener('click', () => {
      const nextType = passwordInput.type === 'password' ? 'text' : 'password';
      passwordInput.type = nextType;
      passwordToggle.textContent = nextType === 'password' ? 'Show' : 'Hide';
    });
  }

  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
      if (!client) {
        showMessage('error', 'Supabase is not configured. Update js/supabase-config.js first.');
        return;
      }
      try {
        const nextPath = window.getNextPath ? window.getNextPath('preview.html') : 'preview.html';
        const redirectTo = toAbsoluteAppUrl(nextPath);
        const { error } = await client.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo },
        });
        if (error) {
          showMessage('error', error.message || 'Google sign-in failed.');
        }
      } catch {
        showMessage('error', 'Google sign-in failed.');
      }
    });
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
    if (!client) {
      showMessage('error', 'Supabase is not configured. Update js/supabase-config.js first.');
      return;
    }

    const email = (emailInput.value || '').trim();
    const password = passwordInput.value || '';
    if (!email || !password) {
      showMessage('error', 'Email and password are required.');
      return;
    }

    if (isSignup) {
      const name = (nameInput.value || '').trim();
      const confirm = confirmInput ? confirmInput.value : '';
      if (password.length < 6) {
        showMessage('error', 'Password must be at least 6 characters.');
        return;
      }
      if (password !== confirm) {
        showMessage('error', 'Passwords do not match.');
        return;
      }
      await handleSignup(client, email, password, name);
      return;
    }

    await handleLogin(client, email, password);
  });

  async function handleLogin(client, email, password) {
    setBusy(true, 'Signing in...');
    try {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        showMessage('error', error.message || 'Unable to sign in.');
        return;
      }
      showMessage('success', 'Signed in. Redirecting...');
      const nextPath = window.getNextPath ? window.getNextPath('preview.html') : 'preview.html';
      window.setTimeout(() => {
        window.location.href = nextPath;
      }, 500);
    } catch {
      showMessage('error', 'Unable to sign in right now.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSignup(client, email, password, fullName) {
    setBusy(true, 'Creating account...');
    try {
      const redirectUrl = toAbsoluteAppUrl('login.html');
      const payload = {
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: fullName ? { full_name: fullName } : {},
        },
      };
      const { data, error } = await client.auth.signUp(payload);
      if (error) {
        showMessage('error', error.message || 'Unable to create account.');
        return;
      }

      if (data.session) {
        showMessage('success', 'Account created. Redirecting to login...');
      } else {
        showMessage('success', 'Account created. Check your email to verify, then sign in.');
      }
      redirectToLoginAfterSignup();
    } catch {
      showMessage('error', 'Unable to create account right now.');
    } finally {
      setBusy(false);
    }
  }

  function redirectToLoginAfterSignup() {
    const nextPath = window.getNextPath ? window.getNextPath('preview.html') : 'preview.html';
    const loginUrl = new URL(toAbsoluteAppUrl('login.html'));
    loginUrl.searchParams.set('next', nextPath);
    loginUrl.searchParams.set('signup', 'success');
    window.setTimeout(() => {
      window.location.href = loginUrl.toString();
    }, 700);
  }

  function toAbsoluteAppUrl(path) {
    const safePath = (path || '').replace(/^\//, '');
    return new URL(safePath, window.location.href).toString();
  }

  function setBusy(busy, label) {
    submitBtn.disabled = busy;
    submitBtn.classList.toggle('disabled', busy);
    submitText.textContent = busy ? label : (isSignup ? 'Create Account' : 'Sign In');
  }

  function showMessage(type, text) {
    message.textContent = text;
    message.className = `auth-message ${type}`;
    message.classList.remove('hidden');
  }
});
