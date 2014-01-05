#!/usr/bin/env node

var fs = require("fs");
var path = require("path");
var less = require("less");

function compile(file, callback) {

	var parser = new less.Parser({
        paths: [path.dirname(file)],
        filename: input
    });
    
    fs.readFile(file, "utf-8", function(err, data){
    	if (err) {
    		callback(err);
    	} else {
		    parser.parse(data, function (err, tree) {
		        if (err) {
		            callback(err);
		        } else {
		            try {
		                var css = tree.toCSS({ compress: true });
		                callback(null, css);
		            } catch (ex) {
		            	callback(ex);
		            }
		        }
		    });
	    }
    });
}

var input = path.resolve(process.cwd(), process.argv[2] || "style.less");

if (fs.existsSync(input)) {
	var output = path.join(path.dirname(input), path.basename(input, ".less") + ".css");

	function onchange(){
	    console.log("wl: compiling", input);
	    compile(input, function(err, css){
	    	if (err) {
	    		if (err.type === "Parse")
	    			err = less.formatError(err);
	    		console.error("wl: error:", ("\n" + err).split(/\n/gm).join("\n\t"));
	    		process.exit(1);
	    	} else {
		    	fs.writeSync(output, css);
		    	console.log("wl: done");
	    	}
    	});
    }

	fs.watch(input, {persistent: true}, (function(){
		var tid;
		return function() {
			clearTimeout(tid);
			tid = setTimeout(onchange, 500);
		};
	})());
	
	console.log("Watching ", path.relative(process.cwd(), input), ">", path.relative(process.cwd(), output));
} else {
	console.error("File does not exist:", input);
	process.exit(1);
}
