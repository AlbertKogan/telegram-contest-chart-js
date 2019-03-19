import Base from './../common/base';
import { throttle } from '../common/utils';

import styles from './style.scss';

import { 
    BASE_LAYER,
    WINDOW_LAYER,
    HOVER_INNER,
    HOVER_LEFT_BORDER,
    HOVER_RIGHT_BORDER
} from './constants';
import { SET_VISIBLE_BOUNDS } from './../common/actions';

class Preview extends Base {
    borderThreshold = 10;

    windowPosition = {}
    mousePosition = { x: 0, y: 0 }
    prevMosuePosition = { x: 0, y: 0 }
    mouseDown = false;
    mouseIn = false;
    animationID
    transform = null
    hoverType = null
    _delta = 0

    constructor ({ width, height, data, store }) {
        super();
        const self = this;

        self.width = width;
        self.height = height;
        self._rawData = data;
        self.store = store;

        // Default state
        self._visibleBounds = store.state.ui.visibleBounds;
        self._activeCharts = store.state.ui.activeCharts;

        // Create layers: base, window, top layer
        const windowLayer = self.createLayer({ layerID: WINDOW_LAYER });
        const baseLayer = self.createLayer({ layerID: BASE_LAYER });

        windowLayer.width = width;
        windowLayer.height = height;
        windowLayer.classList.add(styles.preview, styles.previewWindow);

        baseLayer.width = width;
        baseLayer.height = height;
        baseLayer.classList.add(styles.preview, styles.previewBase);

        self.recalculate({ showFullRange: true });

        self.setLayerSettings({
            layerID: WINDOW_LAYER,
            settings: {
                globalCompositeOperation: 'destination-over',
                strokeStyle: 'rgba(0, 153, 255, 0.8)',
                lineWidth: 10
            }
        });

        self.windowPosition = {
            x: 0,
            y: 0,
            width: 200,
            height: 100
        }

        // Draw rectangle
        self.drawChart({ layerID: BASE_LAYER, points: self.points, colors: data.colors });

        self.drawWindow();

        self.withHandler({ layerID: WINDOW_LAYER, handlerType: 'mousemove', handler: self.throttledMosueMove.bind(self) });
        self.withHandler({ layerID: WINDOW_LAYER, handlerType: 'mouseout', handler: self.onMouseOut.bind(self) });
        self.withHandler({ layerID: WINDOW_LAYER, handlerType: 'mouseenter', handler: self.onMouseEnter.bind(self) });
        self.withHandler({ layerID: WINDOW_LAYER, handlerType: 'mousedown', handler: self.onMouseDown.bind(self) });
        self.withHandler({ layerID: WINDOW_LAYER, handlerType: 'mouseup', handler: self.onMouseUp.bind(self) });

        store.events.subscribe({ 
            eventName: 'stateChange', 
            callback: () => {
                self._visibleBounds = store.state.ui.visibleBounds;
                self._activeCharts = store.state.ui.activeCharts;

                self.recalculate({ showFullRange: true });
                self.drawChart({ layerID: BASE_LAYER, points: self.points, colors: data.colors });
            }
        });
    }

    setHoverType ({ event }) {
        const mousePosition = { x: event.clientX, y: event.clientY };
        const { windowPosition, borderThreshold } = this;

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
        const currentMousePosition = { x: event.clientX, y: event.clientY };
        const { drawWindow, mouseDown, mousePosition } = this;
        const windowLayer = this.getLayer({ layerID: WINDOW_LAYER });
        const hoverType = this.setHoverType({ event });

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

        if (this.animationID && !mouseDown) {
            window.cancelAnimationFrame(this.animationID);
        } else if (mouseDown) {
            this.prevMosuePosition = mousePosition;
            this.mousePosition = currentMousePosition;
            this.animationID = window.requestAnimationFrame(drawWindow.bind(this));
        }
    }

    get delta () {
        const { windowPosition, width } = this;
        let delta = this.mouseDelta;
        let newDelta = this._delta + delta;

        // Set boundaries to prevent window overflowing
        if (newDelta < 0) {
            newDelta = 0
        } else if (newDelta >= width - windowPosition.width) {
            newDelta = windowPosition.x;
        }
        this._delta = newDelta;
        return newDelta;
    }

    get mouseDelta () {
        const { prevMosuePosition, mousePosition } = this;

        return mousePosition.x - prevMosuePosition.x;

    }

    get throttledMosueMove () {
        return throttle(10, this.onMouseMove.bind(this));
    }


    onMouseDown (event) {
        const mousePosition = { x: event.clientX, y: event.clientY };

        this.mouseDown = true;
        this.mousePosition = mousePosition;
        this.prevMosuePosition = mousePosition;
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
        const { 
            width, 
            height, 
            windowPosition, 
            transform, 
            delta,
            mouseDelta
        } = this;
        const windowLayerContext = this.getLayerContext({ layerID: WINDOW_LAYER });

        windowLayerContext.clearRect(0, 0, width, height);
        windowLayerContext.beginPath();

        let newWindowPosition = windowPosition;

        if (transform === 'move') {
            newWindowPosition = {
                ...newWindowPosition,
                x: delta
            };
            windowLayerContext.rect(...Object.values(newWindowPosition));
        } else if (transform === 'left') {
            newWindowPosition = {
                ...newWindowPosition,
                x: windowPosition.x + mouseDelta,
                width: windowPosition.width - mouseDelta,
            };
        } else if (transform === 'right') {
            newWindowPosition = {
                ...newWindowPosition,
                width: windowPosition.width + mouseDelta,
            };
        }

        this.windowPosition = newWindowPosition;

        windowLayerContext.rect(...Object.values(newWindowPosition));
        windowLayerContext.stroke();
        windowLayerContext.closePath();
        this.sliceVisiblePart();
        this.drawOverlay();
    }

    drawOverlay () {
        const { 
            width, 
            height, 
            windowPosition
        } = this;

        const windowLayerContext = this.getLayerContext({ layerID: WINDOW_LAYER });

        windowLayerContext.fillStyle = 'rgba(0, 153, 255, 0.5)';
        // Right overlay
        windowLayerContext.fillRect(
            windowPosition.width + windowPosition.x, 
            0, 
            width - windowPosition.width, 
            height
        );

        // Left overlay
        windowLayerContext.fillRect(
            0, 
            0, 
            windowPosition.x , 
            height
        );
    }

    sliceVisiblePart () {
        const { windowPosition, xCoords, store } = this;

        store.dispatch({
            actionKey: SET_VISIBLE_BOUNDS, 
            payload: {
                fromIndex: xCoords.findIndex((item) => item >= windowPosition.x),
                toIndex: xCoords.findIndex((item) => item >= windowPosition.x + windowPosition.width)
            }
        });
    }
};

export default Preview;
