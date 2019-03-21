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

        console.log(state);
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
    dispatch({ actionKey, payload }) {
        const self = this
        const handler = self.actions[actionKey]

        if (!handler) {
            console.error(`Action "${actionKey} doesn't exist.`)
            return false
        }
        console.log(`ACTION: ${actionKey}`)
        return handler(self, payload)
    }

    /**
     * @param {string} mutationKey
     * @param {mixed} payload
     * @returns {boolean}
     * @memberof Store
     */
    commit(mutationKey, payload) {
        const self = this
        const mutation = self.mutations[mutationKey]

        if (!mutation) {
            console.log(`Mutation "${mutationKey}" doesn't exist`)
            return false
        }

        const newState = Object.assign(
            self.state,
            mutation(self.state, payload)
        )

        self.events.publish({ eventName: 'stateChange', data: newState })
        return newState
    }
}
