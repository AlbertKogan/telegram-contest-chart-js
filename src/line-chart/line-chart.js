import Base from '../common/base'
import {
    LINE_CHART_LAYER,
    X_AXIS_LAYER,
    LINES_LAYER,
    HOVERABLE_LAYER,
    TOOLTIP_LAYER,
    TICK_HEIGHT,
    TICK_FONT_SIZE,
    Y_FONT_SIZE,
    FONT_COLOR,
    NIGHT_FONT_COLOR,
    AXIS_COLOR,
    NIGHT_AXIS_COLOR,
    LINE_COLOR,
    NIGHT_LINE_COLOR,
    HOVER_LINE_COLOR,
    NIGHT_HOVER_LINE_COLOR,
    TOOLTIP_BACKGROUND,
    NIGHT_TOOLTIP_BACKGROUND,
    TOOLTIP_BORDER_COLOR,
    NIGHT_TOOLTIP_BORDER_COLOR,
    TOOLTIP_TEXT_COLOR,
    NIGHT_TOOLTIP_TEXT_COLOR,
    DOT_FILL,
    NIGHT_DOT_FILL,
    TOOLTIP_PADDING,
    MIN_TOOLTIP_WIDTH,
} from './constants'
import { throttle, abbreviateNumber, outQuart } from '../common/utils'

import commonStyles from './../style.scss'

class LineChart extends Base {
    _rawData = {}
    _visibleBounds = { fromIndex: 0, toIndex: 0 }
    _activeIndex = -1
    _mousePosition = {}
    _hoverThreshold = 10
    _opacity = 0
    isMooving = false
    xAxisIteration = 0
    yAxisIteration = 0

    constructor({ parent, data, store, chartID }) {
        super()
        const self = this

        self.parent = parent
        self._rawData = data
        self.store = store
        self.chartID = chartID

        self.setParentSize()
        // Do it better
        self.chartHeight = self.parentSize.height - TICK_HEIGHT

        const chartLayer = self.createLayer({ layerID: LINE_CHART_LAYER })
        const xAxisLayer = self.createLayer({ layerID: X_AXIS_LAYER })
        const backLayer = self.createLayer({ layerID: LINES_LAYER })
        const hoverableLayer = self.createLayer({ layerID: HOVERABLE_LAYER })
        const tooltipLayer = self.createLayer({ layerID: TOOLTIP_LAYER })

        chartLayer.classList.add(commonStyles.layer)
        xAxisLayer.classList.add(commonStyles.layer)
        backLayer.classList.add(commonStyles.layer)
        hoverableLayer.classList.add(commonStyles.layer)
        tooltipLayer.classList.add(commonStyles.layer)

        // Default state
        self._visibleBounds = store.state.charts[self.chartID].ui.visibleBounds
        self._activeCharts = store.state.charts[self.chartID].ui.activeCharts

        this.isInitial = true
        this.setAverageLabelWidth()
        self.recalculate({ showFullRange: false })
        self.drawScene()
        this.isInitial = false

        if (self.touchDevice) {
            self.withHandler({
                layerID: TOOLTIP_LAYER,
                handlerType: 'touchstart',
                handler: self.onMouseMove.bind(self),
                options: { passive: true },
            })

            self.withHandler({
                layerID: TOOLTIP_LAYER,
                handlerType: 'touchmove',
                handler: self.throttledMosueMove.bind(self),
                options: { passive: true },
            })

            self.withHandler({
                layerID: TOOLTIP_LAYER,
                handlerType: 'touchend',
                handler: self.hideTooltip.bind(self),
            })
        } else {
            self.withHandler({
                layerID: TOOLTIP_LAYER,
                handlerType: 'mousemove',
                handler: self.throttledMosueMove.bind(self),
            })
            self.withHandler({
                layerID: TOOLTIP_LAYER,
                handlerType: 'mouseout',
                handler: self.hideTooltip.bind(self),
            })
        }
        store.events.subscribe({
            eventName: 'stateChange',
            callback: self.throttledCallback.bind(self),
        })
    }

    get throttledCallback() {
        return throttle(10, this.storeCallback.bind(this))
    }

    storeCallback({ meta }) {
        if (meta.id !== this.chartID && meta.id !== 'ALL') {
            return
        }

        this._visibleBounds = this.store.state.charts[
            this.chartID
        ].ui.visibleBounds
        this._activeCharts = this.store.state.charts[
            this.chartID
        ].ui.activeCharts
        this.nightMode = this.store.state.nightMode
        const isMooving = this.store.state.charts[this.chartID].ui.isMooving

        this.recalculate({ showFullRange: false })
        this.iteration = 0
        this.xAxisIteration = 0
        this.yAxisAnimationID = 0

        if (this.isMooving && !isMooving) {
            this.cancelAllAnimations()
        } else {
            let id = window.requestAnimationFrame(this.drawScene.bind(this))
            this.addAnimationID({ animationID: 'CHART_SCENE_ANIMATION', id })
            this.cancelPrevAnimations({ animationID: 'CHART_SCENE_ANIMATION' })
        }

        this.isMooving = isMooving
    }

    hideTooltip() {
        this.clearContext({ layerID: HOVERABLE_LAYER })
        this.clearContext({ layerID: TOOLTIP_LAYER })
    }

    dateLabel({ UNIXDate, additionalOtions = {} }) {
        const date = new Date(UNIXDate)

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            ...additionalOtions,
        })
    }

    get visibleBounds() {
        return this._visibleBounds
    }

    get rawData() {
        return this._rawData
    }

    drawScene() {
        this.clearScene()
        this.drawChart({
            layerID: LINE_CHART_LAYER,
            points: this.points,
            colors: this._rawData.colors,
            isInitial: this.isInitial,
        })
        this.drawXAxis()
        this.drawLines()
    }

    drawXAxis() {
        const { chartHeight, width, nightMode } = this
        const xAxisLayer = this.getLayerContext({ layerID: X_AXIS_LAYER })
        this.clearContext({ layerID: X_AXIS_LAYER })

        xAxisLayer.strokeStyle = nightMode ? NIGHT_AXIS_COLOR : AXIS_COLOR
        xAxisLayer.beginPath()
        xAxisLayer.moveTo(0, chartHeight - TICK_FONT_SIZE)
        xAxisLayer.lineTo(width, chartHeight - TICK_FONT_SIZE)
        xAxisLayer.stroke()
        xAxisLayer.fill()
        xAxisLayer.closePath()

        xAxisLayer.beginPath()
        this.drawXAxisTicks()
        xAxisLayer.closePath()
    }

    setAverageLabelWidth() {
        const xAxisLayer = this.getLayerContext({ layerID: X_AXIS_LAYER })
        const { _rawData, dateLabel } = this

        const averageLabelWidth =
            _rawData.x.reduce((acc, x, index) => {
                const label = dateLabel({ UNIXDate: _rawData.x[index] })
                const textSize = xAxisLayer.measureText(label)
                return acc + textSize.width
            }, 0) / _rawData.x.length

        this._averageLabelWdth = Math.round(averageLabelWidth)
    }

    drawXAxisTicks() {
        const {
            chartHeight,
            width,
            xCoords,
            _rawData,
            dateLabel,
            _averageLabelWdth,
            visibleBounds,
            nightMode,
            prevState,
        } = this
        const xAxisLayer = this.getLayerContext({ layerID: X_AXIS_LAYER })
        const { fromIndex, toIndex } = visibleBounds
        const prevXCoords = prevState ? prevState.xCoords : null
        let transition = outQuart(this.xAxisIteration / this.tickCount)

        this.clearContext({ layerID: X_AXIS_LAYER })

        xAxisLayer.font = `lighter ${TICK_FONT_SIZE}px Helvetica`
        xAxisLayer.fillStyle = nightMode ? NIGHT_FONT_COLOR : FONT_COLOR

        // Visible count of labels
        const maxPeraxis = Math.round(width / (_averageLabelWdth + 40))
        const visibleXCoords = xCoords.slice(fromIndex, toIndex)

        // Step should be dynamic according to visible window size
        let step = Math.round(visibleXCoords.length / maxPeraxis)

        for (let _x = 0; _x <= xCoords.length; _x += step) {
            const label = dateLabel({ UNIXDate: _rawData.x[_x] })
            xAxisLayer.fillText(
                label,
                prevXCoords[_x] + (xCoords[_x] - prevXCoords[_x]) * transition,
                chartHeight
            )
        }

        this.xAxisIteration += 1
        if (this.xAxisIteration <= this.tickCount) {
            let id = window.requestAnimationFrame(
                this.drawXAxisTicks.bind(this)
            )
            this.addAnimationID({ animationID: 'XAXIS_ANIMATION', id })
            this.cancelPrevAnimations({ animationID: 'XAXIS_ANIMATION' })
        } else {
            this.xAxisIteration = 0
        }
    }

    drawLines() {
        const FONT_PADDING = 7
        const {
            width,
            nightMode,
            maxInColumns,
            localMaxInColumns,
            chartHeight,
            prevState,
            yCoords,
        } = this
        const { windowPosition } = this._visibleBounds
        const prevYCoords = prevState.yCoords

        const linesLayer = this.getLayerContext({ layerID: LINES_LAYER })
        const boundedHeight = chartHeight - TICK_FONT_SIZE
        let windowHeight = windowPosition ? windowPosition.height : 80
        let scale = boundedHeight / windowHeight
        let transition = outQuart(this.yAxisIteration / this.tickCount)
        const base = (scale * boundedHeight) / localMaxInColumns
        const dataStep = localMaxInColumns / base

        this.clearContext({ layerID: LINES_LAYER })

        linesLayer.strokeStyle = nightMode ? NIGHT_LINE_COLOR : LINE_COLOR
        linesLayer.fillStyle = nightMode ? NIGHT_FONT_COLOR : FONT_COLOR
        linesLayer.font = `lighter ${Y_FONT_SIZE}px Helvetica`

        linesLayer.beginPath()

        let current = 0
        let dataOffset = maxInColumns
        for (let y = 0; y <= yCoords.length; y++) {
            linesLayer.moveTo(
                0,
                prevYCoords[y] + (prevYCoords[y] - yCoords[y]) * transition
            )
            linesLayer.lineTo(
                width,
                prevYCoords[y] + (prevYCoords[y] - yCoords[y]) * transition
            )
            linesLayer.fillText(
                current ? abbreviateNumber(current) : 0,
                0,
                prevYCoords[y] +
                    (prevYCoords[y] - yCoords[y]) * transition -
                    FONT_PADDING
            )
            dataOffset -= dataStep
            current = maxInColumns - dataOffset
        }
        linesLayer.stroke()
        linesLayer.closePath()

        this.yAxisIteration += 1
        if (this.yAxisIteration <= this.tickCount) {
            let id = window.requestAnimationFrame(this.drawLines.bind(this))
            this.addAnimationID({ animationID: 'YAXIS_ANIMATION', id })
            this.cancelPrevAnimations({ animationID: 'XAXIS_ANIMATION' })
        } else {
            this.yAxisIteration = 0
        }
    }

    get throttledMosueMove() {
        return throttle(10, this.onMouseMove.bind(this))
    }

    onMouseMove(event) {
        const currentMousePosition = this.getCursorPosition(event)
        const { xCoords, _hoverThreshold } = this

        this._mousePosition = currentMousePosition
        this._activeIndex = xCoords.findIndex(x => {
            if (
                currentMousePosition.x >= x - _hoverThreshold &&
                currentMousePosition.x <= x + _hoverThreshold
            ) {
                return true
            }
            return false
        })

        window.requestAnimationFrame(this.drawOnHover.bind(this))
    }

    drawOnHover() {
        const {
            _activeIndex,
            xCoords,
            chartHeight,
            _rawData,
            points,
            nightMode,
        } = this
        const hoverableLayerContext = this.getLayerContext({
            layerID: HOVERABLE_LAYER,
        })
        const colors = _rawData.colors

        this.clearContext({ layerID: HOVERABLE_LAYER })

        if (_activeIndex > -1) {
            let x = xCoords[_activeIndex]

            hoverableLayerContext.fillStyle = nightMode
                ? NIGHT_DOT_FILL
                : DOT_FILL
            hoverableLayerContext.strokeStyle = nightMode
                ? NIGHT_HOVER_LINE_COLOR
                : HOVER_LINE_COLOR
            hoverableLayerContext.beginPath()
            hoverableLayerContext.lineWidth = 1
            hoverableLayerContext.moveTo(x, 0)
            hoverableLayerContext.lineTo(x, chartHeight - TICK_FONT_SIZE)
            hoverableLayerContext.stroke()
            hoverableLayerContext.closePath()

            for (let point in points) {
                let y = points[point][_activeIndex].y
                hoverableLayerContext.strokeStyle = colors[point]
                hoverableLayerContext.lineWidth = 4
                hoverableLayerContext.beginPath()
                hoverableLayerContext.arc(x, y, 4, 0, 2 * Math.PI)
                hoverableLayerContext.stroke()
                hoverableLayerContext.fill()
                hoverableLayerContext.closePath()
            }
        }

        this.drawTooltip()
    }

    calculateTooltipWidth() {
        const tooltipLayerContext = this.getLayerContext({
            layerID: TOOLTIP_LAYER,
        })

        const { _activeIndex, _rawData, _activeCharts } = this
        const columns = _rawData.columns

        let width = 0
        let count = 0

        for (let column in columns) {
            if (_activeCharts[column]) {
                const text = abbreviateNumber(columns[column][_activeIndex])
                width += tooltipLayerContext.measureText(text).width
                count++
            }
        }

        const finalWidth = Math.round(width) + TOOLTIP_PADDING * (count + 1)
        return finalWidth < MIN_TOOLTIP_WIDTH ? MIN_TOOLTIP_WIDTH : finalWidth
    }

    drawRoundRect({ context, x, y, width, height }) {
        const { nightMode } = this

        const cornerRadius = {
            upperLeft: 6,
            upperRight: 6,
            lowerLeft: 6,
            lowerRight: 6,
        }

        context.beginPath()
        context.lineWidth = 1
        context.moveTo(x + cornerRadius.upperLeft, y)
        context.lineTo(x + width - cornerRadius.upperRight, y)
        context.quadraticCurveTo(
            x + width,
            y,
            x + width,
            y + cornerRadius.upperRight
        )
        context.lineTo(x + width, y + height - cornerRadius.lowerRight)
        context.quadraticCurveTo(
            x + width,
            y + height,
            x + width - cornerRadius.lowerRight,
            y + height
        )
        context.lineTo(x + cornerRadius.lowerLeft, y + height)
        context.quadraticCurveTo(
            x,
            y + height,
            x,
            y + height - cornerRadius.lowerLeft
        )
        context.lineTo(x, y + cornerRadius.upperLeft)
        context.quadraticCurveTo(x, y, x + cornerRadius.upperLeft, y)
        context.fillStyle = nightMode
            ? NIGHT_TOOLTIP_BACKGROUND
            : TOOLTIP_BACKGROUND
        context.strokeStyle = nightMode
            ? NIGHT_TOOLTIP_BORDER_COLOR
            : TOOLTIP_BORDER_COLOR
        context.fill()
        context.stroke()
        context.closePath()
    }

    drawTooltipText({ context, date, x, y }) {
        const { _activeIndex, _rawData, nightMode, _activeCharts } = this

        // insert date
        context.font = 'lighter 15px Helvetica'
        context.fillStyle = nightMode
            ? NIGHT_TOOLTIP_TEXT_COLOR
            : TOOLTIP_TEXT_COLOR
        context.fillText(date, x + TOOLTIP_PADDING, y + 25)
        context.save()

        // chart data
        let offset = TOOLTIP_PADDING
        for (let column in _rawData.columns) {
            if (_activeCharts[column]) {
                context.fillStyle = _rawData.colors[column]
                const text = abbreviateNumber(
                    _rawData.columns[column][_activeIndex]
                )
                const name = _rawData.names[column]

                context.fillText(text, x + offset, y + 50)
                context.fillText(name, x + offset, y + 70)
                offset =
                    offset + context.measureText(text).width + TOOLTIP_PADDING
                context.save()
            }
        }
    }

    drawTooltip() {
        const tooltipLayerContext = this.getLayerContext({
            layerID: TOOLTIP_LAYER,
        })
        const { _activeIndex, xCoords, _rawData, dateLabel, width } = this
        const height = 80

        let x = xCoords[_activeIndex] + 20
        let y = 20

        this.clearContext({ layerID: TOOLTIP_LAYER })

        if (_activeIndex > -1) {
            const tooltipWidth = this.calculateTooltipWidth()
            const date = dateLabel({
                UNIXDate: _rawData.x[_activeIndex],
                additionalOtions: { weekday: 'short' },
            })

            // Check boundaries
            if (x + tooltipWidth > width) {
                x -= tooltipWidth + 40
            }

            this.drawRoundRect({
                context: tooltipLayerContext,
                x,
                y,
                width: tooltipWidth,
                height,
            })

            this.drawTooltipText({
                context: tooltipLayerContext,
                date,
                x,
                y,
            })
        }
    }
}

export default LineChart
