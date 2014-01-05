#!/usr/bin/env node

var fs = require("fs");
var path = require("path");
var less = require("less");
var traverse = require("traverse");

function imports(file, callback) {
	var importedFilenames = [];
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
					traverse(tree).forEach(function(x){
						if (x instanceof less.tree.Import) {
							importedFilenames.push(x.importedFilename);
						}
					});
					callback(null, importedFilenames);
				}
			});
		}
	});	
}

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

function watch(file, callback) {
	fs.watch(file, {persistent: true}, (function(){
		var tid;
		return function() {
			clearTimeout(tid);
			tid = setTimeout(callback, 500);
		};
	})());
}

var input = path.resolve(process.cwd(), process.argv[2] || "style.less");

if (fs.existsSync(input)) {
	var output = path.join(path.dirname(input), path.basename(input, ".less") + ".css");

	function onchange(){
	    console.log("Compiling...");
	    compile(input, function(err, css){
	    	if (err) {
	    		if (err.type === "Parse") {
	    			err = less.formatError(err);
	    			console.error("Error:", ("\n" + err).split(/\n/gm).join("\n\t"));
	    		} else {
	    			console.error(err);
	    		}
	    	} else {
		    	fs.writeFileSync(output, css);
		    	console.log("Done.");
	    	}
    	});
    }
    
    imports(input, function(err, paths){
    	if (err) {
    		console.error("Error while scanning for @import rules:", err);
    	} else {
	    	paths.unshift(input);
	    	console.log("Watching:");
    		paths.forEach(function(file){
		    	console.log("\t" + file);
    			watch(file, onchange);
    		});
	    	console.log("Output:\n\t", output, "\n");
    		onchange();
	    }
    });
} else {
	console.error("File does not exist:", input);
}
