<commands-panel>
    <div class="panel panel-default infopanel">
        <div class="panel-heading toggle" data-toggle="collapse" data-target="#cmdsPanelCollapse">
            <span class="panel-title">
                Commands
            </span>
        </div>
        <div id="cmdsPanelCollapse" class="panel-collapse collapse in">
          <div class="panel-body">
            <table class="sortable table-striped table-sparse commands-table" data-show-columns="true">
                <thead>
                    <tr>
                      <th><a href="#" >Name</a></th>
                      <th><a href="#" >Command</a></th>
                      <th>Execute</th>
                    </tr>
                </thead>
                    <tbody>
                        <tr each={commands}>
                            <td nowrap class="cmds-name">{name}</td>
                            <td title="{command}"><div class="cmds-truncate">{command}</div></td>
                            <td><button onclick={parent.execClick}>Exec</button></td>
                        </tr>
                    </tbody>
            </table>
          </div>
        </div>
    </div>
    
    <style type="text/css">
        .cmds-truncate {
            width: 275px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .cmds-name {
            font-weight: bold;
        }
    </style>
    
    <script type="text/es6arrow">
        start() {
            opts.pubsub.subscribe('commands', data => this.updateProc(data));
            opts.pubsub.publish('getCommands');
        }
        
        stop() {
            opts.pubsub.unsubscribe('commands');
        }
        
        updateProc(data) {
            this.update({ 
                commands : data
            });
        }        
        
        execClick(event) {
            var item = event.item;
            if (item && item.id) this.execCommand(item.id, item.name);
        }
                
        execCommand(id, name) {
            if (confirm('Execute ' + name + ' ?')) {
                opts.pubsub.publish('execCommand', { id: id });
            }
        }
    </script>
</commands-panel>