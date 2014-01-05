# wlessc #

**wless** is a simple command line tool to quickly watch and compile .less files when you don't have time or just don't want to set up a grunt build task for that (or worse, doing `lessc style.less > style.css` after every change).

You will have your output .css file in the same directory, with the same base name -just like GUI tools do by default.

This was done out of necessity in daily work, and it just does what I need it to do. Don't expect much from it.

## Installation ##
`npm install -g wlessc`

## Usage ##
    wlessc path/to/style.less
    # will output to path/to/style.css