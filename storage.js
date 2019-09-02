const { ExportToCsv } = require('export-to-csv');

var testdata = [
	{
		url: "asdasdas",
		text: "iiiiiii"
	}
];

  const options = { 
    fieldSeparator: ',',
    quoteStrings: '"',
    decimalSeparator: '.',
    showLabels: true, 
    showTitle: false,
    title: 'My Awesome CSV',
    useTextFile: false,
    useBom: true,
    useKeysAsHeaders: true,
    // headers: ['Column 1', 'Column 2', etc...] <-- Won't work with useKeysAsHeaders present!
  };

const csvExporter = new ExportToCsv(options);

const x = csvExporter.generateCsv(testdata, true);
console.log(x);
