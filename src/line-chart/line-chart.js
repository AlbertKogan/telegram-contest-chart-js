import Base from '../common/base';
import { LINE_CHART_LAYER, X_AXIS_LAYER, LINES_LAYER } from './constants';
import { maxInDataSet, converDataSetToPoints, convertToXAxisCoords } from '../common/utils';
import commonStyles from './../style.scss';

class LineChart extends Base {
    _rawData = {}

    constructor({ width, height, data, store }) {
        super();
        const self = this;

        self.width = width;
        self.height = height;
        self._rawData = data;
        self.store = store;

        self.maxInColumns = maxInDataSet({ dataSet: Object.values(data.columns) });
        self.xCoords = convertToXAxisCoords({ layerWidth: width, data: data.x });
        self.points = converDataSetToPoints({ 
            dataSet: data.columns, 
            xCoords: self.xCoords, 
            layerHeight: height, 
            maxValue: self.maxInColumns 
        });

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

        this.drawChart({ layerID: LINE_CHART_LAYER, points: self.points, colors: data.colors });
        this.drawXAxis();
        this.drawLines();

        store.events.subscribe({ 
            eventName: 'stateChange', 
            callback: () => {
                const visibleBounds = store.state.ui.visibleBounds;
                let newPoints = {} ;

                for (let item in self.points) {
                    newPoints = {
                        ...newPoints,
                        [item]: self.points[item].slice(visibleBounds.fromIndex, visibleBounds.toIndex)
                    }
                }
                this.drawChart({ layerID: LINE_CHART_LAYER, points: newPoints, colors: data.colors });

            }
        });
    }

    dateLabel (UNIXDate) {
        const date = new Date(UNIXDate);

        return date.toLocaleDateString();
    }

    drawXAxis () {
        const { height, width } = this;
        const xAxisLayer = this.getLayerContext({ layerID: X_AXIS_LAYER });

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
