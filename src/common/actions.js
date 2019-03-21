export const SET_VISIBLE_BOUNDS = 'SET_VISIBLE_BOUNDS'
export const TOGGLE_ACTIVE_CHART = 'TOGGLE_ACTIVE_CHART'

export default {
    [SET_VISIBLE_BOUNDS](context, payload) {
        context.commit(SET_VISIBLE_BOUNDS, payload)
    },

    [TOGGLE_ACTIVE_CHART](context, payload) {
        context.commit(TOGGLE_ACTIVE_CHART, payload)
    },
}
