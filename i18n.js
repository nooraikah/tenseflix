// Internationalization (i18n) - Language Translations
const translations = {
    ru: {
        // Language Selector
        'lang-select': 'Язык:',
        
        // Navbar & Header
        'nav-features': 'Возможности',
        'nav-tenses': '12 времен',
        'nav-start': 'Начало изучение',
        'nav-login': 'Вход',
        
        // Hero Section
        'hero-title': 'Изучайте английские времена<br>на примерах из фильмов',
        'hero-subtitle': '12 времен, 35 примеров из популярных фильмов, сериалов и мультфильмов',
        'hero-btn': 'Начать обучение',
        
        // Features Section
        'features-title': 'Почему TENSEFLIX?',
        'feature-1-title': 'Полная система обучения',
        'feature-1-desc': 'Теория, примеры из фильмов и интерактивные упражнения для каждого времени',
        'feature-2-title': 'Аутентичные примеры',
        'feature-2-desc': 'Диалоги из популярных фильмов и сериалов для лучшего запоминания',
        'feature-3-title': 'Интерактивные упражнения',
        'feature-3-desc': '40+ задач с мгновенной проверкой и объяснениями ошибок',
        'feature-4-title': 'Личный кабинет',
        'feature-4-desc': 'Система авторизации для отслеживания вашего прогресса',
        'feature-5-title': 'Адаптивный дизайн',
        'feature-5-desc': 'Работает на всех устройствах - desktop, планшеты и смартфоны',
        'feature-6-title': 'Никаких платежей',
        'feature-6-desc': '100% бесплатное обучение без скрытых подписок и рекламы',

        // How It Works Section
        'how-it-works-title': 'Как это работает',
        'how-it-works-1-title': 'Смотрите видео',
        'how-it-works-1-desc': 'Начните с короткого видео из фильмов или сериалов, где время встречается естественно.',
        'how-it-works-2-title': 'Понимайте контекст',
        'how-it-works-2-desc': 'Посмотрите, как время используется в реальных ситуациях, и начните замечать закономерности.',
        'how-it-works-3-title': 'Откройте правила',
        'how-it-works-3-desc': 'Разберитесь, как работает время.',
        'how-it-works-4-title': 'Практикуйтесь и тестируйте',
        'how-it-works-4-desc': 'Примените то, что вы поняли, с помощью заданий и тестов.',
        
        // Tenses Section
        'tenses-title': '12 Английских Времен',
        'tenses-present': 'Настоящее (Present)',
        'tenses-past': 'Прошедшее (Past)',
        'tenses-future': 'Будущее (Future)',
        'tense-present-simple': 'Present Simple',
        'tense-present-continuous': 'Present Continuous',
        'tense-present-perfect': 'Present Perfect',
        'tense-present-perfect-continuous': 'Present Perfect Continuous',
        'tense-past-simple': 'Past Simple',
        'tense-past-continuous': 'Past Continuous',
        'tense-past-perfect': 'Past Perfect',
        'tense-past-perfect-continuous': 'Past Perfect Continuous',
        'tense-future-simple': 'Future Simple',
        'tense-future-continuous': 'Future Continuous',
        'tense-future-perfect': 'Future Perfect',
        'tense-future-perfect-continuous': 'Future Perfect Continuous',
        
        // Footer
        'footer-desc': 'Изучайте английские времена на примерах из фильмов',
        'footer-links': 'Быстрые ссылки',
        'footer-home': 'Главная',
        'footer-start': 'Начало изучение',
        'footer-course': 'Мой курс',
        'footer-creators': 'Создатели сайта',
        'footer-creators-names': 'Матай Нурай, Майлыбай Анеля, Дюсенова Ельнура, Беркинбаева Аида, Тулешова Аружан',
        'footer-copyright': '© 2026 TENSEFLIX. All rights reserved. | Master English Tenses Through Movies',
        
        // FAQ Widget
        'faq-title': 'FAQ (ЧАВО)',
        'faq-subtitle': 'Часто задаваемые вопросы',
        'faq-q-1': 'Как использовать Tenseflix для получения лучших результатов?',
        'faq-a-1': 'Начните с Видео 1, посмотрите его внимательно, затем выполните все задания и прочитайте объяснения, прежде чем двигаться дальше.',
        'faq-q-2': 'Нужно ли мне выполнить все задания, чтобы разблокировать следующее видео?',
        'faq-a-2': 'Да. Вы должны завершить предыдущий уровень, прежде чем переходить к следующему.',
        'faq-q-3': 'Почему некоторые ответы отображаются мгновенно?',
        'faq-a-3': 'Вопросы с множественным выбором проверяются мгновенно, чтобы дать вам быструю обратную связь.',
        'faq-q-4': 'Почему я не могу проверить свои ответы в некоторых заданиях?',
        'faq-a-4': 'Вы должны заполнить все обязательные поля перед тем, как нажать «Проверить».',
        'faq-q-5': 'Что означает «Требуется ответ»?',
        'faq-a-5': 'Это означает, что вы пропустили один или несколько вопросов. Пожалуйста, заполните все ответы перед проверкой.',
        'faq-q-6': 'Где я могу увидеть объяснения ответов?',
        'faq-a-6': 'Объяснения появляются после проверки или непосредственно под некоторыми вопросами.',
        'faq-q-7': 'Почему я иногда вижу объяснения, даже если мой ответ правильный?',
        'faq-a-7': 'Некоторые задания всегда показывают объяснения, чтобы закрепить ваше понимание.',
        'faq-q-8': 'Что такое Grammar Bank и как им пользоваться?',
        'faq-a-8': 'Он дает вам простые правила и примеры. Прочитайте его перед выполнением тестов, если вы не уверены.',
        'faq-q-9': 'Могу ли я пропустить видео и перейти сразу к практике?',
        'faq-a-9': 'Нет. Вам нужно сначала понять контекст, поэтому вы должны посмотреть видео перед выполнением заданий.',
        'faq-q-10': 'Все ли времена независимы?',
        'faq-a-10': 'Да. У каждого времени есть свои уроки, задания и прогресс.',
        'faq-q-11': 'Будет ли сохранен мой прогресс, если я перезагружу страницу?',
        'faq-a-11': 'Да. Ваши ответы сохраняются автоматически и восстанавливаются после перезагрузки.',
        'faq-q-12': 'Что показывает кнопка «Результаты»?',
        'faq-a-12': 'Она показывает ваш результат в разделе Practice Tasks. Если ваш балл ниже 70%, вам нужно попробовать еще раз.',
        'faq-q-13': 'Для чего нужен раздел «Полезные сайты»?',
        'faq-a-13': 'В этом разделе представлены проверенные ресурсы для практики английского языка за пределами Tenseflix, чтобы быстрее улучшить свои навыки.',
        'faq-q-14': 'Как работают задания на упорядочивание предложений?',
        'faq-a-14': 'Нажимайте на слова в правильном порядке, чтобы составить предложение.',
        'faq-q-15': 'Что делать, если я постоянно отвечаю неправильно?',
        'faq-a-15': 'Проверьте объяснение и Grammar Bank, затем попробуйте еще раз.',
        'faq-q-16': 'Могу ли я сбросить все и начать заново?',
        'faq-a-16': 'Да, вы можете очистить свой прогресс в любое время, используя опцию сброса.',
        'faq-q-17': 'Почему некоторые разделы выглядят иначе?',
        'faq-a-17': 'Каждое время может иметь немного разные типы заданий в зависимости от темы.',
        'faq-q-18': 'Что за функция со словами на главной странице?',
        'faq-a-18': 'На главной странице вы можете нажать на иконку, чтобы увидеть слово уровня B2 с его определением на английском языке.',
        'faq-q-19': 'Почему я могу видеть только одно слово в минуту?',
        'faq-a-19': 'Это помогает вам сосредоточиться и лучше запомнить лексику, а не просто просматривать слова.',
        'faq-q-20': 'Почему вопросы по видео не оцениваются?',
        'faq-a-20': 'Вопросы по видео — это часть процесса обучения. Они помогают понять грамматику через контекст, поэтому баллы за них не ставятся. Оцениваются только Practice Tasks после того, как вы изучите материал.',
        
        // Progress Page
        'nav-home': 'Главная',
        'nav-course': 'Мой курс',
        'nav-progress': 'Мой прогресс',
        'nav-profile': 'Профиль',
        'nav-logout': 'Выход',
        'progress-title': 'Мой прогресс',
        'stat-tenses-learned': 'Изучено времен',
        'stat-exercises': 'Упражнения выполнены',
        'stat-accuracy': 'Точность ответов',
        'stat-streak': 'Времени потрачено',
        'progress-by-tense': 'Прогресс по временам',
        'achievements-title': 'Достижения',
        'achievement-first': 'Первый урок',
        'achievement-halfway': 'Половина пути',
        'achievement-master': 'Мастер времен',
        'achievement-perfect': 'Идеальный студент',
        'btn-continue': 'Продолжить обучение',
        
        // Profile Page
        'profile-stats': '📊 Статистика',
        'progress-summary': '📈 Краткий прогресс',
        'account-actions': '⚙️ Действия',
        'btn-view-progress': 'Посмотреть прогресс',
        'danger-zone': '⚠️ Опасная зона',
        'clear-progress-warning': 'Если вы удалите прогресс, все ваши данные о достижениях будут потеряны. Это действие нельзя отменить.',
        'btn-clear-progress': 'Удалить прогресс',
        'logout-session': '🚪 Выход',
        'logout-warning': 'При выходе вы будете перенаправлены на страницу входа.',
        'btn-logout': 'Выход из профиля',
        'confirm-delete': 'Подтверждение удаления',
        'clear-progress-confirm': 'Вы уверены, что хотите удалить свой прогресс? Это действие нельзя отменить!',
        'btn-cancel': 'Отмена',
        'btn-delete': 'Удалить',

        'team-name-1': 'Матай Нурай',
        'team-name-2': 'Майлыбай Анеля',
        'team-name-3': 'Дюсенова Ельнура',
        'team-name-4': 'Беркинбаева Аида',
        'team-name-5': 'Тулешова Аружан',
        'about-title': 'О нас',
        'about-hint': 'Наведите, чтобы увидеть имя и роль. Нажмите на круг, чтобы увидеть опыт. Инфо исчезнет, когда вы уберете мышку.',
        'team-role-1': 'Руководитель проекта и UX-эксперт',
        'team-role-2': 'Выпускница ПКМУА, преподаватель иностранного языка',
        'team-role-3': 'IELTS 7.0',
        'team-role-4': 'Сертифицированный педагог TES и победитель олимпиады',
        'team-role-5': 'Учитель английского языка и оратор',
        'team-exp-title': 'Опыт',
        'team-exp-1': 'Уровень китайского языка B1. Ведущий архитектор пользовательского интерфейса и навигации платформы Tenseflix.',
        'team-exp-2': '3-е место на Республиканской олимпиаде. Специалист по интерактивной языковой педагогике.',
        'team-exp-3': 'Обладательница бронзовой медали «Елбасы медалі». Эксперт по разработке учебных программ и точности контента.',
        'team-exp-4': '1-е место на Республиканской олимпиаде по английскому языку. Бронзовый медалист «Елбасы медалі».',
        'team-exp-5': 'Участие в международных образовательных проектах. Публичные выступления.'
    },
    kk: {
        // Language Selector
        'lang-select': 'Тіл:',
        
        // Navbar & Header
        'nav-features': 'Мүмкіндіктер',
        'nav-tenses': '12 уақыт',
        'nav-start': 'Білім бастау',
        'nav-login': 'Кіру',
        
        // Hero Section
        'hero-title': 'Фильмдердің мысалдары арқылы<br>ағылшын тілінің уақытын үйреніңіз',
        'hero-subtitle': '12 уақыт, танымал фильмдерден, сериалдардан және мультфильмдерден 35 мысал',
        'hero-btn': 'Білім бастау',
        
        // Features Section
        'features-title': 'Неге TENSEFLIX?',
        'feature-1-title': 'Толық оқыту жүйесі',
        'feature-1-desc': 'Теория, фильмдердің мысалдары және әрбір уақыт үшін интерактивті жаттығулар',
        'feature-2-title': 'Аутентикалық мысалдар',
        'feature-2-desc': 'Ең танымал фильmlep және сериалдардан диалогтар жақсы есте қалу үшін',
        'feature-3-title': 'Интерактивті жаттығулар',
        'feature-3-desc': '40+ тапсырма ғана уақытта тексерісі және қателіктің түсіндірмесі',
        'feature-4-title': 'Жеке кабинет',
        'feature-4-desc': 'Сіздің прогресін өсімінді бақылау үшін ресімдеу жүйесі',
        'feature-5-title': 'Адаптивті дизайн',
        'feature-5-desc': 'Барлық құрылғыларда жұмыс істейді - компьютер, планшеттер және смартфондар',
        'feature-6-title': 'Ешқандай төлем жоқ',
        'feature-6-desc': '100% тегін оқыту жасырын жазылмасы және жарнамасыз',

        // How It Works Section
        'how-it-works-title': 'Бұл қалай жұмыс істейді',
        'how-it-works-1-title': 'Видеоны қараңыз',
        'how-it-works-1-desc': 'Уақыт табиғи түрде кездесетін фильмдерден немесе сериалдардан қысқа бейнеден бастаңыз.',
        'how-it-works-2-title': 'Контекстті түсініңіз',
        'how-it-works-2-desc': 'Уақыттың шынайы өмірде қалай қолданылатынын көріңіз және заңдылықтарды байқай бастаңыз.',
        'how-it-works-3-title': 'Құрылымын ашыңыз',
        'how-it-works-3-desc': 'Уақыттың қалай жұмыс істейтінін түсініңіз.',
        'how-it-works-4-title': 'Тәжірибе және тест',
        'how-it-works-4-desc': 'Түсінгеніңізді тапсырмалар мен тесттер арқылы қолданыңыз.',
        
        // Tenses Section
        'tenses-title': '12 Ағылшын Уақыты',
        'tenses-present': 'Ағымды (Present)',
        'tenses-past': 'Өткен (Past)',
        'tenses-future': 'Болашақ (Future)',
        'tense-present-simple': 'Present Simple',
        'tense-present-continuous': 'Present Continuous',
        'tense-present-perfect': 'Present Perfect',
        'tense-present-perfect-continuous': 'Present Perfect Continuous',
        'tense-past-simple': 'Past Simple',
        'tense-past-continuous': 'Past Continuous',
        'tense-past-perfect': 'Past Perfect',
        'tense-past-perfect-continuous': 'Past Perfect Continuous',
        'tense-future-simple': 'Future Simple',
        'tense-future-continuous': 'Future Continuous',
        'tense-future-perfect': 'Future Perfect',
        'tense-future-perfect-continuous': 'Future Perfect Continuous',
        
        // Footer
        'footer-desc': 'Фильмдердің мысалдары арқылы ағылшын тілінің уақытын үйреніңіз',
        'footer-links': 'Жылдам сілтемелер',
        'footer-home': 'Басты бет',
        'footer-start': 'Білім бастау',
        'footer-course': 'Менің курсым',
        'footer-creators': 'Сайт авторлары',
        'footer-creators-names': 'Матай Нурай, Майлыбай Анеля, Дюсенова Ельнура, Беркинбаева Аида, Тулешова Аружан',
        'footer-copyright': '© 2026 TENSEFLIX. Барлық құқықтар сақталған. | Фильмдер арқылы ағылшын тілінің уақытын озық ету',
        
        // FAQ Widget
        'faq-title': 'FAQ',
        'faq-subtitle': 'Жиі қойылатын сұрақтар',
        'faq-q-1': 'Үздік нәтижелерге қол жеткізу үшін Tenseflix-ті қалай пайдалану керек?',
        'faq-a-1': '1-ші бейнеден бастаңыз, оны мұқият көріңіз, содан кейін алға жылжымас бұрын барлық тапсырмаларды орындап, түсіндірмелерді оқыңыз.',
        'faq-q-2': 'Келесі бейнені ашу үшін барлық тапсырмаларды орындауым керек пе?',
        'faq-a-2': 'Иә. Келесі деңгейге өтпес бұрын алдыңғы деңгейді аяқтауыңыз керек.',
        'faq-q-3': 'Неліктен кейбір жауаптар бірден көрсетіледі?',
        'faq-a-3': 'Сізге жылдам кері байланыс беру үшін көп таңдаулы сұрақтар лезде тексеріледі.',
        'faq-q-4': 'Неліктен кейбір тапсырмаларда жауаптарымды тексере алмаймын?',
        'faq-a-4': '«Тексеру» батырмасын басу алдында барлық міндетті өрістерді толтыруыңыз керек.',
        'faq-q-5': '«Жауап қажет» нені білдіреді?',
        'faq-a-5': 'Бұл сіздің бір немесе бірнеше сұрақты өткізіп алғаныңызды білдіреді. Тексеру алдында барлық жауаптарды толтырыңыз.',
        'faq-q-6': 'Жауаптардың түсіндірмелерін қайдан көруге болады?',
        'faq-a-6': 'Түсіндірмелер тексеруден кейін немесе кейбір сұрақтардың астында бірден пайда болады.',
        'faq-q-7': 'Жауабым дұрыс болса да, неге кейде түсіндірмелерді көремін?',
        'faq-a-7': 'Кейбір тапсырмалар түсінігіңізді нығайту үшін әрқашан түсіндірмелерді көрсетеді.',
        'faq-q-8': 'Grammar Bank дегеніміз не және оны қалай пайдалану керек?',
        'faq-a-8': 'Ол сізге қарапайым ережелер мен мысалдар береді. Егер сенімді болмасаңыз, тест тапсырмас бұрын оны оқып шығыңыз.',
        'faq-q-9': 'Бейнелерді өткізіп жіберіп, бірден практикаға өтуге бола ма?',
        'faq-a-9': 'Жоқ. Алдымен контексті түсінуіңіз керек, сондықтан тапсырмаларды орындамас бұрын бейнені көруіңіз қажет.',
        'faq-q-10': 'Барлық шақтар тәуелсіз бе?',
        'faq-a-10': 'Иә. Әр шақтың өз сабақтары, тапсырмалары және прогресі бар.',
        'faq-q-11': 'Бетті жаңартсам, менің прогресім сақтала ма?',
        'faq-a-11': 'Иә. Жауаптарыңыз автоматты түрде сақталады және қайта жүктегеннен кейін қалпына келтіріледі.',
        'faq-q-12': '«Нәтижелерді алу» батырмасы нені көрсетеді?',
        'faq-a-12': 'Ол Practice Tasks бөліміндегі нәтижеңізді көрсетеді. Егер сіздің ұпайыңыз 70%-дан төмен болса, қайтадан көруіңіз керек.',
        'faq-q-13': '«Пайдалы веб-сайттар» бөлімі не үшін қажет?',
        'faq-a-13': 'Бұл бөлімде дағдыларыңызды тезірек жетілдіру үшін Tenseflix-тен тыс ағылшын тілін үйренуге арналған сенімді ресурстар берілген.',
        'faq-q-14': 'Сөйлемдерді реттеу тапсырмалары қалай жұмыс істейді?',
        'faq-a-14': 'Сөйлем құрау үшін сөздерді дұрыс ретпен басыңыз.',
        'faq-q-15': 'Егер мен үнемі қате жауап берсем не істеуім керек?',
        'faq-a-15': 'Түсіндірме мен Grammar Bank-ті тексеріп, қайтадан көріңіз.',
        'faq-q-16': 'Бәрін өшіріп, қайтадан бастауға бола ма?',
        'faq-a-16': 'Иә, прогресті кез келген уақытта нөлдеу опциясын пайдаланып тазалай аласыз.',
        'faq-q-17': 'Неліктен кейбір бөлімдер басқалардан өзгеше көрінеді?',
        'faq-a-17': 'Әр шақтың тақырыпқа байланысты тапсырма түрлері сәл өзгеше болуы мүмкін.',
        'faq-q-18': 'Басты беттегі сөздер функциясы деген не?',
        'faq-a-18': 'Басты бетте B2 деңгейіндегі сөзді және оның ағылшын тіліндегі анықтамасын көру үшін белгішені басуға болады.',
        'faq-q-19': 'Неліктен мен минутына тек бір сөзді көре аламын?',
        'faq-a-19': 'Бұл сөздерді жай ғана қарап шығудың орнына, зейін қоюға және сөздік қорды жақсырақ есте сақтауға көмектеседі.',
        'faq-q-20': 'Бейне бойынша сұрақтар неге бағаланбайды?',
        'faq-a-20': 'Бейне сұрақтары оқу процесінің бір бөлігі болып табылады. Олар грамматиканы контекст арқылы түсінуге көмектеседі, сондықтан олар үшін ұпай қойылмайды. Тек материалды меңгергеннен кейін Practice Tasks бағаланады.',
        
        // Progress Page
        'nav-home': 'Басты бет',
        'nav-course': 'Менің курсым',
        'nav-progress': 'Менің прогресім',
        'nav-profile': 'Профиль',
        'nav-logout': 'Шығу',
        'progress-title': 'Менің прогресім',
        'stat-tenses-learned': 'Үйренген уақыт',
        'stat-exercises': 'Жаттығулар орындалды',
        'stat-accuracy': 'Жауаптар сапасы',
        'stat-streak': 'Уақыт жұмсалды',
        'progress-by-tense': 'Уақыт бойынша прогресс',
        'achievements-title': 'Жетістіктер',
        'achievement-first': 'Бірінші сабақ',
        'achievement-halfway': 'Жартысы жолы',
        'achievement-master': 'Уақыт устері',
        'achievement-perfect': 'Ең сапалы студент',
        'btn-continue': 'Оқытуды қалдыру',
        
        // Profile Page
        'profile-stats': '📊 Статистика',
        'progress-summary': '📈 Қысқаша прогресс',
        'account-actions': '⚙️ Әрекеттер',
        'btn-view-progress': 'Прогресін көру',
        'danger-zone': '⚠️ Қауіптік аймақ',
        'clear-progress-warning': 'Егер сіз өзіңіздің прогресін өшірсеңіз, барлық сіздің жетістіктер жойылады. Бұл әрекетті болдырмау мүмкін емес.',
        'btn-clear-progress': 'Прогресін өшіру',
        'logout-session': '🚪 Шығу',
        'logout-warning': 'Шығысанда сіз кіру бетіне бағдарланасыз.',
        'btn-logout': 'Профильден шығу',
        'confirm-delete': 'Өшіруді растау',
        'clear-progress-confirm': 'Сіз өзіңіздің прогресін өшіргіңіз келеді ме? Бұл әрекетті болдырмау мүмкін емес!',
        'btn-cancel': 'Болдырмау',
        'btn-delete': 'Өшіру',

        'team-name-1': 'Матай Нурай',
        'team-name-2': 'Майлыбай Анеля',
        'team-name-3': 'Дюсенова Ельнура',
        'team-name-4': 'Беркинбаева Аида',
        'team-name-5': 'Тулешова Аружан',
        'about-title': 'Біз туралы',
        'about-hint': 'Атын және рөлін көру үшін тінтуірді үстіне апарыңыз. Тәжірибені көру үшін шеңберді басыңыз. Тінтуірді басқа жаққа апарғанда ақпарат жоғалады.',
        'team-role-1': 'Жоба жетекшісі және UX сарапшысы',
        'team-role-2': 'ПКМУА түлегі, шет тілі мұғалімі',
        'team-role-3': 'IELTS 7.0',
        'team-role-4': 'TES сертификатталған педагог және олимпиада жеңімпазы',
        'team-role-5': 'Ағылшын тілі мұғалімі және шешен',
        'team-exp-title': 'Тәжірибе',
        'team-exp-1': 'Қытай тілі деңгейі B1. Tenseflix интерфейсі мен платформа навигациясының жетекші сәулетшісі.',
        'team-exp-2': 'Республикалық олимпиаданың 3-орын иегері. Интерактивті тілдік педагогика бойынша маман.',
        'team-exp-3': '«Елбасы медалі» қола медалінің иегері. Оқу бағдарламаларын әзірлеу және мазмұн дәлдігі бойынша сарапшы.',
        'team-exp-4': 'Ағылшын тілінен Республикалық олимпиаданың 1-орын иегері. «Елбасы медалі» қола жүлдегері.',
        'team-exp-5': 'Халықаралық білім беру жобаларына қатысу. Көпшілік алдында сөйлеу маманы.'
    },
    en: {
        // Language Selector
        'lang-select': 'Language:',
        
        // Navbar & Header
        'nav-features': 'Features',
        'nav-tenses': '12 Tenses',
        'nav-start': 'Start Learning',
        'nav-login': 'Login',
        
        // Hero Section
        'hero-title': 'Learn English Tenses<br>Through Movie Examples',
        'hero-subtitle': '12 tenses, 35 examples from popular movies, TV series and cartoons',
        'hero-btn': 'Start Learning',
        
        // Features Section
        'features-title': 'Why TENSEFLIX?',
        'feature-1-title': 'Complete Learning System',
        'feature-1-desc': 'Theory, movie examples and interactive exercises for each tense',
        'feature-2-title': 'Authentic Examples',
        'feature-2-desc': 'Dialogues from popular movies and TV series for better retention',
        'feature-3-title': 'Interactive Exercises',
        'feature-3-desc': '40+ tasks with instant verification and error explanations',
        'feature-4-title': 'Personal Dashboard',
        'feature-4-desc': 'Authentication system to track your learning progress',
        'feature-5-title': 'Responsive Design',
        'feature-5-desc': 'Works on all devices - desktop, tablets and smartphones',
        'feature-6-title': 'No Payments',
        'feature-6-desc': '100% free learning without hidden subscriptions and ads',

        // How It Works Section
        'how-it-works-title': 'How It Works',
        'how-it-works-1-title': 'Watch the Video',
        'how-it-works-1-desc': 'Start with a short video from movies or TV series where the tense appears naturally.',
        'how-it-works-2-title': 'Understand the Context',
        'how-it-works-2-desc': 'See how the tense is used in real-life situations and start noticing patterns.',
        'how-it-works-3-title': 'Discover the Pattern',
        'how-it-works-3-desc': 'Figure out how the tense works.',
        'how-it-works-4-title': 'Practice & Test',
        'how-it-works-4-desc': 'Apply what you’ve understood through tasks and tests.',
        
        // Tenses Section
        'tenses-title': '12 English Tenses',
        'tenses-present': 'Present',
        'tenses-past': 'Past',
        'tenses-future': 'Future',
        'tense-present-simple': 'Present Simple',
        'tense-present-continuous': 'Present Continuous',
        'tense-present-perfect': 'Present Perfect',
        'tense-present-perfect-continuous': 'Present Perfect Continuous',
        'tense-past-simple': 'Past Simple',
        'tense-past-continuous': 'Past Continuous',
        'tense-past-perfect': 'Past Perfect',
        'tense-past-perfect-continuous': 'Past Perfect Continuous',
        'tense-future-simple': 'Future Simple',
        'tense-future-continuous': 'Future Continuous',
        'tense-future-perfect': 'Future Perfect',
        'tense-future-perfect-continuous': 'Future Perfect Continuous',
        
        // Footer
        'footer-desc': 'Learn English tenses through movie examples',
        'footer-links': 'Quick Links',
        'footer-home': 'Home',
        'footer-start': 'Start Learning',
        'footer-course': 'My Course',
        'footer-creators': 'Site Creators',
        'footer-creators-names': 'Matay Nuray, Mailybay Anelya, Dusenova Elnura, Berkinbaeva Aida, Tuleshova Aruzhan',
        'footer-copyright': '© 2026 TENSEFLIX. All rights reserved. | Master English Tenses Through Movies',
        
        // FAQ Widget
        'faq-title': 'FAQ',
        'faq-subtitle': 'Frequently Asked Questions',
        'faq-q-1': 'How should I use Tenseflix to get the best results?',
        'faq-a-1': 'Start with Video 1, watch it carefully, then complete all tasks and read the explanations before moving on.',
        'faq-q-2': 'Do I have to complete all tasks to unlock the next video?',
        'faq-a-2': 'Yes. You must complete the previous level before moving to the next one.',
        'faq-q-3': 'Why do some answers show immediately?',
        'faq-a-3': 'Multiple-choice questions are checked instantly to give you quick feedback.',
        'faq-q-4': 'Why can’t I check my answers in some tasks?',
        'faq-a-4': 'You must fill in all required fields before clicking “Check”.',
        'faq-q-5': 'What does “Answer is required” mean?',
        'faq-a-5': 'It means you skipped one or more questions. Please complete all answers before checking.',
        'faq-q-6': 'Where can I see explanations for answers?',
        'faq-a-6': 'Explanations appear after checking or directly under some questions.',
        'faq-q-7': 'Why do I sometimes see explanations even when my answer is correct?',
        'faq-a-7': 'Some tasks always show explanations to help reinforce your understanding.',
        'faq-q-8': 'What is the Grammar Bank and how should I use it?',
        'faq-a-8': 'It gives you simple rules and examples. Read it before doing tests if you\'re unsure.',
        'faq-q-9': 'Can I skip videos and go directly to practice?',
        'faq-a-9': 'No. You need to understand the context first, so you must watch the video before doing the tasks.',
        'faq-q-10': 'Are all tenses independent?',
        'faq-a-10': 'Yes. Each tense has its own lessons, tasks, and progress.',
        'faq-q-11': 'Will my progress be saved if I refresh the page?',
        'faq-a-11': 'Yes. Your answers are saved automatically and restored after reload.',
        'faq-q-12': 'What does the “Get Results” button show?',
        'faq-a-12': 'It shows your result for Practice Tasks. If your score is below 70%, you need to try again.',
        'faq-q-13': 'What are “Useful Websites” for?',
        'faq-a-13': 'This section gives you trusted resources to practice English outside Tenseflix and improve your skills faster.',
        'faq-q-14': 'How do sentence reorder tasks work?',
        'faq-a-14': 'Click on words in the correct order to build a sentence.',
        'faq-q-15': 'What should I do if I keep getting answers wrong?',
        'faq-a-15': 'Check the explanation and Grammar Bank, then try again.',
        'faq-q-16': 'Can I reset everything and start again?',
        'faq-a-16': 'Yes, you can clear your progress anytime using the reset option.',
        'faq-q-17': 'Why do some sections look different from others?',
        'faq-a-17': 'Each tense may have slightly different task types to match the topic.',
        'faq-q-18': 'What is the word feature on the main page?',
        'faq-a-18': 'On the main page, you can click the icon to see a B2-level word with its English definition.',
        'faq-q-19': 'Why can I only see one word per minute?',
        'faq-a-19': 'This helps you focus and remember vocabulary better instead of rushing through words.',
        'faq-q-20': 'Why are video questions not graded?',
        'faq-a-20': 'Video questions are part of the learning process. They help you understand grammar through context, so they are not scored. Only Practice Tasks are graded after you learn the material.',
        
        // Progress Page
        'nav-home': 'Home',
        'nav-course': 'My Course',
        'nav-progress': 'My Progress',
        'nav-profile': 'Profile',
        'nav-logout': 'Logout',
        'progress-title': 'My Progress',
        'stat-tenses-learned': 'Tenses Learned',
        'stat-exercises': 'Exercises Completed',
        'stat-accuracy': 'Accuracy',
        'stat-streak': 'Time Spent',
        'progress-by-tense': 'Progress by Tense',
        'achievements-title': 'Achievements',
        'achievement-first': 'First Lesson',
        'achievement-halfway': 'Halfway There',
        'achievement-master': 'Tense Master',
        'achievement-perfect': 'Perfect Student',
        'btn-continue': 'Continue Learning',
        
        // Profile Page
        'profile-stats': '📊 Statistics',
        'progress-summary': '📈 Progress Summary',
        'account-actions': '⚙️ Actions',
        'btn-view-progress': 'View Progress',
        'danger-zone': '⚠️ Danger Zone',
        'clear-progress-warning': 'If you delete your progress, all your achievement data will be lost. This action cannot be undone.',
        'btn-clear-progress': 'Delete Progress',
        'logout-session': '🚪 Logout',
        'logout-warning': 'When you logout, you will be redirected to the login page.',
        'btn-logout': 'Logout from Profile',
        'confirm-delete': 'Confirm Deletion',
        'clear-progress-confirm': 'Are you sure you want to delete your progress? This action cannot be undone!',
        'btn-cancel': 'Cancel',
        'btn-delete': 'Delete',

        'team-name-1': 'Nuray Matay',
        'team-name-2': 'Anelya Mailybay',
        'team-name-3': 'Elnura Duisenova',
        'team-name-4': 'Aida Berkimbayeva',
        'team-name-5': 'Aruzhan Tuleshova',
        'about-title': 'About Us',
        'about-hint': 'Hover to see name & description. Click inside the circle to reveal experience. Info hides when you stop hovering.',
        'team-role-1': 'Project Lead & UX Expert',
        'team-role-2': 'Graduate of PKMUA, Foreign Language Teacher',
        'team-role-3': 'IELTS 7.0',
        'team-role-4': 'TES Certified Educator & Olympiad Winner',
        'team-role-5': 'English Teacher & Public Speaker',
        'team-exp-title': 'Experience',
        'team-exp-1': 'Chinese language level B1. Lead architect of Tenseflix user interface and platform navigation.',
        'team-exp-2': '3rd place winner of Republican Olympiad. Specialist in interactive language pedagogy.',
        'team-exp-3': 'Owner of the bronze medal of Elbasy medali. Expert in curriculum development and accuracy.',
        'team-exp-4': '1st place in Republican English Olympiad. Bronze Medalist of "Elbasy Medali".',
        'team-exp-5': 'Participating in international educational projects. Public Speaking.'
    }
};

// Language Switcher Functions
let currentLanguage = localStorage.getItem('language') || 'en';

function setLanguage(lang) {
    if (translations[lang]) {
        currentLanguage = lang;
        localStorage.setItem('language', lang);
        updatePageLanguage();
        updateLanguageSwitcherUI();
    }
}

function getTranslation(key) {
    return translations[currentLanguage][key] || translations['en'][key] || key;
}

function updatePageLanguage() {
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = getTranslation(key);
        
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            element.placeholder = translation;
        } else if (element.tagName === 'A' || element.tagName === 'BUTTON') {
            element.textContent = translation;
        } else {
            element.innerHTML = translation;
        }
    });
    
    // Update page lang attribute
    document.documentElement.lang = currentLanguage;
}

function updateLanguageSwitcherUI() {
    // Update active state for language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-lang') === currentLanguage) {
            btn.classList.add('active');
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Auto-load saved language preference
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage && currentLanguage !== savedLanguage) {
        currentLanguage = savedLanguage;
    }
    updatePageLanguage();
    updateLanguageSwitcherUI();
});
