(function (global) {
    'use strict';
    const HDREZKA_CORE_VERSION = '2026.03.27.121201.505-0cf2aec'; // auto-updated by git hook

    function runHdrezkaCore() {
    'use strict';
    console.info(`[HDRezka Core] version ${HDREZKA_CORE_VERSION}`);

    // Конфигурация
    const config = {
        // Селекторы для различных элементов страницы
        selectors: {
            title: 'h1',
            year: '.year',
            description: '.b-post__description_text',
            poster: '.b-post__infotable_left > .b-sidecover > a > img'
        },
        
        // Позиция кнопки "Мой список"
        modalPosition: {
            top: '20px',
            right: '20px'
        },
        
        // Цвета интерфейса
        colors: {
            primary: '#3498db',
            secondary: '#2ecc71',
            background: '#ffffff',
            text: '#2c3e50'
        },
        
        // Ключ для хранения данных
        storageKey: 'hdrezka_watchlist_items',
        compressorStorageKey: 'hdw_audio_compressor_enabled',
        compressorSettingsStorageKey: 'hdw_audio_compressor_settings_v1',
        overlayStorageKey: 'hdw_playback_overlay_enabled',
        overlayDisplayStorageKey: 'hdw_playback_overlay_display_v1',
        aspectRatioStorageKey: 'hdw_player_aspect_ratio_mode',
        
        // Включенные функции
        features: {
            progressTracking: true,
            dubSelection: true,
            nestedDubUrlGrouping: true,
            seasonEpisodeSelection: true,
            cloudSync: false,
            notifications: true
        },
        
        // Режим отладки
        debug: false,
        
        // Настройки тем
        theme: {
            default: 'light',
            enableDarkMode: true,
            enableAutoMode: true
        },
        
        // Настройки анимаций
        animations: {
            enable: true,
            duration: 300,
            easing: 'ease-in-out'
        },
        
        // Адаптивные настройки
        responsive: {
            mobileBreakpoint: 768,
            tabletBreakpoint: 1024,
            enableTouchOptimizations: true
        }
    };

    // Функция для отладочного логирования
    function debugLog(message, ...args) {
        if (config.debug) {
            console.log(message, ...args);
        }
    }
    
    // Функция для форматирования времени
    function formatTime(seconds) {
        if (!seconds || seconds <= 0) {
            return '';
        }
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }

    function getCleanUrlString(url) {
        return String(url || '').split('#')[0].split('?')[0];
    }

    function getPagePath(url) {
        const cleanUrl = getCleanUrlString(url);
        if (!cleanUrl) {
            return '';
        }

        try {
            return new URL(cleanUrl, window.location.origin).pathname;
        } catch (error) {
            return cleanUrl;
        }
    }

    function getRezkaPathMeta(url) {
        const rawUrl = String(url || '').trim();
        if (!rawUrl) {
            return null;
        }

        try {
            const parsedUrl = new URL(rawUrl, window.location.origin);
            const pathname = parsedUrl.pathname || '/';
            const match = pathname.match(/^\/(films|series|cartoons|animation)\/([^/]+)\/([^/]+?)(?:\/(.+))?\/?$/i);
            if (!match) {
                return {
                    pathname,
                    canonicalPath: pathname,
                    hasNestedDubPath: false,
                    nestedSlug: '',
                    nestedPath: '',
                    nestedSegments: [],
                    nestedDepth: 0,
                    isContentPath: false
                };
            }

            const [, section, genre, rawSlug, nestedPath = ''] = match;
            const normalizedSlug = rawSlug.replace(/\.html$/i, '');
            const nestedSegments = nestedPath
                ? nestedPath.split('/').filter(Boolean)
                : [];
            return {
                pathname,
                section,
                genre,
                slug: normalizedSlug,
                canonicalPath: `/${section}/${genre}/${normalizedSlug}`,
                hasNestedDubPath: nestedSegments.length > 0,
                nestedSlug: nestedSegments[0] || '',
                nestedPath,
                nestedSegments,
                nestedDepth: nestedSegments.length,
                isContentPath: true
            };
        } catch (error) {
            const fallbackPath = getCleanUrlString(rawUrl);
            return {
                pathname: fallbackPath,
                canonicalPath: fallbackPath,
                hasNestedDubPath: false,
                nestedSlug: '',
                nestedPath: '',
                nestedSegments: [],
                nestedDepth: 0,
                isContentPath: false
            };
        }
    }

    function isNestedDubPathModeEnabled() {
        return !!config.features.nestedDubUrlGrouping;
    }

    function areRezkaPathsEquivalent(leftUrl, rightUrl, { includeNestedPath = false } = {}) {
        const leftMeta = getRezkaPathMeta(leftUrl);
        const rightMeta = getRezkaPathMeta(rightUrl);

        if (leftMeta?.isContentPath && rightMeta?.isContentPath) {
            if (leftMeta.canonicalPath !== rightMeta.canonicalPath) {
                return false;
            }

            if (!includeNestedPath) {
                return true;
            }

            if (leftMeta.nestedDepth !== rightMeta.nestedDepth) {
                return false;
            }

            return leftMeta.nestedPath === rightMeta.nestedPath;
        }

        return getPagePath(leftUrl) === getPagePath(rightUrl);
    }

    function hasNestedDubSelectionUrls() {
        if (!isNestedDubPathModeEnabled()) {
            return false;
        }

        const currentMeta = getRezkaPathMeta(window.location.href);
        if ((currentMeta?.nestedDepth || 0) > 0) {
            return true;
        }

        const translatorLinks = Array.from(document.querySelectorAll('.b-translator__item[href], .b-translator__item a[href]'));
        return translatorLinks.some((element) => {
            const href = element.getAttribute('href');
            if (!href) {
                return false;
            }

            const meta = getRezkaPathMeta(href);
            if ((meta?.nestedDepth || 0) === 0) {
                return false;
            }

            return !currentMeta?.canonicalPath || areRezkaPathsEquivalent(href, window.location.href);
        });
    }

    function getCurrentDubSelectionUrl(activeDubElement = null) {
        if (!hasNestedDubSelectionUrls()) {
            return '';
        }

        const candidateElement = activeDubElement || document.querySelector('.b-translator__item.active');
        const hrefCandidate = candidateElement?.getAttribute('href')
            || candidateElement?.querySelector?.('a[href]')?.getAttribute('href')
            || '';

        const rawUrl = hrefCandidate || window.location.href;
        try {
            return new URL(getCleanUrlString(rawUrl), window.location.origin).href;
        } catch (error) {
            return getCleanUrlString(rawUrl);
        }
    }

    function getTranslatorItemHref(item) {
        if (!item) {
            return '';
        }

        return item.getAttribute('href')
            || item.href
            || item.querySelector?.('a[href]')?.href
            || '';
    }

    function getTranslatorItemPath(item) {
        return getPagePath(getTranslatorItemHref(item));
    }

    function getTranslatorOptionKey(item) {
        if (!item) {
            return '';
        }

        const translatorId = item.getAttribute('data-translator_id') || '';
        const directorFlag = item.getAttribute('data-director') || '0';
        const itemPath = getTranslatorItemPath(item);
        return itemPath || `${translatorId}|${directorFlag}|${(item.textContent || '').replace(/\s+/g, ' ').trim()}`;
    }

    function extractTranslatorInfo(item) {
        if (!item) {
            return {
                id: null,
                name: 'Не выбрана',
                title: 'Не выбрана',
                url: null,
                path: '',
                optionKey: '',
                translatorId: null,
                contentId: null,
                camrip: null,
                ads: null,
                director: null,
                cdnQuality: '',
                isDirector: false,
                isActive: false,
                dataset: {}
            };
        }

        const dataset = { ...(item.dataset || {}) };
        const name = (item.textContent || '').replace(/\s+/g, ' ').trim() || 'Не выбрана';
        const title = item.getAttribute('title') || name;
        const url = getCurrentDubSelectionUrl(item) || getTranslatorItemHref(item) || null;
        const path = getTranslatorItemPath(item);
        const translatorId = item.getAttribute('data-translator_id');
        const director = item.getAttribute('data-director');

        return {
            id: translatorId,
            name,
            title,
            url,
            path,
            optionKey: getTranslatorOptionKey(item),
            translatorId,
            contentId: item.getAttribute('data-id'),
            camrip: item.getAttribute('data-camrip'),
            ads: item.getAttribute('data-ads'),
            director,
            cdnQuality: item.getAttribute('data-cdn_quality') || '',
            isDirector: director === '1',
            isActive: item.classList.contains('active'),
            dataset
        };
    }

    function findActiveTranslatorItem(root = document) {
        const items = Array.from(root.querySelectorAll('.b-translator__item'));
        if (!items.length) {
            return null;
        }

        const currentPath = getPagePath(window.location.href);
        if (currentPath) {
            const exactPathMatch = items.find((item) => areRezkaPathsEquivalent(getTranslatorItemHref(item), currentPath, { includeNestedPath: true }));
            if (exactPathMatch) {
                return exactPathMatch;
            }
        }

        const activeItems = items.filter((item) => item.classList.contains('active'));
        if (activeItems.length === 1) {
            return activeItems[0];
        }

        if (activeItems.length > 1 && currentPath) {
            const activePathMatch = activeItems.find((item) => areRezkaPathsEquivalent(getTranslatorItemHref(item), currentPath, { includeNestedPath: true }));
            if (activePathMatch) {
                return activePathMatch;
            }
        }

        return activeItems[0] || items[0] || null;
    }

    function getSeasonItemId(item) {
        return item?.getAttribute?.('data-tab_id') || '';
    }

    function getSeasonOptionKey(item) {
        if (!item) {
            return '';
        }

        return getSeasonItemId(item) || (item.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function findActiveSeasonItem(root = document) {
        const items = Array.from(root.querySelectorAll('#simple-seasons-tabs .b-simple_season__item'));
        if (!items.length) {
            return null;
        }

        return items.find((item) => item.classList.contains('active')) || items[0] || null;
    }

    function getEpisodeItemId(item) {
        return item?.getAttribute?.('data-episode_id') || '';
    }

    function getEpisodeOptionKey(item) {
        if (!item) {
            return '';
        }

        const seasonId = item.getAttribute('data-season_id') || '';
        const episodeId = getEpisodeItemId(item);
        return (seasonId || episodeId)
            ? `${seasonId}:${episodeId}`
            : (item.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function isElementVisible(element) {
        if (!element) {
            return false;
        }

        if (element.hidden) {
            return false;
        }

        if (element.style?.display === 'none') {
            return false;
        }

        return window.getComputedStyle(element).display !== 'none';
    }

    function getVisibleEpisodeList(root = document) {
        const lists = Array.from(root.querySelectorAll('#simple-episodes-tabs .b-simple_episodes__list'));
        return lists.find((list) => isElementVisible(list)) || lists[0] || null;
    }

    function findActiveEpisodeItem(root = document) {
        const visibleList = getVisibleEpisodeList(root);
        const visibleItems = visibleList
            ? Array.from(visibleList.querySelectorAll('.b-simple_episode__item'))
            : [];
        const visibleActiveItem = visibleItems.find((item) => item.classList.contains('active'));
        if (visibleActiveItem) {
            return visibleActiveItem;
        }

        const allItems = Array.from(root.querySelectorAll('#simple-episodes-tabs .b-simple_episode__item'));
        return allItems.find((item) => item.classList.contains('active')) || visibleItems[0] || allItems[0] || null;
    }
    
    // Функция для формирования URL с якорем позиции воспроизведения
    function buildItemUrlWithAnchor(item) {
        // Формируем URL с якорем позиции воспроизведения
        let itemUrl = getPagePath(item?.dub?.url || '') || getPagePath(item?.url || '');
        
        // Проверяем и приводим ID к целым числам, если они не являются таковыми
        const dubId = item.dub && item.dub.id ? parseInt(item.dub.id, 10) : null;
        const seasonId = item.season && item.season.id ? parseInt(item.season.id, 10) : null;
        const episodeId = item.episode && item.episode.id ? parseInt(item.episode.id, 10) : null;
        
        // Проверяем, что все ID являются действительными целыми числами
        if (dubId && seasonId && episodeId &&
            Number.isInteger(dubId) && Number.isInteger(seasonId) && Number.isInteger(episodeId)) {
            itemUrl += `#t:${dubId}-s:${seasonId}-e:${episodeId}`;
        }
        
        return itemUrl;
    }
    
    // Функция для нормализации URL - извлекает путь от корня домена, игнорируя протокол и поддомен
    function normalizeUrl(url) {
        try {
            // Удаляем хэш и параметры запроса
            const cleanUrl = getCleanUrlString(url);
            
            // Создаем объект URL для парсинга
            const urlObj = new URL(cleanUrl, window.location.origin);
            
            const meta = getRezkaPathMeta(urlObj.pathname);
            if (isNestedDubPathModeEnabled() && meta?.isContentPath && meta.canonicalPath) {
                return meta.canonicalPath;
            }

            // Возвращаем только путь от корня домена
            return urlObj.pathname;
        } catch (error) {
            const meta = getRezkaPathMeta(url);
            if (isNestedDubPathModeEnabled() && meta?.isContentPath && meta.canonicalPath) {
                return meta.canonicalPath;
            }

            // Если не удалось распарсить URL, возвращаем оригинальный путь без параметров
            return getCleanUrlString(url);
        }
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    const CORE_CSS_RESOURCE_NAME = 'hdrezka_core_css';
    const CORE_CSS_ASSET_PATH = 'assets/hdrezka-core.css';
    const CORE_FALLBACK_STYLE_ID = 'hdw-core-style-fallback';
    let coreStylesInjected = false;

    function getCoreBootstrapBaseUrl() {
        const globalBaseUrl = typeof globalThis !== 'undefined' && typeof globalThis.__HDREZKA_CORE_BASE_URL__ === 'string'
            ? globalThis.__HDREZKA_CORE_BASE_URL__
            : '';
        const raw = globalBaseUrl || (typeof HDREZKA_CORE_BASE_URL === 'string' ? HDREZKA_CORE_BASE_URL : '');
        return raw ? raw.replace(/\/?$/, '/') : '';
    }

    function getBundledCoreCssText() {
        if (typeof GM_getResourceText !== 'function') {
            return '';
        }

        try {
            return String(GM_getResourceText(CORE_CSS_RESOURCE_NAME) || '');
        } catch (error) {
            console.warn('[HDRezka Core] Не удалось прочитать CSS-ресурс:', error);
            return '';
        }
    }

    function fetchCoreCssText() {
        const baseUrl = getCoreBootstrapBaseUrl();
        const url = baseUrl ? `${baseUrl}${CORE_CSS_ASSET_PATH}?ts=${Date.now()}` : '';
        if (!url) {
            return Promise.resolve('');
        }

        return new Promise((resolve) => {
            const request = typeof GM_xmlhttpRequest === 'function' ? GM_xmlhttpRequest : null;
            if (request) {
                request({
                    method: 'GET',
                    url,
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        Pragma: 'no-cache'
                    },
                    onload: (response) => resolve(String(response?.responseText || '')),
                    onerror: () => resolve(''),
                    ontimeout: () => resolve('')
                });
                return;
            }

            fetch(url)
                .then((response) => response.ok ? response.text() : '')
                .then((text) => resolve(String(text || '')))
                .catch(() => resolve(''));
        });
    }

    function applyCoreStyles(cssText) {
        if (!cssText || coreStylesInjected) {
            return;
        }

        coreStylesInjected = true;
        if (typeof GM_addStyle === 'function') {
            GM_addStyle(cssText);
            return;
        }

        let styleEl = document.getElementById(CORE_FALLBACK_STYLE_ID);
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = CORE_FALLBACK_STYLE_ID;
            styleEl.type = 'text/css';
            (document.head || document.documentElement).appendChild(styleEl);
        }
        styleEl.textContent = cssText;
    }

    function ensureCoreStyles() {
        return fetchCoreCssText()
            .then((cssText) => {
                if (cssText) {
                    applyCoreStyles(cssText);
                    return true;
                }

                const bundledCss = getBundledCoreCssText();
                if (!bundledCss) {
                    console.warn('[HDRezka Core] CSS-ассет не загружен, встроенный fallback отсутствует.');
                    return false;
                }

                console.warn('[HDRezka Core] Онлайн-загрузка CSS неуспешна, fallback на @resource.');
                applyCoreStyles(bundledCss);
                return true;
            })
            .catch(() => {
                const bundledCss = getBundledCoreCssText();
                if (!bundledCss) {
                    console.warn('[HDRezka Core] Ошибка загрузки CSS-ассета, встроенный fallback отсутствует.');
                    return false;
                }

                console.warn('[HDRezka Core] Ошибка загрузки CSS-ассета, fallback на @resource.');
                applyCoreStyles(bundledCss);
                return true;
            });
    }

    const coreStylesReady = ensureCoreStyles();

    // Хранилище данных
    class StorageManager {
        static getKey() {
            return config.storageKey;
        }

        static normalizeItems(rawValue) {
            if (Array.isArray(rawValue)) {
                return rawValue.map((item) => this.normalizeBookmarkItem(item)).filter(Boolean);
            }

            if (typeof rawValue === 'string') {
                try {
                    return this.normalizeItems(JSON.parse(rawValue));
                } catch (error) {
                    return [];
                }
            }

            if (rawValue && typeof rawValue === 'object') {
                if (Array.isArray(rawValue.items)) {
                    return rawValue.items;
                }

                // Поддержка legacy-формата объекта-словаря по id
                const values = Object.values(rawValue);
                if (values.length && values.every((item) => item && typeof item === 'object')) {
                    const hasBookmarkShape = values.some((item) => item.url || item.title);
                    if (hasBookmarkShape) {
                        return values.map((item) => this.normalizeBookmarkItem(item)).filter(Boolean);
                    }
                }
            }

            return [];
        }

        static normalizeBookmarkItem(item) {
            if (!item || typeof item !== 'object') {
                return null;
            }

            const normalizedItem = { ...item };
            normalizedItem.listState = getEffectiveListState(item);
            return normalizedItem;
        }

        static tryRecoverFromOtherKeys() {
            let keys = [];
            try {
                keys = GM_listValues();
            } catch (error) {
                return [];
            }

            const currentKey = this.getKey();
            const candidateKeys = keys.filter((key) => {
                if (key === currentKey) {
                    return false;
                }

                const normalized = String(key).toLowerCase();
                return normalized.includes('watchlist') || normalized.includes('rezka');
            });

            let bestItems = [];
            candidateKeys.forEach((key) => {
                const raw = GM_getValue(key, null);
                const items = this.normalizeItems(raw);
                if (items.length > bestItems.length) {
                    bestItems = items;
                }
            });

            return bestItems;
        }
        
        static getAllItems() {
            const raw = GM_getValue(this.getKey(), []);
            const items = this.normalizeItems(raw);
            if (items.length > 0) {
                if (JSON.stringify(raw) !== JSON.stringify(items)) {
                    this.saveItems(items);
                }
                return items;
            }

            const recoveredItems = this.tryRecoverFromOtherKeys();
            if (recoveredItems.length > 0) {
                this.saveItems(recoveredItems);
                return recoveredItems;
            }

            return [];
        }
        
        static saveItems(items) {
            GM_setValue(this.getKey(), Array.isArray(items) ? items : []);
        }
        
        static clearAll() {
            GM_deleteValue(this.getKey());
        }
    }

    // Парсер информации о фильмах
    class MovieParser {
        static parseMovieInfo() {
            const titleElement = document.querySelector(config.selectors.title);
            const title = titleElement ? titleElement.textContent.trim() : 'Неизвестный заголовок';
            
            // Парсим год из таблицы с информацией
            const year = this.parseYear();
            
            const descriptionElement = document.querySelector(config.selectors.description);
            const description = descriptionElement ? descriptionElement.textContent.trim() : '';
            
            const posterElement = document.querySelector(config.selectors.poster);
            const poster = posterElement ? posterElement.src : '';
            
            // Обрезаем параметры из URL
            const url = window.location.href.split('#')[0];
            // Создаем нормализованный URL
            const normalizedUrl = normalizeUrl(url);
            
            // Получаем информацию об озвучке
            const dubInfo = this.parseDubInfo();
            
            // Получаем информацию о сезоне и серии
            const seasonInfo = this.parseSeasonInfo();
            const episodeInfo = this.parseEpisodeInfo();
            
            return {
                id: this.generateId(),
                title,
                year,
                description,
                poster,
                url,
                normalizedUrl, // Добавляем нормализованный URL
                addedAt: new Date().toISOString(),
                type: this.detectContentType(),
                progress: config.features.progressTracking ? {
                    currentEpisode: 0,
                    currentTime: 0,
                    isCompleted: false,
                    lastViewed: null
                } : undefined,
                dub: config.features.dubSelection ? dubInfo : undefined,
                season: config.features.seasonEpisodeSelection ? seasonInfo : undefined,
                episode: config.features.seasonEpisodeSelection ? episodeInfo : undefined
            };
        }
        
        static detectContentType() {
            const path = window.location.pathname;
            if (path.includes('/films/')) return 'films';
            if (path.includes('/series/')) return 'series';
            if (path.includes('/cartoons/')) return 'cartoons';
            if (path.includes('/animation/')) return 'animation';
            return 'unknown';
        }
        
        static generateId() {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                return crypto.randomUUID();
            }
            return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        }
        
         static parseYear() {
             // Ищем таблицу с информацией о фильме
             const infoTable = document.querySelector('.b-post__info');
             if (!infoTable) return '';
             
             // Ищем строку с датой выхода
             const dateRow = Array.from(infoTable.querySelectorAll('tr')).find(row => {
                 const header = row.querySelector('h2');
                 return header && header.textContent.includes('Дата выхода');
             });
             
             if (!dateRow) return '';
             
             // Ищем ссылку с годом
             const yearLink = dateRow.querySelector('a[href*="/year/"]');
             if (!yearLink) return '';
             
             // Извлекаем год из href
             const yearMatch = yearLink.href.match(/\/year\/(\d{4})\//);
             return yearMatch ? yearMatch[1] : '';
         }
        static parseDubInfo() {
            debugLog('[MovieParser] Парсинг информации об озвучке');
            // Получаем активную озвучку
            const activeDubElement = findActiveTranslatorItem(document);
            debugLog('[MovieParser] Активный элемент озвучки:', activeDubElement);
            
            if (activeDubElement) {
                const dubInfo = extractTranslatorInfo(activeDubElement);
                debugLog('[MovieParser] Информация об озвучке получена:', dubInfo);
                return dubInfo;
            }
            
            // Если не удалось получить информацию об озвучке, возвращаем значения по умолчанию
            debugLog('[MovieParser] Информация об озвучке не найдена, возвращаем значения по умолчанию');
            return extractTranslatorInfo(null);
        }
        
        static parseSeasonInfo() {
            debugLog('[MovieParser] Парсинг информации о сезоне');
            // Получаем активный сезон
            const activeSeasonElement = document.querySelector('.b-simple_season__item.active');
            debugLog('[MovieParser] Активный элемент сезона:', activeSeasonElement);
            
            if (activeSeasonElement) {
                const seasonInfo = {
                    id: activeSeasonElement.getAttribute('data-tab_id'),
                    name: activeSeasonElement.textContent.trim()
                };
                debugLog('[MovieParser] Информация о сезоне получена:', seasonInfo);
                return seasonInfo;
            }
            
            // Если не удалось получить информацию о сезоне, возвращаем значения по умолчанию
            debugLog('[MovieParser] Информация о сезоне не найдена, возвращаем значения по умолчанию');
            return {
                id: null,
                name: 'Не выбран'
            };
        }
        
        static parseEpisodeInfo() {
            debugLog('[MovieParser] Парсинг информации о серии');
            // Получаем активную серию
            const activeEpisodeElement = document.querySelector('.b-simple_episode__item.active');
            debugLog('[MovieParser] Активный элемент серии:', activeEpisodeElement);
            
            if (activeEpisodeElement) {
                const episodeInfo = {
                    id: activeEpisodeElement.getAttribute('data-episode_id'),
                    seasonId: activeEpisodeElement.getAttribute('data-season_id'),
                    name: activeEpisodeElement.textContent.trim(),
                    cdnUrl: activeEpisodeElement.getAttribute('data-cdn_url'),
                    cdnQuality: activeEpisodeElement.getAttribute('data-cdn_quality')
                };
                debugLog('[MovieParser] Информация о серии получена:', episodeInfo);
                return episodeInfo;
            }
            
            // Если не удалось получить информацию о серии, возвращаем значения по умолчанию
            debugLog('[MovieParser] Информация о серии не найдена, возвращаем значения по умолчанию');
            return {
                id: null,
                seasonId: null,
                name: 'Не выбрана',
                cdnUrl: null,
                cdnQuality: null
            };
        }
    }

    // Управление закладками
    class BookmarkManager {
        static getAll() {
            return StorageManager.getAllItems();
        }

        static normalizeBookmarkInput(item, fallbackState = LIST_STATES.favorite) {
            if (!item || typeof item !== 'object') {
                return null;
            }

            return {
                ...item,
                listState: normalizeListState(item.listState, fallbackState)
            };
        }
        
        static add(item) {
            const items = this.getAll();
            const normalizedItem = this.normalizeBookmarkInput(item);
            if (!normalizedItem) {
                return;
            }
            // Используем нормализованный URL для проверки существования закладки
            const normalizedUrl = normalizeUrl(normalizedItem.url);
            const existingIndex = items.findIndex(existingItem => normalizeUrl(existingItem.url) === normalizedUrl);
            
            if (existingIndex !== -1) {
                // Если закладка уже существует, обновляем её
                items[existingIndex] = {
                    ...items[existingIndex],
                    ...normalizedItem,
                    listState: normalizeListState(normalizedItem.listState, getEffectiveListState(items[existingIndex]))
                };
            } else {
                // Если закладка новая, добавляем её
                items.push(normalizedItem);
            }
            
            StorageManager.saveItems(items);
        }
        
        static remove(id) {
            const items = this.getAll();
            const filteredItems = items.filter(item => item.id !== id);
            StorageManager.saveItems(filteredItems);
        }
        
        static removeByUrl(url) {
            const items = this.getAll();
            const normalizedUrl = normalizeUrl(url);
            const filteredItems = items.filter(item => normalizeUrl(item.url) !== normalizedUrl);
            StorageManager.saveItems(filteredItems);
        }
        
        static exists(url) {
            const items = this.getAll();
            const normalizedUrl = normalizeUrl(url);
            return items.some(item => normalizeUrl(item.url) === normalizedUrl);
        }
        
        static findByUrl(url) {
            const items = this.getAll();
            const normalizedUrl = normalizeUrl(url);
            return items.find(item => normalizeUrl(item.url) === normalizedUrl);
        }

        static getListState(url) {
            const item = this.findByUrl(url);
            return item ? getEffectiveListState(item) : null;
        }

        static setListState(url, listState, itemData = null) {
            const normalizedUrl = normalizeUrl(url);
            const nextState = normalizeListState(listState, null);
            const items = this.getAll();
            const existingIndex = items.findIndex(item => normalizeUrl(item.url) === normalizedUrl);

            if (existingIndex === -1) {
                if (!nextState || !itemData) {
                    return null;
                }

                const nextItem = this.normalizeBookmarkInput({
                    ...itemData,
                    listState: nextState
                }, nextState);
                if (!nextItem) {
                    return null;
                }

                items.push(nextItem);
                StorageManager.saveItems(items);
                return nextItem;
            }

            if (!nextState) {
                const [removedItem] = items.splice(existingIndex, 1);
                StorageManager.saveItems(items);
                return removedItem || null;
            }

            const currentItem = items[existingIndex];
            const nextItem = {
                ...currentItem,
                ...(itemData && typeof itemData === 'object' ? itemData : {}),
                id: currentItem.id,
                listState: nextState
            };
            items[existingIndex] = this.normalizeBookmarkInput(nextItem, nextState);
            StorageManager.saveItems(items);
            return items[existingIndex];
        }
        
        static updateProgress(id, progress) {
            debugLog('[BookmarkManager] Обновление прогресса для ID:', id);
            debugLog('[BookmarkManager] Данные прогресса:', progress);
            
            if (!config.features.progressTracking) {
                debugLog('[BookmarkManager] Отслеживание прогресса отключено');
                return;
            }
            
            const items = this.getAll();
            debugLog('[BookmarkManager] Все элементы:', items);
            const index = items.findIndex(item => item.id === id);
            debugLog('[BookmarkManager] Индекс элемента:', index);
            
            if (index !== -1) {
                // Обновляем прогресс (только данные прогресса, не дублирующиеся данные)
                const progressData = {};
                if (progress.currentTime !== undefined) progressData.currentTime = progress.currentTime;
                if (progress.isCompleted !== undefined) progressData.isCompleted = progress.isCompleted;
                if (progress.currentEpisode !== undefined) progressData.currentEpisode = progress.currentEpisode;
                
                if (Object.keys(progressData).length > 0) {
                    items[index].progress = { ...items[index].progress, ...progressData, lastViewed: new Date().toISOString() };
                    debugLog('[BookmarkManager] Обновлены данные прогресса:', progressData);
                }
                
                // Обновляем информацию об озвучке, сезоне и серии (только на верхнем уровне)
                let updatedInfo = false;
                if (progress.dub) {
                    items[index].dub = progress.dub;
                    updatedInfo = true;
                }
                if (progress.season) {
                    items[index].season = progress.season;
                    updatedInfo = true;
                }
                if (progress.episode) {
                    items[index].episode = progress.episode;
                    updatedInfo = true;
                }
                
                if (updatedInfo) {
                    debugLog('[BookmarkManager] Обновлена информация о дубляже/сезоне/серии');
                }
                
                debugLog('[BookmarkManager] Обновленные данные элемента:', items[index]);
                StorageManager.saveItems(items);
                debugLog('[BookmarkManager] Данные сохранены');
                
                // Обновляем UI, если модальное окно открыто
                UI.refreshItems();
            } else {
                debugLog('[BookmarkManager] Элемент не найден');
            }
        }
    }

    const HOTKEYS = Object.freeze({
        theater: { code: 'KeyT', label: 'Alt+T' },
        compressor: { code: 'KeyC', label: 'Alt+C' },
        blur: { code: 'KeyB', label: 'Alt+B' },
        mirror: { code: 'KeyM', label: 'Alt+M' }
    });

    const LIST_STATES = Object.freeze({
        favorite: 'favorite',
        watching: 'watching',
        later: 'later',
        completed: 'completed',
        abandoned: 'abandoned'
    });

    const VALID_LIST_STATES = new Set(Object.values(LIST_STATES));

    const LIST_STATE_OPTIONS = Object.freeze([
        Object.freeze({ value: LIST_STATES.favorite, label: 'В избранное', textIcon: '★', panelIconKey: 'watchlistFavorite', spriteIconId: 'hdw-icon-watchlist_favorite' }),
        Object.freeze({ value: LIST_STATES.watching, label: 'Смотрю', textIcon: '▶', panelIconKey: 'watchlistWatching', spriteIconId: 'hdw-icon-watchlist_watching' }),
        Object.freeze({ value: LIST_STATES.later, label: 'Смотреть позже', textIcon: '⏳', panelIconKey: 'watchlistLater', spriteIconId: 'hdw-icon-watchlist_later' }),
        Object.freeze({ value: LIST_STATES.completed, label: 'Просмотрено', textIcon: '✓', panelIconKey: 'watchlistCompleted', spriteIconId: 'hdw-icon-watchlist_completed' }),
        Object.freeze({ value: LIST_STATES.abandoned, label: 'Брошено', textIcon: '✕', panelIconKey: 'watchlistAbandoned', spriteIconId: 'hdw-icon-watchlist_abandoned' })
    ]);

    const ASPECT_RATIO_OPTIONS = Object.freeze([
        Object.freeze({ value: '16:9', label: '16:9', cssValue: '16 / 9' }),
        Object.freeze({ value: '12:5', label: '12:5', cssValue: '12 / 5' }),
        Object.freeze({ value: '4:3', label: '4:3', cssValue: '4 / 3' })
    ]);

    const COMPRESSOR_PRESETS = Object.freeze({
        soft: Object.freeze({
            label: 'Soft',
            settings: Object.freeze({ threshold: -36, knee: 24, ratio: 2.5, attack: 0.02, release: 0.18, outputGain: 1.05 })
        }),
        night: Object.freeze({
            label: 'Night',
            settings: Object.freeze({ threshold: -48, knee: 34, ratio: 6, attack: 0.01, release: 0.28, outputGain: 1.12 })
        }),
        voice_boost: Object.freeze({
            label: 'Voice Boost',
            settings: Object.freeze({ threshold: -42, knee: 20, ratio: 4.5, attack: 0.01, release: 0.16, outputGain: 1.18 })
        }),
        strong: Object.freeze({
            label: 'Strong',
            settings: Object.freeze({ threshold: -50, knee: 40, ratio: 12, attack: 0, release: 0.25, outputGain: 1.22 })
        }),
        custom: Object.freeze({
            label: 'Custom',
            settings: null
        })
    });

    const DEFAULT_COMPRESSOR_PRESET = 'strong';

    function normalizeListState(value, fallback = null) {
        return VALID_LIST_STATES.has(value) ? value : fallback;
    }

    function getEffectiveListState(item) {
        if (!item || typeof item !== 'object') {
            return null;
        }

        return normalizeListState(item.listState, LIST_STATES.favorite);
    }

    function getListStateLabel(listState) {
        switch (normalizeListState(listState, null)) {
            case LIST_STATES.favorite:
                return 'В избранном';
            case LIST_STATES.watching:
                return 'Смотрю';
            case LIST_STATES.later:
                return 'Смотреть позже';
            case LIST_STATES.completed:
                return 'Просмотрено';
            case LIST_STATES.abandoned:
                return 'Брошено';
            default:
                return 'Без статуса';
        }
    }

    function getListStateOption(listState) {
        const normalized = normalizeListState(listState, null);
        return LIST_STATE_OPTIONS.find((option) => option.value === normalized) || null;
    }

    function getListStatePanelIconKey(listState) {
        return getListStateOption(listState)?.panelIconKey || 'watchlist';
    }

    function buildSpriteIconMarkup(symbolId, className = '') {
        if (!symbolId) {
            return '';
        }

        const classAttribute = className ? ` class="${escapeHtml(className)}"` : '';
        return `<span${classAttribute} aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><use href="#${escapeHtml(symbolId)}" xlink:href="#${escapeHtml(symbolId)}"></use></svg></span>`;
    }

    const COMPRESSOR_PARAMETER_SCHEMA = Object.freeze({
        threshold: Object.freeze({
            label: 'Threshold',
            description: 'Порог начала компрессии',
            min: -100,
            max: 0,
            step: 1,
            defaultValue: -50,
            formatValue: (value) => `${Math.round(value)} dB`
        }),
        knee: Object.freeze({
            label: 'Knee',
            description: 'Плавность входа в компрессию',
            min: 0,
            max: 40,
            step: 1,
            defaultValue: 40,
            formatValue: (value) => `${Math.round(value)} dB`
        }),
        ratio: Object.freeze({
            label: 'Ratio',
            description: 'Сила сжатия громкости',
            min: 1,
            max: 20,
            step: 0.1,
            defaultValue: 12,
            formatValue: (value) => `${Number(value).toFixed(1).replace(/\.0$/, '')}:1`
        }),
        attack: Object.freeze({
            label: 'Attack',
            description: 'Скорость начала сжатия',
            min: 0,
            max: 1,
            step: 0.01,
            defaultValue: 0,
            formatValue: (value) => `${Number(value).toFixed(2).replace(/0+$/, '').replace(/\.$/, '') || '0'} с`
        }),
        release: Object.freeze({
            label: 'Release',
            description: 'Скорость восстановления уровня',
            min: 0,
            max: 1,
            step: 0.01,
            defaultValue: 0.25,
            formatValue: (value) => `${Number(value).toFixed(2).replace(/0+$/, '').replace(/\.$/, '') || '0'} с`
        }),
        outputGain: Object.freeze({
            label: 'Output Gain',
            description: 'Компенсация громкости после компрессии',
            min: 0.5,
            max: 2,
            step: 0.05,
            defaultValue: 1.22,
            formatValue: (value) => `${Number(value).toFixed(2).replace(/0+$/, '').replace(/\.$/, '') || '1'}x`
        })
    });

    function clampNumber(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function roundToStep(value, step) {
        if (!step) {
            return value;
        }

        return Math.round(value / step) * step;
    }

    function getDefaultCompressorSettings() {
        const presetSettings = COMPRESSOR_PRESETS[DEFAULT_COMPRESSOR_PRESET]?.settings;
        if (presetSettings) {
            return { ...presetSettings };
        }

        return Object.fromEntries(
            Object.entries(COMPRESSOR_PARAMETER_SCHEMA).map(([key, schema]) => [key, schema.defaultValue])
        );
    }

    function normalizeCompressorSettings(rawValue) {
        const defaults = getDefaultCompressorSettings();
        const source = rawValue && typeof rawValue === 'object' ? rawValue : {};

        return Object.fromEntries(
            Object.entries(COMPRESSOR_PARAMETER_SCHEMA).map(([key, schema]) => {
                const rawNumber = Number(source[key]);
                const fallbackValue = defaults[key];
                const normalizedValue = Number.isFinite(rawNumber) ? rawNumber : fallbackValue;
                const steppedValue = roundToStep(normalizedValue, schema.step);
                return [key, clampNumber(steppedValue, schema.min, schema.max)];
            })
        );
    }

    function areCompressorSettingsEqual(left, right) {
        const normalizedLeft = normalizeCompressorSettings(left);
        const normalizedRight = normalizeCompressorSettings(right);
        return Object.keys(COMPRESSOR_PARAMETER_SCHEMA).every((key) => normalizedLeft[key] === normalizedRight[key]);
    }

    function detectCompressorPreset(settings) {
        const normalizedSettings = normalizeCompressorSettings(settings);
        const presetEntry = Object.entries(COMPRESSOR_PRESETS).find(([presetKey, preset]) => (
            presetKey !== 'custom'
            && preset.settings
            && areCompressorSettingsEqual(normalizedSettings, preset.settings)
        ));

        return presetEntry ? presetEntry[0] : 'custom';
    }

    function normalizeCompressorPreset(value) {
        return Object.prototype.hasOwnProperty.call(COMPRESSOR_PRESETS, value) ? value : DEFAULT_COMPRESSOR_PRESET;
    }

    function normalizeCompressorState(rawValue) {
        if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
            const settings = normalizeCompressorSettings(rawValue);
            return {
                preset: detectCompressorPreset(settings),
                advancedMode: false,
                settings
            };
        }

        const rawSettings = rawValue.settings && typeof rawValue.settings === 'object'
            ? rawValue.settings
            : rawValue;
        const settings = normalizeCompressorSettings(rawSettings);
        const requestedPreset = normalizeCompressorPreset(rawValue.preset);
        const preset = requestedPreset === 'custom'
            ? 'custom'
            : (areCompressorSettingsEqual(settings, COMPRESSOR_PRESETS[requestedPreset].settings)
                ? requestedPreset
                : detectCompressorPreset(settings));

        return {
            preset,
            advancedMode: !!rawValue.advancedMode,
            settings
        };
    }

    function isAltHotkey(event, code) {
        return event.altKey && !event.ctrlKey && !event.shiftKey && !event.metaKey && event.code === code;
    }

    function ensurePlayerControlsPanel() {
        const existingButtons = document.querySelector('.hdw-player-controls-panel-buttons');
        if (existingButtons) {
            return existingButtons;
        }

        const playerContainer = document.getElementById('cdnplayer-container')
            || document.getElementById('youtubeplayer')
            || document.getElementById('ownplayer');
        if (!playerContainer || !playerContainer.parentNode) {
            return null;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'hdw-player-controls-panel-wrapper';

        const panel = document.createElement('div');
        panel.className = 'hdw-player-controls-panel';

        const buttons = document.createElement('div');
        buttons.className = 'hdw-player-controls-panel-buttons';

        panel.appendChild(buttons);
        wrapper.appendChild(panel);
        playerContainer.insertAdjacentElement('afterend', wrapper);

        return buttons;
    }

    function normalizePanelGroupName(groupName) {
        return ['secondary', 'tertiary'].includes(groupName) ? groupName : 'primary';
    }

    function resolvePlayerControlsPanelButtons(container) {
        if (!container) {
            return null;
        }

        if (container.classList?.contains('hdw-player-controls-panel-buttons')) {
            return container;
        }

        return container.closest?.('.hdw-player-controls-panel-buttons') || null;
    }

    function ensurePlayerControlsPanelGroups(panelButtons) {
        panelButtons = resolvePlayerControlsPanelButtons(panelButtons);
        if (!panelButtons) {
            return null;
        }

        if (panelButtons.querySelector('.hdw-player-controls-group')) {
            return panelButtons;
        }

        const groupNames = ['primary', 'secondary', 'tertiary'];
        groupNames.forEach((groupName, index) => {
            const group = document.createElement('div');
            group.className = `hdw-player-controls-group hdw-player-controls-group-${groupName}`;
            group.dataset.group = groupName;
            panelButtons.appendChild(group);

            if (index < groupNames.length - 1) {
                const divider = document.createElement('div');
                divider.className = 'hdw-player-controls-divider';
                divider.dataset.beforeGroup = groupNames[index + 1];
                panelButtons.appendChild(divider);
            }
        });

        return panelButtons;
    }

    function getPlayerControlsGroupContainer(panelButtons, groupName) {
        panelButtons = resolvePlayerControlsPanelButtons(panelButtons);
        if (!panelButtons) {
            return null;
        }

        ensurePlayerControlsPanelGroups(panelButtons);
        const normalizedGroup = normalizePanelGroupName(groupName);
        return panelButtons.querySelector(`.hdw-player-controls-group[data-group="${normalizedGroup}"]`);
    }

    function getPanelControlOrder(element) {
        return Number(element?.dataset?.panelOrder || 0);
    }

    function mountPanelControl(panelButtons, element, groupName, order) {
        panelButtons = resolvePlayerControlsPanelButtons(panelButtons);
        if (!panelButtons || !element) {
            return element;
        }

        const normalizedGroup = normalizePanelGroupName(groupName);
        const groupContainer = getPlayerControlsGroupContainer(panelButtons, normalizedGroup);
        if (!groupContainer) {
            return element;
        }

        element.classList.add(`hdw-panel-${normalizedGroup}`);
        element.dataset.panelGroup = normalizedGroup;
        element.dataset.panelOrder = String(order || 0);

        const siblings = Array.from(groupContainer.children);
        const nextSibling = siblings.find((child) => getPanelControlOrder(child) > getPanelControlOrder(element));
        if (nextSibling) {
            groupContainer.insertBefore(element, nextSibling);
        } else {
            groupContainer.appendChild(element);
        }

        syncPlayerControlsPanelGroupStarts(panelButtons);
        return element;
    }

    function getPanelGroupVisibleItems(groupContainer) {
        if (!groupContainer) {
            return [];
        }

        return Array.from(groupContainer.children)
            .filter((element) => {
                if (element.hidden) {
                    return false;
                }

                const style = window.getComputedStyle(element);
                return style.display !== 'none' && style.visibility !== 'hidden';
            })
            .sort((left, right) => getPanelControlOrder(left) - getPanelControlOrder(right));
    }

    function syncPlayerControlsPanelGroupStarts(panelButtons = document.querySelector('.hdw-player-controls-panel-buttons')) {
        panelButtons = resolvePlayerControlsPanelButtons(panelButtons);
        if (!panelButtons) {
            return;
        }

        ensurePlayerControlsPanelGroups(panelButtons);
        const primaryVisible = getPanelGroupVisibleItems(getPlayerControlsGroupContainer(panelButtons, 'primary'));
        const secondaryVisible = getPanelGroupVisibleItems(getPlayerControlsGroupContainer(panelButtons, 'secondary'));
        const tertiaryVisible = getPanelGroupVisibleItems(getPlayerControlsGroupContainer(panelButtons, 'tertiary'));
        const dividerBeforeSecondary = panelButtons.querySelector('.hdw-player-controls-divider[data-before-group="secondary"]');
        const dividerBeforeTertiary = panelButtons.querySelector('.hdw-player-controls-divider[data-before-group="tertiary"]');

        if (dividerBeforeSecondary) {
            dividerBeforeSecondary.hidden = !(primaryVisible.length > 0 && secondaryVisible.length > 0);
        }

        if (dividerBeforeTertiary) {
            dividerBeforeTertiary.hidden = !((primaryVisible.length > 0 || secondaryVisible.length > 0) && tertiaryVisible.length > 0);
        }
    }

    function bindPopupHoverPersistence(wrapper, popup) {
        if (!wrapper || !popup) {
            return;
        }

        let hideTimer = null;
        const OPEN_CLASS = 'hdw-popup-open';
        const HIDE_DELAY_MS = 220;

        const clearHideTimer = () => {
            if (!hideTimer) {
                return;
            }
            clearTimeout(hideTimer);
            hideTimer = null;
        };

        const openPopup = () => {
            clearHideTimer();
            wrapper.classList.add(OPEN_CLASS);
        };

        const scheduleHide = () => {
            clearHideTimer();
            hideTimer = setTimeout(() => {
                if (wrapper.matches(':hover') || wrapper.matches(':focus-within')) {
                    return;
                }
                wrapper.classList.remove(OPEN_CLASS);
            }, HIDE_DELAY_MS);
        };

        ['mouseenter', 'pointerenter', 'focusin'].forEach((eventName) => {
            wrapper.addEventListener(eventName, openPopup);
            popup.addEventListener(eventName, openPopup);
        });

        ['mouseleave', 'pointerleave', 'focusout'].forEach((eventName) => {
            wrapper.addEventListener(eventName, scheduleHide);
            popup.addEventListener(eventName, scheduleHide);
        });
    }

    const popupClickControllers = new Set();

    const PANEL_BUTTON_ICON_IDS = Object.freeze({
        watchlist: 'hdw-icon-watchlist',
        watchlistFavorite: 'hdw-icon-watchlist_favorite',
        watchlistWatching: 'hdw-icon-watchlist_watching',
        watchlistLater: 'hdw-icon-watchlist_later',
        watchlistCompleted: 'hdw-icon-watchlist_completed',
        watchlistAbandoned: 'hdw-icon-watchlist_abandoned',
        theater: 'hdw-icon-theater-mode',
        compressor: 'hdw-icon-audio-compressor',
        blur: 'hdw-icon-video-blur',
        mirror: 'hdw-icon-video-mirror',
        overlay: 'hdw-icon-playback-overlay',
        translator: 'hdw-icon-translator-audio'
    });

    let panelButtonSpriteLoadPromise = null;

    function getCoreBaseUrl() {
        const globalBaseUrl = typeof globalThis !== 'undefined' && typeof globalThis.__HDREZKA_CORE_BASE_URL__ === 'string'
            ? globalThis.__HDREZKA_CORE_BASE_URL__
            : '';
        const raw = globalBaseUrl || (typeof HDREZKA_CORE_BASE_URL === 'string' ? HDREZKA_CORE_BASE_URL : '');
        return raw ? raw.replace(/\/?$/, '/') : '';
    }

    function fetchTextByUrl(url) {
        return new Promise((resolve) => {
            if (!url) {
                resolve('');
                return;
            }

            const request = (typeof GM_xmlhttpRequest === 'function')
                ? GM_xmlhttpRequest
                : (typeof globalThis !== 'undefined' && typeof globalThis.__HDREZKA_GM_XMLHTTPREQUEST__ === 'function'
                    ? globalThis.__HDREZKA_GM_XMLHTTPREQUEST__
                    : null);

            if (request) {
                request({
                    method: 'GET',
                    url,
                    onload: (response) => resolve(String(response?.responseText || '')),
                    onerror: () => resolve(''),
                    ontimeout: () => resolve('')
                });
                return;
            }

            fetch(url)
                .then((response) => response.ok ? response.text() : '')
                .then(resolve)
                .catch(() => resolve(''));
        });
    }

    function ensurePanelButtonSpriteLoaded() {
        if (document.getElementById('hdw-panel-icons-sprite')) {
            return Promise.resolve(true);
        }

        if (!panelButtonSpriteLoadPromise) {
            const url = `${getCoreBaseUrl()}assets/player-controls-icons-sprite.svg`;
            panelButtonSpriteLoadPromise = fetchTextByUrl(url).then((markup) => {
                const text = String(markup || '').trim();
                if (!text) {
                    return false;
                }

                if (document.getElementById('hdw-panel-icons-sprite')) {
                    return true;
                }

                const host = document.createElement('div');
                host.id = 'hdw-panel-icons-sprite';
                host.hidden = true;
                host.style.display = 'none';
                host.setAttribute('aria-hidden', 'true');
                host.innerHTML = text;
                document.body.appendChild(host);
                return true;
            }).catch(() => false);
        }

        return panelButtonSpriteLoadPromise;
    }

    function applyPanelButtonIcon(button, iconKey, options = {}) {
        const symbolId = PANEL_BUTTON_ICON_IDS[iconKey];
        if (!button || !iconKey || !symbolId) {
            return;
        }

        button.querySelector('.hdw-panel-button-icon')?.remove();

        const icon = document.createElement('span');
        icon.className = 'hdw-panel-button-icon';
        if (options.offsetLeft) {
            icon.classList.add('hdw-offset-left');
        }

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');

        const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        use.setAttribute('href', `#${symbolId}`);
        use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#${symbolId}`);
        svg.appendChild(use);
        icon.appendChild(svg);
        button.appendChild(icon);

        ensurePanelButtonSpriteLoaded();
    }
    function bindPopupClickToggle(wrapper, trigger, popup, options = {}) {
        if (!wrapper || !trigger || !popup) {
            return { open() {}, close() {}, isOpen() { return false; } };
        }

        const OPEN_CLASS = 'hdw-popup-open';
        const TRIGGER_OPEN_CLASS = 'hdw-popup-trigger-open';

        const syncState = (opened) => {
            trigger.setAttribute('aria-expanded', opened ? 'true' : 'false');
            trigger.classList.toggle(TRIGGER_OPEN_CLASS, opened);
            if (typeof options.onToggle === 'function') {
                options.onToggle(opened);
            }
        };

        const isOpen = () => wrapper.classList.contains(OPEN_CLASS);
        const open = () => {
            popupClickControllers.forEach((controller) => {
                if (controller.wrapper !== wrapper) {
                    controller.close();
                }
            });
            wrapper.classList.add(OPEN_CLASS);
            syncState(true);
        };
        const close = () => {
            wrapper.classList.remove(OPEN_CLASS);
            syncState(false);
        };

        trigger.setAttribute('aria-haspopup', 'dialog');
        syncState(false);

        trigger.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (isOpen()) {
                close();
                return;
            }
            if (typeof options.shouldOpenOnTrigger === 'function' && !options.shouldOpenOnTrigger(event)) {
                close();
                return;
            }
            open();
        });

        popup.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        document.addEventListener('click', (event) => {
            if (!wrapper.contains(event.target)) {
                close();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                close();
            }
        });

        const controller = { wrapper, open, close, isOpen };
        popupClickControllers.add(controller);
        return controller;
    }

    function centerActivePanelListItem(listEl, activeSelector = '.hdw-translators-panel-item.hdw-active') {
        if (!listEl) {
            return;
        }

        const activeButton = listEl.querySelector(activeSelector);
        if (!activeButton) {
            return;
        }

        const targetScrollTop = activeButton.offsetTop - (listEl.clientHeight / 2) + (activeButton.offsetHeight / 2);
        const maxScrollTop = Math.max(0, listEl.scrollHeight - listEl.clientHeight);
        listEl.scrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
    }

    class AudioCompressorModule {
        constructor(storageKey, settingsStorageKey) {
            this.storageKey = storageKey;
            this.settingsStorageKey = settingsStorageKey;
            this.enabled = GM_getValue(storageKey, false);
            const normalizedState = normalizeCompressorState(
                GM_getValue(settingsStorageKey, {
                    preset: DEFAULT_COMPRESSOR_PRESET,
                    advancedMode: false,
                    settings: getDefaultCompressorSettings()
                })
            );
            this.settings = normalizedState.settings;
            this.preset = normalizedState.preset;
            this.advancedMode = normalizedState.advancedMode;
            this.states = new WeakMap();
            this.currentVideo = null;
            this.observer = null;
            this.videoEvents = null;
            this.initialized = false;
            this.statusMessage = '';
            this.statusTone = 'neutral';
            this.availability = {
                kind: 'idle',
                message: ''
            };
            this.popupController = null;
            this.settingsInputs = {};
            this.settingsValueNodes = {};
            this.presetButtons = {};
            this.toggleButton = null;
            this.advancedModeInput = null;
            this.controlsNode = null;
            this.statusNode = null;
            this.meterNode = null;
        }

        setAvailability(kind, message = '') {
            this.availability = { kind, message };
        }

        isFeatureUnsupported() {
            const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
            return !AudioContextCtor || typeof DynamicsCompressorNode === 'undefined' || typeof GainNode === 'undefined';
        }

        getStatusSnapshot() {
            if (this.availability.kind === 'unsupported') {
                return {
                    text: this.availability.message || 'Браузер не поддерживает AudioContext или компрессор.',
                    tone: 'error'
                };
            }

            if (this.availability.kind === 'error') {
                return {
                    text: this.availability.message || 'Не удалось инициализировать аудиообработку для этого видео.',
                    tone: 'error'
                };
            }

            if (this.availability.kind === 'blocked') {
                return {
                    text: this.availability.message || 'Нужен user gesture: клик по плееру или повторное включение компрессора.',
                    tone: 'warning'
                };
            }

            if (this.availability.kind === 'no-video') {
                return {
                    text: this.availability.message || 'Видео еще не найдено. Настройки сохранятся и применятся позже.',
                    tone: 'neutral'
                };
            }

            if (this.statusMessage) {
                return {
                    text: this.statusMessage,
                    tone: this.statusTone || 'neutral'
                };
            }

            return {
                text: 'Настройки применяются к текущему видео сразу.',
                tone: 'neutral'
            };
        }

        init() {
            if (this.initialized) {
                this.updateButtonState();
                return;
            }

            this.initialized = true;
            this.addButton();
            this.ensureVideoObserver();
            this.ensureForCurrentVideo();
            this.updateButtonState();
        }

        addButton() {
            if (document.getElementById('audio-compressor-toggle-btn')) {
                return;
            }

            const panelButtons = ensurePlayerControlsPanel();
            if (!panelButtons) {
                return;
            }

            const button = document.createElement('button');
            button.id = 'audio-compressor-toggle-btn';
            button.type = 'button';
            button.title = this.buildButtonTitle();
            applyPanelButtonIcon(button, 'compressor');

            const wrapper = document.createElement('div');
            wrapper.className = 'hdw-compressor-wrap';

            const popup = this.createSettingsPopup();
            wrapper.appendChild(popup);
            wrapper.appendChild(button);
            this.popupController = bindPopupClickToggle(wrapper, button, popup);

            mountPanelControl(panelButtons, wrapper, 'secondary', 140);
            this.updatePopupState();
        }

        createSettingsPopup() {
            const popup = document.createElement('div');
            popup.id = 'hdw-audio-compressor-popup';

            const header = document.createElement('div');
            header.className = 'hdw-compressor-popup-header';

            const title = document.createElement('span');
            title.className = 'hdw-compressor-popup-title';
            title.textContent = 'Компрессор';
            header.appendChild(title);
            popup.appendChild(header);

            const status = document.createElement('div');
            status.className = 'hdw-compressor-popup-status';
            this.statusNode = status;
            popup.appendChild(status);

            const meter = document.createElement('div');
            meter.className = 'hdw-compressor-popup-meter';
            this.meterNode = meter;
            popup.appendChild(meter);

            const presets = document.createElement('div');
            presets.className = 'hdw-compressor-popup-presets';
            Object.entries(COMPRESSOR_PRESETS).forEach(([presetKey, preset]) => {
                const presetButton = document.createElement('button');
                presetButton.type = 'button';
                presetButton.className = 'hdw-compressor-popup-preset';
                presetButton.textContent = preset.label;
                presetButton.addEventListener('click', () => this.applyPreset(presetKey));
                this.presetButtons[presetKey] = presetButton;
                presets.appendChild(presetButton);
            });
            popup.appendChild(presets);

            const advancedLabel = document.createElement('label');
            advancedLabel.className = 'hdw-compressor-popup-advanced';

            const advancedInput = document.createElement('input');
            advancedInput.type = 'checkbox';
            advancedInput.checked = this.advancedMode;
            advancedInput.addEventListener('change', () => {
                this.setAdvancedMode(advancedInput.checked);
            });
            this.advancedModeInput = advancedInput;

            const advancedText = document.createElement('span');
            advancedText.textContent = 'Расширенный режим';

            advancedLabel.appendChild(advancedInput);
            advancedLabel.appendChild(advancedText);
            popup.appendChild(advancedLabel);

            const controls = document.createElement('div');
            controls.className = 'hdw-compressor-popup-controls';
            this.controlsNode = controls;

            Object.entries(COMPRESSOR_PARAMETER_SCHEMA).forEach(([key, schema]) => {
                controls.appendChild(this.createParameterControl(key, schema));
            });

            popup.appendChild(controls);

            const footer = document.createElement('div');
            footer.className = 'hdw-compressor-popup-footer';

            const toggleButton = document.createElement('button');
            toggleButton.type = 'button';
            toggleButton.className = 'hdw-compressor-popup-toggle-btn';
            toggleButton.addEventListener('click', () => {
                this.setEnabled(!this.enabled, true);
            });
            footer.appendChild(toggleButton);
            this.toggleButton = toggleButton;

            const resetButton = document.createElement('button');
            resetButton.type = 'button';
            resetButton.className = 'hdw-compressor-popup-reset';
            resetButton.textContent = 'Сбросить';
            resetButton.addEventListener('click', () => {
                this.resetSettings();
            });

            footer.appendChild(resetButton);
            popup.appendChild(footer);

            return popup;
        }

        createParameterControl(key, schema) {
            const row = document.createElement('div');
            row.className = 'hdw-compressor-popup-row';

            const head = document.createElement('div');
            head.className = 'hdw-compressor-popup-row-head';

            const labelWrap = document.createElement('div');
            labelWrap.className = 'hdw-compressor-popup-label-wrap';

            const label = document.createElement('span');
            label.className = 'hdw-compressor-popup-label';
            label.textContent = schema.label;
            labelWrap.appendChild(label);

            if (schema.description) {
                const hintTrigger = document.createElement('span');
                hintTrigger.className = 'hdw-compressor-popup-hint-trigger';
                hintTrigger.dataset.hint = schema.description;
                hintTrigger.tabIndex = 0;
                labelWrap.appendChild(hintTrigger);
            }

            const value = document.createElement('span');
            value.className = 'hdw-compressor-popup-value';
            this.settingsValueNodes[key] = value;

            head.appendChild(labelWrap);
            head.appendChild(value);
            row.appendChild(head);

            const input = document.createElement('input');
            input.type = 'range';
            input.className = 'hdw-compressor-popup-slider';
            input.min = String(schema.min);
            input.max = String(schema.max);
            input.step = String(schema.step);
            input.value = String(this.settings[key]);
            input.addEventListener('input', () => {
                const nextValue = Number(input.value);
                this.updateSettings({ [key]: nextValue });
            });
            this.settingsInputs[key] = input;
            row.appendChild(input);

            this.updateParameterControlValue(key);
            return row;
        }

        formatParameterValue(key, value) {
            const schema = COMPRESSOR_PARAMETER_SCHEMA[key];
            if (!schema) {
                return String(value);
            }

            return typeof schema.formatValue === 'function'
                ? schema.formatValue(value)
                : String(value);
        }

        updateParameterControlValue(key) {
            const input = this.settingsInputs[key];
            const valueNode = this.settingsValueNodes[key];
            if (!input || !valueNode) {
                return;
            }

            const value = this.settings[key];
            input.value = String(value);
            valueNode.textContent = this.formatParameterValue(key, value);
        }

        getCompressionIntensityLabel() {
            const ratio = Number(this.settings.ratio);
            const threshold = Number(this.settings.threshold);

            if (ratio <= 1.5 || threshold >= -18) {
                return 'Без компрессии';
            }

            if (ratio <= 3 || threshold >= -30) {
                return 'Мягкая компрессия';
            }

            if (ratio <= 6 || threshold >= -42) {
                return 'Умеренная компрессия';
            }

            if (ratio <= 10 || threshold >= -54) {
                return 'Агрессивная компрессия';
            }

            return 'Почти лимитер';
        }

        renderMeterSummary() {
            if (!this.meterNode) {
                return;
            }

            const presetLabel = COMPRESSOR_PRESETS[this.preset]?.label || COMPRESSOR_PRESETS.custom.label;
            const rows = [
                ['Preset', presetLabel],
                ['Профиль', this.getCompressionIntensityLabel()],
                ['Threshold', this.formatParameterValue('threshold', this.settings.threshold)],
                ['Output Gain', this.formatParameterValue('outputGain', this.settings.outputGain)]
            ];

            this.meterNode.replaceChildren(
                ...rows.map(([label, value]) => {
                    const line = document.createElement('div');
                    line.className = 'hdw-compressor-popup-meter-line';

                    const labelNode = document.createElement('span');
                    labelNode.className = 'hdw-compressor-popup-meter-label';
                    labelNode.textContent = label;

                    const valueNode = document.createElement('span');
                    valueNode.className = 'hdw-compressor-popup-meter-value';
                    valueNode.textContent = value;

                    line.appendChild(labelNode);
                    line.appendChild(valueNode);
                    return line;
                })
            );
        }

        updatePopupState() {
            Object.entries(this.presetButtons).forEach(([presetKey, button]) => {
                button.classList.toggle('hdw-active', presetKey === this.preset);
            });

            if (this.advancedModeInput) {
                this.advancedModeInput.checked = this.advancedMode;
            }

            if (this.controlsNode) {
                this.controlsNode.hidden = !this.advancedMode;
            }

            Object.keys(COMPRESSOR_PARAMETER_SCHEMA).forEach((key) => {
                this.updateParameterControlValue(key);
            });

            this.renderMeterSummary();

            if (this.statusNode) {
                const snapshot = this.getStatusSnapshot();
                this.statusNode.textContent = snapshot.text;
                this.statusNode.classList.toggle('hdw-warning', snapshot.tone === 'warning');
                this.statusNode.classList.toggle('hdw-error', snapshot.tone === 'error');
            }

            if (this.toggleButton) {
                this.toggleButton.classList.toggle('hdw-active', this.enabled);
                this.toggleButton.textContent = this.enabled
                    ? 'Выключить компрессор'
                    : 'Включить компрессор';
                this.toggleButton.title = this.enabled
                    ? 'Выключить аудио компрессор'
                    : 'Включить аудио компрессор';
            }
        }

        ensureVideoObserver() {
            if (this.observer) {
                return;
            }

            const root = document.getElementById('cdnplayer-container') || document.body;
            this.observer = new MutationObserver(() => this.ensureForCurrentVideo());
            this.observer.observe(root, {
                childList: true,
                subtree: true
            });
        }

        getCurrentVideoElement() {
            return document.querySelector('#cdnplayer video, #ownplayer video, video');
        }

        ensureForCurrentVideo() {
            if (this.isFeatureUnsupported()) {
                this.setAvailability('unsupported', 'Браузер не поддерживает AudioContext, GainNode или DynamicsCompressorNode.');
                this.updateButtonState();
                return;
            }

            const video = this.getCurrentVideoElement();
            if (!video) {
                this.currentVideo = null;
                this.setAvailability('no-video', 'Видео еще не найдено. Настройки будут применены после загрузки плеера.');
                this.updateButtonState();
                return;
            }

            if (video === this.currentVideo) {
                return;
            }

            this.currentVideo = video;
            this.bindVideoEvents(video);
            const state = this.getOrCreateState(video);
            if (!state) {
                if (this.availability.kind !== 'error') {
                    this.setAvailability('error', 'Компрессор недоступен для этого видео.');
                }
                this.updateButtonState();
                return;
            }

            this.setAvailability('ready', '');
            this.applyState(state, this.enabled, false);
            if (this.enabled && state.ctx.state === 'suspended') {
                this.setAvailability('blocked', 'Нужен user gesture: клик по плееру или повторное включение компрессора.');
            }
            this.updateButtonState();
        }

        bindVideoEvents(video) {
            if (this.videoEvents) {
                const { video: prevVideo, handler } = this.videoEvents;
                prevVideo.removeEventListener('play', handler);
                prevVideo.removeEventListener('canplay', handler);
            }

            const handler = async () => {
                const state = this.getOrCreateState(video);
                if (!state || !this.enabled) {
                    return;
                }
                this.applyState(state, true, false);
                const resumed = await this.tryResumeAudioContext(state.ctx, false);
                if (!resumed) {
                    this.setAvailability('blocked', 'Браузер пока не разрешил запуск AudioContext без user gesture.');
                } else {
                    this.setAvailability('ready', '');
                }
                this.updateButtonState();
            };

            video.addEventListener('play', handler);
            video.addEventListener('canplay', handler);
            this.videoEvents = { video, handler };
        }

        getOrCreateState(video) {
            if (this.states.has(video)) {
                return this.states.get(video);
            }

            const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextCtor || typeof DynamicsCompressorNode === 'undefined' || typeof GainNode === 'undefined') {
                this.setAvailability('unsupported', 'Браузер не поддерживает AudioContext, GainNode или DynamicsCompressorNode.');
                return null;
            }

            try {
                const ctx = new AudioContextCtor();
                const source = new MediaElementAudioSourceNode(ctx, { mediaElement: video });
                const compressor = new DynamicsCompressorNode(ctx);
                const outputGain = new GainNode(ctx, { gain: this.settings.outputGain });

                source.connect(ctx.destination);
                const state = { ctx, source, compressor, outputGain, isActive: false };
                this.applySettingsToState(state, this.settings);
                this.states.set(video, state);
                this.setAvailability('ready', '');
                return state;
            } catch (error) {
                debugLog('[AudioCompressor] Ошибка инициализации:', error);
                const details = error && typeof error.message === 'string' && error.message
                    ? ` ${error.message}`
                    : '';
                this.setAvailability('error', `Не удалось инициализировать аудиообработку для этого видео.${details}`.trim());
                return null;
            }
        }

        applySettingsToState(state, settings) {
            if (!state || !state.compressor) {
                return;
            }

            const normalizedSettings = normalizeCompressorSettings(settings);
            Object.entries(normalizedSettings).forEach(([key, value]) => {
                if (key === 'outputGain') {
                    if (state.outputGain?.gain && typeof state.outputGain.gain.value === 'number') {
                        state.outputGain.gain.value = value;
                    }
                    return;
                }

                const param = state.compressor[key];
                if (param && typeof param.value === 'number') {
                    param.value = value;
                }
            });
        }

        getEffectiveCompressorSettings() {
            return normalizeCompressorSettings(this.settings);
        }

        saveCompressorState(nextSettings, nextPreset) {
            this.settings = normalizeCompressorSettings(nextSettings);
            this.preset = normalizeCompressorPreset(nextPreset);
            GM_setValue(this.settingsStorageKey, {
                preset: this.preset,
                advancedMode: this.advancedMode,
                settings: this.settings
            });
            this.statusMessage = '';
            this.statusTone = 'neutral';
        }

        setAdvancedMode(enabled) {
            this.advancedMode = !!enabled;
            this.saveCompressorState(this.settings, this.preset);
            this.updateButtonState();
        }

        updateSettings(partialSettings, source = 'manual') {
            const nextSettings = { ...this.settings, ...partialSettings };
            const nextPreset = source === 'manual' ? 'custom' : this.preset;
            this.saveCompressorState(nextSettings, nextPreset);

            if (this.currentVideo) {
                const state = this.getOrCreateState(this.currentVideo);
                this.applySettingsToState(state, this.getEffectiveCompressorSettings());
            }

            this.updateButtonState();
        }

        applyPreset(presetKey) {
            const preset = COMPRESSOR_PRESETS[presetKey];
            if (!preset) {
                return;
            }

            if (presetKey === 'custom') {
                this.preset = 'custom';
                this.updateButtonState();
                return;
            }

            this.saveCompressorState(preset.settings, presetKey);
            if (this.currentVideo) {
                const state = this.getOrCreateState(this.currentVideo);
                this.applySettingsToState(state, this.getEffectiveCompressorSettings());
            }
            this.updateButtonState();
        }

        resetSettings() {
            this.saveCompressorState(getDefaultCompressorSettings(), DEFAULT_COMPRESSOR_PRESET);
            if (this.currentVideo) {
                const state = this.getOrCreateState(this.currentVideo);
                this.applySettingsToState(state, this.getEffectiveCompressorSettings());
            }
            this.updateButtonState();
        }

        disconnectSafe(node, target) {
            try {
                node.disconnect(target);
            } catch (error) {
                // Игнорируем ошибки отключения несвязанных нод
            }
        }

        applyState(state, enabled, fromUserGesture) {
            if (!state) {
                return;
            }

            if (enabled) {
                if (!state.isActive) {
                    this.disconnectSafe(state.source, state.ctx.destination);
                    this.disconnectSafe(state.source, state.compressor);
                    this.disconnectSafe(state.compressor, state.ctx.destination);
                    this.disconnectSafe(state.compressor, state.outputGain);
                    this.disconnectSafe(state.outputGain, state.ctx.destination);
                    state.source.connect(state.compressor);
                    state.compressor.connect(state.outputGain);
                    state.outputGain.connect(state.ctx.destination);
                    state.isActive = true;
                }
                return state.ctx.state === 'running';
            } else if (state.isActive) {
                this.disconnectSafe(state.source, state.compressor);
                this.disconnectSafe(state.compressor, state.ctx.destination);
                this.disconnectSafe(state.compressor, state.outputGain);
                this.disconnectSafe(state.outputGain, state.ctx.destination);
                this.disconnectSafe(state.source, state.ctx.destination);
                state.source.connect(state.ctx.destination);
                state.isActive = false;
            }

            return true;
        }

        async tryResumeAudioContext(ctx, fromUserGesture) {
            if (!ctx || ctx.state !== 'suspended') {
                return true;
            }

            if (!fromUserGesture) {
                return false;
            }

            try {
                await ctx.resume();
                return ctx.state === 'running';
            } catch (error) {
                debugLog('[AudioCompressor] Не удалось возобновить AudioContext:', error);
                return false;
            }
        }

        async setEnabled(enabled, fromUserGesture) {
            this.enabled = !!enabled;
            GM_setValue(this.storageKey, this.enabled);
            this.statusMessage = '';
            this.statusTone = 'neutral';

            this.ensureForCurrentVideo();
            const state = this.currentVideo ? this.getOrCreateState(this.currentVideo) : null;
            if (state) {
                this.applyState(state, this.enabled, fromUserGesture);
                if (this.enabled) {
                    const resumed = await this.tryResumeAudioContext(state.ctx, fromUserGesture);
                    if (!resumed) {
                        this.setAvailability(
                            'blocked',
                            fromUserGesture
                                ? 'Браузер не разрешил запустить AudioContext даже после user gesture.'
                                : 'Требуется клик по плееру или повторное включение компрессора.'
                        );
                        this.updateButtonState();
                        return;
                    }

                    this.setAvailability('ready', '');
                } else if (!this.enabled) {
                    this.setAvailability('ready', '');
                }
            } else if (this.enabled && this.availability.kind === 'idle') {
                this.setAvailability('no-video', 'Видео еще не найдено. Компрессор применится после загрузки плеера.');
            }

            this.updateButtonState();
        }

        toggle(fromUserGesture = false) {
            this.setEnabled(!this.enabled, fromUserGesture);
        }

        buildButtonTitle(extraStatus = '') {
            const statusSnapshot = this.getStatusSnapshot();
            const suffix = extraStatus
                ? ` - ${extraStatus}`
                : (statusSnapshot.text ? ` - ${statusSnapshot.text}` : '');
            return `Аудио компрессор: ${this.enabled ? 'Вкл' : 'Выкл'}${suffix} (${HOTKEYS.compressor.label})`;
        }

        updateButtonState(extraStatus = '') {
            if (extraStatus) {
                this.statusMessage = extraStatus;
                this.statusTone = 'neutral';
            }
            const button = document.getElementById('audio-compressor-toggle-btn');
            if (!button) {
                return;
            }

            button.classList.toggle('hdw-active', this.enabled);
            button.title = this.buildButtonTitle(extraStatus);
            this.updatePopupState();
        }
    }

    class VideoEffectsModule {
        constructor() {
            this.blurEnabled = false;
            this.mirrorEnabled = false;
            this.currentTarget = null;
            this.observer = null;
            this.initialized = false;
        }

        init() {
            if (this.initialized) {
                this.updateButtonsState();
                return;
            }

            this.initialized = true;
            this.addButtons();
            this.ensureMediaObserver();
            this.ensureForCurrentTarget();
            this.updateButtonsState();
        }

        addButtons() {
            const panelButtons = ensurePlayerControlsPanel();
            if (!panelButtons) {
                return;
            }

            if (!document.getElementById('video-mirror-toggle-btn')) {
                const mirrorButton = document.createElement('button');
                mirrorButton.id = 'video-mirror-toggle-btn';
                mirrorButton.type = 'button';
                applyPanelButtonIcon(mirrorButton, 'mirror');
                mirrorButton.addEventListener('click', () => this.toggleMirror());
                mountPanelControl(panelButtons, mirrorButton, 'secondary', 130);
            }

            if (!document.getElementById('video-blur-toggle-btn')) {
                const blurButton = document.createElement('button');
                blurButton.id = 'video-blur-toggle-btn';
                blurButton.type = 'button';
                applyPanelButtonIcon(blurButton, 'blur');
                blurButton.addEventListener('click', () => this.toggleBlur());
                mountPanelControl(panelButtons, blurButton, 'secondary', 120);
            }
        }

        ensureMediaObserver() {
            if (this.observer) {
                return;
            }

            const root = document.getElementById('player') || document.body;
            this.observer = new MutationObserver(() => this.ensureForCurrentTarget());
            this.observer.observe(root, {
                childList: true,
                subtree: true
            });
        }

        getCurrentTargetElement() {
            return document.querySelector('#cdnplayer video, #ownplayer video, video')
                || document.querySelector('#ownplayer > #videoplayer > iframe, #cdnplayer iframe');
        }

        ensureForCurrentTarget() {
            const target = this.getCurrentTargetElement();
            if (target === this.currentTarget) {
                return;
            }

            if (this.currentTarget) {
                this.currentTarget.classList.remove('hdw-video-blur');
                this.currentTarget.classList.remove('hdw-video-mirror');
            }

            this.currentTarget = target;
            this.applyCurrentState();
        }

        applyCurrentState() {
            if (!this.currentTarget) {
                return;
            }

            this.currentTarget.classList.toggle('hdw-video-blur', this.blurEnabled);
            this.currentTarget.classList.toggle('hdw-video-mirror', this.mirrorEnabled);
        }

        toggleBlur() {
            this.blurEnabled = !this.blurEnabled;
            this.ensureForCurrentTarget();
            this.applyCurrentState();
            this.updateButtonsState();
        }

        toggleMirror() {
            this.mirrorEnabled = !this.mirrorEnabled;
            this.ensureForCurrentTarget();
            this.applyCurrentState();
            this.updateButtonsState();
        }

        buildBlurTitle() {
            return `Размытие: ${this.blurEnabled ? 'Вкл' : 'Выкл'} (${HOTKEYS.blur.label})`;
        }

        buildMirrorTitle() {
            return `Зеркало: ${this.mirrorEnabled ? 'Вкл' : 'Выкл'} (${HOTKEYS.mirror.label})`;
        }

        updateButtonsState() {
            const blurButton = document.getElementById('video-blur-toggle-btn');
            if (blurButton) {
                blurButton.classList.toggle('hdw-active', this.blurEnabled);
                blurButton.title = this.buildBlurTitle();
            }

            const mirrorButton = document.getElementById('video-mirror-toggle-btn');
            if (mirrorButton) {
                mirrorButton.classList.toggle('hdw-active', this.mirrorEnabled);
                mirrorButton.title = this.buildMirrorTitle();
            }
        }
    }

    class PlaybackInfoOverlayModule {
        constructor(storageKey, displayStorageKey) {
            this.storageKey = storageKey;
            this.displayStorageKey = displayStorageKey;
            this.enabled = GM_getValue(storageKey, false);
            this.displaySettings = this.loadDisplaySettings();
            this.runtimeActive = false;
            this.currentVideo = null;
            this.videoScanInterval = null;
            this.overlayUpdateInterval = null;
            this.overlay = null;
            this.titleNode = null;
            this.timeNode = null;
            this.fullscreenHandler = null;
            this.visibilityHandler = null;
            this.initialized = false;
            this.statusNode = null;
            this.toggleButton = null;
            this.settingButtons = {};
        }

        getDefaultDisplaySettings() {
            return {
                showTitle: true,
                showSeasonEpisode: true,
                showProgress: true
            };
        }

        normalizeDisplaySettings(rawSettings) {
            const defaults = this.getDefaultDisplaySettings();
            const source = rawSettings && typeof rawSettings === 'object' ? rawSettings : {};
            return {
                showTitle: source.showTitle !== undefined ? !!source.showTitle : defaults.showTitle,
                showSeasonEpisode: source.showSeasonEpisode !== undefined ? !!source.showSeasonEpisode : defaults.showSeasonEpisode,
                showProgress: source.showProgress !== undefined ? !!source.showProgress : defaults.showProgress
            };
        }

        loadDisplaySettings() {
            const stored = GM_getValue(this.displayStorageKey, null);
            return this.normalizeDisplaySettings(stored);
        }

        saveDisplaySettings() {
            GM_setValue(this.displayStorageKey, this.displaySettings);
        }

        updateDisplaySetting(settingKey, enabled) {
            if (!Object.prototype.hasOwnProperty.call(this.displaySettings, settingKey)) {
                return;
            }

            this.displaySettings[settingKey] = !!enabled;
            this.saveDisplaySettings();
            this.updateOverlay();
            this.updatePopupState();
        }

        init() {
            if (this.initialized) {
                this.updateButtonState();
                this.updateOverlay();
                return;
            }

            this.initialized = true;
            this.addButton();
            this.updateButtonState();
            if (this.enabled) {
                this.startRuntime();
            }
        }

        startRuntime() {
            if (this.runtimeActive) {
                return;
            }

            this.runtimeActive = true;
            this.ensureFullscreenListener();
            this.ensureVisibilityListener();
            this.ensureForCurrentVideo();
            this.startVideoScan();
            this.startOverlayUpdates();
            this.updateOverlay();
        }

        stopRuntime() {
            this.runtimeActive = false;

            this.currentVideo = null;

            if (this.videoScanInterval) {
                clearInterval(this.videoScanInterval);
                this.videoScanInterval = null;
            }

            if (this.overlayUpdateInterval) {
                clearInterval(this.overlayUpdateInterval);
                this.overlayUpdateInterval = null;
            }

            if (this.fullscreenHandler) {
                document.removeEventListener('fullscreenchange', this.fullscreenHandler);
                document.removeEventListener('webkitfullscreenchange', this.fullscreenHandler);
                this.fullscreenHandler = null;
            }

            if (this.visibilityHandler) {
                document.removeEventListener('visibilitychange', this.visibilityHandler);
                this.visibilityHandler = null;
            }

            this.setOverlayVisible(false);
        }

        addButton() {
            if (document.getElementById('playback-info-overlay-toggle-btn')) {
                return;
            }

            const panelButtons = ensurePlayerControlsPanel();
            if (!panelButtons) {
                return;
            }

            const button = document.createElement('button');
            button.id = 'playback-info-overlay-toggle-btn';
            button.type = 'button';
            button.title = this.buildButtonTitle();
            applyPanelButtonIcon(button, 'overlay');

            const wrapper = document.createElement('div');
            wrapper.className = 'hdw-overlay-toggle-wrap';
            const settingsPopup = this.createSettingsPopup();
            wrapper.appendChild(settingsPopup);
            wrapper.appendChild(button);
            bindPopupClickToggle(wrapper, button, settingsPopup);

            mountPanelControl(panelButtons, wrapper, 'secondary', 110);
        }

        createSettingsPopup() {
            const popup = document.createElement('div');
            popup.id = 'hdw-overlay-settings-popup';

            const header = document.createElement('div');
            header.className = 'hdw-overlay-settings-header';

            const title = document.createElement('span');
            title.className = 'hdw-overlay-settings-title';
            title.textContent = 'Показывать в оверлее';
            header.appendChild(title);

            const currentStatus = document.createElement('div');
            currentStatus.className = 'hdw-overlay-settings-current';
            header.appendChild(currentStatus);
            this.statusNode = currentStatus;
            popup.appendChild(header);

            const settingsList = document.createElement('div');
            settingsList.className = 'hdw-overlay-settings-list';
            popup.appendChild(settingsList);

            settingsList.appendChild(this.createSettingsToggle(
                'showTitle',
                'Название тайтла',
                'Показывать имя фильма или сериала поверх видео'
            ));
            settingsList.appendChild(this.createSettingsToggle(
                'showSeasonEpisode',
                'Сезон и серия',
                'Добавлять текущий сезон и номер серии'
            ));
            settingsList.appendChild(this.createSettingsToggle(
                'showProgress',
                'Прогресс просмотра',
                'Показывать текущее время и длительность'
            ));

            const footer = document.createElement('div');
            footer.className = 'hdw-overlay-settings-footer';

            const toggleButton = document.createElement('button');
            toggleButton.type = 'button';
            toggleButton.className = 'hdw-overlay-settings-toggle-btn';
            toggleButton.addEventListener('click', () => {
                this.toggle();
            });
            footer.appendChild(toggleButton);
            popup.appendChild(footer);
            this.toggleButton = toggleButton;

            this.updatePopupState();
            return popup;
        }

        createSettingsToggle(settingKey, labelText, hintText) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'hdw-overlay-settings-item';
            button.addEventListener('click', () => {
                const nextValue = !this.displaySettings[settingKey];
                this.updateDisplaySetting(settingKey, nextValue);
            });

            const labelContent = document.createElement('span');
            labelContent.className = 'hdw-overlay-settings-label';

            const name = document.createElement('span');
            name.className = 'hdw-overlay-settings-name';
            name.textContent = labelText;
            labelContent.appendChild(name);

            if (hintText) {
                const hintTrigger = document.createElement('span');
                hintTrigger.className = 'hdw-overlay-settings-hint-trigger';
                hintTrigger.dataset.hint = hintText;
                hintTrigger.tabIndex = 0;
                labelContent.appendChild(hintTrigger);
            }

            button.appendChild(labelContent);
            this.settingButtons[settingKey] = button;
            return button;
        }

        startVideoScan() {
            if (this.videoScanInterval) {
                return;
            }

            this.videoScanInterval = setInterval(() => {
                if (!this.runtimeActive) {
                    return;
                }

                const videoChanged = this.ensureForCurrentVideo();
                if (videoChanged) {
                    this.updateOverlay();
                }
            }, 1500);
        }

        stopVideoScan() {
            if (!this.videoScanInterval) {
                return;
            }

            clearInterval(this.videoScanInterval);
            this.videoScanInterval = null;
        }

        ensureVisibilityListener() {
            if (this.visibilityHandler) {
                return;
            }

            this.visibilityHandler = () => {
                if (!this.runtimeActive) {
                    return;
                }

                if (document.hidden) {
                    this.stopVideoScan();
                    this.stopOverlayUpdates();
                    this.setOverlayVisible(false);
                    return;
                }

                this.ensureForCurrentVideo();
                this.startVideoScan();
                this.startOverlayUpdates();
                this.updateOverlay();
            };

            document.addEventListener('visibilitychange', this.visibilityHandler);
        }

        startOverlayUpdates() {
            if (this.overlayUpdateInterval) {
                return;
            }

            this.overlayUpdateInterval = setInterval(() => {
                if (!this.runtimeActive || document.hidden) {
                    return;
                }
                this.updateOverlay();
            }, 1000);
        }

        stopOverlayUpdates() {
            if (!this.overlayUpdateInterval) {
                return;
            }
            clearInterval(this.overlayUpdateInterval);
            this.overlayUpdateInterval = null;
        }

        getCurrentVideoElement() {
            return document.querySelector('#cdnplayer video, #ownplayer video, video');
        }

        getPlayerRoot() {
            return document.getElementById('cdnplayer')
                || document.getElementById('ownplayer')
                || (this.currentVideo ? this.currentVideo.closest('#cdnplayer, #ownplayer') : null);
        }

        getOverlayHost() {
            const fsEl = document.fullscreenElement || document.webkitFullscreenElement || null;
            if (fsEl && (fsEl.id === 'oframecdnplayer' || fsEl.id === 'oframeownplayer' || /oframe/i.test(fsEl.id || ''))) {
                return fsEl;
            }

            const playerRoot = this.getPlayerRoot();
            if (playerRoot) {
                const pjsFrame = playerRoot.querySelector('#oframecdnplayer, #oframeownplayer, pjsdiv[id^="oframe"]');
                if (pjsFrame) {
                    return pjsFrame;
                }
            }

            return playerRoot
                || document.getElementById('cdnplayer-container')
                || document.getElementById('ownplayer');
        }

        ensureFullscreenListener() {
            if (this.fullscreenHandler) {
                return;
            }

            this.fullscreenHandler = () => {
                this.ensureOverlayRoot();
                this.updateOverlay();
            };
            document.addEventListener('fullscreenchange', this.fullscreenHandler);
            document.addEventListener('webkitfullscreenchange', this.fullscreenHandler);
        }

        ensureOverlayRoot() {
            const root = this.getOverlayHost();

            if (!root) {
                return null;
            }

            if (!this.overlay) {
                const overlay = document.createElement('div');
                overlay.id = 'hdw-playback-info-overlay';
                overlay.innerHTML = `
                    <span class="hdw-overlay-title"></span>
                    <span class="hdw-overlay-time"></span>
                `;

                this.overlay = overlay;
                this.titleNode = overlay.querySelector('.hdw-overlay-title');
                this.timeNode = overlay.querySelector('.hdw-overlay-time');
            }

            if (this.overlay.parentElement !== root) {
                const pos = window.getComputedStyle(root).position;
                if (!pos || pos === 'static') {
                    root.style.position = 'relative';
                }
                root.appendChild(this.overlay);
            }

            return root;
        }

        ensureForCurrentVideo() {
            const video = this.getCurrentVideoElement();
            if (video === this.currentVideo) {
                return false;
            }

            this.currentVideo = video;
            this.ensureOverlayRoot();
            return true;
        }

        formatPlaybackTime(rawSeconds) {
            const total = Number.isFinite(rawSeconds) ? Math.max(0, Math.floor(rawSeconds)) : 0;
            const hours = Math.floor(total / 3600);
            const minutes = Math.floor((total % 3600) / 60);
            const seconds = total % 60;

            if (hours > 0) {
                return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }

            return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

        buildSeasonEpisodeText() {
            const parts = [];
            const seasonInfo = MovieParser.parseSeasonInfo();
            const episodeInfo = MovieParser.parseEpisodeInfo();

            if (seasonInfo) {
                if (seasonInfo.id && seasonInfo.name) {
                    parts.push(seasonInfo.name);
                } else if (seasonInfo.id) {
                    parts.push(`Сезон ${seasonInfo.id}`);
                }
            }

            if (episodeInfo) {
                if (episodeInfo.id && episodeInfo.name) {
                    parts.push(episodeInfo.name);
                } else if (episodeInfo.id) {
                    parts.push(`Серия ${episodeInfo.id}`);
                }
            }

            return parts.join(', ');
        }

        buildHeaderText() {
            const title = (document.querySelector(config.selectors.title)?.textContent || '').trim() || 'Без названия';
            const seasonEpisodeText = this.buildSeasonEpisodeText();
            const showTitle = this.displaySettings.showTitle;
            const showSeasonEpisode = this.displaySettings.showSeasonEpisode;

            if (showTitle && showSeasonEpisode && seasonEpisodeText) {
                return `${title} • ${seasonEpisodeText}`;
            }
            if (showTitle) {
                return title;
            }
            if (showSeasonEpisode) {
                return seasonEpisodeText;
            }
            return '';
        }

        buildTimeText(video) {
            if (!video) {
                return '00:00 / --:--';
            }

            const current = this.formatPlaybackTime(video.currentTime);
            const duration = Number.isFinite(video.duration) && video.duration > 0
                ? this.formatPlaybackTime(video.duration)
                : '--:--';
            return `${current} / ${duration}`;
        }

        setOverlayVisible(visible) {
            if (!this.overlay) {
                return;
            }
            this.overlay.classList.toggle('hdw-visible', visible);
        }

        updateOverlay() {
            if (!this.runtimeActive) {
                this.setOverlayVisible(false);
                return;
            }

            this.ensureForCurrentVideo();
            this.ensureOverlayRoot();

            if (!this.overlay || !this.titleNode || !this.timeNode) {
                return;
            }

            const video = this.currentVideo;
            const headerText = this.buildHeaderText();
            const timeText = this.displaySettings.showProgress ? this.buildTimeText(video) : '';

            this.titleNode.textContent = headerText;
            this.timeNode.textContent = timeText;
            this.titleNode.style.display = headerText ? 'block' : 'none';
            this.timeNode.style.display = timeText ? 'block' : 'none';

            this.setOverlayVisible(this.enabled && (headerText || timeText));
        }

        buildButtonTitle() {
            return `Оверлей информации: ${this.enabled ? 'Вкл' : 'Выкл'}`;
        }

        setEnabled(enabled) {
            this.enabled = !!enabled;
            GM_setValue(this.storageKey, this.enabled);
            this.updateButtonState();
            if (this.enabled) {
                this.startRuntime();
            } else {
                this.stopRuntime();
            }
        }

        toggle() {
            this.setEnabled(!this.enabled);
        }

        updateButtonState() {
            const button = document.getElementById('playback-info-overlay-toggle-btn');
            if (!button) {
                this.updatePopupState();
                return;
            }

            button.classList.toggle('hdw-active', this.enabled);
            button.title = this.buildButtonTitle();
            this.updatePopupState();
        }

        updatePopupState() {
            if (this.statusNode) {
                this.statusNode.textContent = this.enabled
                    ? 'Сейчас: оверлей включен'
                    : 'Сейчас: оверлей выключен';
            }

            Object.entries(this.settingButtons).forEach(([settingKey, button]) => {
                const isActive = !!this.displaySettings[settingKey];
                button.classList.toggle('hdw-active', isActive);
                button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
                button.title = '';
            });

            if (this.toggleButton) {
                this.toggleButton.classList.toggle('hdw-active', this.enabled);
                this.toggleButton.textContent = this.enabled
                    ? 'Выключить оверлей'
                    : 'Включить оверлей';
                this.toggleButton.title = this.enabled
                    ? 'Выключить информационный оверлей'
                    : 'Включить информационный оверлей';
            }
        }
    }

    class TranslatorsPanelModule {
        constructor() {
            this.initialized = false;
            this.blockEl = null;
            this.titleEl = null;
            this.listEl = null;
            this.activeNameEl = null;
            this.toggleButtonEl = null;
            this.panelControlEl = null;
            this.panelButtonEl = null;
            this.panelPopupEl = null;
            this.panelCurrentEl = null;
            this.panelListEl = null;
            this.panelPopupController = null;
            this.isExpanded = false;
            this.isTheaterMode = false;
            this.mutationObserver = null;
            this.observerRaf = null;
            this.centerPopupRaf = null;
            this.panelListSignature = '';
            this.panelActiveKey = '';
        }

        init() {
            if (this.initialized) {
                return;
            }

            this.blockEl = document.querySelector('.b-translators__block');
            this.titleEl = this.blockEl?.querySelector('.b-translators__title');
            this.listEl = this.blockEl?.querySelector('#translators-list, .b-translators__list');
            if (!this.blockEl || !this.titleEl || !this.listEl) {
                return;
            }

            this.initialized = true;
            this.enhanceTitle();
            this.ensurePanelControl();
            this.bindEvents();
            this.bindObserver();
            this.setExpanded(false);
        }

        enhanceTitle() {
            if (!this.titleEl || this.titleEl.dataset.hdwEnhanced === '1') {
                return;
            }

            const titleClone = this.titleEl.cloneNode(true);
            titleClone.querySelectorAll('span.b-rgstats__help').forEach((node) => node.remove());
            const titleText = (titleClone.textContent || '')
                .replace(/\s+/g, ' ')
                .trim() || 'Озвучка:';
            this.titleEl.classList.add('hdw-translators-title');
            this.titleEl.textContent = '';

            const titleMain = document.createElement('span');
            titleMain.className = 'hdw-translators-title-main';

            const titleLabel = document.createElement('span');
            titleLabel.className = 'hdw-translators-title-label';
            titleLabel.textContent = titleText;

            const activeName = document.createElement('span');
            activeName.className = 'hdw-translators-active-name';
            this.activeNameEl = activeName;

            const toggleButton = document.createElement('button');
            toggleButton.type = 'button';
            toggleButton.className = 'hdw-translators-toggle-btn';
            this.toggleButtonEl = toggleButton;

            titleMain.appendChild(titleLabel);
            titleMain.appendChild(activeName);
            this.titleEl.appendChild(titleMain);
            this.titleEl.appendChild(toggleButton);
            this.titleEl.dataset.hdwEnhanced = '1';
            this.updateSelectedTranslatorName();
        }

        bindEvents() {
            if (!this.blockEl) {
                return;
            }

            if (this.toggleButtonEl) {
                this.toggleButtonEl.addEventListener('click', () => this.toggleExpanded());
            }

            this.blockEl.addEventListener('click', (event) => {
                const translatorItem = event.target.closest('.b-translator__item');
                if (!translatorItem) {
                    return;
                }

                requestAnimationFrame(() => {
                    this.updateSelectedTranslatorName();
                    this.syncPanelControlState();
                    this.scheduleCenterActiveItemInPopup();
                });
            });
        }

        bindObserver() {
            if (!this.blockEl || this.mutationObserver) {
                return;
            }

            this.mutationObserver = new MutationObserver(() => {
                if (this.observerRaf) {
                    return;
                }

                this.observerRaf = requestAnimationFrame(() => {
                    this.observerRaf = null;
                    this.ensureListReference();
                    this.updateSelectedTranslatorName();
                    this.syncPanelControlState();
                });
            });

            this.mutationObserver.observe(this.blockEl, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'href', 'title']
            });
        }

        ensureListReference() {
            if (!this.blockEl) {
                return;
            }

            const nextListEl = this.blockEl.querySelector('#translators-list, .b-translators__list');
            if (!nextListEl || nextListEl === this.listEl) {
                return;
            }

            this.listEl = nextListEl;
            if (!this.isExpanded) {
                this.listEl.hidden = true;
            }
        }

        getTranslatorItems() {
            if (!this.listEl) {
                return [];
            }

            return Array.from(this.listEl.querySelectorAll('.b-translator__item'));
        }

        findTranslatorItemById(translatorId) {
            const normalizedId = String(translatorId || '').trim();
            if (!normalizedId || !this.blockEl) {
                return null;
            }

            return this.blockEl.querySelector(`.b-translator__item[data-translator_id="${CSS.escape(normalizedId)}"]`);
        }

        findTranslatorItemByKey(optionKey) {
            const normalizedKey = String(optionKey || '').trim();
            if (!normalizedKey || !this.blockEl) {
                return null;
            }

            return this.getTranslatorItems().find((item) => getTranslatorOptionKey(item) === normalizedKey) || null;
        }

        getTranslatorCount() {
            return this.getTranslatorItems().length;
        }

        shouldShowPanelControl() {
            return this.isTheaterMode && this.getTranslatorCount() > 1;
        }

        getActiveTranslatorName() {
            if (!this.blockEl) {
                return 'Не выбрана';
            }

            const activeTranslator = findActiveTranslatorItem(this.blockEl);
            if (!activeTranslator) {
                return 'Не выбрана';
            }

            const name = activeTranslator.textContent.replace(/\s+/g, ' ').trim();
            return name || 'Не выбрана';
        }

        updateSelectedTranslatorName() {
            const activeName = this.getActiveTranslatorName();
            if (this.activeNameEl) {
                this.activeNameEl.textContent = activeName;
            }

            if (this.panelButtonEl) {
                const label = this.panelButtonEl.querySelector('.hdw-translators-button-label');
                if (label) {
                    label.textContent = activeName;
                }
                this.panelButtonEl.title = `Выбрать озвучку. Сейчас: ${activeName}`;
            }

            if (this.panelCurrentEl) {
                this.panelCurrentEl.textContent = `Сейчас: ${activeName}`;
            }
        }

        setExpanded(expanded) {
            if (!this.blockEl || !this.listEl) {
                return;
            }

            this.isExpanded = !!expanded;
            this.blockEl.classList.toggle('hdw-translators-collapsed', !this.isExpanded);
            this.blockEl.classList.toggle('hdw-translators-expanded', this.isExpanded);
            this.listEl.hidden = !this.isExpanded;

            if (this.toggleButtonEl) {
                this.toggleButtonEl.textContent = this.isExpanded ? 'Скрыть' : 'Показать';
                this.toggleButtonEl.setAttribute('aria-expanded', this.isExpanded ? 'true' : 'false');
            }

            this.updateSelectedTranslatorName();
        }

        toggleExpanded() {
            this.setExpanded(!this.isExpanded);
        }

        ensurePanelControl() {
            if (this.panelControlEl) {
                return;
            }

            const panelButtons = ensurePlayerControlsPanel();
            if (!panelButtons) {
                return;
            }

            const button = document.createElement('button');
            button.id = 'player-translators-toggle-btn';
            button.type = 'button';
            button.className = 'hdw-panel-popup-text-trigger';
            button.innerHTML = `${buildSpriteIconMarkup(PANEL_BUTTON_ICON_IDS.translator, 'hdw-translators-button-icon')}<span class="hdw-translators-button-label"></span>`;
            ensurePanelButtonSpriteLoaded();

            const wrapper = document.createElement('div');
            wrapper.className = 'hdw-translators-panel-wrap';
            const popup = this.createPanelPopup();
            wrapper.appendChild(popup);
            wrapper.appendChild(button);

            this.panelControlEl = wrapper;
            this.panelButtonEl = button;
            this.panelPopupEl = popup;
            this.panelPopupController = bindPopupClickToggle(wrapper, button, popup, {
                shouldOpenOnTrigger: () => this.shouldShowPanelControl(),
                onToggle: (opened) => {
                    if (opened) {
                        this.syncPanelControlState({ centerOnOpen: true });
                    }
                }
            });

            mountPanelControl(panelButtons, wrapper, 'primary', 20);
            this.rebuildPanelPopup();
            this.syncPanelControlState();
            this.updateSelectedTranslatorName();
        }

        createPanelPopup() {
            const popup = document.createElement('div');
            popup.id = 'hdw-translators-panel-popup';

            const header = document.createElement('div');
            header.className = 'hdw-translators-panel-header';

            const title = document.createElement('div');
            title.className = 'hdw-translators-panel-title';
            title.textContent = 'Выбор озвучки';

            const current = document.createElement('div');
            current.className = 'hdw-translators-panel-current';

            header.appendChild(title);
            header.appendChild(current);
            popup.appendChild(header);

            const list = document.createElement('div');
            list.className = 'hdw-translators-panel-list';
            popup.appendChild(list);

            this.panelCurrentEl = current;
            this.panelListEl = list;
            return popup;
        }

        rebuildPanelPopup() {
            if (!this.panelListEl) {
                return;
            }

            this.panelListEl.textContent = '';
            this.getTranslatorItems().forEach((translatorItem) => {
                this.panelListEl.appendChild(this.createPanelTranslatorButton(translatorItem));
            });
            this.panelListSignature = this.getTranslatorItems()
                .map((item) => getTranslatorOptionKey(item))
                .join('|');
        }

        getTranslatorListSignature() {
            return this.getTranslatorItems()
                .map((item) => getTranslatorOptionKey(item))
                .join('|');
        }

        createPanelTranslatorButton(sourceItem) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'hdw-translators-panel-item';
            const translatorId = sourceItem.getAttribute('data-translator_id') || '';
            const translatorKey = getTranslatorOptionKey(sourceItem);
            let lastActivationAt = 0;
            button.dataset.translatorId = translatorId;
            button.dataset.translatorKey = translatorKey;
            button.textContent = sourceItem.textContent.replace(/\s+/g, ' ').trim() || 'Без названия';
            button.classList.toggle('hdw-active', translatorKey === getTranslatorOptionKey(findActiveTranslatorItem(this.blockEl)));
            button.title = sourceItem.getAttribute('title') || button.textContent;
            const activateTranslator = (event) => {
                event.preventDefault();
                event.stopPropagation();

                const now = Date.now();
                if (now - lastActivationAt < 350) {
                    return;
                }
                lastActivationAt = now;

                const activeTranslatorKey = getTranslatorOptionKey(findActiveTranslatorItem(this.blockEl));
                if (translatorKey && translatorKey === activeTranslatorKey) {
                    this.panelPopupController?.close();
                    return;
                }

                const currentSourceItem = this.findTranslatorItemByKey(translatorKey)
                    || this.findTranslatorItemById(translatorId)
                    || sourceItem;
                const targetHref = getTranslatorItemHref(currentSourceItem);

                this.panelPopupController?.close();
                if (targetHref) {
                    window.location.assign(targetHref);
                    return;
                }

                currentSourceItem.dispatchEvent(new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                }));
            };

            button.addEventListener('pointerdown', (event) => {
                event.preventDefault();
                event.stopPropagation();
            });
            button.addEventListener('pointerup', activateTranslator);
            button.addEventListener('click', activateTranslator);
            return button;
        }

        scheduleCenterActiveItemInPopup() {
            if (!this.panelPopupController?.isOpen() || !this.panelListEl) {
                return;
            }

            if (this.centerPopupRaf) {
                cancelAnimationFrame(this.centerPopupRaf);
            }

            this.centerPopupRaf = requestAnimationFrame(() => {
                this.centerPopupRaf = null;
                centerActivePanelListItem(this.panelListEl);
            });
        }

        syncPanelControlState(options = {}) {
            if (!this.panelControlEl) {
                return;
            }

            const shouldShow = this.shouldShowPanelControl();
            this.panelControlEl.hidden = !shouldShow;
            if (!shouldShow) {
                this.panelPopupController?.close();
                return;
            }

            const listSignature = this.getTranslatorListSignature();
            const shouldRebuild = !this.panelListEl
                || this.panelListEl.childElementCount !== this.getTranslatorCount()
                || this.panelListSignature !== listSignature;
            if (shouldRebuild) {
                this.rebuildPanelPopup();
            } else {
                this.panelListSignature = listSignature;
            }

            const activeKey = getTranslatorOptionKey(findActiveTranslatorItem(this.blockEl));
            const activeChanged = this.panelActiveKey !== activeKey;
            this.panelActiveKey = activeKey;
            this.panelListEl?.querySelectorAll('.hdw-translators-panel-item').forEach((button) => {
                button.classList.toggle('hdw-active', button.dataset.translatorKey === activeKey);
            });

            if (options.centerOnOpen || activeChanged) {
                this.scheduleCenterActiveItemInPopup();
            }
        }

        setTheaterMode(active) {
            this.isTheaterMode = !!active;
            if (this.isTheaterMode) {
                this.setExpanded(false);
            }
            this.syncPanelControlState();
            this.updateSelectedTranslatorName();
        }
    }

    class SeasonsPanelModule {
        constructor() {
            this.initialized = false;
            this.tabsEl = null;
            this.panelControlEl = null;
            this.panelButtonEl = null;
            this.panelPopupEl = null;
            this.panelCurrentEl = null;
            this.panelListEl = null;
            this.panelPopupController = null;
            this.isTheaterMode = false;
            this.mutationObserver = null;
            this.observerRaf = null;
            this.centerPopupRaf = null;
            this.panelListSignature = '';
            this.panelActiveKey = '';
        }

        init() {
            if (this.initialized) {
                return;
            }

            this.tabsEl = document.getElementById('simple-seasons-tabs');
            if (!this.tabsEl) {
                return;
            }

            this.initialized = true;
            this.ensurePanelControl();
            this.bindEvents();
            this.bindObserver();
            this.syncPanelControlState();
            this.updateSelectedSeasonName();
        }

        bindEvents() {
            if (!this.tabsEl) {
                return;
            }

            this.tabsEl.addEventListener('click', (event) => {
                const seasonItem = event.target.closest('.b-simple_season__item');
                if (!seasonItem) {
                    return;
                }

                requestAnimationFrame(() => {
                    this.updateSelectedSeasonName();
                    this.syncPanelControlState();
                    this.scheduleCenterActiveItemInPopup();
                });
            });
        }

        bindObserver() {
            if (!this.tabsEl || this.mutationObserver) {
                return;
            }

            this.mutationObserver = new MutationObserver(() => {
                if (this.observerRaf) {
                    return;
                }

                this.observerRaf = requestAnimationFrame(() => {
                    this.observerRaf = null;
                    this.ensureTabsReference();
                    this.updateSelectedSeasonName();
                    this.syncPanelControlState();
                });
            });

            this.mutationObserver.observe(this.tabsEl, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'data-tab_id']
            });
        }

        ensureTabsReference() {
            const nextTabsEl = document.getElementById('simple-seasons-tabs');
            if (!nextTabsEl || nextTabsEl === this.tabsEl) {
                return;
            }

            this.tabsEl = nextTabsEl;
        }

        getSeasonItems() {
            if (!this.tabsEl) {
                return [];
            }

            return Array.from(this.tabsEl.querySelectorAll('.b-simple_season__item'));
        }

        findSeasonItemById(seasonId) {
            const normalizedId = String(seasonId || '').trim();
            if (!normalizedId || !this.tabsEl) {
                return null;
            }

            return this.tabsEl.querySelector(`.b-simple_season__item[data-tab_id="${CSS.escape(normalizedId)}"]`);
        }

        findSeasonItemByKey(optionKey) {
            const normalizedKey = String(optionKey || '').trim();
            if (!normalizedKey) {
                return null;
            }

            return this.getSeasonItems().find((item) => getSeasonOptionKey(item) === normalizedKey) || null;
        }

        getSeasonCount() {
            return this.getSeasonItems().length;
        }

        shouldShowPanelControl() {
            return this.isTheaterMode && this.getSeasonCount() > 1;
        }

        getActiveSeasonName() {
            const activeSeason = findActiveSeasonItem(this.tabsEl || document);
            const seasonName = activeSeason?.textContent?.replace(/\s+/g, ' ').trim();
            return seasonName || 'Не выбран';
        }

        updateSelectedSeasonName() {
            const activeName = this.getActiveSeasonName();

            if (this.panelButtonEl) {
                const label = this.panelButtonEl.querySelector('.hdw-seasons-button-label');
                if (label) {
                    label.textContent = activeName;
                }
                this.panelButtonEl.title = `Выбрать сезон. Сейчас: ${activeName}`;
            }

            if (this.panelCurrentEl) {
                this.panelCurrentEl.textContent = `Сейчас: ${activeName}`;
            }
        }

        ensurePanelControl() {
            if (this.panelControlEl) {
                return;
            }

            const panelButtons = ensurePlayerControlsPanel();
            if (!panelButtons) {
                return;
            }

            const button = document.createElement('button');
            button.id = 'player-seasons-toggle-btn';
            button.type = 'button';
            button.className = 'hdw-panel-popup-text-trigger';
            button.innerHTML = '<span class="hdw-seasons-button-label"></span>';

            const wrapper = document.createElement('div');
            wrapper.className = 'hdw-seasons-panel-wrap';
            const popup = this.createPanelPopup();
            wrapper.appendChild(popup);
            wrapper.appendChild(button);

            this.panelControlEl = wrapper;
            this.panelButtonEl = button;
            this.panelPopupEl = popup;
            this.panelPopupController = bindPopupClickToggle(wrapper, button, popup, {
                shouldOpenOnTrigger: () => this.shouldShowPanelControl(),
                onToggle: (opened) => {
                    if (opened) {
                        this.syncPanelControlState({ centerOnOpen: true });
                    }
                }
            });

            mountPanelControl(panelButtons, wrapper, 'primary', 30);
            this.rebuildPanelPopup();
            this.syncPanelControlState();
            this.updateSelectedSeasonName();
        }

        createPanelPopup() {
            const popup = document.createElement('div');
            popup.id = 'hdw-seasons-panel-popup';

            const header = document.createElement('div');
            header.className = 'hdw-translators-panel-header';

            const title = document.createElement('div');
            title.className = 'hdw-translators-panel-title';
            title.textContent = 'Выбор сезона';

            const current = document.createElement('div');
            current.className = 'hdw-translators-panel-current';

            header.appendChild(title);
            header.appendChild(current);
            popup.appendChild(header);

            const list = document.createElement('div');
            list.className = 'hdw-translators-panel-list';
            popup.appendChild(list);

            this.panelCurrentEl = current;
            this.panelListEl = list;
            return popup;
        }

        rebuildPanelPopup() {
            if (!this.panelListEl) {
                return;
            }

            this.panelListEl.textContent = '';
            this.getSeasonItems().forEach((seasonItem) => {
                this.panelListEl.appendChild(this.createPanelSeasonButton(seasonItem));
            });
            this.panelListSignature = this.getSeasonItems()
                .map((item) => getSeasonOptionKey(item))
                .join('|');
        }

        getSeasonListSignature() {
            return this.getSeasonItems()
                .map((item) => getSeasonOptionKey(item))
                .join('|');
        }

        createPanelSeasonButton(sourceItem) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'hdw-translators-panel-item';
            const seasonId = getSeasonItemId(sourceItem);
            const seasonKey = getSeasonOptionKey(sourceItem);
            let lastActivationAt = 0;
            button.dataset.seasonId = seasonId;
            button.dataset.seasonKey = seasonKey;
            button.textContent = sourceItem.textContent.replace(/\s+/g, ' ').trim() || 'Без названия';
            button.classList.toggle('hdw-active', seasonKey === getSeasonOptionKey(findActiveSeasonItem(this.tabsEl || document)));
            button.title = button.textContent;

            const activateSeason = (event) => {
                event.preventDefault();
                event.stopPropagation();

                const now = Date.now();
                if (now - lastActivationAt < 350) {
                    return;
                }
                lastActivationAt = now;

                const activeSeasonKey = getSeasonOptionKey(findActiveSeasonItem(this.tabsEl || document));
                if (seasonKey && seasonKey === activeSeasonKey) {
                    this.panelPopupController?.close();
                    return;
                }

                const currentSourceItem = this.findSeasonItemByKey(seasonKey)
                    || this.findSeasonItemById(seasonId)
                    || sourceItem;

                this.panelPopupController?.close();
                currentSourceItem.dispatchEvent(new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                }));
            };

            button.addEventListener('pointerdown', (event) => {
                event.preventDefault();
                event.stopPropagation();
            });
            button.addEventListener('pointerup', activateSeason);
            button.addEventListener('click', activateSeason);
            return button;
        }

        scheduleCenterActiveItemInPopup() {
            if (!this.panelPopupController?.isOpen() || !this.panelListEl) {
                return;
            }

            if (this.centerPopupRaf) {
                cancelAnimationFrame(this.centerPopupRaf);
            }

            this.centerPopupRaf = requestAnimationFrame(() => {
                this.centerPopupRaf = null;
                centerActivePanelListItem(this.panelListEl);
            });
        }

        syncPanelControlState(options = {}) {
            if (!this.panelControlEl) {
                return;
            }

            const shouldShow = this.shouldShowPanelControl();
            this.panelControlEl.hidden = !shouldShow;
            syncPlayerControlsPanelGroupStarts(this.panelControlEl);
            if (!shouldShow) {
                this.panelPopupController?.close();
                return;
            }

            const listSignature = this.getSeasonListSignature();
            const shouldRebuild = !this.panelListEl
                || this.panelListEl.childElementCount !== this.getSeasonCount()
                || this.panelListSignature !== listSignature;
            if (shouldRebuild) {
                this.rebuildPanelPopup();
            } else {
                this.panelListSignature = listSignature;
            }

            const activeKey = getSeasonOptionKey(findActiveSeasonItem(this.tabsEl || document));
            const activeChanged = this.panelActiveKey !== activeKey;
            this.panelActiveKey = activeKey;
            this.panelListEl?.querySelectorAll('.hdw-translators-panel-item').forEach((button) => {
                button.classList.toggle('hdw-active', button.dataset.seasonKey === activeKey);
            });
            if (options.centerOnOpen || activeChanged) {
                this.scheduleCenterActiveItemInPopup();
            }
        }

        setTheaterMode(active) {
            this.isTheaterMode = !!active;
            this.syncPanelControlState();
            this.updateSelectedSeasonName();
        }
    }

    class EpisodesPanelModule {
        constructor() {
            this.initialized = false;
            this.rootEl = null;
            this.panelControlEl = null;
            this.panelButtonEl = null;
            this.panelPopupEl = null;
            this.panelCurrentEl = null;
            this.panelListEl = null;
            this.panelPopupController = null;
            this.isTheaterMode = false;
            this.mutationObserver = null;
            this.observerRaf = null;
            this.centerEpisodeRaf = null;
            this.panelListSignature = '';
            this.panelActiveKey = '';
        }

        init() {
            if (this.initialized) {
                return;
            }

            this.rootEl = document.getElementById('simple-episodes-tabs');
            if (!this.rootEl) {
                return;
            }

            this.initialized = true;
            this.ensurePanelControl();
            this.bindEvents();
            this.bindObserver();
            this.syncPanelControlState();
            this.updateSelectedEpisodeName();
        }

        bindEvents() {
            if (!this.rootEl) {
                return;
            }

            this.rootEl.addEventListener('click', (event) => {
                const episodeItem = event.target.closest('.b-simple_episode__item');
                if (!episodeItem) {
                    return;
                }

                requestAnimationFrame(() => {
                    this.updateSelectedEpisodeName();
                    this.syncPanelControlState();
                    this.scheduleCenterActiveEpisodeInPopup();
                });
            });
        }

        bindObserver() {
            if (!this.rootEl || this.mutationObserver) {
                return;
            }

            this.mutationObserver = new MutationObserver(() => {
                if (this.observerRaf) {
                    return;
                }

                this.observerRaf = requestAnimationFrame(() => {
                    this.observerRaf = null;
                    this.ensureRootReference();
                    this.updateSelectedEpisodeName();
                    this.syncPanelControlState();
                });
            });

            this.mutationObserver.observe(this.rootEl, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'style', 'data-episode_id', 'data-season_id']
            });
        }

        ensureRootReference() {
            const nextRootEl = document.getElementById('simple-episodes-tabs');
            if (!nextRootEl || nextRootEl === this.rootEl) {
                return;
            }

            this.rootEl = nextRootEl;
        }

        getEpisodeItems() {
            const visibleList = getVisibleEpisodeList(this.rootEl || document);
            if (!visibleList) {
                return [];
            }

            return Array.from(visibleList.querySelectorAll('.b-simple_episode__item'));
        }

        findEpisodeItemByIds(seasonId, episodeId) {
            const normalizedSeasonId = String(seasonId || '').trim();
            const normalizedEpisodeId = String(episodeId || '').trim();
            if (!normalizedEpisodeId || !this.rootEl) {
                return null;
            }

            if (normalizedSeasonId) {
                return this.rootEl.querySelector(`.b-simple_episode__item[data-season_id="${CSS.escape(normalizedSeasonId)}"][data-episode_id="${CSS.escape(normalizedEpisodeId)}"]`);
            }

            return this.rootEl.querySelector(`.b-simple_episode__item[data-episode_id="${CSS.escape(normalizedEpisodeId)}"]`);
        }

        findEpisodeItemByKey(optionKey) {
            const normalizedKey = String(optionKey || '').trim();
            if (!normalizedKey) {
                return null;
            }

            return this.getEpisodeItems().find((item) => getEpisodeOptionKey(item) === normalizedKey) || null;
        }

        getEpisodeCount() {
            return this.getEpisodeItems().length;
        }

        shouldShowPanelControl() {
            return this.isTheaterMode && this.getEpisodeCount() > 1;
        }

        getActiveEpisodeName() {
            const activeEpisode = findActiveEpisodeItem(this.rootEl || document);
            const episodeName = activeEpisode?.textContent?.replace(/\s+/g, ' ').trim();
            return episodeName || 'Не выбрана';
        }

        updateSelectedEpisodeName() {
            const activeName = this.getActiveEpisodeName();

            if (this.panelButtonEl) {
                const label = this.panelButtonEl.querySelector('.hdw-episodes-button-label');
                if (label) {
                    label.textContent = activeName;
                }
                this.panelButtonEl.title = `Выбрать серию. Сейчас: ${activeName}`;
            }

            if (this.panelCurrentEl) {
                this.panelCurrentEl.textContent = `Сейчас: ${activeName}`;
            }
        }

        ensurePanelControl() {
            if (this.panelControlEl) {
                return;
            }

            const panelButtons = ensurePlayerControlsPanel();
            if (!panelButtons) {
                return;
            }

            const button = document.createElement('button');
            button.id = 'player-episodes-toggle-btn';
            button.type = 'button';
            button.className = 'hdw-panel-popup-text-trigger';
            button.innerHTML = '<span class="hdw-episodes-button-label"></span>';

            const wrapper = document.createElement('div');
            wrapper.className = 'hdw-episodes-panel-wrap';
            const popup = this.createPanelPopup();
            wrapper.appendChild(popup);
            wrapper.appendChild(button);

            this.panelControlEl = wrapper;
            this.panelButtonEl = button;
            this.panelPopupEl = popup;
            this.panelPopupController = bindPopupClickToggle(wrapper, button, popup, {
                shouldOpenOnTrigger: () => this.shouldShowPanelControl(),
                onToggle: (opened) => {
                    if (opened) {
                        this.syncPanelControlState({ centerOnOpen: true });
                    }
                }
            });

            mountPanelControl(panelButtons, wrapper, 'primary', 40);
            this.rebuildPanelPopup();
            this.syncPanelControlState();
            this.updateSelectedEpisodeName();
        }

        createPanelPopup() {
            const popup = document.createElement('div');
            popup.id = 'hdw-episodes-panel-popup';

            const header = document.createElement('div');
            header.className = 'hdw-translators-panel-header';

            const title = document.createElement('div');
            title.className = 'hdw-translators-panel-title';
            title.textContent = 'Выбор серии';

            const current = document.createElement('div');
            current.className = 'hdw-translators-panel-current';

            header.appendChild(title);
            header.appendChild(current);
            popup.appendChild(header);

            const list = document.createElement('div');
            list.className = 'hdw-translators-panel-list';
            popup.appendChild(list);

            this.panelCurrentEl = current;
            this.panelListEl = list;
            return popup;
        }

        rebuildPanelPopup() {
            if (!this.panelListEl) {
                return;
            }

            this.panelListEl.textContent = '';
            this.getEpisodeItems().forEach((episodeItem) => {
                this.panelListEl.appendChild(this.createPanelEpisodeButton(episodeItem));
            });
            this.panelListSignature = this.getEpisodeItems()
                .map((item) => getEpisodeOptionKey(item))
                .join('|');
        }

        getEpisodeListSignature() {
            return this.getEpisodeItems()
                .map((item) => getEpisodeOptionKey(item))
                .join('|');
        }

        createPanelEpisodeButton(sourceItem) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'hdw-translators-panel-item';
            const seasonId = sourceItem.getAttribute('data-season_id') || '';
            const episodeId = getEpisodeItemId(sourceItem);
            const episodeKey = getEpisodeOptionKey(sourceItem);
            let lastActivationAt = 0;
            button.dataset.seasonId = seasonId;
            button.dataset.episodeId = episodeId;
            button.dataset.episodeKey = episodeKey;
            button.textContent = sourceItem.textContent.replace(/\s+/g, ' ').trim() || 'Без названия';
            button.classList.toggle('hdw-active', episodeKey === getEpisodeOptionKey(findActiveEpisodeItem(this.rootEl || document)));
            button.title = button.textContent;

            const activateEpisode = (event) => {
                event.preventDefault();
                event.stopPropagation();

                const now = Date.now();
                if (now - lastActivationAt < 350) {
                    return;
                }
                lastActivationAt = now;

                const activeEpisodeKey = getEpisodeOptionKey(findActiveEpisodeItem(this.rootEl || document));
                if (episodeKey && episodeKey === activeEpisodeKey) {
                    this.panelPopupController?.close();
                    return;
                }

                const currentSourceItem = this.findEpisodeItemByKey(episodeKey)
                    || this.findEpisodeItemByIds(seasonId, episodeId)
                    || sourceItem;

                this.panelPopupController?.close();
                currentSourceItem.dispatchEvent(new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                }));
            };

            button.addEventListener('pointerdown', (event) => {
                event.preventDefault();
                event.stopPropagation();
            });
            button.addEventListener('pointerup', activateEpisode);
            button.addEventListener('click', activateEpisode);
            return button;
        }

        scheduleCenterActiveEpisodeInPopup() {
            if (!this.panelPopupController?.isOpen() || !this.panelListEl) {
                return;
            }

            if (this.centerEpisodeRaf) {
                cancelAnimationFrame(this.centerEpisodeRaf);
            }

            this.centerEpisodeRaf = requestAnimationFrame(() => {
                this.centerEpisodeRaf = null;
                this.centerActiveEpisodeInPopup();
            });
        }

        centerActiveEpisodeInPopup() {
            centerActivePanelListItem(this.panelListEl);
        }

        syncPanelControlState(options = {}) {
            if (!this.panelControlEl) {
                return;
            }

            const shouldShow = this.shouldShowPanelControl();
            this.panelControlEl.hidden = !shouldShow;
            syncPlayerControlsPanelGroupStarts(this.panelControlEl);
            if (!shouldShow) {
                this.panelPopupController?.close();
                return;
            }

            const listSignature = this.getEpisodeListSignature();
            const shouldRebuild = !this.panelListEl
                || this.panelListEl.childElementCount !== this.getEpisodeCount()
                || this.panelListSignature !== listSignature;
            if (shouldRebuild) {
                this.rebuildPanelPopup();
            } else {
                this.panelListSignature = listSignature;
            }

            const activeKey = getEpisodeOptionKey(findActiveEpisodeItem(this.rootEl || document));
            const activeChanged = this.panelActiveKey !== activeKey;
            this.panelActiveKey = activeKey;
            this.panelListEl?.querySelectorAll('.hdw-translators-panel-item').forEach((button) => {
                button.classList.toggle('hdw-active', button.dataset.episodeKey === activeKey);
            });
            if (options.centerOnOpen || activeChanged) {
                this.scheduleCenterActiveEpisodeInPopup();
            }
        }

        setTheaterMode(active) {
            this.isTheaterMode = !!active;
            this.syncPanelControlState();
            this.updateSelectedEpisodeName();
        }
    }

    class TheaterModeModule {
        constructor(audioCompressor, videoEffects, playbackInfoOverlay, translatorsPanel, seasonsPanel, episodesPanel) {
            this.audioCompressor = audioCompressor;
            this.videoEffects = videoEffects;
            this.playbackInfoOverlay = playbackInfoOverlay;
            this.translatorsPanel = translatorsPanel;
            this.seasonsPanel = seasonsPanel;
            this.episodesPanel = episodesPanel;
            this.isActive = false;
            const storedAspectRatioMode = GM_getValue(config.aspectRatioStorageKey, '16:9');
            this.aspectRatioMode = this.normalizeAspectRatioMode(storedAspectRatioMode);
            if (storedAspectRatioMode !== this.aspectRatioMode) {
                GM_setValue(config.aspectRatioStorageKey, this.aspectRatioMode);
            }
            this.resizeHandler = null;
            this.mutationObservers = [];
            this.layoutRaf = null;
            this.hotkeysHandler = null;
            this.hiddenSimpleSeasonsTabsByTheater = false;
            this.hiddenSimpleEpisodesTabsByTheater = false;
            this.initialized = false;
        }

        init() {
            if (this.initialized) {
                return;
            }

            this.initialized = true;
            this.ensureBackdrop();
            this.addAspectRatioToggleButton();
            this.addToggleButton();
            this.applyAspectRatioCssVar();
            this.audioCompressor.init();
            this.videoEffects.init();
            try {
                this.playbackInfoOverlay.init();
            } catch (error) {
                debugLog('[PlaybackInfoOverlay] Ошибка инициализации:', error);
            }
            this.translatorsPanel?.init();
            this.seasonsPanel?.init();
            this.episodesPanel?.init();
            this.bindHotkeys();
            this.updateButtonState();
            this.updateAspectRatioButtonState();

        }

        bindHotkeys() {
            if (this.hotkeysHandler) {
                return;
            }

            this.hotkeysHandler = (event) => {
                if (event.key === 'Escape' && this.isActive) {
                    this.disableTheaterMode();
                    return;
                }

                if (isAltHotkey(event, HOTKEYS.theater.code)) {
                    event.preventDefault();
                    this.toggleTheaterMode();
                    return;
                }

                if (isAltHotkey(event, HOTKEYS.compressor.code)) {
                    event.preventDefault();
                    this.toggleAudioCompressor(true);
                    return;
                }

                if (isAltHotkey(event, HOTKEYS.blur.code)) {
                    event.preventDefault();
                    this.toggleBlur();
                    return;
                }

                if (isAltHotkey(event, HOTKEYS.mirror.code)) {
                    event.preventDefault();
                    this.toggleMirror();
                }
            };

            document.addEventListener('keydown', this.hotkeysHandler);
        }

        ensureBackdrop() {
            if (document.getElementById('hdw-theater-backdrop')) {
                return;
            }

            const backdrop = document.createElement('div');
            backdrop.id = 'hdw-theater-backdrop';
            const wrapper = document.getElementById('wrapper');
            if (wrapper) {
                wrapper.appendChild(backdrop);
            } else {
                document.body.appendChild(backdrop);
            }
        }

        addToggleButton() {
            if (document.getElementById('theater-mode-toggle-btn')) {
                return;
            }

            const panelButtons = ensurePlayerControlsPanel();
            if (!panelButtons) {
                return;
            }

            const button = document.createElement('button');
            button.id = 'theater-mode-toggle-btn';
            button.type = 'button';
            applyPanelButtonIcon(button, 'theater');
            button.addEventListener('click', () => this.toggleTheaterMode());
            mountPanelControl(panelButtons, button, 'tertiary', 210);
        }

        addAspectRatioToggleButton() {
            if (document.getElementById('player-aspect-ratio-toggle-btn')) {
                return;
            }

            const panelButtons = ensurePlayerControlsPanel();
            if (!panelButtons) {
                return;
            }

            const button = document.createElement('button');
            button.id = 'player-aspect-ratio-toggle-btn';
            button.type = 'button';
            button.className = 'hdw-panel-popup-text-trigger';
            button.title = `Соотношение сторон плеера: ${this.aspectRatioMode}`;

            const wrapper = document.createElement('div');
            wrapper.className = 'hdw-aspect-ratio-wrap';
            const popup = this.createAspectRatioPopup();
            wrapper.appendChild(popup);
            wrapper.appendChild(button);
            bindPopupClickToggle(wrapper, button, popup);

            mountPanelControl(panelButtons, wrapper, 'secondary', 150);
        }

        normalizeAspectRatioMode(value) {
            if (value === '21:9') {
                return '12:5';
            }

            return ASPECT_RATIO_OPTIONS.some((option) => option.value === value) ? value : '16:9';
        }

        getAspectRatioCssValue() {
            const option = ASPECT_RATIO_OPTIONS.find((item) => item.value === this.aspectRatioMode);
            return option ? option.cssValue : '16 / 9';
        }

        applyAspectRatioCssVar() {
            document.body.style.setProperty('--hdw-player-aspect-ratio', this.getAspectRatioCssValue());
        }

        setAspectRatioMode(nextMode) {
            const normalized = this.normalizeAspectRatioMode(nextMode);
            if (normalized === this.aspectRatioMode) {
                return;
            }

            this.aspectRatioMode = normalized;
            GM_setValue(config.aspectRatioStorageKey, normalized);
            this.applyAspectRatioCssVar();
            if (this.isActive) {
                this.updateTheaterLayoutVars();
            }
            this.updateAspectRatioButtonState();
        }

        createAspectRatioPopup() {
            const popup = document.createElement('div');
            popup.id = 'hdw-aspect-ratio-popup';

            const title = document.createElement('span');
            title.className = 'hdw-aspect-ratio-title';
            title.textContent = 'Режим экрана';
            popup.appendChild(title);

            const options = document.createElement('div');
            options.className = 'hdw-aspect-ratio-options';
            ASPECT_RATIO_OPTIONS.forEach((option) => {
                options.appendChild(this.createAspectRatioOptionButton(option.value, option.label));
            });
            popup.appendChild(options);

            return popup;
        }

        createAspectRatioOptionButton(mode, label) {
            const optionButton = document.createElement('button');
            optionButton.type = 'button';
            optionButton.className = 'hdw-aspect-ratio-option';
            optionButton.dataset.aspectMode = mode;
            optionButton.textContent = label;
            optionButton.addEventListener('click', () => {
                this.setAspectRatioMode(mode);
                optionButton.closest('.hdw-aspect-ratio-wrap')?.classList.remove('hdw-popup-open');
            });
            return optionButton;
        }

        scheduleTheaterLayout() {
            if (!this.isActive) {
                return;
            }

            if (this.layoutRaf) {
                cancelAnimationFrame(this.layoutRaf);
            }

            this.layoutRaf = requestAnimationFrame(() => {
                this.layoutRaf = null;
                this.updateTheaterLayoutVars();
            });
        }

        updateTheaterLayoutVars() {
            if (!this.isActive) {
                return;
            }

            const body = document.body;
            const translatorsBlock = document.querySelector('.b-translators__block');
            const playerBlock = document.querySelector('.hdw-theater-player-block');

            if (!body || !playerBlock) {
                return;
            }

            const topOffset = 10;
            const bottomOffset = 10;
            const gap = 0;
            const translatorsHeight = translatorsBlock
                ? Math.ceil(translatorsBlock.getBoundingClientRect().height || 0)
                : 0;
            const availableHeight = Math.max(
                220,
                Math.floor(window.innerHeight - topOffset - bottomOffset - translatorsHeight - gap * 2)
            );
            const playerInner = playerBlock.querySelector('#cdnplayer-container, #youtubeplayer, #ownplayer');
            const playerRoot = playerBlock.querySelector('#player') || playerBlock;
            const getOuterHeight = (el) => {
                if (!el) return 0;
                const rect = el.getBoundingClientRect();
                const cs = window.getComputedStyle(el);
                const mt = parseFloat(cs.marginTop) || 0;
                const mb = parseFloat(cs.marginBottom) || 0;
                return rect.height + mt + mb;
            };

            let chromeHeight = 0;
            if (playerInner && playerRoot) {
                const rootRect = playerRoot.getBoundingClientRect();
                const innerRect = playerInner.getBoundingClientRect();
                chromeHeight = Math.max(0, Math.round(rootRect.height - innerRect.height));
            }

            Array.from(playerBlock.children).forEach((child) => {
                if (child === playerRoot) {
                    return;
                }

                const cs = window.getComputedStyle(child);
                if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'absolute' || cs.position === 'fixed') {
                    return;
                }

                chromeHeight += getOuterHeight(child);
            });

            const playerBoxHeight = Math.max(120, availableHeight - chromeHeight);

            body.style.setProperty('--hdw-top-offset', `${topOffset}px`);
            body.style.setProperty('--hdw-bottom-offset', `${bottomOffset}px`);
            body.style.setProperty('--hdw-gap', `${gap}px`);
            body.style.setProperty('--hdw-translators-height', `${translatorsHeight}px`);
            body.style.setProperty('--hdw-player-available-height', `${availableHeight}px`);
            body.style.setProperty('--hdw-player-chrome-height', `${chromeHeight}px`);
            body.style.setProperty('--hdw-player-box-height', `${playerBoxHeight}px`);
        }

        bindTheaterLayoutListeners() {
            if (!this.resizeHandler) {
                this.resizeHandler = () => this.scheduleTheaterLayout();
                window.addEventListener('resize', this.resizeHandler);
            }

            this.unbindTheaterLayoutObservers();
            const watchNodes = [
                document.querySelector('.b-translators__block')
            ].filter(Boolean);

            watchNodes.forEach((node) => {
                const observer = new MutationObserver(() => this.scheduleTheaterLayout());
                observer.observe(node, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['class', 'style']
                });
                this.mutationObservers.push(observer);
            });
        }

        unbindTheaterLayoutObservers() {
            this.mutationObservers.forEach((observer) => observer.disconnect());
            this.mutationObservers = [];
        }

        unbindTheaterLayoutListeners() {
            this.unbindTheaterLayoutObservers();
            if (this.resizeHandler) {
                window.removeEventListener('resize', this.resizeHandler);
                this.resizeHandler = null;
            }
            if (this.layoutRaf) {
                cancelAnimationFrame(this.layoutRaf);
                this.layoutRaf = null;
            }
        }

        toggleSimpleSeasonsTabsForTheater(shouldHide) {
            const tabs = document.getElementById('simple-seasons-tabs');
            if (!tabs) {
                return;
            }

            if (shouldHide) {
                if (this.hiddenSimpleSeasonsTabsByTheater) {
                    return;
                }

                tabs.dataset.hdwTheaterPrevDisplay = tabs.style.display || '';
                tabs.style.display = 'none';
                this.hiddenSimpleSeasonsTabsByTheater = true;
                return;
            }

            if (!this.hiddenSimpleSeasonsTabsByTheater) {
                return;
            }

            if (Object.prototype.hasOwnProperty.call(tabs.dataset, 'hdwTheaterPrevDisplay')) {
                tabs.style.display = tabs.dataset.hdwTheaterPrevDisplay;
                delete tabs.dataset.hdwTheaterPrevDisplay;
            } else {
                tabs.style.removeProperty('display');
            }
            this.hiddenSimpleSeasonsTabsByTheater = false;
        }

        toggleSimpleEpisodesTabsForTheater(shouldHide) {
            const tabs = document.getElementById('simple-episodes-tabs');
            if (!tabs) {
                return;
            }

            if (shouldHide) {
                if (this.hiddenSimpleEpisodesTabsByTheater) {
                    return;
                }

                tabs.dataset.hdwTheaterPrevDisplay = tabs.style.display || '';
                tabs.style.display = 'none';
                this.hiddenSimpleEpisodesTabsByTheater = true;
                return;
            }

            if (!this.hiddenSimpleEpisodesTabsByTheater) {
                return;
            }

            if (Object.prototype.hasOwnProperty.call(tabs.dataset, 'hdwTheaterPrevDisplay')) {
                tabs.style.display = tabs.dataset.hdwTheaterPrevDisplay;
                delete tabs.dataset.hdwTheaterPrevDisplay;
            } else {
                tabs.style.removeProperty('display');
            }
            this.hiddenSimpleEpisodesTabsByTheater = false;
        }

        enableTheaterMode() {
            const playerBlock = document.querySelector('#player')?.closest('div[class^="b-post__"]');
            if (!playerBlock) {
                return;
            }

            playerBlock.classList.add('hdw-theater-player-block');
            this.ensureBackdrop();
            document.body.classList.add('hdw-theater-mode');
            this.isActive = true;
            this.translatorsPanel?.setTheaterMode(true);
            this.seasonsPanel?.setTheaterMode(true);
            this.episodesPanel?.setTheaterMode(true);
            this.bindTheaterLayoutListeners();
            this.updateTheaterLayoutVars();
            this.scheduleTheaterLayout();
            setTimeout(() => this.updateTheaterLayoutVars(), 0);
            setTimeout(() => this.updateTheaterLayoutVars(), 120);
            this.toggleSimpleSeasonsTabsForTheater(true);
            this.toggleSimpleEpisodesTabsForTheater(true);
            this.updateButtonState();
        }

        disableTheaterMode() {
            document.body.classList.remove('hdw-theater-mode');
            document.querySelectorAll('.hdw-theater-player-block').forEach((node) => {
                node.classList.remove('hdw-theater-player-block');
            });
            this.isActive = false;
            this.translatorsPanel?.setTheaterMode(false);
            this.seasonsPanel?.setTheaterMode(false);
            this.episodesPanel?.setTheaterMode(false);
            this.unbindTheaterLayoutListeners();
            document.body.style.removeProperty('--hdw-top-offset');
            document.body.style.removeProperty('--hdw-bottom-offset');
            document.body.style.removeProperty('--hdw-gap');
            document.body.style.removeProperty('--hdw-translators-height');
            document.body.style.removeProperty('--hdw-player-available-height');
            document.body.style.removeProperty('--hdw-player-chrome-height');
            document.body.style.removeProperty('--hdw-player-box-height');
            document.body.style.removeProperty('--hdw-player-aspect-ratio');
            this.applyAspectRatioCssVar();
            this.toggleSimpleSeasonsTabsForTheater(false);
            this.toggleSimpleEpisodesTabsForTheater(false);
            this.updateButtonState();
            this.updateAspectRatioButtonState();
        }

        toggleTheaterMode() {
            if (this.isActive) {
                this.disableTheaterMode();
            } else {
                this.enableTheaterMode();
            }
        }

        toggleAudioCompressor(fromUserGesture = false) {
            this.audioCompressor.toggle(fromUserGesture);
        }

        toggleBlur() {
            this.videoEffects.toggleBlur();
        }

        toggleMirror() {
            this.videoEffects.toggleMirror();
        }

        updateButtonState() {
            const button = document.getElementById('theater-mode-toggle-btn');
            if (!button) {
                return;
            }

            button.classList.toggle('hdw-active', this.isActive);
            button.title = `Театральный режим: ${this.isActive ? 'Вкл' : 'Выкл'} (${HOTKEYS.theater.label}, Esc)`;
        }

        updateAspectRatioButtonState() {
            const button = document.getElementById('player-aspect-ratio-toggle-btn');
            if (!button) {
                return;
            }

            button.textContent = this.aspectRatioMode;
            button.title = `Соотношение сторон плеера: ${this.aspectRatioMode}`;

            const popup = document.getElementById('hdw-aspect-ratio-popup');
            if (!popup) {
                return;
            }

            popup.querySelectorAll('.hdw-aspect-ratio-option').forEach((optionButton) => {
                const mode = optionButton.getAttribute('data-aspect-mode');
                optionButton.classList.toggle('hdw-selected', mode === this.aspectRatioMode);
            });
        }
    }

    const translatorsPanel = new TranslatorsPanelModule();
    const seasonsPanel = new SeasonsPanelModule();
    const episodesPanel = new EpisodesPanelModule();

    const playerEnhancements = new TheaterModeModule(
        new AudioCompressorModule(config.compressorStorageKey, config.compressorSettingsStorageKey),
        new VideoEffectsModule(),
        new PlaybackInfoOverlayModule(config.overlayStorageKey, config.overlayDisplayStorageKey),
        translatorsPanel,
        seasonsPanel,
        episodesPanel
    );

    // Интерфейс
    class UI {

        static showModal() {
            if (window.watchlistModal && document.body.contains(window.watchlistModal)) {
                window.watchlistModal.style.display = 'block';
                this.refreshItems();
                return;
            }

            const modal = document.createElement('div');
            modal.id = 'watchlist-modal';
            modal.innerHTML = `
                <div id="watchlist-content">
                    <div class="watchlist-header">
                        <h2>Мой список просмотра</h2>
                        <span class="close-btn">&times;</span>
                    </div>
                    <div class="watchlist-stats">
                        <span>Всего закладок: <span id="watchlist-count">0</span></span>
                        <div id="watchlist-status-summary" class="watchlist-status-summary"></div>
                    </div>
                    <div class="watchlist-controls">
                        <input type="text" id="watchlist-filter" class="watchlist-filter" placeholder="Поиск по названию...">
                        <select id="watchlist-status-filter" class="watchlist-status-filter">
                            <option value="">Все статусы</option>
                            ${LIST_STATE_OPTIONS.map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join('')}
                        </select>
                        <button id="clear-all-btn" class="btn btn-danger">Очистить всё</button>
                    </div>
                    <div id="watchlist-items" style="overflow-y: auto; flex-grow: 1; padding: 0 25px 25px 25px;"></div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Обработчик закрытия модального окна
            const closeBtn = modal.querySelector('.close-btn');
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
                document.body.removeChild(modal);
                if (window.watchlistModal === modal) {
                    window.watchlistModal = null;
                }
            });
            
            // Закрытие по клику вне окна
            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    modal.style.display = 'none';
                    document.body.removeChild(modal);
                    if (window.watchlistModal === modal) {
                        window.watchlistModal = null;
                    }
                }
            });
            
            // Обработчик фильтрации
            const filterInput = modal.querySelector('#watchlist-filter');
            filterInput.addEventListener('input', () => {
                this.renderItems();
            });

            const statusFilter = modal.querySelector('#watchlist-status-filter');
            statusFilter.addEventListener('change', () => {
                this.renderItems();
            });
            
            // Сохраняем ссылку на модальное окно для обновления из других частей кода
            window.watchlistModal = modal;
            
            // Обработчик очистки
            const clearBtn = modal.querySelector('#clear-all-btn');
            clearBtn.addEventListener('click', () => {
                if (confirm('Вы уверены, что хотите удалить все закладки?')) {
                    StorageManager.clearAll();
                    this.renderItems();
                }
            });
            
            // Отображение закладок
            this.renderItems();
            
            modal.style.display = 'block';
        }
        
        static getWatchlistFilters() {
            const filterInput = document.getElementById('watchlist-filter');
            const statusFilter = document.getElementById('watchlist-status-filter');
            return {
                searchText: (filterInput?.value || '').trim(),
                listState: normalizeListState(statusFilter?.value || '', null)
            };
        }

        static renderItems(filter = '') {
            const itemsContainer = document.getElementById('watchlist-items');
            if (!itemsContainer) return;
            ensurePanelButtonSpriteLoaded();
            
            const items = BookmarkManager.getAll();
            let filteredItems = items;
            const activeFilters = this.getWatchlistFilters();
            const searchText = filter || activeFilters.searchText;
            
            if (searchText) {
                filteredItems = items.filter(item => 
                    item.title.toLowerCase().includes(searchText.toLowerCase())
                );
            }

            if (activeFilters.listState) {
                filteredItems = filteredItems.filter((item) => getEffectiveListState(item) === activeFilters.listState);
            }
            
            // Обновление счетчика
            const countElement = document.getElementById('watchlist-count');
            if (countElement) {
                countElement.textContent = items.length;
            }
            this.renderWatchlistStatusSummary(items);
            
            if (filteredItems.length === 0) {
                const hasActiveFilters = !!searchText || !!activeFilters.listState;
                itemsContainer.innerHTML = `
                    <div class="no-bookmarks">
                        <span class="no-bookmarks-icon">📚</span>
                        <p>${hasActiveFilters ? 'Ничего не найдено' : 'Закладок пока нет'}</p>
                        <p>${hasActiveFilters ? 'Попробуйте изменить поиск или фильтр по статусу' : 'Добавьте фильмы или сериалы в закладки, чтобы они появились здесь'}</p>
                    </div>
                `;
                return;
            }
            
            itemsContainer.innerHTML = filteredItems.map(item => {
               // Формируем URL с якорем позиции воспроизведения
               const itemUrl = escapeHtml(buildItemUrlWithAnchor(item));
               const title = escapeHtml(item.title || 'Без названия');
               const year = escapeHtml(item.year || '');
               const description = escapeHtml(item.description || '');
               const shortDescription = description.length > 150 ? `${description.substring(0, 150)}...` : description;
               const addedAt = item.addedAt ? new Date(item.addedAt).toLocaleDateString('ru-RU') : 'неизвестно';
               const dubName = item.dub && item.dub.name ? escapeHtml(item.dub.name) : '';
               const seasonName = item.season && item.season.name ? escapeHtml(item.season.name) : '';
               const episodeName = item.episode && item.episode.name ? escapeHtml(item.episode.name) : '';
               const safeId = escapeHtml(item.id || '');
               const currentListState = getEffectiveListState(item);
               const listStateLabel = escapeHtml(getListStateLabel(currentListState));
                
               return `
                <div class="watchlist-item">
                    <div class="watchlist-item-row">
                        <div class="watchlist-item-content">
                            <a href="${itemUrl}" target="_blank" class="watchlist-title">${title} ${year ? `(${year})` : ''}</a>
                            <div class="watchlist-description">${shortDescription}</div>
                            <div class="watchlist-meta">
                                Добавлено: ${addedAt}
                                | Статус: ${listStateLabel}
                                ${year ? ` | Год: ${year}` : ''}
                                ${item.dub && item.dub.id ? ` | Озвучка: ${dubName}` : ''}
                                ${item.season && item.season.id ? ` | Сезон: ${seasonName}` : ''}
                                ${item.episode && item.episode.id ? ` | Серия: ${episodeName}` : ''}
                                ${item.progress && item.progress.currentTime ? ` | Позиция: ${formatTime(item.progress.currentTime)}` : ''}
                            </div>
                        </div>
                        <div class="watchlist-actions">
                            <div class="watchlist-item-actions">
                                <div class="watchlist-status-actions">
                                    ${LIST_STATE_OPTIONS.map((option) => `
                                        <button
                                            type="button"
                                            data-id="${safeId}"
                                            data-list-state="${escapeHtml(option.value)}"
                                            class="watchlist-status-btn${currentListState === option.value ? ' hdw-active' : ''}"
                                        ><span>${escapeHtml(option.label)}</span></button>
                                    `).join('')}
                                    <button data-id="${safeId}" class="btn btn-danger remove-btn">
                                        <span>Удалить</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `}).join('');

            document.querySelectorAll('.watchlist-status-btn').forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    const nextListState = e.currentTarget.getAttribute('data-list-state');
                    const targetItem = BookmarkManager.getAll().find((item) => item.id === id);
                    if (!targetItem || getEffectiveListState(targetItem) === nextListState) {
                        return;
                    }

                    BookmarkManager.setListState(targetItem.url, nextListState, targetItem);
                    this.renderItems();

                    if (normalizeUrl(window.location.href) === normalizeUrl(targetItem.url)) {
                        this.refreshCurrentPageBookmarkControls();
                        this.syncCurrentPageProgressInfo();
                    }
                });
            });
            
            // Добавляем обработчики событий для кнопок удаления
            document.querySelectorAll('.remove-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    debugLog('[UI] Начало обработки удаления закладки');
                    const id = e.target.getAttribute('data-id');
                    debugLog('[UI] ID удаляемой закладки:', id);
                    
                    // Получаем информацию о закладке до её удаления
                    const itemsBeforeRemove = BookmarkManager.getAll();
                    const currentItemBeforeRemove = itemsBeforeRemove.find(item => item.id === id);
                    debugLog('[UI] Закладка перед удалением:', currentItemBeforeRemove);
                    
                    BookmarkManager.remove(id);
                    this.renderItems();
                    
                    // Проверяем, если удаленная закладка соответствует текущей странице
                    debugLog('[UI] Проверка соответствия URL страницы и закладки');
                    if (currentItemBeforeRemove && normalizeUrl(window.location.href) === normalizeUrl(currentItemBeforeRemove.url)) {
                        debugLog('[UI] URL совпадают, обновляем кнопку');
                        this.refreshCurrentPageBookmarkControls();
                        this.syncCurrentPageProgressInfo();
                        debugLog('[UI] Состояние кнопок страницы и панели обновлено');
                    } else {
                        debugLog('[UI] URL не совпадают или закладка не найдена');
                    }
                });
            });
        }

        static renderWatchlistStatusSummary(items) {
            const summaryElement = document.getElementById('watchlist-status-summary');
            if (!summaryElement) {
                return;
            }

            const counts = LIST_STATE_OPTIONS.map((option) => ({
                option,
                count: items.filter((item) => getEffectiveListState(item) === option.value).length
            })).filter((entry) => entry.count > 0);

            if (counts.length === 0) {
                summaryElement.innerHTML = '';
                return;
            }

            summaryElement.innerHTML = counts.map(({ option, count }) => `
                <span class="watchlist-status-badge">${buildSpriteIconMarkup(option.spriteIconId, 'hdw-inline-state-icon')}<span>${escapeHtml(option.label)}: ${count}</span></span>
            `).join('');
        }
        
        static refreshItems() {
            // Проверяем, открыто ли модальное окно
            const modal = window.watchlistModal || document.getElementById('watchlist-modal');
            if (modal && modal.style.display !== 'none') {
                debugLog('[UI] Обновление списка закладок в модальном окне');
                // Получаем текущее значение фильтра
                const filterInput = document.getElementById('watchlist-filter');
                const filterValue = filterInput ? filterInput.value : '';
                // Перерисовываем элементы
                this.renderItems(filterValue);
            }
        }
        
        static addToggleBtn() {
            // Проверяем, есть ли уже кнопка
            if (document.getElementById('watchlist-toggle-btn')) {
                return;
            }
            
            // Ищем элементы в шапке сайта для размещения кнопки
            const topHeadRight = document.querySelector('.b-tophead-right');
            if (!topHeadRight) {
                // Если не нашли шапку, добавляем в правый верхний угол как раньше
                const button = document.createElement('button');
                button.id = 'watchlist-toggle-btn';
                button.className = 'btn btn-success hdw-watchlist-toggle-floating';
                button.textContent = 'Мой список';
                
                button.addEventListener('click', () => {
                    this.showModal();
                });
                
                document.body.appendChild(button);
                return;
            }
            
            // Создаем кнопку для размещения в шапке
            const button = document.createElement('button');
            button.id = 'watchlist-toggle-btn';
            button.className = 'btn btn-success hdw-watchlist-toggle-header';
            button.textContent = 'Мой список';
            
            button.addEventListener('click', () => {
                this.showModal();
            });
            
            // Добавляем кнопку перед кнопкой входа
            const loginButton = topHeadRight.querySelector('.b-tophead__login');
            if (loginButton) {
                loginButton.parentNode.insertBefore(button, loginButton);
            } else {
                // Если не нашли кнопку входа, добавляем в конец
                topHeadRight.appendChild(button);
            }
        }

        static initTheaterMode() {
            playerEnhancements.init();
        }

        static toggleTheaterMode() {
            playerEnhancements.toggleTheaterMode();
        }

        static toggleAudioCompressor(fromUserGesture = false) {
            playerEnhancements.toggleAudioCompressor(fromUserGesture);
        }

        static buildBookmarkButtonState(listState) {
            const option = getListStateOption(listState);
            if (!option) {
                return {
                    html: '<span class="hdw-page-bookmark-prefix">Мой список</span><span class="hdw-page-bookmark-value">Выбрать статус</span>',
                    title: 'Выбрать статус тайтла в списке',
                    className: ''
                };
            }

            return {
                html: `<span class="hdw-page-bookmark-prefix">Мой список</span><span class="hdw-page-bookmark-value">${escapeHtml(option.label)}</span>`,
                title: `Статус в списке: ${option.label}`,
                className: 'hdw-active'
            };
        }

        static updateBookmarkButton(button, listState) {
            if (!button) {
                return;
            }

            if (button.id === 'player-watchlist-status-btn') {
                const option = getListStateOption(listState);
                applyPanelButtonIcon(button, getListStatePanelIconKey(listState), { offsetLeft: true });
                button.classList.toggle('hdw-active', !!option);
                button.title = option
                    ? `Статус в списке: ${option.label}`
                    : 'Выбрать статус тайтла';
                button.dataset.listState = listState || '';
                button.setAttribute('aria-label', button.title);
                return;
            }

            const state = this.buildBookmarkButtonState(listState);
            button.className = state.className || '';
            button.innerHTML = state.html;
            button.title = state.title;
            button.dataset.listState = listState || '';
            button.setAttribute('aria-label', state.title);
        }

        static getCurrentPageBookmarkData() {
            const movieInfo = MovieParser.parseMovieInfo();
            const existingItem = BookmarkManager.findByUrl(movieInfo.url);
            return {
                ...movieInfo,
                id: existingItem?.id || movieInfo.id || MovieParser.generateId(),
                listState: existingItem?.listState || BookmarkManager.getListState(movieInfo.url) || null
            };
        }

        static refreshCurrentPageBookmarkControls() {
            const currentListState = BookmarkManager.getListState(window.location.href);
            this.updateBookmarkButton(document.getElementById('add-to-watchlist-btn'), currentListState);
            this.updateBookmarkButton(document.getElementById('player-watchlist-status-btn'), currentListState);
        }

        static syncCurrentPageProgressInfo() {
            const contentMain = document.querySelector('.b-content__main');
            const existingProgress = contentMain?.querySelector('[data-hdw-progress-info="true"]');
            const currentItem = BookmarkManager.findByUrl(window.location.href);

            if (!currentItem || !currentItem.progress) {
                existingProgress?.remove();
                return;
            }

            this.addProgressInfo(currentItem);
        }

        static createWatchlistStatusPopup(button, getItemData, options = {}) {
            const popupClassName = options.popupClassName || 'hdw-watchlist-status-popup';
            const wrapper = document.createElement('div');
            wrapper.className = 'hdw-watchlist-status-wrap';

            const popup = document.createElement('div');
            popup.className = popupClassName;

            const header = document.createElement('div');
            header.className = 'hdw-watchlist-status-header';

            const title = document.createElement('div');
            title.className = 'hdw-watchlist-status-title';
            title.textContent = 'Статус в списке';

            const currentStatus = document.createElement('div');
            currentStatus.className = 'hdw-watchlist-status-current';

            header.appendChild(title);
            header.appendChild(currentStatus);
            popup.appendChild(header);

            const list = document.createElement('div');
            list.className = 'hdw-watchlist-status-list';
            ensurePanelButtonSpriteLoaded();

            const refreshPopupState = () => {
                const currentState = BookmarkManager.getListState(window.location.href);
                const currentOption = getListStateOption(currentState);
                popup.querySelectorAll('.hdw-watchlist-status-item').forEach((itemButton) => {
                    itemButton.classList.toggle('hdw-selected', itemButton.dataset.listState === currentState);
                });
                currentStatus.textContent = currentOption
                    ? `Сейчас: ${currentOption.label}`
                    : 'Сейчас: статус не выбран';
                this.updateBookmarkButton(button, currentState);
            };

            LIST_STATE_OPTIONS.forEach((option) => {
                const itemButton = document.createElement('button');
                itemButton.type = 'button';
                itemButton.className = 'hdw-watchlist-status-item';
                itemButton.dataset.listState = option.value;
                itemButton.innerHTML = `
                    ${buildSpriteIconMarkup(option.spriteIconId, 'hdw-watchlist-status-icon')}
                    <span class="hdw-watchlist-status-text">${escapeHtml(option.label)}</span>
                `;
                itemButton.addEventListener('click', () => {
                    const currentState = BookmarkManager.getListState(window.location.href);
                    if (currentState === option.value) {
                        refreshPopupState();
                        popupController.close();
                        return;
                    }

                    const itemData = getItemData();
                    const savedItem = BookmarkManager.setListState(itemData.url, option.value, itemData);
                    if (savedItem) {
                        this.addProgressInfo(savedItem);
                    }
                    refreshPopupState();
                    this.refreshCurrentPageBookmarkControls();
                    this.syncCurrentPageProgressInfo();
                    this.refreshItems();
                    popupController.close();
                });
                list.appendChild(itemButton);
            });

            popup.appendChild(list);

            const actions = document.createElement('div');
            actions.className = 'hdw-watchlist-status-actions';

            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'hdw-watchlist-status-remove';
            removeButton.textContent = 'Убрать из списка';
            removeButton.addEventListener('click', () => {
                const itemData = getItemData();
                const existingItem = BookmarkManager.findByUrl(itemData.url);
                if (!existingItem) {
                    popupController.close();
                    return;
                }

                BookmarkManager.remove(existingItem.id);
                refreshPopupState();
                this.refreshCurrentPageBookmarkControls();
                this.syncCurrentPageProgressInfo();
                this.refreshItems();
                popupController.close();
            });

            actions.appendChild(removeButton);
            popup.appendChild(actions);

            wrapper.appendChild(popup);
            wrapper.appendChild(button);

            const popupController = bindPopupClickToggle(wrapper, button, popup);
            refreshPopupState();
            return wrapper;
        }

        static addPanelBookmarkBtn() {
            if (document.getElementById('player-watchlist-status-btn')) {
                return;
            }

            const panelButtons = ensurePlayerControlsPanel();
            if (!panelButtons) {
                return;
            }

            const button = document.createElement('button');
            button.id = 'player-watchlist-status-btn';
            button.type = 'button';
            applyPanelButtonIcon(button, getListStatePanelIconKey(BookmarkManager.getListState(window.location.href)), { offsetLeft: true });

            const bookmarkControl = this.createWatchlistStatusPopup(
                button,
                () => this.getCurrentPageBookmarkData()
            );
            mountPanelControl(panelButtons, bookmarkControl, 'primary', 10);
            this.refreshCurrentPageBookmarkControls();
        }
        
        static addBookmarkBtn() {
            // Проверяем, есть ли уже кнопка
            if (document.getElementById('add-to-watchlist-btn')) {
                return;
            }
            
            const movieInfo = this.getCurrentPageBookmarkData();
            const existingItem = BookmarkManager.findByUrl(movieInfo.url);
            if (existingItem) {
                movieInfo.id = existingItem.id;
            }
            
            const button = document.createElement('button');
            button.id = 'add-to-watchlist-btn';

            this.updateBookmarkButton(button, BookmarkManager.getListState(movieInfo.url));

            const bookmarkControl = this.createWatchlistStatusPopup(button, () => {
                const freshMovieInfo = this.getCurrentPageBookmarkData();
                return {
                    ...freshMovieInfo,
                    id: freshMovieInfo.id || movieInfo.id
                };
            });
            
            // Находим место для размещения кнопки (в зависимости от структуры страницы)
            const infoTableLeft = document.querySelector('.b-post__infotable_left');
            if (infoTableLeft) {
                infoTableLeft.appendChild(bookmarkControl);
                
                // Добавляем отображение прогресса просмотра
                this.addProgressInfo(existingItem);
            }

            this.refreshCurrentPageBookmarkControls();
        }
        
        static addProgressInfo(item) {
            // Проверяем, есть ли данные о прогрессе
            if (!item || !item.progress) {
                return;
            }
            
            // Ищем контейнер для вставки информации
            const contentMain = document.querySelector('.b-content__main');
            if (!contentMain) {
                return;
            }
            
            // Ищем элемент после которого нужно вставить информацию
            const lastEpisodeOut = contentMain.querySelector('.b-post__lastepisodeout');
            if (!lastEpisodeOut) {
                return;
            }

            const existingProgress = contentMain.querySelector('[data-hdw-progress-info="true"]');
            if (existingProgress) {
                existingProgress.remove();
            }
            
            // Создаем элемент с информацией о прогрессе
            const progressDiv = document.createElement('div');
            progressDiv.className = 'b-post__lastbookmark hdw-progress-bookmark-info';
            progressDiv.dataset.hdwProgressInfo = 'true';

            // Форматируем время
            // Отображаем информацию о прогрессе, если серия есть в закладках
            // Время показываем только если оно действительно есть (не 0)
            let timeString = '';
            if (item.progress.currentTime && !item.progress.isCompleted && item.progress.currentTime > 0) {
                // Если есть время и серия не завершена, отображаем прогресс
                timeString = formatTime(item.progress.currentTime);
            }
            
            // Формируем текст в зависимости от типа контента и доступных данных
            let progressText = 'Вы остановились на ';
            const parts = [];
            
            // Получаем ID для отображения
            const dubId = item.dub && item.dub.id ? parseInt(item.dub.id, 10) : null;
            const seasonId = item.season && item.season.id ? parseInt(item.season.id, 10) : null;
            const episodeId = item.episode && item.episode.id ? parseInt(item.episode.id, 10) : null;
            
            // Добавляем информацию об озвучке, если она есть
            if (dubId !== null) {
                parts.push(`озвучке ${item.dub.name}`);
            }
            
            // Добавляем информацию о сезоне, если она есть
            if (seasonId !== null) {
                parts.push(`${seasonId} сезон`);
            }
            
            // Добавляем информацию о серии, если она есть
            if (episodeId !== null) {
                parts.push(`${episodeId} серия`);
            }
            
            // Если нет частей для отображения, не показываем ничего
            if (parts.length === 0) {
                if (timeString === ''){
                    return;
                }
                parts.push(`время просмотра: ${timeString}`);
            } else {
                 if (timeString !== ''){
                    parts.push(`время просмотра: ${timeString}`);
                }
            }
            
            progressText += parts.join(', ');
            
            const progressTitle = document.createElement('h2');
            progressTitle.textContent = progressText;
            progressDiv.appendChild(progressTitle);
            
            // Вставляем элемент после последнего эпизода
            lastEpisodeOut.parentNode.insertBefore(progressDiv, lastEpisodeOut.nextSibling);
        }
    }

    // Отслеживание событий видео
    class VideoTracker {
        static intervalId = null;
        static currentItemId = null;
        static visibilityHandler = null;
        
        static init() {
            debugLog('[VideoTracker] Инициализация отслеживания видео');
            
            // Проверяем, что мы на странице с плеером
            if (!this.isVideoPage()) {
                debugLog('[VideoTracker] Не является страницей с видео');
                return;
            }
            
            debugLog('[VideoTracker] Страница с видео подтверждена');
            
            // Получаем ID текущего элемента из URL
            const cleanUrl = window.location.href.split('#')[0];
            debugLog('[VideoTracker] Поиск элемента с URL:', cleanUrl);
            
            const currentItem = BookmarkManager.findByUrl(cleanUrl);
            if (!currentItem) {
                debugLog('[VideoTracker] Элемент не найден в закладках');
                return;
            }
            
            debugLog('[VideoTracker] Элемент найден:', currentItem);
            this.currentItemId = currentItem.id;
            this.ensureVisibilityListener();
            
            // Ждем загрузки плеера
            this.waitForPlayer(() => {
                debugLog('[VideoTracker] Плеер загружен');
                const video = document.querySelector('#cdnplayer video');
                if (!video) {
                    debugLog('[VideoTracker] Видео элемент не найден');
                    return;
                }
                
                debugLog('[VideoTracker] Видео элемент найден, добавляем обработчики событий');
                
                // Добавляем обработчики событий
                video.addEventListener('play', () => {
                    debugLog('[VideoTracker] Событие play');
                    this.onPlay();
                });
                video.addEventListener('pause', () => {
                    debugLog('[VideoTracker] Событие pause');
                    this.onPause();
                });
                video.addEventListener('ended', () => {
                    debugLog('[VideoTracker] Событие ended');
                    this.onEnded();
                });
                
                // Запускаем периодическое обновление
                this.startPeriodicUpdate();
            });
        }
        
        static isVideoPage() {
            const isVideoPage = window.location.pathname.includes('/films/') ||
                   window.location.pathname.includes('/series/') ||
                   window.location.pathname.includes('/cartoons/') ||
                   window.location.pathname.includes('/animation/');
            debugLog('[VideoTracker] Проверка страницы видео:', isVideoPage);
            return isVideoPage;
        }
        
        static waitForPlayer(callback) {
            debugLog('[VideoTracker] Ожидание загрузки плеера');
            let attempts = 0;
            const maxAttempts = 50; // 5 секунд максимум
            const interval = setInterval(() => {
                if (document.hidden) {
                    return;
                }
                attempts++;
                debugLog(`[VideoTracker] Попытка ${attempts} поиска плеера`);
                const player = document.querySelector('#cdnplayer video');
                if (player || attempts >= maxAttempts) {
                    clearInterval(interval);
                    if (player) {
                        debugLog('[VideoTracker] Плеер найден');
                        callback();
                    } else {
                        debugLog('[VideoTracker] Плеер не найден после 50 попыток');
                    }
                }
            }, 100);
        }
        
        static onPlay() {
            debugLog('[VideoTracker] Обработка события play');
            if (this.currentItemId) {
                BookmarkManager.updateProgress(this.currentItemId, { isCompleted: false });
            }
            this.updateBookmarkData();
        }
        
        static onPause() {
            debugLog('[VideoTracker] Обработка события pause');
            this.updateBookmarkData();
        }
        
        static onEnded() {
            debugLog('[VideoTracker] Обработка события ended');
            this.updateBookmarkData();
            // Отмечаем как завершенное
            if (this.currentItemId) {
                debugLog('[VideoTracker] Отмечаем как завершенное');
                BookmarkManager.updateProgress(this.currentItemId, { isCompleted: true });
            }
        }
        
        static startPeriodicUpdate() {
            debugLog('[VideoTracker] Запуск периодического обновления');
            if (document.hidden) {
                debugLog('[VideoTracker] Вкладка скрыта, периодическое обновление отложено');
                return;
            }
            // Очищаем предыдущий интервал, если есть
            if (this.intervalId) {
                debugLog('[VideoTracker] Очистка предыдущего интервала');
                clearInterval(this.intervalId);
            }
            
            // Запускаем обновление каждые 10 секунд
            this.intervalId = setInterval(() => {
                if (document.hidden) {
                    return;
                }
                debugLog('[VideoTracker] Периодическое обновление данных');
                // Проверяем, что плеер воспроизводится
                const video = document.querySelector('#cdnplayer video');
                if (video && !video.paused) {
                    this.updateBookmarkData();
                } else {
                    debugLog('[VideoTracker] Плеер не воспроизводится, пропускаем обновление');
                }
            }, 10000);
        }

        static ensureVisibilityListener() {
            if (this.visibilityHandler) {
                return;
            }

            this.visibilityHandler = () => {
                if (document.hidden) {
                    if (this.intervalId) {
                        clearInterval(this.intervalId);
                        this.intervalId = null;
                    }
                    return;
                }

                if (this.currentItemId) {
                    this.startPeriodicUpdate();
                }
            };

            document.addEventListener('visibilitychange', this.visibilityHandler);
        }
        
        static updateBookmarkData() {
            debugLog('[VideoTracker] Обновление данных закладки');
            if (!this.currentItemId) {
                debugLog('[VideoTracker] Нет текущего ID элемента');
                return;
            }
            
            // Проверяем, что текущая страница находится в закладках
            const cleanUrl = window.location.href.split('#')[0];
            const currentItem = BookmarkManager.findByUrl(cleanUrl);
            
            if (!currentItem) {
                debugLog('[VideoTracker] Текущая страница не находится в закладках, обновление не требуется');
                return;
            }
            
            // Получаем текущую информацию об озвучке, сезоне и серии
            debugLog('[VideoTracker] Получение информации об озвучке');
            const dubInfo = MovieParser.parseDubInfo();
            debugLog('[VideoTracker] Информация об озвучке:', dubInfo);
            
            debugLog('[VideoTracker] Получение информации о сезоне');
            const seasonInfo = MovieParser.parseSeasonInfo();
            debugLog('[VideoTracker] Информация о сезоне:', seasonInfo);
            
            debugLog('[VideoTracker] Получение информации о серии');
            const episodeInfo = MovieParser.parseEpisodeInfo();
            debugLog('[VideoTracker] Информация о серии:', episodeInfo);
            
            // Получаем текущее время воспроизведения
            debugLog('[VideoTracker] Получение текущего времени воспроизведения');
            const video = document.querySelector('#cdnplayer video');
            const currentTime = video ? video.currentTime : 0;
            debugLog('[VideoTracker] Текущее время воспроизведения:', currentTime);
            
            // Обновляем данные в закладке
            const updateData = {
                dub: dubInfo,
                season: seasonInfo,
                episode: episodeInfo,
                currentTime: currentTime
            };
            
            debugLog('[VideoTracker] Обновление данных в закладке:', updateData);
            BookmarkManager.updateProgress(this.currentItemId, updateData);
            debugLog('[VideoTracker] Данные закладки обновлены');
        }
    }
    
    // Инициализация скрипта
    async function init() {
        await coreStylesReady;

        // Добавляем кнопку управления закладками
        UI.addToggleBtn();
        
        // Добавляем кнопку добавления в закладки на странице фильма/сериала/аниме
        if (window.location.pathname.includes('/films/') || window.location.pathname.includes('/series/') || window.location.pathname.includes('/cartoons/') || window.location.pathname.includes('/animation/') ) {
            UI.addBookmarkBtn();
            UI.initTheaterMode();
            UI.addPanelBookmarkBtn();
            // Инициализируем отслеживание видео
            VideoTracker.init();
        }
    }

    // Запуск инициализации при загрузке страницы
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            void init();
        });
    } else {
        void init();
    }
    // Тестирование функции отладки
    debugLog('[DEBUG] Скрипт инициализирован, debug =', config.debug);

    }

    global.__HDREZKA_CORE_VERSION__ = HDREZKA_CORE_VERSION;
    global.__HDREZKA_CORE__ = runHdrezkaCore;
})(typeof globalThis !== 'undefined' ? globalThis : window);










