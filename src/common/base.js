import {
    maxInDataSet,
    converDataSetToPoints,
    convertToXAxisCoords,
    outQuart,
} from '../common/utils'

class Base {
    layers = {}
    contexts = {}
    touchDevice = false
    parent = null
    parentSize = {}
    dpr = window.devicePixelRatio || 1
    prevState = {}
    tickCount = 30
    iteration = 0

    constructor() {
        this.touchDevice = 'ontouchstart' in document.documentElement
    }

    createLayer({ layerID }) {
        const layer = document.createElement('canvas')

        this.layers = {
            ...this.layers,
            [layerID]: layer,
        }

        layer.width = this.parentSize.width * this.dpr
        layer.height = this.parentSize.height * this.dpr

        const context = layer.getContext('2d')

        context.scale(this.dpr, this.dpr)
        this.contexts = {
            ...this.contexts,
            [layerID]: context,
        }

        return layer
    }

    getLayerContext({ layerID }) {
        return this.contexts[layerID]
    }

    getLayer({ layerID }) {
        return this.layers[layerID]
    }

    setLayerSettings({ layerID, settings }) {
        const context = this.getLayerContext({ layerID })

        if (!context || !settings) {
            return
        }

        for (const settingName in settings) {
            context[settingName] = settings[settingName]
        }
    }

    withHandler({ layerID, handlerType, handler }) {
        const layer = this.getLayer({ layerID })

        if (!layer) {
            return
        }

        layer.addEventListener(handlerType, handler)
    }

    clearContext({ layerID }) {
        const { width, height } = this
        const context = this.getLayerContext({ layerID })

        context.clearRect(0, 0, width, height)
    }

    clearScene() {
        const { contexts } = this

        for (let layerID in contexts) {
            this.clearContext({ layerID })
        }
    }

    drawChart({ layerID, points, colors }) {
        const chartContext = this.getLayerContext({ layerID })
        const { prevState, chartHeight } = this
        const prevPoints = prevState.points || {}
        let transition = outQuart(this.iteration / this.tickCount)

        this.clearContext({ layerID })

        for (let line in points) {
            chartContext.beginPath()
            chartContext.strokeStyle = colors[line]
            for (let i = 0; i < points[line].length - 1; i++) {
                let current = i
                let next = i + 1

                let p1 = points[line][current]
                let p2 = points[line][next]

                if (!prevPoints[line]) {
                    chartContext.moveTo(
                        p1.x,
                        chartHeight -
                            (chartHeight * transition - p1.y * transition)
                    )
                    chartContext.lineTo(
                        p2.x,
                        chartHeight -
                            (chartHeight * transition - p2.y * transition)
                    )
                } else if (prevPoints[line][current] && prevPoints[line][next]) {
                    let prevPoint1 = prevPoints[line][current]
                    let prevPoint2 = prevPoints[line][next]

                    chartContext.moveTo(
                        p1.x,
                        prevPoint1.y + (p1.y - prevPoint1.y) * transition
                    )
                    chartContext.lineTo(
                        p2.x,
                        prevPoint2.y + (p2.y - prevPoint2.y) * transition
                    )
                } else {
                    chartContext.moveTo(
                        p1.x,
                        p1.y
                    )
                    chartContext.lineTo(
                        p2.x,
                        p2.y
                    )
                }
            }

            chartContext.lineWidth = 2
            chartContext.stroke()
            chartContext.closePath()
        }

        this.iteration += 1

        if (this.iteration <= this.tickCount) {
            window.requestAnimationFrame(
                this.drawChart.bind(this, { layerID, points, colors })
            )
        }
    }

    getActiveColumns({ activeCharts, columns }) {
        let activeColumns = {}

        for (let id in activeCharts) {
            if (activeCharts[id]) {
                activeColumns[id] = columns[id]
            }
        }

        return activeColumns
    }

    // TODO: do not call in base
    recalculate({ showFullRange = true }) {
        const activeCharts = this._activeCharts
        const { fromIndex, toIndex } = this._visibleBounds
        const { columns, x } = this._rawData

        const activeColumns = this.getActiveColumns({ activeCharts, columns })
        let newDataSet = { ...activeColumns }
        let newXAxisData = [...x]

        if (toIndex && !showFullRange) {
            newXAxisData = x.slice(fromIndex, toIndex)
            for (let column in activeColumns) {
                newDataSet[column] = columns[column].slice(fromIndex, toIndex)
            }
        }

        // Keep prev state
        this.prevState = {
            ...this.prevState,
            maxInColumns: this.maxInColumns,
            xCoords: this.xCoords,
            points: this.points,
        }

        this.maxInColumns = maxInDataSet({ dataSet: Object.values(newDataSet) })
        this.xCoords = convertToXAxisCoords({
            layerWidth: this.width,
            data: newXAxisData,
        })
        this.points = converDataSetToPoints({
            dataSet: newDataSet,
            xCoords: this.xCoords,
            layerHeight: this.chartHeight,
            maxValue: this.maxInColumns,
        })
    }

    getCursorPosition(event) {
        let currentCursorPosition = this.mousePosition
        const { parentSize } = this;

        if (this.touchDevice && event.touches.length) {
            currentCursorPosition = {
                // x position relative to parent
                x: event.touches[0].clientX - parentSize.x,
                y: event.touches[0].clientY,
            }
        } else {
            currentCursorPosition = { x: event.clientX - parentSize.x, y: event.clientY }
        }

        return currentCursorPosition
    }

    setParentSize() {
        this.parentSize = this.parent.getBoundingClientRect()

        return this.parentSize
    }

    get width() {
        return this.parentSize.width
    }

    get height() {
        return this.parentSize.height
    }
}

export default Base
