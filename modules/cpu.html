<cpu-panel>
    <div class="panel panel-default infopanel">
        <div class="panel-heading toggle" data-toggle="collapse" data-target="#cpuPanelCollapse">
            <span class="panel-title">
                CPU: <span class="cpu-percent">{ cpu_perc }%</span> <span class="temperature">{ cpu_temp }&deg;C</span> <span class="voltage">{ cpu_volt }V</span>&nbsp;
                <span>{ uptime }</span>&nbsp;
                <span class="pull-right">
                    MEM: <span class="free_mem" title="Used">{ used_mem }</span> / <span class="used_mem" title="Free">{ free_mem }</span> MiB
                </span>
            </span>
        </div>
        <div id="cpuPanelCollapse" class="panel-collapse collapse in">
          <canvas id="cpu-usage-chart" width="420" height="45" class="smoothchart"></canvas>
          <canvas id="cpu-temp-chart" width="420" height="45" class="smoothchart"></canvas>
          <div class="panel-body">
            <table class="sortable table-striped table-sparse" data-show-columns="true">
                <thead>
                    <tr>
                      <th>User</th>
                      <th>PID</th>
                      <th>NI</th>
                      <th>CPU%</th>
                      <th>Mem%</th>
                      <th>Time</th>
                      <th>Command</th>
                    </tr>
                </thead>
                    <tbody>
                        <tr each={ processes }>
                            <td>{USER}</td>
                            <td class="pid_col text-right"><a href="#" onclick={ parent.linkClick }>{PID}</a></td>
                            <td class="ni_col text-right">{NI}<span class="glyphicon glyphicon-chevron-down faded" onclick={ parent.renice(-1) }></span><span class="glyphicon glyphicon-chevron-up faded" onclick={ parent.renice(+1) }></span></td>
                            <td class="text-right cpu_col">{CPU}</td>
                            <td class="text-right">{MEM}</td>
                            <td class="text-right time_col">{TIME}</td>
                            <td class="command_col"><div class="truncate">{COMMAND}</div></td>
                        </tr>
                    </tbody>
            </table>
          </div>
        </div>
    </div>
    
    <style type="text/css">
        td.command_col {
            min-width: 150px;
        }
        td.time_col {
            min-width: 70px;
        }
        td.pid_col {
            min-width: 45px;
        }
        td.cpu_col {
            background-color: rgba(179,254,165,0.36);
        }
        td.ni_col {
            min-width: 45px;
        }
        .cpu-percent {
            color: #2FB075;
        }
        .temperature {
            color: #337ab7;
        }
        .voltage {
            color: #de6868;
        }
        span.free_mem {
            color: #3e6f5a;
        }
        
        span.used_mem {
            color: #de6868;
        }
        .faded {
            opacity: 0.25;
            cursor: pointer;
            font-size: 12px;
            transition: opacity .25s ease-in-out;
            -moz-transition: opacity .25s ease-in-out;
            -webkit-transition: opacity .25s ease-in-out;
        }
        .faded:hover {
            opacity: 1;
        }

    </style>
    
    <script type="text/es6arrow">
        var cpuSeries = new TimeSeries();
        var tempSeries = new TimeSeries();
        var voltSeries = new TimeSeries();
        var usage_canvas, temp_canvas;
        
        var defaultChartConfig = {
            millisPerPixel:500,
            maxValueScale:1.05,
            grid:{
                fillStyle:'#e2e2e2',
                strokeStyle:'rgba(0,0,0,0.20)',
                sharpLines:true,
                millisPerLine:10000,
                verticalSections:5
            },
            labels:{
                fillStyle:'#000000',
                fontSize:14,
                precision:1
            },
            timestampFormatter:SmoothieChart.timeFormatter
        };
        
        function setupChart(canvas_id, series, chartConfig, seriesStyles) {
            var canvas = $(canvas_id)[0];
            var chart = new SmoothieChart($.extend(chartConfig, defaultChartConfig));
            chart.addTimeSeries(series, seriesStyles);
            chart.streamTo(canvas, 500);
            return canvas;
        }
        
        this.on('mount', () => {
            usage_canvas = setupChart('#cpu-usage-chart', cpuSeries, {
                minValue: 0,
                yMinFormatter: () => '',
                yMaxFormatter: (max, prec) => parseFloat(cpuSeries.maxValue).toFixed(prec) + '%',
            }, { lineWidth:1.2, strokeStyle:'#3DFFA8', fillStyle:'rgba(179,254,165,0.36)' });
            
            temp_canvas = setupChart('#cpu-temp-chart', tempSeries, {
                minValueScale:1.05,
                yMinFormatter: (min, prec) => parseFloat(tempSeries.minValue).toFixed(prec) + '\u00b0C',
                yMaxFormatter: (max, prec) => parseFloat(tempSeries.maxValue).toFixed(prec) + '\u00b0C',
            }, { lineWidth:1.2, strokeStyle:'#008cff', fillStyle:'rgba(27,134,252,0.36)' });
            
            /*addTooltipToChart(chart, (xt, values) => (values[0] === null || values[1] === null) ? '' : 
                new Date(xt).toISOString().substr(11,8) + ' - ' + Math.floor(values[1] * 10) / 10 + '% (' + values[0] + '\u2103)'
            );*/
        });
        
        start() {
            opts.pubsub.subscribe('top', data => this.updateProc(data));
            opts.pubsub.subscribe('cputemp', data => this.updateCpuTemp(data));
        }
        
        stop() {
            opts.pubsub.unsubscribe('top');
            opts.pubsub.unsubscribe('cputemp');
        }
        
        
        updateProc(data) {
            while (data.processes.length < 5) data.processes.push({ PID: '.' });
            this.update(data);
            
            stretchCanvas(usage_canvas);
            stretchCanvas(temp_canvas);
            cpuSeries.append(Date.now(), data.cpu_perc);
        }
                
        updateCpuTemp(data) {
            this.update(data);
            if (data.cpu_temp) tempSeries.append(Date.now(), data.cpu_temp);
        }
        
        linkClick(event) {
            var row = event.item;
            var pid = parseInt(row.PID);
            if (row && pid) {
                if (confirm('Kill pid ' + row.PID + ' (' + row.COMMAND + ')?')) {
                    opts.pubsub.publish('pidkill', { pid: pid });
                }
            }
        }
        
        renice(delta) {
            return (event) => {
                var row = event.item;
                var pid = parseInt(row.PID);
                var ni = parseInt(row.NI);
                if (row && pid && !isNaN(ni)) {
                    opts.pubsub.publish('renice', { pid: pid, ni: ni+delta });
                }
            };
        }

    </script>
</cpu-panel>