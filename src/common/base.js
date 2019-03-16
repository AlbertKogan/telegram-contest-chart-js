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

        const context = layer.getContext('2d');
        context.scale(2,2);
        this.contexts = {
            ...this.contexts,
            [layerID]: context
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

    drawChart ({ layerID, points, colors }) {
        const chartContext = this.getLayerContext({ layerID });
        const {width, height} = this;

        chartContext.clearRect(0, 0, width, height);
        
        for (let line in points) {
            chartContext.beginPath();
            chartContext.strokeStyle = colors[line];
            for (let i = 0; i < points[line].length - 1; i++) {
                let p1 = points[line][i];
                let p2 = points[line][i+1];
                
                chartContext.moveTo(p1.x, p1.y);
                chartContext.lineTo(p2.x, p2.y);
            }
            chartContext.stroke();
            chartContext.closePath();
        }
    }
}

export default Base;
