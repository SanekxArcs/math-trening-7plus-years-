let correctAnswer;
let num1, num2, currentOp;
let hintVisible = false;
let hintMode = "boxes";
let timerInterval = null;
let timeLeft = 0;
let halfHalfUsedInRound = false;

let correctScore = parseFloat(localStorage.getItem("math_game_correct")) || 0;
let wrongScore = parseInt(localStorage.getItem("math_game_wrong")) || 0;
let gameHistory = getFromLocalStorage("math_game_history", []);
let goalProgress = getFromLocalStorage("math_game_goal_progress", { good: 0, bad: 0 });

// Initialization
document.addEventListener("DOMContentLoaded", () => {
    updateUI();
    updateScoreDisplay();
    updateGoalUI();
    generateQuestion();
});

function resetGoal() {
    goalProgress = { good: 0, bad: 0 };
    saveToLocalStorage("math_game_goal_progress", goalProgress);
    updateGoalUI();
}

function updateGoalUI() {
    const goalContainer = document.getElementById("goal-container");
    const target = settings.goalLimit;

    if (!settings.goalEnabled) {
        goalContainer.classList.add("hidden");
        return;
    }

    goalContainer.classList.remove("hidden");

    // Calculate percentage (max 50% for each side)
    const badWidth = (goalProgress.bad / target) * 50;
    const goodWidth = (goalProgress.good / target) * 50;

    document.getElementById("goal-bar-bad").style.width = Math.min(badWidth, 50) + "%";
    document.getElementById("goal-bar-good").style.width = Math.min(goodWidth, 50) + "%";

    // Update progress text
    document.getElementById("goal-progress-text").innerText =
        `${goalProgress.bad} / ${target}  VS  ${goalProgress.good} / ${target}`;

    saveToLocalStorage("math_game_goal_progress", goalProgress);

    if (goalProgress.good >= target) {
        setTimeout(() => showFinishDialog(true), 500);
    } else if (goalProgress.bad >= target) {
        setTimeout(() => showFinishDialog(false), 500);
    }
}

function showFinishDialog(isWin) {
    const dialog = document.getElementById("finish-dialog");
    const icon = document.getElementById("finish-icon");
    const title = document.getElementById("finish-title");
    const msg = document.getElementById("finish-message");
    const btn = document.getElementById("btn-play-again");

    if (isWin) {
        icon.innerText = "🏆";
        title.innerText = t("winTitle");
        title.className = "text-4xl font-black mb-2 text-emerald-600 uppercase tracking-tight";
        msg.innerText = t("winMsg");
        btn.className = "bg-emerald-500 text-white font-black py-5 px-10 rounded-3xl shadow-xl hover:bg-emerald-600 transition-all hover:scale-105 w-full text-2xl cursor-pointer border-b-8 border-emerald-700 active:border-b-0 active:translate-y-2";
        playSound("correct");
        playSound("correct");
    } else {
        icon.innerText = "💔";
        title.innerText = t("loseTitle");
        title.className = "text-4xl font-black mb-2 text-rose-500 uppercase tracking-tight";
        msg.innerText = t("loseMsg");
        btn.className = "bg-rose-500 text-white font-black py-5 px-10 rounded-3xl shadow-xl hover:bg-rose-600 transition-all hover:scale-105 w-full text-2xl cursor-pointer border-b-8 border-rose-700 active:border-b-0 active:translate-y-2";
        playSound("wrong");
    }

    dialog.classList.remove("hidden");
}

function closeFinishDialog() {
    document.getElementById("finish-dialog").classList.add("hidden");
    resetGoal();
    generateQuestion();
}

function saveToHistory(q, userAns, correctAns, isCorrect) {
    const entry = {
        q: q,
        user: userAns,
        correct: correctAns,
        status: isCorrect ? "correct" : "wrong",
        time: new Date().toLocaleTimeString(),
    };
    gameHistory.unshift(entry);
    if (gameHistory.length > 50) gameHistory.pop();
    saveToLocalStorage("math_game_history", gameHistory);
}

function openHistory() {
    showHistory();
}

function showHistory() {
    const list = document.getElementById("history-content");
    list.innerHTML = "";

    if (gameHistory.length === 0) {
        list.innerHTML = `<div class="text-center text-gray-400 mt-8">${t('noHistory')}</div>`;
    } else {
        gameHistory.forEach((item) => {
            const div = document.createElement("div");
            div.className = "history-card shadow-sm";
            div.innerHTML = `
                  <div class="flex-grow">
                      <span class="text-gray-400 text-[9px] font-black uppercase tracking-wider">${item.time}</span>
                      <div class="font-bold text-lg text-slate-700 leading-tight">${item.q}</div>
                  </div>
                  <div class="flex flex-col items-end gap-0.5">
                      <div class="${item.status === "correct" ? "text-emerald-500" : "text-rose-500"} font-black text-base flex items-center gap-1">
                          ${item.status === "correct" ? "✅ " + item.user : "❌ " + item.user}
                      </div>
                      ${item.status !== "correct" ? '<div class="text-[9px] text-emerald-600 font-black uppercase tracking-wider leading-none">' + t('correct') + ': ' + item.correct + "</div>" : ""}
                  </div>
              `;
            list.appendChild(div);
        });
    }

    document.getElementById("history-dialog").classList.remove("hidden");
}

function closeHistory() {
    document.getElementById("history-dialog").classList.add("hidden");
}

function clearHistory() {
    if (confirm(t('confirmClear'))) {
        gameHistory = [];
        localStorage.removeItem("math_game_history");
        showHistory();
    }
}

function updateScoreDisplay() {
    document.getElementById("correct-score").innerText = correctScore;
    document.getElementById("wrong-score").innerText = wrongScore;
    updateGoalUI();
}

function startTimer() {
    const timerBar = document.getElementById("timer-bar");
    const container = document.getElementById("timer-container");

    if (!settings.timerEnabled) {
        container.classList.add("hidden");
        return;
    }

    container.classList.remove("hidden");
    let duration = settings.timerLimit * 1000;
    let start = Date.now();

    timerBar.style.width = "100%";

    timerInterval = setInterval(() => {
        let passed = Date.now() - start;
        let remaining = duration - passed;
        let percent = (remaining / duration) * 100;

        if (remaining <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            timerBar.style.width = "0%";
            handleTimeOut();
        } else {
            timerBar.style.width = percent + "%";
        }
    }, 50);
}

function handleTimeOut() {
    const feedback = document.getElementById("feedback");
    const buttons = document.querySelectorAll(".btn-option");
    const questionText = document.getElementById("question").innerText;

    buttons.forEach((btn) => (btn.disabled = true));
    saveToHistory(questionText, "---", correctAnswer, false);

    wrongScore++;
    if (settings.goalEnabled) goalProgress.bad++;
    localStorage.setItem("math_game_wrong", wrongScore.toString());
    playSound("wrong");

    feedback.innerText = t('timeOut');
    feedback.className = "text-center text-2xl h-8 opacity-100 font-black text-rose-400";

    updateScoreDisplay();
    updateGoalUI();
    setTimeout(generateQuestion, 1500);
}

function useHalfHalf() {
    halfHalfUsedInRound = true;
    const buttons = Array.from(document.querySelectorAll(".btn-option"));
    let wrongIndices = [];

    buttons.forEach((btn, index) => {
        if (parseInt(btn.innerText) !== correctAnswer) {
            wrongIndices.push(index);
        }
    });

    const toHide = [];
    while (toHide.length < 2) {
        const randomWrong = wrongIndices[Math.floor(Math.random() * wrongIndices.length)];
        if (!toHide.includes(randomWrong)) toHide.push(randomWrong);
    }

    toHide.forEach((idx) => {
        buttons[idx].classList.add("hidden-option");
        buttons[idx].disabled = true;
    });

    const halfBtn = document.getElementById("half-half");
    halfBtn.disabled = true;
    halfBtn.classList.add("opacity-50", "bg-gray-200", "border-gray-300", "text-gray-400");
}

function toggleHint() {
    const sidePanel = document.getElementById("hint-side-panel");
    const mobileContainer = document.getElementById("hint-container-mobile");
    const changeBtn = document.getElementById("change-hint-btn");
    const changeBtnMobile = document.getElementById("change-hint-btn-mobile");

    if (!hintVisible) {
        hintVisible = true;
        sidePanel.classList.remove("hidden");
        if (changeBtn) changeBtn.classList.remove("hidden");
        if (changeBtnMobile) changeBtnMobile.classList.remove("hidden");
        // Trigger animation
        setTimeout(() => {
            sidePanel.classList.remove("opacity-0", "-translate-x-10", "pointer-events-none");
            renderHint();
        }, 10);
        mobileContainer.classList.remove("hidden");
    } else {
        hintVisible = false;
        sidePanel.classList.add("opacity-0", "-translate-x-10", "pointer-events-none");
        if (changeBtn) changeBtn.classList.add("hidden");
        if (changeBtnMobile) changeBtnMobile.classList.add("hidden");
        setTimeout(() => {
            sidePanel.classList.add("hidden");
        }, 500);
        mobileContainer.classList.add("hidden");
    }
    updateUI();
}

function renderHint() {
    // If not visible, do nothing when called by manual button
    if (!hintVisible) return;

    // Cycle hint mode if called manually or when already visible
    // We'll increment mode here for both types of calls
    if (hintMode === "boxes") hintMode = "lines-h";
    else if (hintMode === "lines-h") hintMode = "lines-v";
    else hintMode = "boxes";

    const containerPC = document.getElementById("hint-container-pc");
    const containerMobile = document.getElementById("hint-container-mobile");

    // Clear both
    containerPC.innerHTML = "";
    containerMobile.innerHTML = "";

    const createGroup = (isPC) => {
        const group = document.createElement("div");
        const baseClass = "border-2 border-indigo-100 p-2 rounded-2xl bg-white shadow-sm flex";

        if (hintMode === "boxes") {
            group.className = baseClass + " flex-wrap";
            group.style.width = isPC ? `${num1 * 14 + 28}px` : `${num1 * 12 + 24}px`;
        } else if (hintMode === "lines-h") {
            group.className = baseClass + " flex-col";
            group.style.width = "50px";
        } else {
            group.className = baseClass + " flex-row items-end justify-center";
            group.style.height = "50px";
        }

        for (let j = 0; j < num1; j++) {
            const item = document.createElement("div");
            if (hintMode === "boxes") {
                item.className = "hint-box bg-indigo-400";
                if (isPC) { item.style.width = "10px"; item.style.height = "10px"; }
            }
            else if (hintMode === "lines-h") item.className = "hint-line bg-indigo-300 h-1 w-full rounded-full my-0.5";
            else item.className = "hint-line bg-indigo-300 w-1 h-full rounded-full mx-0.5";
            group.appendChild(item);
        }
        return group;
    };

    for (let i = 0; i < num2; i++) {
        containerPC.appendChild(createGroup(true));
        containerMobile.appendChild(createGroup(false));
    }
}

function generateQuestion() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    halfHalfUsedInRound = false;
    const halfBtn = document.getElementById("half-half");
    halfBtn.disabled = false;
    halfBtn.className = "group bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold py-3 px-8 rounded-2xl transition-all flex items-center gap-3 shadow-md border-b-4 border-indigo-200 active:border-b-0 active:translate-y-1";

    const opType = settings.ops[Math.floor(Math.random() * settings.ops.length)];
    num1 = Math.floor(Math.random() * (settings.limit1 - 1)) + 2;
    num2 = Math.floor(Math.random() * (settings.limit2 - 1)) + 2;

    const questionEl = document.getElementById("question");
    const hintBtn = document.getElementById("toggle-hint");
    const timerContainer = document.getElementById("timer-container");

    if (settings.timerEnabled) {
        timerContainer.classList.remove("hidden");
        startTimer();
    } else {
        timerContainer.classList.add("hidden");
    }

    if (opType === "add") {
        correctAnswer = num1 + num2;
        questionEl.innerText = `${num1} + ${num2}`;
        document.getElementById("toggle-hint").classList.add("hidden");
        document.getElementById("hint-container-mobile").classList.add("hidden");
        document.getElementById("hint-side-panel").classList.add("hidden");
        hintVisible = false;
        updateUI();
    } else if (opType === "sub") {
        if (num1 < num2) [num1, num2] = [num2, num1];
        correctAnswer = num1 - num2;
        questionEl.innerText = `${num1} - ${num2}`;
        document.getElementById("toggle-hint").classList.add("hidden");
        document.getElementById("hint-container-mobile").classList.add("hidden");
        document.getElementById("hint-side-panel").classList.add("hidden");
        hintVisible = false;
        updateUI();
    } else if (opType === "mul") {
        correctAnswer = num1 * num2;
        questionEl.innerText = `${num1} × ${num2}`;
        if (!hintVisible) {
            document.getElementById("toggle-hint").classList.remove("hidden");
            document.getElementById("hint-container-mobile").classList.add("hidden");
            document.getElementById("hint-side-panel").classList.add("hidden");
        } else {
            document.getElementById("toggle-hint").classList.remove("hidden");
            document.getElementById("hint-container-mobile").classList.remove("hidden");
            document.getElementById("hint-side-panel").classList.remove("hidden");
            renderHint();
        }
        updateUI();
    } else if (opType === "div") {
        const product = num1 * num2;
        correctAnswer = num1;
        questionEl.innerText = `${product} ÷ ${num2}`;
        document.getElementById("toggle-hint").classList.add("hidden");
        document.getElementById("hint-container-mobile").classList.add("hidden");
        document.getElementById("hint-side-panel").classList.add("hidden");
        hintVisible = false;
        updateUI();
    } else {
        // Fallback for unexpected opType
        correctAnswer = num1 + num2;
        questionEl.innerText = `${num1} + ${num2}`;
        document.getElementById("toggle-hint").classList.add("hidden");
        document.getElementById("hint-container-mobile").classList.add("hidden");
        document.getElementById("hint-side-panel").classList.add("hidden");
        hintVisible = false;
        updateUI();
    }

    // Generate options
    const options = [correctAnswer];
    while (options.length < 4) {
        let wrong;
        if (opType === "add" || opType === "sub")
            wrong = Math.floor(Math.random() * (settings.limit1 + settings.limit2)) + 1;
        else if (opType === "mul" || opType === "div")
            wrong = (Math.floor(Math.random() * 9) + 1) * (Math.floor(Math.random() * 9) + 1);
        else wrong = Math.floor(Math.random() * settings.limit1) + 2;

        if (!options.includes(wrong) && wrong !== correctAnswer) options.push(wrong);
    }

    shuffle(options);
    const buttons = document.querySelectorAll(".btn-option");
    buttons.forEach((btn, index) => {
        btn.innerText = options[index];
        btn.classList.remove("hidden-option", "correct", "wrong", "bg-emerald-500", "bg-rose-500", "text-white");
        btn.disabled = false;
    });

    document.getElementById("feedback").classList.add("opacity-0");
    if (hintVisible && opType === "mul") renderHint();
}

function checkAnswer(index) {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    const buttons = document.querySelectorAll(".btn-option");
    const selectedText = parseInt(buttons[index].innerText);
    const feedback = document.getElementById("feedback");
    const questionText = document.getElementById("question").innerText;

    buttons.forEach((btn) => (btn.disabled = true));
    const isCorrect = selectedText === correctAnswer;
    const pointGain = halfHalfUsedInRound ? 0.5 : 1;
    const pointLoss = halfHalfUsedInRound ? 2 : 1;

    saveToHistory(questionText, selectedText, correctAnswer, isCorrect);

    if (isCorrect) {
        buttons[index].classList.add("correct", "bg-emerald-500", "text-white");
        correctScore += pointGain;
        if (settings.goalEnabled) goalProgress.good += pointGain;
        localStorage.setItem("math_game_correct", correctScore.toString());
        playSound("correct");
        feedback.innerText = t("great");
        feedback.className = "text-center text-2xl h-8 opacity-100 font-black text-emerald-500 transition-all scale-110";
    } else {
        buttons[index].classList.add("wrong", "bg-rose-500", "text-white");
        wrongScore += pointLoss;
        if (settings.goalEnabled) goalProgress.bad += pointLoss;
        localStorage.setItem("math_game_wrong", wrongScore.toString());
        playSound("wrong");
        feedback.innerText = t("tryAgain");
        feedback.className = "text-center text-2xl h-8 opacity-100 font-black text-rose-500 transition-all scale-110";
        buttons.forEach((btn) => {
            if (parseInt(btn.innerText) === correctAnswer) btn.classList.add("correct", "bg-emerald-500", "text-white");
        });
    }

    updateScoreDisplay();
    updateGoalUI();
    setTimeout(generateQuestion, 1200);
}

updateUI();
renderHint();
