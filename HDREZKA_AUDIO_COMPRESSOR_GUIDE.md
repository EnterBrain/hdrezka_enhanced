# HDrezka Audio Compressor Guide

Инструкция для реализации механики компрессора в плеере HDrezka (с нуля).

## 1. Найти `video`

- Ищи `document.querySelector("video")`.
- Отслеживай появление/замену через `MutationObserver`.
- Учитывай, что при смене серии/озвучки элемент может пересоздаваться.

## 2. Хранить состояние по каждому `video`

- Используй `WeakMap`.
- Структура значения:
  - `ctx` (`AudioContext`)
  - `source` (`MediaElementAudioSourceNode`)
  - `compressor` (`DynamicsCompressorNode`)
  - `isActive` (`boolean`)

## 3. Создать аудио-цепочку

- Создавай один раз на конкретный `video`:
  - `ctx = new AudioContext()`
  - `source = new MediaElementAudioSourceNode(ctx, { mediaElement: video })`
  - `compressor = new DynamicsCompressorNode(ctx, params)`
- Базово подключай прямой путь:
  - `source -> ctx.destination`

## 4. Переключение компрессора

- Включить:
  - `source.disconnect(ctx.destination)`
  - `source.connect(compressor)`
  - `compressor.connect(ctx.destination)`
- Выключить:
  - `source.disconnect(compressor)`
  - `compressor.disconnect(ctx.destination)`
  - `source.connect(ctx.destination)`

## 5. Рекомендуемые стартовые параметры

- `threshold: -50`
- `knee: 40`
- `ratio: 12`
- `attack: 0`
- `release: 0.25`

## 6. UI и управление

- Кнопка `Compressor On/Off` рядом с контролами плеера.
- Хоткей (например `Alt+C`).
- Tooltip/label с текущим состоянием.

## 7. Сохранение настроек

- Храни в `localStorage` или `GM_setValue`:
  - флаг `enabled`
  - параметры компрессора
- При загрузке страницы восстанавливай состояние и применяй его при `play`/`canplay`.

## 8. Ограничения autoplay / Firefox

- Если `ctx.state === "suspended"`, вызывай `await ctx.resume()` только после пользовательского действия (`click`, `keydown`, `play`).
- Если `resume()` не прошел, покажи в UI статус: требуется взаимодействие пользователя.

## 9. Реинициализация на новое видео

- Слушай события `loadedmetadata`, `canplay`, `play`.
- Если `video` новый и узлы не созданы, создавай заново.
- Старые узлы отключай:
  - `disconnect()` у нод
  - при необходимости `ctx.close()`

## 10. Частые ошибки

- Нельзя повторно создавать `MediaElementAudioSourceNode` для одного и того же `video` в одном `AudioContext`.
- Перед новым `connect()` делай корректный `disconnect()`.
- Не пытайся управлять видео в недоступных кросс-доменных iframe без доступа к DOM.

## Мини-чеклист перед интеграцией

- [ ] Кнопка/хоткей переключают состояние без ошибок.
- [ ] Состояние сохраняется и восстанавливается после перезагрузки.
- [ ] После смены серии компрессор продолжает работать.
- [ ] При `suspended` контексте есть понятный fallback в UI.
