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

## Важно про `@resource`

В `hdrezka-loader.user.js` указан URL для `@resource hdrezka_core`:

- `https://raw.githubusercontent.com/EnterBrain/hdrezka_enhanced/main/hdrezka-core.js`

Если у вас другой репозиторий или ветка, обновите этот URL перед установкой loader-скрипта.

## Меню расширения

В меню userscript доступны команды:

- добавить текущий домен в зеркала
- удалить текущий домен из пользовательских зеркал
- показать базу зеркал
- сбросить пользовательские зеркала

## Установка

1. Установите Tampermonkey или Violentmonkey.
2. Импортируйте `hdrezka-loader.user.js`.
3. Откройте сайт HDRezka или зеркало.
4. При необходимости добавьте личное зеркало через меню расширения.

## Лицензия

MIT
