import Base from '../common/base';
import { LINE_CHART_LAYER, X_AXIS_LAYER, LINES_LAYER, HOVERABLE_LAYER, TOOLTIP_LAYER } from './constants';
import { throttle, convertToXAxisCoords } from '../common/utils';

import commonStyles from './../style.scss';

class LineChart extends Base {
    _rawData = {}
    _visibleBounds = { fromIndex: 0, toIndex: 0 }
    _animationID
    _activeIndex = -1
    _mousePosition = {}
    _hoverThreshold = 10
    _opacity = 0;

    constructor({ width, height, data, store }) {
        super();
        const self = this;

        self.width = width;
        self.height = height;
        self._rawData = data;
        self.store = store;

        const chartLayer = self.createLayer({ layerID: LINE_CHART_LAYER });
        const xAxisLayer = self.createLayer({ layerID: X_AXIS_LAYER });
        const backLayer = self.createLayer({ layerID: LINES_LAYER });
        const hoverableLayer = self.createLayer({ layerID: HOVERABLE_LAYER });
        const tooltipLayer = self.createLayer({ layerID: TOOLTIP_LAYER });

        chartLayer.width = width;
        chartLayer.height = height;
        chartLayer.classList.add(commonStyles.layer);

        xAxisLayer.width = width;
        xAxisLayer.height = height;
        xAxisLayer.classList.add(commonStyles.layer);

        backLayer.width = width;
        backLayer.height = height;
        backLayer.classList.add(commonStyles.layer);

        hoverableLayer.width = width;
        hoverableLayer.height = height;
        hoverableLayer.classList.add(commonStyles.layer);

        tooltipLayer.width = width;
        tooltipLayer.height = height;
        tooltipLayer.classList.add(commonStyles.layer);

        // Default state
        self._visibleBounds = store.state.ui.visibleBounds;
        self._activeCharts = store.state.ui.activeCharts;

        self._xCoordsAll = convertToXAxisCoords({ layerWidth: self.width, data: self._rawData.x });

        this.setAverageLabelWidth();
        self.recalculate({ showFullRange: false });
        self.drawScene();

        self.withHandler({ layerID: TOOLTIP_LAYER, handlerType: 'mousemove', handler: self.throttledMosueMove.bind(self) });
        self.withHandler({ layerID: TOOLTIP_LAYER, handlerType: 'mouseout', handler: self.hideTooltip.bind(self) });
        store.events.subscribe({ 
            eventName: 'stateChange', 
            callback: () => {
                self._visibleBounds = store.state.ui.visibleBounds;
                self._activeCharts = store.state.ui.activeCharts;

                self.recalculate({ showFullRange: false });
                self.drawScene();
            }
        });
    }

    hideTooltip () {
        this.clearContext({ layerID: HOVERABLE_LAYER });
        this.clearContext({ layerID: TOOLTIP_LAYER });
    }

    dateLabel ({ UNIXDate, additionalOtions = {} }) {
        const date = new Date(UNIXDate);

        return date.toLocaleDateString('en-US', {
            month: 'short', 
            day: 'numeric',
            ...additionalOtions
        });
    }

    get visibleBounds () {
        return this._visibleBounds;
    }

    get rawData () {
        return this._rawData;
    }

    drawScene () {
        this.clearScene();
        this.drawChart({ layerID: LINE_CHART_LAYER, points: this.points, colors: this._rawData.colors });
        this.drawXAxis();
        this.drawLines();
    }

    drawXAxis () {
        const { height, width } = this;
        const xAxisLayer = this.getLayerContext({ layerID: X_AXIS_LAYER });
        this.clearContext({ layerID: X_AXIS_LAYER });

        xAxisLayer.fillStyle = "#c82124";
        xAxisLayer.beginPath();
        xAxisLayer.moveTo(0, height - 50);
        xAxisLayer.lineTo(width, height - 50);
        xAxisLayer.stroke();
        xAxisLayer.fill();
        xAxisLayer.closePath();

        xAxisLayer.beginPath();
        this.drawXAxisTicks();
        xAxisLayer.closePath();
    }

    setAverageLabelWidth () {
        const xAxisLayer = this.getLayerContext({ layerID: X_AXIS_LAYER });
        const { _rawData, dateLabel } = this;

        const averageLabelWidth = _rawData.x.reduce((acc, x, index) => {
            const label = dateLabel({ UNIXDate: _rawData.x[index] });
            const textSize = xAxisLayer.measureText(label);
            return acc + textSize.width;
        }, 0) / _rawData.x.length;

        this._averageLabelWdth = Math.round(averageLabelWidth);
    }

    drawXAxisTicks () {
        const { height, width, xCoords, _rawData, dateLabel, _averageLabelWdth, visibleBounds } = this;
        const xAxisLayer = this.getLayerContext({ layerID: X_AXIS_LAYER });

        xAxisLayer.font = '15px Helvetica';
        xAxisLayer.fillStyle = "black";

        // Visible count of labels
        const maxPeraxis = Math.round(width / (_averageLabelWdth + 40));

        // Step shoukd be dynamic according to visible window size
        let step = Math.round(xCoords.length / maxPeraxis);

        // Visible part
        const sliced = _rawData.x.slice(visibleBounds.fromIndex, visibleBounds.toIndex);
        // --- Upper everithing OK -------

        for (let _x = 0; _x <= xCoords.length; _x += step) {
            const label = dateLabel({UNIXDate: sliced[_x]});
            xAxisLayer.fillText(
                label, 
                xCoords[_x], 
                height - 15
            );
        }
    }

    drawLines () {
        const { height, width } = this;
        const linesLayer = this.getLayerContext({ layerID: LINES_LAYER });

        let h = height - 50;

        this.clearContext({ layerID: LINES_LAYER });

        linesLayer.fillStyle = "#c82124";

        linesLayer.beginPath();
        while (h >= 0) {
            h -= 100;
            linesLayer.moveTo(0, h);
            linesLayer.lineTo(width, h);
        }
        linesLayer.stroke();
        linesLayer.fill();
        linesLayer.closePath();
    }

    get throttledMosueMove () {
        return throttle(10, this.onMouseMove.bind(this));
    }

    onMouseMove (event) {
        const currentMousePosition = { x: event.clientX, y: event.clientY };
        const { xCoords, _hoverThreshold } = this;

        this._mousePosition = currentMousePosition;
        this._activeIndex = xCoords.findIndex((x) => {
            if (currentMousePosition.x >= (x - _hoverThreshold) && (currentMousePosition.x <= x + _hoverThreshold)) {
                return true;
            }
            return false;
        });

        // if (this._animationID) {
        //     window.cancelAnimationFrame(this.animationID);
        // } else {
        //     this._animationID = window.requestAnimationFrame(this.drawOnHover.bind(this));
        // }

        this._animationID = window.requestAnimationFrame(this.drawOnHover.bind(this));

    }

    drawOnHover () {
        const { _activeIndex, xCoords, height, _rawData, points } = this;
        const hoverableLayerContext = this.getLayerContext({ layerID: HOVERABLE_LAYER });
        const colors = _rawData.colors;

        this.clearContext({ layerID: HOVERABLE_LAYER });

        if (_activeIndex > -1) {
            let x = xCoords[_activeIndex];

            hoverableLayerContext.fillStyle = "white";
            hoverableLayerContext.strokeStyle = "#000";
            hoverableLayerContext.beginPath();
            hoverableLayerContext.moveTo(x, 0);
            hoverableLayerContext.lineTo(x, height);
            hoverableLayerContext.stroke();
            hoverableLayerContext.closePath();

            for (let point in points) {
                let y = points[point][_activeIndex].y;
                hoverableLayerContext.strokeStyle = colors[point];

                hoverableLayerContext.beginPath();
                hoverableLayerContext.arc(x, y, 5, 0, 2 * Math.PI);
                hoverableLayerContext.stroke();
                hoverableLayerContext.fill();
                hoverableLayerContext.closePath();
            }
        }

        this.drawTooltip();
    }

    drawTooltip () {
        const tooltipLayerContext = this.getLayerContext({ layerID: TOOLTIP_LAYER });
        const { _activeIndex, xCoords, _rawData, dateLabel, width } = this;

        var cornerRadius = { upperLeft: 10, upperRight: 10, lowerLeft: 10, lowerRight: 10 };
        // TODO: add dynamic width, height
        const tooltipWidth = 200;
        const height = 150;
        let x = xCoords[_activeIndex] + 20;
        let y = 20;

        this.clearContext({ layerID: TOOLTIP_LAYER });

        if (_activeIndex > -1) {
            const date = dateLabel({ UNIXDate: _rawData.x[_activeIndex], additionalOtions: { weekday: 'short' } });

            // Check boundaries
            if (x + tooltipWidth > width) {
                console.log('right');
                x -= tooltipWidth + 40;
            }

            tooltipLayerContext.beginPath();
            // tooltipLayerContext.shadowBlur = 6;
            // tooltipLayerContext.shadowOffsetY = 2;
            // tooltipLayerContext.shadowColor = "#969696";
            tooltipLayerContext.moveTo(x + cornerRadius.upperLeft, y);
            tooltipLayerContext.lineTo(x + tooltipWidth - cornerRadius.upperRight, y);
            tooltipLayerContext.quadraticCurveTo(x + tooltipWidth, y, x + tooltipWidth, y + cornerRadius.upperRight);
            tooltipLayerContext.lineTo(x + tooltipWidth, y + height - cornerRadius.lowerRight);
            tooltipLayerContext.quadraticCurveTo(x + tooltipWidth, y + height, x + tooltipWidth - cornerRadius.lowerRight, y + height);
            tooltipLayerContext.lineTo(x + cornerRadius.lowerLeft, y + height);
            tooltipLayerContext.quadraticCurveTo(x, y + height, x, y + height - cornerRadius.lowerLeft);
            tooltipLayerContext.lineTo(x, y + cornerRadius.upperLeft);
            tooltipLayerContext.quadraticCurveTo(x, y, x + cornerRadius.upperLeft, y);
            tooltipLayerContext.fillStyle = "white";
            tooltipLayerContext.strokeStyle = "#969696";
            tooltipLayerContext.fill();
            tooltipLayerContext.stroke();
            tooltipLayerContext.closePath();
   
            // TODO: move it to separate handler
            tooltipLayerContext.font = '15px Helvetica';
            tooltipLayerContext.fillStyle = "black";
            tooltipLayerContext.fillText(
                date, 
                x + 25,
                y + 25
            );
            tooltipLayerContext.save();

            tooltipLayerContext.fillStyle = _rawData.colors['y0'];
            tooltipLayerContext.fillText(
                _rawData.columns['y0'][_activeIndex], 
                x + 25,
                y + 55
            );
            tooltipLayerContext.save();


            tooltipLayerContext.fillStyle = _rawData.colors['y1'];
            tooltipLayerContext.fillText(
                _rawData.columns['y1'][_activeIndex], 
                x + 60,
                y + 55
            );
            tooltipLayerContext.save();
        }
    }
}

export default LineChart;
