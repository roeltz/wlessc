#!/usr/bin/env node

console.log("Loading...");
var fs = require("fs");
var path = require("path");
var less = require("less");
var postcss = require("postcss");
var autoprefixer = require("autoprefixer");
var CleanCSS = require("clean-css");
console.log("Ready");

function cmdinput() {
	if (process.argv.length >= 3 && !/^--/.test(process.argv[2])) {
		return process.argv[2];
	} else {
		return "style.less";
	}
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
				filename: input,
				relativeUrls: true
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
		postcss([autoprefixer]).process(css, {from: undefined}).then(function(result){
			callback(null, result.css);
		}, function(err){
			callback(err);
		});
	} else {
		callback(null, css);
	}
}

function minify(css, callback) {
	if (compact) {
		try {
			console.log("Minifying...");
			var options = {
				inline: false,
				level: {
					1: {
						replaceTimeUnits: false,
						replaceZeroUnits: false
					},
					2: {
						mergeAdjacentRules: compactMore,
						mergeIntoShorthands: compactMore,
						mergeNonAdjacentRules: compactMore,
						overrideProperties: compactMore,
						restructureRules: compactMore
					}
				}
			};
			var output = new CleanCSS(options).minify(css);
			callback(null, output.styles);
		} catch (ex) {
			callback(ex);
		}
	} else {
		callback(null, css);
	}
}

function postprocess(css, callback) {
	prefix(css, function(err, css){
		if (err) {
			callback(err);
		} else {
			minify(css, callback);
		}
	});
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

function relative(file) {
	return path.relative(process.cwd(), file);
}

var applyPrefixes = !cmdswitch("no-prefix");
var targetBrowsers = cmdswitch("prefix-browsers", true);
var compact = !cmdswitch("no-compact");
var compactMore = !cmdswitch("compact-more");
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

	console.log("Input:", relative(input));
	console.log("Output:", relative(output));

	function onchange(){
		console.log("Compiling...");
		console.time("Compilation");

		compile(input, function(err, css, imports){
			if (err) {
				if (err.type) {
					console.error("Error:", err.message, "\nAt", err.filename + ":" + err.line + ":" + err.column, "\n> " + err.extract.join("\n> "));
				} else {
					console.error(err.stack);
				}
			} else {
				postprocess(css, function(err, css){
					if (err) {
						console.error(err);
					} else {
						fs.writeFileSync(output, css);

						if (!once && imports) {
							var changes = updateWatches(watches, imports);
							if (changes.added.length)
							console.log("Added:\n" + changes.added.map(relative).join("\n"));
							if (changes.removed.length)
							console.log("Removed:\n" + changes.removed.map(relative).join("\n"));
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
