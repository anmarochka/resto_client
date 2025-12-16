# Restaurant Booking System

Система бронирования столиков в ресторанах через Telegram с админ-панелью.

## Технологический стек

- **React 18** - UI библиотека
- **TypeScript** - типизация
- **Vite** - сборщик и dev server
- **React Router** - клиентская маршрутизация
- **SCSS Modules** - модульные стили
- **Feature-Sliced Design** - архитектура проекта
- **ESLint** - статический анализ
- **Vitest + Testing Library** - тестирование (unit/integration)

## Документация (обязательные разделы)

- Архитектура: `docs/ARCHITECTURE.md`
- API (mock): `docs/API.md`
- User flows / навигация: `docs/FLOWS.md`

## Структура проекта

```
src/
├── app/                    # Инициализация приложения
│   ├── providers/         # Провайдеры (Router, Toast, AppState, ErrorBoundary)
│   └── styles/            # Глобальные стили
├── pages/                 # Страницы приложения
│   ├── home/             # Главная страница
│   └── admin/            # Админ панель
├── widgets/               # Сложные блоки (BookingFlow, MyBookings)
├── features/              # Фичи (Auth, Booking компоненты)
├── shared/                # Переиспользуемый код
│   ├── ui/               # UI компоненты
│   ├── lib/              # Утилиты, хуки, данные
│   └── types/            # TypeScript типы
└── main.tsx              # Точка входа
```

## Установка и запуск

```bash
# Установка зависимостей
npm install

# Запуск dev сервера
npm run dev

# Сборка для продакшена
npm run build

# Предпросмотр prod сборки
npm run preview
```

## Тесты

```bash
# Unit/integration тесты
npm run test:run

# E2E (Playwright; может потребоваться `npx playwright install`)
npm run test:e2e
```

## Форматирование

```bash
npm run format
npm run format:check
```

## Роуты (SPA)

- `/` — Home (Role selector + клиентские табы)
- `/admin` → редирект на `/admin/bookings`
- `/admin/bookings` — управление бронированиями
- `/admin/floor` — редактор схемы зала (drag & drop + сохранение)
- `/admin/analytics` — аналитика (моки + live обновления)

## Функциональность

### Для пользователей:
- Выбор ресторана из списка
- Интерактивный план зала с выбором столика
- Выбор даты и времени бронирования
- Подтверждение и управление бронированиями
- Интеграция с Telegram WebApp

### Для администраторов:
- Просмотр всех бронирований
- Статистика по ресторанам
- Подтверждение и отмена бронирований
- Фильтрация по ресторанам и статусам

## Telegram WebApp

Приложение интегрировано с Telegram WebApp API:
- Адаптивная кнопка "Назад"
- Подтверждение действий через MainButton
- Автоматическое растягивание viewport
- Тематизация под Telegram

## Разработка

Проект использует модульную архитектуру Feature-Sliced Design:
- **app** - конфигурация приложения
- **pages** - роуты и страницы
- **widgets** - композитные блоки
- **features** - бизнес-функции
- **shared** - переиспользуемый код

Все компоненты используют SCSS модули для изоляции стилей.

## Почему этот стек

- `React + TypeScript` — современный SPA стек с сильной типизацией и большим экосистемным покрытием.
- `React Router` — простой и надёжный роутинг для SPA, включая nested routes и guard-компоненты.
- `Vite` — быстрый DX (dev server, HMR) и сборка.
- `SCSS Modules` — модульная архитектура CSS без глобальных конфликтов.
