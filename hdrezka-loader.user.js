// ==UserScript==
// @name         HDRezka Enhanced
// @namespace    http://tampermonkey.net/
// @version      0.1.1
// @description  Улучшение пользовательского опыта на HDRezka: закладки, прогресс и UX-улучшения интерфейса
// @author       EnterBrain42
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_getResourceText
// @resource     hdrezka_core https://raw.githubusercontent.com/EnterBrain/hdrezka_enhanced/main/hdrezka-core.js
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY_HOSTS = 'hdrezka_loader_known_hosts_v1';
    const STORAGE_KEY_LOADER_DISABLED = 'hdrezka_loader_disabled_v1';

    const DEFAULT_HOSTS = [
        'hdrezka-home.tv',
        'rezka.ag',
        'hdrezka.tv',
        'rezka.pub'
    ];

    function normalizeHost(rawHost) {
        return String(rawHost || '')
            .trim()
            .toLowerCase()
            .replace(/^https?:\/\//, '')
            .replace(/\/.*$/, '')
            .replace(/^www\./, '');
    }

    function uniqueHosts(hosts) {
        const seen = new Set();
        const result = [];

        hosts.map(normalizeHost).forEach((host) => {
            if (!host || seen.has(host)) {
                return;
            }
            seen.add(host);
            result.push(host);
        });

        return result;
    }

    function getKnownHosts() {
        const stored = GM_getValue(STORAGE_KEY_HOSTS, []);
        const base = Array.isArray(stored) ? stored : [];
        const combined = uniqueHosts([...DEFAULT_HOSTS, ...base]);
        return combined;
    }

    function saveKnownHosts(hosts) {
        GM_setValue(STORAGE_KEY_HOSTS, uniqueHosts(hosts));
    }

    function getCurrentHost() {
        return normalizeHost(window.location.hostname);
    }

    function isKnownHost(host) {
        return getKnownHosts().includes(normalizeHost(host));
    }

    function hasHdrezkaSignature() {
        const selectors = [
            '.b-post__title',
            '.b-post__info',
            '.b-translator__item',
            '#cdnplayer',
            '#ownplayer',
            '.b-content__main'
        ];

        let score = 0;
        selectors.forEach((selector) => {
            if (document.querySelector(selector)) {
                score += 1;
            }
        });

        const path = window.location.pathname;
        if (/\/(films|series|cartoons|animation)\//.test(path)) {
            score += 1;
        }

        return score >= 2;
    }

    function shouldRunCore() {
        if (GM_getValue(STORAGE_KEY_LOADER_DISABLED, false)) {
            return false;
        }

        const currentHost = getCurrentHost();
        if (!currentHost) {
            return false;
        }

        if (isKnownHost(currentHost)) {
            return true;
        }

        if (!hasHdrezkaSignature()) {
            return false;
        }

        const shouldAdd = window.confirm(
            `Похоже, это зеркало HDRezka (${currentHost}). Добавить домен в базу зеркал?`
        );

        if (shouldAdd) {
            const hosts = getKnownHosts();
            hosts.push(currentHost);
            saveKnownHosts(hosts);
        }

        return true;
    }

    function registerMenu() {
        GM_registerMenuCommand('HDRezka: добавить текущий домен в зеркала', () => {
            const host = getCurrentHost();
            const hosts = getKnownHosts();

            if (!host) {
                window.alert('Не удалось определить текущий домен.');
                return;
            }

            if (hosts.includes(host)) {
                window.alert(`Домен уже в базе: ${host}`);
                return;
            }

            hosts.push(host);
            saveKnownHosts(hosts);
            window.alert(`Домен добавлен: ${host}`);
        });

        GM_registerMenuCommand('HDRezka: удалить текущий домен из зеркал', () => {
            const host = getCurrentHost();
            const normalized = normalizeHost(host);

            if (!normalized) {
                window.alert('Не удалось определить текущий домен.');
                return;
            }

            if (DEFAULT_HOSTS.includes(normalized)) {
                window.alert('Это встроенный домен по умолчанию, его нельзя удалить.');
                return;
            }

            const stored = GM_getValue(STORAGE_KEY_HOSTS, []);
            const list = Array.isArray(stored) ? stored : [];
            const next = list.map(normalizeHost).filter((item) => item && item !== normalized);

            if (next.length === list.length) {
                window.alert(`Домена нет в пользовательской базе: ${normalized}`);
                return;
            }

            GM_setValue(STORAGE_KEY_HOSTS, next);
            window.alert(`Домен удалён: ${normalized}`);
        });

        GM_registerMenuCommand('HDRezka: показать базу зеркал', () => {
            const hosts = getKnownHosts();
            window.alert(`Зеркала (${hosts.length}):\n\n${hosts.join('\n')}`);
        });

        GM_registerMenuCommand('HDRezka: сбросить пользовательские зеркала', () => {
            const ok = window.confirm('Сбросить пользовательские домены и оставить только встроенные?');
            if (!ok) {
                return;
            }

            GM_setValue(STORAGE_KEY_HOSTS, []);
            window.alert('Пользовательские зеркала сброшены.');
        });
    }

    function loadCoreAndRun() {
        if (window.__HDREZKA_CORE_LOADED__) {
            return;
        }

        let coreCode = '';
        try {
            coreCode = GM_getResourceText('hdrezka_core') || '';
        } catch (error) {
            console.error('[HDRezka Loader] Ошибка чтения @resource hdrezka_core:', error);
            return;
        }

        if (!coreCode.trim()) {
            console.error('[HDRezka Loader] Пустой core-ресурс. Проверьте @resource URL.');
            return;
        }

        const probe = coreCode.trimStart().slice(0, 120).toLowerCase();
        if (/^(https?:\/\/|file:\/\/)/i.test(coreCode.trim())) {
            console.error('[HDRezka Loader] @resource вернул URL вместо JS-кода:', coreCode.trim());
            window.alert('HDRezka Loader: ресурс core не загружен как JS (получен URL). Для @resource используйте http(s) URL и переустановите скрипт.');
            return;
        }

        if (probe.startsWith('<!doctype') || probe.startsWith('<html') || probe.includes('not found')) {
            console.error('[HDRezka Loader] @resource не похож на JS-файл. Проверьте URL в @resource.', {
                preview: coreCode.slice(0, 240)
            });
            window.alert('HDRezka Loader: @resource вернул не JS. Проверьте URL core-файла в метаданных.');
            return;
        }

        try {
            new Function(`${coreCode}\n//# sourceURL=hdrezka-core.js`)();
            const bootstrap = (typeof globalThis !== 'undefined' ? globalThis.__HDREZKA_CORE__ : null)
                || window.__HDREZKA_CORE__
                || (typeof unsafeWindow !== 'undefined' ? unsafeWindow.__HDREZKA_CORE__ : null);

            if (typeof bootstrap !== 'function') {
                console.error('[HDRezka Loader] Core загружен, но точка входа не найдена: __HDREZKA_CORE__.');
                window.alert('HDRezka Loader: core загружен, но не удалось найти точку входа. Откройте консоль для деталей.');
                return;
            }

            window.__HDREZKA_CORE_LOADED__ = true;
            bootstrap();
        } catch (error) {
            console.error('[HDRezka Loader] Ошибка инициализации core-скрипта:', error);
            console.error('[HDRezka Loader] Первые 300 символов ресурса:', coreCode.slice(0, 300));
            console.error('[HDRezka Loader] Последние 300 символов ресурса:', coreCode.slice(-300));
            window.alert('HDRezka Loader: ошибка запуска core-скрипта. Откройте консоль браузера (F12).');
        }
    }

    registerMenu();

    if (!shouldRunCore()) {
        return;
    }

    loadCoreAndRun();
})();
