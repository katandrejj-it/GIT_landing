# Отчёт по аудиту страницы `index.html`

**Дата проверки:** 09.04.2026  
**Страница:** FORMA — Ремонт квартир под ключ в Москве  
**Объём файла:** 4734 строки

---

## 1. Общее впечатление и архитектура

Страница представляет собой одностраничный лендинг (SPA-подобный) для компании по ремонту квартир. Используется Tailwind CSS (CDN-версия), GSAP + ScrollTrigger, Lenis (отключён), Swiper, IMask. В целом структура грамотная, код хорошо организован с комментариями-секциями.

---

## 2. Использование Tailwind CSS

### 2.1. Что сделано через Tailwind ✅

Большая часть разметки успешно использует Tailwind-утилиты:

- **Сеточные системы:** `grid grid-cols-1 lg:grid-cols-12`, `sm:grid-cols-2`, `lg:grid-cols-3` — всё корректно.
- **Flexbox-лейауты:** `flex items-center gap-3`, `flex-col`, `flex-1`, `justify-center` — широко и правильно применяется.
- **Отступы:** `py-24`, `px-4`, `mb-12`, `gap-8`, `space-y-2.5` — последовательно используются по всему документу.
- **Адаптивные брейкпоинты:** `hidden lg:flex`, `md:grid`, `sm:grid-cols-2`, `max-[530px]:hidden` — хорошая адаптивность.
- **Размеры и позиционирование:** `absolute inset-0`, `relative`, `z-10`, `w-full`, `h-px` — широко применяются.
- **Типографика:** `text-base`, `text-sm`, `text-xl`, `uppercase`, `tracking-widest` — правильно используется.
- **Анимации и переходы:** `transition-all`, `transition-transform` — применяются в кнопках и карточках.
- **Цвета:** `text-white`, `bg-black/50` — используются, но частично заменяются CSS-переменными.

### 2.2. Что НЕ сделано через Tailwind (через кастомный CSS) ⚠️

Ниже перечислены места, где используются кастомные CSS-классы/инлайн-стили вместо Tailwind. Для каждого указана оценка обоснованности.

| №   | Место                                                               | Что используется                            | Можно ли через Tailwind? | Обоснованность                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------- | ------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Кастомные шрифты** `@font-face` для Century Gothic и Montserrat   | CSS `@font-face` + `font-family`            | ❌ Нет                   | **Обосновано.** Tailwind не управляет подключением кастомных шрифтов, только задаёт `font-family` в конфиге.                                                                                                                                                |
| 2   | **CSS-переменные темизации** `:root { --bg: #f5f2ee; ... }`         | CSS custom properties                       | ⚠️ Частично              | **Частично обосновано.** Tailwind поддерживает CSS-переменные через `rgb(var(--bg) / <alpha-value>)`, но здесь переменные используются напрямую в `style=""` и `<style>`. Можно было перенести в `tailwind.config` с полным использованием utility-классов. |
| 3   | **Градиенты** `.grad-gold`, `.text-grad-gold`                       | `linear-gradient(...)` через CSS            | ✅ Да                    | **Не обосновано.** Tailwind поддерживает градиенты через `bg-gradient-to-br from-[#d4b483] via-[#b89a6a] to-[#8b7049]` и `text-transparent bg-clip-text`. Можно было полностью заменить на Tailwind-классы.                                                 |
| 4   | **Кастомные скроллбары** `::-webkit-scrollbar`                      | CSS pseudo-elements                         | ❌ Нет                   | **Обосновано.** Tailwind не предоставляет утилит для стилизации скроллбара.                                                                                                                                                                                 |
| 5   | **Header** `#header` с `backdrop-filter`, `transition`, `transform` | CSS с media query для `html.dark`           | ⚠️ Частично              | **Частично обосновано.** `backdrop-blur` есть в Tailwind (`backdrop-blur-md`), `transition` тоже. Но логика `hidden-up`/`scrolled` требует JS-классов, проще через CSS. Допустимо.                                                                          |
| 6   | **Nav-табы** `.nav-tab`, `.nav-tab:hover`                           | CSS с hover-состояниями                     | ⚠️ Частично              | **Можно через Tailwind.** Классы вроде `text-muted hover:bg-gold/10 hover:text-gold` заменили бы большую часть CSS. Не критично, но желательно унифицировать.                                                                                               |
| 7   | **Theme Toggle** `.theme-toggle` с псевдоэлементом `::after`        | CSS                                         | ⚠️ Частично              | **Можно через Tailwind + CSS.** Псевдоэлементы `::before/::after` в Tailwind ограничены. Текущий подход допустим, но можно было сделать через Tailwind `relative w-12 h-6 rounded-full` + кастомный `::after`.                                              |
| 8   | **Swiper-навигация** `.hero-swiper .swiper-button-next/prev`        | CSS                                         | ✅ Да                    | **Можно через Tailwind.** Размеры, фон, backdrop-blur, border, hover — всё это Tailwind-утилиты. Рекомендуется перенести.                                                                                                                                   |
| 9   | **Кнопки** `.btn-primary`, `.btn-outline`                           | CSS с градиентами, тенями, hover            | ✅ Да                    | **Можно через Tailwind.** Все свойства кнопки (gradient bg, padding, rounded, shadow, hover:translate-y, hover:shadow) легко заменяются на Tailwind-классы. Рекомендуется перенести в Tailwind-конфиг через `@apply` или inline-классы.                     |
| 10  | **UTP-карточка** `.utp-card`, `.utp-card-inner`                     | CSS с background-image и opacity            | ⚠️ Частично              | **Частично можно.** Фон и opacity через Tailwind возможны, но `background-image: url()` с opacity overlay — проще через CSS. Допустимо.                                                                                                                     |
| 11  | **Why Cards** `.why-card` с hover-эффектами                         | CSS                                         | ✅ Да                    | **Можно через Tailwind.** `bg-surface border border-border rounded-2xl p-7 hover:-translate-y-1.5 hover:shadow-gold hover:border-gold` — полностью заменяемо.                                                                                               |
| 12  | **Map Card** `.map-card` с `border-radius: 50% / 35%`               | CSS                                         | ❌ Нет (частично)        | **Обосновано.** Такой специфический border-radius (эллиптический) Tailwind не поддерживает. Допустимо.                                                                                                                                                      |
| 13  | **Portfolio Cards** `.portfolio-card`, `.portfolio-card-overlay`    | CSS с aspect-ratio, hover-scale, overlay    | ✅ Да                    | **Можно через Tailwind.** `aspect-[4/3] group overflow-hidden rounded-xl` + `group-hover:scale-108` + overlay через `absolute inset-0 bg-gradient-to-t from-black/85 to-transparent opacity-0 group-hover:opacity-100`. Рекомендуется перенести.            |
| 14  | **Pricing Cards** `.pricing-card`, `.pricing-card.featured`         | CSS                                         | ✅ Да                    | **Можно через Tailwind.** Полностью заменяемо на утилиты. `featured` карточку можно сделать через `bg-gradient-to-br from-[#d4b483] via-[#b89a6a] to-[#8b7049]`.                                                                                            |
| 15  | **FAQ Accordion** `.faq-item`, `.faq-q`, `.faq-icon`, `.faq-body`   | CSS с `max-height` transition               | ⚠️ Частично              | **Частично обосновано.** Анимация `max-height` для аккордеона — стандартный паттерн. Можно было использовать `grid grid-rows-[0fr]/grid-rows-[1fr]` хак, но CSS проще. Допустимо.                                                                           |
| 16  | **Form Inputs** `.form-input`                                       | CSS с focus ring                            | ✅ Да                    | **Можно через Tailwind.** `w-full px-5 py-4 rounded-2xl border border-border bg-surface text-ink focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none`. Рекомендуется перенести.                                                                  |
| 17  | **Modal** `.modal-backdrop`, `.modal-box`, `.modal-close`           | CSS с backdrop-filter, transform transition | ✅ Да                    | **Можно через Tailwind.** `fixed inset-0 z-[2000] bg-black/75 backdrop-blur-sm` + `bg-surface rounded-3xl w-[90vw] max-w-[1000px] max-h-[90vh] overflow-y-auto`. Рекомендуется перенести.                                                                   |
| 18  | **Footer** `footer` CSS                                             | CSS                                         | ✅ Да                    | **Можно через Tailwind.** `bg-[#0f0e0c] dark:bg-[#0f0e0c] text-[#a09790] border-t border-[#1e1c18]`. Рекомендуется перенести.                                                                                                                               |
| 19  | **Social Icons** `.social-icon`                                     | CSS с hover                                 | ✅ Да                    | **Можно через Tailwind.** `w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted hover:bg-gold/10 hover:text-gold hover:border-gold hover:-translate-y-0.5`.                                                                |
| 20  | **Mobile Menu** `#mobile-menu`                                      | CSS с transform transition                  | ✅ Да                    | **Можно через Tailwind.** `fixed inset-0 z-[999] bg-surface flex flex-col items-center justify-center gap-7 translate-x-full transition-transform` + `translate-x-0` при open.                                                                              |
| 21  | **Grain overlay** `body::before` с SVG noise                        | CSS                                         | ❌ Нет                   | **Обосновано.** Tailwind не поддерживает `::before` с SVG data URI. Допустимо.                                                                                                                                                                              |
| 22  | **UTP Side Cards** `.utp-side-card` с glassmorphism                 | CSS                                         | ⚠️ Частично              | **Частично можно.** `backdrop-blur` есть в Tailwind, border с alpha тоже. Можно было перенести ~80% в Tailwind.                                                                                                                                             |
| 23  | **UTP Central 3D Card** `#utp-central-card`                         | CSS с perspective, transform                | ⚠️ Частично              | **Частично обосновано.** 3D-трансформации управляются через JS. Tailwind может задать `perspective-1000` (есть в плагинах), но основная логика — JS. Допустимо.                                                                                             |
| 24  | **Scroll Indicator** `.scroll-indicator`, `.scroll-dot`             | CSS с keyframes                             | ⚠️ Частично              | **Можно через Tailwind.** `animate-pulse` или кастомные `@keyframes` в `tailwind.config`. Не критично.                                                                                                                                                      |
| 25  | **Инлайн-стили `style="..."`**                                      | Множественные инлайн-стили                  | ✅ Частично              | **Не обосновано во многих местах.** См. раздел 4 ниже.                                                                                                                                                                                                      |

---

## 3. Цветовая гамма — светлая и тёмная тема

### 3.1. Палитра

| Роль            | Светлая тема                 | Тёмная тема              | Статус                                                 |
| --------------- | ---------------------------- | ------------------------ | ------------------------------------------------------ |
| Background      | `#F5F2EE` (тёплый пергамент) | `#0F0E0C` (почти чёрный) | ✅ Хорошо                                              |
| Surface         | `#FFFFFF`                    | `#1A1814`                | ✅ Хорошо                                              |
| Текст основной  | `#1A1714`                    | `#F0EBE3`                | ✅ Хорошо                                              |
| Текст вторичный | `#5C5651`                    | `#A09790`                | ✅ Хорошо                                              |
| Акцент (золото) | `#B89A6A`                    | `#C8A87A`                | ✅ Хорошо — в тёмной теме золото светлее для контраста |
| Бордеры         | `#E2DDD8`                    | `#2E2B27`                | ✅ Хорошо                                              |

### 3.2. Оценка контрастности

- **Светлая тема:** Контраст между `#1A1714` и `#F5F2EE` ≈ 15.4:1 (отлично, AAA). Вторичный текст `#5C5651` на `#F5F2EE` ≈ 6.2:1 (хорошо, AA).
- **Тёмная тема:** Контраст между `#F0EBE3` и `#0F0E0C` ≈ 14.8:1 (отлично, AAA). Вторичный текст `#A09790` на `#0F0E0C` ≈ 6.5:1 (хорошо, AA).
- **Золотой акцент:** `#B89A6A` на `#F5F2EE` ≈ 2.8:1 (слабо для текста, но подходит для декоративных элементов). В тёмной теме `#C8A87A` на `#0F0E0C` ≈ 8.1:1 (отлично).

**Вывод:** Цветовая гамма подобрана профессионально. Переход между темами плавный через `transition: background 0.4s, color 0.4s`. Тёмная тема использует `class` (не `prefers-color-scheme` только), с сохранением в `localStorage` — правильно.

### 3.3. Проблемы с темизацией

1. **Несоответствие CSS-переменных и Tailwind-цветов:** В `tailwind.config` определены цвета с `DEFAULT` и `dark` вариантами, но в реальном CSS они применяются не через Tailwind, а через `var(--bg)`, `var(--gold)` и т.д. Это создаёт дублирование.
2. **Некоторые элементы не переключаются:** `footer` имеет жёстко заданный `background: #0f0e0c` для обеих тем (через `html:not(.dark) footer` и напрямую). Визуально это нормально, но семантически — футер одинаков в обеих темах, что допустимо.
3. **Hero overlay:** В светлой теме overlay имеет `rgba(26, 22, 18, 0.55)` — это затемняет светлые изображения, что выглядит неестественно. В тёмной теме `rgba(15, 14, 12, 0.65)` — корректно.

---

## 4. Инлайн-стили — проблемные места

Найдено **более 120 инлайн-стилей `style="..."`** в HTML. Многие из них дублируют то, что можно выразить через Tailwind.

### Критические (влияют на поддержку):

| Строка | Элемент             | Инлайн-стиль                                                                                           | Можно заменить на                                   |
| ------ | ------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| ~1180  | Hero slider         | `style="margin: 0 0 30px"`                                                                             | `mb-7`                                              |
| ~1183  | Hero swiper         | `style="margin: 0 0px; border-radius: 28px; overflow: hidden"`                                         | `rounded-[28px]` + overflow через CSS               |
| ~1220  | Hero content        | `style="padding: 0 clamp(24px, 6vw, 100px)"`                                                           | `px-6 lg:px-24`                                     |
| ~1223  | Hero text container | `style="max-width: 680px"`                                                                             | `max-w-[680px]`                                     |
| ~1225  | Hero label          | `style="color: var(--gold-light); text-transform: uppercase; letter-spacing: 0.2em; font-family: ..."` | `uppercase tracking-[0.2em] text-gold-light`        |
| ~1235  | Hero paragraph      | `style="max-width: 480px; font-family: ..."`                                                           | `max-w-[480px]` (font-family уже через `font-body`) |
| ~1310  | Scroll indicator    | `style="display: none"`                                                                                | `hidden` класс Tailwind                             |
| ~1620  | UTP section         | `style="translate: none; rotate: none; scale: none; transform: translate(0px, 0px); opacity: 1;"`      | **Мусор от GSAP!** Не должно быть в HTML            |
| ~1632  | Section label line  | `style="background: var(--border); max-width: 60px"`                                                   | `bg-border max-w-[60px]`                            |
| ~1642  | Section label text  | `style="color: var(--gold); letter-spacing: 0.2em; margin: 0; font-weight: inherit;"`                  | `text-gold tracking-[0.2em] m-0`                    |
| ~2850  | Pricing section     | Два атрибута `style` на одном элементе!                                                                | **Ошибка валидации HTML**                           |
| ~4200  | Footer copyright    | `style="color: #4a4844; font-family: ..."`                                                             | `text-[#4a4844] font-body`                          |

### Рекомендация:

Подавляющее большинство инлайн-стилей можно и **нужно** перенести в Tailwind-классы. Это:

- Улучшит читаемость
- Упростит поддержку
- Обеспечит консистентность темизации
- Сократит размер HTML

---

## 5. Адаптивность

### 5.1. Брейкпоинты

Используются стандартные Tailwind-брейкпоинты + кастомные:

| Брейкпоинт                                           | Назначение                                         | Статус        |
| ---------------------------------------------------- | -------------------------------------------------- | ------------- |
| `sm` (640px)                                         | Мобильные ландшафт                                 | ✅            |
| `md` (768px)                                         | Планшет                                            | ✅            |
| `lg` (1024px)                                        | Десктоп                                            | ✅            |
| `max-[530px]`                                        | Очень маленькие экраны (скрывает навигацию swiper) | ✅            |
| `@media (min-width: 1024px) and (max-width: 1279px)` | Промежуточный десктоп                              | ✅ Обосновано |

### 5.2. Проблемы адаптивности

1. **Pricing секция:** Дублирование контента — одна версия для мобильного (Swiper), другая для десктопа (Grid). Это приводит к **удвоению DOM-элементов**. Лучший подход — один набор карточек + JS переключает Swiper/Grid через `matchMedia`.

2. **Hero секция:** `clamp()` в padding — хорошо, но `max-width: 680px` на текстовом контейнере инлайн — лучше через Tailwind `max-w-2xl`.

3. **Map Card:** `margin: 0 auto` на мобильных — нормально, но `aspect-ratio: 1 / 1.15` может вызвать проблемы на очень маленьких экранах (< 320px).

4. **Навигация:** `nav-tab` на 1024-1279px уменьшается до `font-size: 0.7rem` — может быть нечитаемо. Рекомендуется не меньше `0.75rem`.

5. **Mobile menu:** Полноэкранное меню с `translateX` — хорошо, но нет анимации появления ссылок (каскадное появление). Рекомендуется добавить `stagger` через GSAP.

---

## 6. Мусор и неиспользуемый код

### 6.1. Явный мусор

1. **GSAP-артефакты в HTML:** Атрибуты `style="translate: none; rotate: none; scale: none; transform: translate(0px, 0px); opacity: 1;"` на элементах `.reveal` — это **остатки GSAP-инициализации**. Они не должны быть в исходном HTML, появляются после выполнения JS. Если это исходный файл — они выглядят как мусор.

2. **Закомментированный Lenis:** ~20 строк закомментированного кода Lenis smooth scroll. Если библиотека не используется — рекомендуется удалить полностью, чтобы не путать.

3. **Скрытый scroll indicator:** `<div class="scroll-indicator hidden md:flex" style="display: none">` — элемент скрыт и через `hidden`, и через `style="display: none"`. Если не нужен — удалить. Если планируется — убрать `style="display: none"`.

4. **Два `style` атрибута на `<section id="pricing">`:**

   ```html
   <section
     id="pricing"
     style="overflow: hidden"
     class="section-pad"
     style="background: var(--surface)"
   ></section>
   ```

   Это **невалидный HTML**. Второй `style` игнорируется браузером.

5. **`parallax-hero` класс:** Присутствует на изображениях, но GSAP-анимация — это обычный `scale` через `setInterval`, а не настоящий parallax. Название класса вводит в заблуждение.

### 6.2. Избыточность

1. **Дублирование pricing-карточек:** 6 карточек (3 для мобильного Swiper + 3 для десктопного Grid). Можно сократить до 3 с динамической инициализацией.

2. **Повторяющиеся инлайн-стили:** Один и тот же набор стилей (`font-family: "Montserrat", sans-serif`, `color: var(--muted)`) повторяется десятки раз. Можно вынести в Tailwind-класс.

3. **SVG-иконки:** Многие SVG дублируются в разных секциях. Можно вынести в `<defs>` и использовать `<use>`.

---

## 7. Проблемы валидации HTML

| #   | Проблема                                              | Расположение             | Серьёзность                         |
| --- | ----------------------------------------------------- | ------------------------ | ----------------------------------- |
| 1   | Два атрибута `style` на одном элементе                | `<section id="pricing">` | 🔴 Высокая                          |
| 2   | `style="display: none"` вместе с классом `hidden`     | scroll-indicator         | 🟡 Средняя                          |
| 3   | `font-family: &quot;Montserrat&quot;` в инлайн-стилях | Множественные элементы   | 🟡 Средняя (работает, но некрасиво) |
| 4   | GSAP-артефакты в `style` атрибутах                    | `.reveal` элементы       | 🟡 Средняя                          |

---

## 8. Производительность

### 8.1. Положительные моменты

- ✅ `loading="lazy"` на изображениях (кроме первого слайда — правильно `loading="eager"`)
- ✅ `will-change: transform` на hero-изображениях
- ✅ CDN-версии библиотек с `crossorigin` (кэшируются)
- ✅ GSAP + ScrollTrigger подключены минимально

### 8.2. Проблемы

- ⚠️ **CDN Tailwind:** `cdn.tailwindcss.com` — **не рекомендуется для продакшена**. Генерирует все утилиты в рантайме, что медленно. Рекомендуется сборка через CLI/PostCSS.
- ⚠️ **4 внешних библиотеки** (GSAP, ScrollTrigger, Lenis, Swiper, IMask) — 5 HTTP-запросов + парсинг JS. Рекомендуется бандлинг.
- ⚠️ **Hero изображения** `w=1600&q=85` — большие файлы. Рекомендуется `srcset` с разными разрешениями + `sizes`.
- ⚠️ **`setInterval` каждые 16ms** для hero zoom — работает постоянно, даже когда секция не видна. Рекомендуется `IntersectionObserver` для паузы.
- ⚠️ **Grain overlay** `body::before` с SVG data URI — рендерится поверх всего, может влиять на производительность скролла.

---

## 9. Доступность (Accessibility)

### 9.1. Что хорошо

- ✅ `aria-label` на кнопках темы, меню, модалок
- ✅ Семантические `<header>`, `<section>`, `<footer>`, `<nav>`
- ✅ `alt` на изображениях
- ✅ Фокус-состояния на интерактивных элементах
- ✅ Клавиша `Escape` закрывает модалки

### 9.2. Что улучшить

- 🔸 Нет `role="dialog"` на модальных окнах
- 🔸 Нет `aria-modal="true"` на модалках
- 🔸 Нет `aria-hidden` на неактивном мобильном меню
- 🔸 Контраст золотого текста на светлом фоне marginal (2.8:1)
- 🔸 Нет `skip to content` ссылки
- 🔸 Чекбокс "Согласен с политикой" не стилизован — нативный на фоне кастомных элементов

---

## 10. Рекомендации по приоритетам

### 🔴 Критические (исправить обязательно)

1. **Убрать дублирующий `style` атрибут** на `<section id="pricing">`
2. **Удалить закомментированный код Lenis** (если не планируется использование)
3. **Перенести инлайн-стили в Tailwind-классы** (минимум 80% из них)
4. **Убрать `style="display: none"`** у scroll indicator или удалить элемент

### 🟡 Важные (рекомендуется)

5. **Собрать Tailwind через CLI** вместо CDN для продакшена
6. **Уменьшить дублирование pricing-карточек** — один набор + динамическая инициализация
7. **Добавить `role="dialog"` + `aria-modal`** на модальные окна
8. **Оптимизировать hero-изображения** — добавить `srcset` + `sizes`
9. **Остановить `setInterval`** когда hero-секция не видна

### 🟢 Желательные (по возможности)

10. Вынести повторяющиеся SVG в `<defs>` + `<use>`
11. Добавить stagger-анимацию для ссылок мобильного меню
12. Добавить `skip to content` ссылку
13. Стилизовать чекбокс согласия
14. Добавить `prefers-reduced-motion` обработку

---

## 11. Итоговая оценка

| Критерий                       | Оценка | Комментарий                                                               |
| ------------------------------ | ------ | ------------------------------------------------------------------------- |
| **Tailwind CSS использование** | 6/10   | ~40% через Tailwind, ~60% кастомный CSS + инлайн. Потенциал ~85% Tailwind |
| **Цветовая гамма**             | 9/10   | Отличная палитра, хороший контраст, плавный переход тем                   |
| **Адаптивность**               | 7/10   | Хорошая, но дублирование pricing и мелкие проблемы на intermediate        |
| **Валидность HTML**            | 7/10   | Критическая ошибка с двумя `style`, GSAP-артефакты                        |
| **Производительность**         | 6/10   | CDN Tailwind, нет srcset, постоянный setInterval                          |
| **Доступность**                | 7/10   | Базовая a11y есть, но не полная                                           |
| **Чистота кода**               | 6/10   | Мусор, закомментированный код, дублирование                               |

**Общая оценка: 6.9/10** — Хорошая основа, но требует доработки для продакшена.

---

## 12. Выводы

1. **Tailwind CSS используется, но недостаточно.** Большинство стилей, которые МОЖНО было сделать через Tailwind, сделаны через кастомный CSS или инлайн-стили. Это снижает главную ценность библиотеки — консистентность и поддержку.

2. **Обоснованно НЕ через Tailwind:** `@font-face`, `::-webkit-scrollbar`, `body::before` (grain), эллиптический `border-radius`, сложные `::after` псевдоэлементы, анимации `max-height` для аккордеона.

3. **Не обоснованно НЕ через Tailwind:** кнопки, карточки, модалки, инпуты, навигация, футер, social-иконки, overlay — всё это можно и нужно перенести на Tailwind.

4. **Цветовая гамма** — сильная сторона страницы. Светлая и тёмная темы хорошо сбалансированы, золотой акцент работает в обеих темах.

5. **Есть мусор:** закомментированный код, GSAP-артефакты, дублирование pricing, два `style` атрибута — всё это нужно убрать перед продакшеном.

---

_Конец отчёта_
