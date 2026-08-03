/**
 * ==========================================
 * COMPONENTE: AUTH LOCK (Bloqueo de la App)
 * ==========================================
 * Solo código numérico (4-6 dígitos). El desbloqueo se recuerda de
 * forma PERSISTENTE en localStorage: una vez que ingresas el código
 * correcto, la app queda desbloqueada indefinidamente (incluso
 * cerrando el navegador o recargando) hasta que TÚ mismo la bloquees
 * a propósito con el botón de candado del header (window.lockApp()).
 *
 * La contraseña NUNCA se guarda en texto plano: se guarda su hash
 * SHA-256 (Web Crypto API) en localStorage bajo la llave
 * "ikilife_auth". El estado de desbloqueo se guarda en localStorage
 * bajo "ikilife_unlocked".
 *
 * No requiere ninguna tabla de Supabase: toda la lógica es local.
 *
 * USO: este script debe cargarse ANTES que main.js. Al cargar,
 * inserta y controla su propio overlay (#auth-lock-overlay), que ya
 * debe existir vacío en el HTML como primer hijo del <body>.
 */

(function () {
    const STORAGE_KEY = 'ikilife_auth';
    const UNLOCKED_KEY = 'ikilife_unlocked';

    let overlay = null;
    let draftFirst = null;    // guarda el primer intento al crear contraseña (para confirmar)
    let attempts = 0;
    let lockedUntil = 0;

    async function sha256Hex(text) {
        const enc = new TextEncoder().encode(text);
        const buf = await crypto.subtle.digest('SHA-256', enc);
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function getAuthConfig() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function isUnlocked() {
        return localStorage.getItem(UNLOCKED_KEY) === '1';
    }

    function markUnlocked() {
        localStorage.setItem(UNLOCKED_KEY, '1');
    }

    /**
     * Punto de entrada: decide si hay que mostrar pantalla de
     * "crear contraseña" o de "ingresar contraseña", o si ya se puede
     * dejar pasar directo (ya desbloqueada de forma persistente).
     */
    function initAuthLock() {
        overlay = document.getElementById('auth-lock-overlay');
        if (!overlay) {
            console.warn('auth_lock: no existe #auth-lock-overlay en el HTML.');
            return;
        }

        const config = getAuthConfig();

        if (!config) {
            renderSetupScreen();
            return;
        }

        if (isUnlocked()) {
            overlay.classList.remove('auth-lock-active');
            overlay.innerHTML = '';
            return;
        }

        renderUnlockScreen(config);
    }

    // Fuerza a mostrar la pantalla de desbloqueo de nuevo (botón de candado del header).
    window.lockApp = function () {
        localStorage.removeItem(UNLOCKED_KEY);
        const config = getAuthConfig();
        if (!config) {
            renderSetupScreen();
        } else {
            renderUnlockScreen(config);
        }
    };

    /* ==========================================
       PANTALLA: CREAR CONTRASEÑA (primer uso)
       ========================================== */
    function renderSetupScreen(confirming) {
        overlay.classList.add('auth-lock-active');

        overlay.innerHTML = `
            <div class="auth-lock-box">
                <div class="auth-lock-title">🔒 Protege tu IKILIFE</div>
                <div class="auth-lock-subtitle">${confirming ? 'Confírmalo de nuevo' : 'Crea un código para proteger tu app'}</div>
                <div id="auth-lock-input-area"></div>
                <div class="auth-lock-error" id="auth-lock-error"></div>
            </div>
        `;

        renderCodeInput(async (value) => {
            if (!confirming) {
                draftFirst = value;
                renderSetupScreen(true);
            } else {
                if (value !== draftFirst) {
                    showError('Los códigos no coinciden. Intenta de nuevo.');
                    draftFirst = null;
                    renderSetupScreen(false);
                    return;
                }
                await saveAuthConfig(value);
            }
        });
    }

    async function saveAuthConfig(rawValue) {
        const hash = await sha256Hex(rawValue);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ type: 'code', hash }));
        draftFirst = null;
        markUnlocked();
        overlay.classList.remove('auth-lock-active');
        overlay.innerHTML = '';
    }

    /* ==========================================
       PANTALLA: INGRESAR CONTRASEÑA (uso normal)
       ========================================== */
    function renderUnlockScreen(config) {
        overlay.classList.add('auth-lock-active');

        overlay.innerHTML = `
            <div class="auth-lock-box">
                <div class="auth-lock-title">🔒 IKILIFE bloqueado</div>
                <div class="auth-lock-subtitle">Ingresa tu código</div>
                <div id="auth-lock-input-area"></div>
                <div class="auth-lock-error" id="auth-lock-error"></div>
                <button type="button" class="auth-lock-forgot" id="auth-lock-forgot">¿Olvidaste tu código?</button>
            </div>
        `;

        document.getElementById('auth-lock-forgot').addEventListener('click', () => {
            const ok = confirm('Esto borrará tu código actual y tendrás que crear uno nuevo. ¿Continuar?');
            if (ok) {
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem(UNLOCKED_KEY);
                draftFirst = null;
                renderSetupScreen(false);
            }
        });

        const now = Date.now();
        if (lockedUntil > now) {
            disableInputTemporarily(config);
            return;
        }

        renderCodeInput(async (rawValue) => {
            const hash = await sha256Hex(rawValue);
            if (hash === config.hash) {
                attempts = 0;
                markUnlocked();
                overlay.classList.remove('auth-lock-active');
                overlay.innerHTML = '';
            } else {
                attempts += 1;
                if (attempts >= 5) {
                    lockedUntil = Date.now() + 30000;
                    showError('Demasiados intentos. Espera 30 segundos.');
                    disableInputTemporarily(config);
                } else {
                    showError('Código incorrecto. Intenta de nuevo.');
                    renderUnlockScreen(config);
                }
            }
        });
    }

    function disableInputTemporarily(config) {
        const area = document.getElementById('auth-lock-input-area');
        if (area) area.innerHTML = `<div class="auth-lock-cooldown">Vuelve a intentar en unos segundos…</div>`;
        setTimeout(() => renderUnlockScreen(config), Math.max(1000, lockedUntil - Date.now()));
    }

    function showError(msg) {
        const err = document.getElementById('auth-lock-error');
        if (err) err.textContent = msg;
    }

    /* ==========================================
       INPUT: CÓDIGO NUMÉRICO (4-6 dígitos)
       ========================================== */
    function renderCodeInput(onComplete) {
        const area = document.getElementById('auth-lock-input-area');
        if (!area) return;
        let value = '';
        const maxDigits = 6;

        area.innerHTML = `
            <div class="auth-lock-dots" id="auth-lock-dots"></div>
            <div class="auth-lock-keypad" id="auth-lock-keypad"></div>
        `;

        function renderDots() {
            const dotsEl = document.getElementById('auth-lock-dots');
            dotsEl.innerHTML = '';
            for (let i = 0; i < maxDigits; i++) {
                const dot = document.createElement('span');
                dot.className = 'auth-lock-dot' + (i < value.length ? ' auth-lock-dot--filled' : '');
                dotsEl.appendChild(dot);
            }
        }

        const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'borrar', '0', 'ok'];
        const keypad = document.getElementById('auth-lock-keypad');
        keys.forEach(k => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'auth-lock-key' + (k === 'ok' ? ' auth-lock-key--ok' : '') + (k === 'borrar' ? ' auth-lock-key--del' : '');
            btn.textContent = k === 'borrar' ? '⌫' : (k === 'ok' ? '✓' : k);
            btn.addEventListener('click', () => {
                if (k === 'borrar') {
                    value = value.slice(0, -1);
                } else if (k === 'ok') {
                    if (value.length >= 4) onComplete(value);
                    else showError('Usa al menos 4 dígitos.');
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

    document.addEventListener('DOMContentLoaded', initAuthLock);
})();