/**
 * ==========================================
 * COMPONENTE: AUTH LOCK (Bloqueo de la App)
 * ==========================================
 * Componente independiente y autocontenido. Se encarga de:
 *   1. Pedir una contraseña (código numérico o patrón tipo Android)
 *      antes de mostrar cualquier contenido de la app.
 *   2. Si es la primera vez que se usa (no hay contraseña guardada),
 *      guía al usuario para crearla.
 *   3. Exponer window.lockApp() para poder re-bloquear la app desde
 *      un botón del header en cualquier momento.
 *
 * La contraseña NUNCA se guarda en texto plano: se guarda su hash
 * SHA-256 (Web Crypto API) en localStorage bajo la llave
 * "ikilife_auth". El desbloqueo se recuerda solo durante la sesión
 * actual del navegador (sessionStorage) — al reabrir la app se vuelve
 * a pedir.
 *
 * No requiere ninguna tabla de Supabase: toda la lógica es local.
 *
 * USO: este script debe cargarse ANTES que main.js. Al cargar,
 * inserta y controla su propio overlay (#auth-lock-overlay), que ya
 * debe existir vacío en el HTML como primer hijo del <body>.
 */

(function () {
    const STORAGE_KEY = 'ikilife_auth';
    const SESSION_KEY = 'ikilife_unlocked';
    const MIN_PATTERN_DOTS = 4;

    let overlay = null;
    let mode = null;          // 'code' | 'pattern' — modo actualmente elegido en el UI
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

    function isUnlockedThisSession() {
        return sessionStorage.getItem(SESSION_KEY) === '1';
    }

    function markUnlocked() {
        sessionStorage.setItem(SESSION_KEY, '1');
    }

    /**
     * Punto de entrada: decide si hay que mostrar pantalla de
     * "crear contraseña" o de "ingresar contraseña", o si ya se puede
     * dejar pasar directo (ya desbloqueado en esta sesión).
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

        if (isUnlockedThisSession()) {
            overlay.classList.remove('auth-lock-active');
            overlay.innerHTML = '';
            return;
        }

        renderUnlockScreen(config);
    }

    // Fuerza a mostrar la pantalla de desbloqueo de nuevo (botón de candado del header).
    window.lockApp = function () {
        sessionStorage.removeItem(SESSION_KEY);
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
        mode = mode || 'code';

        overlay.innerHTML = `
            <div class="auth-lock-box">
                <div class="auth-lock-title">🔒 Protege tu IKILIFE</div>
                <div class="auth-lock-subtitle">${confirming ? 'Confírmala de nuevo' : 'Crea una contraseña para proteger tu app'}</div>

                <div class="auth-lock-tabs">
                    <button type="button" class="auth-lock-tab ${mode === 'code' ? 'auth-lock-tab--active' : ''}" data-mode="code" ${confirming ? 'disabled' : ''}>Código</button>
                    <button type="button" class="auth-lock-tab ${mode === 'pattern' ? 'auth-lock-tab--active' : ''}" data-mode="pattern" ${confirming ? 'disabled' : ''}>Patrón</button>
                </div>

                <div id="auth-lock-input-area"></div>
                <div class="auth-lock-error" id="auth-lock-error"></div>
            </div>
        `;

        overlay.querySelectorAll('.auth-lock-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                mode = btn.dataset.mode;
                draftFirst = null;
                renderSetupScreen(false);
            });
        });

        if (mode === 'code') {
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
                    await saveAuthConfig('code', value);
                }
            });
        } else {
            renderPatternInput(async (sequence) => {
                const value = sequence.join('-');
                if (!confirming) {
                    draftFirst = value;
                    renderSetupScreen(true);
                } else {
                    if (value !== draftFirst) {
                        showError('El patrón no coincide. Intenta de nuevo.');
                        draftFirst = null;
                        renderSetupScreen(false);
                        return;
                    }
                    await saveAuthConfig('pattern', value);
                }
            });
        }
    }

    async function saveAuthConfig(type, rawValue) {
        const hash = await sha256Hex(rawValue);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ type, hash }));
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
                <div class="auth-lock-subtitle">${config.type === 'code' ? 'Ingresa tu código' : 'Dibuja tu patrón'}</div>
                <div id="auth-lock-input-area"></div>
                <div class="auth-lock-error" id="auth-lock-error"></div>
                <button type="button" class="auth-lock-forgot" id="auth-lock-forgot">¿Olvidaste tu contraseña?</button>
            </div>
        `;

        document.getElementById('auth-lock-forgot').addEventListener('click', () => {
            const ok = confirm('Esto borrará tu contraseña actual y tendrás que crear una nueva. ¿Continuar?');
            if (ok) {
                localStorage.removeItem(STORAGE_KEY);
                sessionStorage.removeItem(SESSION_KEY);
                mode = null;
                draftFirst = null;
                renderSetupScreen(false);
            }
        });

        const now = Date.now();
        if (lockedUntil > now) {
            disableInputTemporarily(config);
            return;
        }

        const onAttempt = async (rawValue) => {
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
                    showError('Contraseña incorrecta. Intenta de nuevo.');
                    renderUnlockScreen(config);
                }
            }
        };

        if (config.type === 'code') {
            renderCodeInput(onAttempt);
        } else {
            renderPatternInput(onAttempt);
        }
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

    /* ==========================================
       INPUT: PATRÓN (grilla 3x3, tocar en orden)
       ========================================== */
    function renderPatternInput(onComplete) {
        const area = document.getElementById('auth-lock-input-area');
        if (!area) return;
        let sequence = [];

        area.innerHTML = `
            <div class="auth-lock-pattern-grid" id="auth-lock-pattern-grid"></div>
            <div class="auth-lock-pattern-actions">
                <button type="button" class="auth-lock-key--del" id="auth-lock-pattern-reset">⌫ Reiniciar</button>
                <button type="button" class="auth-lock-key--ok" id="auth-lock-pattern-ok">✓ Confirmar</button>
            </div>
        `;

        const grid = document.getElementById('auth-lock-pattern-grid');
        for (let i = 0; i < 9; i++) {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'auth-lock-pattern-dot';
            dot.dataset.index = i;
            dot.addEventListener('click', () => {
                if (sequence.includes(i)) return;
                sequence.push(i);
                dot.classList.add('auth-lock-pattern-dot--active');
                const badge = document.createElement('span');
                badge.className = 'auth-lock-pattern-order';
                badge.textContent = sequence.length;
                dot.appendChild(badge);
            });
            grid.appendChild(dot);
        }

        function resetPattern() {
            sequence = [];
            grid.querySelectorAll('.auth-lock-pattern-dot').forEach(d => {
                d.classList.remove('auth-lock-pattern-dot--active');
                d.innerHTML = '';
            });
        }

        document.getElementById('auth-lock-pattern-reset').addEventListener('click', resetPattern);
        document.getElementById('auth-lock-pattern-ok').addEventListener('click', () => {
            if (sequence.length < MIN_PATTERN_DOTS) {
                showError(`Conecta al menos ${MIN_PATTERN_DOTS} puntos.`);
                return;
            }
            onComplete(sequence);
        });
    }

    document.addEventListener('DOMContentLoaded', initAuthLock);
})();
