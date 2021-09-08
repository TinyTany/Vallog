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
function makeVallog(obj, line, rels, vars) {
    if (!Array.isArray(rels)) {
        rels = [];
    }
    var relId = rels.map(x => x.id);
    var color = rels.map(x => x.color);
    color = [...new Set(color.flat())];
    var pred = rels.map(x => x.pred);
    pred = [...new Set(pred.flat())];
    var times = rels.map(x => x.line.length - 1);
    // vallog構造体について
    // lineは配列
    // relsは配列の配列
    // timesは配列の配列
    // varsは配列の配列
    // line.length == rels.length == times.length == vars.length
    // vallogはフラグ（常にtrue）
    // colorは色（文字列）の配列
    // predは述語の配列
    var val = {id: getId(), val: obj, line: [line], rels: [relId], times: [times], vars: [vars], vallog: true, color: color, pred: pred};
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

function getVal(obj, line, rels, key, vars) {
    if (!Array.isArray(rels)) {
        rels = [];
    }
    var tmp = rels.filter(x => isVallog(x));
    if (!isVallog(obj)) {
        // if (tmp.length == 0) {
        //     return obj;
        // }
        var val = makeVallog(obj, line, tmp, vars);
        assertCheck(val, line);
        ref[key] = val;
        return val.val;
    }
    // 以下、objがvallogだった場合の処理
    assertCheck(obj, line);
    ref[key] = obj;
    if (!isStrict &&
        obj.line[obj.line.length - 1] == line &&
        arrayEq(obj.rels[obj.rels.length - 1], rels.map(x => x.id)) &&
        arrayEq(obj.vars[obj.vars.length - 1], vars)) {
        return obj.val;
    }
    obj.line.push(line);
    obj.rels.push(tmp.map(x => x.id));
    obj.times.push(tmp.map(x => x.line.length - 1));
    obj.vars.push(vars);
    return obj.val;
}

function pass(obj, line, rels, key, vars) {
    if (!Array.isArray(rels)) {
        rels = [];
    }
    var tmp = rels.filter(x => isVallog(x));
    if (!isVallog(obj)) {
        // if (tmp.length == 0) {
        //     return obj;
        // }
        var val = makeVallog(obj, line, tmp, vars);
        assertCheck(val, line);
        ref[key] = val;
        return val;
    }
    // 以下、objがvallogだった場合の処理
    assertCheck(obj, line);
    ref[key] = obj;
    if (!isStrict &&
        obj.line[obj.line.length - 1] == line &&
        arrayEq(obj.rels[obj.rels.length - 1], rels.map(x => x.id)) &&
        arrayEq(obj.vars[obj.vars.length - 1], vars)) {
        return obj;
    }
    obj.line.push(line);
    obj.rels.push(tmp.map(x => x.id));
    obj.times.push(tmp.map(x => x.line.length - 1));
    obj.vars.push(vars);
    return obj;
}

function arrayEq(arr1, arr2) {
    if (arr1.length != arr2.length) {
        return false;
    }
    // 空の配列のときも同じとみなす
    if (arr1.length == 0) {
        return true;
    }
    return arr1.every(e => arr2.includes(e));
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
    var gens = [...new Set(vs.map(v => v.rels[0]).flat())];
    return vals.filter(v => gens.includes(v.id));
}

function genOfRec(vs) {
    if (vs.length == 0) {
        return [];
    }
    var gen = genOf(vs);
    var ans = [];
    [
        ...gen.filter(v => v.rels[0].length == 0),
        ...genOfRec(gen.filter(v => v.rels[0].length != 0)) 
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

function lineReason(val, times) {
    var rs = val.rels[times];
    var ts = val.times[times]; 
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
