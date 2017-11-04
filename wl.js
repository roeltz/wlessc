#!/usr/bin/env node

var fs = require("fs");
var path = require("path");
var less = require("less");
var postcss = require("postcss");
var autoprefixer = require("autoprefixer");
var cssnano = require("cssnano");

function cmdinput() {
	return process.argv.slice(2).filter(a => !/^--/.test(a))[0] || "style.less";
}

function cmdswitch(name, getValue) {
	var index = process.argv.indexOf("--" + name);
	if (index > -1) {
		var s = process.argv.slice(index, getValue ? index + 2 : index + 1);
		return getValue ? s[1] : true;
	} else {
		return false;
	}
}

function compile(file, callback) {
	fs.readFile(file, "utf-8", function(err, codeInput){
		if (err) {
			callback(err);
		} else if (path.extname(file).toLowerCase() == ".less") {
			less.render(codeInput, {
				paths: [path.dirname(file)],
				filename: input
			}, function(err, output) {
				if (err) {
					callback(err);
				} else {
					try {
						callback(null, output.css, output.imports);
					} catch (ex) {
						callback(ex);
					}
				}
			});
		} else {
			callback(null, codeInput);
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

function updateWatches(watches, imports) {
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

function prefix(css, callback) {
	if (applyPrefixes) {
		console.log("Prefixing...");
		var pipeline = [autoprefixer];

		if (compact) {
			pipeline.push(cssnano({
				convertValues: false,
				colormin: false
			}));
		}

		postcss(pipeline).process(css).then(function(css){
			callback(null, css);
		}, function(err){
			callback(err);
		});
	} else {
		callback(null, css);
	}
}

function pad(n) {
	return n.toString().length == 1 ? "0" + n : n;
}

function timestamp() {
	var now = new Date();
	return [
		now.getFullYear(),
		"-", pad(now.getMonth() + 1),
		"-", pad(now.getDate()),
		" ", pad(now.getHours()),
		":", pad(now.getMinutes()),
		":", pad(now.getSeconds())
	].join("");
}

var applyPrefixes = !cmdswitch("no-prefix");
var targetBrowsers = cmdswitch("prefix-browsers", true);
var compact = !cmdswitch("no-compact");
var once = cmdswitch("once");
var input = path.resolve(process.cwd(), cmdinput());
var output = cmdswitch("output", true);

if (output) {
	output = path.resolve(process.cwd(), output);
} else {
	output = path.join(path.dirname(input), path.basename(input, ".less") + ".css");

	if (/\.css\.css$/i.test(output))
		output = output.replace(/\.css\.css$/, ".min.css");
}

if (targetBrowsers)
	autoprefixer = autoprefixer({browsers: targetBrowsers.split(/\s*,\s*/g)});

if (fs.existsSync(input)) {
	var watches = {};
	var compileCount = 0;

	console.log("Output to", output);

	function onchange(){
		console.log("Compiling...");
		console.time("Compilation");

		compile(input, function(err, css, imports){
			if (err) {
				if (err.type) {
					err = less.formatError(err);
					console.error("Error:", ("\n" + err).split(/\n/gm).join("\n\t"));
				} else {
					console.error(err.stack);
				}
			} else {
				prefix(css, function(err, css){
					if (err) {
						console.error(err);
					} else {
						fs.writeFileSync(output, css);

						if (!once && imports) {
							var changes = updateWatches(watches, imports);
							if (changes.added.length)
							console.log("Added:\n" + changes.added.join("\n"));
							if (changes.removed.length)
							console.log("Removed:\n" + changes.removed.join("\n"));
						}

						console.timeEnd("Compilation");
						console.log("Done [", "#" + ++compileCount, "-", timestamp(), "]");
					}
				});
			}
		});
	}

	if (!once) {
		console.log("Watching...");
		watch(input, onchange);
	}
	onchange();
} else {
	console.error("File does not exist:", input);
}
