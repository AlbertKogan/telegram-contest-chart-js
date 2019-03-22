export const SET_VISIBLE_BOUNDS = 'SET_VISIBLE_BOUNDS'
export const TOGGLE_ACTIVE_CHART = 'TOGGLE_ACTIVE_CHART'
export const TOGGLE_NIGHT_MODE = 'TOGGLE_NIGHT_MODE'
export const TOGGLE_MOOVING_STATE = 'TOGGLE_MOOVING_STATE'

export default {
    [SET_VISIBLE_BOUNDS](context, payload) {
        context.commit(SET_VISIBLE_BOUNDS, payload)
    },

    [TOGGLE_ACTIVE_CHART](context, payload) {
        context.commit(TOGGLE_ACTIVE_CHART, payload)
    },

    [TOGGLE_NIGHT_MODE](context, payload) {
        context.commit(TOGGLE_NIGHT_MODE, payload)
    },

    [TOGGLE_MOOVING_STATE](context, payload) {
        context.commit(TOGGLE_MOOVING_STATE, payload)
    },
}
