const { ExportToCsv } = require('export-to-csv');

var testdata = [
	{
		url: "asdasdas",
		text: "iiiiixxxxxxi99999"
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
};

const csvExporter = new ExportToCsv(options);


const putPage = async function (padname, data) {
	const request = require('request-promise-native');
	const csvstr = csvExporter.generateCsv(data, true);
	res = await request({
		url: 'https://ethercalc.org/_/'+padname,
		method: "PUT",
		headers: {
			'Content-Type': 'text/csv'
		},
		body: csvstr,
	}).then( res => { console.log(res) });
}
