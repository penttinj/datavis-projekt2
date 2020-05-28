window.addEventListener("resize", (e) => {
  if (state.isDrawn) {
    drawCanvas();
  }
})

let state = {
  "data": [],
  "fsym": "",
  "tsym": "EUR",
  "isDrawn": false,
  "timeResolution": ""
};


function makeApiCall(timeResolution, timestamp, limit, fsym) {
  const apiKey = "ff8354bade31f78b01ddb5634247dc8f671875fd393a98fe2ee9306df95cd080";
  const apiType = {
    "Weekly": "histoday",
    "Daily": "histohour",
    "Hourly": "histominute"
  }
  const url = `https://min-api.cryptocompare.com/data/v2/${apiType[timeResolution]}?fsym=${fsym}` +
  `&tsym=eur&limit=${limit}&toTs=${timestamp}&aggregate=1&api_key=${apiKey}`
  state.fsym = fsym;

  console.log("URL", url);
  d3.json(url).then((json) => {
    if (json.Response == "Error") throw new Error(json.Message);
    processData(json, timeResolution);
    drawCanvas();
  })
    .catch((e) => {
      console.log("Error with api call");
      console.log(e);
      alert("An error happened with the request!")
    });

}

function processData(json, timeResolution) {
  // töm föregående data och uppdatera global state vad timeResolution är
  state.data = [];
  state.timeResolution = timeResolution;

  const rawData = json.Data.Data;
  let dataPointRange = undefined,
    timeProperty = undefined,
    timeZoneOffset = 0;

  switch (timeResolution) {
    case "Hourly":
      dataPointRange = 60;
      timeProperty = "getHours";
      timeZoneOffset = (new Date().getTimezoneOffset()) / 60;
      break;
    case "Daily":
      dataPointRange = 24;
      timeProperty = "toDateString";
      break;
    case "Weekly":
      dataPointRange = 7;
      timeProperty = "toDateString";
      break;
  }

  // Processa datan
  for (let i = 0; i < rawData.length; i += dataPointRange) {
    const day = rawData.slice(i, i + dataPointRange),
      highs = day.map((v) => v.high).sort(d3.ascending),
      lq = d3.quantile(highs, .25),
      median = d3.median(highs),
      uq = d3.quantile(highs, .75),
      min = d3.min(highs),
      max = d3.max(highs),
      startDate = new Date((day[0].time * 1000)),
      endDate = new Date((day[day.length - 1].time * 1000)),
      open = day[0].open,
      close = day[day.length - 1].close;
    let xAxisTime = startDate[timeProperty]();

    if (timeResolution == "Hourly") {
      xAxisTime += fixTimeOffset(xAxisTime, timeZoneOffset);
    }

    state.data.push({
      lq, median, uq, min, max, startDate, endDate, open, close, xAxisTime
    });
  };

  console.log("state data: ", state.data);
}

function fixTimeOffset(time, offset) {
  if (offset !== 0) {
    if (time + offset < 0) {
      return offset + 24;
    } else {
      return offset;
    }
  }
}

function drawCanvas() {
  const margin = { top: 10, right: 30, bottom: 100, left: 60 },
    width = (window.innerWidth / 1.5) - margin.left - margin.right,
    height = (window.innerHeight / 1.5) - margin.top - margin.bottom;
  const boxWidth = (width / state.data.length - 5) > width / 10 ? width / 10 : (width / state.data.length - 5);

  // Ta bort föregående SVG om finns
  d3.select("svg").remove();


  /**
   * Källa för box plots: https://www.d3-graph-gallery.com/graph/boxplot_several_groups.html
   */
  // append the svg object to the body of the page
  var svg = d3.select("#my_dataviz")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const yScaleMin = d3.min(state.data, (d) => d.min);
  const yScaleMax = d3.max(state.data, (d) => d.max);
  const scaleFactor = (yScaleMax - yScaleMin) * 0.2;

  const yScale = d3.scaleLinear()
    .domain([yScaleMin - scaleFactor, yScaleMax + scaleFactor])
    .range([height, 0]);
  const xScale = d3.scaleBand()
    .range([0, width])
    .domain(state.data.map((d) => d.xAxisTime))
    .paddingInner(1)
    .paddingOuter(.5)


  const chartGroup = svg
    .append("g")
    .attr("transform",
      "translate(" + margin.left + "," + margin.top + ")");


  // Visar x axis
  const xAxis = chartGroup.append("g")
    .attr("class", "axis x")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(xScale))
    .selectAll("text")
    .attr("y", 7)
    .attr("x", 5)
    .attr("dy", ".35em")
    .attr("transform", "rotate(40)")
    .style("text-anchor", "start")
    .html((d) => {
      switch (state.timeResolution) {
        case "Hourly":
          return `${d}:00`;
        case "Daily":
          return d.slice(4);
        case "Weekly":
          return d;
        default:
          return d;
      }
    });

  // Visar y axis
  chartGroup.append("g").attr("class", "axis y").call(d3.axisLeft(yScale));

  // Grupp för boxplots
  const boxplots = chartGroup.append("g").attr("id", "boxplots");

  // Show the main vertical line
  boxplots
    .selectAll("vertLines")
    .data(state.data)
    .enter()
    .append("line")
    .attr("x1", function (d) { return (xScale(d.xAxisTime)) })
    .attr("x2", function (d) { return (xScale(d.xAxisTime)) })
    .attr("y1", function (d) { return (yScale(d.min)) })
    .attr("y2", function (d) { return (yScale(d.max)) })
    .attr("stroke", (d) => greenOrRed(d));

  boxplots
    .selectAll("maxLines")
    .data(state.data)
    .enter()
    .append("line")
    .attr("x1", function (d) { return (xScale(d.xAxisTime) - boxWidth / 2) })
    .attr("x2", function (d) { return (xScale(d.xAxisTime) + boxWidth / 2) })
    .attr("y1", function (d) { return (yScale(d.max)) })
    .attr("y2", function (d) { return (yScale(d.max)) })
    .attr("stroke", (d) => greenOrRed(d));

  boxplots
    .selectAll("minLines")
    .data(state.data)
    .enter()
    .append("line")
    .attr("x1", function (d) { return (xScale(d.xAxisTime) - boxWidth / 2) })
    .attr("x2", function (d) { return (xScale(d.xAxisTime) + boxWidth / 2) })
    .attr("y1", function (d) { return (yScale(d.min)) })
    .attr("y2", function (d) { return (yScale(d.min)) })
    .attr("stroke", (d) => greenOrRed(d));

  // Skapa boxarna
  boxplots
    .selectAll("boxes")
    .data(state.data)
    .enter()
    .append("rect")
    .attr("rx", function (d) { return boxWidth < width / 10 ? 0 : 10 })
    .attr("ry", function (d) { return boxWidth < width / 10 ? 0 : 10 })
    .attr("x", function (d, i) { return (xScale(d.xAxisTime) - boxWidth / 2) })
    .attr("y", function (d) { return (yScale(d.uq)) })
    .attr("height", function (d) { return (yScale(d.lq) - yScale(d.uq)) })
    .attr("width", boxWidth)
    .attr("stroke", "black")
    .style("fill", (d, i) => greenOrRed(d))
    .on('mouseover', overHandler)
    .on('mouseout', outHandler)
    .on("mousemove", moveHandler);

  // Show the median
  boxplots
    .selectAll("medianLines")
    .data(state.data)
    .enter()
    .append("line")
    .attr("x1", function (d, i) { return (xScale(d.xAxisTime) - boxWidth / 2) })
    .attr("x2", function (d, i) { return (xScale(d.xAxisTime) + boxWidth / 2) })
    .attr("y1", function (d) { return (yScale(d.median)) })
    .attr("y2", function (d) { return (yScale(d.median)) })
    .attr("stroke", "black")
    .style("pointer-events", "none");

  // Create labels
  const labels = chartGroup.append("g").attr("class", "labels");
  // x axis label
  labels.append("text")
    .attr("class", "x")
    .attr("transform",
      "translate(" + (width / 2) + " ," +
      (height + margin.bottom / 2) + ")")
    .attr("font-family", "sans-serif")
    .attr("font-size", "20")
    .style("text-anchor", "middle")
    .text(getXLabel(state.timeResolution));
  // y axis label
  labels.append("text")
    .attr("class", "y")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .attr("font-family", "sans-serif")
    .attr("font-size", "20")
    .style("text-anchor", "middle")
    .text(`Price (${state.tsym})`);
  // trading pair label
  labels.append("text")
    .attr("class", "tradingPair")
    .attr("y", margin.top)
    .attr("x", margin.left)
    .attr("dy", "1em")
    .attr("font-family", "sans-serif")
    .attr("font-size", "10")
    .style("text-anchor", "middle")
    .text(`${state.tsym} - ${state.fsym}`);

  // Mouseover funktionalitet
  if (document.querySelectorAll(".tooltip").length == 0) {
    d3.select("body")
      .append("div")
      .style("opacity", 1)
      .style("display", "none")
      .attr("class", "tooltip")
      .style("font-size", "16px")
      .style("position", "absolute");
  }
  let tooltip = d3.select(".tooltip");

  function overHandler(ev) {
    let mouseY = d3.event.pageY - document.querySelector("body").getBoundingClientRect().y + 10;
    let mouseX = d3.event.pageX - document.querySelector("body").getBoundingClientRect().x + 10;

    tooltip
      .transition()
      .duration(200)
      .style("opacity", 1)
      .style("display", "block")
    tooltip
      .html(
        "<span style='color:grey'>Max: </span>" + ev.max + "<br>" +
        "<span style='color:grey'>Min: </span>" + ev.min + "<br>" +
        "<span style='color:grey'>Uq: </span>" + ev.uq + "<br>" +
        "<span style='color:grey'>Median: </span>" + ev.median + "<br>" +
        "<span style='color:grey'>Lq: </span>" + ev.lq + "<br>"
      )
      .style("left", mouseX)
      .style("top", mouseY)
  };
  function outHandler(ev) {
    tooltip
      .transition()
      .duration(200)
      .style("opacity", 0)
      .style("display", "none")
  };

  function moveHandler(ev) {
    let mouseY = d3.event.pageY - document.querySelector("body").getBoundingClientRect().y + 10;
    let mouseX = d3.event.pageX - document.querySelector("body").getBoundingClientRect().x + 10;
    tooltip
      .style("left", (mouseX + 30) + "px")
      .style("top", (mouseY + 30) + "px")
  }


  // Draw a line based on median
  const path = d3.line()
    .x((d) => { return xScale(d.xAxisTime) })
    .y((d) => { return yScale(d.median) })
    .curve(d3.curveLinear);


  var medianPath = chartGroup.append("g").attr("class", "path median");
  medianPath
    .append("path")
    .attr("class", "medianPath")
    .attr("stroke", "black")
    .attr("stroke-width", "4")
    .attr("fill", "none")
    .attr("d", path(state.data))
    .style("display", "none");
  medianPath
    .append("path")
    .attr("class", "medianBorder")
    .attr("stroke", "cyan")
    .attr("stroke-width", "2")
    .attr("fill", "none")
    .attr("d", path(state.data))
    .style("display", "none");


  // make just the 1 button
  if (!state.isDrawn) {
    const id = "pathShowHide";
    constructSimpleButton(id, "Median Line");
    document.getElementById(id).addEventListener("click", medianShowHide);
  }

  // Set global boolean to true for on.window.resize
  state.isDrawn = true;
  function greenOrRed(d) {
    if (d.close > d.open) return "green"
    else return "red"
  }

  function medianShowHide() {
    const style = document.getElementsByClassName("medianPath")[0].style.display;
    if (style === "none") {
      document.getElementsByClassName("medianPath")[0].style.display = "block";
      document.getElementsByClassName("medianBorder")[0].style.display = "block";
    } else {
      document.getElementsByClassName("medianPath")[0].style.display = "none";
      document.getElementsByClassName("medianBorder")[0].style.display = "none";
    }
  }
}

function getXLabel(timeResolution) {
  switch (timeResolution) {
    case "Weekly":
      return "Weeks"
    case "Daily":
      return "Days"
    case "Hourly":
      return "Hours(UTC)"
  }
}
