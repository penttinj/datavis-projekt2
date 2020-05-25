window.addEventListener("resize", (e) => {
  drawCanvas();
})

let processedData = [];

function handleSubmit(e) {
  let startDate = new Date(),
    endDate,
    timeResolution,
    fsym;

    checkInput();
    makeApiCall();
 
}

function checkInput() {

}



function makeApiCall(timeResolution, timestamp, limit, fsym) {
  const apiKey = "ff8354bade31f78b01ddb5634247dc8f671875fd393a98fe2ee9306df95cd080";
  d3.json(`https://min-api.cryptocompare.com/data/v2/histohour?fsym=BTC&tsym=USD&limit=95&aggregate=1&api_key=${apiKey}`).then((json) => {
    processData(json, timeResolution);
    drawCanvas();
  });

}

function processData(json, timeResolution) {
  const data = json.Data.Data;
  let dataPointRange = 24; // placeholder value until the UI works
  switch (timeResolution) {
    case "hourly":
      dataPointRange = 60;
    case "daily":
      dataPointRange = 24;
    case "weekly":
      dataPointRange = 7;
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
      startDate = new Date(day[0].time * 1000),
      endDate = new Date(day[day.length - 1].time * 1000);
    console.log("endDate.getDay", endDate.toDateString());
    processedData.push({
      lq, median, uq, min, max, startDate, endDate
    });
  };

  console.log("processedDays", processedData);
}


function drawCanvas() {
    const margin = { top: 10, right: 30, bottom: 30, left: 40 },
      width = (window.innerWidth / 1.5) - margin.left - margin.right,
      height = (window.innerHeight / 1.5) - margin.top - margin.bottom;
    const boxWidth = 100;

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

    console.log("yscalemin", yScaleMin * 0.8);
    console.log("yscalemax", yScaleMax * 1.2);

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
      .attr("stroke", "black")
      .style("width", 40)

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
      .style("fill", "#69b3a2")

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

}

handleSubmit();
