const { ExportToCsv } = require('export-to-csv');
const request = require('request-promise-native');

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
	const csvstr = csvExporter.generateCsv(data, true);
	const responseBody = await request({
		url: `https://ethercalc.org/_/${padname}`,
		method: 'PUT',
		headers: {
			'Content-Type': 'text/csv'
		},
		body: csvstr,
	})

  return responseBody
}

const getPage = async function (padname) {
  const responseBody = await request({
    url: `https://ethercalc.org/_/${padname}/csv.json`,
    method: 'GET',
  })
  const responseData = JSON.parse(responseBody)
  const [headLine, ...lines] = responseData
  return lines.map(line => line.reduce((obj, v, i) => (obj[headLine[i]] = v, obj), {}))
}

module.exports = {
  putPage,
  getPage,
}

const test = async function () {
  const testdata = [
    {
      url: 'https://facebook.com/1',
      text: '安安，你好！'
    },
    {
      url: 'https://facebook.com/2',
      text: '注意！\n感謝你的注意！'
    },
  ];

  const pageName = 'hello_test_page'

  const putResult = await putPage(pageName, testdata)
  console.log('putResult', putResult)
  const getResult = await getPage(pageName)
  console.log('getResult', getResult)
}

test()
