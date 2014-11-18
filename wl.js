#!/usr/bin/env node

var fs = require("fs");
var path = require("path");
var less = require("less");
var autoprefixer = require("autoprefixer");

function lookupImports(tree) {
	var imports = [];
	tree.rules.forEach(function(rule){
		if ((rule instanceof less.tree.Import) && rule.importedFilename) {
			imports.push(rule.importedFilename);
		}
	});
	return imports;
}

function compile(file, callback) {
	console.time("Compilation");

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
		                var css = tree.toCSS({compress: true});
		                var imports = lookupImports(tree);
		                console.timeEnd("Compilation");
		                callback(null, css, imports);
		            } catch (ex) {
		            	callback(ex);
		            }
		        }
		    });
	    }
    });
}

function watch(file, callback) {
	return fs.watch(file, {persistent: true}, (function(){
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
	var watches = {};
	var compileCount = 0;
	
	function updateWatches(imports) {
		var changes = {added:[], removed: []};
		
		for (var file in watches) {
    		if (imports.indexOf(file) == -1) {
    			watches[file].close();
    			delete watches[file];
    			changes.removed.push(file);
    		}
    	}
    	
    	imports.forEach(function(file){
	    	if (!(file in watches)) {
				watches[file] = watch(file, onchange);
				changes.added.push(file);
			}
		});
		
		return changes;
	}
	
	function onchange(){
	    console.log("Compiling...");
	    
	    compile(input, function(err, css, imports){
	    	if (err) {
	    		if (err.type) {
	    			err = less.formatError(err);
	    			console.error("Error:", ("\n" + err).split(/\n/gm).join("\n\t"));
	    		} else {
	    			console.error(err.stack);
	    		}
	    	} else {
	    		if (process.argv.indexOf("--no-prefix") == -1) {
	    			console.log("Adding prefixes...");
	    			
	    			var browsersIndex = process.argv.indexOf("--prefix-browsers")
	    			if (browsersIndex != -1) {
	    				var browsers = process.argv[browsersIndex + 1].split(/\s*[,;]\s*/g);
	    				autoprefixer = autoprefixer.apply(null, browsers);
	    			}
	    			
	    			css = autoprefixer.process(css).css;
	    		}
	    		
		    	fs.writeFileSync(output, css);
		    	
		    	var changes = updateWatches(imports);
		    	if (changes.added.length)
		    		console.log("Added:", changes.added);
		    	if (changes.removed.length)
		    		console.log("Removed:", changes.removed);
		    		
		    	console.log("Done [" + ++compileCount + "]");
	    	}
    	});
    }
    
    console.log("Watching...");
    watch(input, onchange);
	onchange();
} else {
	console.error("File does not exist:", input);
}
