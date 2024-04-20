const cheerio = require("cheerio")
const axios = require("axios");
const { convertArrayToCSV } = require('convert-array-to-csv');
const fs = require('fs');
const orderBy = require('lodash').orderBy;
const header = ['Writ No', 'Serial No', 'Petitioner Name', 'Respondent Name', 'r', 'r'];
const reqHeader = ['Writ No', 'Petitioner Name', 'FIR No', 'Police Station', 'Court Room', 'Serial No', 'U/S','Category', 'Name of I/O', 'I/O Contact'];
const casesToSearch = ['CRM-M', 'CRWP', 'CRM-W', 'COCP', 'CRM', 'CRA-AD', 'CRA-AS', 'CRA', 'CRA-D', 'CRM-A', 'CRM-CLT-OJ', 'CRA-S', 'CRA-A', 'CRR', 'CRA-MA', 'CRR(F)','CWP'];
let sessCookie = '';
const finalData = [];
let intercallCallpageID = [];
const qs = require('qs');

function printProgress(progress) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write('\t\tLoading....\t' + progress + '%');
}

function getCourtRoom(id) {
    return new Promise(async (resolve, reject) => {
        try {
            var config = {
                method: 'get',
                url: 'https://phhc.gov.in/enq_caseno.php?case_id=' + id,
                headers: {
                    'Accept': ' text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                    'Accept-Encoding': ' gzip, deflate, br',
                    'Accept-Language': ' en-US,en;q=0.9',
                    'Cache-Control': ' no-cache',
                    'Connection': ' keep-alive',
                    'Cookie': sessCookie,
                    'Pragma': ' no-cache',
                    'User-Agent': ' Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'
                }
            };
            const axres = await axios.request(config);
            const $ = cheerio.load(axres.data);
            const htmlElement = $('.data_sub_item > font')
            const courtNo = htmlElement[0]?.children[0]?.data?.replace('(Court Room No.', '')?.replace(')', '') || '--NOT FOUND--';
            const htmlElement0 = $('td');
            const cat = htmlElement0[7]?.children[0]?.data || '--NOT FOUND--'
            const htmlElement1 = $('tr');
            let flagStop = -1;
            htmlElement1.each((index, ele) => {
                if (ele?.children?.[0]?.children?.[0]) {
                    if (ele.children[0].children[0].data === 'FIR Details') {
                        flagStop = index + 2;
                        return false;
                    }
                    else if (ele.children[0].children[0].data === 'Complaints Details') {
                        flagStop = index + 2;
                        return false;
                    }
                }
            })
            let firNo = htmlElement1[flagStop]?.children[1]?.children[0]?.data || 'Complaint Case';
            let sectionName = htmlElement1[flagStop]?.children[5]?.children[0]?.data || '--Not Found--';
            let ps = htmlElement1[flagStop]?.children[3]?.children[0]?.data || '--Not Found--';
            const href = $('td> a')[0]?.attribs?.href;
            if (firNo === 'Complaint Case' && href?.includes('enq_caseno.php')) {
                const caseID = href
                    ?.substring(href.indexOf('=') + 1);
                if (!intercallCallpageID.includes(caseID)) {
                    intercallCallpageID.push(caseID);
                    const recus = await getCourtRoom(caseID);
                    firNo = recus['FIR No'];
                    ps = recus['Police Station'];
                    sectionName = recus['U/S'];
                }

            }
            intercallCallCounter = [];
            if (ps.toLowerCase() === 'ps city' || ps.toLowerCase()==='city kapurthala') {
                ps = 'PS CITY KPT';
            }
            resolve({ 'Court Room': courtNo, 'FIR No': firNo,'U/S': '`'+sectionName.toString(), 'Police Station': ps.toUpperCase(), 'Category': cat });
        } catch (err) {
            reject('SOMETHING WENT WRONG');
        }

    })


}

function scrape(conf) {
    return new Promise(async resolve => {
        const apiData = qs.stringify({
            'cl_date': conf.date,
            't_case_dist': '31',
            't_cl_type': conf.type,
            'case_category': 'A',
            't_case_type': '',
            'submit': 'Search Case'
        });

        const data = [];
        var config = {
            method: 'post',
            url: `https://phhc.gov.in/home.php?search_param=dist_cl&page_no=${conf.pageNo}`,
            headers: {
                'Host': 'phhc.gov.in',
                ...(sessCookie ? { 'Cookie': sessCookie } : {})
            },
            data: sessCookie ? [] : apiData
        };

        axios(config)
            .then(async function (response) {
                if (response.headers['set-cookie']?.length) {
                    sessCookie = response.headers['set-cookie'][0].replace('; path=/', '');
                }
                const $ = cheerio.load(response.data);
                const htmlElement = $("#tables11 > tbody>tr>td");

                if (htmlElement.length === 1) {
                    resolve(finalData);
                }
                let obj = {};
                let tdCounter = 0;

                htmlElement.each(async (index, ele) => {
                    if(ele.children[0]===undefined){
                        ele.children[0] = {data:'--Not Found--'}
                    }
                    if (ele.children[0].data || ele.children[0]?.attribs?.href?.includes('case_id')) {
                        tdCounter++;
                        let text = '';
                        if (ele.children[0].data) {
                            text = ele.children[0].data;
                        }
                        else {
                            ele.children.forEach(async (inritem) => {
                                const caseId = inritem.attribs.href
                                    .substring(inritem.attribs.href.indexOf('=') + 1);
                                obj['Court Room'] = caseId;
                                text = inritem.children[0].children[0].data;
                            })

                        }
                        obj[header[index % 6]] = text;
                        if (tdCounter === 6) {
                            function checkCaseName(writ) {
                                let exist = false;
                                casesToSearch.every(ct => {
                                    if (writ.toLowerCase().includes(ct.toLowerCase())) {
                                        exist = true;
                                        return false;
                                    }
                                    return true;
                                })

                                return exist;

                            }
                            if (
                                (obj['Respondent Name'].includes('STATE OF PUNJAB') || obj['Respondent Name'].includes('STATE OF PB')
                                    ||
                                    checkCaseName(obj['Writ No']))
                                // &&
                                // !obj['Writ No'].toLowerCase().startsWith('cwp')
                            ) {
                                data.push(obj);
                            }
                            tdCounter = 0;
                            obj = {}
                        }
                    }

                });
                console.log(`\tTotal ${conf.caseType} Case found on PAGE: ${conf.pageNo}->>`, data.length);
                if (data.length === 0) {
                    resolve(finalData);
                }
                let counter = 0;
                for (let index = 0; index < data.length; index++) {
                    const item = data[index];
                    try {
                        delete item['r'];
                        const room = await getCourtRoom(item['Court Room']);
                        counter++;

                        printProgress(Math.floor(counter * 100 / data.length));
                        finalData.push({ ...data[index], ...room });
                        if (counter === data.length) {
                            resolve(finalData);
                        }
                    }
                    catch (err) {
                        console.log('ERROR->>>', err, '\nFailed....', item,);
                    }
                }
            })
            .catch(function (error) {
                console.log('REQUEST ERROR OF AXIOS');
            });

    })
}
function getPageNumber(conf) {
    return new Promise(async (resolve, reject) => {
        const axiosResponse = await axios.request({
            method: "POST",
            header: {
                'Referer': 'https://phhc.gov.in/home.php?search_param=dist_cl',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            url: "https://phhc.gov.in/home.php?search_param=dist_cl",
            data: `cl_date=${conf.date}&t_case_dist=31&t_cl_type=${conf.type}&case_category=A&t_case_type=&submit=Search+Case`
        })
        const $ = cheerio.load(axiosResponse.data);

        const pageNo = $('a[href*="page_no"]');
        let pageNoIndex = [];
        pageNo.each((index, ele) => {
            if (ele.attribs.href.includes('page_no')) {
                pageNoIndex.push(index);
            }
        });
        pageNoIndex.splice(0, 1);
        if (pageNoIndex.length === 0) {
            pageNoIndex = [{ date: conf.date, type: conf.type, caseType: conf.caseType, pageNo: 1 }]
        }
        else {
            pageNoIndex = pageNoIndex.map((i, idx) => { return { date: conf.date, type: conf.type, caseType: conf.caseType, pageNo: idx + 1 } });
        }
        resolve(pageNoIndex);
    })
}

module.exports.start =  function(date) {
    console.log('ENGINE STARTED...')
    return new Promise(async (resolve,reject) => {
        const config = [
            { date: date, type: 'O', caseType: 'ORDINARY', pageNo: 1 },
            { date: date, type: 'U', caseType: 'URGENT', pageNo: 1 },
        ]
        const confWithPage = []
        let clearCookieAfter = 0;
        for (let c = 0; c < config.length; c++) {
            const curListPage = await getPageNumber(config[c]);
            console.log(config[c].caseType, ' ->> PAGE count: ', curListPage.length)
            if (c === 0) {
                clearCookieAfter = curListPage.length;
            }
            confWithPage.push(...curListPage);

        }
        console.log('=========================================================================')
        for (let cp = 0; cp < confWithPage.length; cp++) {
            console.log('\n', confWithPage[cp].caseType, 'LIST STARTED on page: ', confWithPage[cp].pageNo)
            if (clearCookieAfter === cp) {
                sessCookie = '';
            };
            await scrape(confWithPage[cp]);
        }

        const newArr = orderBy(finalData, ['Police Station'], ['asc']);
        const arrToSubmit = newArr.map((t, i) => {
            const row = [];
            row.push(i + 1);
            reqHeader.forEach(h => {
                row.push(t[h]);
            });
            if(!row[4].startsWith('PS') &&!row[4].startsWith('--N')){
                row[4]='PS '+row[4].toUpperCase();
            }
            // row[9]=`=IFERROR(INDEX('IO Contact'!$A:$A, MATCH(K3, 'IO Contact'!$B:$B, 0)), "NO MATCH")`;
            if(!row[6].includes('138')){
                return row;
            }
        })
try{

        fs.writeFile('raw.json', JSON.stringify(newArr), 'utf8', function (err) {
            if (err) {
                console.log('Some error occured - file either not saved or corrupted file saved.');
                reject()
            } else {
                console.log('Raw File Saved');
                resolve();
            }
        });

        const csvFromArrayOfArrays = convertArrayToCSV(arrToSubmit, {
            header: ['S No', ...reqHeader],
            separator: ','
        });
        fs.writeFile('data.csv', csvFromArrayOfArrays, 'utf8', function (err) {
            if (err) {
                console.log('Some error occured - file either not saved or corrupted file saved.');
                reject()
            } else {
                console.log('CSV File Saved for DATE:' + date);
                console.log('Engine Stopped!!!!');
                resolve();
            }
        });
    }
    catch(err){
        console.log(err)
console.log('File saving FAILED.\n Try again....')
    }
    });

}


