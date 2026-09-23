const state = {
  categories: [],
  pricings: [],
  settings: {},
  tab: 'issue',
  draft: { client: null, lines: [], planned_end: '', deposit: null, notes: '' },
  receiveOrderId: null,
  invSessionId: null
};

const CAT_ICONS = { 'Лыжи': 'Л', 'Сноуборд': 'Д', 'Ботинки': 'Б', 'Крепления': 'К', 'Палки': 'П', 'Шлем': 'Ш', 'Маска': 'М' };

const I18N = {
  ru: {
    app_title: 'Прокат', lang_name: 'Русский', tab_issue: 'Выдача', tab_receive: 'Приёмка', tab_orders: 'Заказы', tab_inv: 'Склад',
    tab_invcheck: 'Инвентаризация', tab_clients: 'Клиенты', tab_rates: 'Тарифы', tab_reports: 'Отчёты', tab_settings: 'Настройки',
    srv_err: 'Ошибка сервера', popup_blocked: 'Разрешите всплывающие окна',
    st_in_stock: 'На складе', st_rented: 'Выдан', st_service: 'Ремонт', st_retired: 'Списан',
    st_active: 'Активен', st_returned: 'Возвращён', st_canceled: 'Отменён',
    scanned: 'Сканировано: {code}', not_found: 'Не найдено: {code}', not_found_plain: 'Не найдено',
    item_rented: 'Предмет «{bc}» уже выдан', item_service: 'Предмет «{bc}» в ремонте', item_retired: 'Предмет «{bc}» списан',
    already_added: 'Уже добавлено в заказ: {bc}', added: 'Добавлено: {bc}', added_full: 'Добавлено: {v}',
    not_rented: 'Предмет {code} не в аренде', start_inv_session: 'Начните сессию инвентаризации', scanned_inv: 'Отсканировано: {v}',
    service_label: 'услуга', auto_pick: 'подбор', specific: 'конкретный', remove: 'Убрать',
    issue_empty_hint: 'Сканируйте предмет или добавьте комплект/услугу ниже.',
    issue_title: 'Выдача инвентаря', overdue_warn: 'Просрочены возвраты: {ids}',
    client: 'Клиент', client_search_ph: 'ФИО или телефон — поиск', pick_from_db: 'Выбрать из базы', new_client: 'Новый клиент',
    order_positions: 'Позиции заказа', kit_opt: 'Комплект…', category_opt: 'Отдельная категория…',
    pick_item: 'Выбрать конкретный предмет', service_opt: 'Услуга…', issue_scan_hint: 'Наведите сканер и считайте штрихкод предмета — он добавится в заказ.',
    planned_return: 'Планируемый возврат', deposit: 'Залог', comment: 'Комментарий', comment_ph: 'при необходимости',
    create_order: 'Оформить выдачу', active_orders: 'Активные заказы',
    cost_est: 'Стоимость (оценочно): {v}', deposit_val: 'Залог: {v}', pay_at_issue: 'При выдаче: {v}',
    no_active_orders: 'Активных заказов нет', overdue_badge: 'просрочка', not_returned_count: 'не сдано: {n}', receive_btn: 'Принять',
    found: 'Найдено: {names}',
    client_pick_title: 'Выбор клиента', search_ph: 'поиск', choose: 'Выбрать',
    pick_item_search_ph: 'поиск: тип, модель, размер, штрихкод', no_stock: 'Нет предметов на складе',
    select_client: 'Выберите клиента', add_lines: 'Добавьте позиции', order_created: 'Заказ #{id} создан', order_title: 'Заказ #{id}',
    print_contract: 'Печать договора', add_payment: 'Внести оплату', close: 'Закрыть',
    client_label: 'Клиент: {name}', issue_return_plan: 'Выдача: {t} &nbsp; Возврат план: {t2}',
    position: 'Позиция', units_barcode: 'Единицы (штрихкод)', amount: 'Сумма', total: 'Итого',
    deposit_paid: 'Залог / оплачено', to_charge: 'К доплате: {v}',
    contract_title_short: 'Договор #{id}', contract_title: 'Договор проката № {id}',
    phone_label: 'Телефон:', issue_date: 'Дата выдачи:', return_plan: 'Возврат (план):',
    deposit_label: 'Залог:', comment_label: 'Комментарий:', kind: 'Тип', issued_barcodes: 'Штрихкоды выданного',
    estimated_cost: 'Предварительная стоимость: {v}', contract_disclaimer: 'Окончательная стоимость рассчитывается при возврате по фактическому времени. За повреждение или утерю инвентаря клиент несёт материальную ответственность.',
    sign_client: 'Клиент', sign_manager: 'Менеджер',
    receive_title: 'Приёмка инвентаря', receive_sel_ph: 'Выберите активный заказ или сканируйте штрихкод',
    overdue_bracket: '[просрочка]', refresh: 'Обновить', receive_scan_hint: 'Считайте штрихкод предмета — он будет отмечен как возвращённый, затем укажите состояние.',
    select_order_above: 'Выберите заказ выше.', returned_at: 'сдано {t}', damage: 'повреждение',
    order_for: 'Заказ #{id} — {name}', issue_at: 'Выдача:', return_plan_at: 'План возврата:',
    returned_ratio: 'сдано {a} / {b}', units: 'Единицы', all_returned_total: 'Все предметы сданы. Итого: {v}',
    paid: 'Оплачено', to_refund: 'Возврат залога/сдачи: {v}', pay_refund: 'Оплата / возврат',
    close_order: 'Закрыть заказ', print_receipt: 'Печать квитанции',
    item_condition: 'Состояние предмета', condition_hint: 'Предмет возвращён. Укажите состояние.',
    ok_cond: 'В порядке', cancel: 'Отмена', damage_desc: 'Описание повреждения', record: 'Зафиксировать',
    accepted: 'Принято', damage_recorded: 'Повреждение зафиксировано', order_closed: 'Заказ #{id} закрыт',
    payment_order: 'Платёж — заказ #{id}', payment_summary: 'Итого: {v} · Залог: {d} · Оплачено: {p} · Возвраты: {r}',
    pay: 'Оплата', refund_type: 'Возврат (залога/сдачи)', method: 'Способ', cash: 'Наличные', card: 'Карта',
    save: 'Сохранить', saved: 'Сохранено',
    orders_title: 'Заказы', search_number_ph: 'поиск по номеру', num: '№', client_col: 'Клиент',
    issue_col: 'Выдача', plan_return_col: 'План возврата', status_col: 'Статус', deposit_col: 'Залог',
    payments: 'Платежи', date: 'Дата', no_payments: 'нет платежей', print: 'Печать', payment: 'Платёж', cancel_order_btn: 'Отменить',
    cancel_confirm: 'Отменить заказ #{id}?',
    receipt_title_short: 'Квитанция #{id}', receipt_title: 'Квитанция № {id}', return_at: 'Возврат:',
    stock_title: 'Склад', in_stock_count: 'На складе: {n}', rented_count: 'Выдано: {n}', service_count: 'Ремонт: {n}',
    total_count: 'Всего: {n}', inv_search_ph: 'поиск: штрихкод, модель, размер', all_categories: 'Все категории',
    add_item: 'Добавить инвентарь', print_labels: 'Печать этикеток', barcode: 'Штрихкод', type: 'Тип',
    model: 'Модель', size: 'Размер', condition: 'Состояние', label: 'Этикетка', edit: 'Изменить', retire: 'Списать',
    print_all_labels_confirm: 'Печатать этикетки для всех {n} предметов на складе?',
    category: 'Категория', count: 'Количество', brand: 'Бренд', size_full: 'Размер / длина / ростовка',
    barcode_auto: 'Штрихкод (назначается автоматически)', barcode_next_title: 'Следующий после последнего в базе',
    notes: 'Примечание', add: 'Добавить', added_count: 'Добавлено {n}',
    edit_item: 'Изменить {bc}', status: 'Статус', retire_confirm: 'Списать {bc} ({model})?', retired_done: 'Списано',
    session_active: 'Сессия #{id} — активна', inv_session_hint: 'Сканируйте штрихкоды предметов. Счёт: {s} из {exp}',
    expected: 'Ожидается', scanned: 'Отсканировано', missing: 'Не хватает',
    finish_show_missing: 'Завершить и показать не найденные', new_inventory: 'Новая инвентаризация',
    inv_note_ph: 'например: конец сезона', start: 'Начать', session_history: 'История сессий',
    finished: 'завершена', in_progress: 'в процессе', report: 'Отчёт', no_sessions: 'Пока нет сессий',
    session_started: 'Сессия #{id} начата. Сканируйте инвентарь.',
    inventory_title: 'Инвентаризация #{id}', missing_count: 'Не найдены ({n})', finish_session: 'Завершить сессию',
    continue_btn: 'Продолжить', completed: 'Завершено', inv_report_title: 'Инвентаризация #{id} — отчёт',
    not_finished: 'не завершена', inv_report_no: 'Инвентаризация № {id} · {t}', conducted: 'Провёл', approved: 'Утвердил',
    clients_title: 'Клиенты', full_name: 'ФИО', phone_col: 'Телефон', doc_col: 'Документ',
    name_ph: 'Иванов Иван Иванович', phone_ph: '+380...', doc_ph: 'паспорт/ID', create: 'Создать',
    enter_name: 'Введите ФИО', client_added: 'Клиент добавлен', client_selected: 'Клиент выбран',
    client_name_title: 'Клиент: {name}', client_info_line: 'Телефон: {phone} · Документ: {doc}',
    order_history: 'История заказов', no_orders: 'нет заказов', edit_client: 'Изменить клиента',
    rates_title: 'Тарифы и услуги', new_rate: 'Новый тариф',
    rate_intervals_hint: 'Интервал времени: < 24 ч — по часовая ставка; ≥ 24 ч — по суточной (если задана недельная — начиная с 6 суток).',
    kits: 'Комплекты', name: 'Название', composition: 'Состав', price_day_col: 'Цена/сутки',
    categories_title: 'Категории (за единицу)', hour: 'Час', day: 'Сутки', services: 'Услуги', price: 'Цена',
    per_unit: 'за единицу инвентаря', edit_short: 'Изм.', del_short: 'Уд.', edit_rate: 'Изменить тариф',
    kit: 'Комплект', category_per_unit: 'Категория (за единицу)', service_fixed: 'Услуга (фикс.)',
    kit_composition: 'Состав комплекта', add_position: '+ позиция',
    hour_grn: 'Час (грн)', day_grn: 'Сутки (грн)', week_grn: 'Неделя (грн)', season_grn: 'Сезон (грн)',
    flat_price_grn: 'Фиксированная цена (грн, для услуги)', delete_rate_confirm: 'Удалить тариф?',
    reports_title: 'Отчёты', from_date: 'С', to_date: 'По', show: 'Показать',
    cash_badge: 'Наличные: {v}', card_badge: 'Карта: {v}', total_received_badge: 'Итого поступило: {v}',
    refunds_badge: 'Возвраты: {v}', no_data: 'нет данных', daily_income: 'Поступления по дням',
    received_income: 'Поступило', refund_income: 'Возврат', utilization_top: 'Оборот инвентаря (топ)',
    rentals: 'Сдач', orders_period: 'Заказы за период', received_col: 'Получено', returned_col: 'Возвращено',
    settings_title: 'Настройки', biz_name_label: 'Название организации (в договорах)', currency_label: 'Валюта',
    default_deposit_label: 'Залог по умолчанию (грн)', late_fee_label: 'Штраф за просрочку (грн/сутки)',
    contractor_label: 'Контрагент / адрес', contract_phone_label: 'Телефон в договоре',
    backup: 'Резервная копия', backup_hint: 'База хранится в папке <span class="mono">data/prokat.db</span> рядом с приложением. Для бэкапа копируйте этот файл.',
    download_backup: 'Скачать копию базы', init_err: 'Ошибка инициализации: {e}'
  },
  uk: {
    app_title: 'Прокат', lang_name: 'Українська', tab_issue: 'Видача', tab_receive: 'Приймання', tab_orders: 'Замовлення', tab_inv: 'Склад',
    tab_invcheck: 'Інвентаризація', tab_clients: 'Клієнти', tab_rates: 'Тарифи', tab_reports: 'Звіти', tab_settings: 'Налаштування',
    srv_err: 'Помилка сервера', popup_blocked: 'Дозвольте спливаючі вікна',
    st_in_stock: 'На складі', st_rented: 'Видано', st_service: 'Ремонт', st_retired: 'Списано',
    st_active: 'Активний', st_returned: 'Повернуто', st_canceled: 'Скасовано',
    scanned: 'Відскановано: {code}', not_found: 'Не знайдено: {code}', not_found_plain: 'Не знайдено',
    item_rented: 'Предмет «{bc}» уже видано', item_service: 'Предмет «{bc}» у ремонті', item_retired: 'Предмет «{bc}» списано',
    already_added: 'Вже додано до замовлення: {bc}', added: 'Додано: {bc}', added_full: 'Додано: {v}',
    not_rented: 'Предмет {code} не в оренді', start_inv_session: 'Почніть сесію інвентаризації', scanned_inv: 'Відскановано: {v}',
    service_label: 'послуга', auto_pick: 'підбір', specific: 'конкретний', remove: 'Прибрати',
    issue_empty_hint: 'Відскануйте предмет або додайте комплект/послугу нижче.',
    issue_title: 'Видача інвентарю', overdue_warn: 'Прострочено повернення: {ids}',
    client: 'Клієнт', client_search_ph: 'ПІБ або телефон — пошук', pick_from_db: 'Вибрати з бази', new_client: 'Новий клієнт',
    order_positions: 'Позиції замовлення', kit_opt: 'Комплект…', category_opt: 'Окрема категорія…',
    pick_item: 'Вибрати конкретний предмет', service_opt: 'Послуга…', issue_scan_hint: 'Наведіть сканер на штрихкод предмета — він додасться до замовлення.',
    planned_return: 'Плановане повернення', deposit: 'Застава', comment: 'Коментар', comment_ph: 'за потреби',
    create_order: 'Оформити видачу', active_orders: 'Активні замовлення',
    cost_est: 'Вартість (оціночно): {v}', deposit_val: 'Застава: {v}', pay_at_issue: 'При видачі: {v}',
    no_active_orders: 'Активних замовлень немає', overdue_badge: 'прострочено', not_returned_count: 'не здано: {n}', receive_btn: 'Прийняти',
    found: 'Знайдено: {names}',
    client_pick_title: 'Вибір клієнта', search_ph: 'пошук', choose: 'Вибрати',
    pick_item_search_ph: 'пошук: тип, модель, розмір, штрихкод', no_stock: 'Немає предметів на складі',
    select_client: 'Виберіть клієнта', add_lines: 'Додайте позиції', order_created: 'Замовлення #{id} створено', order_title: 'Замовлення #{id}',
    print_contract: 'Друк договору', add_payment: 'Внести оплату', close: 'Закрити',
    client_label: 'Клієнт: {name}', issue_return_plan: 'Видача: {t} &nbsp; Повернення план: {t2}',
    position: 'Позиція', units_barcode: 'Одиниці (штрихкод)', amount: 'Сума', total: 'Разом',
    deposit_paid: 'Застава / оплачено', to_charge: 'До доплати: {v}',
    contract_title_short: 'Договір #{id}', contract_title: 'Договір прокату № {id}',
    phone_label: 'Телефон:', issue_date: 'Дата видачі:', return_plan: 'Повернення (план):',
    deposit_label: 'Застава:', comment_label: 'Коментар:', kind: 'Тип', issued_barcodes: 'Штрихкоди виданого',
    estimated_cost: 'Попередня вартість: {v}', contract_disclaimer: 'Остаточна вартість розраховується при поверненні за фактичним часом. За пошкодження або втрату інвентарю клієнт несе матеріальну відповідальність.',
    sign_client: 'Клієнт', sign_manager: 'Менеджер',
    receive_title: 'Приймання інвентарю', receive_sel_ph: 'Виберіть активне замовлення або скануйте штрихкод',
    overdue_bracket: '[прострочено]', refresh: 'Оновити', receive_scan_hint: 'Скануйте штрихкод предмета — його буде позначено як повернутий, потім укажіть стан.',
    select_order_above: 'Виберіть замовлення вище.', returned_at: 'здано {t}', damage: 'пошкодження',
    order_for: 'Замовлення #{id} — {name}', issue_at: 'Видача:', return_plan_at: 'План повернення:',
    returned_ratio: 'здано {a} / {b}', units: 'Одиниці', all_returned_total: 'Усі предмети здано. Разом: {v}',
    paid: 'Оплачено', to_refund: 'Повернення застави/решти: {v}', pay_refund: 'Оплата / повернення',
    close_order: 'Закрити замовлення', print_receipt: 'Друк квитанції',
    item_condition: 'Стан предмета', condition_hint: 'Предмет повернуто. Укажіть стан.',
    ok_cond: 'У порядку', cancel: 'Скасувати', damage_desc: 'Опис пошкодження', record: 'Зафіксувати',
    accepted: 'Прийнято', damage_recorded: 'Пошкодження зафіксовано', order_closed: 'Замовлення #{id} закрито',
    payment_order: 'Платіж — замовлення #{id}', payment_summary: 'Разом: {v} · Застава: {d} · Оплачено: {p} · Повернення: {r}',
    pay: 'Оплата', refund_type: 'Повернення (застави/решти)', method: 'Спосіб', cash: 'Готівка', card: 'Картка',
    save: 'Зберегти', saved: 'Збережено',
    orders_title: 'Замовлення', search_number_ph: 'пошук за номером', num: '№', client_col: 'Клієнт',
    issue_col: 'Видача', plan_return_col: 'План повернення', status_col: 'Статус', deposit_col: 'Застава',
    payments: 'Платежі', date: 'Дата', no_payments: 'немає платежів', print: 'Друк', payment: 'Платіж', cancel_order_btn: 'Скасувати',
    cancel_confirm: 'Скасувати замовлення #{id}?',
    receipt_title_short: 'Квитанція #{id}', receipt_title: 'Квитанція № {id}', return_at: 'Повернення:',
    stock_title: 'Склад', in_stock_count: 'На складі: {n}', rented_count: 'Видано: {n}', service_count: 'Ремонт: {n}',
    total_count: 'Всього: {n}', inv_search_ph: 'пошук: штрихкод, модель, розмір', all_categories: 'Всі категорії',
    add_item: 'Додати інвентар', print_labels: 'Друк етикеток', barcode: 'Штрихкод', type: 'Тип',
    model: 'Модель', size: 'Розмір', condition: 'Стан', label: 'Етикетка', edit: 'Змінити', retire: 'Списати',
    print_all_labels_confirm: 'Друкувати етикетки для всіх {n} предметів на складі?',
    category: 'Категорія', count: 'Кількість', brand: 'Бренд', size_full: 'Розмір / довжина / ростовка',
    barcode_auto: 'Штрихкод (призначається автоматично)', barcode_next_title: 'Наступний після останнього в базі',
    notes: 'Примітка', add: 'Додати', added_count: 'Додано {n}',
    edit_item: 'Змінити {bc}', status: 'Статус', retire_confirm: 'Списати {bc} ({model})?', retired_done: 'Списано',
    session_active: 'Сесія #{id} — активна', inv_session_hint: 'Скануйте штрихкоди предметів. Лічильник: {s} з {exp}',
    expected: 'Очікується', scanned: 'Відскановано', missing: 'Бракує',
    finish_show_missing: 'Завершити і показати не знайдені', new_inventory: 'Нова інвентаризація',
    inv_note_ph: 'наприклад: кінець сезону', start: 'Почати', session_history: 'Історія сесій',
    finished: 'завершено', in_progress: 'в процесі', report: 'Звіт', no_sessions: 'Поки немає сесій',
    session_started: 'Сесію #{id} розпочато. Скануйте інвентар.',
    inventory_title: 'Інвентаризація #{id}', missing_count: 'Не знайдено ({n})', finish_session: 'Завершити сесію',
    continue_btn: 'Продовжити', completed: 'Завершено', inv_report_title: 'Інвентаризація #{id} — звіт',
    not_finished: 'не завершена', inv_report_no: 'Інвентаризація № {id} · {t}', conducted: 'Провів', approved: 'Затвердив',
    clients_title: 'Клієнти', full_name: 'ПІБ', phone_col: 'Телефон', doc_col: 'Документ',
    name_ph: 'Іванов Іван Іванович', phone_ph: '+380...', doc_ph: 'паспорт/ID', create: 'Створити',
    enter_name: 'Введіть ПІБ', client_added: 'Клієнта додано', client_selected: 'Клієнта вибрано',
    client_name_title: 'Клієнт: {name}', client_info_line: 'Телефон: {phone} · Документ: {doc}',
    order_history: 'Історія замовлень', no_orders: 'немає замовлень', edit_client: 'Змінити клієнта',
    rates_title: 'Тарифи та послуги', new_rate: 'Новий тариф',
    rate_intervals_hint: 'Інтервал часу: < 24 год — погодинна ставка; ≥ 24 год — добова (якщо задана тижнева — починаючи з 6 діб).',
    kits: 'Комплекти', name: 'Назва', composition: 'Склад', price_day_col: 'Ціна/доба',
    categories_title: 'Категорії (за одиницю)', hour: 'Година', day: 'Доба', services: 'Послуги', price: 'Ціна',
    per_unit: 'за одиницю інвентарю', edit_short: 'Зм.', del_short: 'Вид.', edit_rate: 'Змінити тариф',
    kit: 'Комплект', category_per_unit: 'Категорія (за одиницю)', service_fixed: 'Послуга (фікс.)',
    kit_composition: 'Склад комплекту', add_position: '+ позиція',
    hour_grn: 'Година (грн)', day_grn: 'Доба (грн)', week_grn: 'Тиждень (грн)', season_grn: 'Сезон (грн)',
    flat_price_grn: 'Фіксована ціна (грн, для послуги)', delete_rate_confirm: 'Видалити тариф?',
    reports_title: 'Звіти', from_date: 'З', to_date: 'По', show: 'Показати',
    cash_badge: 'Готівка: {v}', card_badge: 'Картка: {v}', total_received_badge: 'Разом надійшло: {v}',
    refunds_badge: 'Повернення: {v}', no_data: 'немає даних', daily_income: 'Надходження по днях',
    received_income: 'Надійшло', refund_income: 'Повернення', utilization_top: 'Оборот інвентарю (топ)',
    rentals: 'Здач', orders_period: 'Замовлення за період', received_col: 'Отримано', returned_col: 'Повернуто',
    settings_title: 'Налаштування', biz_name_label: 'Назва організації (у договорах)', currency_label: 'Валюта',
    default_deposit_label: 'Застава за замовчуванням (грн)', late_fee_label: 'Штраф за прострочення (грн/доба)',
    contractor_label: 'Контрагент / адреса', contract_phone_label: 'Телефон у договорі',
    backup: 'Резервна копія', backup_hint: 'База зберігається в папці <span class="mono">data/prokat.db</span> поруч із застосунком. Для бекапу копіюйте цей файл.',
    download_backup: 'Завантажити копію бази', init_err: 'Помилка ініціалізації: {e}'
  },
  en: {
    app_title: 'Rental', lang_name: 'English', tab_issue: 'Issue', tab_receive: 'Return', tab_orders: 'Orders', tab_inv: 'Stock',
    tab_invcheck: 'Inventory', tab_clients: 'Clients', tab_rates: 'Rates', tab_reports: 'Reports', tab_settings: 'Settings',
    srv_err: 'Server error', popup_blocked: 'Allow pop-up windows',
    st_in_stock: 'In stock', st_rented: 'Issued', st_service: 'Repair', st_retired: 'Retired',
    st_active: 'Active', st_returned: 'Returned', st_canceled: 'Canceled',
    scanned: 'Scanned: {code}', not_found: 'Not found: {code}', not_found_plain: 'Not found',
    item_rented: 'Item «{bc}» is already issued', item_service: 'Item «{bc}» is in repair', item_retired: 'Item «{bc}» is retired',
    already_added: 'Already added to order: {bc}', added: 'Added: {bc}', added_full: 'Added: {v}',
    not_rented: 'Item {code} is not on rent', start_inv_session: 'Start an inventory session', scanned_inv: 'Scanned: {v}',
    service_label: 'service', auto_pick: 'auto', specific: 'specific', remove: 'Remove',
    issue_empty_hint: 'Scan an item or add a kit/service below.',
    issue_title: 'Issue equipment', overdue_warn: 'Overdue returns: {ids}',
    client: 'Client', client_search_ph: 'Name or phone — search', pick_from_db: 'Pick from base', new_client: 'New client',
    order_positions: 'Order items', kit_opt: 'Kit…', category_opt: 'Single category…',
    pick_item: 'Pick a specific item', service_opt: 'Service…', issue_scan_hint: 'Point the scanner at the item barcode — it will be added to the order.',
    planned_return: 'Planned return', deposit: 'Deposit', comment: 'Comment', comment_ph: 'if needed',
    create_order: 'Issue order', active_orders: 'Active orders',
    cost_est: 'Cost (estimate): {v}', deposit_val: 'Deposit: {v}', pay_at_issue: 'To pay at issue: {v}',
    no_active_orders: 'No active orders', overdue_badge: 'overdue', not_returned_count: 'not returned: {n}', receive_btn: 'Accept',
    found: 'Found: {names}',
    client_pick_title: 'Pick client', search_ph: 'search', choose: 'Choose',
    pick_item_search_ph: 'search: type, model, size, barcode', no_stock: 'No items in stock',
    select_client: 'Select a client', add_lines: 'Add items', order_created: 'Order #{id} created', order_title: 'Order #{id}',
    print_contract: 'Print contract', add_payment: 'Add payment', close: 'Close',
    client_label: 'Client: {name}', issue_return_plan: 'Issued: {t} &nbsp; Return plan: {t2}',
    position: 'Item', units_barcode: 'Units (barcode)', amount: 'Amount', total: 'Total',
    deposit_paid: 'Deposit / paid', to_charge: 'To pay extra: {v}',
    contract_title_short: 'Contract #{id}', contract_title: 'Rental contract № {id}',
    phone_label: 'Phone:', issue_date: 'Issue date:', return_plan: 'Return (plan):',
    deposit_label: 'Deposit:', comment_label: 'Comment:', kind: 'Type', issued_barcodes: 'Issued barcodes',
    estimated_cost: 'Estimated cost: {v}', contract_disclaimer: 'The final cost is calculated at return based on actual time. The client is financially responsible for damage or loss of equipment.',
    sign_client: 'Client', sign_manager: 'Manager',
    receive_title: 'Return equipment', receive_sel_ph: 'Select an active order or scan a barcode',
    overdue_bracket: '[overdue]', refresh: 'Refresh', receive_scan_hint: 'Scan an item barcode — it will be marked as returned, then specify its condition.',
    select_order_above: 'Select an order above.', returned_at: 'returned {t}', damage: 'damage',
    order_for: 'Order #{id} — {name}', issue_at: 'Issued:', return_plan_at: 'Return plan:',
    returned_ratio: 'returned {a} / {b}', units: 'Units', all_returned_total: 'All items returned. Total: {v}',
    paid: 'Paid', to_refund: 'Refund deposit/change: {v}', pay_refund: 'Payment / refund',
    close_order: 'Close order', print_receipt: 'Print receipt',
    item_condition: 'Item condition', condition_hint: 'Item returned. Specify its condition.',
    ok_cond: 'OK', cancel: 'Cancel', damage_desc: 'Damage description', record: 'Record',
    accepted: 'Accepted', damage_recorded: 'Damage recorded', order_closed: 'Order #{id} closed',
    payment_order: 'Payment — order #{id}', payment_summary: 'Total: {v} · Deposit: {d} · Paid: {p} · Refunds: {r}',
    pay: 'Payment', refund_type: 'Refund (deposit/change)', method: 'Method', cash: 'Cash', card: 'Card',
    save: 'Save', saved: 'Saved',
    orders_title: 'Orders', search_number_ph: 'search by number', num: '№', client_col: 'Client',
    issue_col: 'Issue', plan_return_col: 'Return plan', status_col: 'Status', deposit_col: 'Deposit',
    payments: 'Payments', date: 'Date', no_payments: 'no payments', print: 'Print', payment: 'Payment', cancel_order_btn: 'Cancel',
    cancel_confirm: 'Cancel order #{id}?',
    receipt_title_short: 'Receipt #{id}', receipt_title: 'Receipt № {id}', return_at: 'Return:',
    stock_title: 'Stock', in_stock_count: 'In stock: {n}', rented_count: 'Issued: {n}', service_count: 'Repair: {n}',
    total_count: 'Total: {n}', inv_search_ph: 'search: barcode, model, size', all_categories: 'All categories',
    add_item: 'Add item', print_labels: 'Print labels', barcode: 'Barcode', type: 'Type',
    model: 'Model', size: 'Size', condition: 'Condition', label: 'Label', edit: 'Edit', retire: 'Retire',
    print_all_labels_confirm: 'Print labels for all {n} items in stock?',
    category: 'Category', count: 'Quantity', brand: 'Brand', size_full: 'Size / length',
    barcode_auto: 'Barcode (auto-assigned)', barcode_next_title: 'Next after the last one in the database',
    notes: 'Notes', add: 'Add', added_count: 'Added {n}',
    edit_item: 'Edit {bc}', status: 'Status', retire_confirm: 'Retire {bc} ({model})?', retired_done: 'Retired',
    session_active: 'Session #{id} — active', inv_session_hint: 'Scan item barcodes. Count: {s} of {exp}',
    expected: 'Expected', scanned: 'Scanned', missing: 'Missing',
    finish_show_missing: 'Finish and show missing', new_inventory: 'New inventory',
    inv_note_ph: 'e.g. end of season', start: 'Start', session_history: 'Session history',
    finished: 'finished', in_progress: 'in progress', report: 'Report', no_sessions: 'No sessions yet',
    session_started: 'Session #{id} started. Scan items.',
    inventory_title: 'Inventory #{id}', missing_count: 'Not found ({n})', finish_session: 'Finish session',
    continue_btn: 'Continue', completed: 'Completed', inv_report_title: 'Inventory #{id} — report',
    not_finished: 'not finished', inv_report_no: 'Inventory № {id} · {t}', conducted: 'Conducted by', approved: 'Approved by',
    clients_title: 'Clients', full_name: 'Full name', phone_col: 'Phone', doc_col: 'Document',
    name_ph: 'John Doe', phone_ph: '+380...', doc_ph: 'passport/ID', create: 'Create',
    enter_name: 'Enter full name', client_added: 'Client added', client_selected: 'Client selected',
    client_name_title: 'Client: {name}', client_info_line: 'Phone: {phone} · Document: {doc}',
    order_history: 'Order history', no_orders: 'no orders', edit_client: 'Edit client',
    rates_title: 'Rates and services', new_rate: 'New rate',
    rate_intervals_hint: 'Time interval: < 24 h — hourly rate; ≥ 24 h — daily rate (weekly rate applies from 6 days).',
    kits: 'Kits', name: 'Name', composition: 'Composition', price_day_col: 'Price/day',
    categories_title: 'Categories (per unit)', hour: 'Hour', day: 'Day', services: 'Services', price: 'Price',
    per_unit: 'per unit of equipment', edit_short: 'Edit', del_short: 'Del.', edit_rate: 'Edit rate',
    kit: 'Kit', category_per_unit: 'Category (per unit)', service_fixed: 'Service (fixed)',
    kit_composition: 'Kit composition', add_position: '+ item',
    hour_grn: 'Hour (uah)', day_grn: 'Day (uah)', week_grn: 'Week (uah)', season_grn: 'Season (uah)',
    flat_price_grn: 'Fixed price (uah, for services)', delete_rate_confirm: 'Delete rate?',
    reports_title: 'Reports', from_date: 'From', to_date: 'To', show: 'Show',
    cash_badge: 'Cash: {v}', card_badge: 'Card: {v}', total_received_badge: 'Total received: {v}',
    refunds_badge: 'Refunds: {v}', no_data: 'no data', daily_income: 'Daily income',
    received_income: 'Received', refund_income: 'Refund', utilization_top: 'Equipment turnover (top)',
    rentals: 'Rentals', orders_period: 'Orders for period', received_col: 'Received', returned_col: 'Returned',
    settings_title: 'Settings', biz_name_label: 'Organization name (in contracts)', currency_label: 'Currency',
    default_deposit_label: 'Default deposit (uah)', late_fee_label: 'Late fee (uah/day)',
    contractor_label: 'Contractor / address', contract_phone_label: 'Phone in contract',
    backup: 'Backup', backup_hint: 'The database is stored in <span class="mono">data/prokat.db</span> next to the app. Copy this file to back it up.',
    download_backup: 'Download database copy', init_err: 'Initialization error: {e}'
  }
};

let LANG = 'ru';
try { LANG = localStorage.getItem('prokat_lang') || 'ru'; } catch (e) { /* ignore */ }
const LANG_CODE = { uk: 'УКР', ru: 'РУС', en: 'ENG' };
const LANG_ORDER = ['uk', 'ru', 'en'];

function cycleLang() {
  const i = LANG_ORDER.indexOf(LANG);
  setLang(LANG_ORDER[(i < 0 ? 0 : i) + 1] || LANG_ORDER[0]);
}

function t(k, vars) {
  let s = (I18N[LANG] && I18N[LANG][k]) || I18N.ru[k] || k;
  if (vars) for (const p in vars) s = s.split('{' + p + '}').join(String(vars[p]));
  return s;
}

function setLang(l) {
  if (!I18N[l]) return;
  LANG = l;
  try { localStorage.setItem('prokat_lang', l); } catch (e) { /* ignore */ }
  document.documentElement.lang = l === 'ru' ? 'ru' : l === 'uk' ? 'uk' : 'en';
  const btn = $('#lang-btn');
  if (btn) { btn.textContent = LANG_CODE[l]; btn.title = I18N[l].lang_name; }
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  const biz = (state.settings && state.settings.business_name) || t('app_title');
  const br = $('#brand');
  if (br) br.textContent = biz;
  document.title = biz;
  if (state.tab) switchTab(state.tab);
}

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

async function api(url, opts) {
  const res = await fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts || {}));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || t('srv_err'));
  return data;
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.style.display = 'none'; }, 2600);
}

function money(n) {
  return (Math.round(n * 100) / 100).toFixed(2) + ' ' + (state.settings.currency || 'грн');
}

function fmtDT(str) {
  if (!str) return '—';
  return String(str).slice(0, 16).replace('T', ' ');
}

function nowLocalInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function catName(id) {
  const c = state.categories.find((x) => x.id === id);
  return c ? c.name : '';
}

function pricingActive(kind) {
  return state.pricings.filter((p) => p.active && p.kind === kind);
}

function openModal(title, bodyHtml) {
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal"><button class="close">&times;</button><h2>${esc(title)}</h2><div class="body">${bodyHtml}</div></div>`;
  $('.close', root).onclick = closeModal;
  root.classList.add('open');
  return $('.modal .body', root);
}

function closeModal() {
  $('#modal-root').classList.remove('open');
  $('#modal-root').innerHTML = '';
}

function confirmAction(msg) {
  return window.confirm(msg);
}

function printHtml(title, html) {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) { toast(t('popup_blocked')); return; }
  w.document.write(`<!DOCTYPE html><html lang="${LANG}"><head><meta charset="utf-8"><title>${esc(title)}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; font-size: 13px; padding: 24px; }
    h1 { font-size: 17px; margin: 0 0 4px; } h2 { font-size: 14px; margin: 0 0 14px; font-weight: 600; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #999; padding: 5px 8px; text-align: left; font-size: 12px; }
    th { background: #eee; }
    .tot { margin-top: 12px; font-weight: 700; }
    .sig { margin-top: 40px; display: flex; gap: 60px; }
    .sig div { border-top: 1px solid #333; padding-top: 4px; width: 200px; font-size: 12px; }
  </style></head><body onload="window.print()">${html}</body></html>`);
  w.document.close();
}

function statusBadge(s) {
  const map = {
    in_stock: t('st_in_stock'), rented: t('st_rented'), service: t('st_service'), retired: t('st_retired'),
    active: t('st_active'), returned: t('st_returned'), canceled: t('st_canceled')
  };
  return `<span class="badge ${esc(s)}">${esc(map[s] || s)}</span>`;
}

async function init() {
  const [b] = await Promise.all([api('/api/bootstrap')]);
  state.categories = b.categories;
  state.pricings = b.pricings;
  state.settings = b.settings;
  const biz = state.settings.business_name || t('app_title');
  $('#brand').textContent = biz;
  document.title = biz;
  bindNav();
  await Promise.all([renderIssue(), renderDashboard()]);
  switchTab('issue');
  $(`[data-tab="issue"]`).click();
  setLang(LANG);
}

function bindNav() {
  $$('#nav button').forEach((b) => {
    b.onclick = () => switchTab(b.dataset.tab);
  });
}

async function switchTab(tab) {
  state.tab = tab;
  $$('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $$('.view').forEach((v) => v.classList.toggle('active', v.id === 'tab-' + tab));
  if (tab === 'issue') { state.draft = { client: null, lines: [], planned_end: '', deposit: null, notes: '' }; }
  if (tab === 'receive') { state.receiveOrderId = null; }
  const renderers = {
    issue: renderIssue, receive: renderReceive, orders: renderOrders,
    inv: renderInv, invcheck: renderInvCheck, clients: renderClients,
    rates: renderRates, reports: renderReports, settings: renderSettings
  };
  await renderers[tab]();
}

let scanBuf = '';
let scanTimer = null;
window.addEventListener('keydown', (e) => {
  if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName) && !e.ctrlKey && !e.metaKey) {
    if (e.key === 'Enter' && e.target.classList.contains('nocatch')) return;
    if (e.key === 'Enter' || e.key.length === 1) {
      scanBuf = '';
      return;
    }
  }
  if (e.key === 'Enter') {
    const code = scanBuf.trim();
    scanBuf = '';
    if (code) onScan(code);
    return;
  }
  if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
    scanBuf += e.key;
    clearTimeout(scanTimer);
    scanTimer = setTimeout(() => { scanBuf = ''; }, 90);
  }
});

async function onScan(code) {
  if (state.tab === 'receive') return receiveScan(code);
  if (state.tab === 'issue') return issueScan(code);
  if (state.tab === 'invcheck') return invCheckScan(code);
  toast(t('scanned', { code }));
}

async function issueScan(code) {
  try {
    const items = await api('/api/items?q=' + encodeURIComponent(code));
    const it = items.find((x) => x.barcode === code);
    if (!it) return toast(t('not_found', { code }));
    if (it.status !== 'in_stock') {
      const msg = it.status === 'rented' ? t('item_rented', { bc: it.barcode })
        : it.status === 'service' ? t('item_service', { bc: it.barcode })
        : t('item_retired', { bc: it.barcode });
      return toast(msg);
    }
    if (state.draft.lines.some((l) => l.pin === it.id)) return toast(t('already_added', { bc: it.barcode }));
    if (!state.pricings.some((p) => p.kind === 'category' && p.category_id === it.category_id && p.active)) {
      const p = await api('/api/pricings', { method: 'POST', body: JSON.stringify({
        name: it.cat_name, kind: 'category', category_id: it.category_id, price_hour: 0, price_day: 250, price_flat: 0 }) });
      state.pricings.push({ id: p.id, name: it.cat_name, kind: 'category', category_id: it.category_id });
    }
    const pricing = state.pricings.find((p) => p.kind === 'category' && p.category_id === it.category_id);
    state.draft.lines.push({
      pricing_id: pricing.id, kind: 'category', name: pricing.name, qty: 1, pin: it.id,
      barcode: it.barcode, model: it.model + ' ' + it.size, cat_name: it.cat_name });
    toast(t('added', { bc: it.barcode }));
    renderIssue();
  } catch (e) { toast(e.message); }
}

async function receiveScan(code) {
  try {
    const r = await api('/api/lookup-unit', { method: 'POST', body: JSON.stringify({ barcode: code }) });
    if (!r.found) {
      if (r.reason === 'not_rented') return toast(t('not_rented', { code }));
      return toast(t('not_found', { code }));
    }
    state.receiveOrderId = r.order_id;
    await renderReceive();
    setTimeout(() => conditionModal(r.unit_id), 120);
  } catch (e) { toast(e.message); }
}

async function invCheckScan(code) {
  try {
    if (!state.invSessionId) return toast(t('start_inv_session'));
    const r = await api('/api/inventory/scan', { method: 'POST', body: JSON.stringify({ session_id: state.invSessionId, barcode: code }) });
    if (!r.found) return toast(r.error || t('not_found_plain'));
    toast(t('scanned_inv', { v: r.item.barcode + ' ' + r.item.model + ' ' + r.item.size }));
  } catch (e) { toast(e.message); }
}

async function renderDashboard() {}

async function renderIssue() {
  const el = $('#tab-issue');
  const st = state.draft;
  const activeOrders = await api('/api/orders/active');
  const overdue = activeOrders.filter((o) => o.overdue);

  const linesHtml = st.lines.length ? st.lines.map((l, i) => `
    <div class="line">
      <span class="mono">${esc(l.barcode || (l.kind === 'service' ? t('service_label') : t('auto_pick')))}</span>
      <b>${esc(l.name)}</b>
      ${l.model ? `<span class="small">${esc(l.model)}</span>` : ''}
      <span class="badge in_stock" style="display:${l.pin ? 'inline-block' : 'none'}">${t('specific')}</span>
      ${l.pin ? '<span class="small">×1</span>' : `<input type="number" min="1" value="${l.qty}" style="width:60px" onchange="setDraftQty(${i}, this.value)">`}
      <button class="btn sm ghost" onclick="removeDraftLine(${i})">${t('remove')}</button>
    </div>`).join('') : '<div class="muted">' + t('issue_empty_hint') + '</div>';

  el.innerHTML = `
    <div class="card">
      <h2>${t('issue_title')}</h2>
      ${overdue.length ? `<div class="status-box warn">${t('overdue_warn', { ids: overdue.map((o) => '#' + o.id).join(', ') })}</div>` : ''}
      <div class="row">
        <div class="grow">
          <label>${t('client')}</label>
          <input id="i-client" placeholder="${t('client_search_ph')}" oninput="debouncedClientSearch(this.value)">
          <input type="hidden" id="i-client-id">
        </div>
        <button class="btn ghost" onclick="clientModal()">${t('pick_from_db')}</button>
        <button class="btn" onclick="newClientModal()">${t('new_client')}</button>
      </div>
      <div id="i-client-info" class="small"></div>
    </div>

    <div class="card">
      <h3>${t('order_positions')}</h3>
      <div id="draft-lines">${linesHtml}</div>
      <div class="row" style="margin-top:10px">
        <select id="i-kit" onchange="addKit(this)"><option value="">${t('kit_opt')}</option>
          ${pricingActive('kit').map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}
        </select>
        <select id="i-cat" onchange="addCategory(this)"><option value="">${t('category_opt')}</option>
          ${pricingActive('category').map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}
        </select>
        <button class="btn ghost" onclick="pickItemModal()">${t('pick_item')}</button>
        <select id="i-svc" onchange="addService(this)"><option value="">${t('service_opt')}</option>
          ${pricingActive('service').map((p) => `<option value="${p.id}">${esc(p.name)} — ${money(p.price_flat)}</option>`).join('')}
        </select>
      </div>
      <div class="scan-hint" style="margin-top:8px">${t('issue_scan_hint')}</div>
    </div>

    <div class="card">
      <div class="row">
        <div class="grow">
          <label>${t('planned_return')}</label>
          <input type="datetime-local" id="i-end" value="${st.planned_end}" oninput="updateIssueTotal()">
        </div>
        <div class="grow">
          <label>${t('deposit')}</label>
          <input type="number" id="i-deposit" placeholder="0" value="${st.deposit == null ? state.settings.deposit_default : st.deposit}" oninput="updateIssueTotal()">
        </div>
        <div class="grow">
          <label>${t('comment')}</label>
          <input id="i-notes" placeholder="${t('comment_ph')}" value="${esc(st.notes)}">
        </div>
      </div>
      <div style="margin-top:12px" class="row" id="issue-total"></div>
      <div style="margin-top:12px">
        <button class="btn green" onclick="createOrder()">${t('create_order')}</button>
      </div>
    </div>

    <div class="card">
      <h3>${t('active_orders')}</h3>
      <div id="active-list"></div>
    </div>
  `;
  renderActiveList(activeOrders);
  updateIssueTotal();
  if (st.client) setClientBox(st.client);
}

function debouncedClientSearch(q) {
  if (q.length < 2) return;
  clearTimeout(this._t);
  this._t = setTimeout(async () => {
    const list = await api('/api/clients?q=' + encodeURIComponent(q)).catch(() => []);
    if (list.length) {
      const names = list.map((c) => c.name + ' (' + c.phone + ')').join('\n');
      toast(t('found', { names }));
    }
  }, 400);
}

function setClientBox(client) {
  state.draft.client = client;
  const info = $('#i-client-info');
  if (info) info.innerHTML = `<b>${esc(client.name)}</b> ${esc(client.phone)} ${esc(client.doc)} <button class="btn sm ghost" onclick="clientRemove()">×</button>`;
  const hid = $('#i-client-id');
  if (hid) hid.value = client.id;
}

function clientRemove() {
  state.draft.client = null;
  $('#i-client').value = '';
  $('#i-client-id').value = '';
  $('#i-client-info').innerHTML = '';
}

function setDraftQty(i, v) {
  state.draft.lines[i].qty = Math.max(1, parseInt(v) || 1);
  renderIssue();
}
function removeDraftLine(i) {
  state.draft.lines.splice(i, 1);
  renderIssue();
}

function addKit(sel) {
  const p = state.pricings.find((x) => x.id == sel.value);
  if (p) { state.draft.lines.push({ pricing_id: p.id, kind: 'kit', name: p.name, qty: 1 }); renderIssue(); }
}
function addCategory(sel) {
  const p = state.pricings.find((x) => x.id == sel.value);
  if (p) { state.draft.lines.push({ pricing_id: p.id, kind: 'category', name: p.name, qty: 1 }); renderIssue(); }
}
function addService(sel) {
  const p = state.pricings.find((x) => x.id == sel.value);
  if (p) { state.draft.lines.push({ pricing_id: p.id, kind: 'service', name: p.name, qty: 1, price: p.price_flat }); renderIssue(); }
}

function pickRows(list) {
  return list.map((i) => `
    <div class="line">
      <span class="mono">${esc(i.barcode)}</span>
      <b>${esc(i.cat_name)}</b>
      <span class="small">${esc(i.brand)} ${esc(i.model)} ${esc(i.size)} (${esc(i.cond)})</span>
      <button class="btn sm" data-bc="${esc(i.barcode)}" onclick="pickItemDo(this.dataset.bc)">${t('choose')}</button>
    </div>`).join('') || '<div class="muted">' + t('no_stock') + '</div>';
}

async function pickItemModal() {
  const all = await api('/api/items?status=in_stock');
  const used = new Set(state.draft.lines.filter((l) => l.pin).map((l) => l.pin));
  const items = all.filter((i) => !used.has(i.id));
  window._pickItems = items;
  openModal(t('pick_item'), `
    <input id="pk-q" placeholder="${t('pick_item_search_ph')}" oninput="pickFilter(this.value)">
    <div id="pk-list" style="max-height:420px;overflow:auto;margin-top:8px">${pickRows(items)}</div>`);
}

function pickFilter(q) {
  const list = window._pickItems || [];
  const f = list.filter((i) => (i.barcode + i.cat_name + i.brand + i.model + i.size).toLowerCase().includes(q.toLowerCase()));
  $('#pk-list').innerHTML = pickRows(f);
}

async function pickItemDo(barcode) {
  const it = (window._pickItems || []).find((x) => x.barcode === barcode);
  if (!it) return toast(t('not_found', { code: barcode }));
  if (state.draft.lines.some((l) => l.pin === it.id)) return toast(t('already_added', { bc: barcode }));
  if (!state.pricings.some((p) => p.kind === 'category' && p.category_id === it.category_id && p.active)) {
    const p = await api('/api/pricings', { method: 'POST', body: JSON.stringify({
      name: it.cat_name, kind: 'category', category_id: it.category_id,
      price_hour: 0, price_day: 250, price_flat: 0 }) });
    state.pricings.push({ id: p.id, name: it.cat_name, kind: 'category', category_id: it.category_id });
  }
  state.draft.lines.push({
    pricing_id: state.pricings.find((p) => p.kind === 'category' && p.category_id === it.category_id).id,
    kind: 'category', name: it.cat_name, qty: 1, pin: it.id,
    barcode: it.barcode, model: it.brand + ' ' + it.model + ' ' + it.size, cat_name: it.cat_name });
  toast(t('added_full', { v: it.barcode + ' ' + it.model + ' ' + it.size }));
  closeModal();
  renderIssue();
}

function estimateDraft() {
  const end = $('#i-end') ? $('#i-end').value : state.draft.planned_end;
  const start = new Date();
  let total = 0;
  state.draft.lines.forEach((l) => {
    const p = state.pricings.find((x) => x.id === l.pricing_id);
    if (!p) return;
    if (p.kind === 'service') { total += p.price_flat * l.qty; return; }
    const h = Math.max(1, Math.ceil((new Date(end || new Date().toISOString().slice(0, 19).replace('T', ' ')) - start) / 3600000));
    let cost;
    if (p.price_week && h >= 144) cost = Math.ceil(h / 168) * p.price_week;
    else if (h >= 24) cost = Math.ceil(h / 24) * p.price_day;
    else if (p.price_hour) cost = h * p.price_hour;
    else cost = p.price_day;
    const units = p.kind === 'kit' ? (p.kitItems || []).reduce((s, k) => s + k.qty, 0) : l.qty;
    total += p.kind === 'kit' ? cost : cost * units;
  });
  return { total: Math.round(total * 100) / 100, end };
}

function updateIssueTotal() {
  const box = $('#issue-total');
  if (!box) return;
  const est = estimateDraft();
  const dep = parseFloat(($('#i-deposit') || {}).value) || 0;
  box.innerHTML = `<div class="drafter" style="width:100%">
    ${t('cost_est', { v: money(est.total) })} ·
    ${t('deposit_val', { v: money(dep) })} ·
    ${t('pay_at_issue', { v: money(est.total + dep) })}
  </div>`;
}

function draftToCreate() {
  return {
    client_id: state.draft.client ? state.draft.client.id : null,
    planned_end: ($('#i-end').value || '').replace('T', ' '),
    deposit: parseFloat($('#i-deposit').value) || 0,
    notes: $('#i-notes').value,
    lines: state.draft.lines.map((l) => ({ pricing_id: l.pricing_id, qty: l.qty, item_pin: l.pin || null }))
  };
}

async function createOrder() {
  try {
    const body = draftToCreate();
    if (!body.client_id) return toast(t('select_client'));
    if (!body.lines.length) return toast(t('add_lines'));
    const order = await api('/api/orders', { method: 'POST', body: JSON.stringify(body) });
    state.draft = { client: null, lines: [], planned_end: '', deposit: null, notes: '' };
    toast(t('order_created', { id: order.id }));
    openModal(t('order_title', { id: order.id }), orderDetailHtml(order) + `
      <div class="row" style="margin-top:14px">
        <button class="btn" onclick="printContract()">${t('print_contract')}</button>
        <button class="btn green" onclick="recordPaymentModal(${order.id})">${t('add_payment')}</button>
        <button class="btn ghost" onclick="closeModal()">${t('close')}</button>
      </div>`);
    window._lastOrder = order;
    renderIssue();
  } catch (e) { toast(e.message); }
}

function orderDetailHtml(order) {
  const rows = order.items.map((oi) => `
    <tr><td>${esc(oi.name)}</td>
    <td>${oi.units.map((u) => `<span class="mono small">${esc(u.barcode)} ${esc(u.size)}${u.return_time ? ' ✓' : ''}</span>`).join('<br>') || '—'}</td>
    <td class="right">${money(oi.cost)}</td></tr>`).join('');
  return `
    <p class="small">${t('client_label', { name: esc(order.client ? order.client.name : '') })} ${esc(order.client ? order.client.phone : '')}</p>
    <p class="small">${t('issue_return_plan', { t: fmtDT(order.started_at), t2: fmtDT(order.planned_end) })}</p>
    <table><thead><tr><th>${t('position')}</th><th>${t('units_barcode')}</th><th class="right">${t('amount')}</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="total-row"><span>${t('total')}</span><span>${money(order.final_total)}</span></div>
    <div class="total-row"><span>${t('deposit_paid')}</span><span>${money(order.deposit)} / ${money(order.paid)}</span></div>
    ${order.to_charge ? `<div class="status-box warn">${t('to_charge', { v: money(order.to_charge) })}</div>` : ''}`;
}

function printContract() {
  const order = window._lastOrder;
  if (!order) return;
  const biz = state.settings.business_name || t('app_title');
  const lines = order.items.map((oi) => `
    <tr><td>${esc(oi.name)}</td>
    <td>${esc(oi.kind)}</td>
    <td>${oi.units.map((u) => esc(u.barcode)).join(', ')}</td>
    <td class="right">${money(oi.cost)}</td></tr>`).join('');
  printHtml(t('contract_title_short', { id: order.id }), `
    <h1>${esc(biz)}</h1>
    <h2>${t('contract_title', { id: order.id })}</h2>
    <div class="grid">
      <div><b>${t('client_label', { name: '' })}</b> ${esc(order.client ? order.client.name : '')}</div>
      <div><b>${t('phone_label')}</b> ${esc(order.client ? order.client.phone : '')}</div>
      <div><b>${t('issue_date')}</b> ${fmtDT(order.started_at)}</div>
      <div><b>${t('return_plan')}</b> ${fmtDT(order.planned_end)}</div>
      <div><b>${t('deposit_label')}</b> ${money(order.deposit)}</div>
      <div><b>${t('comment_label')}</b> ${esc(order.notes)}</div>
    </div>
    <table><thead><tr><th>${t('position')}</th><th>${t('kind')}</th><th>${t('issued_barcodes')}</th><th class="right">${t('amount')}</th></tr></thead><tbody>${lines}</tbody></table>
    <p class="tot">${t('estimated_cost', { v: money(order.estimated_total) })}</p>
    <p class="small">${t('contract_disclaimer')}</p>
    <div class="sig"><div>${t('sign_client')}</div><div>${t('sign_manager')}</div></div>`);
}

async function renderActiveList(activeOrders) {
  const el = $('#active-list');
  if (!el) return;
  if (!activeOrders) activeOrders = await api('/api/orders/active');
  if (!activeOrders.length) { el.innerHTML = '<div class="muted">' + t('no_active_orders') + '</div>'; return; }
  el.innerHTML = activeOrders.map((o) => `
    <div class="line">
      <b>#${o.id}</b> ${esc(o.client_name)}
      <span class="small">${fmtDT(o.started_at)}</span>
      ${o.overdue ? `<span class="badge overdue">${t('overdue_badge')}</span>` : ''}
      <span class="small">${t('not_returned_count', { n: o.units_left })}</span>
      <button class="btn sm" onclick="goReceive(${o.id})">${t('receive_btn')}</button>
    </div>`).join('');
}

function goReceive(id) { state.receiveOrderId = id; switchTab('receive'); }

async function renderReceive() {
  const el = $('#tab-receive');
  const activeOrders = await api('/api/orders/active');
  let order = null;
  if (state.receiveOrderId) {
    order = await api('/api/orders/' + state.receiveOrderId).catch(() => null);
    if (!order || order.status !== 'active') { state.receiveOrderId = null; order = null; }
  }
  const selHtml = `
    <div class="card">
      <h2>${t('receive_title')}</h2>
      <div class="row">
        <select id="r-select" onchange="receiveSelect(this.value)" style="max-width:300px">
          <option value="">${t('receive_sel_ph')}</option>
          ${activeOrders.map((o) => `<option value="${o.id}" ${state.receiveOrderId == o.id ? 'selected' : ''}>#${o.id} — ${esc(o.client_name)} (${t('not_returned_count', { n: o.units_left })})${o.overdue ? ' ' + t('overdue_bracket') : ''}</option>`).join('')}
        </select>
        <button class="btn ghost" onclick="renderReceive()">${t('refresh')}</button>
      </div>
      <div class="scan-hint" style="margin-top:8px">${t('receive_scan_hint')}</div>
    </div>`;

  let orderHtml = '<div class="muted">' + t('select_order_above') + '</div>';
  if (order) {
    const notRet = order.items.map((oi) => oi.units.filter((u) => !u.return_time).length).reduce((a, b) => a + b, 0);
    const ret = order.items.map((oi) => oi.units.filter((u) => u.return_time).length).reduce((a, b) => a + b, 0);
    const rows = order.items.map((oi) => `
      <tr>
        <td>${esc(oi.name)}</td>
        <td>${oi.units.map((u) => `
          <div class="line">
            <span class="mono">${esc(u.barcode)}</span>
            <span class="small">${esc(u.size)}</span>
            ${u.return_time
              ? `<span class="badge returned">${t('returned_at', { t: fmtDT(u.return_time) })}</span>${u.condition_ok ? '' : `<span class="badge service">${t('damage')}</span>`}`
              : `<button class="btn sm" onclick="conditionModal(${u.id})">${t('receive_btn')}</button>`}
          </div>`).join('') || '<span class="small muted">—</span>'}</td>
      </tr>`).join('');
    orderHtml = `
      <div class="card">
        <h3>${t('order_for', { id: order.id, name: esc(order.client ? order.client.name : '') })}</h3>
        <div class="row small">
          <div>${t('issue_at')} <b>${fmtDT(order.started_at)}</b></div>
          <div>${t('return_plan_at')} <b>${fmtDT(order.planned_end)}</b></div>
          <div class="badge active">${t('returned_ratio', { a: ret, b: ret + notRet })}</div>
        </div>
        <table><thead><tr><th>${t('position')}</th><th>${t('units')}</th></tr></thead><tbody>${rows}</tbody></table>
        ${notRet === 0 ? `
          <div class="status-box ok" style="margin-top:12px">${t('all_returned_total', { v: money(order.final_total) })}</div>
          <div class="total-row"><span>${t('deposit')}</span><span>${money(order.deposit)}</span></div>
          <div class="total-row"><span>${t('paid')}</span><span>${money(order.paid)}</span></div>
          ${order.to_charge ? `<div class="status-box warn">${t('to_charge', { v: money(order.to_charge) })}</div>` : ''}
          ${order.to_refund ? `<div class="status-box ok">${t('to_refund', { v: money(order.to_refund) })}</div>` : ''}
          <div class="row" style="margin-top:12px">
            <button class="btn ghost" onclick="recordPaymentModal(${order.id})">${t('pay_refund')}</button>
            <button class="btn green" onclick="closeOrder(${order.id})">${t('close_order')}</button>
            <button class="btn ghost" onclick="printOrderReceipt(${order.id})">${t('print_receipt')}</button>
          </div>` : ''}
      </div>`;
  }
  el.innerHTML = selHtml + orderHtml;
}

function receiveSelect(id) {
  state.receiveOrderId = id ? parseInt(id) : null;
  renderReceive();
}

function conditionModal(unitId) {
  openModal(t('item_condition'), `
    <p>${t('condition_hint')}</p>
    <div class="row">
      <button class="btn green" onclick="returnUnitDone(${unitId}, 1, '')">${t('ok_cond')}</button>
      <button class="btn red" onclick="returnUnitModalNote(${unitId})">${t('damage')}</button>
      <button class="btn ghost" onclick="closeModal()">${t('cancel')}</button>
    </div>`);
}

function returnUnitModalNote(unitId) {
  openModal(t('damage'), `
    <label>${t('damage_desc')}</label>
    <textarea id="dam-note" rows="2"></textarea>
    <div class="row" style="margin-top:12px">
      <button class="btn red" onclick="returnUnitDone(document._uid, 0, $('#dam-note').value)">${t('record')}</button>
      <button class="btn ghost" onclick="closeModal()">${t('cancel')}</button>
    </div>`);
  document._uid = unitId;
}

async function returnUnitDone(unitId, ok, note) {
  try {
    await api('/api/orders/' + state.receiveOrderId + '/return-unit', {
      method: 'POST', body: JSON.stringify({ unit_id: unitId, condition_ok: ok, condition_note: note }) });
    closeModal();
    toast(ok ? t('accepted') : t('damage_recorded'));
    await renderReceive();
  } catch (e) { toast(e.message); }
}

async function closeOrder(id) {
  try {
    await api('/api/orders/' + id + '/close', { method: 'POST', body: JSON.stringify({}) });
    toast(t('order_closed', { id }));
    state.receiveOrderId = null;
    await renderReceive();
  } catch (e) { toast(e.message); }
}

async function recordPaymentModal(orderId) {
  const order = await api('/api/orders/' + orderId);
  openModal(t('payment_order', { id: orderId }), `
    <div class="small">${t('payment_summary', { v: money(order.final_total), d: money(order.deposit), p: money(order.paid), r: money(order.refunded) })}</div>
    <div class="row" style="margin-top:10px">
      <div class="grow"><label>${t('amount')}</label><input id="pay-amount" type="number" step="0.01"></div>
      <div class="grow"><label>${t('kind')}</label>
        <select id="pay-type">
          <option value="payment">${t('pay')}</option>
          <option value="deposit">${t('deposit')}</option>
          <option value="refund">${t('refund_type')}</option>
        </select>
      </div>
      <div class="grow"><label>${t('method')}</label>
        <select id="pay-method"><option value="cash">${t('cash')}</option><option value="card">${t('card')}</option></select>
      </div>
    </div>
    <div class="row" style="margin-top:12px">
      <button class="btn green" onclick="savePayment(${orderId})">${t('save')}</button>
      <button class="btn ghost" onclick="closeModal()">${t('cancel')}</button>
    </div>`);
}

async function savePayment(orderId) {
  try {
    await api('/api/orders/' + orderId + '/payment', {
      method: 'POST', body: JSON.stringify({
        amount: parseFloat($('#pay-amount').value) || 0,
        type: $('#pay-type').value,
        method: $('#pay-method').value }) });
    closeModal();
    toast(t('saved'));
    if (state.tab === 'receive') await renderReceive();
  } catch (e) { toast(e.message); }
}

async function renderOrders() {
  const el = $('#tab-orders');
  const orders = await api('/api/orders');
  const rows = orders.slice(0, 200).map((o) => `
    <tr onclick="orderInfo(${o.id})">
      <td><b>#${o.id}</b></td>
      <td>${esc(o.client_name || '')}</td>
      <td>${fmtDT(o.started_at)}</td>
      <td>${fmtDT(o.planned_end)}</td>
      <td>${statusBadge(o.status)}${o.status !== 'active' ? `<div class="small muted">${fmtDT(o.ended_at)}</div>` : ''}</td>
      <td class="right amount">${money(o.deposit)}</td>
    </tr>`).join('');
  el.innerHTML = `
    <div class="card">
      <h2>${t('orders_title')}</h2>
      <div class="row">
        <div class="grow"><input id="o-search" placeholder="${t('search_number_ph')}" oninput="filterOrders(this.value)"></div>
      </div>
      <table style="margin-top:8px"><thead><tr><th>${t('num')}</th><th>${t('client_col')}</th><th>${t('issue_col')}</th><th>${t('plan_return_col')}</th><th>${t('status_col')}</th><th class="right">${t('deposit_col')}</th></tr></thead><tbody id="o-tbody">${rows}</tbody></table>
    </div>`;
  window._allOrders = orders;
}

function filterOrders(q) {
  const tbody = $('#o-tbody');
  if (!tbody) return;
  const list = window._allOrders || [];
  const f = list.filter((o) => String(o.id).includes(q));
  tbody.innerHTML = f.slice(0, 200).map((o) => `
    <tr onclick="orderInfo(${o.id})">
      <td><b>#${o.id}</b></td>
      <td>${esc(o.client_name || '')}</td>
      <td>${fmtDT(o.started_at)}</td>
      <td>${fmtDT(o.planned_end)}</td>
      <td>${statusBadge(o.status)}${o.status !== 'active' ? `<div class="small muted">${fmtDT(o.ended_at)}</div>` : ''}</td>
      <td class="right amount">${money(o.deposit)}</td></tr>`).join('');
}

async function orderInfo(id) {
  const order = await api('/api/orders/' + id);
  const payments = order.payments.map((p) => `<tr><td>${fmtDT(p.created_at)}</td><td>${esc(p.type)}</td><td>${esc(p.method)}</td><td class="right">${p.type === 'refund' ? '-' : ''}${money(p.amount)}</td></tr>`).join('');
  openModal(t('order_title', { id }), orderDetailHtml(order) + `
    <h3>${t('payments')}</h3>
    <table><thead><tr><th>${t('date')}</th><th>${t('kind')}</th><th>${t('method')}</th><th class="right">${t('amount')}</th></tr></thead><tbody>${payments || '<tr><td colspan="4" class="muted">' + t('no_payments') + '</td></tr>'}</tbody></table>
    <div class="row" style="margin-top:14px">
      <button class="btn" onclick="printOrderReceipt2(${order.id})">${t('print')}</button>
      <button class="btn ghost" onclick="recordPaymentModal(${order.id})">${t('payment')}</button>
      ${order.status === 'active' ? `<button class="btn red" onclick="cancelOrder(${order.id})">${t('cancel_order_btn')}</button>` : ''}
      <button class="btn ghost" onclick="closeModal()">${t('close')}</button>
    </div>`);
}

async function cancelOrder(id) {
  if (!confirmAction(t('cancel_confirm', { id }))) return;
  await api('/api/orders/' + id + '/cancel', { method: 'POST' });
  closeModal();
  renderOrders();
}

function printOrderReceipt(id) { printOrderReceipt2(id); }
async function printOrderReceipt2(id) {
  const order = await api('/api/orders/' + id);
  const biz = state.settings.business_name || t('app_title');
  const rows = order.items.map((oi) => `<tr><td>${esc(oi.name)}</td><td class="right">${money(oi.cost)}</td></tr>`).join('');
  printHtml(t('receipt_title_short', { id: order.id }), `
    <h1>${esc(biz)}</h1>
    <h2>${t('receipt_title', { id: order.id })}</h2>
    <div class="grid">
      <div><b>${t('client_label', { name: '' })}</b> ${esc(order.client ? order.client.name : '')}</div>
      <div><b>${t('phone_label')}</b> ${esc(order.client ? order.client.phone : '')}</div>
      <div><b>${t('issue_at')}</b> ${fmtDT(order.started_at)}</div>
      <div><b>${t('return_at')}</b> ${fmtDT(order.ended_at || order.planned_end)}</div>
    </div>
    <table><thead><tr><th>${t('position')}</th><th class="right">${t('amount')}</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="tot">${t('total')}: ${money(order.final_total)}</div>
    <p class="small">${t('deposit_label')} ${money(order.deposit)} · ${t('paid')}: ${money(order.paid)} ${order.to_refund ? '· ' + t('to_refund', { v: money(order.to_refund) }) : ''}</p>`);
}

async function renderInv() {
  const el = $('#tab-inv');
  const [items, cats] = await Promise.all([api('/api/items'), api('/api/categories')]);
  state.categories = cats;
  const total = items.length;
  const stock = items.filter((i) => i.status === 'in_stock').length;
  const rented = items.filter((i) => i.status === 'rented').length;
  const service = items.filter((i) => i.status === 'service').length;

  const rows = items.map((i) => `
    <tr>
      <td class="mono">${esc(i.barcode)}</td>
      <td>${esc(i.cat_name)}</td>
      <td>${esc(i.brand)} ${esc(i.model)}</td>
      <td>${esc(i.size)}</td>
      <td>${statusBadge(i.status)}</td>
      <td>${esc(i.cond)}</td>
      <td class="row" style="align-items:center;gap:4px">
        <button class="btn sm ghost" onclick="labelWin(${i.id})">${t('label')}</button>
        <button class="btn sm ghost" onclick="itemEdit(${i.id})">${t('edit')}</button>
        <button class="btn sm red" onclick="itemRetire(${i.id})">${t('retire')}</button>
      </td>
    </tr>`).join('');

  el.innerHTML = `
    <div class="card">
      <h2>${t('stock_title')}</h2>
      <div class="row">
        <span class="badge in_stock">${t('in_stock_count', { n: stock })}</span>
        <span class="badge rented">${t('rented_count', { n: rented })}</span>
        <span class="badge service">${t('service_count', { n: service })}</span>
        <span class="small">${t('total_count', { n: total })}</span>
      </div>
      <div class="row" style="margin-top:10px">
        <div class="grow"><input id="inv-f" placeholder="${t('inv_search_ph')}" oninput="filterInv(this.value)"></div>
        <select id="inv-cat" onchange="filterInv()"><option value="">${t('all_categories')}</option>${cats.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
        <button class="btn" onclick="itemAddModal()">${t('add_item')}</button>
        <button class="btn ghost" onclick="printLabelsSelected()">${t('print_labels')}</button>
      </div>
      <div style="max-height:520px;overflow:auto;margin-top:8px">
      <table><thead><tr><th>${t('barcode')}</th><th>${t('type')}</th><th>${t('model')}</th><th>${t('size')}</th><th>${t('status_col')}</th><th>${t('condition')}</th><th></th></tr></thead><tbody id="inv-tbody">${rows}</tbody></table>
      </div>
    </div>`;
  window._items = items;
  window._selLabels = new Set();
}

function filterInv(q) {
  const tbody = $('#inv-tbody');
  if (!tbody) return;
  const items = window._items || [];
  const cat = $('#inv-cat') ? $('#inv-cat').value : '';
  const sq = ($('#inv-f') ? $('#inv-f').value : '').toLowerCase();
  const f = items.filter((i) => (!cat || i.category_id == cat) && (!sq || (i.barcode + i.brand + i.model + i.size + i.cat_name).toLowerCase().includes(sq)));
  tbody.innerHTML = f.map((i) => `
    <tr>
      <td class="mono">${esc(i.barcode)}</td>
      <td>${esc(i.cat_name)}</td>
      <td>${esc(i.brand)} ${esc(i.model)}</td>
      <td>${esc(i.size)}</td>
      <td>${statusBadge(i.status)}</td>
      <td>${esc(i.cond)}</td>
      <td class="row" style="align-items:center;gap:4px">
        <button class="btn sm ghost" onclick="labelWin(${i.id})">${t('label')}</button>
        <button class="btn sm ghost" onclick="itemEdit(${i.id})">${t('edit')}</button>
        <button class="btn sm red" onclick="itemRetire(${i.id})">${t('retire')}</button>
      </td>
    </tr>`).join('');
}

function labelWin(id) {
  window.open('/labels.html?ids=' + id, '_blank', 'width=600,height=500');
}

function printLabelsSelected() {
  const items = window._items || [];
  const ids = items.filter((i) => i.status === 'in_stock').map((i) => i.id);
  if (!ids.length) return toast(t('no_stock'));
  if (!confirmAction(t('print_all_labels_confirm', { n: ids.length }))) return;
  window.open('/labels.html?ids=' + ids.join(','), '_blank', 'width=600,height=500');
}

async function itemAddModal() {
  const cats = await api('/api/categories');
  const nb = await api('/api/items/next-barcode');
  openModal(t('add_item'), `
    <div class="grid-2">
      <div><label>${t('category')}</label><select id="a-cat">${cats.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
      <div><label>${t('count')}</label><input id="a-count" type="number" value="1" min="1"></div>
      <div><label>${t('brand')}</label><input id="a-brand" placeholder="Atomic"></div>
      <div><label>${t('model')}</label><input id="a-model"></div>
      <div><label>${t('size_full')}</label><input id="a-size" placeholder="170"></div>
      <div><label>${t('barcode_auto')}</label><input id="a-barcode" readonly value="${nb.barcode}" title="${t('barcode_next_title')}"></div>
      <div><label>${t('condition')}</label><input id="a-cond" value="Хорошее"></div>
      <div><label>${t('notes')}</label><input id="a-notes"></div>
    </div>
    <div class="row" style="margin-top:12px">
      <button class="btn green" onclick="itemAddDo()">${t('add')}</button>
      <button class="btn ghost" onclick="closeModal()">${t('cancel')}</button>
    </div>`);
}

async function itemAddDo() {
  try {
    const r = await api('/api/items', {
      method: 'POST', body: JSON.stringify({
        category_id: parseInt($('#a-cat').value), count: parseInt($('#a-count').value) || 1,
        brand: $('#a-brand').value, model: $('#a-model').value, size: $('#a-size').value,
        barcode: '', cond: $('#a-cond').value, notes: $('#a-notes').value }) });
    closeModal();
    toast(t('added_count', { n: r.created.length }));
    renderInv();
  } catch (e) { toast(e.message); }
}

async function itemEdit(id) {
  const item = (window._items || []).find((i) => i.id === id);
  if (!item) return;
  const cats = await api('/api/categories');
  openModal(t('edit_item', { bc: item.barcode }), `
    <div class="grid-2">
      <div><label>${t('category')}</label><select id="e-cat">${cats.map((c) => `<option value="${c.id}" ${c.id === item.category_id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
      <div><label>${t('status')}</label><select id="e-status">
        <option value="in_stock" ${item.status === 'in_stock' ? 'selected' : ''}>${t('st_in_stock')}</option>
        <option value="service" ${item.status === 'service' ? 'selected' : ''}>${t('st_service')}</option>
        <option value="rented" ${item.status === 'rented' ? 'selected' : ''}>${t('st_rented')}</option>
      </select></div>
      <div><label>${t('brand')}</label><input id="e-brand" value="${esc(item.brand)}"></div>
      <div><label>${t('model')}</label><input id="e-model" value="${esc(item.model)}"></div>
      <div><label>${t('size')}</label><input id="e-size" value="${esc(item.size)}"></div>
      <div><label>${t('condition')}</label><input id="e-cond" value="${esc(item.cond)}"></div>
      <div><label>${t('notes')}</label><input id="e-notes" value="${esc(item.notes)}"></div>
    </div>
    <div class="row" style="margin-top:12px">
      <button class="btn green" onclick="itemSave(${item.id})">${t('save')}</button>
      <button class="btn ghost" onclick="closeModal()">${t('cancel')}</button>
    </div>`);
}

async function itemSave(id) {
  await api('/api/items/' + id, {
    method: 'PUT', body: JSON.stringify({
      category_id: parseInt($('#e-cat').value), status: $('#e-status').value,
      brand: $('#e-brand').value, model: $('#e-model').value, size: $('#e-size').value,
      cond: $('#e-cond').value, notes: $('#e-notes').value }) });
  closeModal();
  renderInv();
}

async function itemRetire(id) {
  const item = (window._items || []).find((i) => i.id === id);
  if (!item) return;
  if (!confirmAction(t('retire_confirm', { bc: item.barcode, model: item.brand + ' ' + item.model }))) return;
  await api('/api/items/' + id + '/retire', { method: 'POST' });
  toast(t('retired_done'));
  renderInv();
}

async function renderInvCheck() {
  const el = $('#tab-invcheck');
  const sessions = await api('/api/inventory/sessions');
  const started = state.invSessionId ? await api('/api/inventory/sessions/' + state.invSessionId).catch(() => null) : null;

  let sessionHtml = '';
  if (started) {
    const scannedTotal = started.scannedRows.length;
    const expectedTotal = started.expected.reduce((s, e) => s + e.total, 0);
    const countsByCat = {};
    started.scannedRows.forEach((r) => { const k = r.cat_name; countsByCat[k] = (countsByCat[k] || 0) + 1; });
    const expRows = started.expected.map((e) => `
      <tr><td>${esc(e.cat_name)}</td><td class="right">${e.total}</td><td class="right">${countsByCat[e.cat_name] || 0}</td><td class="right">${Math.max(0, e.total - (countsByCat[e.cat_name] || 0))}</td></tr>`).join('');
    sessionHtml = `
      <div class="card">
        <h3>${t('session_active', { id: started.session.id })}</h3>
        <p class="small">${fmtDT(started.session.started_at)} · ${esc(started.session.note)}</p>
        <div class="scan-hint">${t('inv_session_hint', { s: scannedTotal, exp: expectedTotal })}</div>
        <table style="margin-top:8px"><thead><tr><th>${t('category')}</th><th class="right">${t('expected')}</th><th class="right">${t('scanned')}</th><th class="right">${t('missing')}</th></tr></thead><tbody>${expRows}</tbody></table>
        <div class="row" style="margin-top:12px">
          <button class="btn ghost" onclick="renderInvCheck()">${t('refresh')}</button>
          <button class="btn green" onclick="finishInvSession()">${t('finish_show_missing')}</button>
        </div>
      </div>`;
  } else {
    sessionHtml = `
      <div class="card">
        <h3>${t('new_inventory')}</h3>
        <div class="row">
          <div class="grow"><label>${t('notes')}</label><input id="iv-note" placeholder="${t('inv_note_ph')}"></div>
          <button class="btn green" onclick="startInvSession()">${t('start')}</button>
        </div>
      </div>`;
  }

  el.innerHTML = sessionHtml + `
    <div class="card">
      <h3>${t('session_history')}</h3>
      ${sessions.map((s) => `
        <div class="line">
          <b>#${s.id}</b>
          <span class="small">${fmtDT(s.started_at)}</span>
          <span class="small">${esc(s.note)}</span>
          ${s.ended_at ? `<span class="badge returned">${t('finished')}</span>` : `<span class="badge active">${t('in_progress')}</span>`}
          <button class="btn sm ghost" onclick="invSessionReport(${s.id})">${t('report')}</button>
        </div>`).join('') || '<div class="muted">' + t('no_sessions') + '</div>'}
    </div>`;
}

async function startInvSession() {
  const note = $('#iv-note') ? $('#iv-note').value : '';
  const s = await api('/api/inventory/sessions', { method: 'POST', body: JSON.stringify({ note }) });
  state.invSessionId = s.id;
  toast(t('session_started', { id: s.id }));
  renderInvCheck();
}

async function finishInvSession() {
  const started = await api('/api/inventory/sessions/' + state.invSessionId);
  openModal(t('inventory_title', { id: started.session.id }), `
    <h3>${t('missing_count', { n: started.missed.length })}</h3>
    <div style="max-height:300px;overflow:auto">
    <table><thead><tr><th>${t('barcode')}</th><th>${t('type')}</th><th>${t('model')}</th><th>${t('size')}</th><th>${t('status_col')}</th></tr></thead><tbody>
      ${started.missed.map((m) => `<tr><td class="mono">${esc(m.barcode)}</td><td>${esc(m.cat_name)}</td><td>${esc(m.brand)} ${esc(m.model)}</td><td>${esc(m.size)}</td><td>${statusBadge(m.status)}</td></tr>`).join('')}
    </tbody></table>
    </div>
    <div class="row" style="margin-top:12px">
      <button class="btn green" onclick="finishInvSessionDone()">${t('finish_session')}</button>
      <button class="btn ghost" onclick="closeModal()">${t('continue_btn')}</button>
    </div>`);
}

async function finishInvSessionDone() {
  await api('/api/inventory/sessions/' + state.invSessionId + '/finish', { method: 'POST' });
  state.invSessionId = null;
  closeModal();
  toast(t('completed'));
  renderInvCheck();
}

async function invSessionReport(id) {
  const started = await api('/api/inventory/sessions/' + id);
  const countsByCat = {};
  started.scannedRows.forEach((r) => { const k = r.cat_name; countsByCat[k] = (countsByCat[k] || 0) + 1; });
  openModal(t('inv_report_title', { id }), `
    <p class="small">${fmtDT(started.session.started_at)} → ${started.session.ended_at ? fmtDT(started.session.ended_at) : t('not_finished')} · ${esc(started.session.note)}</p>
    <table><thead><tr><th>${t('category')}</th><th class="right">${t('expected')}</th><th class="right">${t('scanned')}</th><th class="right">${t('missing')}</th></tr></thead><tbody>
      ${started.expected.map((e) => `<tr><td>${esc(e.cat_name)}</td><td class="right">${e.total}</td><td class="right">${countsByCat[e.cat_name] || 0}</td><td class="right">${Math.max(0, e.total - (countsByCat[e.cat_name] || 0))}</td></tr>`).join('')}
    </tbody></table>
    <div class="row" style="margin-top:12px"><button class="btn ghost" onclick="printInvReport(${id})">${t('print')}</button><button class="btn ghost" onclick="closeModal()">${t('close')}</button></div>`);
}

async function printInvReport(id) {
  const started = await api('/api/inventory/sessions/' + id);
  const countsByCat = {};
  started.scannedRows.forEach((r) => { const k = r.cat_name; countsByCat[k] = (countsByCat[k] || 0) + 1; });
  const biz = state.settings.business_name || t('app_title');
  const rows = started.expected.map((e) => `<tr><td>${esc(e.cat_name)}</td><td class="right">${e.total}</td><td class="right">${countsByCat[e.cat_name] || 0}</td><td class="right">${Math.max(0, e.total - (countsByCat[e.cat_name] || 0))}</td></tr>`).join('');
  printHtml(t('inventory_title', { id }), `
    <h1>${esc(biz)}</h1>
    <h2>${t('inv_report_no', { id, t: fmtDT(started.session.started_at) })}</h2>
    <table><thead><tr><th>${t('category')}</th><th class="right">${t('expected')}</th><th class="right">${t('scanned')}</th><th class="right">${t('missing')}</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="sig"><div>${t('conducted')}</div><div>${t('approved')}</div></div>`);
}

async function renderClients() {
  const el = $('#tab-clients');
  const clients = await api('/api/clients');
  const rows = clients.map((c) => `
    <tr onclick="clientInfo(${c.id})">
      <td><b>${esc(c.name)}</b></td>
      <td>${esc(c.phone)}</td>
      <td>${esc(c.doc)}</td>
      <td class="small">${esc(c.notes)}</td>
    </tr>`).join('');
  el.innerHTML = `
    <div class="card">
      <div class="row">
        <h2 style="margin:0">${t('clients_title')}</h2>
        <div class="grow"><input id="c-search" placeholder="${t('search_ph')}" oninput="filterClients(this.value)"></div>
        <button class="btn" onclick="newClientModal()">${t('new_client')}</button>
      </div>
      <div style="max-height:520px;overflow:auto;margin-top:8px">
      <table><thead><tr><th>${t('full_name')}</th><th>${t('phone_col')}</th><th>${t('doc_col')}</th><th>${t('notes')}</th></tr></thead><tbody id="c-tbody">${rows}</tbody></table>
      </div>
    </div>`;
  window._clients = clients;
}

function filterClients(q) {
  const tbody = $('#c-tbody');
  const f = (window._clients || []).filter((c) => (c.name + c.phone + c.doc).toLowerCase().includes(q.toLowerCase()));
  tbody.innerHTML = f.map((c) => `
    <tr onclick="clientInfo(${c.id})">
      <td><b>${esc(c.name)}</b></td><td>${esc(c.phone)}</td><td>${esc(c.doc)}</td><td class="small">${esc(c.notes)}</td>
    </tr>`).join('');
}

function newClientModal(selOnCreate) {
  state._selOnCreate = selOnCreate || false;
  openModal(t('new_client'), `
    <div class="grid-2">
      <div><label>${t('full_name')}</label><input id="n-name" placeholder="${t('name_ph')}"></div>
      <div><label>${t('phone_col')}</label><input id="n-phone" placeholder="${t('phone_ph')}"></div>
      <div><label>${t('doc_col')}</label><input id="n-doc" placeholder="${t('doc_ph')}"></div>
      <div><label>${t('notes')}</label><input id="n-notes"></div>
    </div>
    <div class="row" style="margin-top:12px">
      <button class="btn green" onclick="clientCreateDo()">${t('create')}</button>
      <button class="btn ghost" onclick="closeModal()">${t('cancel')}</button>
    </div>`);
}

async function clientCreateDo() {
  const name = $('#n-name').value.trim();
  if (!name) return toast(t('enter_name'));
  const c = await api('/api/clients', {
    method: 'POST', body: JSON.stringify({
      name, phone: $('#n-phone').value, doc: $('#n-doc').value, notes: $('#n-notes').value }) });
  closeModal();
  toast(t('client_added'));
  if (state._selOnCreate || state.tab === 'issue') {
    if (state.tab === 'issue') { setClientBox(c); }
  }
  if (state.tab === 'clients') renderClients();
}

async function clientModal() {
  const clients = await api('/api/clients');
  openModal(t('client_pick_title'), `
    <input id="cx-search" placeholder="${t('search_ph')}" oninput="clientSearchList(this.value)">
    <div id="cx-list" style="max-height:360px;overflow:auto;margin-top:8px">
      ${clients.map((c) => clientPickerRow(c)).join('')}
    </div>`);
  window._clients2 = clients;
}

function clientPickerRow(c) {
  return `<div class="line" onclick="pickClient(${c.id})">
    <b>${esc(c.name)}</b> <span class="small">${esc(c.phone)}</span>
    <button class="btn sm" onclick="event.stopPropagation(); pickClient(${c.id})">${t('choose')}</button></div>`;
}

function clientSearchList(q) {
  const list = window._clients2 || [];
  const f = list.filter((c) => (c.name + c.phone).toLowerCase().includes(q.toLowerCase()));
  $('#cx-list').innerHTML = f.map((c) => clientPickerRow(c)).join('');
}

function pickClient(id) {
  const c = (window._clients2 || []).find((x) => x.id === id);
  setClientBox(c);
  closeModal();
  toast(t('client_selected'));
}

async function clientInfo(id) {
  const clients = window._clients || await api('/api/clients');
  const c = clients.find((x) => x.id === id);
  if (!c) return;
  const orders = await api('/api/orders');
  const hist = orders.filter((o) => o.client_id === id).slice(0, 20);
  const histRows = hist.map((o) => `<tr><td><b>#${o.id}</b></td><td>${fmtDT(o.started_at)}</td><td>${statusBadge(o.status)}${o.status !== 'active' ? `<div class="small muted">${fmtDT(o.ended_at)}</div>` : ''}</td><td class="right">${money(o.deposit)}</td></tr>`).join('');
  openModal(t('client_name_title', { name: c.name }), `
    <p>${t('client_info_line', { phone: esc(c.phone), doc: esc(c.doc) })}</p>
    <p class="small">${esc(c.notes)}</p>
    <h3>${t('order_history')}</h3>
    <table><thead><tr><th>${t('num')}</th><th>${t('date')}</th><th>${t('status_col')}</th><th class="right">${t('deposit_col')}</th></tr></thead><tbody>${histRows || '<tr><td colspan="4">' + t('no_orders') + '</td></tr>'}</tbody></table>
    <div class="row" style="margin-top:12px">
      <button class="btn" onclick="editClientModal(${c.id})">${t('edit')}</button>
      <button class="btn ghost" onclick="closeModal()">${t('close')}</button>
    </div>`);
}

async function editClientModal(id) {
  const clients = window._clients || await api('/api/clients');
  const c = clients.find((x) => x.id === id);
  openModal(t('edit_client'), `
    <div class="grid-2">
      <div><label>${t('full_name')}</label><input id="ed-name" value="${esc(c.name)}"></div>
      <div><label>${t('phone_col')}</label><input id="ed-phone" value="${esc(c.phone)}"></div>
      <div><label>${t('doc_col')}</label><input id="ed-doc" value="${esc(c.doc)}"></div>
      <div><label>${t('notes')}</label><input id="ed-notes" value="${esc(c.notes)}"></div>
    </div>
    <div class="row" style="margin-top:12px">
      <button class="btn green" onclick="clientSaveDo(${c.id})">${t('save')}</button>
      <button class="btn ghost" onclick="closeModal()">${t('cancel')}</button>
    </div>`);
}

async function clientSaveDo(id) {
  await api('/api/clients/' + id, {
    method: 'PUT', body: JSON.stringify({
      name: $('#ed-name').value, phone: $('#ed-phone').value, doc: $('#ed-doc').value, notes: $('#ed-notes').value }) });
  closeModal();
  renderClients();
}

async function renderRates() {
  const el = $('#tab-rates');
  const cats = await api('/api/categories');
  const p = state.pricings;
  const kitRows = p.filter((x) => x.kind === 'kit').map((k) => `
    <tr>
      <td><b>${esc(k.name)}</b></td>
      <td class="small">${(k.kitItems || []).map((ki) => `${catName(ki.category_id)} ×${ki.qty}`).join(', ')}</td>
      <td class="right">${money(k.price_day)}</td>
      <td><button class="btn sm ghost" onclick="rateEdit(${k.id})">${t('edit_short')}</button> <button class="btn sm red" onclick="rateDel(${k.id})">${t('del_short')}</button></td>
    </tr>`).join('');
  const catRows = p.filter((x) => x.kind === 'category').map((k) => `
    <tr><td><b>${esc(k.name)}</b></td><td class="small">${t('per_unit')}</td>
      <td class="right">${money(k.price_hour)}</td><td class="right">${money(k.price_day)}</td>
      <td><button class="btn sm ghost" onclick="rateEdit(${k.id})">${t('edit_short')}</button></td></tr>`).join('');
  const svcRows = p.filter((x) => x.kind === 'service').map((k) => `
    <tr><td><b>${esc(k.name)}</b></td><td class="small">${t('service_label')}</td>
      <td class="right">${money(k.price_flat)}</td>
      <td><button class="btn sm ghost" onclick="rateEdit(${k.id})">${t('edit_short')}</button> <button class="btn sm red" onclick="rateDel(${k.id})">${t('del_short')}</button></td></tr>`).join('');
  el.innerHTML = `
    <div class="card">
      <div class="row"><h2 style="margin:0">${t('rates_title')}</h2><button class="btn" onclick="rateAdd()">${t('new_rate')}</button></div>
      <p class="small">${t('rate_intervals_hint')}</p>
    </div>
    <div class="card">
      <h3>${t('kits')}</h3><table><thead><tr><th>${t('name')}</th><th>${t('composition')}</th><th class="right">${t('price_day_col')}</th><th></th></tr></thead><tbody>${kitRows}</tbody></table>
      <h3>${t('categories_title')}</h3><table><thead><tr><th>${t('name')}</th><th>${t('type')}</th><th class="right">${t('hour')}</th><th class="right">${t('day')}</th><th></th></tr></thead><tbody>${catRows}</tbody></table>
      <h3>${t('services')}</h3><table><thead><tr><th>${t('name')}</th><th>${t('type')}</th><th class="right">${t('price')}</th><th></th></tr></thead><tbody>${svcRows}</tbody></table>
    </div>`;
}

function rateAdd() {
  openModal(t('new_rate'), rateFormHtml(null));
}
function rateEdit(id) {
  const p = state.pricings.find((x) => x.id === id);
  openModal(t('edit_rate'), rateFormHtml(p));
}
function rateFormHtml(p) {
  p = p || { id: null, kind: 'kit', name: '', price_hour: 0, price_day: 0, price_week: 0, price_season: 0, price_flat: 0, kitItems: [] };
  const cats = state.categories;
  return `
    <div class="grid-2">
      <div><label>${t('name')}</label><input id="rt-name" value="${esc(p.name)}"></div>
      <div><label>${t('type')}</label><select id="rt-kind" onchange="rtKindChange()">
        <option value="kit" ${p.kind === 'kit' ? 'selected' : ''}>${t('kit')}</option>
        <option value="category" ${p.kind === 'category' ? 'selected' : ''}>${t('category_per_unit')}</option>
        <option value="service" ${p.kind === 'service' ? 'selected' : ''}>${t('service_fixed')}</option>
      </select></div>
    </div>
    <div id="rt-cat" ${p.kind === 'category' ? '' : 'style="display:none"'}>
      <label>${t('category')}</label>
      <select id="rt-category">${cats.map((c) => `<option value="${c.id}" ${p.category_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
    </div>
    <div id="rt-kit" ${p.kind === 'kit' ? '' : 'style="display:none"'}>
      <label>${t('kit_composition')}</label>
      <div id="rt-kit-lines">${(p.kitItems || []).map((ki, i) => kitLineHtml(ki, i)).join('') || kitLineHtml(null, 0)}</div>
      <button class="btn sm ghost" onclick="kitLineAdd()">${t('add_position')}</button>
    </div>
    <div class="grid-2" style="margin-top:8px">
      <div><label>${t('hour_grn')}</label><input id="rt-h" type="number" step="0.01" value="${p.price_hour}"></div>
      <div><label>${t('day_grn')}</label><input id="rt-d" type="number" step="0.01" value="${p.price_day}"></div>
      <div><label>${t('week_grn')}</label><input id="rt-w" type="number" step="0.01" value="${p.price_week}"></div>
      <div><label>${t('season_grn')}</label><input id="rt-s" type="number" step="0.01" value="${p.price_season}"></div>
      <div style="grid-column:1/-1"><label>${t('flat_price_grn')}</label><input id="rt-f" type="number" step="0.01" value="${p.price_flat}"></div>
    </div>
    <div class="row" style="margin-top:12px">
      <button class="btn green" onclick="rateSave(${p.id})">${t('save')}</button>
      <button class="btn ghost" onclick="closeModal()">${t('cancel')}</button>
    </div>`;
}
function kitLineHtml(ki, i) {
  ki = ki || { category_id: '', qty: 1 };
  const cats = state.categories;
  return `<div class="line">
    <select style="flex:1" onchange="kitLineSet(${i}, 'cat', this.value)">${cats.map((c) => `<option value="${c.id}" ${ki.category_id == c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
    <input type="number" style="width:70px" value="${ki.qty}" onchange="kitLineSet(${i}, 'qty', this.value)">
    <button class="btn sm ghost" onclick="this.parentElement.remove()">×</button>
    </div>`;
}
function kitLineAdd() { const d = document.createElement('div'); d.innerHTML = kitLineHtml(null, $$('#rt-kit-lines .line').length); $('#rt-kit-lines').appendChild(d.firstChild); }
function kitLineSet() {}
function rtKindChange() {
  const k = $('#rt-kind').value;
  $('#rt-cat').style.display = k === 'category' ? '' : 'none';
  $('#rt-kit').style.display = k === 'kit' ? '' : 'none';
}
async function rateSave(id) {
  const kitLines = $$('#rt-kit-lines .line').map((line) => ({
    category_id: parseInt($('select', line).value),
    qty: Math.max(1, parseInt($('input', line).value) || 1)
  }));
  const body = {
    name: $('#rt-name').value,
    kind: $('#rt-kind').value,
    category_id: $('#rt-cat').style.display === 'none' ? null : parseInt($('#rt-category').value),
    kit_items: kitLines,
    price_hour: parseFloat($('#rt-h').value) || 0,
    price_day: parseFloat($('#rt-d').value) || 0,
    price_week: parseFloat($('#rt-w').value) || 0,
    price_season: parseFloat($('#rt-s').value) || 0,
    price_flat: parseFloat($('#rt-f').value) || 0,
    active: true
  };
  try {
    if (id) await api('/api/pricings/' + id, { method: 'PUT', body: JSON.stringify(body) });
    else await api('/api/pricings', { method: 'POST', body: JSON.stringify(body) });
    closeModal();
    state.pricings = await api('/api/pricings');
    renderRates();
  } catch (e) { toast(e.message); }
}
async function rateDel(id) {
  if (!confirmAction(t('delete_rate_confirm'))) return;
  await api('/api/pricings/' + id, { method: 'DELETE' });
  state.pricings = await api('/api/pricings');
  renderRates();
}

async function renderReports() {
  const el = $('#tab-reports');
  const to = new Date();
  const from = new Date(to); from.setDate(from.getDate() - 30);
  const fromS = from.toISOString().slice(0, 10);
  const toS = to.toISOString().slice(0, 10);
  el.innerHTML = `
    <div class="card">
      <h2>${t('reports_title')}</h2>
      <div class="row">
        <div class="grow"><label>${t('from_date')}</label><input type="date" id="rp-from" value="${fromS}"></div>
        <div class="grow"><label>${t('to_date')}</label><input type="date" id="rp-to" value="${toS}"></div>
        <button class="btn" onclick="doReports()">${t('show')}</button>
      </div>
      <div id="rp-body" style="margin-top:12px"></div>
    </div>`;
  await doReports();
}

async function doReports() {
  const from = $('#rp-from').value;
  const to = $('#rp-to').value;
  const q = '?from=' + from + '&to=' + to;
  const [summary, utilization, revenue] = await Promise.all([
    api('/api/reports/summary' + q), api('/api/reports/utilization' + q), api('/api/reports/revenue' + q)]);
  const totals = {};
  summary.forEach((r) => {
    totals[r.method] = (totals[r.method] || 0) + r.income;
    totals['refund'] = (totals['refund'] || 0) + r.refund;
  });
  const sumRows = summary.length ? summary.map((r) => `
    <tr><td>${esc(r.d)}</td><td>${esc(r.method === 'card' ? t('card') : t('cash'))}</td><td class="right">${money(r.income)}</td><td class="right">${money(r.refund)}</td></tr>`).join('') : '<tr><td colspan="4" class="muted">' + t('no_data') + '</td></tr>';
  const utilRows = utilization.map((u) => `
    <tr><td class="mono">${esc(u.barcode)}</td><td>${esc(u.cat_name)}</td><td>${esc(u.brand)} ${esc(u.model)} ${esc(u.size)}</td><td class="right">${u.rentals}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">' + t('no_data') + '</td></tr>';
  const revRows = revenue.map((o) => `
    <tr><td><b>#${o.id}</b></td><td>${fmtDT(o.started_at)}</td><td>${esc(o.client_name || '')}</td><td>${statusBadge(o.status)}</td><td class="right">${money(o.received)}</td><td class="right">${money(o.refunded)}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">' + t('no_data') + '</td></tr>';
  const incomeTotal = (totals.cash || 0) + (totals.card || 0);
  $('#rp-body').innerHTML = `
    <div class="row" style="margin-bottom:10px">
      <span class="badge in_stock">${t('cash_badge', { v: money(totals.cash || 0) })}</span>
      <span class="badge active">${t('card_badge', { v: money(totals.card || 0) })}</span>
      <span class="badge">${t('total_received_badge', { v: money(incomeTotal) })}</span>
      <span class="badge service">${t('refunds_badge', { v: money(totals.refund || 0) })}</span>
    </div>
    <div class="grid-2">
      <div>
        <h3>${t('daily_income')}</h3>
        <table><thead><tr><th>${t('date')}</th><th>${t('method')}</th><th class="right">${t('received_income')}</th><th class="right">${t('refund_income')}</th></tr></thead><tbody>${sumRows}</tbody></table>
      </div>
      <div>
        <h3>${t('utilization_top')}</h3>
        <table><thead><tr><th>${t('barcode')}</th><th>${t('type')}</th><th>${t('model')}</th><th class="right">${t('rentals')}</th></tr></thead><tbody>${utilRows}</tbody></table>
      </div>
    </div>
    <div style="margin-top:12px">
      <h3>${t('orders_period')}</h3>
      <table><thead><tr><th>${t('num')}</th><th>${t('date')}</th><th>${t('client_col')}</th><th>${t('status_col')}</th><th class="right">${t('received_col')}</th><th class="right">${t('returned_col')}</th></tr></thead><tbody>${revRows}</tbody></table>
    </div>`;
}

async function renderSettings() {
  const el = $('#tab-settings');
  const s = await api('/api/settings');
  el.innerHTML = `
    <div class="card">
      <h2>${t('settings_title')}</h2>
      <div class="grid-2">
        <div><label>${t('biz_name_label')}</label><input id="st-name" value="${esc(s.business_name)}"></div>
        <div><label>${t('currency_label')}</label><input id="st-cur" value="${esc(s.currency)}"></div>
        <div><label>${t('default_deposit_label')}</label><input id="st-dep" value="${esc(s.deposit_default)}"></div>
        <div><label>${t('late_fee_label')}</label><input id="st-late" value="${esc(s.late_fee_per_day)}"></div>
        <div><label>${t('contractor_label')}</label><input id="st-contr" value="${esc(s.contractor)}"></div>
        <div><label>${t('contract_phone_label')}</label><input id="st-phone" value="${esc(s.phone)}"></div>
      </div>
      <div class="row" style="margin-top:12px">
        <button class="btn green" onclick="settingsSave()">${t('save')}</button>
      </div>
    </div>
    <div class="card">
      <h3>${t('backup')}</h3>
      <p class="small">${t('backup_hint')}</p>
      <button class="btn ghost" onclick="downloadBackup()">${t('download_backup')}</button>
    </div>`;
}

async function settingsSave() {
  await api('/api/settings', {
    method: 'POST', body: JSON.stringify({
      business_name: $('#st-name').value, currency: $('#st-cur').value,
      deposit_default: $('#st-dep').value, late_fee_per_day: $('#st-late').value,
      contractor: $('#st-contr').value, phone: $('#st-phone').value }) });
  state.settings = await api('/api/settings');
  $('#brand').textContent = state.settings.business_name || t('app_title');
  document.title = state.settings.business_name || t('app_title');
  toast(t('saved'));
}

function downloadBackup() {
  window.location = '/api/backup';
}

init().catch((e) => { console.error(e); toast(t('init_err', { e: e.message })); });