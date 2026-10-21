// UMO's scenarios for the check (scripts/check.mjs, the core's): its dealers, models, files and texts. The check
// builds the site with this brand and goes through these; a scenario's name is its folder in .check.nosync, so keep a
// name as it is or its baseline is lost.

export const LONG_DEALER = 'Автоцентр Северо-Западный Премиум Санкт-Петербург Приморский'
export const LONG_ADDRESS = 'Санкт-Петербург, Приморский пр-т, д. 54, корп. 1, стр. 2, БЦ «Морской фасад», 3 этаж, офис 312'

export const TABLES = {
  'name-tags.xlsx': [
    ['Имя', 'Фамилия', 'Должность'],
    ['Анна', 'Иванова', 'Менеджер по продажам'],
    ['Константин', 'Смирнов', 'Руководитель отдела сервиса'],
    ['Ян', 'Ли', 'Мастер-консультант'],
  ],
  'name-tags-edge.xlsx': [
    ['ФИО', 'Должность'],
    ['Иванова Анна Сергеевна', 'Менеджер по продажам'],
    ['Константинопольский-Римский Константин', 'Руководитель отдела сервисного обслуживания и гарантии'],
    ['Мария', ''],
  ],
  'business-cards.xlsx': [
    ['Имя', 'Фамилия', 'Должность', 'Почта', 'Телефон', 'Доб.'],
    ['Анна', 'Иванова', 'Менеджер по продажам', 'anna.ivanova@example.ru', '+7 912 345-67-89', '123'],
    ['Константин', 'Смирнов', 'Руководитель отдела сервиса', 'k.smirnov@example.ru', '8 (800) 555-35-35', ''],
  ],
  'business-cards-edge.xlsx': [
    ['Имя', 'Фамилия', 'Должность', 'Почта', 'Телефон', 'Доб.'],
    ['Константин', 'Константинопольский-Римский', 'Руководитель отдела сервисного обслуживания и гарантийного ремонта', 'k.konstantinopolsky-rimsky@avtocentr-severo-zapadny.example.ru', '12345', '1234567'],
    ['', '', '', '', '', ''],
    ['Ян', '', '', 'not-an-email', '', ''],
  ],
  'price-tags.xlsx': [
    ['Наименование', 'Артикул', 'Цена', 'Подпись'],
    ['Коврики в салон', 'UM-0001', '4990', ''],
    ['Комплект зимних шин', 'UM-0002', '189900', 'Цена за комплект'],
    ['Брелок', '', '390', ''],
  ],
  'price-tags-edge.xlsx': [
    ['Наименование', 'Артикул', 'Цена', 'Подпись'],
    ['Комплект зимних шин на литых дисках с датчиками давления и секретками', 'UM-0002-LONG-ARTICLE', '189900', 'Очень длинная подпись под ценой'],
    ['Зарядная станция', 'UM-77', '125000000', ''],
    ['Чехол', 'UM-5', '0', ''],
    ['', '', 'abc', ''],
  ],
}

const enc = encodeURIComponent
const q = obj => Object.entries(obj).map(([k, v]) => (v === true ? k : `${k}=${enc(v)}`)).join('&')

/**
 * A scenario: a page with its link, then optionally a table loaded and the download pressed (`download`), or the
 * file the link itself saves (`expect`, as `?t` and `pdf=1` do). `phone` also takes it on a phone (screenshot, text)
 */
export const SCENARIOS = [
  { name: 'guide', url: '/', guide: true, phone: true },
  { name: 'editor', url: '/editor', phone: true },

  { name: 'price-card/default', url: '/price-card', download: true, phone: true },
  { name: 'price-card/two-cards', url: `/price-card?${q({ cards: 2, model: 'umo5', trim: 'Max', full: '3999000', legal: 'Предложение не является публичной офертой. Подробности у менеджеров дилерского центра.', model2: 'umo8', link2: 'https://example.ru/very/long/path/to/the/offer?utm_source=card' })}`, download: true },
  { name: 'price-card/template', url: '/price-card?t', expect: true },
  { name: 'price-card/pdf-link', url: '/price-card?model=umo8&pdf=1', expect: true },

  { name: 'livery/default', url: '/livery', download: true, phone: true },
  { name: 'livery/umo8-rear', url: `/livery?${q({ model: 'umo8', top: 'UMO АГАТ Волгоград', rear: 'on', show: 'dims' })}`, download: true, phone: true },
  { name: 'livery/long-dealer', url: `/livery?${q({ model: 'umo8', top: LONG_DEALER, rear: 'on' })}`, phone: true },
  { name: 'livery/large-no-qr', url: `/livery?${q({ top: 'UMO АГАТ Владимир', bottom: 'Едет дальше, чем кажется', off: 'qr', size: 'large', qr: 'small' })}`, download: true },
  { name: 'livery/long-tagline', url: `/livery?${q({ bottom: 'Самый длинный слоган, какой только можно придумать для борта', size: 'large' })}` },
  { name: 'livery/template', url: '/livery?t', expect: true },
  { name: 'livery/pdf-link-loose-dealer', url: `/livery?${q({ top: 'агат во владимире', pdf: 1 })}`, expect: true },

  { name: 'plate-frame/empty', url: '/plate-frame', download: true, phone: true },
  { name: 'plate-frame/dealer', url: `/plate-frame?${q({ name: 'АГАТ Владимир' })}`, download: true },
  { name: 'plate-frame/long-free-centered', url: `/plate-frame?${q({ text: LONG_DEALER, align: 'center' })}`, download: true },
  { name: 'plate-frame/template', url: '/plate-frame?t', expect: true },

  { name: 'name-tag/empty', url: '/name-tag', download: true, phone: true },
  { name: 'name-tag/one', url: `/name-tag?${q({ name: 'Анна', surname: 'Иванова', position: 'Менеджер по продажам' })}`, download: true, phone: true },
  { name: 'name-tag/table', url: '/name-tag', table: 'name-tags.xlsx', download: true, phone: true },
  { name: 'name-tag/table-edge', url: '/name-tag', table: 'name-tags-edge.xlsx', phone: true },
  { name: 'name-tag/template', url: '/name-tag?t', expect: true },

  { name: 'business-card/empty', url: '/business-card', download: true, phone: true },
  { name: 'business-card/one', url: `/business-card?${q({ dealer: 'АГАТ Владимир', name: 'Анна', surname: 'Иванова', position: 'Менеджер по продажам', phone: '+79123456789', ext: '12', email: 'anna@example.ru', marks: true })}`, download: true },
  { name: 'business-card/table', url: `/business-card?${q({ dealer: 'АГАТ Владимир' })}`, table: 'business-cards.xlsx', download: true },
  { name: 'business-card/long-dealer-table', url: `/business-card?${q({ dealer: LONG_DEALER, address: LONG_ADDRESS, site: 'avtocentr-severo-zapadny.example.ru' })}`, table: 'business-cards-edge.xlsx', download: true, phone: true },
  { name: 'business-card/template', url: '/business-card?t', expect: true },

  { name: 'price-tag/empty', url: '/price-tag', download: true, phone: true },
  { name: 'price-tag/link', url: `/price-tag?${q({ dealer: 'АГАТ Владимир', n1: 'Коврики', c1: 'UM-1', p1: '4990', n2: 'Очень длинное наименование товара, которое не помещается в две строки ценника никак', p2: '1990000' })}`, download: true },
  { name: 'price-tag/table', url: `/price-tag?${q({ dealer: 'АГАТ Владимир' })}`, table: 'price-tags.xlsx', download: true },
  { name: 'price-tag/long-dealer-table', url: `/price-tag?${q({ dealer: LONG_DEALER })}`, table: 'price-tags-edge.xlsx', download: true, phone: true },
  { name: 'price-tag/template', url: '/price-tag?t', expect: true },

  { name: 'hours-sign/empty', url: '/hours-sign', download: true, phone: true },
  { name: 'hours-sign/dealer', url: `/hours-sign?${q({ name: 'АГАТ Владимир' })}`, download: true, phone: true },
  { name: 'hours-sign/long', url: `/hours-sign?${q({ name: LONG_DEALER, from: '07:30', to: '23:00', address: LONG_ADDRESS, phone: '88005553535', site: 'avtocentr-severo-zapadny.example.ru' })}`, download: true },
  { name: 'hours-sign/template', url: '/hours-sign?t', expect: true },
  { name: 'hours-sign/pdf-link', url: `/hours-sign?${q({ name: 'агат владимир', pdf: 1 })}`, expect: true },

  { name: 'memo/default', url: '/memo', phone: true },
  { name: 'memo/filled', url: '/memo', fill: [['Название дилера', 'АГАТ Владимир', true], ['Почта дилера', 'info@agat.example.ru'], ['Должность', 'Менеджер по продажам'], ['Имя', 'Анна'], ['Фамилия', 'Иванова'], ['+7 987 654 32 10', '9123456789', false, 1], ['Почта', 'anna@example.ru']], download: true },
  { name: 'memo/template', url: '/memo?t', expect: true },

  { name: 'link-dealer/choices', url: `/business-card?${q({ dealer: 'агат', pdf: 1 })}`, phone: true },

  // What a person does by hand: picks, clicks, a downloaded file brought back, the template icon, the phone's contents
  { name: 'by-hand/guide-toc', url: '/', click: ['Содержание'], phone: true },
  { name: 'by-hand/price-card-umo8-ultra', url: '/price-card', click: ['UMO 8', 'ULTRA'], download: true },
  { name: 'by-hand/price-card-template-icon', url: '/price-card?model=umo8', download: 'template' },
  { name: 'by-hand/livery-umo8', url: '/livery', click: ['UMO 8'], download: true, phone: true },
  { name: 'by-hand/hours-sign-pick', url: '/hours-sign', fill: [['[data-field="dealer"]', 'агат влад', 'down']], download: true },
  { name: 'by-hand/business-card-pick', url: `/business-card?${q({ name: 'Анна', surname: 'Иванова', position: 'Менеджер', phone: '+79123456789', email: 'anna@example.ru' })}`, fill: [['[data-field="dealer"]', 'агат влад', 'down']], download: true },
  { name: 'by-hand/price-tag-pick', url: `/price-tag?${q({ n1: 'Коврики', p1: '4990' })}`, fill: [['Название дилера', 'агат влад', 'down']], download: true },
  { name: 'by-hand/plate-frame-pick', url: '/plate-frame', fill: [['Центр', 'агат влад', 'down']], download: true },
  { name: 'by-hand/name-tag-template-icon', url: `/name-tag?${q({ name: 'Анна', surname: 'Иванова', position: 'Менеджер' })}`, download: 'template' },
  { name: 'by-hand/business-card-back', url: '/business-card', upload: 'business-card/table/files/UMO_business-cards.pdf', download: true },
  { name: 'by-hand/price-tag-back', url: '/price-tag', upload: 'price-tag/table/files/UMO_price-tags.pdf', download: true },
  { name: 'by-hand/name-tag-back', url: '/name-tag', upload: 'name-tag/table/files/UMO_name-tags.zip', download: true },

  // «Инструкция»: every generator's, and the general one
  ...['price-card', 'livery', 'plate-frame', 'name-tag', 'business-card', 'price-tag', 'hours-sign', 'memo'].map(g => ({ name: `help/${g}`, url: `/${g}?help` })),
  { name: 'help/general', url: '/hours-sign?help=general', phone: true },
]
