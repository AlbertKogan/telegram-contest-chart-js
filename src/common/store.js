import PubSub from './pub-sub'

export default class Store {
    actions = {}
    mutations = {}

    /**
     * @param {object} actions
     * @param {object} mutations
     * @param {object} state
     * @memberof Store
     */
    constructor({ actions = {}, mutations = {}, state = {} }) {
        this.events = new PubSub()
        this.actions = actions
        this.mutations = mutations
        this.state = state
    }

    /**
     * A dispatcher for actions that looks in the actions
     * collection and runs the action if it can find it
     *
     * @param {string} actionKey
     * @param {mixed} payload
     * @returns {boolean}
     * @memberof Store
     */
    dispatch({ actionKey, payload, meta }) {
        const self = this
        const handler = self.actions[actionKey]

        if (!handler) {
            return false
        }
        return handler(self, { payload, meta })
    }

    /**
     * @param {string} mutationKey
     * @param {mixed} payload
     * @returns {boolean}
     * @memberof Store
     */
    commit(mutationKey, { payload, meta }) {
        const self = this
        const mutation = self.mutations[mutationKey]

        if (!mutation) {
            return false
        }

        const newState = Object.assign(
            self.state,
            mutation(self.state, { payload, meta })
        )

        self.events.publish({ eventName: 'stateChange', data: newState, meta })
        return newState
    }
}
