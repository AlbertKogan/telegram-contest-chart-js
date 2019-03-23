import {
    maxInDataSet,
    converDataSetToPoints,
    convertToXAxisCoords,
    outQuart,
    createYAxisCoords
} from '../common/utils'

class Base {
    layers = {}
    contexts = {}
    touchDevice = false
    parent = null
    parentSize = {}
    dpr = (window.devicePixelRatio || 1) > 2 ? 2 : window.devicePixelRatio
    prevState = null
    tickCount = 30
    iteration = 0
    isInitial = true
    animations = {
        'WINDOW_ANIMATION': [],
        'CHART_ANIMATION': [],
        'XAXIS_ANIMATION': [],
        'YAXIS_ANIMATION': [],
        'CHART_SCENE_ANIMATION': []
    }

    constructor() {
        this.touchDevice = 'ontouchstart' in document.documentElement
    }

    addAnimationID ({ animationID, id }) {
        this.animations[animationID].push(id)
    }

    cancelPrevAnimations ({ animationID }) {
        let currentID = this.animations[animationID].pop();
        this.animations[animationID].map((id) => window.cancelAnimationFrame(id))
        this.animations[animationID] = [currentID];

    }

    cancelAllAnimations () {
        let emptyAnimations = {}

        for (let a in this.animations) {
            let _animList = this.animations[a];

            _animList.map((animationID) => window.cancelAnimationFrame(animationID))
            emptyAnimations[a] = []
        }

        this.animations = emptyAnimations
    }

    createLayer({ layerID }) {
        let layer = document.createElement('canvas')

        layer.width = this.parentSize.width * this.dpr
        layer.height = this.parentSize.height * this.dpr
        layer.style.width = `${this.parentSize.width}px`
        layer.style.height = `${this.parentSize.height}px`

        const context = layer.getContext('2d')

        context.scale(this.dpr, this.dpr)
        context.imageSmoothingEnabled = false

        this.layers = {
            ...this.layers,
            [layerID]: layer,
        }

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

    withHandler({ layerID, handlerType, handler, options = {} }) {
        const layer = this.getLayer({ layerID })

        if (!layer) {
            return
        }

        layer.addEventListener(handlerType, handler, options)
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

    drawChart({ layerID, points, colors, isInitial = false }) {
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

                if (isInitial || !prevPoints[line]) {
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
                } else if (
                    prevPoints[line][current] &&
                    prevPoints[line][next]
                ) {
                    let prevPoint1 = prevPoints[line][current]
                    let prevPoint2 = prevPoints[line][next]

                    chartContext.moveTo(
                        prevPoint1.x + (p1.x - prevPoint1.x) * transition,
                        prevPoint1.y + (p1.y - prevPoint1.y) * transition
                    )
                    chartContext.lineTo(
                        prevPoint2.x + (p2.x - prevPoint2.x) * transition,
                        prevPoint2.y + (p2.y - prevPoint2.y) * transition
                    )
                }
            }
            
            chartContext.lineWidth = 2
            chartContext.stroke()
            chartContext.closePath()
        }

        this.iteration += 1

        if (this.iteration <= this.tickCount) {
            const id = window.requestAnimationFrame(
                this.drawChart.bind(this, { layerID, points, colors, isInitial })
            )

            this.addAnimationID({ animationID: 'CHART_ANIMATION', id})
            //this.cancelPrevAnimations({ animationID: 'CHART_ANIMATION' })
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
        const { fromIndex, toIndex, windowPosition } = this._visibleBounds
        const { columns, x } = this._rawData
        const { chartHeight } = this;

        let windowWidth = windowPosition ? windowPosition.width : 200;
        let windowHeight = windowPosition ? windowPosition.height : 80;
        let offset = windowPosition ? windowPosition.x : 0;

        const activeColumns = this.getActiveColumns({ activeCharts, columns })
        let newDataSet = { ...activeColumns }

        if (toIndex && !showFullRange) {
            for (let column in activeColumns) {
                newDataSet[column] = columns[column].slice(fromIndex, toIndex)
            }
        }

        const localMaxInColumns = maxInDataSet({ dataSet: Object.values(newDataSet) })
        const maxInColumns = maxInDataSet({ dataSet: Object.values(activeColumns) })

        let yCoords = []
        if (!showFullRange) {
            yCoords = createYAxisCoords({
                chartHeight: chartHeight - 11,
                localMaxInColumns,
                windowHeight
            })
        }

        const xCoords = convertToXAxisCoords({
            layerWidth: this.width,
            data: x,
            scale: showFullRange ? 1 : this.width / windowWidth,
            offset: showFullRange ? 0 : offset,
        })
        const points = converDataSetToPoints({
            dataSet: activeColumns,
            xCoords: xCoords,
            layerHeight: this.chartHeight,
            maxValue: localMaxInColumns,
        })

        if (!this.prevState) {
            // Keep prev state
            this.prevState = {
                maxInColumns: maxInColumns,
                localMaxInColumns: localMaxInColumns,
                xCoords: xCoords,
                points: points,
                yCoords: yCoords
            }
        } else {
            this.prevState = {
                ...this.prevState,
                maxInColumns: this.maxInColumns,
                localMaxInColumns: this.localMaxInColumns,
                xCoords: this.xCoords,
                points: this.points,
                yCoords: this.yCoords
            }
        }

        this.maxInColumns = maxInColumns
        this.localMaxInColumns = localMaxInColumns
        this.xCoords = xCoords
        this.points = points
        this.yCoords = yCoords
    }

    getCursorPosition(event) {
        let currentCursorPosition = this.mousePosition
        const { parentSize } = this

        if (this.touchDevice && event.touches && event.touches.length) {
            currentCursorPosition = {
                // x position relative to parent
                x: event.touches[0].clientX - parentSize.x,
                y: event.touches[0].clientY,
            }
        } else {
            currentCursorPosition = {
                x: event.clientX - parentSize.x,
                y: event.clientY,
            }
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
