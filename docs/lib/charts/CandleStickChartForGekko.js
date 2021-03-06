/**
 * Created by robi on 17/2/7.
 */
"use strict";

import { format } from "d3-format";
import { timeFormat } from "d3-time-format";

import React from "react";

import { ChartCanvas, Chart, series, scale, coordinates, annotation, tooltip, axes, indicator, helper, utils } from "react-stockcharts";

var { CandlestickSeries, BarSeries, LineSeries, AreaSeries, MACDSeries } = series;
var { discontinuousTimeScaleProviderBuilder, discontinuousTimeScaleProvider } = scale;

var { CrossHairCursor, MouseCoordinateX, MouseCoordinateY, CurrentCoordinate } = coordinates;
var { EdgeIndicator } = coordinates;
var { Annotate, LabelAnnotation, Label } = annotation;

var { OHLCTooltip, MovingAverageTooltip, MACDTooltip, HoverTooltip } = tooltip;

var { XAxis, YAxis } = axes;
var { macd, ema, sma } = indicator;

var { fitWidth } = helper;

var { head, last } = utils;

var dateFormat = timeFormat("%H:%M:%S");
var numberFormat = format(".2f");

function getMaxUndefined(calculators) {
    return calculators.map(each => each.undefinedLength()).reduce((a, b) => Math.max(a, b));
}

function tooltipContent({currentItem, xAccessor}) {
    return currentItem.advice ? {
        x: dateFormat(xAccessor(currentItem)),
        y: [
            {label: "open", value: currentItem.open && numberFormat(currentItem.open)},
            {label: "high", value: currentItem.high && numberFormat(currentItem.high)},
            {label: "low", value: currentItem.low && numberFormat(currentItem.low)},
            {label: "close", value: currentItem.close && numberFormat(currentItem.close)},
            {label: "advice", value: currentItem.advice && currentItem.advice.recommendation},
            {label: "dp", value: currentItem.advice && currentItem.advice.v1},
        ]
    } : {};
}

const LENGTH_TO_SHOW = 180;

class CandleStickChartForGekko extends React.Component {
    constructor(props) {
        super(props);
        var { data: inputData } = props;

        var ema26 = ema()
            .id(0)
            .windowSize(26)
            .merge((d, c) => {d.ema26 = c})
            .accessor(d => d.ema26);

        var ema12 = ema()
            .id(1)
            .windowSize(12)
            .merge((d, c) => {d.ema12 = c})
            .accessor(d => d.ema12);

        var macdCalculator = macd()
            .fast(12)
            .slow(26)
            .signal(9)
            .merge((d, c) => {d.macd = c})
            .accessor(d => d.macd);

        var smaVolume50 = sma()
            .id(3)
            .windowSize(50)
            .sourcePath("volume")
            .merge((d, c) => {d.smaVolume50 = c})
            .accessor(d => d.smaVolume50);

        var maxWindowSize = getMaxUndefined([ema26,
            ema12,
            macdCalculator,
            smaVolume50
        ]);

        var defaultAnnotationProps = {
            fontFamily: "Glyphicons Halflings",
            fontSize: 5,
            opacity: 0.5,
            onClick: console.log.bind(console),
        }

        var longAnnotationProps = {
            ...defaultAnnotationProps,
            fill: "#006517",
            text: "\ue093",
            y: ({ yScale, datum }) => yScale(datum.low) + 20,
            tooltip: "Go long",
        };

        var shortAnnotationProps = {
            ...defaultAnnotationProps,
            fill: "#E20000",
            text: "\ue094",
            y: ({ yScale, datum }) => yScale(datum.high),
            tooltip: "Go short",
        };

        /* SERVER - START */
        var dataToCalculate = inputData.slice(-LENGTH_TO_SHOW - maxWindowSize)

        var calculatedData = ema26(ema12(macdCalculator(smaVolume50(dataToCalculate))));
        var indexCalculator = discontinuousTimeScaleProviderBuilder().indexCalculator();

        // console.log(inputData.length, dataToCalculate.length, maxWindowSize)
        var { index, interval } = indexCalculator(calculatedData);
        /* SERVER - END */

        var xScaleProvider = discontinuousTimeScaleProviderBuilder().withIndex(index).withInterval(interval);
        var { data: linearData, xScale, xAccessor, displayXAccessor } = xScaleProvider(calculatedData.slice(-LENGTH_TO_SHOW))

        // console.log(head(linearData), last(linearData))
        // console.log(linearData.length)

        this.state = {
            ema26,
            ema12,
            macdCalculator,
            smaVolume50,
            linearData,
            data: linearData,
            xScale,
            xAccessor, displayXAccessor,
            longAnnotationProps,
            shortAnnotationProps
        };
    }
    getChartCanvas() {
        return this.refs.chartCanvas;
    }
    render() {
        var { data, type, width, ratio } = this.props;
        var { ema26, ema12, macdCalculator, smaVolume50, longAnnotationProps, shortAnnotationProps } = this.state;

        return (
            <ChartCanvas ref="chartCanvas" ratio={ratio} width={width} height={600}
                         margin={{ left: 70, right: 70, top: 20, bottom: 30 }} type={type}
                         seriesName="XXX"
                         data={data} calculator={[ema26, ema12, macdCalculator, smaVolume50]}
                         xAccessor={d => d.date} xScaleProvider={discontinuousTimeScaleProvider}
                         >
                <Chart id={1} height={300}
                       yExtents={[d => [d.high, d.low], ema26.accessor(), ema12.accessor()]}
                       padding={{ top: 10, bottom: 20 }}>
                    <XAxis axisAt="bottom" orient="bottom" showTicks={false} outerTickSize={0} />
                    <YAxis axisAt="right" orient="right" ticks={5} />

                    <MouseCoordinateY
                        at="right"
                        orient="right"
                        displayFormat={format(".2f")} />

                    <CandlestickSeries />
                    <LineSeries yAccessor={ema26.accessor()} stroke={ema26.stroke()}/>
                    <LineSeries yAccessor={ema12.accessor()} stroke={ema12.stroke()}/>

                    <CurrentCoordinate yAccessor={ema26.accessor()} fill={ema26.stroke()} />
                    <CurrentCoordinate yAccessor={ema12.accessor()} fill={ema12.stroke()} />

                    <EdgeIndicator itemType="last" orient="right" edgeAt="right"
                                   yAccessor={d => d.close} fill={d => d.close > d.open ? "#6BA583" : "#FF0000"}/>

                    <OHLCTooltip origin={[-40, 0]}/>
                    <MovingAverageTooltip onClick={(e) => console.log(e)} origin={[-38, 15]}
                                          calculators={[ema26, ema12]}/>

                    <Annotate with={LabelAnnotation} when={d => d.advice && d.advice.recommendation === "long"}
                              usingProps={longAnnotationProps} />
                    <Annotate with={LabelAnnotation} when={d => d.advice && d.advice.recommendation === "short"}
                              usingProps={shortAnnotationProps} />

                </Chart>
                <Chart id={2} height={150}
                       yExtents={[d => d.volume, smaVolume50.accessor()]}
                       origin={(w, h) => [0, h - 300]}>
                    <YAxis axisAt="left" orient="left" ticks={5} tickFormat={format(".0s")}/>

                    <MouseCoordinateY
                        at="left"
                        orient="left"
                        displayFormat={format(".4s")} />

                    <BarSeries yAccessor={d => d.volume} fill={d => d.close > d.open ? "#6BA583" : "#FF0000"} />
                    <AreaSeries yAccessor={smaVolume50.accessor()} stroke={smaVolume50.stroke()} fill={smaVolume50.fill()}/>
                </Chart>
                <Chart id={3} height={150}
                       yExtents={macdCalculator.accessor()}
                       origin={(w, h) => [0, h - 150]} padding={{ top: 10, bottom: 10 }} >
                    <XAxis axisAt="bottom" orient="bottom"/>
                    <YAxis axisAt="right" orient="right" ticks={2} />

                    <MouseCoordinateX
                        at="bottom"
                        orient="bottom"
                        displayFormat={timeFormat("%H:%M:%S")} />
                    <MouseCoordinateY
                        at="right"
                        orient="right"
                        displayFormat={format(".2f")} />

                    <MACDSeries calculator={macdCalculator} />
                    <MACDTooltip origin={[-38, 15]} calculator={macdCalculator}/>
                </Chart>
                <CrossHairCursor />
                <HoverTooltip
                    chartId={1}
                    opacity={0.95}
                    yAccessor={d => d.high + 30}
                    tooltipContent={tooltipContent}
                    fontSize={15} />

            </ChartCanvas>
        );
    }
};

/*

 */

CandleStickChartForGekko.propTypes = {
    data: React.PropTypes.array.isRequired,
    width: React.PropTypes.number.isRequired,
    ratio: React.PropTypes.number.isRequired,
    type: React.PropTypes.oneOf(["svg", "hybrid"]).isRequired,
};

CandleStickChartForGekko.defaultProps = {
    type: "svg",
};

CandleStickChartForGekko = fitWidth(CandleStickChartForGekko);

export default CandleStickChartForGekko;
