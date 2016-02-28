<services-panel>
    <div class="panel panel-default infopanel">
        <div class="panel-heading toggle" data-toggle="collapse" data-target="#srvcPanelCollapse">
            <span class="panel-title">
                Services ({last_udpated})
            </span>
        </div>
        <div id="srvcPanelCollapse" class="panel-collapse collapse">
          <div class="panel-body">
            <table class="sortable table-striped table-sparse" data-show-columns="true">
                <thead>
                    <tr>
                      <th><a href="#" onclick={ sortBy('stat') }>Stat</a></th>
                      <th><a href="#" onclick={ sortBy('name') }>Service</a></th>
                      <th colspan="3">Command</th>
                    </tr>
                </thead>
                    <tbody>
                        <tr each={ services }>
                            <td><img src="images/{icon}.png" width="16" height="16"></td>
                            <td class="">{name}</td>
                            <td class="">
                                <img src="images/play.png" width="16" height="16" class={ enabled: canStart, disabled: !canStart }
                                onclick={ parent.startClick }>
                            </td>
                            <td class="">
                                <img src="images/stop.png" width="16" height="16" class={ enabled: canStop, disabled: !canStop }
                                onclick={ parent.stopClick }>
                            </td>
                            <td class="">
                                <img src="images/restart.png" width="16" height="16" class={ enabled: canStop, disabled: !canStop }
                                onclick={ parent.restartClick }>
                            </td>
                        </tr>
                    </tbody>
            </table>
          </div>
        </div>
    </div>
    
    <style type="text/css">
        img.disabled {
            -webkit-filter: grayscale(100%);
        }
        img.enabled {
            cursor: pointer;
        }
    </style>
    
    <script type="text/es6arrow">
        this.sortedBy = 'name';
        var sortProps = ['name', 'stat'];
        
        var servicesSorted = [];     // sorted
        var servicesByName = {};    // service obj by name 
        
        start() {
            opts.pubsub.subscribe('services', data => this.updateProc(data));
        }
        
        stop() {
            opts.pubsub.unsubscribe('services');
        }
        
        var svcStatRE = /^ \[ ([-+\?]) \]  (.*)$/;
        var status2Icon = {
            '-' : 'error',
            '+' : 'ok',
            '?' : 'help'
        };
        
        updateProc(data) {
            var lines = data.split('\n');
            var needSort = false;
            
            for (var i = 0; i < lines.length; ++i) {
                var match = lines[i].match(svcStatRE);
                if (match && match.length === 3) {
                    var name = match[2];
                    var stat = match[1];
                    var obj = servicesByName[name];
                    
                    if (!obj) {
                        obj = { name: name };
                        servicesByName[name] = obj;
                        servicesSorted.push(obj);
                        needSort = true;
                    }
                    obj.stat = stat;
                    obj.icon = status2Icon[stat];
                    obj.canStart = stat != '+';
                    obj.canStop = stat != '-';
                }
            }
            
            if (needSort) this.doSort();
            
            this.update({ 
                last_udpated : new Date().toLocaleString(),
                services : servicesSorted
            });   
        }
        
        sortBy(what) {            
            return () => {
                this.sortedBy = what;
                this.doSort();
                this.update({ 
                    services : servicesSorted
                });
            };
        }
        
        doSort() {
            var sort = this.sortedBy;
            var props = sortProps.filter(x => x != sort);
            servicesSorted.sort(this.combineCompareFns(this.compareFn(sort), this.compareFn(props[0])));
        }
        
        compareFn(sort) {
            return (a, b) => a[sort] < b[sort] ? -1 : a[sort] > b[sort] ? 1 : 0;
        }
        
        combineCompareFns(fn1, fn2) {
            return (a, b) => fn1(a, b) || fn2(a, b);
        }
        
        startClick(event) {
            var item = event.item;
            if (item && item.canStart) this.serviceCall(item.name, 'start');
        }
        
        stopClick(event) {
            var item = event.item;
            if (item && item.canStop) this.serviceCall(item.name, 'stop');
        }
        
        restartClick(event) {
            var item = event.item;
            if (item && item.canStop) this.serviceCall(item.name, 'restart');
        }
        
        serviceCall(name, command) {
            if (confirm(command + ' ' + name + ' ?')) {
                opts.pubsub.publish('serviceCall', { name: name, command: command });
            }
        }
    </script>
</services-panel>