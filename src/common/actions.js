export const SET_VISIBLE_BOUNDS = 'SET_VISIBLE_BOUNDS';

export default {
    [SET_VISIBLE_BOUNDS] (context, payload) {
        context.commit(SET_VISIBLE_BOUNDS, payload);
    }
};