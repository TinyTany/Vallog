
// ↑ main-----------------------------------------------------------------------------

//*
(async () => {
    var input = true;
    do {
        try {
            printVals(eval(input));
        }
        catch(e) {
            console.log(e);
        }
        process.stdout.write('> ');
    } while((input = await readline()) != '');

    process.exit();
})();
//*/
