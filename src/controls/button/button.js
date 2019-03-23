import styles from './style.scss'
import commonStyles from './../../style.scss'

import { TOGGLE_ACTIVE_CHART } from '../../common/actions'
import { throttle } from '../../common/utils'

class Button {
    _active = true
    _id

    constructor({ store, id, chartID }) {
        const self = this

        self._id = id
        self.store = store
        self.chartID = chartID
        self.buttonWrapper = document.createElement('div')
        self.buttonWrapper.classList.add(styles.buttonWrapper)
        self.buttonWrapper.classList.add(commonStyles.buttonWrapper)
        self.buttonWrapper.classList.add(styles.active)

        const text = document.createElement('div')

        const label = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'svg'
        )
        const circle = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'circle'
        )
        const icon = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'path'
        )

        label.classList.add(styles.buttonLabel)
        circle.classList.add(styles.buttonLabelCircle)
        icon.classList.add(styles.buttonLabelIcon)
        label.setAttribute('viewBox', '0 0 52 52')
        circle.setAttribute('cx', 26)
        circle.setAttribute('cy', 26)
        circle.setAttribute('r', 24)
        circle.setAttribute(
            'stroke',
            self.store.state.charts[self.chartID].orm.data.colors[id]
        )
        circle.setAttribute(
            'fill',
            self.store.state.charts[self.chartID].orm.data.colors[id]
        )
        icon.setAttribute('d', 'M14.1 27.2l7.1 7.2 16.7-16.8')

        label.appendChild(circle)
        label.appendChild(icon)
        text.classList.add(styles.buttonText)
        text.innerText =
            self.store.state.charts[self.chartID].orm.data.names[id]

        self.buttonWrapper.appendChild(label)
        self.buttonWrapper.appendChild(text)

        self.buttonWrapper.addEventListener(
            'click',
            self.throttledClickHandler.bind(self)
        )
    }

    clickHandler(event) {
        event.preventDefault()

        this.buttonWrapper.classList.toggle(styles.active)
        this._active = !this._active

        this.store.dispatch({
            actionKey: TOGGLE_ACTIVE_CHART,
            meta: { id: this.chartID },
            payload: {
                chartID: this.chartID,
                id: this._id,
                state: this._active,
            },
        })
    }

    // Against abusing by brut clicking
    get throttledClickHandler() {
        return throttle(500, this.clickHandler.bind(this))
    }
}

export default Button
