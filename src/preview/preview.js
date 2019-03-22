import Base from './../common/base'
import { throttle } from '../common/utils'

import styles from './style.scss'

import {
    BASE_LAYER,
    WINDOW_LAYER,
    HOVER_INNER,
    HOVER_LEFT_BORDER,
    HOVER_RIGHT_BORDER,
} from './constants'
import { SET_VISIBLE_BOUNDS, TOGGLE_MOOVING_STATE } from './../common/actions'

const OVERLAY_COLOR = 'rgba(245, 249, 251, 0.8)'
const NIGHT_OVERLAY_COLOR = 'rgba(31, 42, 55, 0.6)'
const BORDER_COLOR = 'rgba(221, 234, 243, 0.9)'
const NIGHT_BORDER_COLOR = 'rgba(65, 86, 106, 0.9)'
const BORDER_WIDTH = 10
const WINDOW_PADDING = BORDER_WIDTH / 2
const MIN_WINDOW_WIDTH = 50

class Preview extends Base {
    borderThreshold = 10
    windowPosition = {}
    mousePosition = { x: 0, y: 0 }
    prevMosuePosition = { x: 0, y: 0 }
    mouseDown = false
    mouseIn = false
    animationID = null
    transform = null
    hoverType = null
    isMooving = false
    _delta = 0

    constructor({ parent, data, store, chartID }) {
        super()
        const self = this

        self.parent = parent
        self._rawData = data
        self.store = store
        self.setParentSize()
        self.chartHeight = self.parentSize.height
        self.chartID = chartID
        self.borderThreshold = self.borderThreshold * self.dpr

        // Default state
        self._visibleBounds = self.store.state.charts[self.chartID].ui.visibleBounds
        self._activeCharts = self.store.state.charts[self.chartID].ui.activeCharts
        self.nightMode = self.store.state.nightMode

        // Create layers: base, window, top layer
        const windowLayer = self.createLayer({ layerID: WINDOW_LAYER })
        const baseLayer = self.createLayer({ layerID: BASE_LAYER })

        windowLayer.classList.add(styles.preview, styles.previewWindow)
        baseLayer.classList.add(styles.preview, styles.previewBase)

        self.recalculate({ showFullRange: true })

        self.setLayerSettings({
            layerID: WINDOW_LAYER,
            settings: {
                globalCompositeOperation: 'destination-over',
            },
        })

        self.windowPosition = {
            x: WINDOW_PADDING,
            y: 0,
            width: 200,
            height: self.height,
        }

        this.sliceVisiblePart()
        // Draw rectangle
        self.drawScene()
        this.isInitial = false

        if (self.touchDevice) {
            self.withHandler({
                layerID: WINDOW_LAYER,
                handlerType: 'touchmove',
                handler: self.onMouseMove.bind(self),
            })
            self.withHandler({
                layerID: WINDOW_LAYER,
                handlerType: 'touchstart',
                handler: self.onTouchStart.bind(self),
            })
            self.withHandler({
                layerID: WINDOW_LAYER,
                handlerType: 'touchend',
                handler: self.onTouchEnd.bind(self),
            })
            self.withHandler({
                layerID: WINDOW_LAYER,
                handlerType: 'touchcancel',
                handler: self.onTouchEnd.bind(self),
            })
        } else {
            self.withHandler({
                layerID: WINDOW_LAYER,
                handlerType: 'mousemove',
                handler: self.onMouseMove.bind(self),
            })
            self.withHandler({
                layerID: WINDOW_LAYER,
                handlerType: 'mouseout',
                handler: self.onMouseOut.bind(self),
            })
            self.withHandler({
                layerID: WINDOW_LAYER,
                handlerType: 'mouseenter',
                handler: self.onMouseEnter.bind(self),
            })
            self.withHandler({
                layerID: WINDOW_LAYER,
                handlerType: 'mousedown',
                handler: self.onMouseDown.bind(self),
            })
            self.withHandler({
                layerID: WINDOW_LAYER,
                handlerType: 'mouseup',
                handler: self.onMouseUp.bind(self),
            })
        }

        store.events.subscribe({
            eventName: 'stateChange',
            callback: self.throttledCallback.bind(self),
        })
    }

    get throttledCallback() {
        return throttle(100, this.storeCallback.bind(this))
    }

    storeCallback() {
        this.iteration = 0

        this._visibleBounds = this.store.state.charts[this.chartID].ui.visibleBounds
        this._activeCharts = this.store.state.charts[this.chartID].ui.activeCharts
        this.nightMode = this.store.state.nightMode

        this.recalculate({ showFullRange: true })
        
        if (this.animationID) {
            window.cancelAnimationFrame(this.animationID)
        }
        window.requestAnimationFrame(this.drawScene.bind(this))
    }

    drawScene() {
        this.drawWindow()
        this.drawChart({
            layerID: BASE_LAYER,
            points: this.points,
            colors: this._rawData.colors,
            isInitial: this.isInitial
        })
    }

    setHoverType({ event }) {
        const mousePosition = this.getCursorPosition(event)
        const { windowPosition, borderThreshold } = this

        // detect right border hover
        if (
            windowPosition.x + windowPosition.width - borderThreshold <=
                mousePosition.x &&
            mousePosition.x <=
                windowPosition.x + windowPosition.width + borderThreshold
        ) {
            this.hoverType = HOVER_RIGHT_BORDER
        } // detect left border hover
        else if (
            mousePosition.x - borderThreshold <= windowPosition.x &&
            windowPosition.x <= mousePosition.x + borderThreshold
        ) {
            this.hoverType = HOVER_LEFT_BORDER
        } // detect center hover
        else if (
            mousePosition.x > windowPosition.x &&
            mousePosition.x < windowPosition.x + windowPosition.width
        ) {
            this.hoverType = HOVER_INNER
        } else {
            this.hoverType = null
        }

        return this.hoverType
    }

    onMouseMove(event) {
        event.preventDefault()

        const currentMousePosition = this.getCursorPosition(event)
        const { drawWindow, mouseDown, mousePosition } = this
        const windowLayer = this.getLayer({ layerID: WINDOW_LAYER })
        let hoverType = this.hoverType

        // Keep hover type on mouse down
        if (!hoverType || !mouseDown) {
            hoverType = this.setHoverType({ event })
        }

        if (mouseDown && !this.isMooving) {
            this.toggleMoovingState({ isMooving: true })
        }

        switch (hoverType) {
            case HOVER_LEFT_BORDER:
                windowLayer.style.cursor = 'w-resize'
                this.transform = 'left'
                break
            case HOVER_RIGHT_BORDER:
                windowLayer.style.cursor = 'e-resize'
                this.transform = 'right'
                break
            case HOVER_INNER:
                windowLayer.style.cursor = 'move'
                this.transform = 'move'
                break
            default:
                windowLayer.style.cursor = 'default'
                this.transform = null
        }

        if (this.animationID && !mouseDown) {
            window.cancelAnimationFrame(this.animationID)
        } else if (mouseDown) {
            this.prevMosuePosition = mousePosition
            this.mousePosition = currentMousePosition
            this.animationID = window.requestAnimationFrame(
                drawWindow.bind(this)
            )
            this.sliceVisiblePart()
        }
    }

    get delta() {
        const { windowPosition, width } = this
        let delta = this.mouseDelta
        let newDelta = this._delta + delta

        // Set boundaries to prevent window overflowing
        if (newDelta < 0) {
            newDelta = 0
        } else if (newDelta >= width - windowPosition.width) {
            newDelta = windowPosition.x
        }
        this._delta = newDelta
        return newDelta
    }

    get mouseDelta() {
        const { prevMosuePosition, mousePosition, dpr } = this

        // 1.3 to boost up delta for retina devices, otherwise window moving too slow
        return ((mousePosition.x - prevMosuePosition.x) / dpr) * 1.3
    }

    get throttledMosueMove() {
        return throttle(10, this.onMouseMove.bind(this))
    }

    onMouseDown(event) {
        event.preventDefault()

        const mousePosition = this.getCursorPosition(event)

        this.mouseDown = true
        this.mousePosition = mousePosition
    }

    onTouchStart(event) {
        event.preventDefault()

        this.mouseIn = true
        this.setHoverType({ event })
        this.onMouseDown(event)
    }

    onTouchEnd(event) {
        this.mouseIn = false
        this.onMouseUp(event)
    }

    onMouseUp() {
        this.mouseDown = false
        this.toggleMoovingState({ isMooving: false })
    }

    onMouseEnter() {
        this.mouseIn = true
    }

    onMouseOut() {
        this.mouseIn = false
        this.mouseDown = false
        this.toggleMoovingState({ isMooving: false })
    }

    drawWindow() {
        const { windowPosition, transform, delta, mouseDelta, nightMode } = this
        const windowLayerContext = this.getLayerContext({
            layerID: WINDOW_LAYER,
        })

        let newWindowPosition = windowPosition
        let newWidth

        this.clearContext({ layerID: WINDOW_LAYER })
        if (transform === 'move') {
            newWindowPosition = {
                ...newWindowPosition,
                x: delta,
            }
        } else if (transform === 'left') {
            newWidth = windowPosition.width - mouseDelta
            newWindowPosition = {
                ...newWindowPosition,
                x: windowPosition.x + mouseDelta,
                width:
                    newWidth < MIN_WINDOW_WIDTH ? MIN_WINDOW_WIDTH : newWidth,
            }
        } else if (transform === 'right') {
            newWidth = windowPosition.width + mouseDelta
            newWindowPosition = {
                ...newWindowPosition,
                width:
                    newWidth < MIN_WINDOW_WIDTH ? MIN_WINDOW_WIDTH : newWidth,
            }
        }

        this.windowPosition = newWindowPosition
        windowLayerContext.strokeStyle = nightMode
            ? NIGHT_BORDER_COLOR
            : BORDER_COLOR
        windowLayerContext.lineWidth = BORDER_WIDTH
        windowLayerContext.strokeRect(
            newWindowPosition.x,
            newWindowPosition.y,
            newWindowPosition.width,
            newWindowPosition.height
        )
        windowLayerContext.save()

        this.drawOverlay()
    }

    drawOverlay() {
        const { width, height, windowPosition, nightMode } = this
        const windowLayerContext = this.getLayerContext({
            layerID: WINDOW_LAYER,
        })

        windowLayerContext.fillStyle = nightMode
            ? NIGHT_OVERLAY_COLOR
            : OVERLAY_COLOR
        // Right overlay
        windowLayerContext.fillRect(
            windowPosition.width + windowPosition.x,
            0,
            width - windowPosition.width,
            height
        )

        // Left overlay
        windowLayerContext.fillRect(0, 0, windowPosition.x, height)
    }

    sliceVisiblePart() {
        const { windowPosition, xCoords, store, chartID } = this

        store.dispatch({
            actionKey: SET_VISIBLE_BOUNDS,
            payload: {
                chartID,
                visibleBounds: {
                    fromIndex: xCoords.findIndex(
                        item => item >= windowPosition.x
                    ),
                    toIndex: xCoords.findIndex(
                        item => item >= windowPosition.x + windowPosition.width
                    ),
                    windowPosition: windowPosition,
                },
            },
        })
    }

    toggleMoovingState({ isMooving }) {
        const { store, chartID } = this

        if (isMooving !== this.isMooving) {
            this.isMooving = isMooving
            store.dispatch({
                actionKey: TOGGLE_MOOVING_STATE,
                payload: { chartID, isMooving },
            })
        }
    }
}

export default Preview
