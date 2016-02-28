<io-panel>
    <div class="panel panel-default infopanel">
        <div class="panel-heading toggle" data-toggle="collapse" data-target="#ioPanelCollapse">
            <span class="panel-title">
                Disk IO (<span class="io_read">read</span>/<span class="io_write">write</span>) &nbsp;
                <span class="pull-right"><span class="io_read">{ io_read }</span> / <span class="io_write">{ io_write }</span></span>
            </span>
        </div>
        <div id="ioPanelCollapse" class="panel-collapse collapse in">
          <canvas id="disk-io-chart" width="420" height="90" class="smoothchart"></canvas>
          <div class="panel-body">
            <table class="table-striped table-sparse" data-show-columns="true">
                <thead>
                <tr>
                  <th>User</th>
                  <th>TID</th>
                  <th>Read</th>
                  <th>Write</th>
                  <th>IO%</th>
                  <th>Command</th>
                </tr>
                </thead>
              <tbody>
                <tr each={ processes }>
                  <td>{USER}</td>
                  <td class="tid_col text-right">{TID}</td>
                  <td class="text-right disk read highlight">{READ}</td>
                  <td class="text-right disk write highlight">{WRITE}</td>
                  <td class="text-right">{IO}</td>
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
        td.tid_col {
            min-width: 45px;
        }
        .disk.read,.disk.write {
            width: 78px;
        }
        .disk.read.highlight {
            background: rgba(62,111,90, 0.15);
        }
        .disk.write.highlight {
            background: rgba(222,104,104, 0.15);
        }
        span.io_read {
            color: #3e6f5a;
        }
        
        span.io_write {
            color: #de6868;
        }
    </style>
    
    <script type="text/es6arrow">
        var readSeries = new TimeSeries();
        var writeSeries = new TimeSeries();
        var canvas;

        this.on('mount', function() {
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
            canvas = document.getElementById('disk-io-chart');

            chart.addTimeSeries(readSeries, { lineWidth:1.2, strokeStyle:'#3e6f5a', fillStyle:'rgba(62,111,90, 0.15)' });
            chart.addTimeSeries(writeSeries, { lineWidth:1.2, strokeStyle:'#de6868',fillStyle:'rgba(222,104,104, 0.15)' });
            chart.streamTo(canvas, 500);
            
            addTooltipToChart(chart,  (xt, values) => (values[0] === null || values[1] === null) ? '' : 
                new Date(xt).toISOString().substr(11,8) + ' - R:' + values[0].toFixed(2) + ' K/s W:' + values[1].toFixed(2) + ' K/s');
        });
        
        start() {
            opts.pubsub.subscribe('iotop', (data) => this.updateProc(data));
        }
        
        stop() {
            opts.pubsub.unsubscribe('iotop');
        }
        
        updateProc(data) {
            var procs = data.processes;
            
            while (procs.length < 5) procs.push({ TID: '.' });

            var now = Date.now();
            readSeries.append(now, data.total_read);
            writeSeries.append(now, data.total_write);
            
            this.update({
                io_read : data.io_read,
                io_write : data.io_write,
                processes : procs
            });
            
            stretchCanvas(canvas);
        }
    </script>
</io-panel>