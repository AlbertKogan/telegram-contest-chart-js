import { SET_VISIBLE_BOUNDS } from './actions';

export default {
    [SET_VISIBLE_BOUNDS] (state, payload) {
        state.ui.visibleBounds = payload;
        
        return state;
    }
};
