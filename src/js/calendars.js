function makeRangeSelect() {
    const selectOptions = {
        "Weekly": 24 * 60 * 60,
        "Daily": 60 * 60,
        "Hourly": 60
    };

    const select = document.createElement("select");
    select.id = "apiRangeButton";
    const body = document.getElementsByTagName("BODY")[0];
    //body.insertBefore(select, body.firstChild); // Top of body
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

function updateCalendars(target, range) {
    let date = new Date(target.value);
    const dateLimits = {
        "Weekly": 7,
        "Daily": 1,
        "Hourly": 24 * 60 * 60 * 1000
    };
    if (target.id == "startCalendar") {
        // If range is Hourly it puts the "disabled" endCalendar to 24h (in milisec) ahead of current value
        if (range == "Hourly") {
            date.setTime(date.getTime() + dateLimits[range]);
            document.getElementById("endCalendar").value = new Date(date).toISOString().split("T")[0];
        } else {
            date.setDate(date.getDate() + dateLimits[range]);
            document.getElementById("endCalendar").min = new Date(date).toISOString().split("T")[0];
        }
    } else if (target.id == "endCalendar") {
        date.setDate(date.getDate() - dateLimits[range]);
        document.getElementById("startCalendar").max = new Date(date).toISOString().split("T")[0];
    }
}

function constructCalendar(id, range) {
    var calendar = document.createElement("input");
    calendar.setAttribute("type", "date");
    calendar.setAttribute("id", id);
    var date = new Date();
    date.setHours(0, 0, 0, 0);    //Midnatt
    calendar.max = new Date(date).toISOString().split("T")[0];
    calendar.addEventListener("change", (e) => updateCalendars(e.target, range));
    divAppend(calendar);
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
    let checkAPI = true;
    let timeStamps = [];
    const calendars = document.querySelectorAll("input[type=date]");
    for (let i = 0; i < calendars.length; i++) {
        if (calendars[i].value) {
            const date = new Date(calendars[i].value);
            console.log(calendars[i].id, ": ", date);
            timeStamps.push(date.getTime());
        } else {
            console.log("A value was empty");
            checkAPI = false;
        }
    }
    console.log("timestamps[1]", timeStamps[1], "as date obj", new Date(timeStamps[1]));
    console.log("Range choosen: " + range);
    console.log("api is " + checkAPI);
    if (checkAPI) {
        const correction = (range == 60) ? 0 : 86399000;
        const max = Math.max.apply(null, timeStamps) + correction; // Lägger till 23h59m59s om daily
        const min = Math.min.apply(null, timeStamps);
        const timeStamp = max - min;
        const limit = Math.floor(timeStamp / (1000 * range)); // Annars blir det x.99999...
        console.log("1000 * range", (1000 * range));
        console.log("timeresolution: " + selection.options[selection.selectedIndex].text)
        console.log("timestamp: " + timeStamp);
        console.log("limit: " + limit);
        console.log("fsym: " + "btc");

        makeApiCall(selection.options[selection.selectedIndex].text, max, limit, "btc");
    }
}