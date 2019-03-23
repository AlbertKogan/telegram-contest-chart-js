export default class PubSub {
    constructor() {
        this.events = new Map()
    }

    /**
     * @param {string} eventName
     * @param {function} callback
     * @memberof PubSub
     */
    subscribe({ eventName, callback }) {
        const events = this.events

        if (!events.has(eventName)) {
            events.set(eventName, [])
        }

        console.log(`subscribed on ${eventName}`)

        events.set(eventName, [...events.get(eventName), callback])
    }

    /**
     * @param {string} eventName
     * @param {object} [data={}]
     * @returns {array}
     * @memberof PubSub
     */
    publish({ eventName, data = {}, meta = {} }) {
        const events = this.events

        console.log(`published ${eventName}`)

        if (!events.has(eventName)) {
            return []
        }

        return events.get(eventName).map(callback => callback({ data, meta }))
    }
}
