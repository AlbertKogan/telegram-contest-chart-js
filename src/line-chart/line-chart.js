import Base from '../common/base';
import { LINE_CHART_LAYER, X_AXIS_LAYER, LINES_LAYER } from './constants';
import { maxInDataSet, converDataSetToPoints, convertToXAxisCoords } from '../common/utils';
import commonStyles from './../style.scss';

class LineChart extends Base {
    _rawData = {}
    _visibleBounds = { fromIndex: 0, toIndex: 0 }

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

        chartLayer.width = width;
        chartLayer.height = height;
        chartLayer.classList.add(commonStyles.layer);

        xAxisLayer.width = width;
        xAxisLayer.height = height;
        xAxisLayer.classList.add(commonStyles.layer);

        backLayer.width = width;
        backLayer.height = height;
        backLayer.classList.add(commonStyles.layer);

        self.recalculate();
        self.drawScene();

        store.events.subscribe({ 
            eventName: 'stateChange', 
            callback: () => {
                self._visibleBounds = store.state.ui.visibleBounds;
                self.recalculate();
                self.drawScene();
            }
        });
    }

    dateLabel (UNIXDate) {
        const date = new Date(UNIXDate);

        return date.toLocaleDateString();
    }

    recalculate () {
        const { fromIndex, toIndex } = this.visibleBounds;
        const { columns, x } = this.rawData;
        let newDataSet = { ...columns };
        let newXAxisData = [...x];

        if (toIndex) {
            newXAxisData = x.slice(fromIndex, toIndex);
            for (let column in columns) {
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

        this.drawXAxisTicks();

        xAxisLayer.stroke();
        xAxisLayer.fill();
        xAxisLayer.closePath();
    }

    drawXAxisTicks () {
        // TODO: add sifter
        const { height, xCoords, _rawData, dateLabel } = this;
        const xAxisLayer = this.getLayerContext({ layerID: X_AXIS_LAYER });

        xAxisLayer.font = '15px Helvetica';
        xAxisLayer.fillStyle = "black";
        xCoords.map((x, index) => {
            const label = dateLabel(_rawData.x[index]);
            const textSize = xAxisLayer.measureText(label);
            xAxisLayer.fillText(
                label, 
                x - textSize.width / 2, 
                height - 15
            );
        });
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
}

export default LineChart;
