function makeRangeSelect() {
    const selectOptions = {
        "Weekly": 24 * 60 * 60,
        "Daily": 60 * 60,
        "Hourly": 60
    };

    const select = document.createElement("select");
    select.id = "apiRangeButton";
    const body = document.getElementsByTagName("BODY")[0];
    body.appendChild(select);
    let option = document.createElement("option");
    option.disabled = true;
    option.selected = true;
    option.value = 0;
    option.text = "Please select a range";
    select.appendChild(option);
    Object.keys(selectOptions).forEach(key => {
        option = document.createElement("option");
        option.value = selectOptions[key];
        option.text = key;
        select.appendChild(option);
    });
    select.addEventListener("change", function (e) {
        console.log("Range set to: " + e.target.options[e.target.selectedIndex].text);
        makeCalendars(e.target);
    });
}

function makeCalendars(selection) {
    document.getElementById("api_selections").innerHTML = "";
    constructCalendar("startCalendar", selection.options[selection.selectedIndex].text);
    constructCalendar("endCalendar", selection.options[selection.selectedIndex].text);
    if (selection.options[selection.selectedIndex].text == "Hourly") {
        document.getElementById("endCalendar").disabled = true;
    }
    constructSimpleButton("clearDates", "Clear");
    constructSimpleButton("submitDates", "Submit");
    document.getElementById("clearDates").addEventListener("click", () => clearCalendars());
    document.getElementById("submitDates").addEventListener("click", () => checkAPIrequest(selection));
}

function updateCalendars(target, selection) {
    let date = new Date(target.value);
    const dateLimits = {
        "Weekly": 7,
        "Daily": 1,
        "Hourly": 24 * 60 * 60 * 1000
    };
    /*console.log("as date: " + target.valueAsDate);
    console.log("as number: " + target.valueAsNumber);
    if (selection == "Hourly") {
        date.setTime(date.getTime() + dateLimits[selection]);
        document.getElementById("endCalendar").value = new Date(date).toISOString().split("T")[0];
    }*/
}

function constructCalendar(id, selection) {
    const calendar = document.createElement("input");
    if (selection == "Weekly") {
        let result = getWeekNumber(new Date());
        calendar.setAttribute("type", "week");
        console.log("resault: " + result[0] + "-W" + result[1]);
        calendar.max = result[0] + "-W" + result[1];
    } else {
        let date = new Date();
        date.setHours(0, 0, 0, 0);    //Midnatt
        calendar.setAttribute("type", "date");
        calendar.max = new Date(date).toISOString().split("T")[0];
    }
    calendar.setAttribute("id", id);
    calendar.addEventListener("change", (e) => updateCalendars(e.target, selection));
    divAppend(calendar);
}

// From: https://stackoverflow.com/questions/6117814/get-week-of-year-in-javascript-like-in-php
function getWeekNumber(d) {
    // Copy date so don't modify original
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    // Get first day of year
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    // Calculate full weeks to nearest Thursday
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    // Return array of year and week number
    return [d.getUTCFullYear(), weekNo];
}

function constructSimpleButton(id, label) {
    var button = document.createElement("button");
    button.setAttribute("id", id);
    button.innerHTML = label;
    divAppend(button);
}

function divAppend(e) {
    document.getElementById("api_selections").appendChild(e);
}

function clearCalendars() {
    var calendars = document.querySelectorAll("input[type=date]");
    calendars.forEach(element => {
        element.value = "";
        var date = new Date();
        date.setHours(0, 0, 0, 0);    //Midnatt
        element.max = new Date(date).toISOString().split("T")[0];
        element.min = null;
    });
}


function checkAPIrequest(selection) {
    const range = selection.value
    const dateLimits = {
        "Weekly": (7 * 24 * 60 * 60 * 1000),
        "Daily": (24 * 60 * 60 * 1000),
        "Hourly": (24 * 60 * 60 * 1000)
    };
    const select = selection.options[selection.selectedIndex].text;
    let checkAPI = true;    // Turn false on problems
    let timeStamp;          // The final timestamp for api call
    let timeStamps = [];    // Push calendars value here
    let type = "";          // calendar type
    if (select == "Weekly") {
        type = "week";
    } else {
        type = "date";
    }
    if (select == "Hourly") {
        let date = new Date(document.getElementById("startCalendar").value);
        document.getElementById("endCalendar").value = new Date(date).toISOString().split("T")[0];
    }
    const calendars = document.querySelectorAll("input[type=" + type + "]");
    for (let i = 0; i < calendars.length; i++) {
        if (calendars[i].value || calendars[i].valueAsNumber) {
            let date;
            if (type == "week") {
                date = new Date(calendars[i].valueAsNumber);
            } else {
                date = new Date(calendars[i].value);
            }
            timeStamps.push(date.getTime());
        } else {
            console.log("A value was empty");
            checkAPI = false;
        }
    }
    console.log("timestamps[1]", timeStamps[1], "as date obj", new Date(timeStamps[1]));
    console.log("Range choosen: " + range);
    if (checkAPI) {
        const correction = dateLimits[select] -1;
        console.log("correction: "+correction);
        const max = Math.max.apply(null, timeStamps) + correction; // Lägger till 23h59m59s om daily
        const min = Math.min.apply(null, timeStamps);
        console.log("Date: "+new Date().getTime());
        console.log("max: "+max);
        console.log("min: "+min);
        if (!max || !min) {
            checkAPI = false;
        }
        timeStamp = Math.floor(max/1000);
        let limit = Math.floor((timeStamp - min) / (1000 * range));
        /*if (select == "Weekly") {
            timeStamp += 1000 * 60 * 60 * 24 * 7; // Moves pointer to end of week
            limit -= 1;                           // Fix: Goes over into next day
        } else if (select == "Daily") {
            timeStamp += 86399000;                // Moves pointer to end of day
        } else if (select == "Hourly"){
            limit -= 1;                           // Fix: Goes over into next day
        }*/
        console.log("timeresolution: " + select)
        console.log("timestamp: " + timeStamp);
        console.log("limit: " + limit);
        console.log("fsym: " + "btc");

        makeApiCall(select, timeStamp, limit, "ETH");
    }
}