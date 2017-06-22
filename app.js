const cheerio = require('cheerio')
const pdf = require('html-pdf')
const fs = require('fs');

// Default option arguments
width = '8in'
height = '10.5in'

function usage () {
    console.log('Usage:')
    console.log('  ' + process.argv0 + ' <input> <output> [width] [height]')
    console.log('Where:')
    console.log('   input: input HTML file name')
    console.log('  output: output PDF file name')
    console.log('   width: (optional) page width (mm, cm, in or px).  Default ' + width)
    console.log('  height: (optional) page height (mm, cm, in or px).  Default ' + height)
    console.log('Example:')
    console.log('  ' + process.argv0 + ' Q1.html Q1.pdf 20in 16in')
    process.exit(-1) 
}

function validateUnit (input) {
    if (input.endsWith('mm') || input.endsWith('cm') || input.endsWith('in') || input.endsWith('px')) {
        return input
    }
    usage()
}

// process input arguments
if (process.argv.length < 4) {
  console.error('Must provide a input html file and a output PDF file!')
  usage()
} else if (process.argv.length === 5) {
  width = validateUnit(process.argv[4])
} else if (process.argv.length === 6) {
  width = validateUnit(process.argv[4])
  height = validateUnit(process.argv[5])
} else if (process.argv.length !== 4){
  usage()
}

var inputfile = process.argv[2]
var outputfile = process.argv[3]

// strip control characters from filenames
outputfile = outputfile.replace(/[^\x20-\x7E]+/g, '')
inputfile = inputfile.replace(/[^\x20-\x7E]+/g, '')

// Read input file and process HTML files
const input = fs.readFileSync(inputfile, 'utf8')
const $ = cheerio.load(input)

// Remove unnecessary HTML elements
$('link').replaceWith(null)
$('head > style').replaceWith(null)
$('script').replaceWith(null)
$('form').replaceWith(null)
$('.input').replaceWith(null)
$('.output_prompt').replaceWith(null)
$('.anchor-link').replaceWith(null)

// Create Custom style
const pageBreak = [
    '@media print {',
    '  .page-break {',
    '    page-break-before: always;',
    '  }',
    '}',
].join('\n')

// Make sure all borders have single border with 1px
const tableStyles = [
    'table {',
    '  border-collapse: collapse;',
    '}',
    'table, th, td {',
    '  border: 1px solid black;',
    '}',
].join('\n')
    
$([
    '<style type="text/css">',
    pageBreak,
    tableStyles,
    '</style>'
].join('\n')).prependTo('html')

// Generate TOC by collecting h1/h2
const tocList = []
$('*').each(function(i, elem) {
    if (elem.name === 'h1') {
        const anchorName = 'h1_' + i
        $(elem).prepend('<a name="' + anchorName + '"></a>')
        $(elem).addClass('page-break')
        tocList.push('<li><a href="#' + anchorName + '">' + $(elem).text() + '</a></li>')
    } else if (elem.name === 'h2') {
        const anchorName = 'h2_' + i
        $(elem).prepend('<a name="' + anchorName + '"></a>')
        tocList.push('<ul><li><a href="#' + anchorName + '">' + $(elem).text() + '</a></li></ul>')
    }
})

// Create table of contents
$([
    '<h1>Table of Contents</h1>',
    '<ul>',
    tocList.join('\n'),
    '</ul>'
].join('\n')).prependTo('body')

// Generate the HTML content
const html = $.html()

// Write HTML to temp file
fs.writeFileSync('temp.html', html, 'utf8')
// process.exit(0)

// Convert HTML to PDF
const options = { 
  // Papersize Options: http://phantomjs.org/api/webpage/property/paper-size.html 
  "height": height,        // allowed units: mm, cm, in, px 
  "width": width,            // allowed units: mm, cm, in, px 
  // or
  // "format": "Letter",        // allowed units: A3, A4, A5, Legal, Letter, Tabloid 
  // "orientation": "portrait", // portrait or landscape 
}

pdf.create(html, options).toFile(outputfile, function(err, res) {
  if (err) {
    return console.log(err)
  }
  
  console.log('PDF saved to ' + outputfile);    
})