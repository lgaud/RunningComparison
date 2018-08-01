function convertToKm(distance, inputUnit) {
    // km, mi, m
    if (inputUnit == "km") {
        return distance;
    }
    if (inputUnit == "m") {
        return distance / 1000;
    }
    if (inputUnit == "mi") {
        return distance * 1.61;
    }
}

function calculatePace(distance, hours, minutes, seconds) {
    totalSeconds = toSeconds(hours, minutes, seconds);
    paceSeconds = totalSeconds / distance;
    return paceSeconds;
}

function toSeconds(hours, minutes, seconds) {
    return seconds + (60 * minutes) + (3600 * hours);
}

function toDate(seconds) {
    hours = Math.floor(seconds / 3600);
    remaining = seconds % 3600;
    minutes = Math.floor(remaining / 60);
    remaining = remaining % 60;
    return new Date(2018, 0, 1, hours, minutes, remaining);
}

function riegelConversion(baseTime, baseDistance, predictedDistance, fatigueFactor) {
    // https://projects.fivethirtyeight.com/marathon-calculator/
    // https://www.hillrunner.com/calculators/race-conversion/
    if (fatigueFactor === undefined) {
        fatigueFactor = 1.06;
    }
    return baseTime * Math.pow(predictedDistance / baseDistance, fatigueFactor)
}

function filterRow(row, gender, age) {
    if (row["Show"] === "Always" || (row["Show"] === "Default" && (gender === undefined || age === undefined))) {
        return true;
    }
    if (gender === "U" || gender === row["Gender"]) {
        if (age <= row["Max Age"] && age >= row["Min Age"]) {
            return true;
        }
    }
    return false;
}

function processDataForDot(allRows, filterGender, filterAge) {
    var adjustedTimes = [], labels = [];

    for (var i = 0; i < allRows.length; i++) {
        row = allRows[i];
        if (filterRow(row, filterGender, filterAge)) {
            distance = convertToKm(parseFloat(row['Distance']), row["Distance Unit"]);
            timeSeconds = toSeconds(parseInt(row["Hours"]), parseInt(row["Minutes"]), parseFloat(row["Seconds"]));
            time = toDate(timeSeconds);
            pace = calculatePace(distance, parseInt(row["Hours"]), parseInt(row["Minutes"]), parseFloat(row["Seconds"]));
            adjustedTime = riegelConversion(timeSeconds, distance, 5);

            index = findInsertIndex(adjustedTime, adjustedTimes);
            insertAtIndexOrEnd(index, adjustedTime, adjustedTimes);
            insertAtIndexOrEnd(index, makeLabelForDot(row), labels);
        }
    }
    return { x: adjustedTimes.map(toDate), y: labels };
}

function findInsertIndex(item, array) {
    index = array.findIndex(function (el, index, array) {
        return item >= el;
    });
    return index;
}

function insertAtIndexOrEnd(index, item, array) {
    if (index === -1) {
        array.push(item);
    }
    else {
        array.splice(index, 0, item);
    }
}

function makeLabelForDot(row) {
    return row["Name"] + " (" + row["Gender"] + ", " + row["Min Age"] + "-" + row["Max Age"] + ")";
}

function createAndFillArray(value, length) {
    var array = [];
    for (var i = 0; i < length; i++) {
        array.push(value);
    }
    return array;
}
function makeDot(x, y) {
    var plotDiv = document.getElementById("plot");
    var traces = [{
        x: x,
        y: y,
        type: "scatter",
        mode: "markers",
        marker: {
            color: createAndFillArray('cyan', x.length),
            opacity: 0.5,
            size: 10
        },
    }];
    plotData = traces;

    plotLayout = {
        title: 'Running Times, Standardized to 5k',
        xaxis: {
            title: 'Adjusted Time',
            tickformat: '%H:%M:%S',
            showline: true
        },
        margin: {
            l: 400,
            r: 40,
            b: 50,
            t: 80
        },
        height: 500,

    };
    Plotly.newPlot(plotDiv, traces, plotLayout);
}

function addConvertedDistance(chartData, rawData, layout) {
    var distance = parseFloat($("#distance").val());
    var hours = parseInt($("#hours").val());
    var minutes = parseInt($("#minutes").val());
    var seconds = parseFloat($("#seconds").val());

    var age = parseInt($("#age").val());
    var gender = $("input[name='gender']:checked").val();


    if (isNaN(hours)) {
        hours = 0
    }
    if (isNaN(minutes)) {
        minutes = 0
    }
    if (isNaN(seconds)) {
        seconds = 0
    }

    var filteredData = processDataForDot(rawData, gender, age);

    var converted = toDate(riegelConversion(toSeconds(hours, minutes, seconds), distance, 5));
    var trace = chartData[0];
    trace.x = filteredData.x;
    trace.y = filteredData.y;
    trace.marker.color = createAndFillArray("cyan", filteredData.x.length);
    var index = findInsertIndex(converted, trace.x);
    insertAtIndexOrEnd(index, converted, trace.x);
    insertAtIndexOrEnd(index, "Me (" + gender + ", " + age + ")", trace.y);
    insertAtIndexOrEnd(index, 'magenta', trace.marker.color);

    Plotly.newPlot("plot", chartData, layout);
    return chartData;
}

function makeplot() {
    Plotly.d3.csv("data.csv",
        function (data) {
            processedData = processDataForDot(data);
            makeDot(processedData.x, processedData.y);
            rawData = data;
        });

};
var rawData = undefined;
var plotData = undefined;
var plotLayout = undefined;
makeplot();

$("#add-button").click(function () { 
    plotData = addConvertedDistance(plotData, rawData, plotLayout);
    
});