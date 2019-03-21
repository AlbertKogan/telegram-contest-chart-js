export const throttle = function throttle(delay, fn) {
    let lastCall = 0

    return function(...args) {
        const now = new Date().getTime()

        if (now - lastCall < delay) {
            return
        }
        lastCall = now
        return fn(...args)
    }
}

// get max value from set of lists
export const maxInDataSet = ({ dataSet }) =>
    dataSet.reduce((maxValue, data) => {
        let localMaxValue = Math.max(...data)

        return localMaxValue > maxValue ? localMaxValue : maxValue
    }, 0)

export const convertToXAxisCoords = ({ layerWidth, data }) => {
    // 0 .. base
    // minValue ... maxValue
    // PRETIFY THIS (linear interpolation)
    const maxValue = data[data.length - 1]
    const minValue = data[0]
    const base = layerWidth / (maxValue - minValue)

    return data.reduce(
        (acc, current, index) => {
            let result

            if (!data[index + 1]) {
                result = base
            }

            result = acc[index] + base * (data[index + 1] - current)

            return [...acc, Math.floor(result)]
        },
        [0]
    )
}

export const converToPoints = ({ xCoords, layerHeight, maxValue, data }) =>
    data.reduce(
        (acc, current, index) => [
            ...acc,
            {
                x: xCoords[index],
                y: Math.floor(layerHeight - current * (layerHeight / maxValue)),
            },
        ],
        []
    )

export const converDataSetToPoints = ({
    dataSet,
    xCoords,
    layerHeight,
    maxValue,
}) => {
    let result = {}

    for (let dataKey in dataSet) {
        result = {
            ...result,
            [dataKey]: converToPoints({
                xCoords,
                layerHeight,
                maxValue,
                data: dataSet[dataKey],
            }),
        }
    }

    return result
}
