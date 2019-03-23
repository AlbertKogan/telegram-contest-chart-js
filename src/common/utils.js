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

export const convertToXAxisCoords = ({ layerWidth, data, scale, offset }) => {
    // 0 .. base
    // minValue ... maxValue
    const maxValue = data[data.length - 1]
    const minValue = data[0]
    const base = (scale * layerWidth) / (maxValue - minValue)

    const result = data.reduce(
        (acc, current, index) => {
            let result

            if (!data[index + 1]) {
                result = acc[index] + base * (current - data[index -1])
            } else {
                result = acc[index] + base * (data[index + 1] - current)
            }

            // Viva la JS, hehe
            return [...acc, Math.floor(result * 100) / 100]
        },
        [-offset * scale]
    )

    return result
}

export const createYAxisCoords = ({ chartHeight }) => {
    const lineStep = (chartHeight / 8);

    let h = chartHeight
    let acc = []
    
    while (h >= 0) {
        acc.push(Math.floor(h * 100) / 100)
        h -= lineStep
    }

    return acc;
}

export const converToPoints = ({ xCoords, layerHeight, maxValue, data }) =>
    data.reduce(
        (acc, current, index) => [
            ...acc,
            {
                x: xCoords[index],
                y: Math.floor(6 + (layerHeight - current * (layerHeight / maxValue))),
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

export const processData = data =>
    data.map(item => {
        const { x, ...columns } = item.columns.reduce(
            (acc, current) => ({
                ...acc,
                [current[0]]: current.slice(1),
            }),
            {}
        )

        return {
            ...item,
            x,
            columns,
        }
    })

export const abbreviateNumber = (value) => {
    // check if number
    if (isNaN(value)) {
        return value;
    }

    const suffixes = ['', 'K', 'M', 'B', 'T']

    let newValue = value
    let suffixNum = 0

    while (newValue >= 1000) {
        newValue /= 1000
        suffixNum++
    }

    return `${newValue.toPrecision(3)} ${suffixes[suffixNum]}` 
}

export const outQuart = n => 1 - --n * n * n * n
