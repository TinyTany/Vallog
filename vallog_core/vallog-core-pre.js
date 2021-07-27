var vals = [];
var ref = [];
var isStrict = false;
var vallog_id = 0;
var vallog_color = 0;

// すべての値が情報を保持しているわけではない場合のコード

function getId() {
    return `${vallog_id++}_id`;
}

function getColor() {
    return `${vallog_color++}_color`;
}

function assert_hasColor(obj, color, line) {
    if (!isVallog(obj)) {
        console.error(`assert failed: line ${line}: value is not vallog value.`);
        return;
    }
    if (!obj.color.includes(color)) {
        console.error(`assert failed: line ${line}: value(${obj.id}) did not have such color(${color}).`)
        return;
    }
}

function assert_noColor(obj, color, line) {
    if (!isVallog(obj)) {
        console.error(`assert failed: line ${line}: value is not vallog value.`);
        return;
    }
    if (obj.color.includes(color)) {
        console.error(`assert failed: line ${line}: value(${obj.id}) should not have such color(${color}).`)
        return;
    }
}

// 引数relはvallogが要素の配列
function makeVallog(obj, line, rel) {
    if (!Array.isArray(rel)) {
        rel = [];
    }
    var relId = rel.map(x => x.id);
    var color = rel.map(x => x.color);
    color = [...new Set(color.flat())];
    var pred = rel.map(x => x.pred);
    pred = [...new Set(pred.flat())];
    // vallog構造体について
    // lineは配列
    // relは配列の配列で、rel.length == line.length
    // vallogはフラグ（常にtrue）
    // colorは色（文字列）の配列
    // predは述語の配列
    var val = {id: getId(), val: obj, line: [line], rel: [relId], vallog: true, color: color, pred: pred};
    vals.push(val);
    return val;
}

function isVallog(obj) {
    return obj?.vallog != undefined;
}

function assertCheck(obj, line) {
    if (obj.pred.length == 0) {
        return;
    }
    obj.pred.forEach(p => {
        var res = p(obj.val);
        if (!res) {
            console.error(`Assertion failed: value(${obj.id}) at line ${line}.`);
        }
    });
}

function getVal(obj, line, rel, key) {
    if (!Array.isArray(rel)) {
        rel = [];
    }
    var tmp = rel.filter(x => isVallog(x));
    if (!isVallog(obj)) {
        // if (tmp.length == 0) {
        //     return obj;
        // }
        var val = makeVallog(obj, line, tmp);
        assertCheck(val, line);
        ref[key] = val;
        return val.val;
    }
    // 以下、objがvallogだった場合の処理
    assertCheck(obj, line);
    ref[key] = obj;
    if (!isStrict && obj.line[obj.line.length - 1] == line) {
        return obj.val;
    }
    obj.line.push(line);
    obj.rel.push(tmp.map(x => x.id));
    return obj.val;
}

function pass(obj, line, rel, key) {
    if (!Array.isArray(rel)) {
        rel = [];
    }
    var tmp = rel.filter(x => isVallog(x));
    if (!isVallog(obj)) {
        // if (tmp.length == 0) {
        //     return obj;
        // }
        var val = makeVallog(obj, line, tmp);
        assertCheck(val, line);
        ref[key] = val;
        return val;
    }
    // 以下、objがvallogだった場合の処理
    assertCheck(obj, line);
    ref[key] = obj;
    if (!isStrict && obj.line[obj.line.length - 1] == line) {
        return obj;
    }
    obj.line.push(line);
    obj.rel.push(tmp.map(x => x.id));
    return obj;
}

function printVals(vals) {
    console.log(require('util').inspect(vals, {colors: true, depth: null}));
}

//* ---------------------------------------------------------------------------

const reader = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

async function readline() {
    return new Promise(res => reader.once('line', res));
}

// ↓ main---------------------------------------------------------------------*/
