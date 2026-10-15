/**
 * LEVEL UP // 8-BIT BRUTALIST PRODUCTIVITY ENGINE
 * OOP POLYMORPHIC HABIT FORGE & QUEST TRACKER
 * Pure Standalone Client-Side Architecture with LocalStorage Persistence
 */

// ============================================================================
// 1. DATE UTILITIES & HELPER FUNCTIONS
// ============================================================================

/**
 * Returns today's date formatted as YYYY-MM-DD
 */
function getTodayDateString(offsetDays = 0) {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates day difference between two YYYY-MM-DD strings (date2 - date1)
 */
function dateDiffInDays(dateStr1, dateStr2) {
  if (!dateStr1 || !dateStr2) return 0;
  const [y1, m1, d1] = dateStr1.split('-').map(Number);
  const [y2, m2, d2] = dateStr2.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((utc2 - utc1) / msPerDay);
}

/**
 * Generates unique ID for quests
 */
function generateId() {
  return 'quest_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
}

// ============================================================================
// 2. POLYMORPHIC TASK ENGINE (CLASS HIERARCHY)
// ============================================================================

/**
 * Abstract Base Class: Task
 * Mirrors Java SE polymorphic task model
 */
class Task {
  constructor(id, name, description = '', xpReward = 20, completed = false, type = 'TASK', createdAt = null) {
    this.id = id || generateId();
    this.name = name;
    this.description = description;
    this.xpReward = Number(xpReward) || 20;
    this.completed = Boolean(completed);
    this.type = type;
    this.createdAt = createdAt || getTodayDateString();
  }

  /**
   * Calculates actual XP awarded upon task completion
   */
  calculateRewardXP() {
    return this.xpReward;
  }

  /**
   * Evaluates penalty inflicted if this task was neglected
   * Polymorphic method overridden by subclasses
   */
  calculatePenalty(currentDateStr) {
    return 0;
  }

  /**
   * Resets status for a new day if applicable
   */
  processDailyReset(currentDateStr) {
    // Default base does not reset
  }

  /**
   * Serializes task to plain object for JSON storage
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      xpReward: this.xpReward,
      completed: this.completed,
      type: this.type,
      createdAt: this.createdAt
    };
  }

  /**
   * Factory method to deserialize JSON into the correct Task subclass
   */
  static fromJSON(data) {
    if (!data || !data.type) return null;
    switch (data.type) {
      case 'DAILY':
        return DailyTask.fromJSON(data);
      case 'DEADLINE':
        return DeadlineTask.fromJSON(data);
      case 'HABIT':
        return HabitTask.fromJSON(data);
      default:
        return new Task(data.id, data.name, data.description, data.xpReward, data.completed, data.type, data.createdAt);
    }
  }
}

/**
 * Subclass: DailyTask
 * Routine quest that resets every midnight.
 * Penalty: Inflicts flat 10 HP penalty per missed day if incomplete.
 */
class DailyTask extends Task {
  constructor(id, name, description = '', xpReward = 20, completed = false, lastResetDate = null, createdAt = null) {
    super(id, name, description, xpReward, completed, 'DAILY', createdAt);
    this.lastResetDate = lastResetDate || getTodayDateString();
  }

  /**
   * Daily tasks inflict 10 HP per day missed if left incomplete
   */
  calculatePenalty(currentDateStr) {
    if (this.completed) return 0;
    const daysMissed = Math.max(0, dateDiffInDays(this.lastResetDate, currentDateStr));
    return daysMissed * 10;
  }

  /**
   * Resets completed status for the next day
   */
  processDailyReset(currentDateStr) {
    this.completed = false;
    this.lastResetDate = currentDateStr;
  }

  toJSON() {
    const data = super.toJSON();
    data.lastResetDate = this.lastResetDate;
    return data;
  }

  static fromJSON(data) {
    return new DailyTask(
      data.id,
      data.name,
      data.description,
      data.xpReward,
      data.completed,
      data.lastResetDate,
      data.createdAt
    );
  }
}

/**
 * Subclass: DeadlineTask
 * Critical quest with a firm due date.
 * Penalty: Escalating penalty of 5 + 3 * daysOverdue HP if neglected.
 */
class DeadlineTask extends Task {
  constructor(id, name, description = '', xpReward = 35, completed = false, deadline = null, createdAt = null) {
    super(id, name, description, xpReward, completed, 'DEADLINE', createdAt);
    this.deadline = deadline || getTodayDateString(1); // Defaults to tomorrow
  }

  /**
   * Days remaining until deadline (can be negative if overdue)
   */
  daysRemaining(currentDateStr) {
    return dateDiffInDays(currentDateStr, this.deadline);
  }

  /**
   * Checks if deadline has expired without completion
   */
  isOverdue(currentDateStr) {
    if (this.completed) return false;
    return this.daysRemaining(currentDateStr) < 0;
  }

  /**
   * Days overdue past deadline
   */
  getDaysOverdue(currentDateStr) {
    if (!this.isOverdue(currentDateStr)) return 0;
    return Math.abs(this.daysRemaining(currentDateStr));
  }

  /**
   * Escalating penalty formula: 5 HP base + 3 HP per overdue day
   */
  calculatePenalty(currentDateStr) {
    if (this.completed) return 0;
    const overdueDays = this.getDaysOverdue(currentDateStr);
    if (overdueDays <= 0) return 0;
    return 5 + (3 * overdueDays);
  }

  toJSON() {
    const data = super.toJSON();
    data.deadline = this.deadline;
    return data;
  }

  static fromJSON(data) {
    return new DeadlineTask(
      data.id,
      data.name,
      data.description,
      data.xpReward,
      data.completed,
      data.deadline,
      data.createdAt
    );
  }
}

/**
 * Subclass: HabitTask
 * Compounding habit quest that tracks streaks and awards scaling XP multipliers.
 * Multiplier formula: 1 + Math.min(streak * 0.15, 2.0) -> Capped at 3.0x multiplier!
 * Penalty: 15 HP penalty on streak break if a day is skipped.
 */
class HabitTask extends Task {
  constructor(id, name, description = '', xpReward = 25, completed = false, streak = 0, lastCompletedDate = null, createdAt = null) {
    super(id, name, description, xpReward, completed, 'HABIT', createdAt);
    this.streak = Number(streak) || 0;
    this.lastCompletedDate = lastCompletedDate || null;
  }

  /**
   * Scaling combo multiplier: 1.0x up to 3.0x
   */
  getMultiplier() {
    const mult = 1 + Math.min(this.streak * 0.15, 2.0);
    return Math.round(mult * 100) / 100;
  }

  /**
   * Multiplies base XP by current streak multiplier
   */
  calculateRewardXP() {
    const mult = this.getMultiplier();
    return Math.round(this.xpReward * mult);
  }

  /**
   * Evaluates streak breakage and penalty.
   * If more than 1 full day elapsed since last completion, streak breaks!
   */
  evaluateStreakBreak(currentDateStr) {
    if (!this.lastCompletedDate) {
      return { broken: false, penalty: 0 };
    }
    const daysSince = dateDiffInDays(this.lastCompletedDate, currentDateStr);
    if (daysSince > 1 && this.streak > 0) {
      return { broken: true, penalty: 15, prevStreak: this.streak };
    }
    return { broken: false, penalty: 0 };
  }

  /**
   * Resets completed status at dawn for fresh daily habit check-in
   */
  processDailyReset(currentDateStr) {
    // If it was checked in yesterday, reset checkbox so player can check in again today
    if (this.lastCompletedDate !== currentDateStr) {
      this.completed = false;
    }
  }

  toJSON() {
    const data = super.toJSON();
    data.streak = this.streak;
    data.lastCompletedDate = this.lastCompletedDate;
    return data;
  }

  static fromJSON(data) {
    return new HabitTask(
      data.id,
      data.name,
      data.description,
      data.xpReward,
      data.completed,
      data.streak,
      data.lastCompletedDate,
      data.createdAt
    );
  }
}

// ============================================================================
// 3. PLAYER STATE ENGINE
// ============================================================================

/**
 * PlayerState Class
 * Manages player progression, stats, inventory of tasks, and RPG mechanics.
 */
class PlayerState {
  constructor(playerName = 'HERO_1', xp = 0, hp = 100, level = 1, totalTasksCompleted = 0, lastLoginDate = null, daysActive = 1, tasks = [], history = null) {
    this.playerName = playerName;
    this.xp = Math.max(0, Number(xp) || 0);
    this.hp = Math.max(0, Math.min(100, Number(hp) || 100));
    this.level = Math.max(1, Number(level) || 1);
    this.totalTasksCompleted = Math.max(0, Number(totalTasksCompleted) || 0);
    this.lastLoginDate = lastLoginDate || getTodayDateString();
    this.daysActive = Math.max(1, Number(daysActive) || 1);
    this.tasks = tasks; // Array of polymorphic Task instances
    this.history = history && typeof history === 'object' ? history : this.generateInitialHistory();
  }

  /**
   * Seeds realistic initial 7-day battle history if starting fresh
   */
  generateInitialHistory() {
    const hist = {};
    for (let i = 6; i >= 0; i--) {
      const d = getTodayDateString(-i);
      const isPast = i > 0;
      hist[d] = {
        xp: isPast ? Math.floor(20 + Math.random() * 45) : 0,
        tasksCompleted: isPast ? Math.floor(1 + Math.random() * 3) : 0,
        hp: 100
      };
    }
    return hist;
  }

  /**
   * Logs or updates daily XP and task activity in history
   */
  recordActivity(dateStr, xpGain, taskDelta = 1) {
    if (!this.history) this.history = {};
    if (!this.history[dateStr]) {
      this.history[dateStr] = { xp: 0, tasksCompleted: 0, hp: this.hp };
    }
    this.history[dateStr].xp = Math.max(0, (this.history[dateStr].xp || 0) + xpGain);
    this.history[dateStr].tasksCompleted = Math.max(0, (this.history[dateStr].tasksCompleted || 0) + taskDelta);
    this.history[dateStr].hp = this.hp;
  }

  /**
   * Calculates player rank / RPG title based on current level
   */
  getRankTitle() {
    if (this.level >= 10) return 'ASCENDED GRANDMASTER';
    if (this.level >= 8)  return 'PRODUCTIVITY OVERLORD';
    if (this.level >= 6)  return 'CODE PALADIN';
    if (this.level >= 5)  return 'TASK DESTROYER';
    if (this.level >= 4)  return 'DUNGEON CRAWLER';
    if (this.level >= 3)  return 'HABIT WARRIOR';
    if (this.level >= 2)  return 'APPRENTICE GRINDER';
    return 'NOVICE SLACKER';
  }

  /**
   * Highest streak achieved among active habit tasks
   */
  getBestStreak() {
    let max = 0;
    this.tasks.forEach(t => {
      if (t instanceof HabitTask && t.streak > max) {
        max = t.streak;
      }
    });
    return max;
  }

  /**
   * Adds a new polymorphic Task instance
   */
  addTask(task) {
    this.tasks.unshift(task);
  }

  /**
   * Removes a task by ID
   */
  deleteTask(taskId) {
    this.tasks = this.tasks.filter(t => t.id !== taskId);
  }

  /**
   * Finds task by ID
   */
  getTask(taskId) {
    return this.tasks.find(t => t.id === taskId);
  }

  /**
   * Serializes full player state for storage
   */
  toJSON() {
    return {
      playerName: this.playerName,
      xp: this.xp,
      hp: this.hp,
      level: this.level,
      totalTasksCompleted: this.totalTasksCompleted,
      lastLoginDate: this.lastLoginDate,
      daysActive: this.daysActive,
      tasks: this.tasks.map(t => t.toJSON()),
      history: this.history
    };
  }

  /**
   * Rehydrates full PlayerState instance from plain object
   */
  static fromJSON(data) {
    if (!data) return new PlayerState();
    const tasks = Array.isArray(data.tasks)
      ? data.tasks.map(t => Task.fromJSON(t)).filter(Boolean)
      : [];
    return new PlayerState(
      data.playerName || 'HERO_1',
      data.xp || 0,
      data.hp !== undefined ? data.hp : 100,
      data.level || 1,
      data.totalTasksCompleted || 0,
      data.lastLoginDate || getTodayDateString(),
      data.daysActive || 1,
      tasks,
      data.history || null
    );
  }
}

// ============================================================================
// 4. GAME CONTROLLER & UI APPLICATION
// ============================================================================

class GameController {
  constructor() {
    this.STORAGE_KEY = 'LEVEL_UP_SAVE_DATA';
    this.simulatedCurrentDate = getTodayDateString(); // Allows testing day advancement
    this.activeTab = 'ALL';
    this.currentSort = 'NEWEST';
    this.player = null;

    // DOM Elements Cache
    this.dom = {};

    // Chart.js Instances
    this.chartInstances = {
      xpBar: null,
      radar: null,
      donut: null
    };
  }

  /**
   * Boot Sequence
   */
  init() {
    this.cacheDomElements();
    this.bindEvents();
    this.loadSavedTheme();
    this.loadOrInitializePlayer();
    this.processOfflinePenalties();
    this.renderAll();

    // Welcome Notification
    this.showToast(
      'SYSTEM BOOT OK',
      `Welcome back, ${this.player.playerName}. System ready. Insert effort to level up!`,
      'success'
    );
  }

  cacheDomElements() {
    this.dom.systemDateDisplay = document.getElementById('systemDateDisplay');
    this.dom.playerNameDisplay = document.getElementById('playerNameDisplay');
    this.dom.playerRankDisplay = document.getElementById('playerRankDisplay');
    this.dom.daysActiveDisplay = document.getElementById('daysActiveDisplay');
    this.dom.playerStatusDisplay = document.getElementById('playerStatusDisplay');

    // HUD Bars & Metrics
    this.dom.hpMeterBar = document.getElementById('hpMeterBar');
    this.dom.hpNumericDisplay = document.getElementById('hpNumericDisplay');
    this.dom.hpWarningTag = document.getElementById('hpWarningTag');
    this.dom.xpMeterBar = document.getElementById('xpMeterBar');
    this.dom.xpNumericDisplay = document.getElementById('xpNumericDisplay');
    this.dom.xpToNextTag = document.getElementById('xpToNextTag');

    this.dom.levelDisplay = document.getElementById('levelDisplay');
    this.dom.totalXpDisplay = document.getElementById('totalXpDisplay');
    this.dom.totalTasksCompletedDisplay = document.getElementById('totalTasksCompletedDisplay');
    this.dom.bestStreakDisplay = document.getElementById('bestStreakDisplay');
    this.dom.streakBonusDisplay = document.getElementById('streakBonusDisplay');
    this.dom.activeTasksCountDisplay = document.getElementById('activeTasksCountDisplay');
    this.dom.pendingPenaltiesDisplay = document.getElementById('pendingPenaltiesDisplay');

    // Tabs & Counters
    this.dom.tabButtons = document.querySelectorAll('.tab-btn');
    this.dom.countAll = document.getElementById('countAll');
    this.dom.countDaily = document.getElementById('countDaily');
    this.dom.countDeadline = document.getElementById('countDeadline');
    this.dom.countHabit = document.getElementById('countHabit');
    this.dom.categoryExplainerText = document.getElementById('categoryExplainerText');

    // Task Log
    this.dom.currentTabHeading = document.getElementById('currentTabHeading');
    this.dom.taskSortSelect = document.getElementById('taskSortSelect');
    this.dom.tasksContainer = document.getElementById('tasksContainer');
    this.dom.emptyState = document.getElementById('emptyState');
    this.dom.emptyStateAddBtn = document.getElementById('emptyStateAddBtn');

    // Add Task Modal
    this.dom.openAddTaskBtn = document.getElementById('openAddTaskBtn');
    this.dom.addTaskModal = document.getElementById('addTaskModal');
    this.dom.closeAddTaskBtn = document.getElementById('closeAddTaskBtn');
    this.dom.cancelAddTaskBtn = document.getElementById('cancelAddTaskBtn');
    this.dom.addTaskForm = document.getElementById('addTaskForm');
    this.dom.taskNameInput = document.getElementById('taskNameInput');
    this.dom.taskDescInput = document.getElementById('taskDescInput');
    this.dom.taskXpInput = document.getElementById('taskXpInput');
    this.dom.taskDeadlineInput = document.getElementById('taskDeadlineInput');
    this.dom.deadlineContainer = document.getElementById('deadlineContainer');
    this.dom.typeRulesNote = document.getElementById('typeRulesNote');

    // Modals
    this.dom.levelUpModal = document.getElementById('levelUpModal');
    this.dom.closeLevelUpBtn = document.getElementById('closeLevelUpBtn');
    this.dom.celebrationLevelNum = document.getElementById('celebrationLevelNum');
    this.dom.celebrationRankTitle = document.getElementById('celebrationRankTitle');

    this.dom.damageReportModal = document.getElementById('damageReportModal');
    this.dom.closeDamageReportBtn = document.getElementById('closeDamageReportBtn');
    this.dom.ackDamageReportBtn = document.getElementById('ackDamageReportBtn');
    this.dom.reportDaysPassed = document.getElementById('reportDaysPassed');
    this.dom.reportDailiesMissed = document.getElementById('reportDailiesMissed');
    this.dom.reportDeadlinesMissed = document.getElementById('reportDeadlinesMissed');
    this.dom.reportHabitsBroken = document.getElementById('reportHabitsBroken');
    this.dom.reportTotalDamage = document.getElementById('reportTotalDamage');
    this.dom.reportRemainingHp = document.getElementById('reportRemainingHp');
    this.dom.reportFlavorText = document.getElementById('reportFlavorText');

    this.dom.gameOverModal = document.getElementById('gameOverModal');
    this.dom.revivePlayerBtn = document.getElementById('revivePlayerBtn');
    this.dom.faintedNewGameBtn = document.getElementById('faintedNewGameBtn');

    this.dom.renameModal = document.getElementById('renameModal');
    this.dom.editPlayerNameBtn = document.getElementById('editPlayerNameBtn');
    this.dom.closeRenameBtn = document.getElementById('closeRenameBtn');
    this.dom.cancelRenameBtn = document.getElementById('cancelRenameBtn');
    this.dom.saveRenameBtn = document.getElementById('saveRenameBtn');
    this.dom.renamePlayerInput = document.getElementById('renamePlayerInput');

    // Footer & Actions
    this.dom.saveGameBtn = document.getElementById('saveGameBtn');
    this.dom.loadGameBtn = document.getElementById('loadGameBtn');
    this.dom.exportJsonBtn = document.getElementById('exportJsonBtn');
    this.dom.importJsonFileInput = document.getElementById('importJsonFileInput');
    this.dom.newGameBtn = document.getElementById('newGameBtn');
    this.dom.simulateDayBtn = document.getElementById('simulateDayBtn');
    this.dom.healPotionBtn = document.getElementById('healPotionBtn');
    this.dom.toggleCrtBtn = document.getElementById('toggleCrtBtn');
    this.dom.toastShelf = document.getElementById('toastShelf');

    // Theme Picker
    this.dom.themePickerBtn = document.getElementById('themePickerBtn');
    this.dom.themeDropdown = document.getElementById('themeDropdown');

    // Telemetry & Battle Charts
    this.dom.telemetrySection = document.getElementById('telemetrySection');
    this.dom.telemetryBody = document.getElementById('telemetryBody');
    this.dom.toggleTelemetryBtn = document.getElementById('toggleTelemetryBtn');
    this.dom.xpBarChartCanvas = document.getElementById('xpBarChartCanvas');
    this.dom.chartWeeklyXpBadge = document.getElementById('chartWeeklyXpBadge');
    this.dom.chartDailyAvgLabel = document.getElementById('chartDailyAvgLabel');
    this.dom.radarChartCanvas = document.getElementById('radarChartCanvas');
    this.dom.chartCombatRatingBadge = document.getElementById('chartCombatRatingBadge');
    this.dom.radarAttributeChips = document.getElementById('radarAttributeChips');
    this.dom.donutChartCanvas = document.getElementById('donutChartCanvas');
    this.dom.chartClearRateBadge = document.getElementById('chartClearRateBadge');
    this.dom.donutBreakdownList = document.getElementById('donutBreakdownList');
    this.dom.habitHeatmapGrid = document.getElementById('habitHeatmapGrid');
    this.dom.chartHeatmapActiveDaysBadge = document.getElementById('chartHeatmapActiveDaysBadge');
    this.dom.toggleCodexBtn = document.getElementById('toggleCodexBtn');
    this.dom.glossaryList = document.getElementById('glossaryList');
  }

  bindEvents() {
    // Tab switching
    this.dom.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.dom.tabButtons.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        this.activeTab = btn.dataset.tab;
        this.updateTabHeadingAndExplainer();
        this.renderTasks();
      });
    });

    // Task Sorting
    this.dom.taskSortSelect.addEventListener('change', (e) => {
      this.currentSort = e.target.value;
      this.renderTasks();
    });

    // Add Task Modal Controls
    this.dom.openAddTaskBtn.addEventListener('click', () => this.openAddTaskModal());
    this.dom.emptyStateAddBtn.addEventListener('click', () => this.openAddTaskModal());
    this.dom.closeAddTaskBtn.addEventListener('click', () => this.closeAddTaskModal());
    this.dom.cancelAddTaskBtn.addEventListener('click', () => this.closeAddTaskModal());

    // Task Type Radio change in form
    const typeRadios = this.dom.addTaskForm.querySelectorAll('input[name="taskType"]');
    typeRadios.forEach(radio => {
      radio.addEventListener('change', () => this.handleTaskTypeChange(radio.value));
    });

    // XP Preset Buttons
    const xpChips = this.dom.addTaskForm.querySelectorAll('.btn-chip');
    xpChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.dom.taskXpInput.value = chip.dataset.xp;
      });
    });

    // Form Submission
    this.dom.addTaskForm.addEventListener('submit', (e) => this.handleAddTaskSubmit(e));

    // Footer Persistence Actions
    this.dom.saveGameBtn.addEventListener('click', () => this.saveGame(true));
    this.dom.loadGameBtn.addEventListener('click', () => this.manualLoadGame());
    this.dom.exportJsonBtn.addEventListener('click', () => this.exportGameJson());
    this.dom.importJsonFileInput.addEventListener('change', (e) => this.importGameJson(e));
    this.dom.newGameBtn.addEventListener('click', () => this.promptNewGame());

    // Game Action Buttons
    this.dom.simulateDayBtn.addEventListener('click', () => this.simulateDayAdvance());
    this.dom.healPotionBtn.addEventListener('click', () => this.drinkHealthPotion());
    this.dom.toggleCrtBtn.addEventListener('click', () => this.toggleCrtEffect());

    // Theme Picker
    this.dom.themePickerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dom.themeDropdown.classList.toggle('open');
    });
    this.dom.themeDropdown.querySelectorAll('li').forEach(item => {
      item.addEventListener('click', () => {
        const theme = item.dataset.theme;
        this.setTheme(theme);
        this.dom.themeDropdown.classList.remove('open');
      });
    });
    document.addEventListener('click', () => {
      this.dom.themeDropdown.classList.remove('open');
    });

    // Telemetry Collapse / Expand
    if (this.dom.toggleTelemetryBtn) {
      this.dom.toggleTelemetryBtn.addEventListener('click', () => {
        const isCollapsed = this.dom.telemetryBody.classList.toggle('collapsed');
        this.dom.toggleTelemetryBtn.textContent = isCollapsed ? 'CHARTS: COLLAPSED' : 'CHARTS: EXPANDED';
        if (!isCollapsed) {
          this.renderAllCharts();
        }
      });
    }

    // Attribute Codex Toggle
    if (this.dom.toggleCodexBtn && this.dom.glossaryList) {
      this.dom.toggleCodexBtn.addEventListener('click', () => {
        const isCollapsed = this.dom.glossaryList.classList.toggle('collapsed');
        this.dom.toggleCodexBtn.textContent = isCollapsed ? '[+ EXPAND]' : '[- COLLAPSE]';
      });
    }

    // Modal Close Buttons
    this.dom.closeLevelUpBtn.addEventListener('click', () => {
      this.dom.levelUpModal.style.display = 'none';
    });
    this.dom.closeDamageReportBtn.addEventListener('click', () => {
      this.dom.damageReportModal.style.display = 'none';
    });
    this.dom.ackDamageReportBtn.addEventListener('click', () => {
      this.dom.damageReportModal.style.display = 'none';
    });

    // Fainted / Game Over handlers
    this.dom.revivePlayerBtn.addEventListener('click', () => this.revivePlayer());
    this.dom.faintedNewGameBtn.addEventListener('click', () => {
      this.dom.gameOverModal.style.display = 'none';
      this.promptNewGame(true);
    });

    // Rename Modal
    this.dom.editPlayerNameBtn.addEventListener('click', () => {
      this.dom.renamePlayerInput.value = this.player.playerName;
      this.dom.renameModal.style.display = 'flex';
      this.dom.renamePlayerInput.focus();
    });
    this.dom.closeRenameBtn.addEventListener('click', () => {
      this.dom.renameModal.style.display = 'none';
    });
    this.dom.cancelRenameBtn.addEventListener('click', () => {
      this.dom.renameModal.style.display = 'none';
    });
    this.dom.saveRenameBtn.addEventListener('click', () => this.savePlayerRename());

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.dom.addTaskModal.style.display = 'none';
        this.dom.levelUpModal.style.display = 'none';
        this.dom.damageReportModal.style.display = 'none';
        this.dom.renameModal.style.display = 'none';
      }
      // Quick key 'N' for new quest when not typing in an input
      if ((e.key === 'n' || e.key === 'N') && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        this.openAddTaskModal();
      }
      // Quick numbers 1 - 4 for tabs
      if (['1', '2', '3', '4'].includes(e.key) && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        const tabs = ['ALL', 'DAILY', 'DEADLINE', 'HABIT'];
        const targetTab = tabs[parseInt(e.key) - 1];
        const btn = document.querySelector(`.tab-btn[data-tab="${targetTab}"]`);
        if (btn) btn.click();
      }
    });
  }

  // ==========================================================================
  // STATE PERSISTENCE & INITIALIZATION
  // ==========================================================================

  loadOrInitializePlayer() {
    const rawData = localStorage.getItem(this.STORAGE_KEY);
    if (rawData) {
      try {
        const parsed = JSON.parse(rawData);
        this.player = PlayerState.fromJSON(parsed);
        // Sync simulated date if stored
        if (this.player.lastLoginDate) {
          this.simulatedCurrentDate = this.player.lastLoginDate;
        }
        return;
      } catch (err) {
        console.error('Error parsing save data from localStorage:', err);
      }
    }
    // No save found: create fresh default player with starter quests
    this.initializeFreshState('TASK_HERO_1');
  }

  initializeFreshState(playerName = 'TASK_HERO_1') {
    this.simulatedCurrentDate = getTodayDateString();
    this.player = new PlayerState(playerName, 0, 100, 1, 0, this.simulatedCurrentDate, 1, []);

    // Seed starter polymorphic quests
    this.player.addTask(new DailyTask(
      generateId(),
      'Hydrate: Drink 2 Liters of Water',
      'Essential daily health buff. Resets midnight. -10 HP if neglected.',
      15,
      false,
      this.simulatedCurrentDate
    ));

    this.player.addTask(new DeadlineTask(
      generateId(),
      'Submit TSDL Polymorphic Lab Assignment',
      'Demonstrate Java inheritance, file serialization, and date math.',
      50,
      false,
      getTodayDateString(1)
    ));

    this.player.addTask(new HabitTask(
      generateId(),
      'Deep Focus Coding Session (45m)',
      'Unbroken concentration forge. Multiplier scales up to 3.0x XP!',
      30,
      false,
      2, // Starter streak of 2 days
      getTodayDateString(-1)
    ));

    this.player.addTask(new DailyTask(
      generateId(),
      'Walk 10,000 Steps / Exercise',
      'Maintain physical durability. Restores mind and body.',
      20,
      false,
      this.simulatedCurrentDate
    ));

    this.saveGame(false);
  }

  saveGame(notify = false) {
    if (!this.player) return;
    this.player.lastLoginDate = this.simulatedCurrentDate;
    try {
      const serialized = JSON.stringify(this.player.toJSON(), null, 2);
      localStorage.setItem(this.STORAGE_KEY, serialized);
      if (notify) {
        this.showToast('SAVED TO DISK', 'Player state successfully written to localStorage!', 'success');
      }
    } catch (e) {
      console.error('Save failed:', e);
      this.showToast('SAVE ERROR', 'Failed to write save state to localStorage.', 'damage');
    }
  }

  manualLoadGame() {
    const rawData = localStorage.getItem(this.STORAGE_KEY);
    if (!rawData) {
      this.showToast('LOAD FAILED', 'No save game detected in local storage.', 'damage');
      return;
    }
    try {
      const parsed = JSON.parse(rawData);
      this.player = PlayerState.fromJSON(parsed);
      this.simulatedCurrentDate = this.player.lastLoginDate || getTodayDateString();
      this.renderAll();
      this.showToast('GAME LOADED', `Welcome back, ${this.player.playerName}. Save state restored!`, 'success');
    } catch (e) {
      this.showToast('CORRUPT SAVE', 'Failed to parse saved game data.', 'damage');
    }
  }

  promptNewGame(force = false) {
    if (!force) {
      const confirmReset = confirm('DANGER: Start a NEW GAME? This will wipe your current character, XP, and active quests!');
      if (!confirmReset) return;
    }
    const heroName = prompt('ENTER YOUR HERO NAME:', 'TASK_WARRIOR') || 'HERO_1';
    this.initializeFreshState(heroName.trim());
    this.renderAll();
    this.showToast('NEW GAME STARTED', `All systems rebooted. Forge ahead, ${this.player.playerName}!`, 'success');
  }

  exportGameJson() {
    if (!this.player) return;
    const jsonString = JSON.stringify(this.player.toJSON(), null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `levelup_save_${this.player.playerName}_Lvl${this.player.level}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast('EXPORT SUCCESS', 'Save file exported as JSON!', 'success');
  }

  importGameJson(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        this.player = PlayerState.fromJSON(parsed);
        this.simulatedCurrentDate = this.player.lastLoginDate || getTodayDateString();
        this.saveGame(false);
        this.renderAll();
        this.showToast('IMPORT SUCCESS', `Loaded ${this.player.playerName} from JSON save file!`, 'success');
      } catch (err) {
        this.showToast('IMPORT ERROR', 'Invalid JSON file format.', 'damage');
      }
    };
    reader.readAsText(file);
    // Reset file input so same file can be selected again
    event.target.value = '';
  }

  // ==========================================================================
  // OFFLINE PENALTY ENGINE (DATE DIFFERENCE DISPATCH)
  // ==========================================================================

  processOfflinePenalties() {
    if (!this.player) return;

    const lastLogin = this.player.lastLoginDate;
    const today = this.simulatedCurrentDate;
    const daysMissed = dateDiffInDays(lastLogin, today);

    // If no days were missed, no penalties to apply
    if (daysMissed <= 0) {
      this.player.lastLoginDate = today;
      this.saveGame(false);
      return;
    }

    let dailyDamage = 0;
    let deadlineDamage = 0;
    let habitDamage = 0;
    let brokenHabitsCount = 0;
    let incompleteDailiesCount = 0;
    let overdueDeadlinesCount = 0;

    // 1. Process Daily Tasks (10 HP penalty each per day missed)
    this.player.tasks.forEach(task => {
      if (task instanceof DailyTask) {
        if (!task.completed) {
          incompleteDailiesCount++;
          dailyDamage += 10 * daysMissed;
        }
        // Reset daily task status for today
        task.processDailyReset(today);
      }
    });

    // 2. Process Deadline Tasks (5 + 3 * daysOverdue HP)
    this.player.tasks.forEach(task => {
      if (task instanceof DeadlineTask) {
        if (!task.completed && task.isOverdue(today)) {
          overdueDeadlinesCount++;
          deadlineDamage += task.calculatePenalty(today);
        }
      }
    });

    // 3. Process Habit Tasks (15 HP penalty and streak reset on streak break)
    this.player.tasks.forEach(task => {
      if (task instanceof HabitTask) {
        const breakReport = task.evaluateStreakBreak(today);
        if (breakReport.broken) {
          brokenHabitsCount++;
          habitDamage += breakReport.penalty;
          task.streak = 0; // Streak broken!
        }
        task.processDailyReset(today);
      }
    });

    const totalDamage = dailyDamage + deadlineDamage + habitDamage;

    // Apply stats update
    this.player.daysActive += daysMissed;
    this.player.lastLoginDate = today;

    if (totalDamage > 0) {
      this.player.hp = Math.max(0, this.player.hp - totalDamage);
      this.saveGame(false);

      // Display Damage Report Modal
      this.showDamageReportModal({
        daysPassed: daysMissed,
        dailiesMissed: incompleteDailiesCount,
        dailyDamage,
        deadlinesMissed: overdueDeadlinesCount,
        deadlineDamage,
        habitsBroken: brokenHabitsCount,
        habitDamage,
        totalDamage,
        remainingHp: this.player.hp
      });

      this.shakeScreen();
      this.animateHPLoss(totalDamage);

      // Check Game Over
      if (this.player.hp <= 0) {
        this.triggerGameOver();
      }
    } else {
      // Days passed without damage!
      this.saveGame(false);
      this.showToast('TIME ADVANCED', `${daysMissed} day(s) elapsed. No active penalties triggered.`, 'success');
    }
  }

  showDamageReportModal(report) {
    this.dom.reportDaysPassed.textContent = `${report.daysPassed} DAY(S)`;
    this.dom.reportDailiesMissed.textContent = `${report.dailiesMissed} (-${report.dailyDamage} HP)`;
    this.dom.reportDeadlinesMissed.textContent = `${report.deadlinesMissed} (-${report.deadlineDamage} HP)`;
    this.dom.reportHabitsBroken.textContent = `${report.habitsBroken} (-${report.habitDamage} HP)`;
    this.dom.reportTotalDamage.textContent = `-${report.totalDamage} HP`;
    this.dom.reportRemainingHp.textContent = `${report.remainingHp} / 100 HP`;

    const flavorQuotes = [
      '"Discipline is choosing between what you want now and what you want most."',
      '"Pain is the premier teacher of consistency."',
      '"Procrastination is an assassin that attacks your vital HP."',
      '"The price of inaction compounds exponentially."'
    ];
    this.dom.reportFlavorText.textContent = flavorQuotes[Math.floor(Math.random() * flavorQuotes.length)];
    this.dom.damageReportModal.style.display = 'flex';
  }

  // ==========================================================================
  // SIMULATION & DEBUG HELPERS
  // ==========================================================================

  simulateDayAdvance() {
    // Advance current simulated calendar date by +1 day
    const [y, m, d] = this.simulatedCurrentDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + 1);
    const newYear = dateObj.getFullYear();
    const newMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
    const newDay = String(dateObj.getDate()).padStart(2, '0');
    this.simulatedCurrentDate = `${newYear}-${newMonth}-${newDay}`;

    this.showToast('CALENDAR ADVANCED', `Time warped forward +24 hours! Evaluating offline rules...`, 'damage');
    this.processOfflinePenalties();
    this.renderAll();
  }

  drinkHealthPotion() {
    if (this.player.hp >= 100) {
      this.showToast('FULL HEALTH', 'Your HP is already at max (100/100)! Save the potion.', 'success');
      return;
    }
    const oldHp = this.player.hp;
    this.player.hp = Math.min(100, this.player.hp + 35);
    const healed = this.player.hp - oldHp;
    this.saveGame(false);
    this.renderAll();
    this.showToast('POTION CONSUMED', `Gulp! Consumed restorative elixir. Restored +${healed} HP!`, 'success');
  }

  revivePlayer() {
    this.player.hp = 50;
    // Deduct 25 XP penalty if available
    this.player.xp = Math.max(0, this.player.xp - 25);
    this.dom.gameOverModal.style.display = 'none';
    this.saveGame(false);
    this.renderAll();
    this.showToast('RESURRECTION!', 'You crawled back from the abyss with 50 HP! Do not falter again.', 'success');
  }

  triggerGameOver() {
    setTimeout(() => {
      this.dom.gameOverModal.style.display = 'flex';
    }, 400);
  }

  toggleCrtEffect() {
    document.body.classList.toggle('crt-enabled');
    const isCrt = document.body.classList.contains('crt-enabled');
    this.dom.toggleCrtBtn.textContent = isCrt ? 'CRT: ON' : 'CRT: OFF';
  }

  /**
   * Sets the active color theme and persists to localStorage.
   * @param {string} themeName - Theme identifier (default, cyberpunk, terminal, ember, frost, bloodmoon, synthwave)
   */
  setTheme(themeName) {
    const themeNames = {
      'default': 'Monochrome',
      'cyberpunk': 'Cyberpunk Neon',
      'terminal': 'Retro Terminal',
      'ember': 'Sunset Ember',
      'frost': 'Arctic Frost',
      'bloodmoon': 'Blood Moon',
      'synthwave': 'Synthwave',
      'cp2077': 'Cyberpunk 2077'
    };

    // Apply theme to body
    if (themeName === 'default') {
      document.body.removeAttribute('data-theme');
    } else {
      document.body.setAttribute('data-theme', themeName);
    }

    // Update dropdown active state
    this.dom.themeDropdown.querySelectorAll('li').forEach(li => {
      li.classList.toggle('active-theme', li.dataset.theme === themeName);
    });

    // Persist theme choice
    localStorage.setItem('levelup_theme', themeName);

    // Redraw charts with new theme colors
    this.renderAllCharts();

    // Show toast
    this.showToast('THEME EQUIPPED', `${themeNames[themeName] || themeName} palette activated!`, 'success');
  }

  /**
   * Loads the saved theme from localStorage on boot.
   */
  loadSavedTheme() {
    const saved = localStorage.getItem('levelup_theme');
    if (saved && saved !== 'default') {
      document.body.setAttribute('data-theme', saved);
      this.dom.themeDropdown.querySelectorAll('li').forEach(li => {
        li.classList.toggle('active-theme', li.dataset.theme === saved);
      });
    }
  }

  savePlayerRename() {
    const newName = this.dom.renamePlayerInput.value.trim();
    if (newName) {
      this.player.playerName = newName;
      this.saveGame(false);
      this.renderPlayerHUD();
      this.dom.renameModal.style.display = 'none';
      this.showToast('HERO RENAMED', `Identity acknowledged as ${newName}!`, 'success');
    }
  }

  // ==========================================================================
  // TASK INTERACTIONS (COMPLETE, UNCOMPLETE, DELETE)
  // ==========================================================================

  toggleTaskComplete(taskId) {
    const task = this.player.getTask(taskId);
    if (!task) return;

    if (!task.completed) {
      this.completeTask(task);
    } else {
      this.uncompleteTask(task);
    }
  }

  completeTask(task) {
    task.completed = true;

    // Calculate XP reward with polymorphic logic
    let awardedXp = task.calculateRewardXP();

    // Habit task streak logic
    if (task instanceof HabitTask) {
      task.streak += 1;
      task.lastCompletedDate = this.simulatedCurrentDate;
      awardedXp = task.calculateRewardXP(); // Re-eval with incremented streak
    }

    // Award XP to player
    this.player.xp += awardedXp;
    this.player.totalTasksCompleted += 1;

    // Record activity in history for battle telemetry charts
    this.player.recordActivity(this.simulatedCurrentDate, awardedXp, 1);

    // Visual feedback
    const cardElem = document.querySelector(`.task-card[data-task-id="${task.id}"]`);
    if (cardElem) {
      this.animateXPGain(awardedXp, cardElem);
    }

    // RPG Flavor Toast
    if (task instanceof HabitTask) {
      const mult = task.getMultiplier();
      this.showToast(
        'HABIT CHECK-IN!',
        `Combo x${task.streak}! Multiplier: ${mult}x. Awarded +${awardedXp} XP!`,
        'success'
      );
    } else if (task instanceof DeadlineTask) {
      this.showToast(
        'DEADLINE SECURED!',
        `Critical mission cleared ahead of ruin! Awarded +${awardedXp} XP!`,
        'success'
      );
    } else {
      this.showToast(
        'DAILY CLEARED!',
        `Routine completed! Prevented -10 HP penalty. Awarded +${awardedXp} XP!`,
        'success'
      );
    }

    // Check Level Up progression
    this.checkLevelUp();

    this.saveGame(false);
    this.renderAll();
  }

  uncompleteTask(task) {
    task.completed = false;

    // Revert XP
    const revertedXp = task.calculateRewardXP();
    this.player.xp = Math.max(0, this.player.xp - revertedXp);
    this.player.totalTasksCompleted = Math.max(0, this.player.totalTasksCompleted - 1);

    // Revert activity in history for battle telemetry charts
    this.player.recordActivity(this.simulatedCurrentDate, -revertedXp, -1);

    // Habit revert
    if (task instanceof HabitTask) {
      task.streak = Math.max(0, task.streak - 1);
    }

    this.showToast('QUEST REOPENED', `Reopened "${task.name}". Withdrew -${revertedXp} XP.`, 'damage');
    this.saveGame(false);
    this.renderAll();
  }

  deleteTask(taskId) {
    const task = this.player.getTask(taskId);
    if (!task) return;
    const taskName = task.name;
    this.player.deleteTask(taskId);
    this.saveGame(false);
    this.renderAll();
    this.showToast('QUEST DISCARDED', `Destroyed "${taskName}" from quest ledger.`, 'damage');
  }

  checkLevelUp() {
    // Level formula: 100 XP per level
    const targetLevel = Math.floor(this.player.xp / 100) + 1;
    if (targetLevel > this.player.level) {
      const oldLevel = this.player.level;
      this.player.level = targetLevel;
      this.player.hp = 100; // Full heal reward!

      // Trigger Celebration Modal
      this.dom.celebrationLevelNum.textContent = `LEVEL ${targetLevel}`;
      this.dom.celebrationRankTitle.textContent = `RANK: ${this.player.getRankTitle()}`;
      this.dom.levelUpModal.style.display = 'flex';

      // Visual flash
      document.body.classList.add('flash-damage');
      setTimeout(() => document.body.classList.remove('flash-damage'), 300);

      this.showToast(
        '★ LEVEL UP! ★',
        `Ascended from Lvl ${oldLevel} to Level ${targetLevel}! HP fully restored to 100!`,
        'success'
      );
    }
  }

  // ==========================================================================
  // ADD TASK MODAL & FORM LOGIC
  // ==========================================================================

  openAddTaskModal() {
    this.dom.taskNameInput.value = '';
    this.dom.taskDescInput.value = '';
    this.dom.taskXpInput.value = '25';
    this.dom.taskDeadlineInput.value = getTodayDateString(1);

    // Sync selected radio with current active tab
    let defaultType = 'DAILY';
    if (this.activeTab === 'DEADLINE') defaultType = 'DEADLINE';
    if (this.activeTab === 'HABIT') defaultType = 'HABIT';

    const radio = this.dom.addTaskForm.querySelector(`input[name="taskType"][value="${defaultType}"]`);
    if (radio) radio.checked = true;
    this.handleTaskTypeChange(defaultType);

    this.dom.addTaskModal.style.display = 'flex';
    this.dom.taskNameInput.focus();
  }

  closeAddTaskModal() {
    this.dom.addTaskModal.style.display = 'none';
  }

  handleTaskTypeChange(type) {
    if (type === 'DEADLINE') {
      this.dom.deadlineContainer.style.display = 'flex';
      this.dom.taskDeadlineInput.required = true;
      this.dom.typeRulesNote.innerHTML = `<strong>DEADLINE QUEST RULES:</strong> Firm due date required. If overdue, inflicts escalating penalty: <code>-(5 + 3 * daysOverdue) HP</code>!`;
    } else if (type === 'HABIT') {
      this.dom.deadlineContainer.style.display = 'none';
      this.dom.taskDeadlineInput.required = false;
      this.dom.typeRulesNote.innerHTML = `<strong>HABIT STREAK RULES:</strong> Build daily consistency! Each day increments your combo multiplier up to <code>3.0x XP</code>! Missing a day breaks your streak and inflicts <code>-15 HP</code>!`;
    } else {
      this.dom.deadlineContainer.style.display = 'none';
      this.dom.taskDeadlineInput.required = false;
      this.dom.typeRulesNote.innerHTML = `<strong>DAILY QUEST RULES:</strong> Resets every midnight. If left incomplete at the end of the day, player suffers a direct <code>-10 HP</code> penalty!`;
    }
  }

  handleAddTaskSubmit(e) {
    e.preventDefault();
    const name = this.dom.taskNameInput.value.trim();
    if (!name) return;

    const desc = this.dom.taskDescInput.value.trim();
    const xpReward = parseInt(this.dom.taskXpInput.value, 10) || 20;
    const type = this.dom.addTaskForm.querySelector('input[name="taskType"]:checked').value;

    let newTask;
    if (type === 'DAILY') {
      newTask = new DailyTask(generateId(), name, desc, xpReward, false, this.simulatedCurrentDate);
    } else if (type === 'DEADLINE') {
      const deadline = this.dom.taskDeadlineInput.value || getTodayDateString(1);
      newTask = new DeadlineTask(generateId(), name, desc, xpReward, false, deadline);
    } else if (type === 'HABIT') {
      newTask = new HabitTask(generateId(), name, desc, xpReward, false, 0, null);
    }

    this.player.addTask(newTask);
    this.saveGame(false);
    this.closeAddTaskModal();
    this.renderAll();

    this.showToast('QUEST FORGED!', `Forged new [${type}] quest: "${name}" (+${xpReward} XP)`, 'success');
  }

  // ==========================================================================
  // RENDERING ENGINE
  // ==========================================================================

  renderAll() {
    this.renderHeaderAndDate();
    this.renderPlayerHUD();
    this.renderTabCounters();
    this.renderTasks();
    this.renderAllCharts();
  }

  renderHeaderAndDate() {
    this.dom.systemDateDisplay.textContent = `SYSTEM DATE: ${this.simulatedCurrentDate}`;
    this.dom.playerNameDisplay.textContent = this.player.playerName;
    this.dom.playerRankDisplay.textContent = this.player.getRankTitle();
    this.dom.daysActiveDisplay.textContent = this.player.daysActive;

    if (this.player.hp <= 0) {
      this.dom.playerStatusDisplay.textContent = 'FAINTED (0 HP)';
    } else if (this.player.hp <= 25) {
      this.dom.playerStatusDisplay.textContent = 'CRITICAL HEALTH';
    } else {
      this.dom.playerStatusDisplay.textContent = 'ALIVE & GRINDING';
    }
  }

  renderPlayerHUD() {
    // 1. Health Points Bar
    const hp = this.player.hp;
    this.dom.hpMeterBar.style.width = `${hp}%`;
    this.dom.hpNumericDisplay.textContent = `${hp} / 100`;

    if (hp <= 25) {
      this.dom.hpWarningTag.style.display = 'inline-block';
      this.dom.hpMeterBar.style.background = '#000000';
    } else {
      this.dom.hpWarningTag.style.display = 'none';
    }

    // 2. Experience Points Bar
    const totalXp = this.player.xp;
    const xpInLevel = totalXp % 100;
    const xpToNext = 100 - xpInLevel;

    this.dom.xpMeterBar.style.width = `${xpInLevel}%`;
    this.dom.xpNumericDisplay.textContent = `${xpInLevel} / 100`;
    this.dom.xpToNextTag.textContent = `${xpToNext} XP TO LEVEL ${this.player.level + 1}`;

    // 3. Quick Metrics Grid
    this.dom.levelDisplay.textContent = this.player.level;
    this.dom.totalXpDisplay.textContent = `TOTAL XP: ${totalXp}`;
    this.dom.totalTasksCompletedDisplay.textContent = this.player.totalTasksCompleted;

    const bestStreak = this.player.getBestStreak();
    this.dom.bestStreakDisplay.textContent = `${bestStreak}🔥`;
    const streakMult = Math.round((1 + Math.min(bestStreak * 0.15, 2.0)) * 100) / 100;
    this.dom.streakBonusDisplay.textContent = `BONUS: ${streakMult}x XP`;

    const activeQuests = this.player.tasks.filter(t => !t.completed).length;
    this.dom.activeTasksCountDisplay.textContent = activeQuests;

    // Potential penalties at risk today
    let potentialDmg = 0;
    this.player.tasks.forEach(t => {
      if (!t.completed) {
        if (t instanceof DailyTask) potentialDmg += 10;
        if (t instanceof DeadlineTask && t.isOverdue(this.simulatedCurrentDate)) {
          potentialDmg += t.calculatePenalty(this.simulatedCurrentDate);
        }
      }
    });
    this.dom.pendingPenaltiesDisplay.textContent = potentialDmg > 0 ? `-${potentialDmg} HP AT RISK` : 'NO RISK';
  }

  renderTabCounters() {
    const total = this.player.tasks.length;
    const dailies = this.player.tasks.filter(t => t instanceof DailyTask).length;
    const deadlines = this.player.tasks.filter(t => t instanceof DeadlineTask).length;
    const habits = this.player.tasks.filter(t => t instanceof HabitTask).length;

    this.dom.countAll.textContent = `(${total})`;
    this.dom.countDaily.textContent = `(${dailies})`;
    this.dom.countDeadline.textContent = `(${deadlines})`;
    this.dom.countHabit.textContent = `(${habits})`;
  }

  updateTabHeadingAndExplainer() {
    const map = {
      'ALL': {
        heading: '[ ACTIVE QUEST LOG // ALL ]',
        explainer: 'SHOWING ALL QUESTS: Daily routines, firm deadlines, and compounding habit streaks.'
      },
      'DAILY': {
        heading: '[ ACTIVE QUEST LOG // DAILY ]',
        explainer: 'DAILY QUESTS: Resets every midnight. Incomplete quests inflict -10 HP damage per missed day!'
      },
      'DEADLINE': {
        heading: '[ ACTIVE QUEST LOG // DEADLINES ]',
        explainer: 'DEADLINES: High-stakes targets with escalating penalties: -(5 + 3*daysOverdue) HP if neglected!'
      },
      'HABIT': {
        heading: '[ ACTIVE QUEST LOG // HABIT STREAKS ]',
        explainer: 'HABIT STREAKS: Daily consistency compounds! Multipliers up to 3.0x XP! Skipping a day breaks streak (-15 HP).'
      }
    };
    const current = map[this.activeTab] || map['ALL'];
    this.dom.currentTabHeading.textContent = current.heading;
    this.dom.categoryExplainerText.textContent = current.explainer;
  }

  renderTasks() {
    this.dom.tasksContainer.innerHTML = '';

    // Filter by active tab
    let filtered = this.player.tasks.filter(t => {
      if (this.activeTab === 'ALL') return true;
      if (this.activeTab === 'DAILY') return t instanceof DailyTask;
      if (this.activeTab === 'DEADLINE') return t instanceof DeadlineTask;
      if (this.activeTab === 'HABIT') return t instanceof HabitTask;
      return true;
    });

    // Sort tasks
    filtered.sort((a, b) => {
      if (this.currentSort === 'NEWEST') {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      if (this.currentSort === 'XP_DESC') {
        return b.calculateRewardXP() - a.calculateRewardXP();
      }
      if (this.currentSort === 'XP_ASC') {
        return a.calculateRewardXP() - b.calculateRewardXP();
      }
      if (this.currentSort === 'STATUS') {
        return (a.completed === b.completed) ? 0 : a.completed ? 1 : -1;
      }
      return 0;
    });

    // Toggle Empty State
    if (filtered.length === 0) {
      this.dom.emptyState.style.display = 'block';
      return;
    } else {
      this.dom.emptyState.style.display = 'none';
    }

    // Render cards
    filtered.forEach(task => {
      const card = this.createTaskCardElement(task);
      this.dom.tasksContainer.appendChild(card);
    });
  }

  createTaskCardElement(task) {
    const card = document.createElement('article');
    card.className = `task-card brutalist-card ${task.completed ? 'is-completed' : ''}`;
    card.dataset.taskId = task.id;

    // Check overdue state for deadline tasks
    let isOverdue = false;
    let deadlineMetaHtml = '';
    if (task instanceof DeadlineTask) {
      isOverdue = task.isOverdue(this.simulatedCurrentDate);
      if (isOverdue) {
        card.classList.add('is-overdue');
        const daysOver = task.getDaysOverdue(this.simulatedCurrentDate);
        const penalty = task.calculatePenalty(this.simulatedCurrentDate);
        deadlineMetaHtml = `
          <span class="task-status-tag danger-tag">
            OVERDUE (${daysOver}D) // RISK: -${penalty} HP
          </span>
        `;
      } else {
        const remaining = task.daysRemaining(this.simulatedCurrentDate);
        deadlineMetaHtml = `
          <span class="task-status-tag">
            DUE: ${task.deadline} (${remaining === 0 ? 'DUE TODAY!' : remaining + ' DAYS LEFT'})
          </span>
        `;
      }
    }

    // Habit Streak Indicator HTML
    let habitMetaHtml = '';
    if (task instanceof HabitTask) {
      const mult = task.getMultiplier();
      habitMetaHtml = `
        <span class="streak-indicator">
          STREAK: ${task.streak}🔥 (COMBO BONUS: ${mult}x)
        </span>
      `;
    }

    // Daily Task Indicator HTML
    let dailyMetaHtml = '';
    if (task instanceof DailyTask) {
      dailyMetaHtml = `
        <span class="task-status-tag">
          RESETS MIDNIGHT // -10 HP IF MISSED
        </span>
      `;
    }

    const rewardXP = task.calculateRewardXP();

    card.innerHTML = `
      <div class="task-checkbox-container">
        <input 
          type="checkbox" 
          class="brutalist-checkbox" 
          aria-label="Complete task"
          ${task.completed ? 'checked' : ''}
        >
      </div>

      <div class="task-card-body">
        <div class="task-meta-top">
          <span class="task-type-badge">${task.type}</span>
          <span class="task-xp-badge">+${rewardXP} XP</span>
          ${deadlineMetaHtml}
          ${dailyMetaHtml}
        </div>

        <h3 class="task-title">${this.escapeHtml(task.name)}</h3>
        ${task.description ? `<p class="task-desc">${this.escapeHtml(task.description)}</p>` : ''}

        <div class="task-meta-bottom">
          <span>CREATED: ${task.createdAt}</span>
          ${habitMetaHtml}
        </div>
      </div>

      <div class="task-actions">
        <button class="delete-task-btn brutalist-btn" title="Delete quest" aria-label="Delete quest">
          X
        </button>
      </div>
    `;

    // Event Listeners for Card
    const checkbox = card.querySelector('.brutalist-checkbox');
    checkbox.addEventListener('change', () => this.toggleTaskComplete(task.id));

    const deleteBtn = card.querySelector('.delete-task-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteTask(task.id);
    });

    return card;
  }

  // ==========================================================================
  // JUICE, VISUAL FEEDBACK & TOASTS
  // ==========================================================================

  showToast(title, message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `brutalist-toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-header-row">
        <span>[ ${title} ]</span>
        <small>${new Date().toLocaleTimeString()}</small>
      </div>
      <div class="toast-body">${this.escapeHtml(message)}</div>
    `;

    this.dom.toastShelf.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  animateXPGain(amount, targetElem) {
    const rect = targetElem.getBoundingClientRect();
    const float = document.createElement('div');
    float.className = 'floating-num float-xp';
    float.textContent = `+${amount} XP!`;
    float.style.left = `${rect.left + rect.width / 2 - 40}px`;
    float.style.top = `${rect.top + 10}px`;
    document.body.appendChild(float);

    setTimeout(() => float.remove(), 1200);
  }

  animateHPLoss(damage) {
    const float = document.createElement('div');
    float.className = 'floating-num float-damage';
    float.textContent = `-${damage} HP!`;
    float.style.left = `50%`;
    float.style.top = `35%`;
    document.body.appendChild(float);

    // Screen flash
    document.body.classList.add('flash-damage');
    setTimeout(() => document.body.classList.remove('flash-damage'), 250);

    setTimeout(() => float.remove(), 1200);
  }

  shakeScreen() {
    document.body.classList.add('screen-shaking');
    setTimeout(() => {
      document.body.classList.remove('screen-shaking');
    }, 400);
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ==========================================================================
  // BATTLE TELEMETRY, CHARTS & VISUALS ENGINE
  // ==========================================================================

  getThemeChartColors() {
    const theme = document.body.getAttribute('data-theme') || 'default';
    switch (theme) {
      case 'cp2077':
        return {
          primary: '#fcee09',
          secondary: '#00f0ff',
          danger: '#ff003c',
          bg: '#111115',
          cardBg: '#1a1a20',
          text: '#f0efe8',
          muted: '#8a8a98',
          grid: '#3a3a48'
        };
      case 'cyberpunk':
        return {
          primary: '#00fff2',
          secondary: '#ff00ff',
          danger: '#ff0055',
          bg: '#12122a',
          cardBg: '#1a1a3a',
          text: '#f5f0ff',
          muted: '#9a8aba',
          grid: '#2a2a4a'
        };
      case 'terminal':
        return {
          primary: '#00ff00',
          secondary: '#00cc00',
          danger: '#ff3333',
          bg: '#001a00',
          cardBg: '#002200',
          text: '#00ff00',
          muted: '#008800',
          grid: '#004400'
        };
      case 'ember':
        return {
          primary: '#ff8c00',
          secondary: '#ffa500',
          danger: '#ff4500',
          bg: '#2a1a0a',
          cardBg: '#3a2510',
          text: '#fff5e0',
          muted: '#9a7a50',
          grid: '#4a3218'
        };
      case 'frost':
        return {
          primary: '#0a4a8a',
          secondary: '#2090ff',
          danger: '#d02020',
          bg: '#e8f0fa',
          cardBg: '#ffffff',
          text: '#0a1a2e',
          muted: '#5080b0',
          grid: '#d0e4f5'
        };
      case 'bloodmoon':
        return {
          primary: '#cc0000',
          secondary: '#ff0040',
          danger: '#ff3366',
          bg: '#2a0a0a',
          cardBg: '#3a1010',
          text: '#fff0f0',
          muted: '#9a5050',
          grid: '#4a1818'
        };
      case 'synthwave':
        return {
          primary: '#ff2d95',
          secondary: '#00d4ff',
          danger: '#ff0055',
          bg: '#1a0e3a',
          cardBg: '#25144d',
          text: '#fce8ff',
          muted: '#a070d0',
          grid: '#301a60'
        };
      default: // Monochrome
        return {
          primary: '#000000',
          secondary: '#555555',
          danger: '#000000',
          bg: '#ffffff',
          cardBg: '#eeeeee',
          text: '#000000',
          muted: '#777777',
          grid: '#cccccc'
        };
    }
  }

  renderAllCharts() {
    this.drawXpBarChart();
    this.drawRadarChart();
    this.drawDonutChart();
    this.renderHabitHeatmap();
  }

  drawXpBarChart() {
    const canvas = this.dom.xpBarChartCanvas;
    if (!canvas) return;
    const colors = this.getThemeChartColors();

    // Collect 7 days: D-6 to D-0 (today)
    const dayLabels = [];
    const xpValues = [];
    const backgroundColors = [];
    let totalWeeklyXp = 0;

    const [y, m, d] = this.simulatedCurrentDate.split('-').map(Number);
    const baseDate = new Date(y, m - 1, d);

    for (let i = 6; i >= 0; i--) {
      const dt = new Date(baseDate);
      dt.setDate(dt.getDate() - i);
      const dy = dt.getFullYear();
      const dm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      const dateStr = `${dy}-${dm}-${dd}`;

      const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const lbl = (i === 0) ? 'TODAY' : `${dayNames[dt.getDay()]} ${dt.getDate()}`;
      dayLabels.push(lbl);

      const histEntry = this.player.history && this.player.history[dateStr];
      const xpVal = histEntry ? histEntry.xp : 0;
      xpValues.push(xpVal);
      backgroundColors.push(i === 0 ? colors.primary : (colors.secondary || colors.grid));
      totalWeeklyXp += xpVal;
    }

    // Update weekly summary badge
    if (this.dom.chartWeeklyXpBadge) {
      this.dom.chartWeeklyXpBadge.textContent = `+${totalWeeklyXp} XP THIS WEEK`;
    }
    if (this.dom.chartDailyAvgLabel) {
      const avg = Math.round(totalWeeklyXp / 7);
      this.dom.chartDailyAvgLabel.textContent = `AVG: ${avg} XP/DAY`;
    }

    // Fallback if Chart.js is not loaded
    if (typeof Chart === 'undefined') return;

    if (this.chartInstances.xpBar) {
      this.chartInstances.xpBar.destroy();
    }

    const maxY = Math.max(75, Math.ceil(Math.max(...xpValues, 50) / 25) * 25);

    this.chartInstances.xpBar = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: dayLabels,
        datasets: [{
          label: 'XP GAINED',
          data: xpValues,
          backgroundColor: backgroundColors,
          borderColor: colors.primary,
          borderWidth: 2,
          // === Brutalist Flat Pixel-Block Styling ===
          borderRadius: 0,        // Zero rounded corners
          borderSkipped: false,   // Outlines all 4 edges (doesn't skip bottom border)
          barPercentage: 0.65,
          categoryPercentage: 0.85
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        devicePixelRatio: Math.max(window.devicePixelRatio || 1, 2),
        layout: {
          padding: { top: 14, bottom: 4, left: 4, right: 8 }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: { family: '"Space Mono", monospace', size: 10, weight: 'bold' },
              color: colors.text
            },
            border: { width: 2, color: colors.primary }
          },
          y: {
            grid: {
              color: colors.grid,
              borderDash: [3, 3]
            },
            ticks: {
              font: { family: '"Space Mono", monospace', size: 10 },
              color: colors.text,
              stepSize: 25
            },
            border: { width: 2, color: colors.primary },
            suggestedMax: maxY
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            cornerRadius: 0,
            backgroundColor: colors.bg,
            titleColor: colors.text,
            bodyColor: colors.text,
            borderColor: colors.primary,
            borderWidth: 2,
            titleFont: { family: '"Press Start 2P", monospace', size: 9 },
            bodyFont: { family: '"Space Mono", monospace', size: 11 }
          }
        }
      }
    });
  }

  drawRadarChart() {
    const canvas = this.dom.radarChartCanvas;
    if (!canvas) return;
    const colors = this.getThemeChartColors();

    // 1. DIS (Discipline): Daily task completion rate
    const dailies = this.player.tasks.filter(t => t instanceof DailyTask);
    const completedDailies = dailies.filter(t => t.completed).length;
    const dis = dailies.length > 0 ? Math.round((completedDailies / dailies.length) * 100) : 75;

    // 2. PUN (Punctuality): Deadline tasks not overdue
    const deadlines = this.player.tasks.filter(t => t instanceof DeadlineTask);
    const overdueCount = deadlines.filter(t => !t.completed && t.isOverdue(this.simulatedCurrentDate)).length;
    const pun = deadlines.length > 0 ? Math.max(10, Math.round(((deadlines.length - overdueCount) / deadlines.length) * 100)) : 80;

    // 3. CON (Consistency): Habit streak magnitude
    const bestStreak = this.player.getBestStreak();
    const con = Math.min(100, Math.max(20, bestStreak * 12 + 25));

    // 4. VIT (Vitality): Current player health
    const vit = this.player.hp;

    // 5. POW (Power): Level & overall XP progress
    const pow = Math.min(100, Math.max(15, this.player.level * 14 + Math.round((this.player.xp % 100) * 0.3)));

    const stats = [
      { key: 'DIS', label: 'DISCIPLINE', desc: 'Measures your overall task completion rate and adherence to daily routines.', val: dis },
      { key: 'PUN', label: 'PUNCTUALITY', desc: 'Tracks how reliably you complete your "Deadline" quests before they become overdue.', val: pun },
      { key: 'CON', label: 'CONSISTENCY', desc: 'Reflects your ability to maintain unbroken "Habit" streaks without skipping days.', val: con },
      { key: 'VIT', label: 'VITALITY', desc: 'Represents your Health Point (HP) management and how well you avoid offline penalties.', val: vit },
      { key: 'POW', label: 'POWER', desc: 'Likely tied to your XP momentum, measuring how many high-value tasks you are crushing to level up.', val: pow }
    ];

    // Compute Combat Rating
    const avgStat = Math.round((dis + pun + con + vit + pow) / 5);
    let rating = 'D';
    if (avgStat >= 88) rating = 'S-RANK';
    else if (avgStat >= 74) rating = 'A-RANK';
    else if (avgStat >= 60) rating = 'B-RANK';
    else if (avgStat >= 40) rating = 'C-RANK';
    else rating = 'D-RANK';

    if (this.dom.chartCombatRatingBadge) {
      this.dom.chartCombatRatingBadge.textContent = `COMBAT RATING: ${rating} (${avgStat}%)`;
    }

    if (this.dom.radarAttributeChips) {
      this.dom.radarAttributeChips.innerHTML = stats.map(s => 
        `<span class="radar-chip" title="${s.key} (${s.label}): ${s.desc}"><strong>${s.key}:</strong> ${s.val}%</span>`
      ).join('');
    }

    // Fallback if Chart.js is not loaded
    if (typeof Chart === 'undefined') return;

    if (this.chartInstances.radar) {
      this.chartInstances.radar.destroy();
    }

    // Hex to RGBA conversion for fill opacity
    const hex = colors.primary.replace('#', '');
    const num = parseInt(hex.length === 3 ? hex.split('').map(x => x + x).join('') : hex, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    const fillRgba = `rgba(${r}, ${g}, ${b}, 0.35)`;

    this.chartInstances.radar = new Chart(canvas, {
      type: 'radar',
      data: {
        labels: ['DIS', 'PUN', 'CON', 'VIT', 'POW'],
        datasets: [{
          label: 'HERO STATS',
          data: [dis, pun, con, vit, pow],
          backgroundColor: fillRgba,
          borderColor: colors.primary,
          borderWidth: 3,

          // === Brutalist Jagged Geometry ===
          tension: 0,                      // Strips Bézier curves for pure straight vectors
          borderCapStyle: 'square',        // Flat square caps
          borderJoinStyle: 'miter',        // Sharp angular corners (prevents rounded joints)
          borderMiterLimit: 15,            // Preserves sharp spikes without beveling
          
          // Square/Pixel points instead of smooth circles
          pointStyle: 'rect',              // Square vertices
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: colors.bg,
          pointBorderColor: colors.primary,
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        devicePixelRatio: Math.max(window.devicePixelRatio || 1, 2),
        layout: {
          padding: { top: 10, bottom: 10, left: 10, right: 10 }
        },
        scales: {
          r: {
            grid: {
              circular: false,             // Forces strict polygonal concentric rings
              color: colors.grid,
              lineWidth: 1
            },
            angleLines: {
              color: colors.grid,
              lineWidth: 1
            },
            pointLabels: {
              font: {
                family: '"Press Start 2P", monospace',
                size: 9
              },
              color: colors.text
            },
            ticks: {
              display: false,              // Hides smooth tick text for cleaner brutalist look
              stepSize: 25
            },
            suggestedMin: 0,
            suggestedMax: 100
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            cornerRadius: 0,
            backgroundColor: colors.bg,
            titleColor: colors.text,
            bodyColor: colors.text,
            borderColor: colors.primary,
            borderWidth: 2,
            titleFont: { family: '"Press Start 2P", monospace', size: 9 },
            bodyFont: { family: '"Space Mono", monospace', size: 10 },
            callbacks: {
              title: function(items) {
                if (!items || !items.length) return '';
                const idx = items[0].dataIndex;
                const titles = [
                  'DIS (Discipline)',
                  'PUN (Punctuality)',
                  'CON (Consistency)',
                  'VIT (Vitality)',
                  'POW (Power)'
                ];
                return titles[idx] || items[0].label;
              },
              label: function(item) {
                return ` SCORE: ${item.raw}%`;
              },
              afterLabel: function(item) {
                const descs = [
                  'Task completion & daily routines',
                  'Deadline quests cleared before overdue',
                  'Unbroken habit streaks preserved',
                  'HP defense against offline penalties',
                  'XP momentum & high-value quest clearing'
                ];
                return descs[item.dataIndex] || '';
              }
            }
          }
        }
      }
    });
  }

  drawDonutChart() {
    const canvas = this.dom.donutChartCanvas;
    if (!canvas) return;
    const colors = this.getThemeChartColors();

    // Counts
    let dailyCount = 0, dailyDone = 0;
    let deadlineCount = 0, deadlineDone = 0;
    let habitCount = 0, habitDone = 0;

    this.player.tasks.forEach(t => {
      if (t instanceof DailyTask) {
        dailyCount++;
        if (t.completed) dailyDone++;
      } else if (t instanceof DeadlineTask) {
        deadlineCount++;
        if (t.completed) deadlineDone++;
      } else if (t instanceof HabitTask) {
        habitCount++;
        if (t.completed || t.streak > 0) habitDone++;
      }
    });

    const total = this.player.tasks.length;
    const totalDone = dailyDone + deadlineDone + habitDone;
    const clearRate = total > 0 ? Math.round((totalDone / total) * 100) : 0;

    if (this.dom.chartClearRateBadge) {
      this.dom.chartClearRateBadge.textContent = `CLEAR: ${clearRate}% (${totalDone}/${total})`;
    }

    const slices = [
      { label: 'DAILY', count: dailyCount, done: dailyDone, color: colors.primary },
      { label: 'DEADLINE', count: deadlineCount, done: deadlineDone, color: colors.danger },
      { label: 'HABIT', count: habitCount, done: habitDone, color: colors.secondary }
    ];

    // Update legend breakdown list in DOM (centered 3-card brutalist layout)
    if (this.dom.donutBreakdownList) {
      this.dom.donutBreakdownList.innerHTML = slices.map(s => {
        const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
        return `
          <div class="donut-breakdown-item" style="border-top-color: ${s.color};">
            <span class="donut-label-group">
              <span class="donut-color-dot" style="background: ${s.color};"></span>
              <span>${s.label}</span>
            </span>
            <span class="donut-stats-line"><strong>${s.count}</strong> (${pct}%)</span>
            <span class="donut-sub-line">${s.done} Done</span>
          </div>
        `;
      }).join('');
    }

    // Fallback if Chart.js is not loaded
    if (typeof Chart === 'undefined') return;

    if (this.chartInstances.donut) {
      this.chartInstances.donut.destroy();
    }

    const chartData = (total === 0) ? [1, 0, 0] : [dailyCount, deadlineCount, habitCount];
    const bgColors = (total === 0) ? [colors.grid, colors.grid, colors.grid] : [colors.primary, colors.danger, colors.secondary];

    this.chartInstances.donut = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['DAILY', 'DEADLINE', 'HABIT'],
        datasets: [{
          data: chartData,
          backgroundColor: bgColors,
          borderColor: colors.bg,
          borderWidth: 2,
          // Brutalist flat slice edges
          borderRadius: 0,
          spacing: 0,
          offset: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // Breaks out of 1:1 aspect ratio constraint
        radius: '96%',              // Forces chart to maximize available canvas area
        cutout: '50%',              // Inner hole diameter (thick chunky brutalist ring)
        devicePixelRatio: Math.max(window.devicePixelRatio || 1, 2),
        layout: {
          padding: 4                // Eliminates dead space while avoiding clipping
        },
        plugins: {
          legend: {
            display: false          // Use custom centered HTML legend below chart
          },
          tooltip: {
            cornerRadius: 0,        // Brutalist sharp tooltip corners
            backgroundColor: colors.bg,
            titleColor: colors.text,
            bodyColor: colors.text,
            borderColor: colors.primary,
            borderWidth: 2,
            titleFont: { family: '"Press Start 2P", monospace', size: 9 },
            bodyFont: { family: '"Space Mono", monospace', size: 11 },
            boxPadding: 4,
            callbacks: {
              label: function(item) {
                const totalVal = chartData.reduce((a, b) => a + b, 0);
                const pct = totalVal > 0 ? Math.round((item.raw / totalVal) * 100) : 0;
                return ` ${item.label}: ${item.raw} quests (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  renderHabitHeatmap() {
    const grid = this.dom.habitHeatmapGrid;
    if (!grid) return;
    grid.innerHTML = '';

    const days = [];
    const [y, m, d] = this.simulatedCurrentDate.split('-').map(Number);
    const baseDate = new Date(y, m - 1, d);

    let activeDaysCount = 0;

    // 28 days (4 weeks)
    for (let i = 27; i >= 0; i--) {
      const dt = new Date(baseDate);
      dt.setDate(dt.getDate() - i);
      const dy = dt.getFullYear();
      const dm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      const dateStr = `${dy}-${dm}-${dd}`;

      const entry = this.player.history && this.player.history[dateStr];
      const completed = entry ? (entry.tasksCompleted || 0) : 0;
      const xp = entry ? (entry.xp || 0) : 0;

      if (completed > 0) activeDaysCount++;

      let lvlClass = 'lvl-0';
      if (completed >= 3) lvlClass = 'lvl-3';
      else if (completed === 2) lvlClass = 'lvl-2';
      else if (completed === 1) lvlClass = 'lvl-1';

      const cell = document.createElement('div');
      cell.className = `heatmap-cell ${lvlClass}`;
      cell.title = `${dateStr}: ${completed} quest(s) cleared (+${xp} XP)`;
      cell.dataset.date = dateStr;

      grid.appendChild(cell);
    }

    if (this.dom.chartHeatmapActiveDaysBadge) {
      this.dom.chartHeatmapActiveDaysBadge.textContent = `${activeDaysCount}/28 ACTIVE DAYS`;
    }
  }
}

// ============================================================================
// 5. APPLICATION LAUNCH
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  window.gameEngine = new GameController();
  window.gameEngine.init();
});
