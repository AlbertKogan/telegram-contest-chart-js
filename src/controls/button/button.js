import styles from './style.scss'
import { TOGGLE_ACTIVE_CHART } from '../../common/actions'

class Button {
    _active = true
    _id

    constructor({ store, id }) {
        const self = this

        self._id = id
        self.buttonWrapper = document.createElement('div')
        self.buttonWrapper.classList.add(styles.buttonWrapper)
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
        circle.setAttribute('r', 25)
        icon.setAttribute('d', 'M14.1 27.2l7.1 7.2 16.7-16.8')

        label.appendChild(circle)
        label.appendChild(icon)
        text.classList.add(styles.buttonText)
        // TODO: fixs
        text.innerText = store.state.orm.data[0].names[id]

        self.buttonWrapper.appendChild(label)
        self.buttonWrapper.appendChild(text)

        self.buttonWrapper.addEventListener('click', () => {
            self.buttonWrapper.classList.toggle(styles.active)
            self._active = !self._active

            store.dispatch({
                actionKey: TOGGLE_ACTIVE_CHART,
                payload: {
                    id: self._id,
                    state: self._active,
                },
            })
        })
    }
}

export default Button
