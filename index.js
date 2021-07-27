const parser = require('@babel/parser');
const traverse = require('@babel/traverse');
const generate = require('@babel/generator');
const template = require('@babel/template');
const types = require('@babel/types');

var my_id = 0;
function getId() {
    return `t${my_id++}`;
}

var path = process.argv[2];

const fs = require('fs');
var program = fs.readFileSync(path, 'utf-8');

var ast = parser.parse(program);

traverse.default(ast, {
    enter(path) {
        if (path.mySkip) {
            path.mySkip = false;
            console.log('enter: skipped');
            path.shouldSkip = true;
            return;
        }
        switch(path.node.type) {
            case 'FunctionDeclaration': {
                console.log('func enter');
                path.node.id.noVallogize = true;
                // 仮引数には識別子のみ現れると仮定
                path.get('params').forEach(p => p.mySkip = true);
                return;
            }
            case 'ArrowFunctionExpression': {
                path.get('params').forEach(p => p.mySkip = true);
                return;
            }
            case 'BinaryExpression': {
                console.log(`binexp enter(${path.node.operator})`);
                path.node.left.getValMode = true;
                path.node.right.getValMode = true;
                return;
            }
            case 'Identifier': {
                console.log(`id enter(${path.node.name})`);
                return;
            }
            case 'CallExpression': {
                console.log('callexp enter');
                path.node.callee.getValMode = true;
                return;
            }
            case 'ReturnStatement': {
                console.log('return enter');
                return;
            }
            case 'VariableDeclarator': {
                path.node.id.noVallogize = true;
                return;
            }
            case 'MemberExpression': {
                path.node.property.noVallogize = !path.node.computed;
                path.node.property.getValMode = true;
                path.node.object.getValMode = true;
                return;
            }
            case 'ObjectProperty': {
                path.node.key.noVallogize = true;
                return;
            }
            case 'CatchClause': {
                path.node.param.noVallogize = true;
                return;
            }
            case 'IfStatement': {
                path.node.test.getValMode = true;
                return;
            }
            case 'AssignmentExpression': {
                path.node.left.noVallogize = true;
                return;
            }
            default:
                return;
        };
    },
    exit(path) {
        if (path.mySkip) { 
            path.mySkip = false;
            console.log('exit: skipped');
            path.shouldSkip = true;
            return; 
        }
        switch(path.node.type) {
            case 'FunctionDeclaration': {
                var params = path.node.params.map(x => PassStatAst(x.name, x.loc?.start.line ?? -1, '[]'));
                params.forEach(x => {
                    path.get('body').unshiftContainer('body', x);
                    path.get('body.body.0').mySkip = true;
                });
                console.log('func exit');
                return;
            }
            case 'ArrowFunctionExpression': {
                if (path.node.body.type != 'BlockStatement') {
                    var rtrn = types.returnStatement(path.node.body);
                    var blck = types.blockStatement([rtrn]);
                    path.get('body').replaceWith(blck);
                }
                var params = path.node.params.map(x => PassStatAst(x.name, x.loc?.start.line ?? -1, '[]'));
                params.forEach(x => {
                    path.get('body').unshiftContainer('body', x);
                    path.get('body.body.0').mySkip = true;
                });
                return;
            }
            case 'BinaryExpression': {
                var id = getId();
                vallogize(path, id, [path.node.left.relId, path.node.right.relId]);
                path.node.relId = id;
                console.log(`binexp exit(${path.node.operator})`);
                return;
            }
            case 'NullLiteral':
            case 'StringLiteral':
            case 'BooleanLiteral':
            case 'NumericLiteral':
            case 'Identifier': {
                var id = getId();
                vallogize(path, id);
                path.node.relId = id;
                console.log(`id exit(${path.node.name})`);
                return;
            }
            case 'TemplateLiteral': {
                var id = getId();
                vallogize(path, id, path.node.expressions.map(e => e.relId));
                path.node.relId = id;
                return;
            }
            case 'ObjectExpression': {
                var id = getId();
                vallogize(path, id, path.node.properties.map(e => e.value.relId));
                path.node.relId = id;
                return;
            }
            case 'ArrayExpression': {
                var id = getId();
                vallogize(path, id, path.node.elements.map(e => e.relId));
                path.node.relId = id;
                return;
            }
            case 'CallExpression': {
                var id = getId();
                var rel = [path.node.callee.relId];
                path.node.arguments.forEach(a => rel.push(a.relId));
                vallogize(path, id, rel);
                path.node.relId = id;
                console.log('callexp exit');
                return;
            }
            case 'ReturnStatement': {
                console.log('return exit');
                return;
            }
            case 'MemberExpression': {
                var id = getId();
                vallogize(path, id);
                path.node.relId = id;
                return;
            }
            default:
                return;
        };
    }
});

function vallogize(path, selfId, relIds) {
    if (path.node.noVallogize) {
        path.node.noVallogize = false;
        return;
    }
    var funcName = 'pass';
    if (path.node.getValMode) {
        path.node.getValMode = false;
        funcName = 'getVal';
    }
    var line = path.node.loc.start.line;
    var relIds = (relIds ?? []).filter(k => k != undefined).map(k => types.identifier(`ref['${k}']`));
    path.replaceWith(
        types.callExpression(
            types.identifier(`${funcName}`),
            [
                path.node,
                types.numericLiteral(line),
                types.arrayExpression(relIds),
                types.stringLiteral(selfId)
            ]));
    path.mySkip = true;
}

function PassExpAst(val, line, rel) {
    return template.expression.ast(`pass(${val}, ${line}, ${rel})`);
}

function PassStatAst(val, line, rel) {
    return template.statement.ast(`pass(${val}, ${line}, ${rel});`);
}

const pathToWrite = `${path}.vallog.js`;
var pre = fs.readFileSync('vallog_core/vallog-core-pre.js', 'utf-8');
var post = fs.readFileSync('vallog_core/vallog-core-post.js', 'utf-8');
fs.writeFileSync(pathToWrite, pre);
fs.appendFileSync(pathToWrite, generate.default(ast).code);
fs.appendFileSync(pathToWrite, post);
