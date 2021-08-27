const generateImage = require('../visualizer');
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
    var time = rel.map(x => x.line.length - 1);
    // vallog構造体について
    // lineは配列
    // relは配列の配列で、rel.length == line.length
    // timeは配列の配列で、time.length == rel.length == time.length
    // vallogはフラグ（常にtrue）
    // colorは色（文字列）の配列
    // predは述語の配列
    var val = {id: getId(), val: obj, line: [line], rel: [relId], time: [time], vallog: true, color: color, pred: pred};
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
    if (!isStrict &&
        obj.line[obj.line.length - 1] == line &&
        relEq(obj.rel[obj.rel.length - 1], rel.map(x => x.id))) {
        return obj.val;
    }
    obj.line.push(line);
    obj.rel.push(tmp.map(x => x.id));
    obj.time.push(tmp.map(x => x.line.length - 1));
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
    if (!isStrict &&
        obj.line[obj.line.length - 1] == line &&
        relEq(obj.rel[obj.rel.length - 1], rel.map(x => x.id))) {
        return obj;
    }
    obj.line.push(line);
    obj.rel.push(tmp.map(x => x.id));
    obj.time.push(tmp.map(x => x.line.length - 1));
    return obj;
}

function relEq(r1, r2) {
    if (r1.length != r2.length) {
        return false;
    }
    // 空の配列のときも同じとみなす
    if (r1.length == 0) {
        return true;
    }
    return r1.every(r => r2.includes(r));
}

function printVals(vals) {
    console.log(require('util').inspect(vals, {colors: true, depth: null}));
}

// Tool--------------------------------------------------------------------------------

function lineEq(l1, l2) {
    if (l1.length != l2.length) {
        return false;
    }
    for (var i = 0; i < l1.length; ++i) {
        if (l1[i] != l2[i]) {
            return false;
        }
    }
    return true;
}

function lineVariation(vals) {
    var ans = [];
    vals.forEach(v => {
        var line = v.line;
        var res = ans.find(a => lineEq(a.line, line));
        if (res === undefined) {
            ans.push({line: line, count: 1});
        }
        else {
            res.count++;
        }
    });
    return ans;
}

function valueVariation(vals) {
    var ans = [];
    vals.forEach(v => {
        var value = v.val;
        var res = ans.find(a => a.value === value);
        if (res === undefined) {
            ans.push({value: value, count: 1});
        }
        else {
            res.count++;
        }
    });
    return ans;
}

function typeVariation(vals) {
    var ans = [];
    vals.forEach(v => {
        var type = typeof(v.val);
        var res = ans.find(a => a.type === type);
        if (res === undefined) {
            ans.push({type: type, count: 1});
        }
        else {
            res.count++;
        }
    });
    return ans;
}

function genOf(vs) {
    var gens = [...new Set(vs.map(v => v.rel[0]).flat())];
    return vals.filter(v => gens.includes(v.id));
}

function genOfRec(vs) {
    if (vs.length == 0) {
        return [];
    }
    var gen = genOf(vs);
    var ans = [];
    [
        ...gen.filter(v => v.rel[0].length == 0),
        ...genOfRec(gen.filter(v => v.rel[0].length != 0)) 
    ].forEach(v => {
        if (!ans.includes(v)) {
            ans.push(v);
        }
    });
    return ans;
}

function genLine(vs) {
    if (vs.length == 0) {
        return [];
    }
    var rels = genOf(vs);
    return [...vs, ...genLine(rels)];
}

function lineReason(val, time) {
    var rs = val.rel[time];
    var ts = val.time[time]; 
    if (rs.length == 0) {
        return [val];
    }
    var vs = [];
    for (var i = 0; i < rs.length; ++i) {
        vs.push(lineReason(vals.find(v => v.id == rs[i]), ts[i]));
    }
    vs = [...new Set(vs.flat())];
    return [val, ...vs];
}

function diff(from, of) {
    return from.filter(v => !of.includes(v));
}

// Reader-------------------------------------------------------------------------

const reader = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

async function readline() {
    return new Promise(res => reader.once('line', res));
}

// ↓ main---------------------------------------------------------------------
