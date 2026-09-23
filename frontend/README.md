# Career Quest — Frontend

React + Vite 6 + TypeScript + Tailwind 3 + TanStack Query + Recharts + MSW.

> Сборка работает **без нативных бинарников** (`.node`/`.exe`): esbuild и rollup подменены на WASM-версии
> через `overrides` в `package.json`. Это нужно для Windows со Smart App Control / App Control,
> которые блокируют неподписанные файлы в `node_modules`. Не обновляйте Vite до 7+ и Tailwind до 4 —
> они снова потянут нативные модули.

## Что сделано

- **Сотрудники по разделам:** 44 сотрудника в 5 разделах (Backend, Frontend, Аналитика данных, QA, DevOps), поиск, фильтры по разделу и грейду, сортировка по готовности.
- **Профиль сотрудника:** навыки против требований следующего грейда, skill gaps с пометкой критичных, готовность к грейду в %.
- **Рекомендации:** до 3 активностей с итоговым score, разбором факторов (вес × значение = вклад) и объяснением по прозрачным правилам.
- **Лаборатория выбора:** предпросмотр результата без записи и сравнение с полезными активностями вне топ-3.
- **Выполнение активности:** окно «было → стало» по формуле `new_skill = max(old, min(old + gain, max_level))`, автоматический пересчёт навыков, готовности и рекомендаций.
- **История активностей:** выполнено / пропущено / отклонено.
- **HR-аналитика:** ключевые метрики, топ разрывов, статусы активностей, тепловая карта разрывов по ролям, сотрудники без рекомендаций.
- **Моковый API (MSW):** работает без бэкенда; полное подключение к FastAPI ещё не завершено.

## Вход и роли

Страницы `/login` и `/register`. Права повторяют `backend/api/auth.py`:

- **HR** видит список сотрудников, любой профиль и HR-аналитику;
- **Сотрудник** видит только свой профиль и свою историю.

**Мок-режим** (`VITE_USE_MOCK=true`): вход по почте и паролю, регистрация с привязкой к профилю сотрудника.
Демо-аккаунты (пароль `demo1234`):

| Роль | Почта |
|---|---|
| HR-менеджер | `hr@careerquest.kz` |
| Сотрудник (Иван Петров) | `ivan.petrov@careerquest.kz` |

Зарегистрированные аккаунты и сессия хранятся в `localStorage` браузера (только для демо).

**Реальный API** (`VITE_USE_MOCK=false`): вход по токену доступа из `backend/runtime/access.json`,
фронт проверяет его через `GET /auth/me` и дальше отправляет заголовок `Authorization: Bearer <token>`.
Эндпоинтов `/auth/login` и `/auth/register` в бэкенде пока нет — когда появятся, форма заработает с ними
(контракт — в `src/api/auth.ts`).

## Стиль

Liquid Glass в духе Apple + зелёно-золотая палитра: зелёный `#00815F`, золотой `#F1A400`.
Цвета — в `tailwind.config.js` (`brand`, `gold`), стекло и фон — в `src/index.css`.

## Запуск

```bash
npm install
npm run dev          # http://localhost:5173
```

## Mock ↔ реальный API

Настройка в `.env.development`:

| Переменная | Значение |
|---|---|
| `VITE_USE_MOCK=true` | фронт работает на мок-данных (MSW перехватывает запросы), бэкенд не нужен |
| `VITE_USE_MOCK=false` | запросы направляются на FastAPI по адресу `VITE_API_URL`; полная интеграция пока не завершена |

После изменения `.env` перезапустите `npm run dev`. В мок-режиме в шапке горит бейдж **Mock API**.
Состояние моков живёт в памяти — **перезагрузка страницы сбрасывает демо** к исходным данным.

Для FastAPI нужно настроить `CAREER_QUEST_CORS_ORIGINS=http://localhost:5173`
и передавать bearer-токен. Остальные текущие маршруты/типы frontend ещё не
совпадают с backend API, поэтому просто переключить `VITE_USE_MOCK=false`
недостаточно для рабочего интерфейса. Новая лаборатория выбора имеет отдельный
backend-контракт, но пока демонстрируется в интерфейсе на моковых данных.

## API-контракт

Типы — `src/types/index.ts`. Старые моковые типы ещё отличаются от Pydantic-схем;
типы лаборатории выбора отражают новые ответы backend.

```
GET  /employees                                  → EmployeeShort[]
GET  /employees/{id}/profile                     → Profile
GET  /employees/{id}/recommendations             → Recommendation[]
GET  /employees/{id}/history                     → HistoryItem[]
POST /employees/{id}/activities/{aid}/complete   → ProgressResult
POST /employees/{id}/activities/{aid}/skip       → { ok }
POST /employees/{id}/activities/{aid}/decline    → { ok }
GET  /hr/stats                                   → HrStats
```

Для отдельного блока прогноза и сравнения backend предоставляет:

```text
GET /employees/{id}/comparison-options           → DecisionRecommendations (все подходящие активности)
GET /employees/{id}/simulate/{event_id}           → ActivitySimulation (без записи)
GET /employees/{id}/compare?first_event_id=A&second_event_id=B → ActivityComparison
```

В мок-режиме эти маршруты обслуживаются MSW и используют локальный демо-скоринг;
backend использует собственный взвешенный расчёт. Не смешивайте их численные
оценки между режимами. Сам прогноз использует те же правила прироста, что
отметка выполнения в соответствующем режиме.

## Структура

```
src/
├─ api/
│  ├─ client.ts          # fetch-обёртка, API_URL, USE_MOCK
│  ├─ endpoints.ts       # все вызовы API
│  └─ mock/
│     ├─ data/           # employees, events (активности), skills (требования грейдов)
│     ├─ engine.ts       # копия логики бэка для моков: scoring, progress, HR-статистика
│     ├─ handlers.ts     # MSW-обработчики тех же URL
│     └─ browser.ts
├─ types/                # API-контракт
├─ hooks/queries.ts      # React Query хуки + пересчёт после действий
├─ components/
│  ├─ profile/           # ProfileHeader, SkillGapChart, GapList
│  ├─ recommendations/   # RecommendationCard, ScoreBreakdown, DecisionLab
│  ├─ progress/          # CompleteModal (было → стало)
│  ├─ hr/                # TopGapsChart, StatusFunnel, GapHeatmap, UncoveredTable
│  ├─ layout/ ui/
├─ pages/                # Employees, Profile, History, Hr
└─ router.tsx
```

## Демо-сценарий

1. **Сотрудники** (44 человека в 5 разделах, поиск и фильтры по разделу/грейду) → Иван Петров (Backend, Middle → Senior, готовность 74%).
2. Профиль: навыки vs требования Senior, разрывы (System Design −2, критичный).
3. Рекомендации: score, объяснение и раскрытый расчёт «вес × значение».
4. Лаборатория выбора: посмотреть прогноз навыков и готовности без записи,
   сравнить рекомендованный шаг с вариантом вне топ‑3.
5. **Выполнить активность** → модалка `new_skill = max(old, min(old + gain, max_level))`, готовность 74% → 82%.
6. Профиль обновлён, навык подсвечен, рекомендации пересчитаны.
7. **HR-аналитика**: топ разрывов, статусы, heatmap по ролям, Ольга Лебедева — «без рекомендации».
