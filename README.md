# HDRezka Enhanced

Пользовательский скрипт для Tampermonkey/Violentmonkey с поддержкой зеркал HDRezka.

## Структура

- `hdrezka-loader.user.js` — точка входа userscript:
  - работает на всех сайтах (`@match *://*/*`)
  - хранит и управляет базой зеркал
  - добавляет пункты меню Tampermonkey/Violentmonkey
  - проверяет, что сайт похож на HDRezka
  - загружает и запускает core через `@resource`
- `hdrezka-core.js` — основной код функциональности (закладки, прогресс, UI).

## Меню расширения

В меню userscript доступны команды:

- добавить текущий домен в зеркала
- удалить текущий домен из пользовательских зеркал
- показать базу зеркал
- сбросить пользовательские зеркала

## Установка

1. Установите одно из расширений:
   - Tampermonkey:
     - Google Chrome: [Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
     - Firefox: [Mozilla Add-ons](https://addons.mozilla.org/firefox/addon/tampermonkey/)
   - Violentmonkey:
     - Google Chrome: [Chrome Web Store](https://chromewebstore.google.com/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag)
     - Firefox: [Mozilla Add-ons](https://addons.mozilla.org/firefox/addon/violentmonkey/)
2. Установите скрипт по ссылке: [HDRezka Enhanced Loader](https://raw.githubusercontent.com/EnterBrain/hdrezka_enhanced/main/hdrezka-loader.user.js).
3. Откройте сайт HDRezka или зеркало.
4. При необходимости добавьте личное зеркало через меню расширения.

## Автоверсия `hdrezka-core.js`

- В `hdrezka-core.js` есть константа `HDREZKA_CORE_VERSION`.
- При каждом `git commit` pre-commit hook обновляет её автоматически и добавляет файл в индекс.
- При запуске core версия выводится в консоль браузера:
  - `[HDRezka Core] version <значение>`

### Включить hook один раз

```powershell
pwsh -File scripts/setup-git-hooks.ps1
```

Если `pwsh` недоступен:

```powershell
powershell -File scripts/setup-git-hooks.ps1
```

## Лицензия

MIT
