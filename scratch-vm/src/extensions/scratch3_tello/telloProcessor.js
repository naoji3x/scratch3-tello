const dgram = require('dgram');

// Tello's UDP responses are not guaranteed to arrive (this is especially true once
// `streamon` starts saturating the Wi-Fi link with video traffic). Without a timeout,
// a single lost response permanently stalls the command queue.
const ACK_TIMEOUT_MS = 5000;

class TelloProcessor {
    initialize () {
        this.queue = []; // command queue
        this.flying = false;
        this.executing = false;
        this.data = {};
        this._reconnecting = false;
        this._createSockets();
    }

    _createSockets () {
        this.client = dgram.createSocket('udp4');
        this.server = dgram.createSocket('udp4');

        this.client.bind({
            address: '0.0.0.0',
            port: 40001,
            exclusive: true
        });

        this.send('command');

        this.client.on('message', (message, remote) => {
            const readableMessage = message.toString();

            // Previous command executed
            if (readableMessage === 'ok') {
                this._clearAckTimeout();
                this.executing = false;

                if (this.executingCommand === 'takeoff') this.flying = true;
                if (this.executingCommand === 'land') this.flying = false;

                // Dequeue
                this.queue.shift();

                // Send next element
                this.inquire();
            } else if (readableMessage.includes('error')) {
                console.warn(`[Tello] Command failed: "${this.executingCommand}" -> ${readableMessage}`);
                this._clearAckTimeout();
                this.executing = false;

                // Only a failed takeoff should affect the flying state; a failure on any
                // other command (e.g. an unsupported LED command) must not be treated as
                // "the drone landed", or subsequent movement commands would be silently
                // dropped for the rest of the queue.
                if (this.executingCommand === 'takeoff') this.flying = false;

                // Dequeue
                this.queue.shift();

                // Send next element
                this.inquire();
            }
        });

        // Tello State
        this.server.on('message', (message, remote) => {
            // remote: { address: '192.168.10.1', family: 'IPv4', port: 8889, size: 127 }
            // message: <Buffer 70 69 74 63 68 ... >
            const readableMessage = message.toString();
            this.data = {};
            for (const e of readableMessage.slice(0, -1).split(';')) {
                this.data[e.split(':')[0]] = e.split(':')[1];
            }
        });

        this.server.bind(8890, '0.0.0.0');
    }

    reconnect () {
        if (this._reconnecting) return;
        this._reconnecting = true;
        this._clearAckTimeout();
        this.resetQueue();
        this.data = {};

        let closedCount = 0;
        const onClosed = () => {
            closedCount++;
            if (closedCount === 2) {
                this._createSockets();
                this._reconnecting = false;
            }
        };
        try { this.client.close(onClosed); } catch (e) { onClosed(); }
        try { this.server.close(onClosed); } catch (e) { onClosed(); }
    }

    request (cmd) {
        // Enqueue
        this.queue.push(cmd);

        this.inquire();
    }

    state () {
        return this.data;
    }

    // If executing command is nothing and waiting queue has some element, send first command to Tello
    inquire () {
        if (!this.executing && this.queue.length > 0) {
            this.send(this.queue[0]);
        }
    }

    send (cmd) {
        const msg = Buffer.from(cmd);
        // While grounding, `command`, `mon`, `mdirection 2`, `takeoff`, `streamon`, `streamoff`
        // and `EXT led ...` (RoboMaster TT LED) are only executable
        const groundedAllowedCommands = ['command', 'mon', 'mdirection 2', 'takeoff', 'streamon', 'streamoff'];
        const isGroundedAllowed = groundedAllowedCommands.includes(cmd) || cmd.startsWith('EXT led');
        if (!this.flying && !isGroundedAllowed) {
            console.warn(`[Tello] Skipping "${cmd}" because the drone is not flying`);
            this.queue.shift();
            // Keep the queue moving: without this, any command left behind it
            // would never be sent until an unrelated new request() call arrives.
            this.inquire();
            return;
        }
        this.executing = true;
        this.executingCommand = cmd;
        this._clearAckTimeout();
        this._ackTimeout = setTimeout(() => {
            console.warn(`[Tello] No response for "${cmd}" within ${ACK_TIMEOUT_MS}ms, skipping`);
            this._ackTimeout = null;
            this.executing = false;
            this.queue.shift();
            this.inquire();
        }, ACK_TIMEOUT_MS);
        this.client.send(msg, 0, msg.length, 8889, '192.168.10.1', (err, bytes) => {
            if (err) {
                console.error(`[Tello] Send error: ${err.message}`);
                this._clearAckTimeout();
                this.executing = false;
                this.queue.shift();
                this.inquire();
                return;
            }
        });
    }

    _clearAckTimeout () {
        if (this._ackTimeout) {
            clearTimeout(this._ackTimeout);
            this._ackTimeout = null;
        }
    }

    resetQueue () {
        this._clearAckTimeout();
        this.queue = [];
        this.flying = false;
        this.executing = false;
    }
}

module.exports = TelloProcessor;
