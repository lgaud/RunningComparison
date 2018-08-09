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

function getColor(row) {
    var age = parseInt(row["Min Age"]);
    if(age === undefined || age < 20) {
        return "#081d58";
    }
    else if (age < 30) {
        return "#253494";
    }
    else if (age < 40) {
        return "#225ea8";
    }
    else if (age < 50) {
        return "#1d91c0";
    }
    else if (age < 60) {
        return "#41b6c4";
    }
    else if (age < 70) {
        return "#7fcdbb";
    }
    else if (age < 80) {
        return "#c7e8b4"
    }
    else {
        return "#edf8b1";
    }
}

function processDataForDot(allRows, filterGender, filterAge) {
    var adjustedTimes = [], labels = [], text = [], colors = [];

    for (var i = 0; i < allRows.length; i++) {
        var row = allRows[i];
        if (true || filterRow(row, filterGender, filterAge)) {
            var distance = convertToKm(parseFloat(row['Distance']), row["Distance Unit"]);
            var timeSeconds = toSeconds(parseInt(row["Hours"]), parseInt(row["Minutes"]), parseFloat(row["Seconds"]));
            var time = toDate(timeSeconds);
            var pace = calculatePace(distance, parseInt(row["Hours"]), parseInt(row["Minutes"]), parseFloat(row["Seconds"]));
            var adjustedTime = riegelConversion(timeSeconds, distance, 5);
            
            var index = findInsertIndex(adjustedTime, adjustedTimes);
            insertAtIndexOrEnd(index, adjustedTime, adjustedTimes);
            insertAtIndexOrEnd(index, makeLabelForDot(row), labels);
            insertAtIndexOrEnd(index, makeAgeLabelForDot(row), text);
            insertAtIndexOrEnd(index, getColor(row), colors)
        }
    }
    return { x: adjustedTimes.map(toDate), y: labels, colors: colors, text: text};
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
    return row["Name"] + " (" + row["Gender"] + ")";
}

function makeAgeLabelForDot(row) {
    return row["Min Age"] + "-" + row["Max Age"];
}

function createAndFillArray(value, length) {
    var array = [];
    for (var i = 0; i < length; i++) {
        array.push(value);
    }
    return array;
}
function makeDot(x, y, text,colors) {
    var plotDiv = document.getElementById("plot");
    var traces = [{
        x: x,
        y: y,
        type: "scatter",
        mode: "markers",
        marker: {
            color: colors, //createAndFillArray('#21B5B0', x.length),
            opacity: 0.8,
            size: 10,
            line: {
                width: 1,
                color: "#AAAAAA"
            }
        },
        text:  text
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

function addConvertedDistance(chartData, rawData, layout, gender, age, distance, time) {


    var filteredData = processDataForDot(rawData, gender, age);

    var converted = toDate(riegelConversion(time, distance, 5));
    var trace = chartData[0];
    trace.x = filteredData.x;
    trace.y = filteredData.y;
    trace.text = filteredData.text;
    
    trace.marker.color = filteredData.colors; //createAndFillArray("#21B5B0", filteredData.x.length);
    var index = findInsertIndex(converted, trace.x);
    insertAtIndexOrEnd(index, converted, trace.x);
    insertAtIndexOrEnd(index, "Me (" + gender + ", " + age + ")", trace.y);
    insertAtIndexOrEnd(index, '#B52170', trace.marker.color);

    Plotly.newPlot("plot", chartData, layout);
    return chartData;
}

function makeplot() {
    Plotly.d3.csv("data.csv",
        function (data) {
            processedData = processDataForDot(data);
            makeDot(processedData.x, processedData.y, processedData.text, processedData.colors);
            rawData = data;
        });
};

function getAgeGradeSeconds(rows, gender, age, distance) {
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        if(row["Age"] == age && row["Gender"] == gender) {
            return parseFloat(row[distance]);
        }
    }
    return NaN;
}
var ageGradeThresholds = [
    {"cutoff" : 0.9, "description": "World"},
    {"cutoff" : 0.8, "description": "National"},
    {"cutoff" : 0.7, "description": "Regional"},
    {"cutoff" : 0.6, "description": "Local"}
];
function updateAgeGrade(gender, age, distance, time) {
    if(ageGradeData === undefined) {
        Plotly.d3.csv("AgeGradingSeconds.csv", function(data) {
            ageGradeData = data;
            updateAgeGrade(gender, age, distance, time)
        });
        return;
    }
    var ageGradeSeconds = getAgeGradeSeconds(ageGradeData, gender, age, distance, time);
    var score = ageGradeSeconds / time;
    if(!isNaN(score)) {
        var f = Plotly.d3.format(".0f");
        scoreText = f(score*100)  + "%";
        for(var i = 0; i < ageGradeThresholds.length; i++) {
            if(score > ageGradeThresholds[i]["cutoff"]) {
                scoreText += " (" + ageGradeThresholds[i]["description"] + " class)";
                break;
            }
        }
    
        $("#age-grade-score").text(scoreText);
        $(".age-grade").show();
        var newLayout = createAgeGradeShapes(ageGradeSeconds);
        Plotly.relayout("plot", newLayout);
    }
    else {
        $(".age-grade").hide();
    }
}

function createAgeGradeShapes(ageGradeTime) {
    var shapes = [];
    var annotations = [];
    var min = ageGradeTime;
    var colors = ["#595959", "#595959", "#595959", "#595959"];
    var opacities = [0.4, 0.3, 0.2, 0.1]
    for(var i = 0; i < ageGradeThresholds.length; i++) {
        
        var max = ageGradeTime / ageGradeThresholds[i]["cutoff"];
        var rect = {
            'type': 'rect',
            // x-reference is assigned to the x-values
            'xref': 'x',
            // y-reference is assigned to the plot paper [0,1]
            'yref': 'paper',
            'x0': toDate(min),
            'y0': 0,
            'x1': toDate(max),
            'y1': 1,
            'fillcolor': colors[i],
            'opacity': opacities[i],
            'line': {
                'width': 0,
            }
        };
        var annotation = {
            
                xref: 'x',
                yref: 'paper',
                x: toDate((max + min) / 2),
                xanchor: 'center',
                y: 1 - (0.05 * (i % 2)),
                yanchor: 'bottom',
                text: ageGradeThresholds[i]["description"],
                showarrow: false
              
        }
        annotations.push(annotation)
        shapes.push(rect);
        min = max;
    }
    return {shapes: shapes, annotations: annotations};
}

var rawData = undefined;
var ageGradeData = undefined;
var plotData = undefined;
var plotLayout = undefined;
makeplot();

$("#add-button").click(function () {
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
    var time = toSeconds(hours, minutes, seconds);
    plotData = addConvertedDistance(plotData, rawData, plotLayout, gender, age, distance, time);
    updateAgeGrade(gender, age, distance + " km", time);
});