const aws = require("aws-sdk");
const docClient = new aws.DynamoDB.DocumentClient();


/**
 * 
 */
exports.query = async function (inParam) {
    let params = { ...inParam },
        outParam = { Items: [], Count: 0 },
        result = {};
    do {
        // console.info('docClient.query IN:', params);
        result = await docClient.query(params).promise();
        // console.info('docClient.query OUT:', result);
        params.ExclusiveStartKey = result.LastEvaluatedKey;
        outParam.Items = [...outParam.Items, ...result.Items];
        outParam.Count += result.Count;
    } while (!result.LastEvaluatedKey);
    // console.info('exports.query OUT:', outParam);
    return outParam;
};

async function update() {
}

exports.batchGet = async function (inParam) {
    let params = { ...inParam }, outParam = { Responses: {} };
    do {
        // console.info('docClient.batchGet IN:', params);
        let result = await docClient.batchGet(params).promise();
        // console.info('docClient.batchGet OUT:', result);
        if (result.UnprocessedKeys) params.RequestItems = result.UnprocessedKeys;
        for (let tableName of result.Response) {
            if (!outParam.Responses[tableName]) outParam.Responses[tableName] = { Items: [] };
            outParam.Responses[tableName].Items = [...outParam.Responses[tableName].Items, result.Responses[tableName].Items];
        }
    } while (!result.UnprocessedKeys);
    // console.info('exports.batchGet OUT:', outParam);
    return outParam;
};


exports.batchWrite = async function (inParam, tableName) {
    let params = [{
        RequestItems: [{ [tableName]: [] }]
    }];

    // 25件毎に分割
    let c = 0;
    for (let i = 1; i <= inParam.RequestItems[tableName].length; i++) {
        params[c].RequestItems[0][tableName].push(inParam.RequestItems[tableName][i - 1]);
        if ((i % 25) === 0) {
            params.push({
                RequestItems: [{ [tableName]: [] }]
            });
            c++;
        };
    }
    for (let v of params) {
        param = { ...v }, result = {};
        do {
            result = await docClient.batchWrite(param).promise();
            param = result.UnprocessedItems;
        } while (result.UnprocessedItems);
    }
};