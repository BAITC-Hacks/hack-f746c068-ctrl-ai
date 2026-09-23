# Career Quest — Frontend

React + Vite 6 + TypeScript + Tailwind 3 + TanStack Query + Recharts + MSW.

> Сборка работает **без нативных бинарников** (`.node`/`.exe`): esbuild и rollup подменены на WASM-версии
> через `overrides` в `package.json`. Это нужно для Windows со Smart App Control / App Control,
> которые блокируют неподписанные файлы в `node_modules`. Не обновляйте Vite до 7+ и Tailwind до 4 —
> они снова потянут нативные модули.

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
| `VITE_USE_MOCK=false` | запросы идут на FastAPI по адресу `VITE_API_URL` |

После изменения `.env` перезапустите `npm run dev`. В мок-режиме в шапке горит бейдж **Mock API**.
Состояние моков живёт в памяти — **перезагрузка страницы сбрасывает демо** к исходным данным.

Для FastAPI нужно включить CORS для `http://localhost:5173`.

## API-контракт

Типы — `src/types/index.ts` (должны совпадать с Pydantic-схемами бэкенда).

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
│  ├─ recommendations/   # RecommendationCard, ScoreBreakdown
│  ├─ progress/          # CompleteModal (было → стало)
│  ├─ hr/                # TopGapsChart, StatusFunnel, GapHeatmap, UncoveredTable
│  ├─ layout/ ui/
├─ pages/                # Employees, Profile, History, Hr
└─ router.tsx
```

## Демо-сценарий

1. **Сотрудники** (44 человека в 5 разделах, поиск и фильтры по разделу/грейду) → Иван Петров (Backend, Middle → Senior, готовность 74%).
2. Профиль: навыки vs требования Senior, разрывы (System Design −2, критичный).
3. Рекомендации: score, объяснение (AI) и раскрытый расчёт «вес × значение».
4. **Выполнить активность** → модалка `new_skill = min(old + gain, max_level)`, готовность 74% → 82%.
5. Профиль обновлён, навык подсвечен, рекомендации пересчитаны.
6. **HR-аналитика**: топ разрывов, статусы, heatmap по ролям, Ольга Лебедева — «без рекомендации».
