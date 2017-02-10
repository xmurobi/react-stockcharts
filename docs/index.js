"use strict";

import { tsvParse } from  "d3-dsv";
import { timeParse } from "d3-time-format";

import React from "react";
import ReactDOM from "react-dom";

import Chart from "./lib/charts/CandleStickChartForGekkoLiveMarket";
//import Chart from "./lib/charts/CandleStickChartWithUpdatingData";

var ReadME = require("md/MAIN.md");

require("stylesheets/re-stock");

document.getElementById("content").innerHTML = ReadME;

var parseDate = timeParse("%Y-%m-%d");

if (!window.Modernizr.fetch || !window.Modernizr.promises) {
	require.ensure(["whatwg-fetch", "es6-promise"], function(require) {
		require("es6-promise");
		require("whatwg-fetch");
		loadPage();
	});
} else {
	loadPage();
}

//function loadPage() {
//	fetch("data/MSFT.tsv")
//		.then(response => response.text())
//		.then(data => tsvParse(data, d => {
//			d.date = new Date(parseDate(d.date).getTime());
//			d.open = +d.open;
//			d.high = +d.high;
//			d.low = +d.low;
//			d.close = +d.close;
//			d.volume = +d.volume;
//
//			return d;
//		}))
//		.then(data => {
//			ReactDOM.render(<Chart data={data} type="hybrid"/>, document.getElementById("chart"));
//		});
//}

function loadPage() {
    var gekkoapi = "http://localhost:7799/api/candles";

    fetch(gekkoapi)
        .then(function(response){
            return response.json();
        })
        .then(function(json) {
            for(var i = 0; i < json.length; ++i) {
                json[i].date = new Date(json[i].start*1000);
            }

            return json;
        })
        .then(data => {
            ReactDOM.render(<Chart data={data} type="hybrid" data-url={gekkoapi}/>, document.getElementById("chart"));
        });

}
