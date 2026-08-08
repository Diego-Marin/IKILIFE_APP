/**
 * ==========================================
 * COMPONENTE: AUTH LOCK (Bloqueo de la App)
 * ==========================================
 * 
 * MEJORAS:
 * 1. BLOQUEO POR INACTIVIDAD: si no hay interaccion durante
 *    15 minutos, la app se bloquea automaticamente.
 * 2. HASH EN SUPABASE: la contrasena (hash SHA-256) se guarda
 *    preferentemente en la tabla "app_auth" de Supabase para
 *    mayor seguridad y persistencia. Si falla la conexion o la
 *    tabla no existe, hace fallback a localStorage.
 * 3. NUNCA EXPIRA: el hash se almacena de forma permanente.
 *
 * TABLA REQUERIDA EN SUPABASE:
 *   CREATE TABLE app_auth (
 *     id int PRIMARY KEY DEFAULT 1,
 *     hash text NOT NULL,
 *     updated_at timestamptz DEFAULT now()
 *   );
 *
 * USO: cargar DESPUES de main.js (o asegurar que _supabase exista).
 */

(function () {
    const STORAGE_KEY = 'ikilife_auth';
    const UNLOCKED_KEY = 'ikilife_unlocked';
    const INACTIVITY_MS = 15 * 60 * 1000; // 15 minutos

    var overlay = null;
    var draftFirst = null;
    var attempts = 0;
    var lockedUntil = 0;
    var inactivityTimer = null;
    var _configCache = null;

    /* ---------- Utilidades criptograficas ---------- */
    async function sha256Hex(text) {
        var enc = new TextEncoder().encode(text);
        var buf = await crypto.subtle.digest('SHA-256', enc);
        return Array.from(new Uint8Array(buf)).map(function(b) {
            return b.toString(16).padStart(2, '0');
        }).join('');
    }

    function getSupabaseClient() {
        return (typeof _supabase !== 'undefined' && _supabase) ? _supabase : null;
    }

    /* ---------- Persistencia: Supabase primero, localStorage fallback ---------- */
    async function loadAuthConfig() {
        if (_configCache) return _configCache;

        var client = getSupabaseClient();
        if (client) {
            try {
                var result = await client
                    .from('app_auth')
                    .select('hash')
                    .eq('id', 1)
                    .single();
                if (!result.error && result.data && result.data.hash) {
                    _configCache = { type: 'code', hash: result.data.hash, source: 'supabase' };
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(_configCache));
                    return _configCache;
                }
            } catch (e) {
                console.warn('Auth Lock: fallo al leer de Supabase, usando localStorage.', e.message);
            }
        }

        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                _configCache = JSON.parse(raw);
                return _configCache;
            }
        } catch (e) {
            console.warn('Auth Lock: localStorage corrupto.', e.message);
        }
        return null;
    }

    async function saveAuthConfig(rawValue) {
        var hash = await sha256Hex(rawValue);
        var payload = { type: 'code', hash: hash };

        var client = getSupabaseClient();
        if (client) {
            try {
                var result = await client
                    .from('app_auth')
                    .upsert({ id: 1, hash: hash, updated_at: new Date().toISOString() }, { onConflict: 'id' });
                if (!result.error) {
                    payload.source = 'supabase';
                } else {
                    console.warn('Auth Lock: no se pudo guardar en Supabase.', result.error.message);
                }
            } catch (e) {
                console.warn('Auth Lock: excepcion guardando en Supabase.', e.message);
            }
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        _configCache = payload;
        draftFirst = null;
        markUnlocked();
        hideOverlay();
        startInactivityTimer();
    }

    async function clearAuthConfig() {
        var client = getSupabaseClient();
        if (client) {
            try {
                await client.from('app_auth').delete().eq('id', 1);
            } catch (e) { /* ignore */ }
        }
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(UNLOCKED_KEY);
        _configCache = null;
        draftFirst = null;
    }

    /* ---------- Estado de desbloqueo ---------- */
    function isUnlocked() {
        return localStorage.getItem(UNLOCKED_KEY) === '1';
    }

    function markUnlocked() {
        localStorage.setItem(UNLOCKED_KEY, '1');
    }

    function markLocked() {
        localStorage.removeItem(UNLOCKED_KEY);
    }

    /* ---------- Inactividad ---------- */
    function startInactivityTimer() {
        stopInactivityTimer();
        inactivityTimer = setTimeout(function() {
            if (isUnlocked()) {
                lockApp();
            }
        }, INACTIVITY_MS);
    }

    function stopInactivityTimer() {
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
            inactivityTimer = null;
        }
    }

    function resetInactivityTimer() {
        if (!isUnlocked()) return;
        startInactivityTimer();
    }

    function setupInactivityDetection() {
        var events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click', 'keydown'];
        events.forEach(function(evt) {
            document.addEventListener(evt, resetInactivityTimer, true);
        });
    }

    /* ---------- Overlay ---------- */
    function showOverlay(htmlContent) {
        overlay = document.getElementById('auth-lock-overlay');
        if (!overlay) return;
        overlay.classList.add('auth-lock-active');
        overlay.innerHTML = htmlContent;
    }

    function hideOverlay() {
        overlay = document.getElementById('auth-lock-overlay');
        if (!overlay) return;
        overlay.classList.remove('auth-lock-active');
        overlay.innerHTML = '';
    }

    /* ---------- Punto de entrada ---------- */
    async function initAuthLock() {
        overlay = document.getElementById('auth-lock-overlay');
        if (!overlay) {
            console.warn('auth_lock: no existe #auth-lock-overlay en el HTML.');
            return;
        }

        var config = await loadAuthConfig();

        if (!config) {
            renderSetupScreen();
            return;
        }

        if (isUnlocked()) {
            hideOverlay();
            setupInactivityDetection();
            startInactivityTimer();
            return;
        }

        renderUnlockScreen(config);
    }

    /* ---------- API publica ---------- */
    window.lockApp = async function() {
        markLocked();
        stopInactivityTimer();
        var config = await loadAuthConfig();
        if (!config) {
            renderSetupScreen();
        } else {
            renderUnlockScreen(config);
        }
    };

    /* ---------- Pantallas ---------- */
    function renderSetupScreen(confirming) {
        showOverlay(
            '<div class="auth-lock-box">' +
                '<div class="auth-lock-title">\uD83D\uDD12 Protege tu IKILIFE</div>' +
                '<div class="auth-lock-subtitle">' + (confirming ? 'Confirma de nuevo' : 'Crea un codigo para proteger tu app') + '</div>' +
                '<div id="auth-lock-input-area"></div>' +
                '<div class="auth-lock-error" id="auth-lock-error"></div>' +
            '</div>'
        );
        renderCodeInput(async function(value) {
            if (!confirming) {
                draftFirst = value;
                renderSetupScreen(true);
            } else {
                if (value !== draftFirst) {
                    showError('Los codigos no coinciden. Intenta de nuevo.');
                    draftFirst = null;
                    renderSetupScreen(false);
                    return;
                }
                await saveAuthConfig(value);
            }
        });
    }

    function renderUnlockScreen(config) {
        showOverlay(
            '<div class="auth-lock-box">' +
                '<div class="auth-lock-title">\uD83D\uDD12 IKILIFE bloqueado</div>' +
                '<div class="auth-lock-subtitle">Ingresa tu codigo</div>' +
                '<div id="auth-lock-input-area"></div>' +
                '<div class="auth-lock-error" id="auth-lock-error"></div>' +
                '<button type="button" class="auth-lock-forgot" id="auth-lock-forgot">Olvidaste tu codigo?</button>' +
            '</div>'
        );

        document.getElementById('auth-lock-forgot').addEventListener('click', async function() {
            var ok = confirm('Esto borrara tu codigo actual y tendras que crear uno nuevo. Continuar?');
            if (ok) {
                await clearAuthConfig();
                renderSetupScreen(false);
            }
        });

        var now = Date.now();
        if (lockedUntil > now) {
            disableInputTemporarily(config);
            return;
        }

        renderCodeInput(async function(rawValue) {
            var hash = await sha256Hex(rawValue);
            if (hash === config.hash) {
                attempts = 0;
                markUnlocked();
                hideOverlay();
                setupInactivityDetection();
                startInactivityTimer();
            } else {
                attempts += 1;
                if (attempts >= 5) {
                    lockedUntil = Date.now() + 30000;
                    showError('Demasiados intentos. Espera 30 segundos.');
                    disableInputTemporarily(config);
                } else {
                    showError('Codigo incorrecto. Intenta de nuevo.');
                    renderUnlockScreen(config);
                }
            }
        });
    }

    function disableInputTemporarily(config) {
        var area = document.getElementById('auth-lock-input-area');
        if (area) area.innerHTML = '<div class="auth-lock-cooldown">Vuelve a intentar en unos segundos...</div>';
        setTimeout(function() { renderUnlockScreen(config); }, Math.max(1000, lockedUntil - Date.now()));
    }

    function showError(msg) {
        var err = document.getElementById('auth-lock-error');
        if (err) err.textContent = msg;
    }

    /* ---------- Input numerico ---------- */
    function renderCodeInput(onComplete) {
        var area = document.getElementById('auth-lock-input-area');
        if (!area) return;
        var value = '';
        var maxDigits = 6;

        area.innerHTML =
            '<div class="auth-lock-dots" id="auth-lock-dots"></div>' +
            '<div class="auth-lock-keypad" id="auth-lock-keypad"></div>';

        function renderDots() {
            var dotsEl = document.getElementById('auth-lock-dots');
            dotsEl.innerHTML = '';
            for (var i = 0; i < maxDigits; i++) {
                var dot = document.createElement('span');
                dot.className = 'auth-lock-dot' + (i < value.length ? ' auth-lock-dot--filled' : '');
                dotsEl.appendChild(dot);
            }
        }

        var keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'borrar', '0', 'ok'];
        var keypad = document.getElementById('auth-lock-keypad');
        keys.forEach(function(k) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'auth-lock-key' +
                (k === 'ok' ? ' auth-lock-key--ok' : '') +
                (k === 'borrar' ? ' auth-lock-key--del' : '');
            btn.textContent = k === 'borrar' ? '\u232B' : (k === 'ok' ? '\u2713' : k);
            btn.addEventListener('click', function() {
                if (k === 'borrar') {
                    value = value.slice(0, -1);
                } else if (k === 'ok') {
                    if (value.length >= 4) onComplete(value);
                    else showError('Usa al menos 4 digitos.');
                    return;
                } else if (value.length < maxDigits) {
                    value += k;
                }
                renderDots();
            });
            keypad.appendChild(btn);
        });

        renderDots();
    }

    /* ---------- Arranque ---------- */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuthLock);
    } else {
        initAuthLock();
    }
})();
