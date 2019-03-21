import Base from '../common/base'
import {
    LINE_CHART_LAYER,
    X_AXIS_LAYER,
    LINES_LAYER,
    HOVERABLE_LAYER,
    TOOLTIP_LAYER,
} from './constants'
import { throttle, convertToXAxisCoords } from '../common/utils'

import commonStyles from './../style.scss'

const TICK_HEIGHT = 15
const TICK_FONT_SIZE = 15

const FONT_COLOR = 'rgb(150, 162, 170)'
const NIGHT_FONT_COLOR = 'rgb(85 ,103, 119)'
const AXIS_COLOR = 'rgb(236, 240, 243)'
const NIGHT_AXIS_COLOR = 'rgb(49, 61, 76)'
const LINE_COLOR = 'rgb(242, 244, 245)'
const NIGHT_LINE_COLOR = 'rgb(41, 53, 67)'
const HOVER_LINE_COLOR = 'rgb(223, 230, 235)'
const NIGHT_HOVER_LINE_COLOR = 'rgb(60, 74, 89)'
const TOOLTIP_BACKGROUND = 'white';
const NIGHT_TOOLTIP_BACKGROUND = 'rgb(37, 50, 64)';
const DOT_FILL = 'white';
const NIGHT_DOT_FILL = 'rgb(36, 47, 61)'

class LineChart extends Base {
    _rawData = {}
    _visibleBounds = { fromIndex: 0, toIndex: 0 }
    _animationID
    _activeIndex = -1
    _mousePosition = {}
    _hoverThreshold = 10
    _opacity = 0

    constructor({ parent, data, store }) {
        super()
        const self = this

        self.parent = parent
        self._rawData = data
        self.store = store

        self.setParentSize()
        // Do it better
        self.chartHeight = self.parentSize.height - TICK_HEIGHT

        const chartLayer = self.createLayer({ layerID: LINE_CHART_LAYER })
        const xAxisLayer = self.createLayer({ layerID: X_AXIS_LAYER })
        const backLayer = self.createLayer({ layerID: LINES_LAYER })
        const hoverableLayer = self.createLayer({ layerID: HOVERABLE_LAYER })
        const tooltipLayer = self.createLayer({ layerID: TOOLTIP_LAYER })

        chartLayer.width = self.width
        chartLayer.height = self.height
        chartLayer.classList.add(commonStyles.layer)

        xAxisLayer.width = self.width
        xAxisLayer.height = self.height
        xAxisLayer.classList.add(commonStyles.layer)

        backLayer.width = self.width
        backLayer.height = self.height
        backLayer.classList.add(commonStyles.layer)

        hoverableLayer.width = self.width
        hoverableLayer.height = self.height
        hoverableLayer.classList.add(commonStyles.layer)

        tooltipLayer.width = self.width
        tooltipLayer.height = self.height
        tooltipLayer.classList.add(commonStyles.layer)

        // Default state
        self._visibleBounds = store.state.ui.visibleBounds
        self._activeCharts = store.state.ui.activeCharts

        self._xCoordsAll = convertToXAxisCoords({
            layerWidth: self.width,
            data: self._rawData.x,
        })

        this.setAverageLabelWidth()
        self.recalculate({ showFullRange: false })
        self.drawScene()

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
        store.events.subscribe({
            eventName: 'stateChange',
            callback: () => {
                self.iteration = 0

                self._visibleBounds = store.state.ui.visibleBounds
                self._activeCharts = store.state.ui.activeCharts
                self.nightMode = store.state.ui.nightMode

                self.recalculate({ showFullRange: false })
                window.requestAnimationFrame(self.drawScene.bind(self))
            },
        })
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
            nightMode
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
        const { height, width, nightMode } = this
        const linesLayer = this.getLayerContext({ layerID: LINES_LAYER })

        let h = height - 50

        this.clearContext({ layerID: LINES_LAYER })

        linesLayer.strokeStyle = nightMode ? NIGHT_LINE_COLOR : LINE_COLOR

        linesLayer.beginPath()
        while (h >= 0) {
            h -= 100
            linesLayer.moveTo(0, h)
            linesLayer.lineTo(width, h)
        }
        linesLayer.stroke()
        linesLayer.closePath()
    }

    get throttledMosueMove() {
        return throttle(10, this.onMouseMove.bind(this))
    }

    onMouseMove(event) {
        const currentMousePosition = { x: event.clientX, y: event.clientY }
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

        // if (this._animationID) {
        //     window.cancelAnimationFrame(this.animationID);
        // } else {
        //     this._animationID = window.requestAnimationFrame(this.drawOnHover.bind(this));
        // }

        this._animationID = window.requestAnimationFrame(
            this.drawOnHover.bind(this)
        )
    }

    drawOnHover() {
        const { _activeIndex, xCoords, chartHeight, _rawData, points, nightMode } = this
        const hoverableLayerContext = this.getLayerContext({
            layerID: HOVERABLE_LAYER,
        })
        const colors = _rawData.colors

        this.clearContext({ layerID: HOVERABLE_LAYER })

        if (_activeIndex > -1) {
            let x = xCoords[_activeIndex]

            hoverableLayerContext.fillStyle = nightMode ? NIGHT_DOT_FILL : DOT_FILL
            hoverableLayerContext.strokeStyle = nightMode ? NIGHT_HOVER_LINE_COLOR : HOVER_LINE_COLOR
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

    drawTooltip() {
        const tooltipLayerContext = this.getLayerContext({
            layerID: TOOLTIP_LAYER,
        })
        const { _activeIndex, xCoords, _rawData, dateLabel, width, nightMode } = this

        var cornerRadius = {
            upperLeft: 10,
            upperRight: 10,
            lowerLeft: 10,
            lowerRight: 10,
        }
        // TODO: add dynamic width, height
        const tooltipWidth = 200
        const height = 150
        let x = xCoords[_activeIndex] + 20
        let y = 20

        this.clearContext({ layerID: TOOLTIP_LAYER })

        if (_activeIndex > -1) {
            const date = dateLabel({
                UNIXDate: _rawData.x[_activeIndex],
                additionalOtions: { weekday: 'short' },
            })

            // Check boundaries
            if (x + tooltipWidth > width) {
                x -= tooltipWidth + 40
            }

            tooltipLayerContext.beginPath()
            // tooltipLayerContext.shadowBlur = 6;
            // tooltipLayerContext.shadowOffsetY = 2;
            // tooltipLayerContext.shadowColor = "#969696";
            tooltipLayerContext.moveTo(x + cornerRadius.upperLeft, y)
            tooltipLayerContext.lineTo(
                x + tooltipWidth - cornerRadius.upperRight,
                y
            )
            tooltipLayerContext.quadraticCurveTo(
                x + tooltipWidth,
                y,
                x + tooltipWidth,
                y + cornerRadius.upperRight
            )
            tooltipLayerContext.lineTo(
                x + tooltipWidth,
                y + height - cornerRadius.lowerRight
            )
            tooltipLayerContext.quadraticCurveTo(
                x + tooltipWidth,
                y + height,
                x + tooltipWidth - cornerRadius.lowerRight,
                y + height
            )
            tooltipLayerContext.lineTo(x + cornerRadius.lowerLeft, y + height)
            tooltipLayerContext.quadraticCurveTo(
                x,
                y + height,
                x,
                y + height - cornerRadius.lowerLeft
            )
            tooltipLayerContext.lineTo(x, y + cornerRadius.upperLeft)
            tooltipLayerContext.quadraticCurveTo(
                x,
                y,
                x + cornerRadius.upperLeft,
                y
            )
            tooltipLayerContext.fillStyle = nightMode ? NIGHT_TOOLTIP_BACKGROUND : TOOLTIP_BACKGROUND
            tooltipLayerContext.strokeStyle = '#969696'
            tooltipLayerContext.fill()
            tooltipLayerContext.stroke()
            tooltipLayerContext.closePath()

            // TODO: move it to separate handler
            tooltipLayerContext.font = 'lighter 15px Helvetica'
            tooltipLayerContext.fillStyle = nightMode ? NIGHT_FONT_COLOR : FONT_COLOR
            tooltipLayerContext.fillText(date, x + 25, y + 25)
            tooltipLayerContext.save()

            tooltipLayerContext.fillStyle = _rawData.colors['y0']
            tooltipLayerContext.fillText(
                _rawData.columns['y0'][_activeIndex],
                x + 25,
                y + 55
            )
            tooltipLayerContext.save()

            tooltipLayerContext.fillStyle = _rawData.colors['y1']
            tooltipLayerContext.fillText(
                _rawData.columns['y1'][_activeIndex],
                x + 60,
                y + 55
            )
            tooltipLayerContext.save()
        }
    }
}

export default LineChart
