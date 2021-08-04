const { moduleExpression, declareClass } = require('@babel/types');

function makeArrow(from, to) {
    return { from: from, to: to };
}

function arrowEq(arw1, arw2, strict) {
    if (strict) {
        return (arw1.from == arw2.from && arw1.to == arw2.to);
    }
    return (
        (arw1.from == arw2.from && arw1.to == arw2.to) ||
        (arw1.from == arw2.to && arw1.to == arw2.from));
}

// arw1にarw2が含まれているかどうか（一致も含む）
function arrowContains(arw1, arw2) {
    return (
        Math.min(arw1.from, arw1.to) <= Math.min(arw2.from, arw2.to) &&
        Math.max(arw1.from, arw1.to) >= Math.max(arw2.from, arw2.to));
}

function arrowIntersect(arw1, arw2) {
    var arw1_min = Math.min(arw1.from, arw1.to);
    var arw1_max = Math.max(arw1.from, arw1.to);
    var arw2_min = Math.min(arw2.from, arw2.to);
    var arw2_max = Math.max(arw2.from, arw2.to);
    return (
        (arw1_min < arw2_min && arw2_min < arw1_max && arw1_max < arw2_max) ||
        (arw2_min < arw1_min && arw1_min < arw2_max && arw2_max < arw1_max));
}

function arrowSeparated(arw1, arw2) {
    return !arrowIntersect(arw1, arw2);
}

function makeRegion(x, y, w, h) {
    return { x: x, y: y, width: w, height: h };
}

function makePoint(x, y) {
    return { x: x, y: y };
}
var __id = 0;
function getId() {
    return __id++;
}

var __colors = [
    'red', 'lime', 'green', 'black', 'blue', 'orange', 'purple'
];
function getColor(id) {
    return __colors[Math.abs(id % __colors.length)];
}

function getLineWidth(count, max) {
    return 1 + count / max * 4;
}

const lineNumberBoxSize = { width: 100, height: 50 };
const arrowLevelWidth = 30;

function doWork(lines) {
    var arws = [];
    var lineMax = 0;
    lines.forEach(l => {
        // lは{line: [number], count: number}
        if (l.line.length <= 1) {
            return;
        }
        var id = getId();
        console.log(id); // for debug
        for (var i = 0; i < l.line.length - 1; ++i) {
            var arw = makeArrow(l.line[i], l.line[i+1]);
            addArrow(arw, arws, id, l.count);
        }
        l.line.forEach(i => {
            if (lineMax < i) {
                lineMax = i;
            }
        });
    });

    // arwsのindex範囲を0-indexedにする（一般的な配列に直す）
    var tmp = [];
    for(var i = 1 - arws.length; i < arws.length; ++i) {
        if (arws[i]) {
            tmp.push(arws[i]);
        }
    }
    arws = tmp;

    var levelMax = arws.length;
    var countMax = 0;
    arws.flat().forEach(a => {
        if (a.count > countMax) {
            countMax = a.count;
        }
    });

    // 描画
    const canvas = require('canvas');
    var c = canvas.createCanvas(
        lineNumberBoxSize.width + arrowLevelWidth * (levelMax + 1),
        lineNumberBoxSize.height * lineMax);console.log(`${c.width}, ${c.height}`);
    var ctx = c.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, c.width, c.height);

    // 線の描画
    //     .p2_______.p3
    // p1./           \.p4
    // from    -->     to
    for (var level = 0; level < arws.length; ++level) {
        arws[level].forEach(arw => {
            var p1 = makePoint(
                (levelMax + 1) * arrowLevelWidth,
                arw.arrow.from * lineNumberBoxSize.height - lineNumberBoxSize.height / 2
            );
            var p2, p3;
            var p4 = makePoint(
                (levelMax + 1) * arrowLevelWidth,
                arw.arrow.to * lineNumberBoxSize.height - lineNumberBoxSize.height / 2
            );
            const margin = 3;
            if (arw.arrow.from < arw.arrow.to) {
                p2 = makePoint(
                    (levelMax - level) * arrowLevelWidth,
                    arw.arrow.from * lineNumberBoxSize.height - margin
                );
                p3 = makePoint(
                    (levelMax - level) * arrowLevelWidth,
                    (arw.arrow.to - 1) * lineNumberBoxSize.height + margin
                );
            }
            else {
                p2 = makePoint(
                    (levelMax - level) * arrowLevelWidth,
                    (arw.arrow.from - 1) * lineNumberBoxSize.height + margin
                );
                p3 = makePoint(
                    (levelMax - level) * arrowLevelWidth,
                    arw.arrow.to * lineNumberBoxSize.height - margin
                );
            }

            ctx.strokeStyle = getColor(arw.id);
            ctx.lineWidth = getLineWidth(arw.count, countMax);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            //if (Math.abs(arw.arrow.from - arw.arrow.to) != 1) {
                ctx.lineTo(p2.x, p2.y);
                ctx.lineTo(p3.x, p3.y);
            //}
            ctx.lineTo(p4.x, p4.y);
            ctx.stroke();
        });
    }

    const fs = require('fs');
    const buf = c.toBuffer();
    fs.writeFileSync('test.png', buf);

    console.log(require('util').inspect(arws, {colors: true, depth: null}));
}

function makeArrowData(arw, id, count) {
    return {arrow: arw, count: count, id: id};
}

function addArrow(arw, arws, id, count) {
    var level = 0;
    var direction = null;
    while(true) {
        if (arws[level] == undefined) {
            arws[level] = [makeArrowData(arw, id, count)];
            return;
        }
        var found = arws[level].find(a => arrowEq(a.arrow, arw, true) && a.id == id);
        if (found != undefined) {
            found.count += count;
            return;
        }
        // 現在のlevelでarwを配置しようとすると他のArrowと重なってしまう場合
        if (arws[level].find(a => arrowIntersect(a.arrow, arw))) {
            if (direction == null) {
                direction = 1;
            }
            level += direction;
            continue;
        }
        // すでに配置されているArrowにarwが区間的に含まれる（または一致）場合
        if (arws[level].find(a => arrowContains(a.arrow, arw))) {
            if (direction == null) {
                direction = -1;
            }
            level += direction;
            continue;
        }
        // すでに配置されているArrowをarwが区間的に含む（または一致）場合
        if (arws[level].find(a => arrowContains(arw, a.arrow))) {
            if (direction == null) {
                direction = 1;
            }
            level += direction;
            continue;
        }
        // それ以外の場合（すでに配置されているどのArrowともarwが重ならず、区間的にも含んだり含まれたりしていない場合）
        arws[level].push(makeArrowData(arw, id, count));
        return;
    }
}

module.exports = doWork;
