import data from './assets/chart_data.json';
import styles from './style.scss'

import Preview from './preview/preview';
import LineChart from './line-chart/line-chart';

import { 
    WINDOW_LAYER,
    BASE_LAYER
} from './preview/constants';

import { LINE_CHART_LAYER, X_AXIS_LAYER, LINES_LAYER, HOVERABLE_LAYER, TOOLTIP_LAYER } from './line-chart/constants';
import Store from './common/store';
import actions from './common/actions';
import mutations from './common/mutations';

const processData = (data) =>
    data.map((item) => {
        const { x, ...columns } = item.columns.reduce((acc, current) => ({
            ...acc,
            [current[0]]: current.slice(1)
        }), {});

        return {
            ...item,
            x,
            columns
        };
    });

const INITIAL_STATE = {
    ui: {
        mode: 'light',
        visibleBounds: {}
    },
    orm: {
        _rawData: data,
        data: processData(data)
    }
};

const store = new Store({
    actions, 
    mutations, 
    state: INITIAL_STATE
});

window.chartStore = store;

const chartWrapper = document.getElementById('chartWrapper');
const previewWrapper = document.createElement('div');
const lineChartWrapper = document.createElement('div');

const _data = processData(data);

const preview = new Preview({ width: 500, height: 100, store, data: _data[0] });
const lineChart = new LineChart({ width: 500, height: 500, store, data: _data[0] });

previewWrapper.classList.add(styles.previewWrapper);
lineChartWrapper.classList.add(styles.chartWrapper);

lineChartWrapper.appendChild(lineChart.getLayer({ layerID: X_AXIS_LAYER }));
lineChartWrapper.appendChild(lineChart.getLayer({ layerID: LINES_LAYER }));
lineChartWrapper.appendChild(lineChart.getLayer({ layerID: LINE_CHART_LAYER }));
lineChartWrapper.appendChild(lineChart.getLayer({ layerID: HOVERABLE_LAYER }));
lineChartWrapper.appendChild(lineChart.getLayer({ layerID: TOOLTIP_LAYER }));

previewWrapper.appendChild(preview.getLayer({ layerID: BASE_LAYER }));
previewWrapper.appendChild(preview.getLayer({ layerID: WINDOW_LAYER }));

chartWrapper.appendChild(lineChartWrapper);
chartWrapper.appendChild(previewWrapper);

