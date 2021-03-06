/** The wifi plugin provides details on the available Wifi Adapters, scans for networks and allows the user to join networks through the UI
 */

class WifiControl extends Plugin {

    constructor(pluginData) {
        super(pluginData);
        this.displayName = 'WiFi';

        this.configs = [];
        this.networks = [];
        this.connecting = false;
        this.connected = undefined;
        this.scanning = false;
        this.statusMessageTimer = null;
        this.rendered = false;
        this.wlanInterface = 'wlan0'; //FIXME, this can be anything really...
        this.socketListenerId = api.addWebSocketListener(this.callsign, this.handleNotification.bind(this));
    }

    render()        {
        var mainDiv = document.getElementById('main');

        mainDiv.innerHTML = `<div class="title grid__col grid__col--8-of-8">
            Status
        </div>

        <div class="label grid__col grid__col--2-of-8">
            Connected to
        </div>
        <div id="Wifi_Connected" class="text grid__col grid__col--6-of-8"></div>

        <div class="label grid__col grid__col--2-of-8">
            Scanning
        </div>
        <div id="Wifi_Scanning" class="text grid__col grid__col--6-of-8">
            False
        </div>

        <div class="label grid__col grid__col--2-of-8">
            Wireless networks
        </div>
        <div class="text grid__col grid__col--6-of-8">
            <select id="Wifi_WirelessNetwork"></select>
        </div>
        <div class="label grid__col grid__col--2-of-8">
        </div>
        <div class="text grid__col grid__col--6-of-8">
            <button type="button" id="Wifi_scanForNetworksButton">Scan for networks</button>
        </div>

        <div class="title grid__col grid__col--8-of-8">
            Configs
        </div>

        <div class="label grid__col grid__col--2-of-8">
            Configs
        </div>
        <div class="text grid__col grid__col--6-of-8">
            <select id="Wifi_Configs"></select>
        </div>

        <div id="Wifi_SSID_Label" class="label grid__col grid__col--2-of-8">
            SSID
        </div>
        <div class="text grid__col grid__col--6-of-8">
            <input id="Wifi_SSID" type="text" name="SSID"/>
        </div>
        <div class="label grid__col grid__col--2-of-8">
            Mode
        </div>
        <div id="Wifi_Mode" class="text grid__col grid__col--6-of-8">
        </div>
        <!-- disable for now
        <div class="label grid__col grid__col--2-of-8"></div>
        <div class="label grid__col grid__col--6-of-8">
            <button id="Wifi_ToggleModeButton" type="button">Toggle</button>
        </div>
        -->
        <div class="label grid__col grid__col--2-of-8">
            Hidden
        </div>
        <div id="Wifi_Hidden" class="text grid__col grid__col--6-of-8"></div>
        <div id="Wifi_Method_Label" class="label grid__col grid__col--2-of-8">
            Method
        </div>
        <div class="text grid__col grid__col--6-of-8">
            <input id="Wifi_Method" type="text" name="method"/>
        </div>
        <div id="Wifi_Password_Label" class="label grid__col grid__col--2-of-8">
            Password
        </div>
        <div class="text grid__col grid__col--6-of-8">
            <input id="Wifi_Password" type="text" name="password"/>
        </div>
        <div class="label grid__col grid__col--2-of-8 toggleButtonLabel"></div>
        <div class="text grid__col grid__col--4-of-8">
            <button type="button" id="Wifi_saveButton">Save Config</button>
            <button type="button" id="Wifi_connectButton">Connect</button>
            <button type="button" id="Wifi_disconnectButton">Disconnect</button>
        </div>

        <br>
        <div id="statusMessages" class="text grid__col grid__col--8-of-8"></div>
        `;

        // bind elements

        // ---- button ----
        this.scanButton                 = document.getElementById('Wifi_scanForNetworksButton');
        this.saveButton                 = document.getElementById('Wifi_saveButton');
        this.connectButton              = document.getElementById('Wifi_connectButton');
        this.disconnectButton           = document.getElementById('Wifi_disconnectButton');
        //this.modeButton                 = document.getElementById('Wifi_ToggleModeButton');

        //bind buttons
        this.scanButton.onclick         = this.scanForNetworks.bind(this);
        this.saveButton.onclick         = this.saveConfig.bind(this);
        this.disconnectButton.onclick   = this.disconnect.bind(this);
        this.connectButton.onclick      = this.connect.bind(this);
        //this.modeButton.onclick         = this.toggleMode.bind(this);

        // ---- Status -----
        this.connectedStatus            = document.getElementById('Wifi_Connected');
        this.scanningStatus             = document.getElementById('Wifi_Scanning');
        this.statusMessages             = document.getElementById('statusMessages');

        // ---- Networks -----
        this.networkListEl              = document.getElementById('Wifi_WirelessNetwork');
        this.networkListEl.onchange     = this.renderNetworkDetails.bind(this);

        // ---- Configs ----
        this.configListEl               = document.getElementById('Wifi_Configs');
        this.configListEl.onchange      = this.renderConfigDetails.bind(this);

        // ---- Network info ----
        this.ssidEl                     = document.getElementById('Wifi_SSID');
        this.methodEl                   = document.getElementById('Wifi_Method');
        this.passwordEl                 = document.getElementById('Wifi_Password');
        this.accesspointEl              = document.getElementById('Wifi_Mode');
        this.hiddenEl                   = document.getElementById('Wifi_Hidden');


        //make sure we do not send keys to the remote when typing
        this.passwordEl.onblur = function() {
            if (plugins.RemoteControl !== undefined)
                plugins.RemoteControl.doNotHandleKeys = false;
        };

        this.passwordEl.onfocus = function() {
            if (plugins.RemoteControl !== undefined)
                plugins.RemoteControl.doNotHandleKeys = true;
        };

        this.update();
        setTimeout(this.getNetworks.bind(this), 200);
        setTimeout(this.getConfigs.bind(this), 400);

        this.rendered = true;
    }

    /* ----------------------------- DATA ------------------------------*/
    update() {
        api.getPluginData(this.callsign, (err, resp) => {
            if (err !== null) {
                console.error(err);
                this.status(err);
                return;
            }

            // bail out if the plugin returns nothing
            if (resp === undefined)
                return;

            this.connected = resp.connected;

            if (typeof resp.scanning === 'boolean')
                this.scanning = resp.scanning;

            this.renderStatus();
        });
    }

    scanForNetworks() {
        var self = this;
        api.putPlugin(this.callsign, 'Scan', null, (err, resp) => {
            if (err !== null) {
                console.error(err);
                return;
            }

            // get the results
            setTimeout(this.getNetworks.bind(this), 5000);
        });
    }

    getConfigs() {
        api.getPluginData(this.callsign + '/Configs', (err, resp) => {
            if (err !== null) {
                console.error(err);
                this.status(err);
                return;
            }

            if (resp === undefined || resp.configs.length === 0)
                return;


            this.configs = resp.configs;
            this.configListEl.innerHTML = '';
            for (var i=0; i<resp.configs.length; i++) {
                var newChild = this.configListEl.appendChild(document.createElement("option"));
                newChild.innerHTML = `${resp.configs[i].ssid}`;
            }

            this.renderConfigDetails();
        });
    }

    getNetworks() {
        api.getPluginData(this.callsign + '/Networks', (err, resp) => {
            if (err !== null) {
                console.error(err);
                return;
            }

            // bail out if the plugin returns nothing
            if (resp === undefined)
                return;

            this.networks = [];

            if (this.rendered === false)
                return;

            this.networkListEl.innerHTML = '';
            for (var i=0; i<resp.networks.length; i++) {
                // some networks return /x00/x00/x00/x00 and we're filtering out that at the json parse in core/wpe.js, so lets skip it
                if (resp.networks[i].ssid === '')
                    continue;

                // store the same list in this.networks
                this.networks.push(resp.networks[i]);

                var newChild = this.networkListEl.appendChild(document.createElement("option"));
                newChild.innerHTML = `${resp.networks[i].ssid} (${resp.networks[i].signal})`;
            }
        });
    }

    handleNotification(json) {
        if (this.rendered === false)
            return;

        var data = json.data || {};

        // the event connected just provides an async boolean, rerender the network status
        if (data.event && data.event === 'Connected') {
            this.status('WLAN connection established');
            this.update();
        }


        // check if we've joined succesfull, else retry DHCP request
        if (data.callsign === 'NetworkControl' && data.data && data.data.interface) {
            if (data.data.ip) {
                if (data.data.interface === wlan) {
                    this.status('Connection succesfull.');
                    this.joining = false;
                    this.update();
                }
            } else if (data.data.status === 11) {
                // Ignore wlan DHCP failure when not in joining progress
                if (data.data.interface === this.wlanInterface && this.joining === false) return;

                this.status('DHCP request failure. Retrying...');
                this.requestDHCP();
            }
        }

        if (typeof data.scanning === 'boolean') {
            this.scanning = data.scanning;
            this.renderStatus();
        }

        if (data.event === 'NetworkUpdate') {
            this.getNetworks();
        }

    }

    /* ----------------------------- RENDERING ------------------------------*/

    status(message) {
        window.clearTimeout(this.statusMessageTimer);
        this.statusMessages.innerHTML = message;

        // clear after 5s
        this.statusMessageTimer = setTimeout(this.status, 5000, '');
    }

    renderStatus () {
        if (this.rendered === false)
            return;

        this.connectedStatus.innerHTML = this.connected !== '' ? this.connected : 'Not Connected';
        this.scanningStatus.innerHTML = this.scanning === true ? 'True' : 'False';
    }

    renderNetworkDetails() {
        var idx = this.networkListEl.selectedIndex;

        if (idx < 0 || this.networks.length <= 0)
            return;

        this.ssidEl.value = this.networks[idx].ssid;
        this.methodEl.value = this.networks[idx].pairs[0].method;
    }

    renderConfigDetails() {
        var idx = this.configListEl.selectedIndex;

        if (idx < 0 || this.configs <= 0)
            return;

        this.ssidEl.value = this.configs[idx].ssid;
        this.accesspointEl.innerHTML = this.configs[idx].accesspoint === true ? 'Access Point' : 'Client';
        this.hiddenEl.innerHTML = this.configs[idx].hidden === true ? 'True' : 'False';
        this.methodEl.value = this.configs[idx].type;
        this.passwordEl.value = this.configs[idx].psk;

    }


    /* ----------------------------- BUTTONS ------------------------------*/
    toggleConnectDisconnect() {
        if (this.connected !== '')
            this.disconnect();
        else
            this.connect();
    }

    saveConfig() {
        var self = this;
        var idx = this.configListEl.selectedIndex;

        var config = {
            ssid : this.ssidEl.value,
            psk : this.passwordEl.value,
            //hidden : this.hiddenEl.value,
            //accesspoint : this.accesspointEl.value,
            type : this.methodEl.value,
        };

        api.putPlugin(this.callsign, 'Config', JSON.stringify(config), (err, resp) => {
            if (err) {
                console.error(err);
                return;
            }

            this.status(`Saved config for ${this.ssidEl.value}`);
            self.getConfigs();
        });

    }

    requestDHCP() {
        this.status('Requesting DHCP for wlan0');
        api.putPlugin('NetworkControl', `${this.wlanInterface}/Request`, null);
    }

    connect() {
        var idx = this.configListEl.selectedIndex;

        this.status(`Connecting to ${this.configs[idx].ssid}`);

        api.putPlugin(this.callsign, `Connect/${this.configs[idx].ssid}`, null, () =>{
            this.connecting = true;
            setTimeout(this.requestDHCP.bind(this), 5000);
        });
    }

    disconnect() {
        // if we're not connected ignore.
        if (this.connected === '')
            return;

        this.status(`Disconnecting from ${this.connected}`);
        api.deletePlugin(this.callsign, 'Connect/' + this.connected, null);
    }

    close() {
        this.rendered = false;
    }
}

window.pluginClasses = window.pluginClasses || {};
window.pluginClasses.WifiControl = WifiControl;
