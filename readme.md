# FORMA — Дизайн-система и Style Guide

## 📋 Оглавление

- [Цветовая палитра](#цветовая-палитра)
- [Типографика](#типографика)
- [Компоненты](#компоненты)
- [Spacing & Layout](#spacing--layout)
- [Анимации](#анимации)
- [Адаптивность](#адаптивность)

---

## 🎨 Цветовая палитра

### Light Theme (Светлая тема)

```css
--bg: #f5f2ee /* Warm parchment - основной фон */ --surface: #ffffff
  /* Белый - карточки, модальные окна */ --ink: #1a1714
  /* Почти черный - основной текст */ --muted: #5c5651
  /* Серо-коричневый - вторичный текст */ --gold: #b89a6a
  /* Теплое золото - акцентный цвет */ --gold-light: #d4b483
  /* Светлое золото - градиенты, hover */ --gold-dark: #8b7049
  /* Темное золото - градиенты, тени */ --border: #e2ddd8
  /* Светло-бежевый - границы */;
```

### Dark Theme (Темная тема)

```css
--bg: #0f0e0c /* Глубокий черный - основной фон */ --surface: #1a1814
  /* Темно-серый - карточки */ --ink: #f0ebe3
  /* Светло-бежевый - основной текст */ --muted: #a09790
  /* Серо-бежевый - вторичный текст */ --gold: #c8a87a
  /* Теплое золото (светлее для темной темы) */ --border: #2e2b27
  /* Темно-серый - границы */;
```

### Градиенты

```css
/* Золотой градиент (основной) */
linear-gradient(135deg, #D4B483 0%, #B89A6A 50%, #8B7049 100%)

/* Hero overlay (светлая тема) */
linear-gradient(160deg, rgba(26, 22, 18, 0.55) 0%, rgba(40, 33, 28, 0.25) 60%, transparent 100%)

/* Hero overlay (темная тема) */
linear-gradient(160deg, rgba(15, 14, 12, 0.65) 0%, rgba(26, 23, 20, 0.35) 60%, transparent 100%)

/* UTP центральная карточка */
linear-gradient(to top, rgba(139, 112, 73, 0.92) 0%, rgba(15, 14, 12, 0.45) 55%, transparent 100%)
```

### Тени

```css
--shadow-card: 0 4px 24px rgba(0, 0, 0, 0.07) --shadow-gold: 0 8px 40px
  rgba(184, 154, 106, 0.25) --shadow-gold-lg: 0 16px 60px
  rgba(184, 154, 106, 0.35) --shadow-dark-lg: 0 20px 60px rgba(0, 0, 0, 0.4);
```

---

## 📝 Типографика

### Шрифты

```css
/* Display (заголовки) */
font-family: 'Cormorant Garamond', serif
font-weight: 300, 400, 600
font-style: normal, italic

/* Body (основной текст) */
font-family: 'Jost', sans-serif
font-weight: 300, 400, 500, 600
```

### Размеры заголовков

```css
h1: clamp(2.8rem, 7vw, 6rem)      /* 44.8px - 96px */
h2: clamp(2rem, 5vw, 3.5rem)      /* 32px - 56px */
h3: clamp(1.2rem, 2.5vw, 1.8rem)  /* 19.2px - 28.8px */
```

### Текстовые стили

```css
/* Основной текст */
font-size: 1rem (16px)
line-height: 1.5

/* Мелкий текст */
font-size: 0.85rem - 0.95rem (13.6px - 15.2px)
line-height: 1.75

/* Uppercase labels */
font-size: 0.75rem - 0.78rem (12px - 12.5px)
letter-spacing: 0.15em - 0.2em
text-transform: uppercase
```

---

## 🧩 Компоненты

### Кнопки

#### Primary Button

```css
background: linear-gradient(135deg, #d4b483, #b89a6a, #8b7049)
color: #fff
padding: 14px 28px
border-radius: 11px
font-size: 0.85rem
font-weight: 500
letter-spacing: 0.06em
text-transform: uppercase
box-shadow: 0 4px 20px rgba(184, 154, 106, 0.35)

/* Hover */
opacity: 0.88
transform: translateY(-2px)
box-shadow: 0 8px 32px rgba(184, 154, 106, 0.45)
```

#### Outline Button

```css
background: transparent
color: #fff
padding: 13px 28px
border-radius: 11px
border: 1px solid rgba(255, 255, 255, 0.45)

/* Hover */
background: rgba(255, 255, 255, 0.12)
transform: translateY(-2px)
```

### Карточки

#### Стандартная карточка

```css
background: var(--surface)
border: 1px solid var(--border)
border-radius: 24px
padding: 28px

/* Hover */
transform: translateY(-6px)
box-shadow: 0 12px 40px rgba(184, 154, 106, 0.15)
border-color: var(--gold)
```

#### Glassmorphism карточка (UTP боковые блоки)

```css
/* Светлая тема */
background: rgba(255, 255, 255, 0.55)
backdrop-filter: blur(14px)
border: 1px solid rgba(184, 154, 106, 0.18)
border-radius: 24px
padding: 16px

/* Темная тема */
background: rgba(26, 24, 20, 0.65)
border: 1px solid rgba(184, 154, 106, 0.12)

/* Hover */
transform: translateY(-4px)
box-shadow: 0 12px 40px rgba(184, 154, 106, 0.18)
border-color: rgba(184, 154, 106, 0.45)
```

#### Hero карточка (UTP центральная)

```css
border-radius: 40px
aspect-ratio: 4/5 (mobile), 3/4 (tablet), auto (desktop)
background: #0f0e0c
box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45)
padding: 32px

/* 3D эффект */
perspective: 1000px
transform: perspective(1000px) rotateX(0deg) rotateY(0deg)
transition: transform 0.2s ease-out
```

### Формы

#### Input

```css
width: 100%
padding: 16px 22px
border-radius: 25px
border: 1.5px solid var(--border)
background: var(--surface)
color: var(--ink)
font-size: 0.9rem

/* Focus */
border-color: var(--gold)
box-shadow: 0 0 0 3px rgba(184, 154, 106, 0.15)
```

### Иконки

#### Icon Wrapper (UTP)

```css
width: 48px
height: 48px
border-radius: 14px
background: rgba(184, 154, 106, 0.12)
display: flex
align-items: center
justify-content: center

/* Hover */
transform: scale(1.1)
```

### Модальные окна

#### Modal Backdrop

```css
background: rgba(15, 14, 12, 0.75)
backdrop-filter: blur(8px)
opacity: 0 → 1 (transition)
```

#### Modal Box

```css
background: var(--surface)
border-radius: 28px
max-width: 1000px
max-height: 90vh
transform: scale(0.92) translateY(24px) → scale(1) translateY(0)
transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)
```

---

## 📐 Spacing & Layout

### Радиусы скругления

```css
--radius-btn: 11px /* Кнопки */ --radius-card: 24px /* Карточки */
  --radius-hero: 40px /* Hero карточки, модальные окна */;
```

### Отступы секций

```css
/* Desktop */
padding: 96px 0 (py-24)

/* Mobile */
padding: 64px 0
```

### Container

```css
max-width: 1280px
margin: 0 auto
padding: 0 30px (desktop)
padding: 0 16px (mobile < 480px)
```

### Grid системы

#### UTP секция

```css
/* Desktop (lg) */
grid-cols-12
  - Left: col-span-3
  - Center: col-span-6
  - Right: col-span-3
gap: 32px (gap-8)

/* Mobile */
grid-cols-1
order: Center (1) → Left (2) → Right (3)

/* Desktop */
order: Left (1) → Center (2) → Right (3)
```

---

## ✨ Анимации

### Transitions

```css
/* Стандартный */
transition: all 0.3s ease

/* Кнопки */
transition: opacity 0.25s, transform 0.25s, box-shadow 0.25s

/* Карточки */
transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s

/* Модальные окна */
transition: opacity 0.35s
```

### GSAP анимации

#### Reveal элементы

```javascript
gsap.fromTo(
  el,
  { opacity: 0, y: 38 },
  { opacity: 1, y: 0, duration: 0.9, ease: "power2.out" },
);
```

#### UTP боковые карточки

```javascript
/* Левые */
gsap.fromTo(
  ".utp-items-left .utp-side-card",
  { x: -50, opacity: 0 },
  { x: 0, opacity: 1, stagger: 0.12, duration: 0.8 },
);

/* Правые */
gsap.fromTo(
  ".utp-items-right .utp-side-card",
  { x: 50, opacity: 0 },
  { x: 0, opacity: 1, stagger: 0.12, duration: 0.8 },
);
```

#### UTP центральная карточка

```javascript
gsap.fromTo(
  "#utp-central-card",
  { scale: 0.88, opacity: 0 },
  { scale: 1, opacity: 1, duration: 1, ease: "power3.out" },
);
```

### Hover эффекты

```css
/* Lift эффект */
.hover-lift:hover {
  transform: translateY(-5px);
}

/* Scale иконок */
.group:hover .icon {
  transform: scale(1.1);
}

/* 3D карточка (UTP центральная) */
/* При движении мыши */
transform: perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)
  scale3d(1.02, 1.02, 1.02);
```

---

## 📱 Адаптивность

### Breakpoints (Tailwind)

```css
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

### Ключевые адаптивные правила

#### Hero текстовый контейнер

```css
.hero-text-container {
  max-width: 680px
  padding: 0 clamp(24px, 6vw, 100px)
}
```

#### UTP секция

```css
/* Mobile (< 1024px) */
- Центральная карточка: aspect-ratio 4/5 (portrait)
- Порядок: Center → Left → Right
- gap: 24px (gap-6)

/* Tablet (768px - 1023px) */
- Центральная карточка: aspect-ratio 3/4

/* Desktop (≥ 1024px) */
- Центральная карточка: aspect-auto, min-h-full (растягивается по высоте)
- Порядок: Left → Center → Right
- gap: 32px (gap-8)
```

#### Типографика

```css
/* Адаптивные размеры через clamp() */
h1: clamp(2.8rem, 7vw, 6rem)
h2: clamp(2rem, 5vw, 3.5rem)
h3: clamp(1.2rem, 2.5vw, 1.8rem)
```

---

## 🎯 Специальные элементы

### Числа-контуры (UTP)

```css
.utp-number {
  font-family: 'Cormorant Garamond', serif
  font-size: 2.5rem
  font-weight: 300
  color: transparent
  -webkit-text-stroke: 1px var(--gold)
  line-height: 1
  flex-shrink: 0
  margin-top: -9px
}
```

### Badge (UTP центральная карточка)

```css
.utp-badge {
  display: inline-flex
  align-items: center
  gap: 8px
  background: rgba(255, 255, 255, 0.12)
  backdrop-filter: blur(10px)
  border: 1px solid rgba(255, 255, 255, 0.2)
  border-radius: 999px
  padding: 6px 16px
  font-size: 0.75rem
  letter-spacing: 0.15em
  text-transform: uppercase
  color: #fff
}
```

### Текстовый градиент

```css
.text-grad-gold {
  background: linear-gradient(135deg, #d4b483, #b89a6a, #8b7049)
  -webkit-background-clip: text
  -webkit-text-fill-color: transparent
  background-clip: text
}
```

### Grain overlay (текстура)

```css
body::before {
  content: ""
  position: fixed
  inset: 0
  z-index: 9999
  pointer-events: none
  background-image: url("data:image/svg+xml,...")
  opacity: 0.035
  mix-blend-mode: overlay
}
```

---

## 🔧 Технические детали

### Scrollbar

```css
::-webkit-scrollbar {
  width: 6px
}
::-webkit-scrollbar-track {
  background: var(--bg)
}
::-webkit-scrollbar-thumb {
  background: var(--gold)
  border-radius: 3px
}
```

### Theme Toggle

```css
.theme-toggle {
  width: 48px
  height: 26px
  border-radius: 13px
  background: var(--border)
}

/* Переключатель */
.theme-toggle::after {
  width: 20px
  height: 20px
  border-radius: 50%
  background: linear-gradient(135deg, #d4b483, #8b7049)
  transform: translateX(0) → translateX(22px) (dark mode)
}
```

---

## 📌 Правила использования

### ✅ DO (Делать)

- Использовать CSS переменные для цветов (`var(--gold)`, `var(--ink)`)
- Применять золотой градиент для акцентов
- Использовать `clamp()` для адаптивной типографики
- Добавлять hover эффекты с `transform` и `box-shadow`
- Использовать GSAP для сложных анимаций
- Применять glassmorphism для боковых элементов
- Сохранять порядок элементов через `order` на мобильных

### ❌ DON'T (Не делать)

- Не использовать чистый черный (#000) или белый (#FFF) для текста
- Не применять резкие transitions (< 0.2s)
- Не нарушать иерархию z-index
- Не использовать фиксированные размеры для типографики
- Не забывать про темную тему
- Не удалять backdrop-filter из glassmorphism элементов
- Не менять порядок элементов UTP секции без учета адаптивности

---

## 🎨 Цветовые комбинации

### Текст на фоне

```
Светлая тема:
- Основной: #1A1714 на #F5F2EE
- Вторичный: #5C5651 на #F5F2EE
- Акцент: #B89A6A на #F5F2EE

Темная тема:
- Основной: #F0EBE3 на #0F0E0C
- Вторичный: #A09790 на #0F0E0C
- Акцент: #C8A87A на #0F0E0C
```

### Карточки

```
Светлая тема:
- Фон: #FFFFFF
- Граница: #E2DDD8
- Hover граница: #B89A6A

Темная тема:
- Фон: #1A1814
- Граница: #2E2B27
- Hover граница: #C8A87A
```

---

**Версия:** 1.0  
**Последнее обновление:** 2024  
**Проект:** FORMA — Ремонт квартир под ключ
