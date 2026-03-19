const translations = {
    pl: {
        title: "Mistrz Matematyki! 🚀",
        correct: "Dobrze",
        wrong: "Źle",
        history: "Historia zadań",
        goal: "Cel",
        race: "Wyścig \"przeciąganie liny\" - kto pierwszy osiągnie cel?",
        hintShow: "Pokaż podpowiedź 💡",
        hintHide: "Ukryj podpowiedź 🙈",
        hintLineH: "Zmień na linie poziome 📏",
        hintLineV: "Zmień na linie pionowe 📐",
        hintBoxes: "Zmień na klocki 🟦",
        timer: "Limit czasu (sekundy):",
        settings: "Ustawienia ⚙️",
        operations: "Działania:",
        opAdd: "Dodawanie (+)",
        opSub: "Odejmowanie (-)",
        opMul: "Mnożenie (×)",
        opDiv: "Dzielenie (÷)",
        num1: "Pierwsza liczba:",
        num2: "Druga liczba:",
        numFrom: "2 do",
        setGoal: "Ustaw cel (punkty):",
        continue: "Graj dalej! 🎮",
        reset: "Resetuj wszystko 🔄",
        clear: "Wyczyść",
        close: "Zamknij",
        noHistory: "Brak zadań w historii",
        winTitle: "ZWYCIĘSTWO!",
        winMsg: "Jesteś prawdziwym Mistrzem Matematyki! Cel został osiągnięty!",
        loseTitle: "OJ! PRZEGRANA",
        loseMsg: "Tym razem się nie udało. Ale głowa do góry, trening czyni mistrza!",
        playAgain: "Graj ponownie! 🚀",
        timeOut: "Czas minął! ⏰",
        tryAgain: "Spróbuj jeszcze raz! 🌈",
        great: "Świetnie! ✨",
        mathQuote: "\"Matematyka to klucz do wszystkich drzwi!\" 🔑",
        confirmClear: "Czy na pewno wyczyścić całą historię?",
        confirmReset: "Czy na pewno zresetować wszystkie ustawienia i wyniki?",
        selectOne: "Wybierz przynajmniej jedno działanie!"
    },
    en: {
        title: "Math Master! 🚀",
        correct: "Correct",
        wrong: "Wrong",
        history: "Task History",
        goal: "Goal",
        race: "Tug-of-war - who reaches the goal first?",
        hintShow: "Show hint 💡",
        hintHide: "Hide hint 🙈",
        hintLineH: "Change to horizontal lines 📏",
        hintLineV: "Change to vertical lines 📐",
        hintBoxes: "Change to boxes 🟦",
        timer: "Time limit (seconds):",
        settings: "Settings ⚙️",
        operations: "Operations:",
        opAdd: "Addition (+)",
        opSub: "Subtraction (-)",
        opMul: "Multiplication (×)",
        opDiv: "Division (÷)",
        num1: "First number:",
        num2: "Second number:",
        numFrom: "2 to",
        setGoal: "Set goal (points):",
        continue: "Play on! 🎮",
        reset: "Reset all 🔄",
        clear: "Clear",
        close: "Close",
        noHistory: "No tasks in history",
        winTitle: "VICTORY!",
        winMsg: "You are a true Math Master! Goal achieved!",
        loseTitle: "OOPS! DEFEAT",
        loseMsg: "It didn't work out this time. But keep your head up, practice makes perfect!",
        playAgain: "Play again! 🚀",
        timeOut: "Time's up! ⏰",
        tryAgain: "Try again! 🌈",
        great: "Great! ✨",
        mathQuote: "\"Mathematics is the key to all doors!\" 🔑",
        confirmClear: "Are you sure you want to clear history?",
        confirmReset: "Are you sure you want to reset all settings and scores?",
        selectOne: "Select at least one operation!"
    },
    uk: {
        title: "Майстер Математики! 🚀",
        correct: "Добре",
        wrong: "Неправильно",
        history: "Історія завдань",
        goal: "Ціль",
        race: "Перетягування канату - хто перший досягне цілі?",
        hintShow: "Показати підказку 💡",
        hintHide: "Сховати підказку 🙈",
        hintLineH: "Змінити на горизонтальні лінії 📏",
        hintLineV: "Змінити на вертикальні лінії 📐",
        hintBoxes: "Змінити на блоки 🟦",
        timer: "Ліміт часу (секунди):",
        settings: "Налаштування ⚙️",
        operations: "Дії:",
        opAdd: "Додавання (+)",
        opSub: "Віднімання (-)",
        opMul: "Множення (×)",
        opDiv: "Ділення (÷)",
        num1: "Перше число:",
        num2: "Друге число:",
        numFrom: "від 2 до",
        setGoal: "Встановити ціль (бали):",
        continue: "Грати далі! 🎮",
        reset: "Скинути все 🔄",
        clear: "Очистити",
        close: "Закрити",
        noHistory: "Історія порожня",
        winTitle: "ПЕРЕМОГА!",
        winMsg: "Ти справжній Майстер Математики! Ціль досягнута!",
        loseTitle: "ОЙ! ПРОГРАШ",
        loseMsg: "Цього разу не вдалося. Але не вішай носа, тренування робить майстром!",
        playAgain: "Грати знову! 🚀",
        timeOut: "Час вийшов! ⏰",
        tryAgain: "Спробуй ще раз! 🌈",
        great: "Чудово! ✨",
        mathQuote: "\"Математика - це ключ до всіх дверей!\" 🔑",
        confirmClear: "Ви впевнені, що хочете очистити історію?",
        confirmReset: "Ви впевнені, що хочете скинути всі налаштування та результати?",
        selectOne: "Виберіть хоча б одну дію!"
    }
};

let currentLang = localStorage.getItem('math_game_lang') || 'pl';

function t(key) {
    return translations[currentLang][key] || key;
}

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('math_game_lang', lang);
    updateUI();
}

function updateUI() {
    // Basic elements
    const elementsToTranslate = {
        'game-title': 'title',
        'goal-info-label': 'goal',
        'hint-btn-text': !hintVisible ? 'hintShow' : getHintModeKey(),
        'settings-title': 'settings',
        'ops-label': 'operations',
        'op-add-label': 'opAdd',
        'op-sub-label': 'opSub',
        'op-mul-label': 'opMul',
        'op-div-label': 'opDiv',
        'num1-label': 'num1',
        'num2-label': 'num2',
        'timer-label': 'timer',
        'goal-label': 'setGoal',
        'goal-race-desc': 'race',
        'btn-continue': 'continue',
        'btn-reset-all': 'reset',
        'history-title': 'history',
        'btn-history-clear': 'clear',
        'btn-history-close': 'close',
        'finish-quote': 'mathQuote',
        'btn-play-again': 'playAgain'
    };

    for (const [id, key] of Object.entries(elementsToTranslate)) {
        const el = document.getElementById(id);
        if (el) {
            if (id === 'hint-btn-text' && hintVisible) {
                el.innerText = t(getHintModeKey());
            } else {
                el.innerText = t(key);
            }
        }
    }

    // Goal labels
    if (settings.goalEnabled) {
        const goalText = document.getElementById('goal-progress-text');
        if (goalText) goalText.innerText = `${goalProgress.bad} / ${settings.goalLimit} VS ${goalProgress.good} / ${settings.goalLimit}`;
    }

    // Finish dialog needs update only if visible
    if (!document.getElementById('finish-dialog').classList.contains('hidden')) {
        // Updated in showFinishDialog
    }

    // Update numerical inputs labels (2 to X)
    document.querySelectorAll('.num-from-label').forEach(el => el.innerText = t('numFrom'));
}

function getHintModeKey() {
    if (hintMode === "boxes") return "hintLineH";
    if (hintMode === "lines-h") return "hintLineV";
    return "hintBoxes";
}
