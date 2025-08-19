// ===================================
// AIRSIGHT PROJECT - MAIN SCRIPT
// Core Application Logic & Navigation
// ENHANCED DATE MANAGEMENT SYSTEM
// ===================================

const API_BASE_URL = "http://127.0.0.1:5000/api";

// ===================================
// ENHANCED GLOBAL DATE MANAGEMENT SYSTEM
// ===================================
window.AirSightDate = {
    // Get consistent current date across all pages
    getCurrentDate: function() {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    },
    
    // NEW: Normalize any date to consistent format
    normalizeDate: function(date) {
        let dateObj;
        if (typeof date === 'string') {
            dateObj = new Date(date);
        } else if (date instanceof Date) {
            dateObj = date;
        } else {
            dateObj = new Date();
        }
        
        const year = dateObj.getFullYear();
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const day = dateObj.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    },
    
    // Get tomorrow's date
    getTomorrowDate: function() {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return this.normalizeDate(tomorrow);
    },
    
    // Get specific date offset
    getDateOffset: function(days) {
        const today = new Date();
        const offsetDate = new Date(today);
        offsetDate.setDate(offsetDate.getDate() + days);
        return this.normalizeDate(offsetDate);
    },
    
    // Get year and month from current date
    getCurrentYear: function() {
        return new Date().getFullYear();
    },
    
    getCurrentMonth: function() {
        return new Date().getMonth() + 1;
    },
    
    // NEW: Debug function to test date consistency
    testDateConsistency: function() {
        console.log("=== DATE CONSISTENCY TEST ===");
        console.log("Current Date:", this.getCurrentDate());
        console.log("Tomorrow Date:", this.getTomorrowDate());
        console.log("Current Year:", this.getCurrentYear());
        console.log("Current Month:", this.getCurrentMonth());
        
        // Test normalization
        const testDates = [
            new Date(),
            "2025-08-10",
            new Date("2025-08-10T06:37:20Z")
        ];
        
        testDates.forEach((date, index) => {
            console.log(`Test Date ${index + 1}:`, date, "→", this.normalizeDate(date));
        });
        
        const testDate = this.getCurrentDate();
        console.log(`✅ All APIs should use: ${testDate}`);
        return testDate;
    }
};

const pageTitles = {
    home: "Dashboard",
    prediction: "Prediction Forecast",
    pollutants: "Pollutants Analysis",
    about: "About AirSight",
    feedback: "Contact/Feedback",
    settings: "System Settings",
};

const pageContents = {
    home: "Real-time air quality data and predictions powered by machine learning",
    prediction: "Advanced AI models for accurate air quality forecasting",
    pollutants: "Detailed pollutant analysis with historical trends and predictions",
    about: "Information about the AirSight system and team.",
    feedback: "Contact us for questions, suggestions, or feedback",
    settings: "Customize your application preferences and system options",
};

// === API HEALTH CHECK ===
async function checkAPIHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();

        if (data.status === "healthy") {
            console.log("✅ API is healthy. Models trained:", data.models_trained);
            console.log("Best model:", data.best_model);

            if (!data.models_trained) {
                console.warn("⚠️ Models not trained yet. Some features may not work correctly.");
                showModelWarning();
            } else {
                showModelSuccess(data.best_model);
            }

            return true;
        }
    } catch (error) {
        console.error("❌ API health check failed:", error);
        showAPIError();
        return false;
    }
}

function showModelSuccess(bestModel) {
    const successHTML = `
        <div id="model-success" style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: #d1fae5;
            border: 1px solid #a7f3d0;
            border-radius: 8px;
            padding: 12px 16px;
            max-width: 300px;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        ">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: #065f46;">🎉</span>
                <div>
                    <strong style="color: #065f46;">AI Models Ready!</strong>
                    <p style="margin: 4px 0 0 0; font-size: 14px; color: #065f46;">
                        Best model: ${bestModel} • All predictions are live!
                    </p>
                </div>
                <button onclick="document.getElementById('model-success').remove()" style="
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    color: #065f46;
                ">×</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", successHTML);

    setTimeout(() => {
        const success = document.getElementById("model-success");
        if (success) success.remove();
    }, 5000);
}

function showModelWarning() {
    const warningHTML = `
        <div id="model-warning" style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 12px 16px;
            max-width: 300px;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        ">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: #856404;">⚠️</span>
                <div>
                    <strong style="color: #856404;">Models Initializing</strong>
                    <p style="margin: 4px 0 0 0; font-size: 14px; color: #856404;">
                        Some predictions may show placeholder values until models are fully trained.
                    </p>
                </div>
                <button onclick="document.getElementById('model-warning').remove()" style="
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    color: #856404;
                ">×</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", warningHTML);

    setTimeout(() => {
        const warning = document.getElementById("model-warning");
        if (warning) warning.remove();
    }, 10000);
}

function showAPIError() {
    const errorHTML = `
        <div id="api-error" style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 8px;
            padding: 12px 16px;
            max-width: 300px;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        ">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: #721c24;">❌</span>
                <div>
                    <strong style="color: #721c24;">API Connection Failed</strong>
                    <p style="margin: 4px 0 0 0; font-size: 14px; color: #721c24;">
                        Please ensure the backend server is running on port 5000.
                    </p>
                </div>
                <button onclick="document.getElementById('api-error').remove()" style="
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    color: #721c24;
                ">×</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", errorHTML);
}

// === NAVIGATION SYSTEM ===
function showPage(targetPageId) {
    const currentActive = document.querySelector(".nav-item.active");
    const container = document.getElementById("page-container");

    if (currentActive && currentActive.dataset.page === targetPageId && container.innerHTML.trim() !== "") return;

    const fullscreenLoader = document.getElementById("fullscreen-loader");
    const pageTitle = document.getElementById("page-title");
    const pageContent = document.getElementById("page-content");

    if (pageTitle) pageTitle.textContent = pageTitles[targetPageId] || "AirSight";
    if (pageContent) pageContent.textContent = pageContents[targetPageId] || "";

    fullscreenLoader?.classList.remove("hidden");

    // Clean up pollutant state when leaving pollutants page
    if (currentActive && currentActive.dataset.page === "pollutants" && targetPageId !== "pollutants") {
        console.log("🧹 Cleaning up pollutants page state...");
        window.pollutantInitialized = false;
        if (window.pollutantInitTimer) {
            clearTimeout(window.pollutantInitTimer);
        }
    }

    setTimeout(() => {
        document.querySelectorAll(".nav-item").forEach((link) => link.classList.remove("active"));
        document.querySelector(`.nav-item[data-page="${targetPageId}"]`)?.classList.add("active");

        fetch(`${targetPageId}.html`)
            .then((res) => {
                if (!res.ok) throw new Error("Page not found");
                return res.text();
            })
            .then((data) => {
                container.innerHTML = data;

                const dateElement = container.querySelector("#date");
                if (dateElement) {
                    dateElement.innerText = new Date().toDateString();
                }

                // Page-specific initialization
                if (targetPageId === "home") {
                    console.log("🏠 Initializing dashboard...");
                    if (typeof initDashboard === "function") {
                        initDashboard();
                    }
                } else if (targetPageId === "pollutants") {
                    console.log("🌪️ Loading pollutants page...");
                    window.pollutantInitialized = false;

                    const initAttempts = [
                        { delay: 200, description: "immediate" },
                        { delay: 500, description: "quick retry" },
                        { delay: 1000, description: "delayed retry" },
                        { delay: 2000, description: "final attempt" },
                    ];

                    initAttempts.forEach((attempt, index) => {
                        setTimeout(() => {
                            const canvas = document.getElementById("pollutantChart");

                            if (canvas && !window.pollutantInitialized) {
                                console.log(`🔄 Attempt ${index + 1} (${attempt.description}): Initializing pollutants...`);

                                try {
                                    if (typeof initPollutant === "function") {
                                        initPollutant("daily", "PM2.5");
                                        window.pollutantInitialized = true;
                                        console.log(`✅ Pollutants initialized on attempt ${index + 1}`);
                                    } else if (typeof ensurePollutantInit === "function") {
                                        ensurePollutantInit();
                                    } else {
                                        createEmergencyChart();
                                    }
                                } catch (error) {
                                    console.error(`❌ Attempt ${index + 1} failed:`, error);

                                    if (index === initAttempts.length - 1) {
                                        console.log("🆘 All attempts failed, creating emergency chart...");
                                        createEmergencyChart();
                                    }
                                }
                            }
                        }, attempt.delay);
                    });
                } else if (targetPageId === "prediction") {
                    console.log("🔮 Initializing prediction...");
                    if (typeof initPrediction === "function") {
                        initPrediction();
                    }
                }
            })
            .catch((err) => {
                container.innerHTML = `
                    <div class="error-state" style="
                        text-align: center; 
                        padding: 40px; 
                        background: white; 
                        border-radius: 12px; 
                        margin: 20px;
                        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
                    ">
                        <h1 style="color: #ef4444; margin-bottom: 10px;">Error</h1>
                        <p style="color: #666; margin-bottom: 20px;">${err.message}</p>
                        <button onclick="showPage('${targetPageId}')" style="
                            padding: 10px 20px; 
                            background: #e1fddc; 
                            border: none; 
                            border-radius: 5px; 
                            cursor: pointer;
                        ">
                            Retry
                        </button>
                    </div>
                `;
            })
            .finally(() => {
                setTimeout(() => {
                    fullscreenLoader?.classList.add("hidden");
                }, 400);
            });
    }, 500);
}

// === EMERGENCY CHART FOR POLLUTANTS ===
function createEmergencyChart() {
    console.log("🆘 Creating emergency chart...");

    const canvas = document.getElementById("pollutantChart");
    if (!canvas) {
        console.error("❌ Canvas not found for emergency chart");
        return;
    }

    const ctx = canvas.getContext("2d");
    const existing = Chart.getChart(canvas);
    if (existing) existing.destroy();

    try {
        new Chart(ctx, {
            type: "bar",
            data: {
                labels: ["Jul 20", "Jul 21", "Jul 22", "Jul 23", "Jul 24"],
                datasets: [
                    {
                        label: "AQI Data (Emergency Mode)",
                        data: [45, 52, 38, 61, 49],
                        backgroundColor: ["#22c55e", "#facc15", "#22c55e", "#facc15", "#22c55e"],
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
                        text: "Air Quality Data (Emergency Mode - Chart Working!)",
                        font: { size: 16, weight: "bold" },
                        color: "#ef4444",
                    },
                },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true, max: 100 },
                },
            },
        });

        console.log("✅ Emergency chart created successfully!");

        setTimeout(() => {
            fetch(`${API_BASE_URL}/pollutants?filter=daily&pollutant=PM2.5`)
                .then((response) => response.json())
                .then((data) => {
                    if (data.chart_data && data.chart_data.labels) {
                        console.log("📊 Got real data, updating emergency chart...");
                        updateEmergencyChart(data.chart_data);
                    }
                })
                .catch((error) => console.log("⚠️ Failed to fetch real data:", error));
        }, 1000);
    } catch (error) {
        console.error("❌ Emergency chart creation failed:", error);
    }
}

function updateEmergencyChart(chartData) {
    const canvas = document.getElementById("pollutantChart");
    if (!canvas) return;

    const chart = Chart.getChart(canvas);
    if (!chart) return;

    try {
        chart.data.labels = chartData.labels;
        chart.data.datasets[0].data = chartData.data;
        chart.data.datasets[0].backgroundColor = chartData.data.map((val) =>
            val < 50 ? "#22c55e" : val < 100 ? "#facc15" : "#f97316"
        );
        chart.options.plugins.title.text = "Air Quality Data (Live Data!)";
        chart.options.plugins.title.color = "#166534";
        chart.update();

        console.log("✅ Emergency chart updated with real data!");
    } catch (error) {
        console.error("❌ Failed to update emergency chart:", error);
    }
}

// === SIDEBAR TOGGLE ===
const menuToggle = document.getElementById("menu-toggle");
const sidebar = document.querySelector(".sidebar");
const overlay = document.getElementById("overlay");

menuToggle?.addEventListener("click", () => {
    sidebar?.classList.toggle("open");
    overlay?.classList.toggle("hidden");
});

overlay?.addEventListener("click", () => {
    sidebar?.classList.remove("open");
    overlay?.classList.add("hidden");
});

// === EVENT LISTENERS ===
document.addEventListener("DOMContentLoaded", function () {
    console.log("🚀 AirSight application starting...");
    
    // Test date consistency
    window.AirSightDate.testDateConsistency();
    
    checkAPIHealth();
    showPage("home");
});

const navLinks = document.querySelectorAll(".nav-item");
navLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
        e.preventDefault();
        const page = this.dataset.page;
        showPage(page);
        if (window.innerWidth < 1024) {
            sidebar?.classList.remove("open");
            overlay?.classList.add("hidden");
        }
    });
});

// === UTILITY FUNCTIONS ===
async function makeAPIRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                "Content-Type": "application/json",
                ...options.headers,
            },
            ...options,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        return data;
    } catch (error) {
        console.error(`❌ API request failed for ${endpoint}:`, error);
        throw error;
    }
}

// === HELPER FUNCTIONS FOR SHARED USE ===
function updateHighestConcentration(highestData) {
    const container = document.querySelector(".grid.grid-cols-5");
    if (!container || !highestData) {
        console.log("⚠️ No container or data for highest concentration");
        return;
    }

    let html = "";
    highestData.forEach((item) => {
        html += `
            <div class="space-y-1">
                <p class="text-sm text-gray-500">
                    <span class="text-2xl font-bold text-gray-900">${item.day}</span> ${item.month_name}
                </p>
                <p class="font-semibold text-gray-800">${item.pollutant}</p>
                <p class="text-lg font-bold ${getConcentrationColor(item.pollutant, item.concentration)}">
                    ${item.concentration} ${item.unit}
                </p>
            </div>
        `;
    });

    container.innerHTML = html;
    console.log("✅ Updated highest concentration display");
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
    if (!threshold) return "text-gray-600";

    if (concentration <= threshold.moderate) return "text-green-500";
    else if (concentration <= threshold.unhealthy) return "text-yellow-500";
    else return "text-red-500";
}

function getEnhancedAQIColors(aqi) {
    if (aqi <= 50) {
        return {
            bgColor: "bg-gradient-to-br from-green-100 to-green-200",
            textColor: "text-green-800",
            borderColor: "border-2 border-green-300 shadow-green-200",
        };
    } else if (aqi <= 100) {
        return {
            bgColor: "bg-gradient-to-br from-yellow-100 to-yellow-200",
            textColor: "text-yellow-800",
            borderColor: "border-2 border-yellow-300 shadow-yellow-200",
        };
    } else if (aqi <= 150) {
        return {
            bgColor: "bg-gradient-to-br from-orange-100 to-orange-200",
            textColor: "text-orange-800",
            borderColor: "border-2 border-orange-300 shadow-orange-200",
        };
    } else {
        return {
            bgColor: "bg-gradient-to-br from-red-100 to-red-200",
            textColor: "text-red-800",
            borderColor: "border-2 border-red-400 shadow-red-200",
        };
    }
}

function getAQILevel(aqi) {
    if (aqi <= 50) return "Good";
    else if (aqi <= 100) return "Moderate";
    else if (aqi <= 150) return "Unhealthy for Sensitive";
    else if (aqi <= 200) return "Unhealthy";
    else return "Very Unhealthy";
}

function getPollutantIcon(pollutant) {
    const icons = {
        "PM2.5": "🌫️",
        PM10: "💨",
        O3: "☀️",
        NO2: "🚗",
        SO2: "🏭",
        CO: "🔥",
    };
    return icons[pollutant] || "🌪️";
}

function getHealthAdvice(aqi) {
    if (aqi <= 50) return "👍 Great for outdoor activities!";
    else if (aqi <= 100) return "😐 Moderate - limit prolonged outdoor exertion";
    else if (aqi <= 150) return "😷 Sensitive groups should avoid outdoor activities";
    else return "🚨 Everyone should avoid outdoor activities";
}

// Quick test function for debugging
function testDateConsistency() {
    return window.AirSightDate.testDateConsistency();
}

// === GLOBAL EXPORTS ===
window.makeAPIRequest = makeAPIRequest;
window.API_BASE_URL = API_BASE_URL;
window.createEmergencyChart = createEmergencyChart;
window.updateEmergencyChart = updateEmergencyChart;
window.updateHighestConcentration = updateHighestConcentration;
window.testDateConsistency = testDateConsistency;

console.log("✅ AirSight Core System Loaded - Enhanced Date Management Active");