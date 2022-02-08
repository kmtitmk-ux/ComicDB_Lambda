// await new Promise(resolve => setTimeout(resolve, 1000));
// const aws = require("aws-sdk");
// const chromium = require("chrome-aws-lambda");
require('dotenv').config();
const puppeteer = require('puppeteer');
const dayjs = require('dayjs');
const fs = require('fs');
const dynamodb = require('./dynamodb');

exports.handler = async (event, context) => {
    try {
        switch (event) {
            case 'scraping':
                await procScraping();
                break;
            case 'brokenLink':
                for (let v of ['check', 'delete']) {
                    await checkBrokenLink(v);
                }
                break;
            default:
        }
    } catch (e) {
        console.error(e);
    }
};
exports.handler('scraping', '');


async function procScraping() {
    const browser = await puppeteer.launch();
    const tableName = 'testTable';
    let scrapingDatas = [];
    try {
        const page = await browser.newPage();
        if (process.env.password) {
            await page.authenticate({
                username: process.env.username,
                password: process.env.password
            });
        }
        await page.goto('https://b.hatena.ne.jp/hotentry/it');
        scrapingDatas = await page.evaluate(async () => {
            let outEvaluate = [];
            let list = document.getElementsByClassName("entrylist-contents-main");
            for (let v of list) {
                let elem = v.querySelector("h3 > a");
                let tags = v.querySelector(".entrylist-contents-tags");
                let thumb = v.querySelector('.entrylist-contents-thumb > span');
                outEvaluate.push({
                    PartitionKey: elem.href,
                    SortKey: 0,
                    Title: elem.textContent,
                    Tags: tags ? tags.textContent.split('\n').filter((item) => item.trim() ? true : false) : [],
                    Thumb: thumb ? thumb.style.backgroundImage.replace(/url\(\"|\"\)/g, '') : '',
                    PostedDate: v.querySelector('.entrylist-contents-date').textContent,
                    UpdatedDate: 0,
                    DeleteFlg: false
                });
            }
            return outEvaluate;
        });
        await browser.close();

        // スクレイピングデータの編集
        let partitionKeys = [];
        await (async (scrapingDatas, partitionKeys) => {
            for (let i in scrapingDatas) {
                partitionKeys.push({
                    [scrapingDatas[i].PartitionKey]: i
                });
                scrapingDatas[i].SortKey = scrapingDatas[i].UpdatedDate = dayjs().valueOf();
                for (let tagIndex in scrapingDatas[i].Tags) {
                    scrapingDatas[i].Tags[tagIndex] = (scrapingDatas[i].Tags[tagIndex].indexOf('あとで読む') !== -1)
                        ? ''
                        : scrapingDatas[i].Tags[tagIndex].trim();
                }
                scrapingDatas[i].Tags = scrapingDatas[i].Tags.filter(Boolean);
                scrapingDatas[i].PostedDate = dayjs(scrapingDatas[i].PostedDate).valueOf();
                scrapingIndex++;
            }
        })(scrapingDatas, partitionKeys);
        // console.info('procScraping OUT:', scrapingDatas.length);

        // 存在チェック
        let batchGetParams = {
            RequestItems: {
                [tableName]: {
                    Keys: scrapingDatas
                }
            }
        };
        let batchGetResult = await dynamodb.batchGet(batchGetParams);

        // DB投入データ作成
        let batchWriteParams = {
            RequestItems: {
                [tableName]: []
            }
        };
        await (async (batchWriteParams, batchGetResult, scrapingDatas) => {
            for (let scrapingData of scrapingDatas) {

                // 新規追加
                batchWriteParams.RequestItems[tableName].push(scrapingData);
                for (let v of batchGetResult.Responses[tableName].Items) {

                    // 更新
                    if (scrapingData.PartitionKey === v.PartitionKey) {
                        let addItmes = {
                            PutRequest: {
                                Item: v
                            }
                        };
                        addItmes.PutRequest.Item.Title = scrapingData.Title;
                        addItmes.PutRequest.Item.Tags = scrapingData.Tags;
                        addItmes.PutRequest.Item.PostedDate = scrapingData.PostedDate;
                        addItmes.PutRequest.Item.UpdatedDate = scrapingData.UpdatedDate;
                        addItmes.Item.Thumb = scrapingData.Thumb;
                        batchWriteParams.RequestItems[tableName].push(addItmes);
                        break;
                    }
                }
            }
        })(batchWriteParams, batchGetResult, scrapingDatas);
        if (batchWriteParams.RequestItems[tableName].length) {
            await dynamodb.batchWrite(batchWriteParams, tableName);
        }
        return '';
    } catch (e) {
        await browser.close();
        throw e;
    }
}


/**
 * リンク改廃
 * @param {*} proc 
 */
async function checkBrokenLink(proc) {

    // データ取得
    const tableName = '';
    let queryParams = {
        TableName: tableName,
        IndexName: '',
        KeyConditionExpression: '#PartisionKey = :PartitionKey',
        ExpressionAttributeNames: { '#PartitionKey': 'DeleteFlg' },
        Limit: 25
    };
    queryParams.ExpressionAttributeValues = (proc === 'check')
        ? { ':PartitionKey': false }
        : { ':PartitionKey': true };
    let result = await dynamodb.query(queryParams);

    // リンクチェック
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    if (process.env.password) {
        await page.authenticate({
            username: process.env.username,
            password: process.env.password
        });
    }
    let batchWriteParams = {
        RequestItems: {
            [tableName]: []
        }
    };
    for (let i in result.Items) {
        let addItmes = {};
        try {
            await page.goto(result.Items[i].PartitionKey);
            addItmes.PutRequest = { Item: result.Items[i] };
            addItmes.PutRequest.Item.DeleteFlg = false;
            addItmes.PutRequest.Item.UpdatedDate = dayjs().valueOf();
        } catch (e) {
            let today = dayjs().startOf('day');
            let deleteLimit = dayjs(result.Items[i].UpdatedDate).add(1, 'week');

            // 期限切れ削除
            if (today.isAfter(deleteLimit)) {
                addItmes.DeleteRequest = {
                    Key: {
                        PartitionKey: result.Items[i].PartitionKey,
                        SortKey: result.Items[i].SortKey
                    }
                };
            } else {
                addItmes.PutRequest = { Item: result.Items[i] };
                addItmes.PutRequest.Item.DeleteFlg = true;
            }
        } finally {
            batchWriteParams.RequestItems[tableName].push(addItmes);
        }
    }
    await browser.close();
    await dynamodb.batchWrite(batchWriteParams, tableName);
}
