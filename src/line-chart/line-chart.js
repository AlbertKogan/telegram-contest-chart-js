import Base from '../common/base'
import {
    LINE_CHART_LAYER,
    X_AXIS_LAYER,
    LINES_LAYER,
    HOVERABLE_LAYER,
    TOOLTIP_LAYER,
} from './constants'
import {
    throttle,
    convertToXAxisCoords,
    abbreviateNumber,
} from '../common/utils'

import commonStyles from './../style.scss'

const TICK_HEIGHT = 15
const TICK_FONT_SIZE = 11
const Y_FONT_SIZE = 9

const FONT_COLOR = 'rgb(150, 162, 170)'
const NIGHT_FONT_COLOR = 'rgb(85 ,103, 119)'
const AXIS_COLOR = 'rgb(236, 240, 243)'
const NIGHT_AXIS_COLOR = 'rgb(49, 61, 76)'
const LINE_COLOR = 'rgb(242, 244, 245)'
const NIGHT_LINE_COLOR = 'rgb(41, 53, 67)'
const HOVER_LINE_COLOR = 'rgb(223, 230, 235)'
const NIGHT_HOVER_LINE_COLOR = 'rgb(60, 74, 89)'
const TOOLTIP_BACKGROUND = 'rgb(255, 255, 255)'
const NIGHT_TOOLTIP_BACKGROUND = 'rgb(37, 50, 64)'
const TOOLTIP_BORDER_COLOR = 'rgb(227, 227, 227)'
const NIGHT_TOOLTIP_BORDER_COLOR = 'rgb(32, 42, 54)'
const TOOLTIP_TEXT_COLOR = 'rgb(34, 34, 34)'
const NIGHT_TOOLTIP_TEXT_COLOR = 'rgb(255, 255, 255)'

const DOT_FILL = 'rgb(255, 255, 255)'
const NIGHT_DOT_FILL = 'rgb(36, 47, 61)'

const TOOLTIP_PADDING = 5
const MIN_TOOLTIP_WIDTH = 100

class LineChart extends Base {
    _rawData = {}
    _visibleBounds = { fromIndex: 0, toIndex: 0 }
    _activeIndex = -1
    _mousePosition = {}
    _hoverThreshold = 10
    _opacity = 0
    isMooving = false

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

        self._xCoordsAll = convertToXAxisCoords({
            layerWidth: self.width,
            data: self._rawData.x,
        })

        this.setAverageLabelWidth()
        self.recalculate({ showFullRange: false })
        self.drawScene()

        if (self.touchDevice) {
            self.withHandler({
                layerID: TOOLTIP_LAYER,
                handlerType: 'touchstart',
                handler: self.onMouseMove.bind(self),
            })

            self.withHandler({
                layerID: TOOLTIP_LAYER,
                handlerType: 'touchmove',
                handler: self.throttledMosueMove.bind(self),
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
            callback: self.throttledCallback.bind(self)
        })
    }

    get throttledCallback () {
        return throttle(100, this.storeCallback.bind(this))
    }

    storeCallback () {
        this.iteration = 0

        this._visibleBounds = this.store.state.charts[this.chartID].ui.visibleBounds
        this._activeCharts = this.store.state.charts[this.chartID].ui.activeCharts
        this.isMooving = this.store.state.charts[this.chartID].ui.isMooving
        this.nightMode = this.store.state.nightMode


        this.recalculate({ showFullRange: false })
        window.requestAnimationFrame(this.drawScene.bind(this))
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
        } = this
        const xAxisLayer = this.getLayerContext({ layerID: X_AXIS_LAYER })

        xAxisLayer.font = `lighter ${TICK_FONT_SIZE}px Helvetica`
        xAxisLayer.fillStyle = nightMode ? NIGHT_FONT_COLOR : FONT_COLOR

        // Visible count of labels
        const maxPeraxis = Math.round(width / (_averageLabelWdth + 40))

        // Step shoukd be dynamic according to visible window size
        let step = Math.round(xCoords.length / maxPeraxis)

        // Visible part
        const sliced = _rawData.x.slice(
            visibleBounds.fromIndex,
            visibleBounds.toIndex
        )
        // --- Upper everithing OK -------

        for (let _x = 0; _x <= xCoords.length; _x += step) {
            const label = dateLabel({ UNIXDate: sliced[_x] })
            xAxisLayer.fillText(label, xCoords[_x], chartHeight)
        }
    }

    drawLines() {
        const LINES = 7
        const FONT_PADDING = 7
        const { width, nightMode, maxInColumns, chartHeight } = this
        const linesLayer = this.getLayerContext({ layerID: LINES_LAYER })
        const boundedHeight = chartHeight - TICK_FONT_SIZE
        const lineStep = boundedHeight / LINES
        const dataStep = maxInColumns / LINES

        this.clearContext({ layerID: LINES_LAYER })

        linesLayer.strokeStyle = nightMode ? NIGHT_LINE_COLOR : LINE_COLOR
        linesLayer.fillStyle = nightMode ? NIGHT_FONT_COLOR : FONT_COLOR
        linesLayer.font = `lighter ${Y_FONT_SIZE}px Helvetica`

        linesLayer.beginPath()

        let dataOffset = maxInColumns
        let h = boundedHeight
        let current = 0

        while (h >= 0) {
            linesLayer.moveTo(0, h)
            linesLayer.lineTo(width, h)
            linesLayer.fillText(
                current ? abbreviateNumber(current) : 0,
                0,
                h - FONT_PADDING
            )
            h -= lineStep
            dataOffset -= dataStep
            current = maxInColumns - dataOffset
        }
        linesLayer.stroke()
        linesLayer.closePath()
    }

    get throttledMosueMove() {
        return throttle(10, this.onMouseMove.bind(this))
    }

    onMouseMove(event) {
        event.preventDefault()

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

        // TODO: add dynamic width, height
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
