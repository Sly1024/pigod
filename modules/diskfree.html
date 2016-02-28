<diskfree-panel>
    <div class="panel panel-default infopanel">
        <div class="panel-heading toggle" data-toggle="collapse" data-target="#dfPanelCollapse">
            <span class="panel-title">
                Disk Usage ({last_udpated})
            </span>
        </div>
        <div id="dfPanelCollapse" class="panel-collapse collapse in">
          <div class="panel-body limit-height">
            <table class="sortable table-striped table-sparse diskfree" data-show-columns="true">
                <thead>
                    <tr>
                        <th each={ col in columns } class={ highlight: parent.sortedBy == col.key }>
                            <a href="#" onclick={ parent.sortBy(col.key) }>{ col.header }</a>
                        </th>
                    </tr>
                </thead>
                    <tbody>
                        <tr each={ item in dflist }>
                            <td each={ col in parent.columns } class=column-{col.key}>
                                { item[col.key] }
                                <div if={ col.key == 'Use' } class="use-bar" style="width: {item.Use}"></div>
                            </td> 
                        </tr>
                    </tbody>
            </table>
          </div>
        </div>
    </div>
    
    <style type="text/css">
        .limit-height {
            max-height: 200px;
            overflow: auto;
        }
        .highlight > a {
            color: #00BCD4;
        }
        .diskfree td {
            position: relative;
        }
        .diskfree tr {
            opacity: 0.999;
        }
        .column-Use .use-bar {
            background-color: rgba(51, 122, 183, 0.25);
            position: absolute;
            top: 0;
            bottom: 0;
            left: 0;
            z-index: -1;
        }
        .column-Use {
            text-align: right;
            min-width: 120px;
        }
    </style>
    
    <script type="text/es6arrow">
        this.sortedBy = '';
        this.sortReversed = false;
        
        var dfSorted = [];     // sorted
        
        start() {
            opts.pubsub.subscribe('diskfree', (data) => this.updateProc(data));
        }
        
        stop() {
            opts.pubsub.unsubscribe('diskfree');
        }
        
        updateProc(data) {
            dfSorted = data.rows;
            
            this.doSort();
            
            this.update({
                columns: data.columns,
                last_udpated : new Date().toLocaleString(),
                dflist : dfSorted
            });
        }
        
        sortBy(what) {
            return () => {
                if (what == this.sortedBy) {
                    this.sortReversed = !this.sortReversed; 
                } else { 
                    this.sortReversed = false;
                    this.sortedBy = what;
                }
                this.doSort();
                this.update({ 
                    dflist : dfSorted
                });
            };
        }
        
        doSort() {
            var sort = this.sortedBy;
            if (sort) {
                var sample = dfSorted[0][sort];
                var compFn = this.addSortCmp(this.compareFn(sort, /^\d/.test(sample) && this.parseNum), ['Mountedon', 'FileSystem']);
                if (this.sortReversed) compFn = this.reverseCompareFn(compFn);
                dfSorted.sort(compFn);
            }
        }
        
        var scales = { K: 1<<10, M: 1<<20, G: 1<<30, T: 1<<40, '%': 0.01 };
        
        parseNum(str) {
            var val = parseFloat(str);
            var sc = scales[str[str.length-1]];
            return sc ? val * sc : val;
        }
        
        compareFn(sortField, preProc) {
            return preProc ? 
            ((a, b) => { 
                var av = preProc(a[sortField]), bv = preProc(b[sortField]);
                return av < bv ? -1 : av > bv ? 1 : 0;
            }) :
            ((a, b) => a[sortField] < b[sortField] ? -1 : a[sortField] > b[sortField] ? 1 : 0);
        }
        
        combineCompareFns(fn1, fn2) {
            return (a, b) => fn1(a, b) || fn2(a, b);
        }
        
        addSortCmp(fn, sortFields) {
            return sortFields.reduce((cfn, sortField) => this.combineCompareFns(cfn, this.compareFn(sortField)), fn);
        }
        
        reverseCompareFn(fn) {
            return (a, b) => fn(b, a);
        }
    </script>
</diskfree-panel>