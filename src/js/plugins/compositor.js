/** The compositor plugin manages the Westeros compositor and its cliens through the webui
 */

class Compositor extends Plugin {

    constructor(pluginData) {
        super(pluginData);
    }

    render()        {
        var mainDiv = document.getElementById('main');

        mainDiv.innerHTML = `<div class="title grid__col grid__col--8-of-8">
            Compositor
        </div>
        <div class="label grid__col grid__col--2-of-8">
            <label for="compositorClients">Clients</label>
        </div>
        <div class="text grid__col grid__col--6-of-8">
            <select id="compositorClients"></select>
        </div>
        <div class="title grid__col grid__col--8-of-8">
            Focus
        </div>
        <div class="text grid__col grid__col--6-of-8">
            <button type="button" id="compositorSetTop">Set Top</button>
            <button type="button" id="compositorSetInput">Set Input</button>
        </div>
        <div class="text grid__col grid__col--8-of-8"></div>
        <div class="title grid__col grid__col--8-of-8">
            Opacity
        </div>
        <div class="text grid__col grid__col--3-of-8">
            <div width=100px>
                <input id="sliderOpacity" type="range" min="0" max="256" step="1" value="256"/>
            </div>
        </div>
        <div class="text grid__col grid__col--1-of-8">
            <input type="number" min="0" max="256" id="numOpacity" size="5" value="256"/>
        </div>
        <div class="text grid__col grid__col--6-of-8">
            <button type="button" id="compositorSetOpacity">Set</button>
        </div>
        <div class="text grid__col grid__col--8-of-8"></div>
        <div class="title grid__col grid__col--8-of-8">
            Visibility
        </div>
        <div class="text grid__col grid__col--6-of-8">
            <button type="button" id="webkit_hide">Hide</button>
            <button type="button" id="webkit_show">Show</button>
        </div>
        <div class="text grid__col grid__col--8-of-8"></div>
        <div class="title grid__col grid__col--8-of-8">
            Geometry
        </div>
        <div class="text grid__col grid__col--2-of-8">
            <input id="compositorXGeometry" type="number" value="0"/>
        </div>
        <div class="text grid__col grid__col--2-of-8">
            <input id="compositorYGeometry" type="number" value="0"/>
        </div>
        <div class="text grid__col grid__col--2-of-8">
            <input id="compositorWidthGeometry" type="number" value="1280" min="0"/>
        </div>
        <div class="text grid__col grid__col--2-of-8">
            <input id="compositorHeightGeometry" type="number" value="720" min="0"/>
        </div>
        <div class="text grid__col grid__col--6-of-8">
            <button type="button" id="compositorGeometry">Set</button>
        </div>`;


        // bind buttons & sliders
        document.getElementById('compositorSetTop').onclick         = this.compositorAction.bind(this, 'Top');
        document.getElementById('compositorSetInput').onclick       = this.compositorAction.bind(this, 'Input');
        document.getElementById('sliderOpacity').onchange           = this.updateValue.bind(this, 'sliderOpacity', 'numOpacity');
        document.getElementById('numOpacity').onchange              = this.updateValue.bind(this, 'numOpacity', 'sliderOpacity');
        document.getElementById('numOpacity').onkeyup               = this.updateValue.bind(this, 'numOpacity', 'sliderOpacity');
        document.getElementById('numOpacity').onpaste               = this.updateValue.bind(this, 'numOpacity', 'sliderOpacity');
        document.getElementById('numOpacity').oninput               = this.updateValue.bind(this, 'numOpacity', 'sliderOpacity');
        document.getElementById('compositorSetOpacity').onclick     = this.compositorSetOpacity.bind(this);
        document.getElementById('webkit_hide').onclick              = this.compositorVisible.bind(this, 'Hide');
        document.getElementById('webkit_show').onclick              = this.compositorVisible.bind(this, 'Show');
        document.getElementById('compositorGeometry').onclick       = this.compositorSetGeometry.bind(this);


        // bind fields
        this.menu = document.getElementById('compositorClients');

        // get clients
        api.getPluginData(this.callsign, (err, resp) => {
            if (err !== null) {
                console.error(err);
                // HACK. Ignore error here, Bram thinks a 400 is OKAY. Parse or die trying
                try {
                    resp = JSON.parse(err);
                } catch (e) {
                    return;
                }
            }

            var clients = resp.clients;
            if (clients.length > 0) {
                var menu = document.getElementById('compositorClients');

                menu.innerHTML = '';
                var item = document.createElement('option');

                item.value = '';
                item.setAttributeNode(document.createAttribute('disabled'));
                item.setAttributeNode(document.createAttribute('selected'));
                item.innerHTML = 'Select a client';
                menu.appendChild(item);

                for (var i = 0; i < clients.length; i++) {
                    var _item = document.createElement('option');
                    _item.value = clients[i];
                    _item.innerHTML = clients[i];
                    menu.appendChild(_item);
                }
            }
        });
    }

    compositorAction(action) {
        var client = this.menu.options[this.menu.selectedIndex].value;
        api.postPlugin(this.callsign, client + '/' + action, null, (err, resp) => {
            if (err)
                console.error(err);
        });
    }

    compositorSetOpacity() {
        var client = this.menu.options[this.menu.selectedIndex].value;
        var opacity = document.getElementById('sliderOpacity').value;
        api.postPlugin(this.callsign, client + '/Opacity/' + opacity, null, (err, resp) => {
            if (err)
                console.error(err);
        });
    }

    updateValue(element, toUpdateElement) {
        document.getElementById(toUpdateElement).value = document.getElementById(element).value;
    }

    compositorVisible(state) {
        var client = this.menu.options[this.menu.selectedIndex].value;
        api.postPlugin(this.callsign, client + '/Visible/' + state, null, (err, resp) => {
            if (err)
                console.error(err);
        });
    }

    compositorSetGeometry() {
        var client = this.menu.options[this.menu.selectedIndex].value;
        var x = document.getElementById('compositorXGeometry').value;
        var y = document.getElementById('compositorYGeometry').value;
        var w = document.getElementById('compositorWidthGeometry').value;
        var h = document.getElementById('compositorHeightGeometry').value;

        api.postPlugin(this.callsign, client + '/Geometry/' + x + '/' + y + '/' + w + '/' + h, null, (err, resp) => {
            if (err)
                console.error(err);
        });

    }

}

window.pluginClasses = window.pluginClasses || {};
window.pluginClasses.Compositor = Compositor;
