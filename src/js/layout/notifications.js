/** The footer bar provides stats on the current device */

class Notifications {
    constructor() {
        this.renderInMenu = false;
        api.addWebSocketListener('all',this.handleNotification.bind());

        document.getElementById('hide-notifications').onclick = this.toggleVisibility.bind(this);
    }

    handleNotification(data) {
        document.getElementById('notifications-block').style.display = "block"


        var div = document.createElement('div')

        var string = ''

        var i = 0
        for (var key1 in data) {
            if (data[key1] === 'Monitor') {
                div.className = 'red'
            }
            if (key1 === "callsign") {
                var label = document.createElement('label')
                label.innerHTML = '"' + data[key1] + '"'
                div.appendChild(label)
            } else if (key1 === "data") {
                string = string + key1 + ': {'
                var o = 0
                for (var key2 in data.data) {
                    string = string + key2 + ': ' + data.data[key2]
                    if (o == Object.keys(data.data).length - 1) {
                        string = string + '}'
                    } else {
                        string = string + ', '
                    }
                    o++
                }
            } else {
                string = string + key1 + ': ' + data[key1]
            }
            if (key1 != "callsign" && i != Object.keys(data).length - 1) {
                string = string + ', '
            }
            i++
        }

        var span = document.createElement('span')
        span.innerHTML = string
        div.appendChild(span)

        document.getElementById('notifications').appendChild(div)
        document.getElementById('notifications').scrollTop= document.getElementById('notifications').scrollHeight
    }

    toggleVisibility() {
        var isVisible = (document.getElementById('notifications').style.display === 'block');
        document.getElementById('notifications').style.display = isVisible ? "none" : "block"
        document.getElementById('hide-notifications').innerHTML = isVisible ? "show console" : "hide console"
    }

}
