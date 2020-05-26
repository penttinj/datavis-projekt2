window.addEventListener("resize", (e) => {

  drawCanvas();
})

let processedData = [];
let isDrawn = false;

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
  console.log("URL", `https://min-api.cryptocompare.com/data/v2/${apiType[timeResolution]}?fsym=${fsym}&tsym=eur&limit=${limit}&toTs=${timestamp / 1000}&aggregate=1&api_key=${apiKey}`);
  d3.json(`https://min-api.cryptocompare.com/data/v2/${apiType[timeResolution]}?fsym=${fsym}&tsym=eur&limit=${limit}&toTs=${timestamp / 1000}&aggregate=1&api_key=${apiKey}`).then((json) => {
    processData(json, timeResolution);
    drawCanvas();
  });

}

function processData(json, timeResolution) {
  // töm föregående data
  processedData = [];
  const data = json.Data.Data;
  
  switch (timeResolution) {
    case "Hourly":
      dataPointRange = 60;
      break;
    case "Daily":
      dataPointRange = 24;
      break;
    case "Weekly":
      dataPointRange = 7;
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
      xTime = startDate.getHours();
      open = day[0].open,
      close = day[day.length - 1].close;
    processedData.push({
      lq, median, uq, min, max, startDate, endDate, open, close
    });
  };

  console.log("processedDays", processedData);
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
    .domain([yScaleMin - 50, yScaleMax + 50])
    .range([height, 0]);
  const xScale = d3.scaleBand()
    .range([0, width])
    .domain(processedData.map((d) => d.startDate.toDateString()))
    .paddingInner(1)
    .paddingOuter(.5)

  const chartGroup = svg
    .append("g")
    .attr("transform",
      "translate(" + margin.left + "," + margin.top + ")");

  // Visar x axis
  const xAxis = chartGroup.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(xScale))
    .selectAll("text")
    .attr("y", 7)
    .attr("x", 5)
    .attr("dy", ".35em")
    .attr("transform", "rotate(40)")
    .style("text-anchor", "start")
    .html((d) => d.slice(4));

  // Visar y axis
  chartGroup.append("g").call(d3.axisLeft(yScale));


  // Show the main vertical line
  chartGroup
    .selectAll("vertLines")
    .data(processedData)
    .enter()
    .append("line")
    .attr("x1", function (d, i) { return (xScale(d.startDate.toDateString())) })
    .attr("x2", function (d, i) { return (xScale(d.startDate.toDateString())) })
    .attr("y1", function (d) { return (yScale(d.min)) })
    .attr("y2", function (d) { return (yScale(d.max)) })
    .attr("stroke", (d, i) => greenOrRed(d))
    .style("width", 40);

  chartGroup
    .selectAll("boxes")
    .data(processedData)
    .enter()
    .append("rect")
    .attr("x", function (d, i) { return (xScale(d.startDate.toDateString()) - boxWidth / 2) })
    .attr("y", function (d) { return (yScale(d.uq)) })
    .attr("height", function (d) { return (yScale(d.lq) - yScale(d.uq)) })
    .attr("width", boxWidth)
    .attr("stroke", "black")
    .style("fill", (d, i) => greenOrRed(d));

  // Show the median
  chartGroup
    .selectAll("medianLines")
    .data(processedData)
    .enter()
    .append("line")
    .attr("x1", function (d, i) { return (xScale(d.startDate.toDateString()) - boxWidth / 2) })
    .attr("x2", function (d, i) { return (xScale(d.startDate.toDateString()) + boxWidth / 2) })
    .attr("y1", function (d) { return (yScale(d.median)) })
    .attr("y2", function (d) { return (yScale(d.median)) })
    .attr("stroke", "black")
    .style("width", 80);


  function greenOrRed(d) {
    if (d.close > d.open) return "green"
    else return "red"

    isDrawn = true;
  }
}

makeRangeSelect();
