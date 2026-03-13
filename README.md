# Qaz Auto Money Motion

Веб-приложение для:
- учета движения денежных средств (ДДС) с синхронизацией из Bitrix Smart Process;
- складского учета (остатки, минимальный остаток, уведомления).

Стек: `Next.js 14`, `TypeScript`, `Supabase`, `Bitrix REST API`, деплой в `Vercel`.

## Что реализовано

- Вкладка `Движение ДС`:
  - синхронизация карточек из Bitrix (`/api/sync/bitrix/cashflow`);
  - суточный расчет: приход, расход, чистый поток, сальдо;
  - ручные поля по шаблону (кассы, счета, обязательства и т.д.);
  - генерация Excel-файла по структуре вашего образца (`/api/cashflow/report`).

- Вкладка `Складской учет`:
  - карточка товара (SKU, остаток, минимальный остаток, себестоимость);
  - движения товара (приход/расход/корректировка);
  - уведомления по low-stock (запись в БД + отправка в Bitrix).

## Быстрый старт

1. Установить зависимости:
```bash
npm install
```

2. Создать `.env.local` на основе `.env.example`.

3. В Supabase SQL Editor выполнить:
- [schema.sql](/d:/Projects/qazautomoneymotion/supabase/schema.sql)

4. Запустить локально:
```bash
npm run dev
```

## Обязательные переменные окружения

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BITRIX_WEBHOOK_URL`
- `BITRIX_CASHFLOW_ENTITY_TYPE_ID` (по умолчанию `1060`)
- `BITRIX_CASHFLOW_CATEGORY_ID` (по умолчанию `0`)
- `CRON_SECRET`

### Маппинг полей Bitrix (настраиваемо)

Чтобы корректно читать ваши пользовательские поля Smart Process, заполните:
- `BITRIX_FIELD_OPERATION_TYPE`
- `BITRIX_FIELD_AMOUNT`
- `BITRIX_FIELD_PAYMENT_TYPE`
- `BITRIX_FIELD_ARTICLE`
- `BITRIX_FIELD_COUNTERPARTY`
- `BITRIX_FIELD_REASON`
- `BITRIX_FIELD_MANAGER`

Если `BITRIX_FIELD_OPERATION_TYPE` не задан, тип операции определяется из названия (`Приход`/`Расход`).

## API

- `POST /api/sync/bitrix/cashflow` - синхронизация ДДС из Bitrix.
- `GET /api/cashflow/summary?date=YYYY-MM-DD` - сводка по дню.
- `GET /api/cashflow/report?date=YYYY-MM-DD` - Excel-отчет.
- `POST /api/settings/daily-inputs` - сохранение ручных полей.
- `GET /api/inventory/items` - список товаров + уведомления.
- `POST /api/inventory/items` - добавить/обновить товар.
- `POST /api/inventory/movement` - движение склада.
- `GET/POST /api/inventory/check-alerts` - проверка минимальных остатков (нужен `CRON_SECRET` через query `?secret=` или header `x-cron-secret`).

## Vercel деплой

1. Подключить репозиторий в Vercel.
2. Добавить все переменные окружения в `Project Settings -> Environment Variables`.
3. Deploy.

Для авто-проверки low-stock можно настроить Vercel Cron или внешний cron на:
- `GET /api/inventory/check-alerts?secret=ВАШ_CRON_SECRET`

## Безопасность

Вы передали реальные ключи/пароли. Рекомендуется после первого запуска:
1. Ротация `Database password` в Supabase.
2. Ротация Bitrix webhook токена.
3. Хранить секреты только в `.env.local` и Vercel Env, не в git.
