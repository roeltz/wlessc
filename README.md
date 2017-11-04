# wlessc

**wlessc** is a simple command line tool to quickly watch and compile .less files
when you don't have time or just don't want to set up a grunt/gulp/whatever build
task for that (or worse, doing `lessc style.less > style.css` after every change).

You will have your output .css file in the same directory, with the same base
name -just like GUI tools do by default.

It uses the output from LESS to find `@import`'ed files and watches those too,
so it's not that dumb.

## Installation

`npm install -g wlessc`

## Usage

	wlessc [<input>] [--output <path>] [--prefix-browsers <expr>|--no-prefix]
			[--no-compact] [--once]

### Options

	<input>                     Input file. It can be a LESS or CSS file.
	                            If omitted, ./style.less is used.
	--output <path>             Custom output file path.
	--prefix-browsers <expr>    Comma-separated expressions to set custom
	                            browser support.
	                            See https://github.com/ai/browserslist.
	--no-prefix                 Omit prefixing.
	--no-compact                Omit minification and other optimizations.
	--once                      Compile once and exit.

### Examples

	# Will watch ./style.less
	wlessc

	# Will watch path/to/style.less
	wlessc path/to/style.less

	# Will watch path/to/style.css, omitting LESS compilation
	# and using .min.css as default output extension
	wlessc path/to/style.css

	# Will output to custom path/to/output.css
	wlessc --output path/to/output.css

	# Sets custom browser support for Autoprefixer
	wlessc --prefix-browsers "last 1 version"
	wlessc --prefix-browsers "last 5 version, > 1%"

	# Turns off Autoprefixer
	wlessc --no-prefix

	# Turns off cssnano optimizations
	wlessc --no-compact

	# Turns off watching at all, exiting after compiling
	wlessc --once

## Change log

wlessc +0.3 uses the **Autoprefixer** library to add vendor prefixes to LESS
output. This is on by default, but it can be tweaked or turned off.

wlessc +0.4.3 uses the **cssnano** library to remove whitespace and apply other
optimizations to reduce file size.

wlessc 0.5.0 updates all of its dependencies, and makes sure cssnano
optimizations don't mess with authored unit or color values.

wlessc 0.6.0 updates all of its dependencies, allows to be used with a plain CSS
file for its Autoprefixer/cssnano goodies while skipping LESS compilation, and
adds the `--output` switch.

## Disclaimer

This was done out of necessity in daily work, and it just does what I need it
to do. Don't expect much from it.
