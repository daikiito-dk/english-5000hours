// English 5,000 Hours Mastery Project Dashboard Logic

// Fallback initial state in case data.json cannot be fetched (e.g. file:// CORS)
const DEFAULT_DATA = {
  project: {
    start_date: "2026-09-21",
    target_date: "2030-11-18",
    target_hours: 5000.0,
    total_days: 1519,
    days_elapsed: 1,
    days_remaining: 1519
  },
  stats: {
    total_hours: 0.0,
    remaining_hours: 5000.0,
    progress_percent: 0.0,
    current_phase_id: 1,
    daily_pace_required: 3.3,
    daily_target_baseline: 3.3,
    category_hours: {
      listening: 0.0,
      speaking: 0.0,
      reading: 0.0,
      writing: 0.0,
      other: 0.0
    },
    vocabulary_count: 1,
    reading_notes_count: 1
  },
  phases: [
    {
      id: 1,
      name: "Phase 1: Foundation Reconstruction",
      short_name: "Phase 1: Foundation",
      hours_range: [0, 1000],
      duration: "~10 months",
      description: "Thorough acquisition of core vocabulary, grammar, and pronunciation. Daily podcast listening and online conversation.",
      skills: ["Core Vocab & Grammar", "Pronunciation & Shadowing", "Daily Podcast Listening", "Online Conversation Launch"]
    },
    {
      id: 2,
      name: "Phase 2: Practice & Habituation",
      short_name: "Phase 2: Practice",
      hours_range: [1000, 2500],
      duration: "~15 months",
      description: "Extensive reading of news and books; targeting TOEIC 900+ and Eiken Grade 1.",
      skills: ["Extensive Reading (News/Books)", "TOEIC 900+ / Eiken 1", "Journal & Summary Writing", "Intermediate Discussion"]
    },
    {
      id: 3,
      name: "Phase 3: English Brain Solidification",
      short_name: "Phase 3: Solidification",
      hours_range: [2500, 4000],
      duration: "~15 months",
      description: "Total immersion: personal research, hobbies, and work conducted entirely in English.",
      skills: ["100% English Immersion", "Work & Technical Docs", "English Writing & Social Output", "Thinking in English"]
    },
    {
      id: 4,
      name: "Phase 4: Mastery & Fluency",
      short_name: "Phase 4: Mastery",
      hours_range: [4000, 5000],
      duration: "~10 months",
      description: "High-level debate, native-level nuance comprehension, and effortless spontaneity.",
      skills: ["Advanced Debate & Negotiation", "Cultural Nuance & Wit", "Effortless Spontaneity", "Native-Level Fluency"]
    }
  ],
  daily: {
    "2026-09-21": {
      date: "2026-09-21",
      hours: 0.0,
      breakdown: [],
      notes: "Project kicked off!"
    }
  },
  vocabulary: [
    {
      term: "call it a day",
      meaning: "To stop what you are doing, especially work, often because you have done enough for the day.",
      context: "Commonly used in professional and casual settings to wrap up meetings or workday tasks.",
      example: "Let's call it a day and pick this up tomorrow morning."
    }
  ],
  reading_notes: [
    {
      title: "The Power of Tiny Gains",
      source: "James Clear - Atomic Habits",
      summary: "Improving by just 1% every day results in a 37-fold improvement over the course of a year. Habits are the compound interest of self-improvement.",
      reflection: "A 5,000-hour journey is achieved 3.3 hours at a time. Daily compounding habit is the ultimate key."
    }
  ]
};


let currentData = DEFAULT_DATA;

// Theme Controller
function initTheme() {
  const savedTheme = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  
  const toggleBtn = document.getElementById("theme-toggle");
  toggleBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  });
}

// Data Fetcher
async function loadData() {
  try {
    const response = await fetch("data.json?t=" + new Date().getTime());
    if (response.ok) {
      currentData = await response.json();
    }
  } catch (err) {
    console.warn("Could not fetch data.json, using fallback data:", err);
  }
  renderDashboard(currentData);
}

// Render All Components
function renderDashboard(data) {
  const { project, stats, phases, daily, vocabulary } = data;

  // 1. Progress Ring
  const circle = document.getElementById("ring-circle");
  const percentText = document.getElementById("hero-percent");
  const loggedHoursText = document.getElementById("hero-logged-hours");

  const radius = circle.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;
  circle.style.strokeDasharray = `${circumference} ${circumference}`;

  const percent = Math.min(100, Math.max(0, stats.progress_percent));
  const offset = circumference - (percent / 100) * circumference;
  circle.style.strokeDashoffset = offset;

  percentText.textContent = `${stats.progress_percent.toFixed(1)}%`;
  loggedHoursText.textContent = `${stats.total_hours.toFixed(1)}`;

  // 2. KPI Cards
  document.getElementById("active-day-badge").textContent = `Day ${project.days_elapsed}`;
  document.getElementById("kpi-daily-pace").textContent = stats.daily_pace_required.toFixed(1);

  const actualPaceEl = document.getElementById("kpi-actual-pace");
  if (actualPaceEl) {
    const actualPace = project.days_elapsed > 0 ? stats.total_hours / project.days_elapsed : 0;
    actualPaceEl.textContent = actualPace.toFixed(1);
    actualPaceEl.style.color = actualPace >= stats.daily_pace_required ? "#34d399" : "#f87171";
  }

  document.getElementById("kpi-days-remaining").textContent = project.days_remaining.toLocaleString();
  document.getElementById("kpi-days-elapsed").textContent = project.days_elapsed;
  document.getElementById("kpi-vocab-count").textContent = vocabulary ? vocabulary.length : 0;
  document.getElementById("kpi-reading-count").textContent = stats.reading_notes_count || 0;

  const currentPhase = phases.find(p => p.id === stats.current_phase_id) || phases[0];
  document.getElementById("kpi-phase-title").textContent = `Phase ${currentPhase.id}`;

  // Baseline updates
  if (data.baseline) {
    const toeicEl = document.getElementById("baseline-toeic");
    const cefrEl = document.getElementById("baseline-cefr");
    if (toeicEl) toeicEl.textContent = data.baseline.toeic;
    if (cefrEl) cefrEl.textContent = data.baseline.cefr_overall;
  }

  // 3. Phase Roadmap

  renderPhases(phases, stats.total_hours);

  // 4. Skills Breakdown
  renderSkills(stats.category_hours, stats.total_hours);

  // 5. Calendar / Heatmap
  renderCalendar(daily);

  // 6. Recent Logs
  renderLogs(daily);

  // 7. Vocabulary
  renderVocabulary(vocabulary);

  // 8. ROI
  if (data.roi) renderROI(data.roi);

  // 9. Output ROI (score/level efficiency)
  if (data.output_roi) renderOutputROI(data.output_roi);
}

// Render Output ROI: cost per test-score point, cost to reach the next CEFR level.
// Both stay "—" until a second assessment exists to compare against the baseline.
function renderOutputROI(outputRoi) {
  const fmt = (n) => n != null ? `¥${Number(n).toLocaleString()}` : "—";

  const cppointEl = document.getElementById("output-roi-cppoint");
  const cppointDescEl = document.getElementById("output-roi-cppoint-desc");
  if (cppointEl) {
    if (outputRoi.cp_point_yen != null) {
      cppointEl.textContent = `${fmt(outputRoi.cp_point_yen)} / pt`;
      if (cppointDescEl) {
        cppointDescEl.textContent = `${outputRoi.score_type} ${outputRoi.baseline_score} → ${outputRoi.latest_score}`;
      }
    } else {
      cppointEl.textContent = "—";
    }
  }

  const cefrEl = document.getElementById("output-roi-cefr");
  const cefrDescEl = document.getElementById("output-roi-cefr-desc");
  if (cefrEl) {
    const levelUp = outputRoi.cefr_level_up;
    if (levelUp) {
      cefrEl.textContent = `${fmt(levelUp.total_yen)} / ${levelUp.total_hours.toFixed(1)}h`;
      if (cefrDescEl) {
        cefrDescEl.textContent = `${levelUp.from} → ${levelUp.to}`;
      }
    } else {
      cefrEl.textContent = "—";
    }
  }
}

// Service Breakdown table sort state, shared across re-renders triggered by header clicks
let roiSortState = { key: null, dir: 1 };
let lastRoiData = null;

function initROITableSorting() {
  const headers = document.querySelectorAll("#roi-breakdown-table th[data-sort-key]");
  headers.forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sortKey;
      if (roiSortState.key === key) {
        roiSortState.dir *= -1;
      } else {
        roiSortState.key = key;
        roiSortState.dir = 1;
      }
      if (lastRoiData) renderROI(lastRoiData);
    });
  });
}

// Render Learning Investment & ROI Section
function renderROI(roi) {
  lastRoiData = roi;

  // KPI cards
  const fmt = (n) => n != null ? `¥${Number(n).toLocaleString()}` : "—";

  const tcoEl = document.getElementById("roi-tco");
  const tcoSubEl = document.getElementById("roi-tco-sub");
  const totalEl = document.getElementById("roi-total-invested");
  const monthlyEl = document.getElementById("roi-monthly-spend");
  const cphEl = document.getElementById("roi-cost-per-hour");

  if (tcoEl) tcoEl.textContent = fmt(roi.tco_yen);
  if (tcoSubEl && roi.hourly_wage_yen != null) {
    tcoSubEl.textContent = `${fmt(roi.total_invested_yen)} spent + ${roi.total_hours_from_paid_tools.toFixed(1)}h × ¥${Number(roi.hourly_wage_yen).toLocaleString()}/hr (${fmt(roi.time_value_yen)} of your time)`;
  }
  if (totalEl) totalEl.textContent = fmt(roi.total_invested_yen);
  if (monthlyEl) monthlyEl.textContent = fmt(roi.monthly_spend_yen);
  if (cphEl) {
    if (roi.cost_per_hour_yen != null) {
      cphEl.textContent = fmt(roi.cost_per_hour_yen) + " / hr";
      // Color code efficiency
      const cph = roi.cost_per_hour_yen;
      cphEl.style.color = cph < 500 ? "#34d399" : cph < 2000 ? "#fbbf24" : "#f87171";
    } else {
      cphEl.textContent = "—";
      cphEl.style.color = "var(--text-muted)";
    }
  }

  // Breakdown table
  const tbody = document.getElementById("roi-table-body");
  const footer = document.getElementById("roi-table-footer");
  if (!tbody) return;

  tbody.innerHTML = "";
  let breakdown = (roi.breakdown || []).slice();

  if (breakdown.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding: 16px;">No services tracked yet.</td></tr>`;
    return;
  }

  // Apply current column sort (persists across re-renders via roiSortState)
  const headers = document.querySelectorAll("#roi-breakdown-table th[data-sort-key]");
  headers.forEach((th) => {
    const arrow = th.querySelector(".sort-arrow");
    const isSorted = th.dataset.sortKey === roiSortState.key;
    th.classList.toggle("is-sorted", isSorted);
    if (arrow) arrow.textContent = isSorted ? (roiSortState.dir === 1 ? "▲" : "▼") : "";
  });

  if (roiSortState.key) {
    const key = roiSortState.key;
    const dir = roiSortState.dir;
    const activeTh = document.querySelector(`#roi-breakdown-table th[data-sort-key="${key}"]`);
    const isText = activeTh && activeTh.dataset.sortType === "text";
    breakdown.sort((a, b) => {
      let av = a[key];
      let bv = b[key];
      if (isText) {
        av = (av || "").toString().toLowerCase();
        bv = (bv || "").toString().toLowerCase();
        return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
      }
      // Numeric columns: null (e.g. no hours logged yet / no ¥/hr) always sorts last
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return (av - bv) * dir;
    });
  }

  breakdown.forEach(item => {
    const cphVal = item.cost_per_hour_yen;
    const cphColor = cphVal == null ? "var(--text-muted)"
                   : cphVal < 500   ? "#34d399"
                   : cphVal < 2000  ? "#fbbf24"
                   : "#f87171";
    const cphText = cphVal != null ? `¥${Number(cphVal).toLocaleString()}` : "— (no hours yet)";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${item.service}</strong><br><small style="color:var(--text-muted)">${item.provider || ""}</small></td>
      <td>${item.plan || "—"}</td>
      <td><span class="roi-category-tag">${item.category || "—"}</span></td>
      <td>¥${Number(item.monthly_yen).toLocaleString()}</td>
      <td>${item.months_active}</td>
      <td>¥${Number(item.total_yen).toLocaleString()}</td>
      <td>${item.hours_logged > 0 ? item.hours_logged.toFixed(1) + " hrs" : "—"}</td>
      <td style="color: ${cphColor}; font-weight: 600;">${cphText}</td>
    `;
    tbody.appendChild(tr);
  });

  // Footer total row
  if (footer) {
    const totalInvested = roi.total_invested_yen || 0;
    const totalHours = roi.total_hours_from_paid_tools || 0;
    const overallCph = roi.cost_per_hour_yen;
    const overallColor = overallCph == null ? "var(--text-muted)"
                       : overallCph < 500   ? "#34d399"
                       : overallCph < 2000  ? "#fbbf24"
                       : "#f87171";
    footer.innerHTML = `
      <span>Total: <strong>¥${Number(totalInvested).toLocaleString()}</strong> invested</span>
      <span style="margin-left: 16px;">${totalHours.toFixed(1)} hrs from paid tools</span>
      <span style="margin-left: 16px; color: ${overallColor};">Overall ¥/hr: <strong>${overallCph != null ? "¥" + Number(overallCph).toLocaleString() : "—"}</strong></span>
    `;
  }
}

// Render 4-Phase Roadmap
function renderPhases(phases, totalHours) {
  const container = document.getElementById("phases-container");
  container.innerHTML = "";

  phases.forEach((phase) => {
    const minH = phase.hours_range[0];
    const maxH = phase.hours_range[1];
    const rangeSpan = maxH - minH;
    
    let progressInPhase = 0;
    let status = "upcoming";

    if (totalHours >= maxH) {
      progressInPhase = 100;
      status = "completed";
    } else if (totalHours >= minH) {
      progressInPhase = Math.min(100, ((totalHours - minH) / rangeSpan) * 100);
      status = "active";
    }

    const card = document.createElement("div");
    card.className = `glass-card phase-card ${status === "active" ? "active" : ""}`;

    const badgeClass = status === "active" ? "badge-active" : "badge-upcoming";
    const badgeText = status === "active" ? "Current" : (status === "completed" ? "Completed" : "Upcoming");

    card.innerHTML = `
      <div class="phase-badge ${badgeClass}">${badgeText}</div>
      <h3 class="phase-title">${phase.short_name}</h3>
      <div class="phase-range">${minH.toLocaleString()} - ${maxH.toLocaleString()} hrs (${phase.duration})</div>
      <p class="phase-desc">${phase.description}</p>
      <div class="phase-progress-bar">
        <div class="phase-progress-fill" style="width: ${progressInPhase}%"></div>
      </div>
      <ul class="phase-skills-list">
        ${phase.skills.map(s => `<li>${s}</li>`).join("")}
      </ul>
    `;

    container.appendChild(card);
  });
}

// Render Skills Distribution
function renderSkills(categoryHours, totalHours) {
  const cat = categoryHours || { listening: 0, speaking: 0, reading: 0, writing: 0 };
  const safeTotal = totalHours > 0 ? totalHours : 1;

  const skills = [
    { key: "listening", label: "🎧 Listening / Podcast", fillClass: "fill-listening" },
    { key: "speaking", label: "🗣️ Speaking / Online Lessons", fillClass: "fill-speaking" },
    { key: "reading", label: "📖 Reading / Grammar / Vocab", fillClass: "fill-reading" },
    { key: "writing", label: "✍️ Writing / Journal", fillClass: "fill-writing" }
  ];

  document.getElementById("total-skills-hours").textContent = `${totalHours.toFixed(1)} hrs logged`;

  skills.forEach(skill => {
    const hours = cat[skill.key] || 0;
    const pct = totalHours > 0 ? ((hours / safeTotal) * 100).toFixed(1) : "0.0";

    const labelEl = document.getElementById(`hours-${skill.key}`);
    const barEl = document.getElementById(`bar-${skill.key}`);

    if (labelEl) labelEl.textContent = `${hours.toFixed(1)}h (${pct}%)`;
    if (barEl) barEl.style.width = `${pct}%`;
  });
}

// Render Calendar Grid for September 2026
function renderCalendar(daily) {
  const container = document.getElementById("calendar-view");
  container.innerHTML = "";

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  daysOfWeek.forEach(dow => {
    const h = document.createElement("div");
    h.className = "day-header";
    h.textContent = dow;
    container.appendChild(h);
  });

  // September 2026 starts on Tuesday (offset 1 from Monday)
  // For 2026-09-01 to 2026-09-20 (past days before kickoff), render muted
  // For 2026-09-21 to 2026-09-30 (project duration in Sep)
  
  // 1st of Sep 2026 is Tuesday -> 1 empty cell padding
  const emptyCell = document.createElement("div");
  emptyCell.className = "calendar-cell";
  emptyCell.style.opacity = "0.2";
  emptyCell.style.pointerEvents = "none";
  container.appendChild(emptyCell);

  for (let day = 1; day <= 30; day++) {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const dateStr = `2026-09-${dayStr}`;
    const record = daily ? daily[dateStr] : null;
    const hours = record ? record.hours : 0;
    const isProjectActive = day >= 21;

    const cell = document.createElement("div");
    cell.className = "calendar-cell";

    if (!isProjectActive) {
      cell.style.opacity = "0.35";
      cell.innerHTML = `<span>${day}</span>`;
    } else {
      if (hours > 0) {
        cell.classList.add("has-hours");
        if (hours >= 3.3) cell.classList.add("target-met");
      }
      cell.innerHTML = `
        <span style="font-weight: 600;">${day}</span>
        <span class="cell-hours">${hours > 0 ? hours + 'h' : '-'}</span>
        <div class="cell-tooltip">
          <strong>${dateStr}</strong><br>
          Hours: ${hours.toFixed(1)}h<br>
          ${record && record.notes ? record.notes : (day === 21 ? 'Day 1: Project Kickoff!' : 'No logs yet')}
        </div>
      `;
    }
    container.appendChild(cell);
  }
}

// Render Recent Study Feed
function renderLogs(daily) {
  const container = document.getElementById("logs-feed");
  container.innerHTML = "";

  if (!daily || Object.keys(daily).length === 0) {
    container.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted);">No logs available yet.</p>`;
    return;
  }

  // Only actual logged days — the pre-populated future days in the monthly template
  // (0 hrs, no notes) aren't "recent" activity and were burying real entries below them.
  const sortedDates = Object.keys(daily)
    .filter(d => daily[d].hours > 0 || daily[d].notes)
    .sort()
    .reverse();

  if (sortedDates.length === 0) {
    container.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted);">No logs available yet.</p>`;
    return;
  }

  sortedDates.forEach(d => {
    const item = daily[d];
    const entry = document.createElement("div");
    entry.className = "log-entry";

    entry.innerHTML = `
      <div class="log-header">
        <span class="log-date">${item.date}</span>
        <span class="log-hours-badge">${item.hours.toFixed(1)} hrs</span>
      </div>
      <div class="log-notes">${item.notes || 'No notes for this session.'}</div>
    `;

    container.appendChild(entry);
  });
}

// Render Vocabulary Cards with instant search
function renderVocabulary(vocabList) {
  const container = document.getElementById("vocab-cards");
  const countTag = document.getElementById("vocab-counter-tag");
  const searchInput = document.getElementById("vocab-search");

  const list = vocabList || [];
  countTag.textContent = `${list.length} terms`;

  function displayItems(items) {
    container.innerHTML = "";
    if (items.length === 0) {
      container.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted); padding: 12px;">No vocabulary matched your query.</p>`;
      return;
    }

    items.forEach(item => {
      const card = document.createElement("div");
      card.className = "vocab-card";
      card.innerHTML = `
        <div class="vocab-term">${item.term}</div>
        <div class="vocab-meaning">${item.meaning}</div>
        ${item.context ? `<div style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 4px;">📌 ${item.context}</div>` : ''}
        ${item.example ? `<div class="vocab-example">${item.example}</div>` : ''}
      `;
      container.appendChild(card);
    });
  }

  displayItems(list);

  searchInput.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      displayItems(list);
      return;
    }
    const filtered = list.filter(item => 
      item.term.toLowerCase().includes(q) || 
      item.meaning.toLowerCase().includes(q) ||
      (item.context && item.context.toLowerCase().includes(q))
    );
    displayItems(filtered);
  });
}

// Calculator & Daily Log Snippet Generator
function initCalculator() {
  const modal = document.getElementById("calculator-modal");
  const openBtn = document.getElementById("open-calculator-btn");
  const closeBtn = document.getElementById("close-modal-btn");
  const generateBtn = document.getElementById("calc-generate-btn");
  const outputBox = document.getElementById("calc-output");

  openBtn.addEventListener("click", () => {
    modal.classList.add("active");
  });

  closeBtn.addEventListener("click", () => {
    modal.classList.remove("active");
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("active");
  });

  generateBtn.addEventListener("click", () => {
    const dateVal = document.getElementById("calc-date").value || "2026-09-21";
    const listening = parseFloat(document.getElementById("calc-listening").value) || 0;
    const speaking = parseFloat(document.getElementById("calc-speaking").value) || 0;
    const reading = parseFloat(document.getElementById("calc-reading").value) || 0;
    const writing = parseFloat(document.getElementById("calc-writing").value) || 0;
    const notes = document.getElementById("calc-notes").value.trim() || "Daily study session completed.";

    const total = listening + speaking + reading + writing;

    const snippet = `## ${dateVal}
- **Total Time**: ${total.toFixed(1)} hrs
  - [${listening > 0 ? 'x' : ' '}] Listening / Podcast: ${listening.toFixed(1)} hr
  - [${speaking > 0 ? 'x' : ' '}] Speaking / Online Lesson: ${speaking.toFixed(1)} hr
  - [${reading > 0 ? 'x' : ' '}] Reading / Grammar / Vocab: ${reading.toFixed(1)} hr
  - [${writing > 0 ? 'x' : ' '}] Writing / Journal: ${writing.toFixed(1)} hr
- **Notes & Takeaways**:
  - ${notes}`;

    outputBox.style.display = "block";
    outputBox.textContent = snippet;

    navigator.clipboard.writeText(snippet).then(() => {
      generateBtn.textContent = "✓ Copied to Clipboard!";
      setTimeout(() => {
        generateBtn.textContent = "Generate & Copy Markdown Snippet";
      }, 2500);
    }).catch(() => {
      generateBtn.textContent = "Generated below!";
    });
  });
}

// Initial Boot
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initCalculator();
  initScrollAnimations();
  initROITableSorting();
  loadData();
  renderCommitStreak();
});

// Daily Commit Streak — GitHub commit history for THIS repo only
// (scoped via the repo commits API, not a user-wide contributions image)
async function renderCommitStreak() {
  const gridEl = document.getElementById("commit-streak-grid");
  const monthsEl = document.getElementById("commit-streak-months");
  if (!gridEl) return;

  const OWNER = "daikiito-dk";
  const REPO = "english-5000hours";
  const WEEKS = 53;
  const CACHE_KEY = `commitStreak:${OWNER}/${REPO}`;
  const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

  const dayCounts = await fetchRepoCommitCounts(OWNER, REPO, WEEKS, CACHE_KEY, CACHE_TTL_MS);
  if (!dayCounts) {
    gridEl.innerHTML = "";
    monthsEl.innerHTML = "";
    const msg = document.createElement("p");
    msg.style.cssText = "font-size: 0.85rem; color: var(--text-muted); margin: 0;";
    msg.innerHTML = `Couldn't load commit history from the GitHub API (rate limit or offline). <a href="https://github.com/${OWNER}/${REPO}/commits/main" target="_blank" rel="noopener" style="color: var(--accent-primary);">View commits on GitHub →</a>`;
    gridEl.parentElement.insertBefore(msg, gridEl);
    return;
  }

  renderCommitHeatmap(gridEl, monthsEl, dayCounts, WEEKS);
}

async function fetchRepoCommitCounts(owner, repo, weeks, cacheKey, cacheTtlMs) {
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
    if (cached && Date.now() - cached.fetchedAt < cacheTtlMs) {
      return cached.counts;
    }
  } catch (e) {
    // localStorage unavailable (private mode) — ignore and fetch fresh
  }

  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);

  const counts = {};
  try {
    let page = 1;
    while (page <= 5) {
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits?since=${since.toISOString()}&per_page=100&page=${page}`,
        { headers: { Accept: "application/vnd.github+json" } }
      );
      if (!res.ok) throw new Error(`GitHub API responded ${res.status}`);
      const batch = await res.json();
      batch.forEach((c) => {
        const iso = c.commit && c.commit.author && c.commit.author.date;
        if (!iso) return;
        const dateStr = toLocalDateStr(new Date(iso));
        counts[dateStr] = (counts[dateStr] || 0) + 1;
      });
      if (batch.length < 100) break;
      page++;
    }
  } catch (err) {
    console.warn("Could not fetch commit history:", err);
    return null;
  }

  try {
    localStorage.setItem(cacheKey, JSON.stringify({ counts, fetchedAt: Date.now() }));
  } catch (e) {
    // storage full/unavailable — non-fatal
  }
  return counts;
}

// Local calendar-day key (not UTC) so grid cells and commit timestamps
// line up regardless of the viewer's timezone offset.
function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function commitLevel(count) {
  if (!count) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

function renderCommitHeatmap(gridEl, monthsEl, counts, weeks) {
  gridEl.innerHTML = "";
  monthsEl.innerHTML = "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start of the grid: the Sunday that begins the earliest visible week.
  const start = new Date(today);
  start.setDate(start.getDate() - today.getDay() - (weeks - 1) * 7);

  const monthLabels = new Array(weeks).fill("");
  let lastMonth = -1;

  for (let week = 0; week < weeks; week++) {
    for (let day = 0; day < 7; day++) {
      const date = new Date(start);
      date.setDate(date.getDate() + week * 7 + day);

      const cell = document.createElement("div");

      if (date > today) {
        cell.className = "commit-cell is-empty";
      } else {
        const dateStr = toLocalDateStr(date);
        const count = counts[dateStr] || 0;
        cell.className = `commit-cell level-${commitLevel(count)}`;
        cell.title = `${dateStr}: ${count} commit${count === 1 ? "" : "s"}`;
      }
      gridEl.appendChild(cell);

      if (day === 0 && date.getMonth() !== lastMonth && date <= today) {
        lastMonth = date.getMonth();
        monthLabels[week] = date.toLocaleDateString("en-US", { month: "short" });
      }
    }
  }

  monthLabels.forEach((label) => {
    const el = document.createElement("div");
    el.textContent = label;
    monthsEl.appendChild(el);
  });
}

// Scroll Fade-In Animation
function initScrollAnimations() {
  // Apply fade-in class to all major sections
  const sections = document.querySelectorAll(
    "section, .glass-card, .roi-kpi-card, .matrix-card, .phase-card"
  );

  sections.forEach(el => {
    el.classList.add("fade-in-section");
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
  );

  sections.forEach(el => observer.observe(el));

  // Active jump link highlighting on scroll
  const jumpLinks = document.querySelectorAll(".jump-link");
  const sectionTargets = Array.from(jumpLinks).map(link => {
    const id = link.getAttribute("href").slice(1);
    return { link, el: document.getElementById(id) };
  }).filter(({ el }) => el != null);

  const scrollSpy = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          jumpLinks.forEach(l => l.style.color = "");
          const active = sectionTargets.find(({ el }) => el === entry.target);
          if (active) {
            active.link.style.color = "var(--accent-primary)";
          }
        }
      });
    },
    { threshold: 0.3 }
  );

  sectionTargets.forEach(({ el }) => scrollSpy.observe(el));
}
