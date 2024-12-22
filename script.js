const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let segments = [];
let clipWindow = [];
let clippedSegments = [];

const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
let scale = 1;
let offsetX = 0;
let offsetY = 0;

function drawGrid() {
    const gridSpacing = 100;
    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 1;

    for (let x = offsetX % (gridSpacing * scale); x < canvas.width; x += gridSpacing * scale) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = offsetY % (gridSpacing * scale); y < canvas.height; y += gridSpacing * scale) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    ctx.strokeStyle = "#bbb";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX + offsetX, 0);
    ctx.lineTo(centerX + offsetX, canvas.height);
    ctx.moveTo(0, centerY + offsetY);
    ctx.lineTo(canvas.width, centerY + offsetY);
    ctx.stroke();
}

function transformCoordinates(x, y) {
    return {
        x: centerX + x * scale + offsetX,
        y: centerY - y * scale + offsetY
    };
}

function drawScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();

    if (clipWindow.length === 4) {
        const { x: x1, y: y1 } = transformCoordinates(clipWindow[0], clipWindow[1]);
        const { x: x2, y: y2 } = transformCoordinates(clipWindow[2], clipWindow[3]);
        ctx.strokeStyle = '#0078d7';
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    }

    segments.forEach(segment => {
        const { x: x1, y: y1 } = transformCoordinates(segment[0], segment[1]);
        const { x: x2, y: y2 } = transformCoordinates(segment[2], segment[3]);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    });

    clippedSegments.forEach(segment => {
        const { x: x1, y: y1 } = transformCoordinates(segment[0], segment[1]);
        const { x: x2, y: y2 } = transformCoordinates(segment[2], segment[3]);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    });
}

function parseInput(input) {
    const lines = input.trim().split('\n');
    if (lines.length < 2) {
        throw new Error("Некорректный ввод. Убедитесь, что данные включают количество отрезков и координаты окна.");
    }

    const n = parseInt(lines[0]);
    if (isNaN(n) || n <= 0) {
        throw new Error("Некорректное количество отрезков. Убедитесь, что первая строка содержит положительное число.");
    }

    if (lines.length < n + 2) {
        throw new Error("Некорректный ввод. Недостаточно строк для указания всех отрезков и окна отсечения.");
    }

    segments = [];
    for (let i = 1; i <= n; i++) {
        const coords = lines[i].split(' ').map(Number);
        if (coords.length !== 4 || coords.some(isNaN)) {
            throw new Error(`Некорректные координаты в строке ${i + 1}. Убедитесь, что указаны 4 числа.`);
        }
        segments.push(coords);
    }

    const clipCoords = lines[n + 1].split(' ').map(Number);
    if (clipCoords.length !== 4 || clipCoords.some(isNaN)) {
        throw new Error("Некорректные координаты окна отсечения. Убедитесь, что указаны 4 числа.");
    }
    clipWindow = clipCoords;
}

function runAlgorithm() {
    try {
        const input = document.getElementById('input').value;
        parseInput(input);
        clippedSegments = segments.map(segment => sutherlandCohen(segment, clipWindow)).filter(Boolean);
        drawScene();
    } catch (error) {
        alert(error.message);
    }
}

function sutherlandCohen(segment, clip) {
    const [xmin, ymin, xmax, ymax] = clip;
    let [x1, y1, x2, y2] = segment;

    let outcode1 = computeOutcode(x1, y1, xmin, ymin, xmax, ymax);
    let outcode2 = computeOutcode(x2, y2, xmin, ymin, xmax, ymax);

    while (true) {
        if ((outcode1 | outcode2) === 0) {
            return [x1, y1, x2, y2];
        } else if ((outcode1 & outcode2) !== 0) {
            return null;
        } else {
            const outcodeOut = outcode1 || outcode2;
            let x, y;

            if (outcodeOut & 8) {
                x = x1 + (x2 - x1) * (ymax - y1) / (y2 - y1);
                y = ymax;
            } else if (outcodeOut & 4) {
                x = x1 + (x2 - x1) * (ymin - y1) / (y2 - y1);
                y = ymin;
            } else if (outcodeOut & 2) {
                y = y1 + (y2 - y1) * (xmax - x1) / (x2 - x1);
                x = xmax;
            } else {
                y = y1 + (y2 - y1) * (xmin - x1) / (x2 - x1);
                x = xmin;
            }

            if (outcodeOut === outcode1) {
                x1 = x;
                y1 = y;
                outcode1 = computeOutcode(x1, y1, xmin, ymin, xmax, ymax);
            } else {
                x2 = x;
                y2 = y;
                outcode2 = computeOutcode(x2, y2, xmin, ymin, xmax, ymax);
            }
        }
    }
}

function computeOutcode(x, y, xmin, ymin, xmax, ymax) {
    let code = 0;
    if (x < xmin) code |= 1;
    if (x > xmax) code |= 2;
    if (y < ymin) code |= 4;
    if (y > ymax) code |= 8;
    return code;
}


document.getElementById('zoom').addEventListener('input', function () {
    scale = parseFloat(this.value);
    document.getElementById('zoom-value').textContent = `${scale}x`;
    drawScene();
});

let isDragging = false;
let startX = 0;
let startY = 0;

canvas.addEventListener('mousedown', e => {
    isDragging = true;
    startX = e.offsetX - offsetX;
    startY = e.offsetY - offsetY;
});

canvas.addEventListener('mousemove', e => {
    if (isDragging) {
        offsetX = e.offsetX - startX;
        offsetY = e.offsetY - startY;
        drawScene();
    }
});

canvas.addEventListener('mouseup', () => (isDragging = false));

drawScene();