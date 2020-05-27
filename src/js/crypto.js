window.addEventListener("resize", (e) => {
  if (isDrawn) {
    drawCanvas();
  }
})

let processedData = [];
let isDrawn = false;
let timeResolutionGlobalState = "";

function handleSubmit(e) {
  // dates här ska vara typ från kalendern
  let startDate = new Date("January 31 2020 00:00"),
    endDate = new Date("February 2 2020 12:30"),
    timeResolution,
    fsym;

  checkInput();
  makeApiCall("daily", "timestamp", 839, "btc");

}

function checkInput() {

}



function makeApiCall(timeResolution, timestamp, limit, fsym) {
  const apiKey = "ff8354bade31f78b01ddb5634247dc8f671875fd393a98fe2ee9306df95cd080";
  const apiType = {
    "Weekly": "histoday",
    "Daily": "histohour",
    "Hourly": "histominute"
  }
  console.log("URL", `https://min-api.cryptocompare.com/data/v2/${apiType[timeResolution]}?fsym=${fsym}&tsym=eur&limit=${limit}&toTs=${timestamp}&aggregate=1&api_key=${apiKey}`);
  d3.json(`https://min-api.cryptocompare.com/data/v2/${apiType[timeResolution]}?fsym=${fsym}&tsym=eur&limit=${limit}&toTs=${timestamp}&aggregate=1&api_key=${apiKey}`).then((json) => {
    processData(json, timeResolution);
    drawCanvas();
  });

}

function processData(json, timeResolution) {
  // töm föregående data och uppdatera global state vad timeres är
  processedData = [];
  timeResolutionGlobalState = timeResolution;

  const data = json.Data.Data;
  let dataPointRange = undefined,
    timeProperty = undefined;

  switch (timeResolution) {
    case "Hourly":
      dataPointRange = 60;
      timeProperty = "getHours";
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
  for (let i = 0; i < data.length; i += dataPointRange) {
    const day = data.slice(i, i + dataPointRange),
      highs = day.map((v) => v.high).sort(d3.ascending),
      lq = d3.quantile(highs, .25),
      median = d3.median(highs),
      uq = d3.quantile(highs, .75),
      min = d3.min(highs),
      max = d3.max(highs),
      startDate = new Date((day[0].time * 1000)),
      endDate = new Date((day[day.length - 1].time * 1000)),
      xAxisTime = startDate[timeProperty](), // xD can't believe this worked
      open = day[0].open,
      close = day[day.length - 1].close;
    processedData.push({
      lq, median, uq, min, max, startDate, endDate, open, close, xAxisTime
    });
  };

  console.log("processedDays", processedData);
  console.log("xAxisTime", processedData[0].xAxisTime);
}


function drawCanvas() {
  const margin = { top: 10, right: 30, bottom: 100, left: 40 },
    width = (window.innerWidth / 1.5) - margin.left - margin.right,
    height = (window.innerHeight / 1.5) - margin.top - margin.bottom;
  const boxWidth = width / processedData.length - 5;

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

  const yScaleMin = d3.min(processedData, (d) => d.min);
  const yScaleMax = d3.max(processedData, (d) => d.max);

  const yScale = d3.scaleLinear()
    .domain([yScaleMin, yScaleMax])
    .range([height, 0]);
  const xScale = d3.scaleBand()
    .range([0, width])
    .domain(processedData.map((d) => d.xAxisTime))
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
      switch (timeResolutionGlobalState) {
        case "Hourly":
          /**
           * TODO: Gör någåt smart sätt att korrigera timezone? Laga till UTC somehow bara kanske
           */
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
    .data(processedData)
    .enter()
    .append("line")
    .attr("x1", function (d, i) { return (xScale(d.xAxisTime)) })
    .attr("x2", function (d, i) { return (xScale(d.xAxisTime)) })
    .attr("y1", function (d) { return (yScale(d.min)) })
    .attr("y2", function (d) { return (yScale(d.max)) })
    .attr("stroke", (d, i) => greenOrRed(d))
    .style("width", 40);

  boxplots
    .selectAll("boxes")
    .data(processedData)
    .enter()
    .append("rect")
    .attr("x", function (d, i) { return (xScale(d.xAxisTime) - boxWidth / 2) })
    .attr("y", function (d) { return (yScale(d.uq)) })
    .attr("height", function (d) { return (yScale(d.lq) - yScale(d.uq)) })
    .attr("width", boxWidth)
    .attr("stroke", "black")
    .style("fill", (d, i) => greenOrRed(d));

  // Show the median
  boxplots
    .selectAll("medianLines")
    .data(processedData)
    .enter()
    .append("line")
    .attr("x1", function (d, i) { return (xScale(d.xAxisTime) - boxWidth / 2) })
    .attr("x2", function (d, i) { return (xScale(d.xAxisTime) + boxWidth / 2) })
    .attr("y1", function (d) { return (yScale(d.median)) })
    .attr("y2", function (d) { return (yScale(d.median)) })
    .attr("stroke", "black")
    .style("width", 80);

  // Draw a line based on median
  const path = d3.line()
    .x((d, i) => { return xScale(d.xAxisTime) })
    .y((d, i) => { return yScale(d.median) })
    

  var medianPath = chartGroup.append("g").attr("class", "path median");
  medianPath
    .append("path")
    .attr("class", "medianPath")
    .attr("stroke", "black")
    .attr("stroke-width", "4")
    .attr("fill", "none")
    .attr("d", path(processedData));
  medianPath
    .append("path")
    .attr("class", "medianPath")
    .attr("stroke", "cyan")
    .attr("stroke-width", "3")
    .attr("fill", "none")
    .attr("d", path(processedData));


  // make just the 1 button
  if (!isDrawn) {
    const id = "pathShowHide";
    constructSimpleButton(id, "Toggle");
    document.getElementById(id).addEventListener("click", medianShowHide);
  }

  // Set global boolean to true for on.window.resize
  isDrawn = true;
  function greenOrRed(d) {
    if (d.close > d.open) return "green"
    else return "red"
  }

  function medianShowHide() {
    const style = document.getElementsByClassName("medianPath")[0].style.display;
    if (style === "none") {
      document.getElementsByClassName("medianPath")[0].style.display = "block";
      document.getElementsByClassName("medianPath")[1].style.display = "block";
    } else {
      document.getElementsByClassName("medianPath")[0].style.display = "none";
      document.getElementsByClassName("medianPath")[1].style.display = "none";
    }
  }
}

makeRangeSelect();
