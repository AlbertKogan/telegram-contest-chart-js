import Base from './../common/base';
import { throttle } from './../utils';

import styles from './style.scss';

import { 
    BASE_LAYER,
    WINDOW_LAYER,
    BACKGROUND_LAYER,
    HOVER_INNER,
    HOVER_LEFT_BORDER,
    HOVER_RIGHT_BORDER
} from './constants';

class Preview extends Base {
    borderThreshold = 10;

    windowPosition = {}
    mousePosition = {}
    delta = { x: 0, y: 0 }
    mouseDown = false;
    mouseIn = false;
    animationID
    transform = null
    hoverType = null

    constructor ({ width, height }) {
        super();
        const self = this;

        self.width = width;
        self.height = height;

        // Create layers: base, window, top layer
        const windowLayer = self.createLayer({ layerID: WINDOW_LAYER });
        self.createLayer({ layerID: BACKGROUND_LAYER });
        const baseLayer = self.createLayer({ layerID: BASE_LAYER });

        windowLayer.width = width;
        windowLayer.height = height;
        windowLayer.classList.add(styles.preview, styles.previewWindw);

        baseLayer.width = width;
        baseLayer.height = height;
        baseLayer.classList.add(styles.preview, styles.previewBase);

        self.setLayerSettings({
            layerID: WINDOW_LAYER,
            settings: {
                globalCompositeOperation: 'destination-over',
                strokeStyle: 'rgba(0, 153, 255, 0.4)',
                lineWidth: 10
            }
        });

        self.windowPosition = {
            x: 10,
            y: 10,
            width: 200,
            height: 120
        }

        // Draw rectangle
        self.drawWindow();

        self.withHandler({ layerID: WINDOW_LAYER, handlerType: 'mousemove', handler: self.throttledMosueMove.bind(self) });
        self.withHandler({ layerID: WINDOW_LAYER, handlerType: 'mouseout', handler: self.onMouseOut.bind(self) });
        self.withHandler({ layerID: WINDOW_LAYER, handlerType: 'mouseenter', handler: self.onMouseEnter.bind(self) });
        self.withHandler({ layerID: WINDOW_LAYER, handlerType: 'mousedown', handler: self.onMouseDown.bind(self) });
        self.withHandler({ layerID: WINDOW_LAYER, handlerType: 'mouseup', handler: self.onMouseUp.bind(self) });
    }

    setHoverType ({ event }) {
        const mousePosition = { x: event.clientX, y: event.clientY };
        const { windowPosition, borderThreshold } = this;
        const windowLayer = this.getLayer({ layerID: WINDOW_LAYER });

        this.mousePosition = mousePosition;

        // detect right border hover
        if ((windowPosition.x + windowPosition.width - borderThreshold) <= mousePosition.x && 
             mousePosition.x <= (windowPosition.x + windowPosition.width + borderThreshold)) {
            this.hoverType = HOVER_RIGHT_BORDER
        } // detect left border hover 
        else if (mousePosition.x - borderThreshold <= windowPosition.x && 
                 windowPosition.x <= mousePosition.x + borderThreshold) {
            this.hoverType = HOVER_LEFT_BORDER
        } // detect center hover
        else if (mousePosition.x > windowPosition.x && 
                 mousePosition.x < windowPosition.x + windowPosition.width) {
            this.hoverType = HOVER_INNER
        } else {
            this.hoverType = null;
        }

        return this.hoverType;
    }

    onMouseMove (event) {
        const mousePosition = { x: event.clientX, y: event.clientY };
        const { drawWindow, mouseDown } = this;
        const windowLayer = this.getLayer({ layerID: WINDOW_LAYER });
        const hoverType = this.setHoverType({ event });

        this.mousePosition = mousePosition;

        switch (hoverType) {
            case HOVER_LEFT_BORDER:
                windowLayer.style.cursor = 'w-resize';
                this.transform = 'left';
                break;
            case HOVER_RIGHT_BORDER:
                windowLayer.style.cursor = 'e-resize';
                this.transform = 'right';
                break;
            case HOVER_INNER:
                windowLayer.style.cursor = 'move';
                this.transform = 'move';
                break;
            default:
                windowLayer.style.cursor = 'default';
                this.transform = null;
        }

        if (this.animationID && !mouseDown && this.mouseIn) {
            window.cancelAnimationFrame(this.animationID);
        } else {
            this.animationID = window.requestAnimationFrame(drawWindow.bind(this));
        }
    }

    get throttledMosueMove () {
        return throttle(50, this.onMouseMove.bind(this));
    }


    onMouseDown () {
        this.mouseDown = true;
    }

    onMouseUp () {
        this.mouseDown = false;
    }

    onMouseEnter () {
        this.mouseIn = true;
    }

    onMouseOut () {
        this.mouseIn = false;
    }

    drawWindow () {
        const { mousePosition, width, height, windowPosition, transform } = this;
        const windowLayerContext = this.getLayerContext({ layerID: WINDOW_LAYER });

        const { x = 0, y = 0 } = mousePosition;
    

        console.log('transform', x, y);

        windowLayerContext.clearRect(0, 0, width, height);
        windowLayerContext.beginPath();
        if (transform === 'move') {
            windowLayerContext.rect(x - windowPosition.x, 0, windowPosition.width, windowPosition.height);
        } else if (transform === 'left') {
            windowLayerContext.rect(x - windowPosition.x, 0, windowPosition.width, windowPosition.height);
        } else if (transform === 'right') {
            windowLayerContext.rect(windowPosition.x, 0, windowPosition.width + (x - windowPosition.x), windowPosition.height);
        }

        windowLayerContext.stroke();
        windowLayerContext.closePath();
    }
};

export default Preview;
