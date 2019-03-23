import styles from './style.scss'
import commonStyles from './../../style.scss'
import { TOGGLE_NIGHT_MODE } from '../../common/actions'

class ModeLink {
    nightMode = false

    constructor({ store, wrapper }) {
        const self = this
        const label = document.createElement('div')

        self.modeLinkWrapper = document.createElement('div')
        self.modeLinkWrapper.classList.add(styles.modeLinkWrapper)
        self.modeLinkWrapper.classList.add(commonStyles.modeLinkWrapper)
        label.classList.add(styles.modeLink)
        label.classList.add(commonStyles.modeLink)
        label.innerHTML = self.modeText
        self.modeLinkWrapper.appendChild(label)

        self.modeLinkWrapper.addEventListener('click', () => {
            wrapper.classList.toggle(commonStyles.nightMode)
            self.nightMode = !self.nightMode
            label.innerHTML = self.modeText

            store.dispatch({
                actionKey: TOGGLE_NIGHT_MODE,
                meta: { id: 'ALL' },
                payload: {
                    nightMode: self.nightMode,
                },
            })
        })
    }

    get mode() {
        return this.nightMode ? 'Day' : 'Night'
    }

    get modeText() {
        return `Switch to ${this.mode} Mode`
    }
}

export default ModeLink
