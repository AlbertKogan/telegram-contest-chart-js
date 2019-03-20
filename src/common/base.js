import { maxInDataSet, converDataSetToPoints, convertToXAxisCoords } from '../common/utils';

class Base {
    width = 0
    height = 0
    layers = {}
    contexts = {}
    touchDevice = false

    constructor () {
        this.touchDevice = 'ontouchstart' in document.documentElement;
    }

    createLayer ({ layerID }) {
        const layer = document.createElement('canvas');

        this.layers = {
            ...this.layers,
            [layerID]: layer
        }

        const context = layer.getContext('2d');
        context.scale(2,2);
        this.contexts = {
            ...this.contexts,
            [layerID]: context
        }

        return layer;
    }

    getLayerContext ({ layerID }) {
        return this.contexts[layerID];
    }

    getLayer ({ layerID }) {
        return this.layers[layerID];
    }

    setLayerSettings ({ layerID, settings }) {
        const context = this.getLayerContext({ layerID });

        if (!context || !settings) {
            return;
        }

        for (const settingName in settings) {
            context[settingName] = settings[settingName];
        }
    }

    withHandler ({ layerID, handlerType, handler }) {
        const layer = this.getLayer({ layerID });

        if (!layer) {
            return;
        }

        layer.addEventListener(handlerType, handler);
    }

    clearContext ({ layerID }) {
        const { width, height } = this;
        const context = this.getLayerContext({ layerID });
        
        context.clearRect(0, 0, width, height);
    }

    clearScene () {
        const { contexts } = this;

        for (let layerID in contexts) {
            this.clearContext({ layerID });
        }
    }

    drawChart ({ layerID, points, colors }) {
        const chartContext = this.getLayerContext({ layerID });

        this.clearContext({ layerID })

        for (let line in points) {
            chartContext.beginPath();
            chartContext.strokeStyle = colors[line];
            for (let i = 0; i < points[line].length - 1; i++) {
                let p1 = points[line][i];
                let p2 = points[line][i+1];
                
                chartContext.moveTo(p1.x, p1.y);
                chartContext.lineTo(p2.x, p2.y);
            }
            chartContext.stroke();
            chartContext.closePath();
        }
    }

    getActiveColumns ({ activeCharts, columns }) {
        let activeColumns = {};

        for (let id in activeCharts) {
            if (activeCharts[id]) {
                activeColumns[id] = columns[id];
            }
        }

        return activeColumns;
    }

    // TODO: do not call in base
    recalculate ({ showFullRange = true}) {
        const activeCharts = this._activeCharts;
        const { fromIndex, toIndex } = this._visibleBounds;
        const { columns, x } = this._rawData;

        const activeColumns = this.getActiveColumns({ activeCharts, columns });
        let newDataSet = { ...activeColumns };
        let newXAxisData = [...x];

        if (toIndex && !showFullRange) {
            newXAxisData = x.slice(fromIndex, toIndex);
            for (let column in activeColumns) {
                newDataSet[column] = columns[column].slice(fromIndex, toIndex);
            }
        }
        
        this.maxInColumns = maxInDataSet({ dataSet: Object.values(newDataSet) });
        this.xCoords = convertToXAxisCoords({ layerWidth: this.width, data: newXAxisData });
        this.points = converDataSetToPoints({ 
            dataSet: newDataSet, 
            xCoords: this.xCoords, 
            layerHeight: this.height, 
            maxValue: this.maxInColumns 
        });
    }

    getCursorPosition (event) {
        let currentCursorPosition = this.mousePosition;

        if (this.touchDevice && event.touches.length) {
            currentCursorPosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        } else {
            currentCursorPosition = { x: event.clientX, y: event.clientY };
        }

        return currentCursorPosition;
    }
}

export default Base;
