# UMO Price Card

Генератор прайс-карт для автодилера UMO: выбираете модель и комплектацию, вводите цены и ссылку для QR — получаете живой предпросмотр и печатный PDF (A3, 300dpi) для оффлайн-материалов.

Прод: [umo.autos](https://umo.autos/price-card)

## Стек

React 19, Vite 8, Tailwind CSS v4, TypeScript, `@react-pdf/renderer` для PDF, `qrcode` для QR. Бэкенда нет — всё генерируется в браузере.

## Разработка

```bash
pnpm install
pnpm dev     # http://localhost:8443
pnpm build
```

Подробнее о структуре проекта и правилах (например, требования к фото машин под печать) — в [AGENTS.md](AGENTS.md).

## Деплой

Пуш в `main` автоматически собирает и публикует сайт на GitHub Pages (`.github/workflows/deploy.yml`). CI проверяет типы, сборку и не пропустит картинку тяжелее 2.5 МБ.

Релизы — в [GitHub Releases](https://github.com/den-is-bezrukov/umo-brand/releases), теги вида `MM-YYYY`.
