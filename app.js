const cheerio = require('cheerio')
const pdf = require('html-pdf')
const fs = require('fs');
const child_process = require('child_process');

function usage () {
    console.log('Usage:')
    console.log('  ' + process.argv0 + ' <input> <output>')
    console.log('Where:')
    console.log('   input: input HTML file name')
    console.log('  output: output PDF file name')
    console.log('Example:')
    console.log('  ' + process.argv0 + ' Q1.html Q1.pdf')
    console.log('NOTE: this tool require installation of wkhtmltopdf (https://wkhtmltopdf.org)')
    process.exit(-1) 
}

// process input arguments
if (process.argv.length < 4) {
  console.error('Must provide a input html file and a output PDF file!')
  usage()
} else if (process.argv.length !== 4){
  usage()
}

var inputfile = process.argv[2]
var outputfile = process.argv[3]
const temphtmlfile = 'temp.html'

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
    '  page-break-inside: auto;',
    '}',
    'tr {',
    '  page-break-inside: avoid;',
    '  page-break-after: auto;',
    '}',
    'thead {',
    '  display: table-header-group',
    '}',
    'tfoot {',
    '  display: table-footer-group',
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
        const anchor = `<a name="${anchorName}">&nbsp;</a>`
        $(elem).before(anchor)
        $(elem).addClass('page-break')
        tocList.push('<li><a href="#' + anchorName + '">' + $(elem).text() + '</a></li>')
    } else if (elem.name === 'h2') {
        const anchorName = 'h2_' + i
        const anchor = `<a name="${anchorName}">&nbsp;</a>`
        $(elem).before(anchor)
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
fs.writeFileSync(temphtmlfile, html, 'utf8')
console.log('HTML saved to ' + temphtmlfile)

child_process.execFileSync('wkhtmltopdf', ['-d', '300', '--print-media-type', temphtmlfile, outputfile])
console.log('PDF saved to ' + outputfile);
// process.exit(0)

// Convert HTML to PDF
// const options = { 
//   // Papersize Options: http://phantomjs.org/api/webpage/property/paper-size.html 
//   "height": height,        // allowed units: mm, cm, in, px 
//   "width": width,            // allowed units: mm, cm, in, px 
//   // or
//   // "format": "Letter",        // allowed units: A3, A4, A5, Legal, Letter, Tabloid 
//   // "orientation": "portrait", // portrait or landscape 
// }

// pdf.create(html, options).toFile(outputfile, function(err, res) {
//   if (err) {
//     return console.log(err)
//   }
//   
//   console.log('PDF saved to ' + outputfile);    
// })

