/**
 * Created by robi on 17/2/7.
 */
"use strict";

import React from "react";

function getDisplayName(ChartComponent) {
    var name = ChartComponent.displayName || ChartComponent.name || "ChartComponent";
    return name;
}

export default function updatingGekkoData(ChartComponent) {
    const MAX_LENGTH = 2500;

    class UpdatingComponentHOC extends React.Component {
        constructor(props) {
            super(props);
            var len = Math.min(MAX_LENGTH, this.props.data.length);
            var data0 = this.props.data.slice(this.props.data.length-len, this.props.data.length-1)
            this.state = {
                length: data0.length,
                data: data0,
            }
            this.speed = 1000*10;

            this.refetch = () => {
                var tic = this.state.data[this.state.length-1].start+1;
                var tac = Math.ceil(new Date().getTime()/1000);

                fetch(this.props['data-url'] + `?from=${tic}&to=${tac}&advice=1`)
                    .then(function(response){
                        return response.json();
                    })
                    .then(function(data) {
                        for(var i = 0; i < data.length; ++i) {
                            data[i].date = new Date(data[i].start*1000);
                        }
                        return data;
                    })
                    .then(data => {
                        if (data.length > 0) {
                            var spliceTo = data.length + this.state.length - MAX_LENGTH;
                            var data1 = this.state.data;

                            if (spliceTo > 0) {
                                data1 = data1.splice(0,spliceTo);
                            }

                            for (var i = 0; i < data.length; ++i)
                                data1.push(data[i]);

                            this.setState({
                                length: data1.length,
                                data: data1
                            });
                        }
                    });
            };

            this.interval = setInterval(this.refetch, this.speed);

        }
        render() {
            var { type } = this.props;
            var { data } = this.state;
            var { url } = this.props['data-url'];

            return <ChartComponent ref="component" data={data} type={type} data-url={url}/>;
        }
    }
    UpdatingComponentHOC.defaultProps = {
        type: "svg",
    };
    UpdatingComponentHOC.displayName = `updatingGekkoData(${ getDisplayName(ChartComponent) })`;

    return UpdatingComponentHOC;
}
