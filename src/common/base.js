class Base {
    width = 0
    height = 0
    layers = {}
    contexts = {}

    createLayer ({ layerID }) {
        const layer = document.createElement('canvas');

        this.layers = {
            ...this.layers,
            [layerID]: layer
        }

        this.contexts = {
            ...this.contexts,
            [layerID]: layer.getContext('2d')
        }

        return layer;
    }

    getLayerContext ({ layerID }) {
        return this.contexts[layerID];
    }

    getLayer ({ layerID }) {
        return this.layers[layerID];
    }

    setLayerSettings ({ layerID, settings }) {
        const context = this.getLayerContext({ layerID });

        if (!context || !settings) {
            return;
        }

        for (const settingName in settings) {
            context[settingName] = settings[settingName];
        }
    }

    withHandler ({ layerID, handlerType, handler }) {
        const layer = this.getLayer({ layerID });

        if (!layer) {
            return;
        }

        layer.addEventListener(handlerType, handler);
    }
}

export default Base;
