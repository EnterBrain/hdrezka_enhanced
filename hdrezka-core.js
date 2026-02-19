(function (global) {
    'use strict';
    const HDREZKA_CORE_VERSION = '2026.02.19.165106.915-d77f935'; // auto-updated by git hook

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
        overlayStorageKey: 'hdw_playback_overlay_enabled',
        overlayDisplayStorageKey: 'hdw_playback_overlay_display_v1',
        aspectRatioStorageKey: 'hdw_player_aspect_ratio_mode',
        
        // Включенные функции
        features: {
            progressTracking: true,
            dubSelection: true,
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
    
    // Функция для формирования URL с якорем позиции воспроизведения
    function buildItemUrlWithAnchor(item) {
        // Формируем URL с якорем позиции воспроизведения
        let itemUrl = normalizeUrl(item.url);
        
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
            const cleanUrl = url.split('#')[0].split('?')[0];
            
            // Создаем объект URL для парсинга
            const urlObj = new URL(cleanUrl);
            
            // Возвращаем только путь от корня домена
            return urlObj.pathname;
        } catch (error) {
            // Если не удалось распарсить URL, возвращаем оригинальный путь без параметров
            return url.split('#')[0].split('?')[0];
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

    // Стили для интерфейса
    const styles = `
        body.b-theme__template__night .b-post__lastbookmark {
          background: #1f1f1f;
        }
        .b-post__lastbookmark {
          background-color: #e1e289;
          overflow: hidden;
          padding: 10px 36px 10px 47px;
          position: relative;
        }
        .b-post__lastbookmark::before {
          content: "🔖";
          display: block;
          position: absolute;
          left: 13px;
          top: 50%;
          margin-top: -10px;
          width: 23px;
          height: 21px;
          font-size: 18px;
        }
        #watchlist-modal {
            display: none;
            position: fixed;
            z-index: 10000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.7);
            backdrop-filter: blur(3px);
        }
        
        #watchlist-content {
            background-color: #fff;
            border: none;
            width: 85%;
            max-width: 900px;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.3);
            font-family: 'Arial', sans-serif;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            padding: 25px;
            box-sizing: border-box;
        }
        
        /* Темная тема через CSS селекторы */
        body.b-theme__template__night #watchlist-content {
            background-color: #2d2d2d;
            color: #e0e0e0;
        }
        
        .watchlist-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #f0f0f0;
        }
        
        body.b-theme__template__night #watchlist-content .watchlist-header {
            border-bottom: 2px solid #444;
        }
        
        .watchlist-header h2 {
            margin: 0;
            color: #333;
            font-size: 24px;
            font-weight: 600;
        }
        
        body.b-theme__template__night #watchlist-content .watchlist-header h2 {
            color: #e0e0e0;
        }
        
        .watchlist-stats {
            margin-bottom: 20px;
            padding: 12px 15px;
            background-color: #f8f9fa;
            border-radius: 6px;
            font-size: 14px;
            color: #666;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border: 1px solid #e9ecef;
        }
        
        body.b-theme__template__night #watchlist-content .watchlist-stats {
            background-color: #3a3a3a;
            color: #ccc;
            border: 1px solid #555;
        }
        
        .close-btn {
            color: #999;
            float: right;
            font-size: 32px;
            font-weight: normal;
            cursor: pointer;
            transition: all 0.2s ease;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
        }
        
        body.b-theme__template__night #watchlist-content .close-btn {
            color: #aaa;
        }
        
        .close-btn:hover {
            color: #333;
            background-color: #f0f0f0;
            transform: rotate(90deg);
        }
        
        body.b-theme__template__night #watchlist-content .close-btn:hover {
            color: #fff;
            background-color: #555;
        }
        
        .watchlist-item {
            border-bottom: 1px solid #eee;
            padding: 15px 0;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            transition: background-color 0.2s ease;
        }
        
        body.b-theme__template__night #watchlist-content .watchlist-item {
            border-bottom: 1px solid #444;
        }
        
        .watchlist-item:hover {
            background-color: #f9f9f9;
        }
        
        body.b-theme__template__night #watchlist-content .watchlist-item:hover {
            background-color: #3a3a3a;
        }
        
        .watchlist-item:last-child {
            border-bottom: none;
        }
        
        .watchlist-item-row {
            display: flex;
            align-items: flex-start;
            width: 100%;
        }
        
        .watchlist-item-content {
            flex-grow: 1;
            padding-right: 15px;
        }
        
        .watchlist-actions {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            padding-right: 15px;
        }
        
        .watchlist-title {
            font-weight: 600;
            margin-bottom: 8px;
            color: #2c3e50;
            text-decoration: none;
            display: block;
            margin-bottom: 5px;
            word-break: break-word;
            font-size: 18px;
            line-height: 1.3;
        }
        
        body.b-theme__template__night #watchlist-content .watchlist-title {
            color: #64b5f6;
        }
        
        .watchlist-title:hover {
            color: #3498db;
            text-decoration: underline;
        }
        
        body.b-theme__template__night #watchlist-content .watchlist-title:hover {
            color: #90caf9;
        }
        
        .watchlist-description {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
            line-height: 1.5;
            word-break: break-word;
        }
        
        body.b-theme__template__night #watchlist-content .watchlist-description {
            color: #bbb;
        }
        
        .watchlist-meta {
            font-size: 13px;
            color: #999;
            margin-bottom: 8px;
        }
        
        body.b-theme__template__night #watchlist-content .watchlist-meta {
            color: #999;
        }
        
        .btn {
            padding: 8px 12px;
            margin-left: 5px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }
        
        .btn-primary {
            background-color: #3498db;
            color: white;
        }
        
        body.b-theme__template__night #watchlist-content .btn-primary {
            background-color: #1e88e5;
        }
        
        .btn-primary:hover {
            background-color: #2980b9;
            transform: translateY(-1px);
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        body.b-theme__template__night #watchlist-content .btn-primary:hover {
            background-color: #1976d2;
        }
        
        .btn-danger {
            background-color: #e74c3c;
            color: white;
            padding: 8px 10px;
        }
        
        body.b-theme__template__night #watchlist-content .btn-danger {
            background-color: #f44336;
        }
        
        .btn-danger:hover {
            background-color: #c0392b;
            transform: translateY(-1px);
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        body.b-theme__template__night #watchlist-content .btn-danger:hover {
            background-color: #d32f2f;
        }
        
        .btn-success {
            background-color: #2ecc71;
            color: white;
        }
        
        body.b-theme__template__night #watchlist-content .btn-success {
            background-color: #4caf50;
        }
        
        .btn-success:hover {
            background-color: #27ae60;
            transform: translateY(-1px);
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        body.b-theme__template__night #watchlist-content .btn-success:hover {
            background-color: #43a047;
        }
        
        .watchlist-controls {
            margin-bottom: 25px;
            display: flex;
            gap: 15px;
            align-items: center;
        }
        
        .watchlist-filter {
            flex-grow: 1;
            margin-bottom: 0;
            padding: 10px 15px;
            width: auto;
            box-sizing: border-box;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 15px;
            transition: border-color 0.2s ease;
        }
        
        body.b-theme__template__night #watchlist-content .watchlist-filter {
            background-color: #444;
            color: #e0e0e0;
            border: 1px solid #666;
        }
        
        .watchlist-filter:focus {
            outline: none;
            border-color: #3498db;
            box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
        }
        
        body.b-theme__template__night #watchlist-content .watchlist-filter:focus {
            border-color: #64b5f6;
            box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.3);
        }
        
        .watchlist-item-actions {
            display: flex;
            gap: 8px;
        }
        
        .no-bookmarks {
            text-align: center;
            padding: 40px 20px;
            color: #999;
            font-size: 16px;
        }
        
        body.b-theme__template__night #watchlist-content .no-bookmarks {
            color: #aaa;
        }
        
        .no-bookmarks-icon {
            font-size: 48px;
            margin-bottom: 15px;
            display: block;
        }
        
        /* Стили для кнопки "Добавить в закладки" на странице фильма */
        #add-to-watchlist-btn {
            width: 100%;
            background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
            color: white;
            border: none;
            border-radius: 6px;
            padding: 12px 20px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            margin: 15px 0;
            box-shadow: 0 2px 8px rgba(46, 204, 113, 0.3);
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        
        #add-to-watchlist-btn:hover {
            background: linear-gradient(135deg, #27ae60 0%, #219653 100%);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(46, 204, 113, 0.4);
        }
        
        #add-to-watchlist-btn.btn-danger {
            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
            box-shadow: 0 2px 8px rgba(231, 76, 60, 0.3);
        }
        
        #add-to-watchlist-btn.btn-danger:hover {
            background: linear-gradient(135deg, #c0392b 0%, #a93226 100%);
            box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
        }
        
        /* Стили для кнопки "Мой список" в шапке */
        #watchlist-toggle-btn {
            background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
            color: white;
            border: none;
            border-radius: 4px;
            padding: 6px 12px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(52, 152, 219, 0.3);
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 5px;
        }
        
        #watchlist-toggle-btn:hover {
            background: linear-gradient(135deg, #2980b9 0%, #1f618d 100%);
            transform: translateY(-1px);
            box-shadow: 0 3px 6px rgba(52, 152, 219, 0.4);
        }

        .hdw-player-controls-panel-wrapper {
            margin-bottom: 20px;
            position: relative;
            width: 960px;
            margin-left: auto;
            margin-right: auto;
        }

        body.b-theme__template__night .hdw-player-controls-panel {
            background: #1f1f1f;
        }

        .hdw-player-controls-panel {
            display: flex;
            align-items: center;
            justify-content: center;
            background: #e1e289;
            overflow: visible;
            min-height: 50px;
            padding: 0 10px;
            box-sizing: border-box;
        }

        .hdw-player-controls-panel-buttons {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        #theater-mode-toggle-btn {
            background: #2d2d2d;
            color: #a5a5a5;
            border: 0;
            border-radius: 4px;
            transition: background-color .2s linear, color .2s linear, box-shadow .2s linear, filter .2s linear;
            height: 38px;
            margin: 0;
            outline: 0;
            width: 46px;
            font-size: 0;
            cursor: pointer;
            line-height: normal !important;
        }

        #theater-mode-toggle-btn::before {
            content: '⛶';
            display: block;
            font-size: 20px;
            line-height: 38px;
            text-align: center;
        }

        #theater-mode-toggle-btn:hover {
            background: #414141;
            color: #fff;
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
            filter: saturate(1.2);
        }

        #theater-mode-toggle-btn.hdw-active {
            background: #1f618d;
            color: #fff;
        }

        #player-aspect-ratio-toggle-btn {
            background: #2d2d2d;
            color: #a5a5a5;
            border: 0;
            border-radius: 4px;
            transition: background-color .2s linear, color .2s linear, box-shadow .2s linear, filter .2s linear;
            height: 38px;
            margin: 0;
            outline: 0;
            min-width: 64px;
            padding: 0 10px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            line-height: 38px;
        }

        #player-aspect-ratio-toggle-btn:hover {
            background: #414141;
            color: #fff;
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
            filter: saturate(1.2);
        }

        .hdw-aspect-ratio-wrap {
            position: relative;
            display: inline-flex;
            align-items: center;
        }

        #hdw-aspect-ratio-popup {
            position: absolute;
            left: 50%;
            bottom: calc(100% - 1px);
            margin-bottom: 0;
            transform: translateX(-50%);
            min-width: 150px;
            padding: 10px;
            border-radius: 6px;
            background: rgba(12, 12, 12, 0.95);
            color: #e8e8e8;
            box-shadow: 0 8px 18px rgba(0, 0, 0, 0.4);
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
            transition: opacity .15s linear, visibility .15s linear;
            z-index: 90;
        }

        .hdw-aspect-ratio-wrap:hover #hdw-aspect-ratio-popup,
        .hdw-aspect-ratio-wrap:focus-within #hdw-aspect-ratio-popup,
        .hdw-aspect-ratio-wrap.hdw-popup-open #hdw-aspect-ratio-popup {
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
        }

        .hdw-aspect-ratio-title {
            display: block;
            margin-bottom: 6px;
            color: #fff;
            font-size: 12px;
            font-weight: 600;
        }

        .hdw-aspect-ratio-options {
            display: grid;
            gap: 6px;
        }

        .hdw-aspect-ratio-option {
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            background: rgba(255, 255, 255, 0.06);
            color: #fff;
            padding: 5px 8px;
            cursor: pointer;
            font-size: 12px;
            line-height: 1.2;
            text-align: center;
        }

        .hdw-aspect-ratio-option:hover {
            background: rgba(255, 255, 255, 0.18);
        }

        .hdw-aspect-ratio-option.hdw-selected {
            border-color: #1f618d;
            background: #1f618d;
        }

        #audio-compressor-toggle-btn {
            background: #2d2d2d;
            color: #a5a5a5;
            border: 0;
            border-radius: 4px;
            transition: background-color .2s linear, color .2s linear, box-shadow .2s linear, filter .2s linear;
            height: 38px;
            margin: 0;
            outline: 0;
            width: 46px;
            font-size: 0;
            cursor: pointer;
            line-height: normal !important;
        }

        #audio-compressor-toggle-btn::before {
            content: 'C';
            display: block;
            font-size: 18px;
            font-weight: 700;
            line-height: 38px;
            text-align: center;
        }

        #audio-compressor-toggle-btn:hover {
            background: #414141;
            color: #fff;
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
            filter: saturate(1.2);
        }

        #audio-compressor-toggle-btn.hdw-active {
            background: #1f618d;
            color: #fff;
        }

        #video-blur-toggle-btn,
        #video-mirror-toggle-btn {
            background: #2d2d2d;
            color: #a5a5a5;
            border: 0;
            border-radius: 4px;
            transition: background-color .2s linear, color .2s linear, box-shadow .2s linear, filter .2s linear;
            height: 38px;
            margin: 0;
            outline: 0;
            width: 46px;
            font-size: 0;
            cursor: pointer;
            line-height: normal !important;
        }

        #video-blur-toggle-btn::before {
            content: 'Р';
            display: block;
            font-size: 17px;
            font-weight: 700;
            line-height: 38px;
            text-align: center;
        }

        #video-mirror-toggle-btn::before {
            content: 'З';
            display: block;
            font-size: 17px;
            font-weight: 700;
            line-height: 38px;
            text-align: center;
        }

        #video-blur-toggle-btn:hover,
        #video-mirror-toggle-btn:hover {
            background: #414141;
            color: #fff;
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
            filter: saturate(1.2);
        }

        #video-blur-toggle-btn.hdw-active,
        #video-mirror-toggle-btn.hdw-active {
            background: #1f618d;
            color: #fff;
        }

        #playback-info-overlay-toggle-btn {
            background: #2d2d2d;
            color: #a5a5a5;
            border: 0;
            border-radius: 4px;
            transition: background-color .2s linear, color .2s linear, box-shadow .2s linear, filter .2s linear;
            height: 38px;
            margin: 0;
            outline: 0;
            width: 46px;
            font-size: 0;
            cursor: pointer;
            line-height: normal !important;
        }

        #playback-info-overlay-toggle-btn::before {
            content: 'О';
            display: block;
            font-size: 17px;
            font-weight: 700;
            line-height: 38px;
            text-align: center;
        }

        #playback-info-overlay-toggle-btn:hover {
            background: #414141;
            color: #fff;
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
            filter: saturate(1.2);
        }

        #playback-info-overlay-toggle-btn.hdw-active {
            background: #1f618d;
            color: #fff;
        }

        .hdw-overlay-toggle-wrap {
            position: relative;
            display: inline-flex;
            align-items: center;
        }

        #hdw-overlay-settings-popup {
            position: absolute;
            left: 50%;
            bottom: calc(100% - 1px);
            margin-bottom: 0;
            transform: translateX(-50%);
            min-width: 160px;
            width: max-content;
            padding: 10px 12px;
            border-radius: 6px;
            background: rgba(12, 12, 12, 0.95);
            color: #e8e8e8;
            box-shadow: 0 8px 18px rgba(0, 0, 0, 0.4);
            font-size: 12px;
            line-height: 1.35;
            white-space: nowrap;
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
            transition: opacity .15s linear, visibility .15s linear;
            z-index: 90;
        }

        .hdw-overlay-toggle-wrap:hover #hdw-overlay-settings-popup,
        .hdw-overlay-toggle-wrap:focus-within #hdw-overlay-settings-popup,
        .hdw-overlay-toggle-wrap.hdw-popup-open #hdw-overlay-settings-popup {
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
        }

        #hdw-overlay-settings-popup .hdw-overlay-settings-title {
            display: block;
            margin-bottom: 6px;
            color: #fff;
            font-weight: 600;
        }

        #hdw-overlay-settings-popup .hdw-overlay-settings-item {
            display: flex;
            align-items: center;
            gap: 7px;
            cursor: pointer;
            user-select: none;
        }

        #hdw-overlay-settings-popup .hdw-overlay-settings-item + .hdw-overlay-settings-item {
            margin-top: 5px;
        }

        #hdw-overlay-settings-popup .hdw-overlay-settings-item input[type="checkbox"] {
            margin: 0;
            accent-color: #1f618d;
        }

        #hdw-playback-info-overlay {
            position: absolute;
            left: 16px;
            top: 14px;
            z-index: 40;
            max-width: calc(100% - 32px);
            padding: 0;
            border-radius: 0;
            background: transparent;
            color: #ccc;
            font-family: Roboto, Verdana, Arial, sans-serif;
            pointer-events: none;
            opacity: 0;
            transform: translateY(-4px);
            transition: opacity .15s linear, transform .15s linear;
            white-space: normal;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        #hdw-playback-info-overlay.hdw-visible {
            opacity: 0.7 !important;
            transform: translateY(0);
        }

        #hdw-playback-info-overlay .hdw-overlay-title {
            display: block;
            font-size: 16px;
            font-weight: 700;
            line-height: 1.25;
            letter-spacing: 0.2px;
            color: #f2f2f2;
            text-shadow:
                0 1px 2px rgba(0, 0, 0, 0.95),
                1px 0 0 rgba(0, 0, 0, 0.8),
                -1px 0 0 rgba(0, 0, 0, 0.8),
                0 1px 0 rgba(0, 0, 0, 0.8),
                0 -1px 0 rgba(0, 0, 0, 0.8),
                0 0 8px rgba(0, 0, 0, 0.7);
        }

        #hdw-playback-info-overlay .hdw-overlay-time {
            display: block;
            margin-top: 4px;
            font-size: 13px;
            font-weight: 500;
            line-height: 1.3;
            color: #e0e0e0;
            text-shadow:
                0 1px 2px rgba(0, 0, 0, 0.95),
                1px 0 0 rgba(0, 0, 0, 0.8),
                -1px 0 0 rgba(0, 0, 0, 0.8),
                0 0 6px rgba(0, 0, 0, 0.65);
        }

        .hdw-video-blur {
            filter: blur(50px) !important;
        }

        .hdw-video-mirror {
            transform: scaleX(-1) !important;
            transform-origin: center !important;
        }

        .b-translators__title.hdw-translators-title {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
        }

        .hdw-translators-title-main {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            min-width: 0;
        }

        .hdw-translators-active-name {
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: min(60vw, 620px);
        }

        .hdw-translators-toggle-btn {
            margin-left: auto;
            padding: 2px 8px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 3px;
            background: rgba(0, 0, 0, 0.25);
            color: inherit;
            cursor: pointer;
            line-height: 1.2;
            font-size: 12px;
        }

        body.b-theme__template__night .hdw-translators-toggle-btn {
            border-color: rgba(255, 255, 255, 0.35);
            background: rgba(255, 255, 255, 0.07);
        }

        .b-translators__block.hdw-translators-collapsed #translators-list,
        .b-translators__block.hdw-translators-collapsed .b-translators__list {
            display: none !important;
        }

        body.hdw-theater-mode {
            overflow: hidden !important;
            --hdw-top-offset: 10px;
            --hdw-bottom-offset: 10px;
            --hdw-gap: 0px;
            --hdw-translators-height: 52px;
            --hdw-player-available-height: calc(100vh - var(--hdw-top-offset) - var(--hdw-bottom-offset) - var(--hdw-translators-height) - var(--hdw-gap) * 2);
            --hdw-player-chrome-height: 48px;
            --hdw-player-box-height: calc(var(--hdw-player-available-height) - var(--hdw-player-chrome-height));
            --hdw-player-aspect-ratio: 16 / 9;
        }

        #hdw-theater-backdrop {
            position: fixed;
            inset: 0;
            z-index: 5500;
            background: rgba(9, 22, 28, 0.88);
            display: none;
        }

        body.hdw-theater-mode #hdw-theater-backdrop {
            display: block;
        }

        body.hdw-theater-mode .b-translators__block {
            position: fixed !important;
            top: var(--hdw-top-offset) !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            width: 96vw !important;
            margin: 0 !important;
            z-index: 6001 !important;
            box-sizing: border-box;
            max-height: 30vh;
            overflow-y: auto;
        }

        body.hdw-theater-mode .hdw-theater-player-block {
            position: fixed !important;
            top: calc(var(--hdw-top-offset) + var(--hdw-translators-height) + var(--hdw-gap)) !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            width: 96vw !important;
            margin: 0 !important;
            z-index: 6000 !important;
            box-sizing: border-box;
            height: var(--hdw-player-available-height) !important;
            overflow: hidden;
        }

        body.hdw-theater-mode .hdw-theater-player-block > .b-player {
            padding-top: 0 !important;
        }

        body.hdw-theater-mode .hdw-player-controls-panel-wrapper {
            position: static !important;
            transform: none !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            z-index: auto !important;
        }

        body.hdw-theater-mode #cdnplayer-container,
        body.hdw-theater-mode #youtubeplayer,
        body.hdw-theater-mode #ownplayer {
            width: min(100%, calc(var(--hdw-player-box-height) * var(--hdw-player-aspect-ratio))) !important;
            max-width: 100% !important;
            max-height: var(--hdw-player-box-height) !important;
            height: var(--hdw-player-box-height) !important;
            margin: 0 auto !important;
        }

        body.hdw-theater-mode #cdnplayer-container > #cdnplayer,
        body.hdw-theater-mode #cdnplayer-container > #cdnplayer-preloader,
        body.hdw-theater-mode #ownplayer > #videoplayer,
        body.hdw-theater-mode #ownplayer > #videoplayer > iframe {
            min-width: 0 !important;
            min-height: 0 !important;
            width: 100% !important;
            height: 100% !important;
        }

        body.hdw-theater-mode .hdw-theater-player-block > #player > #user-network-issues {
            display: none !important;
        }

        body.hdw-theater-mode .b-post__support_holder {
            display: none !important;
        }

        .b-player__restricted {
            height: 540px !important;
            width: 960px !important;
        }
        
        /* Адаптивность */
        @media (max-width: 768px) {
            #watchlist-content {
                width: 95%;
                padding: 15px;
                margin: 3% auto;
            }
            
            .watchlist-header h2 {
                font-size: 20px;
            }
            
            .watchlist-controls {
                flex-direction: column;
                align-items: stretch;
            }
            
            .watchlist-filter {
                margin-bottom: 10px;
            }
            
            .watchlist-item {
                flex-direction: column;
            }
            
            .watchlist-actions {
                width: 100%;
                margin-top: 10px;
                justify-content: flex-end;
            }
        }
        
        @media (max-width: 480px) {
            .watchlist-item-content {
                padding-right: 0;
            }
            
            .watchlist-title {
                font-size: 16px;
            }
            
            .btn {
                padding: 6px 8px;
                font-size: 13px;
            }
        }

        div:has(> #vk_groups) {
            display: none !important;
        }

        .b-content__columns.pdt {
            padding-right: 0px !important;
        }

        #cdnplayer-container {
            width: 960px !important;
            height: 540px !important;
        }

        #cdnplayer-container > #cdnplayer, #cdnplayer-container > #cdnplayer-preloader {
            width: 100% !important;
            height: 100% !important;
            aspect-ratio: 16 / 9;
            min-width: 960px !important;
            min-height: 540px !important;
        }

        #youtubeplayer {
            width: 960px !important;
            height: 540px !important;
        }

        #ownplayer {
            width: 960px !important;
            height: 540px !important;
        }

        #ownplayer > #videoplayer {
            width: 100% !important;
            height: 100% !important;
            aspect-ratio: 16 / 9;
            min-width: 960px !important;
            min-height: 540px !important;
        }

        #ownplayer > #videoplayer > iframe {
            width: 100% !important;
            height: 100% !important;
            aspect-ratio: 16 / 9;
            min-width: 960px !important;
            min-height: 540px !important;
        }

    `;
    
    function applyCoreStyles(cssText) {
        if (!cssText) {
            return;
        }

        if (typeof GM_addStyle === 'function') {
            GM_addStyle(cssText);
            return;
        }

        const fallbackStyleId = 'hdw-core-style-fallback';
        if (document.getElementById(fallbackStyleId)) {
            return;
        }

        const styleEl = document.createElement('style');
        styleEl.id = fallbackStyleId;
        styleEl.type = 'text/css';
        styleEl.textContent = cssText;
        (document.head || document.documentElement).appendChild(styleEl);
    }

    applyCoreStyles(styles);

    // Хранилище данных
    class StorageManager {
        static getKey() {
            return config.storageKey;
        }

        static normalizeItems(rawValue) {
            if (Array.isArray(rawValue)) {
                return rawValue;
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
                        return values;
                    }
                }
            }

            return [];
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
            const activeDubElement = document.querySelector('.b-translator__item.active');
            debugLog('[MovieParser] Активный элемент озвучки:', activeDubElement);
            
            if (activeDubElement) {
                const dubInfo = {
                    id: activeDubElement.getAttribute('data-translator_id'),
                    name: activeDubElement.textContent.trim()
                };
                debugLog('[MovieParser] Информация об озвучке получена:', dubInfo);
                return dubInfo;
            }
            
            // Если не удалось получить информацию об озвучке, возвращаем значения по умолчанию
            debugLog('[MovieParser] Информация об озвучке не найдена, возвращаем значения по умолчанию');
            return {
                id: null,
                name: 'Не выбрана'
            };
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
        
        static add(item) {
            const items = this.getAll();
            // Используем нормализованный URL для проверки существования закладки
            const normalizedUrl = normalizeUrl(item.url);
            const existingIndex = items.findIndex(existingItem => normalizeUrl(existingItem.url) === normalizedUrl);
            
            if (existingIndex !== -1) {
                // Если закладка уже существует, обновляем её
                items[existingIndex] = item;
            } else {
                // Если закладка новая, добавляем её
                items.push(item);
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

    class AudioCompressorModule {
        constructor(storageKey) {
            this.storageKey = storageKey;
            this.enabled = GM_getValue(storageKey, false);
            this.states = new WeakMap();
            this.currentVideo = null;
            this.observer = null;
            this.videoEvents = null;
            this.initialized = false;
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
            button.addEventListener('click', () => this.toggle(true));

            panelButtons.insertBefore(button, panelButtons.firstChild);
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
            const video = this.getCurrentVideoElement();
            if (!video || video === this.currentVideo) {
                return;
            }

            this.currentVideo = video;
            this.bindVideoEvents(video);
            const state = this.getOrCreateState(video);
            if (!state) {
                this.updateButtonState('Компрессор недоступен для этого видео');
                return;
            }

            this.applyState(state, this.enabled, false);
            this.updateButtonState();
        }

        bindVideoEvents(video) {
            if (this.videoEvents) {
                const { video: prevVideo, handler } = this.videoEvents;
                prevVideo.removeEventListener('play', handler);
                prevVideo.removeEventListener('canplay', handler);
            }

            const handler = () => {
                const state = this.getOrCreateState(video);
                if (!state || !this.enabled) {
                    return;
                }
                this.applyState(state, true, false);
                this.tryResumeAudioContext(state.ctx, false);
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
            if (!AudioContextCtor || typeof DynamicsCompressorNode === 'undefined') {
                return null;
            }

            try {
                const ctx = new AudioContextCtor();
                const source = new MediaElementAudioSourceNode(ctx, { mediaElement: video });
                const compressor = new DynamicsCompressorNode(ctx, {
                    threshold: -50,
                    knee: 40,
                    ratio: 12,
                    attack: 0,
                    release: 0.25
                });

                source.connect(ctx.destination);
                const state = { ctx, source, compressor, isActive: false };
                this.states.set(video, state);
                return state;
            } catch (error) {
                debugLog('[AudioCompressor] Ошибка инициализации:', error);
                return null;
            }
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
                    state.source.connect(state.compressor);
                    state.compressor.connect(state.ctx.destination);
                    state.isActive = true;
                }
                this.tryResumeAudioContext(state.ctx, fromUserGesture);
            } else if (state.isActive) {
                this.disconnectSafe(state.source, state.compressor);
                this.disconnectSafe(state.compressor, state.ctx.destination);
                this.disconnectSafe(state.source, state.ctx.destination);
                state.source.connect(state.ctx.destination);
                state.isActive = false;
            }
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

            this.ensureForCurrentVideo();
            const state = this.currentVideo ? this.getOrCreateState(this.currentVideo) : null;
            if (state) {
                this.applyState(state, this.enabled, fromUserGesture);
                if (this.enabled && state.ctx.state === 'suspended' && !fromUserGesture) {
                    this.updateButtonState('Требуется клик по плееру/кнопке');
                    return;
                }
            }

            this.updateButtonState();
        }

        toggle(fromUserGesture = false) {
            this.setEnabled(!this.enabled, fromUserGesture);
        }

        buildButtonTitle(extraStatus = '') {
            const suffix = extraStatus ? ` - ${extraStatus}` : '';
            return `Аудио компрессор: ${this.enabled ? 'Вкл' : 'Выкл'}${suffix} (${HOTKEYS.compressor.label})`;
        }

        updateButtonState(extraStatus = '') {
            const button = document.getElementById('audio-compressor-toggle-btn');
            if (!button) {
                return;
            }

            button.classList.toggle('hdw-active', this.enabled);
            button.title = this.buildButtonTitle(extraStatus);
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
                mirrorButton.addEventListener('click', () => this.toggleMirror());
                panelButtons.insertBefore(mirrorButton, panelButtons.firstChild);
            }

            if (!document.getElementById('video-blur-toggle-btn')) {
                const blurButton = document.createElement('button');
                blurButton.id = 'video-blur-toggle-btn';
                blurButton.type = 'button';
                blurButton.addEventListener('click', () => this.toggleBlur());
                panelButtons.insertBefore(blurButton, panelButtons.firstChild);
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
            button.addEventListener('click', () => this.toggle());

            const wrapper = document.createElement('div');
            wrapper.className = 'hdw-overlay-toggle-wrap';

            const settingsPopup = this.createSettingsPopup();
            wrapper.appendChild(settingsPopup);
            wrapper.appendChild(button);
            bindPopupHoverPersistence(wrapper, settingsPopup);

            panelButtons.insertBefore(wrapper, panelButtons.firstChild);
        }

        createSettingsPopup() {
            const popup = document.createElement('div');
            popup.id = 'hdw-overlay-settings-popup';

            const title = document.createElement('span');
            title.className = 'hdw-overlay-settings-title';
            title.textContent = 'Показывать в оверлее';
            popup.appendChild(title);

            popup.appendChild(this.createSettingsToggle('showTitle', 'Название тайтла'));
            popup.appendChild(this.createSettingsToggle('showSeasonEpisode', 'Сезон и серия'));
            popup.appendChild(this.createSettingsToggle('showProgress', 'Прогресс просмотра'));

            return popup;
        }

        createSettingsToggle(settingKey, labelText) {
            const label = document.createElement('label');
            label.className = 'hdw-overlay-settings-item';

            const input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = !!this.displaySettings[settingKey];
            input.addEventListener('change', () => {
                this.updateDisplaySetting(settingKey, input.checked);
            });

            const text = document.createElement('span');
            text.textContent = labelText;

            label.appendChild(input);
            label.appendChild(text);
            return label;
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
                return;
            }

            button.classList.toggle('hdw-active', this.enabled);
            button.title = this.buildButtonTitle();
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
            this.isExpanded = false;
            this.isTheaterMode = false;
            this.mutationObserver = null;
            this.observerRaf = null;
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
            this.bindEvents();
            this.bindObserver();
            this.setExpanded(false);
        }

        enhanceTitle() {
            if (!this.titleEl || this.titleEl.dataset.hdwEnhanced === '1') {
                return;
            }

            const titleText = this.titleEl.textContent.replace(/\s+/g, ' ').trim() || 'Озвучка:';
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
                if (!event.target.closest('.b-translator__item')) {
                    return;
                }

                requestAnimationFrame(() => this.updateSelectedTranslatorName());
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
                });
            });

            this.mutationObserver.observe(this.blockEl, {
                childList: true,
                subtree: true
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

        getActiveTranslatorName() {
            if (!this.blockEl) {
                return 'Не выбрана';
            }

            const activeTranslator = this.blockEl.querySelector('.b-translator__item.active');
            if (!activeTranslator) {
                return 'Не выбрана';
            }

            const name = activeTranslator.textContent.replace(/\s+/g, ' ').trim();
            return name || 'Не выбрана';
        }

        updateSelectedTranslatorName() {
            if (!this.activeNameEl) {
                return;
            }

            this.activeNameEl.textContent = this.getActiveTranslatorName();
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

        setTheaterMode(active) {
            this.isTheaterMode = !!active;
            if (this.isTheaterMode) {
                this.setExpanded(false);
            }
        }
    }

    class TheaterModeModule {
        constructor(audioCompressor, videoEffects, playbackInfoOverlay, translatorsPanel) {
            this.audioCompressor = audioCompressor;
            this.videoEffects = videoEffects;
            this.playbackInfoOverlay = playbackInfoOverlay;
            this.translatorsPanel = translatorsPanel;
            this.isActive = false;
            this.aspectRatioMode = this.normalizeAspectRatioMode(GM_getValue(config.aspectRatioStorageKey, '16:9'));
            this.resizeHandler = null;
            this.mutationObservers = [];
            this.layoutRaf = null;
            this.hotkeysHandler = null;
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
            button.addEventListener('click', () => this.toggleTheaterMode());

            panelButtons.appendChild(button);
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
            button.title = `Соотношение сторон плеера: ${this.aspectRatioMode}`;

            const wrapper = document.createElement('div');
            wrapper.className = 'hdw-aspect-ratio-wrap';

            const popup = this.createAspectRatioPopup();
            wrapper.appendChild(popup);
            wrapper.appendChild(button);
            bindPopupHoverPersistence(wrapper, popup);

            panelButtons.appendChild(wrapper);
        }

        normalizeAspectRatioMode(value) {
            return value === '21:9' ? '21:9' : '16:9';
        }

        getAspectRatioCssValue() {
            return this.aspectRatioMode === '21:9' ? '21 / 9' : '16 / 9';
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
            options.appendChild(this.createAspectRatioOptionButton('16:9'));
            options.appendChild(this.createAspectRatioOptionButton('21:9'));
            popup.appendChild(options);

            return popup;
        }

        createAspectRatioOptionButton(mode) {
            const optionButton = document.createElement('button');
            optionButton.type = 'button';
            optionButton.className = 'hdw-aspect-ratio-option';
            optionButton.dataset.aspectMode = mode;
            optionButton.textContent = mode;
            optionButton.addEventListener('click', () => this.setAspectRatioMode(mode));
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

            if (!body || !translatorsBlock || !playerBlock) {
                return;
            }

            const topOffset = 10;
            const bottomOffset = 10;
            const gap = 0;
            const translatorsHeight = Math.ceil(translatorsBlock.getBoundingClientRect().height || 0);
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

        enableTheaterMode() {
            const translatorsBlock = document.querySelector('.b-translators__block');
            const playerBlock = document.querySelector('#player')?.closest('div[class^="b-post__"]');
            if (!translatorsBlock || !playerBlock) {
                return;
            }

            playerBlock.classList.add('hdw-theater-player-block');
            this.ensureBackdrop();
            document.body.classList.add('hdw-theater-mode');
            this.isActive = true;
            this.translatorsPanel?.setTheaterMode(true);
            this.bindTheaterLayoutListeners();
            this.updateTheaterLayoutVars();
            this.scheduleTheaterLayout();
            setTimeout(() => this.updateTheaterLayoutVars(), 0);
            setTimeout(() => this.updateTheaterLayoutVars(), 120);
            this.updateButtonState();
        }

        disableTheaterMode() {
            document.body.classList.remove('hdw-theater-mode');
            document.querySelectorAll('.hdw-theater-player-block').forEach((node) => {
                node.classList.remove('hdw-theater-player-block');
            });
            this.isActive = false;
            this.translatorsPanel?.setTheaterMode(false);
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

    const playerEnhancements = new TheaterModeModule(
        new AudioCompressorModule(config.compressorStorageKey),
        new VideoEffectsModule(),
        new PlaybackInfoOverlayModule(config.overlayStorageKey, config.overlayDisplayStorageKey),
        translatorsPanel
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
                        Всего закладок: <span id="watchlist-count">0</span>
                    </div>
                    <div class="watchlist-controls">
                        <input type="text" id="watchlist-filter" class="watchlist-filter" placeholder="Поиск по названию...">
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
                this.renderItems(filterInput.value);
            });
            
            // Сохраняем ссылку на модальное окно для обновления из других частей кода
            window.watchlistModal = modal;
            
            // Обработчик очистки
            const clearBtn = modal.querySelector('#clear-all-btn');
            clearBtn.addEventListener('click', () => {
                if (confirm('Вы уверены, что хотите удалить все закладки?')) {
                    StorageManager.clearAll();
                    this.renderItems('');
                }
            });
            
            // Отображение закладок
            this.renderItems('');
            
            modal.style.display = 'block';
        }
        
        static renderItems(filter = '') {
            const itemsContainer = document.getElementById('watchlist-items');
            if (!itemsContainer) return;
            
            const items = BookmarkManager.getAll();
            let filteredItems = items;
            
            if (filter) {
                filteredItems = items.filter(item => 
                    item.title.toLowerCase().includes(filter.toLowerCase())
                );
            }
            
            // Обновление счетчика
            const countElement = document.getElementById('watchlist-count');
            if (countElement) {
                countElement.textContent = items.length;
            }
            
            if (filteredItems.length === 0) {
                itemsContainer.innerHTML = `
                    <div class="no-bookmarks">
                        <span class="no-bookmarks-icon">📚</span>
                        <p>Закладок пока нет</p>
                        <p>Добавьте фильмы или сериалы в закладки, чтобы они появились здесь</p>
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
                
               return `
                <div class="watchlist-item">
                    <div class="watchlist-item-row">
                        <div class="watchlist-item-content">
                            <a href="${itemUrl}" target="_blank" class="watchlist-title">${title} ${year ? `(${year})` : ''}</a>
                            <div class="watchlist-description">${shortDescription}</div>
                            <div class="watchlist-meta">
                                Добавлено: ${addedAt}
                                ${year ? ` | Год: ${year}` : ''}
                                ${item.dub && item.dub.id ? ` | Озвучка: ${dubName}` : ''}
                                ${item.season && item.season.id ? ` | Сезон: ${seasonName}` : ''}
                                ${item.episode && item.episode.id ? ` | Серия: ${episodeName}` : ''}
                                ${item.progress && item.progress.currentTime ? ` | Позиция: ${formatTime(item.progress.currentTime)}` : ''}
                            </div>
                        </div>
                        <div class="watchlist-actions">
                            <div class="watchlist-item-actions">
                                <button data-id="${safeId}" class="btn btn-danger remove-btn">🗑️ Удалить</button>
                            </div>
                        </div>
                    </div>
                </div>
            `}).join('');
            
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
                    this.renderItems(document.getElementById('watchlist-filter').value);
                    
                    // Проверяем, если удаленная закладка соответствует текущей странице
                    debugLog('[UI] Проверка соответствия URL страницы и закладки');
                    if (currentItemBeforeRemove && normalizeUrl(window.location.href) === normalizeUrl(currentItemBeforeRemove.url)) {
                        debugLog('[UI] URL совпадают, обновляем кнопку');
                        // Обновляем состояние кнопки на странице
                        const bookmarkBtn = document.getElementById('add-to-watchlist-btn');
                        debugLog('[UI] Кнопка найдена:', bookmarkBtn);
                        if (bookmarkBtn) {
                            bookmarkBtn.textContent = 'Добавить в закладки';
                            bookmarkBtn.className = 'btn btn-success';
                            debugLog('[UI] Состояние кнопки обновлено');
                        } else {
                            debugLog('[UI] Кнопка не найдена на странице');
                        }
                    } else {
                        debugLog('[UI] URL не совпадают или закладка не найдена');
                    }
                });
            });
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
                button.className = 'btn btn-success';
                button.textContent = 'Мой список';
                button.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 9999;
                    padding: 10px 15px;
                    border: none;
                    border-radius: 5px;
                    background-color: #28a745;
                    color: white;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                `;
                
                button.addEventListener('click', () => {
                    this.showModal();
                });
                
                document.body.appendChild(button);
                return;
            }
            
            // Создаем кнопку для размещения в шапке
            const button = document.createElement('button');
            button.id = 'watchlist-toggle-btn';
            button.className = 'btn btn-success';
            button.textContent = 'Мой список';
            button.style.cssText = `
                margin-left: 10px;
                margin-right: 20px;
                height: 26px;
                line-height: 1;
                vertical-align: middle;
            `;
            
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
        
        static addBookmarkBtn() {
            // Проверяем, есть ли уже кнопка
            if (document.getElementById('add-to-watchlist-btn')) {
                return;
            }
            
            const movieInfo = MovieParser.parseMovieInfo();
            const existingItem = BookmarkManager.findByUrl(movieInfo.url);
            const exists = !!existingItem;
            // Используем ID существующего элемента, если он есть
            if (exists) {
                movieInfo.id = existingItem.id;
            }
            
            const button = document.createElement('button');
            button.id = 'add-to-watchlist-btn';
            button.className = 'btn ' + (exists ? 'btn-danger' : 'btn-success');
            button.textContent = exists ? 'В закладках' : 'Добавить в закладки';
            button.style.cssText = `
                margin: 0 0 10px 0;
                padding: 12px 20px;
                color: white;
                line-height: normal;
            `;
            
            button.addEventListener('click', () => {
                // Проверяем текущее состояние кнопки по тексту
                const isCurrentlyAdded = button.textContent === 'В закладках';
                if (isCurrentlyAdded) {
                    // Удаляем из закладок
                    BookmarkManager.remove(movieInfo.id);
                    button.textContent = 'Добавить в закладки';
                    button.className = 'btn btn-success';
                } else {
                    // Добавляем в закладки
                    const freshMovieInfo = MovieParser.parseMovieInfo();
                    const currentExisting = BookmarkManager.findByUrl(freshMovieInfo.url);
                    if (currentExisting) {
                        freshMovieInfo.id = currentExisting.id;
                    }
                    // Генерируем новый ID только для новых закладок
                    const newItem = { ...freshMovieInfo, id: freshMovieInfo.id || MovieParser.generateId() };
                    BookmarkManager.add(newItem);
                    movieInfo.id = newItem.id;
                    button.textContent = 'В закладках';
                    button.className = 'btn btn-danger';
                }
            });
            
            // Добавляем обработчик события для автоматического выбора озвучки
            if (exists && existingItem.dub && existingItem.dub.id) {
                // Создаем функцию для установки озвучки
                const setDub = () => {
                    // Проверяем, что элементы озвучки существуют
                    const dubElements = document.querySelectorAll('.b-translator__item');
                    if (dubElements.length > 0) {
                        // Ищем элемент с нужным ID
                        const targetDubElement = Array.from(dubElements).find(el =>
                            el.getAttribute('data-translator_id') === existingItem.dub.id
                        );
                        
                        if (targetDubElement) {
                            // Эмулируем клик по элементу озвучки
                            targetDubElement.click();
                        }
                    }
                };
                
                // Добавляем обработчик события для кнопки "Открыть" в модальном окне
                // чтобы автоматически устанавливать озвучку при переходе к закладке
                button.addEventListener('click', () => {
                    // Проверяем текущее состояние кнопки по тексту
                    const isCurrentlyAdded = button.textContent === 'В закладках';
                    if (!isCurrentlyAdded) {
                        // Если добавляем в закладки, сохраняем текущую озвучку
                        // Это будет сделано автоматически при парсинге movieInfo
                        return;
                    }
                    
                    // Если закладка уже существует, устанавливаем сохраненную озвучку
                    // после небольшой задержки, чтобы страница успела загрузиться
                    setTimeout(setDub, 1000);
                });
            }
            
            // Добавляем обработчик события для автоматического выбора сезона и серии
            if (exists && existingItem.season && existingItem.season.id) {
                // Создаем функцию для установки сезона
                const setSeasonEpisode = () => {
                    // Проверяем, что элементы сезона существуют
                    const seasonElements = document.querySelectorAll('.b-simple_season__item');
                    if (seasonElements.length > 0) {
                        // Ищем элемент с нужным ID
                        const targetSeasonElement = Array.from(seasonElements).find(el =>
                            el.getAttribute('data-tab_id') === existingItem.season.id
                        );
                        
                        if (targetSeasonElement) {
                            // Эмулируем клик по элементу сезона
                            targetSeasonElement.click();
                        }
                    }
                    
                    // После установки сезона устанавливаем серию
                    if (existingItem.episode && existingItem.episode.id) {
                        setTimeout(() => {
                            // Проверяем, что элементы серии существуют
                            const episodeElements = document.querySelectorAll('.b-simple_episode__item');
                            if (episodeElements.length > 0) {
                                // Ищем элемент с нужным ID
                                const targetEpisodeElement = Array.from(episodeElements).find(el =>
                                    el.getAttribute('data-episode_id') === existingItem.episode.id &&
                                    el.getAttribute('data-season_id') === existingItem.episode.seasonId
                                );
                                
                                if (targetEpisodeElement) {
                                    // Эмулируем клик по элементу серии
                                    targetEpisodeElement.click();
                                }
                            }
                        }, 500); // Небольшая задержка, чтобы страница успела обновиться
                    }
                };
                
                // Добавляем обработчик события для кнопки "Открыть" в модальном окне
                // чтобы автоматически устанавливать сезон и серию при переходе к закладке
                button.addEventListener('click', () => {
                    // Проверяем текущее состояние кнопки по тексту
                    const isCurrentlyAdded = button.textContent === 'В закладках';
                    if (!isCurrentlyAdded) {
                        // Если добавляем в закладки, сохраняем текущий сезон и серию
                        // Это будет сделано автоматически при парсинге movieInfo
                        return;
                    }
                    
                    // Если закладка уже существует, устанавливаем сохраненный сезон и серию
                    // после небольшой задержки, чтобы страница успела загрузиться
                    setTimeout(setSeasonEpisode, 1000);
                });
            }
            
            // Находим место для размещения кнопки (в зависимости от структуры страницы)
            const infoTableLeft = document.querySelector('.b-post__infotable_left');
            if (infoTableLeft) {
                infoTableLeft.appendChild(button);
                
                // Добавляем отображение прогресса просмотра
                this.addProgressInfo(existingItem);
            }
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
            
            // Создаем элемент с информацией о прогрессе
            const progressDiv = document.createElement('div');
            progressDiv.className = 'b-post__lastbookmark';
            progressDiv.style.marginTop = '1px';

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
    function init() {
        // Добавляем кнопку управления закладками
        UI.addToggleBtn();
        
        // Добавляем кнопку добавления в закладки на странице фильма/сериала/аниме
        if (window.location.pathname.includes('/films/') || window.location.pathname.includes('/series/') || window.location.pathname.includes('/cartoons/') || window.location.pathname.includes('/animation/') ) {
            UI.addBookmarkBtn();
            UI.initTheaterMode();
            // Инициализируем отслеживание видео
            VideoTracker.init();
        }
    }

    // Запуск инициализации при загрузке страницы
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    // Тестирование функции отладки
    debugLog('[DEBUG] Скрипт инициализирован, debug =', config.debug);

    }

    global.__HDREZKA_CORE_VERSION__ = HDREZKA_CORE_VERSION;
    global.__HDREZKA_CORE__ = runHdrezkaCore;
})(typeof globalThis !== 'undefined' ? globalThis : window);






