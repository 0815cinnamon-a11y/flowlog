const STORAGE_KEY = "flowlog-state-v4";
const CURRENT_USER = "自分";

const STATUSES = [
  { id: "todo", label: "未対応", hint: "着手前の課題" },
  { id: "progress", label: "処理中", hint: "作業が進行中" },
  { id: "review", label: "確認待ち", hint: "レビューや承認待ち" },
  { id: "done", label: "完了", hint: "完了済み" },
];

const RECURRENCE_OPTIONS = [
  { id: "none", label: "繰り返しなし" },
  { id: "daily", label: "毎日" },
  { id: "weekly", label: "毎週" },
  { id: "biweekly", label: "隔週" },
  { id: "monthly", label: "毎月" },
  { id: "monthly_first_monday", label: "毎月第1月曜" },
];

const ISSUE_TEMPLATES = [
  {
    id: "thumbnail",
    name: "サムネ制作",
    projectName: "サムネ",
    title: "サムネ制作対応",
    description: "構成確認、デザイン作成、書き出しまで進める。",
    recurrence: "none",
    dueOffsetDays: 2,
  },
  {
    id: "business-card",
    name: "名刺制作",
    projectName: "名刺制作",
    title: "新規名刺制作",
    description: "ヒアリング、デザイン、校正、入稿まで一連で進める。",
    recurrence: "none",
    dueOffsetDays: 3,
  },
  {
    id: "video-fix",
    name: "動画修正",
    projectName: "動画制作",
    title: "動画修正対応",
    description: "修正指示を整理して、再編集と書き出しまで進める。",
    recurrence: "none",
    dueOffsetDays: 2,
  },
  {
    id: "event-prep",
    name: "イベント準備",
    projectName: "イベント",
    title: "イベント準備確認",
    description: "備品、告知、進行、当日対応の準備をまとめて確認する。",
    recurrence: "monthly_first_monday",
    dueOffsetDays: 7,
  },
];

const initialState = {
  selectedProjectId: "all",
  projects: [
    {
      id: "project-1",
      key: "THM",
      name: "サムネ",
      description: "動画や配信で使うサムネイル制作を管理します。",
    },
    {
      id: "project-2",
      key: "MOV",
      name: "動画制作",
      description: "撮影、編集、公開準備までの制作進行を管理します。",
    },
    {
      id: "project-3",
      key: "EVT",
      name: "イベント",
      description: "告知、準備、当日対応までイベント進行をまとめます。",
    },
    {
      id: "project-4",
      key: "OTH",
      name: "その他",
      description: "分類しきれない作業やスポット対応をまとめます。",
    },
    {
      id: "project-5",
      key: "CRD",
      name: "名刺制作",
      description: "名刺の新規作成、修正、入稿対応を管理します。",
    },
  ],
  issues: [
    {
      id: "issue-1",
      key: "THM-101",
      projectId: "project-1",
      title: "春キャンペーンのYouTubeサムネ作成",
      assignee: CURRENT_USER,
      status: "progress",
      startDate: "2026-03-14",
      dueDate: "2026-03-18",
      recurrence: "daily",
      description: "3案作って比較できる状態まで進める。",
    },
    {
      id: "issue-2",
      key: "MOV-101",
      projectId: "project-2",
      title: "商品紹介動画のテロップ調整",
      assignee: "田中",
      status: "review",
      startDate: "2026-03-15",
      dueDate: "2026-03-19",
      recurrence: "none",
      description: "初稿の誤字確認とブランドトーンの調整を行う。",
    },
    {
      id: "issue-3",
      key: "EVT-101",
      projectId: "project-3",
      title: "展示会ブース備品チェック",
      assignee: "佐藤",
      status: "todo",
      startDate: "2026-03-18",
      dueDate: "2026-03-24",
      recurrence: "monthly_first_monday",
      description: "搬入前に備品リストと発注状況を照合する。",
    },
    {
      id: "issue-4",
      key: "MOV-102",
      projectId: "project-2",
      title: "ショート動画の書き出し設定統一",
      assignee: "鈴木",
      status: "done",
      startDate: "2026-03-10",
      dueDate: "2026-03-14",
      recurrence: "none",
      description: "縦動画向けの解像度と書き出しプリセットを統一した。",
    },
  ],
};

const state = structuredClone(initialState);

const projectList = document.querySelector("#projectList");
const memberList = document.querySelector("#memberList");
const currentProjectName = document.querySelector("#currentProjectName");
const projectSummary = document.querySelector("#projectSummary");
const statsGrid = document.querySelector("#statsGrid");
const board = document.querySelector("#board");
const ganttChart = document.querySelector("#ganttChart");
const ganttSummary = document.querySelector("#ganttSummary");
const issueTableBody = document.querySelector("#issueTableBody");
const issueCountLabel = document.querySelector("#issueCountLabel");
const statusFilter = document.querySelector("#statusFilter");
const assigneeFilter = document.querySelector("#assigneeFilter");
const dueFilter = document.querySelector("#dueFilter");
const sortFilter = document.querySelector("#sortFilter");
const searchInput = document.querySelector("#searchInput");
const issueDialog = document.querySelector("#issueDialog");
const projectDialog = document.querySelector("#projectDialog");
const issueForm = document.querySelector("#issueForm");
const projectForm = document.querySelector("#projectForm");
const deleteIssueButton = document.querySelector("#deleteIssueButton");
const templateList = document.querySelector("#templateList");
const syncStatus = document.querySelector("#syncStatus");

const filters = {
  search: "",
  status: "all",
  assignee: "all",
  due: "all",
  sort: "due_asc",
};

const dragState = {
  boardIssueId: null,
  gantt: null,
};

let syncSeedNeeded = false;
let syncSaveTimer = null;
let isApplyingRemoteState = false;

bootstrap();

async function bootstrap() {
  const loadedState = await loadState();
  applyLoadedState(loadedState);
  normalizeState();
  setupSelects();
  bindEvents();
  bindSharedSync();
  registerServiceWorker();
  render();
  if (syncSeedNeeded) {
    saveState();
  } else {
    updateSyncStatus(window.FlowlogSync?.enabled ? "shared" : "local");
  }
}

async function loadState() {
  const localState = loadLocalState();

  if (!window.FlowlogSyncReady) {
    return localState;
  }

  try {
    await window.FlowlogSyncReady;
  } catch {
    updateSyncStatus("error", "共有接続に失敗");
    return localState;
  }

  if (!window.FlowlogSync?.enabled) {
    return localState;
  }

  updateSyncStatus("syncing", "共有データを確認中");

  try {
    const remoteState = await window.FlowlogSync.load();
    if (remoteState) {
      saveLocalState(remoteState);
      updateSyncStatus("shared");
      return { ...structuredClone(initialState), ...remoteState };
    }

    syncSeedNeeded = true;
    return localState;
  } catch {
    updateSyncStatus("error", "共有保存を使えません");
    return localState;
  }
}

function bindSharedSync() {
  if (!window.FlowlogSync?.enabled) {
    updateSyncStatus("local");
    return;
  }

  updateSyncStatus("syncing", "共有接続中");
  window.FlowlogSync.subscribe((remoteState) => {
    if (!remoteState) return;
    const remoteSnapshot = JSON.stringify(remoteState);
    const localSnapshot = JSON.stringify(snapshotState());
    if (remoteSnapshot === localSnapshot) {
      updateSyncStatus("shared");
      return;
    }

    isApplyingRemoteState = true;
    applyLoadedState({ ...structuredClone(initialState), ...remoteState });
    normalizeState();
    saveLocalState(snapshotState());
    render();
    isApplyingRemoteState = false;
    updateSyncStatus("shared");
  });
}

function updateSyncStatus(mode, label) {
  if (!syncStatus) return;
  syncStatus.className = `sync-pill ${mode}`;
  syncStatus.textContent = label || {
    local: "ローカル保存",
    syncing: "共有同期中",
    shared: "共有保存中",
    error: "同期エラー",
  }[mode] || "ローカル保存";
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      // PWA registration is optional.
    });
  });
}
function normalizeState() {
  if (!Array.isArray(state.projects) || !state.projects.length) {
    state.projects = structuredClone(initialState.projects);
  } else {
    initialState.projects.forEach((defaultProject) => {
      if (!state.projects.some((project) => project.id === defaultProject.id || project.name === defaultProject.name)) {
        state.projects.push(defaultProject);
      }
    });
  }

  if (!Array.isArray(state.issues)) {
    state.issues = structuredClone(initialState.issues);
  }

  state.issues = state.issues.map((issue) => {
    const normalizedDue = issue.dueDate || today();
    const normalizedStart = issue.startDate || inferStartDate(issue.status, normalizedDue);
    return {
      id: issue.id,
      key: issue.key,
      projectId: issue.projectId,
      title: issue.title ?? "",
      assignee: issue.assignee || CURRENT_USER,
      status: issue.status || "todo",
      startDate: compareDate(normalizedStart, normalizedDue) <= 0 ? normalizedStart : normalizedDue,
      dueDate: normalizedDue,
      recurrence: issue.recurrence || "none",
      description: issue.description ?? "",
    };
  });

  if (!state.selectedProjectId) {
    state.selectedProjectId = "all";
  }
}

function saveLocalState(snapshot) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function loadLocalState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return structuredClone(initialState);
  }

  try {
    return { ...structuredClone(initialState), ...JSON.parse(raw) };
  } catch {
    return structuredClone(initialState);
  }
}

function snapshotState() {
  return JSON.parse(JSON.stringify({
    selectedProjectId: state.selectedProjectId,
    projects: state.projects,
    issues: state.issues,
  }));
}

function applyLoadedState(nextState) {
  state.selectedProjectId = nextState?.selectedProjectId ?? "all";
  state.projects = Array.isArray(nextState?.projects) ? nextState.projects : structuredClone(initialState.projects);
  state.issues = Array.isArray(nextState?.issues) ? nextState.issues : structuredClone(initialState.issues);
}

function saveState() {
  const snapshot = snapshotState();
  saveLocalState(snapshot);

  if (!window.FlowlogSync?.enabled || isApplyingRemoteState) {
    updateSyncStatus(window.FlowlogSync?.enabled ? "shared" : "local");
    return;
  }

  updateSyncStatus("syncing", "共有データを保存中");
  clearTimeout(syncSaveTimer);
  syncSaveTimer = window.setTimeout(async () => {
    try {
      await window.FlowlogSync.save(snapshot);
      updateSyncStatus("shared");
    } catch {
      updateSyncStatus("error", "共有保存に失敗");
    }
  }, 300);
}

function setupSelects() {
  statusFilter.innerHTML = renderOptions("all", "すべての状態", STATUSES);
  issueForm.elements.status.innerHTML = renderOptions(null, null, STATUSES);
  issueForm.elements.recurrence.innerHTML = RECURRENCE_OPTIONS.map((item) => `<option value="${item.id}">${item.label}</option>`).join("");
  dueFilter.innerHTML = [
    ['all', 'すべての期限'],
    ['overdue', '期限超過のみ'],
    ['today', '今日期限'],
    ['this_week', '今週分'],
    ['next_7_days', '7日以内'],
  ].map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  sortFilter.innerHTML = [
    ['due_asc', '期限が近い順'],
    ['due_desc', '期限が遠い順'],
    ['assignee', '担当者順'],
    ['project', 'プロジェクト順'],
    ['status', '状態順'],
  ].map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
}

function renderOptions(defaultValue, defaultLabel, items) {
  const options = [];
  if (defaultValue && defaultLabel) {
    options.push(`<option value="${defaultValue}">${defaultLabel}</option>`);
  }
  items.forEach((item) => {
    options.push(`<option value="${item.id}">${item.label}</option>`);
  });
  return options.join("");
}

function bindEvents() {
  document.querySelector("#addIssueButton").addEventListener("click", () => openIssueDialog());
  document.querySelector("#addProjectButton").addEventListener("click", () => {
    projectForm.reset();
    projectDialog.showModal();
  });

  document.querySelector("#resetButton").addEventListener("click", () => {
    Object.assign(state, structuredClone(initialState));
    filters.search = "";
    filters.status = "all";
    filters.assignee = "all";
    filters.due = "all";
    filters.sort = "due_asc";
    searchInput.value = "";
    statusFilter.value = "all";
    assigneeFilter.value = "all";
    dueFilter.value = "all";
    sortFilter.value = "due_asc";
    saveState();
    render();
  });

  searchInput.addEventListener("input", (event) => {
    filters.search = event.target.value.trim().toLowerCase();
    render();
  });

  statusFilter.addEventListener("change", (event) => {
    filters.status = event.target.value;
    render();
  });

  assigneeFilter.addEventListener("change", (event) => {
    filters.assignee = event.target.value;
    render();
  });

  dueFilter.addEventListener("change", (event) => {
    filters.due = event.target.value;
    render();
  });

  sortFilter.addEventListener("change", (event) => {
    filters.sort = event.target.value;
    render();
  });

  templateList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-template-id]");
    if (!button) return;
    createIssueFromTemplate(button.dataset.templateId);
  });

  issueForm.addEventListener("submit", (event) => {
    event.preventDefault();
    upsertIssue(new FormData(issueForm));
    issueDialog.close();
  });

  deleteIssueButton.addEventListener("click", () => {
    const issueId = issueForm.dataset.editingId;
    if (!issueId) return;
    const issue = state.issues.find((item) => item.id === issueId);
    if (!issue) return;
    if (!confirm(`課題「${issue.title}」を削除しますか？`)) return;
    deleteIssue(issueId);
    issueDialog.close();
  });

  projectForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addProject(new FormData(projectForm));
    projectDialog.close();
  });

  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => {
      issueDialog.close();
      projectDialog.close();
    });
  });
}

function render() {
  const visibleIssues = getFilteredIssues();
  renderProjectList();
  renderMembers();
  renderProjectHeader(visibleIssues);
  renderStats(visibleIssues);
  renderTemplates();
  renderAssigneeFilter();
  renderBoard(visibleIssues);
  renderGantt(visibleIssues);
  renderTable(visibleIssues);
}

function sortProjectsForDisplay(projects) {
  return [...projects].sort((a, b) => {
    if (a.name === "その他") return 1;
    if (b.name === "その他") return -1;
    return 0;
  });
}

function getAllMembers() {
  return [CURRENT_USER, ...new Set(state.issues.map((issue) => issue.assignee))].sort((a, b) => a.localeCompare(b, "ja"));
}

function renderProjectList() {
  const allCount = state.issues.length;
  const allButton = `
    <button class="project-item ${state.selectedProjectId === "all" ? "active" : ""}" data-project-id="all" type="button">
      <strong>すべての課題</strong>
      <p>${allCount} 件の課題</p>
    </button>
  `;

  const projects = sortProjectsForDisplay(state.projects)
    .map((project) => {
      const count = state.issues.filter((issue) => issue.projectId === project.id).length;
      return `
        <button class="project-item ${state.selectedProjectId === project.id ? "active" : ""}" data-project-id="${project.id}" type="button">
          <strong>${escapeHtml(project.name)}</strong>
          <p>${count} 件の課題</p>
        </button>
      `;
    })
    .join("");

  projectList.innerHTML = allButton + projects;
  projectList.querySelectorAll("[data-project-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedProjectId = button.dataset.projectId;
      saveState();
      render();
    });
  });
}

function renderMembers() {
  const counts = new Map();
  getAllMembers().forEach((member) => counts.set(member, 0));
  state.issues.forEach((issue) => counts.set(issue.assignee, (counts.get(issue.assignee) ?? 0) + 1));

  memberList.innerHTML = [...counts.entries()]
    .map(
      ([name, count]) => `
        <div class="member-chip">
          <strong>${escapeHtml(name)}</strong>
          <span>${count}</span>
        </div>
      `,
    )
    .join("");
}

function renderProjectHeader(visibleIssues) {
  const project = state.selectedProjectId === "all" ? null : state.projects.find((item) => item.id === state.selectedProjectId);

  currentProjectName.textContent = project ? project.name : "全プロジェクト";
  projectSummary.textContent = project
    ? `${project.description} 表示中 ${visibleIssues.length} 件`
    : `サムネ、動画制作、イベントを横断して管理できます。表示中 ${visibleIssues.length} 件`;

  issueForm.elements.projectId.innerHTML = sortProjectsForDisplay(state.projects)
    .map((item) => `<option value="${item.id}" ${item.id === state.selectedProjectId ? "selected" : ""}>${escapeHtml(item.name)}</option>`)
    .join("");

  issueForm.elements.assignee.innerHTML = getAllMembers()
    .map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
    .join("");
}

function renderStats(visibleIssues) {
  const total = visibleIssues.length;
  const done = visibleIssues.filter((issue) => issue.status === "done").length;
  const delayed = visibleIssues.filter((issue) => getDueMeta(issue).tone === "overdue").length;
  const recurring = visibleIssues.filter((issue) => issue.recurrence !== "none").length;

  statsGrid.innerHTML = [
    { label: "課題", value: total, className: "neutral" },
    { label: "完了", value: done, className: "success" },
    { label: "期限超過", value: delayed, className: "danger" },
    { label: "繰り返し", value: recurring, className: "warning" },
  ]
    .map(
      (stat) => `
        <article class="stat-card ${stat.className}">
          <span>${stat.label}</span>
          <strong>${stat.value}</strong>
        </article>
      `,
    )
    .join("");
}
function renderTemplates() {
  if (!templateList) return;

  templateList.innerHTML = ISSUE_TEMPLATES.map((template) => {
    const recurrenceText = template.recurrence !== "none" ? recurrenceLabel(template.recurrence) : "単発";
    return `
      <button class="template-card" type="button" data-template-id="${template.id}">
        <div class="template-card-head">
          <span class="template-project">${escapeHtml(template.projectName)}</span>
          <span class="template-term">${template.dueOffsetDays}日枠</span>
        </div>
        <strong>${escapeHtml(template.name)}</strong>
        <p>${escapeHtml(template.description)}</p>
        <div class="template-card-foot">
          <span>${escapeHtml(recurrenceText)}</span>
          <span>自分で作成</span>
        </div>
      </button>
    `;
  }).join("");
}

function createIssueFromTemplate(templateId) {
  const template = ISSUE_TEMPLATES.find((item) => item.id === templateId);
  if (!template) return;

  const project = state.projects.find((item) => item.name === template.projectName) ?? state.projects[0];
  if (!project) return;

  const startDate = today();
  const dueDate = addDays(startDate, template.dueOffsetDays);

  state.issues.unshift({
    id: `issue-${crypto.randomUUID()}`,
    key: buildIssueKey(project),
    projectId: project.id,
    title: template.title,
    assignee: CURRENT_USER,
    status: "todo",
    startDate,
    dueDate,
    recurrence: template.recurrence,
    description: template.description,
  });

  state.selectedProjectId = project.id;
  saveState();
  render();
}

function renderAssigneeFilter() {
  assigneeFilter.innerHTML =
    '<option value="all">すべての担当者</option>' +
    getAllMembers().map((name) => `<option value="${escapeHtml(name)}" ${filters.assignee === name ? "selected" : ""}>${escapeHtml(name)}</option>`).join("");
  assigneeFilter.value = filters.assignee;
}

function renderBoard(visibleIssues) {
  issueCountLabel.textContent = `${visibleIssues.length} 件を表示中`;
  board.innerHTML = STATUSES.map((status) => {
    const issues = visibleIssues.filter((issue) => issue.status === status.id);
    return `
      <section class="column ${status.id}">
        <div class="column-head">
          <div>
            <h4>${status.label}</h4>
            <p>${status.hint}</p>
          </div>
          <span class="count-badge">${issues.length}</span>
        </div>
        <div class="column-body" data-drop-status="${status.id}">${issues.length ? issues.map(renderIssueCard).join("") : '<div class="empty-state">課題はありません</div>'}</div>
      </section>
    `;
  }).join("");

  hydrateIssueCards();
}

function renderIssueCard(issue) {
  const dueMeta = getDueMeta(issue);
  const project = state.projects.find((item) => item.id === issue.projectId);
  return `
    <article class="issue-card" data-issue-id="${issue.id}" draggable="true">
      <div class="issue-card-head">
        <span class="issue-key">${issue.key}</span>
        <span class="status-chip ${issue.status}">${statusLabel(issue.status)}</span>
      </div>
      <h4>${escapeHtml(issue.title)}</h4>
      <p class="issue-description">${escapeHtml(issue.description)}</p>
      <div class="issue-meta-row">
        <span class="assignee-pill">${escapeHtml(issue.assignee)}</span>
        <span class="due-badge ${dueMeta.tone}">${dueMeta.label}</span>
      </div>
      <div class="issue-meta-row issue-meta-row-sub">
        <span class="project-pill">${escapeHtml(project?.name ?? "")}</span>
        ${issue.recurrence !== "none" ? `<span class="recurrence-pill">${recurrenceLabel(issue.recurrence)}</span>` : ""}
      </div>
      <div class="issue-actions">
        <button class="link-button" type="button" data-edit-issue-id="${issue.id}">編集</button>
        <div class="status-actions">
          ${STATUSES.filter((status) => status.id !== issue.status)
            .map((status) => `<button class="status-button ghost-button" type="button" data-issue-id="${issue.id}" data-next-status="${status.id}">${status.label}へ</button>`)
            .join("")}
        </div>
      </div>
    </article>
  `;
}

function renderGantt(visibleIssues) {
  if (!visibleIssues.length) {
    ganttSummary.textContent = "表示対象の課題がありません。";
    ganttChart.innerHTML = '<div class="empty-state">ガント表示できる課題がありません</div>';
    return;
  }

  const preparedIssues = visibleIssues
    .map((issue) => ({ ...issue, startDate: issue.startDate || inferStartDate(issue.status, issue.dueDate) }))
    .sort((a, b) => compareDate(a.startDate, b.startDate) || compareDate(a.dueDate, b.dueDate));

  const minDate = addDays(minBy(preparedIssues, (issue) => issue.startDate).startDate, -1);
  const maxDate = addDays(maxBy(preparedIssues, (issue) => issue.dueDate).dueDate, 2);
  const dates = buildDateRange(minDate, maxDate);
  const todayValue = today();

  ganttSummary.textContent = `${formatFullDate(minDate)} から ${formatFullDate(maxDate)} の予定を表示しています。バーを左右にドラッグすると日付を調整できます。`;

  const header = dates
    .map((date) => {
      const classes = ["gantt-cell", "gantt-date"];
      if (date === todayValue) classes.push("today");
      if (isWeekend(date)) classes.push("weekend");
      return `<div class="${classes.join(" ")}"><span>${formatGanttDay(date)}</span></div>`;
    })
    .join("");

  const rows = preparedIssues
    .map((issue) => {
      const offset = diffFromDate(minDate, issue.startDate);
      const duration = Math.max(diffFromDate(issue.startDate, issue.dueDate) + 1, 1);
      const dueMeta = getDueMeta(issue);
      return `
        <div class="gantt-row">
          <div class="gantt-side">
            <strong>${escapeHtml(issue.title)}</strong>
            <span>${escapeHtml(issue.assignee)} ・ ${issue.key}</span>
          </div>
          <div class="gantt-track" data-track="${issue.id}" style="grid-template-columns: repeat(${dates.length}, minmax(44px, 1fr));">
            ${dates.map((date) => {
              const classes = ["gantt-cell"];
              if (date === todayValue) classes.push("today");
              if (isWeekend(date)) classes.push("weekend");
              return `<div class="${classes.join(" ")}"></div>`;
            }).join("")}
            <div class="gantt-bar ${issue.status} ${dueMeta.tone}" data-gantt-issue-id="${issue.id}" style="grid-column:${offset + 1} / span ${duration};">
              <span>${issue.key}</span>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  ganttChart.innerHTML = `
    <div class="gantt-header">
      <div class="gantt-side gantt-side-head">課題</div>
      <div class="gantt-track gantt-dates" style="grid-template-columns: repeat(${dates.length}, minmax(44px, 1fr));">
        ${header}
      </div>
    </div>
    <div class="gantt-body">${rows}</div>
  `;

  hydrateGanttInteractions();
}

function hydrateIssueCards() {
  board.querySelectorAll("[data-next-status]").forEach((button) => {
    button.addEventListener("click", () => {
      updateIssueStatus(button.dataset.issueId, button.dataset.nextStatus);
    });
  });

  board.querySelectorAll("[data-edit-issue-id]").forEach((button) => {
    button.addEventListener("click", () => openIssueDialog(button.dataset.editIssueId));
  });

  board.querySelectorAll(".issue-card[data-issue-id]").forEach((card) => {
    card.addEventListener("dragstart", () => {
      dragState.boardIssueId = card.dataset.issueId;
      card.classList.add("dragging");
    });
    card.addEventListener("dragend", () => {
      dragState.boardIssueId = null;
      card.classList.remove("dragging");
      board.querySelectorAll(".column-body.drop-target").forEach((column) => column.classList.remove("drop-target"));
    });
  });

  board.querySelectorAll(".column-body[data-drop-status]").forEach((column) => {
    column.addEventListener("dragover", (event) => {
      if (!dragState.boardIssueId) return;
      event.preventDefault();
      column.classList.add("drop-target");
    });
    column.addEventListener("dragleave", () => column.classList.remove("drop-target"));
    column.addEventListener("drop", (event) => {
      event.preventDefault();
      column.classList.remove("drop-target");
      if (!dragState.boardIssueId) return;
      updateIssueStatus(dragState.boardIssueId, column.dataset.dropStatus);
    });
  });
}

function hydrateGanttInteractions() {
  ganttChart.querySelectorAll(".gantt-bar[data-gantt-issue-id]").forEach((bar) => {
    bar.addEventListener("pointerdown", (event) => startGanttDrag(event, bar));
  });
}

function startGanttDrag(event, bar) {
  const issueId = bar.dataset.ganttIssueId;
  const track = bar.closest(".gantt-track");
  const cell = track?.querySelector(".gantt-cell");
  if (!issueId || !track || !cell) return;

  dragState.gantt = {
    issueId,
    startX: event.clientX,
    lastX: event.clientX,
    cellWidth: cell.getBoundingClientRect().width || 44,
    bar,
  };

  bar.classList.add("dragging");
  document.body.classList.add("drag-active");
  window.addEventListener("pointermove", onGanttPointerMove);
  window.addEventListener("pointerup", onGanttPointerUp, { once: true });
}

function onGanttPointerMove(event) {
  if (!dragState.gantt) return;
  dragState.gantt.lastX = event.clientX;
  const deltaX = event.clientX - dragState.gantt.startX;
  dragState.gantt.bar.style.transform = `translateX(${deltaX}px)`;
}

function onGanttPointerUp() {
  if (!dragState.gantt) return;
  const { issueId, startX, lastX, cellWidth, bar } = dragState.gantt;
  const deltaDays = Math.round((lastX - startX) / Math.max(cellWidth, 1));
  bar.classList.remove("dragging");
  bar.style.transform = "";
  document.body.classList.remove("drag-active");
  window.removeEventListener("pointermove", onGanttPointerMove);
  dragState.gantt = null;
  if (deltaDays !== 0) {
    shiftIssueDates(issueId, deltaDays);
  }
}

function shiftIssueDates(issueId, deltaDays) {
  const issue = state.issues.find((item) => item.id === issueId);
  if (!issue) return;
  issue.startDate = addDays(issue.startDate, deltaDays);
  issue.dueDate = addDays(issue.dueDate, deltaDays);
  saveState();
  render();
}

function renderTable(visibleIssues) {
  issueTableBody.innerHTML = visibleIssues.length
    ? visibleIssues
        .map((issue) => {
          const dueMeta = getDueMeta(issue);
          return `
            <tr>
              <td><span class="issue-key inline">${issue.key}</span></td>
              <td>
                <strong class="table-title">${escapeHtml(issue.title)}</strong>
                <div class="table-desc">${escapeHtml(issue.description)}</div>
              </td>
              <td>${escapeHtml(issue.assignee)}</td>
              <td><span class="due-badge ${dueMeta.tone}">${dueMeta.label}</span></td>
              <td><span class="status-chip ${issue.status}">${statusLabel(issue.status)}</span></td>
            </tr>
          `;
        })
        .join("")
    : '<tr><td colspan="5"><div class="empty-state">条件に一致する課題はありません</div></td></tr>';
}

function getFilteredIssues() {
  const filtered = state.issues.filter((issue) => {
    if (state.selectedProjectId !== "all" && issue.projectId !== state.selectedProjectId) return false;
    if (filters.status !== "all" && issue.status !== filters.status) return false;
    if (filters.assignee !== "all" && issue.assignee !== filters.assignee) return false;
    if (!matchesDueFilter(issue, filters.due)) return false;
    if (filters.search) {
      const project = state.projects.find((item) => item.id === issue.projectId);
      const haystack = [issue.title, issue.assignee, issue.description, project?.name ?? "", recurrenceLabel(issue.recurrence)].join(" ").toLowerCase();
      if (!haystack.includes(filters.search)) return false;
    }
    return true;
  });

  return sortIssues(filtered, filters.sort);
}

function matchesDueFilter(issue, dueFilterValue) {
  const diffDays = diffFromDate(today(), issue.dueDate);
  switch (dueFilterValue) {
    case "overdue":
      return issue.status !== "done" && diffDays < 0;
    case "today":
      return diffDays === 0;
    case "this_week":
      return diffDays >= 0 && diffDays <= daysUntilEndOfWeek();
    case "next_7_days":
      return diffDays >= 0 && diffDays <= 7;
    default:
      return true;
  }
}

function sortIssues(items, sortMode) {
  const projectName = (projectId) => state.projects.find((item) => item.id === projectId)?.name ?? "";
  const statusOrder = { todo: 0, progress: 1, review: 2, done: 3 };
  const sorted = [...items];

  sorted.sort((a, b) => {
    if (sortMode === "due_desc") return compareDate(b.dueDate, a.dueDate);
    if (sortMode === "assignee") return a.assignee.localeCompare(b.assignee, "ja") || compareDate(a.dueDate, b.dueDate);
    if (sortMode === "project") return projectName(a.projectId).localeCompare(projectName(b.projectId), "ja") || compareDate(a.dueDate, b.dueDate);
    if (sortMode === "status") return (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99) || compareDate(a.dueDate, b.dueDate);
    return compareDate(a.dueDate, b.dueDate);
  });

  return sorted;
}

function openIssueDialog(issueId) {
  issueForm.reset();
  issueForm.dataset.editingId = issueId ?? "";
  document.querySelector("#issueDialogTitle").textContent = issueId ? "課題を編集" : "課題を追加";
  deleteIssueButton.hidden = !issueId;

  if (issueId) {
    const issue = state.issues.find((item) => item.id === issueId);
    if (!issue) return;
    ensureAssigneeOption(issue.assignee);
    issueForm.elements.title.value = issue.title;
    issueForm.elements.projectId.value = issue.projectId;
    issueForm.elements.assignee.value = issue.assignee;
    issueForm.elements.status.value = issue.status;
    issueForm.elements.startDate.value = issue.startDate || "";
    issueForm.elements.dueDate.value = issue.dueDate;
    issueForm.elements.recurrence.value = issue.recurrence || "none";
    issueForm.elements.description.value = issue.description;
  } else {
    const defaultProjectId = state.selectedProjectId === "all" ? state.projects[0]?.id : state.selectedProjectId;
    ensureAssigneeOption(CURRENT_USER);
    issueForm.elements.projectId.value = defaultProjectId ?? "";
    issueForm.elements.assignee.value = CURRENT_USER;
    issueForm.elements.status.value = "todo";
    issueForm.elements.startDate.value = today();
    issueForm.elements.dueDate.value = addDays(today(), 3);
    issueForm.elements.recurrence.value = "none";
  }

  issueDialog.showModal();
}

function ensureAssigneeOption(name) {
  const select = issueForm.elements.assignee;
  if (![...select.options].some((option) => option.value === name)) {
    select.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`);
  }
}

function upsertIssue(formData) {
  const editingId = issueForm.dataset.editingId;
  const project = state.projects.find((item) => item.id === formData.get("projectId"));
  if (!project) return;

  const dueDate = formData.get("dueDate");
  const rawStartDate = formData.get("startDate").trim();
  const status = formData.get("status");
  const startDate = rawStartDate || inferStartDate(status, dueDate);
  const normalizedStartDate = compareDate(startDate, dueDate) <= 0 ? startDate : dueDate;

  const issue = {
    id: editingId || `issue-${crypto.randomUUID()}`,
    key: editingId ? state.issues.find((item) => item.id === editingId)?.key : buildIssueKey(project),
    projectId: project.id,
    title: formData.get("title").trim(),
    assignee: formData.get("assignee").trim() || CURRENT_USER,
    status,
    startDate: normalizedStartDate,
    dueDate,
    recurrence: formData.get("recurrence") || "none",
    description: formData.get("description").trim(),
  };

  if (editingId) {
    const index = state.issues.findIndex((item) => item.id === editingId);
    state.issues.splice(index, 1, issue);
  } else {
    state.issues.unshift(issue);
  }

  saveState();
  render();
}

function updateIssueStatus(issueId, nextStatus) {
  const issue = state.issues.find((item) => item.id === issueId);
  if (!issue) return;
  const previousStatus = issue.status;
  issue.status = nextStatus;
  if (nextStatus === "done" && previousStatus !== "done") {
    createNextRecurringIssue(issue);
  }
  saveState();
  render();
}

function createNextRecurringIssue(issue) {
  if (!issue.recurrence || issue.recurrence === "none") return;

  const duration = Math.max(diffFromDate(issue.startDate, issue.dueDate), 0);
  const nextStartDate = shiftByRecurrence(issue.startDate, issue.recurrence);
  const nextDueDate = issue.recurrence === "monthly_first_monday" ? addDays(nextStartDate, duration) : shiftByRecurrence(issue.dueDate, issue.recurrence);

  const exists = state.issues.some((item) =>
    item.projectId === issue.projectId &&
    item.title === issue.title &&
    item.recurrence === issue.recurrence &&
    item.startDate === nextStartDate &&
    item.dueDate === nextDueDate,
  );

  if (exists) return;

  const project = state.projects.find((item) => item.id === issue.projectId);
  if (!project) return;

  state.issues.unshift({
    id: `issue-${crypto.randomUUID()}`,
    key: buildIssueKey(project),
    projectId: issue.projectId,
    title: issue.title,
    assignee: issue.assignee,
    status: "todo",
    startDate: nextStartDate,
    dueDate: nextDueDate,
    recurrence: issue.recurrence,
    description: issue.description,
  });
}

function deleteIssue(issueId) {
  state.issues = state.issues.filter((item) => item.id !== issueId);
  saveState();
  render();
}

function addProject(formData) {
  const name = formData.get("name").trim();
  const description = formData.get("description").trim();
  const keyBase = name.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "PRJ";
  const key = uniqueProjectKey(keyBase);

  state.projects.push({
    id: `project-${crypto.randomUUID()}`,
    key,
    name,
    description,
  });
  state.selectedProjectId = state.projects[state.projects.length - 1].id;
  saveState();
  render();
}

function uniqueProjectKey(base) {
  let candidate = base;
  let index = 1;
  while (state.projects.some((project) => project.key === candidate)) {
    candidate = `${base}${index}`;
    index += 1;
  }
  return candidate;
}

function buildIssueKey(project) {
  const projectIssues = state.issues.filter((issue) => issue.projectId === project.id);
  const existingNumbers = projectIssues
    .map((issue) => Number.parseInt(String(issue.key).split("-")[1], 10))
    .filter((value) => Number.isFinite(value));
  const nextNumber = existingNumbers.length ? Math.max(...existingNumbers) + 1 : 101;
  return `${project.key}-${nextNumber}`;
}

function statusLabel(statusId) {
  return STATUSES.find((item) => item.id === statusId)?.label ?? statusId;
}

function recurrenceLabel(recurrenceId) {
  return RECURRENCE_OPTIONS.find((item) => item.id === recurrenceId)?.label ?? "";
}

function getDueMeta(issue) {
  if (issue.status === "done") {
    return { tone: "done", label: `完了 ${formatDate(issue.dueDate)}` };
  }

  const diffDays = diffFromDate(today(), issue.dueDate);
  if (diffDays < 0) return { tone: "overdue", label: `${Math.abs(diffDays)}日超過` };
  if (diffDays === 0) return { tone: "today", label: "今日期限" };
  if (diffDays === 1) return { tone: "tomorrow", label: "明日期限" };
  if (diffDays <= 7) return { tone: "soon", label: `${formatDate(issue.dueDate)} まで` };
  return { tone: "normal", label: formatDate(issue.dueDate) };
}

function inferStartDate(status, dueDate) {
  const leadTime = { todo: 5, progress: 4, review: 3, done: 4 };
  return addDays(dueDate, -(leadTime[status] ?? 3));
}

function shiftByRecurrence(value, recurrence) {
  const date = new Date(value);
  if (recurrence === "daily") date.setDate(date.getDate() + 1);
  if (recurrence === "weekly") date.setDate(date.getDate() + 7);
  if (recurrence === "biweekly") date.setDate(date.getDate() + 14);
  if (recurrence === "monthly") date.setMonth(date.getMonth() + 1);
  if (recurrence === "monthly_first_monday") return firstMondayOfNextMonth(value);
  return formatIso(date);
}

function firstMondayOfNextMonth(value) {
  const base = new Date(value);
  const target = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  while (target.getDay() !== 1) {
    target.setDate(target.getDate() + 1);
  }
  return formatIso(target);
}

function addDays(value, amount) {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return formatIso(date);
}

function compareDate(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function diffFromDate(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((endDate - startDate) / msPerDay);
}

function daysUntilEndOfWeek() {
  const day = new Date(today()).getDay();
  const normalized = day === 0 ? 7 : day;
  return 7 - normalized;
}

function buildDateRange(start, end) {
  const dates = [];
  let cursor = start;
  while (compareDate(cursor, end) <= 0) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

function minBy(items, selector) {
  return items.reduce((current, item) => (selector(item) < selector(current) ? item : current));
}

function maxBy(items, selector) {
  return items.reduce((current, item) => (selector(item) > selector(current) ? item : current));
}

function isWeekend(value) {
  const day = new Date(value).getDay();
  return day === 0 || day === 6;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" }).format(new Date(value));
}

function formatFullDate(value) {
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", weekday: "short" }).format(new Date(value));
}

function formatGanttDay(value) {
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" }).format(new Date(value));
}

function formatIso(date) {
  return date.toISOString().slice(0, 10);
}

function today() {
  return formatIso(new Date());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}























