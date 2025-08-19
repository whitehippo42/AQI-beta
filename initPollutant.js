// ===================================
// AIRSIGHT PROJECT - POLLUTANTS MODULE
// COMPLETE FIXED VERSION - All functions working
// ===================================

let pollutantChart = null;
let currentFilter = "daily";
let currentPollutant = "PM2.5";
let currentYear = window.AirSightDate.getCurrentYear();
let currentMonth = window.AirSightDate.getCurrentMonth();

// Global flag to prevent multiple initializations
window.pollutantInitialized = false;

// Global variables for dropdown selections
window.selectedMonth = null;
window.selectedPollutant = null;
window.selectedYear = null;

// NEW: cache so clicking Hourly/Daily/Weekly doesn’t rewrite the top tiles or calendar
let lastCalendarYear = null;
let lastCalendarMonth = null;
let cachedHighestTiles = null;

/* ------------------------- MAIN INIT ------------------------- */
async function initPollutant(filter = "daily", pollutant = "PM2.5") {
  try {
    currentFilter = filter;
    currentPollutant = pollutant;

    // Use centralized date system
    currentYear = window.AirSightDate.getCurrentYear();
    currentMonth = window.AirSightDate.getCurrentMonth();

    console.log(`🚀 Initializing pollutants page: ${filter} ${pollutant} for ${currentYear}-${currentMonth}`);

    cleanupExistingChart();
    addPollutantDateControls();
    setupPollutantEventListeners();

    // reset caches so first load paints everything
    lastCalendarYear = null;
    lastCalendarMonth = null;
    cachedHighestTiles = null;

    await updatePollutantData();

    console.log("✅ Pollutants page initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing pollutant page:", error);
    showPollutantError(error.message);
  }
}

/* --------------------- YEAR DROPDOWN (unchanged) --------------------- */
function createProfessionalYearDropdown() {
  console.log("📅 Creating professional year dropdown...");

  const existingDropdown = document.querySelector(".year-dropdown-container");
  if (existingDropdown) existingDropdown.remove();

  const yearSelect = document.getElementById("year-select");
  if (!yearSelect) {
    console.log("❌ Year select not found");
    return;
  }

  const currentYearVal = yearSelect.value;
  const years = [
    { value: 2024, name: "2024" },
    { value: 2025, name: "2025" },
    { value: 2026, name: "2026" },
  ];

  const now = new Date();
  const currentActualYear = now.getFullYear();

  const dropdownHTML = `
    <div class="year-dropdown-container">
      <div class="year-dropdown-trigger" tabindex="0">
        <span class="selected-year">${currentYearVal}</span>
        <svg class="year-dropdown-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>
      <div class="year-dropdown-menu">
        ${years
          .map(
            (year) => `
          <div class="year-option ${year.value == currentYearVal ? "selected" : ""} ${
              year.value === currentActualYear ? "current" : ""
            }" data-value="${year.value}">
            <span>${year.name}</span>
          </div>`
          )
          .join("")}
      </div>
    </div>
  `;

  yearSelect.parentNode.insertAdjacentHTML("afterend", dropdownHTML);
  yearSelect.style.display = "none";

  const container = document.querySelector(".year-dropdown-container");
  const trigger = container.querySelector(".year-dropdown-trigger");
  const menu = container.querySelector(".year-dropdown-menu");
  const selectedSpan = container.querySelector(".selected-year");
  const options = container.querySelectorAll(".year-option");

  function openDropdown() {
    trigger.classList.add("active");
    menu.classList.add("show");
    const selectedOption = menu.querySelector(".year-option.selected");
    if (selectedOption) selectedOption.scrollIntoView({ block: "nearest" });
  }
  function closeDropdown() {
    trigger.classList.remove("active");
    menu.classList.remove("show");
  }
  function toggleDropdown(e) {
    e.stopPropagation();
    menu.classList.contains("show") ? closeDropdown() : openDropdown();
  }
  function selectYear(e) {
    const option = e.currentTarget;
    const value = option.getAttribute("data-value");
    const yearName = option.querySelector("span").textContent;

    options.forEach((opt) => opt.classList.remove("selected"));
    option.classList.add("selected");

    selectedSpan.textContent = yearName;
    yearSelect.value = value;
    window.selectedYear = parseInt(value, 10);

    setTimeout(closeDropdown, 150);
    console.log(`📅 Selected year: ${yearName} - NO auto-update`);
  }

  trigger.addEventListener("click", toggleDropdown);
  options.forEach((option) => option.addEventListener("click", selectYear));

  trigger.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleDropdown(event);
    } else if (event.key === "Escape") {
      closeDropdown();
    }
  });

  document.addEventListener("click", (event) => {
    if (!container.contains(event.target)) closeDropdown();
  });

  window.addEventListener(
    "scroll",
    () => {
      if (menu.classList.contains("show")) closeDropdown();
    },
    { passive: true }
  );

  console.log("✅ Professional year dropdown created (no auto-update)");

  return {
    open: openDropdown,
    close: closeDropdown,
    toggle: toggleDropdown,
    setValue: (value) => {
      const option = menu.querySelector(`[data-value="${value}"]`);
      if (option) {
        option.click();
      }
    },
    getValue: () => window.selectedYear || parseInt(yearSelect.value, 10),
  };
}

/* ------------------ HIGHEST FROM CHART + MERGE ------------------ */
function computeHighestFromChart(chartData, pollutant) {
  if (!chartData || !Array.isArray(chartData.data) || chartData.data.length === 0) {
    return null;
  }
  const data = chartData.data.map(Number);
  let maxVal = -Infinity,
    maxIdx = -1;
  for (let i = 0; i < data.length; i++) {
    if (!Number.isFinite(data[i])) continue;
    if (data[i] > maxVal) {
      maxVal = data[i];
      maxIdx = i;
    }
  }
  if (maxIdx < 0) return null;

  const label = chartData.labels?.[maxIdx] ?? "";
  let day = "--",
    month_name = getMonthName(currentMonth);
  const m = /^([A-Za-z]{3,})\s+(\d{1,2})$/.exec(label);
  if (m) {
    month_name = m[1];
    day = parseInt(m[2], 10);
  }

  return {
    pollutant,
    date: label,
    day,
    month_name,
    concentration: Number(maxVal.toFixed(1)),
    unit: getPollutantUnit(pollutant),
  };
}

function mergeHighestWithComputed(existingHighest, computedItem) {
  const requiredOrder = ["PM2.5", "PM10", "NO2", "SO2", "CO", "O3"];
  const byPollutant = {};
  (existingHighest || []).forEach((d) => {
    if (d && d.pollutant) byPollutant[d.pollutant] = d;
  });
  if (computedItem) byPollutant[computedItem.pollutant] = computedItem;

  return requiredOrder.map(
    (p) => byPollutant[p] || { pollutant: p, date: "--", concentration: "--", unit: "", day: "--", month_name: "" }
  );
}

/* ------------------------- CORE UPDATE ------------------------- */
async function updatePollutantData() {
  try {
    // read selections
    const yearSelect = document.getElementById("year-select");
    const monthSelect = document.getElementById("month-select");

    const prevYear = currentYear;
    const prevMonth = currentMonth;

    currentYear = yearSelect ? parseInt(yearSelect.value, 10) : currentYear;
    currentMonth = window.selectedMonth || (monthSelect ? parseInt(monthSelect.value, 10) : currentMonth);
    currentPollutant = window.selectedPollutant || currentPollutant;

    // filter (hourly/daily/weekly)
    const activeFilterBtn = document.querySelector("#filterButtons .filter-btn.active");
    if (activeFilterBtn) {
      const filterText = activeFilterBtn.textContent.trim().toLowerCase();
      currentFilter = ["hourly", "daily", "weekly"].includes(filterText) ? filterText : currentFilter;
    }

    const calendarNeedsUpdate = lastCalendarYear === null ||
      lastCalendarMonth === null ||
      currentYear !== lastCalendarYear ||
      currentMonth !== lastCalendarMonth;

    console.log("🔄 Fetching pollutant data for:", {
      pollutant: currentPollutant,
      filter: currentFilter,
      year: currentYear,
      month: currentMonth,
      calendarNeedsUpdate,
    });

    const url = `${API_BASE_URL}/pollutants?year=${currentYear}&month=${currentMonth}&filter=${currentFilter}&pollutant=${currentPollutant}`;
    console.log("📡 API URL:", url);

    const response = await fetch(url);
    console.log("📡 Response status:", response.status);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

    const data = await response.json();
    console.log("✅ Received API data:", data);

    // 1) CHART: always refresh for current filter/pollutant
    if (data.chart_data && data.chart_data.labels && data.chart_data.data) {
      console.log("📊 Updating chart with real data:", data.chart_data);
      updatePollutantChart(data.chart_data);
    } else {
      console.warn("❌ Chart data missing, using fallback");
      createFallbackChart();
    }

    // 2) HIGHEST TILES:
    //    build a merged/normalized array and cache it ONLY when month/year changes.
    const computedFromChart = computeHighestFromChart(data.chart_data, currentPollutant);
    const mergedTiles = mergeHighestWithComputed(data.highest_concentration || [], computedFromChart);

    if (calendarNeedsUpdate || !cachedHighestTiles) {
      cachedHighestTiles = mergedTiles; // refresh cache on month/year change or first run
    }
    // render from cache so clicking filter doesn't wipe tiles
    updateHighestConcentration(cachedHighestTiles);

    // 3) CALENDAR: only refresh when year/month changes
    if (calendarNeedsUpdate) {
      if (data.calendar_data && Array.isArray(data.calendar_data) && data.calendar_data.length > 0) {
        console.log("📅 Updating calendar with real data:", data.calendar_data.length, "days");
        const monthYearDisplay = data.month_year || `${getMonthName(currentMonth)} ${currentYear}`;
        updateMonthlyCalendar(data.calendar_data, monthYearDisplay);
      } else {
        console.warn("❌ Calendar data missing, generating fallback");
        generateFallbackCalendar();
      }

      // advance the cache window
      lastCalendarYear = currentYear;
      lastCalendarMonth = currentMonth;
    } else {
      console.log("🧠 Skipped calendar & tiles refresh (filter change only)");
    }

    console.log("✅ All data updated successfully");
  } catch (error) {
    console.error("❌ Error updating pollutant data:", error);
    showPollutantError(error.message);
    createFallbackChart();
    // do not blow away existing calendar/tiles on error
    if (lastCalendarYear === null || lastCalendarMonth === null) {
      generateFallbackCalendar();
    }
  }
}

/* ------------------------- CHART ------------------------- */
function updatePollutantChart(chartData) {
  console.log("📊 Creating chart with data:", chartData);

  if (!chartData || !chartData.labels || !chartData.data) {
    console.error("❌ Invalid chart data structure");
    createFallbackChart();
    return;
  }

  const canvas = document.getElementById("pollutantChart");
  if (!canvas) {
    console.error("❌ Chart canvas not found");
    return;
  }

  cleanupExistingChart();

  const ctx = canvas.getContext("2d");
  const processedData = chartData.data.map((val) => parseFloat(val));
  const backgroundColors = processedData.map((val) => getBarColor(val));

  try {
    pollutantChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: `${currentPollutant} Concentration`,
            data: processedData,
            backgroundColor: backgroundColors,
            borderRadius: 10,
            borderSkipped: false,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1000,
          easing: "easeOutElastic",
          animateScale: true,
          animateRotate: false,
        },
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: `${currentPollutant} - ${currentFilter.charAt(0).toUpperCase() + currentFilter.slice(1)} Data (Live!)`,
            font: { size: 16, weight: "bold" },
            color: "#22c55e",
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const val = parseFloat(context.raw).toFixed(1);
                const unit = getPollutantUnit(currentPollutant);
                return `${currentPollutant}: ${val} ${unit}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: "#374151",
              font: { size: 12, weight: "bold" },
            },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: "#374151",
              font: { size: 12 },
              callback: (val) => `${val}`,
            },
            grid: { display: false },
          },
        },
      },
    });

    console.log("✅ Chart created successfully with", processedData.length, "data points");
  } catch (error) {
    console.error("❌ Chart creation failed:", error);
    createFallbackChart();
  }
}

/* ------------------- HIGHEST CONCENTRATION TILES ------------------- */
function updateHighestConcentration(highestData) {
  // Normalize to 6 pollutants; fill missing with placeholders if API omitted any
  const requiredOrder = ["PM2.5", "PM10", "NO2", "SO2", "CO", "O3"];
  const byPollutant = {};
  (highestData || []).forEach((d) => {
    if (d && d.pollutant) byPollutant[d.pollutant] = d;
  });
  const normalized = requiredOrder.map(
    (p) => byPollutant[p] || { pollutant: p, date: "--", concentration: "--", unit: "", day: "--", month_name: "" }
  );

  console.log("🏆 Updating highest concentration display:", normalized);

  const container = document.getElementById("highest-concentration-grid");
  if (!container) {
    console.log("❌ Highest concentration container not found");
    return;
  }

  let html = "";
  normalized.forEach((item) => {
    const colorClass = getConcentrationColor(item.pollutant, Number(item.concentration));

    html += `
      <div class="space-y-1">
        <p class="text-sm text-gray-500">
          <span class="text-2xl font-bold text-gray-900">${item.day ?? "--"}</span> ${item.month_name ?? ""}
        </p>
        <p class="font-semibold text-gray-800">${item.pollutant}</p>
        <p class="text-lg font-bold ${colorClass}">
          ${item.concentration} ${item.unit || getPollutantUnit(item.pollutant)}
        </p>
      </div>
    `;
  });

  container.innerHTML = html;
  console.log("✅ Highest concentration display updated");
}

function getConcentrationColor(pollutant, concentration) {
  const thresholds = {
    "PM2.5": { moderate: 35, unhealthy: 55 },
    PM10: { moderate: 155, unhealthy: 255 },
    O3: { moderate: 70, unhealthy: 85 },
    NO2: { moderate: 54, unhealthy: 100 },
    SO2: { moderate: 36, unhealthy: 75 },
    CO: { moderate: 9, unhealthy: 15 },
  };
  const threshold = thresholds[pollutant];
  if (!threshold || !Number.isFinite(concentration)) return "text-gray-600";
  if (concentration <= threshold.moderate) return "text-green-500";
  else if (concentration <= threshold.unhealthy) return "text-yellow-500";
  else return "text-red-500";
}

/* ------------------------- CALENDAR ------------------------- */
function updateMonthlyCalendar(calendarData, monthYear) {
  console.log("📅 Updating calendar with", calendarData.length, "days for", monthYear);

  const monthYearSpan = document.querySelector(".month-title");
  if (monthYearSpan) monthYearSpan.textContent = monthYear;

  const calendarGrid = document.querySelector(".grid.grid-cols-7");
  if (!calendarGrid) {
    console.log("❌ Calendar grid not found");
    return;
  }

  const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
  const daysInMonth = calendarData.length;
  const totalCells = firstDay + daysInMonth;
  const weeksNeeded = Math.ceil(totalCells / 7);

  const headerHTML = `
    <div class="calendar-header-cell">Sun</div>
    <div class="calendar-header-cell">Mon</div>
    <div class="calendar-header-cell">Tue</div>
    <div class="calendar-header-cell">Wed</div>
    <div class="calendar-header-cell">Thu</div>
    <div class="calendar-header-cell">Fri</div>
    <div class="calendar-header-cell">Sat</div>
  `;

  let calendarHTML = headerHTML;

  for (let i = 0; i < firstDay; i++) {
    calendarHTML += '<div class="calendar-empty-cell"></div>';
  }

  const now = new Date();
  const todayDay = now.getDate();
  const todayMonth = now.getMonth() + 1;
  const todayYear = now.getFullYear();

  calendarData.forEach((dayData) => {
    const isToday = dayData.day === todayDay && currentMonth === todayMonth && currentYear === todayYear;
    const todayClass = isToday ? " calendar-today" : "";

    const { bgColor, textColor, borderColor } = getCorrectAQIColors(dayData.aqi);
    const aqiLevel = getAQICategory(dayData.aqi);
    const iconElement = getGifAnimation(dayData.aqi);
    const monthName = getMonthName(currentMonth);
    const healthAdvice = getHealthAdvice(dayData.aqi);

    calendarHTML += `
      <div class="calendar-day-with-tooltip ${bgColor} ${borderColor}${todayClass}" 
           data-aqi="${dayData.aqi}" 
           data-pollutant="${dayData.main_pollutant}"
           data-day="${dayData.day}"
           title="${monthName} ${dayData.day}, ${currentYear} - AQI: ${dayData.aqi} (${aqiLevel}) - Main: ${dayData.main_pollutant} - ${healthAdvice}">
        <div class="calendar-day-header">
          <span class="day-number">${dayData.day}</span>
          <div class="icon-container">
            ${iconElement}
          </div>
        </div>
        <div class="calendar-day-footer">
          <div class="aqi-info-card">
            <div class="aqi-value ${textColor}">AQI: ${dayData.aqi}</div>
            <div class="aqi-level">${aqiLevel}</div>
            <div class="main-pollutant">Top: ${dayData.main_pollutant}</div>
          </div>
        </div>
        <div class="css-tooltip">
          <div class="css-tooltip-content">
            <div class="tooltip-header">${monthName} ${dayData.day}, ${currentYear}</div>
            <div class="tooltip-aqi">AQI: ${dayData.aqi} (${aqiLevel})</div>
            <div class="tooltip-pollutant">Main: ${dayData.main_pollutant}</div>
            <div class="tooltip-advice">${healthAdvice}</div>
            ${isToday ? '<div class="tooltip-today">📍 Today</div>' : ""}
          </div>
          <div class="css-tooltip-arrow"></div>
        </div>
      </div>
    `;
  });

  const currentCells = firstDay + daysInMonth;
  const cellsInCurrentWeek = currentCells % 7;
  if (cellsInCurrentWeek > 0) {
    const emptyCellsNeeded = 7 - cellsInCurrentWeek;
    for (let i = 0; i < emptyCellsNeeded; i++) {
      calendarHTML += '<div class="calendar-empty-cell"></div>';
    }
  }

  calendarGrid.style.gridTemplateRows = `auto repeat(${weeksNeeded}, 110px)`;
  calendarGrid.innerHTML = calendarHTML;

  console.log(`✅ Calendar updated with CSS tooltips: ${weeksNeeded} weeks, ${currentCells} total cells`);
}

/* --------------------- ICONS & COLORS HELPERS --------------------- */
function getGifAnimation(aqi) {
  if (aqi <= 50) {
    return `<div class="aqi-icon-container">
      <img src="./images/sun1-ezgif.com-gif-maker.gif" alt="Good AQI" class="aqi-gif-icon"
           onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
      <div class="emoji-fallback" style="display: none;">☀️</div>
    </div>`;
  } else if (aqi <= 100) {
    return `<div class="aqi-icon-container">
      <img src="./images/cloudy-ezgif.com-gif-maker.gif" alt="Moderate AQI" class="aqi-gif-icon"
           onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
      <div class="emoji-fallback" style="display: none;">⛅</div>
    </div>`;
  } else if (aqi <= 150) {
    return `<div class="aqi-icon-container">
      <img src="./images/clouds-ezgif.com-gif-maker.gif" alt="Unhealthy AQI" class="aqi-gif-icon"
           onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
      <div class="emoji-fallback" style="display: none;">🌫️</div>
    </div>`;
  } else {
    return `<div class="aqi-icon-container">
      <img src="./images/thunder-ezgif.com-gif-maker.gif" alt="Dangerous AQI" class="aqi-gif-icon"
           onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
      <div class="emoji-fallback" style="display: none;">⛈️</div>
    </div>`;
  }
}

function getCorrectAQIColors(aqi) {
  if (aqi <= 50) {
    return { bgColor: "bg-green-50", textColor: "text-green-800", borderColor: "border-green-300" };
  } else if (aqi <= 100) {
    return { bgColor: "bg-yellow-50", textColor: "text-yellow-800", borderColor: "border-yellow-400" };
  } else if (aqi <= 150) {
    return { bgColor: "bg-orange-50", textColor: "text-orange-800", borderColor: "border-orange-400" };
  } else {
    return { bgColor: "bg-red-50", textColor: "text-red-800", borderColor: "border-red-400" };
  }
}

/* --------------------- FALLBACKS & HELPERS --------------------- */
function generateFallbackCalendar() {
  console.log("📅 Generating fallback calendar");

  const monthYearSpan = document.querySelector(".month-title");
  if (monthYearSpan) monthYearSpan.textContent = `${getMonthName(currentMonth)} ${currentYear}`;

  const fakeDays = [];
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    fakeDays.push({
      day,
      aqi: Math.floor(Math.random() * 100) + 20,
      category: getAQICategory(Math.floor(Math.random() * 100) + 20),
      main_pollutant: ["PM2.5", "O3", "NO2"][Math.floor(Math.random() * 3)],
    });
  }
  updateMonthlyCalendar(fakeDays, `${getMonthName(currentMonth)} ${currentYear} (Fallback)`);
}

function getPollutantUnit(pollutant) {
  const units = { "PM2.5": "µg/m³", PM10: "µg/m³", CO: "ppm", NO2: "ppb", SO2: "ppb", O3: "ppb" };
  return units[pollutant] || "µg/m³";
}

function getBarColor(value) {
  const v = parseFloat(value);
  if (isNaN(v)) return "#9ca3af";
  if (v <= 25) return "#22c55e";
  if (v <= 50) return "#facc15";
  if (v <= 75) return "#f97316";
  return "#ef4444";
}

function getAQICategory(aqi) {
  const numValue = parseFloat(aqi);
  if (isNaN(numValue)) return "Invalid";
  if (numValue <= 50) return "Good";
  else if (numValue <= 100) return "Moderate";
  else if (numValue <= 150) return "Unhealthy for Sensitive";
  else if (numValue <= 200) return "Unhealthy";
  else if (numValue <= 300) return "Very Unhealthy";
  else return "Hazardous";
}

function getHealthAdvice(aqi) {
  if (aqi <= 50) return "👍 Great for outdoor activities!";
  else if (aqi <= 100) return "😐 Moderate - limit prolonged outdoor exertion";
  else if (aqi <= 150) return "😷 Sensitive groups should avoid outdoor activities";
  else return "🚨 Everyone should avoid outdoor activities";
}

function getMonthName(monthNumber) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[monthNumber - 1] || "Unknown";
}

function cleanupExistingChart() {
  const canvas = document.getElementById("pollutantChart");
  if (!canvas) return;

  if (pollutantChart) {
    pollutantChart.destroy();
    pollutantChart = null;
  }

  const existingChart = Chart.getChart(canvas);
  if (existingChart) existingChart.destroy();

  console.log("🧹 Cleaned up existing chart");
}

function createFallbackChart() {
  console.log("📊 Creating fallback chart for filter:", currentFilter);

  const canvas = document.getElementById("pollutantChart");
  if (!canvas) {
    console.error("❌ Canvas not found for fallback chart");
    return;
  }

  const ctx = canvas.getContext("2d");
  cleanupExistingChart();

  const fallbackData = generateFallbackData();

  try {
    pollutantChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: fallbackData.labels,
        datasets: [
          {
            label: `${currentPollutant} Data (${currentFilter}) - Fallback`,
            data: fallbackData.data,
            backgroundColor: fallbackData.data.map((val) => getBarColor(val)),
            borderRadius: 8,
            borderWidth: 2,
            borderColor: "#ffffff",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `${currentPollutant} - ${currentFilter.toUpperCase()} (Fallback Chart)`,
            font: { size: 16, weight: "bold" },
            color: "#ef4444",
          },
          legend: { display: false },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#ef4444" } },
          y: { beginAtZero: true, max: 100, ticks: { color: "#ef4444" } },
        },
      },
    });

    console.log("⚠️ Fallback chart created");
  } catch (error) {
    console.error("❌ Fallback chart creation failed:", error);
  }
}

function generateFallbackData() {
  const data = { labels: [], data: [] };

  if (currentFilter === "hourly") {
    for (let i = 0; i < 8; i++) {
      const hour = i * 3;
      data.labels.push(`${hour.toString().padStart(2, "0")}:00`);
      data.data.push(Math.floor(Math.random() * 60) + 20);
    }
  } else if (currentFilter === "weekly") {
    ["Week 1", "Week 2", "Week 3", "Week 4"].forEach((week) => {
      data.labels.push(week);
      data.data.push(Math.floor(Math.random() * 50) + 30);
    });
  } else {
    for (let i = 1; i <= 14; i++) {
      const date = new Date(currentYear, currentMonth - 1, i);
      data.labels.push(date.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
      data.data.push(Math.floor(Math.random() * 70) + 20);
    }
  }

  return data;
}

/* -------------------- EVENT LISTENERS / UI -------------------- */
function setupPollutantEventListeners() {
  console.log("🔧 Setting up event listeners...");
  setupFilterButtons();
  console.log("✅ All event listeners setup completed");
}

function setupFilterButtons() {
  const filterButtons = document.querySelectorAll("#filterButtons .filter-btn");
  console.log("Found filter buttons:", filterButtons.length);

  filterButtons.forEach((btn, index) => {
    btn.removeEventListener("click", btn._pollutantClickHandler);

    const handleFilterClick = async (e) => {
      e.preventDefault();
      e.stopPropagation();

      console.log(`🔄 Filter button ${index} clicked:`, btn.textContent);

      if (btn.classList.contains("processing")) return;

      btn.classList.add("processing");
      try {
        filterButtons.forEach((b) => {
          b.classList.remove("active");
          b.classList.remove("processing");
        });
        btn.classList.add("active");

        const buttonText = btn.textContent.trim().toLowerCase();
        currentFilter = ["hourly", "daily", "weekly"].includes(buttonText) ? buttonText : "daily";

        console.log("🔄 Filter set to:", currentFilter);

        showPollutantLoading();
        await updatePollutantData(); // will only update chart & keep tiles/calendar intact
        hidePollutantLoading();
      } catch (error) {
        console.error("❌ Filter change error:", error);
        hidePollutantLoading();
      } finally {
        btn.classList.remove("processing");
      }
    };

    btn.addEventListener("click", handleFilterClick);
    btn._pollutantClickHandler = handleFilterClick;
  });
}

/* --------------------- MONTH / POLLUTANT DROPDOWNS --------------------- */
function createProfessionalMonthDropdown() {
  console.log("🎨 Creating professional month dropdown (no auto-update)...");

  const existingDropdown = document.querySelector(".month-dropdown-container");
  if (existingDropdown) existingDropdown.remove();

  const monthSelect = document.getElementById("month-select");
  if (!monthSelect) {
    console.log("❌ Month select not found");
    return;
  }

  const currentMonthVal = monthSelect.value;
  const currentMonthName = getMonthName(parseInt(currentMonthVal, 10));

  const months = [
    { value: 1, name: "January" },
    { value: 2, name: "February" },
    { value: 3, name: "March" },
    { value: 4, name: "April" },
    { value: 5, name: "May" },
    { value: 6, name: "June" },
    { value: 7, name: "July" },
    { value: 8, name: "August" },
    { value: 9, name: "September" },
    { value: 10, name: "October" },
    { value: 11, name: "November" },
    { value: 12, name: "December" },
  ];

  const now = new Date();
  const currentActualMonth = now.getMonth() + 1;

  const dropdownHTML = `
    <div class="month-dropdown-container">
      <div class="month-dropdown-trigger" tabindex="0">
        <span class="selected-month">${currentMonthName}</span>
        <svg class="dropdown-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>
      <div class="month-dropdown-menu">
        ${months
          .map(
            (month) => `
          <div class="month-option ${month.value == currentMonthVal ? "selected" : ""} ${
              month.value === currentActualMonth ? "current" : ""
            }" data-value="${month.value}">
            <span>${month.name}</span>
          </div>`
          )
          .join("")}
      </div>
    </div>
  `;

  monthSelect.parentNode.insertAdjacentHTML("afterend", dropdownHTML);
  monthSelect.style.display = "none";

  const container = document.querySelector(".month-dropdown-container");
  const trigger = container.querySelector(".month-dropdown-trigger");
  const menu = container.querySelector(".month-dropdown-menu");
  const selectedSpan = container.querySelector(".selected-month");
  const options = container.querySelectorAll(".month-option");

  function openDropdown() {
    trigger.classList.add("active");
    menu.classList.add("show");
  }
  function closeDropdown() {
    trigger.classList.remove("active");
    menu.classList.remove("show");
  }
  function toggleDropdown(e) {
    e.stopPropagation();
    menu.classList.contains("show") ? closeDropdown() : openDropdown();
  }
  function selectMonth(e) {
    const option = e.currentTarget;
    const value = option.getAttribute("data-value");
    const monthName = option.querySelector("span").textContent;

    options.forEach((opt) => opt.classList.remove("selected"));
    option.classList.add("selected");

    selectedSpan.textContent = monthName;
    monthSelect.value = value;
    window.selectedMonth = parseInt(value, 10);

    setTimeout(closeDropdown, 150);
    console.log(`📅 Selected month: ${monthName} (${value}) - NO auto-update`);
  }

  trigger.addEventListener("click", toggleDropdown);
  options.forEach((option) => option.addEventListener("click", selectMonth));
  document.addEventListener("click", (event) => {
    if (!container.contains(event.target)) closeDropdown();
  });

  console.log("✅ Professional month dropdown created (no auto-update)");
}

function createProfessionalPollutantDropdown() {
  console.log("🧪 Creating professional pollutant dropdown...");

  const existingDropdown = document.querySelector(".pollutant-dropdown-container");
  if (existingDropdown) existingDropdown.remove();

  const oldDropdown = document.getElementById("pollutantDropdown");
  if (!oldDropdown) {
    console.log("❌ Pollutant dropdown not found");
    return;
  }

  const currentPollutantValue = currentPollutant || "PM2.5";

  const pollutants = [
    { value: "PM2.5", name: "PM2.5", description: "Fine Particulate Matter (≤ 2.5 μm)" },
    { value: "PM10", name: "PM10", description: "Particulate Matter (≤ 10 μm)" },
    { value: "NO2", name: "NO2", description: "Nitrogen Dioxide" },
    { value: "SO2", name: "SO2", description: "Sulfur Dioxide" },
    { value: "CO", name: "CO", description: "Carbon Monoxide" },
    { value: "O3", name: "O3", description: "Ground-level Ozone" },
  ];

  const currentPollutantName = pollutants.find((p) => p.value === currentPollutantValue)?.name || "PM2.5";

  const dropdownHTML = `
    <div class="pollutant-dropdown-container">
      <div class="pollutant-dropdown-trigger" tabindex="0">
        <span class="pollutant-label">Pollutants</span>
        <span class="selected-pollutant">${currentPollutantName}</span>
        <svg class="pollutant-dropdown-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>
      <div class="pollutant-dropdown-menu">
        ${pollutants
          .map(
            (pollutant) => `
          <div class="pollutant-option ${pollutant.value === currentPollutantValue ? "selected" : ""}" data-value="${pollutant.value}">
            <div class="pollutant-name">${pollutant.name}</div>
            <div class="pollutant-description">${pollutant.description}</div>
          </div>`
          )
          .join("")}
      </div>
    </div>
  `;

  oldDropdown.parentNode.insertAdjacentHTML("afterend", dropdownHTML);
  oldDropdown.style.display = "none";

  const container = document.querySelector(".pollutant-dropdown-container");
  const trigger = container.querySelector(".pollutant-dropdown-trigger");
  const menu = container.querySelector(".pollutant-dropdown-menu");
  const selectedSpan = container.querySelector(".selected-pollutant");
  const options = container.querySelectorAll(".pollutant-option");

  function openDropdown() {
    trigger.classList.add("active");
    menu.classList.add("show");
  }
  function closeDropdown() {
    trigger.classList.remove("active");
    menu.classList.remove("show");
  }
  function toggleDropdown(e) {
    e.stopPropagation();
    menu.classList.contains("show") ? closeDropdown() : openDropdown();
  }
  function selectPollutant(e) {
    const option = e.currentTarget;
    const value = option.getAttribute("data-value");
    const pollutantData = pollutants.find((p) => p.value === value);
    if (!pollutantData) return;

    options.forEach((opt) => opt.classList.remove("selected"));
    option.classList.add("selected");

    selectedSpan.textContent = pollutantData.name;
    window.selectedPollutant = value;
    currentPollutant = value;

    setTimeout(closeDropdown, 150);
    console.log(`🧪 Selected pollutant: ${pollutantData.name} (${value})`);

    // Only the chart should change; tiles/calendar are cached
    updatePollutantData();
  }

  trigger.addEventListener("click", toggleDropdown);
  options.forEach((option) => option.addEventListener("click", selectPollutant));
  document.addEventListener("click", (event) => {
    if (!container.contains(event.target)) closeDropdown();
  });

  console.log("✅ Professional pollutant dropdown created (no auto-update)");
}

/* ------------------------ DATE CONTROLS ------------------------ */
function addPollutantDateControls() {
  const mainElement = document.querySelector("main.flex-1");
  if (mainElement && !document.getElementById("pollutant-date-controls")) {
    const currentDateYear = window.AirSightDate.getCurrentYear();
    const currentDateMonth = window.AirSightDate.getCurrentMonth();

    const dateControlsHTML = `
      <div id="pollutant-date-controls" style="
        background:linear-gradient(135deg, #fdfffc 0%, #e1fddc 40%, #d4f5cc 80%, #cbf0c4 100%);
        padding: 16px; border-radius: 12px; margin-bottom: 16px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
      ">
        <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <label for="year-select" style="font-weight: 500; color: #374151;">Year:</label>
            <select id="year-select" style="display: none;">
              <option value="2023">2023</option>
              <option value="2024">2024</option>
              <option value="2025" ${currentDateYear === 2025 ? "selected" : ""}>2025</option>
              <option value="2026">2026</option>
            </select>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <label for="month-select" style="font-weight: 500; color: #374151;">Month:</label>
            <select id="month-select" style="display: none;">
              ${[...Array(12)].map((_, i) => {
                const m = i + 1;
                return `<option value="${m}" ${currentDateMonth === m ? "selected" : ""}>${getMonthName(m)}</option>`;
              }).join("")}
            </select>
          </div>
          <button class="predict-button" onclick="updatePollutantDateSelection()">Predict</button>
        </div>
      </div>
    `;

    mainElement.insertAdjacentHTML("afterbegin", dateControlsHTML);

    setTimeout(() => {
      addDropdownAnimations();
      createProfessionalYearDropdown();
      createProfessionalMonthDropdown();
      createProfessionalPollutantDropdown();
    }, 100);

    currentYear = currentDateYear;
    currentMonth = currentDateMonth;

    console.log(`🗓️ Enhanced date controls with ALL professional dropdowns: ${currentYear}-${currentMonth}`);
  }
}

/* ----------------- PREDICT BUTTON HANDLER ----------------- */
async function updatePollutantDateSelection() {
  const yearSelect = document.getElementById("year-select");
  const monthSelect = document.getElementById("month-select");

  const selectedYear = window.selectedYear || (yearSelect ? parseInt(yearSelect.value, 10) : currentYear);
  const selectedMonth = window.selectedMonth || (monthSelect ? parseInt(monthSelect.value, 10) : currentMonth);
  const selectedPollutant = window.selectedPollutant || currentPollutant;

  currentYear = selectedYear;
  currentMonth = selectedMonth;
  currentPollutant = selectedPollutant;

  console.log(`PREDICT clicked! Year: ${currentYear}, Month: ${getMonthName(currentMonth)}, Pollutant: ${currentPollutant}`);

  try {
    showPollutantLoading();

    if (yearSelect) yearSelect.value = currentYear;
    if (monthSelect) monthSelect.value = currentMonth;

    // changing month/year -> we must reset caches so tiles & calendar refresh
    lastCalendarYear = null;
    lastCalendarMonth = null;
    cachedHighestTiles = null;

    await updatePollutantData();
    hidePollutantLoading();

    console.log("✅ Data predicted successfully with all dropdown selections!");
  } catch (err) {
    console.error("❌ Prediction failed:", err);
    hidePollutantLoading();
  }
}

/* ---------------------- SMALL UTILITIES ---------------------- */
function addDropdownAnimations() {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .month-option, .pollutant-option { opacity: 0; animation-fill-mode: forwards; }
    .month-dropdown-menu.show .month-option, .pollutant-dropdown-menu.show .pollutant-option { opacity: 1; animation: slideInUp 0.3s ease; }
  `;
  document.head.appendChild(style);
}

function showPollutantLoading() {
  const mainElement = document.querySelector("main.flex-1");
  if (mainElement) {
    mainElement.style.opacity = "0.7";
    mainElement.style.pointerEvents = "none";
  }
}

function hidePollutantLoading() {
  const mainElement = document.querySelector("main.flex-1");
  if (mainElement) {
    mainElement.style.opacity = "1";
    mainElement.style.pointerEvents = "auto";
  }
}

function showPollutantError(message) {
  hidePollutantLoading();
  const chartContainer = document.querySelector(".lg\\:col-span-2");
  if (chartContainer) {
    const errorHTML = `
      <div class="error-state" style="text-align: center; padding: 40px; background: #fef2f2; border: 2px solid #fca5a5; border-radius: 12px; margin: 20px;">
        <h2 style="color: #dc2626; margin-bottom: 10px;">⚠️ Error Loading Data</h2>
        <p style="color: #666; margin-bottom: 20px;">${message}</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; background: #e1fddc; border: none; border-radius: 5px; cursor: pointer; font-weight: 500; margin-right: 10px;">
          🔄 Reload Page
        </button>
      </div>
    `;
    chartContainer.innerHTML = errorHTML;
  }
}

/* ------------------- SAFE AUTO-INIT ------------------- */
function ensurePollutantInit() {
  const chartCanvas = document.querySelector("#pollutantChart");
  if (chartCanvas && !window.pollutantInitialized) {
    console.log("🚀 Auto-initializing pollutants page...");
    setTimeout(() => {
      initPollutant("daily", "PM2.5");
      window.pollutantInitialized = true;
    }, 200);
  }
}

document.addEventListener("DOMContentLoaded", () => setTimeout(ensurePollutantInit, 100));
window.addEventListener("load", () => {
  if (!window.pollutantInitialized) setTimeout(ensurePollutantInit, 200);
});
setTimeout(() => {
  if (!window.pollutantInitialized) ensurePollutantInit();
}, 1000);

// Observer for dynamic content loading
const pollutantObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === "childList") {
      const chartCanvas = document.querySelector("#pollutantChart");
      if (chartCanvas && !window.pollutantInitialized) {
        console.log("Observer detected pollutant chart canvas");
        setTimeout(ensurePollutantInit, 100);
      }
    }
  });
});
if (document.body) {
  pollutantObserver.observe(document.body, { childList: true, subtree: true });
}

/* ------------------- EXPORTS ------------------- */
window.updatePollutantDateSelection = updatePollutantDateSelection;
window.initPollutant = initPollutant;
window.ensurePollutantInit = ensurePollutantInit;
window.updatePollutantData = updatePollutantData;
window.createProfessionalMonthDropdown = createProfessionalMonthDropdown;
window.createProfessionalPollutantDropdown = createProfessionalPollutantDropdown;
window.createProfessionalYearDropdown = createProfessionalYearDropdown;

console.log("✅ Complete FIXED pollutant module loaded successfully!");
