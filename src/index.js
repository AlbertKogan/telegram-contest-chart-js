import data from './assets/chart_data.json';
import styles from './style.scss'

import Preview from './preview/preview';

import { 
    WINDOW_LAYER,
    BASE_LAYER
} from './preview/constants';

const chartWrapper = document.getElementById('chartWrapper');
const chart = document.createElement('canvas');
const previewWrapper = document.createElement('div');
const preview = new Preview({ width: 500, height: 200 });
const dpi = window.devicePixelRatio;

chart.setAttribute('width', chartWrapper.offsetWidth);
chart.setAttribute('height', 500);

previewWrapper.classList.add(styles.previewWrapper);

const points = [
    { x: 0, y: 0 },
    { x: 50, y: 100 },
    { x: 100, y: 300 },
    { x: 150, y: 20 },
    { x: 200, y: 50 }
];

function drawLineWithDots ({ points, ctx }) {
    ctx.fillStyle = "#c82124";

    ctx.beginPath();
    for (let i = 0; i < points.length - 1; i++) {
      let p1 = points[i];
      let p2 = points[i+1];
    
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.moveTo(p2.x, p2.y);
      ctx.arc(p2.x, p2.y, 10, 0, 2 * Math.PI);
    }
    ctx.stroke();
    ctx.fill();
    ctx.closePath();
}

const ctx = chart.getContext('2d');
drawLineWithDots({ points, ctx });


previewWrapper.appendChild(preview.getLayer({ layerID: BASE_LAYER }));
previewWrapper.appendChild(preview.getLayer({ layerID: WINDOW_LAYER }));

chartWrapper.appendChild(chart);
chartWrapper.appendChild(previewWrapper);

