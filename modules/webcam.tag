<webcam-panel>
    <div class="panel panel-default infopanel">
        <div class="panel-heading toggle" data-toggle="collapse" data-target="#webcamPanelCollapse">
            <span class="panel-title">
                WebCam
                <button style="float:right;" onclick={ refresh }>R</button>
            </span>            
        </div>
        <div id="webcamPanelCollapse" class="panel-collapse collapse in">
          <div class="panel-body">
            <img id="wcimg" src="http://{window.location.hostname}:8081/?action=stream" width="465">
          </div>
        </div>
    </div>
        
    <script type="text/es6arrow">
        start() {
            opts.pubsub.subscribe('webcam-stream', () => {});
        }
        
        stop() {
            opts.pubsub.unsubscribe('webcam-stream');
        }
        
        refresh(evt) {
            var src = this.wcimg.src;
            this.wcimg.src = null;
            this.wcimg.src = src;
            evt.stopPropagation();
        }
    </script>
</webcam-panel>