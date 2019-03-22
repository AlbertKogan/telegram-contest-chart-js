import {
    SET_VISIBLE_BOUNDS,
    TOGGLE_ACTIVE_CHART,
    TOGGLE_NIGHT_MODE,
    TOGGLE_MOOVING_STATE,
} from './actions'

export default {
    [SET_VISIBLE_BOUNDS](state, payload) {
        state.ui.visibleBounds = payload

        return state
    },

    [TOGGLE_ACTIVE_CHART](_state, payload) {
        const { id, state } = payload

        _state.ui.activeCharts[id] = state

        return _state
    },

    [TOGGLE_NIGHT_MODE](state, payload) {
        const { nightMode } = payload

        state.ui.nightMode = nightMode

        return state
    },

    [TOGGLE_MOOVING_STATE](state, payload) {
        const { isMooving } = payload

        state.ui.isMooving = isMooving

        return state
    },
}
