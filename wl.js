#!/usr/bin/env node

const autoprefixer = require("autoprefixer");
const CleanCSS = require("clean-css");
const commandLineArgs = require("command-line-args");
const { EventEmitter } = require("events");
const { constants, watch } = require("fs");
const { access, readFile, writeFile } = require("fs/promises");
const less = require("less");
const { dirname, extname, join, resolve, basename, relative } = require("path");
const postCSS = require("postcss");
const proc = require("process");

const DOUBLE_EXT_REGEX = /\.css\.css$/i;

let busy = false;
let requestedWhileBusy = false;
let compileCount = 0;

async function compile(file) {
	let code = await readFile(file, "utf-8");

	if (extname(file).toLowerCase() === ".less") {
		let output = await less.render(code, {
			paths: [dirname(file)],
			filename: file,
			relativeUrls: true
		});

		return [output.css, output.imports]
	} else {
		return [code];
	}
}

function computeOutputPath(input, output) {
	if (output) {
		return resolve(proc.cwd(), output);
	} else {
		output = join(dirname(input), basename(input, ".less") + ".css");
	}

	if (DOUBLE_EXT_REGEX.test(output)) {
		output = output.replace(DOUBLE_EXT_REGEX, ".min.css");
	}

	return output;
}

function computeRelativePath(file) {
	return relative(proc.cwd(), file);
}

function help() {
	const commandLineUsage = require("command-line-usage");
	return console.log(commandLineUsage([
		{
			header: "wlessc",
			content: "Watch, compile, prefix and minify .less/.css files"
		},
		{
			header: "Usage",
			content: [
				"wlessc [<input>] [--output <path>]",
				"[--prefix-browsers <expr> | --no-prefix]",
				"[--no-compact | --compact-more] [--once]"
			]
		}
	]));
}

async function main() {
	let bus = new EventEmitter();
	let options = commandLineArgs([
		{ name: "compact-more", type: Boolean, defaultValue: false },
		{ name: "help", type: Boolean },
		{ name: "input", type: String, defaultOption: true, defaultValue: "style.less" },
		{ name: "no-prefix", type: Boolean },
		{ name: "no-compact", type: Boolean },
		{ name: "once", type: Boolean },
		{ name: "output", type: String },
		{ name: "prefix-browsers", type: String }
	], {
		camelCase: true
	});

	if (options.help) {
		return help();
	}

	if (options.prefixBrowsers) {
		autoprefixer = autoprefixer({ browsers: options.prefixBrowsers.split(/\s*,\s*/g) });
	}

	let trackers = {};
	let { once } = options;
	let input = resolve(proc.cwd(), options.input);
	let output = computeOutputPath(input, options.output);
	let onchange = () => process(input, output, trackers, bus, options);

	try {
		await access(input, constants.R_OK);

		console.log(`Input: ${computeRelativePath(input)}`);
		console.log(`Output: ${computeRelativePath(output)}`);

		if (!once) {
			track(input, bus);
			bus.on("change", onchange);
		}

		onchange();
	} catch (err) {
		console.error("File does not exists:", input);
	}
}

function minify(css, more) {
	let clean = new CleanCSS({
		inline: false,
		level: {
			1: {
				replaceTimeUnits: false,
				replaceZeroUnits: false,
				specialComments: 0
			},
			2: {
				mergeAdjacentRules: more,
				mergeIntoShorthands: more,
				mergeNonAdjacentRules: more,
				overrideProperties: more,
				restructureRules: more
			}
		}
	});
	let result = clean.minify(css);
	return result.styles;
}

async function prefix(css) {
	let result = await postCSS([autoprefixer]).process(css, { from: undefined });
	return result.css;
}

async function process(input, output, trackers, bus, options) {
	if (busy) {
		requestedWhileBusy = true;
		return;
	} else {
		busy = true;
		requestedWhileBusy = false;
	}

	console.log("Compiling...");
	console.time("Compilation");

	try {
		let [css, imports] = await compile(input);
		css = await postprocess(css, options);
		await writeFile(output, css);

		if (!options.once && imports) {
			let { added, removed } = updateTrackers(trackers, imports, bus);

			if (added.length) {
				console.log(`Added:\n  ${added.map(computeRelativePath).join("\n  ")}`);
			}

			if (removed.length) {
				console.log(`Removed:\n  ${removed.map(computeRelativePath).join("\n  ")}`);
			}
		}
	} catch (err) {
		if (err.extract) {
			console.error(`Error: ${err.message}\nAt ${err.filename}:${err.line}:${err.column}\n>${err.extract.join("\n> ")}`);
		} else {
			console.error(err);
		}
	}

	console.timeEnd("Compilation");
	console.log(`Done [ #${++compileCount} - ${new Date().toISOString()} ]`);

	busy = false;

	if (requestedWhileBusy) {
		bus.emit("change");
	}
}

async function postprocess(css, options) {
	if (!options.noPrefix) {
		console.log("Prefixing...");
		css = await prefix(css);
	}

	if (!options.noCompact) {
		console.log("Minifying...");
		css = minify(css, options.compactMore);
	}

	return css;
}

function track(file, bus) {
	return watch(file, { persistent: true }, (() => {
		let tid;
		return () => {
			clearTimeout(tid);
			tid = setTimeout(() => bus.emit("change"), 200);
		};
	})());
}

function updateTrackers(trackers, imports, bus) {
	let added = [];
	let removed = [];

	for (let file in trackers) {
		if (imports.indexOf(file) === -1) {
			trackers[file].close();
			delete trackers[file];
			removed.push(file);
		}
	}

	for (let file of imports) {
		if (!(file in trackers)) {
			trackers[file] = track(file, bus);
			added.push(file);
		}
	}

	return { added, removed };
}

main();