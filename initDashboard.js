// ===================================
// AIRSIGHT PROJECT - DASHBOARD MODULE
// Professional redesigned recommendations
// ===================================

let dashboardChart = null;

async function initDashboard() {
    try {
        showLoadingState();
        
        const apiDate = window.AirSightDate.getCurrentDate();
        const defaultModel = 'gbr';
        const response = await fetch(`${API_BASE_URL}/dashboard?date=${apiDate}&model=${defaultModel}`);  // ✅ ADD model

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch dashboard data');
        }
        
        console.log('Dashboard data received for date:', apiDate, data);
        console.log('🎯 Current AQI:', data.current_aqi, 'at week position:', data.current_week_position);
        
        updateDashboardCards(data);
        updateAQIBanner(data);
        
        // FIXED: Pass both chart data and current week position
        updateAirQualityChart(data.chart_aqi, null, data.current_aqi, data.current_week_position);
        await updateProfessionalRecommendations(null, defaultModel);
        
        hideLoadingState();
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showErrorState(error.message);
    }
}

function updateDashboardCards(data) {
    const aqiCard = document.querySelector('.card.green');
    if (aqiCard) {
        aqiCard.querySelector('.card-value').textContent = data.current_aqi;
        aqiCard.querySelector('.card-label').textContent = data.current_category;
        updateCardColor(aqiCard, data.current_aqi);
    }
    
    const pollutantCard = document.querySelector('.card.blue');
    if (pollutantCard) {
        const shortName = getShortPollutantName(data.main_pollutant);
        pollutantCard.querySelector('.card-value').innerHTML = shortName;
    }
    
    const predictionCards = document.querySelectorAll('.card');
    const predictionCard = predictionCards[2];
    if (predictionCard) {
        predictionCard.querySelector('.card-value').textContent = data.next_day_aqi;
        predictionCard.querySelector('.card-label').textContent = data.next_day_category;
        updateCardColor(predictionCard, data.next_day_aqi);
    }
}

function updateCardColor(card, aqi) {
    card.classList.remove('green', 'blue', 'yellow', 'orange', 'red');
    
    if (aqi <= 50) {
        card.classList.add('green');
    } else if (aqi <= 100) {
        card.classList.add('yellow');
    } else if (aqi <= 150) {
        card.classList.add('orange');
    } else {
        card.classList.add('red');
    }
}

function getShortPollutantName(pollutant) {
    const mapping = {
        'PM2.5 - Local Conditions': 'PM<sub>2.5</sub>',
        'PM10 Total 0-10um STP': 'PM<sub>10</sub>',
        'Ozone': 'O<sub>3</sub>',
        'Nitrogen dioxide (NO2)': 'NO<sub>2</sub>',
        'Carbon monoxide': 'CO',
        'Sulfur dioxide': 'SO<sub>2</sub>'
    };
    return mapping[pollutant] || pollutant;
}

function updateAQIBanner(data) {
    const aqiMessage = document.getElementById("aqi-message");
    if (!aqiMessage) return;
    
    const aqi = data.current_aqi;
    let icon, headline, description, bannerClass;
    
    if (aqi <= 50) {
        icon = '<img src="./images/happy-ezgif.com-gif-maker.gif" alt="Good AQI" class="aqi-icon" />';
        headline = "Great News! The air quality is good.";
        description = "It's a perfect day to be outside. Enjoy the fresh air!";
        bannerClass = "good";
    } else if (aqi <= 100) {
        icon = '<img src="./images/neutral-ezgif.com-gif-maker.gif" alt="Moderate AQI" class="aqi-icon" />';
        headline = "Air Quality is Moderate.";
        description = "Consider limiting prolonged outdoor exertion if sensitive.";
        bannerClass = "moderate";
    } else if (aqi <= 150) {
        icon = '<img src="./images/sad-ezgif.com-gif-maker.gif" alt="Unhealthy AQI" class="aqi-icon" />';
        headline = "Unhealthy for Sensitive Groups!";
        description = "Sensitive individuals should avoid outdoor activities.";
        bannerClass = "unhealthy";
    } else {
        icon = '<img src="./images/mask-ezgif.com-gif-maker.gif" alt="Dangerous AQI" class="aqi-icon" />';
        headline = "Unhealthy Air Quality!";
        description = "Avoid outdoor activities. Use air purifiers indoors.";
        bannerClass = "unhealthy";
    }
    
    aqiMessage.className = `aqi-banner ${bannerClass}`;
    aqiMessage.innerHTML = `
        <div class="icon">${icon}</div>
        <div class="text">
            <div class="headline">${headline}</div>
            <div class="description">${description}</div>
        </div>
    `;
    
    // Force GIF size after DOM update
    setTimeout(() => {
        const gifElement = aqiMessage.querySelector('.aqi-icon');
        if (gifElement) {
            gifElement.style.width = '40px';
            gifElement.style.height = '40px';
            gifElement.style.minWidth = '40px';
            gifElement.style.minHeight = '40px';
            gifElement.style.maxWidth = '40px';
            gifElement.style.maxHeight = '40px';
            gifElement.setAttribute('width', '50');
            gifElement.setAttribute('height', '50');
            
            console.log('🔧 Forced GIF size to 50x50px');
        }
    }, 100);
}

// 📅 DYNAMIC DATE CALCULATION FUNCTIONS
function getCurrentWeekPosition() {
    const today = new Date();
    const currentMonth = today.getMonth(); // 0-11 (August = 7)
    const currentWeek = Math.floor((today.getDate() - 1) / 7); // 0-3
    
    // Calculate position in 48-week chart (12 months × 4 weeks)
    const weekPosition = currentMonth * 4 + currentWeek;
    
    console.log('📅 Dynamic Date Calculation:');
    console.log(`   Today: ${today.toDateString()}`);
    console.log(`   Month: ${currentMonth} (${today.toLocaleString('default', { month: 'long' })})`);
    console.log(`   Week of month: ${currentWeek + 1}`);
    console.log(`   Chart position: ${weekPosition}`);
    
    return weekPosition;
}

function getCurrentDateInfo() {
    const today = new Date();
    return {
        date: today.toDateString(),
        month: today.toLocaleString('default', { month: 'short' }),
        day: today.getDate(),
        weekPosition: getCurrentWeekPosition()
    };
}

function getTodayFormatted() {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
}

function updateAirQualityChart(chartData, chartLabels = null, currentAqi = null, currentDayPosition = null) {
    const ctx = document.getElementById("airQualityChart")?.getContext("2d");
    if (!ctx) return;

    if (dashboardChart) {
        dashboardChart.destroy();
    }

    function getAQIColor(aqi) {
        if (aqi <= 50) return "#50cd89";       // Green
        else if (aqi <= 100) return "#fbbf24"; // Yellow
        else if (aqi <= 150) return "#f97316"; // Orange
        else return "#ef4444";                 // Red
    }

    // 🎯 Get current day position
    function getCurrentDayPosition() {
        const now = new Date(); // Current date
        const startOfYear = new Date(now.getFullYear(), 0, 1); // Jan 1 of current year
        const dayOfYear = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000)) + 1;
        return dayOfYear - 1; // 0-based index
    }

    console.log('   Expected today position:', getCurrentDayPosition());

    // 🚨 VALIDATION: Ensure we have real data
    if (!chartData || !Array.isArray(chartData) || chartData.length === 0) {
        console.error('❌ NO CHART DATA PROVIDED! Chart cannot render without model data.');
        return;
    }

    // 🚨 VALIDATION: Check data format
    const hasValidData = chartData.every(value => typeof value === 'number' && !isNaN(value));
    if (!hasValidData) {
        console.error('❌ INVALID CHART DATA! All values must be valid numbers.');
        console.log('   Invalid data:', chartData.filter(value => typeof value !== 'number' || isNaN(value)));
        return;
    }

    const maxAqi = Math.max(...chartData);
    const minAqi = Math.min(...chartData);
    
    console.log(`📊 Real Model Data Range: ${minAqi} - ${maxAqi} AQI`);
    console.log(`📊 Data points received: ${chartData.length}`);
    
    const yAxisMax = 100;
    const stepSize = 20;

    // 🎯 Generate labels based on data length
    let finalLabels;
    if (chartData.length === 365) {
        // Daily data - show monthly labels
        const dailyLabels = [];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

        for (let month = 0; month < 12; month++) {
            for (let day = 1; day <= daysInMonth[month]; day++) {
                if (day === 15) {
                    dailyLabels.push(monthNames[month]);
                } else {
                    dailyLabels.push("");
                }
            }
        }
        finalLabels = chartLabels || dailyLabels;
        console.log('📅 Using daily labels (365 days)');
        
    } else if (chartData.length === 48) {
        // Weekly data - show monthly labels
        const weeklyLabels = [];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        for (let month = 0; month < 12; month++) {
            for (let week = 0; week < 4; week++) {
                if (week === 1) {
                    weeklyLabels.push(monthNames[month]);
                } else {
                    weeklyLabels.push("");
                }
            }
        }
        finalLabels = chartLabels || weeklyLabels;
        console.log('📅 Using weekly labels (48 weeks)');
        
    } else {
        // Custom length - use provided labels or generate simple ones
        finalLabels = chartLabels || chartData.map((_, index) => index % 10 === 0 ? `Point ${index}` : "");
        console.log(`📅 Using custom labels (${chartData.length} points)`);
    }

    // 🎯 Determine today's position
    const todayPosition = chartData.length === 365 
        ? getCurrentDayPosition() 
        : chartData.length === 48 
            ? Math.floor(getCurrentDayPosition() / 7.6) // Convert day to week
            : currentDayPosition;

    console.log(`🎯 Today's position in chart: ${todayPosition} (AQI should be ${currentAqi})`);

    // 🔧 SYNC: Ensure today's chart value matches dashboard
    if (currentAqi && todayPosition !== null && todayPosition >= 0 && todayPosition < chartData.length) {
        const chartValue = chartData[todayPosition];
        if (Math.abs(chartValue - currentAqi) > 0.5) {
            console.warn(`⚠️ AQI MISMATCH! Dashboard: ${currentAqi}, Chart[${todayPosition}]: ${chartValue}`);
            console.log(`🔧 Updating chart data to match dashboard value`);
            chartData[todayPosition] = currentAqi;
        } else {
            console.log(`✅ AQI SYNCHRONIZED: Dashboard and chart both show ${currentAqi} AQI`);
        }
    }

    // 🎯 Animation timing based on data length
    const totalDuration = chartData.length > 100 ? 4000 : 3000;
    const delayBetweenPoints = totalDuration / chartData.length;
    
    console.log(`🎬 Animation: ${totalDuration}ms total, ${delayBetweenPoints.toFixed(1)}ms per point`);

    dashboardChart = new Chart(ctx, {
        type: "line",
        data: {    
            labels: finalLabels,
            datasets: [{
                label: "AI-Predicted AQI",
                data: chartData, // 🎯 USING REAL MODEL DATA
                borderColor: "rgba(0,0,0,0)",
                backgroundColor: "rgba(0,0,0,0)",
                pointRadius: 0,
                pointHoverRadius: 7,
                pointBackgroundColor: "#ffffff",
                pointBorderColor: "transparent",
                pointBorderWidth: 0,
                pointHoverBackgroundColor: "#ffffff",
                pointHoverBorderWidth: 3,
                fill: false,
                tension: 0
            }]
        },
        options: {
            responsive: true,
            aspectRatio: 1.8,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            // 🎯 PROGRESSIVE ANIMATION for real data
            animation: {
                x: {
                    type: 'number',
                    easing: 'linear',
                    duration: delayBetweenPoints,
                    from: NaN,
                    delay(ctx) {
                        if (ctx.type !== 'data' || ctx.xStarted) {
                            return 0;
                        }
                        ctx.xStarted = true;
                        return ctx.index * delayBetweenPoints;
                    }
                },
                y: {
                    type: 'number',
                    easing: 'linear',
                    duration: delayBetweenPoints,
                    from: (ctx) => {
                        if (ctx.index === 0) {
                            return ctx.chart.scales.y.getPixelForValue(yAxisMax);
                        }
                        const prevData = ctx.chart.getDatasetMeta(ctx.datasetIndex).data[ctx.index - 1];
                        return prevData ? prevData.getProps(['y'], true).y : ctx.chart.scales.y.getPixelForValue(yAxisMax);
                    },
                    delay(ctx) {
                        if (ctx.type !== 'data' || ctx.yStarted) {
                            return 0;
                        }
                        ctx.yStarted = true;
                        return ctx.index * delayBetweenPoints;
                    }
                },
                onComplete: function() {
                    console.log(`✅ Real model data animation completed! ${chartData.length} points drawn.`);
                }
            },
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: chartData.length === 365 
                        ? 'AI-Predicted Air Quality Index - Daily Data for ' + new Date().getFullYear()
                        : chartData.length === 48 
                            ? 'AI-Predicted Air Quality Index - Weekly Data with Monthly View'
                            : 'AI-Predicted Air Quality Index',
                    font: { size: 15, weight: 'bold' },
                    color: '#374151',
                    padding: {top: 5, bottom: 8}
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        title: function(context) {
                            const dataIndex = context[0].dataIndex;
                            const isToday = dataIndex === todayPosition;
                            
                            if (isToday) {
                                return `📍 TODAY - ${new Date().toDateString()}`;
                            } else if (chartData.length === 365) {
                                const date = new Date(new Date().getFullYear(), 0, dataIndex + 1);
                                return `${date.toDateString()}`;
                            } else if (chartData.length === 48) {
                                const monthIndex = Math.floor(dataIndex / 4);
                                const weekIndex = dataIndex % 4;
                                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                return `${monthNames[monthIndex]} ${new Date().getFullYear()} - Week ${weekIndex + 1}`;
                            } else {
                                return `Data Point ${dataIndex + 1}`;
                            }
                        },
                        label: function(context) {
                            const aqi = context.parsed.y;
                            const dataIndex = context.dataIndex;
                            const isToday = dataIndex === todayPosition;
                            
                            let category, emoji;
                            if (aqi <= 50) {
                                category = "Good";
                                emoji = "🟢";
                            } else if (aqi <= 100) {
                                category = "Moderate";
                                emoji = "🟡";
                            } else if (aqi <= 150) {
                                category = "Unhealthy for Sensitive";
                                emoji = "🟠";
                            } else {
                                category = "Unhealthy";
                                emoji = "🔴";
                            }
                            
                            return [
                                `${emoji} AQI: ${Math.round(aqi)}`,
                                `Category: ${category}`,
                                isToday ? '📍 Current Reading' : 'AI Prediction'
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: "#374151",
                        padding: 10,
                        font: { size: 12, weight: '500' },
                        maxTicksLimit: 12,
                        callback: function(value, index, values) {
                            const label = this.getLabelForValue(value);
                            return label || undefined;
                        }
                    },
                    border: { display: false }
                },
                y: {
                    beginAtZero: true,
                    max: yAxisMax,
                    ticks: {
                        stepSize: stepSize,
                        color: "#374151",
                        padding: 0,
                        font: { size: 12, weight: '500' },
                        callback: value => `${value} AQI`
                    },
                    grid: { display: false },
                    border: { display: false }
                }
            },
            layout: {
                padding: { top: 20, bottom: 5, left: 5, right: 15 }
            }
        },
        plugins: [
            // ... (keep the same gradient plugins as before)
            // {
            //     id: 'aqiGradientFill',
            //     beforeDatasetDraw(chart) {
            //         const { ctx, chartArea } = chart;
            //         if (!chartArea) return;
                    
            //         const { bottom, left, right } = chartArea;
            //         const dataset = chart.data.datasets[0];
            //         const meta = chart.getDatasetMeta(0);
                    
            //         if (!meta || !meta.data || meta.data.length < 2) return;

            //         if (!isFinite(left) || !isFinite(right) || !isFinite(bottom)) return;

            //         try {
            //             const horizontalGradient = ctx.createLinearGradient(left, 0, right, 0);
            //             horizontalGradient.addColorStop(0, "#50cd89" + "22");
            //             horizontalGradient.addColorStop(0.33, "#fbbf24" + "22");
            //             horizontalGradient.addColorStop(0.66, "#f97316" + "22");
            //             horizontalGradient.addColorStop(1, "#ef4444" + "22");

            //             ctx.save();
            //             ctx.beginPath();

            //             const first = meta.data[0];
            //             if (!first || !isFinite(first.x) || !isFinite(first.y)) return;
                        
            //             ctx.moveTo(first.x, bottom);
            //             ctx.lineTo(first.x, first.y);

            //             for (let i = 1; i < meta.data.length; i++) {
            //                 const point = meta.data[i];
            //                 if (point && isFinite(point.x) && isFinite(point.y)) {
            //                     ctx.lineTo(point.x, point.y);
            //                 }
            //             }

            //             const last = meta.data[meta.data.length - 1];
            //             if (last && isFinite(last.x)) {
            //                 ctx.lineTo(last.x, bottom);
            //             }
            //             ctx.closePath();

            //             ctx.fillStyle = horizontalGradient;
            //             ctx.fill();
            //             ctx.restore();
            //         } catch (error) {
            //             console.warn('⚠️ Error in gradient fill:', error);
            //         }
            //     }
            // },
            {
                id: 'aqiGradientLine',
                afterDatasetDraw(chart) {
                    const { ctx } = chart;
                    const dataset = chart.data.datasets[0];
                    const meta = chart.getDatasetMeta(0);
                    
                    if (!meta || !meta.data || meta.data.length < 2) return;

                    ctx.save();
                    ctx.lineWidth = 2;

                    for (let i = 0; i < meta.data.length - 1; i++) {
                        const p0 = meta.data[i];
                        const p1 = meta.data[i + 1];
                        
                        if (!p0 || !p1 || 
                            !isFinite(p0.x) || !isFinite(p0.y) || 
                            !isFinite(p1.x) || !isFinite(p1.y)) {
                            continue;
                        }
                        
                        const aqi0 = dataset.data[i];
                        const aqi1 = dataset.data[i + 1];

                        try {
                            const gradient = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
                            gradient.addColorStop(0, getAQIColor(aqi0));
                            gradient.addColorStop(1, getAQIColor(aqi1));

                            ctx.beginPath();
                            ctx.strokeStyle = gradient;
                            ctx.moveTo(p0.x, p0.y);
                            ctx.lineTo(p1.x, p1.y);
                            ctx.stroke();
                        } catch (error) {
                            continue;
                        }
                    }

                    ctx.restore();
                }
            },
            {
                id: 'todayIndicator',
                beforeDraw(chart) {
                    if (todayPosition === null || todayPosition === undefined || todayPosition < 0 || todayPosition >= chartData.length) {
                        return;
                    }
                    
                    const { ctx, chartArea } = chart;
                    if (!chartArea) return;
                    
                    const { top, bottom, left, right } = chartArea;
                    
                    if (!isFinite(top) || !isFinite(bottom) || !isFinite(left) || !isFinite(right)) return;
                    
                    const chartWidth = right - left;
                    const pointWidth = chartWidth / (chartData.length - 1);
                    const todayX = left + (todayPosition * pointWidth);
                    
                    if (!isFinite(todayX) || todayX < left || todayX > right) return;
                    
                    ctx.save();
                    
                    // Today line
                    ctx.beginPath();
                    ctx.moveTo(todayX, top + 35);
                    ctx.lineTo(todayX, bottom - 5);
                    ctx.strokeStyle = 'rgba(156, 163, 175, 0.8)';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([6, 4]);
                    ctx.stroke();
                    
                    // Today label
                    ctx.setLineDash([]);
                    const labelText = `Today (${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})`;
                    
                    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
                    ctx.textAlign = 'center';
                    
                    const textMetrics = ctx.measureText(labelText);
                    const labelWidth = textMetrics.width + 12;
                    const labelHeight = 18;
                    const labelX = todayX - labelWidth / 2;
                    const labelY = top + 8;
                    
                    // Label background
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                    ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
                    
                    // Label border
                    ctx.strokeStyle = 'rgba(156, 163, 175, 0.5)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(labelX, labelY, labelWidth, labelHeight);
                    
                    // Label text
                    ctx.fillStyle = 'rgba(75, 85, 99, 1)';
                    ctx.fillText(labelText, todayX, labelY + 13);
                    
                    // Current AQI marker
                    // const dataPoints = chart.getDatasetMeta(0).data;
                    // if (dataPoints && dataPoints[todayPosition] && currentAqi) {
                    //     const point = dataPoints[todayPosition];
                    //     if (point && isFinite(point.y)) {
                    //         const intersectionY = point.y;
                            
                    //         // Outer ring
                    //         ctx.beginPath();
                    //         ctx.arc(todayX, intersectionY, 6, 0, 2 * Math.PI);
                    //         ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                    //         ctx.fill();
                    //         ctx.strokeStyle = 'rgba(156, 163, 175, 0.7)';
                    //         ctx.lineWidth = 2;
                    //         ctx.stroke();
                            
                    //         // Inner circle
                    //         ctx.beginPath();
                    //         ctx.arc(todayX, intersectionY, 4, 0, 2 * Math.PI);
                    //         ctx.fillStyle = getAQIColor(currentAqi);
                    //         ctx.fill();
                            
                    //         // Pulse effect
                    //         ctx.beginPath();
                    //         ctx.arc(todayX, intersectionY, 8, 0, 2 * Math.PI);
                    //         ctx.strokeStyle = getAQIColor(currentAqi) + '40';
                    //         ctx.lineWidth = 1;
                    //         ctx.stroke();
                    //     }
                    // }
                    
                    ctx.restore();
                }
            }
        ]
    });

    createCustomLegend();
}

// Air Quality Chart
// function updateAirQualityChart(chartData) {
//     const ctx = document.getElementById("airQualityChart")?.getContext("2d");
//     const stepSize = 20;
//     const rawMax = Math.max(...chartData);
//     const roundedMax = Math.ceil(rawMax / stepSize) * stepSize;
//     if (!ctx) return;

//     if (dashboardChart) {
//         dashboardChart.destroy();
//     }

//     function getAQIColor(aqi) {
//         if (aqi <= 50) return "#50cd89";       // Green
//         else if (aqi <= 100) return "#fbbf24"; // Yellow
//         else if (aqi <= 150) return "#f97316"; // Orange
//         else return "#ef4444";                 // Red
//     }

//     dashboardChart = new Chart(ctx, {
//         type: "line",
//         data: {
//             labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
//             datasets: [{
//                 label: "Predicted AQI",
//                 data: chartData,
//                 borderColor: "rgba(0,0,0,0)",
//                 backgroundColor: "rgba(0,0,0,0)",
//                 pointRadius: 0,
//                 pointHoverRadius: 8,
//                 pointBackgroundColor: "#ffffff",
//                 pointBorderColor: (ctx) => getAQIColor(chartData[ctx.dataIndex]),
//                 pointBorderWidth: 3,
//                 pointHoverBackgroundColor: "#ffffff",
//                 pointHoverBorderWidth: 4,
//                 fill: false,
//                 tension: 0.4
//             }]
//         },
//         options: {
//             responsive: true,
//             interaction: {
//                 intersect: false,
//                 mode: 'index'
//             },
//             animation: {
//                 duration: 2000,
//                 easing: 'easeInOutQuad'
//             },
//             plugins: {
//                 legend: { display: false },
//                 title: {
//                     display: true,
//                     text: 'AI-Predicted Air Quality Index - 12 Month Trend',
//                     font: { size: 13, weight: 'bold' },
//                     color: '#374151',
//                     padding: {top: 5, bottom: 8}
//                 },
//                 tooltip: {
//                     backgroundColor: 'rgba(0, 0, 0, 0.8)',
//                     titleColor: '#ffffff',
//                     bodyColor: '#ffffff',
//                     borderWidth: 1,
//                     cornerRadius: 8,
//                     displayColors: false,
//                     callbacks: {
//                         title: function(context) {
//                             return `${context[0].label} 2025`;
//                         },
//                         label: function(context) {
//                             const aqi = context.parsed.y;
//                             let category, emoji;
//                             if (aqi <= 50) {
//                                 category = "Good";
//                                 emoji = "🟢";
//                             } else if (aqi <= 100) {
//                                 category = "Moderate";
//                                 emoji = "🟡";
//                             } else if (aqi <= 150) {
//                                 category = "Unhealthy for Sensitive";
//                                 emoji = "🟠";
//                             } else {
//                                 category = "Unhealthy";
//                                 emoji = "🔴";
//                             }
//                             return [
//                                 `${emoji} AQI: ${Math.round(aqi)}`,
//                                 `Category: ${category}`,
//                                 `AI Prediction Confidence: High`
//                             ];
//                         }
//                     }
//                 }
//             },
//             scales: {
//                 x: {
//                     grid: { display: false },
//                     ticks: {
//                         color: "#374151",
//                         padding: 10,
//                         font: { size: 12, weight: '500' }
//                     },
//                     border: { display: false }
//                 },
//                 y: {
//                     beginAtZero: true,
//                     suggestedMax: 130,
//                     ticks: {
//                         stepSize: stepSize,
//                         color: "#374151",
//                         padding: 10,
//                         font: { size: 12, weight: '500' },
//                         callback: value => `${value} AQI`
//                     },
//                     grid: {
//                         display: false,
//                         borderDash: (ctx) => {
//                             const value = ctx.tick.value;
//                             return (value === 50 || value === 100 || value === 150) ? [] : [3, 3];
//                         },
//                         drawBorder: false
//                     },
//                     border: { display: false }
//                 }
//             },
//             layout: {
//                 padding: { top: 12, bottom: 20, left: 10, right: 10 }
//             }
//         },
//         plugins: [
//             {
//                 id: 'aqiGradientFill',
//                 beforeDatasetDraw(chart) {
//                     const { ctx, chartArea: { bottom, left, right } } = chart;
//                     const dataset = chart.data.datasets[0];
//                     const meta = chart.getDatasetMeta(0);
//                     if (!meta || !meta.data || meta.data.length < 2) return;

//                     const horizontalGradient = ctx.createLinearGradient(left, 0, right, 0);
//                     horizontalGradient.addColorStop(0, "#50cd89" + "22");
//                     horizontalGradient.addColorStop(0.33, "#fbbf24" + "22");
//                     horizontalGradient.addColorStop(0.66, "#f97316" + "22");
//                     horizontalGradient.addColorStop(1, "#ef4444" + "22");

//                     ctx.save();
//                     ctx.beginPath();

//                     const first = meta.data[0];
//                     ctx.moveTo(first.x, bottom);
//                     ctx.lineTo(first.x, first.y);

//                     for (let i = 0; i < meta.data.length - 1; i++) {
//                         const p0 = meta.data[i];
//                         const p1 = meta.data[i + 1];
//                         const cpX = (p0.x + p1.x) / 2;
//                         ctx.bezierCurveTo(cpX, p0.y, cpX, p1.y, p1.x, p1.y);
//                     }

//                     const last = meta.data[meta.data.length - 1];
//                     ctx.lineTo(last.x, bottom);
//                     ctx.closePath();

//                     ctx.fillStyle = horizontalGradient;
//                     ctx.fill();
//                     ctx.restore();
//                 }
//             },
//             {
//                 id: 'aqiGradientLine',
//                 afterDatasetDraw(chart) {
//                     const { ctx } = chart;
//                     const dataset = chart.data.datasets[0];
//                     const meta = chart.getDatasetMeta(0);
//                     if (!meta || !meta.data || meta.data.length < 2) return;

//                     ctx.save();
//                     ctx.lineWidth = 3;

//                     for (let i = 0; i < meta.data.length - 1; i++) {
//                         const p0 = meta.data[i];
//                         const p1 = meta.data[i + 1];
//                         const aqi0 = dataset.data[i];
//                         const aqi1 = dataset.data[i + 1];

//                         const gradient = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
//                         gradient.addColorStop(0, getAQIColor(aqi0));
//                         gradient.addColorStop(1, getAQIColor(aqi1));

//                         const cpX = (p0.x + p1.x) / 2;

//                         ctx.beginPath();
//                         ctx.strokeStyle = gradient;
//                         ctx.moveTo(p0.x, p0.y);
//                         ctx.bezierCurveTo(cpX, p0.y, cpX, p1.y, p1.x, p1.y);
//                         ctx.stroke();
//                     }

//                     ctx.restore();
//                 }
//             }
//         ]
//     });

//     createCustomLegend();
// }

function createCustomLegend() {
    const chartContainer = document.querySelector('.chart-container');
    if (!chartContainer) return;
    
    const existingLegend = chartContainer.querySelector('.custom-aqi-legend');
    if (existingLegend) {
        existingLegend.remove();
    }
    
    const legendHTML = `
        <div class="custom-aqi-legend">
            <div class="legend-items">
                <div class="legend-item">
                    <div class="legend-color good"></div>
                    <span class="legend-text">Good (0-50)</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color moderate"></div>
                    <span class="legend-text">Moderate (51-100)</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color unhealthy"></div>
                    <span class="legend-text">Unhealthy (101-150)</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color very-unhealthy"></div>
                    <span class="legend-text">Very Unhealthy (151+)</span>
                </div>
            </div>
        </div>
    `;
    
    chartContainer.insertAdjacentHTML('beforeend', legendHTML);
}

// PROFESSIONAL RECOMMENDATIONS UPDATE
async function updateProfessionalRecommendations(customDate = null, customModel = 'gbr') {
    try {
        console.log('🔄 Starting professional recommendations update...');
        
        const apiDate = customDate || window.AirSightDate.getCurrentDate();
        const response = await fetch(`${API_BASE_URL}/recommendations?date=${apiDate}&model=${customModel}`);
        const data = await response.json();
        
        console.log('✅ Recommendations API response:', data);
        
        const recommendationList = document.getElementById("recommendation-list");
        if (!recommendationList) {
            console.error('❌ Recommendation list element not found');
            return;
        }
        
        // Clear existing content
        recommendationList.innerHTML = '';
        
        // Get recommendations based on AQI
        const recommendations = getProfessionalRecommendations(data.aqi, data.category);
        
        console.log(`📋 Generated ${recommendations.length} professional recommendations for AQI ${data.aqi}`);
        
        // Create status card
        const statusCard = createStatusCard(data.aqi, data.category);
        
        let recommendationsHTML = statusCard;
        
        recommendations.forEach((rec, index) => {
            recommendationsHTML += `
                <div class="rec-card ${rec.priority}" style="animation-delay: ${index * 0.1}s">
                    <div class="rec-left">
                        <div class="rec-mini-icon ${rec.iconType}">
                            <i class="fa-solid ${rec.icon}"></i>
                        </div>
                        <div class="rec-border ${rec.priority}"></div>
                    </div>
                    <div class="rec-text">
                        <h4>${rec.title}</h4>
                        <p>${rec.description}</p>
                    </div>
                </div>
            `;
        });
        
        recommendationList.innerHTML = recommendationsHTML;
        
        console.log('✅ Professional recommendations rendered successfully');
        
    } catch (error) {
        console.error('❌ Error updating recommendations:', error);
        
        // Fallback recommendations (same as before)
        const recommendationList = document.getElementById("recommendation-list");
        if (recommendationList) {
            recommendationList.innerHTML = `
                <div class="aqi-status-card">
                    <div class="status-indicator loading"></div>
                    <div class="status-content">
                        <span class="status-title">Loading AQI Data...</span>
                        <span class="status-value">Please wait</span>
                    </div>
                </div>
                <div class="rec-card medium">
                    <div class="rec-left">
                        <div class="rec-mini-icon medium">
                            <i class="fa-solid fa-info-circle"></i>
                        </div>
                        <div class="rec-border medium"></div>
                    </div>
                    <div class="rec-text">
                        <h4>Stay Informed</h4>
                        <p>Monitor air quality updates regularly for health guidance.</p>
                    </div>
                </div>
            `;
        }
    }
}

function createStatusCard(aqi, category) {
    let statusClass = 'moderate';
    let statusTitle = 'Moderate Air Quality';
    let aqiLevel = 'moderate';
    
    if (aqi <= 50) {
        statusClass = 'good';
        statusTitle = 'Good Air Quality';
        aqiLevel = 'good';
    } else if (aqi <= 100) {
        statusClass = 'moderate';
        statusTitle = 'Moderate Air Quality';
        aqiLevel = 'moderate';
    } else if (aqi <= 150) {
        statusClass = 'unhealthy';
        statusTitle = 'Unhealthy for Sensitive';
        aqiLevel = 'unhealthy';
    } else {
        statusClass = 'dangerous';
        statusTitle = 'Unhealthy Air Quality';
        aqiLevel = 'dangerous';
    }
    
    return `
        <div class="aqi-status-card ${statusClass}">
            <div class="status-indicator ${statusClass}"></div>
            <div class="status-content">
                <span class="status-title">${statusTitle}</span>
                <span class="status-value">AQI: ${aqi}</span>
            </div>
        </div>
        <script>
            document.querySelector('.recommendations-wrapper').setAttribute('data-aqi-level', '${aqiLevel}');
        </script>
    `;
}

function getProfessionalRecommendations(aqi, category) {
    const recommendations = [];
    
    if (aqi <= 50) {
        recommendations.push({
            icon: 'fa-person-hiking',
            iconType: 'good',
            title: 'Perfect for Outdoor Activities',
            description: 'Great time for jogging, cycling, or visiting parks',
            priority: 'good'
        });
        
        recommendations.push({
            icon: 'fa-wind',
            iconType: 'good',
            title: 'Fresh Air Advantage',
            description: 'Open windows for natural ventilation',
            priority: 'good'
        });
        
        recommendations.push({
            icon: 'fa-heart',
            iconType: 'good',
            title: 'Cardio Exercise Time',
            description: 'Perfect for heart-healthy workouts',
            priority: 'good'
        });

        recommendations.push({
            icon: 'fa-sun',
            iconType: 'good',
            title: 'Enjoy the Outdoors',
            description: 'Take advantage of clean air',
            priority: 'good'
        });
        
    } else if (aqi <= 100) {
        recommendations.push({
            icon: 'fa-triangle-exclamation',
            iconType: 'warning',
            title: 'Limit Long Outdoor Time',
            description: 'Sensitive individuals should be cautious',
            priority: 'warning'
        });
        
        recommendations.push({
            icon: 'fa-clock',
            iconType: 'warning',
            title: 'Time Your Activities',
            description: 'Plan outdoor activities for morning/evening',
            priority: 'warning'
        });
        
        recommendations.push({
            icon: 'fa-house',
            iconType: 'medium',
            title: 'Close Windows at Peak',
            description: 'Keep indoor air clean during high pollution',
            priority: 'medium'
        });
        
        recommendations.push({
            icon: 'fa-stethoscope',
            iconType: 'medium',
            title: 'Health Monitoring',
            description: 'Extra care for asthma and heart conditions',
            priority: 'medium'
        });
        
    } else if (aqi <= 150) {
        recommendations.push({
            icon: 'fa-head-side-mask',
            iconType: 'danger',
            title: 'Wear N95 Masks',
            description: 'Essential protection when outside',
            priority: 'critical'
        });
        
        recommendations.push({
            icon: 'fa-ban',
            iconType: 'danger',
            title: 'Avoid Outdoor Exercise',
            description: 'Move all workouts indoors immediately',
            priority: 'critical'
        });
        
        recommendations.push({
            icon: 'fa-fan',
            iconType: 'warning',
            title: 'Use Air Purifiers',
            description: 'Run on high setting for clean air',
            priority: 'warning'
        });
        
        recommendations.push({
            icon: 'fa-baby',
            iconType: 'danger',
            title: 'Protect Vulnerable',
            description: 'Keep children and elderly indoors',
            priority: 'critical'
        });
        
    } else {
        recommendations.push({
            icon: 'fa-circle-exclamation',
            iconType: 'danger',
            title: 'HEALTH EMERGENCY',
            description: 'Avoid ALL outdoor activities',
            priority: 'emergency'
        });
        
        recommendations.push({
            icon: 'fa-house-lock',
            iconType: 'danger',
            title: 'Stay Indoors & Seal',
            description: 'Minimize exposure to outdoor air',
            priority: 'emergency'
        });
        
        recommendations.push({
            icon: 'fa-phone-medical',
            iconType: 'danger',
            title: 'Seek Medical Help',
            description: 'Contact healthcare for breathing issues',
            priority: 'emergency'
        });
        
        recommendations.push({
            icon: 'fa-air-freshener',
            iconType: 'danger',
            title: 'Max Air Filtration',
            description: 'Run all purifiers on maximum',
            priority: 'emergency'
        });
    }
    
    return recommendations.slice(0, 4);
}

function showLoadingState() {
    const container = document.querySelector('.dashboard-content');
    if (container) {
        container.style.opacity = '0.7';
        container.style.pointerEvents = 'none';
    }
}

function hideLoadingState() {
    const container = document.querySelector('.dashboard-content');
    if (container) {
        container.style.opacity = '1';
        container.style.pointerEvents = 'auto';
    }
}

function showErrorState(message) {
    const container = document.querySelector('.dashboard-content');
    if (container) {
        container.innerHTML = `
            <div class="error-state">
                <h2>⚠️ Error Loading Dashboard</h2>
                <p>${message}</p>
                <button onclick="initDashboard()">🔄 Retry</button>
            </div>
        `;
    }
}

// Date picker functionality for dashboard
function addDatePicker() {
    const topbar = document.querySelector('.topbar');
    if (topbar && !document.getElementById('dashboard-date-picker')) {
        const currentDate = window.AirSightDate.getCurrentDate();
        const datePickerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <label for="dashboard-date-picker" style="font-weight: 500;">Select Date:</label>
                <input 
                    type="date" 
                    id="dashboard-date-picker" 
                    value="${currentDate}"
                    style="padding: 8px; border: 1px solid #ddd; border-radius: 5px;"
                />
                <button 
                    onclick="updateDashboardDate()" 
                    style="
                        padding: 8px 16px; 
                        background: #e1fddc; 
                        border: none; 
                        border-radius: 5px; 
                        cursor: pointer;
                        font-weight: 500;
                    "
                >
                    Predict
                </button>
            </div>
        `;
        
        topbar.insertAdjacentHTML('beforeend', datePickerHTML);
    }
}

async function updateDashboardDate() {
    const datePicker = document.getElementById('dashboard-date-picker');
    if (datePicker) {
        const selectedDate = datePicker.value;
        const defaultModel = 'gbr'; // ✅ Add this
        console.log('🗓️ Updating dashboard for date:', selectedDate);
        
        // ✅ Add model parameter
        const response = await fetch(`${API_BASE_URL}/dashboard?date=${selectedDate}&model=${defaultModel}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch dashboard data');
        }
        
        updateDashboardCards(data);
        updateAQIBanner(data);
        updateAirQualityChart(data.chart_aqi, null, data.current_aqi, data.current_week_position);
        
        // ✅ Update recommendations with the same selected date and model
        const recResponse = await fetch(`${API_BASE_URL}/recommendations?date=${selectedDate}&model=${defaultModel}`);
        const recData = await recResponse.json();
        
        if (recResponse.ok) {
            // Update recommendations with new data
            const recommendationList = document.getElementById("recommendation-list");
            if (recommendationList) {
                const recommendations = getProfessionalRecommendations(recData.aqi, recData.category);
                const statusCard = createStatusCard(recData.aqi, recData.category);
                
                let recommendationsHTML = statusCard;
                recommendations.forEach((rec, index) => {
                    recommendationsHTML += `
                        <div class="rec-card ${rec.priority}" style="animation-delay: ${index * 0.1}s">
                            <div class="rec-left">
                                <div class="rec-mini-icon ${rec.iconType}">
                                    <i class="fa-solid ${rec.icon}"></i>
                                </div>
                                <div class="rec-border ${rec.priority}"></div>
                            </div>
                            <div class="rec-text">
                                <h4>${rec.title}</h4>
                                <p>${rec.description}</p>
                            </div>
                        </div>
                    `;
                });
                recommendationList.innerHTML = recommendationsHTML;
            }
        }
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('.dashboard-content')) {
        addDatePicker();
        initDashboard();
    }
});

// Export for global access
window.updateDashboardDate = updateDashboardDate;
window.initDashboard = initDashboard;