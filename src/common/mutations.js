import { SET_VISIBLE_BOUNDS, TOGGLE_ACTIVE_CHART } from './actions'

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
}
