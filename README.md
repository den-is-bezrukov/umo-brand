# UMO

[Гайд UMO](https://umo.autos/) и редактор с восемью генераторами печатных материалов. PDF и ZIP создаются в браузере.

Для локальной работы используйте Node.js 24 и pnpm 11, как в CI.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm exec tsc --noEmit
pnpm build
```

Сборка в `dist/` обслуживается из корня сайта. При пуше в `main` GitHub Actions публикует её в GitHub Pages.

Настройки сайта, печатные макеты и материалы гайда находятся в [`brand/umo/`](brand/umo/README.md). Код генераторов находится в `src/`, описание макетов и редактора — в [`docs/`](docs/brand.md).

Для визуального сравнения запустите `pnpm check:baseline` на исходной версии и `pnpm check` после изменений. Проверка создаёт скриншоты и скачивает печатные файлы. Ей нужны Chrome, Poppler и ImageMagick. Отчёт сохраняется в `.check.nosync/report.txt`.

Деплой сохраняет CSS за 15 дней для Вебвизора. `.github/pages-css/` содержит снимок CSS перед переносом домена. Workflow учитывает дату из снимка и сохраняет исходные URL.
