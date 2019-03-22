import {
    SET_VISIBLE_BOUNDS,
    TOGGLE_ACTIVE_CHART,
    TOGGLE_NIGHT_MODE,
    TOGGLE_MOOVING_STATE,
} from './actions'

export default {
    [SET_VISIBLE_BOUNDS](state, payload) {
        const { chartID, visibleBounds } = payload;
        state.charts[chartID].ui.visibleBounds = visibleBounds

        return state
    },

    [TOGGLE_ACTIVE_CHART](_state, payload) {
        const { id, state, chartID } = payload

        _state.charts[chartID].ui.activeCharts[id] = state

        return _state
    },

    [TOGGLE_NIGHT_MODE](state, payload) {
        const { nightMode } = payload

        state.nightMode = nightMode

        return state
    },

    [TOGGLE_MOOVING_STATE](state, payload) {
        const { isMooving, chartID } = payload

        state.charts[chartID].ui.isMooving = isMooving

        return state
    },
}
