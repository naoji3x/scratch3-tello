const {spawn} = require('child_process');
const fs = require('fs');
const path = require('path');
const ffmpegPath = require('ffmpeg-static');
const {PNG} = require('pngjs');

const StageLayering = require('../../engine/stage-layering');

const VIDEO_PORT = 11111;
const WIDTH = 960;
const HEIGHT = 720;
const FRAME_SIZE = WIDTH * HEIGHT * 4; // RGBA

/**
 * Decodes Tello's raw H.264 UDP video stream (via a spawned ffmpeg process) and
 * draws the frames onto the Scratch stage as a background layer, mirroring the
 * approach used by scratch-vm's built-in webcam preview (see src/io/video.js).
 */
class TelloVideo {
    constructor (runtime) {
        this.runtime = runtime;

        this._ffmpeg = null;
        this._buffer = Buffer.alloc(0);

        this._skinId = -1;
        this._drawable = -1;

        this._lastFrame = null; // {data: Buffer, width: number, height: number}
    }

    /**
     * Start decoding the Tello video stream and show it on the stage.
     */
    enable () {
        if (this._ffmpeg) return;

        this._ffmpeg = spawn(ffmpegPath, [
            '-fflags', 'nobuffer',
            '-flags', 'low_delay',
            '-i', `udp://0.0.0.0:${VIDEO_PORT}`,
            '-pix_fmt', 'rgba',
            '-f', 'rawvideo',
            '-s', `${WIDTH}x${HEIGHT}`,
            '-r', '30',
            'pipe:1'
        ]);

        this._buffer = Buffer.alloc(0);

        this._ffmpeg.stdout.on('data', chunk => this._onData(chunk));
        this._ffmpeg.stderr.on('data', () => {
            // ffmpeg logs decoding progress/warnings to stderr; ignored unless debugging.
        });
        this._ffmpeg.on('error', err => {
            console.error(`[Tello] ffmpeg error: ${err.message}`);
        });
        this._ffmpeg.on('exit', () => {
            this._ffmpeg = null;
        });

        this._showDrawable();
    }

    /**
     * Stop decoding the Tello video stream and hide it from the stage.
     */
    disable () {
        if (this._ffmpeg) {
            this._ffmpeg.stdout.removeAllListeners('data');
            this._ffmpeg.kill('SIGKILL');
            this._ffmpeg = null;
        }
        this._buffer = Buffer.alloc(0);
        this._lastFrame = null;
        this._hideDrawable();
    }

    /**
     * Save the most recently decoded frame as a PNG file.
     * @param {string} destPath - absolute file path to write the PNG to.
     * @returns {boolean} whether a frame was available and written.
     */
    capturePhoto (destPath) {
        if (!this._lastFrame) return false;

        const {data, width, height} = this._lastFrame;
        const png = new PNG({width, height});
        data.copy(png.data);

        fs.mkdirSync(path.dirname(destPath), {recursive: true});
        fs.writeFileSync(destPath, PNG.sync.write(png));
        return true;
    }

    _onData (chunk) {
        this._buffer = Buffer.concat([this._buffer, chunk]);

        while (this._buffer.length >= FRAME_SIZE) {
            const frame = this._buffer.subarray(0, FRAME_SIZE);
            this._buffer = this._buffer.subarray(FRAME_SIZE);
            this._renderFrame(frame);
        }
    }

    _renderFrame (frame) {
        const frameCopy = Buffer.from(frame);
        this._lastFrame = {data: frameCopy, width: WIDTH, height: HEIGHT};

        const {renderer} = this.runtime;
        if (!renderer) return;

        const imageData = new ImageData(new Uint8ClampedArray(frameCopy), WIDTH, HEIGHT);

        if (this._skinId === -1) {
            // bitmapResolution 2 maps the 960x720 frame onto Scratch's 480x360 stage.
            this._skinId = renderer.createBitmapSkin(imageData, 2);
            this._drawable = renderer.createDrawable(StageLayering.VIDEO_LAYER);
            renderer.updateDrawableSkinId(this._drawable, this._skinId);
        } else {
            renderer.updateBitmapSkin(this._skinId, imageData, 2);
        }

        renderer.updateDrawableVisible(this._drawable, true);
        this.runtime.requestRedraw();
    }

    _showDrawable () {
        const {renderer} = this.runtime;
        if (renderer && this._drawable !== -1) {
            renderer.updateDrawableVisible(this._drawable, true);
        }
    }

    _hideDrawable () {
        const {renderer} = this.runtime;
        if (renderer && this._drawable !== -1) {
            renderer.updateDrawableVisible(this._drawable, false);
        }
    }
}

module.exports = TelloVideo;
