<net-panel>
    <div class="panel panel-default infopanel">
        <div class="panel-heading toggle" data-toggle="collapse" data-target="#netPanelCollapse">
            <span class="panel-title">
                Network (<span class="net_read">receive</span>/<span class="net_write">send</span>) &nbsp;
                <span class="pull-right">
                    <span class="net_read">{ tot_recv } K/s</span> / <span class="net_write">{ tot_sent } K/s</span>
                </span>
            </span>
        </div>
        <div id="netPanelCollapse" class="panel-collapse collapse in">
          <canvas id="net-io-chart" width="420" height="90" class="smoothchart"></canvas>
          <div class="panel-body">
            <table class="table-striped table-sparse" data-show-columns="true">
                <thead>
                <tr>
                  <th>User</th>
                  <th>PID</th>
                  <th>Recv. K/s</th>
                  <th>Sent K/s</th>
                  <th>Device</th>
                  <th>Command</th>
                </tr>
                </thead>
              <tbody>
                <tr each={ processes }>
                  <td>{USER}</td>
                  <td class="pid_col text-right"><a href="#" onclick={ parent.linkClick }>{PID}</a></td>
                  <td class="text-right net read highlight">{RECEIVED}</td>
                  <td class="text-right net write highlight">{SENT}</td>
                  <td class="text-left">{DEV}</td>
                  <td class="command_col"><div class="truncate">{PROGRAM}<div></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
    </div>
    
    <style type="text/css">
        td.pid_col {
            min-width: 45px;
        }
        .net.read,.net.write {
            width: 85px;
        }
        .net.read.highlight {
            background: rgba(62,111,90, 0.15);
        }
        .net.write.highlight {
            background: rgba(222,104,104, 0.15);
        }
        span.net_read {
            color: #3e6f5a;
        }
        
        span.net_write {
            color: #de6868;
        }
    </style>
    
    <script type="text/es6arrow">
        var readSeries = new TimeSeries();
        var writeSeries = new TimeSeries();
        var canvas;

        this.on('mount', function () {
            var chart = new SmoothieChart({
                millisPerPixel:500,
                minValue: 0,
                //minValueScale:1.05,
                yMinFormatter: () => '',
                yMaxFormatter: (max, prec) => parseFloat(max).toFixed(prec) + ' K/s',
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
            });
            canvas = document.getElementById('net-io-chart');

            chart.addTimeSeries(readSeries, { lineWidth:1.2, strokeStyle:'#3e6f5a', fillStyle:'rgba(62,111,90, 0.15)' });
            chart.addTimeSeries(writeSeries, { lineWidth:1.2, strokeStyle:'#de6868',fillStyle:'rgba(222,104,104, 0.15)' });
            chart.streamTo(canvas, 500);
            
            addTooltipToChart(chart, (xt, values) => (values[0] === null || values[1] === null) ? '' : 
                new Date(xt).toISOString().substr(11,8) + ' - R:' + values[0].toFixed(2) + ' K/s S:' + values[1].toFixed(2) + ' K/s');
        });
        
        start() {
            opts.pubsub.subscribe('nettop', (data) => this.updateProc(data));
        }
        
        stop() {
            opts.pubsub.unsubscribe('nettop');
        }
        
        updateProc(data) {
            while (data.processes.length < 5) data.processes.push({ PID: '.' });

            var now = Date.now();
            readSeries.append(now, data.tot_recv);
            writeSeries.append(now, data.tot_sent);
            
            this.update(data);
            
            stretchCanvas(canvas);
        }
        
        linkClick(event) {
            var row = event.item;
            var pid = parseInt(row.PID);
            if (row && pid) {
                if (confirm('Kill pid ' + row.PID + ' (' + row.PROGRAM + ')?')) {
                    opts.pubsub.publish('pidkill', { pid: pid });
                }
            }
        }
    </script>
</net-panel>