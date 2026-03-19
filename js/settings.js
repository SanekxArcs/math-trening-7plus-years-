let settings = getFromLocalStorage("math_game_settings", {
    ops: ["add", "mul"],
    limit1: 9,
    limit2: 9,
    timerEnabled: false,
    timerLimit: 10,
    goalEnabled: false,
    goalLimit: 10,
});

function openSettings() {
    document.getElementById("op-add").checked = settings.ops.includes("add");
    document.getElementById("op-sub").checked = settings.ops.includes("sub");
    document.getElementById("op-mul").checked = settings.ops.includes("mul");
    document.getElementById("op-div").checked = settings.ops.includes("div");
    document.getElementById("limit-1").value = settings.limit1;
    document.getElementById("limit-2").value = settings.limit2;
    document.getElementById("timer-enabled").checked = settings.timerEnabled;
    document.getElementById("timer-value").value = settings.timerLimit;
    document.getElementById("goal-enabled").checked =
        settings.goalEnabled || false;
    document.getElementById("goal-value").value = settings.goalLimit || 10;

    // Set the current language active in settings
    document.querySelectorAll('.lang-btn').forEach(btn => {
        if (btn.dataset.lang === currentLang) btn.classList.add('border-slate-800');
        else btn.classList.remove('border-slate-800');
    });

    document.getElementById("settings-dialog").classList.remove("hidden");
}

function closeSettings() {
    document.getElementById("settings-dialog").classList.add("hidden");
}

function saveSettings() {
    const newOps = [];
    if (document.getElementById("op-add").checked) newOps.push("add");
    if (document.getElementById("op-sub").checked) newOps.push("sub");
    if (document.getElementById("op-mul").checked) newOps.push("mul");
    if (document.getElementById("op-div").checked) newOps.push("div");

    if (newOps.length === 0) {
        alert(t('selectOne'));
        return;
    }

    const goalWasEnabled = settings.goalEnabled;
    const oldGoalLimit = settings.goalLimit;

    settings = {
        ops: newOps,
        limit1: parseInt(document.getElementById("limit-1").value) || 9,
        limit2: parseInt(document.getElementById("limit-2").value) || 9,
        timerEnabled: document.getElementById("timer-enabled").checked,
        timerLimit: parseInt(document.getElementById("timer-value").value) || 10,
        goalEnabled: document.getElementById("goal-enabled").checked,
        goalLimit: parseInt(document.getElementById("goal-value").value) || 10,
    };

    saveToLocalStorage("math_game_settings", settings);
    document.getElementById("settings-dialog").classList.add("hidden");

    if (
        settings.goalEnabled &&
        (!goalWasEnabled || oldGoalLimit !== settings.goalLimit)
    ) {
        resetGoal();
    } else {
        updateGoalUI();
    }

    generateQuestion();
}

function resetAll() {
    if (confirm(t('confirmReset'))) {
        localStorage.clear();
        location.reload();
    }
}
