import { SET_VISIBLE_BOUNDS, TOGGLE_ACTIVE_CHART, TOGGLE_NIGHT_MODE } from './actions'

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

    [TOGGLE_NIGHT_MODE](_state, payload) {
        const { nightMode } = payload

        _state.ui.nightMode = nightMode;

        return _state
    },
}
