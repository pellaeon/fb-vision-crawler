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
  const response = await request({
    url: `https://ethercalc.org/_/${padname}/csv.json`,
    method: 'GET',
	  resolveWithFullResponse: true,
	  simple: false,//fulfill the promise on 404 as well
  })
	if ( response.statusCode === 200 ) {
		const responseData = JSON.parse(response.body)
		if ( Array.isArray(responseData) && Array.isArray(responseData[0]) && responseData[0][0] === '' ) {//this means the page exists but is empty
			console.debug('getPage: exists but empty');
			return [];
		}
		const [headLine, ...lines] = responseData
		return lines.map(line => line.reduce((obj, v, i) => (obj[headLine[i]] = v, obj), {}))
	} else if ( response.statusCode === 404 ) {// page does not exist
		return [];
	} else {
		throw new Error('Getting Etherpad '+padname+' failed!');
	}
}

const verifyPage = async function (padname) {
  const response = await request({
    url: `https://ethercalc.org/_/${padname}/csv.json`,
    method: 'GET',
	  resolveWithFullResponse: true,
	  simple: false,//fulfill the promise on 404 as well
  })
	if ( response.statusCode === 200 ) {
		const responseData = JSON.parse(response.body)
		if ( Array.isArray(responseData) && Array.isArray(responseData[0]) && responseData[0][0] === '' ) {//this means the page exists but is empty
			console.debug('getPage: exists but empty');
			process.exit(1);
		}
		const [headLine, ...lines] = responseData
		var data = lines.map(line => line.reduce((obj, v, i) => (obj[headLine[i]] = v, obj), {}))
		if ( Object.keys(data[0]).indexOf('url') === -1 ) {
			console.log('Data does not contain `url` column, data format invalid');
			process.exit(4);
		} else {
			process.exit(0);
		}
	} else if ( response.statusCode === 404 ) {// page does not exist
		console.debug('Page does not exist');
		process.exit(2);
	} else {
		process.exit(3);
	}
}

// TODO: this method is not used for now but kept for future use
const updatePage = async function (padname, newdata) {
	let olddata = await getPage(padname);

	const merged = [...olddata.concat(newdata).reduce((m, o) => 
		m.set(o.url, Object.assign(m.get(o.url) || {}, o))
		, new Map()).values()];

	return putPage(padname, merged);
}

module.exports = {
  putPage,
  getPage,
  updatePage,
  verifyPage,
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
