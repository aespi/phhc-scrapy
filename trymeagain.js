const cheerio = require('cheerio');
const axios = require('axios');
// const axiosRetry = require('axios-retry').default;
const { convertArrayToCSV } = require('convert-array-to-csv');
const fs = require('fs');
const orderBy = require('lodash').orderBy;
// const qs = require('qs');
const reqHeader = [
  'Writ No',
  'Petitioner Name',
  'FIR No',
  'Police Station',
  'District',
  'Serial No',
  'U/S',
  'Category'
];
let totalCase = 0;
let totalUrgentCase = 0;
let totalOrdinaryCase = 0;
let sessCookie = '';
let finalData = [];
let ordinaryCase = [];
let urgentCase = [];
const instance = axios.create({});
function printProgress() {
  process.stdout.clearLine(); // Clear the current line
  process.stdout.cursorTo(0); // Move the cursor to the beginning of the line
  process.stdout.write(`Urgent: ${urgentCase.length}/${totalUrgentCase}\t`);
  process.stdout.write(`Ordinary: ${ordinaryCase.length}/${totalOrdinaryCase}`);
}

function generateFile() {
  finalData = orderBy(finalData, ['District', 'Police Station'], ['asc']);
  const arrToSubmit = finalData.map((t, i) => {
    const row = [];
    row.push(i + 1);
    reqHeader.forEach(h => {
      row.push(t[h]);
    });
    if (!row[4].startsWith('PS') && !row[4].startsWith('--N')) {
      row[4] = 'PS ' + row[4].toUpperCase();
    }
    if (!row[6].includes('138')) {
      return row;
    }
  });
  try {
    // fs.writeFile("raw.json", JSON.stringify(finalData), "utf8", function (err) {
    //   if (err) {
    //     console.log(
    //       "Some error occured - file either not saved or corrupted file saved."
    //     );
    //   } else {
    //     console.log("Raw File Saved");
    //   }
    // });

    const csvFromArrayOfArrays = convertArrayToCSV(arrToSubmit, {
      header: ['S No', ...reqHeader],
      separator: ','
    });
    fs.writeFile('data.csv', csvFromArrayOfArrays, 'utf8', function (err) {
      if (err) {
        console.log('Some error occured - file either not saved or corrupted file saved.');
      } else {
        console.log('Engine Stopped!!!!');
      }
    });
  } catch (err) {
    console.log('File saving FAILED.\n Try again....');
    throw new Error('FAILEDDD line 78');
  }
}
function getCookie(date) {
  return new Promise(async (resolve, reject) => {
    try {
      const axiosResponse = await instance.request({
        method: 'POST',
        withCredentials: true,
        header: {
          Connection: 'keep-alive',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        url: 'https://phhc.gov.in/home.php?search_param=jud_cl',
        data: `cl_date='${date}'&t_jud_code=655&t_list_type=&submit=Search+Case`
      });
      sessCookie = axiosResponse.headers['set-cookie'][0];
      instance.defaults.headers.common['Cookie'] = sessCookie;
      resolve(true);
    } catch (err) {
      console.log('!!!!ERROR WHILE CREATING SESSION!!!!');
      reject(false);
    }
  });
}

async function getCaseDetails(hrefStr, caseType, relatedWith = '', oldValues = {}) {
  try {
    const config = {
      method: 'get',
      url: `https://phhc.gov.in/${hrefStr}`,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-IN,en-GB;q=0.9,en;q=0.8',
        Connection: 'keep-alive',
        Cookie: sessCookie,
        Host: 'phhc.gov.in',
        Referer: 'https://phhc.gov.in/home.php?search_param=case',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15'
      }
    };
    const axres = await instance.request(config);

    const $ = cheerio.load(axres.data);

    const writNo =
      relatedWith +
      (relatedWith ? '/' : '') +
      $('#table1 th.case_header').text().replace('Case Details For Case', '').trim();
    const listType = $('#table1 .data_sub_item').eq(1).text().trim();
    const category = $('#table1 .data_item').eq(2).text().trim();
    const mainCase = $('#table1 .data_item:eq(3) a').attr('href');
    const partyDetail = $('#table1 .data_item').eq(4).text().trim();
    let district = $('#table1 .data_item').eq(5).text().trim();
    let firNo = 'Complaint Case';
    let policeStation = '--Not Found--';
    let sections = '--Not Found--';
    let firDetailRow = -1;
    let isFir = false;
    $('#table1 th.header_text').each(function (index, element) {
      if ($(element).text().trim().includes('FIR Details')) {
        isFir = true;
        return false;
      }
    });

    $('#table1 tr').each(function (index, element) {
      if ($(element).text().trim().includes('Police Station')) {
        firDetailRow = index + (isFir ? 1 : 2);
        return false;
      }
    });

    let firDetail = $('#table1 tr')
      .eq(firDetailRow)
      .text()
      .trim()
      .split('\n')
      .map(x => x.trim());

    if (firDetailRow === -1 && mainCase) {
      await getCaseDetails(mainCase.replace('./', ''), caseType, writNo, {
        'Petitioner Name': partyDetail,
        District: district.toUpperCase(),
        'Serial No': listType,
        'U/S': sections,
        Category: category
      });
      return;
    }
    district = firDetail[3] || district;
    if (isFir) {
      firNo = firDetail[0];
      policeStation = firDetail[1];
      sections = firDetail[2];
    } else if (firDetailRow !== -1) {
      policeStation = firDetail[2];
    }

    if (!isNaN(sections.replace(/,/gi, ''))) {
      sections = sections + ' IPC';
    }

    const result = {
      'Writ No': writNo,
      'Petitioner Name': partyDetail,
      'FIR No': firNo,
      'Police Station': policeStation,
      District: district.toUpperCase(),
      'Serial No': listType,
      'U/S': sections,
      Category: category,
      ...oldValues
    };
    if (caseType === 'O') {
      ordinaryCase.push(result);
    } else {
      urgentCase.push(result);
    }
    printProgress();
    if (ordinaryCase.length + urgentCase.length === totalCase) {
      finalData = [...ordinaryCase, ...urgentCase];
      generateFile();
    }
  } catch (err) {
    console.error('SOMETHING WENT WRONG');
    throw 'FAILEDDD line 214';
  }
}

async function getTotalCase(conf) {
  const response = await instance.request({
    method: 'POST',
    header: {
      Connection: 'keep-alive',
      cookie: sessCookie,
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    url: 'https://phhc.gov.in/home.php?search_param=jud_cl',
    data: `cl_date=${conf.date}&t_jud_code=${conf.judgeCode}&t_list_type=${conf.type}&submit=Search+Case`
  });
  const $ = cheerio.load(response.data);
  const trElements = $('#abce tr').filter((index, element) => {
    return (
      $(element).text().includes('STATE OF PUNJAB') &&
      $(element).find('a[target="_blank"]').attr('href')
    );
  });
  const hrefValues = trElements
    .find('a')
    .map((index, trElements) => {
      return $(trElements).attr('href');
    })
    .get();
  hrefValues.forEach(link => {
    getCaseDetails(link, conf.type);
  });
  if (conf.type === 'O') {
    totalOrdinaryCase = hrefValues.length;
  } else {
    totalUrgentCase = hrefValues.length;
  }
  totalCase = totalCase + hrefValues.length;
}

module.exports.start = async function (date) {
  try {
    console.log('ENGINE STARTED for ', date, '\n');
    const config = [
      {
        date: date,
        type: 'O',
        caseType: 'ORDINARY',
        judgeCode: 655
      },
      {
        date: date,
        type: 'U',
        caseType: 'URGENT',
        judgeCode: 655
      }
    ];
    const isCookieFetched = await getCookie(date);
    if (isCookieFetched) {
      config.forEach(c => {
        getTotalCase(c);
      });
      console.log('totalCase:', totalCase);
    }
  } catch {
    console.log('!!!!!ENGINE failed to start!!!!!');
    throw new Error('FAILEDDD line 283');
  }
};
