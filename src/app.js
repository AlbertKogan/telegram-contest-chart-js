import styles from './style.scss'

import Preview from './preview/preview'
import LineChart from './line-chart/line-chart'
import Button from './controls/button/button'
import ModeLink from './controls/mode-link/link'

import { WINDOW_LAYER, BASE_LAYER } from './preview/constants'

import {
    LINE_CHART_LAYER,
    X_AXIS_LAYER,
    LINES_LAYER,
    HOVERABLE_LAYER,
    TOOLTIP_LAYER,
} from './line-chart/constants'
import Store from './common/store'
import actions from './common/actions'
import mutations from './common/mutations'
import { processData } from './common/utils'

export default class App {
    constructor({ data }) {
        const self = this

        self.data = processData(data)
        self.store = self.initializeStore({
            data: self.data,
            rawData: data,
        })
        self.appContainter = document.getElementById('app')
        self.wrapperContainer = document.getElementById('wrapper')

        // Don't want to shock browser
        self.data.map(self.throttledInit.bind(self))

        const modeLink = new ModeLink({
            store: self.store,
            wrapper: self.wrapperContainer,
        })

        // append after all graphs init
        self.appContainter.appendChild(modeLink.modeLinkWrapper)
    }

    throttledInit(chartData, index) {
        const self = this

        this.initializeChart.bind(this, {
            chartData,
            store: self.store,
            index,
            chartID: `CHART_ID_${index}`,
        })()
    }

    initializeStore({ data, rawData }) {
        const charts = data.reduce((acc, dataItem, index) => {
            const activeCharts = Object.keys(dataItem.columns).reduce(
                (acc, activeChart) => ({
                    ...acc,
                    [activeChart]: true,
                }),
                {}
            )

            return {
                ...acc,
                [`CHART_ID_${index}`]: {
                    ui: {
                        visibleBounds: {},
                        activeCharts,
                    },
                    orm: {
                        _rawData: rawData[index],
                        data: data[index],
                    },
                },
            }
        }, {})

        return new Store({
            actions,
            mutations,
            state: {
                nightMode: false,
                charts,
            },
        })
    }

    initializeChart({ chartData, store, index, chartID }) {
        const { appContainter } = this

        const chartWrapper = document.createElement('div')
        const chartTitle = document.createElement('h2')
        const previewWrapper = document.createElement('div')
        const lineChartWrapper = document.createElement('div')
        const buttonsWrapper = document.createElement('div')

        chartTitle.classList.add(styles.chartTitle)
        chartTitle.innerHTML = `Graph # ${index + 1}`
        // Append all chart layers
        appContainter.appendChild(chartWrapper)
        chartWrapper.appendChild(chartTitle)
        chartWrapper.appendChild(lineChartWrapper)
        chartWrapper.appendChild(previewWrapper)

        chartWrapper.classList.add(styles.chartContainer)
        previewWrapper.classList.add(styles.previewWrapper)
        lineChartWrapper.classList.add(styles.chartWrapper)
        buttonsWrapper.classList.add(styles.buttonsWrapper)

        const preview = new Preview({
            parent: previewWrapper,
            store,
            data: chartData,
            chartID,
        })
        const lineChart = new LineChart({
            parent: lineChartWrapper,
            store,
            data: chartData,
            chartID,
        })

        // Append chart
        lineChartWrapper.appendChild(
            lineChart.getLayer({ layerID: X_AXIS_LAYER })
        )
        lineChartWrapper.appendChild(
            lineChart.getLayer({ layerID: LINES_LAYER })
        )
        lineChartWrapper.appendChild(
            lineChart.getLayer({ layerID: LINE_CHART_LAYER })
        )
        lineChartWrapper.appendChild(
            lineChart.getLayer({ layerID: HOVERABLE_LAYER })
        )
        lineChartWrapper.appendChild(
            lineChart.getLayer({ layerID: TOOLTIP_LAYER })
        )

        // Append preview
        previewWrapper.appendChild(preview.getLayer({ layerID: BASE_LAYER }))
        previewWrapper.appendChild(preview.getLayer({ layerID: WINDOW_LAYER }))

        // Append buttons
        Object.keys(chartData.names).map(id => {
            const button = new Button({ store, id, chartID })
            buttonsWrapper.appendChild(button.buttonWrapper)

            return button
        })

        chartWrapper.appendChild(buttonsWrapper)
    }
}
