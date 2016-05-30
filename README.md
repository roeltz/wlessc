# wlessc #

**wless** is a simple command line tool to quickly watch and compile .less files
when you don't have time or just don't want to set up a grunt/gulp/whatever build
task for that (or worse, doing `lessc style.less > style.css` after every change).

You will have your output .css file in the same directory, with the same base
name -just like GUI tools do by default.

It uses the output from LESS to find @import'ed files and watches those too,
so it's not that dumb.

wlessc +0.3 uses the **autoprefixer** library to add vendor prefixes to LESS
output. This is on by default, but it can be tweaked or turned off.

wlessc +0.4.3 uses the **cssnano** library to remove whitespace and apply other
optimizations to reduce file size.

wlessc 0.5.0 updates all of its dependencies, and makes sure cssnano optimizations
don't mess with authored unit or color values.

This was done out of necessity in daily work, and it just does what I need it
to do. Don't expect much from it.

## Installation ##
`npm install -g wlessc`

## Usage ##
	# will watch ./style.less
	wlessc

	# will watch path/to/style.less
    wlessc path/to/style.less

    # sets custom browser support for autoprefixer
    wlessc --prefix-browsers "last 1 version"
    wlessc --prefix-browsers "last 5 version, > 1%"

    # turns off autoprefixer
    wlessc --no-prefix

    # turns off cssnano optimizations
    wlessc --no-compact

	# turns off watching at all, exiting after compiling
    wlessc --once
