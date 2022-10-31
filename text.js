import axios from "axios";
import mongoose from "mongoose";

const getUrl = (i, insuranceSector) => `https://www.doctolib.de/search_results/${i}.json?insurance_sector=${insuranceSector}`;
const getScraperUrl = (i, insuranceSector) => `https://app.scrapingbee.com/api/v1/?api_key=G1XDJAXLF4W1S74Q4SP8CPZ2B9U5I2S8RV6NM28IUEVZJVRP3L0JQZ8BJX3RN3Y6YC5STNV0QF9H8KH0&url=${getUrl(i, insuranceSector)}`;


const getData = async (i, insuranceSector) => {
    // const url = getScraperUrl(i, insuranceSector);
    const url = getUrl(i, insuranceSector);

    try {
        const response = await axios.get(url);
        if (response?.data?.availabilities?.length > 0) {
            return response;
        }
    } catch (err) {
        if (err.code === 'ERR_BAD_REQUEST') {
            console.error("You're a fucking robot. Go away!");
            process.exit();
        }
        console.error(err);
        return null;
    }
};


const getDbConnection = async () => {
    await mongoose.connect('mongodb://localhost:27017/mydatabase', {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });

    return mongoose.connection;
};

const main = async () => {
    const db = await getDbConnection();
    const collection = await db.collection('doctolib_data');

    const [lastInserted] = await collection.aggregate([
        {
            '$sort': {
                'jsonId': -1
            }
        }, {
            '$limit': 1
        }
    ]).toArray();

    for (let i = lastInserted.jsonId + 1; i < 1000000; i++) {
        for (let insuranceType of ["public", "private"]) {
            const data = await getData(i, insuranceType);

            if (!data) break;

            await collection.insertOne({
                ...data.data,
                insuranceType,
                jsonId: i,
                insertedAt: new Date().toISOString()
            });

            console.log("success", i, insuranceType);
        }
    }
};

main().then((results) => console.log(results))

