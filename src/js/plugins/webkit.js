/** The WebKitBrowser plugin renders webkit information and provides control to the WPE WebKit browser
 */

class WebKitBrowser extends Plugin {

    constructor(pluginData) {
        super(pluginData);
        this.socketListenerId = api.addWebSocketListener(this.callsign, this.handleNotification.bind(this));
        this.url = '';
        this.fps = 0;
        this.isHidden = false;
        this.isSuspended = false;
        this.lastSetUrlKey = 'lastSetUrl';
        this.lastSetUrl = window.localStorage.getItem(this.lastSetUrlKey) || '';
        this.inspectorPort = '9998';
        this.updateLoopInterval = undefined;

        this.template = `<div id="content_{{callsign}}" class="grid">

            <div class="title grid__col grid__col--8-of-8">Presets / URL</div>

            <div class="label grid__col grid__col--2-of-8">URL</div>
            <div id="{{callsign}}_current_url" class="text grid__col grid__col--6-of-8">-</div>

            <div class="label grid__col grid__col--2-of-8">
                <label for="{{callsign}}_url">Custom URL</label>
            </div>
            <div class="text grid__col grid__col--6-of-8">
                <input type="text" id="{{callsign}}_url" size="20"/>
                <button id="{{callsign}}_button" type="button">SET</button>
                <button id="{{callsign}}_reloadbutton" type="button">RELOAD</button>
            </div>

            <div class="label grid__col grid__col--2-of-8">URL presets</div>
            <div class="text grid__col grid__col--6-of-8">
                <select id="{{callsign}}_linkPresets"></select>
            </div>

            <div class="title grid__col grid__col--8-of-8">Performance</div>
            <div class="label grid__col grid__col--2-of-8">FPS</div>
            <div id="{{callsign}}_fps" class="text grid__col grid__col--6-of-8">-</div>
            <div id="{{callsign}}Memory" class="memoryInfo"></div>

            <div class="title grid__col grid__col--8-of-8">Tools</div>

            <div class="label grid__col grid__col--2-of-8">Current State</div>
                <div id="{{callsign}}StateInfo" class="text grid__col grid__col--6-of-8"></div>
                <div class="label grid__col grid__col--2-of-8"></div>
                <div class="label grid__col grid__col--6-of-8">
                    <button id="{{callsign}}SuspendButton" type="button"></button>
            </div>

            <div class="label grid__col grid__col--2-of-8">Visibility</div>
            <div id="{{callsign}}VisibilityStateInfo" class="text grid__col grid__col--6-of-8"></div>
            <div class="label grid__col grid__col--2-of-8"></div>
            <div class="text grid__col grid__col--6-of-8">
                <button type="button" id="{{callsign}}VisibilityButton">HIDE</button>
            </div>

            <div class="label grid__col grid__col--2-of-8">Web Inspector</div>
            <div class="text grid__col grid__col--6-of-8">
                <button type="button" id="{{callsign}}Inspector">INSPECT</button>
            </div>

        </div>`;

        this.presets = [
            { Name:"Select a preset",   URL:""},
            { Name:"about:blank",       URL:"about:blank"},
            { Name:"Smashcat",          URL:"http://www.smashcat.org/av/canvas_test/" },
            { Name:"HTML5",             URL:"http://beta.html5test.com/" },
            { Name:"PeaceKeeper",       URL:"http://peacekeeper.futuremark.com/run.action" },
            { Name:"ChipTune",          URL:"http://www.chiptune.com/kaleidoscope/" },
            { Name:"Poster Circle",     URL:"http://www.webkit.org/blog-files/3d-transforms/poster-circle.html" },
            { Name:"Aquarium",          URL:"http://webglsamples.org/aquarium/aquarium.html" },
            { Name:"Particles",         URL:"http://oos.moxiecode.com/js_webgl/particles_morph/" },
            { Name:"EME v3 (race car)", URL:"http://cdn.metrological.com/static/eme-v3-clean.html" },
            { Name:"MSE 2018 (no vp9)",          URL:"http://yt-dash-mse-test.commondatastorage.googleapis.com/unit-tests/2018.html?novp9=true" },
            { Name:"EME 2018",          URL:"http://yt-dash-mse-test.commondatastorage.googleapis.com/unit-tests/2018.html?test_type=encryptedmedia-test" },
            { Name:"Progressive",       URL:"http://yt-dash-mse-test.commondatastorage.googleapis.com/unit-tests/2018.html?test_type=progressive-test" },
            { Name:"YouTube",           URL:"http://youtube.com/tv" },
            { Name:"HelloRacer",        URL:"http://www.emerveille.fr/lab/helloracer/index.html" },
            { Name:"Leaves",            URL:"http://www.webkit.org/blog-files/leaves" },
            { Name:"Canvas Dots",       URL:"http://themaninblue.com/experiment/AnimationBenchmark/canvas/" },
            { Name:"Anisotropic",       URL:"http://whiteflashwhitehit.com/content/2011/02/anisotropic_webgl.html" },
            { Name:"Pasta",             URL:"http://alteredqualia.com/three/examples/webgl_pasta.html" },
            { Name:"CSS3",              URL:"http://css3test.com" },
            { Name:"Kraken",            URL:"http://krakenbenchmark.mozilla.org/kraken-1.1/driver.html" },
            { Name:"KeyPress Test",     URL:"http://www.asquare.net/javascript/tests/KeyCode.html" }
        ];

        // get inspector link
        if (this.configuration !== undefined && this.configuration.inspector !== undefined) {
            this.inspectorPort = this.configuration.inspector.split(':')[1];
        }
    }

    handleNotification(json) {
        if (this.rendered === false)
            return;

        //this only receives webkit events;
        var data = json.data || {};
        if (typeof data.suspended === 'boolean')
            this.isSuspended = data.suspended;

        if (typeof data.hidden === 'boolean')
            this.isHidden = data.hidden;

        if (data.url && data.loaded)
            this.url = data.url;

        //@TODO, this does not exists? Maybe exporse over socket?
        if (data.fps)
            this.fps = data.fps;

        this.update();
    }

    render()        {
        var mainDiv = document.getElementById('main');
        var webKitHtmlString = this.template.replace(/{{callsign}}/g, this.callsign);
        mainDiv.innerHTML = webKitHtmlString;

        //updateUrl
        document.getElementById(this.callsign + '_url').value = this.lastSetUrl;

        // bind the button
        var urlButton = document.getElementById(this.callsign + '_button');
        urlButton.onclick = this.getAndSetUrl.bind(this);

        var reloadbutton = document.getElementById(this.callsign + '_reloadbutton');
        reloadbutton.onclick = this.reloadUrl.bind(this);

        // bind dropdown
        var linkPresets = document.getElementById(this.callsign + '_linkPresets');
        linkPresets.onchange = this.getAndSetUrlFromPresets.bind(this);

        // add presets
        var presetsElement = document.getElementById(this.callsign + '_linkPresets');
        if (presetsElement.children.length === 0) {
            for (var j=0; j<this.presets.length; j++) {
                var option = document.createElement('option');
                option.text = this.presets[j].Name;
                option.value = this.presets[j].URL;

                presetsElement.appendChild(option);
            }
        }

        // bind webinspector
        var inspectorButton = document.getElementById(this.callsign + 'Inspector');
        inspectorButton.onclick = this.launchWebinspector.bind(this);

        window.addEventListener('keydown', this.handleKey.bind(this));

        var urlInputEl = document.getElementById(this.callsign + '_url');
        urlInputEl.onblur = function() {
            if (plugins.RemoteControl !== undefined)
                plugins.RemoteControl.doNotHandleKeys = false;
        };

        urlInputEl.onfocus = function() {
            if (plugins.RemoteControl !== undefined)
                plugins.RemoteControl.doNotHandleKeys = true;
        };

        this.updateLoopInterval = setInterval(this.updateLoop.bind(this), conf.refresh_interval);

        this.rendered = true;
        this.updateLoop();
    }

    updateLoop() {
        if (this.rendered === false)
            return;

        var self = this;
        api.getPluginData(this.callsign, (err, resp) => {
            if (err) {
                console.error(err);
                return;
            }
            self.url = resp.url;
            self.fps = resp.fps;
            self.isHidden = resp.hidden;
            self.isSuspended = resp.suspended;
            self.update();
        });
    }


    close() {
        window.removeEventListener('keydown', this.handleKey.bind(this), false);
        clearInterval(this.updateLoopInterval);

        delete this.updateLoopInterval;
        delete this.socketListenerId;
        delete this.url;
        delete this.fps;
        delete this.isHidden;
        delete this.isSuspended;

        this.rendered = false;
    }

    update() {
        document.getElementById(this.callsign + '_current_url').innerHTML = this.url;
        document.getElementById(this.callsign + '_fps').innerHTML = this.fps;

        var state = this.isSuspended ? 'Suspended' : 'Resumed';
        var nextState = this.isSuspended ? 'Resume' : 'Suspend';

        var stateEl = document.getElementById(this.callsign + 'StateInfo');
        stateEl.innerHTML = state;

        var suspendButton = document.getElementById(this.callsign + 'SuspendButton');
        suspendButton.innerHTML = nextState.toUpperCase();
        suspendButton.onclick = this.toggleSuspend.bind(this, nextState);

        var visibilityState = this.isHidden ? 'Hidden' : 'Visible';
        var nextVisibilityState = this.isHidden ? 'Show' : 'Hide';

        var visbilityStateEl = document.getElementById(this.callsign + 'VisibilityStateInfo');
        visbilityStateEl.innerHTML = visibilityState.toUpperCase();

        var visibilityButton = document.getElementById(this.callsign + 'VisibilityButton');
        visibilityButton.innerHTML = nextVisibilityState.toUpperCase();
        visibilityButton.onclick = this.toggleVisibility.bind(this, nextVisibilityState);

        // get memory data and div if the monitor plugin is loaded
        if (plugins.Monitor !== undefined && plugins.Monitor.getMonitorDataAndDiv !== undefined) {
            var memoryDiv = document.getElementById(this.callsign + 'Memory');
            plugins.Monitor.getMonitorDataAndDiv(this.callsign, (d) => {
                if (d === undefined)
                    return;

                memoryDiv.innerHTML = '';
                memoryDiv.appendChild(d);
            });
        }
    }

    setUrl(url) {
        if (url !== '') {
            console.log('Setting url ' + url + ' for ' + this.callsign);
            api.setUrl(this.callsign, url);
        }


        document.getElementById(this.callsign + '_linkPresets').selectedIndex = 0;
    }

    getAndSetUrl() {
        this.lastSetUrl = document.getElementById(this.callsign + '_url').value;

        this.setUrl(this.lastSetUrl);
        window.localStorage.setItem(this.lastSetUrlKey, this.lastSetUrl);
    }

    reloadUrl() {
        api.setUrl(this.callsign, document.getElementById(this.callsign + '_current_url').innerHTML);
    }

    getAndSetUrlFromPresets() {
        var idx = document.getElementById(this.callsign + '_linkPresets').selectedIndex;
        if (idx > 0) {
            this.setUrl(this.presets[idx].URL);
        }
    }

    handleKey(e) {
        var input = document.getElementById('WebKitBrowser_url');

        if (e.which === 13 && input && input === document.activeElement) {
            this.getAndSetUrl();
        }
    }

    toggleSuspend(nextState) {
        var self = this;

        if (nextState === 'Resume') {
            api.resumePlugin(self.callsign);
        } else {
            api.suspendPlugin(self.callsign);
        }
    }

    toggleVisibility(nextState) {
        var self = this;

        if (nextState === 'Show') {
            api.showPlugin(self.callsign);
        } else {
            api.hidePlugin(self.callsign);
        }
    }

    launchWebinspector() {
        var url = "http://" + api.host + ':' + this.inspectorPort;
        var win = window.open(url, '_blank');
        win.focus();
    }
}

window.pluginClasses = window.pluginClasses || {};
window.pluginClasses.WebKitBrowser = WebKitBrowser;
